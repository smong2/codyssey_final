"""Authenticated dialogue loading and single-commit completion."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from .account import _STATS, _TAGS
from .activities import ActivityRejected, KST, _advance_completed_day, _daily_summary
from .authentication import AuthenticatedUser, require_verified_user
from .dialogue_master import DialogueAssetMissing, DialogueMaster, DialogueMasterError, DialogueNotFound
from .dialogue_token import InvalidDialogueToken, issue_token, verify_token
from .models import GlobalMetaProgress, GlobalStatistics, SaveSlot, UnlockState
from .progression_rules import (ProgressionError, evaluate_progression,
                                record_daily_unlocks)
from .repositories import MutationPlan, SaveSlotRepository, UserDocPath
from .save_slots import get_slot_repository, mutation_response, _error as slot_error


router = APIRouter(tags=["dialogue"])
META = UserDocPath("meta", "progress")
STATISTICS = UserDocPath("statistics", "global")
UNLOCK = UserDocPath("unlockState", "global")


class DialogueRejected(Exception):
    pass


class SelectedChoice(BaseModel):
    choiceNodeId: str
    choiceId: str


class CompleteDialogueRequest(BaseModel):
    dialogueToken: str = Field(min_length=1, max_length=2048)
    completionMode: Literal["COMPLETE", "SKIP"]
    selectedChoices: list[SelectedChoice]
    requestId: str = Field(min_length=1, max_length=256)
    expectedServerRevision: int = Field(ge=0)


def get_dialogue_master(request: Request) -> DialogueMaster:
    return DialogueMaster(
        request.app.state.settings.content_sqlite_path,
        asset_root=Path(__file__).resolve().parents[3] / "asset",
    )


def _secret(request: Request) -> str:
    secret = request.app.state.settings.dialogue_token_secret
    if not secret or len(secret) < 32:
        raise HTTPException(503, "Dialogue token secret is not configured")
    return secret


def _is_pending(slot: SaveSlot, event_id: str) -> bool:
    run = slot.activeRun
    pending = run.get("pendingStoryEvent") if isinstance(run, dict) else None
    return (slot.status == "PLAYING" and isinstance(pending, dict)
            and run.get("phase") != "WEEK_SUMMARY_PENDING"
            and pending.get("eventId") == event_id)


def _check_pending_metadata(run: dict, compiled: dict) -> None:
    pending = run["pendingStoryEvent"]
    if pending.get("storyId", compiled["storyId"]) != compiled["storyId"]:
        raise DialogueRejected("Pending Story ID does not match content")
    if pending.get("storyType", compiled["storyType"]) != compiled["storyType"]:
        raise DialogueRejected("Pending Story type does not match content")


def _can_skip(meta: GlobalMetaProgress) -> bool:
    # Current production default. Administrator overrides are a later phase.
    return bool(meta.seenEndingIds)


def _http_error(error: Exception) -> HTTPException:
    if isinstance(error, DialogueNotFound):
        return HTTPException(404, str(error))
    if isinstance(error, DialogueAssetMissing):
        return HTTPException(503, str(error))
    if isinstance(error, DialogueMasterError):
        return HTTPException(503, str(error))
    if isinstance(error, (DialogueRejected, InvalidDialogueToken)):
        return HTTPException(409, str(error) or "Invalid dialogue token")
    return slot_error(error)


@router.get("/v1/save-slots/{slot_id}/dialogue/{event_id}")
def load_dialogue(
    slot_id: int,
    event_id: str,
    request: Request,
    user: AuthenticatedUser = Depends(require_verified_user),
    repository: SaveSlotRepository = Depends(get_slot_repository),
    master: DialogueMaster = Depends(get_dialogue_master),
) -> dict:
    secret = _secret(request)
    try:
        slot, documents = repository.get_slot_and_user_documents(slot_id, (META,))
        if not _is_pending(slot, event_id):
            raise DialogueRejected("Event is not pending for this run")
        run = slot.activeRun
        meta_raw = documents[META]
        if meta_raw is None:
            raise DialogueRejected("Global progress is unavailable")
        meta = GlobalMetaProgress.model_validate(meta_raw)
        payload = master.compile(
            version=slot.gameDataVersion, event_id=event_id,
            character_id=run["characterId"], cast=run["storyCast"],
        )
        _check_pending_metadata(run, payload)
        payload.pop("choiceGroups")
        payload.pop("storyType")
        payload.pop("stepNo")
        payload["canSkip"] = _can_skip(meta)
        payload["dialogueToken"] = issue_token(
            secret, uid=user.uid, slot_id=slot_id, run_id=run["runId"],
            event_id=event_id, version=slot.gameDataVersion, revision=slot.serverRevision,
        )
        return payload
    except Exception as error:
        raise _http_error(error) from None


def _validated_choices(groups: list[dict], selected: list[SelectedChoice], mode: str) -> list[str]:
    if mode == "COMPLETE" and len(selected) != len(groups):
        raise DialogueRejected("All dialogue choices are required")
    if len(selected) > len(groups):
        raise DialogueRejected("Too many dialogue choices")
    choice_ids = []
    for index, choice in enumerate(selected):
        group = groups[index]
        if choice.choiceNodeId != group["choiceNodeId"] or choice.choiceId not in group["choiceIds"]:
            raise DialogueRejected("Choice is not available at this dialogue node")
        choice_ids.append(choice.choiceId)
    return choice_ids


def _choice_records(compiled: dict, selected: list[SelectedChoice]) -> list[dict]:
    texts = {
        (command["choiceNodeId"], option["choiceId"]): option["text"]
        for command in compiled["sequence"] if command["type"] == "CHOICE"
        for option in command["options"]
    }
    return [
        {**choice.model_dump(), "text": texts[(choice.choiceNodeId, choice.choiceId)]}
        for choice in selected
    ]


def _apply_effects(run: dict, bundle: dict, *, mode: str, event_id: str,
                   story_id: str, title: str, story_type: str, step_no: int,
                   selected_choices: list[dict], choice_ids: list[str],
                   now: datetime) -> tuple[dict, dict]:
    result = deepcopy(run)
    visible_delta: dict[str, int] = {}
    if mode == "COMPLETE":
        for effect in bundle["choice"]:
            kind, target, value = effect["type"], effect["target"], effect["value"]
            if kind == "VISIBLE_STAT" and target in _STATS and type(value) is int and value >= 0:
                old = result["stats"][target]
                if type(old) is not int or not 0 <= old <= 500:
                    raise DialogueRejected("Stored visible stat is invalid")
                new = min(500, old + value)
                result["stats"][target] = new
                visible_delta[target] = visible_delta.get(target, 0) + new - old
            elif kind == "HIDDEN_STAT" and target in _TAGS and type(value) is int and value >= 0:
                old = result["hiddenStats"][target]
                if type(old) is not int or not 0 <= old <= 300:
                    raise DialogueRejected("Stored hidden stat is invalid")
                result["hiddenStats"][target] = min(300, old + value)
            elif kind == "EVENT_FLAG":
                result["eventFlags"][target] = value
            else:
                raise DialogueMasterError("Unsupported choice effect")
    for effect in bundle["event"]:
        if mode == "SKIP" and effect["applyOn"] != "COMPLETE_OR_SKIP":
            continue
        kind, target, value = effect["type"], effect["target"], effect["value"]
        if kind == "STORY_PROGRESS" and isinstance(value, dict):
            result["storyProgress"][target] = {
                "step": value["step"], "status": value["status"],
                "lastAdvancedWeek": result["week"],
            }
        elif kind == "EVENT_FLAG":
            result["eventFlags"][target] = value
        else:
            raise DialogueMasterError("Unsupported event effect")
    result["eventFlags"][event_id] = True
    if mode == "COMPLETE":
        important = bundle["important"]
        result["runStatistics"]["importantChoiceCount"] += len(important)
        for choice_id in important:
            candidate = {"eventId": event_id, "choiceId": choice_id, "week": result["week"]}
            if candidate not in result["representativeChoices"]:
                result["representativeChoices"].append(candidate)
    history = result.setdefault("dialogueHistory", [])
    if (not isinstance(history, list) or len(history) >= 300
            or any(not isinstance(item, dict) or not isinstance(item.get("eventId"), str)
                   for item in history)):
        raise DialogueRejected("Stored dialogue history is invalid")
    if not any(item.get("eventId") == event_id for item in history):
        day = result.get("day")
        day_index = {"MONDAY": 0, "TUESDAY": 1, "WEDNESDAY": 2,
                     "THURSDAY": 3, "FRIDAY": 4}.get(day)
        if day_index is None:
            raise DialogueRejected("Dialogue history day is invalid")
        history.append({
            "eventId": event_id,
            "storyId": story_id,
            "title": title,
            "week": result["week"],
            "day": day_index,
            "completionMode": mode,
            "selectedChoices": deepcopy(selected_choices),
            "effect": {"growth": deepcopy(visible_delta)},
        })
    if story_type in {"NPC", "LOCATION"}:
        window = result["storyEventWindow"]
        if window.get("week") != result["week"]:
            window.update({
                "week": result["week"], "sideStoryCount": 0,
                "locationStoryCount": 0, "lastResultStoryDay": None,
            })
        if window["sideStoryCount"] >= 2 or window.get("lastResultStoryDay") == f"{result['week']}:{result['day']}":
            raise DialogueRejected("Side-story occurrence limit is exceeded")
        location_count = window.get("locationStoryCount")
        if location_count is None:
            location_count = sum(
                1 for story_id, progress in run.get("storyProgress", {}).items()
                if story_id.startswith("LOC_")
                and isinstance(progress, dict)
                and progress.get("status") == "COMPLETED"
                and progress.get("lastAdvancedWeek") == result["week"]
            )
        if type(location_count) is not int or location_count < 0:
            raise DialogueRejected("Location Story occurrence counter is invalid")
        if story_type == "LOCATION":
            if location_count >= 1:
                raise DialogueRejected("Location Story weekly limit is exceeded")
            window["locationStoryCount"] = location_count + 1
        window["sideStoryCount"] += 1
        window["lastResultStoryDay"] = f"{result['week']}:{result['day']}"
    if story_type == "NPC":
        run_stats = result.get("runStatistics")
        if not isinstance(run_stats, dict):
            raise DialogueRejected("Run statistics are invalid")
        encounter_count = run_stats.get("npcEncounterCount")
        if type(encounter_count) is not int or encounter_count < 0:
            raise DialogueRejected("NPC encounter count is invalid")
        run_stats["npcEncounterCount"] = encounter_count + 1
        if step_no == 4:
            completed = run_stats.get("completedNpcStoryCount")
            if type(completed) is not int or completed < 0:
                raise DialogueRejected("Completed NPC Story count is invalid")
            run_stats["completedNpcStoryCount"] = completed + 1
    result["pendingStoryEvent"] = None
    origin_phase = run.get("phase")
    if origin_phase == "ACTIVITY_PRE_STORY_PENDING":
        result["phase"] = "ACTIVITY_IN_PROGRESS"
    else:
        result["phase"] = "STORY_COMPLETE"
    if origin_phase == "ACTIVITY_STORY_PENDING":
        try:
            _advance_completed_day(result)
        except ActivityRejected:
            raise DialogueRejected("Completed activity day is inconsistent") from None
    result["updatedAt"] = now
    return result, {"visibleStatDelta": visible_delta}


@router.post("/v1/dialogue/complete")
def complete_dialogue(
    body: CompleteDialogueRequest,
    request: Request,
    user: AuthenticatedUser = Depends(require_verified_user),
    repository: SaveSlotRepository = Depends(get_slot_repository),
    master: DialogueMaster = Depends(get_dialogue_master),
) -> dict:
    secret = _secret(request)
    try:
        claims = verify_token(secret, body.dialogueToken)
        if claims["uid"] != user.uid or claims["revision"] != body.expectedServerRevision:
            raise InvalidDialogueToken
        slot_id = claims["slotId"]
        if type(slot_id) is not int or not 1 <= slot_id <= 5:
            raise InvalidDialogueToken
        now = datetime.now(timezone.utc)
        kst_date = now.astimezone(KST).date().isoformat()
        day_path = UserDocPath("activityDays", kst_date)

        def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
            if (not _is_pending(slot, claims["eventId"])
                or slot.activeRun["runId"] != claims["runId"]
                or slot.gameDataVersion != claims["version"]):
                raise DialogueRejected("Dialogue no longer matches the pending run")
            run = slot.activeRun
            meta_raw, stats_raw, unlock_raw = documents[META], documents[STATISTICS], documents[UNLOCK]
            if meta_raw is None or stats_raw is None or unlock_raw is None:
                raise DialogueRejected("Account progress is unavailable")
            meta = GlobalMetaProgress.model_validate(meta_raw)
            statistics = GlobalStatistics.model_validate(stats_raw)
            unlock = UnlockState.model_validate(unlock_raw)
            if body.completionMode == "SKIP" and not _can_skip(meta):
                raise DialogueRejected("Dialogue skip is not allowed")
            compiled = master.compile(
                version=slot.gameDataVersion, event_id=claims["eventId"],
                character_id=run["characterId"], cast=run["storyCast"],
            )
            _check_pending_metadata(run, compiled)
            choice_ids = _validated_choices(
                compiled["choiceGroups"], body.selectedChoices, body.completionMode,
            )
            choice_records = _choice_records(compiled, body.selectedChoices)
            bundle = master.effects(version=slot.gameDataVersion, event_id=claims["eventId"],
                                    choice_ids=choice_ids)
            updated_run, summary = _apply_effects(
                run, bundle, mode=body.completionMode, event_id=claims["eventId"],
                story_id=compiled["storyId"], title=compiled["title"],
                story_type=compiled["storyType"], step_no=compiled["stepNo"],
                selected_choices=choice_records,
                choice_ids=choice_ids, now=now,
            )
            if body.completionMode == "COMPLETE":
                statistics.importantChoiceCount += len(bundle["important"])
                for effect in bundle["choice"]:
                    if effect["type"] == "HIDDEN_STAT":
                        tag = effect["target"]
                        count = statistics.behaviorTagCounts.get(tag)
                        if tag not in _TAGS or type(count) is not int or count < 0:
                            raise DialogueRejected("Behavior tag counter is invalid")
                        statistics.behaviorTagCounts[tag] = count + 1
            if compiled["storyType"] == "NPC":
                statistics.totalNpcEncounterCount += 1
                if compiled["stepNo"] == 4:
                    statistics.completedNpcStoryCount += 1
            statistics.updatedAt = now
            daily = _daily_summary(documents[day_path], uid=repository.uid,
                                   kst_date=kst_date, now=now)
            story_key = {"MAIN": "mainCompletedCount", "NPC": "npcCompletedCount",
                         "LOCATION": "locationCompletedCount"}.get(compiled["storyType"])
            story_counts = daily.get("story")
            if story_key is None or not isinstance(story_counts, dict):
                raise DialogueRejected("Daily Story summary is invalid")
            story_count = story_counts.get(story_key)
            if type(story_count) is not int or story_count < 0:
                raise DialogueRejected("Daily Story counter is invalid")
            story_counts[story_key] = story_count + 1
            try:
                progression = evaluate_progression(
                    uid=repository.uid, meta=meta, statistics=statistics,
                    unlock=unlock, now=now,
                )
                record_daily_unlocks(daily, progression)
            except (ValueError, ProgressionError) as error:
                raise DialogueRejected(str(error)) from None
            slot.activeRun = updated_run
            return MutationPlan(
                slot=slot,
                documents={
                    META: meta.model_dump(mode="python"),
                    STATISTICS: statistics.model_dump(mode="python"),
                    UNLOCK: unlock.model_dump(mode="python"),
                    day_path: daily,
                },
                result_data={"completionMode": body.completionMode, "appliedSummary": summary,
                             "progression": progression.as_dict()},
            )

        result = repository.apply(
            slot_id=slot_id, request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="completeDialogue",
            command={"dialogueToken": body.dialogueToken, "completionMode": body.completionMode,
                     "selectedChoices": [choice.model_dump() for choice in body.selectedChoices]},
            read_paths=(META, STATISTICS, UNLOCK, day_path), mutator=mutate,
        )
        current = result.slot or repository.get(slot_id)
        return mutation_response(
            result, slot_id,
            success=True,
            completionMode=result.result_data["completionMode"],
            serverRevision=current.serverRevision,
            appliedRevision=result.server_revision,
            activeRun=current.activeRun,
            appliedSummary=result.result_data["appliedSummary"],
            progression=result.result_data["progression"],
        )
    except Exception as error:
        raise _http_error(error) from None
