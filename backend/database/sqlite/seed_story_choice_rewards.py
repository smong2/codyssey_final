#!/usr/bin/env python3
"""Refresh only Main/NPC/Location Story choice rewards in an existing LUMIA v4 DB.

This is the narrow update path for the finalized Story reward policy:
- Main: Visible +2 / Primary Hidden +8 / optional Secondary Hidden +3
- NPC/Location: Visible +1 / Primary Hidden +5 / optional Secondary Hidden +2

By default it does not rebuild dialogue_sequences/nodes/options and requires the
existing database to contain the current 77 canonical story_choices. If some Story
domain has not been seeded yet, use --bootstrap-missing; only the mismatched domain
is full-seeded first, then all 77 choice rewards are refreshed.

Example:
    python3 backend/database/sqlite/seed_story_choice_rewards.py \
        --version dev-dialogue-v1

Bootstrap missing NPC/Location/Main master data when needed:
    python3 backend/database/sqlite/seed_story_choice_rewards.py \
        --version dev-dialogue-v1 --bootstrap-missing
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path

from seed_dialogue_content import (
    DEFAULT_DB_PATH,
    MAIN_IDS,
    parse_all_story_masters,
    parse_choice_effects as parse_main_choice_effects,
    seed_main_story,
    validate_choice_effect_balance as validate_main_choice_effect_balance,
)
from seed_npc_story import (
    NPC_EVENT_IDS,
    parse_all_npc_masters,
    parse_npc_choice_effects,
    seed_npc_story,
    validate_npc_choice_effect_balance,
)
from seed_location_story_master import (
    LOCATION_EVENT_IDS,
    parse_location_choices,
    parse_location_effects,
    seed_location_master,
)

EXPECTED_MAIN_CHOICES = 40
EXPECTED_MAIN_EFFECTS = 102
EXPECTED_NPC_CHOICES = 24
EXPECTED_NPC_EFFECTS = 64
EXPECTED_LOCATION_CHOICES = 13
EXPECTED_LOCATION_EFFECTS = 39
EXPECTED_TOTAL_CHOICES = 77
EXPECTED_TOTAL_EFFECTS = 205


def build_effect_map() -> dict[tuple[str, str], list[tuple[str, str, object]]]:
    result: dict[tuple[str, str], list[tuple[str, str, object]]] = {}

    main_masters = parse_all_story_masters()
    main_effects = parse_main_choice_effects()
    validate_main_choice_effect_balance(main_masters, main_effects)
    for event_id, master in main_masters.items():
        for group in master.choices.values():
            for option in group.options:
                result[(event_id, option.choice_id)] = list(main_effects[option.choice_id])

    npc_masters = parse_all_npc_masters()
    npc_effects = parse_npc_choice_effects()
    validate_npc_choice_effect_balance(npc_masters, npc_effects)
    for event_id, master in npc_masters.items():
        for group in master.choices.values():
            for option in group.options:
                result[(event_id, option.choice_id)] = list(
                    npc_effects[option.choice_id]["effects"]
                )

    location_effects = parse_location_effects()
    for choice in parse_location_choices():
        result[(choice.event_id, choice.choice_id)] = list(
            location_effects[choice.choice_id]["effects"]
        )

    if len(result) != EXPECTED_TOTAL_CHOICES:
        raise ValueError(
            f"Expected {EXPECTED_TOTAL_CHOICES} Story choices, compiled {len(result)}"
        )
    return result


def assert_existing_choice_master(
    conn: sqlite3.Connection,
    version: str,
    effect_map: dict[tuple[str, str], list[tuple[str, str, object]]],
) -> None:
    event_ids = (*MAIN_IDS, *NPC_EVENT_IDS, *LOCATION_EVENT_IDS)
    placeholders = ",".join("?" for _ in event_ids)
    rows = conn.execute(
        f"""
        SELECT event_id, choice_id
        FROM story_choices
        WHERE version=? AND event_id IN ({placeholders})
        """,
        (version, *event_ids),
    ).fetchall()
    actual = set(rows)
    expected = set(effect_map)
    if actual != expected:
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        raise RuntimeError(
            "Existing story_choices do not match the finalized 77-choice master. "
            f"missing={missing[:10]}, extra={extra[:10]}. "
            "Run again with --bootstrap-missing, or run the Main/NPC/Location full seed scripts first."
        )


def _existing_choice_keys(
    conn: sqlite3.Connection,
    version: str,
    event_ids: tuple[str, ...],
) -> set[tuple[str, str]]:
    placeholders = ",".join("?" for _ in event_ids)
    rows = conn.execute(
        f"""
        SELECT event_id, choice_id
        FROM story_choices
        WHERE version=? AND event_id IN ({placeholders})
        """,
        (version, *event_ids),
    ).fetchall()
    return set(rows)


def bootstrap_mismatched_choice_masters(
    conn: sqlite3.Connection,
    version: str,
    effect_map: dict[tuple[str, str], list[tuple[str, str, object]]],
) -> list[str]:
    """Seed only Story domains whose canonical choice master is incomplete/mismatched."""

    domains = (
        ("Main", MAIN_IDS, seed_main_story),
        ("NPC", NPC_EVENT_IDS, seed_npc_story),
        ("Location", LOCATION_EVENT_IDS, seed_location_master),
    )
    seeded: list[str] = []

    for label, event_ids, seed_fn in domains:
        event_set = set(event_ids)
        expected = {
            key for key in effect_map
            if key[0] in event_set
        }
        actual = _existing_choice_keys(conn, version, event_ids)
        if actual == expected:
            continue

        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        print(
            f"bootstrap {label}: canonical choice master mismatch "
            f"(actual={len(actual)}, expected={len(expected)}, "
            f"missing={len(missing)}, extra={len(extra)})"
        )

        if label == "Main":
            seed_fn(conn, version, False)
        else:
            seed_fn(conn, version)
        seeded.append(label)

        refreshed = _existing_choice_keys(conn, version, event_ids)
        if refreshed != expected:
            raise RuntimeError(
                f"{label} bootstrap completed but canonical choices still mismatch; "
                f"missing={sorted(expected - refreshed)[:10]}, "
                f"extra={sorted(refreshed - expected)[:10]}"
            )

    return seeded


def refresh_choice_effects(conn: sqlite3.Connection, version: str) -> None:
    effect_map = build_effect_map()
    assert_existing_choice_master(conn, version, effect_map)

    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("BEGIN IMMEDIATE")
    try:
        for (event_id, choice_id), effects in sorted(effect_map.items()):
            conn.execute(
                """
                DELETE FROM story_choice_effects
                WHERE version=? AND event_id=? AND choice_id=?
                """,
                (version, event_id, choice_id),
            )
            for effect_order, (effect_type, target, value) in enumerate(effects, start=1):
                conn.execute(
                    """
                    INSERT INTO story_choice_effects(
                        version, event_id, choice_id, effect_order,
                        effect_type, target, value_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        version,
                        event_id,
                        choice_id,
                        effect_order,
                        effect_type,
                        target,
                        json.dumps(value, ensure_ascii=False),
                    ),
                )

        validate_database(conn, version)
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def validate_database(conn: sqlite3.Connection, version: str) -> None:
    def count_for_events(table: str, event_ids: tuple[str, ...]) -> int:
        placeholders = ",".join("?" for _ in event_ids)
        return int(
            conn.execute(
                f"SELECT COUNT(*) FROM {table} WHERE version=? AND event_id IN ({placeholders})",
                (version, *event_ids),
            ).fetchone()[0]
        )

    checks = (
        ("Main choices", count_for_events("story_choices", MAIN_IDS), EXPECTED_MAIN_CHOICES),
        ("Main effects", count_for_events("story_choice_effects", MAIN_IDS), EXPECTED_MAIN_EFFECTS),
        ("NPC choices", count_for_events("story_choices", NPC_EVENT_IDS), EXPECTED_NPC_CHOICES),
        ("NPC effects", count_for_events("story_choice_effects", NPC_EVENT_IDS), EXPECTED_NPC_EFFECTS),
        (
            "Location choices",
            count_for_events("story_choices", LOCATION_EVENT_IDS),
            EXPECTED_LOCATION_CHOICES,
        ),
        (
            "Location effects",
            count_for_events("story_choice_effects", LOCATION_EVENT_IDS),
            EXPECTED_LOCATION_EFFECTS,
        ),
    )
    for label, actual, expected in checks:
        if actual != expected:
            raise ValueError(f"{label}: expected {expected}, got {actual}")

    event_ids = (*MAIN_IDS, *NPC_EVENT_IDS, *LOCATION_EVENT_IDS)
    placeholders = ",".join("?" for _ in event_ids)
    params = (version, *event_ids)

    invalid_visible = conn.execute(
        f"""
        SELECT sc.event_id, sc.choice_id, COUNT(sce.effect_order) AS effect_count
        FROM story_choices sc
        LEFT JOIN story_choice_effects sce
          ON sce.version=sc.version
         AND sce.event_id=sc.event_id
         AND sce.choice_id=sc.choice_id
         AND sce.effect_type='VISIBLE_STAT'
        WHERE sc.version=? AND sc.event_id IN ({placeholders})
        GROUP BY sc.event_id, sc.choice_id
        HAVING effect_count <> 1
        """,
        params,
    ).fetchall()
    if invalid_visible:
        raise ValueError(f"Choices without exactly one Visible effect: {invalid_visible[:10]}")

    invalid_hidden = conn.execute(
        f"""
        SELECT sc.event_id, sc.choice_id, COUNT(sce.effect_order) AS effect_count
        FROM story_choices sc
        LEFT JOIN story_choice_effects sce
          ON sce.version=sc.version
         AND sce.event_id=sc.event_id
         AND sce.choice_id=sc.choice_id
         AND sce.effect_type='HIDDEN_STAT'
        WHERE sc.version=? AND sc.event_id IN ({placeholders})
        GROUP BY sc.event_id, sc.choice_id
        HAVING effect_count NOT IN (1, 2)
        """,
        params,
    ).fetchall()
    if invalid_hidden:
        raise ValueError(f"Choices with invalid Hidden effect count: {invalid_hidden[:10]}")

    duplicate_hidden = conn.execute(
        f"""
        SELECT event_id, choice_id, target, COUNT(*) AS duplicate_count
        FROM story_choice_effects
        WHERE version=?
          AND event_id IN ({placeholders})
          AND effect_type='HIDDEN_STAT'
        GROUP BY event_id, choice_id, target
        HAVING duplicate_count > 1
        """,
        params,
    ).fetchall()
    if duplicate_hidden:
        raise ValueError(f"Duplicate Hidden targets: {duplicate_hidden[:10]}")

    total_choices = sum(actual for label, actual, _ in checks if label.endswith("choices"))
    total_effects = sum(actual for label, actual, _ in checks if label.endswith("effects"))
    if total_choices != EXPECTED_TOTAL_CHOICES or total_effects != EXPECTED_TOTAL_EFFECTS:
        raise ValueError(
            f"Combined totals mismatch: choices={total_choices}, effects={total_effects}"
        )

    foreign_key_errors = conn.execute("PRAGMA foreign_key_check").fetchall()
    if foreign_key_errors:
        raise ValueError(f"Foreign key validation failed: {foreign_key_errors[:10]}")


