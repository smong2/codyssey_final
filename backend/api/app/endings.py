"""Phase 9 ending preparation, resume, finalization, and record lookup APIs."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256
import json
from typing import Protocol

from fastapi import APIRouter, Depends, HTTPException, Request

from .activities import KST, ActivityRejected, _daily_summary
from .ending_workflow import (PROMPT_VERSION, EndingContentMaster, EndingWorkflowError,
                              LetterValidationError, build_memory_context,
                              fallback_letter, validate_letter)
from .gemini import GeminiEndingLetterGenerator, GeminiGenerationError
from .models import EndingRecord, GlobalMetaProgress, GlobalStatistics, SaveSlot, UnlockState
from .progression_rules import (ProgressionError, evaluate_progression,
                                promote_pending_characters, record_daily_unlocks)
from .repositories import MutationPlan, RevisionConflict, SaveSlotRepository, UserDocPath
from .save_slots import MutationRequest, get_slot_repository, mutation_response, _error as slot_error
from pydantic import Field


router = APIRouter(tags=["endings"])
META = UserDocPath("meta", "progress")
STATISTICS = UserDocPath("statistics", "global")
UNLOCK = UserDocPath("unlockState", "global")


class EndingRejected(Exception):
    pass


class FinishEndingRequest(MutationRequest):
    recordId: str = Field(min_length=1, max_length=128, pattern=r"^[A-Za-z0-9._:-]+$")


class LetterGenerator(Protocol):
    def generate(self, context: dict) -> str: ...


def get_ending_letter_generator(request: Request) -> LetterGenerator:
    settings = request.app.state.settings
    return GeminiEndingLetterGenerator(
        api_key=settings.gemini_api_key,
        model=settings.gemini_model,
        thinking_level=settings.gemini_thinking_level,
    )


def _error(error: Exception) -> HTTPException:
    if isinstance(error, (EndingRejected, EndingWorkflowError, ProgressionError)):
        return HTTPException(409, str(error))
    return slot_error(error)


def _public_prepared(slot_id: int, revision: int, run: dict, *, replayed: bool) -> dict:
    prepared = run.get("endingPrepared")
    if not isinstance(prepared, dict):
        raise EndingRejected("Prepared ending is unavailable")
    ending = prepared.get("ending")
    letter = prepared.get("letter")
    if not isinstance(ending, dict) or not isinstance(letter, dict):
        raise EndingRejected("Prepared ending is corrupt")
    return {
        "slotId": slot_id,
        "serverRevision": revision,
        "replayed": replayed,
        "phase": run.get("phase"),
        "recordId": prepared.get("recordId"),
        "character": deepcopy(prepared.get("character")),
        "ending": {
            key: ending.get(key)
            for key in ("id", "name", "subtitle", "type", "careerAnchor", "futureSceneGuide")
        },
        "letter": {"content": letter.get("content")},
        "playRecords": deepcopy(prepared.get("selectedPlayRecords", [])),
        "representativeChoices": deepcopy(prepared.get("representativeChoices", [])),
    }


def _generate_letter(generator: LetterGenerator, context: dict) -> tuple[str, str]:
    """Try Gemini twice; any provider/validation failure ends in the reviewed fallback."""
    for _ in range(2):
        try:
            return validate_letter(generator.generate(context), context), "GENERATED"
        except (GeminiGenerationError, LetterValidationError):
            continue
    return validate_letter(fallback_letter(context), context), "FALLBACK"


@router.post("/v1/save-slots/{slot_id}/ending/prepare")
def prepare_ending(
    slot_id: int,
    body: MutationRequest,
    request: Request,
    repository: SaveSlotRepository = Depends(get_slot_repository),
    generator: LetterGenerator = Depends(get_ending_letter_generator),
) -> dict:
    """Build Long-term Play Memory, generate/validate a letter, then safely store it."""
    try:
        current = repository.get(slot_id)
        if current.status != "PLAYING" or not isinstance(current.activeRun, dict):
            raise EndingRejected("No playing run")
        run = current.activeRun
        if run.get("phase") == "ENDING_READY" and isinstance(run.get("endingPrepared"), dict):
            # Resume/retry never calls Gemini again, even if the original HTTP response was lost.
            return _public_prepared(slot_id, current.serverRevision, run, replayed=True)
        if run.get("phase") != "ENDING_DECIDED" or not isinstance(run.get("endingDecision"), dict):
            raise EndingRejected("Ending career must be decided before preparing the letter")
        if current.serverRevision != body.expectedServerRevision:
            raise RevisionConflict

        settings = request.app.state.settings
        content = EndingContentMaster(settings.content_sqlite_path)
        character_name, choices = content.memory_content(
            version=current.gameDataVersion,
            character_id=run.get("characterId"),
            representative_choices=run.get("representativeChoices", []),
        )
        context = build_memory_context(
            run=run, decision=run["endingDecision"], character_name=character_name,
            representative_choices=choices,
        )
        letter_content, generation_status = _generate_letter(generator, context)
        generated_at = datetime.now(timezone.utc)
        record_id = run.get("runId")
        if not isinstance(record_id, str) or not record_id or len(record_id) > 128:
            raise EndingRejected("Run ID cannot be used as the ending record ID")
        letter = {
            "content": letter_content,
            "generationStatus": generation_status,
            "model": settings.gemini_model,
            "promptVersion": PROMPT_VERSION,
            "generatedAt": generated_at,
        }
        hidden_summary = {
            # Ending history keeps only the labels that were highlighted. Raw hidden
            # values are transient Gemini input and are never exposed by record APIs.
            "dominant": [item["id"] for item in context["hiddenHighlights"]],
        }
        prepared = {
            "recordId": record_id,
            "character": deepcopy(context["character"]),
            "ending": deepcopy(context["ending"]),
            "selectedPlayRecords": deepcopy(context["playRecords"]),
            "representativeChoices": deepcopy(context["representativeChoices"]),
            "hiddenStatsSummary": hidden_summary,
            "letter": letter,
            "preparedAt": generated_at,
            # Proves which current-run Long-term Memory was used without storing UID/email.
            "memoryContextHash": sha256(json.dumps(
                {
                    "playRecords": context["playRecords"],
                    "representativeChoices": context["representativeChoices"],
                    "hiddenHighlights": context["hiddenHighlights"],
                    "visibleStats": context["visibleStats"],
                },
                ensure_ascii=False, sort_keys=True, separators=(",", ":"),
            ).encode("utf-8")).hexdigest(),
        }

        def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
            if slot.status != "PLAYING" or not isinstance(slot.activeRun, dict):
                raise EndingRejected("No playing run")
            active = deepcopy(slot.activeRun)
            if active.get("phase") != "ENDING_DECIDED":
                raise EndingRejected("Ending state changed while the letter was generated")
            if active.get("runId") != record_id or active.get("endingDecision") != run.get("endingDecision"):
                raise EndingRejected("Ending decision changed while the letter was generated")
            active["endingPrepared"] = deepcopy(prepared)
            active["phase"] = "ENDING_READY"
            active["updatedAt"] = generated_at
            slot.activeRun = active
            return MutationPlan(
                slot=slot,
                result_data={"recordId": record_id, "generationStatus": generation_status},
            )

        result = repository.apply(
            slot_id=slot_id,
            request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="prepareEndingLetter",
            command={"runId": record_id},
            read_paths=(),
            mutator=mutate,
        )
        saved = result.slot or repository.get(slot_id)
        return _public_prepared(slot_id, saved.serverRevision, saved.activeRun, replayed=result.replayed)
    except Exception as error:
        raise _error(error) from None


@router.get("/v1/save-slots/{slot_id}/ending")
def get_prepared_ending(
    slot_id: int,
    repository: SaveSlotRepository = Depends(get_slot_repository),
) -> dict:
    try:
        slot = repository.get(slot_id)
        if slot.status != "PLAYING" or not isinstance(slot.activeRun, dict):
            raise EndingRejected("No resumable ending")
        if slot.activeRun.get("phase") != "ENDING_READY":
            raise EndingRejected("Ending letter is not ready")
        return _public_prepared(slot_id, slot.serverRevision, slot.activeRun, replayed=False)
    except Exception as error:
        raise _error(error) from None


def _increase_map(container: dict, key: str, amount: int = 1) -> None:
    value = container.get(key, 0)
    if type(value) is not int or value < 0:
        raise EndingRejected(f"Stored ending counter {key} is invalid")
    container[key] = value + amount


def _record_character_unlocks(daily: dict, character_ids: list[str]) -> None:
    if not character_ids:
        return
    try:
        target = daily["unlocks"]["newByTypeAndId"].setdefault("CHARACTER", {})
    except (KeyError, AttributeError):
        raise EndingRejected("Daily unlock summary is invalid") from None
    if not isinstance(target, dict):
        raise EndingRejected("Daily character unlock summary is invalid")
    for character_id in character_ids:
        _increase_map(target, character_id)


def _apply_run_daily_summary(daily: dict, *, ending_id: str, final_stats: dict,
                             first_account_completion: bool) -> None:
    run = daily.get("run")
    if not isinstance(run, dict):
        raise EndingRejected("Daily run summary is invalid")
    _increase_map(run, "completedRunCount")
    if first_account_completion:
        _increase_map(run, "firstCompletedRunUserCount")
    endings = run.get("endingViewCounts")
    sums = run.get("finalStatSums")
    gte300 = run.get("finalStatGte300Counts")
    gte500 = run.get("finalStatGte500Counts")
    if not all(isinstance(item, dict) for item in (endings, sums, gte300, gte500)):
        raise EndingRejected("Daily ending statistics are invalid")
    _increase_map(endings, ending_id)
    for stat, value in final_stats.items():
        _increase_map(sums, stat, value)
        if value >= 300:
            _increase_map(gte300, stat)
        if value >= 500:
            _increase_map(gte500, stat)


def _final_progression(*, repository: SaveSlotRepository, meta: GlobalMetaProgress,
                       statistics: GlobalStatistics, unlock: UnlockState,
                       daily: dict, now: datetime) -> tuple[dict, list[str]]:
    aggregate = {
        "badges": [], "pets": [], "puzzlePieces": [], "roomBackgrounds": [],
        "pendingCharacters": [], "permanentBonusDelta": {
            stat: 0 for stat in ("knowledge", "expression", "skill", "exploration", "magic")
        },
    }
    promoted_all: list[str] = []
    for _ in range(8):
        progression = evaluate_progression(
            uid=repository.uid, meta=meta, statistics=statistics, unlock=unlock, now=now,
        )
        record_daily_unlocks(daily, progression)
        data = progression.as_dict()
        for key in ("badges", "pets", "puzzlePieces", "roomBackgrounds", "pendingCharacters"):
            for value in data[key]:
                if value not in aggregate[key]:
                    aggregate[key].append(value)
        for stat, delta in data["permanentBonusDelta"].items():
            aggregate["permanentBonusDelta"][stat] += delta
        promoted = promote_pending_characters(meta=meta, unlock=unlock, now=now)
        for character_id in promoted:
            if character_id not in promoted_all:
                promoted_all.append(character_id)
        _record_character_unlocks(daily, promoted)
        changed = bool(
            progression.badges or progression.pets or progression.puzzlePieces
            or progression.roomBackgrounds or progression.pendingCharacters
            or any(progression.permanentBonusDelta.values()) or promoted
        )
        if not changed:
            return aggregate, promoted_all
    raise EndingRejected("Final progression cascade did not converge")


@router.post("/v1/save-slots/{slot_id}/ending/finish")
def finish_ending(
    slot_id: int,
    body: FinishEndingRequest,
    repository: SaveSlotRepository = Depends(get_slot_repository),
) -> dict:
    """The final '타이틀로' boundary: record viewing, unlocks, and RUN_COMPLETE once."""
    now = datetime.now(timezone.utc)
    kst_date = now.astimezone(KST).date().isoformat()
    day_path = UserDocPath("activityDays", kst_date)

    record_id = body.recordId
    record_path = UserDocPath("endingRecords", record_id)

    def mutate(slot: SaveSlot, documents: dict) -> MutationPlan:
        if slot.status != "PLAYING" or not isinstance(slot.activeRun, dict):
            raise EndingRejected("No ending is awaiting completion")
        run = deepcopy(slot.activeRun)
        if run.get("phase") != "ENDING_READY" or not isinstance(run.get("endingPrepared"), dict):
            raise EndingRejected("Ending display is not ready to finish")
        prepared_run = run["endingPrepared"]
        if prepared_run.get("recordId") != record_id or run.get("runId") != record_id:
            raise EndingRejected("Prepared ending identity mismatch")
        if documents[record_path] is not None:
            raise EndingRejected("Ending record already exists")
        meta_raw, stats_raw, unlock_raw = documents[META], documents[STATISTICS], documents[UNLOCK]
        if meta_raw is None or stats_raw is None or unlock_raw is None:
            raise EndingRejected("Account progression is unavailable")
        meta = GlobalMetaProgress.model_validate(meta_raw)
        statistics = GlobalStatistics.model_validate(stats_raw)
        unlock = UnlockState.model_validate(unlock_raw)

        decision = run.get("endingDecision")
        letter = prepared_run.get("letter")
        if not isinstance(decision, dict) or not isinstance(letter, dict):
            raise EndingRejected("Ending preparation is incomplete")
        ending_id, ending_type = decision.get("endingId"), decision.get("endingType")
        character_id = run.get("characterId")
        if not isinstance(ending_id, str) or ending_type not in {"CAREER", "FALLBACK"}:
            raise EndingRejected("Ending decision is corrupt")
        if not isinstance(character_id, str) or not character_id:
            raise EndingRejected("Ending character is invalid")
        if run.get("runNumber") != slot.completedRunCount + 1:
            raise EndingRejected("Run number does not match slot completion count")

        first_completion = statistics.totalCompletedRuns == 0
        statistics.totalCompletedRuns += 1
        _increase_map(statistics.characterPlayCounts, character_id)
        _increase_map(statistics.endingViewCounts, ending_id)
        statistics.updatedAt = now
        if character_id not in meta.playedCharacterIds:
            meta.playedCharacterIds.append(character_id)
        if ending_type == "CAREER" and ending_id not in meta.seenEndingIds:
            meta.seenEndingIds.append(ending_id)
        meta.updatedAt = now

        try:
            daily = _daily_summary(documents[day_path], uid=repository.uid,
                                   kst_date=kst_date, now=now)
        except ActivityRejected as error:
            raise EndingRejected(str(error)) from None
        final_stats = deepcopy(run.get("stats"))
        if not isinstance(final_stats, dict):
            raise EndingRejected("Final stats are unavailable")
        _apply_run_daily_summary(
            daily, ending_id=ending_id, final_stats=final_stats,
            first_account_completion=first_completion,
        )
        progression, promoted = _final_progression(
            repository=repository, meta=meta, statistics=statistics, unlock=unlock,
            daily=daily, now=now,
        )

        record = EndingRecord(
            endingRecordId=record_id,
            runId=run["runId"],
            slotId=slot_id,
            runNumber=run["runNumber"],
            characterId=character_id,
            endingId=ending_id,
            endingType=ending_type,
            completedAt=now,
            finalStats=final_stats,
            hiddenStatsSummary=deepcopy(prepared_run.get("hiddenStatsSummary", {})),
            playStatistics=deepcopy(run.get("runStatistics", {})),
            selectedPlayRecords=deepcopy(prepared_run.get("selectedPlayRecords", [])),
            representativeChoices=deepcopy(prepared_run.get("representativeChoices", [])),
            letter=letter,
            gameDataVersion=slot.gameDataVersion,
        )
        slot.status = "RUN_COMPLETE"
        slot.completedRunCount += 1
        slot.lastCompletedCharacterId = character_id
        slot.lastEndingId = ending_id
        slot.activeRun = None
        return MutationPlan(
            slot=slot,
            documents={
                META: meta.model_dump(mode="python"),
                STATISTICS: statistics.model_dump(mode="python"),
                UNLOCK: unlock.model_dump(mode="python"),
                day_path: daily,
                record_path: record.model_dump(mode="python"),
            },
            result_data={
                "recordId": record_id, "endingId": ending_id,
                "newlyUnlockedCharacterIds": promoted,
                "progression": progression,
            },
        )

    try:
        result = repository.apply(
            slot_id=slot_id,
            request_id=body.requestId,
            expected_server_revision=body.expectedServerRevision,
            operation="finishEnding",
            command={"recordId": body.recordId},
            read_paths=(META, STATISTICS, UNLOCK, day_path, record_path),
            mutator=mutate,
        )
        return mutation_response(result, slot_id)
    except Exception as error:
        raise _error(error) from None


@router.get("/v1/ending-records/{record_id}")
def get_ending_record(
    record_id: str,
    repository: SaveSlotRepository = Depends(get_slot_repository),
) -> dict:
    try:
        path = UserDocPath("endingRecords", record_id)
        raw = repository.get_user_document(path)
        if raw is None:
            raise HTTPException(404, "Ending record not found")
        record = EndingRecord.model_validate(raw)
        return record.model_dump(mode="json")
    except HTTPException:
        raise
    except Exception as error:
        raise _error(error) from None
