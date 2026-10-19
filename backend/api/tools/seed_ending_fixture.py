"""Seed one existing PLAYING slot into a deterministic 52-week ending-test state.

This is an operator-only development tool. It uses Firebase Admin credentials
from the same environment as the API and is intentionally not exposed through
FastAPI.
"""

from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import datetime, timezone
import sys
from typing import Any

from google.cloud import firestore

from backend.api.app.account import _STATS, _TAGS
from backend.api.app.config import Settings
from backend.api.app.firebase import initialize_firebase
from backend.api.app.models import SaveSlot
from backend.api.app.progression_rules import ENDING_RULES, choose_ending


FALLBACK_ENDING_ID = "ENDING_STARPATH_PIONEER"
DEFAULT_ENDING_ID = "ENDING_ARCADIA_EXPLORER"
WEEKDAYS = ("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY")
MAIN_STORY_WEEKS = {"MS01": 1, "MS02": 10, "MS03": 23, "MS04": 36, "MS05": 49, "MS06": 52}
CLASS_BY_STAT = {
    "knowledge": "sealed-shelves",
    "expression": "starlight-stage",
    "skill": "rune-pin-training",
    "exploration": "observatory-mirror",
    "magic": "rune-circuit",
}
ADVENTURES = ("ADV_GREENHOUSE", "ADV_LIBRARY", "ADV_OBSERVATORY")

