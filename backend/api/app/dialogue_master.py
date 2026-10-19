"""Compile the reviewed SQLite dialogue graph into a linear engine payload."""

from __future__ import annotations

from contextlib import closing
import json
from pathlib import Path
import sqlite3
from urllib.parse import quote


class DialogueMasterError(RuntimeError):
    pass


class DialogueNotFound(DialogueMasterError):
    pass


class DialogueAssetMissing(DialogueMasterError):
    pass


DELIVERED_FOCUS_ASSETS = {
    "ART-L04": "IT_focus_LOC_LIB_01_plain_book_01.png",
    "ART-L03": "IT_focus_LOC_GH_01_restored_pot_02.png",
    "ART-L02": "IT_focus_LOC_GH_01_wilted_pot_01.png",
    "ART-N05": "IT_focus_NPC_LULU_01_patterned_button_01.png",
    "ART-N04": "IT_focus_NPC_WORK_03_tidy_workbench_02.png",
    "ART-N03": "IT_focus_NPC_WORK_01_workshop_parts_01.png",
    "ART-N02": "IT_focus_NPC_GUIDE_03_two_ribbons_01.png",
    "ART-M06": "IT_focus_MS06_winter_games_decor_01.png",
    "ART-M05": "IT_focus_MS04_shadow_shield_02.png",
    "ART-M04": "IT_focus_MS04_detached_shadow_01.png",
    "ART-M03": "IT_focus_MS03_wrong_clock_rune_01.png",
    "ART-M02": "IT_focus_MS02_glowing_bud_vines_02.png",
    "ART-M01": "IT_focus_MS02_blocked_vines_01.png",
    "ART-N01": "IT_focus_NPC_GUIDE_01_meeting_notices_01.png",
    "ART-N06": "IT_focus_NPC_LULU_02_treasure_chest_02.png",
    "ART-L01": "IT_focus_LOC_OBS_01_observation_diary_03.png",
}

# LOC_GH_01 has reviewed dialogue and approved scene/background/character assets,
# but its two optional prop focus images are still reserved and undelivered.
# Keep that location story playable by explicitly hiding FOCUS at those beats.
# Other missing assets remain fail-closed.
OPTIONAL_MISSING_FOCUS_ASSETS = {
    ("LOC_GH_01", "ART-L02"),
    ("LOC_GH_01", "ART-L03"),
}


def _database(path: Path):
    connection = sqlite3.connect(f"{path.resolve().as_uri()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only = ON")
    return connection


