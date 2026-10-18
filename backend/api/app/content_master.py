"""Read-only server-side character and story-casting master data."""

from __future__ import annotations

from contextlib import closing
from pathlib import Path
import sqlite3


STAT_KEYS = ("knowledge", "expression", "skill", "exploration", "magic")
EXPECTED_CAST_ROLES = {
    "MAIN_GUIDE_STUDENT",
    "MAIN_GREENHOUSE_STUDENT",
    "MAIN_GREENHOUSE_TRAPPED",
    "MAIN_CLOCK_STUDENT",
    "MAIN_TRAINING_STUDENT",
    "MAIN_TRAINING_WITNESS",
    "MAIN_FESTIVAL_LEAD",
    "LOC_GREENHOUSE_STUDENT",
    "NPC_GUIDE_ACTOR",
    "NPC_WORK_ACTOR",
}


class ContentMasterError(RuntimeError):
    pass


class UnknownCharacter(ContentMasterError):
    pass


class ContentMaster:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path).resolve()

    def character_and_cast(self, *, version: str, character_id: str) -> tuple[dict[str, int], dict[str, str]]:
        try:
            with closing(sqlite3.connect(f"{self.path.as_uri()}?mode=ro", uri=True)) as connection:
                connection.row_factory = sqlite3.Row
                connection.execute("PRAGMA query_only = ON")
                character = connection.execute(
                    """SELECT knowledge_modifier, expression_modifier, skill_modifier,
                              exploration_modifier, magic_modifier
                       FROM characters WHERE version = ? AND character_id = ?""",
                    (version, character_id),
                ).fetchone()
                if character is None:
                    raise UnknownCharacter("Character is not present in the selected game data version")
                roles = connection.execute(
                    """SELECT role_id, assignment_order, prior_assignment_policy, exclude_player
                       FROM story_roles
                       WHERE version = ? AND resolver_type = 'STORY_CAST'
                       ORDER BY assignment_order""",
                    (version,),
                ).fetchall()
                if {row["role_id"] for row in roles} != EXPECTED_CAST_ROLES:
                    raise ContentMasterError("Story casting master is incomplete")
                candidates = connection.execute(
                    """SELECT role_id, character_id FROM story_role_candidates
                       WHERE version = ? ORDER BY role_id, priority""",
                    (version,),
                ).fetchall()
                exclusions = connection.execute(
                    """SELECT role_id, excluded_role_id FROM story_role_exclusions
                       WHERE version = ? AND exclusion_type = 'DISTINCT_CHARACTER'""",
                    (version,),
                ).fetchall()
        except UnknownCharacter:
            raise
        except (sqlite3.Error, OSError):
            raise ContentMasterError("Content master is unavailable") from None

        by_role: dict[str, list[str]] = {}
        for row in candidates:
            by_role.setdefault(row["role_id"], []).append(row["character_id"])
        hard_pairs = {
            frozenset((row["role_id"], row["excluded_role_id"]))
            for row in exclusions
        }
        cast: dict[str, str] = {}
        for role in roles:
            role_id = role["role_id"]
            available = [
                candidate
                for candidate in by_role.get(role_id, ())
                if (not role["exclude_player"] or candidate != character_id)
                and not any(
                    frozenset((role_id, prior_role)) in hard_pairs and candidate == prior_character
                    for prior_role, prior_character in cast.items()
                )
            ]
            policy = role["prior_assignment_policy"]
            if policy in {"REQUIRE_DISTINCT", "PREFER_DISTINCT"}:
                distinct = [candidate for candidate in available if candidate not in cast.values()]
                if distinct or policy == "REQUIRE_DISTINCT":
                    available = distinct
            if not available:
                raise ContentMasterError(f"No valid actor for {role_id}")
            cast[role_id] = available[0]

        modifiers = {stat: character[f"{stat}_modifier"] for stat in STAT_KEYS}
        return modifiers, cast
