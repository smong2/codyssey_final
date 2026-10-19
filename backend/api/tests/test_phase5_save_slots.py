"""Phase 5 slot API tests; Firebase is replaced by an in-memory transaction."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import replace
from datetime import datetime, timezone
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from backend.api.app.account import _initial_documents
from backend.api.app.content_master import ContentMaster
from backend.api.app.main import create_app
from backend.api.app.repositories import SaveSlotRepository
from backend.api.app.save_slots import get_slot_repository
from backend.api.tests.test_phase2 import settings
from backend.api.tests.test_phase3_account import Auth, Database, headers
from backend.api.tests.test_phase4_repositories import offline_runner


@pytest.fixture(scope="session")
def content_db(tmp_path_factory):
    target = tmp_path_factory.mktemp("phase5-content") / "master.sqlite3"
    root = Path(__file__).resolve().parents[3]
    for script in ("seed_dialogue_content.py", "seed_npc_story.py", "seed_location_story_master.py"):
        subprocess.run(
            [sys.executable, str(root / "backend/database/sqlite" / script),
             "--db", str(target), "--migrate", "--version", "dev-dialogue-v1"],
            cwd=root, check=True, capture_output=True, text=True,
        )
    return target


def phase5_client(content_db, *, dialogue_secret=None):
    database = Database()
    now = datetime.now(timezone.utc)
    for path, data in _initial_documents(now, now).items():
        database.data["users/owner" + (f"/{path}" if path else "")] = deepcopy(data)
    services = SimpleNamespace(auth=Auth(), firestore=database)
    api = create_app(
        settings=replace(settings(), content_sqlite_path=str(content_db),
                         dialogue_token_secret=dialogue_secret),
        firebase_factory=lambda _: services,
    )
    api.dependency_overrides[get_slot_repository] = lambda: SaveSlotRepository(
        database, "owner", transaction_runner=offline_runner
    )
    return TestClient(api), database


def start(client, slot=1, *, character="CH01", request="start-1", revision=0):
    return client.post(
        f"/v1/save-slots/{slot}/runs",
        headers=headers(),
        json={"requestId": request, "expectedServerRevision": revision, "characterId": character},
    )


def test_real_content_cast_and_modifiers_are_read_only(content_db):
    master = ContentMaster(content_db)
    modifiers, cast = master.character_and_cast(version="dev-dialogue-v1", character_id="CH16")
    assert set(modifiers) == {"knowledge", "expression", "skill", "exploration", "magic"}
    assert cast["NPC_GUIDE_ACTOR"] == "CH15"
    _, cast = master.character_and_cast(version="dev-dialogue-v1", character_id="CH25")
    assert cast["NPC_WORK_ACTOR"] == "CH26"


def test_missing_server_master_cannot_create_run(tmp_path):
    client, database = phase5_client(tmp_path / "not-built.sqlite3")
    with client:
        assert start(client).status_code == 503
        assert database.data["users/owner/saveSlots/1"]["status"] == "EMPTY"
        assert not any("/requestReceipts/" in path for path in database.data)


def test_first_empty_slot_run_is_server_generated_and_retry_safe(content_db):
    client, database = phase5_client(content_db)
    with client:
        slots = client.get("/v1/save-slots", headers=headers()).json()["slots"]
        assert len(slots) == 5 and all(slot["status"] == "EMPTY" for slot in slots)
        assert start(client, slot=2, request="skip-first").status_code == 409
        assert start(client, character="CH25", request="locked").status_code == 409

        response = start(client, character="CH16")
        assert response.status_code == 200, response.text
        payload = response.json()
        assert {key: payload[key] for key in ("slotId", "serverRevision", "replayed")} == {
            "slotId": 1, "serverRevision": 1, "replayed": False,
        }
        assert payload["slot"]["serverRevision"] == 1
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["stats"] == {stat: 50 for stat in ("knowledge", "expression", "skill", "exploration", "magic")}
        assert run["storyCast"]["NPC_GUIDE_ACTOR"] == "CH15"
        assert run["pendingStoryEvent"]["eventId"] == "MS01"
        assert run["stamina"] == {"current": 100, "max": 100}
        assert start(client, character="CH16").json()["replayed"] is True
        assert start(client, character="CH16", request="stale").status_code == 409
        assert database.data["users/owner/saveSlots/1"]["activeRun"] == run

        second = start(client, slot=2, character="CH01", request="start-2")
        assert second.status_code == 200, second.text
        assert database.data["users/owner/saveSlots/2"]["activeRun"]["runId"] != run["runId"]


def test_delete_resets_only_one_slot_and_preserves_global_data(content_db):
    client, database = phase5_client(content_db)
    with client:
        assert start(client).status_code == 200
        global_before = deepcopy(database.data["users/owner/meta/progress"])
        response = client.request(
            "DELETE", "/v1/save-slots/1", headers=headers(),
            json={"confirm": True, "requestId": "delete-1", "expectedServerRevision": 1},
        )
        assert response.status_code == 200, response.text
        assert database.data["users/owner/meta/progress"] == global_before
        slot = database.data["users/owner/saveSlots/1"]
        assert slot["status"] == "EMPTY" and slot["activeRun"] is None
        assert slot["lastSavedAt"] is None and slot["completedRunCount"] == 0
        replay = client.request(
            "DELETE", "/v1/save-slots/1", headers=headers(),
            json={"confirm": True, "requestId": "delete-1", "expectedServerRevision": 1},
        )
        assert replay.json()["replayed"] is True
        assert start(client, request="same-character-new-run", revision=2).status_code == 200


def test_missing_slot_is_load_error_and_recovery_read_is_non_mutating(content_db):
    client, database = phase5_client(content_db)
    with client:
        del database.data["users/owner/saveSlots/3"]
        slots = client.get("/v1/save-slots", headers=headers()).json()["slots"]
        assert slots[2] == {"slotId": 3, "status": "LOAD_ERROR"}
        assert client.get("/v1/save-slots/3", headers=headers()).status_code == 503
        global_before = deepcopy(database.data["users/owner/meta/progress"])
        deleted = client.request(
            "DELETE", "/v1/save-slots/3", headers=headers(),
            json={"confirm": True, "resetUnreadable": True,
                  "requestId": "delete-broken-3"},
        )
        assert deleted.status_code == 200, deleted.text
        assert database.data["users/owner/saveSlots/3"]["status"] == "EMPTY"
        assert database.data["users/owner/meta/progress"] == global_before
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["weeklySchedule"] = {
            day: {"status": "IN_PROGRESS" if index == 0 else "PLANNED",
                  "type": "REST", "contentId": "REST_DEFAULT",
                  "staminaBefore": 100, "staminaCost": 0}
            for index, day in enumerate(("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"))
        }
        before = deepcopy(database.data)
        assert client.get("/v1/save-slots/1", headers=headers()).json()["recoveryRequired"] is True
        assert database.data == before
        response = client.post(
            "/v1/save-slots/1/recover", headers=headers(),
            json={"requestId": "recover-1", "expectedServerRevision": 1},
        )
        assert response.status_code == 200, response.text
        restored = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert restored["weeklySchedule"]["MONDAY"]["resolution"] == "INTERRUPTED"
        assert restored["weeklySchedule"]["MONDAY"]["status"] == "COMPLETED"
        assert restored["completedWeekdayCount"] == 1
        assert restored["day"] == "TUESDAY"
        assert restored["activityHistory"] == [{
            "week": 1, "day": 0, "type": "REST", "contentId": "REST_DEFAULT",
            "status": "COMPLETED", "resolution": "INTERRUPTED",
            "staminaBefore": 100, "staminaCost": 0,
        }]
        assert restored["stamina"] == before["users/owner/saveSlots/1"]["activeRun"]["stamina"]
        assert restored["stats"] == before["users/owner/saveSlots/1"]["activeRun"]["stats"]
        assert client.get("/v1/save-slots/1", headers=headers()).json()["recoveryRequired"] is False
        assert client.post(
            "/v1/save-slots/1/recover", headers=headers(),
            json={"requestId": "recover-1", "expectedServerRevision": 1},
        ).json()["replayed"] is True
