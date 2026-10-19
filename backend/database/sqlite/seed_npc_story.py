#!/usr/bin/env python3
"""Seed reviewed NPC Story master + 32-character dialogue into LUMIA SQLite v4.

Scope:
- 3 NPC chains: NPC_GUIDE / NPC_WORK / NPC_LULU
- 12 events/steps
- 24 canonical choices + 64 choice effects
- 32 protagonists x 12 events = 384 dialogue_sequences
- 32 protagonists x 24 choices = 768 dialogue_options

The seed reads the reviewed Markdown sources directly so the database remains a
compiled copy of Git-managed content rather than a second hand-maintained script.

Example:
    python3 backend/database/sqlite/seed_npc_story.py \
        --migrate --version dev-dialogue-v1

Default DB:
    backend/database/sqlite/lumia-content.sqlite3
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
    Node,
    ChoiceGroup,
    CharacterVariant,
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
NPC_DIALOGUE_DIR = REPO_ROOT / "document" / "dialogue" / "npc"
NPC_CHARACTER_SET_DIR = NPC_DIALOGUE_DIR / "character_sets"
NPC_PRODUCTION = REPO_ROOT / "story" / "npc" / "NPC_STORY_PRODUCTION.md"
ACTOR_SUBSTITUTIONS = NPC_CHARACTER_SET_DIR / "ACTOR_SUBSTITUTIONS.md"

EXPECTED_CHARACTER_COUNT = 32
EXPECTED_NPC_STORIES = 3
EXPECTED_NPC_EVENTS = 12
EXPECTED_CHOICE_GROUPS_PER_CHARACTER = 12
EXPECTED_OPTIONS_PER_CHARACTER = 24
EXPECTED_CANONICAL_CHOICES = 24
EXPECTED_SECONDARY_HIDDEN_EFFECTS = 16
EXPECTED_CHOICE_EFFECTS = EXPECTED_CANONICAL_CHOICES * 2 + EXPECTED_SECONDARY_HIDDEN_EFFECTS
EXPECTED_DIALOGUE_SEQUENCES = 12 * 32
EXPECTED_DIALOGUE_OPTIONS = 24 * 32
EXPECTED_EVENT_EFFECTS = 12
EXPECTED_EVENT_CONDITIONS = 13  # 9 previous + 4 WORK class
EXPECTED_NPC_ROLES = 2
EXPECTED_NPC_ROLE_CANDIDATES = 4

TITLE_RE = re.compile(r"^# (NPC_(GUIDE|WORK|LULU)_(\d{2})) · (.+)$")
WEEK_RE = re.compile(r"^> 노출 시작: (\d+)주차")
ACTOR_PROTAGONIST_RE = re.compile(r"^# (CH\d{2}) protagonist\b")
ACTOR_EVENT_RE = re.compile(r"^## (NPC_(?:GUIDE|WORK)_\d{2})$")
ACTOR_LINE_RE = re.compile(r"^- `([^`]+)`: (.+)$")

LOCATION_ROWS = (
    (
        "CLK",
        "시계탑 광장 야외무대",
        "시계탑 광장과 공연 준비가 이루어지는 야외무대",
        "BG02_clocktower_plaza_1920x1080_011.png",
        2,
    ),
    (
        "WRK",
        "마도 공방",
        "룬 공학 수업과 작은 부품 작업이 이루어지는 공방",
        "BG08_magic_workshop_1920x1080_018.png",
        6,
    ),
    (
        "GH",
        "유리 온실·약초원",
        "허브와 여러 식물을 돌보는 유리 온실과 약초원",
        "BG06_glass_greenhouse_1920x1080_016.png",
        3,
    ),
)

STORY_DEFINITIONS = (
    {
        "story_id": "NPC_GUIDE",
        "display_name": "안내 준비를 함께하는 친구",
        "npc_ref": "ROLE:NPC_GUIDE_ACTOR",
        "location_id": "CLK",
        "sort_order": 1,
        "events": (
            (1, "NPC_GUIDE_01", "안내지 줍기", 4),
            (2, "NPC_GUIDE_02", "안내지 놓기", 15),
            (3, "NPC_GUIDE_03", "색 리본 고르기", 29),
            (4, "NPC_GUIDE_04", "남은 준비 돕기", 41),
        ),
    },
    {
        "story_id": "NPC_WORK",
        "display_name": "공방의 작은 물건을 살피는 친구",
        "npc_ref": "ROLE:NPC_WORK_ACTOR",
        "location_id": "WRK",
        "sort_order": 2,
        "events": (
            (1, "NPC_WORK_01", "부품 모으기", 8),
            (2, "NPC_WORK_02", "필요한 부품 찾기", 20),
            (3, "NPC_WORK_03", "도구 정돈하기", 32),
            (4, "NPC_WORK_04", "작업대 살펴보기", 44),
        ),
    },
    {
        "story_id": "NPC_LULU",
        "display_name": "루루의 작은 발견",
        "npc_ref": "NPC:LULU",
        "location_id": "GH",
        "sort_order": 3,
        "events": (
            (1, "NPC_LULU_01", "단추 발견", 12),
            (2, "NPC_LULU_02", "단추 보관하기", 25),
            (3, "NPC_LULU_03", "발견물 나누기", 35),
            (4, "NPC_LULU_04", "새 발견 함께 보기", 48),
        ),
    },
)

NPC_STORY_IDS = tuple(story["story_id"] for story in STORY_DEFINITIONS)
NPC_EVENT_IDS = tuple(
    event_id
    for story in STORY_DEFINITIONS
    for _, event_id, _, _ in story["events"]
)
EVENT_BINDINGS = {
    event_id: (story["story_id"], step_no, event_name, earliest_week)
    for story in STORY_DEFINITIONS
    for step_no, event_id, event_name, earliest_week in story["events"]
}
EVENT_TO_STORY = {event_id: values[0] for event_id, values in EVENT_BINDINGS.items()}

NPC_ROLE_DEFINITIONS = (
    {
        "role_id": "NPC_GUIDE_ACTOR",
        "assignment_order": 9,
        "candidates": ("CH16", "CH15"),  # 티아 -> protagonist 티아일 때 로빈
        "description": "GUIDE 체인 상대역. 기본 티아, 주인공이 티아면 로빈",
    },
    {
        "role_id": "NPC_WORK_ACTOR",
        "assignment_order": 10,
        "candidates": ("CH25", "CH26"),  # 렌 -> protagonist 렌일 때 다나
        "description": "WORK 체인 상대역. 기본 렌, 주인공이 렌이면 다나",
    },
)


@dataclass
class NpcEventMaster:
    event_id: str
    title: str
    chain: str
    step_no: int
    week: int
    content_ref: str
    nodes: list[Node]
    choices: dict[str, ChoiceGroup]


def dialogue_path(event_id: str) -> Path:
    return NPC_DIALOGUE_DIR / f"{event_id}.md"


def _speaker_from_npc_master(token: str) -> tuple[str, str | None]:
    token = token.strip()
    if token in {"PLAYER", "PLAYER(BASE)"}:
        return "PLAYER", None
    if token == "NPC_GUIDE_ACTOR":
        return "NPC", "ROLE:NPC_GUIDE_ACTOR"
    if token == "NPC_WORK_ACTOR":
        return "NPC", "ROLE:NPC_WORK_ACTOR"
    if token in {"LULU", "NPC:LULU"}:
        return "NPC", "NPC:LULU"
    if token.startswith("ROLE:"):
        return "NPC", token
    if token.startswith("NPC:"):
        return "NPC", token
    raise ValueError(f"Unsupported NPC Story speaker token: {token}")


def parse_npc_event_master(path: Path) -> NpcEventMaster:
    lines = path.read_text(encoding="utf-8").splitlines()
    title_match = next((TITLE_RE.match(line.strip()) for line in lines if TITLE_RE.match(line.strip())), None)
    week_match = next((WEEK_RE.match(line.strip()) for line in lines if WEEK_RE.match(line.strip())), None)
    if not title_match or not week_match:
        raise ValueError(f"Could not parse NPC event metadata: {path}")

    event_id = title_match.group(1)
    chain = title_match.group(2)
    step_no = int(title_match.group(3))
    title = title_match.group(4).strip()
    week = int(week_match.group(1))
    binding = EVENT_BINDINGS.get(event_id)
    if binding is None:
        raise ValueError(f"Unexpected NPC event id: {event_id}")
    expected_story, expected_step, expected_title, expected_week = binding
    if step_no != expected_step or week != expected_week or title != expected_title:
        raise ValueError(
            f"{event_id}: metadata mismatch; "
            f"got step={step_no}, week={week}, title={title!r}; "
            f"expected step={expected_step}, week={expected_week}, title={expected_title!r}"
        )
    if expected_story != f"NPC_{chain}":
        raise ValueError(f"{event_id}: chain/story mismatch")

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
                speaker_kind, speaker_ref = _speaker_from_npc_master(parts[1])
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
    group = next(iter(choices.values()))
    if len(group.options) != 2:
        raise ValueError(f"{event_id}: expected exactly two choice options")

    return NpcEventMaster(
        event_id=event_id,
        title=title,
        chain=chain,
        step_no=step_no,
        week=week,
        content_ref=path.relative_to(REPO_ROOT).as_posix(),
        nodes=nodes,
        choices=choices,
    )


def parse_all_npc_masters() -> dict[str, NpcEventMaster]:
    masters = {event_id: parse_npc_event_master(dialogue_path(event_id)) for event_id in NPC_EVENT_IDS}
    if len(masters) != EXPECTED_NPC_EVENTS:
        raise ValueError(f"Expected {EXPECTED_NPC_EVENTS} NPC masters, found {len(masters)}")
    return masters


def _parse_variant_choice_payload(payload: str) -> tuple[str, Reaction]:
    if " → " not in payload:
        raise ValueError(f"NPC Character Set option is missing inline reaction: {payload}")
    choice_part, reaction_part = payload.split(" → ", 1)
    if ": " not in reaction_part:
        raise ValueError(f"NPC Character Set reaction is malformed: {payload}")
    speaker, reaction_text = reaction_part.split(": ", 1)
    return _clean_inline(choice_part), Reaction(speaker.strip(), _clean_inline(reaction_text))


def parse_npc_character_variants() -> dict[str, CharacterVariant]:
    variants: dict[str, CharacterVariant] = {}
    for path in sorted(NPC_CHARACTER_SET_DIR.glob("SET_*.md")):
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
                    raise ValueError(f"Duplicate NPC character variant: {current.character_id}")
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
                    choice_text, reaction = _parse_variant_choice_payload(option_match.group(2))
                    current.choices[current_group][choice_id] = VariantOption(
                        text=choice_text,
                        reactions=[reaction],
                    )

    if len(variants) != EXPECTED_CHARACTER_COUNT:
        raise ValueError(f"Expected {EXPECTED_CHARACTER_COUNT} NPC character variants, found {len(variants)}")
    return variants


def parse_actor_substitutions() -> dict[str, dict[str, str]]:
    overrides: dict[str, dict[str, str]] = {}
    current_character: str | None = None
    current_event: str | None = None
    for raw in ACTOR_SUBSTITUTIONS.read_text(encoding="utf-8").splitlines():
        stripped = raw.strip()
        protagonist = ACTOR_PROTAGONIST_RE.match(stripped)
        if protagonist:
            current_character = protagonist.group(1)
            overrides.setdefault(current_character, {})
            current_event = None
            continue
        event = ACTOR_EVENT_RE.match(stripped)
        if event and current_character:
            current_event = event.group(1)
            continue
        line = ACTOR_LINE_RE.match(stripped)
        if line and current_character and current_event:
            node_id = line.group(1)
            if not node_id.startswith(current_event):
                raise ValueError(f"Actor substitution node/event mismatch: {node_id} / {current_event}")
            overrides[current_character][node_id] = _clean_inline(line.group(2))

    if set(overrides) != {"CH16", "CH25"}:
        raise ValueError(f"Expected actor substitutions for CH16/CH25, got {sorted(overrides)}")
    return overrides


def validate_authoring(
    masters: dict[str, NpcEventMaster],
    variants: dict[str, CharacterVariant],
    actor_substitutions: dict[str, dict[str, str]],
) -> None:
    groups = {
        group_id: (master, group)
        for master in masters.values()
        for group_id, group in master.choices.items()
    }
    if len(groups) != EXPECTED_CHOICE_GROUPS_PER_CHARACTER:
        raise ValueError(
            f"Expected {EXPECTED_CHOICE_GROUPS_PER_CHARACTER} NPC choice groups, found {len(groups)}"
        )

    all_node_ids = {node.node_id: node for master in masters.values() for node in master.nodes}
    player_node_ids = {
        node.node_id
        for master in masters.values()
        for node in master.nodes
        if node.node_kind == "LINE" and node.speaker_kind == "PLAYER"
    }

    for character_id, variant in sorted(variants.items()):
        if set(variant.choices) != set(groups):
            missing = sorted(set(groups) - set(variant.choices))
            extra = sorted(set(variant.choices) - set(groups))
            raise ValueError(f"{character_id}: NPC choice groups mismatch; missing={missing}, extra={extra}")
        invalid_signatures = set(variant.signatures) - player_node_ids
        if invalid_signatures:
            raise ValueError(f"{character_id}: signatures target non-PLAYER/unknown nodes {sorted(invalid_signatures)}")

        option_count = 0
        for group_id, (_, base_group) in groups.items():
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
            option_count += len(actual_ids)
        if option_count != EXPECTED_OPTIONS_PER_CHARACTER:
            raise ValueError(f"{character_id}: expected {EXPECTED_OPTIONS_PER_CHARACTER} options, got {option_count}")

    expected_ch16 = {
        node.node_id
        for event_id, master in masters.items()
        if event_id.startswith("NPC_GUIDE_")
        for node in master.nodes
        if node.node_kind == "LINE" and node.speaker_ref == "ROLE:NPC_GUIDE_ACTOR"
    }
    expected_ch25 = {
        node.node_id
        for event_id, master in masters.items()
        if event_id.startswith("NPC_WORK_")
        for node in master.nodes
        if node.node_kind == "LINE" and node.speaker_ref == "ROLE:NPC_WORK_ACTOR"
    }
    if set(actor_substitutions["CH16"]) != expected_ch16:
        raise ValueError(
            "CH16 GUIDE actor substitutions mismatch; "
            f"missing={sorted(expected_ch16 - set(actor_substitutions['CH16']))}, "
            f"extra={sorted(set(actor_substitutions['CH16']) - expected_ch16)}"
        )
    if set(actor_substitutions["CH25"]) != expected_ch25:
        raise ValueError(
            "CH25 WORK actor substitutions mismatch; "
            f"missing={sorted(expected_ch25 - set(actor_substitutions['CH25']))}, "
            f"extra={sorted(set(actor_substitutions['CH25']) - expected_ch25)}"
        )

    # Every substitution node must exist even if the actor-node sets above change.
    unknown_actor_nodes = {
        node_id
        for rows in actor_substitutions.values()
        for node_id in rows
        if node_id not in all_node_ids
    }
    if unknown_actor_nodes:
        raise ValueError(f"Unknown actor substitution nodes: {sorted(unknown_actor_nodes)}")


def parse_npc_choice_effects() -> dict[str, dict[str, object]]:
    effects: dict[str, dict[str, object]] = {}
    for raw in NPC_PRODUCTION.read_text(encoding="utf-8").splitlines():
        stripped = raw.strip()
        if not re.match(r"^\| `(GUIDE|WORK|LULU)_", stripped):
            continue
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        if len(cells) != 5:
            continue
        choice_id = cells[0].strip("`")
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
        choice_effects: list[tuple[str, str, int]] = [
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
            "meaning": cells[1],
            "effects": choice_effects,
        }

    if len(effects) != EXPECTED_CANONICAL_CHOICES:
        raise ValueError(f"Expected {EXPECTED_CANONICAL_CHOICES} NPC choice effects, found {len(effects)}")
    effect_count = sum(len(row["effects"]) for row in effects.values())
    if effect_count != EXPECTED_CHOICE_EFFECTS:
        raise ValueError(
            f"Expected {EXPECTED_CHOICE_EFFECTS} NPC choice effect rows, found {effect_count}"
        )
    secondary_count = sum(1 for row in effects.values() if len(row["effects"]) == 3)
    if secondary_count != EXPECTED_SECONDARY_HIDDEN_EFFECTS:
        raise ValueError(
            f"Expected {EXPECTED_SECONDARY_HIDDEN_EFFECTS} NPC secondary Hidden effects, "
            f"found {secondary_count}"
        )
    return effects


def validate_npc_choice_effect_balance(
    masters: dict[str, NpcEventMaster],
    effects: dict[str, dict[str, object]],
) -> None:
    for master in masters.values():
        for group in master.choices.values():
            hidden_totals: set[int] = set()
            for option in group.options:
                rows = effects[option.choice_id]["effects"]
                visible_rows = [row for row in rows if row[0] == "VISIBLE_STAT"]
                hidden_rows = [row for row in rows if row[0] == "HIDDEN_STAT"]
                if len(visible_rows) != 1 or len(hidden_rows) not in {1, 2}:
                    raise ValueError(
                        f"{option.choice_id}: expected 1 visible and 1~2 hidden effects, got {rows}"
                    )
                if len({row[1] for row in hidden_rows}) != len(hidden_rows):
                    raise ValueError(f"{option.choice_id}: duplicate Hidden targets are not allowed")
                hidden_totals.add(sum(row[2] for row in hidden_rows))
            if len(hidden_totals) != 1:
                raise ValueError(
                    f"{master.event_id}/{group.group_id}: choice options have unequal Hidden totals "
                    f"{sorted(hidden_totals)}"
                )


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
            f"NPC seed requires {EXPECTED_CHARACTER_COUNT} characters in version {version}; found {count}."
        )


def seed_locations(conn: sqlite3.Connection, version: str) -> None:
    for location_id, name, description, background, sort_order in LOCATION_ROWS:
        conn.execute(
            """
            INSERT INTO locations(
                version, location_id, display_name, description,
                background_asset_ref, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(version, location_id) DO NOTHING
            """,
            (version, location_id, name, description, background, sort_order),
        )


def seed_speaker_and_roles(conn: sqlite3.Connection, version: str) -> None:
    conn.execute(
        """
        INSERT INTO dialogue_speakers(
            version, speaker_id, display_name, speaker_type,
            portrait_asset_ref, description, sort_order
        ) VALUES (?, 'LULU', '루루', 'CREATURE', NULL,
                  'NPC Story의 작은 발견을 모으는 다람쥐. 최종 초상 asset은 별도 채택', 20)
        ON CONFLICT(version, speaker_id) DO UPDATE SET
            display_name=excluded.display_name,
            speaker_type=excluded.speaker_type,
            portrait_asset_ref=excluded.portrait_asset_ref,
            description=excluded.description,
            sort_order=excluded.sort_order
        """,
        (version,),
    )

    for role in NPC_ROLE_DEFINITIONS:
        occupied = conn.execute(
            """
            SELECT role_id FROM story_roles
            WHERE version=? AND assignment_order=? AND role_id<>?
            """,
            (version, role["assignment_order"], role["role_id"]),
        ).fetchone()
        if occupied:
            raise RuntimeError(
                f"storyCast assignment_order={role['assignment_order']} is already used by {occupied[0]}"
            )
        conn.execute(
            """
            INSERT INTO story_roles(
                version, role_id, role_scope, resolver_type,
                fixed_ref, exclude_player, assignment_order,
                prior_assignment_policy, description
            ) VALUES (?, ?, 'NPC', 'STORY_CAST', NULL, 1, ?, 'ALLOW', ?)
            ON CONFLICT(version, role_id) DO UPDATE SET
                role_scope=excluded.role_scope,
                resolver_type=excluded.resolver_type,
                fixed_ref=excluded.fixed_ref,
                exclude_player=excluded.exclude_player,
                assignment_order=excluded.assignment_order,
                prior_assignment_policy=excluded.prior_assignment_policy,
                description=excluded.description
            """,
            (version, role["role_id"], role["assignment_order"], role["description"]),
        )
        conn.execute(
            "DELETE FROM story_role_candidates WHERE version=? AND role_id=?",
            (version, role["role_id"]),
        )
        for priority, character_id in enumerate(role["candidates"], start=1):
            conn.execute(
                """
                INSERT INTO story_role_candidates(version, role_id, priority, character_id)
                VALUES (?, ?, ?, ?)
                """,
                (version, role["role_id"], priority, character_id),
            )


def seed_story_structure(conn: sqlite3.Connection, version: str, masters: dict[str, NpcEventMaster]) -> None:
    placeholders = ",".join("?" for _ in NPC_STORY_IDS)
    conn.execute(
        f"DELETE FROM stories WHERE version=? AND story_id IN ({placeholders})",
        (version, *NPC_STORY_IDS),
    )

    production_ref = "story/npc/NPC_STORY_PRODUCTION.md"
    for story in STORY_DEFINITIONS:
        conn.execute(
            """
            INSERT INTO stories(
                version, story_id, story_type, display_name,
                npc_id, location_id, content_ref, sort_order
            ) VALUES (?, ?, 'NPC', ?, ?, ?, ?, ?)
            """,
            (
                version,
                story["story_id"],
                story["display_name"],
                story["npc_ref"],
                story["location_id"],
                production_ref,
                story["sort_order"],
            ),
        )

        previous_event_id: str | None = None
        for step_no, event_id, event_name, earliest_week in story["events"]:
            master = masters[event_id]
            conn.execute(
                """
                INSERT INTO story_events(
                    version, event_id, story_id, display_name, scene_ref, content_ref
                ) VALUES (?, ?, ?, ?, NULL, ?)
                """,
                (version, event_id, story["story_id"], event_name, master.content_ref),
            )
            conn.execute(
                """
                INSERT INTO story_steps(
                    version, story_id, step_no, event_id,
                    earliest_week, display_order,
                    scheduled_month, scheduled_day, availability_rule_ref
                ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'NPC_WEIGHTED_CHAIN_V1')
                """,
                (version, story["story_id"], step_no, event_id, earliest_week, step_no),
            )
            conn.execute(
                """
                INSERT INTO story_event_rules(
                    version, event_id, trigger_phase, selection_policy,
                    repeat_policy, requires_location_match, limit_group,
                    cooldown_weeks, is_active
                ) VALUES (?, ?, 'AFTER_ACTIVITY', 'WEIGHTED',
                          'ONCE_PER_RUN', 1, 'SIDE_STORY', 0, 1)
                """,
                (version, event_id),
            )

            condition_order = 1
            if step_no > 1:
                if previous_event_id is None:
                    raise AssertionError(f"{event_id}: missing previous event")
                conn.execute(
                    """
                    INSERT INTO story_event_conditions(
                        version, event_id, condition_order, condition_type,
                        subject_ref, operator, value_json
                    ) VALUES (?, ?, ?, 'PREVIOUS_EVENT_COMPLETE', ?, 'EQ', 'true')
                    """,
                    (version, event_id, condition_order, previous_event_id),
                )
                condition_order += 1

            if story["story_id"] == "NPC_WORK":
                conn.execute(
                    """
                    INSERT INTO story_event_conditions(
                        version, event_id, condition_order, condition_type,
                        subject_ref, operator, value_json
                    ) VALUES (?, ?, ?, 'ACTIVITY_TYPE', 'activity.type', 'EQ', ?)
                    """,
                    (version, event_id, condition_order, json.dumps("CLASS", ensure_ascii=False)),
                )

            previous_event_id = event_id


def seed_choices_and_effects(
    conn: sqlite3.Connection,
    version: str,
    masters: dict[str, NpcEventMaster],
    effects: dict[str, dict[str, object]],
) -> None:
    canonical_count = 0
    for event_id in NPC_EVENT_IDS:
        master = masters[event_id]
        group = next(iter(master.choices.values()))
        for display_order, option in enumerate(group.options, start=1):
            effect_info = effects.get(option.choice_id)
            if effect_info is None:
                raise ValueError(f"Missing NPC effect definition for {option.choice_id}")
            conn.execute(
                """
                INSERT INTO story_choices(
                    version, event_id, choice_id, choice_text,
                    display_order, next_event_id, summary_text,
                    is_important, choice_group_id
                ) VALUES (?, ?, ?, ?, ?, NULL, ?, 0, ?)
                """,
                (
                    version,
                    event_id,
                    option.choice_id,
                    option.text,
                    display_order,
                    effect_info["meaning"],
                    group.group_id,
                ),
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
                        event_id,
                        option.choice_id,
                        effect_order,
                        effect_type,
                        target,
                        json.dumps(value, ensure_ascii=False),
                    ),
                )
            canonical_count += 1
    if canonical_count != EXPECTED_CANONICAL_CHOICES:
        raise ValueError(f"Expected {EXPECTED_CANONICAL_CHOICES} canonical choices, seeded {canonical_count}")


def seed_event_effects(conn: sqlite3.Connection, version: str) -> None:
    for story in STORY_DEFINITIONS:
        for step_no, event_id, _, _ in story["events"]:
            status = "COMPLETED" if step_no == 4 else "IN_PROGRESS"
            conn.execute(
                """
                INSERT INTO story_event_effects(
                    version, event_id, effect_order, apply_on,
                    effect_type, target, value_json
                ) VALUES (?, ?, 1, 'COMPLETE_OR_SKIP', 'STORY_PROGRESS', ?, ?)
                """,
                (
                    version,
                    event_id,
                    story["story_id"],
                    json.dumps({"step": step_no, "status": status}, ensure_ascii=False),
                ),
            )


def _reaction_node_id(choice_node_id: str, choice_id: str) -> str:
    return f"{choice_node_id}__{choice_id}__R01"


def _resolve_reaction_speaker(event_id: str, speaker_name: str) -> tuple[str, str]:
    name = speaker_name.strip()
    if event_id.startswith("NPC_GUIDE_"):
        if name not in {"GUIDE", "티아", "로빈"}:
            raise ValueError(f"{event_id}: unexpected GUIDE reaction speaker {name!r}")
        return "NPC", "ROLE:NPC_GUIDE_ACTOR"
    if event_id.startswith("NPC_WORK_"):
        if name not in {"WORK", "렌", "다나"}:
            raise ValueError(f"{event_id}: unexpected WORK reaction speaker {name!r}")
        return "NPC", "ROLE:NPC_WORK_ACTOR"
    if event_id.startswith("NPC_LULU_"):
        if name not in {"LULU", "루루"}:
            raise ValueError(f"{event_id}: unexpected LULU reaction speaker {name!r}")
        return "NPC", "NPC:LULU"
    raise ValueError(f"Unknown NPC event for reaction speaker: {event_id}")


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


def seed_dialogues(
    conn: sqlite3.Connection,
    version: str,
    masters: dict[str, NpcEventMaster],
    variants: dict[str, CharacterVariant],
    actor_substitutions: dict[str, dict[str, str]],
) -> None:
    for event_id in NPC_EVENT_IDS:
        master = masters[event_id]
        story_id = EVENT_TO_STORY[event_id]
        step_no = master.step_no
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

                line_override = None
                if character_id in actor_substitutions and node.node_id in actor_substitutions[character_id]:
                    line_override = actor_substitutions[character_id][node.node_id]
                elif node.node_id in variant.signatures:
                    line_override = variant.signatures[node.node_id]

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
                    speaker_kind, speaker_ref = _resolve_reaction_speaker(event_id, reaction.speaker)
                    conn.execute(
                        """
                        INSERT INTO dialogue_nodes(
                            version, story_id, step_no, character_id, node_id, node_kind,
                            line_mode, speaker_kind, speaker_ref, line_text, visual_mode,
                            image_target, image_action, image_asset_type, image_asset_ref, image_alt,
                            choice_group_id, choice_prompt, next_node_id
                        ) VALUES (?, ?, ?, ?, ?, 'LINE',
                                  'DIALOGUE', ?, ?, ?, 'SPEAKER',
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


def _validate_graphs(conn: sqlite3.Connection, version: str) -> None:
    placeholders = ",".join("?" for _ in NPC_STORY_IDS)
    params = (version, *NPC_STORY_IDS)
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
                if len(targets) != 2:
                    raise ValueError(
                        f"Invalid NPC choice branches: {story_id}/{step_no}/{character_id}/{node_id}"
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
                f"Unreachable NPC nodes: {story_id}/{step_no}/{character_id}: {orphaned[:5]}"
            )


def validate_npc_database(
    conn: sqlite3.Connection,
    version: str,
    actor_substitutions: dict[str, dict[str, str]],
) -> None:
    def scalar(sql: str, params: tuple[object, ...]) -> int:
        return int(conn.execute(sql, params).fetchone()[0])

    story_ph = ",".join("?" for _ in NPC_STORY_IDS)
    event_ph = ",".join("?" for _ in NPC_EVENT_IDS)
    story_params = (version, *NPC_STORY_IDS)
    event_params = (version, *NPC_EVENT_IDS)

    checks = (
        (
            "story count",
            f"SELECT COUNT(*) FROM stories WHERE version=? AND story_type='NPC' AND story_id IN ({story_ph})",
            story_params,
            EXPECTED_NPC_STORIES,
        ),
        (
            "event count",
            f"SELECT COUNT(*) FROM story_events WHERE version=? AND event_id IN ({event_ph})",
            event_params,
            EXPECTED_NPC_EVENTS,
        ),
        (
            "step count",
            f"SELECT COUNT(*) FROM story_steps WHERE version=? AND event_id IN ({event_ph})",
            event_params,
            EXPECTED_NPC_EVENTS,
        ),
        (
            "event rule count",
            f"SELECT COUNT(*) FROM story_event_rules WHERE version=? AND event_id IN ({event_ph})",
            event_params,
            EXPECTED_NPC_EVENTS,
        ),
        (
            "event condition count",
            f"SELECT COUNT(*) FROM story_event_conditions WHERE version=? AND event_id IN ({event_ph})",
            event_params,
            EXPECTED_EVENT_CONDITIONS,
        ),
        (
            "canonical choice count",
            f"SELECT COUNT(*) FROM story_choices WHERE version=? AND event_id IN ({event_ph})",
            event_params,
            EXPECTED_CANONICAL_CHOICES,
        ),
        (
            "choice effect count",
            f"SELECT COUNT(*) FROM story_choice_effects WHERE version=? AND event_id IN ({event_ph})",
            event_params,
            EXPECTED_CHOICE_EFFECTS,
        ),
        (
            "event effect count",
            f"SELECT COUNT(*) FROM story_event_effects WHERE version=? AND event_id IN ({event_ph})",
            event_params,
            EXPECTED_EVENT_EFFECTS,
        ),
        (
            "dialogue sequence count",
            f"SELECT COUNT(*) FROM dialogue_sequences WHERE version=? AND story_id IN ({story_ph})",
            story_params,
            EXPECTED_DIALOGUE_SEQUENCES,
        ),
        (
            "dialogue option count",
            f"SELECT COUNT(*) FROM dialogue_options WHERE version=? AND story_id IN ({story_ph})",
            story_params,
            EXPECTED_DIALOGUE_OPTIONS,
        ),
    )
    for label, sql, params, expected in checks:
        actual = scalar(sql, params)
        if actual != expected:
            raise ValueError(f"NPC DB validation failed: {label}: expected {expected}, got {actual}")

    if scalar(
        "SELECT COUNT(*) FROM story_roles WHERE version=? AND role_scope='NPC' AND role_id IN ('NPC_GUIDE_ACTOR','NPC_WORK_ACTOR')",
        (version,),
    ) != EXPECTED_NPC_ROLES:
        raise ValueError("NPC DB validation failed: NPC role count")
    if scalar(
        "SELECT COUNT(*) FROM story_role_candidates WHERE version=? AND role_id IN ('NPC_GUIDE_ACTOR','NPC_WORK_ACTOR')",
        (version,),
    ) != EXPECTED_NPC_ROLE_CANDIDATES:
        raise ValueError("NPC DB validation failed: NPC role candidate count")
    if scalar(
        "SELECT COUNT(*) FROM dialogue_speakers WHERE version=? AND speaker_id='LULU'",
        (version,),
    ) != 1:
        raise ValueError("NPC DB validation failed: LULU speaker")

    role_rows = conn.execute(
        """
        SELECT sr.role_id, sr.assignment_order, src.priority, src.character_id
        FROM story_roles sr
        JOIN story_role_candidates src
          ON src.version=sr.version AND src.role_id=sr.role_id
        WHERE sr.version=? AND sr.role_id IN ('NPC_GUIDE_ACTOR','NPC_WORK_ACTOR')
        ORDER BY sr.assignment_order, src.priority
        """,
        (version,),
    ).fetchall()
    expected_roles = [
        ("NPC_GUIDE_ACTOR", 9, 1, "CH16"),
        ("NPC_GUIDE_ACTOR", 9, 2, "CH15"),
        ("NPC_WORK_ACTOR", 10, 1, "CH25"),
        ("NPC_WORK_ACTOR", 10, 2, "CH26"),
    ]
    if role_rows != expected_roles:
        raise ValueError(f"NPC DB validation failed: actor candidates {role_rows}")

    bad_rules = conn.execute(
        f"""
        SELECT event_id FROM story_event_rules
        WHERE version=? AND event_id IN ({event_ph})
          AND NOT (
            trigger_phase='AFTER_ACTIVITY'
            AND selection_policy='WEIGHTED'
            AND repeat_policy='ONCE_PER_RUN'
            AND requires_location_match=1
            AND limit_group='SIDE_STORY'
            AND is_active=1
          )
        """,
        event_params,
    ).fetchall()
    if bad_rules:
        raise ValueError(f"NPC DB validation failed: event rules {bad_rules}")

    per_character = dict(
        conn.execute(
            f"""
            SELECT character_id, COUNT(*)
            FROM dialogue_sequences
            WHERE version=? AND story_id IN ({story_ph})
            GROUP BY character_id
            """,
            story_params,
        ).fetchall()
    )
    if len(per_character) != EXPECTED_CHARACTER_COUNT:
        raise ValueError("NPC DB validation failed: sequence character coverage")
    for character_id, count in sorted(per_character.items()):
        if count != EXPECTED_NPC_EVENTS:
            raise ValueError(f"{character_id}: expected 12 NPC sequences, got {count}")

    choice_nodes = dict(
        conn.execute(
            f"""
            SELECT character_id, COUNT(*)
            FROM dialogue_nodes
            WHERE version=? AND story_id IN ({story_ph}) AND node_kind='CHOICE'
            GROUP BY character_id
            """,
            story_params,
        ).fetchall()
    )
    option_counts = dict(
        conn.execute(
            f"""
            SELECT character_id, COUNT(*)
            FROM dialogue_options
            WHERE version=? AND story_id IN ({story_ph})
            GROUP BY character_id
            """,
            story_params,
        ).fetchall()
    )
    for character_id in sorted(per_character):
        if choice_nodes.get(character_id) != EXPECTED_CHOICE_GROUPS_PER_CHARACTER:
            raise ValueError(
                f"{character_id}: expected {EXPECTED_CHOICE_GROUPS_PER_CHARACTER} NPC choice nodes, "
                f"got {choice_nodes.get(character_id)}"
            )
        if option_counts.get(character_id) != EXPECTED_OPTIONS_PER_CHARACTER:
            raise ValueError(
                f"{character_id}: expected {EXPECTED_OPTIONS_PER_CHARACTER} NPC options, "
                f"got {option_counts.get(character_id)}"
            )

    unresolved_roles = conn.execute(
        f"""
        SELECT DISTINCT dn.speaker_ref
        FROM dialogue_nodes dn
        LEFT JOIN story_roles sr
          ON sr.version=dn.version AND sr.role_id=substr(dn.speaker_ref, 6)
        WHERE dn.version=? AND dn.story_id IN ({story_ph})
          AND dn.speaker_ref LIKE 'ROLE:%' AND sr.role_id IS NULL
        """,
        story_params,
    ).fetchall()
    if unresolved_roles:
        raise ValueError(f"NPC DB validation failed: unresolved roles {unresolved_roles}")

    unresolved_npcs = conn.execute(
        f"""
        SELECT DISTINCT dn.speaker_ref
        FROM dialogue_nodes dn
        LEFT JOIN dialogue_speakers ds
          ON ds.version=dn.version AND ds.speaker_id=substr(dn.speaker_ref, 5)
        WHERE dn.version=? AND dn.story_id IN ({story_ph})
          AND dn.speaker_ref LIKE 'NPC:%' AND ds.speaker_id IS NULL
        """,
        story_params,
    ).fetchall()
    if unresolved_npcs:
        raise ValueError(f"NPC DB validation failed: unresolved NPC speakers {unresolved_npcs}")

    # Verify the collision-specific full actor lines really reached the compiled DB.
    for character_id, expected_lines in actor_substitutions.items():
        for node_id, expected_text in expected_lines.items():
            row = conn.execute(
                f"""
                SELECT line_text
                FROM dialogue_nodes
                WHERE version=? AND character_id=? AND node_id=?
                  AND story_id IN ({story_ph})
                """,
                (version, character_id, node_id, *NPC_STORY_IDS),
            ).fetchone()
            if row is None or row[0] != expected_text:
                raise ValueError(
                    f"NPC DB validation failed: actor override {character_id}/{node_id}: {row}"
                )

    foreign_key_errors = conn.execute("PRAGMA foreign_key_check").fetchall()
    if foreign_key_errors:
        raise ValueError(f"Foreign key validation failed: {foreign_key_errors[:5]}")

    _validate_graphs(conn, version)


def seed_npc_story(conn: sqlite3.Connection, version: str) -> None:
    ensure_version_and_characters(conn, version)
    masters = parse_all_npc_masters()
    variants = parse_npc_character_variants()
    actor_substitutions = parse_actor_substitutions()
    validate_authoring(masters, variants, actor_substitutions)
    effects = parse_npc_choice_effects()
    validate_npc_choice_effect_balance(masters, effects)

    canonical_ids = {
        option.choice_id
        for master in masters.values()
        for group in master.choices.values()
        for option in group.options
    }
    if len(canonical_ids) != EXPECTED_CANONICAL_CHOICES:
        raise ValueError(
            f"Expected {EXPECTED_CANONICAL_CHOICES} unique NPC canonical choices, found {len(canonical_ids)}"
        )
    if canonical_ids != set(effects):
        raise ValueError(
            f"NPC canonical/effect mismatch; missing={sorted(canonical_ids - set(effects))}, "
            f"extra={sorted(set(effects) - canonical_ids)}"
        )

    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA defer_foreign_keys = ON")
    conn.execute("BEGIN IMMEDIATE")
    try:
        seed_locations(conn, version)
        seed_speaker_and_roles(conn, version)
        seed_story_structure(conn, version, masters)
        seed_choices_and_effects(conn, version, masters, effects)
        seed_event_effects(conn, version)
        seed_dialogues(conn, version, masters, variants, actor_substitutions)
        validate_npc_database(conn, version, actor_substitutions)
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def print_summary(conn: sqlite3.Connection, version: str, db_path: Path) -> None:
    story_ph = ",".join("?" for _ in NPC_STORY_IDS)
    event_ph = ",".join("?" for _ in NPC_EVENT_IDS)
    story_params = (version, *NPC_STORY_IDS)
    event_params = (version, *NPC_EVENT_IDS)

    def count(sql: str, params: tuple[object, ...]) -> int:
        return int(conn.execute(sql, params).fetchone()[0])

    print(f"database: {db_path.resolve()}")
    print(f"schema user_version: {conn.execute('PRAGMA user_version').fetchone()[0]}")
    print(f"gameDataVersion: {version}")
    print(
        "NPC stories: "
        + str(count(
            f"SELECT COUNT(*) FROM stories WHERE version=? AND story_type='NPC' AND story_id IN ({story_ph})",
            story_params,
        ))
    )
    print(
        "NPC events: "
        + str(count(
            f"SELECT COUNT(*) FROM story_events WHERE version=? AND event_id IN ({event_ph})",
            event_params,
        ))
    )
    print(
        "NPC canonical choices: "
        + str(count(
            f"SELECT COUNT(*) FROM story_choices WHERE version=? AND event_id IN ({event_ph})",
            event_params,
        ))
    )
    print(
        "NPC choice effects: "
        + str(count(
            f"SELECT COUNT(*) FROM story_choice_effects WHERE version=? AND event_id IN ({event_ph})",
            event_params,
        ))
    )
    print(
        "NPC dialogue sequences: "
        + str(count(
            f"SELECT COUNT(*) FROM dialogue_sequences WHERE version=? AND story_id IN ({story_ph})",
            story_params,
        ))
    )
    print(
        "NPC dialogue options: "
        + str(count(
            f"SELECT COUNT(*) FROM dialogue_options WHERE version=? AND story_id IN ({story_ph})",
            story_params,
        ))
    )
    print("validation: OK")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed reviewed LUMIA NPC Story master + 32-character dialogue into SQLite v4"
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
        seed_npc_story(conn, args.version)
        print_summary(conn, args.version, args.db)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
