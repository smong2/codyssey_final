# 이벤트 대화 시퀀스 계약

이 문서는 Main Story, NPC Story, Location Story에서 사용하는 **사전 작성 캐릭터별 대화의 콘텐츠·DB 계약**을 정의한다. 엔진이 실제로 받는 DTO와 재생 규칙은 [대화 시스템 안내](../dialogue/README.md)와 [Dialogue API · Engine 계약](../dialogue/01_ENGINE_API_CONTRACT.md)을 우선한다.

실제 사건·등장인물·이미지 사용 지시는 `story/main/`, `story/npc/`, `story/location/`의 Production 문서가 원본이다. 이 문서는 원고의 내용을 새로 만들지 않고, 작성된 원고를 어떻게 안정적으로 식별·저장·전달할지 정한다.

## 1. 대화 제작 범위

1. 서버가 기존 이벤트 발생 규칙으로 Main/NPC/Location 이벤트와 스토리 진행 단계를 결정한다.
2. `(gameDataVersion, storyId, stepNo, eventId, playerCharacterId)`에 맞는 사전 작성 대화 시퀀스 한 편을 선택한다.
3. Main/Location Story는 각 단계마다 플레이 캐릭터 32명 각각의 실제 대사 원고를 준비한다.
4. NPC Story도 참여 가능한 캐릭터마다 시퀀스를 준비한다. 대상 NPC와 플레이 캐릭터가 같은 경우 기존 자기 조우 제외 규칙을 적용한다.
5. 32개 변형 원고는 런타임 생성 문장이 아니라 출시 전에 작성·검수하는 콘텐츠다.
6. 원고가 없는 캐릭터/이벤트 조합을 임의의 공통 대사로 채우지 않는다.

스토리의 사건과 결말은 공통으로 유지하되, 플레이 캐릭터의 말투·질문·관심사·상대 반응은 캐릭터별로 달라질 수 있다.

## 2. 회차 단위 동적 배역 `storyCast`

Main/Location Story의 일부 학생 역할은 특정 캐릭터를 하드코딩하지 않고 주인공 선택 직후 회차 단위로 확정한 `activeRun.storyCast`를 사용한다.

```text
주인공 선택
→ 역할 후보 목록에서 playerCharacterId 제외
→ 이미 사용 중인 핵심 역할 캐릭터 제외
→ 첫 사용 가능 학생 확정
→ activeRun.storyCast 저장
→ 회차 종료까지 같은 배역 유지
```

주요 역할:

- `MAIN_GUIDE_STUDENT`
- `MAIN_GREENHOUSE_STUDENT`
- `MAIN_GREENHOUSE_TRAPPED`
- `MAIN_CLOCK_STUDENT`
- `MAIN_TRAINING_STUDENT`
- `MAIN_TRAINING_WITNESS`
- `MAIN_FESTIVAL_LEAD`
- `LOC_GREENHOUSE_STUDENT`

`MAIN_TEACHER`는 발렌티누스로 고정한다. 잠긴 캐릭터도 조력 NPC로 등장할 수 있으며 주인공 해금 여부와 NPC 출연 가능 여부는 분리한다.

DB 원고에서는 동적 배역 화자를 `ROLE:<roleId>`로 저장할 수 있다. 예: `ROLE:MAIN_GREENHOUSE_STUDENT`.

**엔진에는 `ROLE:` 값을 그대로 넘기지 않는 것을 기본으로 한다.** FastAPI가 현재 `activeRun.storyCast`로 실제 캐릭터를 해석한 뒤 `characterId / name / portraitSrc`를 포함한 최종 화자 정보로 변환한다.

## 3. 모든 Story가 공유하는 대화 구조

Main/NPC/Location Story는 모두 같은 논리 구조를 사용한다.

```text
LINE
→ 필요하면 IMAGE
→ LINE
→ CHOICE
   ├─ 선택 A → 짧은 A 반응 ─┐
   └─ 선택 B → 짧은 B 반응 ─┤
                              ↓
                       같은 다음 흐름
→ 필요하면 다시 LINE / IMAGE / CHOICE 반복
→ END
```

선택에 따라 전체 스토리가 장기적으로 별도 트리로 갈라지지 않는다. 각 선택은 짧은 반응 뒤 같은 다음 대화로 합류한다.

### LINE 표현 모드

장면 안에는 실제 인물 대사뿐 아니라 제3자 설명, 관찰 가능한 상황, 플레이어 속마음, 이미 알려진 배경 정보가 들어갈 수 있다. 엔진 명령은 새로 늘리지 않고 `LINE.lineMode`로 구분한다.

- `DIALOGUE`: 실제 화자의 발화
- `NARRATION`: 현재 장면에서 관찰 가능한 상황·행동·분위기
- `THOUGHT`: 플레이 캐릭터의 속마음
- `CONTEXT`: 플레이어가 이미 알고 있는 과거·배경 사실

