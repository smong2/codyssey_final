"""Phase 8 collection, unlock, and career-ending offline regression tests."""

from __future__ import annotations

from datetime import datetime, timezone

from backend.api.app.account import _initial_documents
from backend.api.app.models import GlobalMetaProgress, GlobalStatistics, UnlockState
from backend.api.app.progression_rules import (BADGE_TRACKS, ENDING_RULES, ROOM_BACKGROUND_IDS,
                                               badge_id, choose_ending, evaluate_progression,
                                               promote_pending_characters)
from backend.api.tests.test_phase3_account import headers
from backend.api.tests.test_phase6_dialogue import SECRET, _complete as _complete_dialogue, _selected
from backend.api.tests.test_phase5_save_slots import content_db, phase5_client, start
from backend.api.tests.test_phase7_activity_start import activity_db, _schedule, _start
from backend.api.tests.test_phase7_adventure import _complete_adventure


def _state():
    now = datetime.now(timezone.utc)
    docs = _initial_documents(now, now)
    return (
        GlobalMetaProgress.model_validate(docs["meta/progress"]),
        GlobalStatistics.model_validate(docs["statistics/global"]),
        UnlockState.model_validate(docs["unlockState/global"]),
        now,
    )


def _ending_run(*, run_id="ending-test"):
    return {
        "runId": run_id,
        "stats": {name: 50 for name in ("knowledge", "expression", "skill", "exploration", "magic")},
        "hiddenStats": {name: 0 for name in (
            "empathy", "responsibility", "curiosity", "courage",
            "cooperation", "independence", "caution", "honesty",
        )},
        "runStatistics": {
            "classCount": 0, "adventureCount": 0, "restCount": 0,
            "minigamePlayCount": 0, "minigameClearCount": 0,
            "npcEncounterCount": 0, "completedNpcStoryCount": 0,
            "locationDiscoveryCount": 0, "specialItemDiscoveryCount": 0,
            "importantChoiceCount": 0,
            "classCounts": {name: 0 for name in (
                "knowledge", "expression", "skill", "exploration", "magic",
            )},
        },
    }


def test_badge_milestones_apply_bonus_once_and_queue_character():
    meta, statistics, unlock, now = _state()
    statistics.totalAdventureCount = 40  # compass badges 1..5
    first = evaluate_progression(uid="owner", meta=meta, statistics=statistics,
                                 unlock=unlock, now=now)
    compass = [badge for badge in meta.acquiredBadgeIds if badge.startswith("BADGE_FOREST_COMPASS_")]
    assert len(compass) == 5
    assert meta.permanentBonuses["exploration"] == 2  # 2/8 + 5/8
    assert "CH28" in unlock.pendingCharacterUnlockIds
    assert "CH28" not in meta.unlockedCharacterIds
    assert first.permanentBonusDelta["exploration"] == 2
    snapshot = (list(meta.acquiredBadgeIds), dict(meta.permanentBonuses),
                list(unlock.completedConditionIds), list(unlock.pendingCharacterUnlockIds))
    second = evaluate_progression(uid="owner", meta=meta, statistics=statistics,
                                  unlock=unlock, now=now)
    assert second.badges == [] and second.pendingCharacters == []
    assert snapshot == (meta.acquiredBadgeIds, meta.permanentBonuses,
                        unlock.completedConditionIds, unlock.pendingCharacterUnlockIds)


def test_badge_master_is_exactly_25_tracks_and_200_stable_ids():
    identifiers = {badge_id(track, number) for track in BADGE_TRACKS for number in range(1, 9)}
    assert len(BADGE_TRACKS) == 25
    assert len(identifiers) == 200


def test_pending_character_promotion_is_idempotent_for_phase9_boundary():
    meta, _, unlock, now = _state()
    unlock.pendingCharacterUnlockIds = ["CH28", "CH29"]
    promoted = promote_pending_characters(meta=meta, unlock=unlock, now=now)
    assert promoted == ["CH28", "CH29"]
    assert {"CH28", "CH29"}.issubset(meta.unlockedCharacterIds)
    assert unlock.pendingCharacterUnlockIds == []
    assert promote_pending_characters(meta=meta, unlock=unlock, now=now) == []


