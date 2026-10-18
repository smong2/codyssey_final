"""Server-side repeatable-growth math; Story choice rewards bypass this module."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation

from .activity_rules import STATS


class BalanceSettingsError(ValueError):
    pass


@dataclass(frozen=True)
class BalanceSnapshot:
    multiplier_tenths: dict[str, int]
    version: int


def balance_snapshot(raw: dict | None) -> BalanceSnapshot:
    """Absent global setting means approved 1.0 defaults, not a client value."""
    if raw is None:
        return BalanceSnapshot({stat: 10 for stat in STATS}, version=0)
    if not isinstance(raw, dict):
        raise BalanceSettingsError("Balance settings are invalid")
    values = raw.get("rewardMultiplier")
    version = raw.get("version")
    updated_at = raw.get("updatedAt")
    updated_by = raw.get("updatedBy")
    if (not isinstance(values, dict) or set(values) != STATS
            or type(version) is not int or version < 1
            or not isinstance(updated_at, datetime)
            or not isinstance(updated_by, str) or not updated_by.strip()):
        raise BalanceSettingsError("Balance settings are incomplete")
    tenths = {}
    for stat, value in values.items():
        if isinstance(value, bool) or not isinstance(value, (int, float, Decimal)):
            raise BalanceSettingsError("Balance multiplier is invalid")
        try:
            scaled = Decimal(str(value)) * 10
        except InvalidOperation:
            raise BalanceSettingsError("Balance multiplier is invalid") from None
        if not scaled.is_finite() or scaled != int(scaled) or not 5 <= scaled <= 10:
            raise BalanceSettingsError("Balance multiplier must be 0.5..1.0 in 0.1 steps")
        tenths[stat] = int(scaled)
    return BalanceSnapshot(tenths, version=version)


def applied_growth(*, base_growth: int, target_stat: str, current_stat: int,
                   stamina_before: int, balance: BalanceSnapshot) -> int:
    """Floor base × admin multiplier × low-stamina factor, then cap at 500."""
    if (target_stat not in STATS or type(base_growth) is not int or base_growth < 0
            or type(current_stat) is not int or not 0 <= current_stat <= 500
            or type(stamina_before) is not int or not 10 <= stamina_before <= 100):
        raise ValueError("Growth calculation input is invalid")
    multiplier = balance.multiplier_tenths.get(target_stat)
    if type(multiplier) is not int or not 5 <= multiplier <= 10:
        raise BalanceSettingsError("Balance multiplier is invalid")
    denominator = 20 if stamina_before <= 30 else 10
    nominal = base_growth * multiplier // denominator
    return min(nominal, 500 - current_stat)