ENDING_CATALOG: list[dict[str, Any]] = [
    {
        "index": 1,
        "id": "ENDING_RUNE_RESEARCHER",
        "title": "룬 연구자",
        "subtitle": "새로운 문양을 읽는 사람",
        "primary": "magic (마법)",
        "secondary": "knowledge (지식)",
        "hidden": "curiosity (호기심)",
        "condition": "마법수업 40회+, 마법 300+, 지식 200+, 호기심 40+",
        "aliases": ["1", "rune", "researcher", "룬", "룬연구자", "룬 연구자"],
    },
    {
        "index": 2,
        "id": "ENDING_ARCADIA_EXPLORER",
        "title": "아르카디아 탐험가",
        "subtitle": "아직 가보지 않은 길",
        "primary": "exploration (탐험)",
        "secondary": "knowledge (지식)",
        "hidden": "curiosity (호기심)",
        "condition": "모험 40회+, 탐험 300+, 지식 200+, 호기심 40+",
        "aliases": ["2", "arcadia", "explorer", "탐험가", "아르카디아", "아르카디아 탐험가"],
    },
    {
        "index": 3,
        "id": "ENDING_ARCANE_ARTISAN",
        "title": "마도 장인",
        "subtitle": "손으로 완성하는 마법 도구",
        "primary": "magic (마법)",
        "secondary": "skill (손재주)",
        "hidden": "caution (신중)",
        "condition": "도구제작 40회+, 마법 300+, 손재주 200+, 신중 40+",
        "aliases": ["3", "artisan", "장인", "마도장인", "마도 장인"],
    },
    {
        "index": 4,
        "id": "ENDING_HERB_GARDENER",
        "title": "약초 정원사",
        "subtitle": "자라는 것을 돌보는 사람",
        "primary": "skill (손재주)",
        "secondary": "exploration (탐험)",
        "hidden": "empathy (공감)",
        "condition": "모험 40회+, 특별아이템 10+, 손재주 300+, 탐험 200+, 공감 40+",
        "aliases": ["4", "gardener", "정원사", "약초정원사", "약초 정원사"],
    },
    {
        "index": 5,
        "id": "ENDING_ACADEMY_GUARDIAN",
        "title": "아카데미 수호 기사",
        "subtitle": "안전한 길을 지키는 사람",
        "primary": "skill (손재주)",
        "secondary": "magic (마법)",
        "hidden": "responsibility (책임)",
        "condition": "중요선택 10회+, 손재주 300+, 마법 200+, 책임 40+",
        "aliases": ["5", "guardian", "수호기사", "수호 기사", "아카데미 수호 기사"],
    },
    {
        "index": 6,
        "id": "ENDING_ACADEMY_TEACHER",
        "title": "아카데미 교사",
        "subtitle": "다음 학생과 나누는 배움",
        "primary": "knowledge (지식)",
        "secondary": "expression (표현)",
        "hidden": "cooperation (협동)",
        "condition": "수업 80회+, 지식 300+, 표현 200+, 협동 40+",
        "aliases": ["6", "teacher", "교사", "선생님", "아카데미 교사"],
    },
    {
        "index": 7,
        "id": "ENDING_ARCHIVIST",
        "title": "아카이브 기록관",
        "subtitle": "사라지지 않게 남기는 이야기",
        "primary": "knowledge (지식)",
        "secondary": "exploration (탐험)",
        "hidden": "caution (신중)",
        "condition": "장소발견 10회+, 지식 300+, 탐험 200+, 신중 40+",
        "aliases": ["7", "archivist", "기록관", "아카이브", "아카이브 기록관"],
    },
    {
        "index": 8,
        "id": "ENDING_MAGIC_PERFORMER",
        "title": "마법 공연가",
        "subtitle": "마음을 전하는 무대",
        "primary": "expression (표현)",
        "secondary": "magic (마법)",
        "hidden": "empathy (공감)",
        "condition": "표현수업 40회+, 표현 300+, 마법 200+, 공감 40+",
        "aliases": ["8", "performer", "공연가", "마법공연가", "마법 공연가"],
    },
    {
        "index": 9,
        "id": "ENDING_MAGICAL_CREATURE_KEEPER",
        "title": "마법 생물 돌봄이",
        "subtitle": "함께 살아가는 법을 배우다",
        "primary": "exploration (탐험)",
        "secondary": "expression (표현)",
        "hidden": "empathy (공감)",
        "condition": "NPC조우 40회+, 탐험 300+, 표현 200+, 공감 40+",
        "aliases": ["9", "keeper", "돌봄이", "마법생물", "마법 생물 돌봄이"],
    },
    {
        "index": 10,
        "id": "ENDING_ACADEMY_EVENT_PLANNER",
        "title": "아카데미 행사 기획자",
        "subtitle": "모두가 함께하는 하루",
        "primary": "expression (표현)",
        "secondary": "knowledge (지식)",
        "hidden": "cooperation (협동)",
        "condition": "NPC스토리완료 5회+, 표현 300+, 지식 200+, 협동 40+",
        "aliases": ["10", "planner", "기획자", "행사기획자", "아카데미 행사 기획자"],
    },
    {
        "index": 11,
        "id": "ENDING_STARPATH_PIONEER",
        "title": "별길 개척자 (폴백)",
        "subtitle": "새로운 가능성을 향해",
        "primary": "모든 스탯 300 미만",
        "secondary": "-",
        "hidden": "-",
        "condition": "모든 직업 조건 미달 시 자동 진입",
        "aliases": ["11", "pioneer", "fallback", "별길", "개척자", "별길 개척자"],
    },
]


def ending_ids() -> tuple[str, ...]:
    return tuple(rule.ending_id for rule in ENDING_RULES) + (FALLBACK_ENDING_ID,)


def resolve_ending_id(raw_input: str) -> str:
    """Resolve user input (number 1-11, Korean title, alias, or exact ID) to canonical ending ID."""
    clean = raw_input.strip()
    if clean.upper() in ending_ids():
        return clean.upper()

    normalized = clean.lower().replace(" ", "").replace("_", "")
    for entry in ENDING_CATALOG:
        for alias in entry["aliases"]:
            if normalized == alias.lower().replace(" ", "").replace("_", ""):
                return entry["id"]

    valid_examples = ", ".join(f"{item['index']}({item['title']})" for item in ENDING_CATALOG)
    raise ValueError(
        f"알 수 없는 엔딩 지정값입니다: '{raw_input}'\n"
        f"사용 가능한 번호 또는 이름: {valid_examples}\n"
        f"전체 목록을 보려면 --list-endings 옵션을 사용하세요."
    )


