"""Server-only Firestore access used by the Phase 10 administrator API."""

from __future__ import annotations

from collections.abc import Callable, Mapping
from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import uuid4
from zoneinfo import ZoneInfo

from google.cloud import firestore

from .account import _STATS
from .growth_rules import BalanceSettingsError, balance_snapshot
from .models import (AccountProfile, EndingRecord, GlobalMetaProgress,
                     GlobalStatistics, SaveSlot, UnlockState)


KST = ZoneInfo("Asia/Seoul")


class AdminDataError(ValueError):
    pass


def _run_transaction(database: Any, body: Callable[[Any], Any]) -> Any:
    @firestore.transactional
    def execute(transaction: Any) -> Any:
        return body(transaction)

    return execute(database.transaction())


def _snapshot_dict(snapshot: Any) -> dict | None:
    if not getattr(snapshot, "exists", False):
        return None
    raw = snapshot.to_dict()
    return deepcopy(raw) if isinstance(raw, dict) else None


def _zero_activity_counts() -> dict[str, int]:
    return {key: 0 for key in ("class", "adventure", "rest", "special", "forcedRest")}


def _zero_story_counts() -> dict[str, int]:
    return {key: 0 for key in ("mainCompletedCount", "npcCompletedCount", "locationCompletedCount")}


def _zero_stat_counts() -> dict[str, int]:
    return {stat: 0 for stat in _STATS}


def _empty_analytics_day(kst_date: str, generated_at: datetime) -> dict:
    return {
        "kstDate": kst_date,
        "generatedAt": generated_at,
        "newUserCount": 0,
        "activeUserCount": 0,
        "activityCounts": _zero_activity_counts(),
        "minigame": {
            "playCount": 0, "failCount": 0, "successCount": 0, "greatCount": 0,
            "byGameId": {},
        },
        "story": _zero_story_counts(),
        "run": {
            "completedRunCount": 0,
            "firstCompletedRunUserCount": 0,
            "endingViewCounts": {},
            "finalStatSums": _zero_stat_counts(),
            "finalStatGte300Counts": _zero_stat_counts(),
            "finalStatGte500Counts": _zero_stat_counts(),
        },
        "unlocks": {"newByTypeAndId": {}},
    }


def _nonnegative_int(value: Any, label: str) -> int:
    if type(value) is not int or value < 0:
        raise AdminDataError(f"Invalid analytics counter: {label}")
    return value


def _merge_counter_map(target: dict[str, int], source: Mapping[str, Any], label: str) -> None:
    for key, value in source.items():
        if not isinstance(key, str) or not key:
            raise AdminDataError(f"Invalid analytics key: {label}")
        target[key] = target.get(key, 0) + _nonnegative_int(value, f"{label}.{key}")


def _merge_nested_counter_map(target: dict, source: Mapping[str, Any], label: str) -> None:
    for key, nested in source.items():
        if not isinstance(key, str) or not key or not isinstance(nested, Mapping):
            raise AdminDataError(f"Invalid analytics map: {label}")
        bucket = target.setdefault(key, {})
        _merge_counter_map(bucket, nested, f"{label}.{key}")


def _merge_activity_day(target: dict, source: Mapping[str, Any]) -> None:
    counts = source.get("activityCounts")
    minigame = source.get("minigame")
    story = source.get("story")
    run = source.get("run")
    unlocks = source.get("unlocks")
    if not all(isinstance(value, Mapping) for value in (counts, minigame, story, run, unlocks)):
        raise AdminDataError("Activity day summary is invalid")
    _merge_counter_map(target["activityCounts"], counts, "activityCounts")
    for key in ("playCount", "failCount", "successCount", "greatCount"):
        target["minigame"][key] += _nonnegative_int(minigame.get(key), f"minigame.{key}")
    by_game = minigame.get("byGameId")
    if not isinstance(by_game, Mapping):
        raise AdminDataError("Activity day minigame.byGameId is invalid")
    _merge_nested_counter_map(target["minigame"]["byGameId"], by_game, "minigame.byGameId")
    _merge_counter_map(target["story"], story, "story")

    for key in ("completedRunCount", "firstCompletedRunUserCount"):
        target["run"][key] += _nonnegative_int(run.get(key), f"run.{key}")
    for key in ("endingViewCounts", "finalStatSums", "finalStatGte300Counts", "finalStatGte500Counts"):
        nested = run.get(key)
        if not isinstance(nested, Mapping):
            raise AdminDataError(f"Activity day run.{key} is invalid")
        _merge_counter_map(target["run"][key], nested, f"run.{key}")

    new_unlocks = unlocks.get("newByTypeAndId")
    if not isinstance(new_unlocks, Mapping):
        raise AdminDataError("Activity day unlocks are invalid")
    _merge_nested_counter_map(target["unlocks"]["newByTypeAndId"], new_unlocks,
                              "unlocks.newByTypeAndId")


