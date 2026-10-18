"""Offline balance validation and growth calculation tests."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from backend.api.app.growth_rules import (
    BalanceSettingsError, applied_growth, balance_snapshot,
)


def _settings(multiplier=0.8):
    return {
        "rewardMultiplier": {stat: multiplier for stat in (
            "knowledge", "expression", "skill", "exploration", "magic")},
        "version": 3, "updatedAt": datetime.now(timezone.utc), "updatedBy": "admin-1",
    }


def test_default_and_admin_balance_use_exact_floor_and_stamina_boundary():
    default = balance_snapshot(None)
    assert default.version == 0
    assert applied_growth(base_growth=10, target_stat="magic", current_stat=50,
                          stamina_before=100, balance=default) == 10
    adjusted = balance_snapshot(_settings())
    assert adjusted.version == 3
    assert applied_growth(base_growth=7, target_stat="magic", current_stat=50,
                          stamina_before=31, balance=adjusted) == 5
    assert applied_growth(base_growth=7, target_stat="magic", current_stat=50,
                          stamina_before=30, balance=adjusted) == 2
    assert applied_growth(base_growth=10, target_stat="magic", current_stat=499,
                          stamina_before=100, balance=adjusted) == 1


@pytest.mark.parametrize("value", [0.4, 1.1, 0.75, True, "0.8", float("nan")])
def test_invalid_admin_multiplier_fails_closed(value):
    with pytest.raises(BalanceSettingsError):
        balance_snapshot(_settings(value))


def test_missing_or_malformed_balance_and_growth_inputs_fail_closed():
    with pytest.raises(BalanceSettingsError):
        balance_snapshot({"rewardMultiplier": {"magic": 1.0}, "version": 1})
    with pytest.raises(ValueError):
        applied_growth(base_growth=5, target_stat="magic", current_stat=50,
                       stamina_before=9, balance=balance_snapshot(None))
