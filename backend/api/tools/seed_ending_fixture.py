"""Seed one existing PLAYING slot into a deterministic 52-week ending-test state.

This is an operator-only development tool.  It uses Firebase Admin credentials
from the same environment as the API and is intentionally not exposed through
FastAPI.
"""

from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from google.cloud import firestore

from backend.api.app.account import _STATS, _TAGS
from backend.api.app.config import Settings
from backend.api.app.firebase import initialize_firebase
from backend.api.app.models import SaveSlot
from backend.api.app.progression_rules import ENDING_RULES, choose_ending


FALLBACK_ENDING_ID = "ENDING_STARPATH_PIONEER"
DEFAULT_ENDING_ID = "ENDING_ARCADIA_EXPLORER"
WEEKDAYS = ("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY")
MAIN_STORY_WEEKS = {"MS01": 1, "MS02": 10, "MS03": 23, "MS04": 36, "MS05": 49, "MS06": 52}
CLASS_BY_STAT = {
    "knowledge": "sealed-shelves",
    "expression": "starlight-stage",
    "skill": "rune-pin-training",
    "exploration": "observatory-mirror",
    "magic": "rune-circuit",
}
ADVENTURES = ("ADV_GREENHOUSE", "ADV_LIBRARY", "ADV_OBSERVATORY")


def ending_ids() -> tuple[str, ...]:
    return tuple(rule.ending_id for rule in ENDING_RULES) + (FALLBACK_ENDING_ID,)


def _record_counter(run_statistics: dict[str, Any], key: str, value: int) -> None:
    if key.startswith("class:"):
        stat = key.split(":", 1)[1]
        run_statistics["classCounts"][stat] = max(run_statistics["classCounts"].get(stat, 0), value)
    else:
        run_statistics[key] = max(run_statistics.get(key, 0), value)


def _activity_history(primary_stat: str) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """Build exactly 260 completed weekdays and return class-count totals."""
    target_class = CLASS_BY_STAT[primary_stat]
    class_counts = {stat: 0 for stat in _STATS}
    history: list[dict[str, Any]] = []
    for week in range(1, 53):
        class_entries = (
            target_class,
            target_class,
            target_class,
        )
        day_entries = (
            ("CLASS", class_entries[0], "SUCCESS"),
            ("ADVENTURE", ADVENTURES[(week - 1) % len(ADVENTURES)], "MISSION_COMPLETE"),
            ("CLASS", class_entries[1], "GREAT" if week % 4 == 0 else "SUCCESS"),
            ("REST", "REST_DEFAULT", "SUCCESS"),
            ("CLASS", class_entries[2], "SUCCESS"),
        )
        for day, (kind, content_id, resolution) in enumerate(day_entries):
            entry: dict[str, Any] = {
                "week": week,
                "day": day,
                "type": kind,
                "contentId": content_id,
                "status": "COMPLETED",
                "resolution": resolution,
            }
            if kind == "CLASS":
                target_stat = next(stat for stat, game_id in CLASS_BY_STAT.items() if game_id == content_id)
                class_counts[target_stat] += 1
                entry.update({"staminaCost": 10, "growthApplied": 2 if resolution == "SUCCESS" else 4})
            elif kind == "ADVENTURE":
                entry.update({"staminaCost": 15, "growthAwarded": {"exploration": 3}, "foundCount": 3, "targetCount": 3})
            else:
                entry.update({"staminaCost": 0, "staminaRecovered": 20})
            history.append(entry)
    if len(history) != 260:
        raise AssertionError("Ending fixture must contain exactly 260 weekdays")
    return history, class_counts