def test_all_36_puzzle_conditions_grant_unique_pieces_and_three_rooms():
    meta, statistics, unlock, now = _state()
    statistics.totalMinigamePlayCount = 250
    statistics.clearedMinigameIds = [f"game-{number}" for number in range(1, 6)]
    statistics.totalAdventureCount = 250
    statistics.totalNpcEncounterCount = 500
    statistics.classCounts = {name: 10 for name in statistics.classCounts}
    result = evaluate_progression(uid="owner", meta=meta, statistics=statistics,
                                  unlock=unlock, now=now)
    assert len(meta.acquiredPuzzlePieceIds) == 36
    assert len(set(meta.acquiredPuzzlePieceIds)) == 36
    assert len(result.puzzlePieces) == 36
    assert set(ROOM_BACKGROUND_IDS).issubset(meta.unlockedRoomBackgroundIds)
    assert set(result.roomBackgrounds) == set(ROOM_BACKGROUND_IDS)
    assert sum(condition.startswith("PUZZLE_") for condition in unlock.completedConditionIds) >= 36


def test_pet_rules_and_regular_ending_counts_exclude_fallback():
    meta, statistics, unlock, now = _state()
    meta.seenEndingIds = ["ENDING_STARPATH_PIONEER", "ENDING_RUNE_RESEARCHER", "ENDING_ARCHIVIST"]
    statistics.totalCompletedRuns = 1
    statistics.totalAdventureCount = 100
    statistics.completedNpcStoryCount = 5
    result = evaluate_progression(uid="owner", meta=meta, statistics=statistics,
                                  unlock=unlock, now=now)
    assert {"PET02", "PET04", "PET05"}.issubset(meta.unlockedPetIds)
    assert "PET06" not in meta.unlockedPetIds  # only two regular endings
    assert "CH14" not in unlock.pendingCharacterUnlockIds
    assert {"PET02", "PET04", "PET05"}.issubset(result.pets)


def test_ending_fallback_unseen_priority_and_all_seen_selection():
    run = _ending_run()
    fallback = choose_ending(run=run, seen_ending_ids=[])
    assert fallback["endingId"] == "ENDING_STARPATH_PIONEER"
    assert fallback["endingType"] == "FALLBACK"

    # Seen rune researcher is a stronger fit, but any unseen eligible career has priority.
    run["stats"].update({"magic": 500, "knowledge": 250, "exploration": 300})
    run["hiddenStats"]["curiosity"] = 100
    run["runStatistics"]["classCounts"]["magic"] = 100
    unseen = choose_ending(run=run, seen_ending_ids=["ENDING_RUNE_RESEARCHER"])
    assert unseen["endingId"] == "ENDING_ARCADIA_EXPLORER"

    # When every eligible regular career is seen, selection remains in that eligible set.
    seen = [rule.ending_id for rule in ENDING_RULES]
    all_seen = choose_ending(run=run, seen_ending_ids=seen)
    eligible = {
        rule.ending_id for rule in ENDING_RULES
        if run["stats"][rule.primary] >= 300
    }
    assert eligible == {
        "ENDING_RUNE_RESEARCHER",
        "ENDING_ARCADIA_EXPLORER",
        "ENDING_ARCANE_ARTISAN",
        "ENDING_MAGICAL_CREATURE_KEEPER",
    }
    assert all_seen["endingId"] in eligible
    assert all_seen["endingType"] == "CAREER"


