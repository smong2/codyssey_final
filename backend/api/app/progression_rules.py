"""Pure Phase 8 collection, unlock, and career-ending rules.

The functions in this module never perform I/O.  Firestore transactions may
retry a mutator, so every progression decision (including puzzle-piece and
ending tie selection) is deterministic for the same stored state.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from hashlib import sha256
from typing import Callable

from .account import _STATS, _TAGS
from .models import GlobalMetaProgress, GlobalStatistics, UnlockState


class ProgressionError(ValueError):
    pass


@dataclass(frozen=True)
class BadgeTrack:
    category: str
    subcategory: str
    bonus_stat: str
    metric: str
    thresholds: tuple[int, ...]

    @property
    def key(self) -> str:
        return f"{self.category}:{self.subcategory}"


_LONG = (1, 5, 10, 20, 40, 70, 120, 200)
_TAG = (1, 3, 5, 10, 20, 35, 50, 80)

BADGE_TRACKS = (
    BadgeTrack("FOREST", "COMPASS", "exploration", "totalAdventureCount", _LONG),
    BadgeTrack("FOREST", "TREASURE", "exploration", "totalSpecialItemDiscoveryCount", (1, 3, 5, 10, 20, 35, 50, 80)),
    BadgeTrack("FOREST", "DOOR", "exploration", "totalLocationDiscoveryCount", (1, 3, 5, 10, 20, 30, 50, 80)),
    BadgeTrack("FOREST", "CURIOSITY", "exploration", "behavior:curiosity", _TAG),
    BadgeTrack("FOREST", "PET", "exploration", "pet_count", (2, 3, 4, 5, 6, 7, 8, 10)),
    BadgeTrack("STAR", "SCIENCE", "knowledge", "class:knowledge", _LONG),
    BadgeTrack("STAR", "SPEECH", "knowledge", "class:expression", _LONG),
    BadgeTrack("STAR", "THINKING", "knowledge", "behavior:caution", _TAG),
    BadgeTrack("STAR", "INDEPENDENCE", "knowledge", "behavior:independence", _TAG),
    BadgeTrack("STAR", "RETRY", "knowledge", "retryAfterFailureCount", (1, 2, 3, 5, 8, 12, 20, 30)),
    BadgeTrack("WORKSHOP", "ACTIVITY", "skill", "class:skill", _LONG),
    BadgeTrack("WORKSHOP", "CHAMPION", "skill", "totalMinigameClearCount", _LONG),
    BadgeTrack("WORKSHOP", "PUZZLE", "skill", "puzzle_count", (1, 3, 5, 10, 15, 20, 28, 36)),
    BadgeTrack("WORKSHOP", "ROOM", "skill", "myRoomActiveWeekCount", _LONG),
    BadgeTrack("WORKSHOP", "PROMISE", "skill", "behavior:responsibility", _TAG),
    BadgeTrack("FRIENDSHIP", "FRIENDS", "expression", "totalNpcEncounterCount", _LONG),
    BadgeTrack("FRIENDSHIP", "LISTENING", "expression", "completedNpcStoryCount", (1, 2, 3, 5, 8, 12, 16, 20)),
    BadgeTrack("FRIENDSHIP", "EMPATHY", "expression", "behavior:empathy", _TAG),
    BadgeTrack("FRIENDSHIP", "COOPERATION", "expression", "behavior:cooperation", _TAG),
    BadgeTrack("FRIENDSHIP", "HONESTY", "expression", "behavior:honesty", _TAG),
    BadgeTrack("RUNE", "AWAKEN", "magic", "class:magic", _LONG),
    BadgeTrack("RUNE", "CHOICE", "magic", "importantChoiceCount", _TAG),
    BadgeTrack("RUNE", "COURAGE", "magic", "behavior:courage", _TAG),
    BadgeTrack("RUNE", "CHARACTER", "magic", "character_count", (7, 8, 10, 12, 16, 20, 25, 32)),
    BadgeTrack("RUNE", "FUTURE", "magic", "regular_ending_count", (1, 2, 3, 4, 5, 6, 8, 10)),
)

TRACK_BY_KEY = {track.key: track for track in BADGE_TRACKS}


def badge_id(track: BadgeTrack, number: int) -> str:
    return f"BADGE_{track.category}_{track.subcategory}_{number:02d}"


def _counter(value: object, name: str) -> int:
    if type(value) is not int or value < 0:
        raise ProgressionError(f"Stored progression counter {name} is invalid")
    return value


def _metric(track: BadgeTrack, meta: GlobalMetaProgress, statistics: GlobalStatistics) -> int:
    metric = track.metric
    if metric.startswith("behavior:"):
        key = metric.split(":", 1)[1]
        if key not in _TAGS:
            raise ProgressionError("Badge behavior metric is invalid")
        return _counter(statistics.behaviorTagCounts.get(key), metric)
    if metric.startswith("class:"):
        key = metric.split(":", 1)[1]
        if key not in _STATS:
            raise ProgressionError("Badge class metric is invalid")
        return _counter(statistics.classCounts.get(key), metric)
    if metric == "pet_count":
        return len(set(meta.unlockedPetIds))
    if metric == "puzzle_count":
        return len(set(meta.acquiredPuzzlePieceIds))
    if metric == "character_count":
        return len(set(meta.unlockedCharacterIds))
    if metric == "regular_ending_count":
        return len({ending for ending in meta.seenEndingIds if ending != "ENDING_STARPATH_PIONEER"})
    if not hasattr(statistics, metric):
        raise ProgressionError(f"Unknown badge metric {metric}")
    return _counter(getattr(statistics, metric), metric)


CHARACTER_TRACK_UNLOCKS = {
    "FOREST:CURIOSITY": "CH03",
    "STAR:SCIENCE": "CH04",
    "RUNE:CHOICE": "CH05",
    "RUNE:AWAKEN": "CH06",
    "STAR:RETRY": "CH07",
    "RUNE:FUTURE": "CH09",
    "FRIENDSHIP:EMPATHY": "CH10",
    "STAR:SPEECH": "CH11",
    "FOREST:TREASURE": "CH12",
    "WORKSHOP:PROMISE": "CH17",
    "STAR:THINKING": "CH18",
    "FRIENDSHIP:FRIENDS": "CH19",
    "FRIENDSHIP:LISTENING": "CH20",
    "WORKSHOP:CHAMPION": "CH21",
    "WORKSHOP:ACTIVITY": "CH22",
    "WORKSHOP:ROOM": "CH23",
    "FRIENDSHIP:COOPERATION": "CH24",
    "STAR:INDEPENDENCE": "CH25",
    "WORKSHOP:PUZZLE": "CH26",
    "FRIENDSHIP:HONESTY": "CH27",
    "FOREST:COMPASS": "CH28",
    "RUNE:COURAGE": "CH29",
    "FOREST:DOOR": "CH30",
}


PUZZLE_CONDITIONS: tuple[tuple[str, Callable[[GlobalStatistics], int], int], ...] = (
    *((f"PUZZLE_MINIGAME_PLAY_{value:03d}", lambda s: s.totalMinigamePlayCount, value)
      for value in (5, 10, 20, 30, 50, 70, 100, 130)),
    *((f"PUZZLE_MINIGAME_UNIQUE_CLEAR_{value:03d}", lambda s: len(set(s.clearedMinigameIds)), value)
      for value in (1, 2, 3, 4, 5)),
    *((f"PUZZLE_ADVENTURE_{value:03d}", lambda s: s.totalAdventureCount, value)
      for value in (1, 5, 10, 20, 30, 40, 60, 80)),
    *((f"PUZZLE_NPC_ENCOUNTER_{value:03d}", lambda s: s.totalNpcEncounterCount, value)
      for value in (1, 5, 10, 20, 30, 40, 60)),
    *((f"PUZZLE_CLASS_{stat.upper()}_010", lambda s, key=stat: s.classCounts[key], 10)
      for stat in _STATS),
    ("PUZZLE_MINIGAME_PLAY_250", lambda s: s.totalMinigamePlayCount, 250),
    ("PUZZLE_ADVENTURE_250", lambda s: s.totalAdventureCount, 250),
    ("PUZZLE_NPC_ENCOUNTER_500", lambda s: s.totalNpcEncounterCount, 500),
)

ROOM_BACKGROUND_IDS = ("ROOM_01", "ROOM_02", "ROOM_03")
PUZZLE_PIECE_IDS = tuple(
    f"PUZZLE_{room}_{number:02d}"
    for room in ROOM_BACKGROUND_IDS
    for number in range(1, 13)
)


@dataclass
class ProgressionSummary:
    badges: list[str]
    pets: list[str]
    puzzlePieces: list[str]
    roomBackgrounds: list[str]
    pendingCharacters: list[str]
    permanentBonusDelta: dict[str, int]

    @classmethod
    def empty(cls) -> "ProgressionSummary":
        return cls([], [], [], [], [], {stat: 0 for stat in _STATS})

    def as_dict(self) -> dict:
        return {
            "badges": self.badges,
            "pets": self.pets,
            "puzzlePieces": self.puzzlePieces,
            "roomBackgrounds": self.roomBackgrounds,
            "pendingCharacters": self.pendingCharacters,
            "permanentBonusDelta": self.permanentBonusDelta,
        }


def _append_once(items: list[str], value: str) -> bool:
    if value in items:
        return False
    items.append(value)
    return True


def _award_badges_and_stage_rewards(
    meta: GlobalMetaProgress,
    statistics: GlobalStatistics,
    unlock: UnlockState,
    summary: ProgressionSummary,
) -> bool:
    changed = False
    acquired = set(meta.acquiredBadgeIds)
    completed = set(unlock.completedConditionIds)
    for track in BADGE_TRACKS:
        metric = _metric(track, meta, statistics)
        for number, threshold in enumerate(track.thresholds, 1):
            identifier = badge_id(track, number)
            if metric >= threshold and identifier not in acquired:
                meta.acquiredBadgeIds.append(identifier)
                acquired.add(identifier)
                summary.badges.append(identifier)
                condition = f"BADGE_ACQUIRE_{track.category}_{track.subcategory}_{number:02d}"
                if condition not in completed:
                    unlock.completedConditionIds.append(condition)
                    completed.add(condition)
                changed = True
        count = sum(1 for number in range(1, 9) if badge_id(track, number) in acquired)
        for milestone in (2, 5, 8):
            condition = f"BADGE_STAGE_{track.category}_{track.subcategory}_{milestone:02d}"
            if count >= milestone and condition not in completed:
                bonus = meta.permanentBonuses.get(track.bonus_stat)
                if type(bonus) is not int or not 0 <= bonus <= 15:
                    raise ProgressionError("Permanent bonus state is invalid")
                if bonus >= 15:
                    raise ProgressionError("Permanent bonus would exceed the +15 category cap")
                meta.permanentBonuses[track.bonus_stat] = bonus + 1
                summary.permanentBonusDelta[track.bonus_stat] += 1
                unlock.completedConditionIds.append(condition)
                completed.add(condition)
                changed = True
    return changed


def _award_puzzle_pieces(
    *, uid: str, meta: GlobalMetaProgress, statistics: GlobalStatistics,
    unlock: UnlockState, summary: ProgressionSummary,
) -> bool:
    changed = False
    completed = set(unlock.completedConditionIds)
    acquired = set(meta.acquiredPuzzlePieceIds)
    for condition_id, metric, threshold in PUZZLE_CONDITIONS:
        value = _counter(metric(statistics), condition_id)
        if value < threshold or condition_id in completed:
            continue
        remaining = [piece for piece in PUZZLE_PIECE_IDS if piece not in acquired]
        if not remaining:
            unlock.completedConditionIds.append(condition_id)
            completed.add(condition_id)
            changed = True
            continue
        digest = sha256(f"{uid}:{condition_id}".encode("utf-8")).digest()
        chosen = remaining[int.from_bytes(digest[:8], "big") % len(remaining)]
        meta.acquiredPuzzlePieceIds.append(chosen)
        acquired.add(chosen)
        summary.puzzlePieces.append(chosen)
        unlock.completedConditionIds.append(condition_id)
        completed.add(condition_id)
        changed = True
    return changed


def _unlock_completed_rooms(meta: GlobalMetaProgress, summary: ProgressionSummary) -> bool:
    changed = False
    acquired = set(meta.acquiredPuzzlePieceIds)
    for room in ROOM_BACKGROUND_IDS:
        required = {f"PUZZLE_{room}_{number:02d}" for number in range(1, 13)}
        if required.issubset(acquired) and _append_once(meta.unlockedRoomBackgroundIds, room):
            summary.roomBackgrounds.append(room)
            changed = True
    return changed


def _queue_characters(
    meta: GlobalMetaProgress, statistics: GlobalStatistics,
    unlock: UnlockState, summary: ProgressionSummary,
) -> bool:
    changed = False
    acquired = set(meta.acquiredBadgeIds)
    for key, character_id in CHARACTER_TRACK_UNLOCKS.items():
        track = TRACK_BY_KEY[key]
        if sum(1 for number in range(1, 9) if badge_id(track, number) in acquired) < 5:
            continue
        condition = f"CHARACTER_UNLOCK_{character_id}"
        if character_id in meta.unlockedCharacterIds or condition in unlock.completedConditionIds:
            continue
        _append_once(unlock.pendingCharacterUnlockIds, character_id)
        unlock.completedConditionIds.append(condition)
        summary.pendingCharacters.append(character_id)
        changed = True

    regular_endings = {ending for ending in meta.seenEndingIds if ending != "ENDING_STARPATH_PIONEER"}
    completion_rules = (
        ("CH13", statistics.totalCompletedRuns >= 1),
        ("CH14", len(regular_endings) >= 3),
        ("CH32", len(regular_endings) >= 10),
    )
    for character_id, eligible in completion_rules:
        condition = f"CHARACTER_UNLOCK_{character_id}"
        if (eligible and character_id not in meta.unlockedCharacterIds
                and condition not in unlock.completedConditionIds):
            _append_once(unlock.pendingCharacterUnlockIds, character_id)
            unlock.completedConditionIds.append(condition)
            summary.pendingCharacters.append(character_id)
            changed = True
    return changed


def _unlock_pets(
    meta: GlobalMetaProgress, statistics: GlobalStatistics,
    unlock: UnlockState, summary: ProgressionSummary,
) -> bool:
    track_complete = any(
        all(badge_id(track, number) in meta.acquiredBadgeIds for number in range(1, 9))
        for track in BADGE_TRACKS
    )
    regular_endings = len({ending for ending in meta.seenEndingIds if ending != "ENDING_STARPATH_PIONEER"})
    rules = (
        ("PET02", statistics.totalCompletedRuns >= 1),
        ("PET03", len(set(meta.unlockedCharacterIds)) >= 10),
        ("PET04", statistics.totalAdventureCount >= 100),
        ("PET05", statistics.completedNpcStoryCount >= 5),
        ("PET06", regular_endings >= 3),
        ("PET07", len(set(meta.unlockedCharacterIds)) >= 18),
        ("PET08", track_complete),
        ("PET09", statistics.totalClassCount >= 150
                  and statistics.totalAdventureCount >= 150
                  and statistics.totalNpcEncounterCount >= 30),
        ("PET10", len(set(meta.unlockedCharacterIds)) >= 25),
    )
    changed = False
    for pet_id, eligible in rules:
        condition = f"PET_UNLOCK_{pet_id}"
        if not eligible or pet_id in meta.unlockedPetIds:
            continue
        if condition not in unlock.completedConditionIds:
            unlock.completedConditionIds.append(condition)
        meta.unlockedPetIds.append(pet_id)
        summary.pets.append(pet_id)
        changed = True
    return changed


def evaluate_progression(
    *, uid: str, meta: GlobalMetaProgress, statistics: GlobalStatistics,
    unlock: UnlockState, now: datetime,
) -> ProgressionSummary:
    """Apply every currently satisfied account-wide Phase 8 condition.

    The loop is intentional: a puzzle piece can earn a puzzle badge, an 8/8
    badge can unlock PET08, and the new pet count can immediately earn another
    badge.  Every reward remains bounded by IDs and completedConditionIds.
    """
    if set(meta.permanentBonuses) != set(_STATS):
        raise ProgressionError("Permanent bonus keys are invalid")
    if set(statistics.classCounts) != set(_STATS) or set(statistics.behaviorTagCounts) != set(_TAGS):
        raise ProgressionError("Global progression counter keys are invalid")
    summary = ProgressionSummary.empty()
    for _ in range(16):
        changed = False
        changed |= _award_puzzle_pieces(uid=uid, meta=meta, statistics=statistics,
                                        unlock=unlock, summary=summary)
        changed |= _unlock_completed_rooms(meta, summary)
        changed |= _award_badges_and_stage_rewards(meta, statistics, unlock, summary)
        changed |= _queue_characters(meta, statistics, unlock, summary)
        changed |= _unlock_pets(meta, statistics, unlock, summary)
        if not changed:
            break
    else:
        raise ProgressionError("Progression cascade did not converge")
    meta.updatedAt = now
    unlock.updatedAt = now
    return summary


def promote_pending_characters(
    *, meta: GlobalMetaProgress, unlock: UnlockState, now: datetime,
) -> list[str]:
    """Phase 9 final-title helper: make queued characters selectable."""
    promoted: list[str] = []
    for character_id in list(unlock.pendingCharacterUnlockIds):
        if _append_once(meta.unlockedCharacterIds, character_id):
            promoted.append(character_id)
    unlock.pendingCharacterUnlockIds = []
    meta.updatedAt = now
    unlock.updatedAt = now
    return promoted


def record_daily_unlocks(summary: dict, progression: ProgressionSummary) -> None:
    unlocks = summary.get("unlocks")
    if not isinstance(unlocks, dict) or not isinstance(unlocks.get("newByTypeAndId"), dict):
        raise ProgressionError("Daily unlock summary is invalid")
    target = unlocks["newByTypeAndId"]
    for kind, values in (
        ("BADGE", progression.badges),
        ("PET", progression.pets),
        ("PUZZLE_PIECE", progression.puzzlePieces),
        ("ROOM_BACKGROUND", progression.roomBackgrounds),
    ):
        if not values:
            continue
        bucket = target.setdefault(kind, {})
        if not isinstance(bucket, dict):
            raise ProgressionError("Daily unlock bucket is invalid")
        for identifier in values:
            current = bucket.get(identifier, 0)
            if type(current) is not int or current < 0:
                raise ProgressionError("Daily unlock counter is invalid")
            bucket[identifier] = current + 1


@dataclass(frozen=True)
class EndingRule:
    ending_id: str
    title: str
    subtitle: str
    primary: str
    secondary: str
    hidden: str
    record: str
    record_threshold: int
    tie_record: str


ENDING_RULES = (
    EndingRule("ENDING_RUNE_RESEARCHER", "룬 연구자", "새로운 문양을 읽는 사람", "magic", "knowledge", "curiosity", "class:magic", 40, "class:magic"),
    EndingRule("ENDING_ARCADIA_EXPLORER", "아르카디아 탐험가", "아직 가보지 않은 길", "exploration", "knowledge", "curiosity", "adventureCount", 40, "adventureCount"),
    EndingRule("ENDING_ARCANE_ARTISAN", "마도 장인", "손으로 완성하는 마법 도구", "magic", "skill", "caution", "class:skill", 40, "class:skill"),
    EndingRule("ENDING_HERB_GARDENER", "약초 정원사", "자라는 것을 돌보는 사람", "skill", "exploration", "empathy", "adventureCount", 40, "specialItemDiscoveryCount"),
    EndingRule("ENDING_ACADEMY_GUARDIAN", "아카데미 수호 기사", "안전한 길을 지키는 사람", "skill", "magic", "responsibility", "importantChoiceCount", 10, "importantChoiceCount"),
    EndingRule("ENDING_ACADEMY_TEACHER", "아카데미 교사", "다음 학생과 나누는 배움", "knowledge", "expression", "cooperation", "classCount", 80, "classCount"),
    EndingRule("ENDING_ARCHIVIST", "아카이브 기록관", "사라지지 않게 남기는 이야기", "knowledge", "exploration", "caution", "locationDiscoveryCount", 10, "locationDiscoveryCount"),
    EndingRule("ENDING_MAGIC_PERFORMER", "마법 공연가", "마음을 전하는 무대", "expression", "magic", "empathy", "class:expression", 40, "class:expression"),
    EndingRule("ENDING_MAGICAL_CREATURE_KEEPER", "마법 생물 돌봄이", "함께 살아가는 법을 배우다", "exploration", "expression", "empathy", "npcEncounterCount", 40, "npcEncounterCount"),
    EndingRule("ENDING_ACADEMY_EVENT_PLANNER", "아카데미 행사 기획자", "모두가 함께하는 하루", "expression", "knowledge", "cooperation", "completedNpcStoryCount", 5, "completedNpcStoryCount"),
)


def _run_counter(run: dict, key: str) -> int:
    stats = run.get("runStatistics")
    if not isinstance(stats, dict):
        raise ProgressionError("Run statistics are invalid")
    if key.startswith("class:"):
        target = key.split(":", 1)[1]
        values = stats.get("classCounts")
        if not isinstance(values, dict):
            raise ProgressionError("Run class counts are invalid")
        return _counter(values.get(target), key)
    return _counter(stats.get(key), key)


def _stable_pick(run_id: str, candidates: list[EndingRule], purpose: str) -> EndingRule:
    ordered = sorted(candidates, key=lambda rule: rule.ending_id)
    digest = sha256(f"{run_id}:{purpose}:{','.join(rule.ending_id for rule in ordered)}".encode()).digest()
    return ordered[int.from_bytes(digest[:8], "big") % len(ordered)]


def choose_ending(*, run: dict, seen_ending_ids: list[str]) -> dict:
    visible = run.get("stats")
    hidden = run.get("hiddenStats")
    run_id = run.get("runId")
    if (not isinstance(visible, dict) or not isinstance(hidden, dict)
            or not isinstance(run_id, str) or not run_id):
        raise ProgressionError("Ending decision state is incomplete")
    for stat in _STATS:
        if _counter(visible.get(stat), f"stats.{stat}") > 500:
            raise ProgressionError("Visible stat exceeds ending range")
    for tag in _TAGS:
        if _counter(hidden.get(tag), f"hiddenStats.{tag}") > 300:
            raise ProgressionError("Hidden stat exceeds ending range")

    candidates = [rule for rule in ENDING_RULES if visible[rule.primary] >= 300]
    if not candidates:
        return {
            "endingId": "ENDING_STARPATH_PIONEER", "endingType": "FALLBACK",
            "title": "별길 개척자", "subtitle": None,
        }
    seen = set(seen_ending_ids)
    unseen = [rule for rule in candidates if rule.ending_id not in seen]
    if not unseen:
        chosen = _stable_pick(run_id, candidates, "all-seen")
    else:
        scored: list[tuple[EndingRule, int, int, int]] = []
        for rule in unseen:
            fitness = sum((
                visible[rule.secondary] >= 200,
                hidden[rule.hidden] >= 40,
                _run_counter(run, rule.record) >= rule.record_threshold,
            ))
            scored.append((rule, fitness, _run_counter(run, rule.tie_record), visible[rule.primary]))
        best = max((fitness, tie, primary) for _, fitness, tie, primary in scored)
        tied = [rule for rule, fitness, tie, primary in scored if (fitness, tie, primary) == best]
        chosen = tied[0] if len(tied) == 1 else _stable_pick(run_id, tied, "unseen-tie")
    return {
        "endingId": chosen.ending_id, "endingType": "CAREER",
        "title": chosen.title, "subtitle": chosen.subtitle,
    }
