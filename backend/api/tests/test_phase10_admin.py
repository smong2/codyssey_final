"""Phase 10 administrator authentication, analytics, balance and privacy regressions."""

from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime, timezone
from types import SimpleNamespace

from fastapi.testclient import TestClient
from firebase_admin import auth

from backend.api.app.account import _initial_documents
from backend.api.app.activities import _daily_summary
from backend.api.app.admin import get_admin_repository
from backend.api.app.admin_repository import AdminRepository
from backend.api.app.main import create_app
from backend.api.tests.test_phase2 import settings
from backend.api.tests.test_phase3_account import Auth, Database, headers
from backend.api.tests.test_phase4_repositories import offline_runner


def _client(*, admin=True, auth_error=None):
    database = Database()
    auth_client = Auth(admin=admin, error=auth_error)
    services = SimpleNamespace(auth=auth_client, firestore=database)
    api = create_app(settings=settings(), firebase_factory=lambda _: services)
    api.dependency_overrides[get_admin_repository] = lambda: AdminRepository(
        database, transaction_runner=offline_runner,
    )
    return TestClient(api), database, auth_client


def _add_user(database, uid: str, *, created_at: datetime | None = None):
    now = datetime.now(timezone.utc)
    docs = _initial_documents(created_at or now, now)
    for path, raw in docs.items():
        full = f"users/{uid}" + (f"/{path}" if path else "")
        database.data[full] = deepcopy(raw)


def _audit_rows(database):
    return [
        value for path, value in database.data.items()
        if path.startswith("adminAuditLogs/")
    ]


def test_admin_session_audits_success_and_non_admin_failure_without_token_storage():
    client, database, _ = _client(admin=True)
    with client:
        response = client.post("/admin/session", headers=headers("admin"))
        assert response.status_code == 200
        assert response.json() == {"admin": True, "uid": "admin"}
    audit = _audit_rows(database)
    assert len(audit) == 1
    assert audit[0]["eventType"] == "ADMIN_LOGIN"
    assert audit[0]["result"] == "SUCCESS"
    assert audit[0]["adminUid"] == "admin"
    assert "token" not in repr(audit[0]).lower()

    client, database, _ = _client(admin=False)
    with client:
        response = client.post("/admin/session", headers=headers("ordinary-user"))
        assert response.status_code == 403
    audit = _audit_rows(database)
    assert len(audit) == 1
    assert audit[0]["result"] == "FAILURE"
    assert audit[0]["reasonCode"] == "NOT_ADMIN"
    assert "ordinary-user" not in repr(audit[0])
    assert len(audit[0]["identifierHash"]) == 64


def test_invalid_admin_token_is_audited_without_provider_secret():
    client, database, _ = _client(
        admin=True, auth_error=auth.InvalidIdTokenError("provider-secret-detail")
    )
    with client:
        response = client.post("/admin/session", headers=headers("invalid-token-value"))
        assert response.status_code == 401
        assert "provider-secret-detail" not in response.text
    audit = _audit_rows(database)
    assert len(audit) == 1
    assert audit[0]["result"] == "FAILURE"
    assert audit[0]["reasonCode"] == "TOKEN_INVALID"
    serialized = repr(audit[0])
    assert "provider-secret-detail" not in serialized
    assert "invalid-token-value" not in serialized


def test_all_admin_data_routes_reject_normal_verified_user():
    client, database, _ = _client(admin=False)
    _add_user(database, "owner")
    with client:
        assert client.get("/admin/users", headers=headers("viewer")).status_code == 403
        assert client.get("/admin/users/owner", headers=headers("viewer")).status_code == 403
        assert client.get(
            "/admin/analytics", params={"period": "day", "anchor": "2026-10-18"},
            headers=headers("viewer"),
        ).status_code == 403
        assert client.get("/admin/balance", headers=headers("viewer")).status_code == 403
        assert client.patch(
            "/admin/balance", json={"rewardMultiplier": {"knowledge": 0.8}},
            headers=headers("viewer"),
        ).status_code == 403


def test_admin_user_lookup_by_uid_and_email_is_read_only_and_hides_raw_hidden_stats():
    client, database, _ = _client(admin=True)
    _add_user(database, "owner")
    slot = database.data["users/owner/saveSlots/1"]
    slot["status"] = "PLAYING"
    slot["activeRun"] = {
        "runId": "run-admin-read", "runNumber": 1, "characterId": "CH01",
        "week": 12, "day": "WEDNESDAY", "phase": "STORY_COMPLETE",
        "stats": {"knowledge": 91, "expression": 72, "skill": 65, "exploration": 88, "magic": 77},
        "stamina": {"current": 60, "max": 100},
        "hiddenStats": {"curiosity": 222, "honesty": 111},
        "runStatistics": {"classCount": 10},
    }
    database.data["users/owner/statistics/global"]["totalClassCount"] = 10
    before = deepcopy(database.data)
    with client:
        by_uid = client.get("/admin/users", params={"query": "owner"}, headers=headers("admin"))
        assert by_uid.status_code == 200, by_uid.text
        assert by_uid.json()["items"][0]["email"] == "owner@example.com"
        by_email = client.get(
            "/admin/users", params={"query": "owner@example.com"}, headers=headers("admin"),
        )
        assert by_email.status_code == 200
        assert by_email.json()["items"][0]["uid"] == "owner"
        detail = client.get("/admin/users/owner", headers=headers("admin"))
        assert detail.status_code == 200, detail.text
        payload = detail.json()
        assert payload["slots"][0]["activeRun"]["stats"]["knowledge"] == 91
        assert "hiddenStats" not in detail.text
        assert "222" not in detail.text and "111" not in detail.text
        assert "password" not in detail.text.lower()
    assert database.data == before