`NARRATION/CONTEXT`는 사건의 원인이나 해법을 플레이어보다 먼저 확정하지 않는다. `THOUGHT`도 특정 선택을 정답처럼 알려 주는 시스템 힌트로 사용하지 않는다. 세부 작법은 `document/dialogue/02_DIALOGUE_WRITING_GUIDE.md`를 따른다.

### 선택 규칙

- 각 제작 대상 대화에는 Production 원고가 지정한 선택 수를 유지한다.
- 선택 노드는 최소 2개 이상의 보기를 가진다.
- 선택 직후 상대 반응을 최소 한 줄 둔다.
- 이후 공통 대화는 어느 선택을 골라도 모순되지 않게 작성한다.
- 선택에 정답/오답으로 인한 진행 불능을 만들지 않는다.
- 후속 대사에서 반드시 과거 선택을 구분해야 할 때만 서버의 `eventFlags` 또는 중요 선택 기록을 사용한다.

## 4. 안정 식별자

다음 식별자는 마스터 데이터 버전 안에서 안정적으로 유지한다.

- `storyId`
- `eventId`
- `stepNo`
- `characterId`
- `nodeId`
- `choiceNodeId`
- `choiceId`

`choiceId`는 화면 문구가 아니라 **선택 의미의 안정 ID**다. 같은 의미를 캐릭터마다 다른 말투로 표현하더라도 같은 `choiceId`를 사용할 수 있다.

## 5. DB 저장 구조

현재 SQLite 스키마의 핵심 대화 테이블은 다음과 같다. 이 표는 **대화 마스터의 논리·관리 구조**를 설명한다. 운영 FastAPI는 플레이어 브라우저의 로컬 SQLite를 직접 읽을 수 없으므로, API 원본은 FastAPI가 접근 가능한 서버 측 콘텐츠 저장소에 있어야 한다. 구현에서 SQLite를 채택한다면 이 구조를 서버용 content SQLite에 사용할 수 있고, 브라우저 SQLite가 남는 경우에는 캐시/사본으로만 취급한다.

| 테이블 | 역할 |
|---|---|
| `dialogue_sequences` | 스토리 단계·이벤트·플레이 캐릭터별 대화 한 편 |
| `dialogue_nodes` | LINE / IMAGE / CHOICE / END의 DB 노드. LINE은 `DIALOGUE / NARRATION / THOUGHT / CONTEXT` 표현 모드 지원 |
| `dialogue_options` | 선택 노드별 선택 문구와 선택 직후 반응 진입점 |
| `story_choices` | 이벤트 수준의 안정 `choiceId`와 의미 |

대화 결과 규칙은 대화 문구와 분리한다. 구현 시 다음 의미의 서버 마스터가 필요하다.

```text
story_choice_effects
- eventId
- choiceId
- effectType
- target
- value

story_event_effects
- eventId
- 공통 완료 결과
```

정확한 물리 테이블 형태는 백엔드 DB 구현 시 확정할 수 있지만 다음 원칙은 고정한다.

- 대화 문구와 보상 규칙을 같은 JSON 문자열 안에 섞지 않는다.
- 엔진에 보상 수치를 전달하지 않는다.
- 선택 결과는 서버가 `choiceId`로 조회·검증한다.

## 6. DB 구조와 Engine DTO는 같지 않다

DB는 정규화된 node graph 형태를 사용할 수 있지만, 엔진에는 이 구조를 그대로 노출하지 않는다.

```text
DB
Dialogue Sequence / Node / Option
        ↓
FastAPI 변환
        ↓
Engine DialoguePayload
sequence[] = LINE / IMAGE / CHOICE / END
```

FastAPI는 DB의 노드 연결을 검증하고 현재 캐릭터·배역·자원 경로를 해석한 뒤 순차 배열로 컴파일한다.

엔진은 `nextNodeId`, `responseNodeId`, 그래프 순환 검사를 구현하지 않는다.

## 7. 이미지 계약

이미지 사용 여부와 어떤 자원을 쓰는지는 Production 원고가 정한다.

대화 시스템은 두 개의 표시 대상을 지원한다.

- `BACKGROUND`: 전체 배경
- `FOCUS`: 대화창 위 중심 이미지 한 장

`FOCUS`에는 인물, 아이템, 사건 그림을 공통으로 사용할 수 있다.

기본 규칙:

- 캐릭터/NPC가 말하고 이미지가 있으면 그 화자 한 명만 표시
- 다른 화자가 말하면 교체
- 플레이어 초상은 표시하지 않음
- 전용 이미지가 없는 화자는 텍스트만 표시
- 아이템 등 명시적 이미지는 `IMAGE target=FOCUS`로 표시
- 설명 중 같은 이미지를 유지해야 하면 `LINE.visualMode=KEEP`
- 여러 캐릭터 동시 노출은 현재 필수 기능이 아님

