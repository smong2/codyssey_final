"""Minimal server-only Gemini GenerateContent client for Phase 9."""

from __future__ import annotations

import json
import socket
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


class GeminiGenerationError(RuntimeError):
    pass


SYSTEM_INSTRUCTION = """당신은 9~11세 어린이를 위한 판타지 게임 LUMIA의 엔딩 편지를 작성한다.
게임 시스템이 이미 확정한 직업을 절대 바꾸지 않는다. 입력 JSON에 있는 사실만 사용한다.
실제 성격·심리·진로를 진단하거나 다른 사람과 비교하지 않는다.
'무엇을 지켰니?'의 정답을 대신 말하지 않는다. 숨은 스탯이나 보이는 스탯의 숫자를 노출하지 않는다.
플레이 기록의 숫자 목록은 UI가 따로 표시하므로 편지에서 목록으로 반복하지 않는다.
존재하지 않은 사건·관계·선택을 만들지 않는다. representativeChoices가 비어 있으면 특정 선택을 꾸며내지 않는다.
직업의 careerAnchor와 futureSceneGuide 범위 안에서 따뜻하고 구체적인 미래의 첫걸음과 응원을 쓴다.
본문은 한국어로 쓴다."""

TASK_PROMPT = """확정된 직업을 그대로 유지하면서 이번 52주 플레이의 실제 기록을 회고하는 엔딩 편지를 작성한다.
중요 선택 요약이 입력에 있을 때만 그 사실을 자연스럽게 연결하고, futureSceneGuide의 범위를 넘지 않는 미래 첫걸음과 응원을 담는다.
플레이 기록의 라벨과 숫자는 UI가 별도로 표시하므로 편지 안에서 목록처럼 반복하지 않는다."""

OUTPUT_CONTRACT = {
    "format": {"content": "string"},
    "requirements": [
        "수신인 캐릭터 이름으로 시작",
        "확정 직업명 포함",
        "실제 기록에 근거한 성장 회고 포함",
        "대표 선택이 입력된 경우에만 선택 회고 포함",
        "futureSceneGuide 범위의 미래 모습과 응원 포함",
        "마지막 줄은 — 아르카디아 아카데미",
        "허위 기록·진단·비교·raw stat 숫자·무엇을 지켰니?의 정답 규정 금지",
    ],
}


class GeminiEndingLetterGenerator:
    def __init__(self, *, api_key: str | None, model: str, thinking_level: str,
                 timeout_seconds: float = 12.0) -> None:
        self.api_key = api_key
        self.model = model
        self.thinking_level = thinking_level
        self.timeout_seconds = timeout_seconds

    def generate(self, context: dict) -> str:
        if not self.api_key:
            raise GeminiGenerationError("Gemini is not configured")
        body = {
            "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
            "contents": [{"role": "user", "parts": [
                {"text": "[Task Prompt]\n" + TASK_PROMPT},
                {"text": "[Task Context]\n" + json.dumps(
                    context, ensure_ascii=False, sort_keys=True, separators=(",", ":")
                )},
                {"text": "[Output Contract]\n" + json.dumps(
                    OUTPUT_CONTRACT, ensure_ascii=False, sort_keys=True, separators=(",", ":")
                )},
            ]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "thinkingConfig": {"thinkingLevel": self.thinking_level},
            },
            "store": False,
        }
        request = Request(
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{quote(self.model, safe='-._')}:generateContent",
            data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": self.api_key},
            method="POST",
        )
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
            candidates = payload.get("candidates")
            parts = candidates[0]["content"]["parts"] if isinstance(candidates, list) and candidates else []
            text = next((part.get("text") for part in parts if isinstance(part, dict) and part.get("text")), None)
            if not isinstance(text, str):
                raise GeminiGenerationError("Gemini returned no letter")
            parsed = json.loads(text)
            content = parsed.get("content") if isinstance(parsed, dict) else None
            if not isinstance(content, str):
                raise GeminiGenerationError("Gemini returned an invalid letter object")
            return content
        except GeminiGenerationError:
            raise
        except (HTTPError, URLError, TimeoutError, socket.timeout, json.JSONDecodeError, KeyError, TypeError, UnicodeError):
            raise GeminiGenerationError("Gemini generation failed") from None
