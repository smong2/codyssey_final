#!/usr/bin/env python3
"""Add the reviewed Phase 7 activity catalog to an existing LUMIA v4 master.

Activity IDs are stable API schedule values. Six class IDs match the current
engine action IDs; three adventure IDs distinguish the selected destination.
Existing rows are never overwritten: a conflicting row aborts the transaction.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import sqlite3


DEFAULT_DB_PATH = Path(__file__).resolve().parent / "lumia-content.sqlite3"

# Location masters are already seeded by NPC/Location loaders where used. Add
# only missing rows (not their artwork, which needs separate asset approval).
LOCATIONS = (
    ("OBS", "별빛 천문대"),
    ("CLK", "시계탑 광장 야외무대"),
    ("GH", "유리 온실·약초원"),
    ("DRM", "기숙사 공용 공간"),
    ("LIB", "대서고"),
    ("WRK", "마도 공방"),
    ("TRN", "수련장"),
)

# id, type, display, location, cost, target stat, engine action/location key
ACTIVITIES = (
    ("observatory-mirror", "CLASS", "거울 마법", "OBS", 10, "exploration", "observatory-mirror"),
    ("starlight-stage", "CLASS", "별빛 무대", "CLK", 10, "expression", "starlight-stage"),
    ("spirit-pot-sort", "CLASS", "정령 화분 정리", "GH", 10, "knowledge", "spirit-pot-sort"),
    ("sealed-shelves", "CLASS", "봉인 서가", "LIB", 10, "knowledge", "sealed-shelves"),
    ("rune-circuit", "CLASS", "룬 회로", "WRK", 10, "magic", "rune-circuit"),
    ("rune-pin-training", "CLASS", "룬 핀 훈련", "TRN", 10, "skill", "rune-pin-training"),
    ("ADV_GREENHOUSE", "ADVENTURE", "유리 온실·약초원 모험", "GH", 15, "exploration", "greenhouse"),
    ("ADV_LIBRARY", "ADVENTURE", "대서고 모험", "LIB", 15, "exploration", "library"),
    ("ADV_OBSERVATORY", "ADVENTURE", "별빛 천문대 모험", "OBS", 15, "exploration", "observatory"),
    ("REST_DEFAULT", "REST", "휴식", None, 0, None, "rest"),
    ("fairy-trade", "SPECIAL", "요정의 거래", "DRM", 0, None, "fairy-trade"),
)


def _insert_or_verify(connection: sqlite3.Connection, table: str, key: tuple,
                      columns: tuple[str, ...], values: tuple) -> None:
    # `table` and `columns` come only from constants in this file.
    where = " AND ".join(f"{column}=?" for column in columns[:len(key)])
    existing = connection.execute(
        f"SELECT {','.join(columns)} FROM {table} WHERE {where}", key,
    ).fetchone()
    if existing is None:
        placeholders = ",".join("?" for _ in values)
        connection.execute(
            f"INSERT INTO {table}({','.join(columns)}) VALUES ({placeholders})", values,
        )
    elif tuple(existing) != values:
        raise RuntimeError(f"Existing {table} row conflicts with approved catalog: {key[-1]}")


def seed_activities(connection: sqlite3.Connection, version: str) -> None:
    if connection.execute("PRAGMA user_version").fetchone()[0] != 4:
        raise RuntimeError("SQLite schema v4 is required; seed the Story master first")
    if connection.execute(
        "SELECT 1 FROM game_data_versions WHERE version=?", (version,)
    ).fetchone() is None:
        raise RuntimeError("Requested gameDataVersion is not installed")

    connection.execute("BEGIN IMMEDIATE")
    try:
        for sort_order, (location_id, name) in enumerate(LOCATIONS, 1):
            connection.execute(
                """INSERT OR IGNORE INTO locations(version,location_id,display_name,sort_order)
                   VALUES (?,?,?,?)""", (version, location_id, name, sort_order),
            )
        for sort_order, (activity_id, kind, name, location_id, cost, stat, engine_id) in enumerate(ACTIVITIES, 1):
            _insert_or_verify(
                connection, "activities", (version, activity_id),
                ("version", "activity_id", "activity_type", "display_name", "location_id",
                 "stamina_cost", "target_stat", "content_ref", "sort_order"),
                (version, activity_id, kind, name, location_id, cost, stat, engine_id, sort_order),
            )
            if kind == "CLASS":
                _insert_or_verify(
                    connection, "minigames", (version, activity_id),
                    ("version", "game_id", "activity_id", "display_name", "target_stat", "sort_order"),
                    (version, activity_id, activity_id, name, stat, sort_order),
                )
                count = connection.execute(
                    "SELECT COUNT(*) FROM minigames WHERE version=? AND activity_id=?",
                    (version, activity_id),
                ).fetchone()[0]
                if count != 1:
                    raise RuntimeError(f"Class has multiple minigames: {activity_id}")
        connection.execute("COMMIT")
    except Exception:
        connection.execute("ROLLBACK")
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed reviewed Phase 7 activity catalog")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH)
    parser.add_argument("--version", required=True)
    args = parser.parse_args()
    if not args.db.is_file():
        raise RuntimeError(f"Master database does not exist: {args.db}")
    with sqlite3.connect(args.db) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        seed_activities(connection, args.version)
        activity_count = connection.execute(
            "SELECT COUNT(*) FROM activities WHERE version=?", (args.version,)
        ).fetchone()[0]
        game_count = connection.execute(
            "SELECT COUNT(*) FROM minigames WHERE version=?", (args.version,)
        ).fetchone()[0]
    print(f"Activity catalog: {activity_count} activities / {game_count} minigames; validation: OK")


if __name__ == "__main__":
    main()
