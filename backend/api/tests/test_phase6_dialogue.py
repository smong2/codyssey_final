"""End-to-end offline dialogue compiler and completion tests."""

from __future__ import annotations

from copy import deepcopy
import sqlite3

from backend.api.app.content_master import ContentMaster
from backend.api.app.dialogue_master import DialogueMaster, DELIVERED_FOCUS_ASSETS
from backend.api.app.story_candidates import ActivityContext, StoryCandidates
from backend.api.tests.test_phase3_account import headers
from backend.api.tests.test_phase5_save_slots import content_db, phase5_client, start


SECRET = "dialogue-test-secret-with-more-than-32-characters"


def _selected(payload):
    return [
        {"choiceNodeId": item["choiceNodeId"], "choiceId": item["options"][0]["choiceId"]}
        for item in payload["sequence"] if item["type"] == "CHOICE"
    ]


def _selected_with_text(payload):
    texts = {
        (item["choiceNodeId"], option["choiceId"]): option["text"]
        for item in payload["sequence"] if item["type"] == "CHOICE"
        for option in item["options"]
    }
    return [
        {**choice, "text": texts[(choice["choiceNodeId"], choice["choiceId"])]}
        for choice in _selected(payload)
    ]


def _complete(client, payload, choices, *, request_id="complete-ms01", mode="COMPLETE"):
    return client.post(
        "/v1/dialogue/complete", headers=headers(),
        json={"dialogueToken": payload["dialogueToken"], "completionMode": mode,
              "selectedChoices": choices, "requestId": request_id,
              "expectedServerRevision": 1},
    )


def test_compiler_resolves_cast_and_keeps_rewards_server_only(content_db):
    master = DialogueMaster(content_db, asset_root="asset")
    cast = ContentMaster(content_db).character_and_cast(
        version="dev-dialogue-v1", character_id="CH01"
    )[1]
    payload = master.compile(version="dev-dialogue-v1", event_id="MS01",
                             character_id="CH01", cast=cast)
    assert payload["sequence"][-1] == {"type": "END"}
    assert len(payload["choiceGroups"]) == 4
    assert payload["speakers"]["PLAYER"]["portraitSrc"] is None
    assert payload["speakers"]["VALENTINUS"]["portraitSrc"] == (
        "/character-assets/NPC02_%EB%B0%9C%EB%A0%8C%ED%8B%B0%EB%88%84%EC%8A%A4_"
        "%EC%9E%84%EC%8B%9C.png"
    )
    assert payload["speakers"][cast["MAIN_GUIDE_STUDENT"]]["kind"] == "CHARACTER"
    assert all("nextNodeId" not in item and "hiddenDelta" not in item for item in payload["sequence"])
    assert any(item.get("src", "").startswith("/world-assets/") for item in payload["sequence"])
    assert any(item.get("lineMode") == "NARRATION" for item in payload["sequence"])


def test_approved_focus_asset_is_delivered(content_db):
    master = DialogueMaster(content_db, asset_root="asset")
    cast = ContentMaster(content_db).character_and_cast(
        version="dev-dialogue-v1", character_id="CH01"
    )[1]
    payload = master.compile(version="dev-dialogue-v1", event_id="LOC_OBS_01",
                             character_id="CH01", cast=cast)
    assert any(item.get("src") ==
               "/item-assets/IT_focus_LOC_OBS_01_observation_diary_03.png"
               for item in payload["sequence"])
    client, _ = phase5_client(content_db, dialogue_secret=SECRET)
    with client:
        image = client.get("/item-assets/IT_focus_LOC_OBS_01_observation_diary_03.png")
        assert image.status_code == 200
        assert image.headers["content-type"] == "image/png"


def test_every_story_focus_id_resolves_to_a_served_image(content_db):
    with sqlite3.connect(content_db) as connection:
        expected_ids = {row[0] for row in connection.execute(
            "SELECT DISTINCT image_asset_ref FROM dialogue_nodes "
            "WHERE version='dev-dialogue-v1' AND image_asset_ref LIKE 'ART-%'"
        )}
        events = [row[0] for row in connection.execute(
            "SELECT DISTINCT event_id FROM dialogue_sequences WHERE version='dev-dialogue-v1'"
        )]
    assert expected_ids == set(DELIVERED_FOCUS_ASSETS)
    master = DialogueMaster(content_db, asset_root="asset")
    cast = ContentMaster(content_db).character_and_cast(
        version="dev-dialogue-v1", character_id="CH01"
    )[1]
    delivered_paths = {
        item["src"]
        for event_id in events
        for item in master.compile(
            version="dev-dialogue-v1", event_id=event_id,
            character_id="CH01", cast=cast
        )["sequence"]
        if item.get("src", "").startswith("/item-assets/")
    }
    assert delivered_paths == {
        f"/item-assets/{filename}" for filename in DELIVERED_FOCUS_ASSETS.values()
    }
    client, _ = phase5_client(content_db, dialogue_secret=SECRET)
    with client:
        for path in delivered_paths:
            response = client.get(path)
            assert response.status_code == 200, path
            assert response.headers["content-type"] == "image/png", path


