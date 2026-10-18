"""Opt-in checks against the real Firebase Auth and Firestore SDK emulators."""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

import firebase_admin
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from firebase_admin import auth
from firebase_admin.auth import UserNotFoundError
import httpx
import pytest

from backend.api.app.config import Settings
from backend.api.app.main import create_app


PROJECT = "demo-lumia-phase12"
ROOT = Path(__file__).resolve().parents[3]


def _emulator_hosts() -> tuple[str, str]:
    auth_host = os.environ.get("FIREBASE_AUTH_EMULATOR_HOST", "")
    firestore_host = os.environ.get("FIRESTORE_EMULATOR_HOST", "")
    if not auth_host or not firestore_host:
        pytest.skip("Start Auth and Firestore emulators before running this test")
    if any(host.startswith(("http://", "https://")) for host in (auth_host, firestore_host)):
        pytest.fail("Emulator host variables must not include a URL scheme")
    if os.environ.get("GCLOUD_PROJECT") != PROJECT:
        pytest.fail(f"GCLOUD_PROJECT must be {PROJECT}")
    return auth_host, firestore_host


@pytest.fixture(scope="module")
def emulator(tmp_path_factory):
    auth_host, firestore_host = _emulator_hosts()
    content_path = tmp_path_factory.mktemp("phase12-content") / "master.sqlite3"
    for script in (
        "seed_dialogue_content.py", "seed_npc_story.py",
        "seed_location_story_master.py", "seed_activities.py",
    ):
        arguments = [sys.executable, str(ROOT / "backend/database/sqlite" / script),
                     "--db", str(content_path), "--version", "dev-dialogue-v1"]
        if script != "seed_activities.py":
            arguments.append("--migrate")
        subprocess.run(arguments, cwd=ROOT, check=True, capture_output=True, text=True)

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_key = key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode("ascii")
    settings = Settings(
        firebase_project_id=PROJECT,
        firebase_service_account={
            "type": "service_account", "project_id": PROJECT,
            "private_key_id": "emulator-only", "private_key": private_key,
            "client_email": f"emulator@{PROJECT}.iam.gserviceaccount.com",
            "token_uri": "https://oauth2.googleapis.com/token",
        },
        content_sqlite_path=str(content_path),
        dialogue_token_secret="phase12-emulator-only-dialogue-secret",
    )
    api = create_app(settings=settings)
    with TestClient(api) as client:
        yield client, api.state.firebase_services, auth_host, firestore_host
    firebase_admin.delete_app(firebase_admin.get_app("lumia-api"))


