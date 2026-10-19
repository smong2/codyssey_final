# LUMIA 대화 시스템 안내

이 폴더는 Main Story, NPC Story, Location Story의 **대화 제작·DB 적재·API 전달·게임 엔진 재생 방식**을 팀원이 이해할 수 있도록 정리한다.

대화 원고의 사건·등장인물·선택 의미는 `story/`의 Production 문서를 따른다. 이 폴더는 그 원고를 어떤 공통 구조로 저장하고 게임에 전달할지를 설명한다.

## 1. 기본 방향

LUMIA의 대화는 세 종류의 스토리가 모두 같은 재생 구조를 사용한다.

```text
Main Story
NPC Story
Location Story
      ↓
같은 Dialogue API
      ↓
같은 DialoguePlayer
```

엔진 안에 Main/NPC/Location별 별도 대화 플레이어를 만들지 않는다.

대화의 기본 흐름은 다음과 같다. 실제 인물의 말뿐 아니라 장면 설명, 관찰, 주인공 속마음, 이미 알려진 배경 정보도 중간에 들어갈 수 있으며 모두 `LINE`으로 처리한다.

```text
장면 설명/대사/속마음
→ 필요하면 이미지 노출/교체
→ 대사/설명
→ 선택지
   ├─ 선택 A → 짧은 A 반응
   └─ 선택 B → 짧은 B 반응
→ 다시 같은 다음 대화로 합류
→ 필요하면 다시 이미지/대사/선택 반복
→ END
```

선택에 따라 스토리 전체가 서로 다른 트리로 갈라지지는 않는다. 선택은 **짧은 반응과 결과 기록**을 바꾸고 이후에는 같은 순서의 대화로 합류한다.

## 2. 저장과 실행 책임

### 콘텐츠 DB

대화 콘텐츠는 관리하기 좋은 정규화 구조로 저장한다.

- Story / Event / Step
- Dialogue Sequence
- Dialogue Node
- Dialogue Option
- Choice Effect
- Event Effect
- 동적 배역 `ROLE:<roleId>` 참조

DB 구조는 관리·검증을 위한 구조이며 게임 엔진이 DB 구조를 그대로 이해할 필요는 없다.

### FastAPI

FastAPI는 DB의 정규화 데이터를 읽고 현재 슬롯·회차의 정보를 적용해 **엔진이 바로 재생할 수 있는 순차 `sequence[]` 형태**로 변환한다.

서버가 담당하는 항목:

- 현재 플레이 캐릭터에 맞는 대화 원고 선택
- `ROLE:<roleId>`를 `activeRun.storyCast`의 실제 캐릭터로 해석
- 캐릭터 이름과 이미지 경로 해석
- 같은 서버 안의 자원 경로를 엔진용 상대 경로로 변환
- 관리자 대화 스킵 정책을 계산해 `canSkip`으로 전달
- 대화 완료 시 선택 유효성 검증
- 보이는/보이지 않는 스탯, 플래그, 스토리 진행 결과 계산
- Firestore 확정 저장

### 게임 엔진

엔진은 게임 규칙을 계산하지 않고 대화를 재생한다.

- `sequence[]`를 앞에서부터 순서대로 재생
- `LINE` 대사 표시
- `IMAGE` 이미지 표시·교체·숨김
- `CHOICE` 선택지 표시 및 선택한 `choiceId` 기억
- `END`에서 완료 서비스 호출
- 완료 응답의 최신 `activeRun`을 적용

엔진은 선택 보상 수치, 스토리 발생 확률, `storyCast` 후보 우선순위, Firestore 저장 규칙을 알 필요가 없다.

## 3. 엔진용 명령 4종

대화 API의 `sequence[]`는 아래 네 종류만 사용한다.

| 타입 | 역할 |
|---|---|
| `LINE` | 한 줄의 대사 또는 내레이션 |
| `IMAGE` | 배경 또는 화면 중심 이미지 노출·교체·숨김 |
| `CHOICE` | 2개 이상의 선택지와 선택 직후 짧은 반응 |
| `END` | 대화 정상 종료 |

복잡한 `nextNodeId` 그래프 탐색은 엔진에 전달하지 않는다. DB에서 필요하면 노드 참조를 사용하더라도 API가 순차 구조로 정리해서 전달한다.

### `LINE.lineMode`

`LINE`은 새 명령 타입을 늘리지 않고 표현 성격만 구분한다.

