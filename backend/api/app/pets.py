"""Read-only, account-scoped pet dialogue from the SQLite content master."""

from __future__ import annotations

from contextlib import closing
from pathlib import Path
import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Request

from .account import GAME_DATA_VERSION
from .models import AccountSettings
from .repositories import SaveSlotRepository, UserDocPath
from .save_slots import get_slot_repository

router = APIRouter(tags=["pets"])


@router.get("/v1/pets/{pet_id}/dialogues")
def get_pet_dialogues(
    pet_id: str,
    request: Request,
    repository: SaveSlotRepository = Depends(get_slot_repository),
) -> dict:
    raw = repository.get_user_document(UserDocPath("settings", "account"))
    if raw is None:
        raise HTTPException(404, "Account settings unavailable")
    settings = AccountSettings.model_validate(raw)
    if pet_id != settings.activePetId:
        raise HTTPException(409, "Pet is not active")
    path = Path(request.app.state.settings.content_sqlite_path).resolve()
    try:
        with closing(sqlite3.connect(f"{path.as_uri()}?mode=ro", uri=True)) as connection:
            connection.execute("PRAGMA query_only = ON")
            rows = connection.execute(
                """SELECT line_text FROM pet_dialogues
                   WHERE version = ? AND pet_id = ? ORDER BY line_no""",
                (GAME_DATA_VERSION, pet_id),
            ).fetchall()
    except (OSError, sqlite3.Error):
        raise HTTPException(503, "Pet dialogue is unavailable") from None
    lines = [row[0] for row in rows]
    if len(lines) != 20:
        raise HTTPException(503, "Pet dialogue is incomplete")
    return {"petId": pet_id, "lines": lines}
