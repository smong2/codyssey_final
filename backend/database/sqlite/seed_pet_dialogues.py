#!/usr/bin/env python3
"""Add or refresh the 20 reviewed My Room dialogue lines for each pet."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

from pet_dialogue_lines import PET_DIALOGUES
from seed_dialogue_content import PET_MASTER

DIRECTORY = Path(__file__).resolve().parent


def seed(path: Path, version: str) -> None:
    with sqlite3.connect(path) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        if connection.execute("PRAGMA user_version").fetchone()[0] != 4:
            raise RuntimeError("SQLite content schema v4 is required")
        connection.executescript((DIRECTORY / "pet_dialogues_extension.sql").read_text())
        with connection:
            for sort_order, pet in enumerate(PET_MASTER, 1):
                connection.execute(
                    """INSERT OR IGNORE INTO pets(
                        version, pet_id, display_name, description, asset_ref, is_default,
                        knowledge_modifier, expression_modifier, skill_modifier,
                        exploration_modifier, magic_modifier, sort_order
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (version, *pet, sort_order),
                )
        pet_ids = {row[0] for row in connection.execute(
            "SELECT pet_id FROM pets WHERE version = ?", (version,)
        )}
        if pet_ids != set(PET_DIALOGUES):
            raise RuntimeError("Pet master and dialogue IDs do not match")
        with connection:
            connection.executemany(
                """INSERT INTO pet_dialogues(version, pet_id, line_no, line_text)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(version, pet_id, line_no)
                   DO UPDATE SET line_text = excluded.line_text""",
                [(version, pet_id, index, line)
                 for pet_id, lines in PET_DIALOGUES.items()
                 for index, line in enumerate(lines, 1)],
            )
        count = connection.execute(
            "SELECT COUNT(*) FROM pet_dialogues WHERE version = ?", (version,)
        ).fetchone()[0]
        if count < 200:
            raise RuntimeError(f"Expected 200 pet dialogue lines, found {count}")
        print(f"pet dialogues: {count} lines across {len(PET_DIALOGUES)} pets")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=Path, default=DIRECTORY / "lumia-content.sqlite3")
    parser.add_argument("--version", default="dev-dialogue-v1")
    args = parser.parse_args()
    seed(args.db, args.version)