def period_dates(period: str, anchor: date) -> list[str]:
    if period == "day":
        start = end = anchor
    elif period == "week":
        start = anchor - timedelta(days=anchor.weekday())
        end = start + timedelta(days=6)
    elif period == "month":
        start = anchor.replace(day=1)
        if start.month == 12:
            next_month = start.replace(year=start.year + 1, month=1)
        else:
            next_month = start.replace(month=start.month + 1)
        end = next_month - timedelta(days=1)
    else:
        raise AdminDataError("period must be day, week, or month")
    return [(start + timedelta(days=offset)).isoformat()
            for offset in range((end - start).days + 1)]


class AdminRepository:
    def __init__(self, database: Any, *, transaction_runner: Callable[[Any, Callable], Any] = _run_transaction) -> None:
        self.database = database
        self.transaction_runner = transaction_runner

    def user_ids(self, *, limit: int | None = None) -> list[str]:
        if limit is not None and (type(limit) is not int or not 1 <= limit <= 50):
            raise ValueError("limit must be 1..50")
        ids = sorted({snapshot.id for snapshot in self.database.collection("users").stream()})
        return ids if limit is None else ids[:limit]

    def user_detail(self, uid: str) -> dict:
        if not isinstance(uid, str) or not uid or "/" in uid:
            raise ValueError("Invalid UID")
        root = self.database.collection("users").document(uid)
        profile_raw = _snapshot_dict(root.get())
        if profile_raw is None:
            raise KeyError(uid)
        profile = AccountProfile.model_validate(profile_raw)
        meta_raw = _snapshot_dict(root.collection("meta").document("progress").get())
        stats_raw = _snapshot_dict(root.collection("statistics").document("global").get())
        unlock_raw = _snapshot_dict(root.collection("unlockState").document("global").get())
        if meta_raw is None or stats_raw is None or unlock_raw is None:
            raise AdminDataError("User progression documents are incomplete")
        meta = GlobalMetaProgress.model_validate(meta_raw)
        statistics = GlobalStatistics.model_validate(stats_raw)
        unlock = UnlockState.model_validate(unlock_raw)

        slots = []
        for slot_id in range(1, 6):
            raw = _snapshot_dict(root.collection("saveSlots").document(str(slot_id)).get())
            if raw is None:
                slots.append({"slotId": slot_id, "status": "LOAD_ERROR"})
                continue
            slot = SaveSlot.model_validate(raw)
            item = {
                "slotId": slot.slotId,
                "status": slot.status,
                "completedRunCount": slot.completedRunCount,
                "lastCompletedCharacterId": slot.lastCompletedCharacterId,
                "lastEndingId": slot.lastEndingId,
                "lastSavedAt": slot.lastSavedAt,
                "serverRevision": slot.serverRevision,
                "activeRun": None,
            }
            if isinstance(slot.activeRun, dict):
                run = slot.activeRun
                item["activeRun"] = {
                    key: deepcopy(run.get(key))
                    for key in ("runId", "runNumber", "characterId", "week", "day", "phase",
                                "stats", "stamina", "runStatistics")
                }
            slots.append(item)

        endings = []
        for snapshot in root.collection("endingRecords").stream():
            raw = _snapshot_dict(root.collection("endingRecords").document(snapshot.id).get())
            if raw is None:
                continue
            record = EndingRecord.model_validate(raw)
            endings.append(record.model_dump(mode="python"))
        endings.sort(key=lambda item: item["completedAt"], reverse=True)
        return {
            "profile": profile.model_dump(mode="python"),
            "meta": meta.model_dump(mode="python"),
            "statistics": statistics.model_dump(mode="python"),
            "unlockState": unlock.model_dump(mode="python"),
            "slots": slots,
            "endingRecords": endings,
        }

    def get_balance(self) -> dict:
        snapshot = self.database.collection("systemSettings").document("balance").get()
        raw = _snapshot_dict(snapshot)
        if raw is None:
            return {
                "rewardMultiplier": {stat: 1.0 for stat in _STATS},
                "version": 0,
                "updatedAt": None,
                "updatedBy": "SYSTEM",
            }
        balance_snapshot(raw)
        return raw

    def update_balance(self, *, admin_uid: str, changes: Mapping[str, float], now: datetime) -> dict:
        if not isinstance(admin_uid, str) or not admin_uid:
            raise ValueError("admin_uid is required")
        if not isinstance(changes, Mapping) or not changes or not set(changes).issubset(set(_STATS)):
            raise ValueError("Balance changes must contain supported stats")
        audit_id = uuid4().hex
        balance_ref = self.database.collection("systemSettings").document("balance")
        audit_ref = self.database.collection("adminAuditLogs").document(audit_id)

        def body(transaction: Any) -> dict:
            snapshot = balance_ref.get(transaction=transaction)
            before = _snapshot_dict(snapshot) if snapshot.exists else {
                "rewardMultiplier": {stat: 1.0 for stat in _STATS},
                "version": 0,
                "updatedAt": None,
                "updatedBy": "SYSTEM",
            }
            if snapshot.exists:
                try:
                    balance_snapshot(before)
                except BalanceSettingsError as error:
                    raise AdminDataError(str(error)) from None
            values = dict(before["rewardMultiplier"])
            values.update(dict(changes))
            candidate = {
                "rewardMultiplier": values,
                "version": int(before["version"]) + 1,
                "updatedAt": now,
                "updatedBy": admin_uid,
            }
            try:
                balance_snapshot(candidate)
            except BalanceSettingsError as error:
                raise AdminDataError(str(error)) from None
            audit = {
                "eventType": "BALANCE_CHANGE",
                "occurredAt": now,
                "result": "SUCCESS",
                "adminUid": admin_uid,
                "target": "systemSettings/balance.rewardMultiplier",
                "before": deepcopy(before["rewardMultiplier"]),
                "after": deepcopy(values),
                "version": candidate["version"],
            }
            transaction.set(balance_ref, candidate)
            transaction.set(audit_ref, audit)
            return candidate

        return self.transaction_runner(self.database, body)

    def write_audit(self, document: Mapping[str, Any]) -> str:
        audit_id = uuid4().hex
        self.database.collection("adminAuditLogs").document(audit_id).set(deepcopy(dict(document)))
        return audit_id

    def rebuild_day(self, kst_date: str, *, now: datetime) -> dict:
        try:
            target_date = date.fromisoformat(kst_date)
        except ValueError:
            raise AdminDataError("kstDate must be YYYY-MM-DD") from None
        result = _empty_analytics_day(kst_date, now)
        active = 0
        for uid in self.user_ids():
            root = self.database.collection("users").document(uid)
            profile_raw = _snapshot_dict(root.get())
            if profile_raw is None:
                continue
            profile = AccountProfile.model_validate(profile_raw)
            if profile.deletionPending:
                continue
            if profile.createdAt.astimezone(KST).date() == target_date:
                result["newUserCount"] += 1
            raw = _snapshot_dict(root.collection("activityDays").document(kst_date).get())
            if raw is None:
                continue
            if raw.get("uid") != uid or raw.get("kstDate") != kst_date:
                raise AdminDataError("Activity day path identity mismatch")
            if raw.get("firstActivityAt") is not None:
                active += 1
            _merge_activity_day(result, raw)
        result["activeUserCount"] = active
        self.database.collection("analyticsDays").document(kst_date).set(deepcopy(result))
        return result

    def analytics_days(self, dates: list[str]) -> tuple[list[dict], list[str]]:
        rows, missing = [], []
        collection = self.database.collection("analyticsDays")
        for kst_date in dates:
            raw = _snapshot_dict(collection.document(kst_date).get())
            if raw is None:
                missing.append(kst_date)
            else:
                rows.append(raw)
        return rows, missing

    def distinct_active_users(self, dates: set[str]) -> set[str]:
        active: set[str] = set()
        for uid in self.user_ids():
            root = self.database.collection("users").document(uid)
            for kst_date in dates:
                raw = _snapshot_dict(root.collection("activityDays").document(kst_date).get())
                if raw is not None and raw.get("firstActivityAt") is not None:
                    active.add(uid)
                    break
        return active

    def current_user_metrics(self, *, today_kst: date) -> dict:
        total = played = completed = total_completed_runs = 0
        current_unlocks: dict[str, dict[str, int]] = {
            key: {} for key in ("CHARACTER", "PET", "BADGE", "ROOM_BACKGROUND")
        }
        for uid in self.user_ids():
            root = self.database.collection("users").document(uid)
            profile_raw = _snapshot_dict(root.get())
            stats_raw = _snapshot_dict(root.collection("statistics").document("global").get())
            meta_raw = _snapshot_dict(root.collection("meta").document("progress").get())
            if profile_raw is None or stats_raw is None or meta_raw is None:
                continue
            profile = AccountProfile.model_validate(profile_raw)
            if profile.deletionPending:
                continue
            statistics = GlobalStatistics.model_validate(stats_raw)
            meta = GlobalMetaProgress.model_validate(meta_raw)
            total += 1
            if any((statistics.totalClassCount, statistics.totalAdventureCount,
                    statistics.totalRestCount, statistics.totalMinigamePlayCount,
                    statistics.totalNpcEncounterCount, statistics.totalCompletedRuns)):
                played += 1
            if statistics.totalCompletedRuns > 0:
                completed += 1
            total_completed_runs += statistics.totalCompletedRuns
            for kind, values in (
                ("CHARACTER", meta.unlockedCharacterIds),
                ("PET", meta.unlockedPetIds),
                ("BADGE", meta.acquiredBadgeIds),
                ("ROOM_BACKGROUND", meta.unlockedRoomBackgroundIds),
            ):
                for identifier in set(values):
                    current_unlocks[kind][identifier] = current_unlocks[kind].get(identifier, 0) + 1
        recent7 = {(today_kst - timedelta(days=offset)).isoformat() for offset in range(7)}
        recent30 = {(today_kst - timedelta(days=offset)).isoformat() for offset in range(30)}
        return {
            "totalUserCount": total,
            "playedUserCount": played,
            "completedUserCount": completed,
            "totalCompletedRuns": total_completed_runs,
            "averageCompletedRunsPerUser": (round(total_completed_runs / total, 2) if total else 0.0),
            "recent7ActiveUserCount": len(self.distinct_active_users(recent7)),
            "recent30ActiveUserCount": len(self.distinct_active_users(recent30)),
            "currentUnlockHoldings": current_unlocks,
        }