def test_first_adventure_commits_badges_puzzle_piece_and_daily_unlocks(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["pendingStoryEvent"] = None
        run["phase"] = "STORY_COMPLETE"
        scheduled = _schedule(
            client, ["ADV_TEST", "REST_TEST", "REST_TEST", "REST_TEST", "REST_TEST"],
            request="phase8-adventure-schedule", revision=1,
        )
        assert scheduled.status_code == 200, scheduled.text
        begun = _start(client, request="phase8-adventure-start", revision=2)
        assert begun.status_code == 200, begun.text
        target = begun.json()["targetCount"]
        completed = _complete_adventure(
            client, resolution="MISSION_COMPLETE", found_count=target, target_count=target,
            request="phase8-adventure-complete", revision=3,
        )
        assert completed.status_code == 200, completed.text
        progression = completed.json()["progression"]
        assert completed.json()["slot"]["serverRevision"] == 4
        assert set(completed.json()["collectionPatch"]) >= {"meta", "statistics", "pendingCharacterUnlockIds"}
        assert "BADGE_FOREST_COMPASS_01" in progression["badges"]
        assert "BADGE_WORKSHOP_PUZZLE_01" in progression["badges"]
        assert len(progression["puzzlePieces"]) == 1
        meta = database.data["users/owner/meta/progress"]
        assert len(meta["acquiredPuzzlePieceIds"]) == 1
        assert database.data["users/owner/statistics/global"]["totalLocationDiscoveryCount"] == 1
        assert "BADGE_FOREST_DOOR_01" in meta["acquiredBadgeIds"]
        daily = next(value for path, value in database.data.items() if "/activityDays/" in path)
        assert daily["unlocks"]["newByTypeAndId"]["BADGE"]["BADGE_FOREST_COMPASS_01"] == 1
        assert len(daily["unlocks"]["newByTypeAndId"]["PUZZLE_PIECE"]) == 1


def test_ending_decision_is_saved_before_gemini_and_retry_safe(content_db):
    client, database = phase5_client(content_db)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["week"] = 52
        run["phase"] = "ENDING_PENDING"
        run["pendingStoryEvent"] = None
        before_seen = list(database.data["users/owner/meta/progress"]["seenEndingIds"])
        body = {"requestId": "phase8-ending", "expectedServerRevision": 1}
        decided = client.post("/v1/save-slots/1/ending/decision", headers=headers(), json=body)
        assert decided.status_code == 200, decided.text
        assert decided.json()["endingId"] == "ENDING_STARPATH_PIONEER"
        assert decided.json()["endingType"] == "FALLBACK"
        saved = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert saved["phase"] == "ENDING_DECIDED"
        assert saved["endingDecision"]["endingId"] == "ENDING_STARPATH_PIONEER"
        assert database.data["users/owner/meta/progress"]["seenEndingIds"] == before_seen
        replay = client.post("/v1/save-slots/1/ending/decision", headers=headers(), json=body)
        assert replay.status_code == 200 and replay.json()["replayed"] is True


def test_dialogue_choice_tags_feed_account_badges_and_daily_story(content_db):
    client, database = phase5_client(content_db, dialogue_secret=SECRET)
    with client:
        assert start(client).status_code == 200
        payload = client.get("/v1/save-slots/1/dialogue/MS01", headers=headers()).json()
        completed = _complete_dialogue(client, payload, _selected(payload), request_id="phase8-dialogue")
        assert completed.status_code == 200, completed.text
        statistics = database.data["users/owner/statistics/global"]
        assert sum(statistics["behaviorTagCounts"].values()) > 0
        meta = database.data["users/owner/meta/progress"]
        assert any(badge.startswith("BADGE_FOREST_CURIOSITY_") for badge in meta["acquiredBadgeIds"])
        assert completed.json()["progression"]["badges"]
        daily = next(value for path, value in database.data.items() if "/activityDays/" in path)
        assert daily["story"]["mainCompletedCount"] == 1


def test_my_room_week_counter_counts_once_per_run_week(content_db):
    client, database = phase5_client(content_db)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["pendingStoryEvent"] = None
        run["phase"] = "STORY_COMPLETE"
        body = {"requestId": "room-week-1", "expectedServerRevision": 1}
        first = client.post("/v1/save-slots/1/my-room/open", headers=headers(), json=body)
        assert first.status_code == 200, first.text
        assert first.json()["counted"] is True
        assert first.json()["myRoomActiveWeekCount"] == 1
        assert "BADGE_WORKSHOP_ROOM_01" in first.json()["progression"]["badges"]
        second = client.post(
            "/v1/save-slots/1/my-room/open", headers=headers(),
            json={"requestId": "room-week-1-second", "expectedServerRevision": 2},
        )
        assert second.status_code == 200, second.text
        assert second.json()["counted"] is False
        assert database.data["users/owner/statistics/global"]["myRoomActiveWeekCount"] == 1


def test_collection_endpoint_exposes_account_progress_not_run_hidden_stats(content_db):
    client, _ = phase5_client(content_db)
    with client:
        response = client.get("/v1/collection", headers=headers())
        assert response.status_code == 200, response.text
        payload = response.json()
        assert set(payload) == {"meta", "statistics", "pendingCharacterUnlockIds", "settings"}
        assert payload["settings"]["activePetId"] == "PET01"
        assert payload["settings"]["activeRoomBackgroundId"] == "ROOM_DEFAULT"
        assert "hiddenStats" not in response.text
