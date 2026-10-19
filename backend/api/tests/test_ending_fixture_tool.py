"""The operator ending fixture must stay compatible with the real ending rules."""

from datetime import datetime, timezone

import pytest

from backend.api.app.progression_rules import choose_ending
from backend.api.tools.seed_ending_fixture import build_ending_fixture_run, ending_ids


def base_run() -> dict:
    now = datetime.now(timezone.utc)
    return {
        "runId": "fixture-run",
        "runNumber": 1,
        "characterId": "CH01",
        "storyCast": {"NPC_GUIDE_ACTOR": "CH16"},
        "startedAt": now,
    }


@pytest.mark.parametrize("ending_id", ending_ids())
def test_each_fixture_profile_reaches_its_requested_ending(ending_id):
    run = build_ending_fixture_run(
        base_run(), ending_id=ending_id, now=datetime.now(timezone.utc),
    )
    decision = choose_ending(run=run, seen_ending_ids=[])
    assert decision["endingId"] == ending_id
    assert run["week"] == 52
    assert run["phase"] == "ENDING_PENDING"
    assert run["pendingStoryEvent"] is None
    assert len(run["activityHistory"]) == 260
    assert run["runStatistics"]["classCount"] == 156
    assert run["runStatistics"]["adventureCount"] == 52
    assert run["runStatistics"]["restCount"] == 52


def test_fixture_preserves_run_identity_and_clears_prepared_ending_state():
    original = base_run()
    original.update({
        "endingDecision": {"endingId": "old"},
        "endingPrepared": {"recordId": "old"},
        "week": 7,
    })
    run = build_ending_fixture_run(
        original, ending_id="ENDING_ARCADIA_EXPLORER", now=datetime.now(timezone.utc),
    )
    for key in ("runId", "runNumber", "characterId", "storyCast", "startedAt"):
        assert run[key] == original[key]
    assert "endingDecision" not in run
    assert "endingPrepared" not in run

