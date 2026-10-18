"""Pure Phase 9 Long-term Play Memory selection and ending-letter validation."""

from __future__ import annotations

from contextlib import closing
from dataclasses import dataclass
from pathlib import Path
import sqlite3

from .account import _STATS, _TAGS
from .progression_rules import ENDING_RULES, ProgressionError


PROMPT_VERSION = "ending-letter-v1"


class EndingWorkflowError(ValueError):
    pass


class LetterValidationError(EndingWorkflowError):
    pass


@dataclass(frozen=True)
class EndingNarrative:
    career_anchor: str
    future_scene_guide: str | None
    priority_records: tuple[str, ...]


ENDING_NARRATIVES = {
    "ENDING_RUNE_RESEARCHER": EndingNarrative(
        "아카데미에서 발견한 질문을 바탕으로 룬을 연구하고 다른 사람과 이해를 나누는 길을 시작한다. 모든 룬의 답을 이미 아는 결말은 아니다.",
        "낯선 룬 흔적을 관찰하고 기록하며, 발렌티누스나 친구와 질문을 나누고 다음 연구 과제를 정한다.",
        ("class:magic", "minigameClearCount"),
    ),
    "ENDING_ARCADIA_EXPLORER": EndingNarrative(
        "아르카디아의 장소와 사람들을 더 알아가는 탐험가의 길을 택한다. 모험은 위험을 이기는 것보다 관찰하고 질문하며 길을 알아가는 일로 그린다.",
        "익숙한 장소의 지도를 펼쳐 다음 답사지를 표시하고, 준비물을 챙겨 아직 가보지 않은 길로 출발한다.",
        ("adventureCount", "locationDiscoveryCount"),
    ),
    "ENDING_ARCANE_ARTISAN": EndingNarrative(
        "마법과 손기술을 함께 쓰며 누군가에게 쓸모 있는 작은 도구를 만들고 개선해 가는 장인의 길을 시작한다.",
        "익숙한 도구와 재료로 작은 마도 보조 도구를 만들고, 실제 사용 결과를 보고 다음 개선점을 기록한다.",
        ("class:skill", "minigameClearCount"),
    ),
    "ENDING_HERB_GARDENER": EndingNarrative(
        "식물의 변화를 살피고 필요한 돌봄을 배우는 약초 정원사의 길을 시작한다. 특정 선택을 정답으로 만들지 않는다.",
        "작은 정원이나 약초 구역에서 새싹의 상태를 살피고 물·빛·자리 중 필요한 돌봄을 이어 간다.",
        ("specialItemDiscoveryCount", "adventureCount"),
    ),
    "ENDING_ACADEMY_GUARDIAN": EndingNarrative(
        "싸움에서 이기는 전사가 아니라 주변을 살피고 학생과 교직원이 안심할 수 있는 안전한 길을 만드는 수호 기사의 길을 시작한다.",
        "수련장의 도구와 안전 구역을 확인하고 동료들이 안심하고 연습할 수 있도록 첫 임무를 수행한다.",
        ("class:skill", "importantChoiceCount"),
    ),
    "ENDING_ACADEMY_TEACHER": EndingNarrative(
        "모든 것을 아는 완벽한 선생님이 아니라, 배운 내용을 쉽게 나누고 학생과 함께 답을 찾아가는 교사의 길을 선택한다.",
        "후배 학생의 질문을 듣고 자신이 이해한 방식으로 설명하며, 질문 속에서 새로운 점을 함께 발견한다.",
        ("classCount", "npcEncounterCount"),
    ),
    "ENDING_ARCHIVIST": EndingNarrative(
        "자료를 보관하는 데서 그치지 않고 기록의 맥락과 사람들의 경험까지 다음 학생에게 남기는 기록관의 길을 시작한다.",
        "한 해 동안 모인 기록을 정리하며 빠진 부분과 아직 모르는 점도 그대로 표시해 대서고에 남긴다.",
        ("locationDiscoveryCount", "class:knowledge"),
    ),
    "ENDING_MAGIC_PERFORMER": EndingNarrative(
        "완벽함을 증명하는 스타가 아니라 마법과 예술로 이야기를 전하고 사람들을 한자리에 모으는 공연가의 길을 시작한다.",
        "한 해의 경험에서 영감을 얻어 짧은 마법 공연이나 창작 발표를 준비하고 주변 사람들과 순간을 나눈다.",
        ("class:expression", "minigameClearCount"),
    ),
    "ENDING_MAGICAL_CREATURE_KEEPER": EndingNarrative(
        "마법 생물을 소유하거나 명령하기보다 생김새와 습성을 알아가며 함께 지내는 방법을 배우는 돌봄이의 길을 시작한다.",
        "낯선 마법 생물이 편안히 머물 수 있도록 먹이·쉼터·거리 중 필요한 것을 관찰하고 생활을 돕는다.",
        ("npcEncounterCount", "adventureCount"),
    ),
    "ENDING_ACADEMY_EVENT_PLANNER": EndingNarrative(
        "모두가 똑같이 참여하게 하는 사람이 아니라 서로 다른 역할과 선호를 고려해 각자 편한 방식으로 함께할 수 있는 자리를 만드는 기획자의 길을 시작한다.",
        "학생들과 작은 행사의 순서와 역할을 준비하고, 무대·지원·관람 등 서로 다른 참여 방식을 함께 담아 행사를 연다.",
        ("completedNpcStoryCount", "npcEncounterCount"),
    ),
    "ENDING_STARPATH_PIONEER": EndingNarrative(
        "아직 하나의 길에 자신을 묶기보다 여러 길을 직접 걸어 보며 새로운 가능성을 찾는 사람으로 앞으로의 길을 이어 간다.",
        None,
        (),
    ),
}


