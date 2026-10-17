# NPC Story DB 스키마·적재 명세

> 상태: **SQLite v4 적재 코드 구현 완료 / 실제 로컬 DB 실행 검증 전**  
> 원고: `document/dialogue/npc/` + `document/dialogue/npc/character_sets/`  
> Production: `story/npc/NPC_STORY_PRODUCTION.md`

## 1. 목적

본편 NPC Story `GUIDE / WORK / LULU` 3개 체인, 총 12장면과 CH01~CH32 실제 대사를 기존 공통 Dialogue SQLite v4 스키마에 적재한다.

별도 NPC 전용 대화 테이블이나 신규 migration은 만들지 않는다.

```text
stories / story_events / story_steps
+ story_event_rules / story_event_conditions
+ story_choices / story_choice_effects / story_event_effects
+ story_roles / story_role_candidates / dialogue_speakers
+ dialogue_sequences / dialogue_nodes / dialogue_options
```

DB는 Git 원고를 컴파일한 읽기용 사본이며, 선택 보상·스토리 진행·발생 조건의 권위 있는 적용은 FastAPI가 다시 검증한다.

---

## 2. Story / Event 구조

| Story ID | 역할 | 장소 | 단계 |
|---|---|---|---:|
| `NPC_GUIDE` | 안내 준비를 함께하는 친구 | `CLK` | 4 |
| `NPC_WORK` | 공방의 작은 물건을 살피는 친구 | `WRK` | 4 |
| `NPC_LULU` | 루루의 작은 발견 | `GH` | 4 |

### `NPC_GUIDE`

| step | eventId | earliestWeek |
|---:|---|---:|
| 1 | `NPC_GUIDE_01` | 4 |
| 2 | `NPC_GUIDE_02` | 15 |
| 3 | `NPC_GUIDE_03` | 29 |
| 4 | `NPC_GUIDE_04` | 41 |

### `NPC_WORK`

| step | eventId | earliestWeek |
|---:|---|---:|
| 1 | `NPC_WORK_01` | 8 |
| 2 | `NPC_WORK_02` | 20 |
| 3 | `NPC_WORK_03` | 32 |
| 4 | `NPC_WORK_04` | 44 |

### `NPC_LULU`

| step | eventId | earliestWeek |
|---:|---|---:|
| 1 | `NPC_LULU_01` | 12 |
| 2 | `NPC_LULU_02` | 25 |
| 3 | `NPC_LULU_03` | 35 |
| 4 | `NPC_LULU_04` | 48 |

`story_steps.availability_rule_ref`는 현재 세 체인 모두 `NPC_WEIGHTED_CHAIN_V1`을 사용한다.

---

## 3. 발생 정책

12개 이벤트 모두 아래 공통 `story_event_rules`를 사용한다.

```text
trigger_phase = AFTER_ACTIVITY
selection_policy = WEIGHTED
repeat_policy = ONCE_PER_RUN
requires_location_match = 1
limit_group = SIDE_STORY
cooldown_weeks = 0
is_active = 1
```

주당 NPC+Location Story 최대 2회, 결과 Story 하루 최대 1회 같은 가변 제한은 SQLite에 카운터로 저장하지 않고 `activeRun.storyEventWindow`와 서버 규칙이 처리한다.

### 추가 조건

1단계:

```text
NPC_ENCOUNTER_GTE >= 1
```

즉 같은 체인의 상대 NPC를 일반 조우로 최소 1회 만난 뒤 시작할 수 있다.

2~4단계:

```text
PREVIOUS_EVENT_COMPLETE = true
```

WORK 1~4단계는 추가로:

```text
ACTIVITY_TYPE = CLASS
```

을 요구한다. Story 자체의 `location_id=WRK`와 결합해 현재 본편의 `마도 공방 + 마법훈련` 조건을 표현한다. 현재 `WRK`의 본편 수업은 마법훈련 `룬 회로` 한 종류이므로 별도 미니게임 ID 조건을 추가하지 않는다.