def format_ending_catalog() -> str:
    """Return a formatted table of all 11 endings and their conditions."""
    lines = [
        "=" * 80,
        " LUMIA 52주차 엔딩 목록 및 요구조건 카탈로그",
        "=" * 80,
        f"{'번호':<4} | {'엔딩 ID':<30} | {'엔딩 한글명':<16} | {'주요 요구조건'}",
        "-" * 80,
    ]
    for item in ENDING_CATALOG:
        lines.append(
            f"{item['index']:<4} | {item['id']:<30} | {item['title']:<16} | {item['condition']}"
        )
    lines.append("=" * 80)
    lines.append("사용 예시:")
    lines.append("  --ending 2               (번호로 지정)")
    lines.append("  --ending '약초 정원사'   (한글 이름으로 지정)")
    lines.append("  --ending explorer        (영문 키워드로 지정)")
    lines.append("  --ending ENDING_ARCHIVIST (정식 ID로 지정)")
    lines.append("=" * 80)
    return "\n".join(lines)


def _record_counter(run_statistics: dict[str, Any], key: str, value: int) -> None:
    if key.startswith("class:"):
        stat = key.split(":", 1)[1]
        run_statistics["classCounts"][stat] = max(run_statistics["classCounts"].get(stat, 0), value)
    else:
        run_statistics[key] = max(run_statistics.get(key, 0), value)


def _activity_history(primary_stat: str) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """Build exactly 260 completed weekdays and return class-count totals."""
    target_class = CLASS_BY_STAT[primary_stat]
    class_counts = {stat: 0 for stat in _STATS}
    history: list[dict[str, Any]] = []
    for week in range(1, 53):
        class_entries = (
            target_class,
            target_class,
            target_class,
        )
        day_entries = (
            ("CLASS", class_entries[0], "SUCCESS"),
            ("ADVENTURE", ADVENTURES[(week - 1) % len(ADVENTURES)], "MISSION_COMPLETE"),
            ("CLASS", class_entries[1], "GREAT" if week % 4 == 0 else "SUCCESS"),
            ("REST", "REST_DEFAULT", "SUCCESS"),
            ("CLASS", class_entries[2], "SUCCESS"),
        )
        for day, (kind, content_id, resolution) in enumerate(day_entries):
            entry: dict[str, Any] = {
                "week": week,
                "day": day,
                "type": kind,
                "contentId": content_id,
                "status": "COMPLETED",
                "resolution": resolution,
            }
            if kind == "CLASS":
                target_stat = next(stat for stat, game_id in CLASS_BY_STAT.items() if game_id == content_id)
                class_counts[target_stat] += 1
                entry.update({"staminaCost": 10, "growthApplied": 2 if resolution == "SUCCESS" else 4})
            elif kind == "ADVENTURE":
                entry.update({"staminaCost": 15, "growthAwarded": {"exploration": 3}, "foundCount": 3, "targetCount": 3})
            else:
                entry.update({"staminaCost": 0, "staminaRecovered": 20})
            history.append(entry)
    if len(history) != 260:
        raise AssertionError("Ending fixture must contain exactly 260 weekdays")
    return history, class_counts


