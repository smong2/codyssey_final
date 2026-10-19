"""Pet content is seeded in SQLite and only the active pet is exposed."""

from __future__ import annotations

import shutil
import sqlite3
import subprocess
import sys
from pathlib import Path

from backend.api.tests.test_phase3_account import headers
from backend.api.tests.test_phase5_save_slots import content_db, phase5_client


def test_pet_dialogue_seed_and_active_pet_endpoint(content_db, tmp_path):
    target = tmp_path / "pet-content.sqlite3"
    shutil.copy2(content_db, target)
    script = Path(__file__).resolve().parents[2] / "database/sqlite/seed_pet_dialogues.py"
    subprocess.run([sys.executable, str(script), "--db", str(target)], check=True, capture_output=True)
    with sqlite3.connect(target) as connection:
        assert connection.execute("SELECT COUNT(*) FROM pet_dialogues").fetchone()[0] == 200
        assert connection.execute(
            "SELECT COUNT(DISTINCT pet_id) FROM pet_dialogues"
        ).fetchone()[0] == 10
    client, database = phase5_client(target)
    with client:
        active = client.get("/v1/pets/PET01/dialogues", headers=headers())
        assert active.status_code == 200, active.text
        assert active.json()["petId"] == "PET01"
        assert len(active.json()["lines"]) == 20
        assert any("대서고" in line for line in active.json()["lines"])
        assert client.get("/v1/pets/PET02/dialogues", headers=headers()).status_code == 409
        database.data["users/owner/meta/progress"]["unlockedPetIds"].append("PET02")
        selected = client.patch("/v1/account/settings", json={"activePetId": "PET02"}, headers=headers())
        assert selected.status_code == 200, selected.text
        fox = client.get("/v1/pets/PET02/dialogues", headers=headers())
        assert fox.status_code == 200, fox.text
        assert len(fox.json()["lines"]) == 20
        assert any("룬" in line for line in fox.json()["lines"])
