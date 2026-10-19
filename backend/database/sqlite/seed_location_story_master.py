#!/usr/bin/env python3
"""Seed reviewed Location Story master + CH01~CH32 dialogue into LUMIA SQLite v4.

Scope:
- 6 active Location Story events
- 13 canonical choices + 39 choice effects
- 32 protagonists x 6 events = 192 dialogue_sequences
- 32 protagonists x 13 choices = 416 dialogue_options

The seed reads the reviewed common dialogue masters and Character Sets directly so
SQLite remains a compiled copy of Git-managed content rather than a second source.

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
    CHARACTER_HEADER_RE,
    DEFAULT_DB_PATH,
    HIDDEN_STAT_MAP,
    MASTER_NODE_RE,
    CharacterVariant,
    ChoiceGroup,
    Node,
    Reaction,
    VARIANT_GROUP_RE,
    VARIANT_SIGNATURE_RE,
    VISIBLE_STAT_MAP,
    VariantOption,
    _clean_inline,
    _next_nonempty,
    _parse_choice_block,
    apply_migrations,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
LOCATION_DIALOGUE_DIR = REPO_ROOT / "document" / "dialogue" / "location"
LOCATION_CHARACTER_SET_DIR = LOCATION_DIALOGUE_DIR / "character_sets"
LOCATION_PRODUCTION = REPO_ROOT / "story" / "location" / "LOCATION_STORY_PRODUCTION.md"

EXPECTED_CHARACTER_COUNT = 32
EXPECTED_LOCATION_STORIES = 6
EXPECTED_LOCATION_EVENTS = 6
EXPECTED_LOCATION_CHOICES = 13
EXPECTED_LOCATION_SECONDARY_HIDDEN_EFFECTS = 10
EXPECTED_LOCATION_CHOICE_EFFECTS = 39  # 13*(visible+primary hidden) + secondary 10 + OBS04 mark flag 3
EXPECTED_LOCATION_ROLE_CANDIDATES = 8
EXPECTED_LOCATION_CHOICE_GROUPS_PER_CHARACTER = 6
EXPECTED_LOCATION_OPTIONS_PER_CHARACTER = 13
EXPECTED_LOCATION_SIGNATURES_PER_CHARACTER = 6
EXPECTED_LOCATION_DIALOGUE_SEQUENCES = EXPECTED_LOCATION_EVENTS * EXPECTED_CHARACTER_COUNT
EXPECTED_LOCATION_DIALOGUE_OPTIONS = EXPECTED_LOCATION_CHOICES * EXPECTED_CHARACTER_COUNT

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
        "events": ((1, "LOC_OBS_01", "틀린 별자리", 3),),
    },
    {
        "story_id": "LOC_OBS_02",
        "display_name": "늦은 관측",
        "location_id": "OBS",
        "sort_order": 2,
        "events": ((1, "LOC_OBS_02", "늦은 관측", 22),),
    },
    {
        "story_id": "LOC_OBS_03",
        "display_name": "자리 맡아 주기",
        "location_id": "OBS",
        "sort_order": 3,
        "events": ((1, "LOC_OBS_03", "자리 맡아 주기", 33),),
    },
    {
        "story_id": "LOC_OBS_04",
        "display_name": "빈 관측 칸",
        "location_id": "OBS",
        "sort_order": 4,
        "events": ((1, "LOC_OBS_04", "빈 관측 칸", 46),),
    },
    {
        "story_id": "LOC_GH_01",
        "display_name": "시든 화분 돌보기",
        "location_id": "GH",
        "sort_order": 5,
        "events": ((1, "LOC_GH_01", "시든 화분 돌보기", 7),),
    },
    {
        "story_id": "LOC_LIB_01",
        "display_name": "책 한 권 제자리 찾기",
        "location_id": "LIB",
        "sort_order": 6,
        "events": ((1, "LOC_LIB_01", "책 한 권 제자리 찾기", 13),),
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


@dataclass
class LocationEventMaster:
    event_id: str
    title: str
    content_ref: str
    nodes: list[Node]
    choices: dict[str, ChoiceGroup]


def _strip_quotes(value: str) -> str:
    value = value.strip()
    for left, right in (("“", "”"), ('"', '"'), ("‘", "’"), ("'", "'")):
        if value.startswith(left) and value.endswith(right) and len(value) >= 2:
            return value[len(left) : -len(right)].strip()
    return value


def dialogue_path(event_id: str) -> Path:
    return LOCATION_DIALOGUE_DIR / f"{event_id}.md"


def _speaker_from_location_master(token: str) -> tuple[str, str | None]:
    token = token.strip()
    if token in {"PLAYER", "PLAYER(BASE)"}:
        return "PLAYER", None
    if token in {"LOC_GREENHOUSE_STUDENT", "ROLE:LOC_GREENHOUSE_STUDENT"}:
        return "NPC", "ROLE:LOC_GREENHOUSE_STUDENT"
    if token in {"SERIN", "NPC:SERIN"}:
        return "NPC", "NPC:SERIN"
    raise ValueError(f"Unsupported Location Story speaker token: {token}")


def parse_location_event_master(path: Path) -> LocationEventMaster:
    lines = path.read_text(encoding="utf-8").splitlines()
    title_match = next((TITLE_RE.match(line.strip()) for line in lines if TITLE_RE.match(line.strip())), None)
    if not title_match:
        raise ValueError(f"Could not parse Location event metadata: {path}")

    event_id = title_match.group(1)
    title = title_match.group(2).strip()
    if event_id not in LOCATION_EVENT_IDS:
        raise ValueError(f"Unexpected Location event id: {event_id}")

    nodes: list[Node] = []
    choices: dict[str, ChoiceGroup] = {}
    for index, raw in enumerate(lines):
        stripped = raw.strip()
        match = MASTER_NODE_RE.match(stripped)
        if not match:
            continue
        node_id, body = match.group(1), match.group(2).strip()

        if body == "END":
            nodes.append(Node(node_id=node_id, node_kind="END"))
            continue

        if body.startswith("CHOICE"):
            group_match = re.search(r"`([^`]+)`", body)
            if not group_match:
                raise ValueError(f"{path}:{index + 1}: choice group id missing")
            group_id = group_match.group(1)
            nodes.append(Node(node_id=node_id, node_kind="CHOICE", choice_group_id=group_id))
            choices[group_id] = _parse_choice_block(lines, index, node_id, group_id)
            continue

        parts = [part.strip() for part in body.split(" / ")]
        head = parts[0]

        if head == "IMAGE":
            if len(parts) != 2:
                raise ValueError(f"{path}:{index + 1}: malformed IMAGE declaration: {body}")
            image_bits = parts[1].split()
            if len(image_bits) != 2:
                raise ValueError(f"{path}:{index + 1}: malformed IMAGE target/action: {body}")
            target, action = image_bits
            asset_ref = None
            if action != "HIDE":
                _, asset_line = _next_nonempty(lines, index + 1)
                if asset_line is None or not (asset_line.startswith("`") and asset_line.endswith("`")):
                    raise ValueError(f"{path}:{index + 1}: image asset ref missing for {node_id}")
                asset_ref = asset_line.strip("`")
            nodes.append(
                Node(
                    node_id=node_id,
                    node_kind="IMAGE",
                    image_target=target,
                    image_action=action,
                    image_asset_type="SCENE",
                    image_asset_ref=asset_ref,
                    image_alt=asset_ref,
                )
            )
            continue

        if head in {"DIALOGUE", "THOUGHT", "NARRATION", "CONTEXT"}:
            _, text_line = _next_nonempty(lines, index + 1)
            if text_line is None:
                raise ValueError(f"{path}:{index + 1}: text missing for {node_id}")
            text = _clean_inline(text_line)

            if head in {"NARRATION", "CONTEXT"}:
                if len(parts) != 2:
                    raise ValueError(f"{path}:{index + 1}: malformed {head} declaration")
                speaker_kind, speaker_ref = "NARRATOR", None
                visual_mode = parts[1]
            else:
                if len(parts) != 3:
                    raise ValueError(f"{path}:{index + 1}: malformed {head} declaration")
                speaker_kind, speaker_ref = _speaker_from_location_master(parts[1])
                visual_mode = parts[2]

            nodes.append(
                Node(
                    node_id=node_id,
                    node_kind="LINE",
                    line_mode=head,
                    speaker_kind=speaker_kind,
                    speaker_ref=speaker_ref,
                    line_text=text,
                    visual_mode=visual_mode,
                )
            )
            continue

        raise ValueError(f"{path}:{index + 1}: unsupported node declaration: {body}")

    if not nodes or nodes[-1].node_kind != "END":
        raise ValueError(f"{path}: sequence must end with END")
    if len(choices) != 1:
        raise ValueError(f"{event_id}: expected exactly one choice group, found {len(choices)}")
    option_count = len(next(iter(choices.values())).options)
    expected_options = 3 if event_id == "LOC_OBS_04" else 2
    if option_count != expected_options:
        raise ValueError(
            f"{event_id}: expected {expected_options} choice options, found {option_count}"
        )

    return LocationEventMaster(
        event_id=event_id,
        title=title,
        content_ref=path.relative_to(REPO_ROOT).as_posix(),
        nodes=nodes,
        choices=choices,
    )


def parse_all_location_masters() -> dict[str, LocationEventMaster]:
    masters = {
        event_id: parse_location_event_master(dialogue_path(event_id))
        for event_id in LOCATION_EVENT_IDS
    }
    if len(masters) != EXPECTED_LOCATION_EVENTS:
        raise ValueError(f"Expected {EXPECTED_LOCATION_EVENTS} Location masters, found {len(masters)}")
    return masters


def _parse_location_variant_choice_payload(payload: str) -> tuple[str, Reaction]:
    if " → " not in payload:
        raise ValueError(f"Location Character Set option is missing inline reaction: {payload}")
    choice_part, reaction_part = payload.split(" → ", 1)
    if ": " not in reaction_part:
        raise ValueError(f"Location Character Set reaction is malformed: {payload}")
    speaker, reaction_text = reaction_part.split(": ", 1)
    return _clean_inline(choice_part), Reaction(speaker.strip(), _clean_inline(reaction_text))


def parse_location_character_variants() -> dict[str, CharacterVariant]:
    variants: dict[str, CharacterVariant] = {}
    for path in sorted(LOCATION_CHARACTER_SET_DIR.glob("SET_*.md")):
        lines = path.read_text(encoding="utf-8").splitlines()
        current: CharacterVariant | None = None
        mode: str | None = None
        current_group: str | None = None

        for raw in lines:
            stripped = raw.strip()
            header = CHARACTER_HEADER_RE.match(stripped)
            if header:
                current = CharacterVariant(header.group(1), header.group(2).strip())
                if current.character_id in variants:
                    raise ValueError(f"Duplicate Location character variant: {current.character_id}")
                variants[current.character_id] = current
                mode = None
                current_group = None
                continue
            if current is None:
                continue
            if stripped == "## Signature PLAYER overrides":
                mode = "signature"
                current_group = None
                continue
            if stripped == "## Choice overrides":
                mode = "choice"
                current_group = None
                continue
            group_match = VARIANT_GROUP_RE.match(stripped)
            if group_match and mode == "choice":
                current_group = group_match.group(1)
                current.choices.setdefault(current_group, {})
                continue

            if mode == "signature":
                signature_match = VARIANT_SIGNATURE_RE.match(stripped)
                if signature_match:
                    current.signatures[signature_match.group(1)] = _clean_inline(signature_match.group(2))
                continue

            if mode == "choice" and current_group:
                option_match = VARIANT_SIGNATURE_RE.match(stripped)
                if option_match:
                    choice_id = option_match.group(1)
                    choice_text, reaction = _parse_location_variant_choice_payload(option_match.group(2))
                    current.choices[current_group][choice_id] = VariantOption(
                        text=choice_text,
                        reactions=[reaction],
                    )

    if len(variants) != EXPECTED_CHARACTER_COUNT:
        raise ValueError(
            f"Expected {EXPECTED_CHARACTER_COUNT} Location character variants, found {len(variants)}"
        )
    return variants


def _expected_greenhouse_actor_name(character_id: str) -> str:
    return "하젤" if character_id in {"CH12", "CH19"} else "요한"


def validate_location_authoring(
    masters: dict[str, LocationEventMaster],
    variants: dict[str, CharacterVariant],
) -> None:
    groups = {
        group_id: (master, group)
        for master in masters.values()
        for group_id, group in master.choices.items()
    }
    if len(groups) != EXPECTED_LOCATION_CHOICE_GROUPS_PER_CHARACTER:
        raise ValueError(
            f"Expected {EXPECTED_LOCATION_CHOICE_GROUPS_PER_CHARACTER} Location choice groups, "
            f"found {len(groups)}"
        )

    player_node_ids = {
        node.node_id
        for master in masters.values()
        for node in master.nodes
        if node.node_kind == "LINE" and node.speaker_kind == "PLAYER"
    }

    for character_id, variant in sorted(variants.items()):
        if len(variant.signatures) != EXPECTED_LOCATION_SIGNATURES_PER_CHARACTER:
            raise ValueError(
                f"{character_id}: expected {EXPECTED_LOCATION_SIGNATURES_PER_CHARACTER} Location signatures, "
                f"got {len(variant.signatures)}"
            )
        invalid_signatures = set(variant.signatures) - player_node_ids
        if invalid_signatures:
            raise ValueError(
                f"{character_id}: Location signatures target non-PLAYER/unknown nodes "
                f"{sorted(invalid_signatures)}"
            )
        for event_id in LOCATION_EVENT_IDS:
            if not any(node_id.startswith(f"{event_id}_") for node_id in variant.signatures):
                raise ValueError(f"{character_id}: missing signature override for {event_id}")

        if set(variant.choices) != set(groups):
            missing = sorted(set(groups) - set(variant.choices))
            extra = sorted(set(variant.choices) - set(groups))
            raise ValueError(
                f"{character_id}: Location choice groups mismatch; missing={missing}, extra={extra}"
            )

        option_count = 0
        for group_id, (master, base_group) in groups.items():
            canonical_ids = {option.choice_id for option in base_group.options}
            actual_ids = set(variant.choices[group_id])
            if actual_ids != canonical_ids:
                raise ValueError(
                    f"{character_id}/{group_id}: choice ids mismatch; "
                    f"expected={sorted(canonical_ids)}, actual={sorted(actual_ids)}"
                )
            for choice_id, option in variant.choices[group_id].items():
                if not option.text or len(option.reactions) != 1 or not option.reactions[0].text:
                    raise ValueError(f"{character_id}/{group_id}/{choice_id}: invalid option/reaction")
                reaction_speaker = option.reactions[0].speaker.strip()
                if master.event_id.startswith("LOC_OBS_"):
                    if reaction_speaker not in {"PLAYER", "PLAYER(BASE)"}:
                        raise ValueError(
                            f"{character_id}/{choice_id}: OBS reaction must be PLAYER, got {reaction_speaker!r}"
                        )
                elif master.event_id == "LOC_GH_01":
                    expected_actor = _expected_greenhouse_actor_name(character_id)
                    if reaction_speaker != expected_actor:
                        raise ValueError(
                            f"{character_id}/{choice_id}: greenhouse actor must be {expected_actor}, "
                            f"got {reaction_speaker!r}"
                        )
                elif master.event_id == "LOC_LIB_01":
                    if reaction_speaker not in {"세린", "SERIN"}:
                        raise ValueError(
                            f"{character_id}/{choice_id}: library reaction must be 세린, got {reaction_speaker!r}"
                        )
            option_count += len(actual_ids)

        if option_count != EXPECTED_LOCATION_OPTIONS_PER_CHARACTER:
            raise ValueError(
                f"{character_id}: expected {EXPECTED_LOCATION_OPTIONS_PER_CHARACTER} Location options, "
                f"got {option_count}"
            )


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
        if len(cells) != 5:
            continue
        choice_id = cells[0].strip("`")
        meaning = cells[1]
        visible_match = re.fullmatch(r"(지식|표현력|솜씨|탐험|마법) \+(\d+)", cells[2])
        primary_hidden_match = re.fullmatch(
            r"(공감|책임|호기심|용기|협력|독립성|신중함|솔직함) \+(\d+)",
            cells[3],
        )
        secondary_hidden_match = None
        if cells[4] != "-":
            secondary_hidden_match = re.fullmatch(
                r"(공감|책임|호기심|용기|협력|독립성|신중함|솔직함) \+(\d+)",
                cells[4],
            )
        if not visible_match or not primary_hidden_match:
            continue
        if cells[4] != "-" and not secondary_hidden_match:
            continue
        choice_effects: list[tuple[str, str, object]] = [
            ("VISIBLE_STAT", VISIBLE_STAT_MAP[visible_match.group(1)], int(visible_match.group(2))),
            (
                "HIDDEN_STAT",
                HIDDEN_STAT_MAP[primary_hidden_match.group(1)],
                int(primary_hidden_match.group(2)),
            ),
        ]
        if secondary_hidden_match:
            secondary_target = HIDDEN_STAT_MAP[secondary_hidden_match.group(1)]
            if secondary_target == choice_effects[1][1]:
                raise ValueError(f"{choice_id}: Primary/Secondary Hidden target must differ")
            choice_effects.append(
                ("HIDDEN_STAT", secondary_target, int(secondary_hidden_match.group(2)))
            )
        effects[choice_id] = {
            "meaning": meaning,
            "effects": choice_effects,
        }

    if len(effects) != EXPECTED_LOCATION_CHOICES:
        raise ValueError(
            f"Expected effects for {EXPECTED_LOCATION_CHOICES} Location choices, found {len(effects)}"
        )
    secondary_count = sum(1 for row in effects.values() if len(row["effects"]) == 3)
    if secondary_count != EXPECTED_LOCATION_SECONDARY_HIDDEN_EFFECTS:
        raise ValueError(
            f"Expected {EXPECTED_LOCATION_SECONDARY_HIDDEN_EFFECTS} Location secondary Hidden effects, "
            f"found {secondary_count}"
        )

    choices_by_group: dict[tuple[str, str], list[str]] = {}
    for choice in parse_location_choices():
        choices_by_group.setdefault((choice.event_id, choice.group_id), []).append(choice.choice_id)
    for (event_id, group_id), choice_ids in choices_by_group.items():
        hidden_totals: set[int] = set()
        for choice_id in choice_ids:
            rows = effects[choice_id]["effects"]
            visible_rows = [row for row in rows if row[0] == "VISIBLE_STAT"]
            hidden_rows = [row for row in rows if row[0] == "HIDDEN_STAT"]
            if len(visible_rows) != 1 or len(hidden_rows) not in {1, 2}:
                raise ValueError(
                    f"{choice_id}: expected 1 visible and 1~2 hidden effects, got {rows}"
                )
            if len({row[1] for row in hidden_rows}) != len(hidden_rows):
                raise ValueError(f"{choice_id}: duplicate Hidden targets are not allowed")
            hidden_totals.add(sum(int(row[2]) for row in hidden_rows))
        if len(hidden_totals) != 1:
            raise ValueError(
                f"{event_id}/{group_id}: choice options have unequal Hidden totals {sorted(hidden_totals)}"
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
    effect_count = sum(len(row["effects"]) for row in effects.values())
    if effect_count != EXPECTED_LOCATION_CHOICE_EFFECTS:
        raise ValueError(
            f"Expected {EXPECTED_LOCATION_CHOICE_EFFECTS} Location choice effect rows, found {effect_count}"
        )
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


def _reaction_node_id(choice_node_id: str, choice_id: str) -> str:
    return f"{choice_node_id}__{choice_id}__R01"


def _resolve_location_reaction_speaker(
    event_id: str,
    character_id: str,
    speaker_name: str,
) -> tuple[str, str | None]:
    name = speaker_name.strip()
    if event_id.startswith("LOC_OBS_"):
        if name not in {"PLAYER", "PLAYER(BASE)"}:
            raise ValueError(f"{event_id}/{character_id}: unexpected OBS reaction speaker {name!r}")
        return "PLAYER", None
    if event_id == "LOC_GH_01":
        expected_actor = _expected_greenhouse_actor_name(character_id)
        if name != expected_actor:
            raise ValueError(
                f"{event_id}/{character_id}: expected greenhouse reaction actor {expected_actor}, got {name!r}"
            )
        return "NPC", "ROLE:LOC_GREENHOUSE_STUDENT"
    if event_id == "LOC_LIB_01":
        if name not in {"세린", "SERIN"}:
            raise ValueError(f"{event_id}/{character_id}: unexpected library reaction speaker {name!r}")
        return "NPC", "NPC:SERIN"
    raise ValueError(f"Unknown Location event for reaction speaker: {event_id}")


def _node_insert_tuple(
    version: str,
    story_id: str,
    step_no: int,
    character_id: str,
    node: Node,
    next_node_id: str | None,
    line_text_override: str | None,
) -> tuple[object, ...]:
    return (
        version,
        story_id,
        step_no,
        character_id,
        node.node_id,
        node.node_kind,
        node.line_mode,
        node.speaker_kind,
        node.speaker_ref,
        line_text_override if line_text_override is not None else node.line_text,
        node.visual_mode,
        node.image_target,
        node.image_action,
        node.image_asset_type,
        node.image_asset_ref,
        node.image_alt,
        node.choice_group_id,
        node.choice_prompt,
        next_node_id,
    )


def seed_location_dialogues(
    conn: sqlite3.Connection,
    version: str,
    masters: dict[str, LocationEventMaster],
    variants: dict[str, CharacterVariant],
) -> None:
    placeholders = ",".join("?" for _ in LOCATION_EVENT_IDS)
    conn.execute(
        f"DELETE FROM dialogue_sequences WHERE version=? AND story_id IN ({placeholders})",
        (version, *LOCATION_EVENT_IDS),
    )

    for event_id in LOCATION_EVENT_IDS:
        master = masters[event_id]
        story_id = event_id
        step_no = 1
        ordered_nodes = master.nodes
        node_index = {node.node_id: index for index, node in enumerate(ordered_nodes)}
        group_by_node_id = {group.node_id: group for group in master.choices.values()}

        for character_id in sorted(variants):
            variant = variants[character_id]
            conn.execute(
                """
                INSERT INTO dialogue_sequences(
                    version, story_id, step_no, event_id, character_id, entry_node_id
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (version, story_id, step_no, event_id, character_id, ordered_nodes[0].node_id),
            )

            for index, node in enumerate(ordered_nodes):
                next_node_id = None
                if node.node_kind in {"LINE", "IMAGE"}:
                    if index + 1 >= len(ordered_nodes):
                        raise ValueError(f"{event_id}/{node.node_id}: missing next node")
                    next_node_id = ordered_nodes[index + 1].node_id

                line_override = variant.signatures.get(node.node_id)
                conn.execute(
                    """
                    INSERT INTO dialogue_nodes(
                        version, story_id, step_no, character_id, node_id, node_kind,
                        line_mode, speaker_kind, speaker_ref, line_text, visual_mode,
                        image_target, image_action, image_asset_type, image_asset_ref, image_alt,
                        choice_group_id, choice_prompt, next_node_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    _node_insert_tuple(
                        version,
                        story_id,
                        step_no,
                        character_id,
                        node,
                        next_node_id,
                        line_override,
                    ),
                )

            for choice_node_id, base_group in group_by_node_id.items():
                choice_index = node_index[choice_node_id]
                if choice_index + 1 >= len(ordered_nodes):
                    raise ValueError(f"{event_id}/{choice_node_id}: choice has no merge node")
                merge_node_id = ordered_nodes[choice_index + 1].node_id
                variant_group = variant.choices[base_group.group_id]

                for sort_order, base_option in enumerate(base_group.options, start=1):
                    variant_option = variant_group[base_option.choice_id]
                    if len(variant_option.reactions) != 1:
                        raise ValueError(
                            f"{character_id}/{base_group.group_id}/{base_option.choice_id}: expected one reaction"
                        )
                    reaction = variant_option.reactions[0]
                    reaction_node_id = _reaction_node_id(choice_node_id, base_option.choice_id)
                    speaker_kind, speaker_ref = _resolve_location_reaction_speaker(
                        event_id,
                        character_id,
                        reaction.speaker,
                    )
                    conn.execute(
                        """
                        INSERT INTO dialogue_nodes(
                            version, story_id, step_no, character_id, node_id, node_kind,
                            line_mode, speaker_kind, speaker_ref, line_text, visual_mode,
                            image_target, image_action, image_asset_type, image_asset_ref, image_alt,
                            choice_group_id, choice_prompt, next_node_id
                        ) VALUES (?, ?, ?, ?, ?, 'LINE',
                                  'DIALOGUE', ?, ?, ?, 'KEEP',
                                  NULL, NULL, NULL, NULL, NULL,
                                  NULL, NULL, ?)
                        """,
                        (
                            version,
                            story_id,
                            step_no,
                            character_id,
                            reaction_node_id,
                            speaker_kind,
                            speaker_ref,
                            reaction.text,
                            merge_node_id,
                        ),
                    )
                    conn.execute(
                        """
                        INSERT INTO dialogue_options(
                            version, story_id, step_no, character_id,
                            choice_node_id, choice_id, choice_text,
                            response_node_id, sort_order
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            version,
                            story_id,
                            step_no,
                            character_id,
                            choice_node_id,
                            base_option.choice_id,
                            variant_option.text,
                            reaction_node_id,
                            sort_order,
                        ),
                    )


