"""Deterministic shelf replay and Firestore result boundary."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
import sqlite3

import pytest

from backend.api.app.class_replay import (ClassInput, ReplayRejected, _circuit_board,
                                          _circuit_won, _fire_pin, _mirror_stage,
                                          _mirror_success, _pot_stage, _pour, _rotate,
                                          _rhythm_pattern,
                                          replay_observatory_mirror, replay_rune_circuit,
                                          replay_rune_pins,
                                          replay_sealed_shelves,
                                          replay_spirit_pots, replay_starlight_stage)
from backend.api.tests.test_phase3_account import headers
from backend.api.tests.test_phase5_save_slots import content_db, phase5_client, start
from backend.api.tests.test_phase7_activity_start import activity_db, _schedule, _start


# These moves are the verified engine shelfStage solutions. Each UI click moves
# exactly one cell; the server derives rounds and outcome instead of trusting
# browser score/metrics.
SOLUTIONS = {
    1: [[("C", -1), ("B", 3), ("A", 4)],
        [("C", 1), ("B", -3), ("A", 4)],
        [("C", -1), ("B", 3), ("A", 4)]],
    2: [[("H", 3), ("C", -1), ("B", 3), ("A", 4)],
        [("H", 3), ("C", 1), ("B", -3), ("A", 4)],
        [("H", 3), ("C", -1), ("B", 3), ("A", 4)]],
    3: [[("D", -3), ("H", 3), ("C", -1), ("B", 3), ("A", 4)],
        [("D", 3), ("H", 3), ("C", 1), ("B", -3), ("A", 4)],
        [("D", -3), ("H", 3), ("C", -1), ("B", 3), ("A", 4)]],
    4: [[("E", -3), ("D", -3), ("H", 3), ("C", -1), ("B", 3), ("A", 4)],
        [("E", 3), ("D", 3), ("H", 3), ("C", 1), ("B", -3), ("A", 4)],
        [("E", -3), ("D", -3), ("H", 3), ("C", -1), ("B", 3), ("A", 4)]],
}


def solution_log(difficulty: int) -> list[ClassInput]:
    events = []
    for round_solution in SOLUTIONS[difficulty]:
        for piece, travel in round_solution:
            for _ in range(abs(travel)):
                events.append(ClassInput(atMs=len(events), action="MOVE", pieceId=piece,
                                         delta=1 if travel > 0 else -1))
    return events


@pytest.mark.parametrize("difficulty", [1, 2, 3, 4])
def test_all_engine_shelf_solutions_replay_as_great(difficulty):
    result = replay_sealed_shelves(difficulty=difficulty, max_duration_ms=120_000,
                                   events=solution_log(difficulty))
    assert result.resolution == "GREAT"
    assert result.rounds_cleared == 3
    assert result.moves == 3 * (8 + 3 * (difficulty - 1))


def test_replay_rejects_impossible_move_incomplete_or_late_log():
    valid = solution_log(1)
    with pytest.raises(ReplayRejected, match="illegal"):
        replay_sealed_shelves(difficulty=1, max_duration_ms=120_000,
                              events=[ClassInput(atMs=0, action="MOVE", pieceId="A", delta=1)])
    with pytest.raises(ReplayRejected, match="three shelves"):
        replay_sealed_shelves(difficulty=1, max_duration_ms=120_000, events=valid[:-1])
    with pytest.raises(ReplayRejected, match="outside"):
        replay_sealed_shelves(difficulty=1, max_duration_ms=120_000,
                              events=[*valid[:-1], valid[-1].model_copy(update={"atMs": 120_000})])


def test_verified_timer_expiry_allows_only_legal_incomplete_logs_to_fail_closed():
    assert replay_sealed_shelves(
        difficulty=1, max_duration_ms=120_000, events=[], timed_out=True,
    ).resolution == "FAIL"
    assert replay_spirit_pots(
        difficulty=1, seed="replay-seed", max_duration_ms=120_000,
        events=[], timed_out=True,
    ).resolution == "FAIL"
    assert replay_rune_pins(
        difficulty=1, max_duration_ms=90_000, events=[], timed_out=True,
    ).resolution == "FAIL"
    assert replay_rune_circuit(
        difficulty=1, seed="replay-seed", max_duration_ms=120_000,
        events=[], timed_out=True,
    ).resolution == "FAIL"
    assert replay_observatory_mirror(
        difficulty=1, seed="replay-seed", max_duration_ms=120_000,
        events=[], timed_out=True,
    ).resolution == "FAIL"
    with pytest.raises(ReplayRejected, match="illegal"):
        replay_sealed_shelves(
            difficulty=1, max_duration_ms=120_000,
            events=[ClassInput(atMs=10, action="MOVE", pieceId="A", delta=1)],
            timed_out=True,
        )


def test_reset_and_undo_are_replayed_and_can_reduce_great_to_success():
    events = [ClassInput(atMs=i, action="RESET") for i in range(7)] + [
        event.model_copy(update={"atMs": event.atMs + 7}) for event in solution_log(1)]
    result = replay_sealed_shelves(difficulty=1, max_duration_ms=120_000, events=events)
    assert result.resolution == "SUCCESS"
    assert result.moves == 31


ENGINE_POT_BOARDS = {
    1: [[0, 2], [1, 1, 1, 2], [], [0, 0, 2], [1, 0, 2]],
    2: [[0, 3, 0], [1, 1, 1, 3], [2, 3, 0], [3, 0], [2, 2, 1, 2], []],
    3: [[0, 1, 1, 0], [], [2, 2, 4, 2], [3, 3, 3, 4], [1, 0], [1, 0], [2, 4, 4, 3]],
    4: [[], [1, 1, 0], [2, 2, 0], [3, 3, 2, 4], [4, 5, 4], [5, 1, 0], [3, 3, 5, 0], [2, 1, 5, 4]],
}


def pot_solution_log(difficulty: int, seed: str) -> list[ClassInput]:
    board, solution = _pot_stage(difficulty, seed)
    events = []
    for a, b in solution:
        assert _pour(board, a, b)
        events.append(ClassInput(atMs=len(events), action="POUR", fromPot=a, toPot=b))
        if all(not pot or len(pot) == 4 and len(set(pot)) == 1 for pot in board):
            break
    return events


@pytest.mark.parametrize("difficulty", [1, 2, 3, 4])
def test_server_pot_seed_matches_engine_and_replays_solution(difficulty):
    board, solution = _pot_stage(difficulty, "replay-seed")
    assert board == ENGINE_POT_BOARDS[difficulty]
    result = replay_spirit_pots(difficulty=difficulty, seed="replay-seed",
                                max_duration_ms=120_000,
                                events=pot_solution_log(difficulty, "replay-seed"))
    assert result.resolution == "GREAT" and result.moves <= len(solution)


def test_spirit_pot_rejects_unseeded_or_impossible_pour():
    with pytest.raises(ReplayRejected, match="illegal"):
        replay_spirit_pots(difficulty=1, seed="replay-seed", max_duration_ms=120_000,
                           events=[ClassInput(atMs=0, action="POUR", fromPot=0, toPot=1)])


def pin_solution_log(difficulty: int) -> list[ClassInput]:
    events = []
    elapsed = round_start = 0
    for round_index in range(3):
        pins = []
        for _ in range(4 + difficulty + round_index):
            while True:
                elapsed += 50
                assert elapsed < 90_000
                if _fire_pin(pins, difficulty, elapsed - round_start):
                    events.append(ClassInput(atMs=elapsed, action="FIRE"))
                    break
        round_start = elapsed
    return events


@pytest.mark.parametrize("difficulty,expected", [
    (1, [1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1]),
    (2, [1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0]),
    (3, [1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0]),
    (4, [1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0]),
])
def test_server_pin_rotation_matches_engine_samples(difficulty, expected):
    pins = []
    times = [0, 50, 100, 500, 1000, 1250, 1500, 2000, 3000, 4500, 6000]
    assert [int(_fire_pin(pins, difficulty, at_ms)) for at_ms in times] == expected


@pytest.mark.parametrize("difficulty", [1, 2, 3, 4])
def test_rune_pin_success_requires_replayed_rotation_and_three_rounds(difficulty):
    events = pin_solution_log(difficulty)
    result = replay_rune_pins(difficulty=difficulty, max_duration_ms=90_000, events=events)
    assert result.resolution == "GREAT" and result.rounds_cleared == 3
    with pytest.raises(ReplayRejected):
        replay_rune_pins(difficulty=difficulty, max_duration_ms=90_000, events=events[:-1])


def test_rune_pin_third_collision_is_a_server_decided_failure():
    events = [ClassInput(atMs=0, action="FIRE") for _ in range(4)]
    result = replay_rune_pins(difficulty=1, max_duration_ms=90_000, events=events)
    assert result.resolution == "FAIL" and result.rounds_cleared == 0


ENGINE_CIRCUIT_TILES = {
    1: [2, 6, 12, 12, 12, 9, 10, 9, 10, 10, 9, 12, 6, 5, 3, 8],
    2: [2, 12, 5, 3, 12, 10, 3, 12, 6, 5, 5, 6, 9, 9, 3, 3, 6, 10, 12, 9, 6, 3, 3, 3, 8],
    3: [2, 3, 9, 9, 3, 9, 6, 10, 14, 8, 3, 6, 12, 12, 12, 6, 3, 9, 10, 3, 5, 3, 10, 12, 1],
    4: [2, 3, 9, 9, 3, 9, 6, 10, 14, 8, 3, 6, 12, 12, 12, 6, 3, 9, 10, 3, 5, 3, 10, 12, 1],
}


def circuit_solution_log(difficulty: int, seed: str) -> list[ClassInput]:
    events = []
    for round_index in range(3):
        board = _circuit_board(difficulty, seed, round_index)
        assert not _circuit_won(board)
        for cell, solved in enumerate(board["solved"]):
            size = board["size"]
            if (cell % size, cell // size) in board["fixed"]:
                continue
            for _ in range(4):
                if board["tiles"][cell] == solved:
                    break
                board["tiles"][cell] = _rotate(board["tiles"][cell])
                events.append(ClassInput(atMs=len(events), action="ROTATE", cellIndex=cell))
                if _circuit_won(board):
                    break
            if _circuit_won(board):
                break
        assert _circuit_won(board)
    return events


@pytest.mark.parametrize("difficulty", [1, 2, 3, 4])
def test_circuit_seed_matches_engine_and_replays_three_rounds(difficulty):
    assert _circuit_board(difficulty, "replay-seed", 0)["tiles"] == ENGINE_CIRCUIT_TILES[difficulty]
    events = circuit_solution_log(difficulty, "replay-seed")
    result = replay_rune_circuit(difficulty=difficulty, seed="replay-seed",
                                 max_duration_ms=120_000, events=events)
    assert result.resolution == "GREAT" and result.rounds_cleared == 3


def test_circuit_rejects_rotating_fixed_cell():
    with pytest.raises(ReplayRejected, match="fixed"):
        replay_rune_circuit(difficulty=1, seed="replay-seed", max_duration_ms=120_000,
                            events=[ClassInput(atMs=0, action="ROTATE", cellIndex=0)])


ENGINE_MIRROR_ORIENTATIONS = {
    1: ["\\", "\\", "/"],
    2: ["\\", "\\", "\\"],
    3: ["\\", "\\", "/", "\\"],
    4: ["\\", "\\", "/", "\\"],
}


def mirror_solution_log(difficulty: int, seed: str) -> list[ClassInput]:
    events = []
    for round_index in range(3):
        level, orientations, solution = _mirror_stage(difficulty, seed, round_index)
        assert not _mirror_success(level, orientations)
        for index, value in enumerate(solution):
            if orientations[index] != value:
                orientations[index] = value
                events.append(ClassInput(atMs=len(events), action="TOGGLE", mirrorIndex=index))
                if _mirror_success(level, orientations):
                    break
        assert _mirror_success(level, orientations)
    return events


@pytest.mark.parametrize("difficulty", [1, 2, 3, 4])
def test_mirror_seed_matches_engine_and_replays_beam_path(difficulty):
    assert _mirror_stage(difficulty, "replay-seed", 0)[1] == ENGINE_MIRROR_ORIENTATIONS[difficulty]
    minimum = 2 if difficulty <= 2 else 3
    for round_index in range(3):
        level, orientations, _ = _mirror_stage(difficulty, "replay-seed", round_index)
        distances = []
        for mask in range(1 << len(level["mirrors"])):
            candidate = ["/" if mask & (1 << index) else "\\"
                         for index in range(len(level["mirrors"]))]
            if _mirror_success(level, candidate):
                distances.append(sum(a != b for a, b in zip(orientations, candidate, strict=True)))
        assert min(distances) >= minimum
    result = replay_observatory_mirror(
        difficulty=difficulty, seed="replay-seed", max_duration_ms=120_000,
        events=mirror_solution_log(difficulty, "replay-seed"))
    assert result.resolution == "GREAT" and result.rounds_cleared == 3


def test_mirror_rejects_nonexistent_mirror_index():
    with pytest.raises(ReplayRejected, match="nonexistent"):
        replay_observatory_mirror(
            difficulty=1, seed="replay-seed", max_duration_ms=120_000,
            events=[ClassInput(atMs=0, action="TOGGLE", mirrorIndex=3)])


ENGINE_RHYTHM_FIRST_LANES = {
    1: (101, [1, 1, 1, 0, 1, 0, 0, 1]),
    2: (115, [1, 2, 2, 0, 2, 0, 1, 2]),
    3: (149, [1, 2, 2, 0, 1, 2, 0, 1]),
    4: (193, [1, 2, 2, 0, 1, 2, 0, 1]),
}


def rhythm_success_log(difficulty: int, seed: str) -> list[ClassInput]:
    _, notes = _rhythm_pattern(difficulty, seed, 75_000)
    events = []
    for note in notes:
        events.append(ClassInput(atMs=round(note["at"]), action="PRESS", lane=note["lane"]))
        if note["hold"]:
            events.append(ClassInput(atMs=round(note["at"] + note["hold"] - 100),
                                     action="RELEASE", lane=note["lane"]))
    return sorted(events, key=lambda event: event.atMs)


@pytest.mark.parametrize("difficulty", [1, 2, 3, 4])
def test_rhythm_seed_matches_engine_and_replays_note_timing(difficulty):
    lanes, notes = _rhythm_pattern(difficulty, "replay-seed", 75_000)
    count, first = ENGINE_RHYTHM_FIRST_LANES[difficulty]
    assert lanes == (2 if difficulty == 1 else 3)
    assert len(notes) == count
    assert [note["lane"] for note in notes[:8]] == first
    result = replay_starlight_stage(
        difficulty=difficulty, seed="replay-seed", max_duration_ms=75_000,
        events=rhythm_success_log(difficulty, "replay-seed"))
    assert result.resolution == "GREAT"


def test_rhythm_empty_log_fails_without_client_supplied_metrics():
    result = replay_starlight_stage(
        difficulty=1, seed="replay-seed", max_duration_ms=75_000, events=[])
    assert result.resolution == "FAIL"


def _seed_replay_class(db, activity_id="sealed-shelves", stat="knowledge"):
    with sqlite3.connect(db) as connection:
        connection.execute(
            """INSERT INTO activities(version,activity_id,activity_type,display_name,
                                      location_id,stamina_cost,target_stat)
               VALUES (?,?,?,?,?,?,?)""",
            ("dev-dialogue-v1", activity_id, "CLASS", activity_id, "LOC_TEST", 10, stat),
        )
        connection.execute(
            """INSERT INTO minigames(version,game_id,activity_id,display_name,target_stat)
               VALUES (?,?,?,?,?)""",
            ("dev-dialogue-v1", activity_id, activity_id, activity_id, stat),
        )


def _complete(client, events, *, request="shelves-result-1", revision=3):
    return client.post(
        "/v1/save-slots/1/activities/complete-class-replay", headers=headers(),
        json={"requestId": request, "expectedServerRevision": revision,
              "inputLog": [event.model_dump(exclude_none=True) for event in events]},
    )


def test_shelves_result_is_server_replayed_and_retry_safe(activity_db):
    _seed_replay_class(activity_db)
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        ids = ["sealed-shelves", "REST_TEST", "REST_TEST", "REST_TEST", "REST_TEST"]
        assert _schedule(client, ids).status_code == 200
        challenge = _start(client)
        assert challenge.status_code == 200, challenge.text
        assert challenge.json()["replaySupported"] is True
        assert challenge.json()["maxDurationMs"] == 120_000
        assert len(challenge.json()["seed"]) >= 24
        events = solution_log(1)
        result = _complete(client, events)
        assert result.status_code == 200, result.text
        assert result.json()["resolution"] == "GREAT"
        assert result.json()["growthApplied"] == 10
        assert _complete(client, events).json()["replayed"] is True
        saved = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert saved["stats"]["knowledge"] == 60
        assert saved["runStatistics"]["minigameClearCount"] == 1
        assert saved["weeklySchedule"]["MONDAY"]["replayedMoves"] == 24
        assert len(saved["weeklySchedule"]["MONDAY"]["inputLogDigest"]) == 64
        assert database.data["users/owner/statistics/global"]["totalMinigameClearCount"] == 1
        daily = next(value for path, value in database.data.items() if "/activityDays/" in path)
        assert daily["minigame"]["greatCount"] == 1
        assert daily["minigame"]["byGameId"]["sealed-shelves"]["great"] == 1


def test_invalid_shelves_log_never_awards_growth(activity_db):
    _seed_replay_class(activity_db)
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["sealed-shelves"] * 5).status_code == 200
        assert _start(client).status_code == 200
        before = deepcopy(database.data)
        impossible = [ClassInput(atMs=0, action="MOVE", pieceId="A", delta=1)]
        assert _complete(client, impossible).status_code == 409
        assert database.data == before
        assert client.post(
            "/v1/save-slots/1/activities/complete-class-replay", headers=headers(),
            json={"requestId": "forged-result", "expectedServerRevision": 3,
                  "outcome": "GREAT", "score": 999999,
                  "inputLog": [event.model_dump(exclude_none=True) for event in solution_log(1)]},
        ).status_code == 422
        assert database.data == before


def test_shelves_timeout_is_server_verified_and_committed_as_fail(activity_db):
    _seed_replay_class(activity_db)
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["pendingStoryEvent"] = None
        assert _schedule(client, ["sealed-shelves"] * 5).status_code == 200
        assert _start(client).status_code == 200
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        run["weeklySchedule"]["MONDAY"]["startedAt"] = datetime.now(timezone.utc) - timedelta(seconds=121)
        result = _complete(client, [])
        assert result.status_code == 200, result.text
        assert result.json()["resolution"] == "FAIL"
        assert result.json()["growthApplied"] == 0
        saved = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert saved["weeklySchedule"]["MONDAY"]["durationMs"] == 120_000
        assert saved["minigameFailStreaks"]["sealed-shelves"] == 1


def test_spirit_pot_result_uses_server_seed_not_browser_metrics(activity_db):
    _seed_replay_class(activity_db, "spirit-pot-sort", "skill")
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["spirit-pot-sort"] * 5).status_code == 200
        begun = _start(client)
        assert begun.status_code == 200, begun.text
        assert begun.json()["replaySupported"] is True
        challenge_seed = begun.json()["seed"]
        result = _complete(client, pot_solution_log(1, challenge_seed))
        assert result.status_code == 200, result.text
        assert result.json()["resolution"] == "GREAT"
        stats = database.data["users/owner/saveSlots/1"]["activeRun"]["stats"]
        assert stats["skill"] == 60 and stats["knowledge"] == 50


def test_rune_pin_failure_counts_without_a_client_result_claim(activity_db):
    _seed_replay_class(activity_db, "rune-pin-training", "skill")
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["rune-pin-training"] * 5).status_code == 409
        assert _schedule(client, ["CLASS_TEST"] * 5, request="legacy-schedule").status_code == 200
        # A previously confirmed calendar still holds the retired activity ID.
        database.data["users/owner/saveSlots/1"]["activeRun"]["weeklySchedule"]["MONDAY"]["contentId"] = "rune-pin-training"
        begun = _start(client)
        assert begun.status_code == 200 and begun.json()["replaySupported"] is True
        result = _complete(client, [ClassInput(atMs=0, action="FIRE") for _ in range(4)])
        assert result.status_code == 200, result.text
        assert result.json()["resolution"] == "FAIL"
        assert _complete(client, [ClassInput(atMs=0, action="FIRE") for _ in range(4)]).json()["replayed"] is True
        run = database.data["users/owner/saveSlots/1"]["activeRun"]
        assert run["minigameFailStreaks"]["rune-pin-training"] == 1
        assert run["runStatistics"]["minigameClearCount"] == 0
        daily = next(value for path, value in database.data.items() if "/activityDays/" in path)
        assert daily["minigame"]["failCount"] == 1


def test_circuit_api_uses_saved_seed_to_replay(activity_db):
    _seed_replay_class(activity_db, "rune-circuit", "magic")
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["rune-circuit"] * 5).status_code == 200
        begun = _start(client)
        assert begun.status_code == 200 and begun.json()["replaySupported"] is True
        result = _complete(client, circuit_solution_log(1, begun.json()["seed"]))
        assert result.status_code == 200, result.text
        assert result.json()["resolution"] == "GREAT"
        assert database.data["users/owner/saveSlots/1"]["activeRun"]["stats"]["magic"] == 60


def test_mirror_api_replays_saved_seed(activity_db):
    _seed_replay_class(activity_db, "observatory-mirror", "exploration")
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["observatory-mirror"] * 5).status_code == 200
        begun = _start(client)
        assert begun.status_code == 200 and begun.json()["replaySupported"] is True
        result = _complete(client, mirror_solution_log(1, begun.json()["seed"]))
        assert result.status_code == 200, result.text
        assert result.json()["resolution"] == "GREAT"
        assert database.data["users/owner/saveSlots/1"]["activeRun"]["stats"]["exploration"] == 60


def test_rhythm_api_requires_server_timer_and_replays_notes(activity_db):
    _seed_replay_class(activity_db, "starlight-stage", "expression")
    client, database = phase5_client(activity_db)
    with client:
        assert start(client).status_code == 200
        database.data["users/owner/saveSlots/1"]["activeRun"]["pendingStoryEvent"] = None
        assert _schedule(client, ["starlight-stage"] * 5).status_code == 200
        begun = _start(client)
        assert begun.status_code == 200 and begun.json()["replaySupported"] is True
        events = rhythm_success_log(1, begun.json()["seed"])
        before = deepcopy(database.data)
        assert _complete(client, events).status_code == 409
        assert database.data == before
        entry = database.data["users/owner/saveSlots/1"]["activeRun"]["weeklySchedule"]["MONDAY"]
        entry["startedAt"] = datetime.now(timezone.utc) - timedelta(seconds=76)
        result = _complete(client, events)
        assert result.status_code == 200, result.text
        assert result.json()["resolution"] == "GREAT"
        assert database.data["users/owner/saveSlots/1"]["activeRun"]["stats"]["expression"] == 60
