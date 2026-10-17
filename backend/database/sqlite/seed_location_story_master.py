#!/usr/bin/env python3
"""Seed Location Story master metadata/effects into LUMIA SQLite v4.

This seed intentionally does NOT create character-specific dialogue_sequences yet.
The Location common scripts are approved, but CH01~CH32 Character Sets are the next
content step. Run this now to prepare the master/rule/effect layer; later extend the
Location dialogue seed after the 32 variants are reviewed.

Default DB:
    backend/database/sqlite/lumia-content.sqlite3

Example:
    python3 backend/database/sqlite/seed_location_story_master.py \
        --migrate --version dev-dialogue-v1
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path

from seed_dialogue_content import (
    DEFAULT_DB_PATH,
    HIDDEN_STAT_MAP,
    VISIBLE_STAT_MAP,
    apply_migrations,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
LOCATION_DIALOGUE_DIR = REPO_ROOT / "document" / "dialogue" / "location"
LOCATION_PRODUCTION = REPO_ROOT / "story" / "location" / "LOCATION_STORY_PRODUCTION.md"

EXPECTED_CHARACTER_COUNT = 32
EXPECTED_LOCATION_STORIES = 6
EXPECTED_LOCATION_EVENTS = 6
EXPECTED_LOCATION_CHOICES = 13
EXPECTED_LOCATION_CHOICE_EFFECTS = 29  # 13*(visible+hidden) + OBS04 mark flag 3
EXPECTED_LOCATION_ROLE_CANDIDATES = 8

LOCATION_ROWS = (
    (
        "OBS",
        "별빛 천문대",
        "별 관측과 천문 활동이 이루어지는 장소",
        "BG05_starlight_observatory_1920x1080_015.png",
        1,
    ),
    (
        "GH",
        "유리 온실·약초원",
        "허브와 여러 식물을 돌보는 유리 온실과 약초원",
        "BG06_glass_greenhouse_1920x1080_016.png",
        2,
    ),
    (
        "LIB",
        "대서고",
        "아르카디아의 책과 기록을 보관하는 대형 서고",
        "BG04_grand_library_1920x1080_014.png",
        3,
    ),
)

# Keep Production IDs canonical: each active Location Story uses the same stable
# story_id/event_id. Sequential observatory order is expressed by an explicit
# PREVIOUS_EVENT_COMPLETE rule rather than inventing a new LOC_OBS chain ID.
STORY_DEFINITIONS = (
    {
        "story_id": "LOC_OBS_01",
        "display_name": "틀린 별자리",
        "location_id": "OBS",
        "sort_order": 1,
        "events": ((1, "LOC_OBS_01", "틀린 별자리", 1),),
    },
    {
        "story_id": "LOC_OBS_02",
        "display_name": "늦은 관측",
        "location_id": "OBS",
        "sort_order": 2,
        "events": ((1, "LOC_OBS_02", "늦은 관측", 1),),
    },
    {
        "story_id": "LOC_OBS_03",
        "display_name": "자리 맡아 주기",
        "location_id": "OBS",
        "sort_order": 3,
        "events": ((1, "LOC_OBS_03", "자리 맡아 주기", 1),),
    },
    {
        "story_id": "LOC_OBS_04",
        "display_name": "빈 관측 칸",
        "location_id": "OBS",
        "sort_order": 4,
        "events": ((1, "LOC_OBS_04", "빈 관측 칸", 1),),
    },
    {
        "story_id": "LOC_GH_01",
        "display_name": "시든 화분 돌보기",
        "location_id": "GH",
        "sort_order": 5,
        "events": ((1, "LOC_GH_01", "시든 화분 돌보기", 1),),
    },
    {
        "story_id": "LOC_LIB_01",
        "display_name": "책 한 권 제자리 찾기",
        "location_id": "LIB",
        "sort_order": 6,
        "events": ((1, "LOC_LIB_01", "책 한 권 제자리 찾기", 1),),
    },
)

LOCATION_EVENT_IDS = tuple(
    event_id
    for story in STORY_DEFINITIONS
    for _, event_id, _, _ in story["events"]
)

GREENHOUSE_ROLE_CANDIDATES = (
    "CH19",  # 요한
    "CH20",  # 하젤
    "CH10",  # 엘리아
    "CH28",  # 실비아
    "CH12",  # 리네
    "CH27",  # 미엘
    "CH02",  # 세라
    "CH09",  # 에녹
)

CHOICE_LINE_RE = re.compile(r"^- `([^`]+)` — (.+)$")
CHOICE_HEADER_RE = re.compile(r"^\*\*([A-Z0-9_]+) · CHOICE · `([^`]+)`\*\*$")
TITLE_RE = re.compile(r"^# (LOC_[A-Z]+_\d{2}) · (.+)$")


@dataclass(frozen=True)
class ChoiceDefinition:
    event_id: str
    group_id: str
    choice_id: str
    text: str
    display_order: int


def _strip_quotes(value: str) -> str:
    value = value.strip()
    for left, right in (("“", "”"), ('"', '"'), ("‘", "’"), ("'", "'")):
        if value.startswith(left) and value.endswith(right) and len(value) >= 2:
            return value[len(left) : -len(right)].strip()
    return value


def dialogue_path(event_id: str) -> Path:
    return LOCATION_DIALOGUE_DIR / f"{event_id}.md"


def parse_location_choices() -> list[ChoiceDefinition]:
    result: list[ChoiceDefinition] = []
    for event_id in LOCATION_EVENT_IDS:
        path = dialogue_path(event_id)
        lines = path.read_text(encoding="utf-8").splitlines()
        title = next((TITLE_RE.match(line.strip()) for line in lines if TITLE_RE.match(line.strip())), None)
        if not title or title.group(1) != event_id:
            raise ValueError(f"Location dialogue title mismatch: {path}")

        group_id: str | None = None
        order = 0
        for raw in lines:
            stripped = raw.strip()
            header = CHOICE_HEADER_RE.match(stripped)
            if header:
                if group_id is not None:
                    raise ValueError(f"{event_id}: expected exactly one choice group")
                group_id = header.group(2)
                continue
            if group_id is None:
                continue
            if stripped == "**공통 합류**":
                break
            option = CHOICE_LINE_RE.match(stripped)
            if option:
                order += 1
                result.append(
                    ChoiceDefinition(
                        event_id=event_id,
                        group_id=group_id,
                        choice_id=option.group(1),
                        text=_strip_quotes(option.group(2)),
                        display_order=order,
                    )
                )

        if group_id is None or order < 2:
            raise ValueError(f"{event_id}: invalid Location choice block")

    if len(result) != EXPECTED_LOCATION_CHOICES:
        raise ValueError(
            f"Expected {EXPECTED_LOCATION_CHOICES} Location choices, found {len(result)}"
        )
    return result


def parse_location_effects() -> dict[str, dict[str, object]]:
    effects: dict[str, dict[str, object]] = {}
    for raw in LOCATION_PRODUCTION.read_text(encoding="utf-8").splitlines():
        stripped = raw.strip()
        if not stripped.startswith("| `LOC_"):
            continue
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        if len(cells) != 4:
            continue
        choice_id = cells[0].strip("`")
        meaning = cells[1]
        visible_match = re.fullmatch(r"(지식|표현력|솜씨|탐험|마법) \+(\d+)", cells[2])
        hidden_match = re.fullmatch(
            r"(공감|책임|호기심|용기|협력|독립성|신중함|솔직함) \+(\d+)",
            cells[3],
        )
        if not visible_match or not hidden_match:
            continue
        effects[choice_id] = {
            "meaning": meaning,
            "effects": [
                ("VISIBLE_STAT", VISIBLE_STAT_MAP[visible_match.group(1)], int(visible_match.group(2))),
                ("HIDDEN_STAT", HIDDEN_STAT_MAP[hidden_match.group(1)], int(hidden_match.group(2))),
            ],
        }

    if len(effects) != EXPECTED_LOCATION_CHOICES:
        raise ValueError(
            f"Expected effects for {EXPECTED_LOCATION_CHOICES} Location choices, found {len(effects)}"
        )

    # OBS04 explicitly leaves the chosen mark as a completion record. This is not
    # a stat reward; it is a minimal run-scoped flag and is skipped when dialogue
    # completionMode=SKIP because choice effects are not applied on skip.
    mark_values = {
        "LOC_OBS_04_STAR": "STAR",
        "LOC_OBS_04_MOON": "MOON",
        "LOC_OBS_04_SPARKLE": "SPARKLE",
    }
    for choice_id, mark in mark_values.items():
        effects[choice_id]["effects"].append(("EVENT_FLAG", "location.obs.mark", mark))
    return effects


def ensure_version_and_characters(conn: sqlite3.Connection, version: str) -> None:
    exists = conn.execute(
        "SELECT 1 FROM game_data_versions WHERE version=?",
        (version,),
    ).fetchone()
    if not exists:
        raise RuntimeError(
            f"gameDataVersion {version!r} does not exist. Seed Main/master characters first."
        )
    count = conn.execute(
        "SELECT COUNT(*) FROM characters WHERE version=?",
        (version,),
    ).fetchone()[0]
    if count != EXPECTED_CHARACTER_COUNT:
        raise RuntimeError(
            f"Location role seed requires {EXPECTED_CHARACTER_COUNT} characters in version {version}; found {count}."
        )


def seed_locations(conn: sqlite3.Connection, version: str) -> None:
    for location_id, name, description, background, sort_order in LOCATION_ROWS:
        conn.execute(
            """
            INSERT INTO locations(
                version, location_id, display_name, description,
                background_asset_ref, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(version, location_id) DO UPDATE SET
                display_name=excluded.display_name,
                description=excluded.description,
                background_asset_ref=excluded.background_asset_ref,
                sort_order=excluded.sort_order
            """,
            (version, location_id, name, description, background, sort_order),
        )


def seed_location_speaker_and_role(conn: sqlite3.Connection, version: str) -> None:
    conn.execute(
        """
        INSERT INTO dialogue_speakers(
            version, speaker_id, display_name, speaker_type,
            portrait_asset_ref, description, sort_order
        ) VALUES (?, 'SERIN', '세린', 'TEXT_ONLY', NULL,
                  'LOC_LIB_01에만 등장하는 학생 사서 텍스트 화자', 10)
        ON CONFLICT(version, speaker_id) DO UPDATE SET
            display_name=excluded.display_name,
            speaker_type=excluded.speaker_type,
            portrait_asset_ref=excluded.portrait_asset_ref,
            description=excluded.description,
            sort_order=excluded.sort_order
        """,
        (version,),
    )

    main_greenhouse = conn.execute(
        """
        SELECT assignment_order
        FROM story_roles
        WHERE version=? AND role_id='MAIN_GREENHOUSE_STUDENT'
        """,
        (version,),
    ).fetchone()
    if not main_greenhouse:
        raise RuntimeError(
            "MAIN_GREENHOUSE_STUDENT role is missing. Run the Main dialogue seed for the same version first."
        )

    occupied = conn.execute(
        """
        SELECT role_id FROM story_roles
        WHERE version=? AND assignment_order=8 AND role_id<>'LOC_GREENHOUSE_STUDENT'
        """,
        (version,),
    ).fetchone()
    if occupied:
        raise RuntimeError(
            f"storyCast assignment_order=8 is already used by {occupied[0]}; resolve role ordering before seeding."
        )

    conn.execute(
        """
        INSERT INTO story_roles(
            version, role_id, role_scope, resolver_type,
            fixed_ref, exclude_player, assignment_order,
            prior_assignment_policy, description
        ) VALUES (?, 'LOC_GREENHOUSE_STUDENT', 'LOCATION', 'STORY_CAST',
                  NULL, 1, 8, 'PREFER_DISTINCT',
                  'LOC_GH_01 온실 학생; MAIN_GREENHOUSE_STUDENT와는 반드시 다름')
        ON CONFLICT(version, role_id) DO UPDATE SET
            role_scope=excluded.role_scope,
            resolver_type=excluded.resolver_type,
            fixed_ref=excluded.fixed_ref,
            exclude_player=excluded.exclude_player,
            assignment_order=excluded.assignment_order,
            prior_assignment_policy=excluded.prior_assignment_policy,
            description=excluded.description
        """,
        (version,),
    )

    conn.execute(
        "DELETE FROM story_role_candidates WHERE version=? AND role_id='LOC_GREENHOUSE_STUDENT'",
        (version,),
    )
    for priority, character_id in enumerate(GREENHOUSE_ROLE_CANDIDATES, start=1):
        conn.execute(
            """
            INSERT INTO story_role_candidates(version, role_id, priority, character_id)
            VALUES (?, 'LOC_GREENHOUSE_STUDENT', ?, ?)
            """,
            (version, priority, character_id),
        )

    conn.execute(
        """
        INSERT INTO story_role_exclusions(
            version, role_id, excluded_role_id, exclusion_type
        ) VALUES (?, 'LOC_GREENHOUSE_STUDENT', 'MAIN_GREENHOUSE_STUDENT', 'DISTINCT_CHARACTER')
        ON CONFLICT(version, role_id, excluded_role_id) DO UPDATE SET
            exclusion_type=excluded.exclusion_type
        """,
        (version,),
    )


def seed_story_structure(conn: sqlite3.Connection, version: str) -> None:
    production_ref = "story/location/LOCATION_STORY_PRODUCTION.md"
    for story in STORY_DEFINITIONS:
        conn.execute(
            """
            INSERT INTO stories(
                version, story_id, story_type, display_name,
                npc_id, location_id, content_ref, sort_order
            ) VALUES (?, ?, 'LOCATION', ?, NULL, ?, ?, ?)
            ON CONFLICT(version, story_id) DO UPDATE SET
                story_type=excluded.story_type,
                display_name=excluded.display_name,
                npc_id=excluded.npc_id,
                location_id=excluded.location_id,
                content_ref=excluded.content_ref,
                sort_order=excluded.sort_order
            """,
            (
                version,
                story["story_id"],
                story["display_name"],
                story["location_id"],
                production_ref,
                story["sort_order"],
            ),
        )

        for step_no, event_id, event_name, earliest_week in story["events"]:
            content_ref = dialogue_path(event_id).relative_to(REPO_ROOT).as_posix()
            conn.execute(
                """
                INSERT INTO story_events(
                    version, event_id, story_id, display_name, scene_ref, content_ref
                ) VALUES (?, ?, ?, ?, NULL, ?)
                ON CONFLICT(version, event_id) DO UPDATE SET
                    story_id=excluded.story_id,
                    display_name=excluded.display_name,
                    scene_ref=excluded.scene_ref,
                    content_ref=excluded.content_ref
                """,
                (version, event_id, story["story_id"], event_name, content_ref),
            )
            conn.execute(
                """
                INSERT INTO story_steps(
                    version, story_id, step_no, event_id,
                    earliest_week, display_order,
                    scheduled_month, scheduled_day, availability_rule_ref
                ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'LOCATION_UNSEEN_FIRST_V1')
                ON CONFLICT(version, story_id, step_no) DO UPDATE SET
                    event_id=excluded.event_id,
                    earliest_week=excluded.earliest_week,
                    display_order=excluded.display_order,
                    scheduled_month=excluded.scheduled_month,
                    scheduled_day=excluded.scheduled_day,
                    availability_rule_ref=excluded.availability_rule_ref
                """,
                (version, story["story_id"], step_no, event_id, earliest_week, step_no),
            )
            conn.execute(
                """
                INSERT INTO story_event_rules(
                    version, event_id, trigger_phase, selection_policy,
                    repeat_policy, requires_location_match, limit_group,
                    cooldown_weeks, is_active
                ) VALUES (?, ?, 'AFTER_ACTIVITY', 'UNSEEN_FIRST',
                          'ONCE_PER_RUN', 1, 'SIDE_STORY', 0, 1)
                ON CONFLICT(version, event_id) DO UPDATE SET
                    trigger_phase=excluded.trigger_phase,
                    selection_policy=excluded.selection_policy,
                    repeat_policy=excluded.repeat_policy,
                    requires_location_match=excluded.requires_location_match,
                    limit_group=excluded.limit_group,
                    cooldown_weeks=excluded.cooldown_weeks,
                    is_active=excluded.is_active
                """,
                (version, event_id),
            )

    # Explicit prerequisite rows are intentionally redundant with step ordering.
    # They make server validation/self-diagnostics clear and can be reused by NPC
    # chains that have non-linear prerequisites later.
    obs_prerequisites = (
        ("LOC_OBS_02", "LOC_OBS_01"),
        ("LOC_OBS_03", "LOC_OBS_02"),
        ("LOC_OBS_04", "LOC_OBS_03"),
    )
    for event_id in LOCATION_EVENT_IDS:
        conn.execute(
            "DELETE FROM story_event_conditions WHERE version=? AND event_id=?",
            (version, event_id),
        )
    for event_id, previous_event_id in obs_prerequisites:
        conn.execute(
            """
            INSERT INTO story_event_conditions(
                version, event_id, condition_order, condition_type,
                subject_ref, operator, value_json
            ) VALUES (?, ?, 1, 'PREVIOUS_EVENT_COMPLETE', ?, 'EQ', 'true')
            """,
            (version, event_id, previous_event_id),
        )

    # If a development DB ever contained rows for the now spec'd-out Location
    # events, make sure they cannot remain runtime candidates.
    excluded_runtime_ids = (
        "LOC_GH_02", "LOC_LIB_02",
        "LOC_WRK_01", "LOC_WRK_02",
        "LOC_TRN_01", "LOC_TRN_02",
        "LOC_CLK_01", "LOC_CLK_02",
        "LOC_DRM_01", "LOC_DRM_02",
    )
    excluded_placeholders = ",".join("?" for _ in excluded_runtime_ids)
    conn.execute(
        f"""
        UPDATE story_event_rules
        SET is_active=0
        WHERE version=? AND event_id IN ({excluded_placeholders})
        """,
        (version, *excluded_runtime_ids),
    )


def seed_choices_and_effects(conn: sqlite3.Connection, version: str) -> None:
    choices = parse_location_choices()
    effects = parse_location_effects()

    for event_id in LOCATION_EVENT_IDS:
        expected_ids = [choice.choice_id for choice in choices if choice.event_id == event_id]
        if not expected_ids:
            raise ValueError(f"{event_id}: no choices parsed")
        placeholders = ",".join("?" for _ in expected_ids)
        conn.execute(
            f"DELETE FROM story_choices WHERE version=? AND event_id=? AND choice_id NOT IN ({placeholders})",
            (version, event_id, *expected_ids),
        )

    for choice in choices:
        effect_info = effects.get(choice.choice_id)
        if effect_info is None:
            raise ValueError(f"Missing effect row for {choice.choice_id}")
        conn.execute(
            """
            INSERT INTO story_choices(
                version, event_id, choice_id, choice_text,
                display_order, next_event_id, summary_text,
                is_important, choice_group_id
            ) VALUES (?, ?, ?, ?, ?, NULL, ?, 0, ?)
            ON CONFLICT(version, event_id, choice_id) DO UPDATE SET
                choice_text=excluded.choice_text,
                display_order=excluded.display_order,
                next_event_id=excluded.next_event_id,
                summary_text=excluded.summary_text,
                is_important=excluded.is_important,
                choice_group_id=excluded.choice_group_id
            """,
            (
                version,
                choice.event_id,
                choice.choice_id,
                choice.text,
                choice.display_order,
                effect_info["meaning"],
                choice.group_id,
            ),
        )
        conn.execute(
            """
            DELETE FROM story_choice_effects
            WHERE version=? AND event_id=? AND choice_id=?
            """,
            (version, choice.event_id, choice.choice_id),
        )
        for effect_order, (effect_type, target, value) in enumerate(
            effect_info["effects"], start=1
        ):
            conn.execute(
                """
                INSERT INTO story_choice_effects(
                    version, event_id, choice_id, effect_order,
                    effect_type, target, value_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    version,
                    choice.event_id,
                    choice.choice_id,
                    effect_order,
                    effect_type,
                    target,
                    json.dumps(value, ensure_ascii=False),
                ),
            )


