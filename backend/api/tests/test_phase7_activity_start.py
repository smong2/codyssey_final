"""Offline tests for schedule confirmation and pre-content checkpoint."""

from __future__ import annotations

from copy import deepcopy
from pathlib import Path
import shutil
import sqlite3
from datetime import datetime, timezone

import pytest

from backend.api.app.activity_rules import (ActivityMaster, ActivityMasterError, REST_RECOVERIES,
                                            adventure_duration_seconds,
                                            adventure_objective_count, difficulty)
from backend.api.tests.test_phase3_account import headers
from backend.api.tests.test_phase5_save_slots import content_db, phase5_client, start
from backend.api.app.activities import get_story_candidates
from backend.api.app.dialogue import _apply_effects
from backend.api.app.story_candidates import StorySelectionError


@pytest.fixture
def activity_db(content_db, tmp_path):
    target = tmp_path / "activities.sqlite3"
    shutil.copyfile(content_db, target)
    with sqlite3.connect(target) as connection:
        version = "dev-dialogue-v1"
        connection.execute(
            "INSERT INTO locations(version,location_id,display_name) VALUES (?,?,?)",
            (version, "LOC_TEST", "Test location"),
        )
        connection.executemany(
            """INSERT INTO activities(version,activity_id,activity_type,display_name,
                                      location_id,stamina_cost,target_stat)
               VALUES (?,?,?,?,?,?,?)""",
            [
                (version, "CLASS_TEST", "CLASS", "Test class", "LOC_TEST", 10, "magic"),
                (version, "ADV_TEST", "ADVENTURE", "Test adventure", "LOC_TEST", 15, "exploration"),
                (version, "REST_TEST", "REST", "Test rest", None, 0, None),
                (version, "fairy-trade", "SPECIAL", "Test special", "LOC_TEST", 0, None),
            ],
        )
        connection.execute(
            """INSERT INTO minigames(version,game_id,activity_id,display_name,target_stat)
               VALUES (?,?,?,?,?)""",
            (version, "game-test", "CLASS_TEST", "Test game", "magic"),
        )
    return target


def _schedule(client, ids, *, request="schedule-1", revision=1):
    return client.post(
        "/v1/save-slots/1/schedule", headers=headers(),
        json={"requestId": request, "expectedServerRevision": revision, "activityIds": ids},
    )


def _start(client, *, request="activity-start-1", revision=2):
    return client.post(
        "/v1/save-slots/1/activities/start", headers=headers(),
        json={"requestId": request, "expectedServerRevision": revision},
    )


def _complete_rest(client, *, request="rest-complete-1", revision=3):
    return client.post(
        "/v1/save-slots/1/activities/complete-rest", headers=headers(),
        json={"requestId": request, "expectedServerRevision": revision},
    )


def _complete_special(client, *, request="special-complete-1", revision=3, skip=False,
                      transfer=None):
    return client.post(
        "/v1/save-slots/1/activities/complete-special", headers=headers(),
        json={"requestId": request, "expectedServerRevision": revision,
              "skip": skip, "transfer": transfer},
    )


def _complete_forced_rest(client, *, request="forced-rest-1", revision=3):
    return client.post(
        "/v1/save-slots/1/activities/complete-forced-rest", headers=headers(),
        json={"requestId": request, "expectedServerRevision": revision},
    )


def _close_week(client, *, request="close-week-1", revision=4):
    return client.post(
        "/v1/save-slots/1/weeks/close", headers=headers(),
        json={"requestId": request, "expectedServerRevision": revision},
    )


def _complete_class_quit(client, *, request="class-quit-1", revision=3):
    return client.post(
        "/v1/save-slots/1/activities/complete-class-quit", headers=headers(),
        json={"requestId": request, "expectedServerRevision": revision},
    )


def _ack_summary(client, *, request="ack-summary-1", revision=5):
    return client.post(
        "/v1/save-slots/1/weeks/ack-summary", headers=headers(),
        json={"requestId": request, "expectedServerRevision": revision},
    )