def _validate_location_graphs(conn: sqlite3.Connection, version: str) -> None:
    placeholders = ",".join("?" for _ in LOCATION_EVENT_IDS)
    params = (version, *LOCATION_EVENT_IDS)
    sequences = conn.execute(
        f"""
        SELECT story_id, step_no, character_id, entry_node_id
        FROM dialogue_sequences
        WHERE version=? AND story_id IN ({placeholders})
        ORDER BY story_id, step_no, character_id
        """,
        params,
    ).fetchall()

    for story_id, step_no, character_id, entry_node_id in sequences:
        node_rows = conn.execute(
            """
            SELECT node_id, node_kind, next_node_id
            FROM dialogue_nodes
            WHERE version=? AND story_id=? AND step_no=? AND character_id=?
            """,
            (version, story_id, step_no, character_id),
        ).fetchall()
        nodes = {node_id: (node_kind, next_node_id) for node_id, node_kind, next_node_id in node_rows}
        option_rows = conn.execute(
            """
            SELECT choice_node_id, response_node_id
            FROM dialogue_options
            WHERE version=? AND story_id=? AND step_no=? AND character_id=?
            """,
            (version, story_id, step_no, character_id),
        ).fetchall()
        branches: dict[str, list[str]] = {}
        for choice_node_id, response_node_id in option_rows:
            branches.setdefault(choice_node_id, []).append(response_node_id)

        visiting: set[str] = set()
        visited: set[str] = set()

        def walk(node_id: str) -> None:
            if node_id in visiting:
                raise ValueError(f"Cycle detected: {story_id}/{step_no}/{character_id}/{node_id}")
            if node_id in visited:
                return
            if node_id not in nodes:
                raise ValueError(f"Missing node: {story_id}/{step_no}/{character_id}/{node_id}")
            visiting.add(node_id)
            node_kind, next_node_id = nodes[node_id]
            if node_kind == "END":
                pass
            elif node_kind == "CHOICE":
                targets = branches.get(node_id, [])
                expected = 3 if story_id == "LOC_OBS_04" else 2
                if len(targets) != expected:
                    raise ValueError(
                        f"Invalid Location choice branches: {story_id}/{step_no}/{character_id}/{node_id}: "
                        f"expected {expected}, got {len(targets)}"
                    )
                for target in targets:
                    walk(target)
            else:
                if not next_node_id:
                    raise ValueError(f"Missing next node: {story_id}/{step_no}/{character_id}/{node_id}")
                walk(next_node_id)
            visiting.remove(node_id)
            visited.add(node_id)

        walk(entry_node_id)
        if len(visited) != len(nodes):
            orphaned = sorted(set(nodes) - visited)
            raise ValueError(
                f"Unreachable Location nodes: {story_id}/{step_no}/{character_id}: {orphaned[:5]}"
            )