def _sign_in(auth_host: str, email: str, password: str) -> str:
    response = httpx.post(
        f"http://{auth_host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword",
        params={"key": "emulator-key"},
        json={"email": email, "password": password, "returnSecureToken": True},
        timeout=10,
    )
    assert response.status_code == 200, response.text
    return response.json()["idToken"]


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_auth_firestore_transactions_rules_admin_and_deletion(emulator):
    client, services, auth_host, firestore_host = emulator
    suffix = uuid4().hex
    password = "Emulator-test-password-123!"
    unverified = auth.create_user(
        email=f"unverified-{suffix}@example.invalid", password=password,
        email_verified=False, app=services.app,
    )
    player = auth.create_user(
        email=f"player-{suffix}@example.invalid", password=password,
        email_verified=True, app=services.app,
    )
    operator = auth.create_user(
        email=f"operator-{suffix}@example.invalid", password=password,
        email_verified=True, app=services.app,
    )
    balance_ref = services.firestore.collection("systemSettings").document("balance")
    balance_snapshot = balance_ref.get()
    balance_before = balance_snapshot.to_dict() if balance_snapshot.exists else None
    audit_collection = services.firestore.collection("adminAuditLogs")
    audit_before = {document.id for document in audit_collection.stream()}
    try:
        unverified_token = _sign_in(auth_host, unverified.email, password)
        player_token = _sign_in(auth_host, player.email, password)
        operator_token = _sign_in(auth_host, operator.email, password)

        assert client.post("/v1/account/bootstrap", headers=_headers(unverified_token), json={
            "privacyConsentAccepted": True, "privacyConsentVersion": "2026-10-15",
        }).status_code == 403
        bootstrap = {"privacyConsentAccepted": True, "privacyConsentVersion": "2026-10-15"}
        first = client.post("/v1/account/bootstrap", headers=_headers(player_token), json=bootstrap)
        assert first.status_code == 200, first.text
        assert first.json()["created"] is True
        second = client.post("/v1/account/bootstrap", headers=_headers(player_token), json=bootstrap)
        assert second.status_code == 200 and second.json()["created"] is False
        slots = client.get("/v1/save-slots", headers=_headers(player_token))
        assert slots.status_code == 200 and len(slots.json()["slots"]) == 5

        command = {"requestId": f"start-{suffix}", "expectedServerRevision": 0,
                   "characterId": "CH01"}
        started = client.post("/v1/save-slots/1/runs", headers=_headers(player_token), json=command)
        assert started.status_code == 200, started.text
        assert started.json()["serverRevision"] == 1
        replay = client.post("/v1/save-slots/1/runs", headers=_headers(player_token), json=command)
        assert replay.status_code == 200 and replay.json()["replayed"] is True
        stale = client.post("/v1/save-slots/1/runs", headers=_headers(player_token), json={
            **command, "requestId": f"stale-{suffix}",
        })
        assert stale.status_code == 409
        assert client.get("/v1/save-slots/1", headers=_headers(player_token)).json()["serverRevision"] == 1

        dialogue = client.get("/v1/save-slots/1/dialogue/MS01", headers=_headers(player_token))
        assert dialogue.status_code == 200, dialogue.text
        payload = dialogue.json()
        choices = [
            {"choiceNodeId": item["choiceNodeId"], "choiceId": item["options"][0]["choiceId"]}
            for item in payload["sequence"] if item["type"] == "CHOICE"
        ]
        completion = {"dialogueToken": payload["dialogueToken"], "completionMode": "COMPLETE",
                      "selectedChoices": choices, "requestId": f"dialogue-{suffix}",
                      "expectedServerRevision": 1}
        completed = client.post("/v1/dialogue/complete", headers=_headers(player_token), json=completion)
        assert completed.status_code == 200, completed.text
        assert completed.json()["serverRevision"] == 2
        assert client.post("/v1/dialogue/complete", headers=_headers(player_token),
                           json=completion).json()["replayed"] is True

        scheduled = client.post("/v1/save-slots/1/schedule", headers=_headers(player_token), json={
            "requestId": f"schedule-{suffix}", "expectedServerRevision": 2,
            "activityIds": ["REST_DEFAULT"] * 5,
        })
        assert scheduled.status_code == 200, scheduled.text
        started_activity = client.post("/v1/save-slots/1/activities/start",
                                       headers=_headers(player_token), json={
            "requestId": f"activity-{suffix}", "expectedServerRevision": 3,
        })
        assert started_activity.status_code == 200, started_activity.text
        rested = client.post("/v1/save-slots/1/activities/complete-rest",
                             headers=_headers(player_token), json={
            "requestId": f"rest-{suffix}", "expectedServerRevision": 4,
        })
        assert rested.status_code == 200, rested.text
        assert rested.json()["serverRevision"] == 5

        assert client.get("/admin/balance", headers=_headers(player_token)).status_code == 403
        auth.set_custom_user_claims(operator.uid, {"admin": True}, app=services.app)
        operator_token = _sign_in(auth_host, operator.email, password)
        admin = client.post("/admin/session", headers=_headers(operator_token))
        assert admin.status_code == 200, admin.text
        detail = client.get(f"/admin/users/{player.uid}", headers=_headers(operator_token))
        assert detail.status_code == 200, detail.text
        balance = client.patch("/admin/balance", headers=_headers(operator_token), json={
            "rewardMultiplier": {"knowledge": 0.8},
        })
        assert balance.status_code == 200, balance.text
        assert balance.json()["rewardMultiplier"]["knowledge"] == 0.8
        audits = list(services.firestore.collection("adminAuditLogs").stream())
        assert any(doc.to_dict()["eventType"] == "BALANCE_CHANGE" for doc in audits)

        # A browser SDK token must not bypass the deny-all Firestore rules.
        direct = httpx.get(
            f"http://{firestore_host}/v1/projects/{PROJECT}/databases/(default)/documents/users/{player.uid}",
            headers=_headers(player_token), timeout=10,
        )
        assert direct.status_code == 403, direct.text

        removed = client.request("DELETE", "/v1/account", headers=_headers(player_token),
                                 json={"confirm": True})
        assert removed.status_code == 200, removed.text
        assert not services.firestore.collection("users").document(player.uid).get().exists
        assert list(services.firestore.collection("users").document(player.uid).collections()) == []
        with pytest.raises(UserNotFoundError):
            auth.get_user(player.uid, app=services.app)
    finally:
        if balance_before is None:
            balance_ref.delete()
        else:
            balance_ref.set(balance_before)
        for document in audit_collection.stream():
            if document.id not in audit_before:
                document.reference.delete()
        for uid in (unverified.uid, player.uid, operator.uid):
            try:
                auth.delete_user(uid, app=services.app)
            except UserNotFoundError:
                pass
