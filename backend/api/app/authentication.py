"""Verify Firebase ID tokens and bind protected requests to their own UID."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

from .firebase import FirebaseServices, get_firebase_services


_bearer = HTTPBearer(auto_error=False)
_INVALID_TOKEN_ERRORS = (
    auth.InvalidIdTokenError,
    auth.ExpiredIdTokenError,
    auth.RevokedIdTokenError,
    auth.UserDisabledError,
    auth.UserNotFoundError,
)


@dataclass(frozen=True)
class AuthenticatedUser:
    uid: str
    auth_time: int
    issued_at: int
    admin: bool


firebase_bearer = _bearer


def authenticate_credentials(
    credentials: HTTPAuthorizationCredentials | None,
    services: FirebaseServices,
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Firebase ID token required")
    try:
        claims = services.auth.verify_id_token(credentials.credentials, check_revoked=True)
    except _INVALID_TOKEN_ERRORS:
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token") from None
    except Exception:
        raise HTTPException(status_code=503, detail="Authentication service unavailable") from None

    uid = claims.get("uid")
    if not isinstance(uid, str) or not uid:
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token")
    if claims.get("email_verified") is not True:
        raise HTTPException(status_code=403, detail="Email verification required")
    auth_time = claims.get("auth_time")
    issued_at = claims.get("iat")
    if not isinstance(auth_time, int) or not isinstance(issued_at, int):
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token")
    return AuthenticatedUser(
        uid=uid,
        auth_time=auth_time,
        issued_at=issued_at,
        admin=claims.get("admin") is True,
    )


def require_verified_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    services: FirebaseServices = Depends(get_firebase_services),
) -> AuthenticatedUser:
    return authenticate_credentials(credentials, services)
