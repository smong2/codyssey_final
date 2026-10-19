"""Phase 8 collection view and career-ending decision API."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from .activities import KST, _daily_summary
from .models import AccountSettings, GlobalMetaProgress, GlobalStatistics, SaveSlot, UnlockState
from .progression_rules import (ProgressionError, choose_ending, evaluate_progression,
                                record_daily_unlocks)
from .repositories import MutationPlan, SaveSlotRepository, UserDocPath
from .save_slots import MutationRequest, get_slot_repository, mutation_response, _error as slot_error


router = APIRouter(tags=["progression"])
META = UserDocPath("meta", "progress")
STATISTICS = UserDocPath("statistics", "global")
UNLOCK = UserDocPath("unlockState", "global")
SETTINGS = UserDocPath("settings", "account")


class ProgressionRejected(Exception):
    pass


def _error(error: Exception) -> HTTPException:
    if isinstance(error, (ProgressionRejected, ProgressionError)):
        return HTTPException(409, str(error))
    return slot_error(error)


@router.get("/v1/collection")
def get_collection(repository: SaveSlotRepository = Depends(get_slot_repository)) -> dict:
    try:
        documents = repository.get_user_documents((META, STATISTICS, UNLOCK, SETTINGS))
        meta_raw = documents[META]
        statistics_raw = documents[STATISTICS]
        unlock_raw = documents[UNLOCK]
        settings_raw = documents[SETTINGS]
        if meta_raw is None or statistics_raw is None or unlock_raw is None or settings_raw is None:
            raise ProgressionRejected("Account progression is unavailable")
        meta = GlobalMetaProgress.model_validate(meta_raw)
        statistics = GlobalStatistics.model_validate(statistics_raw)
        unlock = UnlockState.model_validate(unlock_raw)
        settings = AccountSettings.model_validate(settings_raw)
        return {
            "meta": meta.model_dump(mode="json"),
            "statistics": statistics.model_dump(mode="json"),
            "pendingCharacterUnlockIds": unlock.pendingCharacterUnlockIds,
            "settings": settings.model_dump(mode="json"),
        }
    except Exception as error:
        raise _error(error) from None


@router.post("/v1/save-slots/{slot_id}/my-room/open")
def record_my_room_open(
    slot_id: int,
    body: MutationRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
) -> dict:
    """Count at most one My Room visit per run-week and evaluate its badges."""
    now = datetime.now(timezone.utc)
    kst_date = now.astimezone(KST).date().isoformat()
    day_path = UserDocPath("activityDays", kst_date)

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        if slot.status != "PLAYING" or not isinstance(slot.activeRun, dict):
            raise ProgressionRejected("No playing run")
        run = slot.activeRun
        run_id, week = run.get("runId"), run.get("week")
        if not isinstance(run_id, str) or not run_id or type(week) is not int or not 1 <= week <= 52:
            raise ProgressionRejected("Run week identity is invalid")
        phase = run.get("phase")
        if (run.get("pendingStoryEvent") is not None
                or phase in {"MAIN_STORY_PENDING", "ACTIVITY_IN_PROGRESS", "ACTIVITY_STORY_PENDING",
                             "ENDING_PENDING", "ENDING_DECIDED"}):
            raise ProgressionRejected("My Room visit cannot be counted in the current run phase")
        meta_raw, stats_raw, unlock_raw = documents[META], documents[STATISTICS], documents[UNLOCK]
        if meta_raw is None or stats_raw is None or unlock_raw is None:
            raise ProgressionRejected("Account progression is unavailable")
        meta = GlobalMetaProgress.model_validate(meta_raw)
        statistics = GlobalStatistics.model_validate(stats_raw)
        unlock = UnlockState.model_validate(unlock_raw)
        marker = f"MYROOM_ACTIVE_WEEK_{run_id}_{week:02d}"
        counted = marker not in unlock.completedConditionIds
        if counted:
            statistics.myRoomActiveWeekCount += 1
            unlock.completedConditionIds.append(marker)
        statistics.updatedAt = now
        daily = _daily_summary(documents[day_path], uid=repository.uid,
                               kst_date=kst_date, now=now)
        try:
            progression = evaluate_progression(
                uid=repository.uid, meta=meta, statistics=statistics,
                unlock=unlock, now=now,
            )
            record_daily_unlocks(daily, progression)
        except ProgressionError as error:
            raise ProgressionRejected(str(error)) from None
        return MutationPlan(
            slot=slot,
            documents={
                META: meta.model_dump(mode="python"),
                STATISTICS: statistics.model_dump(mode="python"),
                UNLOCK: unlock.model_dump(mode="python"),
                day_path: daily,
            },
            result_data={"counted": counted, "week": week,
                         "myRoomActiveWeekCount": statistics.myRoomActiveWeekCount,
                         "progression": progression.as_dict()},
        )

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="recordMyRoomOpen", command={},
            read_paths=(META, STATISTICS, UNLOCK, day_path), mutator=mutate,
        )
        return mutation_response(result, slot_id)
    except Exception as error:
        raise _error(error) from None


@router.post("/v1/save-slots/{slot_id}/ending/decision")
def decide_ending(
    slot_id: int,
    body: MutationRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
) -> dict:
    """Freeze the rule-engine career before Phase 9 asks Gemini for a letter."""
    now = datetime.now(timezone.utc)

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        if slot.status != "PLAYING" or not isinstance(slot.activeRun, dict):
            raise ProgressionRejected("No playing run")
        run = deepcopy(slot.activeRun)
        if run.get("phase") != "ENDING_PENDING":
            raise ProgressionRejected("Run is not ready for an ending decision")
        if run.get("week") != 52:
            raise ProgressionRejected("Career ending requires the completed 52-week run")
        if run.get("pendingStoryEvent") is not None:
            raise ProgressionRejected("Complete the pending Story before the ending")
        meta_raw = documents[META]
        if meta_raw is None:
            raise ProgressionRejected("Global progress is unavailable")
        meta = GlobalMetaProgress.model_validate(meta_raw)
        decision = choose_ending(run=run, seen_ending_ids=meta.seenEndingIds)
        run["endingDecision"] = {**decision, "decidedAt": now}
        run["phase"] = "ENDING_DECIDED"
        run["updatedAt"] = now
        slot.activeRun = run
        return MutationPlan(slot=slot, result_data=decision)

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="decideEnding", command={}, read_paths=(META,), mutator=mutate,
        )
        return mutation_response(result, slot_id)
    except Exception as error:
        raise _error(error) from None
