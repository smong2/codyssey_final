# Dialogue API · Engine 계약

이 문서는 LUMIA의 대화 콘텐츠를 FastAPI에서 게임 엔진으로 전달할 때의 **구현 계약**이다. 사람용 전체 설명과 예시는 [README](README.md)를 먼저 읽는다.

## 1. 설계 목표

- DB는 콘텐츠 관리와 무결성 검증에 유리한 정규화 구조를 유지한다.
- API는 엔진이 복잡한 그래프 탐색 없이 재생할 수 있는 순차 `sequence[]`를 반환한다.
- Main/NPC/Location Story가 하나의 DialoguePlayer를 공유한다.
- 엔진은 HTTP, Firebase, 스탯 보상 계산, 이벤트 발생 규칙을 직접 구현하지 않는다.
- 기존 엔진의 테스트용 하드코딩 대화 데이터는 운영 대화 API 연결 후 제거 가능하다.

## 2. Engine Service Adapter

엔진은 HTTP endpoint를 직접 호출하지 않고 기존 `globalThis.lumiaEngineServices` 경계를 사용한다.

필수 서비스:

```text
loadDialogue(input) -> DialoguePayload
completeDialogue(input) -> DialogueCompletionResult
```

권장 입력 의미:

```text
loadDialogue({slotId, eventId})
```

`eventId`는 서버가 이미 확정한 pending story event 또는 해당 주차의 Main Story ID다. 실제 URL, Firebase ID Token, HTTP 재시도, 오류 코드 변환은 adapter/provider가 담당한다.

완료 입력:

```text
completeDialogue({
  dialogueToken,
  completionMode,
  selectedChoices,
  requestId,
  expectedServerRevision
})
```

## 3. DialoguePayload

최소 필드:

```text
schemaVersion
dialogueId
storyId
eventId
title
dialogueToken
canSkip
speakers
sequence[]
```

`dialogueToken`은 현재 슬롯·회차·이벤트·마스터 버전과 연결된 서버 발급 불투명 토큰으로 취급한다. 엔진이 내용을 해석하거나 직접 조합하지 않는다.

### speakers

```text
kind: PLAYER | CHARACTER | NPC | NARRATOR
id
name
portraitSrc: string | null
```

API는 `ROLE:<roleId>`를 엔진에 그대로 넘기지 않는 것을 기본으로 한다. 서버가 현재 `activeRun.storyCast`로 실제 캐릭터를 해석해 최종 화자 정보를 전달한다.

### sequence 타입

#### LINE

```text
type = LINE
lineMode = DIALOGUE | NARRATION | THOUGHT | CONTEXT
speaker = speakers key      # DIALOGUE/THOUGHT에서 사용
text
visualMode = SPEAKER | KEEP | NONE
```

`lineMode` 생략 시 기존 호환 데이터에 한해 `DIALOGUE`로 볼 수 있지만 정식 데이터는 명시한다.

`lineMode` 의미:

- `DIALOGUE`: 실제 장면 속 화자의 발화. 일반적으로 `speaker` 필수.
- `NARRATION`: 현재 장면의 객관적 상황·행동·분위기 설명. `speaker` 없음.
- `THOUGHT`: 현재 플레이 캐릭터의 속마음. `speaker=PLAYER`, 플레이어 초상 없음.
- `CONTEXT`: 플레이어가 이미 알고 있는 과거·배경 사실. `speaker` 없음.

`visualMode` 생략 시 `DIALOGUE`는 `SPEAKER`, 나머지 lineMode는 `KEEP`을 기본으로 둘 수 있으나 콘텐츠에서 의도가 명확하지 않을 때는 명시하는 것을 권장한다.

#### IMAGE

```text
type = IMAGE
target = BACKGROUND | FOCUS
action = SHOW | REPLACE | HIDE
assetType = CHARACTER | ITEM | SCENE | EFFECT
src
alt
```

`HIDE`에서는 `src`를 생략할 수 있다.

모든 자원은 게임과 같은 서비스 영역에서 제공하므로 API는 엔진이 바로 접근 가능한 상대 공개 경로를 반환한다.

예:

```text
/world-assets/...
/character-assets/...
/design-assets/item/...
```

#### CHOICE

```text
type = CHOICE
choiceNodeId
prompt?
options[]
  choiceId
  text
  reaction[]
```

`reaction[]`은 짧은 대사 반응만 사용하며 끝나면 자동으로 `sequence[]`의 다음 항목으로 합류한다. 현재 본편 범위에서는 선택별 별도 장기 분기 그래프를 만들지 않는다.

#### END

```text
type = END
```

엔진은 `END` 도달 시 `COMPLETE` 완료 요청을 보낸다.

## 4. 중심 이미지 규칙

엔진은 하나의 `FOCUS` 슬롯만 관리하면 된다.

```text
LINE + visualMode=SPEAKER
→ 화자 portraitSrc 있음: FOCUS를 화자 이미지로 교체
→ portraitSrc 없음: FOCUS 비움

LINE + visualMode=KEEP
→ 현재 FOCUS 유지

LINE + visualMode=NONE
→ FOCUS 비움

IMAGE + target=FOCUS
→ 명시적 인물/아이템/사건 이미지 상태 변경
```

플레이어 초상은 표시하지 않는다. 여러 인물을 동시에 유지하는 다중 슬롯은 현재 요구사항이 아니다.

`NARRATION`, `THOUGHT`, `CONTEXT`는 별도 화자 초상을 요구하지 않는다. 단, `visualMode=KEEP`이면 직전 FOCUS 이미지를 유지하면서 설명/속마음을 표시할 수 있다.

## 5. 선택 결과 처리