def test_all_reviewed_graphs_compile_without_asset_delivery_assumption(content_db):
    class GraphOnlyMaster(DialogueMaster):
        def _image_src(self, reference, *, is_portrait=False):
            return f"/test/{reference}" if reference else None

    master = GraphOnlyMaster(content_db, asset_root="asset")
    casting = ContentMaster(content_db)
    with sqlite3.connect(content_db) as connection:
        events = [row[0] for row in connection.execute(
            "SELECT DISTINCT event_id FROM dialogue_sequences WHERE version='dev-dialogue-v1'"
        )]
    assert len(events) == 24
    for number in range(1, 33):
        character_id = f"CH{number:02d}"
        cast = casting.character_and_cast(version="dev-dialogue-v1", character_id=character_id)[1]
        for event_id in events:
            payload = master.compile(version="dev-dialogue-v1", event_id=event_id,
                                     character_id=character_id, cast=cast)
            assert payload["sequence"][-1]["type"] == "END"


def test_load_complete_and_idempotent_replay(content_db):
    client, database = phase5_client(content_db, dialogue_secret=SECRET)
    with client:
        assert start(client).status_code == 200
        loaded = client.get("/v1/save-slots/1/dialogue/MS01", headers=headers())
        assert loaded.status_code == 200, loaded.text
        payload = loaded.json()
        assert payload["canSkip"] is False
        assert "choiceGroups" not in payload and "storyType" not in payload
        choices = _selected(payload)
        assert len(choices) == 4
        before = deepcopy(database.data)
        assert _complete(client, payload, choices[:-1], request_id="incomplete").status_code == 409
        assert database.data == before
        bad = deepcopy(choices)
        bad[0]["choiceId"] = "invented"
        assert _complete(client, payload, bad, request_id="invented").status_code == 409
        assert database.data == before
        completed = _complete(client, payload, choices)
        assert completed.status_code == 200, completed.text
        result = completed.json()
        assert result["serverRevision"] == 2
        assert result["slot"]["serverRevision"] == 2
        assert set(result["collectionPatch"]) >= {"meta", "statistics", "pendingCharacterUnlockIds"}
        assert result["activeRun"]["pendingStoryEvent"] is None
        assert result["activeRun"]["eventFlags"]["MS01"] is True
        assert result["activeRun"]["storyProgress"]["MS01"]["status"] == "COMPLETED"
        assert sum(result["appliedSummary"]["visibleStatDelta"].values()) > 0
        record = result["activeRun"]["dialogueHistory"][0]
        assert record["eventId"] == "MS01"
        assert record["storyId"] == "MS01"
        assert record["title"]
        assert record["week"] == 1 and record["day"] == 0
        assert record["completionMode"] == "COMPLETE"
        assert record["selectedChoices"] == _selected_with_text(payload)
        assert record["effect"]["growth"] == result["appliedSummary"]["visibleStatDelta"]
        stored_choices = database.data["users/owner/saveSlots/1"]["activeRun"]["dialogueHistory"][0]["selectedChoices"]
        for choice in stored_choices:
            choice.pop("text")
        loaded = client.get("/v1/save-slots/1", headers=headers()).json()
        assert loaded["activeRun"]["dialogueHistory"][0]["selectedChoices"] == _selected_with_text(payload)
        assert all("text" not in choice for choice in stored_choices)
        snapshot = deepcopy(database.data)
        replay = _complete(client, payload, choices).json()
        assert replay["replayed"] is True
        assert replay["appliedSummary"] == result["appliedSummary"]
        assert database.data == snapshot
        assert client.get("/v1/save-slots/1/dialogue/MS01", headers=headers()).status_code == 409


def test_skip_requires_prior_ending_and_applies_no_choice_reward(content_db):
    client, database = phase5_client(content_db, dialogue_secret=SECRET)
    with client:
        assert start(client).status_code == 200
        payload = client.get("/v1/save-slots/1/dialogue/MS01", headers=headers()).json()
        assert _complete(client, payload, [], request_id="skip-denied", mode="SKIP").status_code == 409
        database.data["users/owner/meta/progress"]["seenEndingIds"] = ["ENDING_RUNE_RESEARCHER"]
        payload = client.get("/v1/save-slots/1/dialogue/MS01", headers=headers()).json()
        assert payload["canSkip"] is True
        result = _complete(client, payload, [], request_id="skip-allowed", mode="SKIP")
        assert result.status_code == 200, result.text
        active = result.json()["activeRun"]
        assert result.json()["appliedSummary"]["visibleStatDelta"] == {}
        assert all(value == 50 for value in active["stats"].values())
        assert active["storyProgress"]["MS01"]["status"] == "COMPLETED"
        assert active["dialogueHistory"] == [{
            "eventId": "MS01", "storyId": "MS01", "title": active["dialogueHistory"][0]["title"],
            "week": 1, "day": 0, "completionMode": "SKIP", "selectedChoices": [],
            "effect": {"growth": {}},
        }]


