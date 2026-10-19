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


def test_fixture_sets_generous_stats_and_hidden_values():
    run = build_ending_fixture_run(
        base_run(), ending_id="ENDING_HERB_GARDENER", now=datetime.now(timezone.utc),
    )
    # 주스탯 420 (>= 300 기준 넉넉히 상회)
    assert run["stats"]["skill"] == 420
    # 부스탯 270 (>= 200 기준 넉넉히 상회, 300 미만 안전 마진)
    assert run["stats"]["exploration"] == 270
    # 히든스탯 140 (>= 40 기준 넉넉히 상회)
    assert run["hiddenStats"]["empathy"] == 140
    # 다른 일반 스탯은 180 유지
    assert run["stats"]["knowledge"] == 180
    assert run["stats"]["magic"] == 180


def test_resolve_ending_id_supports_numbers_korean_and_aliases():
    from backend.api.tools.seed_ending_fixture import resolve_ending_id

    # 번호 1~11
    assert resolve_ending_id("1") == "ENDING_RUNE_RESEARCHER"
    assert resolve_ending_id("2") == "ENDING_ARCADIA_EXPLORER"
    assert resolve_ending_id("4") == "ENDING_HERB_GARDENER"
    assert resolve_ending_id("11") == "ENDING_STARPATH_PIONEER"

    # 한글명
    assert resolve_ending_id("약초 정원사") == "ENDING_HERB_GARDENER"
    assert resolve_ending_id("약초정원사") == "ENDING_HERB_GARDENER"
    assert resolve_ending_id("정원사") == "ENDING_HERB_GARDENER"
    assert resolve_ending_id("아르카디아 탐험가") == "ENDING_ARCADIA_EXPLORER"
    assert resolve_ending_id("탐험가") == "ENDING_ARCADIA_EXPLORER"
    assert resolve_ending_id("별길 개척자") == "ENDING_STARPATH_PIONEER"

    # 영문 키워드 및 대소문자
    assert resolve_ending_id("gardener") == "ENDING_HERB_GARDENER"
    assert resolve_ending_id("EXPLORER") == "ENDING_ARCADIA_EXPLORER"
    assert resolve_ending_id("pioneer") == "ENDING_STARPATH_PIONEER"

    # 알 수 없는 입력
    with pytest.raises(ValueError, match="알 수 없는 엔딩 지정값입니다"):
        resolve_ending_id("UNKNOWN_MAGIC")


def test_format_ending_catalog_contains_all_eleven_endings():
    from backend.api.tools.seed_ending_fixture import format_ending_catalog
    catalog = format_ending_catalog()
    assert "ENDING_RUNE_RESEARCHER" in catalog
    assert "ENDING_ARCADIA_EXPLORER" in catalog
    assert "ENDING_STARPATH_PIONEER" in catalog
    assert "약초 정원사" in catalog
    assert "별길 개척자" in catalog


def test_seed_slot_auto_initializes_empty_slot():
    from unittest.mock import MagicMock
    from backend.api.tools.seed_ending_fixture import seed_slot

    empty_slot_data = {
        "slotId": 2,
        "status": "EMPTY",
        "completedRunCount": 0,
        "lastCompletedCharacterId": None,
        "lastEndingId": None,
        "createdAt": None,
        "lastSavedAt": None,
        "saveVersion": 1,
        "gameDataVersion": "1.0.0",
        "activeRun": None,
        "serverRevision": 0,
    }
    meta_data = {
        "seenEndingIds": ["ENDING_ARCADIA_EXPLORER"],
    }

    slot_snapshot = MagicMock()
    slot_snapshot.exists = True
    slot_snapshot.to_dict.return_value = empty_slot_data

    meta_snapshot = MagicMock()
    meta_snapshot.exists = True
    meta_snapshot.to_dict.return_value = meta_data

    transaction = MagicMock()
    slot_ref = MagicMock()
    slot_ref.get.return_value = slot_snapshot
    meta_ref = MagicMock()
    meta_ref.get.return_value = meta_snapshot

    db = MagicMock()
    root = MagicMock()
    root.collection.side_effect = lambda col: (
        MagicMock(document=lambda doc_id: slot_ref if col == "saveSlots" else meta_ref)
    )
    db.collection.return_value.document.return_value = root
    db.transaction.return_value = transaction

    result = seed_slot(db, uid="test-uid-12345", slot_id=2, ending_id="ENDING_HERB_GARDENER")
    assert result["slotId"] == 2
    assert result["endingId"] == "ENDING_HERB_GARDENER"
    assert result["autoCreatedRun"] is True
    assert result["stats"]["skill"] == 420
    assert result["stats"]["exploration"] == 270
    assert result["hiddenStats"]["empathy"] == 140



