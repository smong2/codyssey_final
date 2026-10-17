# LUMIA 대화 시스템 — 엔진 AI 인계

이 문서는 엔진 개발 AI가 Main/NPC/Location Story의 정식 대화 API를 연결할 때 읽는 **구현 요약**이다.

작업 전 반드시 다음 원문을 함께 읽는다.

1. `document/dialogue/README.md` — 사람용 전체 정책과 예시
2. `document/dialogue/01_ENGINE_API_CONTRACT.md` — 엔진/API 계약
3. `document/dialogue/02_DIALOGUE_WRITING_GUIDE.md` — lineMode와 실제 대사/설명 작성 기준
4. `document/content/13_DIALOGUE_SEQUENCE.md` — 콘텐츠 제작·DB 규칙
5. `engine/DATA_HANDOFF.md` — 현재 엔진 adapter 경계
6. `engine/src/ui/narrative.mjs`, `engine/src/core/narrative.mjs`, `engine/src/core/main-story.mjs`, `engine/src/preview-main.mjs` — 실제 구현 상태

## 확정된 설계

```text
정규화된 대화 콘텐츠 DB
→ FastAPI
→ 엔진용 순차 DialoguePayload(sequence[])
→ 공통 DialoguePlayer
→ END/SKIP에서 completeDialogue 1회
→ 서버가 결과 검증·Firestore 저장
→ 최신 activeRun 반환
```

### API payload 명령은 4종만 사용

- `LINE`
- `IMAGE`
- `CHOICE`
- `END`

엔진에 DB용 node graph를 그대로 전달하지 않는다. `nextNodeId`, `responseNodeId` 탐색기를 새로 만들지 않는다.

`LINE` 안에서는 다음 `lineMode`를 지원한다.

```text
DIALOGUE  = 실제 화자 대사
NARRATION = 장면/행동/관찰 설명
THOUGHT   = 현재 플레이 캐릭터 속마음
CONTEXT   = 이미 알려진 과거·배경 정보
```

따라서 제3자 설명 때문에 `NARRATION` 같은 새로운 sequence type을 만들지 않는다. `NARRATION/CONTEXT`는 화자 없이 표시할 수 있고, `THOUGHT`는 `PLAYER`와 연결하되 플레이어 초상은 표시하지 않는다.

### 모든 Story가 같은 player 사용

Main Story, NPC Story, Location Story를 서로 다른 renderer로 만들지 않는다. 기존 `createNarrativeUI`를 범용 DialoguePlayer로 확장하거나 대체하고 `renderMainStory`도 같은 player를 사용하도록 연결한다.

### 선택 분기

모든 현재 대화 선택은:

```text
선택
→ 선택별 짧은 reaction
→ 같은 다음 sequence로 합류
```

장기 분기 트리 없음.

### 이미지

화면의 중심 이미지 슬롯은 하나만 요구한다.

- NPC/캐릭터 화자가 말할 때 해당 화자 이미지 1명
- 플레이어 초상 없음
- 이미지 없는 화자는 텍스트만
- `IMAGE target=FOCUS`는 인물/아이템/사건 그림 공통 사용
- `IMAGE target=BACKGROUND`는 배경 교체
- `LINE.visualMode`: `SPEAKER`(기본) / `KEEP` / `NONE`

모든 자원은 같은 서비스 영역에서 제공되므로 엔진은 API가 준 `src`를 그대로 사용한다. 자원 ID→파일명 해석을 엔진에 중복 구현하지 않는다.

### Engine Service Adapter

엔진 내부에서 직접 `fetch()`와 Firebase 인증을 만들지 않는다.

기존 `globalThis.lumiaEngineServices`에 다음 provider를 사용한다.

```text
loadDialogue({slotId,eventId})
completeDialogue({dialogueToken,completionMode,selectedChoices,requestId,expectedServerRevision})
```

HTTP URL, ID Token, timeout, retry, 서버 오류 코드는 provider/adapter가 처리한다.

### 엔진이 계산하면 안 되는 것

- Main +2/+8, NPC/Location +1/+3 등의 선택 보상
- hidden stat 변화
- story/event flag 결과
- unlock
- storyCast 역할 배정
- 이벤트 발생 조건/가중치
- 스킵 가능 여부

완료 응답의 서버 `activeRun`을 적용한다.

## 스킵

엔진은 payload의 `canSkip`만 본다.

서버 정책은 `AFTER_FIRST_ENDING / ALWAYS / NEVER`이며 운영 기본값은 `AFTER_FIRST_ENDING`, QA 시 `ALWAYS` 사용 가능이다.

`SKIP` 완료는:

- 스토리 완료 인정
- 다시 발생하지 않음
- 장면 전체 선택 보상 0
- 스킵 전 선택은 기록 가능하나 효과 0
- 미도달 선택은 서버가 `SKIPPED`로 계산

## 기존 엔진 테스트 콘텐츠 처리

사용자 결정에 따라 현재 엔진에 하드코딩된 Main/NPC/Location 테스트용 대화 콘텐츠는 정식 API 연결 시 삭제해도 된다.

삭제 대상과 유지 대상을 구분한다.

### 삭제/교체 대상

- `MAIN_STORIES.stages[].dialogue = null` 기반 미등록 테스트 프레임
- `NARRATIVE_SCENES`의 오래된 Location 16개 하드코딩 콘텐츠 목록
- `PLACE_LINES`, `storyContent()`의 테스트 대사·선택
- `content.lines / choices / closing` 전용 정식 계약
- `finishNarrative()`의 클라이언트 스탯/hidden stat 직접 적용 책임

### 유지할 기능

- pending story 동안 다음 일정 차단
- 완료 저장 뒤 일정 재개
- 금요일 Story 완료 전 주차 전환 차단
- 저장 실패 재시도
- 대화 중간 위치를 확정 저장하지 않는 경계
- 대화 기록 UI
- `lumiaEngineServices` adapter 구조

## 완료 조건

엔진 변경을 완료했다고 판단하려면 최소 다음이 검증돼야 한다.

1. 일반 LINE 진행
2. 화자 이미지 교체
3. 이미지 없는 화자
4. PLAYER 대사에서 플레이어 이미지 없음
5. ITEM/SCENE FOCUS 이미지 노출과 KEEP
6. BACKGROUND 교체
7. 선택지와 reaction 뒤 공통 흐름
8. 한 대화 안의 선택 여러 번
9. 정상 END 완료
10. `canSkip=true`에서 중간 SKIP
11. SKIP 후 보상 미적용 상태 수신
12. API 실패/저장 실패 시 다음 게임 진행 차단
13. 동일 requestId 재시도 중복 방지
14. Main/NPC/Location 세 종류가 같은 DialoguePlayer에서 재생
15. DIALOGUE/NARRATION/THOUGHT/CONTEXT 네 lineMode가 같은 LINE renderer에서 의도한 UI 차이로 표시

구현 과정에서 이 문서보다 구체적인 DTO 필드가 필요하면 `document/dialogue/01_ENGINE_API_CONTRACT.md`를 우선한다. 스토리 문구·배역·이미지 사용 여부는 각 `story/*_PRODUCTION.md`를 우선한다.