| `lineMode` | 용도 |
|---|---|
| `DIALOGUE` | 실제 인물 또는 장면 속 존재가 말하는 대사 |
| `NARRATION` | 현재 장면에서 관찰 가능한 상황·행동·분위기 설명 |
| `THOUGHT` | 현재 플레이 캐릭터의 속마음 |
| `CONTEXT` | 플레이어가 이미 알고 있는 과거·배경 사실 |

세부 집필 기준은 [대화 집필 가이드](02_DIALOGUE_WRITING_GUIDE.md)를 따른다. `NARRATION/CONTEXT`가 플레이어가 알아내야 할 사건의 정답을 먼저 설명하거나, `THOUGHT`가 특정 선택을 정답처럼 암시해서는 안 된다.

## 4. 이미지 노출 규칙

대화 화면에는 기본적으로 **한 개의 중심 이미지(focus visual)**만 사용한다.

### 문서에서 이미지 연결을 읽는 기준

각 `main/*.md`, `npc/*.md`, `location/*.md`의 `## 이미지`에는 **현재 저장소에 실제로 존재하고 대화 런타임에서 해석 가능한 파일만** 링크와 미리보기로 표시한다.

- 배경: `asset/background/<파일명>` → API `/world-assets/<파일명>`
- 학생·NPC 초상: `asset/character/<파일명>` → API `/character-assets/<파일명>`
- 채택된 FOCUS: `asset/item/<파일명>` → API `/item-assets/<파일명>`
- `ART-*`가 제작 ID만 있고 실제 파일이 없으면 **예약·미납**으로 표시하고 미리보기를 만들지 않는다.
- 비슷한 후보 이미지가 있어도 Production 설명과 정확히 일치하고 사용자 채택이 끝나기 전에는 `ART-*`에 연결하지 않는다.
- 현재 채택·API 연결이 끝난 FOCUS는 `ART-N01`, `ART-N06`, `ART-L01`이다. `ART-L02/L03`은 `LOC_GH_01`에서 미납 상태이므로 런타임이 해당 FOCUS를 숨겨 대화를 계속한다. 그 외 미납 FOCUS는 임의 대체하지 않는다.

현재 연결 상태의 단일 배포 대장은 [`backend/api/deploy/FOCUS_ASSET_LINKS.md`](../../backend/api/deploy/FOCUS_ASSET_LINKS.md), 장면별 제작 의도는 [`story/ASSET_DIALOGUE_LEDGER.md`](../../story/ASSET_DIALOGUE_LEDGER.md)를 따른다.

### 말하는 인물

- NPC/캐릭터가 말하고 `portraitSrc`가 있으면 해당 화자 이미지를 중심 이미지로 표시한다.
- 다른 인물이 말하면 기존 인물 이미지를 새 화자로 교체한다.
- 동시에 두 명 이상을 표시하는 것을 기본 기능으로 요구하지 않는다.
- 플레이어가 말할 때 플레이어 초상은 표시하지 않는다.
- 이미지가 없는 NPC 또는 텍스트 화자는 이름과 대사만 표시할 수 있다.

### 명시적 이미지

`IMAGE`는 인물뿐 아니라 아이템, 사건 그림, 장소 상태 이미지에도 사용할 수 있다.

- `BACKGROUND`: 화면 전체 배경
- `FOCUS`: 대화창 위의 단일 중심 이미지

`FOCUS`는 인물/아이템/사건 그림 중 무엇이든 될 수 있지만 동시에 한 장만 유지한다.

대사 노드의 `visualMode`는 다음처럼 사용한다.

- `SPEAKER`: 기본값. 화자 이미지가 있으면 표시하고 없으면 중심 이미지를 비운다.
- `KEEP`: 직전 `FOCUS` 이미지를 유지한다. 아이템을 보여 주면서 설명할 때 사용한다.
- `NONE`: 중심 이미지를 명시적으로 비운다.

## 5. 선택과 보상

선택지에는 안정적인 `choiceId`를 사용한다. 화면 문구는 캐릭터별로 달라도 같은 의미의 선택이라면 같은 `choiceId`를 사용할 수 있다.

API가 엔진에 보내는 대화에는 **스탯 증가량을 넣지 않는다.**

```text
엔진
→ 어떤 choiceId를 골랐는지만 기억

서버
→ choiceId 검증
→ Choice Effect 조회
→ 스탯/hidden stat/flag 계산
→ 장면 종료 시 한 번 저장
→ 저장 성공 후 실제 적용된 보이는 스탯 증가량만 스탯별 합산 결과로 반환
```

대사 한 줄마다 서버 저장하지 않는다.