def build_ending_fixture_run(
    active_run: dict[str, Any], *, ending_id: str, now: datetime,
    seen_ending_ids: list[str] | tuple[str, ...] = (),
) -> dict[str, Any]:
    """Return a valid ENDING_PENDING run with generous stats and guaranteed ending qualification."""
    if ending_id not in ending_ids():
        raise ValueError(f"Unsupported ending fixture: {ending_id}")
    if not isinstance(active_run, dict):
        raise ValueError("Active run is required")
    for key in ("runId", "runNumber", "characterId", "storyCast", "startedAt"):
        if key not in active_run:
            raise ValueError(f"Active run is missing {key}")

    rule = next((candidate for candidate in ENDING_RULES if candidate.ending_id == ending_id), None)
    focus_stat = (
        rule.record.split(":", 1)[1]
        if rule is not None and rule.record.startswith("class:")
        else rule.primary if rule is not None else "exploration"
    )
    history, class_counts = _activity_history(focus_stat)

    # 넉넉한 스탯 설정 (기본 180, 주스탯 420, 부스탯 270, 히든 140)
    # ※ 부스탯은 200 이상이어야 하지만 타 직업 후보 진입 방지를 위해 300 미만(270)으로 유지
    stats = {stat: 180 for stat in _STATS}
    hidden = {tag: 15 for tag in _TAGS}
    if rule is None:
        # 별길 개척자 (FALLBACK) - 모든 주스탯이 300 미만이어야 함
        stats.update({stat: 240 for stat in _STATS})
        hidden["curiosity"] = 60
        hidden["cooperation"] = 50
    else:
        stats[rule.primary] = 420
        stats[rule.secondary] = max(stats[rule.secondary], 270)
        hidden[rule.hidden] = 140

    run_statistics: dict[str, Any] = {
        "classCount": 156,
        "adventureCount": 52,
        "restCount": 52,
        "minigamePlayCount": 156,
        "minigameClearCount": 156,
        "npcEncounterCount": 24,
        "completedNpcStoryCount": 4,
        "locationDiscoveryCount": 18,
        "specialItemDiscoveryCount": 8,
        "importantChoiceCount": 1,
        "classCounts": class_counts,
    }
    if rule is not None:
        _record_counter(run_statistics, rule.record, max(rule.record_threshold + 10, 12))
        _record_counter(run_statistics, rule.tie_record, max(rule.record_threshold + 10, 12))

    story_progress = {
        story_id: {"step": 1, "status": "COMPLETED", "lastAdvancedWeek": week}
        for story_id, week in MAIN_STORY_WEEKS.items()
    }
    event_flags = {story_id: True for story_id in MAIN_STORY_WEEKS}
    run = deepcopy(active_run)
    run.update({
        "week": 52,
        "day": "FRIDAY",
        "phase": "ENDING_PENDING",
        "pendingStoryEvent": None,
        "storyEventWindow": {
            "week": 52,
            "sideStoryCount": 0,
            "locationStoryCount": 0,
            "lastResultStoryDay": None,
        },
        "updatedAt": now,
        "stats": stats,
        "stamina": {"current": 85, "max": 100},
        "hiddenStats": hidden,
        "npcProgress": {
            "GUIDE": {"encounterCount": 12, "lastEncounterWeek": 45},
            "WORK": {"encounterCount": 10, "lastEncounterWeek": 47},
            "LULU": {"encounterCount": 14, "lastEncounterWeek": 50},
        },
        "storyProgress": story_progress,
        "eventFlags": event_flags,
        "representativeChoices": [
            {"eventId": "MS05", "choiceId": "MS05_S3_TELL_ALL", "week": 49},
        ],
        "dialogueHistory": [],
        "minigameFailStreaks": {},
        "weeklySchedule": {},
        "activityHistory": history,
        "completedWeekdayCount": 5,
        "forcedRest": {"active": False, "remainingWeekdays": 0},
        "weekStartSnapshot": {
            "stats": {stat: max(0, value - 4) for stat, value in stats.items()},
            "stamina": 100,
        },
        "lastWeekSummary": {
            "week": 52,
            "statDelta": {stat: 4 for stat in _STATS},
            "classCount": 3,
            "staminaSpent": 45,
            "staminaRecovered": 20,
            "startStamina": 100,
            "endStamina": 85,
            "forcedRestDays": 0,
            "completedAt": now,
        },
        "runStatistics": run_statistics,
    })
    run.pop("endingDecision", None)
    run.pop("endingPrepared", None)

    decision = choose_ending(run=run, seen_ending_ids=list(seen_ending_ids))
    if decision["endingId"] != ending_id:
        raise ValueError(
            f"계정의 도감(seenEndingIds)에 이미 '{ending_id}' 엔딩이 등록되어 있어, "
            f"게임의 미수집 우선 룰에 의해 '{decision['endingId']}'가 선택되었습니다.\n"
            f"해결 방법:\n"
            f"  1) --reset-seen 플래그를 추가하여 해당 엔딩의 도감 수집 상태를 리셋하고 다시 실행하세요.\n"
            f"  2) 또는 아직 보지 않은 다른 엔딩(예: {decision['endingId']})을 --ending으로 지정하세요.\n"
            f"  3) --list-endings 로 전체 엔딩 목록을 확인하세요."
        )
    return run