def build_ending_fixture_run(
    active_run: dict[str, Any], *, ending_id: str, now: datetime,
    seen_ending_ids: list[str] | tuple[str, ...] = (),
) -> dict[str, Any]:
    """Return a valid ENDING_PENDING run while preserving run identity/casting."""
    if ending_id not in ending_ids():
        raise ValueError(f"Unsupported ending fixture: {ending_id}")
    if not isinstance(active_run, dict):
        raise ValueError("Active run is required")
    for key in ("runId", "runNumber", "characterId", "storyCast", "startedAt"):
        if key not in active_run:
            raise ValueError(f"Active run is missing {key}")

    rule = next((candidate for candidate in ENDING_RULES if candidate.ending_id == ending_id), None)
    focus_stat = (
        rule.record.split(":", 1)[1]
        if rule is not None and rule.record.startswith("class:")
        else rule.primary if rule is not None else "exploration"
    )
    history, class_counts = _activity_history(focus_stat)

    stats = {stat: 180 for stat in _STATS}
    hidden = {tag: 15 for tag in _TAGS}
    if rule is None:
        stats.update({stat: 240 for stat in _STATS})
        hidden["curiosity"] = 55
        hidden["cooperation"] = 40
    else:
        stats[rule.primary] = 340
        stats[rule.secondary] = max(stats[rule.secondary], 260)
        hidden[rule.hidden] = 90

    run_statistics: dict[str, Any] = {
        "classCount": 156,
        "adventureCount": 52,
        "restCount": 52,
        "minigamePlayCount": 156,
        "minigameClearCount": 156,
        "npcEncounterCount": 24,
        "completedNpcStoryCount": 4,
        "locationDiscoveryCount": 18,
        "specialItemDiscoveryCount": 8,
        "importantChoiceCount": 1,
        "classCounts": class_counts,
    }
    if rule is not None:
        _record_counter(run_statistics, rule.record, max(rule.record_threshold + 10, 12))
        _record_counter(run_statistics, rule.tie_record, max(rule.record_threshold + 10, 12))

    story_progress = {
        story_id: {"step": 1, "status": "COMPLETED", "lastAdvancedWeek": week}
        for story_id, week in MAIN_STORY_WEEKS.items()
    }
    event_flags = {story_id: True for story_id in MAIN_STORY_WEEKS}
    run = deepcopy(active_run)
    run.update({
        "week": 52,
        "day": "FRIDAY",
        "phase": "ENDING_PENDING",
        "pendingStoryEvent": None,
        "storyEventWindow": {
            "week": 52,
            "sideStoryCount": 0,
            "locationStoryCount": 0,
            "lastResultStoryDay": None,
        },
        "updatedAt": now,
        "stats": stats,
        "stamina": {"current": 85, "max": 100},
        "hiddenStats": hidden,
        "npcProgress": {
            "GUIDE": {"encounterCount": 8, "lastEncounterWeek": 45},
            "WORK": {"encounterCount": 7, "lastEncounterWeek": 47},
            "LULU": {"encounterCount": 9, "lastEncounterWeek": 50},
        },
        "storyProgress": story_progress,
        "eventFlags": event_flags,
        "representativeChoices": [
            {"eventId": "MS05", "choiceId": "MS05_S3_TELL_ALL", "week": 49},
        ],
        "dialogueHistory": [],
        "minigameFailStreaks": {},
        "weeklySchedule": {},
        "activityHistory": history,
        "completedWeekdayCount": 5,
        "forcedRest": {"active": False, "remainingWeekdays": 0},
        "weekStartSnapshot": {
            "stats": {stat: max(0, value - 4) for stat, value in stats.items()},
            "stamina": 100,
        },
        "lastWeekSummary": {
            "week": 52,
            "statDelta": {stat: 4 for stat in _STATS},
            "classCount": 3,
            "staminaSpent": 45,
            "staminaRecovered": 20,
            "startStamina": 100,
            "endStamina": 85,
            "forcedRestDays": 0,
            "completedAt": now,
        },
        "runStatistics": run_statistics,
    })
    run.pop("endingDecision", None)
    run.pop("endingPrepared", None)

    decision = choose_ending(run=run, seen_ending_ids=list(seen_ending_ids))
    if decision["endingId"] != ending_id:
        raise ValueError(
            f"Current seen-ending history makes the rules choose {decision['endingId']} "
            f"instead of {ending_id}; choose another fixture ending or use a fresh test account"
        )
    return run


def seed_slot(database: Any, *, uid: str, slot_id: int, ending_id: str) -> dict[str, Any]:
    root = database.collection("users").document(uid)
    slot_ref = root.collection("saveSlots").document(str(slot_id))
    meta_ref = root.collection("meta").document("progress")
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def apply(transaction: Any) -> dict[str, Any]:
        snapshot = slot_ref.get(transaction=transaction)
        meta_snapshot = meta_ref.get(transaction=transaction)
        if not snapshot.exists:
            raise RuntimeError("Save slot does not exist")
        if not meta_snapshot.exists:
            raise RuntimeError("Account progression does not exist")
        slot = SaveSlot.model_validate(snapshot.to_dict())
        if slot.status != "PLAYING" or not isinstance(slot.activeRun, dict):
            raise RuntimeError("Target slot must already contain a PLAYING run")
        if slot.activeRun.get("phase") in {"ENDING_DECIDED", "ENDING_READY"}:
            raise RuntimeError("Target slot already has a decided/prepared ending; use another playing slot")
        if slot.activeRun.get("runNumber") != slot.completedRunCount + 1:
            raise RuntimeError("Target slot run number is inconsistent")

        seen = meta_snapshot.to_dict().get("seenEndingIds", [])
        if not isinstance(seen, list) or any(not isinstance(item, str) for item in seen):
            raise RuntimeError("Account seen-ending history is invalid")
        seeded_run = build_ending_fixture_run(
            slot.activeRun, ending_id=ending_id, now=now, seen_ending_ids=seen,
        )
        slot.activeRun = seeded_run
        slot.serverRevision += 1
        slot.lastSavedAt = now
        transaction.set(slot_ref, slot.model_dump(mode="python"))
        return {
            "uid": uid,
            "slotId": slot_id,
            "serverRevision": slot.serverRevision,
            "runId": seeded_run["runId"],
            "endingId": ending_id,
            "week": seeded_run["week"],
            "phase": seeded_run["phase"],
            "activityHistoryCount": len(seeded_run["activityHistory"]),
        }

    return apply(database.transaction())


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Turn one existing PLAYING slot into a deterministic 52-week ending fixture."
    )
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--uid", help="Firebase Authentication UID")
    target.add_argument("--email", help="Firebase Authentication email; resolved to UID with Admin SDK")
    parser.add_argument("--slot", type=int, choices=range(1, 6), required=True)
    parser.add_argument("--ending", choices=ending_ids(), default=DEFAULT_ENDING_ID)
    parser.add_argument(
        "--confirm-ending-fixture",
        action="store_true",
        help="Required destructive confirmation. Replaces the current activeRun progress in this slot.",
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    if not args.confirm_ending_fixture:
        raise SystemExit("Refusing to modify Firestore without --confirm-ending-fixture")
    settings = Settings.from_env()
    services = initialize_firebase(settings)
    uid = args.uid
    if args.email:
        uid = services.auth.get_user_by_email(args.email).uid
    result = seed_slot(services.firestore, uid=uid, slot_id=args.slot, ending_id=args.ending)
    print(
        "ending fixture seeded:",
        f"slot={result['slotId']}",
        f"revision={result['serverRevision']}",
        f"week={result['week']}",
        f"phase={result['phase']}",
        f"ending={result['endingId']}",
        f"history={result['activityHistoryCount']}",
    )
    print("Reload the game before continuing; account-wide statistics were not bulk-modified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