def test_ms05_important_memory_and_clamped_visible_delta(content_db):
    client, database = phase5_client(content_db, dialogue_secret=SECRET)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["week"] = 49
        run["pendingStoryEvent"] = {"eventId": "MS05"}
        run["stats"] = {stat: 499 for stat in run["stats"]}
        payload = client.get("/v1/save-slots/1/dialogue/MS05", headers=headers()).json()
        result = _complete(client, payload, _selected(payload), request_id="complete-ms05")
        assert result.status_code == 200, result.text
        active = result.json()["activeRun"]
        assert active["runStatistics"]["importantChoiceCount"] == 1
        assert len(active["representativeChoices"]) == 1
        assert active["representativeChoices"][0]["eventId"] == "MS05"
        assert database.data["users/owner/statistics/global"]["importantChoiceCount"] == 1
        assert all(value <= 500 for value in active["stats"].values())
        assert all(value <= 1 for value in result.json()["appliedSummary"]["visibleStatDelta"].values())


def test_tampered_token_fails_closed(content_db):
    client, database = phase5_client(content_db, dialogue_secret=SECRET)
    with client:
        assert start(client).status_code == 200
        payload = client.get("/v1/save-slots/1/dialogue/MS01", headers=headers()).json()
        payload["dialogueToken"] += "x"
        assert _complete(client, payload, _selected(payload)).status_code == 409


def test_story_candidates_respect_location_progress_and_pending(content_db):
    selector = StoryCandidates(content_db)
    cast = ContentMaster(content_db).character_and_cast(
        version="dev-dialogue-v1", character_id="CH01"
    )[1]
    run = {
        "runId": "candidate-run", "week": 7, "day": "MONDAY", "storyCast": cast,
        "pendingStoryEvent": None, "storyEventWindow": {"week": 7, "sideStoryCount": 0,
                                                "locationStoryCount": 0,
                                                "lastResultStoryDay": None},
        "eventFlags": {}, "storyProgress": {}, "npcProgress": {},
    }
    activity = ActivityContext("gh-activity", "ADVENTURE", "GH")
    chosen = selector.before_activity(version="dev-dialogue-v1", run=run, activity=activity)
    assert chosen["eventId"] == "LOC_GH_01"
    run["pendingStoryEvent"] = chosen
    assert selector.before_activity(version="dev-dialogue-v1", run=run, activity=activity) == chosen
    run["pendingStoryEvent"] = None
    run["storyEventWindow"]["locationStoryCount"] = 1
    assert selector.before_activity(version="dev-dialogue-v1", run=run, activity=activity) is None
    run["storyEventWindow"].pop("locationStoryCount")
    run["storyProgress"]["LOC_OBS_01"] = {
        "step": 1, "status": "COMPLETED", "lastAdvancedWeek": 7,
    }
    assert selector.before_activity(version="dev-dialogue-v1", run=run, activity=activity) is None
    run["storyProgress"].clear()
    run["storyEventWindow"]["locationStoryCount"] = 0
    run["week"] = 6
    assert selector.before_activity(version="dev-dialogue-v1", run=run, activity=activity) is None
    run["week"] = 10
    assert selector.fixed_main(version="dev-dialogue-v1", run=run, month=3, day=5)["eventId"] == "MS02"


def test_npc_candidate_needs_encounter_and_previous_step(content_db):
    selector = StoryCandidates(content_db)
    cast = ContentMaster(content_db).character_and_cast(
        version="dev-dialogue-v1", character_id="CH01"
    )[1]
    run = {
        "runId": "npc-run", "week": 4, "day": "TUESDAY", "storyCast": cast,
        "pendingStoryEvent": None, "storyEventWindow": {"week": 4, "sideStoryCount": 0,
                                                "lastResultStoryDay": None},
        "eventFlags": {}, "storyProgress": {}, "npcProgress": {},
    }
    activity = ActivityContext("clock-class", "CLASS", "CLK")
    assert selector.after_activity(version="dev-dialogue-v1", run=run, activity=activity) is None
    run["npcProgress"][cast["NPC_GUIDE_ACTOR"]] = {"encounterCount": 1, "lastEncounterWeek": 2}
    assert selector.after_activity(version="dev-dialogue-v1", run=run, activity=activity)["eventId"] == "NPC_GUIDE_01"
    run["eventFlags"]["NPC_GUIDE_01"] = True
    run["storyProgress"]["NPC_GUIDE"] = {"step": 1, "status": "IN_PROGRESS", "lastAdvancedWeek": 4}
    run["week"] = 15
    assert selector.after_activity(version="dev-dialogue-v1", run=run, activity=activity)["eventId"] == "NPC_GUIDE_02"
