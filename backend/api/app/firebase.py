"""Firebase Admin clients, scoped to one named app per Python process."""

from __future__ import annotations

from dataclasses import dataclass
from threading import Lock
from typing import Any

import firebase_admin
from fastapi import Request
from firebase_admin import auth, credentials, firestore

from .config import Settings


_APP_NAME = "lumia-api"
_initialize_lock = Lock()


class FirebaseStartupError(RuntimeError):
    """Firebase could not be initialized with the server configuration."""


class FirebaseAuthClient:
    """App-scoped Auth operations; callers never choose another Firebase app."""

    def __init__(self, app: firebase_admin.App) -> None:
        self._app = app

    def verify_id_token(self, token: str, *, check_revoked: bool = False) -> dict[str, Any]:
        return auth.verify_id_token(token, app=self._app, check_revoked=check_revoked)

    def get_user(self, uid: str) -> Any:
        return auth.get_user(uid, app=self._app)

    def get_user_by_email(self, email: str) -> Any:
        return auth.get_user_by_email(email, app=self._app)

    def delete_user(self, uid: str) -> None:
        auth.delete_user(uid, app=self._app)


@dataclass(frozen=True, repr=False)
class FirebaseServices:
    app: firebase_admin.App
    auth: FirebaseAuthClient
    firestore: Any


def get_firebase_services(request: Request) -> FirebaseServices:
    """Public dependency hook, kept outside the app entry point to avoid import cycles."""
    services = getattr(request.app.state, "firebase_services", None)
    if services is None:
        raise RuntimeError("Firebase services are not initialized")
    return services


def initialize_firebase(settings: Settings) -> FirebaseServices:
    """Reuse a matching Admin app; never expose SDK credential errors to callers."""

    with _initialize_lock:
        try:
            app = firebase_admin.get_app(_APP_NAME)
        except ValueError:
            try:
                credential = credentials.Certificate(dict(settings.firebase_service_account))
                app = firebase_admin.initialize_app(
                    credential,
                    options={"projectId": settings.firebase_project_id},
                    name=_APP_NAME,
                )
            except Exception:
                raise FirebaseStartupError("Firebase Admin initialization failed") from None

    if app.project_id != settings.firebase_project_id:
        raise FirebaseStartupError("Firebase Admin app project does not match FIREBASE_PROJECT_ID")

    try:
        database = firestore.client(app=app)
    except Exception:
        raise FirebaseStartupError("Firestore client initialization failed") from None

    return FirebaseServices(app=app, auth=FirebaseAuthClient(app), firestore=database)
