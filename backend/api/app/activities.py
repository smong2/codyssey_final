"""Phase 7 first safe boundary: confirm schedule and checkpoint activity start."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256
import json
from secrets import choice, token_urlsafe
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator

from typing import Literal

from .activity_rules import (ActivityMaster, ActivityMasterError, REST_RECOVERIES, STATS,
                             WEEKDAYS, adventure_difficulty, adventure_duration_seconds,
                             adventure_objective_count, difficulty)
from .class_replay import (CLASS_DURATIONS_MS, REPLAY_VERSION, SUPPORTED_REPLAY_GAMES,
                           ClassInput, ReplayRejected, replay_observatory_mirror,
                           replay_rune_circuit, replay_rune_pins,
                           replay_sealed_shelves,
                           replay_spirit_pots, replay_starlight_stage)
from .models import AccountSettings, GlobalMetaProgress, GlobalStatistics, SaveSlot, UnlockState
from .progression_rules import (ProgressionError, evaluate_progression,
                                record_daily_unlocks)
from .growth_rules import BalanceSettingsError, applied_growth, balance_snapshot
from .repositories import MutationPlan, SaveSlotRepository, SystemReadPath, UserDocPath
from .save_slots import MutationRequest, get_slot_repository, mutation_response, _error as slot_error
from .story_candidates import ActivityContext, StoryCandidates, StorySelectionError


router = APIRouter(prefix="/v1/save-slots", tags=["activities"])
STATISTICS = UserDocPath("statistics", "global")
META = UserDocPath("meta", "progress")
UNLOCK = UserDocPath("unlockState", "global")
SETTINGS = UserDocPath("settings", "account")
BALANCE = SystemReadPath("systemSettings", "balance")
KST = ZoneInfo("Asia/Seoul")


class ConfirmScheduleRequest(MutationRequest):
    # Position is authoritative: exactly Monday through Friday, in order.
    # None is required for weekdays reserved by an active forced rest.
    activityIds: list[str | None] = Field(min_length=5, max_length=5)


class StatTransfer(BaseModel):
    fromStat: str
    toStat: str
    amount: int = Field(ge=1, le=5)


class CompleteSpecialRequest(MutationRequest):
    skip: bool = False
    transfer: StatTransfer | None = None

    @model_validator(mode="after")
    def check_choice(self) -> CompleteSpecialRequest:
        if self.skip == (self.transfer is not None):
            raise ValueError("Choose exactly one of skip or transfer")
        return self


class CompleteClassReplayRequest(MutationRequest):
    model_config = ConfigDict(extra="forbid")

    inputLog: list[ClassInput] = Field(max_length=512)


class CompleteAdventureRequest(MutationRequest):
    model_config = ConfigDict(extra="forbid")

    resolution: Literal["MISSION_COMPLETE", "TIMEOUT"]
    foundCount: int = Field(ge=0, le=5)
    targetCount: int = Field(ge=1, le=5)

    @model_validator(mode="after")
    def check_counts(self) -> CompleteAdventureRequest:
        if self.foundCount > self.targetCount:
            raise ValueError("Found count cannot exceed target count")
        if self.resolution == "MISSION_COMPLETE" and self.foundCount != self.targetCount:
            raise ValueError("MISSION_COMPLETE requires finding all target items")
        if self.resolution == "TIMEOUT" and self.foundCount == self.targetCount:
            raise ValueError("TIMEOUT cannot have found all target items")
        return self


class CompleteRestRequest(MutationRequest):
    model_config = ConfigDict(extra="forbid")

    restChoice: Literal["HOME", "FRIENDS", "HOBBY"] = "HOME"


class ActivityRejected(Exception):
    pass


def get_activity_master(request: Request) -> ActivityMaster:
    return ActivityMaster(request.app.state.settings.content_sqlite_path)


def get_story_candidates(request: Request) -> StoryCandidates:
    return StoryCandidates(request.app.state.settings.content_sqlite_path)


def _active_run(slot: SaveSlot) -> dict:
    if slot.status != "PLAYING" or not isinstance(slot.activeRun, dict):
        raise ActivityRejected("No playing run")
    return deepcopy(slot.activeRun)


def _report_error(error: Exception) -> HTTPException:
    if isinstance(error, ActivityMasterError):
        return HTTPException(503, str(error))
    if isinstance(error, StorySelectionError):
        return HTTPException(503, str(error))
    if isinstance(error, BalanceSettingsError):
        return HTTPException(503, str(error))
    if isinstance(error, ReplayRejected):
        return HTTPException(409, str(error))
    if isinstance(error, ActivityRejected):
        return HTTPException(409, str(error))
    return slot_error(error)


def _daily_summary(raw: dict | None, *, uid: str, kst_date: str, now: datetime) -> dict:
    if raw is None:
        return {
            "uid": uid, "kstDate": kst_date, "firstActivityAt": now,
            "lastActivityAt": now,
            "activityCounts": {kind: 0 for kind in (
                "class", "adventure", "rest", "special", "forcedRest")},
            "minigame": {"playCount": 0, "failCount": 0, "successCount": 0,
                         "greatCount": 0, "byGameId": {}},
            "story": {"mainCompletedCount": 0, "npcCompletedCount": 0,
                      "locationCompletedCount": 0},
            "run": {"completedRunCount": 0, "firstCompletedRunUserCount": 0,
                    "endingViewCounts": {}, "finalStatSums": {},
                    "finalStatGte300Counts": {}, "finalStatGte500Counts": {}},
            "unlocks": {"newByTypeAndId": {}}, "updatedAt": now,
        }
    if raw.get("uid") != uid or raw.get("kstDate") != kst_date:
        raise ActivityRejected("Daily activity summary identity mismatch")
    summary = deepcopy(raw)
    counts = summary.get("activityCounts")
    if not isinstance(counts, dict) or type(counts.get("rest")) is not int or counts["rest"] < 0:
        raise ActivityRejected("Daily activity counts are invalid")
    summary["lastActivityAt"] = now
    summary["updatedAt"] = now
    return summary


def _increase_counter(container: dict, key: str) -> None:
    value = container.get(key)
    if type(value) is not int or value < 0:
        raise ActivityRejected(f"Stored counter {key} is invalid")
    container[key] = value + 1


def _record_activity_history(run: dict, *, day: str, entry: dict) -> None:
    """Append one compact, client-safe completed activity record to the active run."""
    week = run.get("week")
    if type(week) is not int or not 1 <= week <= 52 or day not in WEEKDAYS:
        raise ActivityRejected("Activity history position is invalid")
    history = run.setdefault("activityHistory", [])
    if not isinstance(history, list) or len(history) >= 260:
        raise ActivityRejected("Stored activity history is invalid")
    if any(not isinstance(item, dict)
           or type(item.get("week")) is not int or not 1 <= item["week"] <= 52
           or type(item.get("day")) is not int or not 0 <= item["day"] < len(WEEKDAYS)
           for item in history):
        raise ActivityRejected("Stored activity history is invalid")
    day_index = WEEKDAYS.index(day)
    if any(isinstance(item, dict) and item.get("week") == week and item.get("day") == day_index
           for item in history):
        raise ActivityRejected("Activity history already contains this weekday")
    record = {
        "week": week, "day": day_index, "type": entry.get("type"),
        "contentId": entry.get("contentId"), "status": "COMPLETED",
        "resolution": entry.get("resolution"),
    }
    for key in ("staminaBefore", "staminaCost", "staminaRecovered", "growthApplied",
                "growthAwarded", "targetStat", "restChoice", "result", "foundCount", "targetCount"):
        if key in entry:
            record[key] = deepcopy(entry[key])
    if entry.get("type") == "FORCED_REST":
        remaining = run.get("forcedRest", {}).get("remainingWeekdays")
        if type(remaining) is not int or not 0 <= remaining <= 3:
            raise ActivityRejected("Forced-rest history state is invalid")
        record["forcedRestDays"] = remaining
    history.append(record)
    history.sort(key=lambda item: (item["week"], item["day"]))


def _backfill_completed_week_history(run: dict) -> None:
    """Migrate current-week completions from pre-history saves before the week is cleared."""
    schedule = run.get("weeklySchedule")
    history = run.setdefault("activityHistory", [])
    if not isinstance(schedule, dict) or set(schedule) != set(WEEKDAYS) or not isinstance(history, list):
        raise ActivityRejected("Completed week activity history is unavailable")
    week = run.get("week")
    existing = {
        (item.get("week"), item.get("day"))
        for item in history if isinstance(item, dict)
    }
    for day_index, day in enumerate(WEEKDAYS):
        entry = schedule[day]
        if isinstance(entry, dict) and entry.get("status") == "COMPLETED" and (week, day_index) not in existing:
            _record_activity_history(run, day=day, entry=entry)
            existing.add((week, day_index))


def _apply_account_progression(
    *, documents: dict, statistics: GlobalStatistics, repository: SaveSlotRepository,
    now: datetime, daily_summary: dict,
) -> tuple[GlobalMetaProgress, UnlockState, dict]:
    meta_raw, unlock_raw = documents[META], documents[UNLOCK]
    if meta_raw is None or unlock_raw is None:
        raise ActivityRejected("Account progression is unavailable")
    try:
        meta = GlobalMetaProgress.model_validate(meta_raw)
        unlock = UnlockState.model_validate(unlock_raw)
        progression = evaluate_progression(
            uid=repository.uid, meta=meta, statistics=statistics,
            unlock=unlock, now=now,
        )
        record_daily_unlocks(daily_summary, progression)
    except (ValueError, ProgressionError) as error:
        raise ActivityRejected(str(error)) from None
    return meta, unlock, progression.as_dict()


@router.post("/{slot_id}/schedule")
def confirm_schedule(
    slot_id: int,
    body: ConfirmScheduleRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
    master: ActivityMaster = Depends(get_activity_master),
) -> dict:
    """Persist all five choices only after the main Story has completed."""
    now = datetime.now(timezone.utc)

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        run = _active_run(slot)
        if run.get("pendingStoryEvent") is not None:
            raise ActivityRejected("Complete the pending Story before the ordinary schedule")
        if run.get("phase") == "WEEK_SUMMARY_PENDING":
            raise ActivityRejected("Complete the weekly summary or Main Story before scheduling")
        if run.get("day") != "MONDAY" or run.get("completedWeekdayCount") != 0:
            raise ActivityRejected("Schedule can be confirmed only at the start of a week")
        if run.get("weeklySchedule"):
            raise ActivityRejected("Weekly schedule is already confirmed")
        stamina = run.get("stamina", {}).get("current")
        if type(stamina) is not int or not 0 <= stamina <= 100:
            raise ActivityRejected("Stored stamina is invalid")
        forced = run.get("forcedRest")
        if not isinstance(forced, dict) or type(forced.get("active")) is not bool:
            raise ActivityRejected("Forced-rest state is invalid")
        remaining = forced.get("remainingWeekdays")
        if type(remaining) is not int or not 0 <= remaining <= 3 or forced["active"] != (remaining > 0):
            raise ActivityRejected("Forced-rest state is invalid")
        locked_count = remaining if remaining else (3 if stamina < 10 else 0)
        if locked_count and not remaining:
            forced.update(active=True, remainingWeekdays=3)
        entries = {}
        special_count = 0
        for index, (day, activity_id) in enumerate(zip(WEEKDAYS, body.activityIds, strict=True)):
            if index < locked_count:
                if activity_id is not None:
                    raise ActivityRejected("Locked forced-rest weekday must not have an activity ID")
                entries[day] = {
                    "type": "FORCED_REST", "contentId": "FORCED_REST", "locked": True,
                    "status": "PLANNED", "resolution": None,
                    "startedAt": None, "completedAt": None,
                }
                continue
            if activity_id is None:
                raise ActivityRejected("An unlocked weekday requires an activity ID")
            definition = master.get(version=slot.gameDataVersion, activity_id=activity_id)
            if definition.activity_type == "SPECIAL":
                special_count += 1
                if special_count > 1:
                    raise ActivityRejected("Special activity may be scheduled at most once per week")
            entries[day] = {
                "type": definition.activity_type, "contentId": definition.activity_id,
                "status": "PLANNED", "resolution": None,
                "startedAt": None, "completedAt": None,
            }
        run["weeklySchedule"] = entries
        stats = run.get("stats")
        if (not isinstance(stats, dict) or any(type(stats.get(stat)) is not int
                or not 0 <= stats[stat] <= 500 for stat in STATS)):
            raise ActivityRejected("Stored growth stats are invalid")
        run["weekStartSnapshot"] = {"stats": {stat: stats[stat] for stat in STATS},
                                    "stamina": stamina}
        run["phase"] = "SCHEDULE_CONFIRMED"
        run["updatedAt"] = now
        slot.activeRun = run
        return MutationPlan(slot=slot, result_data={"week": run["week"]})

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="confirmSchedule", command={"activityIds": body.activityIds},
            read_paths=(), mutator=mutate,
        )
        return mutation_response(result, slot_id)
    except Exception as error:
        raise _report_error(error) from None


@router.post("/{slot_id}/activities/start")
def start_activity(
    slot_id: int,
    body: MutationRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
    master: ActivityMaster = Depends(get_activity_master),
    candidates: StoryCandidates = Depends(get_story_candidates),
) -> dict:
    """Charge stamina, checkpoint IN_PROGRESS, then queue eligible Location Story before client content."""
    now = datetime.now(timezone.utc)
    challenge_seed = token_urlsafe(24)  # fixed outside retryable Firestore transaction

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        run = _active_run(slot)
        if run.get("pendingStoryEvent") is not None:
            raise ActivityRejected("Complete the pending Story first")
        day = run.get("day")
        if day not in WEEKDAYS:
            raise ActivityRejected("Current game day is not a weekday")
        if run.get("completedWeekdayCount") != WEEKDAYS.index(day):
            raise ActivityRejected("Saved weekday progress is inconsistent")
        schedule = run.get("weeklySchedule")
        if not isinstance(schedule, dict) or set(schedule) != set(WEEKDAYS):
            raise ActivityRejected("Confirm all five scheduled activities first")
        entry = schedule[day]
        if not isinstance(entry, dict) or entry.get("status") != "PLANNED":
            raise ActivityRejected("Today's activity is not planned")
        stamina = run.get("stamina", {}).get("current")
        if type(stamina) is not int or not 0 <= stamina <= 100:
            raise ActivityRejected("Stored stamina is invalid")
        forced = run.get("forcedRest")
        if not isinstance(forced, dict) or type(forced.get("active")) is not bool:
            raise ActivityRejected("Forced-rest state is invalid")
        remaining = forced.get("remainingWeekdays")
        if type(remaining) is not int or not 0 <= remaining <= 3 or forced["active"] != (remaining > 0):
            raise ActivityRejected("Forced-rest state is invalid")
        must_rest = remaining > 0 or stamina < 10
        if must_rest:
            if not remaining:
                forced.update(active=True, remainingWeekdays=3)
            if entry["type"] != "FORCED_REST":
                entry["replacedContentId"] = entry.get("contentId")
                entry["replacedType"] = entry.get("type")
                entry.update(type="FORCED_REST", contentId="FORCED_REST", locked=True)
            definition = None
        else:
            if entry.get("type") == "FORCED_REST":
                raise ActivityRejected("Locked forced-rest weekday has no active rest state")
            definition = master.get(version=slot.gameDataVersion, activity_id=entry.get("contentId", ""))
            if entry.get("type") != definition.activity_type:
                raise ActivityRejected("Scheduled activity type does not match the catalog")
        cost = definition.stamina_cost if definition else 0
        run["stamina"]["current"] = max(0, stamina - cost)
        entry["status"] = "IN_PROGRESS"
        entry["startedAt"] = now
        entry["staminaBefore"] = stamina
        entry["staminaCost"] = cost
        run["phase"] = "ACTIVITY_IN_PROGRESS"
        run["updatedAt"] = now
        response = {"activityId": definition.activity_id if definition else "FORCED_REST",
                    "activityType": definition.activity_type if definition else "FORCED_REST",
                    "locationId": definition.location_id if definition else None,
                    "targetStat": definition.target_stat if definition else None,
                    "gameId": definition.game_id if definition else None, "staminaCost": cost,
                    "staminaAfterStart": run["stamina"]["current"]}
        if definition and definition.activity_type == "ADVENTURE":
            exploration = run.get("stats", {}).get("exploration")
            if type(exploration) is not int or not 0 <= exploration <= 500:
                raise ActivityRejected("Stored exploration stat is invalid")
            settings_raw, meta_raw = documents[SETTINGS], documents[META]
            if settings_raw is None or meta_raw is None:
                raise ActivityRejected("Account pet settings are unavailable")
            settings = AccountSettings.model_validate(settings_raw)
            meta = GlobalMetaProgress.model_validate(meta_raw)
            if settings.activePetId not in meta.unlockedPetIds:
                raise ActivityRejected("Active pet is not unlocked")
            pet_modifiers = master.pet_modifiers(
                version=slot.gameDataVersion, pet_id=settings.activePetId,
            )
            try:
                adventure_level = adventure_difficulty(exploration)
                objective_count = adventure_objective_count(exploration, definition.activity_id)
                duration_seconds = adventure_duration_seconds(
                    exploration, pet_modifiers["exploration"]
                )
            except ValueError as error:
                raise ActivityRejected(str(error)) from None
            mission_id = f"{run.get('runId')}:{run.get('week')}:{day}:{definition.activity_id}"
            if not isinstance(run.get("runId"), str) or not run["runId"]:
                raise ActivityRejected("Adventure run identity is invalid")
            entry.update(
                adventureDifficulty=adventure_level,
                objectiveCount=objective_count,
                durationSeconds=duration_seconds,
                adventureSeed=challenge_seed,
                missionId=mission_id,
            )
            response.update(
                adventureDifficulty=adventure_level,
                targetCount=objective_count,
                durationSeconds=duration_seconds,
                seed=challenge_seed,
                missionId=mission_id,
            )
        if definition and definition.game_id:
            stat = run.get("stats", {}).get(definition.target_stat)
            streak = run.get("minigameFailStreaks", {}).get(definition.game_id, 0)
            try:
                reward, play, assist = difficulty(stat, streak)
            except ValueError:
                raise ActivityRejected("Stored difficulty state is invalid") from None
            response.update(rewardDifficulty=reward, playDifficulty=play, assistLevel=assist)
            entry.update(rewardDifficulty=reward, playDifficulty=play,
                         assistLevel=assist, failStreakBefore=streak)
            duration_ms = CLASS_DURATIONS_MS.get(definition.game_id)
            if duration_ms is not None:
                entry.update(replayVersion=REPLAY_VERSION, seed=challenge_seed,
                             maxDurationMs=duration_ms)
                response.update(replayVersion=REPLAY_VERSION, seed=challenge_seed,
                                maxDurationMs=duration_ms,
                                replaySupported=definition.game_id in SUPPORTED_REPLAY_GAMES)
        if definition is not None:
            pending = candidates.before_activity(
                version=slot.gameDataVersion,
                run=run,
                activity=ActivityContext(
                    definition.activity_id, definition.activity_type, definition.location_id,
                ),
            )
            if pending is not None:
                run["pendingStoryEvent"] = pending
                run["phase"] = "ACTIVITY_PRE_STORY_PENDING"
                response["pendingStoryEvent"] = pending
        slot.activeRun = run
        return MutationPlan(slot=slot, result_data=response)

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="startActivity", command={}, read_paths=(SETTINGS, META), mutator=mutate,
        )
        return mutation_response(result, slot_id)
    except Exception as error:
        raise _report_error(error) from None


@router.post("/{slot_id}/activities/complete-special")
def complete_special(
    slot_id: int,
    body: CompleteSpecialRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
    master: ActivityMaster = Depends(get_activity_master),
    candidates: StoryCandidates = Depends(get_story_candidates),
) -> dict:
    """Resolve a server-validated stat transfer and its Story candidate atomically."""
    now = datetime.now(timezone.utc)
    kst_date = now.astimezone(KST).date().isoformat()
    day_path = UserDocPath("activityDays", kst_date)
    command = {"skip": body.skip, "transfer": body.transfer.model_dump() if body.transfer else None}

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        run = _active_run(slot)
        day = run.get("day")
        completed_count = run.get("completedWeekdayCount")
        if (day not in WEEKDAYS or type(completed_count) is not int
                or completed_count != WEEKDAYS.index(day)):
            raise ActivityRejected("Saved weekday progress is inconsistent")
        if run.get("pendingStoryEvent") is not None:
            raise ActivityRejected("Complete the pending Story first")
        schedule = run.get("weeklySchedule")
        if not isinstance(schedule, dict) or set(schedule) != set(WEEKDAYS):
            raise ActivityRejected("Weekly schedule is unavailable")
        entry = schedule[day]
        if (not isinstance(entry, dict) or entry.get("status") != "IN_PROGRESS"
                or entry.get("type") != "SPECIAL" or entry.get("startedAt") is None):
            raise ActivityRejected("No started special activity")
        definition = master.get(version=slot.gameDataVersion, activity_id=entry.get("contentId", ""))
        if (definition.activity_type != "SPECIAL" or definition.activity_id != "fairy-trade"
                or not definition.location_id):
            raise ActivityRejected("Scheduled special activity does not match the catalog")
        if type(entry.get("staminaCost")) is not int or entry["staminaCost"] != 0:
            raise ActivityRejected("Special activity checkpoint is invalid")
        stats = run.get("stats")
        if (not isinstance(stats, dict) or any(type(stats.get(stat)) is not int
                or not 0 <= stats[stat] <= 500 for stat in STATS)):
            raise ActivityRejected("Stored growth stats are invalid")
        if body.transfer is not None:
            source, target, amount = body.transfer.fromStat, body.transfer.toStat, body.transfer.amount
            if source not in STATS or target not in STATS or source == target:
                raise ActivityRejected("Transfer requires two different growth stats")
            if amount > min(5, stats[source], 500 - stats[target]):
                raise ActivityRejected("Transfer exceeds available growth points")
            stats[source] -= amount
            stats[target] += amount
        entry["status"] = "COMPLETED"
        entry["resolution"] = "SKIPPED" if body.skip else "TRANSFERRED"
        entry["completedAt"] = now
        entry["result"] = command
        _record_activity_history(run, day=day, entry=entry)
        run["completedWeekdayCount"] += 1
        pending = candidates.after_activity(
            version=slot.gameDataVersion, run=run,
            activity=ActivityContext(definition.activity_id, definition.activity_type, definition.location_id),
        )
        if pending is not None:
            run["pendingStoryEvent"] = pending
            run["phase"] = "ACTIVITY_STORY_PENDING"
        else:
            _advance_completed_day(run)
        run["updatedAt"] = now
        slot.activeRun = run
        summary = _daily_summary(documents[day_path], uid=repository.uid,
                                 kst_date=kst_date, now=now)
        count = summary["activityCounts"].get("special")
        if type(count) is not int or count < 0:
            raise ActivityRejected("Daily special activity count is invalid")
        summary["activityCounts"]["special"] += 1
        return MutationPlan(
            slot=slot, documents={day_path: summary},
            result_data={"resolution": entry["resolution"], "statTransfer": command["transfer"],
                         "pendingStoryEvent": pending, "nextDay": run["day"],
                         "weekComplete": run["completedWeekdayCount"] == len(WEEKDAYS)},
        )

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="completeSpecial", command=command, read_paths=(day_path,), mutator=mutate,
        )
        return mutation_response(result, slot_id)
    except Exception as error:
        raise _report_error(error) from None


@router.post("/{slot_id}/activities/complete-class-quit")
def complete_class_quit(
    slot_id: int,
    body: MutationRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
    master: ActivityMaster = Depends(get_activity_master),
    candidates: StoryCandidates = Depends(get_story_candidates),
) -> dict:
    """The explicit Quit action always resolves FAIL; no client success claim."""
    now = datetime.now(timezone.utc)
    kst_date = now.astimezone(KST).date().isoformat()
    day_path = UserDocPath("activityDays", kst_date)
    base_fail_growth = {"EASY": 0, "NORMAL": 1, "HARD": 2, "VERY_HARD": 3}

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        run = _active_run(slot)
        day = run.get("day")
        count = run.get("completedWeekdayCount")
        if day not in WEEKDAYS or type(count) is not int or count != WEEKDAYS.index(day):
            raise ActivityRejected("Saved weekday progress is inconsistent")
        if run.get("pendingStoryEvent") is not None:
            raise ActivityRejected("Complete the pending Story first")
        schedule = run.get("weeklySchedule")
        if not isinstance(schedule, dict) or set(schedule) != set(WEEKDAYS):
            raise ActivityRejected("Weekly schedule is unavailable")
        entry = schedule[day]
        if (not isinstance(entry, dict) or entry.get("status") != "IN_PROGRESS"
                or entry.get("type") != "CLASS" or entry.get("startedAt") is None):
            raise ActivityRejected("No started class activity")
        definition = master.get(version=slot.gameDataVersion, activity_id=entry.get("contentId", ""))
        if (definition.activity_type != "CLASS" or not definition.game_id
                or not definition.location_id or definition.target_stat not in STATS
                or type(entry.get("staminaCost")) is not int or entry["staminaCost"] != 10):
            raise ActivityRejected("Class checkpoint does not match the catalog")
        reward = entry.get("rewardDifficulty")
        streak_before = entry.get("failStreakBefore")
        stamina_before = entry.get("staminaBefore")
        stats = run.get("stats")
        streaks = run.get("minigameFailStreaks")
        run_stats = run.get("runStatistics")
        if (reward not in base_fail_growth or type(streak_before) is not int
                or streak_before < 0 or type(stamina_before) is not int
                or not 10 <= stamina_before <= 100 or not isinstance(stats, dict)
                or not isinstance(streaks, dict)
                or type(streaks.get(definition.game_id, 0)) is not int
                or streaks.get(definition.game_id, 0) != streak_before
                or not isinstance(run_stats, dict)):
            raise ActivityRejected("Class result checkpoint is invalid")
        current = stats.get(definition.target_stat)
        if type(current) is not int or not 0 <= current <= 500:
            raise ActivityRejected("Stored class growth stat is invalid")
        try:
            expected_reward, _, _ = difficulty(current, streak_before)
        except ValueError:
            raise ActivityRejected("Stored class difficulty is invalid") from None
        if reward != expected_reward:
            raise ActivityRejected("Class reward difficulty changed after the checkpoint")
        balance = balance_snapshot(documents[BALANCE])
        growth = applied_growth(
            base_growth=base_fail_growth[reward], target_stat=definition.target_stat,
            current_stat=current, stamina_before=stamina_before, balance=balance,
        )
        statistics_raw = documents[STATISTICS]
        if statistics_raw is None:
            raise ActivityRejected("Global statistics are unavailable")
        statistics = GlobalStatistics.model_validate(statistics_raw)
        class_counts = run_stats.get("classCounts")
        if not isinstance(class_counts, dict):
            raise ActivityRejected("Run class counts are invalid")
        _increase_counter(run_stats, "classCount")
        _increase_counter(run_stats, "minigamePlayCount")
        _increase_counter(class_counts, definition.target_stat)
        _increase_counter(statistics.classCounts, definition.target_stat)
        statistics.totalClassCount += 1
        statistics.totalMinigamePlayCount += 1
        if streak_before:
            statistics.retryAfterFailureCount += 1
        statistics.updatedAt = now
        streaks[definition.game_id] = streak_before + 1
        stats[definition.target_stat] = current + growth
        entry.update(status="COMPLETED", resolution="FAIL", endReason="QUIT",
                     completedAt=now, growthApplied=growth, balanceVersion=balance.version)
        _record_activity_history(run, day=day, entry=entry)
        run["completedWeekdayCount"] += 1
        pending = candidates.after_activity(
            version=slot.gameDataVersion, run=run,
            activity=ActivityContext(definition.activity_id, definition.activity_type,
                                     definition.location_id),
        )
        if pending is not None:
            run["pendingStoryEvent"] = pending
            run["phase"] = "ACTIVITY_STORY_PENDING"
        else:
            _advance_completed_day(run)
        run["updatedAt"] = now
        slot.activeRun = run
        summary = _daily_summary(documents[day_path], uid=repository.uid,
                                 kst_date=kst_date, now=now)
        _increase_counter(summary["activityCounts"], "class")
        minigame = summary.get("minigame")
        if not isinstance(minigame, dict):
            raise ActivityRejected("Daily minigame summary is invalid")
        _increase_counter(minigame, "playCount")
        _increase_counter(minigame, "failCount")
        by_game = minigame.get("byGameId")
        if not isinstance(by_game, dict):
            raise ActivityRejected("Daily per-game summary is invalid")
        game_counts = by_game.setdefault(definition.game_id, {
            "fail": 0, "success": 0, "great": 0,
        })
        if not isinstance(game_counts, dict):
            raise ActivityRejected("Daily per-game summary is invalid")
        _increase_counter(game_counts, "fail")
        meta, unlock, progression = _apply_account_progression(
            documents=documents, statistics=statistics, repository=repository,
            now=now, daily_summary=summary,
        )
        return MutationPlan(
            slot=slot,
            documents={
                META: meta.model_dump(mode="python"),
                STATISTICS: statistics.model_dump(mode="python"),
                UNLOCK: unlock.model_dump(mode="python"),
                day_path: summary,
            },
            result_data={"resolution": "FAIL", "endReason": "QUIT", "growthApplied": growth,
                         "targetStat": definition.target_stat, "balanceVersion": balance.version,
                         "failStreak": streaks[definition.game_id],
                         "progression": progression,
                         "pendingStoryEvent": pending, "nextDay": run["day"],
                         "weekComplete": run["completedWeekdayCount"] == len(WEEKDAYS)},
        )

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="completeClassQuit", command={},
            read_paths=(BALANCE, META, STATISTICS, UNLOCK, day_path),
            mutator=mutate,
        )
        return mutation_response(result, slot_id)
    except Exception as error:
        raise _report_error(error) from None


@router.post("/{slot_id}/activities/complete-class-replay")
def complete_class_replay(
    slot_id: int,
    body: CompleteClassReplayRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
    master: ActivityMaster = Depends(get_activity_master),
    candidates: StoryCandidates = Depends(get_story_candidates),
) -> dict:
    """Award a supported class result only after server-side input replay.

    The client supplies actions, never score, outcome, difficulty, seed, or
    reward amount. Unsupported class games fail closed.
    """
    now = datetime.now(timezone.utc)
    kst_date = now.astimezone(KST).date().isoformat()
    day_path = UserDocPath("activityDays", kst_date)
    input_log = [event.model_dump() for event in body.inputLog]
    log_digest = sha256(json.dumps(input_log, sort_keys=True, separators=(",", ":"))
                        .encode("utf-8")).hexdigest()

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        run = _active_run(slot)
        day = run.get("day")
        count = run.get("completedWeekdayCount")
        if day not in WEEKDAYS or type(count) is not int or count != WEEKDAYS.index(day):
            raise ActivityRejected("Saved weekday progress is inconsistent")
        if run.get("pendingStoryEvent") is not None:
            raise ActivityRejected("Complete the pending Story first")
        schedule = run.get("weeklySchedule")
        if not isinstance(schedule, dict) or set(schedule) != set(WEEKDAYS):
            raise ActivityRejected("Weekly schedule is unavailable")
        entry = schedule[day]
        if (not isinstance(entry, dict) or entry.get("status") != "IN_PROGRESS"
                or entry.get("type") != "CLASS" or not isinstance(entry.get("startedAt"), datetime)):
            raise ActivityRejected("No started class activity")
        definition = master.get(version=slot.gameDataVersion, activity_id=entry.get("contentId", ""))
        if (definition.activity_type != "CLASS" or definition.game_id not in SUPPORTED_REPLAY_GAMES
                or not definition.location_id or definition.target_stat not in STATS
                or entry.get("staminaCost") != 10):
            raise ActivityRejected("This class has no server input-log verifier")
        reward, play = entry.get("rewardDifficulty"), entry.get("playDifficulty")
        streak_before, stamina_before = entry.get("failStreakBefore"), entry.get("staminaBefore")
        seed, duration = entry.get("seed"), entry.get("maxDurationMs")
        stats, streaks, run_stats = (run.get("stats"), run.get("minigameFailStreaks"),
                                    run.get("runStatistics"))
        if (entry.get("replayVersion") != REPLAY_VERSION
                or not isinstance(seed, str) or len(seed) < 24
                or duration != CLASS_DURATIONS_MS[definition.game_id]
                or reward not in {"EASY", "NORMAL", "HARD", "VERY_HARD"}
                or play not in {"EASY", "NORMAL", "HARD", "VERY_HARD"}
                or type(streak_before) is not int or streak_before < 0
                or type(stamina_before) is not int or not 10 <= stamina_before <= 100
                or not isinstance(stats, dict) or not isinstance(streaks, dict)
                or streaks.get(definition.game_id, 0) != streak_before
                or not isinstance(run_stats, dict)):
            raise ActivityRejected("Class replay checkpoint is invalid")
        current = stats.get(definition.target_stat)
        if type(current) is not int or not 0 <= current <= 500:
            raise ActivityRejected("Stored class growth stat is invalid")
        try:
            expected_reward, expected_play, expected_assist = difficulty(current, streak_before)
        except ValueError:
            raise ActivityRejected("Stored class difficulty is invalid") from None
        if (reward, play, entry.get("assistLevel")) != (
                expected_reward, expected_play, expected_assist):
            raise ActivityRejected("Class replay difficulty changed after the checkpoint")
        elapsed_real_ms = (now - entry["startedAt"]).total_seconds() * 1000
        if elapsed_real_ms < 0 or (body.inputLog and body.inputLog[-1].atMs > elapsed_real_ms + 2_000):
            raise ReplayRejected("Input log runs ahead of server challenge time")
        if definition.game_id == "starlight-stage" and elapsed_real_ms + 2_000 < duration:
            raise ReplayRejected("Rhythm result cannot finish before its timer")
        timed_out = elapsed_real_ms >= duration
        play_number = ("EASY", "NORMAL", "HARD", "VERY_HARD").index(play) + 1
        if definition.game_id == "sealed-shelves":
            result = replay_sealed_shelves(
                difficulty=play_number, max_duration_ms=duration, events=body.inputLog,
                timed_out=timed_out)
        elif definition.game_id == "spirit-pot-sort":
            result = replay_spirit_pots(
                difficulty=play_number, seed=seed, max_duration_ms=duration,
                events=body.inputLog, timed_out=timed_out)
        elif definition.game_id == "rune-pin-training":
            result = replay_rune_pins(
                difficulty=play_number, max_duration_ms=duration, events=body.inputLog,
                timed_out=timed_out)
        elif definition.game_id == "rune-circuit":
            result = replay_rune_circuit(
                difficulty=play_number, seed=seed, max_duration_ms=duration,
                events=body.inputLog, timed_out=timed_out)
        elif definition.game_id == "observatory-mirror":
            result = replay_observatory_mirror(
                difficulty=play_number, seed=seed, max_duration_ms=duration,
                events=body.inputLog, timed_out=timed_out)
        elif definition.game_id == "starlight-stage":
            result = replay_starlight_stage(
                difficulty=play_number, seed=seed, max_duration_ms=duration,
                events=body.inputLog)
        else:
            raise ActivityRejected("This class has no server input-log verifier")
        balance = balance_snapshot(documents[BALANCE])
        reward_number = ("EASY", "NORMAL", "HARD", "VERY_HARD").index(reward) + 1
        base_growth = (10 if result.resolution == "GREAT" else
                       reward_number + 4 if result.resolution == "SUCCESS" else
                       reward_number - 1)
        growth = applied_growth(
            base_growth=base_growth, target_stat=definition.target_stat,
            current_stat=current, stamina_before=stamina_before, balance=balance,
        )
        statistics_raw = documents[STATISTICS]
        if statistics_raw is None:
            raise ActivityRejected("Global statistics are unavailable")
        statistics = GlobalStatistics.model_validate(statistics_raw)
        class_counts = run_stats.get("classCounts")
        if not isinstance(class_counts, dict):
            raise ActivityRejected("Run class counts are invalid")
        for container, key in ((run_stats, "classCount"), (run_stats, "minigamePlayCount"),
                               (class_counts, definition.target_stat),
                               (statistics.classCounts, definition.target_stat)):
            _increase_counter(container, key)
        statistics.totalClassCount += 1
        statistics.totalMinigamePlayCount += 1
        if result.resolution != "FAIL":
            _increase_counter(run_stats, "minigameClearCount")
            statistics.totalMinigameClearCount += 1
            if definition.game_id not in statistics.clearedMinigameIds:
                statistics.clearedMinigameIds.append(definition.game_id)
        if streak_before:
            statistics.retryAfterFailureCount += 1
        statistics.updatedAt = now
        streaks[definition.game_id] = streak_before + 1 if result.resolution == "FAIL" else 0
        stats[definition.target_stat] = current + growth
        entry.update(status="COMPLETED", resolution=result.resolution, endReason="COMPLETE",
                     completedAt=now, growthApplied=growth, balanceVersion=balance.version,
                     inputLogDigest=log_digest, replayVersion=REPLAY_VERSION,
                     replayedMoves=result.moves, durationMs=result.duration_ms)
        _record_activity_history(run, day=day, entry=entry)
        run["completedWeekdayCount"] += 1
        pending = candidates.after_activity(
            version=slot.gameDataVersion, run=run,
            activity=ActivityContext(definition.activity_id, definition.activity_type,
                                     definition.location_id),
        )
        if pending is not None:
            run["pendingStoryEvent"] = pending
            run["phase"] = "ACTIVITY_STORY_PENDING"
        else:
            _advance_completed_day(run)
        run["updatedAt"] = now
        slot.activeRun = run
        summary = _daily_summary(documents[day_path], uid=repository.uid,
                                 kst_date=kst_date, now=now)
        _increase_counter(summary["activityCounts"], "class")
        minigame = summary.get("minigame")
        if not isinstance(minigame, dict):
            raise ActivityRejected("Daily minigame summary is invalid")
        _increase_counter(minigame, "playCount")
        _increase_counter(minigame, {"GREAT": "greatCount", "SUCCESS": "successCount",
                                     "FAIL": "failCount"}[result.resolution])
        by_game = minigame.get("byGameId")
        if not isinstance(by_game, dict):
            raise ActivityRejected("Daily per-game summary is invalid")
        game_counts = by_game.setdefault(definition.game_id, {
            "fail": 0, "success": 0, "great": 0,
        })
        if not isinstance(game_counts, dict):
            raise ActivityRejected("Daily per-game summary is invalid")
        _increase_counter(game_counts, {"GREAT": "great", "SUCCESS": "success",
                                        "FAIL": "fail"}[result.resolution])
        meta, unlock, progression = _apply_account_progression(
            documents=documents, statistics=statistics, repository=repository,
            now=now, daily_summary=summary,
        )
        return MutationPlan(
            slot=slot,
            documents={
                META: meta.model_dump(mode="python"),
                STATISTICS: statistics.model_dump(mode="python"),
                UNLOCK: unlock.model_dump(mode="python"),
                day_path: summary,
            },
            result_data={"resolution": result.resolution, "growthApplied": growth,
                         "targetStat": definition.target_stat, "balanceVersion": balance.version,
                         "replayedMoves": result.moves, "roundsCleared": result.rounds_cleared,
                         "failStreak": streaks[definition.game_id],
                         "progression": progression,
                         "pendingStoryEvent": pending, "nextDay": run["day"],
                         "weekComplete": run["completedWeekdayCount"] == len(WEEKDAYS)},
        )

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="completeClassReplay", command={"inputLogDigest": log_digest},
            read_paths=(BALANCE, META, STATISTICS, UNLOCK, day_path), mutator=mutate,
        )
        return mutation_response(result, slot_id)
    except Exception as error:
        raise _report_error(error) from None


def _advance_completed_day(run: dict) -> None:
    """Advance only an already-completed weekday; called after any pending Story."""
    day = run.get("day")
    count = run.get("completedWeekdayCount")
    if day not in WEEKDAYS or type(count) is not int or count != WEEKDAYS.index(day) + 1:
        raise ActivityRejected("Completed weekday progress is inconsistent")
    if count == len(WEEKDAYS):
        run["phase"] = "WEEKEND_PENDING"
    else:
        run["day"] = WEEKDAYS[count]
        run["phase"] = "ACTIVITY_READY"


def _completed_week_summary(run: dict, *, now: datetime) -> dict:
    schedule = run.get("weeklySchedule")
    snapshot = run.get("weekStartSnapshot")
    if (not isinstance(schedule, dict) or set(schedule) != set(WEEKDAYS)
            or not all(isinstance(entry, dict) and entry.get("status") == "COMPLETED"
                       for entry in schedule.values())
            or not isinstance(snapshot, dict) or not isinstance(snapshot.get("stats"), dict)):
        raise ActivityRejected("Completed week or starting snapshot is unavailable")
    starting_stamina = snapshot.get("stamina")
    ending_stamina = run.get("stamina", {}).get("current")
    if (type(starting_stamina) is not int or type(ending_stamina) is not int
            or not 0 <= starting_stamina <= 100 or not 0 <= ending_stamina <= 100):
        raise ActivityRejected("Weekly stamina summary is invalid")
    start_stats, end_stats = snapshot["stats"], run.get("stats")
    if (not isinstance(end_stats, dict) or any(
            type(start_stats.get(stat)) is not int or type(end_stats.get(stat)) is not int
            or not 0 <= start_stats[stat] <= 500 or not 0 <= end_stats[stat] <= 500
            for stat in STATS)):
        raise ActivityRejected("Weekly growth summary is invalid")
    spent = recovered = 0
    for entry in schedule.values():
        cost = entry.get("staminaCost", 0)
        recovery = entry.get("staminaRecovered", 0)
        if (type(cost) is not int or type(recovery) is not int
                or not 0 <= cost <= 100 or not 0 <= recovery <= 100):
            raise ActivityRejected("Weekly stamina activity is invalid")
        spent += cost
        recovered += recovery
    return {
        "week": run["week"],
        "statDelta": {stat: end_stats[stat] - start_stats[stat] for stat in STATS},
        "classCount": sum(entry["type"] == "CLASS" and entry.get("resolution") != "INTERRUPTED"
                          for entry in schedule.values()),
        "staminaSpent": spent, "staminaRecovered": recovered,
        "startingStamina": starting_stamina, "endingStamina": ending_stamina,
        "forcedRestDays": sum(entry["type"] == "FORCED_REST" and entry.get("resolution") == "SUCCESS"
                              for entry in schedule.values()),
        "completedAt": now,
    }


@router.post("/{slot_id}/weeks/close")
def close_week(
    slot_id: int,
    body: MutationRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
    candidates: StoryCandidates = Depends(get_story_candidates),
) -> dict:
    """Finalize Friday, never skipping an active weekend Story rule."""
    now = datetime.now(timezone.utc)

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        run = _active_run(slot)
        if (run.get("day") != "FRIDAY" or run.get("completedWeekdayCount") != 5
                or run.get("phase") not in {"WEEKEND_PENDING", "MY_ROOM_RECOVERY"}
                or run.get("pendingStoryEvent") is not None):
            raise ActivityRejected("Week is not ready to close")
        week = run.get("week")
        if type(week) is not int or not 1 <= week <= 52:
            raise ActivityRejected("Run week is invalid")
        candidates.require_no_weekend_rules(version=slot.gameDataVersion)
        _backfill_completed_week_history(run)
        summary = _completed_week_summary(run, now=now)
        run["lastWeekSummary"] = summary
        if week == 52:
            run["phase"] = "FINAL_SUMMARY_PENDING"
            pending = None
        else:
            run["week"] = week + 1
            run["day"] = "MONDAY"
            run["weeklySchedule"] = {}
            run["completedWeekdayCount"] = 0
            run["weekStartSnapshot"] = None
            run["storyEventWindow"] = {
                "week": run["week"], "sideStoryCount": 0,
                "locationStoryCount": 0, "lastResultStoryDay": None,
            }
            pending = candidates.next_week_main(version=slot.gameDataVersion, run=run)
            run["pendingStoryEvent"] = pending
            run["phase"] = "WEEK_SUMMARY_PENDING"
        run["updatedAt"] = now
        slot.activeRun = run
        return MutationPlan(slot=slot, result_data={
            "completedWeek": week, "nextWeek": run["week"] if week < 52 else None,
            "summary": summary, "pendingMainStory": pending,
        })

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="closeWeek", command={}, read_paths=(), mutator=mutate,
        )
        return mutation_response(result, slot_id)
    except Exception as error:
        raise _report_error(error) from None


@router.post("/{slot_id}/weeks/ack-summary")
def acknowledge_week_summary(
    slot_id: int,
    body: MutationRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
) -> dict:
    """Gate Main Story/new schedule (or ending) behind the displayed summary."""
    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        run = _active_run(slot)
        phase = run.get("phase")
        if phase not in {"WEEK_SUMMARY_PENDING", "FINAL_SUMMARY_PENDING"}:
            raise ActivityRejected("No weekly summary awaits acknowledgment")
        if not isinstance(run.get("lastWeekSummary"), dict):
            raise ActivityRejected("Weekly summary is unavailable")
        if phase == "FINAL_SUMMARY_PENDING":
            run["phase"] = "ENDING_PENDING"
        elif run.get("pendingStoryEvent") is not None:
            run["phase"] = "MAIN_STORY_PENDING"
        else:
            run["phase"] = "SCHEDULE_READY"
        run["updatedAt"] = datetime.now(timezone.utc)
        slot.activeRun = run
        return MutationPlan(slot=slot, result_data={"phase": run["phase"]})

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="ackWeekSummary", command={}, read_paths=(), mutator=mutate,
        )
        return mutation_response(result, slot_id)
    except Exception as error:
        raise _report_error(error) from None


@router.post("/{slot_id}/activities/complete-forced-rest")
def complete_forced_rest(
    slot_id: int,
    body: MutationRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
) -> dict:
    """Consume one locked weekday; restore stamina only after day three."""
    now = datetime.now(timezone.utc)
    kst_date = now.astimezone(KST).date().isoformat()
    day_path = UserDocPath("activityDays", kst_date)

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        run = _active_run(slot)
        day = run.get("day")
        count = run.get("completedWeekdayCount")
        if day not in WEEKDAYS or type(count) is not int or count != WEEKDAYS.index(day):
            raise ActivityRejected("Saved weekday progress is inconsistent")
        if run.get("pendingStoryEvent") is not None:
            raise ActivityRejected("Complete the pending Story first")
        schedule = run.get("weeklySchedule")
        if not isinstance(schedule, dict) or set(schedule) != set(WEEKDAYS):
            raise ActivityRejected("Weekly schedule is unavailable")
        entry = schedule[day]
        if (not isinstance(entry, dict) or entry.get("status") != "IN_PROGRESS"
                or entry.get("type") != "FORCED_REST" or entry.get("locked") is not True
                or entry.get("startedAt") is None or entry.get("staminaCost") != 0):
            raise ActivityRejected("No started forced-rest activity")
        forced = run.get("forcedRest")
        if not isinstance(forced, dict) or forced.get("active") is not True:
            raise ActivityRejected("Forced-rest state is invalid")
        remaining = forced.get("remainingWeekdays")
        if type(remaining) is not int or not 1 <= remaining <= 3:
            raise ActivityRejected("Forced-rest remaining weekdays are invalid")
        stamina = run.get("stamina")
        if not isinstance(stamina, dict):
            raise ActivityRejected("Stored stamina is invalid")
        current, maximum = stamina.get("current"), stamina.get("max")
        if type(current) is not int or type(maximum) is not int or not 0 <= current <= maximum <= 100:
            raise ActivityRejected("Stored stamina is invalid")
        if remaining == 1 and maximum != 100:
            raise ActivityRejected("Forced-rest recovery maximum must be 100")
        available = len(WEEKDAYS) - WEEKDAYS.index(day)
        rest_days = min(remaining, available)
        recovered = 0
        for offset in range(rest_days):
            rest_day = WEEKDAYS[WEEKDAYS.index(day) + offset]
            rest_entry = schedule[rest_day]
            if offset:
                if not isinstance(rest_entry, dict) or rest_entry.get("status") != "PLANNED":
                    raise ActivityRejected("A later forced-rest weekday is unavailable")
                rest_entry["replacedContentId"] = rest_entry.get("contentId")
                rest_entry["replacedType"] = rest_entry.get("type")
                rest_entry.update(type="FORCED_REST", contentId="FORCED_REST", locked=True,
                                  status="IN_PROGRESS", startedAt=now, staminaBefore=current,
                                  staminaCost=0)
            remaining_after = remaining - offset - 1
            day_recovery = 100 - current if remaining_after == 0 else 0
            if day_recovery:
                stamina["current"] = 100
                recovered += day_recovery
            forced["remainingWeekdays"] = remaining_after
            forced["active"] = remaining_after > 0
            rest_entry["status"] = "COMPLETED"
            rest_entry["resolution"] = "SUCCESS"
            rest_entry["staminaRecovered"] = day_recovery
            rest_entry["completedAt"] = now
            run["day"] = rest_day
            _record_activity_history(run, day=rest_day, entry=rest_entry)
            run["completedWeekdayCount"] += 1
            _advance_completed_day(run)
        run["updatedAt"] = now
        slot.activeRun = run
        summary = _daily_summary(documents[day_path], uid=repository.uid,
                                 kst_date=kst_date, now=now)
        daily_count = summary["activityCounts"].get("forcedRest", 0)
        if type(daily_count) is not int or daily_count < 0:
            raise ActivityRejected("Daily forced-rest count is invalid")
        summary["activityCounts"]["forcedRest"] = daily_count + rest_days
        return MutationPlan(
            slot=slot, documents={day_path: summary},
            result_data={"remainingWeekdays": forced["remainingWeekdays"],
                         "restDaysCompleted": rest_days,
                         "staminaRecovered": recovered, "staminaCurrent": stamina["current"],
                         "nextDay": run["day"],
                         "weekComplete": run["completedWeekdayCount"] == len(WEEKDAYS)},
        )

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="completeForcedRest", command={}, read_paths=(day_path,), mutator=mutate,
        )
        return mutation_response(result, slot_id)
    except Exception as error:
        raise _report_error(error) from None


@router.post("/{slot_id}/activities/complete-rest")
def complete_rest(
    slot_id: int,
    body: CompleteRestRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
    master: ActivityMaster = Depends(get_activity_master),
) -> dict:
    """Server-resolve a rest day and commit slot plus global/daily counts once."""
    now = datetime.now(timezone.utc)
    kst_date = now.astimezone(KST).date().isoformat()
    day_path = UserDocPath("activityDays", kst_date)
    # Pick once before entering a retryable Firestore transaction. A replayed
    # request returns its stored receipt, not this unused fresh roll.
    rest_rules = {
        "HOME": ((60, 70, 80), 0),
        "FRIENDS": ((40, 50, 60), 1),
        "HOBBY": ((30, 40, 50), 2),
    }
    recoveries, stat_growth = rest_rules[body.restChoice]
    roll = choice(recoveries)
    target_stat = choice(tuple(sorted(STATS))) if stat_growth else None

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        run = _active_run(slot)
        day = run.get("day")
        if day not in WEEKDAYS or run.get("completedWeekdayCount") != WEEKDAYS.index(day):
            raise ActivityRejected("Saved weekday progress is inconsistent")
        if run.get("pendingStoryEvent") is not None:
            raise ActivityRejected("Complete the pending Story first")
        schedule = run.get("weeklySchedule")
        if not isinstance(schedule, dict) or set(schedule) != set(WEEKDAYS):
            raise ActivityRejected("Weekly schedule is unavailable")
        entry = schedule[day]
        if (not isinstance(entry, dict) or entry.get("status") != "IN_PROGRESS"
                or entry.get("type") != "REST" or entry.get("startedAt") is None):
            raise ActivityRejected("No started ordinary rest activity")
        definition = master.get(version=slot.gameDataVersion, activity_id=entry.get("contentId", ""))
        if definition.activity_type != "REST":
            raise ActivityRejected("Scheduled rest does not match the catalog")
        stamina = run.get("stamina", {})
        current, maximum = stamina.get("current"), stamina.get("max")
        if type(current) is not int or type(maximum) is not int or not 0 <= current <= maximum <= 100:
            raise ActivityRejected("Stored stamina is invalid")
        if type(run.get("week")) is not int or not 1 <= run["week"] <= 52:
            raise ActivityRejected("Run week is invalid")
        recovered = min(roll, maximum - current)
        stamina["current"] = current + recovered
        stats = run.get("stats")
        if not isinstance(stats, dict) or set(stats) != STATS:
            raise ActivityRejected("Stored growth stats are invalid")
        growth_applied = 0
        if target_stat is not None:
            current_stat = stats.get(target_stat)
            if type(current_stat) is not int or not 0 <= current_stat <= 500:
                raise ActivityRejected("Stored growth stat is invalid")
            growth_applied = min(stat_growth, 500 - current_stat)
            stats[target_stat] = current_stat + growth_applied
        entry["status"] = "COMPLETED"
        entry["resolution"] = "SUCCESS"
        entry["completedAt"] = now
        entry["staminaRecovered"] = recovered
        entry["restChoice"] = body.restChoice
        if target_stat is not None:
            entry["targetStat"] = target_stat
            entry["growthApplied"] = growth_applied
        _record_activity_history(run, day=day, entry=entry)
        run_stats = run.get("runStatistics")
        if (not isinstance(run_stats, dict) or type(run_stats.get("restCount")) is not int
                or run_stats["restCount"] < 0):
            raise ActivityRejected("Run statistics are invalid")
        run_stats["restCount"] += 1
        run["completedWeekdayCount"] += 1
        week_complete = run["completedWeekdayCount"] == len(WEEKDAYS)
        if not week_complete:
            run["day"] = WEEKDAYS[run["completedWeekdayCount"]]
        run["phase"] = "WEEKEND_PENDING" if week_complete else "ACTIVITY_READY"
        run["updatedAt"] = now
        slot.activeRun = run

        raw_statistics = documents[STATISTICS]
        if raw_statistics is None:
            raise ActivityRejected("Global statistics are unavailable")
        statistics = GlobalStatistics.model_validate(raw_statistics)
        statistics.totalRestCount += 1
        statistics.updatedAt = now
        summary = _daily_summary(documents[day_path], uid=repository.uid,
                                 kst_date=kst_date, now=now)
        summary["activityCounts"]["rest"] += 1
        return MutationPlan(
            slot=slot,
            documents={STATISTICS: statistics.model_dump(mode="python"), day_path: summary},
            result_data={"restChoice": body.restChoice, "recoveryRoll": roll,
                         "staminaRecovered": recovered, "targetStat": target_stat,
                         "growthApplied": growth_applied,
                         "staminaCurrent": stamina["current"], "nextDay": run["day"],
                         "weekComplete": week_complete},
        )

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="completeRest", command={"restChoice": body.restChoice},
            read_paths=(STATISTICS, day_path),
            mutator=mutate,
        )
        return mutation_response(result, slot_id)
    except Exception as error:
        raise _report_error(error) from None


@router.post("/{slot_id}/activities/complete-adventure")
def complete_adventure(
    slot_id: int,
    body: CompleteAdventureRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
    master: ActivityMaster = Depends(get_activity_master),
    candidates: StoryCandidates = Depends(get_story_candidates),
) -> dict:
    """Resolve adventure outcome (MISSION_COMPLETE or TIMEOUT with partial growth)."""
    now = datetime.now(timezone.utc)
    kst_date = now.astimezone(KST).date().isoformat()
    day_path = UserDocPath("activityDays", kst_date)

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        run = _active_run(slot)
        day = run.get("day")
        count = run.get("completedWeekdayCount")
        if day not in WEEKDAYS or type(count) is not int or count != WEEKDAYS.index(day):
            raise ActivityRejected("Saved weekday progress is inconsistent")
        if run.get("pendingStoryEvent") is not None:
            raise ActivityRejected("Complete the pending Story first")
        schedule = run.get("weeklySchedule")
        if not isinstance(schedule, dict) or set(schedule) != set(WEEKDAYS):
            raise ActivityRejected("Weekly schedule is unavailable")
        entry = schedule[day]
        if (not isinstance(entry, dict) or entry.get("status") != "IN_PROGRESS"
                or entry.get("type") != "ADVENTURE" or entry.get("startedAt") is None):
            raise ActivityRejected("No started adventure activity")
        definition = master.get(version=slot.gameDataVersion, activity_id=entry.get("contentId", ""))
        if (definition.activity_type != "ADVENTURE" or not definition.location_id
                or definition.target_stat != "exploration"
                or type(entry.get("staminaCost")) is not int or entry["staminaCost"] != 15):
            raise ActivityRejected("Adventure checkpoint does not match the catalog")

        stats = run.get("stats")
        if not isinstance(stats, dict):
            raise ActivityRejected("Stored stats are invalid")
        current = stats.get("exploration")
        if type(current) is not int or not 0 <= current <= 500:
            raise ActivityRejected("Stored exploration stat is invalid")

        stamina_before = entry.get("staminaBefore")
        if type(stamina_before) is not int or not 10 <= stamina_before <= 100:
            raise ActivityRejected("Stored stamina before adventure is invalid")

        try:
            expected_reward, _, _ = difficulty(current, 0)
            expected_objective_count = adventure_objective_count(current, definition.activity_id)
            expected_adventure_difficulty = adventure_difficulty(current)
            expected_duration_seconds = adventure_duration_seconds(current)
        except ValueError:
            raise ActivityRejected("Stored exploration difficulty is invalid") from None

        objective_count = entry.get("objectiveCount")
        adventure_level = entry.get("adventureDifficulty")
        duration_seconds = entry.get("durationSeconds")
        adventure_seed = entry.get("adventureSeed")
        mission_id = entry.get("missionId")
        if (type(objective_count) is not int or objective_count != expected_objective_count
                or body.targetCount != objective_count
                or type(adventure_level) is not int or adventure_level != expected_adventure_difficulty
                or type(duration_seconds) is not int or duration_seconds != expected_duration_seconds
                or not isinstance(adventure_seed, str) or len(adventure_seed) < 24
                or not isinstance(mission_id, str) or not mission_id):
            raise ActivityRejected("Adventure checkpoint does not match the server mission")

        reward_number = ("EASY", "NORMAL", "HARD", "VERY_HARD").index(expected_reward) + 1
        base_success = reward_number + 4  # EASY: 5, NORMAL: 6, HARD: 7, VERY_HARD: 8
        balance = balance_snapshot(documents[BALANCE])

        success_growth = applied_growth(
            base_growth=base_success, target_stat="exploration",
            current_stat=current, stamina_before=stamina_before, balance=balance,
        )
        if body.resolution == "MISSION_COMPLETE":
            growth = success_growth
        else:  # TIMEOUT
            if body.foundCount == 0:
                growth = 0
            else:
                available_cap = 500 - current
                if available_cap <= 0:
                    growth = 0
                else:
                    partial = success_growth * body.foundCount // (objective_count * 2)
                    growth = min(max(1, partial), available_cap)

        stats["exploration"] = min(500, current + growth)
        entry["status"] = "COMPLETED"
        entry["resolution"] = body.resolution
        entry["completedAt"] = now
        entry["foundCount"] = body.foundCount
        entry["targetCount"] = body.targetCount
        entry["growthAwarded"] = {"exploration": growth}
        _record_activity_history(run, day=day, entry=entry)

        run_stats = run.get("runStatistics")
        if not isinstance(run_stats, dict):
            raise ActivityRejected("Run statistics are invalid")
        _increase_counter(run_stats, "adventureCount")
        if body.resolution == "MISSION_COMPLETE":
            _increase_counter(run_stats, "locationDiscoveryCount")

        raw_statistics = documents[STATISTICS]
        if raw_statistics is None:
            raise ActivityRejected("Global statistics are unavailable")
        statistics = GlobalStatistics.model_validate(raw_statistics)
        statistics.totalAdventureCount += 1
        if body.resolution == "MISSION_COMPLETE":
            statistics.totalLocationDiscoveryCount += 1
        statistics.updatedAt = now

        summary = _daily_summary(documents[day_path], uid=repository.uid,
                                 kst_date=kst_date, now=now)
        _increase_counter(summary["activityCounts"], "adventure")
        meta, unlock, progression = _apply_account_progression(
            documents=documents, statistics=statistics, repository=repository,
            now=now, daily_summary=summary,
        )

        run["completedWeekdayCount"] = count + 1
        pending = candidates.after_activity(
            version=slot.gameDataVersion, run=run,
            activity=ActivityContext(definition.activity_id, definition.activity_type,
                                     definition.location_id),
        )
        if pending is not None:
            run["pendingStoryEvent"] = pending
            run["phase"] = "ACTIVITY_STORY_PENDING"
        else:
            _advance_completed_day(run)
        week_complete = run["completedWeekdayCount"] == len(WEEKDAYS)
        run["updatedAt"] = now
        slot.activeRun = run

        return MutationPlan(
            slot=slot,
            documents={
                META: meta.model_dump(mode="python"),
                STATISTICS: statistics.model_dump(mode="python"),
                UNLOCK: unlock.model_dump(mode="python"),
                day_path: summary,
            },
            result_data={
                "resolution": body.resolution,
                "foundCount": body.foundCount,
                "targetCount": objective_count,
                "growthAwarded": {"exploration": growth},
                "explorationAfter": stats["exploration"],
                "progression": progression,
                "nextDay": run["day"],
                "weekComplete": week_complete,
                "pendingStoryEvent": pending,
            },
        )

    try:
        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="completeAdventure", command=body.model_dump(mode="json"),
            read_paths=(STATISTICS, BALANCE, META, UNLOCK, day_path), mutator=mutate,
        )
        return mutation_response(result, slot_id)
    except Exception as error:
        raise _report_error(error) from None