def validate_location_master(
    conn: sqlite3.Connection,
    version: str,
    masters: dict[str, LocationEventMaster],
    variants: dict[str, CharacterVariant],
) -> None:
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

    if scalar(
        f"SELECT COUNT(*) FROM dialogue_sequences WHERE version=? AND story_id IN ({event_placeholders})",
        event_params,
    ) != EXPECTED_LOCATION_DIALOGUE_SEQUENCES:
        raise ValueError("Location master validation failed: dialogue sequence count")

    if scalar(
        f"SELECT COUNT(*) FROM dialogue_options WHERE version=? AND story_id IN ({event_placeholders})",
        event_params,
    ) != EXPECTED_LOCATION_DIALOGUE_OPTIONS:
        raise ValueError("Location master validation failed: dialogue option count")

    expected_dialogue_nodes = (
        sum(len(master.nodes) for master in masters.values()) * EXPECTED_CHARACTER_COUNT
        + EXPECTED_LOCATION_DIALOGUE_OPTIONS
    )
    actual_dialogue_nodes = scalar(
        f"SELECT COUNT(*) FROM dialogue_nodes WHERE version=? AND story_id IN ({event_placeholders})",
        event_params,
    )
    if actual_dialogue_nodes != expected_dialogue_nodes:
        raise ValueError(
            "Location master validation failed: dialogue node count: "
            f"expected {expected_dialogue_nodes}, got {actual_dialogue_nodes}"
        )

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
        ("LOC_OBS_01", 1, "LOC_OBS_01", 3),
        ("LOC_OBS_02", 1, "LOC_OBS_02", 22),
        ("LOC_OBS_03", 1, "LOC_OBS_03", 33),
        ("LOC_OBS_04", 1, "LOC_OBS_04", 46),
        ("LOC_GH_01", 1, "LOC_GH_01", 7),
        ("LOC_LIB_01", 1, "LOC_LIB_01", 13),
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

    per_character = dict(
        conn.execute(
            f"""
            SELECT character_id, COUNT(*)
            FROM dialogue_sequences
            WHERE version=? AND story_id IN ({event_placeholders})
            GROUP BY character_id
            """,
            event_params,
        ).fetchall()
    )
    if len(per_character) != EXPECTED_CHARACTER_COUNT:
        raise ValueError("Location master validation failed: sequence character coverage")
    for character_id, count in sorted(per_character.items()):
        if count != EXPECTED_LOCATION_EVENTS:
            raise ValueError(
                f"{character_id}: expected {EXPECTED_LOCATION_EVENTS} Location sequences, got {count}"
            )

    choice_nodes = dict(
        conn.execute(
            f"""
            SELECT character_id, COUNT(*)
            FROM dialogue_nodes
            WHERE version=? AND story_id IN ({event_placeholders}) AND node_kind='CHOICE'
            GROUP BY character_id
            """,
            event_params,
        ).fetchall()
    )
    option_counts = dict(
        conn.execute(
            f"""
            SELECT character_id, COUNT(*)
            FROM dialogue_options
            WHERE version=? AND story_id IN ({event_placeholders})
            GROUP BY character_id
            """,
            event_params,
        ).fetchall()
    )
    for character_id in sorted(per_character):
        if choice_nodes.get(character_id) != EXPECTED_LOCATION_CHOICE_GROUPS_PER_CHARACTER:
            raise ValueError(
                f"{character_id}: expected {EXPECTED_LOCATION_CHOICE_GROUPS_PER_CHARACTER} Location choice nodes, "
                f"got {choice_nodes.get(character_id)}"
            )
        if option_counts.get(character_id) != EXPECTED_LOCATION_OPTIONS_PER_CHARACTER:
            raise ValueError(
                f"{character_id}: expected {EXPECTED_LOCATION_OPTIONS_PER_CHARACTER} Location options, "
                f"got {option_counts.get(character_id)}"
            )

    unresolved_roles = conn.execute(
        f"""
        SELECT DISTINCT dn.speaker_ref
        FROM dialogue_nodes dn
        LEFT JOIN story_roles sr
          ON sr.version=dn.version AND sr.role_id=substr(dn.speaker_ref, 6)
        WHERE dn.version=? AND dn.story_id IN ({event_placeholders})
          AND dn.speaker_ref LIKE 'ROLE:%' AND sr.role_id IS NULL
        """,
        event_params,
    ).fetchall()
    if unresolved_roles:
        raise ValueError(f"Location master validation failed: unresolved roles {unresolved_roles}")

    unresolved_npcs = conn.execute(
        f"""
        SELECT DISTINCT dn.speaker_ref
        FROM dialogue_nodes dn
        LEFT JOIN dialogue_speakers ds
          ON ds.version=dn.version AND ds.speaker_id=substr(dn.speaker_ref, 5)
        WHERE dn.version=? AND dn.story_id IN ({event_placeholders})
          AND dn.speaker_ref LIKE 'NPC:%' AND ds.speaker_id IS NULL
        """,
        event_params,
    ).fetchall()
    if unresolved_npcs:
        raise ValueError(f"Location master validation failed: unresolved NPC speakers {unresolved_npcs}")

    unresolved_choice_ids = conn.execute(
        f"""
        SELECT DISTINCT ds.event_id, do.choice_id
        FROM dialogue_options do
        JOIN dialogue_sequences ds
          ON ds.version=do.version
         AND ds.story_id=do.story_id
         AND ds.step_no=do.step_no
         AND ds.character_id=do.character_id
        LEFT JOIN story_choices sc
          ON sc.version=ds.version
         AND sc.event_id=ds.event_id
         AND sc.choice_id=do.choice_id
        WHERE do.version=? AND do.story_id IN ({event_placeholders})
          AND sc.choice_id IS NULL
        """,
        event_params,
    ).fetchall()
    if unresolved_choice_ids:
        raise ValueError(
            f"Location master validation failed: dialogue choices missing canonical rows {unresolved_choice_ids}"
        )

    # Verify all protagonist-specific signature, choice text, and branch reaction
    # overrides actually reached the compiled database.
    group_to_master = {
        group_id: (master, group)
        for master in masters.values()
        for group_id, group in master.choices.items()
    }
    for character_id, variant in sorted(variants.items()):
        for node_id, expected_text in variant.signatures.items():
            row = conn.execute(
                f"""
                SELECT line_text
                FROM dialogue_nodes
                WHERE version=? AND character_id=? AND node_id=?
                  AND story_id IN ({event_placeholders})
                """,
                (version, character_id, node_id, *LOCATION_EVENT_IDS),
            ).fetchone()
            if row is None or row[0] != expected_text:
                raise ValueError(
                    f"Location master validation failed: signature override {character_id}/{node_id}: {row}"
                )

        for group_id, variant_options in variant.choices.items():
            master, base_group = group_to_master[group_id]
            for base_option in base_group.options:
                variant_option = variant_options[base_option.choice_id]
                reaction = variant_option.reactions[0]
                expected_reaction_id = _reaction_node_id(base_group.node_id, base_option.choice_id)
                option_row = conn.execute(
                    """
                    SELECT choice_text, response_node_id
                    FROM dialogue_options
                    WHERE version=? AND story_id=? AND step_no=1 AND character_id=?
                      AND choice_node_id=? AND choice_id=?
                    """,
                    (
                        version,
                        master.event_id,
                        character_id,
                        base_group.node_id,
                        base_option.choice_id,
                    ),
                ).fetchone()
                if option_row != (variant_option.text, expected_reaction_id):
                    raise ValueError(
                        f"Location master validation failed: option override "
                        f"{character_id}/{base_option.choice_id}: {option_row}"
                    )

                expected_kind, expected_ref = _resolve_location_reaction_speaker(
                    master.event_id,
                    character_id,
                    reaction.speaker,
                )
                reaction_row = conn.execute(
                    """
                    SELECT speaker_kind, speaker_ref, line_text, visual_mode
                    FROM dialogue_nodes
                    WHERE version=? AND story_id=? AND step_no=1 AND character_id=? AND node_id=?
                    """,
                    (version, master.event_id, character_id, expected_reaction_id),
                ).fetchone()
                if reaction_row != (expected_kind, expected_ref, reaction.text, "KEEP"):
                    raise ValueError(
                        f"Location master validation failed: reaction override "
                        f"{character_id}/{base_option.choice_id}: {reaction_row}"
                    )

    foreign_key_errors = conn.execute("PRAGMA foreign_key_check").fetchall()
    if foreign_key_errors:
        raise ValueError(f"Foreign key validation failed: {foreign_key_errors[:5]}")

    _validate_location_graphs(conn, version)