def aggregate_analytics(rows: list[dict], *, active_user_count: int) -> dict:
    total = _empty_analytics_day("PERIOD", datetime.now(timezone.utc))
    total.pop("kstDate")
    total.pop("generatedAt")
    generated = []
    for row in rows:
        total["newUserCount"] += _nonnegative_int(row.get("newUserCount"), "newUserCount")
        _merge_activity_day(total, row)
        generated_at = row.get("generatedAt")
        if isinstance(generated_at, datetime):
            generated.append(generated_at)
    total["activeUserCount"] = active_user_count
    completed_runs = total["run"]["completedRunCount"]
    final_sums = total["run"]["finalStatSums"]
    total["run"]["finalStatAverages"] = {
        stat: (round(final_sums[stat] / completed_runs, 2) if completed_runs else None)
        for stat in _STATS
    }
    total["run"]["finalStatGte300Ratios"] = {
        stat: (round(total["run"]["finalStatGte300Counts"][stat] / completed_runs, 4)
               if completed_runs else None)
        for stat in _STATS
    }
    total["run"]["finalStatGte500Ratios"] = {
        stat: (round(total["run"]["finalStatGte500Counts"][stat] / completed_runs, 4)
               if completed_runs else None)
        for stat in _STATS
    }
    plays = total["minigame"]["playCount"]
    success = total["minigame"]["successCount"] + total["minigame"]["greatCount"]
    total["minigame"]["successRatio"] = round(success / plays, 4) if plays else None
    for counts in total["minigame"]["byGameId"].values():
        fail = _nonnegative_int(counts.get("fail", 0), "minigame.byGameId.fail")
        succeeded = _nonnegative_int(counts.get("success", 0), "minigame.byGameId.success")
        great = _nonnegative_int(counts.get("great", 0), "minigame.byGameId.great")
        game_plays = fail + succeeded + great
        counts.update(
            fail=fail,
            success=succeeded,
            great=great,
            playCount=game_plays,
            successRatio=(round((succeeded + great) / game_plays, 4) if game_plays else None),
        )
    total["latestGeneratedAt"] = max(generated) if generated else None
    return total