def print_summary(conn: sqlite3.Connection, version: str, db_path: Path) -> None:
    def count_for_events(table: str, event_ids: tuple[str, ...]) -> int:
        placeholders = ",".join("?" for _ in event_ids)
        return int(
            conn.execute(
                f"SELECT COUNT(*) FROM {table} WHERE version=? AND event_id IN ({placeholders})",
                (version, *event_ids),
            ).fetchone()[0]
        )

    print(f"database: {db_path.resolve()}")
    print(f"schema user_version: {conn.execute('PRAGMA user_version').fetchone()[0]}")
    print(f"gameDataVersion: {version}")
    print(f"Main choices/effects: {count_for_events('story_choices', MAIN_IDS)}/{count_for_events('story_choice_effects', MAIN_IDS)}")
    print(f"NPC choices/effects: {count_for_events('story_choices', NPC_EVENT_IDS)}/{count_for_events('story_choice_effects', NPC_EVENT_IDS)}")
    print(f"Location choices/effects: {count_for_events('story_choices', LOCATION_EVENT_IDS)}/{count_for_events('story_choice_effects', LOCATION_EVENT_IDS)}")
    print(f"Total choices/effects: {EXPECTED_TOTAL_CHOICES}/{EXPECTED_TOTAL_EFFECTS}")
    print("validation: OK")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Refresh finalized Main/NPC/Location Story choice rewards in an existing LUMIA v4 SQLite DB"
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"SQLite database path (default: {DEFAULT_DB_PATH})",
    )
    parser.add_argument("--version", required=True, help="existing gameDataVersion to update")
    parser.add_argument(
        "--bootstrap-missing",
        action="store_true",
        help=(
            "if Main/NPC/Location canonical story_choices are missing or mismatched, "
            "run the corresponding full seed first, then refresh choice rewards"
        ),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.db.exists():
        raise RuntimeError(f"Database does not exist: {args.db}")

    conn = sqlite3.connect(args.db)
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        user_version = int(conn.execute("PRAGMA user_version").fetchone()[0])
        if user_version != 4:
            raise RuntimeError(
                f"SQLite schema v4 required; current user_version={user_version}. "
                "Run the normal seed scripts with --migrate first."
            )
        exists = conn.execute(
            "SELECT 1 FROM game_data_versions WHERE version=?",
            (args.version,),
        ).fetchone()
        if not exists:
            raise RuntimeError(f"gameDataVersion does not exist: {args.version}")

        effect_map = build_effect_map()
        if args.bootstrap_missing:
            seeded = bootstrap_mismatched_choice_masters(conn, args.version, effect_map)
            if seeded:
                print("bootstrapped domains: " + ", ".join(seeded))
            else:
                print("bootstrapped domains: none (all 77 canonical choices already present)")

        refresh_choice_effects(conn, args.version)
        print_summary(conn, args.version, args.db)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
