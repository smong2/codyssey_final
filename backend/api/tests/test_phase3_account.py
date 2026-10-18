"""Offline authentication and account-bootstrap regression tests."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi.testclient import TestClient
from firebase_admin import auth

from backend.api.app.main import create_app
from backend.api.tests.test_phase2 import settings


class Snapshot:
    def __init__(self, data):
        self._data = data
        self.exists = data is not None

    def to_dict(self):
        return self._data


class Document:
    def __init__(self, db, path):
        self.db = db
        self.path = path

    def document(self, relative_path):
        return Document(self.db, f"{self.path}/{relative_path}")

    def collection(self, relative_path):
        return Collection(self.db, f"{self.path}/{relative_path}")

    def get(self, transaction=None):
        if transaction is not None:
            return transaction.get_snapshot(self.path)
        return Snapshot(self.db.data.get(self.path))

    def update(self, changes):
        self.db.data[self.path].update(changes)

    def set(self, data):
        self.db.data[self.path] = data

    def delete(self):
        self.db.data.pop(self.path, None)

    def collections(self):
        prefix = f"{self.path}/"
        names = {
            path[len(prefix):].split("/")[0]
            for path in self.db.data
            if path.startswith(prefix)
        }
        return [self.collection(name) for name in sorted(names)]


class Collection:
    def __init__(self, db, path):
        self.db = db
        self.path = path

    def document(self, uid):
        return Document(self.db, f"{self.path}/{uid}")

    def stream(self):
        prefix = f"{self.path}/"
        return [
            SimpleNamespace(id=path[len(prefix):])
            for path in self.db.data
            if path.startswith(prefix) and "/" not in path[len(prefix):]
        ]


class Batch:
    def __init__(self, db):
        self.db = db
        self.creates = []

    def create(self, reference, data):
        self.creates.append((reference.path, data))

    def commit(self):
        if any(path in self.db.data for path, _ in self.creates):
            raise AssertionError("A second bootstrap must not overwrite documents")
        self.db.data.update(dict(self.creates))


class Database:
    def __init__(self):
        self.data = {}

    def collection(self, path):
        return Collection(self, path)

    def batch(self):
        return Batch(self)

    def recursive_delete(self, collection):
        prefix = f"{collection.path}/"
        for path in list(self.data):
            if path.startswith(prefix):
                del self.data[path]


class Auth:
    def __init__(self, *, verified=True, error=None, admin=False):
        self.verified = verified
        self.error = error
        self.admin = admin
        self.verify_calls = []
        self.deleted = []
        self.revoked = []
        self.fail_delete = False
        self.auth_time = int(datetime.now(timezone.utc).timestamp())

    def verify_id_token(self, token, *, check_revoked=False):
        self.verify_calls.append((token, check_revoked))
        if self.error:
            raise self.error
        return {
            "uid": token,
            "email_verified": self.verified,
            "auth_time": self.auth_time,
            "iat": self.auth_time,
            "admin": self.admin,
        }

    def get_user(self, uid):
        return SimpleNamespace(
            uid=uid,
            email=f"{uid}@example.com",
            email_verified=self.verified,
            user_metadata=SimpleNamespace(creation_timestamp=1_700_000_000_000),
        )

    def get_user_by_email(self, email):
        if not isinstance(email, str) or not email.endswith("@example.com"):
            raise auth.UserNotFoundError("not found")
        uid = email.removesuffix("@example.com")
        return self.get_user(uid)

    def delete_user(self, uid):
        if self.fail_delete:
            raise RuntimeError("Firebase Auth unavailable")
        self.deleted.append(uid)

    def revoke_refresh_tokens(self, uid):
        self.revoked.append(uid)


def client_for(*, verified=True, error=None):
    db = Database()
    auth_client = Auth(verified=verified, error=error)
    services = SimpleNamespace(auth=auth_client, firestore=db)
    api = create_app(settings=settings(), firebase_factory=lambda _: services)
    return TestClient(api), db, auth_client


def headers(uid="owner"):
    return {"Authorization": f"Bearer {uid}"}


def consent():
    return {"privacyConsentAccepted": True, "privacyConsentVersion": "2026-10-15"}


def test_bootstrap_creates_schema_defaults_only_for_verified_uid_and_is_idempotent():
    client, db, auth_client = client_for()
    with client:
        first = client.post("/v1/account/bootstrap", json=consent(), headers=headers())
        assert first.status_code == 200
        assert first.json() == {"uid": "owner", "created": True}
        assert len(db.data) == 10
        assert db.data["users/owner/meta/progress"]["unlockedCharacterIds"] == [
            "CH01", "CH15", "CH31", "CH02", "CH08", "CH16"
        ]
        assert db.data["users/owner/saveSlots/5"]["status"] == "EMPTY"
        assert db.data["users/owner/saveSlots/1"]["gameDataVersion"] == "dev-dialogue-v1"
        assert db.data["users/owner"]["createdAt"] == datetime.fromtimestamp(1_700_000_000, timezone.utc)
        assert "email" not in db.data["users/owner"]

        db.data["users/owner/saveSlots/1"]["status"] = "PLAYING"
        second = client.post("/v1/account/bootstrap", json=consent(), headers=headers())
        assert second.json() == {"uid": "owner", "created": False}
        assert db.data["users/owner/saveSlots/1"]["status"] == "PLAYING"
        assert client.get("/v1/account/me", headers=headers()).json()["uid"] == "owner"
    assert auth_client.verify_calls == [("owner", True)] * 3


def test_token_uid_is_only_account_path_and_no_uid_parameter_exists():
    client, db, _ = client_for()
    with client:
        assert client.post("/v1/account/bootstrap?uid=other", json=consent(), headers=headers()).status_code == 200
        assert "users/owner" in db.data
        assert "users/other" not in db.data
        assert client.get("/v1/account/me", headers=headers("other")).status_code == 404


def test_unverified_or_invalid_token_cannot_read_or_initialize():
    client, db, _ = client_for(verified=False)
    with client:
        assert client.post("/v1/account/bootstrap", json=consent(), headers=headers()).status_code == 403
        assert client.get("/v1/account/me", headers=headers()).status_code == 403
    assert db.data == {}

    client, _, _ = client_for(error=auth.InvalidIdTokenError("secret-error"))
    with client:
        response = client.get("/v1/account/me", headers=headers())
    assert response.status_code == 401
    assert "secret-error" not in response.text

    client, _, _ = client_for(error=auth.RevokedIdTokenError("revoked-secret"))
    with client:
        response = client.get("/v1/account/me", headers=headers())
    assert response.status_code == 401
    assert "revoked-secret" not in response.text

    client, _, _ = client_for(error=RuntimeError("provider-secret"))
    with client:
        response = client.get("/v1/account/me", headers=headers())
    assert response.status_code == 503
    assert "provider-secret" not in response.text


def test_missing_token_and_wrong_consent_do_not_write():
    client, db, _ = client_for()
    with client:
        assert client.post("/v1/account/bootstrap", json=consent()).status_code == 401
        assert client.post(
            "/v1/account/bootstrap",
            json={"privacyConsentAccepted": True, "privacyConsentVersion": "outdated"},
            headers=headers(),
        ).status_code == 409
        assert client.post(
            "/v1/account/bootstrap",
            json={"privacyConsentAccepted": False, "privacyConsentVersion": "2026-10-15"},
            headers=headers(),
        ).status_code == 422
    assert db.data == {}


def test_account_settings_read_and_update_only_allow_unlocked_pet_and_room():
    client, db, _ = client_for()
    with client:
        assert client.post("/v1/account/bootstrap", json=consent(), headers=headers()).status_code == 200
        initial = client.get("/v1/account/settings", headers=headers())
        assert initial.status_code == 200
        assert initial.json()["activePetId"] == "PET01"
        assert initial.json()["activeRoomBackgroundId"] == "ROOM_DEFAULT"

        locked_pet = client.patch(
            "/v1/account/settings", json={"activePetId": "PET02"}, headers=headers()
        )
        assert locked_pet.status_code == 409
        assert db.data["users/owner/settings/account"]["activePetId"] == "PET01"

        db.data["users/owner/meta/progress"]["unlockedPetIds"].append("PET02")
        db.data["users/owner/meta/progress"]["unlockedRoomBackgroundIds"].append("ROOM_01")
        changed = client.patch(
            "/v1/account/settings",
            json={"activePetId": "PET02", "activeRoomBackgroundId": "ROOM_01"},
            headers=headers(),
        )
        assert changed.status_code == 200, changed.text
        assert changed.json()["activePetId"] == "PET02"
        assert changed.json()["activeRoomBackgroundId"] == "ROOM_01"
        assert db.data["users/owner/settings/account"]["activePetId"] == "PET02"

        assert client.patch("/v1/account/settings", json={}, headers=headers()).status_code == 422
        assert client.patch(
            "/v1/account/settings", json={"activeRoomBackgroundId": "ROOM_99"}, headers=headers()
        ).status_code == 422


def test_delete_requires_explicit_confirmation_and_recent_authentication():
    client, db, auth_client = client_for()
    with client:
        client.post("/v1/account/bootstrap", json=consent(), headers=headers())
        assert client.request("DELETE", "/v1/account", json={"confirm": False}, headers=headers()).status_code == 422
        auth_client.auth_time -= 301
        assert client.request("DELETE", "/v1/account", json={"confirm": True}, headers=headers()).status_code == 403
    assert "users/owner" in db.data
    assert auth_client.deleted == []


def test_revoke_sessions_requires_recent_verified_token_and_uses_own_uid():
    client, _, auth_client = client_for()
    with client:
        result = client.post("/v1/account/revoke-sessions", headers=headers())
        assert result.status_code == 200 and result.json() == {"revoked": True}
        auth_client.auth_time -= 301
        assert client.post("/v1/account/revoke-sessions", headers=headers()).status_code == 403
    assert auth_client.revoked == ["owner"]


def test_delete_invalidates_affected_analytics_then_removes_all_user_data_and_auth():
    client, db, auth_client = client_for()
    with client:
        client.post("/v1/account/bootstrap", json=consent(), headers=headers())
        db.data["users/owner/activityDays/2026-10-18"] = {"kstDate": "2026-10-18"}
        db.data["users/owner/endingRecords/record"] = {"letter": "private"}
        db.data["analyticsDays/2026-10-18"] = {"activeUserCount": 1}
        db.data["analyticsDays/2023-11-15"] = {"newUserCount": 1}
        db.data["users/other"] = {"createdAt": datetime.now(timezone.utc)}
        result = client.request("DELETE", "/v1/account", json={"confirm": True}, headers=headers())
    assert result.status_code == 200
    assert result.json() == {"deleted": True}
    assert not any(path == "users/owner" or path.startswith("users/owner/") for path in db.data)
    assert "users/other" in db.data
    assert "analyticsDays/2026-10-18" not in db.data
    assert "analyticsDays/2023-11-15" not in db.data
    assert auth_client.deleted == ["owner"]


def test_failed_auth_deletion_keeps_retry_marker_and_can_resume():
    client, db, auth_client = client_for()
    with client:
        client.post("/v1/account/bootstrap", json=consent(), headers=headers())
        auth_client.fail_delete = True
        failed = client.request("DELETE", "/v1/account", json={"confirm": True}, headers=headers())
        assert failed.status_code == 503
        assert db.data["users/owner"]["deletionPending"] is True
        assert client.get("/v1/account/me", headers=headers()).status_code == 409
        assert client.post("/v1/account/bootstrap", json=consent(), headers=headers()).status_code == 409
        auth_client.fail_delete = False
        retry = client.request("DELETE", "/v1/account", json={"confirm": True}, headers=headers())
    assert retry.status_code == 200
    assert "users/owner" not in db.data
    assert auth_client.deleted == ["owner"]
