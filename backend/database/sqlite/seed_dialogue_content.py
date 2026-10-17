#!/usr/bin/env python3
"""Build/seed LUMIA dialogue master data into SQLite.

Current scope: Main Story MS01~MS06.

The loader deliberately reads the reviewed Markdown sources instead of duplicating
32 character variants into a hand-maintained SQL file. Main/NPC/Location share
the same physical tables; future loaders can add NPC/Location sources without a
schema change.

Examples:
    python backend/database/sqlite/seed_dialogue_content.py \
        --migrate --version dev-dialogue-v1

    python backend/database/sqlite/seed_dialogue_content.py \
        --version dev-dialogue-v1 --activate

Default DB path:
    backend/database/sqlite/lumia-content.sqlite3
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[3]
SQLITE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = SQLITE_DIR / "lumia-content.sqlite3"
MAIN_DIR = REPO_ROOT / "document" / "dialogue" / "main"
CHARACTER_SET_DIR = MAIN_DIR / "character_sets"
CHARACTER_SOURCE = REPO_ROOT / "document" / "03_CHARACTERS.md"
MAIN_PRODUCTION = REPO_ROOT / "story" / "main" / "MAIN_STORY_PRODUCTION.md"

MAIN_IDS = ("MS01", "MS02", "MS03", "MS04", "MS05", "MS06")
EXPECTED_CHARACTER_COUNT = 32
EXPECTED_MAIN_SEQUENCE_COUNT = 6 * 32
EXPECTED_CHOICE_GROUPS_PER_CHARACTER = 18
EXPECTED_OPTIONS_PER_CHARACTER = 40
EXPECTED_CANONICAL_CHOICES = 40
EXPECTED_MAIN_DYNAMIC_ROLES = 7
EXPECTED_MAIN_ROLE_CANDIDATES = 7 * 8

NON_PLAYER_SPEAKERS = (
    {
        "speaker_id": "VALENTINUS",
        "display_name": "발렌티누스",
        "speaker_type": "NPC",
        "portrait_asset_ref": None,
        "description": "메인 스토리의 고정 교사·조력자",
        "sort_order": 1,
    },
    {
        "speaker_id": "SHADOW",
        "display_name": "그림자",
        "speaker_type": "TEXT_ONLY",
        "portrait_asset_ref": None,
        "description": "MS04에서 일반 대화 UI로 말하는 그림자",
        "sort_order": 2,
    },
)

VISIBLE_STAT_MAP = {
    "지식": "knowledge",
    "표현력": "expression",
    "솜씨": "skill",
    "탐험": "exploration",
    "마법": "magic",
}

HIDDEN_STAT_MAP = {
    "공감": "empathy",
    "책임": "responsibility",
    "호기심": "curiosity",
    "용기": "courage",
    "협력": "cooperation",
    "독립성": "independence",
    "신중함": "caution",
    "솔직함": "honesty",
}

# Current approved protagonist/storyCast collision replacements. We still store
# ROLE:* in DB; this set is only used to recognize the reviewed reaction speaker.
ROLE_NAMES_BY_STORY = {
    "MS01": {
        "MAIN_GUIDE_STUDENT": {"티아", "로빈"},
        "MAIN_TEACHER": {"발렌티누스"},
    },
    "MS02": {
        "MAIN_GREENHOUSE_STUDENT": {"리네", "요한"},
        "MAIN_GREENHOUSE_TRAPPED": {"아이리스", "로빈"},
    },
    "MS03": {
        "MAIN_CLOCK_STUDENT": {"다나", "시온"},
        "MAIN_TEACHER": {"발렌티누스"},
    },
    "MS04": {
        "MAIN_TRAINING_STUDENT": {"카일", "로렌"},
        "MAIN_TRAINING_WITNESS": {"렌", "제나"},
    },
    "MS05": {
        "MAIN_FESTIVAL_LEAD": {"미리엄", "리코"},
        "MAIN_GREENHOUSE_STUDENT": {"리네", "요한", "온실 친구"},
        "MAIN_CLOCK_STUDENT": {"다나", "시온", "시계탑 친구"},
        "MAIN_TRAINING_STUDENT": {"카일", "로렌", "수련장 친구"},
        "MAIN_TEACHER": {"발렌티누스"},
    },
    "MS06": {
        "MAIN_GREENHOUSE_STUDENT": {"리네", "요한", "온실 친구"},
        "MAIN_CLOCK_STUDENT": {"다나", "시온", "시계탑 친구"},
        "MAIN_TRAINING_STUDENT": {"카일", "로렌", "수련장 친구"},
    },
}

MASTER_NODE_RE = re.compile(r"^\*\*([A-Z0-9_]+) · (.+?)\*\*\s*$")
CHOICE_OPTION_RE = re.compile(r"^- `([^`]+)` — (.+)$")
REACTION_RE = re.compile(r"^- reaction / ([^:]+): (.+)$")
CHARACTER_HEADER_RE = re.compile(r"^# (CH\d{2})\s+(.+)$")
VARIANT_GROUP_RE = re.compile(r"^### `([^`]+)`\s*$")
VARIANT_SIGNATURE_RE = re.compile(r"^- `([^`]+)`: (.+)$")
DATE_RE = re.compile(r"> 날짜: (\d{1,2})월 (\d{1,2})일 · (\d{1,2})주차")
TITLE_RE = re.compile(r"^# (MS\d{2}) · (.+)$")


@dataclass
class Reaction:
    speaker: str
    text: str


@dataclass
class ChoiceOption:
    choice_id: str
    text: str
    reactions: list[Reaction] = field(default_factory=list)


@dataclass
class ChoiceGroup:
    node_id: str
    group_id: str
    options: list[ChoiceOption]


@dataclass
class Node:
    node_id: str
    node_kind: str
    line_mode: str | None = None
    speaker_kind: str | None = None
    speaker_ref: str | None = None
    line_text: str | None = None
    visual_mode: str | None = None
    image_target: str | None = None
    image_action: str | None = None
    image_asset_type: str | None = None
    image_asset_ref: str | None = None
    image_alt: str | None = None
    choice_group_id: str | None = None
    choice_prompt: str | None = None


@dataclass
class StoryMaster:
    story_id: str
    title: str
    week: int
    month: int
    day: int
    content_ref: str
    nodes: list[Node]
    choices: dict[str, ChoiceGroup]


@dataclass
class VariantOption:
    text: str
    reactions: list[Reaction] = field(default_factory=list)


@dataclass
class CharacterVariant:
    character_id: str
    display_name: str
    signatures: dict[str, str] = field(default_factory=dict)
    choices: dict[str, dict[str, VariantOption]] = field(default_factory=dict)


def _strip_quotes(value: str) -> str:
    value = value.strip()
    pairs = (("“", "”"), ('"', '"'), ("‘", "’"), ("'", "'"))
    for left, right in pairs:
        if value.startswith(left) and value.endswith(right) and len(value) >= 2:
            return value[len(left) : -len(right)].strip()
    return value


def _clean_inline(value: str) -> str:
    return _strip_quotes(value.strip().rstrip())


def _next_nonempty(lines: list[str], start: int) -> tuple[int, str] | tuple[None, None]:
    for index in range(start, len(lines)):
        text = lines[index].strip()
        if text:
            return index, text
    return None, None


def _speaker_from_master(token: str) -> tuple[str, str | None]:
    token = token.strip()
    if token in {"PLAYER", "PLAYER(BASE)"}:
        return "PLAYER", None
    if token.startswith("MAIN_"):
        return "NPC", f"ROLE:{token}"
    if token == "SHADOW":
        return "NPC", "NPC:SHADOW"
    return "NPC", f"NPC:{token}"


def _parse_choice_block(lines: list[str], header_index: int, node_id: str, group_id: str) -> ChoiceGroup:
    options: list[ChoiceOption] = []
    current: ChoiceOption | None = None
    index = header_index + 1
    while index < len(lines):
        stripped = lines[index].strip()
        if index != header_index + 1 and MASTER_NODE_RE.match(stripped):
            break
        if stripped == "---":
            break
        option_match = CHOICE_OPTION_RE.match(stripped)
        if option_match:
            current = ChoiceOption(option_match.group(1), _clean_inline(option_match.group(2)))
            options.append(current)
            index += 1
            continue
        reaction_match = REACTION_RE.match(stripped)
        if reaction_match and current is not None:
            current.reactions.append(
                Reaction(reaction_match.group(1).strip(), _clean_inline(reaction_match.group(2)))
            )
        index += 1
    if len(options) < 2:
        raise ValueError(f"{node_id}: choice node must contain at least two options")
    return ChoiceGroup(node_id=node_id, group_id=group_id, options=options)


def parse_story_master(path: Path) -> StoryMaster:
    lines = path.read_text(encoding="utf-8").splitlines()
    title_match = next((TITLE_RE.match(line.strip()) for line in lines if TITLE_RE.match(line.strip())), None)
    date_match = next((DATE_RE.search(line) for line in lines if DATE_RE.search(line)), None)
    if not title_match or not date_match:
        raise ValueError(f"Could not parse story metadata: {path}")

    story_id, title = title_match.group(1), title_match.group(2).strip()
    month, day, week = map(int, date_match.groups())
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
                speaker_kind, speaker_ref = _speaker_from_master(parts[1])
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

    relative_ref = path.relative_to(REPO_ROOT).as_posix()
    return StoryMaster(story_id, title, week, month, day, relative_ref, nodes, choices)


def parse_all_story_masters() -> dict[str, StoryMaster]:
    masters: dict[str, StoryMaster] = {}
    for story_id in MAIN_IDS:
        master = parse_story_master(MAIN_DIR / f"{story_id}.md")
        if master.story_id != story_id:
            raise ValueError(f"Story id mismatch in {story_id}.md")
        masters[story_id] = master
    return masters


def _parse_inline_variant_option(payload: str) -> tuple[str, Reaction | None]:
    if " / " not in payload:
        return _clean_inline(payload), None
    choice_part, reaction_part = payload.rsplit(" / ", 1)
    if ": " not in reaction_part:
        return _clean_inline(payload), None
    speaker, reaction_text = reaction_part.split(": ", 1)
    return _clean_inline(choice_part), Reaction(speaker.strip(), _clean_inline(reaction_text))


def parse_character_variants() -> dict[str, CharacterVariant]:
    variants: dict[str, CharacterVariant] = {}
    set_files = sorted(CHARACTER_SET_DIR.glob("SET_*.md"))
    for path in set_files:
        lines = path.read_text(encoding="utf-8").splitlines()
        current: CharacterVariant | None = None
        mode: str | None = None
        current_group: str | None = None
        last_option_alias: str | None = None

        for raw in lines:
            stripped = raw.strip()
            header = CHARACTER_HEADER_RE.match(stripped)
            if header:
                current = CharacterVariant(header.group(1), header.group(2).strip())
                if current.character_id in variants:
                    raise ValueError(f"Duplicate character variant: {current.character_id}")
                variants[current.character_id] = current
                mode = None
                current_group = None
                last_option_alias = None
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
                last_option_alias = None
                continue

            if mode == "signature":
                signature_match = VARIANT_SIGNATURE_RE.match(stripped)
                if signature_match:
                    current.signatures[signature_match.group(1)] = _clean_inline(signature_match.group(2))
                continue

            if mode == "choice" and current_group:
                option_match = VARIANT_SIGNATURE_RE.match(stripped)
                if option_match:
                    alias = option_match.group(1)
                    choice_text, inline_reaction = _parse_inline_variant_option(option_match.group(2))
                    option = VariantOption(choice_text)
                    if inline_reaction:
                        option.reactions.append(inline_reaction)
                    current.choices[current_group][alias] = option
                    last_option_alias = alias
                    continue
                reaction_match = REACTION_RE.match(stripped)
                if reaction_match and last_option_alias:
                    current.choices[current_group][last_option_alias].reactions.append(
                        Reaction(reaction_match.group(1).strip(), _clean_inline(reaction_match.group(2)))
                    )

    if len(variants) != EXPECTED_CHARACTER_COUNT:
        raise ValueError(f"Expected {EXPECTED_CHARACTER_COUNT} character variants, found {len(variants)}")
    return variants


def parse_characters() -> dict[str, dict[str, object]]:
    rows: dict[str, dict[str, object]] = {}
    text = CHARACTER_SOURCE.read_text(encoding="utf-8")
    for raw in text.splitlines():
        if not raw.startswith("| CH"):
            continue
        parts = [part.strip() for part in raw.split("|")]
        if len(parts) < 15:
            continue
        character_id = parts[1]
        if not re.fullmatch(r"CH\d{2}", character_id):
            continue
        name = parts[2]
        description = parts[5]
        initial_state = parts[6]
        modifier_text = parts[7]

        modifiers = {key: 0 for key in VISIBLE_STAT_MAP.values()}
        if modifier_text != "없음":
            for piece in modifier_text.split("/"):
                mod_match = re.search(r"(지식|표현력|솜씨|탐험|마법)\s*([+-]\d+)", piece.strip())
                if not mod_match:
                    raise ValueError(f"Could not parse modifier for {character_id}: {modifier_text}")
                modifiers[VISIBLE_STAT_MAP[mod_match.group(1)]] = int(mod_match.group(2))

        full_match = re.search(r'src="\.\./([^\"]+)"', parts[8])
        portrait_match = re.search(r'src="\.\./([^\"]+)"', parts[9])
        if not full_match or not portrait_match:
            raise ValueError(f"Could not parse character assets for {character_id}")

        rows[character_id] = {
            "character_id": character_id,
            "display_name": name,
            "description": description,
            "portrait_asset_ref": portrait_match.group(1),
            "full_body_asset_ref": full_match.group(1),
            "is_initially_unlocked": 1 if "기본 오픈" in initial_state else 0,
            "knowledge_modifier": modifiers["knowledge"],
            "expression_modifier": modifiers["expression"],
            "skill_modifier": modifiers["skill"],
            "exploration_modifier": modifiers["exploration"],
            "magic_modifier": modifiers["magic"],
            "sort_order": int(character_id[2:]),
        }

    if len(rows) != EXPECTED_CHARACTER_COUNT:
        raise ValueError(f"Expected {EXPECTED_CHARACTER_COUNT} character rows, found {len(rows)}")
    return rows


def canonical_choice_id(alias: str, canonical_ids: Iterable[str]) -> str:
    canonical_ids = list(canonical_ids)
    if alias in canonical_ids:
        return alias
    suffix = f"_{alias}"
    matches = [choice_id for choice_id in canonical_ids if choice_id.endswith(suffix)]
    if len(matches) == 1:
        return matches[0]
    raise ValueError(f"Cannot resolve choice alias {alias!r}; candidates={canonical_ids}")


def validate_variants(masters: dict[str, StoryMaster], variants: dict[str, CharacterVariant]) -> None:
    expected_groups = {
        group_id: group
        for master in masters.values()
        for group_id, group in master.choices.items()
    }
    if len(expected_groups) != EXPECTED_CHOICE_GROUPS_PER_CHARACTER:
        raise ValueError(
            f"Expected {EXPECTED_CHOICE_GROUPS_PER_CHARACTER} Main choice groups, found {len(expected_groups)}"
        )

    for character_id, variant in sorted(variants.items()):
        missing_groups = set(expected_groups) - set(variant.choices)
        extra_groups = set(variant.choices) - set(expected_groups)
        if missing_groups or extra_groups:
            raise ValueError(
                f"{character_id}: choice groups mismatch; missing={sorted(missing_groups)}, extra={sorted(extra_groups)}"
            )
        option_count = 0
        for group_id, base_group in expected_groups.items():
            resolved: set[str] = set()
            canonical_ids = [option.choice_id for option in base_group.options]
            for alias, option in variant.choices[group_id].items():
                choice_id = canonical_choice_id(alias, canonical_ids)
                if choice_id in resolved:
                    raise ValueError(f"{character_id}/{group_id}: duplicate canonical choice {choice_id}")
                resolved.add(choice_id)
                if not option.text:
                    raise ValueError(f"{character_id}/{group_id}/{choice_id}: empty choice text")
                if not option.reactions:
                    raise ValueError(f"{character_id}/{group_id}/{choice_id}: missing branch reaction")
            if resolved != set(canonical_ids):
                raise ValueError(
                    f"{character_id}/{group_id}: choices mismatch; expected={canonical_ids}, resolved={sorted(resolved)}"
                )
            option_count += len(resolved)
        if option_count != EXPECTED_OPTIONS_PER_CHARACTER:
            raise ValueError(f"{character_id}: expected {EXPECTED_OPTIONS_PER_CHARACTER} options, found {option_count}")


def parse_choice_effects() -> dict[str, list[tuple[str, str, int]]]:
    effects: dict[str, list[tuple[str, str, int]]] = {}
    for raw in MAIN_PRODUCTION.read_text(encoding="utf-8").splitlines():
        stripped = raw.strip()
        if not stripped.startswith("| `MS"):
            continue
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        if len(cells) != 4:
            continue
        choice_cell = cells[0].strip("`")
        visible_cell = cells[2]
        hidden_cell = cells[3]
        visible_match = re.fullmatch(r"(지식|표현력|솜씨|탐험|마법) \+(\d+)", visible_cell)
        hidden_match = re.fullmatch(r"(공감|책임|호기심|용기|협력|독립성|신중함|솔직함) \+(\d+)", hidden_cell)
        if not visible_match or not hidden_match:
            continue

        choice_ids = [choice_cell]
        if "/" in choice_cell:
            first, *suffixes = choice_cell.split("/")
            choice_ids = [first]
            base_prefix = first[:-1]
            choice_ids.extend(base_prefix + suffix for suffix in suffixes)

        for choice_id in choice_ids:
            effects[choice_id] = [
                ("VISIBLE_STAT", VISIBLE_STAT_MAP[visible_match.group(1)], int(visible_match.group(2))),
                ("HIDDEN_STAT", HIDDEN_STAT_MAP[hidden_match.group(1)], int(hidden_match.group(2))),
            ]
    return effects


def parse_main_role_candidates() -> dict[str, list[str]]:
    roles: dict[str, list[str]] = {}
    for raw in MAIN_PRODUCTION.read_text(encoding="utf-8").splitlines():
        stripped = raw.strip()
        if not stripped.startswith("| `MAIN_"):
            continue
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        if len(cells) != 3:
            continue
        role_id = cells[0].strip("`")
        candidate_ids = re.findall(r"\((CH\d{2})\)", cells[2])
        if candidate_ids:
            roles[role_id] = candidate_ids

    if len(roles) != EXPECTED_MAIN_DYNAMIC_ROLES:
        raise ValueError(
            f"Expected {EXPECTED_MAIN_DYNAMIC_ROLES} dynamic Main roles, found {len(roles)}"
        )
    total_candidates = sum(len(candidates) for candidates in roles.values())
    if total_candidates != EXPECTED_MAIN_ROLE_CANDIDATES:
        raise ValueError(
            "Main role candidate count mismatch: "
            f"expected {EXPECTED_MAIN_ROLE_CANDIDATES}, found {total_candidates}"
        )
    for role_id, candidates in roles.items():
        if len(candidates) != 8 or len(set(candidates)) != 8:
            raise ValueError(f"{role_id}: expected 8 unique ordered candidates, got {candidates}")
    return roles


def validate_main_role_assignability(
    roles: dict[str, list[str]],
    characters: dict[str, dict[str, object]],
) -> None:
    known_characters = set(characters)
    for role_id, candidates in roles.items():
        unknown = set(candidates) - known_characters
        if unknown:
            raise ValueError(f"{role_id}: unknown character candidates {sorted(unknown)}")

    # Reproduce the production rule: roles are assigned in document order,
    # excluding the protagonist and students already used by an earlier core role.
    for protagonist in sorted(known_characters):
        assigned: set[str] = set()
        for role_id, candidates in roles.items():
            selected = next(
                (
                    character_id
                    for character_id in candidates
                    if character_id != protagonist and character_id not in assigned
                ),
                None,
            )
            if selected is None:
                raise ValueError(
                    f"{protagonist}: no distinct candidate available for {role_id}; "
                    f"already assigned={sorted(assigned)}"
                )
            assigned.add(selected)

        if len(assigned) != len(roles):
            raise ValueError(
                f"{protagonist}: expected {len(roles)} distinct Main roles, got {len(assigned)}"
            )


def resolve_variant_reaction_speaker(
    story_id: str,
    speaker_name: str,
    character_name_to_id: dict[str, str],
) -> tuple[str, str]:
    name = speaker_name.strip()
    if name in {"그림자", "SHADOW"}:
        return "NPC", "NPC:SHADOW"
    for role_id, names in ROLE_NAMES_BY_STORY.get(story_id, {}).items():
        if name in names:
            return "NPC", f"ROLE:{role_id}"
    character_id = character_name_to_id.get(name)
    if character_id:
        return "NPC", f"CHARACTER:{character_id}"
    return "NPC", f"NPC:{name}"


def _reaction_node_id(choice_node_id: str, choice_id: str, order: int) -> str:
    return f"{choice_node_id}__{choice_id}__R{order:02d}"


def _node_insert_tuple(
    version: str,
    story_id: str,
    character_id: str,
    node: Node,
    next_node_id: str | None,
    line_text_override: str | None = None,
) -> tuple[object, ...]:
    return (
        version,
        story_id,
        1,
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


def apply_migrations(conn: sqlite3.Connection) -> None:
    current = conn.execute("PRAGMA user_version").fetchone()[0]
    migrations = {
        1: SQLITE_DIR / "001_initial.sql",
        2: SQLITE_DIR / "002_dialogue_sequences.sql",
        3: SQLITE_DIR / "003_dialogue_runtime_content.sql",
        4: SQLITE_DIR / "004_story_event_rules.sql",
    }
    if current > 4:
        raise RuntimeError(f"Database schema is newer than this loader: user_version={current}")
    for target in range(current + 1, 5):
        conn.executescript(migrations[target].read_text(encoding="utf-8"))
    final = conn.execute("PRAGMA user_version").fetchone()[0]
    if final != 4:
        raise RuntimeError(f"Migration failed: expected user_version=4, got {final}")


def seed_main_story(conn: sqlite3.Connection, version: str, activate: bool) -> None:
    masters = parse_all_story_masters()
    variants = parse_character_variants()
    characters = parse_characters()
    main_role_candidates = parse_main_role_candidates()
    validate_main_role_assignability(main_role_candidates, characters)
    validate_variants(masters, variants)
    choice_effects = parse_choice_effects()

    all_canonical_choice_ids = {
        option.choice_id
        for master in masters.values()
        for group in master.choices.values()
        for option in group.options
    }
    if len(all_canonical_choice_ids) != EXPECTED_CANONICAL_CHOICES:
        raise ValueError(
            f"Expected {EXPECTED_CANONICAL_CHOICES} canonical Main choices, found {len(all_canonical_choice_ids)}"
        )
    missing_effects = all_canonical_choice_ids - set(choice_effects)
    if missing_effects:
        raise ValueError(f"Missing choice effects: {sorted(missing_effects)}")

    character_name_to_id = {
        row["display_name"]: character_id for character_id, row in characters.items()
    }

    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA defer_foreign_keys = ON")
    conn.execute("BEGIN IMMEDIATE")
    try:
        conn.execute(
            "INSERT INTO game_data_versions(version, installed_at_utc, is_active) VALUES (?, ?, 0) "
            "ON CONFLICT(version) DO NOTHING",
            (version, now),
        )

        for row in characters.values():
            conn.execute(
                """
                INSERT INTO characters(
                    version, character_id, display_name, description,
                    portrait_asset_ref, full_body_asset_ref, is_initially_unlocked,
                    knowledge_modifier, expression_modifier, skill_modifier,
                    exploration_modifier, magic_modifier, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(version, character_id) DO UPDATE SET
                    display_name=excluded.display_name,
                    description=excluded.description,
                    portrait_asset_ref=excluded.portrait_asset_ref,
                    full_body_asset_ref=excluded.full_body_asset_ref,
                    is_initially_unlocked=excluded.is_initially_unlocked,
                    knowledge_modifier=excluded.knowledge_modifier,
                    expression_modifier=excluded.expression_modifier,
                    skill_modifier=excluded.skill_modifier,
                    exploration_modifier=excluded.exploration_modifier,
                    magic_modifier=excluded.magic_modifier,
                    sort_order=excluded.sort_order
                """,
                (
                    version,
                    row["character_id"],
                    row["display_name"],
                    row["description"],
                    row["portrait_asset_ref"],
                    row["full_body_asset_ref"],
                    row["is_initially_unlocked"],
                    row["knowledge_modifier"],
                    row["expression_modifier"],
                    row["skill_modifier"],
                    row["exploration_modifier"],
                    row["magic_modifier"],
                    row["sort_order"],
                ),
            )

        for speaker in NON_PLAYER_SPEAKERS:
            conn.execute(
                """
                INSERT INTO dialogue_speakers(
                    version, speaker_id, display_name, speaker_type,
                    portrait_asset_ref, description, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(version, speaker_id) DO UPDATE SET
                    display_name=excluded.display_name,
                    speaker_type=excluded.speaker_type,
                    portrait_asset_ref=excluded.portrait_asset_ref,
                    description=excluded.description,
                    sort_order=excluded.sort_order
                """,
                (
                    version,
                    speaker["speaker_id"],
                    speaker["display_name"],
                    speaker["speaker_type"],
                    speaker["portrait_asset_ref"],
                    speaker["description"],
                    speaker["sort_order"],
                ),
            )

        # Upsert Main roles instead of deleting them. Location/NPC role exclusion
        # rows may point at a Main role and must survive a Main content re-seed.
        for assignment_order, (role_id, candidates) in enumerate(main_role_candidates.items(), start=1):
            conn.execute(
                """
                INSERT INTO story_roles(
                    version, role_id, role_scope, resolver_type,
                    fixed_ref, exclude_player, assignment_order,
                    prior_assignment_policy, description
                ) VALUES (?, ?, 'MAIN', 'STORY_CAST', NULL, 1, ?, 'REQUIRE_DISTINCT', ?)
                ON CONFLICT(version, role_id) DO UPDATE SET
                    role_scope=excluded.role_scope,
                    resolver_type=excluded.resolver_type,
                    fixed_ref=excluded.fixed_ref,
                    exclude_player=excluded.exclude_player,
                    assignment_order=excluded.assignment_order,
                    prior_assignment_policy=excluded.prior_assignment_policy,
                    description=excluded.description
                """,
                (
                    version,
                    role_id,
                    assignment_order,
                    f"{role_id} dynamic Main Story student role",
                ),
            )
            conn.execute(
                "DELETE FROM story_role_candidates WHERE version=? AND role_id=?",
                (version, role_id),
            )
            for priority, character_id in enumerate(candidates, start=1):
                conn.execute(
                    """
                    INSERT INTO story_role_candidates(
                        version, role_id, priority, character_id
                    ) VALUES (?, ?, ?, ?)
                    """,
                    (version, role_id, priority, character_id),
                )
        conn.execute(
            """
            INSERT INTO story_roles(
                version, role_id, role_scope, resolver_type,
                fixed_ref, exclude_player, assignment_order,
                prior_assignment_policy, description
            ) VALUES (?, 'MAIN_TEACHER', 'MAIN', 'FIXED_SPEAKER',
                      'NPC:VALENTINUS', 0, 0, 'ALLOW', '발렌티누스 고정 교사 역할')
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

        placeholders = ",".join("?" for _ in MAIN_IDS)
        conn.execute(
            f"DELETE FROM stories WHERE version=? AND story_id IN ({placeholders})",
            (version, *MAIN_IDS),
        )

        for sort_order, story_id in enumerate(MAIN_IDS, start=1):
            master = masters[story_id]
            conn.execute(
                """
                INSERT INTO stories(
                    version, story_id, story_type, display_name,
                    npc_id, location_id, content_ref, sort_order
                ) VALUES (?, ?, 'MAIN', ?, NULL, NULL, ?, ?)
                """,
                (version, story_id, master.title, master.content_ref, sort_order),
            )
            conn.execute(
                """
                INSERT INTO story_events(
                    version, event_id, story_id, display_name, scene_ref, content_ref
                ) VALUES (?, ?, ?, ?, NULL, ?)
                """,
                (version, story_id, story_id, master.title, master.content_ref),
            )
            conn.execute(
                """
                INSERT INTO story_steps(
                    version, story_id, step_no, event_id,
                    earliest_week, display_order,
                    scheduled_month, scheduled_day, availability_rule_ref
                ) VALUES (?, ?, 1, ?, ?, 1, ?, ?, 'MAIN_FIXED_DATE')
                """,
                (version, story_id, story_id, master.week, master.month, master.day),
            )

            for group in master.choices.values():
                for option_order, option in enumerate(group.options, start=1):
                    important = 1 if group.group_id == "MS05_S3_SHARE_INFO" else 0
                    conn.execute(
                        """
                        INSERT INTO story_choices(
                            version, event_id, choice_id, choice_text,
                            display_order, next_event_id, summary_text,
                            is_important, choice_group_id
                        ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)
                        """,
                        (
                            version,
                            story_id,
                            option.choice_id,
                            option.text,
                            option_order,
                            important,
                            group.group_id,
                        ),
                    )
                    for effect_order, (effect_type, target, value) in enumerate(
                        choice_effects[option.choice_id], start=1
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
                                story_id,
                                option.choice_id,
                                effect_order,
                                effect_type,
                                target,
                                json.dumps(value, ensure_ascii=False),
                            ),
                        )

            conn.execute(
                """
                INSERT INTO story_event_effects(
                    version, event_id, effect_order, apply_on,
                    effect_type, target, value_json
                ) VALUES (?, ?, 1, 'COMPLETE_OR_SKIP', 'STORY_PROGRESS', ?, ?)
                """,
                (
                    version,
                    story_id,
                    story_id,
                    json.dumps({"step": 1, "status": "COMPLETED"}, ensure_ascii=False),
                ),
            )
            if story_id == "MS05":
                conn.execute(
                    """
                    INSERT INTO story_event_effects(
                        version, event_id, effect_order, apply_on,
                        effect_type, target, value_json
                    ) VALUES (?, ?, 2, 'COMPLETE_OR_SKIP', 'EVENT_FLAG', 'guardianRuneResolved', 'true')
                    """,
                    (version, story_id),
                )

            ordered_nodes = master.nodes
            node_index = {node.node_id: index for index, node in enumerate(ordered_nodes)}
            group_by_node_id = {group.node_id: group for group in master.choices.values()}

            for character_id in sorted(variants):
                variant = variants[character_id]
                conn.execute(
                    """
                    INSERT INTO dialogue_sequences(
                        version, story_id, step_no, event_id, character_id, entry_node_id
                    ) VALUES (?, ?, 1, ?, ?, ?)
                    """,
                    (version, story_id, story_id, character_id, ordered_nodes[0].node_id),
                )

                for index, node in enumerate(ordered_nodes):
                    next_node_id = None
                    if node.node_kind in {"LINE", "IMAGE"}:
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
                            character_id,
                            node,
                            next_node_id,
                            line_override,
                        ),
                    )

                for choice_node_id, base_group in group_by_node_id.items():
                    choice_index = node_index[choice_node_id]
                    if choice_index + 1 >= len(ordered_nodes):
                        raise ValueError(f"{story_id}/{choice_node_id}: choice has no merge node")
                    merge_node_id = ordered_nodes[choice_index + 1].node_id
                    variant_group = variant.choices[base_group.group_id]
                    canonical_ids = [option.choice_id for option in base_group.options]
                    variant_by_choice_id = {
                        canonical_choice_id(alias, canonical_ids): option
                        for alias, option in variant_group.items()
                    }

                    for sort_order, base_option in enumerate(base_group.options, start=1):
                        variant_option = variant_by_choice_id[base_option.choice_id]
                        reactions = variant_option.reactions or base_option.reactions
                        if not reactions:
                            raise ValueError(
                                f"{character_id}/{base_group.group_id}/{base_option.choice_id}: no reaction"
                            )

                        reaction_node_ids = [
                            _reaction_node_id(choice_node_id, base_option.choice_id, idx)
                            for idx in range(1, len(reactions) + 1)
                        ]
                        for reaction_order, reaction in enumerate(reactions, start=1):
                            reaction_node_id = reaction_node_ids[reaction_order - 1]
                            reaction_next = (
                                reaction_node_ids[reaction_order]
                                if reaction_order < len(reactions)
                                else merge_node_id
                            )
                            speaker_kind, speaker_ref = resolve_variant_reaction_speaker(
                                story_id, reaction.speaker, character_name_to_id
                            )
                            conn.execute(
                                """
                                INSERT INTO dialogue_nodes(
                                    version, story_id, step_no, character_id, node_id, node_kind,
                                    line_mode, speaker_kind, speaker_ref, line_text, visual_mode,
                                    image_target, image_action, image_asset_type, image_asset_ref, image_alt,
                                    choice_group_id, choice_prompt, next_node_id
                                ) VALUES (?, ?, 1, ?, ?, 'LINE',
                                          'DIALOGUE', ?, ?, ?, 'SPEAKER',
                                          NULL, NULL, NULL, NULL, NULL,
                                          NULL, NULL, ?)
                                """,
                                (
                                    version,
                                    story_id,
                                    character_id,
                                    reaction_node_id,
                                    speaker_kind,
                                    speaker_ref,
                                    reaction.text,
                                    reaction_next,
                                ),
                            )

                        conn.execute(
                            """
                            INSERT INTO dialogue_options(
                                version, story_id, step_no, character_id,
                                choice_node_id, choice_id, choice_text,
                                response_node_id, sort_order
                            ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                version,
                                story_id,
                                character_id,
                                choice_node_id,
                                base_option.choice_id,
                                variant_option.text,
                                reaction_node_ids[0],
                                sort_order,
                            ),
                        )

        if activate:
            conn.execute("UPDATE game_data_versions SET is_active=0 WHERE is_active=1")
            conn.execute("UPDATE game_data_versions SET is_active=1 WHERE version=?", (version,))

        validate_database(conn, version)
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def validate_database(conn: sqlite3.Connection, version: str) -> None:
    def scalar(sql: str, params: tuple[object, ...] = ()) -> int:
        return int(conn.execute(sql, params).fetchone()[0])

    main_placeholders = ",".join("?" for _ in MAIN_IDS)
    main_params: tuple[object, ...] = (version, *MAIN_IDS)

    if scalar("SELECT COUNT(*) FROM characters WHERE version=?", (version,)) != EXPECTED_CHARACTER_COUNT:
        raise ValueError("DB validation failed: character count")
    if scalar(
        f"SELECT COUNT(*) FROM stories WHERE version=? AND story_id IN ({main_placeholders}) AND story_type='MAIN'",
        main_params,
    ) != 6:
        raise ValueError("DB validation failed: Main story count")
    if scalar(
        f"SELECT COUNT(*) FROM dialogue_sequences WHERE version=? AND story_id IN ({main_placeholders})",
        main_params,
    ) != EXPECTED_MAIN_SEQUENCE_COUNT:
        raise ValueError("DB validation failed: dialogue sequence count")
    if scalar(
        f"SELECT COUNT(*) FROM story_choices WHERE version=? AND event_id IN ({main_placeholders})",
        main_params,
    ) != EXPECTED_CANONICAL_CHOICES:
        raise ValueError("DB validation failed: canonical choice count")
    if scalar(
        f"SELECT COUNT(*) FROM story_choice_effects WHERE version=? AND event_id IN ({main_placeholders})",
        main_params,
    ) != EXPECTED_CANONICAL_CHOICES * 2:
        raise ValueError("DB validation failed: choice effect count")
    if scalar(
        "SELECT COUNT(*) FROM story_roles WHERE version=? AND role_scope='MAIN'",
        (version,),
    ) != EXPECTED_MAIN_DYNAMIC_ROLES + 1:
        raise ValueError("DB validation failed: Main story role count")
    if scalar(
        """
        SELECT COUNT(*)
        FROM story_role_candidates src
        JOIN story_roles sr
          ON sr.version=src.version AND sr.role_id=src.role_id
        WHERE src.version=? AND sr.role_scope='MAIN'
        """,
        (version,),
    ) != EXPECTED_MAIN_ROLE_CANDIDATES:
        raise ValueError("DB validation failed: Main story role candidate count")

    main_assignment_orders = [
        row[0]
        for row in conn.execute(
            """
            SELECT assignment_order
            FROM story_roles
            WHERE version=?
              AND role_scope='MAIN'
              AND resolver_type='STORY_CAST'
            ORDER BY assignment_order
            """,
            (version,),
        ).fetchall()
    ]
    if main_assignment_orders != list(range(1, EXPECTED_MAIN_DYNAMIC_ROLES + 1)):
        raise ValueError(
            f"DB validation failed: Main role assignment order {main_assignment_orders}"
        )

    per_character = conn.execute(
        """
        SELECT character_id,
               SUM(CASE WHEN node_kind='CHOICE' THEN 1 ELSE 0 END) AS choice_nodes
        FROM dialogue_nodes
        WHERE version=? AND story_id IN ({main_placeholders})
        GROUP BY character_id
        ORDER BY character_id
        """.format(main_placeholders=main_placeholders),
        main_params,
    ).fetchall()
    if len(per_character) != EXPECTED_CHARACTER_COUNT:
        raise ValueError("DB validation failed: character coverage in dialogue_nodes")
    for character_id, choice_nodes in per_character:
        if choice_nodes != EXPECTED_CHOICE_GROUPS_PER_CHARACTER:
            raise ValueError(f"{character_id}: expected 18 choice nodes, got {choice_nodes}")

    option_counts = dict(
        conn.execute(
            """
            SELECT character_id, COUNT(*)
            FROM dialogue_options
            WHERE version=? AND story_id IN ({main_placeholders})
            GROUP BY character_id
            """.format(main_placeholders=main_placeholders),
            main_params,
        ).fetchall()
    )
    if len(option_counts) != EXPECTED_CHARACTER_COUNT:
        raise ValueError("DB validation failed: character coverage in dialogue_options")
    for character_id in sorted(option_counts):
        if option_counts[character_id] != EXPECTED_OPTIONS_PER_CHARACTER:
            raise ValueError(
                f"{character_id}: expected {EXPECTED_OPTIONS_PER_CHARACTER} dialogue options, "
                f"got {option_counts[character_id]}"
            )

    underfilled = conn.execute(
        """
        SELECT story_id, step_no, character_id, choice_node_id, COUNT(*)
        FROM dialogue_options
        WHERE version=? AND story_id IN ({main_placeholders})
        GROUP BY story_id, step_no, character_id, choice_node_id
        HAVING COUNT(*) < 2
        """.format(main_placeholders=main_placeholders),
        main_params,
    ).fetchall()
    if underfilled:
        raise ValueError(f"Choice node has fewer than two options: {underfilled[:3]}")

    foreign_key_errors = conn.execute("PRAGMA foreign_key_check").fetchall()
    if foreign_key_errors:
        raise ValueError(f"Foreign key validation failed: {foreign_key_errors[:5]}")

    unresolved_roles = conn.execute(
        """
        SELECT DISTINCT dn.speaker_ref
        FROM dialogue_nodes dn
        LEFT JOIN story_roles sr
          ON sr.version=dn.version
         AND sr.role_id=substr(dn.speaker_ref, 6)
        WHERE dn.version=?
          AND dn.story_id IN ({main_placeholders})
          AND dn.speaker_ref LIKE 'ROLE:%'
          AND sr.role_id IS NULL
        """.format(main_placeholders=main_placeholders),
        main_params,
    ).fetchall()
    if unresolved_roles:
        raise ValueError(f"Unresolved ROLE speaker refs: {unresolved_roles}")

    unresolved_npcs = conn.execute(
        """
        SELECT DISTINCT dn.speaker_ref
        FROM dialogue_nodes dn
        LEFT JOIN dialogue_speakers ds
          ON ds.version=dn.version
         AND ds.speaker_id=substr(dn.speaker_ref, 5)
        WHERE dn.version=?
          AND dn.story_id IN ({main_placeholders})
          AND dn.speaker_ref LIKE 'NPC:%'
          AND ds.speaker_id IS NULL
        """.format(main_placeholders=main_placeholders),
        main_params,
    ).fetchall()
    if unresolved_npcs:
        raise ValueError(f"Unresolved NPC speaker refs: {unresolved_npcs}")

    unresolved_characters = conn.execute(
        """
        SELECT DISTINCT dn.speaker_ref
        FROM dialogue_nodes dn
        LEFT JOIN characters c
          ON c.version=dn.version
         AND c.character_id=substr(dn.speaker_ref, 11)
        WHERE dn.version=?
          AND dn.story_id IN ({main_placeholders})
          AND dn.speaker_ref LIKE 'CHARACTER:%'
          AND c.character_id IS NULL
        """.format(main_placeholders=main_placeholders),
        main_params,
    ).fetchall()
    if unresolved_characters:
        raise ValueError(f"Unresolved CHARACTER speaker refs: {unresolved_characters}")

    invalid_fixed_speakers = conn.execute(
        """
        SELECT sr.role_id, sr.fixed_ref
        FROM story_roles sr
        LEFT JOIN dialogue_speakers ds
          ON ds.version=sr.version
         AND ds.speaker_id=substr(sr.fixed_ref, 5)
        WHERE sr.version=?
          AND sr.role_scope='MAIN'
          AND sr.resolver_type='FIXED_SPEAKER'
          AND ds.speaker_id IS NULL
        """,
        (version,),
    ).fetchall()
    if invalid_fixed_speakers:
        raise ValueError(f"Invalid fixed speaker roles: {invalid_fixed_speakers}")

    invalid_fixed_characters = conn.execute(
        """
        SELECT sr.role_id, sr.fixed_ref
        FROM story_roles sr
        LEFT JOIN characters c
          ON c.version=sr.version
         AND c.character_id=substr(sr.fixed_ref, 11)
        WHERE sr.version=?
          AND sr.role_scope='MAIN'
          AND sr.resolver_type='FIXED_CHARACTER'
          AND c.character_id IS NULL
        """,
        (version,),
    ).fetchall()
    if invalid_fixed_characters:
        raise ValueError(f"Invalid fixed character roles: {invalid_fixed_characters}")

    # Graph reachability validation for every character/story sequence.
    sequences = conn.execute(
        """
        SELECT story_id, step_no, character_id, entry_node_id
        FROM dialogue_sequences
        WHERE version=? AND story_id IN ({main_placeholders})
        ORDER BY story_id, character_id
        """.format(main_placeholders=main_placeholders),
        main_params,
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
        nodes = {row[0]: (row[1], row[2]) for row in node_rows}
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
                raise ValueError(f"Cycle detected: {story_id}/{character_id}/{node_id}")
            if node_id in visited:
                return
            if node_id not in nodes:
                raise ValueError(f"Missing node: {story_id}/{character_id}/{node_id}")
            visiting.add(node_id)
            node_kind, next_node_id = nodes[node_id]
            if node_kind == "END":
                pass
            elif node_kind == "CHOICE":
                targets = branches.get(node_id, [])
                if len(targets) < 2:
                    raise ValueError(f"Invalid choice branches: {story_id}/{character_id}/{node_id}")
                for target in targets:
                    walk(target)
            else:
                if not next_node_id:
                    raise ValueError(f"Missing next node: {story_id}/{character_id}/{node_id}")
                walk(next_node_id)
            visiting.remove(node_id)
            visited.add(node_id)

        walk(entry_node_id)
        if len(visited) != len(nodes):
            orphaned = sorted(set(nodes) - visited)
            raise ValueError(
                f"Unreachable nodes: {story_id}/{character_id}: {orphaned[:5]}"
            )


def print_summary(conn: sqlite3.Connection, version: str) -> None:
    rows = conn.execute(
        """
        SELECT s.story_id,
               COUNT(DISTINCT ds.character_id) AS characters,
               COUNT(DISTINCT dn.node_id || ':' || dn.character_id) AS nodes,
               COUNT(DISTINCT do.choice_id || ':' || do.character_id) AS options
        FROM stories s
        LEFT JOIN dialogue_sequences ds
          ON ds.version=s.version AND ds.story_id=s.story_id
        LEFT JOIN dialogue_nodes dn
          ON dn.version=ds.version AND dn.story_id=ds.story_id
         AND dn.step_no=ds.step_no AND dn.character_id=ds.character_id
        LEFT JOIN dialogue_options do
          ON do.version=ds.version AND do.story_id=ds.story_id
         AND do.step_no=ds.step_no AND do.character_id=ds.character_id
        WHERE s.version=? AND s.story_type='MAIN'
        GROUP BY s.story_id
        ORDER BY s.story_id
        """,
        (version,),
    ).fetchall()
    print(f"seeded version: {version}")
    for story_id, characters, nodes, options in rows:
        print(f"  {story_id}: characters={characters}, nodes={nodes}, options={options}")
    print("validation: OK")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed LUMIA Main Story dialogue content into SQLite")
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"SQLite database path (default: {DEFAULT_DB_PATH})",
    )
    parser.add_argument("--version", required=True, help="game_data_versions.version to seed")
    parser.add_argument(
        "--migrate",
        action="store_true",
        help="apply missing 001/002/003 migrations before seeding",
    )
    parser.add_argument(
        "--activate",
        action="store_true",
        help="mark this game-data version active after successful validation",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.db.parent.mkdir(parents=True, exist_ok=True)
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
        seed_main_story(conn, args.version, args.activate)
        print(f"database: {args.db.resolve()}")
        print_summary(conn, args.version)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