def test_monthly_analytics_rebuild_sums_days_but_deduplicates_active_users():
    client, database, _ = _client(admin=True)
    created = datetime(2026, 10, 1, 1, 0, tzinfo=timezone.utc)
    _add_user(database, "owner", created_at=created)
    _add_user(database, "other", created_at=created)
    t1 = datetime(2026, 10, 1, 3, 0, tzinfo=timezone.utc)
    t2 = datetime(2026, 10, 2, 3, 0, tzinfo=timezone.utc)

    owner_1 = _daily_summary(None, uid="owner", kst_date="2026-10-01", now=t1)
    owner_1["activityCounts"]["class"] = 2
    owner_1["minigame"].update(playCount=2, successCount=1, greatCount=1)
    owner_1["minigame"]["byGameId"] = {"game-a": {"success": 1, "great": 1}}
    database.data["users/owner/activityDays/2026-10-01"] = owner_1

    owner_2 = _daily_summary(None, uid="owner", kst_date="2026-10-02", now=t2)
    owner_2["activityCounts"]["adventure"] = 1
    owner_2["run"]["completedRunCount"] = 1
    owner_2["run"]["firstCompletedRunUserCount"] = 1
    owner_2["run"]["endingViewCounts"] = {"ENDING_RUNE_RESEARCHER": 1}
    owner_2["run"]["finalStatSums"] = {stat: 300 for stat in (
        "knowledge", "expression", "skill", "exploration", "magic")}
    owner_2["run"]["finalStatGte300Counts"] = {stat: 1 for stat in (
        "knowledge", "expression", "skill", "exploration", "magic")}
    owner_2["run"]["finalStatGte500Counts"] = {stat: 0 for stat in (
        "knowledge", "expression", "skill", "exploration", "magic")}
    database.data["users/owner/activityDays/2026-10-02"] = owner_2

    other_2 = _daily_summary(None, uid="other", kst_date="2026-10-02", now=t2)
    other_2["activityCounts"]["rest"] = 1
    database.data["users/other/activityDays/2026-10-02"] = other_2
    database.data["users/owner/statistics/global"]["totalClassCount"] = 2
    database.data["users/owner/statistics/global"]["totalAdventureCount"] = 1
    database.data["users/owner/statistics/global"]["totalCompletedRuns"] = 1
    database.data["users/other/statistics/global"]["totalRestCount"] = 1

    with client:
        rebuilt = client.post(
            "/admin/analytics/rebuild",
            headers=headers("admin"),
            json={"period": "month", "anchor": "2026-10-18"},
        )
        assert rebuilt.status_code == 200, rebuilt.text
        payload = rebuilt.json()
        assert payload["complete"] is True
        assert payload["startDate"] == "2026-10-01" and payload["endDate"] == "2026-10-31"
        assert payload["metrics"]["activeUserCount"] == 2  # owner is active on two days, counted once
        assert payload["metrics"]["activityCounts"] == {
            "class": 2, "adventure": 1, "rest": 1, "special": 0, "forcedRest": 0,
        }
        assert payload["metrics"]["run"]["completedRunCount"] == 1
        assert payload["metrics"]["run"]["finalStatAverages"]["knowledge"] == 300.0
        assert payload["metrics"]["run"]["finalStatGte300Ratios"]["magic"] == 1.0
        assert payload["metrics"]["minigame"]["successRatio"] == 1.0
        assert payload["currentUsers"]["totalUserCount"] == 2
        assert payload["currentUsers"]["completedUserCount"] == 1
        stored_days = [path for path in database.data if path.startswith("analyticsDays/")]
        assert len(stored_days) == 31


def test_balance_patch_validates_step_increments_version_and_writes_audit_atomically():
    client, database, _ = _client(admin=True)
    with client:
        initial = client.get("/admin/balance", headers=headers("admin"))
        assert initial.status_code == 200
        assert initial.json()["version"] == 0
        assert set(initial.json()["rewardMultiplier"].values()) == {1.0}

        first = client.patch(
            "/admin/balance", headers=headers("admin"),
            json={"rewardMultiplier": {"knowledge": 0.8}},
        )
        assert first.status_code == 200, first.text
        assert first.json()["version"] == 1
        assert first.json()["rewardMultiplier"]["knowledge"] == 0.8
        assert first.json()["rewardMultiplier"]["magic"] == 1.0

        second = client.patch(
            "/admin/balance", headers=headers("admin"),
            json={"rewardMultiplier": {"magic": 0.7}},
        )
        assert second.status_code == 200
        assert second.json()["version"] == 2
        invalid = client.patch(
            "/admin/balance", headers=headers("admin"),
            json={"rewardMultiplier": {"skill": 0.85}},
        )
        assert invalid.status_code == 422

    assert database.data["systemSettings/balance"]["version"] == 2
    audits = [row for row in _audit_rows(database) if row["eventType"] == "BALANCE_CHANGE"]
    assert len(audits) == 2
    assert audits[-1]["before"]["knowledge"] == 0.8
    assert audits[-1]["after"]["magic"] == 0.7
    assert audits[-1]["version"] == 2
    serialized = repr(audits).lower()
    assert "password" not in serialized and "gemini" not in serialized and "token" not in serialized