예상 `story_event_conditions` 총수는 **16행**이다.

- 1단계 선행 일반 조우: 3
- 2~4단계 이전 이벤트 완료: 9
- WORK CLASS 조건: 4

---

## 4. NPC actor 역할

NPC Story의 플레이 가능 학생 상대역은 `story_roles`를 사용한다.

| roleId | assignmentOrder | 후보 순서 | 규칙 |
|---|---:|---|---|
| `NPC_GUIDE_ACTOR` | 9 | `CH16 티아 → CH15 로빈` | 현재 주인공 제외 |
| `NPC_WORK_ACTOR` | 10 | `CH25 렌 → CH26 다나` | 현재 주인공 제외 |

두 역할은 `resolver_type=STORY_CAST`, `exclude_player=1`, `prior_assignment_policy=ALLOW`다.

따라서:

```text
주인공 != CH16 → NPC_GUIDE_ACTOR = CH16
주인공 == CH16 → NPC_GUIDE_ACTOR = CH15

주인공 != CH25 → NPC_WORK_ACTOR = CH25
주인공 == CH25 → NPC_WORK_ACTOR = CH26
```

NPC 역할은 Main 핵심 역할과 같은 학생을 동시에 사용할 수 있다. 이 체인의 목적은 `주인공 자신과 상대역이 겹치지 않는 것`이며 Main Story의 7개 핵심 학생처럼 전체 배역 간 절대 고유성을 요구하지 않는다.

CH16/CH25의 대체 배우는 선택 reaction만 바꾸는 것이 아니라 `ACTOR_SUBSTITUTIONS.md`의 4장면 고정 상대 대사까지 DB 컴파일 시 교체한다. DB의 `speaker_ref`는 안정적인 `ROLE:NPC_GUIDE_ACTOR` / `ROLE:NPC_WORK_ACTOR`를 유지한다.

루루는 플레이 캐릭터가 아니므로:

```text
dialogue_speakers.speaker_id = LULU
speaker_type = CREATURE
portrait_asset_ref = NULL
```

로 저장한다. 최종 초상 파일 채택은 자산 적용 단계에서 별도 확정한다.

---

## 5. 선택·효과

12장면은 각각 2지선다 1회다.

```text
12 events × 2 canonical choices = 24 story_choices
24 choices × (Visible + Primary Hidden) = 48 base effects
Secondary Hidden = 16 effects
최종 = 64 story_choice_effects
```

모든 NPC Story 일반 선택은 Production 기준:

```text
보이는 성장 스탯 +1
Primary Hidden +5
필요한 choiceNode만 Secondary Hidden +2
```

를 사용한다. 같은 choiceNode의 두 선택은 Hidden 총량을 동일하게 유지하며, Primary/Secondary는 서로 다른 Hidden Stat을 사용한다.

선택 보상 값은 `story_choice_effects`에만 저장하고 `dialogue_options`나 엔진 Dialogue payload에 중복 저장하지 않는다.

`NPC_WORK_02`의 두 선택은 모두 합리적인 관찰 방식이다.

- `WORK_02_TWO_GROOVES`
- `WORK_02_COMPARE`

어느 쪽도 정답/오답 상태나 실패 효과를 만들지 않는다.

### 이벤트 공통 효과

각 이벤트는 `COMPLETE_OR_SKIP`의 `STORY_PROGRESS` 효과 1개를 가진다.

```text
step 1~3 → {step: N, status: IN_PROGRESS}
step 4   → {step: 4, status: COMPLETED}
```

따라서 허용된 SKIP으로 끝내도 체인 진행은 막히지 않지만 선택 스탯 보상은 적용하지 않는다.

---

## 6. 32인 Dialogue 적재

공통 시퀀스는 `document/dialogue/npc/NPC_*.md`, 플레이 캐릭터별 override는 `document/dialogue/npc/character_sets/SET_*.md`에서 읽는다.

DB 컴파일 규칙:

