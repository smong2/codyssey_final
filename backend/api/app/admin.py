"""Phase 10 administrator authentication, user views, analytics, balance, and audit API."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from hashlib import sha256
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.security import HTTPAuthorizationCredentials
from firebase_admin import auth
from pydantic import BaseModel, Field, model_validator

from .account import _STATS
from .admin_repository import AdminDataError, AdminRepository, aggregate_analytics, period_dates
from .authentication import (
    AuthenticatedUser,
    authenticate_credentials,
    firebase_bearer,
    require_verified_user,
)
from .firebase import FirebaseServices, get_firebase_services
from .ending_workflow import ENDING_NARRATIVES, LetterValidationError, validate_letter
from .gemini import GeminiEndingLetterGenerator, GeminiGenerationError


router = APIRouter(prefix="/admin", tags=["admin"])
KST = ZoneInfo("Asia/Seoul")



def get_admin_repository(
    services: FirebaseServices = Depends(get_firebase_services),
) -> AdminRepository:
    return AdminRepository(services.firestore)


def require_admin(user: AuthenticatedUser = Depends(require_verified_user)) -> AuthenticatedUser:
    if not user.admin:
        raise HTTPException(status_code=403, detail="Administrator permission required")
    return user


@router.post("/phase12/gemini-smoke", include_in_schema=False)
def phase12_gemini_smoke(
    request: Request,
    _: AuthenticatedUser = Depends(require_admin),
) -> dict:
    """Temporary Phase 12 provider check using fictional, unsaved play data."""
    settings = request.app.state.settings
    narrative = ENDING_NARRATIVES["ENDING_HERB_GARDENER"]
    context = {
        "character": {"id": "CH01", "name": "가상 학생"},
        "ending": {
            "id": "ENDING_HERB_GARDENER", "name": "약초 정원사", "subtitle": None,
            "type": "CAREER", "careerAnchor": narrative.career_anchor,
            "futureSceneGuide": narrative.future_scene_guide,
            "primaryStat": "knowledge", "secondaryStat": "exploration",
        },
        "visibleStats": {stat: 101 + index for index, stat in enumerate(_STATS)},
        "hiddenHighlights": [],
        "playRecords": [
            {"type": "classCount", "label": "수업 횟수", "count": 8},
            {"type": "adventureCount", "label": "모험 횟수", "count": 3},
            {"type": "npcEncounterCount", "label": "NPC 만남 횟수", "count": 2},
            {"type": "locationDiscoveryCount", "label": "장소 발견 횟수", "count": 1},
        ],
        "representativeChoices": [],
        "generationRules": {"audience": "age_9_11", "locale": "ko-KR",
                            "answerFixedQuestion": False},
    }
    generator = GeminiEndingLetterGenerator(
        api_key=settings.gemini_api_key, model=settings.gemini_model,
        thinking_level=settings.gemini_thinking_level,
    )
    for attempt in range(1, 3):
        try:
            validate_letter(generator.generate(context), context)
            return {"provider": "gemini", "validated": True, "attempts": attempt}
        except (GeminiGenerationError, LetterValidationError):
            continue
    raise HTTPException(status_code=503, detail="Gemini generation or validation failed")


def _request_metadata(request: Request) -> dict:
    user_agent = request.headers.get("user-agent")
    return {
        "ip": request.client.host if request.client is not None else None,
        "userAgent": user_agent[:512] if isinstance(user_agent, str) else None,
    }


def _reason_code(error: HTTPException) -> str:
    if error.status_code == 401:
        return "TOKEN_INVALID"
    if error.status_code == 403 and error.detail == "Email verification required":
        return "EMAIL_UNVERIFIED"
    if error.status_code == 503:
        return "AUTH_UNAVAILABLE"
    return "AUTH_REJECTED"


@router.post("/session")
def admin_session(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(firebase_bearer),
    services: FirebaseServices = Depends(get_firebase_services),
    repository: AdminRepository = Depends(get_admin_repository),
) -> dict:
    """Validate admin console entry and persist one minimal login audit event."""
    now = datetime.now(timezone.utc)
    base = {"eventType": "ADMIN_LOGIN", "occurredAt": now, **_request_metadata(request)}
    try:
        user = authenticate_credentials(credentials, services)
    except HTTPException as error:
        repository.write_audit({**base, "result": "FAILURE", "reasonCode": _reason_code(error)})
        raise
    if not user.admin:
        repository.write_audit({
            **base,
            "result": "FAILURE",
            "reasonCode": "NOT_ADMIN",
            "identifierHash": sha256(user.uid.encode("utf-8")).hexdigest(),
        })
        raise HTTPException(status_code=403, detail="Administrator permission required")
    repository.write_audit({
        **base,
        "result": "SUCCESS",
        "reasonCode": "OK",
        "adminUid": user.uid,
    })
    return {"admin": True, "uid": user.uid}


def _email(auth_user) -> str | None:
    value = getattr(auth_user, "email", None)
    return value if isinstance(value, str) and value else None


def _user_summary(repository: AdminRepository, services: FirebaseServices, uid: str) -> dict:
    detail = repository.user_detail(uid)
    try:
        auth_user = services.auth.get_user(uid)
    except auth.UserNotFoundError:
        auth_user = None
    return {
        "uid": uid,
        "email": _email(auth_user) if auth_user is not None else None,
        "createdAt": detail["profile"]["createdAt"],
        "lastPlayedAt": detail["profile"]["lastPlayedAt"],
        "totalCompletedRuns": detail["statistics"]["totalCompletedRuns"],
    }


@router.get("/users")
def list_or_search_users(
    query: str | None = Query(default=None, max_length=320),
    limit: int = Query(default=50, ge=1, le=50),
    _: AuthenticatedUser = Depends(require_admin),
    services: FirebaseServices = Depends(get_firebase_services),
    repository: AdminRepository = Depends(get_admin_repository),
) -> dict:
    try:
        if query is not None:
            value = query.strip()
            if not value:
                raise HTTPException(422, "query must not be blank")
            try:
                auth_user = (
                    services.auth.get_user_by_email(value)
                    if "@" in value
                    else services.auth.get_user(value)
                )
            except auth.UserNotFoundError:
                return {"items": []}
            uid = getattr(auth_user, "uid", None)
            if not isinstance(uid, str) or not uid:
                return {"items": []}
            try:
                return {"items": [_user_summary(repository, services, uid)]}
            except KeyError:
                return {"items": []}
        return {
            "items": [
                _user_summary(repository, services, uid)
                for uid in repository.user_ids(limit=limit)
            ]
        }
    except HTTPException:
        raise
    except (AdminDataError, ValueError):
        raise HTTPException(409, "Administrator user data is inconsistent") from None
    except Exception:
        raise HTTPException(503, "Administrator user lookup unavailable") from None


@router.get("/users/{uid}")
def get_user_detail(
    uid: str,
    _: AuthenticatedUser = Depends(require_admin),
    services: FirebaseServices = Depends(get_firebase_services),
    repository: AdminRepository = Depends(get_admin_repository),
) -> dict:
    try:
        detail = repository.user_detail(uid)
        try:
            auth_user = services.auth.get_user(uid)
            email = _email(auth_user)
        except auth.UserNotFoundError:
            email = None
        return {"uid": uid, "email": email, **detail}
    except KeyError:
        raise HTTPException(404, "User not found") from None
    except (AdminDataError, ValueError):
        raise HTTPException(409, "User game data is inconsistent") from None
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, "Administrator user detail unavailable") from None


class AnalyticsRangeRequest(BaseModel):
    period: Literal["day", "week", "month"]
    anchor: date


def _analytics_response(repository: AdminRepository, *, period: str, anchor: date) -> dict:
    dates = period_dates(period, anchor)
    rows, missing = repository.analytics_days(dates)
    active = len(repository.distinct_active_users(set(dates)))
    today_kst = datetime.now(timezone.utc).astimezone(KST).date()
    return {
        "period": period,
        "startDate": dates[0],
        "endDate": dates[-1],
        "complete": not missing,
        "missingDates": missing,
        "metrics": aggregate_analytics(rows, active_user_count=active),
        "currentUsers": repository.current_user_metrics(today_kst=today_kst),
    }


@router.post("/analytics/rebuild")
def rebuild_analytics(
    body: AnalyticsRangeRequest,
    _: AuthenticatedUser = Depends(require_admin),
    repository: AdminRepository = Depends(get_admin_repository),
) -> dict:
    try:
        now = datetime.now(timezone.utc)
        for kst_date in period_dates(body.period, body.anchor):
            repository.rebuild_day(kst_date, now=now)
        return _analytics_response(repository, period=body.period, anchor=body.anchor)
    except AdminDataError as error:
        raise HTTPException(409, str(error)) from None
    except Exception:
        raise HTTPException(503, "Analytics rebuild unavailable") from None


@router.get("/analytics")
def get_analytics(
    period: Literal["day", "week", "month"] = Query(...),
    anchor: date = Query(...),
    _: AuthenticatedUser = Depends(require_admin),
    repository: AdminRepository = Depends(get_admin_repository),
) -> dict:
    try:
        return _analytics_response(repository, period=period, anchor=anchor)
    except AdminDataError as error:
        raise HTTPException(409, str(error)) from None
    except Exception:
        raise HTTPException(503, "Administrator analytics unavailable") from None


class BalancePatchRequest(BaseModel):
    rewardMultiplier: dict[str, float] = Field(min_length=1, max_length=5)

    @model_validator(mode="after")
    def validate_multipliers(self):
        if not set(self.rewardMultiplier).issubset(set(_STATS)):
            raise ValueError("Unsupported reward multiplier stat")
        for value in self.rewardMultiplier.values():
            if isinstance(value, bool):
                raise ValueError("Invalid reward multiplier")
            try:
                scaled = Decimal(str(value)) * 10
            except InvalidOperation:
                raise ValueError("Invalid reward multiplier") from None
            if not scaled.is_finite() or scaled != int(scaled) or not 5 <= scaled <= 10:
                raise ValueError("rewardMultiplier must be 0.5..1.0 in 0.1 steps")
        return self


@router.get("/balance")
def get_balance(
    _: AuthenticatedUser = Depends(require_admin),
    repository: AdminRepository = Depends(get_admin_repository),
) -> dict:
    try:
        return repository.get_balance()
    except AdminDataError as error:
        raise HTTPException(409, str(error)) from None
    except Exception:
        raise HTTPException(503, "Balance settings unavailable") from None


@router.patch("/balance")
def patch_balance(
    body: BalancePatchRequest,
    user: AuthenticatedUser = Depends(require_admin),
    repository: AdminRepository = Depends(get_admin_repository),
) -> dict:
    try:
        return repository.update_balance(
            admin_uid=user.uid,
            changes=body.rewardMultiplier,
            now=datetime.now(timezone.utc),
        )
    except AdminDataError as error:
        raise HTTPException(409, str(error)) from None
    except Exception:
        raise HTTPException(503, "Balance update unavailable") from None