class DialogueMaster:
    def __init__(self, path: str | Path, *, asset_root: str | Path) -> None:
        self.path = Path(path)
        self.asset_root = Path(asset_root).resolve()

    def _image_src(self, reference: str | None, *, is_portrait: bool = False) -> str | None:
        if not reference:
            return None
        if is_portrait:
            prefix = "asset/character/"
            if not reference.startswith(prefix):
                raise DialogueMasterError("Unsupported portrait reference")
            category, filename = "character", reference[len(prefix):]
        elif reference in DELIVERED_FOCUS_ASSETS:
            category, filename = "item", DELIVERED_FOCUS_ASSETS[reference]
        elif reference.startswith("asset/character/"):
            category, filename = "character", reference[len("asset/character/"):]
        elif reference.startswith("asset/background/"):
            category, filename = "background", reference[len("asset/background/"):]
        elif "/" not in reference:
            category, filename = "background", reference
        else:
            raise DialogueMasterError("Unsupported image reference")
        if filename in {"", ".", ".."} or "/" in filename or "\\" in filename:
            raise DialogueMasterError("Unsafe image reference")
        if not (self.asset_root / category / filename).is_file():
            raise DialogueAssetMissing(f"Image asset is not delivered: {reference}")
        base = {"character": "character-assets", "background": "world-assets", "item": "item-assets"}[category]
        return f"/{base}/{quote(filename)}"

    def choice_texts(
        self, *, version: str, event_ids: set[str], character_id: str,
    ) -> dict[tuple[str, str, str], str]:
        """Return display text for saved choice IDs without compiling images or effects."""
        if not event_ids:
            return {}
        try:
            with closing(_database(self.path)) as connection:
                placeholders = ",".join("?" for _ in event_ids)
                rows = connection.execute(
                    f"""SELECT events.event_id,options.choice_node_id,
                               options.choice_id,options.choice_text
                        FROM (
                          SELECT DISTINCT event_id,story_id,step_no
                          FROM dialogue_sequences
                          WHERE version=? AND character_id=?
                            AND event_id IN ({placeholders})
                        ) AS events
                        JOIN dialogue_options AS options
                          ON options.version=? AND options.character_id=?
                         AND options.story_id=events.story_id
                         AND options.step_no=events.step_no""",
                    (version, character_id, *sorted(event_ids), version, character_id),
                ).fetchall()
                return {
                    (row["event_id"], row["choice_node_id"], row["choice_id"]): row["choice_text"]
                    for row in rows
                }
        except (sqlite3.Error, OSError):
            raise DialogueMasterError("Dialogue choice text is unavailable") from None

    def _speaker(self, connection, version: str, reference: str, cast: dict[str, str]) -> tuple[str, dict]:
        if reference.startswith("ROLE:"):
            role_id = reference[5:]
            role = connection.execute(
                "SELECT resolver_type,fixed_ref FROM story_roles WHERE version=? AND role_id=?",
                (version, role_id),
            ).fetchone()
            if role is None:
                raise DialogueMasterError("Unknown story role")
            if role["resolver_type"] == "STORY_CAST":
                character_id = cast.get(role_id)
                if not character_id:
                    raise DialogueMasterError("Story cast is incomplete")
                reference = f"CHARACTER:{character_id}"
            else:
                reference = role["fixed_ref"]
        if reference.startswith("CHARACTER:"):
            character_id = reference[10:]
            row = connection.execute(
                "SELECT display_name,full_body_asset_ref FROM characters WHERE version=? AND character_id=?",
                (version, character_id),
            ).fetchone()
            if row is None:
                raise DialogueMasterError("Unknown character speaker")
            return character_id, {
                "kind": "CHARACTER", "id": character_id, "name": row["display_name"],
                "portraitSrc": self._image_src(row["full_body_asset_ref"], is_portrait=True),
            }
        if reference.startswith("NPC:"):
            speaker_id = reference[4:]
            row = connection.execute(
                "SELECT display_name,portrait_asset_ref FROM dialogue_speakers WHERE version=? AND speaker_id=?",
                (version, speaker_id),
            ).fetchone()
            if row is None:
                raise DialogueMasterError("Unknown NPC speaker")
            return speaker_id, {
                "kind": "NPC", "id": speaker_id, "name": row["display_name"],
                "portraitSrc": self._image_src(row["portrait_asset_ref"], is_portrait=True),
            }
        raise DialogueMasterError("Unsupported speaker reference")

    def compile(self, *, version: str, event_id: str, character_id: str,
                cast: dict[str, str]) -> dict:
        try:
            with closing(_database(self.path)) as connection:
                return self._compile(connection, version, event_id, character_id, cast)
        except (sqlite3.Error, OSError):
            raise DialogueMasterError("Dialogue content database is unavailable") from None

    def _compile(self, connection, version, event_id, character_id, cast):
        sequence_row = connection.execute(
            """SELECT ds.story_id,ds.step_no,ds.entry_node_id,se.display_name,s.story_type
               FROM dialogue_sequences ds JOIN story_events se
                 ON se.version=ds.version AND se.event_id=ds.event_id
               JOIN stories s ON s.version=se.version AND s.story_id=se.story_id
               WHERE ds.version=? AND ds.event_id=? AND ds.character_id=?""",
            (version, event_id, character_id),
        ).fetchone()
        if sequence_row is None:
            raise DialogueNotFound("No reviewed dialogue for this event and character")
        story_id, step_no = sequence_row["story_id"], sequence_row["step_no"]
        key = (version, story_id, step_no, character_id)
        node_rows = connection.execute(
            """SELECT * FROM dialogue_nodes WHERE version=? AND story_id=? AND step_no=? AND character_id=?""",
            key,
        ).fetchall()
        nodes = {row["node_id"]: row for row in node_rows}
        option_rows = connection.execute(
            """SELECT * FROM dialogue_options
               WHERE version=? AND story_id=? AND step_no=? AND character_id=?
               ORDER BY choice_node_id,sort_order""",
            key,
        ).fetchall()
        options: dict[str, list] = {}
        for option in option_rows:
            options.setdefault(option["choice_node_id"], []).append(option)
        player = connection.execute(
            "SELECT display_name FROM characters WHERE version=? AND character_id=?",
            (version, character_id),
        ).fetchone()
        if player is None:
            raise DialogueMasterError("Player character is missing")
        speakers = {"PLAYER": {
            "kind": "PLAYER", "id": character_id, "name": player["display_name"],
            "portraitSrc": None,
        }}

        def line(row):
            mode = row["line_mode"]
            speaker_key = None
            if mode == "THOUGHT" or row["speaker_kind"] == "PLAYER":
                speaker_key = "PLAYER"
            elif row["speaker_kind"] == "NPC":
                speaker_key, speaker = self._speaker(connection, version, row["speaker_ref"], cast)
                speakers[speaker_key] = speaker
            elif mode == "DIALOGUE":
                raise DialogueMasterError("Dialogue line has no speaker")
            result = {
                "type": "LINE", "lineMode": mode, "text": row["line_text"],
                "visualMode": row["visual_mode"],
            }
            if speaker_key is not None:
                result["speaker"] = speaker_key
            return result

        def branch_path(start):
            path = []
            seen = set()
            current = start
            while current is not None:
                if current in seen or current not in nodes:
                    raise DialogueMasterError("Dialogue branch contains a cycle or missing node")
                seen.add(current)
                path.append(current)
                current = nodes[current]["next_node_id"]
            return path

        commands = []
        choice_groups = []
        visited = set()
        current = sequence_row["entry_node_id"]
        while current is not None:
            if current in visited or current not in nodes:
                raise DialogueMasterError("Dialogue sequence contains a cycle or missing node")
            visited.add(current)
            row = nodes[current]
            kind = row["node_kind"]
            if kind == "LINE":
                commands.append(line(row))
                current = row["next_node_id"]
            elif kind == "IMAGE":
                image = {"type": "IMAGE", "target": row["image_target"],
                         "action": row["image_action"], "assetType": row["image_asset_type"],
                         "alt": row["image_alt"] or ""}
                if row["image_action"] != "HIDE":
                    try:
                        image["src"] = self._image_src(row["image_asset_ref"])
                    except DialogueAssetMissing:
                        optional_focus = (
                            row["image_target"] == "FOCUS"
                            and (event_id, row["image_asset_ref"])
                            in OPTIONAL_MISSING_FOCUS_ASSETS
                        )
                        if not optional_focus:
                            raise
                        image["action"] = "HIDE"
                commands.append(image)
                current = row["next_node_id"]
            elif kind == "CHOICE":
                available = options.get(current, [])
                if len(available) < 2:
                    raise DialogueMasterError("Choice has fewer than two options")
                paths = [branch_path(option["response_node_id"]) for option in available]
                common = set.intersection(*(set(path) for path in paths))
                joins = [node_id for node_id in paths[0] if node_id in common]
                if not joins:
                    raise DialogueMasterError("Choice branches do not join")
                join = joins[0]
                compiled_options = []
                for option, path in zip(available, paths):
                    response = path[:path.index(join)]
                    if not response or any(nodes[node_id]["node_kind"] != "LINE" for node_id in response):
                        raise DialogueMasterError("Choice reaction must contain LINE and rejoin")
                    visited.update(response)
                    compiled_options.append({
                        "choiceId": option["choice_id"], "text": option["choice_text"],
                        "reaction": [line(nodes[node_id]) for node_id in response],
                    })
                commands.append({"type": "CHOICE", "choiceNodeId": current,
                                 "prompt": row["choice_prompt"], "options": compiled_options})
                choice_groups.append({"choiceNodeId": current,
                                      "choiceIds": [option["choice_id"] for option in available]})
                current = join
            elif kind == "END":
                commands.append({"type": "END"})
                current = None
            else:
                raise DialogueMasterError("Unsupported dialogue node")
        if not commands or commands[-1]["type"] != "END" or visited != set(nodes):
            raise DialogueMasterError("Dialogue graph is incomplete or has unreachable nodes")
        return {
            "schemaVersion": 1, "dialogueId": f"{event_id}:{character_id}",
            "storyId": story_id, "eventId": event_id,
            "title": sequence_row["display_name"] or event_id,
            "speakers": speakers, "sequence": commands, "choiceGroups": choice_groups,
            "storyType": sequence_row["story_type"], "stepNo": step_no,
        }

    def effects(self, *, version: str, event_id: str, choice_ids: list[str]) -> dict:
        try:
            with closing(_database(self.path)) as connection:
                choices = connection.execute(
                    "SELECT choice_id,is_important FROM story_choices WHERE version=? AND event_id=?",
                    (version, event_id),
                ).fetchall()
                known = {row["choice_id"]: bool(row["is_important"]) for row in choices}
                if any(choice_id not in known for choice_id in choice_ids):
                    raise DialogueMasterError("Unknown canonical choice")
                selected = []
                for choice_id in choice_ids:
                    rows = connection.execute(
                        """SELECT effect_type,target,value_json FROM story_choice_effects
                           WHERE version=? AND event_id=? AND choice_id=? ORDER BY effect_order""",
                        (version, event_id, choice_id),
                    ).fetchall()
                    selected.extend({"type": row["effect_type"], "target": row["target"],
                                     "value": json.loads(row["value_json"])} for row in rows)
                rows = connection.execute(
                    """SELECT apply_on,effect_type,target,value_json FROM story_event_effects
                       WHERE version=? AND event_id=? ORDER BY effect_order""",
                    (version, event_id),
                ).fetchall()
                event = [{"applyOn": row["apply_on"], "type": row["effect_type"],
                          "target": row["target"], "value": json.loads(row["value_json"])}
                         for row in rows]
                if not event:
                    raise DialogueMasterError("Event has no completion effects")
                return {"choice": selected, "event": event,
                        "important": [choice_id for choice_id in choice_ids if known[choice_id]]}
        except (sqlite3.Error, OSError, json.JSONDecodeError):
            raise DialogueMasterError("Dialogue effect master is unavailable") from None