def seed_event_effects(conn: sqlite3.Connection, version: str) -> None:
    for story in STORY_DEFINITIONS:
        event_rows = story["events"]
        for step_no, event_id, _, _ in event_rows:
            conn.execute(
                "DELETE FROM story_event_effects WHERE version=? AND event_id=?",
                (version, event_id),
            )
            conn.execute(
                """
                INSERT INTO story_event_effects(
                    version, event_id, effect_order, apply_on,
                    effect_type, target, value_json
                ) VALUES (?, ?, 1, 'COMPLETE_OR_SKIP',
                          'STORY_PROGRESS', ?, ?)
                """,
                (
                    version,
                    event_id,
                    story["story_id"],
                    json.dumps(
                        {"step": step_no, "status": "COMPLETED"},
                        ensure_ascii=False,
                    ),
                ),
            )


def validate_location_master(conn: sqlite3.Connection, version: str) -> None:
    event_placeholders = ",".join("?" for _ in LOCATION_EVENT_IDS)
    event_params = (version, *LOCATION_EVENT_IDS)

    def scalar(sql: str, params: tuple[object, ...]) -> int:
        return int(conn.execute(sql, params).fetchone()[0])

    if scalar(
        f"SELECT COUNT(*) FROM stories WHERE version=? AND story_type='LOCATION' "
        f"AND story_id IN ({event_placeholders})",
        event_params,
    ) != EXPECTED_LOCATION_STORIES:
        raise ValueError("Location master validation failed: story count")

    if scalar(
        f"SELECT COUNT(*) FROM story_events WHERE version=? AND event_id IN ({event_placeholders})",
        event_params,
    ) != EXPECTED_LOCATION_EVENTS:
        raise ValueError("Location master validation failed: event count")

    if scalar(
        f"SELECT COUNT(*) FROM story_steps WHERE version=? AND event_id IN ({event_placeholders})",
        event_params,
    ) != EXPECTED_LOCATION_EVENTS:
        raise ValueError("Location master validation failed: step count")

    if scalar(
        f"SELECT COUNT(*) FROM story_event_rules WHERE version=? AND event_id IN ({event_placeholders})",
        event_params,
    ) != EXPECTED_LOCATION_EVENTS:
        raise ValueError("Location master validation failed: event-rule count")

    if scalar(
        f"SELECT COUNT(*) FROM story_choices WHERE version=? AND event_id IN ({event_placeholders})",
        event_params,
    ) != EXPECTED_LOCATION_CHOICES:
        raise ValueError("Location master validation failed: choice count")

    if scalar(
        f"SELECT COUNT(*) FROM story_choice_effects WHERE version=? AND event_id IN ({event_placeholders})",
        event_params,
    ) != EXPECTED_LOCATION_CHOICE_EFFECTS:
        raise ValueError("Location master validation failed: choice-effect count")

    if scalar(
        f"SELECT COUNT(*) FROM story_event_effects WHERE version=? AND event_id IN ({event_placeholders})",
        event_params,
    ) != EXPECTED_LOCATION_EVENTS:
        raise ValueError("Location master validation failed: event-effect count")

    role_candidates = scalar(
        """
        SELECT COUNT(*) FROM story_role_candidates
        WHERE version=? AND role_id='LOC_GREENHOUSE_STUDENT'
        """,
        (version,),
    )
    if role_candidates != EXPECTED_LOCATION_ROLE_CANDIDATES:
        raise ValueError("Location master validation failed: greenhouse role candidates")

    exclusion = scalar(
        """
        SELECT COUNT(*) FROM story_role_exclusions
        WHERE version=?
          AND role_id='LOC_GREENHOUSE_STUDENT'
          AND excluded_role_id='MAIN_GREENHOUSE_STUDENT'
        """,
        (version,),
    )
    if exclusion != 1:
        raise ValueError("Location master validation failed: greenhouse role exclusion")

    speaker = scalar(
        "SELECT COUNT(*) FROM dialogue_speakers WHERE version=? AND speaker_id='SERIN'",
        (version,),
    )
    if speaker != 1:
        raise ValueError("Location master validation failed: SERIN speaker")

    location_steps = conn.execute(
        """
        SELECT story_id, step_no, event_id, earliest_week
        FROM story_steps
        WHERE version=? AND event_id IN ('LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01')
        ORDER BY CASE event_id
            WHEN 'LOC_OBS_01' THEN 1
            WHEN 'LOC_OBS_02' THEN 2
            WHEN 'LOC_OBS_03' THEN 3
            WHEN 'LOC_OBS_04' THEN 4
            WHEN 'LOC_GH_01' THEN 5
            WHEN 'LOC_LIB_01' THEN 6
        END
        """,
        (version,),
    ).fetchall()
    expected_steps = [
        ("LOC_OBS_01", 1, "LOC_OBS_01", 1),
        ("LOC_OBS_02", 1, "LOC_OBS_02", 1),
        ("LOC_OBS_03", 1, "LOC_OBS_03", 1),
        ("LOC_OBS_04", 1, "LOC_OBS_04", 1),
        ("LOC_GH_01", 1, "LOC_GH_01", 1),
        ("LOC_LIB_01", 1, "LOC_LIB_01", 1),
    ]
    if location_steps != expected_steps:
        raise ValueError(f"Location master validation failed: steps {location_steps}")

    bad_rules = conn.execute(
        f"""
        SELECT event_id FROM story_event_rules
        WHERE version=? AND event_id IN ({event_placeholders})
          AND NOT (
            trigger_phase='AFTER_ACTIVITY'
            AND selection_policy='UNSEEN_FIRST'
            AND repeat_policy='ONCE_PER_RUN'
            AND requires_location_match=1
            AND limit_group='SIDE_STORY'
            AND is_active=1
          )
        """,
        event_params,
    ).fetchall()
    if bad_rules:
        raise ValueError(f"Location master validation failed: event rules {bad_rules}")

    excluded_runtime_ids = (
        "LOC_GH_02", "LOC_LIB_02",
        "LOC_WRK_01", "LOC_WRK_02",
        "LOC_TRN_01", "LOC_TRN_02",
        "LOC_CLK_01", "LOC_CLK_02",
        "LOC_DRM_01", "LOC_DRM_02",
    )
    excluded_placeholders = ",".join("?" for _ in excluded_runtime_ids)
    accidental = conn.execute(
        f"""
        SELECT event_id FROM story_event_rules
        WHERE version=? AND event_id IN ({excluded_placeholders}) AND is_active=1
        """,
        (version, *excluded_runtime_ids),
    ).fetchall()
    if accidental:
        raise ValueError(f"Excluded Location events are active: {accidental}")

    foreign_key_errors = conn.execute("PRAGMA foreign_key_check").fetchall()
    if foreign_key_errors:
        raise ValueError(f"Foreign key validation failed: {foreign_key_errors[:5]}")