COMMON_RECORD_ORDER = (
    "classCount", "adventureCount", "npcEncounterCount", "minigameClearCount",
    "completedNpcStoryCount", "locationDiscoveryCount", "specialItemDiscoveryCount",
    "importantChoiceCount",
)

RECORD_LABELS = {
    "classCount": "수업에 참여한 횟수",
    "adventureCount": "모험을 떠난 횟수",
    "npcEncounterCount": "NPC와 만난 횟수",
    "minigameClearCount": "미니게임을 완료한 횟수",
    "completedNpcStoryCount": "NPC 스토리를 완료한 횟수",
    "locationDiscoveryCount": "새로운 장소를 발견한 횟수",
    "specialItemDiscoveryCount": "특별 아이템·발견물을 찾은 횟수",
    "importantChoiceCount": "중요 선택을 한 횟수",
    "class:knowledge": "지식 계열 수업 횟수",
    "class:expression": "표현력 계열 수업 횟수",
    "class:skill": "솜씨 계열 수업 횟수",
    "class:exploration": "탐험 계열 수업 횟수",
    "class:magic": "마법 계열 수업 횟수",
}


def _record_count(run_statistics: dict, record_type: str) -> int:
    if record_type.startswith("class:"):
        stat = record_type.split(":", 1)[1]
        class_counts = run_statistics.get("classCounts")
        if stat not in _STATS or not isinstance(class_counts, dict):
            raise EndingWorkflowError("Run class-count memory is invalid")
        value = class_counts.get(stat)
    else:
        value = run_statistics.get(record_type)
    if type(value) is not int or value < 0:
        raise EndingWorkflowError(f"Run memory counter {record_type} is invalid")
    return value


