"""Phase 9 Long-term Play Memory, Gemini/fallback, and finalization regressions."""

from __future__ import annotations

from copy import deepcopy

from backend.api.app.endings import get_ending_letter_generator
from backend.api.app.gemini import GeminiGenerationError
from backend.api.tests.test_phase3_account import headers
from backend.api.tests.test_phase5_save_slots import content_db, phase5_client, start


class FakeGenerator:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls: list[dict] = []

    def generate(self, context: dict) -> str:
        self.calls.append(deepcopy(context))
        if not self.responses:
            raise AssertionError("Fake Gemini was called more times than expected")
        result = self.responses.pop(0)
        if isinstance(result, Exception):
            raise result
        if callable(result):
            return result(context)
        return result


def _all_mapping_keys(value):
    if isinstance(value, dict):
        for key, nested in value.items():
            yield str(key)
            yield from _all_mapping_keys(nested)
    elif isinstance(value, (list, tuple)):
        for nested in value:
            yield from _all_mapping_keys(nested)


def _valid_letter(context: dict) -> str:
    character = context["character"]["name"]
    ending = context["ending"]["name"]
    return (
        f"{character}에게\n\n"
        "아르카디아에서 보낸 한 해 동안 너는 수업과 모험, 사람들과의 만남 속에서 "
        "여러 가지 일을 직접 경험하고 네 방식으로 다음 장면을 만들어 왔구나. "
        f"그 기록에서 이어진 미래의 첫걸음은 「{ending}」이야. "
        "지금까지 해 본 일들은 앞으로 새로운 질문을 만나거나 낯선 일을 시작할 때 "
        "차분히 살펴보고 다시 시도할 수 있는 좋은 경험이 되어 줄 거야. "
        "앞으로도 누군가가 정해 준 답보다 네가 직접 보고 배우고 이야기한 것을 바탕으로 "
        "새로운 길을 하나씩 만들어 가길 바랄게.\n\n"
        "— 아르카디아 아카데미"
    )


def _ready_for_decision(client, database, *, regular=False):
    started = start(client)
    assert started.status_code == 200, started.text
    run = database.data["users/owner/saveSlots/1"]["activeRun"]
    run["week"] = 52
    run["phase"] = "ENDING_PENDING"
    run["pendingStoryEvent"] = None
    run["hiddenStats"]["curiosity"] = 24
    run["hiddenStats"]["cooperation"] = 13
    run["runStatistics"].update({
        "classCount": 72,
        "adventureCount": 41,
        "minigamePlayCount": 72,
        "minigameClearCount": 61,
        "npcEncounterCount": 18,
        "completedNpcStoryCount": 3,
        "locationDiscoveryCount": 9,
        "importantChoiceCount": 1,
    })
    run["runStatistics"]["classCounts"].update({
        "knowledge": 18, "expression": 12, "skill": 14, "exploration": 11, "magic": 17,
    })
    run["representativeChoices"] = [
        {"eventId": "MS05", "choiceId": "MS05_S3_TELL_ALL", "week": 49},
    ]
    if regular:
        run["stats"]["exploration"] = 320
        run["stats"]["knowledge"] = 220
    decision = client.post(
        "/v1/save-slots/1/ending/decision",
        headers=headers(),
        json={"requestId": "phase9-decision", "expectedServerRevision": 1},
    )
    assert decision.status_code == 200, decision.text
    return decision.json()


def _prepare(client, *, request_id="phase9-prepare", revision=2):
    return client.post(
        "/v1/save-slots/1/ending/prepare",
        headers=headers(),
        json={"requestId": request_id, "expectedServerRevision": revision},
    )


