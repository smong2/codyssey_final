"""The reviewed activity catalog seeds without modifying existing Story data."""

from __future__ import annotations

from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys

from backend.api.app.activity_rules import ActivityMaster
from backend.api.tests.test_phase3_account import headers
from backend.api.tests.test_phase5_save_slots import content_db, phase5_client, start


ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "backend/database/sqlite/seed_activities.py"
VERSION = "dev-dialogue-v1"


def _seed(database_path: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--db", str(database_path), "--version", VERSION],
        cwd=ROOT, capture_output=True, text=True,
    )


def test_catalog_seed_is_idempotent_and_real_schedule_uses_it(content_db, tmp_path):
    target = tmp_path / "reviewed.sqlite3"
    shutil.copyfile(content_db, target)
    first = _seed(target)
    assert first.returncode == 0, first.stderr
    assert "11 activities / 6 minigames" in first.stdout
    second = _seed(target)
    assert second.returncode == 0, second.stderr
    with sqlite3.connect(target) as connection:
        assert connection.execute(
            "SELECT COUNT(*) FROM activities WHERE version=?", (VERSION,)
        ).fetchone()[0] == 11
        assert connection.execute(
            "SELECT COUNT(*) FROM minigames WHERE version=?", (VERSION,)
        ).fetchone()[0] == 6
        assert connection.execute(
            "PRAGMA foreign_key_check"
        ).fetchall() == []
    master = ActivityMaster(target)
    assert master.get(version=VERSION, activity_id="rune-pin-training").target_stat == "skill"
    assert master.get(version=VERSION, activity_id="ADV_LIBRARY").location_id == "LIB"
    assert master.get(version=VERSION, activity_id="fairy-trade").stamina_cost == 0
    assert master.get(version=VERSION, activity_id="REST_DEFAULT").activity_type == "REST"

    client, database = phase5_client(target)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        confirmed = client.post(
            "/v1/save-slots/1/schedule", headers=headers(),
            json={"requestId": "catalog-schedule", "expectedServerRevision": 1,
                  "activityIds": ["rune-circuit", "ADV_GREENHOUSE", "REST_DEFAULT",
                                  "starlight-stage", "fairy-trade"]},
        )
        assert confirmed.status_code == 200, confirmed.text
        begun = client.post(
            "/v1/save-slots/1/activities/start", headers=headers(),
            json={"requestId": "catalog-start", "expectedServerRevision": 2},
        )
        assert begun.status_code == 200, begun.text
        assert begun.json()["gameId"] == "rune-circuit"
        assert begun.json()["locationId"] == "WRK"
        assert begun.json()["targetStat"] == "magic"
        assert begun.json()["staminaCost"] == 10


def test_seed_rejects_conflicting_existing_row_without_partial_changes(content_db, tmp_path):
    target = tmp_path / "conflict.sqlite3"
    shutil.copyfile(content_db, target)
    assert _seed(target).returncode == 0
    with sqlite3.connect(target) as connection:
        connection.execute(
            "UPDATE activities SET stamina_cost=9 WHERE version=? AND activity_id='rune-circuit'",
            (VERSION,),
        )
    failed = _seed(target)
    assert failed.returncode != 0
    assert "conflicts" in failed.stderr
    with sqlite3.connect(target) as connection:
        assert connection.execute(
            "SELECT stamina_cost FROM activities WHERE version=? AND activity_id='rune-circuit'",
            (VERSION,),
        ).fetchone()[0] == 9
        assert connection.execute(
            "SELECT COUNT(*) FROM activities WHERE version=?", (VERSION,)
        ).fetchone()[0] == 11