def select_play_records(run_statistics: dict, ending_id: str) -> list[dict]:
    narrative = ENDING_NARRATIVES.get(ending_id)
    if narrative is None:
        raise EndingWorkflowError("Unknown ending narrative")
    ordered = list(narrative.priority_records) + list(COMMON_RECORD_ORDER)
    unique: list[str] = []
    for record_type in ordered:
        if record_type not in unique:
            unique.append(record_type)

    positive = [record_type for record_type in unique if _record_count(run_statistics, record_type) > 0]
    chosen = positive[:6]
    if len(chosen) < 4:
        for record_type in COMMON_RECORD_ORDER:
            if record_type not in chosen:
                chosen.append(record_type)
            if len(chosen) >= 4:
                break
    return [{"type": record_type, "label": RECORD_LABELS[record_type],
             "count": _record_count(run_statistics, record_type)} for record_type in chosen[:6]]


def hidden_highlights(hidden_stats: dict) -> list[dict]:
    if not isinstance(hidden_stats, dict):
        raise EndingWorkflowError("Hidden-stat memory is invalid")
    order = {tag: index for index, tag in enumerate(_TAGS)}
    values: list[tuple[str, int]] = []
    for tag in _TAGS:
        value = hidden_stats.get(tag)
        if type(value) is not int or not 0 <= value <= 300:
            raise EndingWorkflowError("Hidden-stat memory is invalid")
        if value > 0:
            values.append((tag, value))
    values.sort(key=lambda item: (-item[1], order[item[0]]))
    return [{"id": tag, "value": value} for tag, value in values[:3]]


class EndingContentMaster:
    """Read only writer-authored names and important-choice summaries from SQLite."""

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path).resolve()

    def memory_content(self, *, version: str, character_id: str,
                       representative_choices: list[dict]) -> tuple[str, list[dict]]:
        try:
            with closing(sqlite3.connect(f"{self.path.as_uri()}?mode=ro", uri=True)) as connection:
                connection.row_factory = sqlite3.Row
                connection.execute("PRAGMA query_only = ON")
                character = connection.execute(
                    "SELECT display_name FROM characters WHERE version=? AND character_id=?",
                    (version, character_id),
                ).fetchone()
                if character is None:
                    raise EndingWorkflowError("Ending character is missing from content master")
                enriched: list[dict] = []
                seen = set()
                valid_choices = [
                    item for item in representative_choices
                    if (isinstance(item, dict)
                        and isinstance(item.get("eventId"), str)
                        and isinstance(item.get("choiceId"), str)
                        and type(item.get("week")) is int
                        and item["week"] >= 1)
                ]
                ordered = sorted(
                    valid_choices,
                    key=lambda item: (-item["week"], item["eventId"], item["choiceId"]),
                )
                for item in ordered:
                    event_id, choice_id, week = item.get("eventId"), item.get("choiceId"), item.get("week")
                    if (event_id, choice_id) in seen:
                        continue
                    row = connection.execute(
                        """SELECT summary_text,is_important FROM story_choices
                           WHERE version=? AND event_id=? AND choice_id=?""",
                        (version, event_id, choice_id),
                    ).fetchone()
                    if row is None or not row["is_important"]:
                        continue
                    summary = row["summary_text"]
                    # The contract forbids AI-authored guesses.  Until writers populate
                    # summary_text, the choice stays out of the AI memory context.
                    if not isinstance(summary, str) or not summary.strip():
                        continue
                    seen.add((event_id, choice_id))
                    enriched.append({"eventId": event_id, "choiceId": choice_id,
                                     "week": week, "summary": summary.strip()})
                    if len(enriched) == 2:
                        break
                return character["display_name"], enriched
        except EndingWorkflowError:
            raise
        except (sqlite3.Error, OSError):
            raise EndingWorkflowError("Ending content master is unavailable") from None


