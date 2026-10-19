"""Five-slot and new-run HTTP boundary; Firebase writes stay in the repository."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import NAMESPACE_URL, uuid5

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from .account import GAME_DATA_VERSION, _STATS, _TAGS
from .authentication import AuthenticatedUser, require_verified_user
from .content_master import ContentMaster, ContentMasterError, UnknownCharacter
from .dialogue_master import DialogueMaster, DialogueMasterError
from .firebase import FirebaseServices, get_firebase_services
from .models import GlobalMetaProgress, SaveSlot
from .repositories import (
    AccountNotFound, DeletionPending, InvalidMutation, MutationPlan, RequestIdReused,
    RevisionConflict, SaveSlotRepository, SlotNotFound, UserDocPath,
)


router = APIRouter(prefix="/v1/save-slots", tags=["save-slots"])
META_PATH = UserDocPath("meta", "progress")


class MutationRequest(BaseModel):
    requestId: str = Field(min_length=1, max_length=256)
    expectedServerRevision: int = Field(ge=0)


class StartRunRequest(MutationRequest):
    characterId: str = Field(pattern=r"^CH\d{2}$")


class DeleteSlotRequest(BaseModel):
    requestId: str = Field(min_length=1, max_length=256)
    expectedServerRevision: int | None = Field(default=None, ge=0)
    confirm: Literal[True]
    resetUnreadable: bool = False


class StartRunRejected(Exception):
    pass


def get_slot_repository(
    user: AuthenticatedUser = Depends(require_verified_user),
    services: FirebaseServices = Depends(get_firebase_services),
) -> SaveSlotRepository:
    return SaveSlotRepository(services.firestore, user.uid)


def get_content_master(request: Request) -> ContentMaster:
    return ContentMaster(request.app.state.settings.content_sqlite_path)


def get_diary_dialogue_master(request: Request) -> DialogueMaster:
    return DialogueMaster(
        request.app.state.settings.content_sqlite_path,
        asset_root=Path(__file__).resolve().parents[3] / "asset",
    )


def _slot_payload(slot: SaveSlot, dialogue_master: DialogueMaster | None = None) -> dict:
    payload = slot.model_dump(mode="json")
    active_run = slot.activeRun or {}
    schedule = active_run.get("weeklySchedule") or {}
    payload["recoveryRequired"] = any(
        isinstance(entry, dict) and entry.get("status") == "IN_PROGRESS"
        for entry in schedule.values()
    )
    if dialogue_master is not None and isinstance(payload.get("activeRun"), dict):
        run = payload["activeRun"]
        character_id = run.get("characterId")
        records = run.get("dialogueHistory") or []
        event_ids = {
            record.get("eventId") for record in records
            if isinstance(record, dict) and isinstance(record.get("eventId"), str)
        }
        try:
            texts = dialogue_master.choice_texts(
                version=slot.gameDataVersion, event_ids=event_ids,
                character_id=character_id,
            ) if isinstance(character_id, str) else {}
        except DialogueMasterError:
            texts = {}
        for record in records:
            if not isinstance(record, dict):
                continue
            for choice in record.get("selectedChoices") or []:
                if not isinstance(choice, dict) or choice.get("text"):
                    continue
                text = texts.get((
                    record.get("eventId"), choice.get("choiceNodeId"), choice.get("choiceId"),
                ))
                if text:
                    choice["text"] = text
    return payload


def _error(error: Exception) -> HTTPException:
    if isinstance(error, AccountNotFound):
        return HTTPException(404, "Account not initialized")
    if isinstance(error, SlotNotFound):
        return HTTPException(503, "Save slot unavailable (LOAD_ERROR)")
    if isinstance(error, DeletionPending):
        return HTTPException(409, "Account deletion in progress")
    if isinstance(error, (RevisionConflict, RequestIdReused)):
        return HTTPException(409, type(error).__name__)
    if isinstance(error, (StartRunRejected, InvalidMutation)):
        return HTTPException(409, str(error))
    if isinstance(error, UnknownCharacter):
        return HTTPException(422, "Character is not in the content master")
    if isinstance(error, ContentMasterError):
        return HTTPException(503, "Content master unavailable or incomplete")
    if isinstance(error, ValueError):
        return HTTPException(422, str(error))
    return HTTPException(503, "Save slot operation unavailable")


@router.get("")
def list_save_slots(
    repository: SaveSlotRepository = Depends(get_slot_repository),
    dialogue_master: DialogueMaster = Depends(get_diary_dialogue_master),
) -> dict:
    try:
        slots = repository.list_slots()
    except Exception as error:
        raise _error(error) from None
    return {"slots": [
        _slot_payload(slot, dialogue_master) if slot is not None else {"slotId": index, "status": "LOAD_ERROR"}
        for index, slot in enumerate(slots, 1)
    ]}


@router.get("/{slot_id}")
def get_save_slot(
    slot_id: int,
    repository: SaveSlotRepository = Depends(get_slot_repository),
    dialogue_master: DialogueMaster = Depends(get_diary_dialogue_master),
) -> dict:
    try:
        slot = repository.get(slot_id)
        if slot.slotId != slot_id:
            raise SlotNotFound
        return _slot_payload(slot, dialogue_master)
    except Exception as error:
        raise _error(error) from None


def _new_active_run(*, run_id: str, run_number: int, character_id: str,
                    modifiers: dict[str, int], bonuses: dict[str, int],
                    cast: dict[str, str], now: datetime) -> dict:
    stats = {stat: max(0, min(500, 50 + modifiers[stat] + bonuses[stat])) for stat in _STATS}
    return {
        "runId": run_id,
        "runNumber": run_number,
        "characterId": character_id,
        "week": 1,
        "day": "MONDAY",
        "phase": "MAIN_STORY_PENDING",
        "storyCast": cast,
        "pendingStoryEvent": {"eventId": "MS01", "eventType": "MAIN_STORY"},
        "storyEventWindow": {
            "week": 1,
            "sideStoryCount": 0,
            "locationStoryCount": 0,
            "lastResultStoryDay": None,
        },
        "startedAt": now,
        "updatedAt": now,
        "stats": stats,
        "stamina": {"current": 100, "max": 100},
        "hiddenStats": {tag: 0 for tag in _TAGS},
        "npcProgress": {},
        "storyProgress": {},
        "eventFlags": {},
        "representativeChoices": [],
        "dialogueHistory": [],
        "minigameFailStreaks": {},
        "weeklySchedule": {},
        "activityHistory": [],
        "completedWeekdayCount": 0,
        "forcedRest": {"active": False, "remainingWeekdays": 0},
        "runStatistics": {
            **{name: 0 for name in (
                "classCount", "adventureCount", "restCount", "minigamePlayCount",
                "minigameClearCount", "npcEncounterCount", "completedNpcStoryCount",
                "locationDiscoveryCount", "specialItemDiscoveryCount", "importantChoiceCount",
            )},
            "classCounts": {stat: 0 for stat in _STATS},
        },
    }


@router.post("/{slot_id}/runs")
def start_run(
    slot_id: int,
    body: StartRunRequest,
    user: AuthenticatedUser = Depends(require_verified_user),
    repository: SaveSlotRepository = Depends(get_slot_repository),
    content: ContentMaster = Depends(get_content_master),
) -> dict:
    if not 1 <= slot_id <= 5:
        raise HTTPException(422, "slot_id must be 1..5")
    # A retry must remain possible even when content data changes. The receipt is
    # checked inside apply before this pure mutator is called.
    now = datetime.now(timezone.utc)
    run_id = str(uuid5(NAMESPACE_URL, f"lumia:{user.uid}:{body.requestId}"))
    sibling_paths = tuple(UserDocPath("saveSlots", str(i)) for i in range(1, slot_id))
    read_paths = (META_PATH, *sibling_paths)

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        if slot.status not in {"EMPTY", "RUN_COMPLETE"}:
            raise StartRunRejected("Slot is already playing")
        if slot.status == "EMPTY":
            for path in sibling_paths:
                raw = documents[path]
                if raw is None:
                    raise StartRunRejected("Earlier slot is unavailable (LOAD_ERROR)")
                try:
                    earlier = SaveSlot.model_validate(raw)
                except ValueError:
                    raise StartRunRejected("Earlier slot is unavailable (LOAD_ERROR)") from None
                if earlier.status == "EMPTY":
                    raise StartRunRejected("Use the first empty slot")
        raw_meta = documents[META_PATH]
        if raw_meta is None:
            raise StartRunRejected("Global progress is unavailable")
        meta = GlobalMetaProgress.model_validate(raw_meta)
        if body.characterId not in meta.unlockedCharacterIds:
            raise StartRunRejected("Character is locked")
        bonuses = meta.permanentBonuses
        if set(bonuses) != set(_STATS) or any(not 0 <= bonuses[stat] <= 15 for stat in _STATS):
            raise StartRunRejected("Permanent bonuses are invalid")
        modifiers, cast = content.character_and_cast(
            version=slot.gameDataVersion, character_id=body.characterId
        )
        slot.status = "PLAYING"
        slot.createdAt = slot.createdAt or now
        slot.activeRun = _new_active_run(
            run_id=run_id, run_number=slot.completedRunCount + 1,
            character_id=body.characterId, modifiers=modifiers,
            bonuses=bonuses, cast=cast, now=now,
        )
        return MutationPlan(slot=slot)

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="startRun", command={"characterId": body.characterId},
            read_paths=read_paths, mutator=mutate,
        )
        return {"slotId": slot_id, "serverRevision": result.server_revision, "replayed": result.replayed}
    except Exception as error:
        raise _error(error) from None


@router.delete("/{slot_id}")
def delete_save_slot(
    slot_id: int,
    body: DeleteSlotRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
) -> dict:
    if body.resetUnreadable:
        if body.expectedServerRevision is not None:
            raise HTTPException(422, "Unreadable slot reset must not guess a server revision")
        try:
            result = repository.reset_unreadable(
                slot_id=slot_id, request_id=body.requestId,
                game_data_version=GAME_DATA_VERSION,
            )
            return {"slotId": slot_id, "serverRevision": result.server_revision,
                    "replayed": result.replayed}
        except Exception as error:
            raise _error(error) from None
    if body.expectedServerRevision is None:
        raise HTTPException(422, "expectedServerRevision is required")

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        if slot.status == "EMPTY":
            raise StartRunRejected("Slot is already empty")
        slot.status = "EMPTY"
        slot.activeRun = None
        slot.completedRunCount = 0
        slot.lastCompletedCharacterId = None
        slot.lastEndingId = None
        slot.createdAt = None
        return MutationPlan(slot=slot, clear_last_saved_at=True)

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="deleteSlot", command={"confirm": True},
            read_paths=(), mutator=mutate,
        )
        return {"slotId": slot_id, "serverRevision": result.server_revision, "replayed": result.replayed}
    except Exception as error:
        raise _error(error) from None


@router.post("/{slot_id}/recover")
def recover_interrupted_activity(
    slot_id: int,
    body: MutationRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
) -> dict:
    """Confirm an interrupted activity without replaying rewards or stamina cost."""
    now = datetime.now(timezone.utc)

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        if slot.status != "PLAYING" or slot.activeRun is None:
            raise StartRunRejected("No active run to recover")
        run = deepcopy(slot.activeRun)
        schedule = run.get("weeklySchedule")
        weekdays = ("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY")
        day = run.get("day")
        completed_count = run.get("completedWeekdayCount")
        if (not isinstance(schedule, dict) or set(schedule) != set(weekdays)
                or day not in weekdays or type(completed_count) is not int
                or completed_count != weekdays.index(day)):
            raise StartRunRejected("Weekly schedule is unavailable")
        in_progress = [key for key, value in schedule.items()
                       if isinstance(value, dict) and value.get("status") == "IN_PROGRESS"]
        if in_progress != [day]:
            raise StartRunRejected("Expected exactly one interrupted activity")
        entry = schedule[day]
        entry["status"] = "COMPLETED"
        entry["resolution"] = "INTERRUPTED"
        entry["completedAt"] = now
        history = run.setdefault("activityHistory", [])
        week = run.get("week")
        if (not isinstance(history, list) or len(history) >= 260
                or type(week) is not int or not 1 <= week <= 52
                or not isinstance(entry.get("type"), str) or not entry["type"]
                or not isinstance(entry.get("contentId"), str) or not entry["contentId"]):
            raise StartRunRejected("Stored activity history is invalid")
        if any(not isinstance(item, dict)
               or type(item.get("week")) is not int or not 1 <= item["week"] <= 52
               or type(item.get("day")) is not int or not 0 <= item["day"] < len(weekdays)
               for item in history):
            raise StartRunRejected("Stored activity history is invalid")
        day_index = weekdays.index(day)
        if any(isinstance(item, dict) and item.get("week") == week
               and item.get("day") == day_index for item in history):
            raise StartRunRejected("Activity history already contains this weekday")
        record = {
            "week": week, "day": day_index, "type": entry["type"],
            "contentId": entry["contentId"], "status": "COMPLETED",
            "resolution": "INTERRUPTED",
        }
        for key in ("staminaBefore", "staminaCost", "staminaRecovered", "growthApplied",
                    "growthAwarded", "result", "foundCount", "targetCount"):
            if key in entry:
                record[key] = deepcopy(entry[key])
        history.append(record)
        history.sort(key=lambda item: (item["week"], item["day"]))
        run["completedWeekdayCount"] = completed_count + 1
        if run["completedWeekdayCount"] < len(weekdays):
            run["day"] = weekdays[run["completedWeekdayCount"]]
        run["phase"] = "MY_ROOM_RECOVERY"
        run["updatedAt"] = now
        slot.activeRun = run
        return MutationPlan(slot=slot)

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="recoverInterruptedActivity", command={},
            read_paths=(), mutator=mutate,
        )
        return {"slotId": slot_id, "serverRevision": result.server_revision, "replayed": result.replayed}
    except Exception as error:
        raise _error(error) from None
