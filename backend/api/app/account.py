"""Account bootstrap and self-only account read API."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import auth
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .authentication import AuthenticatedUser, require_verified_user
from .firebase import FirebaseServices, get_firebase_services
from .models import AccountSettings
from .repositories import AccountNotFound, DeletionPending, InvalidMutation, UserRepository


router = APIRouter(prefix="/v1/account", tags=["account"])
PRIVACY_CONSENT_VERSION = "2026-10-15"
GAME_DATA_VERSION = "dev-dialogue-v1"
_INITIAL_CHARACTERS = ["CH01", "CH15", "CH31", "CH02", "CH08", "CH16"]
_STATS = ("knowledge", "expression", "skill", "exploration", "magic")
_TAGS = ("empathy", "responsibility", "curiosity", "courage", "cooperation", "independence", "caution", "honesty")


class BootstrapRequest(BaseModel):
    privacyConsentAccepted: Literal[True]
    privacyConsentVersion: str


class DeleteAccountRequest(BaseModel):
    confirm: Literal[True]


class UpdateSettingsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    activePetId: str | None = Field(default=None, pattern=r"^PET(?:0[1-9]|10)$")
    activeRoomBackgroundId: str | None = Field(default=None, pattern=r"^ROOM_(?:DEFAULT|0[1-3])$")
    roomActorPositions: dict[str, dict[str, float]] | None = None

    @model_validator(mode="after")
    def has_change(self) -> UpdateSettingsRequest:
        if self.activePetId is None and self.activeRoomBackgroundId is None and self.roomActorPositions is None:
            raise ValueError("At least one account setting is required")
        if self.roomActorPositions is not None:
            AccountSettings(activePetId="PET01", activeRoomBackgroundId="ROOM_DEFAULT",
                            roomActorPositions=self.roomActorPositions, locale="ko-KR",
                            updatedAt=datetime.now(timezone.utc))
        return self


def _initial_documents(created_at: datetime, now: datetime) -> dict[str, dict]:
    zero_stats = {name: 0 for name in _STATS}
    documents = {
        "": {
            "createdAt": created_at,
            "updatedAt": now,
            "lastLoginAt": now,
            "lastPlayedAt": None,
            "privacyConsentAt": now,
            "privacyConsentVersion": PRIVACY_CONSENT_VERSION,
            "schemaVersion": 1,
        },
        "settings/account": {
            "activePetId": "PET01",
            "activeRoomBackgroundId": "ROOM_DEFAULT",
            "roomActorPositions": {},
            "locale": "ko-KR",
            "updatedAt": now,
        },
        "meta/progress": {
            "permanentBonuses": zero_stats.copy(),
            "unlockedCharacterIds": _INITIAL_CHARACTERS.copy(),
            "playedCharacterIds": [],
            "unlockedPetIds": ["PET01"],
            "acquiredBadgeIds": [],
            "acquiredPuzzlePieceIds": [],
            "unlockedRoomBackgroundIds": ["ROOM_DEFAULT"],
            "seenEndingIds": [],
            "updatedAt": now,
        },
        "statistics/global": {
            "totalCompletedRuns": 0,
            "totalClassCount": 0,
            "totalAdventureCount": 0,
            "totalRestCount": 0,
            "totalMinigamePlayCount": 0,
            "totalMinigameClearCount": 0,
            "clearedMinigameIds": [],
            "totalNpcEncounterCount": 0,
            "completedNpcStoryCount": 0,
            "totalSpecialItemDiscoveryCount": 0,
            "totalLocationDiscoveryCount": 0,
            "retryAfterFailureCount": 0,
            "myRoomActiveWeekCount": 0,
            "importantChoiceCount": 0,
            "behaviorTagCounts": {tag: 0 for tag in _TAGS},
            "classCounts": zero_stats.copy(),
            "characterPlayCounts": {},
            "endingViewCounts": {},
            "updatedAt": now,
        },
        "unlockState/global": {
            "completedConditionIds": [],
            "pendingCharacterUnlockIds": [],
            "updatedAt": now,
        },
    }
    for slot_id in range(1, 6):
        documents[f"saveSlots/{slot_id}"] = {
            "slotId": slot_id,
            "status": "EMPTY",
            "completedRunCount": 0,
            "lastCompletedCharacterId": None,
            "lastEndingId": None,
            "createdAt": None,
            "lastSavedAt": None,
            "saveVersion": 1,
            "gameDataVersion": GAME_DATA_VERSION,
            "activeRun": None,
            "serverRevision": 0,
        }
    return documents


@router.post("/bootstrap")
def bootstrap_account(
    body: BootstrapRequest,
    user: AuthenticatedUser = Depends(require_verified_user),
    services: FirebaseServices = Depends(get_firebase_services),
) -> dict[str, str | bool]:
    if body.privacyConsentVersion != PRIVACY_CONSENT_VERSION:
        raise HTTPException(status_code=409, detail="Privacy consent version mismatch")
    repository = UserRepository(services.firestore)

    def initial_documents() -> dict[str, dict]:
        auth_user = services.auth.get_user(user.uid)
        if not auth_user.email_verified:
            raise HTTPException(status_code=403, detail="Email verification required")
        created_at = datetime.fromtimestamp(auth_user.user_metadata.creation_timestamp / 1000, timezone.utc)
        return _initial_documents(created_at, datetime.now(timezone.utc))

    try:
        created = repository.bootstrap(user.uid, initial_documents)
    except DeletionPending:
        raise HTTPException(status_code=409, detail="Account deletion in progress") from None
    except auth.UserNotFoundError:
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token") from None
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Account initialization unavailable") from None
    return {"uid": user.uid, "created": created}


@router.get("/me")
def get_account(
    user: AuthenticatedUser = Depends(require_verified_user),
    services: FirebaseServices = Depends(get_firebase_services),
) -> dict:
    try:
        profile = UserRepository(services.firestore).get(user.uid)
    except AccountNotFound:
        raise HTTPException(status_code=404, detail="Account not initialized") from None
    except DeletionPending:
        raise HTTPException(status_code=409, detail="Account deletion in progress") from None
    except Exception:
        raise HTTPException(status_code=503, detail="Account read unavailable") from None
    return {
        "uid": user.uid,
        "createdAt": profile.createdAt,
        "lastPlayedAt": profile.lastPlayedAt,
        "privacyConsentVersion": profile.privacyConsentVersion,
        "schemaVersion": profile.schemaVersion,
    }


@router.get("/settings")
def get_account_settings(
    user: AuthenticatedUser = Depends(require_verified_user),
    services: FirebaseServices = Depends(get_firebase_services),
) -> dict:
    try:
        settings = UserRepository(services.firestore).get_settings(user.uid)
    except AccountNotFound:
        raise HTTPException(status_code=404, detail="Account settings unavailable") from None
    except DeletionPending:
        raise HTTPException(status_code=409, detail="Account deletion in progress") from None
    except Exception:
        raise HTTPException(status_code=503, detail="Account settings read unavailable") from None
    return settings.model_dump(mode="json")


@router.patch("/settings")
def update_account_settings(
    body: UpdateSettingsRequest,
    user: AuthenticatedUser = Depends(require_verified_user),
    services: FirebaseServices = Depends(get_firebase_services),
) -> dict:
    try:
        settings = UserRepository(services.firestore).update_settings(
            user.uid,
            active_pet_id=body.activePetId,
            active_room_background_id=body.activeRoomBackgroundId,
            room_actor_positions=body.roomActorPositions,
        )
    except AccountNotFound:
        raise HTTPException(status_code=404, detail="Account settings unavailable") from None
    except DeletionPending:
        raise HTTPException(status_code=409, detail="Account deletion in progress") from None
    except InvalidMutation as error:
        raise HTTPException(status_code=409, detail=str(error)) from None
    except Exception:
        raise HTTPException(status_code=503, detail="Account settings update unavailable") from None
    return settings.model_dump(mode="json")


@router.post("/revoke-sessions")
def revoke_sessions(
    user: AuthenticatedUser = Depends(require_verified_user),
    services: FirebaseServices = Depends(get_firebase_services),
) -> dict[str, bool]:
    """Invalidate all refresh tokens after a recent client reauthentication."""
    now = int(datetime.now(timezone.utc).timestamp())
    if user.auth_time > now + 60 or now - user.auth_time > 300:
        raise HTTPException(status_code=403, detail="Recent reauthentication required")
    try:
        services.auth.revoke_refresh_tokens(user.uid)
    except Exception:
        raise HTTPException(status_code=503, detail="Session revocation unavailable") from None
    return {"revoked": True}


@router.delete("")
def delete_account(
    body: DeleteAccountRequest,
    user: AuthenticatedUser = Depends(require_verified_user),
    services: FirebaseServices = Depends(get_firebase_services),
) -> dict[str, bool]:
    """Delete this token's account; a retry can resume before Auth deletion.

    Firestore and Firebase Auth have no shared transaction. Keep the root as a
    deletion marker until all descendants are removed and Auth deletion works.
    """
    now = int(datetime.now(timezone.utc).timestamp())
    if user.auth_time > now + 60 or now - user.auth_time > 300:
        raise HTTPException(status_code=403, detail="Recent reauthentication required")

    try:
        UserRepository(services.firestore).delete(user.uid, services.auth)
    except Exception:
        raise HTTPException(status_code=503, detail="Account deletion incomplete; retry or contact support") from None
    return {"deleted": True}