def test_prepare_uses_current_run_long_term_memory_and_never_regenerates_on_resume(content_db):
    client, database = phase5_client(content_db)
    fake = FakeGenerator([_valid_letter])
    client.app.dependency_overrides[get_ending_letter_generator] = lambda: fake
    with client:
        decision = _ready_for_decision(client, database)
        assert decision["endingId"] == "ENDING_STARPATH_PIONEER"
        prepared = _prepare(client)
        assert prepared.status_code == 200, prepared.text
        payload = prepared.json()
        assert payload["phase"] == "ENDING_READY"
        assert payload["letter"]["content"].endswith("— 아르카디아 아카데미")
        assert 4 <= len(payload["playRecords"]) <= 6
        assert payload["representativeChoices"] == [{
            "eventId": "MS05", "choiceId": "MS05_S3_TELL_ALL", "week": 49,
            "summary": "확인한 사실을 모두에게 먼저 알린다",
        }]
        assert len(fake.calls) == 1
        memory = fake.calls[0]
        assert memory["character"]["id"] == "CH01"
        assert memory["playRecords"][0]["count"] == 72
        assert 1 <= len(memory["hiddenHighlights"]) <= 3
        normalized_keys = {
            key.lower().replace("_", "").replace("-", "")
            for key in _all_mapping_keys(memory)
        }
        assert normalized_keys.isdisjoint({
            "uid", "useruid", "firebaseuid", "email", "password",
        })
        # The in-memory Firebase fixture uses "owner" as the authenticated UID.
        # Check the known secret identity value separately instead of substring-
        # scanning arbitrary field names such as `futureSceneGuide` (contains "uid").
        assert "owner" not in repr(memory)

        # Same or different HTTP retry after the safe save returns the exact stored result.
        retry = _prepare(client)
        assert retry.status_code == 200 and retry.json()["replayed"] is True
        assert retry.json()["letter"] == payload["letter"]
        assert len(fake.calls) == 1
        resumed = client.get("/v1/save-slots/1/ending", headers=headers())
        assert resumed.status_code == 200
        assert resumed.json()["recordId"] == payload["recordId"]
        assert resumed.json()["letter"] == payload["letter"]

        stored = database.data["users/owner/saveSlots/1"]["activeRun"]["endingPrepared"]
        assert stored["letter"]["generationStatus"] == "GENERATED"
        assert set(stored["hiddenStatsSummary"]) == {"dominant"}
        assert "memoryContextHash" in stored and len(stored["memoryContextHash"]) == 64


def test_invalid_first_gemini_letter_retries_once_then_saves_valid_result(content_db):
    client, database = phase5_client(content_db)
    fake = FakeGenerator(["too short", _valid_letter])
    client.app.dependency_overrides[get_ending_letter_generator] = lambda: fake
    with client:
        _ready_for_decision(client, database)
        prepared = _prepare(client)
        assert prepared.status_code == 200, prepared.text
        assert len(fake.calls) == 2
        stored = database.data["users/owner/saveSlots/1"]["activeRun"]["endingPrepared"]
        assert stored["letter"]["generationStatus"] == "GENERATED"


def test_child_safety_validation_rejects_diagnostic_language_before_retry(content_db):
    client, database = phase5_client(content_db)

    def unsafe_letter(context):
        return _valid_letter(context).replace(
            "아르카디아에서 보낸 한 해 동안",
            "너는 원래 조심성이 부족한 아이야. 아르카디아에서 보낸 한 해 동안",
        )

    fake = FakeGenerator([unsafe_letter, _valid_letter])
    client.app.dependency_overrides[get_ending_letter_generator] = lambda: fake
    with client:
        _ready_for_decision(client, database)
        prepared = _prepare(client)
        assert prepared.status_code == 200, prepared.text
        assert len(fake.calls) == 2
        assert "너는 원래" not in prepared.json()["letter"]["content"]
        stored = database.data["users/owner/saveSlots/1"]["activeRun"]["endingPrepared"]
        assert stored["letter"]["generationStatus"] == "GENERATED"


