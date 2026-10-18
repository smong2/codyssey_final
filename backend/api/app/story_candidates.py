"""Pure, server-side Story candidate selection for the activity transaction."""

from __future__ import annotations

from contextlib import closing
from dataclasses import dataclass
from hashlib import sha256
import json
from pathlib import Path
import sqlite3


class StorySelectionError(RuntimeError):
    pass


@dataclass(frozen=True)
class ActivityContext:
    """Trusted result of the activity service, never direct client input."""

    activity_id: str
    activity_type: str
    location_id: str
    main_related_story_ids: tuple[str, ...] = ()


def _connect(path: Path):
    connection = sqlite3.connect(f"{path.resolve().as_uri()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only = ON")
    return connection


def _pending(row, run, location_id: str | None) -> dict:
    return {
        "storyId": row["story_id"], "eventId": row["event_id"],
        "storyType": row["story_type"], "sourceLocationId": location_id,
        "selectedWeek": run["week"], "selectedDay": run["day"],
    }


class StoryCandidates:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)

    def fixed_main(self, *, version: str, run: dict, month: int, day: int) -> dict | None:
        """Server calendar invokes this before the ordinary schedule; no side limit."""
        if run.get("pendingStoryEvent") is not None:
            return run["pendingStoryEvent"]
        try:
            with closing(_connect(self.path)) as connection:
                rows = connection.execute(
                    """SELECT st.story_id,st.event_id,s.story_type FROM story_steps st
                       JOIN stories s ON s.version=st.version AND s.story_id=st.story_id
                       WHERE st.version=? AND s.story_type='MAIN'
                         AND st.scheduled_month=? AND st.scheduled_day=?
                         AND st.earliest_week<=? ORDER BY st.display_order,st.event_id""",
                    (version, month, day, run["week"]),
                ).fetchall()
                for row in rows:
                    if not run.get("eventFlags", {}).get(row["event_id"]):
                        return _pending(row, run, None)
                return None
        except (sqlite3.Error, OSError):
            raise StorySelectionError("Story rule master is unavailable") from None

    def next_week_main(self, *, version: str, run: dict) -> dict | None:
        """Resolve the approved one-Main-event-per-week calendar before scheduling."""
        if run.get("pendingStoryEvent") is not None:
            raise StorySelectionError("Cannot select Main Story over a pending event")
        try:
            with closing(_connect(self.path)) as connection:
                rows = connection.execute(
                    """SELECT st.story_id,st.event_id,s.story_type
                       FROM story_steps st JOIN stories s
                         ON s.version=st.version AND s.story_id=st.story_id
                       WHERE st.version=? AND s.story_type='MAIN'
                         AND st.earliest_week=? AND st.scheduled_month IS NOT NULL
                         AND st.scheduled_day IS NOT NULL
                       ORDER BY st.display_order,st.event_id""",
                    (version, run["week"]),
                ).fetchall()
                pending = [row for row in rows if not run.get("eventFlags", {}).get(row["event_id"])]
                if len(pending) > 1:
                    raise StorySelectionError("Multiple Main Stories are scheduled for one week")
                return _pending(pending[0], run, None) if pending else None
        except (sqlite3.Error, OSError):
            raise StorySelectionError("Story rule master is unavailable") from None

    def require_no_weekend_rules(self, *, version: str) -> None:
        """Do not silently skip future weekend content lacking an executor."""
        try:
            with closing(_connect(self.path)) as connection:
                row = connection.execute(
                    """SELECT 1 FROM story_event_rules
                       WHERE version=? AND is_active=1 AND trigger_phase='WEEKEND' LIMIT 1""",
                    (version,),
                ).fetchone()
                if row is not None:
                    raise StorySelectionError("Weekend Story handling is not implemented")
        except (sqlite3.Error, OSError):
            raise StorySelectionError("Story rule master is unavailable") from None

    def after_activity(self, *, version: str, run: dict,
                       activity: ActivityContext) -> dict | None:
        """Deterministic selection; caller commits pending with activity result."""
        if run.get("pendingStoryEvent") is not None:
            return run["pendingStoryEvent"]
        week, day = run["week"], run["day"]
        window = run.get("storyEventWindow", {})
        used = window.get("sideStoryCount", 0) if window.get("week") == week else 0
        if used >= 2 or window.get("lastResultStoryDay") == f"{week}:{day}":
            return None
        if not activity.activity_id or not activity.location_id:
            raise StorySelectionError("Activity context is incomplete")
        try:
            with closing(_connect(self.path)) as connection:
                rows = connection.execute(
                    """SELECT st.story_id,st.step_no,st.event_id,st.earliest_week,
                              s.story_type,s.location_id,r.selection_policy,r.repeat_policy,
                              r.requires_location_match,r.cooldown_weeks
                       FROM story_event_rules r
                       JOIN story_steps st ON st.version=r.version AND st.event_id=r.event_id
                       JOIN stories s ON s.version=st.version AND s.story_id=st.story_id
                       WHERE r.version=? AND r.is_active=1 AND r.trigger_phase='AFTER_ACTIVITY'
                       ORDER BY st.display_order,st.event_id""",
                    (version,),
                ).fetchall()
                candidates = []
                for row in rows:
                    if row["earliest_week"] and week < row["earliest_week"]:
                        continue
                    if row["requires_location_match"] and row["location_id"] != activity.location_id:
                        continue
                    # The current master is one-shot. A future repeatable rule
                    # needs explicit per-week history before it can be enabled.
                    if row["repeat_policy"] != "ONCE_PER_RUN" or row["cooldown_weeks"]:
                        continue
                    if run.get("eventFlags", {}).get(row["event_id"]):
                        continue
                    if run.get("storyProgress", {}).get(row["event_id"], {}).get("status") == "COMPLETED":
                        continue
                    progress = run.get("storyProgress", {}).get(row["story_id"], {})
                    if row["story_type"] == "NPC":
                        if row["step_no"] != progress.get("step", 0) + 1:
                            continue
                        last_week = progress.get("lastAdvancedWeek")
                        if last_week is not None and week - last_week <= 1:
                            continue
                    conditions = connection.execute(
                        """SELECT condition_type,subject_ref,operator,value_json
                           FROM story_event_conditions WHERE version=? AND event_id=?
                           ORDER BY condition_order""",
                        (version, row["event_id"]),
                    ).fetchall()
                    if not all(self._condition(condition, run, activity) for condition in conditions):
                        continue
                    candidates.append(row)
                if not candidates:
                    return None
                unseen_first = [row for row in candidates if row["selection_policy"] == "UNSEEN_FIRST"]
                if unseen_first:
                    chosen = unseen_first[0]
                else:
                    scores = [self._weight(row, run, activity) for row in candidates]
                    total = sum(scores)
                    digest = sha256(f"{run['runId']}:{week}:{day}:{activity.activity_id}".encode()).digest()
                    ticket = int.from_bytes(digest, "big") % total
                    chosen = candidates[-1]
                    for row, score in zip(candidates, scores):
                        if ticket < score:
                            chosen = row
                            break
                        ticket -= score
                return _pending(chosen, run, activity.location_id)
        except (sqlite3.Error, OSError, json.JSONDecodeError):
            raise StorySelectionError("Story rule master is unavailable or invalid") from None

    @staticmethod
    def _condition(row, run: dict, activity: ActivityContext) -> bool:
        kind, subject, operator = row["condition_type"], row["subject_ref"], row["operator"]
        value = json.loads(row["value_json"])
        if kind == "PREVIOUS_EVENT_COMPLETE" and operator == "EQ":
            return run.get("eventFlags", {}).get(subject) is value
        if kind == "ACTIVITY_TYPE" and subject == "activity.type" and operator == "EQ":
            return activity.activity_type == value
        if kind == "LOCATION_ID" and operator == "EQ":
            return activity.location_id == value
        if kind == "NPC_ENCOUNTER_GTE" and operator == "GTE":
            if subject.startswith("ROLE:"):
                actor = run.get("storyCast", {}).get(subject[5:])
            elif subject.startswith("NPC:"):
                actor = subject[4:]
            else:
                return False
            return run.get("npcProgress", {}).get(actor, {}).get("encounterCount", 0) >= value
        # Unsupported future condition types fail closed, not eligible by default.
        return False

    @staticmethod
    def _weight(row, run: dict, activity: ActivityContext) -> int:
        score = 100
        if row["location_id"] == activity.location_id:
            score += 50
        progress = run.get("storyProgress", {}).get(row["story_id"], {})
        if progress.get("status") == "IN_PROGRESS":
            score += 80
        if row["story_id"] in activity.main_related_story_ids:
            score += 40
        actor_role = {"NPC_GUIDE": "NPC_GUIDE_ACTOR", "NPC_WORK": "NPC_WORK_ACTOR"}.get(row["story_id"])
        actor = run.get("storyCast", {}).get(actor_role) if actor_role else "LULU"
        last_week = run.get("npcProgress", {}).get(actor, {}).get("lastEncounterWeek")
        if type(last_week) is int:
            score += min(60, max(0, run["week"] - last_week) * 10)
        return score