실제 자원은 같은 서버에서 제공한다. DB는 안정적인 asset ref를 저장하고 FastAPI가 엔진에서 바로 쓸 수 있는 상대 `src`로 변환하는 것을 기본으로 한다.

## 8. 재생·저장 경계

```text
이벤트 발생/선정 (서버)
→ 대화 payload 조회
→ 엔진이 sequence[] 로컬 재생
→ 선택한 choiceId만 메모리에서 수집
→ END 또는 허용된 SKIP
→ completeDialogue 1회
→ 서버가 선택/스킵 검증
→ 효과 + storyProgress + flags 계산
→ Firestore 안정 저장
→ 최신 activeRun 반환
→ 다음 게임 흐름
```

대사 한 줄, 이미지 전환, 선택 화면 중간을 Firestore 체크포인트로 저장하지 않는다.

중간 종료 후에는 대화 결과가 확정되지 않는다. 재접속 시 서버가 보존한 마지막 안정 상태에서 같은 pending story를 다시 시작할 수 있어야 한다.

## 9. 정상 완료와 스킵

### 정상 완료 `COMPLETE`

- 실제 선택한 `choiceNodeId + choiceId` 목록을 서버로 전송
- 서버가 해당 대화에서 가능한 선택인지 검증
- 선택별 효과와 이벤트 공통 효과를 한 번 적용
- Story/Event 완료 저장

### 스킵 `SKIP`

스킵 가능 여부는 엔진이 계산하지 않고 API의 `canSkip`을 따른다.

서버 관리자 정책:

- `AFTER_FIRST_ENDING` — 운영 기본값. 계정 전역 첫 엔딩 이후 가능
- `ALWAYS` — QA/테스트용
- `NEVER` — 전체 비활성화

SKIP 결과:

- Story/Event는 완료 처리하고 다시 발생시키지 않는다.
- 해당 장면의 선택 효과는 **전부 적용하지 않는다.**
- 스킵 전에 실제 선택한 항목은 기록할 수 있지만 효과는 0이다.
- 도달하지 않은 선택 노드는 서버가 `SKIPPED`로 계산할 수 있다.
- 보이는 스탯/숨은 스탯/선택 플래그 보상은 없다.

## 10. Engine Service 경계

엔진은 실제 HTTP URL이나 Firebase 인증 로직을 대화 UI 안에 직접 넣지 않는다.

기존 `globalThis.lumiaEngineServices` 패턴을 사용한다.

```text
loadDialogue({slotId,eventId})
completeDialogue({dialogueToken,completionMode,selectedChoices,requestId,expectedServerRevision})
```

provider/adapter가 HTTP, 인증 토큰, 오류 변환, 재시도를 담당한다.

`completeDialogue` 성공 응답은 서버가 확정한 최신 `activeRun`을 반환하는 것을 기본으로 한다. 엔진은 로컬 스탯을 직접 더하지 않고 서버 결과로 갱신한다.

## 11. 콘텐츠 적재 전 검수

새 마스터 버전을 활성화하기 전에 최소 다음을 검사한다.

1. Main/Location 각 단계에 플레이 캐릭터 32명분 시퀀스가 존재한다.
2. NPC Story는 자기 조우 제외 규칙을 반영한 모든 참여 캐릭터 시퀀스를 가진다.
3. 모든 노드/옵션 참조가 같은 시퀀스 안에서 유효하다.
4. 모든 선택 노드가 2개 이상의 옵션을 가진다.
5. 모든 선택 reaction이 이후 공통 흐름으로 정상 합류한다.
6. 모든 경로가 END에 도달한다.
7. `choiceId`가 `story_choices`와 일치한다.
8. 이미지가 Production 원고와 실제 자원에 일치한다.
9. `ROLE:<roleId>`가 모든 주인공 조합에서 유효한 실제 캐릭터로 해석된다.
10. 엔진용 컴파일 결과가 `LINE / IMAGE / CHOICE / END` 순차 payload로 유효하다.
11. 정상 COMPLETE와 중간 SKIP 모두 서버 검증을 통과하며 중복 적용되지 않는다.
12. 모든 LINE이 의도에 맞는 `lineMode`를 가지며 NARRATION/CONTEXT/THOUGHT가 사건의 정답을 선행 설명하지 않는다.

## 12. 구현 상태 구분

이 문서는 **확정된 설계 계약**이다.

현재 엔진의 테스트용 Main/NPC/Location 대화 데이터와 `lines / choices / closing` 전용 DTO는 이 계약의 최종 구현이 아니다. 실제 DialoguePlayer 및 API provider 구현, Choice/Event Effect 물리 스키마, `LINE.lineMode`를 저장하기 위한 실제 DB 컬럼/마이그레이션, 실제 32인 대화 적재는 별도 구현 작업이다.