```text
공통 node 순서
+ 캐릭터별 Signature PLAYER override
+ 캐릭터별 실제 choice_text
+ 캐릭터별 branch reaction
+ CH16/CH25 actor 전체 대사 substitution
= 최종 dialogue sequence
```

모든 주인공이 12개 NPC Story를 플레이할 수 있으므로, 상대 actor 충돌은 대체 캐릭터로 해결하고 주인공 시퀀스를 제거하지 않는다.

예상값:

```text
32 characters × 12 events = 384 dialogue_sequences
32 characters × 24 choices = 768 dialogue_options
```

각 선택 reaction은 별도 `LINE` 노드로 컴파일된 뒤 바로 공통 merge node로 합류한다.

---

## 7. Seed 구현

적재기:

```text
backend/database/sqlite/seed_npc_story.py
```

기본 DB:

```text
backend/database/sqlite/lumia-content.sqlite3
```

Main seed가 먼저 `game_data_versions`와 32개 `characters`를 만든 상태여야 한다.

기존 Main DB에 NPC Story를 추가:

```bash
python3 backend/database/sqlite/seed_npc_story.py \
  --migrate \
  --version dev-dialogue-v1
```

전체 개발 DB를 처음부터 만들 때 권장 순서:

```bash
python3 backend/database/sqlite/seed_dialogue_content.py \
  --migrate \
  --version dev-dialogue-v1

python3 backend/database/sqlite/seed_npc_story.py \
  --migrate \
  --version dev-dialogue-v1

python3 backend/database/sqlite/seed_location_story_master.py \
  --migrate \
  --version dev-dialogue-v1
```

전체 마스터 구성이 끝나기 전에는 Main seed의 `--activate`를 생략한다.

NPC seed는 같은 3개 NPC Story를 삭제 후 재생성하므로 동일 `gameDataVersion`에 다시 실행할 수 있다. Main/Location 및 사용자 로컬 UID 캐시 행은 삭제하지 않는다.

---

## 8. 예상 검증값

성공 시 다음 값이어야 한다.

| 항목 | 예상 |
|---|---:|
| SQLite `user_version` | 4 |
| NPC stories | 3 |
| NPC events / steps | 12 / 12 |
| NPC event rules | 12 |
| NPC event conditions | 16 |
| NPC roles / role candidates | 2 / 4 |
| LULU speaker | 1 |
| canonical choices | 24 |
| choice effects | 64 |
| event effects | 12 |
| dialogue sequences | 384 |
| dialogue options | 768 |
| protagonist별 NPC sequence | 12 |
| protagonist별 NPC options | 24 |

검증 SQL:

```bash
sqlite3 backend/database/sqlite/lumia-content.sqlite3 \
  < backend/database/sqlite/validate_npc_story.sql
```

추가로 seed 내부 검증은 다음을 실패 처리한다.

- 32인 Character Set 누락
- canonical choiceId 누락/추가
- CH16 로빈 / CH25 다나 전체 actor override 누락
- 선택 reaction 누락
- ROLE/NPC 화자 미해결
- 그래프 cycle / orphan / next node 누락
- protagonist별 12 sequence / 24 option 불일치
- FK 오류

---

## 9. 구현 상태 경계

현재 저장소 상태:

- NPC Story 공통 원고: **작성 완료**
- CH01~CH32 실제 선택 문구/reaction: **작성 완료**
- CH16 로빈 / CH25 다나 전체 대체 actor 대사: **작성 완료**
- SQLite v4 NPC master + 32인 dialogue seed: **구현 완료**
- 검증 SQL: **작성 완료**
- 실제 `lumia-content.sqlite3`에 seed 실행: **미검증**
- FastAPI 발생 판정/Dialogue compiler/complete transaction: **미구현 또는 별도 구현 범위**
- Phaser 공통 DialoguePlayer 연동: **별도 구현 범위**

따라서 이 문서만으로 런타임 전체를 완료했다고 판단하지 않는다.