def seed_slot(
    database: Any,
    *,
    uid: str,
    slot_id: int,
    ending_id: str | None = None,
    reset_seen: bool = False,
    reset_all_seen: bool = False,
) -> dict[str, Any]:
    root = database.collection("users").document(uid)
    slot_ref = root.collection("saveSlots").document(str(slot_id))
    meta_ref = root.collection("meta").document("progress")
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def apply(transaction: Any) -> dict[str, Any]:
        snapshot = slot_ref.get(transaction=transaction)
        meta_snapshot = meta_ref.get(transaction=transaction)
        if not snapshot.exists:
            raise RuntimeError("Save slot does not exist")
        if not meta_snapshot.exists:
            raise RuntimeError("Account progression does not exist")
        slot = SaveSlot.model_validate(snapshot.to_dict())
        auto_created_run = False
        if slot.status in {"EMPTY", "RUN_COMPLETE"} or not isinstance(slot.activeRun, dict):
            run_number = slot.completedRunCount + 1
            run_id = f"run-{uid[:8]}-{slot_id}-{run_number}-{int(now.timestamp())}"
            slot.activeRun = {
                "runId": run_id,
                "runNumber": run_number,
                "characterId": "CH01",
                "storyCast": {
                    "GUIDE": "CH16",
                    "WORK": "CH17",
                    "LULU": "CH18",
                },
                "startedAt": now,
            }
            slot.status = "PLAYING"
            if not slot.createdAt:
                slot.createdAt = now
            auto_created_run = True

        if slot.activeRun.get("runNumber") != slot.completedRunCount + 1:
            slot.activeRun["runNumber"] = slot.completedRunCount + 1

        meta_dict = meta_snapshot.to_dict()
        seen = list(meta_dict.get("seenEndingIds", []))
        if any(not isinstance(item, str) for item in seen):
            raise RuntimeError("Account seen-ending history is invalid")

        meta_modified = False
        if reset_all_seen and seen:
            seen = []
            meta_modified = True

        target_ending = ending_id
        auto_selected_unseen = False
        if target_ending is None:
            if DEFAULT_ENDING_ID not in seen:
                target_ending = DEFAULT_ENDING_ID
            else:
                unseen = [rule.ending_id for rule in ENDING_RULES if rule.ending_id not in seen]
                if unseen:
                    target_ending = unseen[0]
                    auto_selected_unseen = True
                else:
                    target_ending = DEFAULT_ENDING_ID

        if reset_seen and target_ending in seen:
            seen = [eid for eid in seen if eid != target_ending]
            meta_modified = True

        if meta_modified:
            meta_dict["seenEndingIds"] = seen
            meta_dict["updatedAt"] = now
            transaction.set(meta_ref, meta_dict)

        seeded_run = build_ending_fixture_run(
            slot.activeRun, ending_id=target_ending, now=now, seen_ending_ids=seen,
        )
        slot.activeRun = seeded_run
        slot.serverRevision += 1
        slot.lastSavedAt = now
        transaction.set(slot_ref, slot.model_dump(mode="python"))
        return {
            "uid": uid,
            "slotId": slot_id,
            "serverRevision": slot.serverRevision,
            "runId": seeded_run["runId"],
            "endingId": target_ending,
            "week": seeded_run["week"],
            "phase": seeded_run["phase"],
            "activityHistoryCount": len(seeded_run["activityHistory"]),
            "autoSelectedUnseen": auto_selected_unseen,
            "autoCreatedRun": auto_created_run,
            "seenResetApplied": meta_modified,
            "remainingSeenCount": len(seen),
            "stats": seeded_run["stats"],
            "hiddenStats": seeded_run["hiddenStats"],
        }

    return apply(database.transaction())


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Turn one existing PLAYING slot into a deterministic 52-week ending fixture."
    )
    parser.add_argument(
        "--list-endings",
        action="store_true",
        help="Print the full catalog of 11 available endings with conditions and exit.",
    )
    target = parser.add_mutually_exclusive_group()
    target.add_argument("--uid", help="Firebase Authentication UID")
    target.add_argument("--email", help="Firebase Authentication email; resolved to UID with Admin SDK")
    parser.add_argument("--slot", type=int, choices=range(1, 6), help="Save slot number (1-5)")
    parser.add_argument(
        "--ending",
        type=str,
        default=None,
        help="Desired ending ID, number (1-11), or Korean/English keyword. Defaults to unseen ending or Arcadia Explorer.",
    )
    parser.add_argument(
        "--reset-seen",
        action="store_true",
        help="If the desired ending was already unlocked on this account, remove it from seenEndingIds so it can be re-tested.",
    )
    parser.add_argument(
        "--reset-all-seen",
        action="store_true",
        help="Reset all seenEndingIds to empty on this account.",
    )
    parser.add_argument(
        "--confirm-ending-fixture",
        action="store_true",
        help="Required destructive confirmation. Replaces the current activeRun progress in this slot.",
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    if args.list_endings:
        print(format_ending_catalog())
        return 0

    if not args.uid and not args.email:
        raise SystemExit("Error: Either --uid or --email is required (unless using --list-endings)")
    if not args.slot:
        raise SystemExit("Error: --slot (1-5) is required")
    if not args.confirm_ending_fixture:
        raise SystemExit("Refusing to modify Firestore without --confirm-ending-fixture")

    resolved_ending_id = None
    if args.ending:
        resolved_ending_id = resolve_ending_id(args.ending)

    settings = Settings.from_env()
    services = initialize_firebase(settings)
    uid = args.uid
    if args.email:
        uid = services.auth.get_user_by_email(args.email).uid

    result = seed_slot(
        services.firestore,
        uid=uid,
        slot_id=args.slot,
        ending_id=resolved_ending_id,
        reset_seen=args.reset_seen,
        reset_all_seen=args.reset_all_seen,
    )

    ending_entry = next((item for item in ENDING_CATALOG if item["id"] == result["endingId"]), None)
    title_str = f"{ending_entry['title']}" if ending_entry else result["endingId"]

    print("=" * 70)
    print(" [OK] 52주차 엔딩 피스처가 성공적으로 주입되었습니다!")
    print("=" * 70)
    print(f" - 계정 UID:        {result['uid']}")
    print(f" - 슬롯 번호:       {result['slotId']}번 슬롯 (Revision: {result['serverRevision']})")
    print(f" - 목표 엔딩:       {result['endingId']} ({title_str})")
    if result.get("autoCreatedRun"):
        print("   ※ 대상 슬롯이 미생성(EMPTY/RUN_COMPLETE) 상태여서 기본 캐릭터(CH01 카엘)로 자동 생성 후 52주차로 세팅했습니다.")
    if result["autoSelectedUnseen"]:
        print("   ※ 기본 엔딩(아르카디아 탐험가)이 이미 수집되어 있어, 미수집 엔딩으로 자동 선택되었습니다.")
    if result["seenResetApplied"]:
        print(f"   ※ 도감(seenEndingIds) 리셋이 적용되었습니다. (남은 도감 수: {result['remainingSeenCount']})")
    print(f" - 주차 및 상태:    {result['week']}주차 / {result['phase']}")
    print(f" - 적용된 스탯:     {result['stats']}")
    print(f" - 활동 이력 수:    {result['activityHistoryCount']}일 완료")
    print("=" * 70)
    print("이제 웹 게임 화면을 새로고침하고 해당 슬롯을 이어하기 하면 52주차 엔딩을 즉시 확인할 수 있습니다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