def seed_location_master(conn: sqlite3.Connection, version: str) -> None:
    ensure_version_and_characters(conn, version)
    masters = parse_all_location_masters()
    variants = parse_location_character_variants()
    validate_location_authoring(masters, variants)

    canonical_ids = {
        option.choice_id
        for master in masters.values()
        for group in master.choices.values()
        for option in group.options
    }
    parsed_choice_ids = {choice.choice_id for choice in parse_location_choices()}
    effect_ids = set(parse_location_effects())
    if len(canonical_ids) != EXPECTED_LOCATION_CHOICES:
        raise ValueError(
            f"Expected {EXPECTED_LOCATION_CHOICES} unique Location canonical choices, found {len(canonical_ids)}"
        )
    if canonical_ids != parsed_choice_ids or canonical_ids != effect_ids:
        raise ValueError(
            "Location canonical source mismatch; "
            f"dialogue-only={sorted(canonical_ids - parsed_choice_ids)}, "
            f"choice-only={sorted(parsed_choice_ids - canonical_ids)}, "
            f"effect-only={sorted(effect_ids - canonical_ids)}, "
            f"effect-missing={sorted(canonical_ids - effect_ids)}"
        )

    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA defer_foreign_keys = ON")
    conn.execute("BEGIN IMMEDIATE")
    try:
        seed_locations(conn, version)
        seed_location_speaker_and_role(conn, version)
        seed_story_structure(conn, version)
        seed_choices_and_effects(conn, version)
        seed_event_effects(conn, version)
        seed_location_dialogues(conn, version, masters, variants)
        validate_location_master(conn, version, masters, variants)
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
    option_count = conn.execute(
        f"SELECT COUNT(*) FROM dialogue_options WHERE version=? AND story_id IN ({event_placeholders})",
        params,
    ).fetchone()[0]
    print(f"database: {db_path.resolve()}")
    print(f"schema user_version: {conn.execute('PRAGMA user_version').fetchone()[0]}")
    print(f"gameDataVersion: {version}")
    print(f"Location stories: {story_count}")
    print(f"Location events: {event_count}")
    print(f"Location canonical choices: {choice_count}")
    print(f"Location choice effects: {effect_count}")
    print(f"Location dialogue sequences: {dialogue_count}")
    print(f"Location dialogue options: {option_count}")
    print("validation: OK")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed reviewed LUMIA Location Story master + 32-character dialogue into SQLite v4"
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