선택 버튼에는 `지식 +2`, `공감 +8` 같은 보상 정보를 표시하지 않는다. Main/NPC/Location의 정확한 선택별 효과는 각 Production 문서를 원본으로 하고, 공통 공개·합산 규칙은 [Story 선택 스탯 보상·결과 공개 규칙](../content/02_STATS_EVENTS_ENDINGS/04_STORY_CHOICE_REWARDS.md)을 따른다.

이벤트별 77개 canonical `choiceId`를 한 번에 검수할 때는 [Dialogue 선택지별 스탯 효과 참조표](CHOICE_STAT_EFFECTS.md)를 사용한다. 캐릭터별 실제 선택 문구가 달라도 같은 `choiceId`의 스탯 효과는 동일하다.

완료 응답에서 결과 화면에 필요한 것은 **상한 clamp 이후 실제 적용된 Visible Stat delta의 이벤트 합계**다. Hidden Stat delta는 선택 결과 UI에 보내거나 표시하지 않는다. `completionMode=SKIP`은 기존 규칙대로 Visible/Hidden choice reward를 모두 `0`으로 처리한다.

## 6. 스킵 정책

운영 기본값은 **첫 엔딩을 한 번 본 계정부터 대화 스킵 가능**이다.

관리자 설정 `dialogueSkipMode`는 다음 세 값을 사용한다.

| 값 | 의미 |
|---|---|
| `AFTER_FIRST_ENDING` | 기본값. 계정의 첫 엔딩 완료 후 스킵 가능 |
| `ALWAYS` | QA/테스트용. 첫 플레이부터 스킵 가능 |
| `NEVER` | 전체 스킵 비활성화 |

엔진은 이 정책을 직접 계산하지 않는다. API 응답의 `canSkip: true/false`만 사용한다.

### 스킵 결과

`SKIP`으로 종료하면 해당 대화는 **완료한 것으로 인정**하고 다시 발생시키지 않는다.

하지만 보상은 없다.

- 보이는 스탯 효과 없음
- 보이지 않는 스탯 효과 없음
- 선택 효과 플래그 없음
- 이미 선택한 항목이 있어도 해당 장면의 선택 보상은 전부 적용하지 않음
- 스킵 전 실제 선택한 항목은 `SELECTED` 기록 가능
- 아직 도달하지 않은 선택 노드는 서버가 `SKIPPED`로 계산해 기록 가능

예:

```text
MS05 선택 노드 5개

S2 선택 완료
S3 선택 완료
S4 진입 전 SKIP

→ 장면 완료: SKIP
→ S2/S3: SELECTED
→ 남은 선택 노드: SKIPPED
→ 선택 보상 전체 0
```

## 7. 시나리오 제작 방식

각 스토리는 아래 순서로 제작한다.

현재 프로젝트의 실제 제작 작업 단위는 다음 순서를 고정해서 사용한다.

```text
1. Production 기준 공통 대화·나레이션·이미지·선택 시퀀스 작성
2. 사람 검수
3. CH01~CH32 Character Set 작성
   - 플레이어 Voice 변형
   - 선택 문구 변형
   - 선택 직후 상대방 반응 변형
   - 주인공/배역 충돌 시 대체 화자 반영
4. canonical choiceId / nodeId / assetRef 검산
5. SQLite v4 마스터 데이터 적재
6. 실제 DB 실행 검증
7. FastAPI payload / Engine 재생 검증
```

Main/NPC/Location Story 모두 이 순서를 사용한다. 공통 원고 승인 전에 32인 데이터를 먼저 만들거나 DB에 먼저 넣지 않는다.

1. `story/` Production 문서에서 사건, 화자 역할, 이미지 지시, 선택 의미를 확정한다.
2. [대화 집필 가이드](02_DIALOGUE_WRITING_GUIDE.md)에 따라 플레이 캐릭터별 Voice Guide, 실제 대사, 설명, 속마음, 선택 문구를 작성한다.
3. 안정적인 `choiceNodeId`, `choiceId`를 정한다.
4. DB에 Dialogue Sequence/Node/Option과 선택 효과를 적재한다.
5. API가 현재 회차의 캐스팅과 자원 경로를 해석해 `sequence[]`를 만든다.
6. 엔진의 공통 DialoguePlayer로 재생한다.
7. `END` 또는 허용된 `SKIP`에서 완료 요청을 한 번 보낸다.
8. 서버 저장 성공 후 다음 게임 흐름으로 진행한다.

Main Story, NPC Story, Location Story 모두 같은 방식으로 작성한다.

