"""Phase 2 startup, configuration, Firebase reuse, and public response tests."""

from __future__ import annotations

import json
from types import SimpleNamespace
from unittest.mock import patch

import firebase_admin
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Depends
from fastapi.testclient import TestClient

from backend.api.app.config import ConfigError, Settings, parse_cors_origins
from backend.api.app.firebase import FirebaseStartupError, initialize_firebase
from backend.api.app.main import create_app, get_firebase_services


SECRET = "PRIVATE_KEY_MUST_NOT_APPEAR"


def settings() -> Settings:
    return Settings(
        firebase_project_id="lumia-test",
        firebase_service_account={
            "type": "service_account",
            "project_id": "lumia-test",
            "client_email": "test@example.invalid",
            "private_key": SECRET,
        },
        cors_origins=("http://127.0.0.1:4173",),
        gemini_api_key="GEMINI_SECRET_MUST_NOT_APPEAR",
    )


def test_missing_environment_is_a_clear_startup_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("FIREBASE_PROJECT_ID", raising=False)
    monkeypatch.delenv("FIREBASE_SERVICE_ACCOUNT_JSON", raising=False)
    api = create_app(firebase_factory=lambda _: object())
    with pytest.raises(ConfigError, match="FIREBASE_PROJECT_ID"):
        with TestClient(api):
            pass


def test_service_account_configuration_is_validated_without_leaking_secrets() -> None:
    base = {
        "FIREBASE_PROJECT_ID": "lumia-test",
        "FIREBASE_SERVICE_ACCOUNT_JSON": json.dumps(settings().firebase_service_account),
        "CORS_ORIGINS": "http://127.0.0.1:4173,https://game.example,https://game.example",
    }
    parsed = Settings.from_env(base)
    assert parsed.cors_origins == ("http://127.0.0.1:4173", "https://game.example")
    assert SECRET not in repr(parsed)

    with pytest.raises(ConfigError) as error:
        Settings.from_env({**base, "FIREBASE_PROJECT_ID": "other-project"})
    assert SECRET not in str(error.value)
    with pytest.raises(ConfigError) as error:
        Settings.from_env({**base, "FIREBASE_SERVICE_ACCOUNT_JSON": SECRET})
    assert SECRET not in str(error.value)


@pytest.mark.parametrize("origin", ["*", "https://game.example/path", "http://localhost:bad"])
def test_cors_rejects_non_origins(origin: str) -> None:
    with pytest.raises(ConfigError, match="CORS_ORIGINS"):
        parse_cors_origins(origin)


def test_health_and_cors_do_not_expose_configuration() -> None:
    api = create_app(settings=settings(), firebase_factory=lambda _: object())
    with TestClient(api) as client:
        response = client.get("/health")
        allowed = client.options(
            "/health",
            headers={
                "Origin": "http://127.0.0.1:4173",
                "Access-Control-Request-Method": "GET",
            },
        )
        denied = client.options(
            "/health",
            headers={
                "Origin": "https://untrusted.example",
                "Access-Control-Request-Method": "GET",
            },
        )
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert allowed.headers["access-control-allow-origin"] == "http://127.0.0.1:4173"
    assert denied.status_code == 400
    assert SECRET not in response.text
    assert "GEMINI_SECRET_MUST_NOT_APPEAR" not in response.text


def test_firebase_dependency_can_be_replaced_in_tests() -> None:
    api = create_app(settings=settings(), firebase_factory=lambda _: object())

    @api.get("/_dependency-test")
    def dependency_test(value: object = Depends(get_firebase_services)) -> dict[str, bool]:
        return {"replaced": value is sentinel}

    sentinel = object()
    api.dependency_overrides[get_firebase_services] = lambda: sentinel
    with TestClient(api) as client:
        assert client.get("/_dependency-test").json() == {"replaced": True}


def test_firebase_admin_app_is_initialized_once_and_reused() -> None:
    existing = SimpleNamespace(project_id="lumia-test")
    database = object()
    with (
        patch("backend.api.app.firebase.firebase_admin.get_app", side_effect=[ValueError(), existing]),
        patch("backend.api.app.firebase.credentials.Certificate", return_value=object()) as certificate,
        patch("backend.api.app.firebase.firebase_admin.initialize_app", return_value=existing) as initialize,
        patch("backend.api.app.firebase.firestore.client", return_value=database) as firestore_client,
    ):
        first = initialize_firebase(settings())
        second = initialize_firebase(settings())
    assert first.app is second.app is existing
    assert first.firestore is second.firestore is database
    assert certificate.call_count == 1
    assert initialize.call_count == 1
    assert firestore_client.call_count == 2


def test_firebase_rejects_existing_app_for_another_project() -> None:
    with patch(
        "backend.api.app.firebase.firebase_admin.get_app",
        return_value=SimpleNamespace(project_id="different-project"),
    ):
        with pytest.raises(FirebaseStartupError, match="project"):
            initialize_firebase(settings())


def test_firebase_sdk_error_is_sanitized() -> None:
    with (
        patch("backend.api.app.firebase.firebase_admin.get_app", side_effect=ValueError()),
        patch("backend.api.app.firebase.credentials.Certificate", side_effect=ValueError(SECRET)),
    ):
        with pytest.raises(FirebaseStartupError) as error:
            initialize_firebase(settings())
    assert SECRET not in str(error.value)


def test_real_sdk_constructs_clients_with_an_ephemeral_offline_key() -> None:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_key = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("ascii")
    offline_settings = Settings(
        firebase_project_id="lumia-offline-test",
        firebase_service_account={
            "type": "service_account",
            "project_id": "lumia-offline-test",
            "private_key_id": "offline-test-only",
            "private_key": private_key,
            "client_email": "offline@lumia-offline-test.iam.gserviceaccount.com",
            "token_uri": "https://oauth2.googleapis.com/token",
        },
    )
    services = initialize_firebase(offline_settings)
    try:
        assert services.app.project_id == "lumia-offline-test"
        assert services.firestore.project == "lumia-offline-test"
        assert services.auth is not None
        api = create_app(settings=offline_settings)
        with TestClient(api) as client:
            assert client.get("/health").json() == {"status": "ok"}
            assert api.state.firebase_services.app is services.app
    finally:
        firebase_admin.delete_app(services.app)
