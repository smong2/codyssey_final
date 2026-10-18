"""Offline tests for the server-owned Phase 7 adventure result boundary."""

from __future__ import annotations

from copy import deepcopy

from backend.api.app.activities import get_story_candidates
from backend.api.tests.test_phase3_account import headers
from backend.api.tests.test_phase5_save_slots import content_db, phase5_client, start
from backend.api.tests.test_phase7_activity_start import activity_db, _schedule, _start


def _complete_adventure(
    client,
    *,
    resolution="MISSION_COMPLETE",
    found_count=1,
    target_count=1,
    request="adv-comp-1",
    revision=3,
):
    return client.post(
        "/v1/save-slots/1/activities/complete-adventure",
        headers=headers(),
        json={
            "requestId": request,
            "expectedServerRevision": revision,
            "resolution": resolution,
            "foundCount": found_count,
            "targetCount": target_count,
        },
    )


def _prepare(client, database, *, exploration=50, request_prefix="adv"):
    assert start(client).status_code == 200
    run = database.data["users/owner/saveSlots/1"]["activeRun"]
    run["pendingStoryEvent"] = None
    run["phase"] = "STORY_COMPLETE"
    run["stats"]["exploration"] = exploration
    scheduled = _schedule(
        client,
        ["ADV_TEST", "REST_TEST", "REST_TEST", "REST_TEST", "REST_TEST"],
        request=f"{request_prefix}-schedule",
        revision=1,
    )
    assert scheduled.status_code == 200, scheduled.text
    begun = _start(client, request=f"{request_prefix}-start", revision=2)
    assert begun.status_code == 200, begun.text
    return begun