현재 Main Story의 사람 검수용 실제 대화 마스터는 [`main/README.md`](main/README.md)에서 관리한다. `MS01~MS06`의 사건·선택·이미지 전환을 실제 시퀀스로 풀어 썼으며, 승인 후 32인 플레이어 말투와 대체 `storyCast` 말투를 확장한 뒤 DB에 적재한다.

현재 Location Story의 공통 대화 마스터는 [`location/README.md`](location/README.md), 32인 실제 플레이어 대사·선택·reaction은 [`location/character_sets/README.md`](location/character_sets/README.md)에서 관리한다. `LOC_OBS_01~04 / LOC_GH_01 / LOC_LIB_01` 6장면에 대해 **CH01~CH32 / 192 choiceNode / 416 실제 선택 문구**를 작성·검산했다. 온실 `LOC_GREENHOUSE_STUDENT`는 CH12·CH19 protagonist에서 하젤, 나머지 30명에서 요한이다. `seed_location_story_master.py`가 이를 **192 sequence / 416 option / 3616 node**로 컴파일하며, **2026-10-18 사용자가 실제 SQLite seed 실행 결과 `validation: OK`를 확인했다.**

현재 NPC Story의 공통 대화 마스터는 [`npc/README.md`](npc/README.md), 32인 실제 플레이어 대사와 선택별 반응은 [`npc/character_sets/README.md`](npc/character_sets/README.md)에서 관리한다. `GUIDE / WORK / LULU` 각 4단계, 총 12장면을 실제 `LINE / IMAGE / CHOICE / END` 순서로 작성했고 **선택 화면 12개 / canonical choice 24개**를 Production과 동일하게 유지한다. CH01~CH32 모두 12개 choiceNode의 실제 문구를 가지므로 총 **384개 캐릭터별 선택 화면 / 768개 실제 선택 문구**가 작성되어 있다. GUIDE는 티아 기본·CH16 주인공 시 로빈 전체 대사 대체, WORK는 렌 기본·CH25 주인공 시 다나 전체 대사 대체, LULU는 고정 루루다. 현재는 **공통 원고 + 32인 Character Set 검수 승인 / SQLite v4 NPC seed 구현 완료 / 실제 DB 실행 검증 전**이다. 적재 계약은 `backend/database/NPC_STORY_DB_SPEC.md`를 따른다.

## 8. 전체 예시

아래 예시는 **구조 설명용 비정식 샘플**이며 실제 시나리오 원고가 아니다. 일반 대사, 장면 설명, 배경 정보, 주인공 속마음, 인물 이미지, 아이템 이미지, 이미지 없는 플레이어 대사, 선택지를 한 번에 보여 주기 위한 예시다.