def test_gemini_provider_failure_twice_uses_reviewed_fallback_and_does_not_block_finish(content_db):
    client, database = phase5_client(content_db)
    fake = FakeGenerator([
        GeminiGenerationError("provider unavailable"),
        GeminiGenerationError("provider unavailable"),
    ])
    client.app.dependency_overrides[get_ending_letter_generator] = lambda: fake
    with client:
        _ready_for_decision(client, database)
        prepared = _prepare(client)
        assert prepared.status_code == 200, prepared.text
        assert len(fake.calls) == 2
        record_id = prepared.json()["recordId"]
        stored = database.data["users/owner/saveSlots/1"]["activeRun"]["endingPrepared"]
        assert stored["letter"]["generationStatus"] == "FALLBACK"
        assert "조건을 만족하지 못" not in stored["letter"]["content"]

        finish_body = {
            "requestId": "phase9-finish",
            "expectedServerRevision": 3,
            "recordId": record_id,
        }
        finished = client.post(
            "/v1/save-slots/1/ending/finish", headers=headers(), json=finish_body,
        )
        assert finished.status_code == 200, finished.text
        result = finished.json()
        assert result["endingId"] == "ENDING_STARPATH_PIONEER"
        assert "CH13" in result["newlyUnlockedCharacterIds"]
        slot = database.data["users/owner/saveSlots/1"]
        assert slot["status"] == "RUN_COMPLETE" and slot["activeRun"] is None
        assert slot["completedRunCount"] == 1

        statistics = database.data["users/owner/statistics/global"]
        meta = database.data["users/owner/meta/progress"]
        assert statistics["totalCompletedRuns"] == 1
        assert statistics["endingViewCounts"]["ENDING_STARPATH_PIONEER"] == 1
        assert statistics["characterPlayCounts"]["CH01"] == 1
        assert "ENDING_STARPATH_PIONEER" not in meta["seenEndingIds"]
        assert "CH13" in meta["unlockedCharacterIds"]
        assert "PET02" in meta["unlockedPetIds"]

        record_path = f"users/owner/endingRecords/{record_id}"
        assert record_path in database.data
        record = database.data[record_path]
        assert record["letter"]["generationStatus"] == "FALLBACK"
        assert record["hiddenStatsSummary"] == {"dominant": ["curiosity", "cooperation"]}
        assert len(record["selectedPlayRecords"]) >= 4

        fetched = client.get(f"/v1/ending-records/{record_id}", headers=headers())
        assert fetched.status_code == 200, fetched.text
        assert fetched.json()["endingRecordId"] == record_id
        assert fetched.json()["hiddenStatsSummary"] == {"dominant": ["curiosity", "cooperation"]}
        listed = client.get("/v1/ending-records", headers=headers())
        assert listed.status_code == 200, listed.text
        assert len(listed.json()["records"]) == 1
        assert listed.json()["records"][0]["endingRecordId"] == record_id
        assert listed.json()["records"][0]["careerName"] == "별길 개척자"
        assert listed.json()["records"][0]["letter"]["content"] == record["letter"]["content"]

        # Receipt replay still works after activeRun was cleared by RUN_COMPLETE.
        replay = client.post(
            "/v1/save-slots/1/ending/finish", headers=headers(), json=finish_body,
        )
        assert replay.status_code == 200, replay.text
        assert replay.json()["replayed"] is True
        assert database.data["users/owner/statistics/global"]["totalCompletedRuns"] == 1
        assert len([path for path in database.data if "/endingRecords/" in path]) == 1


def test_regular_career_is_added_to_seen_endings_only_at_final_title(content_db):
    client, database = phase5_client(content_db)
    fake = FakeGenerator([_valid_letter])
    client.app.dependency_overrides[get_ending_letter_generator] = lambda: fake
    with client:
        decision = _ready_for_decision(client, database, regular=True)
        assert decision["endingType"] == "CAREER"
        ending_id = decision["endingId"]
        assert ending_id not in database.data["users/owner/meta/progress"]["seenEndingIds"]
        prepared = _prepare(client)
        assert prepared.status_code == 200
        assert ending_id not in database.data["users/owner/meta/progress"]["seenEndingIds"]
        finished = client.post(
            "/v1/save-slots/1/ending/finish", headers=headers(),
            json={
                "requestId": "phase9-regular-finish",
                "expectedServerRevision": 3,
                "recordId": prepared.json()["recordId"],
            },
        )
        assert finished.status_code == 200, finished.text
        assert ending_id in database.data["users/owner/meta/progress"]["seenEndingIds"]


def test_finish_rejects_wrong_record_id_without_partial_commit(content_db):
    client, database = phase5_client(content_db)
    fake = FakeGenerator([_valid_letter])
    client.app.dependency_overrides[get_ending_letter_generator] = lambda: fake
    with client:
        _ready_for_decision(client, database)
        prepared = _prepare(client)
        assert prepared.status_code == 200
        before = deepcopy(database.data)
        rejected = client.post(
            "/v1/save-slots/1/ending/finish", headers=headers(),
            json={
                "requestId": "phase9-wrong-record",
                "expectedServerRevision": 3,
                "recordId": "wrong-record-id",
            },
        )
        assert rejected.status_code == 409
        assert database.data == before