def build_memory_context(*, run: dict, decision: dict, character_name: str,
                         representative_choices: list[dict]) -> dict:
    ending_id = decision.get("endingId")
    ending_type = decision.get("endingType")
    ending_name = decision.get("title")
    if not isinstance(character_name, str) or not character_name.strip():
        raise EndingWorkflowError("Ending character name is invalid")
    if not isinstance(ending_name, str) or not ending_name.strip():
        raise EndingWorkflowError("Ending display name is invalid")
    narrative = ENDING_NARRATIVES.get(ending_id)
    if narrative is None or ending_type not in {"CAREER", "FALLBACK"}:
        raise EndingWorkflowError("Ending decision is invalid")
    stats, hidden, run_statistics = run.get("stats"), run.get("hiddenStats"), run.get("runStatistics")
    if not isinstance(stats, dict) or not isinstance(run_statistics, dict):
        raise EndingWorkflowError("Long-term play memory is incomplete")
    if set(stats) != set(_STATS) or any(type(stats[key]) is not int or not 0 <= stats[key] <= 500 for key in _STATS):
        raise EndingWorkflowError("Visible-stat memory is invalid")
    rule = next((candidate for candidate in ENDING_RULES if candidate.ending_id == ending_id), None)
    return {
        "character": {"id": run.get("characterId"), "name": character_name},
        "ending": {
            "id": ending_id, "name": ending_name, "subtitle": decision.get("subtitle"),
            "type": ending_type, "careerAnchor": narrative.career_anchor,
            "futureSceneGuide": narrative.future_scene_guide,
            "primaryStat": rule.primary if rule else None,
            "secondaryStat": rule.secondary if rule else None,
        },
        "visibleStats": {key: stats[key] for key in _STATS},
        "hiddenHighlights": hidden_highlights(hidden),
        "playRecords": select_play_records(run_statistics, ending_id),
        "representativeChoices": representative_choices[:2],
        "generationRules": {"audience": "age_9_11", "locale": "ko-KR",
                            "answerFixedQuestion": False},
    }


def fallback_letter(context: dict) -> str:
    character = context["character"]["name"]
    ending = context["ending"]
    if ending["type"] == "FALLBACK":
        anchor = "아직 하나의 길에 자신을 묶기보다 여러 길을 직접 걸어 보며 새로운 가능성을 찾는 사람이란다."
    else:
        anchor = ending["careerAnchor"]
    return (
        f"{character}에게\n\n"
        "아르카디아에서 보낸 52주 동안 너는 여러 경험을 하며 너만의 길을 만들어 왔구나.\n"
        f"이번 이야기에서 이어진 미래는 「{ending['name']}」이야.\n"
        f"{anchor}\n\n"
        "한 해 동안 남긴 기록을 돌아보면 네가 직접 해 본 일들이 다음 길의 좋은 출발점이 되어 줄 거야.\n"
        "앞으로도 새로운 일을 만나면 네가 배운 방식으로 천천히 길을 만들어 가길 바랄게.\n\n"
        "— 아르카디아 아카데미"
    )


_BANNED = (
    "너는 원래", "성격이 나쁘", "책임감이 부족", "용기가 낮", "조건 미달", "조건을 만족하지 못",
    "능력이 부족", "꽝", "진로는 반드시", "운명", "네가 지킨 것은", "너가 지킨 것은", "무엇을 지켰니?",
)


def validate_letter(content: str, context: dict) -> str:
    if not isinstance(content, str):
        raise LetterValidationError("Letter output is not text")
    text = content.strip()
    if not 180 <= len(text) <= 1800:
        raise LetterValidationError("Letter length is outside the reviewed range")
    character_name = context["character"]["name"]
    ending_name = context["ending"]["name"]
    if character_name not in text or ending_name not in text or "아르카디아 아카데미" not in text:
        raise LetterValidationError("Letter is missing fixed identity content")
    if any(phrase in text for phrase in _BANNED):
        raise LetterValidationError("Letter contains a prohibited expression")
    if context["ending"]["type"] == "FALLBACK" and any(
        phrase in text for phrase in ("실패해서", "부족해서", "조건이 안", "조건을 못")
    ):
        raise LetterValidationError("Fallback ending was framed as failure")
    # Raw visible-stat numbers are internal judgment data and must not be surfaced.
    for value in set(context["visibleStats"].values()):
        if value >= 100 and str(value) in text:
            raise LetterValidationError("Letter exposes a raw visible-stat value")
    return text