def seed_location_master(conn: sqlite3.Connection, version: str) -> None:
    ensure_version_and_characters(conn, version)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("BEGIN IMMEDIATE")
    try:
        seed_locations(conn, version)
        seed_location_speaker_and_role(conn, version)
        seed_story_structure(conn, version)
        seed_choices_and_effects(conn, version)
        seed_event_effects(conn, version)
        validate_location_master(conn, version)
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def print_summary(conn: sqlite3.Connection, version: str, db_path: Path) -> None:
    event_placeholders = ",".join("?" for _ in LOCATION_EVENT_IDS)
    params = (version, *LOCATION_EVENT_IDS)
    story_count = conn.execute(
        f"SELECT COUNT(*) FROM stories WHERE version=? AND story_type='LOCATION' AND story_id IN ({event_placeholders})",
        params,
    ).fetchone()[0]
    event_count = conn.execute(
        f"SELECT COUNT(*) FROM story_events WHERE version=? AND event_id IN ({event_placeholders})",
        params,
    ).fetchone()[0]
    choice_count = conn.execute(
        f"SELECT COUNT(*) FROM story_choices WHERE version=? AND event_id IN ({event_placeholders})",
        params,
    ).fetchone()[0]
    effect_count = conn.execute(
        f"SELECT COUNT(*) FROM story_choice_effects WHERE version=? AND event_id IN ({event_placeholders})",
        params,
    ).fetchone()[0]
    dialogue_count = conn.execute(
        f"SELECT COUNT(*) FROM dialogue_sequences WHERE version=? AND story_id IN ({event_placeholders})",
        params,
    ).fetchone()[0]
    print(f"database: {db_path.resolve()}")
    print(f"schema user_version: {conn.execute('PRAGMA user_version').fetchone()[0]}")
    print(f"gameDataVersion: {version}")
    print(f"Location stories: {story_count}")
    print(f"Location events: {event_count}")
    print(f"Location canonical choices: {choice_count}")
    print(f"Location choice effects: {effect_count}")
    print(f"Location dialogue sequences: {dialogue_count} (expected 0 until 32 Character Sets are seeded)")
    print("validation: OK")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed LUMIA Location Story master/rule/effect data into SQLite v4"
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"SQLite database path (default: {DEFAULT_DB_PATH})",
    )
    parser.add_argument("--version", required=True, help="existing gameDataVersion to extend")
    parser.add_argument(
        "--migrate",
        action="store_true",
        help="apply missing SQLite migrations through v4 before seeding",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.db.exists():
        raise RuntimeError(
            f"Database does not exist: {args.db}. Seed the Main/master database first."
        )
    conn = sqlite3.connect(args.db)
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        if args.migrate:
            apply_migrations(conn)
        user_version = conn.execute("PRAGMA user_version").fetchone()[0]
        if user_version != 4:
            raise RuntimeError(
                f"Schema v4 required; current user_version={user_version}. Run with --migrate."
            )
        seed_location_master(conn, args.version)
        print_summary(conn, args.version, args.db)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