```json
{
  "schemaVersion": 1,
  "dialogueId": "EXAMPLE_DIALOGUE_01",
  "storyId": "EXAMPLE",
  "eventId": "EXAMPLE_EVENT_01",
  "title": "대화 시스템 구조 예시",
  "dialogueToken": "opaque-example-token",
  "canSkip": true,
  "speakers": {
    "PLAYER": {
      "kind": "PLAYER",
      "id": "CH01",
      "name": "카엘",
      "portraitSrc": null
    },
    "GUIDE": {
      "kind": "CHARACTER",
      "id": "CH16",
      "name": "티아",
      "portraitSrc": "/character-assets/tia0_fullbody.png"
    }
  },
  "sequence": [
    {
      "type": "IMAGE",
      "target": "BACKGROUND",
      "action": "REPLACE",
      "assetType": "SCENE",
      "src": "/world-assets/BG02_clocktower_plaza_1920x1080_011.png",
      "alt": "시계탑 광장"
    },
    {
      "type": "LINE",
      "lineMode": "NARRATION",
      "visualMode": "NONE",
      "text": "시계탑 광장 한쪽에 작은 모임 안내지가 몇 장 흩어져 있다."
    },
    {
      "type": "LINE",
      "lineMode": "CONTEXT",
      "visualMode": "NONE",
      "text": "이 안내지는 광장에서 작은 모임을 알리기 위해 준비한 것이다."
    },
    {
      "type": "IMAGE",
      "target": "FOCUS",
      "action": "SHOW",
      "assetType": "CHARACTER",
      "src": "/character-assets/tia0_fullbody.png",
      "alt": "티아"
    },
    {
      "type": "LINE",
      "lineMode": "DIALOGUE",
      "speaker": "GUIDE",
      "visualMode": "KEEP",
      "text": "여기 있었구나. 보여 줄 게 하나 있어."
    },
    {
      "type": "LINE",
      "lineMode": "DIALOGUE",
      "speaker": "PLAYER",
      "visualMode": "NONE",
      "text": "뭔데?"
    },
    {
      "type": "LINE",
      "lineMode": "THOUGHT",
      "speaker": "PLAYER",
      "visualMode": "NONE",
      "text": "티아도 평소보다 조금 조심스러운 것 같다."
    },
    {
      "type": "IMAGE",
      "target": "FOCUS",
      "action": "REPLACE",
      "assetType": "ITEM",
      "src": "/item-assets/IT_focus_NPC_GUIDE_01_meeting_notices_01.png",
      "alt": "바람에 흩어진 모임 안내지"
    },
    {
      "type": "LINE",
      "lineMode": "DIALOGUE",
      "speaker": "GUIDE",
      "visualMode": "KEEP",
      "text": "바람에 날린 안내지야. 몇 장이 아직 광장에 흩어져 있어."
    },
    {
      "type": "CHOICE",
      "choiceNodeId": "EXAMPLE_C01",
      "prompt": "어떻게 반응할까?",
      "options": [
        {
          "choiceId": "EXAMPLE_C01_LOOK",
          "text": "조금 더 자세히 살펴볼게.",
          "reaction": [
            {
              "lineMode": "DIALOGUE",
              "speaker": "GUIDE",
              "text": "좋아. 서두르지 말고 천천히 봐."
            }
          ]
        },
        {
          "choiceId": "EXAMPLE_C01_ASK",
          "text": "어디에서 찾았는지 먼저 알려줘.",
          "reaction": [
            {
              "lineMode": "DIALOGUE",
              "speaker": "GUIDE",
              "text": "시계탑 아래쪽이야. 지나가다가 반짝이는 게 보여서 주웠어."
            }
          ]
        }
      ]
    },
    {
      "type": "LINE",
      "lineMode": "DIALOGUE",
      "speaker": "GUIDE",
      "visualMode": "SPEAKER",
      "text": "어느 쪽이든 선생님께 한번 보여 드리는 게 좋겠다."
    },
    {
      "type": "LINE",
      "lineMode": "DIALOGUE",
      "speaker": "PLAYER",
      "visualMode": "NONE",
      "text": "응. 같이 가자."
    },
    {
      "type": "END"
    }
  ]
}
```

이 예시에서 엔진이 해야 하는 일은 단순하다.

```text
BACKGROUND 이미지 교체
→ 장면 설명(NARRATION)
→ 이미 알려진 배경 사실(CONTEXT)
→ 티아 이미지 표시
→ 티아 대사
→ 플레이어 대사에서 중심 이미지 숨김
→ 플레이어 속마음(THOUGHT)
→ 룬 조각 이미지 표시
→ 이미지 유지 상태로 설명 대사
→ 선택 버튼 표시
→ 선택 직후 reaction 표시
→ 티아 이미지로 복귀
→ 플레이어 대사에서는 이미지 없음
→ END
```

선택 결과의 실제 스탯 값은 이 JSON에 존재하지 않는다.

## 9. 완료 요청의 의미

정상 완료 예:

```json
{
  "dialogueToken": "opaque-example-token",
  "completionMode": "COMPLETE",
  "selectedChoices": [
    {
      "choiceNodeId": "EXAMPLE_C01",
      "choiceId": "EXAMPLE_C01_LOOK"
    }
  ],
  "requestId": "client-generated-id",
  "expectedServerRevision": "revision-before-dialogue"
}
```

스킵 완료 예:

```json
{
  "dialogueToken": "opaque-example-token",
  "completionMode": "SKIP",
  "selectedChoices": [],
  "requestId": "client-generated-id",
  "expectedServerRevision": "revision-before-dialogue"
}
```

`SKIP`에서는 서버가 아직 도달하지 않은 선택 노드를 계산하며 선택 보상은 전부 적용하지 않는다.

## 10. 관련 문서

- [이벤트 대화 시퀀스 계약](../content/13_DIALOGUE_SEQUENCE.md)
- [엔진·API 구현 계약](01_ENGINE_API_CONTRACT.md)
- [대화 집필 가이드](02_DIALOGUE_WRITING_GUIDE.md)
- [Main Story 대화 마스터](main/README.md)
- `story/main/MAIN_STORY_PRODUCTION.md`
- `story/npc/NPC_STORY_PRODUCTION.md`
- `story/location/LOCATION_STORY_PRODUCTION.md`
- `backend/database/sqlite/SCHEMA.md`
- `engine/DATA_HANDOFF.md`