def test_schedule_and_activity_start_are_retry_safe(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        raw = database.data["users/owner/saveSlots/1"]
        raw["activeRun"]["pendingStoryEvent"] = None
        raw["activeRun"]["phase"] = "STORY_COMPLETE"
        ids = ["CLASS_TEST", "ADV_TEST", "REST_TEST", "CLASS_TEST", "ADV_TEST"]
        confirmed = _schedule(client, ids)
        assert confirmed.status_code == 200, confirmed.text
        assert confirmed.json()["serverRevision"] == 2
        assert _schedule(client, ids).json()["replayed"] is True
        assert len(raw["activeRun"]["weeklySchedule"]) == 0  # repository replaces document
        checked = database.data["users/owner/saveSlots/1"]
        assert checked["activeRun"]["weeklySchedule"]["MONDAY"]["status"] == "PLANNED"
        assert _start(client, revision=1).status_code == 409
        begun = _start(client)
        assert begun.status_code == 200, begun.text
        assert begun.json()["staminaCost"] == 10
        assert begun.json()["staminaAfterStart"] == 90
        assert begun.json()["rewardDifficulty"] == "EASY"
        assert begun.json()["assistLevel"] == 0
        assert _start(client).json()["replayed"] is True
        saved = database.data["users/owner/saveSlots/1"]
        assert saved["activeRun"]["stamina"]["current"] == 90
        assert saved["activeRun"]["weeklySchedule"]["MONDAY"]["status"] == "IN_PROGRESS"
        assert saved["activeRun"]["weeklySchedule"]["MONDAY"]["staminaBefore"] == 100
        assert saved["activeRun"]["weeklySchedule"]["MONDAY"]["rewardDifficulty"] == "EASY"
        assert saved["serverRevision"] == 3
        assert _start(client, request="other", revision=3).status_code == 409


def test_pending_story_and_missing_catalog_fail_without_writes(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        before = deepcopy(database.data)
        ids = ["CLASS_TEST"] * 5
        assert _schedule(client, ids).status_code == 409
        assert database.data == before
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        before = deepcopy(database.data)
        assert _schedule(client, ["UNKNOWN"] * 5).status_code == 503
        assert database.data == before


def test_low_stamina_never_bypasses_forced_rest(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["pendingStoryEvent"] = None
        run["stamina"]["current"] = 9
        assert _schedule(client, ["REST_TEST"] * 5).status_code == 409
        assert database.data["users/owner/saveSlots/1"]["serverRevision"] == 1


def test_locked_forced_rest_uses_three_weekdays_then_recovers_to_100(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["pendingStoryEvent"] = None
        run["stamina"]["current"] = 9
        ids = [None, None, None, "REST_TEST", "REST_TEST"]
        confirmed = _schedule(client, ids)
        assert confirmed.status_code == 200, confirmed.text
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["weeklySchedule"]["MONDAY"]["locked"] is True
        assert run["forcedRest"] == {"active": True, "remainingWeekdays": 3}
        for index in range(3):
            begun = _start(client, request=f"forced-start-{index}", revision=2 + 2 * index)
            assert begun.status_code == 200, begun.text
            assert begun.json()["activityType"] == "FORCED_REST"
            assert begun.json()["staminaCost"] == 0
            result = _complete_forced_rest(client, request=f"forced-end-{index}", revision=3 + 2 * index)
            assert result.status_code == 200, result.text
            assert result.json()["remainingWeekdays"] == 2 - index
            assert result.json()["staminaCurrent"] == (100 if index == 2 else 9)
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["day"] == "THURSDAY"
        assert run["forcedRest"] == {"active": False, "remainingWeekdays": 0}
        assert [(item["week"], item["day"], item["type"], item["forcedRestDays"])
                for item in run["activityHistory"]] == [
                    (1, 0, "FORCED_REST", 2), (1, 1, "FORCED_REST", 1),
                    (1, 2, "FORCED_REST", 0),
                ]
        assert run["runStatistics"]["restCount"] == 0
        assert database.data["users/owner/statistics/global"]["totalRestCount"] == 0
        summary = next(value for path, value in database.data.items() if "/activityDays/" in path)
        assert summary["activityCounts"]["forcedRest"] == 3
        assert summary["activityCounts"]["rest"] == 0
        normal = _start(client, request="thursday-start", revision=8)
        assert normal.status_code == 200 and normal.json()["activityType"] == "REST"


def test_low_stamina_replaces_midweek_activity_and_preserves_weekend_remainder(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["CLASS_TEST"] * 5).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        for day in ("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"):
            run["weeklySchedule"][day]["status"] = "COMPLETED"
        run["day"] = "FRIDAY"
        run["completedWeekdayCount"] = 4
        run["stamina"]["current"] = 4
        begun = _start(client)
        assert begun.status_code == 200, begun.text
        entry = database.data["users/owner/saveSlots/1"]["activeRun"]["weeklySchedule"]["FRIDAY"]
        assert entry["contentId"] == "FORCED_REST" and entry["replacedContentId"] == "CLASS_TEST"
        result = _complete_forced_rest(client)
        assert result.status_code == 200, result.text
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["phase"] == "WEEKEND_PENDING" and run["day"] == "FRIDAY"
        assert run["forcedRest"]["remainingWeekdays"] == 2
        assert run["stamina"]["current"] == 4
        assert _complete_forced_rest(client).json()["replayed"] is True


def test_forced_rest_carries_across_week_and_locks_next_schedule(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["pendingStoryEvent"] = None
        # The first four days were already confirmed and completed before stamina fell.
        assert _schedule(client, ["REST_TEST"] * 5).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        for day in ("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"):
            run["weeklySchedule"][day]["status"] = "COMPLETED"
        run["completedWeekdayCount"] = 4
        run["day"] = "FRIDAY"
        run["stamina"]["current"] = 5
        assert _start(client).status_code == 200
        assert _complete_forced_rest(client).status_code == 200
        closed = _close_week(client)
        assert closed.status_code == 200, closed.text
        assert closed.json()["nextWeek"] == 2
        assert closed.json()["summary"]["forcedRestDays"] == 1
        assert _close_week(client).json()["replayed"] is True
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["week"] == 2 and run["day"] == "MONDAY"
        assert run["forcedRest"]["remainingWeekdays"] == 2
        assert run["activityHistory"][-1]["week"] == 1
        assert run["activityHistory"][-1]["day"] == 4
        assert run["activityHistory"][-1]["type"] == "FORCED_REST"
        assert _schedule(client, [None, None, "REST_TEST", "REST_TEST", "REST_TEST"],
                         request="week2-schedule", revision=5).status_code == 409
        acknowledged = _ack_summary(client)
        assert acknowledged.status_code == 200 and acknowledged.json()["phase"] == "SCHEDULE_READY"
        assert _schedule(client, [None, None, "REST_TEST", "REST_TEST", "REST_TEST"],
                         request="week2-schedule", revision=6).status_code == 200
        for index in range(2):
            assert _start(client, request=f"week2-forced-start-{index}", revision=7 + 2 * index).status_code == 200
            done = _complete_forced_rest(client, request=f"week2-forced-end-{index}", revision=8 + 2 * index)
            assert done.status_code == 200, done.text
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["day"] == "WEDNESDAY" and run["stamina"]["current"] == 100
        assert run["forcedRest"] == {"active": False, "remainingWeekdays": 0}


def test_week_close_prepares_fixed_main_story_before_next_schedule(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["pendingStoryEvent"] = None
        run["week"] = 9
        assert _schedule(client, ["REST_TEST"] * 5).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        for entry in run["weeklySchedule"].values():
            entry["status"] = "COMPLETED"
        run["day"] = "FRIDAY"
        run["completedWeekdayCount"] = 5
        run["phase"] = "WEEKEND_PENDING"
        closed = _close_week(client, revision=2)
        assert closed.status_code == 200, closed.text
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["week"] == 10 and run["phase"] == "WEEK_SUMMARY_PENDING"
        assert run["pendingStoryEvent"]["eventId"] == "MS02"
        assert _schedule(client, ["REST_TEST"] * 5, request="week10-schedule", revision=3).status_code == 409
        acknowledged = _ack_summary(client, revision=3)
        assert acknowledged.status_code == 200 and acknowledged.json()["phase"] == "MAIN_STORY_PENDING"
        assert _schedule(client, ["REST_TEST"] * 5, request="week10-schedule", revision=4).status_code == 409


def test_week_52_closes_to_final_summary_not_week_53(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["pendingStoryEvent"] = None
        run["week"] = 52
        assert _schedule(client, ["REST_TEST"] * 5).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        for entry in run["weeklySchedule"].values():
            entry["status"] = "COMPLETED"
        run["day"] = "FRIDAY"
        run["completedWeekdayCount"] = 5
        run["phase"] = "WEEKEND_PENDING"
        closed = _close_week(client, revision=2)
        assert closed.status_code == 200, closed.text
        assert closed.json()["nextWeek"] is None
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["week"] == 52 and run["phase"] == "FINAL_SUMMARY_PENDING"
        assert _ack_summary(client, revision=3).json()["phase"] == "ENDING_PENDING"


def test_week_close_fails_closed_when_weekend_story_rule_exists(activity_db):
    with sqlite3.connect(activity_db) as connection:
        connection.execute(
            """INSERT INTO story_event_rules(version,event_id,trigger_phase,selection_policy)
               VALUES (?,?,?,?)""",
            ("dev-dialogue-v1", "MS02", "WEEKEND", "FIXED"),
        )
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["REST_TEST"] * 5).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        for entry in run["weeklySchedule"].values():
            entry["status"] = "COMPLETED"
        run["day"] = "FRIDAY"
        run["completedWeekdayCount"] = 5
        run["phase"] = "WEEKEND_PENDING"
        before = deepcopy(database.data)
        assert _close_week(client, revision=2).status_code == 503
        assert database.data == before


def test_special_is_limited_to_one_day(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        before = deepcopy(database.data)
        assert _schedule(client, ["fairy-trade"] * 5).status_code == 409
        assert database.data == before


def test_catalog_contract_and_assist_level(activity_db):
    assert difficulty(350, 4) == ("HARD", "EASY", 2)
    assert difficulty(500, 2) == ("VERY_HARD", "HARD", 1)
    assert difficulty(99, 20) == ("EASY", "EASY", 2)
    with sqlite3.connect(activity_db) as connection:
        connection.execute("UPDATE activities SET stamina_cost=0 WHERE activity_id='CLASS_TEST'")
    with pytest.raises(ActivityMasterError):
        ActivityMaster(activity_db).get(version="dev-dialogue-v1", activity_id="CLASS_TEST")
    with sqlite3.connect(activity_db) as connection:
        connection.execute("UPDATE activities SET stamina_cost=10 WHERE activity_id='CLASS_TEST'")
        connection.execute("UPDATE minigames SET target_stat='knowledge' WHERE game_id='game-test'")
    with pytest.raises(ActivityMasterError):
        ActivityMaster(activity_db).get(version="dev-dialogue-v1", activity_id="CLASS_TEST")


def test_adventure_server_contract_owns_objective_count_and_duration():
    assert adventure_objective_count(50, "ADV_GREENHOUSE") == 1
    assert adventure_objective_count(150, "ADV_GREENHOUSE") == 2
    assert adventure_objective_count(250, "ADV_GREENHOUSE") == 3
    assert adventure_objective_count(500, "ADV_GREENHOUSE") == 5
    with pytest.raises(ValueError, match="reviewed master"):
        adventure_objective_count(250, "UNREVIEWED_ADVENTURE")
    assert adventure_duration_seconds(50) == 120
    assert adventure_duration_seconds(50, 3) == 121
    assert adventure_duration_seconds(500) == 240
    assert adventure_duration_seconds(250) == 173


def test_pet_master_modifiers_are_loaded_from_the_versioned_catalog(activity_db):
    assert ActivityMaster(activity_db).pet_modifiers(
        version="dev-dialogue-v1", pet_id="PET04"
    ) == {"knowledge": 0, "expression": 5, "skill": 0, "exploration": 3, "magic": 0}
    with pytest.raises(ActivityMasterError):
        ActivityMaster(activity_db).pet_modifiers(version="dev-dialogue-v1", pet_id="PET99")


def test_rest_completion_commits_slot_global_and_kst_day_once(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["pendingStoryEvent"] = None
        assert _schedule(client, ["REST_TEST"] * 5).status_code == 200
        assert _start(client).status_code == 200
        result = _complete_rest(client)
        assert result.status_code == 200, result.text
        payload = result.json()
        assert payload["serverRevision"] == 4
        assert payload["nextDay"] == "TUESDAY"
        assert payload["weekComplete"] is False
        assert payload["recoveryRoll"] in REST_RECOVERIES
        assert payload["staminaRecovered"] == 0  # began at full stamina
        assert _complete_rest(client).json()["replayed"] is True
        slot = database.data["users/owner/saveSlots/1"]
        assert slot["activeRun"]["weeklySchedule"]["MONDAY"]["resolution"] == "SUCCESS"
        assert slot["activeRun"]["runStatistics"]["restCount"] == 1
        assert slot["activeRun"]["completedWeekdayCount"] == 1
        assert database.data["users/owner/statistics/global"]["totalRestCount"] == 1
        day_paths = [path for path in database.data if "/activityDays/" in path]
        assert len(day_paths) == 1
        daily = database.data[day_paths[0]]
        assert daily["uid"] == "owner" and daily["kstDate"] == day_paths[0].rsplit("/", 1)[1]
        assert daily["activityCounts"]["rest"] == 1
        assert daily["minigame"]["playCount"] == 0
        assert _complete_rest(client, request="duplicate-rest", revision=4).status_code == 409


def test_rest_completion_rejects_corrupt_daily_summary_without_partial_commit(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["REST_TEST"] * 5).status_code == 200
        assert _start(client).status_code == 200
        # Compute the same actual KST day that the endpoint will address.
        from datetime import datetime
        from zoneinfo import ZoneInfo
        day = datetime.now(ZoneInfo("Asia/Seoul")).date().isoformat()
        database.data[f"users/owner/activityDays/{day}"] = {
            "uid": "wrong-owner", "kstDate": day,
            "activityCounts": {"rest": 0},
        }
        before = deepcopy(database.data)
        assert _complete_rest(client).status_code == 409
        assert database.data == before


def test_five_rest_days_stop_at_weekend_boundary(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["REST_TEST"] * 5).status_code == 200
        for index in range(5):
            started = _start(client, request=f"rest-start-{index}", revision=2 + 2 * index)
            assert started.status_code == 200, started.text
            completed = _complete_rest(client, request=f"rest-done-{index}", revision=3 + 2 * index)
            assert completed.status_code == 200, completed.text
            assert completed.json()["weekComplete"] is (index == 4)
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["completedWeekdayCount"] == 5
        assert run["day"] == "FRIDAY" and run["phase"] == "WEEKEND_PENDING"
        assert database.data["users/owner/statistics/global"]["totalRestCount"] == 5
        daily = next(value for path, value in database.data.items() if "/activityDays/" in path)
        assert daily["activityCounts"]["rest"] == 5
        assert _start(client, request="sixth", revision=12).status_code == 409


def test_special_transfer_is_atomic_and_retry_safe(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["fairy-trade", "REST_TEST", "REST_TEST", "REST_TEST", "REST_TEST"]).status_code == 200
        assert _start(client).status_code == 200
        transfer = {"fromStat": "knowledge", "toStat": "magic", "amount": 5}
        result = _complete_special(client, transfer=transfer)
        assert result.status_code == 200, result.text
        assert result.json()["resolution"] == "TRANSFERRED"
        assert _complete_special(client, transfer=transfer).json()["replayed"] is True
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["stats"]["knowledge"] == 45
        assert run["stats"]["magic"] == 55
        assert run["day"] == "TUESDAY"
        assert run["weeklySchedule"]["MONDAY"]["resolution"] == "TRANSFERRED"
        daily = next(value for path, value in database.data.items() if "/activityDays/" in path)
        assert daily["activityCounts"]["special"] == 1
        assert _complete_special(client, request="different", revision=4, transfer=transfer).status_code == 409


def test_special_invalid_transfer_does_not_commit(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["fairy-trade", "REST_TEST", "REST_TEST", "REST_TEST", "REST_TEST"]).status_code == 200
        assert _start(client).status_code == 200
        before = deepcopy(database.data)
        bad = {"fromStat": "knowledge", "toStat": "knowledge", "amount": 5}
        assert _complete_special(client, transfer=bad).status_code == 409
        assert database.data == before
        assert _complete_special(client, transfer={"fromStat": "knowledge", "toStat": "magic", "amount": 6}).status_code == 422
        assert database.data == before


def test_special_pending_story_stays_on_activity_day_until_dialogue(activity_db):
    class ForcedCandidate:
        def before_activity(self, *, version, run, activity):
            assert activity.activity_type == "SPECIAL"
            assert activity.location_id == "LOC_TEST"
            return {"storyId": "TEST_STORY", "eventId": "TEST_EVENT", "storyType": "LOCATION",
                    "sourceLocationId": activity.location_id, "selectedWeek": run["week"],
                    "selectedDay": run["day"]}

        def after_activity(self, *, version, run, activity):
            return None

    client, database = phase5_client(activity_db)
    client.app.dependency_overrides[get_story_candidates] = lambda: ForcedCandidate()
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["fairy-trade", "REST_TEST", "REST_TEST", "REST_TEST", "REST_TEST"]).status_code == 200
        begun = _start(client)
        assert begun.status_code == 200, begun.text
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["day"] == "MONDAY" and run["phase"] == "ACTIVITY_PRE_STORY_PENDING"
        assert run["completedWeekdayCount"] == 0
        assert run["pendingStoryEvent"]["eventId"] == "TEST_EVENT"
        run["storyEventWindow"].pop("locationStoryCount")
        updated, _ = _apply_effects(
            run, {"choice": [], "event": [], "important": []}, mode="COMPLETE",
            event_id="TEST_EVENT", story_type="LOCATION", step_no=1,
            choice_ids=[], now=datetime.now(timezone.utc),
        )
        assert updated["day"] == "MONDAY" and updated["phase"] == "ACTIVITY_IN_PROGRESS"
        assert updated["completedWeekdayCount"] == 0
        assert updated["storyEventWindow"]["locationStoryCount"] == 1
        assert updated["pendingStoryEvent"] is None


def test_special_story_rule_failure_rolls_back_transfer_and_summary(activity_db):
    class MissingRules:
        def before_activity(self, *, version, run, activity):
            return None

        def after_activity(self, *, version, run, activity):
            raise StorySelectionError("Story rules unavailable")

    client, database = phase5_client(activity_db)
    client.app.dependency_overrides[get_story_candidates] = lambda: MissingRules()
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["fairy-trade", "REST_TEST", "REST_TEST", "REST_TEST", "REST_TEST"]).status_code == 200
        assert _start(client).status_code == 200
        before = deepcopy(database.data)
        result = _complete_special(client, transfer={"fromStat": "knowledge", "toStat": "magic", "amount": 3})
        assert result.status_code == 503
        assert database.data == before


def test_class_quit_uses_saved_difficulty_admin_balance_and_low_stamina(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["pendingStoryEvent"] = None
        run["stats"]["magic"] = 400
        run["stamina"]["current"] = 30
        database.data["systemSettings/balance"] = {
            "rewardMultiplier": {stat: 0.8 for stat in (
                "knowledge", "expression", "skill", "exploration", "magic")},
            "version": 2, "updatedAt": datetime.now(timezone.utc), "updatedBy": "admin-1",
        }
        assert _schedule(client, ["CLASS_TEST", "REST_TEST", "REST_TEST", "REST_TEST", "REST_TEST"]).status_code == 200
        begun = _start(client)
        assert begun.status_code == 200 and begun.json()["rewardDifficulty"] == "VERY_HARD"
        result = _complete_class_quit(client)
        assert result.status_code == 200, result.text
        assert result.json()["growthApplied"] == 1  # floor(3 * 0.8 * 0.5)
        assert result.json()["balanceVersion"] == 2
        assert _complete_class_quit(client).json()["replayed"] is True
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["stats"]["magic"] == 401
        assert run["minigameFailStreaks"]["game-test"] == 1
        assert run["day"] == "TUESDAY"
        assert run["weeklySchedule"]["MONDAY"]["endReason"] == "QUIT"
        assert run["runStatistics"]["classCount"] == 1
        assert run["runStatistics"]["minigamePlayCount"] == 1
        stats = database.data["users/owner/statistics/global"]
        assert stats["totalClassCount"] == 1 and stats["totalMinigamePlayCount"] == 1
        daily = next(value for path, value in database.data.items() if "/activityDays/" in path)
        assert daily["activityCounts"]["class"] == 1
        assert daily["minigame"]["failCount"] == 1
        assert daily["minigame"]["byGameId"]["game-test"]["fail"] == 1


def test_class_quit_invalid_balance_fails_without_partial_growth(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["CLASS_TEST"] * 5).status_code == 200
        assert _start(client).status_code == 200
        database.data["systemSettings/balance"] = {"rewardMultiplier": {"magic": 1.0}}
        before = deepcopy(database.data)
        assert _complete_class_quit(client).status_code == 503
        assert database.data == before


def test_repeated_class_quit_uses_default_balance_and_counts_retry_once(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["pendingStoryEvent"] = None
        run["stats"]["magic"] = 150
        assert _schedule(client, ["CLASS_TEST"] * 5).status_code == 200
        assert _start(client).status_code == 200
        first = _complete_class_quit(client)
        assert first.status_code == 200 and first.json()["growthApplied"] == 1
        assert first.json()["balanceVersion"] == 0
        assert _start(client, request="class-start-two", revision=4).status_code == 200
        second = _complete_class_quit(client, request="class-quit-two", revision=5)
        assert second.status_code == 200 and second.json()["failStreak"] == 2
        stats = database.data["users/owner/statistics/global"]
        assert stats["totalClassCount"] == 2
        assert stats["retryAfterFailureCount"] == 1
        assert database.data["users/owner/saveSlots/1"]["activeRun"]["stats"]["magic"] == 152


def test_friday_interrupted_activity_recovers_to_week_close_boundary(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["REST_TEST"] * 5).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        for day in ("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"):
            run["weeklySchedule"][day]["status"] = "COMPLETED"
        run["day"] = "FRIDAY"
        run["completedWeekdayCount"] = 4
        assert _start(client).status_code == 200
        recovered = client.post(
            "/v1/save-slots/1/recover", headers=headers(),
            json={"requestId": "friday-recover", "expectedServerRevision": 3},
        )
        assert recovered.status_code == 200, recovered.text
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["day"] == "FRIDAY" and run["completedWeekdayCount"] == 5
        assert run["phase"] == "MY_ROOM_RECOVERY"
        assert _close_week(client, revision=4).status_code == 200