def test_adventure_start_owns_mission_count_seed_and_duration(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        begun = _prepare(client, database, exploration=50)
        payload = begun.json()
        assert payload["activityType"] == "ADVENTURE"
        assert payload["staminaAfterStart"] == 85
        assert payload["adventureDifficulty"] == 1
        assert payload["targetCount"] == 1
        assert payload["durationSeconds"] == 120
        assert len(payload["seed"]) >= 24
        assert payload["missionId"]
        entry = database.data["users/owner/saveSlots/1"]["activeRun"]["weeklySchedule"]["MONDAY"]
        assert entry["objectiveCount"] == payload["targetCount"]
        assert entry["adventureSeed"] == payload["seed"]
        assert entry["durationSeconds"] == payload["durationSeconds"]


def test_adventure_duration_uses_active_pet_exploration_modifier_without_changing_difficulty(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["pendingStoryEvent"] = None
        run["phase"] = "STORY_COMPLETE"
        run["stats"]["exploration"] = 50
        database.data["users/owner/meta/progress"]["unlockedPetIds"].append("PET04")
        database.data["users/owner/settings/account"]["activePetId"] = "PET04"
        scheduled = _schedule(
            client,
            ["ADV_TEST", "REST_TEST", "REST_TEST", "REST_TEST", "REST_TEST"],
            request="pet-duration-schedule", revision=1,
        )
        assert scheduled.status_code == 200, scheduled.text
        begun = _start(client, request="pet-duration-start", revision=2)
        assert begun.status_code == 200, begun.text
        assert begun.json()["adventureDifficulty"] == 1
        assert begun.json()["targetCount"] == 1
        assert begun.json()["durationSeconds"] == 121


def test_adventure_start_rejects_corrupt_locked_active_pet(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["pendingStoryEvent"] = None
        run["phase"] = "STORY_COMPLETE"
        database.data["users/owner/settings/account"]["activePetId"] = "PET04"
        assert _schedule(
            client,
            ["ADV_TEST", "REST_TEST", "REST_TEST", "REST_TEST", "REST_TEST"],
            request="locked-pet-schedule", revision=1,
        ).status_code == 200
        before = deepcopy(database.data)
        begun = _start(client, request="locked-pet-start", revision=2)
        assert begun.status_code == 409
        assert database.data == before


def test_adventure_mission_complete_awards_full_growth(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        begun = _prepare(client, database, exploration=50, request_prefix="full")
        target = begun.json()["targetCount"]
        completed = _complete_adventure(
            client, resolution="MISSION_COMPLETE", found_count=target, target_count=target,
            request="full-complete", revision=3,
        )
        assert completed.status_code == 200, completed.text
        payload = completed.json()
        assert payload["resolution"] == "MISSION_COMPLETE"
        assert payload["growthAwarded"] == {"exploration": 5}
        assert payload["explorationAfter"] == 55
        assert payload["nextDay"] == "TUESDAY"
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["completedWeekdayCount"] == 1
        assert run["runStatistics"]["adventureCount"] == 1
        assert "adventureSuccessCount" not in run["runStatistics"]
        assert database.data["users/owner/statistics/global"]["totalAdventureCount"] == 1
        daily = next(value for path, value in database.data.items() if "/activityDays/" in path)
        assert daily["activityCounts"]["adventure"] == 1


def test_adventure_timeout_uses_server_success_growth_then_partial_formula(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        # NORMAL difficulty => target 2 and base success growth 6.
        begun = _prepare(client, database, exploration=150, request_prefix="timeout")
        assert begun.json()["targetCount"] == 2
        completed = _complete_adventure(
            client, resolution="TIMEOUT", found_count=1, target_count=2,
            request="timeout-complete", revision=3,
        )
        assert completed.status_code == 200, completed.text
        payload = completed.json()
        assert payload["growthAwarded"] == {"exploration": 1}
        assert payload["explorationAfter"] == 151
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["runStatistics"]["adventureCount"] == 1


def test_adventure_timeout_zero_found_awards_zero_growth(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        begun = _prepare(client, database, exploration=150, request_prefix="zero")
        completed = _complete_adventure(
            client, resolution="TIMEOUT", found_count=0,
            target_count=begun.json()["targetCount"], request="zero-complete", revision=3,
        )
        assert completed.status_code == 200, completed.text
        assert completed.json()["growthAwarded"] == {"exploration": 0}
        assert database.data["users/owner/saveSlots/1"]["activeRun"]["stats"]["exploration"] == 150


def test_adventure_rejects_client_target_count_forgery_without_partial_commit(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        begun = _prepare(client, database, exploration=150, request_prefix="forge")
        assert begun.json()["targetCount"] == 2
        before = deepcopy(database.data)
        forged = _complete_adventure(
            client, resolution="TIMEOUT", found_count=1, target_count=3,
            request="forge-complete", revision=3,
        )
        assert forged.status_code == 409
        assert database.data == before


def test_adventure_retry_is_idempotent_and_conflict_is_409(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        begun = _prepare(client, database, request_prefix="idem")
        target = begun.json()["targetCount"]
        first = _complete_adventure(
            client, resolution="MISSION_COMPLETE", found_count=target, target_count=target,
            request="idem-complete", revision=3,
        )
        assert first.status_code == 200 and first.json()["replayed"] is False
        second = _complete_adventure(
            client, resolution="MISSION_COMPLETE", found_count=target, target_count=target,
            request="idem-complete", revision=3,
        )
        assert second.status_code == 200 and second.json()["replayed"] is True
        assert database.data["users/owner/saveSlots/1"]["activeRun"]["stats"]["exploration"] == 55
        conflict = _complete_adventure(
            client, resolution="MISSION_COMPLETE", found_count=target, target_count=target,
            request="idem-stale", revision=3,
        )
        assert conflict.status_code == 409


def test_adventure_story_candidate_uses_existing_after_activity_contract(activity_db):
    class ForcedCandidate:
        def after_activity(self, *, version, run, activity):
            assert version == "dev-dialogue-v1"
            assert activity.activity_type == "ADVENTURE"
            assert activity.location_id == "LOC_TEST"
            return {
                "storyId": "TEST_LOCATION", "eventId": "TEST_EVENT", "storyType": "LOCATION",
                "sourceLocationId": activity.location_id, "selectedWeek": run["week"],
                "selectedDay": run["day"],
            }

    client, database = phase5_client(activity_db)
    client.app.dependency_overrides[get_story_candidates] = lambda: ForcedCandidate()
    with client:
        begun = _prepare(client, database, request_prefix="story")
        target = begun.json()["targetCount"]
        completed = _complete_adventure(
            client, resolution="MISSION_COMPLETE", found_count=target, target_count=target,
            request="story-complete", revision=3,
        )
        assert completed.status_code == 200, completed.text
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["day"] == "MONDAY"
        assert run["phase"] == "ACTIVITY_STORY_PENDING"
        assert run["pendingStoryEvent"]["eventId"] == "TEST_EVENT"


def test_adventure_rejects_inconsistent_counts_and_wrong_activity_type(activity_db):
    client, database = phase5_client(activity_db)
    with client:
        assert _complete_adventure(
            client, resolution="MISSION_COMPLETE", found_count=0, target_count=1,
        ).status_code == 422
        assert _complete_adventure(
            client, resolution="TIMEOUT", found_count=1, target_count=1,
        ).status_code == 422
        assert _complete_adventure(
            client, resolution="TIMEOUT", found_count=5, target_count=3,
        ).status_code == 422

        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["pendingStoryEvent"] = None
        run["phase"] = "STORY_COMPLETE"
        assert _schedule(
            client, ["CLASS_TEST", "REST_TEST", "REST_TEST", "REST_TEST", "REST_TEST"],
            request="wrong-type-schedule", revision=1,
        ).status_code == 200
        assert _start(client, request="wrong-type-start", revision=2).status_code == 200
        wrong_type = _complete_adventure(
            client, resolution="MISSION_COMPLETE", found_count=1, target_count=1,
            request="wrong-type-complete", revision=3,
        )
        assert wrong_type.status_code == 409
        assert "adventure" in wrong_type.json()["detail"].lower()
