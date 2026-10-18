"""Server-owned activity catalog and checkpoint rules.

The client may pick a catalog ID, but cannot choose its type, cost or target
stat. A missing/incomplete catalog fails closed until reviewed content is seeded.
"""

from __future__ import annotations

from contextlib import closing
from dataclasses import dataclass
from pathlib import Path
import sqlite3


WEEKDAYS = ("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY")
STATS = {"knowledge", "expression", "skill", "exploration", "magic"}
COSTS = {"CLASS": 10, "ADVENTURE": 15, "REST": 0, "SPECIAL": 0}
REST_RECOVERIES = (40, 50, 70)
ADVENTURE_HARD_OBJECTIVE_COUNTS = {
    # The approved contract allows 3 or 4 objectives in the 201..350 band.
    # The current reviewed activity master uses 3 for all three shipped maps.
    "ADV_GREENHOUSE": 3,
    "ADV_LIBRARY": 3,
    "ADV_OBSERVATORY": 3,
}


class ActivityMasterError(RuntimeError):
    pass


@dataclass(frozen=True)
class ActivityDefinition:
    activity_id: str
    activity_type: str
    location_id: str | None
    stamina_cost: int
    target_stat: str | None
    game_id: str | None


class ActivityMaster:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path).resolve()

    def get(self, *, version: str, activity_id: str) -> ActivityDefinition:
        try:
            with closing(sqlite3.connect(f"{self.path.as_uri()}?mode=ro", uri=True)) as connection:
                connection.row_factory = sqlite3.Row
                connection.execute("PRAGMA query_only = ON")
                row = connection.execute(
                    """SELECT a.activity_id,a.activity_type,a.location_id,a.stamina_cost,
                              a.target_stat,m.game_id,m.target_stat AS game_target_stat
                       FROM activities a LEFT JOIN minigames m
                         ON m.version=a.version AND m.activity_id=a.activity_id
                       WHERE a.version=? AND a.activity_id=?""",
                    (version, activity_id),
                ).fetchall()
        except (sqlite3.Error, OSError):
            raise ActivityMasterError("Activity catalog unavailable") from None
        if len(row) != 1:
            raise ActivityMasterError("Activity is absent or ambiguous in the catalog")
        item = row[0]
        kind = item["activity_type"]
        cost = item["stamina_cost"]
        stat = item["target_stat"]
        if (kind not in COSTS or cost != COSTS[kind]
                or (kind == "CLASS" and (stat not in STATS or not item["game_id"]
                                         or item["game_target_stat"] != stat))
                or (kind == "ADVENTURE" and (stat != "exploration" or not item["location_id"]))
                or (kind in {"REST", "SPECIAL"} and stat is not None)
                or (kind != "CLASS" and item["game_id"] is not None)):
            raise ActivityMasterError("Activity catalog row violates the approved contract")
        return ActivityDefinition(
            activity_id=item["activity_id"], activity_type=kind,
            location_id=item["location_id"], stamina_cost=cost,
            target_stat=stat, game_id=item["game_id"],
        )

    def pet_modifiers(self, *, version: str, pet_id: str) -> dict[str, int]:
        try:
            with closing(sqlite3.connect(f"{self.path.as_uri()}?mode=ro", uri=True)) as connection:
                connection.row_factory = sqlite3.Row
                connection.execute("PRAGMA query_only = ON")
                rows = connection.execute(
                    """SELECT knowledge_modifier,expression_modifier,skill_modifier,
                              exploration_modifier,magic_modifier
                       FROM pets WHERE version=? AND pet_id=?""",
                    (version, pet_id),
                ).fetchall()
        except (sqlite3.Error, OSError):
            raise ActivityMasterError("Pet catalog unavailable") from None
        if len(rows) != 1:
            raise ActivityMasterError("Pet is absent or ambiguous in the catalog")
        row = rows[0]
        modifiers = {
            "knowledge": row["knowledge_modifier"],
            "expression": row["expression_modifier"],
            "skill": row["skill_modifier"],
            "exploration": row["exploration_modifier"],
            "magic": row["magic_modifier"],
        }
        if any(type(value) is not int or not 0 <= value <= 10 for value in modifiers.values()):
            raise ActivityMasterError("Pet catalog row violates the approved contract")
        return modifiers


def difficulty(stat_value: int, fail_streak: int) -> tuple[str, str, int]:
    if type(stat_value) is not int or not 0 <= stat_value <= 500:
        raise ValueError("Invalid saved stat")
    if type(fail_streak) is not int or fail_streak < 0:
        raise ValueError("Invalid fail streak")
    levels = ("EASY", "NORMAL", "HARD", "VERY_HARD")
    index = 0 if stat_value <= 100 else 1 if stat_value <= 200 else 2 if stat_value <= 350 else 3
    assist = min(2, fail_streak // 2)
    return levels[index], levels[max(0, index - assist)], assist


def adventure_difficulty(stat_value: int) -> int:
    if type(stat_value) is not int or not 0 <= stat_value <= 500:
        raise ValueError("Invalid saved exploration stat")
    return 1 if stat_value <= 100 else 2 if stat_value <= 200 else 3 if stat_value <= 350 else 4


def adventure_objective_count(stat_value: int, activity_id: str) -> int:
    level = adventure_difficulty(stat_value)
    if level == 1:
        return 1
    if level == 2:
        return 2
    if level == 4:
        return 5
    count = ADVENTURE_HARD_OBJECTIVE_COUNTS.get(activity_id)
    if count not in {3, 4}:
        raise ValueError("Hard adventure requires a reviewed master objective count")
    return count


def adventure_duration_seconds(stat_value: int, pet_exploration_bonus: int = 0) -> int:
    if (type(stat_value) is not int or not 0 <= stat_value <= 500
            or type(pet_exploration_bonus) is not int or pet_exploration_bonus < 0):
        raise ValueError("Invalid adventure duration input")
    effective = max(50, min(500, stat_value + pet_exploration_bonus))
    if effective <= 50:
        return 120
    # Match JavaScript Math.round for this non-negative expression.
    return 120 + int(((effective - 50) * 120 / 450) + 0.5)