대화 payload에 다음 정보를 넣지 않는다.

- growth
- hiddenDelta
- eventFlags 결과값
- rewardMultiplier
- unlock 결과

엔진은 `choiceNodeId + choiceId`만 기억한다.

정상 `COMPLETE` 요청을 받으면 서버가 해당 대화에서 실제 가능한 선택 조합인지 검증하고 Choice Effect/Event Effect를 계산한 뒤 한 번 저장한다.

선택 버튼에는 스탯 종류·증가량을 표시하지 않는다. Choice Effect의 정확한 값은 서버가 `story_choice_effects`에서 조회하며, 공통 규칙은 `document/content/02_STATS_EVENTS_ENDINGS/04_STORY_CHOICE_REWARDS.md`를 따른다.

## 6. 스킵

엔진은 `canSkip`만 보고 버튼을 표시한다.

관리자 서버 정책:

```text
AFTER_FIRST_ENDING
ALWAYS
NEVER
```

`AFTER_FIRST_ENDING`의 판정은 계정 전역의 첫 엔딩 완료 여부를 사용한다. 슬롯별 완료 여부로 판단하지 않는다.

스킵 시:

```text
completionMode = SKIP
```

- event/story progress는 정상 완료 상태로 이동
- 다시 발생하지 않음
- 해당 장면의 모든 선택 보상 0
- 스킵 이전 실제 선택은 기록 가능하지만 효과는 적용하지 않음
- 미도달 선택 노드는 서버가 `SKIPPED`로 계산

## 7. 완료 응답

엔진의 계산 공수를 줄이기 위해 완료 응답은 **서버가 확정한 최신 상태**를 반환하는 것을 기본으로 한다.

권장 의미:

```text
DialogueCompletionResult
├─ success
├─ completionMode
├─ serverRevision
├─ activeRun
└─ appliedSummary?
   └─ visibleStatDelta  # clamp 후 실제 적용된 이벤트 전체 Visible 증가 합계
```

엔진은 자신의 로컬 스탯에 `+2`, `+8` 등을 직접 더하지 않고 반환된 서버 상태를 신뢰 가능한 새 상태로 적용한다. 결과 UI에는 `appliedSummary.visibleStatDelta`만 사용하고, 선택별 상세 효과나 Hidden Stat delta는 표시하지 않는다. `visibleStatDelta`는 nominal reward가 아니라 `0~500` clamp 후 실제 저장값이 증가한 양이다. `SKIP`에서는 빈 객체 또는 모든 값 `0`으로 처리한다.

`requestId`는 네트워크 재시도 시 중복 효과 적용을 막는 멱등 키다.

## 8. 기존 엔진에서 유지/교체할 것

### 유지

- 이야기 pending 상태가 있으면 다음 일정 진행을 막는 흐름
- 이야기 완료 저장 성공 후 다음 일정으로 이동하는 흐름
- 금요일 이야기 완료 전 주차를 넘기지 않는 흐름
- 대화 중간 위치를 장기 저장하지 않는 정책
- 대화 기록 UI
- 저장 실패 시 다음 진행을 막고 재시도하는 안전장치
- 기존 `globalThis.lumiaEngineServices` adapter 패턴

### 교체 또는 제거 가능

- 하드코딩된 Main Story 테스트 프레임
- 하드코딩된 NPC/Location 장면 목록과 테스트 대사
- `content.lines / content.choices / content.closing` 전용 renderer
- 엔진 내부의 `growth / hiddenDelta / flags` 직접 적용
- Main/NPC/Location별 별도 대화 renderer

최종 목표는 공통 `DialoguePlayer` 하나다.

## 9. DialoguePlayer 의사 코드

```text
payload = await loadDialogue(...)
index = 0
selectedChoices = []

while sequence[index]:
  LINE   -> lineMode/화자/visualMode 처리 후 텍스트 표시
  IMAGE  -> BACKGROUND 또는 FOCUS 갱신
  CHOICE -> 버튼 표시
            선택 결과를 selectedChoices에 추가
            reaction 대사 재생
            index++
  END    -> completeDialogue(COMPLETE, selectedChoices)
            서버 activeRun 적용
            종료
```

스킵:

```text
if payload.canSkip:
  completeDialogue(SKIP, selectedChoices)
  서버 activeRun 적용
  종료
```

## 10. 구현 검증 기준

1. Main/NPC/Location이 같은 DialoguePlayer를 사용한다.
2. PLAYER 대사에서는 플레이어 초상이 표시되지 않는다.
3. CHARACTER/NPC 화자가 바뀌면 FOCUS 이미지가 한 명 기준으로 교체된다.
4. 이미지 없는 화자는 대사만 정상 표시된다.
5. `NARRATION`이 화자 없이 정상 표시된다.
6. `THOUGHT`가 플레이어 초상 없이 별도 표현으로 표시된다.
7. `CONTEXT`가 화자 없이 정상 표시된다.
8. ITEM 이미지 이후 `visualMode=KEEP` LINE에서 아이템이 유지된다.
9. 선택 reaction 이후 항상 다음 공통 sequence로 합류한다.
10. 대화 중간에는 스탯/스토리 결과를 확정 저장하지 않는다.
11. COMPLETE에서 서버 결과를 한 번만 적용한다.
12. SKIP에서 이벤트는 완료되지만 선택 효과가 적용되지 않는다.
13. 같은 `requestId` 재전송으로 결과가 중복 적용되지 않는다.
14. API/서비스 오류 시 다음 일정으로 진행하지 않는다.
15. 기존 테스트용 대화 데이터를 삭제해도 운영 API payload만으로 동일 UI 흐름이 실행된다.

