# Location Story DB 스키마·적재 명세

이 문서는 현재 본편 Location Story 6장면을 SQLite 마스터와 Firestore 회차 상태에 어떻게 저장할지 정의한다.

기준 문서 우선순위:

1. `story/location/LOCATION_STORY_PRODUCTION.md` — 활성 6장면, 선택 ID, 효과, 이미지
2. `document/content/02_STATS_EVENTS_ENDINGS/02_EVENTS.md` — 최신 공통 이벤트 발생/제한 규칙
3. `document/dialogue/location/` — 실제 LINE / IMAGE / CHOICE / END 원고
4. `backend/database/sqlite/004_story_event_rules.sql` — 물리 이벤트 정책 스키마
5. 본 문서 — Location Story DB 매핑과 적재/검증 절차

> `story/location/장소기반_규칙.md`에 과거 고정 확률 `20%→100%` 규칙이 남아 있었으나 현재 DB는 이를 사용하지 않는다. 최신 공통 이벤트 정책은 고정 퍼센트 없이 **조건을 통과한 현재 장소의 미확인 Location Story를 우선 후보로 선정**하는 방식이다.

---

## 1. 범위

현재 DB에 등록할 Location Story는 정확히 6개다.

| storyId = eventId | 장소 | earliestWeek | 선택 수 |
|---|---|---:|---:|
| `LOC_OBS_01` | OBS 별빛 천문대 | 3 | 2 |
| `LOC_OBS_02` | OBS 별빛 천문대 | 22 | 2 |
| `LOC_OBS_03` | OBS 별빛 천문대 | 33 | 2 |
| `LOC_OBS_04` | OBS 별빛 천문대 | 46 | 3 |
| `LOC_GH_01` | GH 유리 온실·약초원 | 7 | 2 |
| `LOC_LIB_01` | LIB 대서고 | 13 | 2 |

기존 기간 분배 기준 `1/15, 2/12, 3/26, 5/28, 8/13, 11/12`를 최초 후보 주차 `3, 7, 13, 22, 33, 46`으로 사용한다. 천문대의 실제 순서는 이 시작 주차와 선행 완료 condition을 함께 만족해야 한다.

제외된 `LOC_GH_02`, `LOC_LIB_02`, `LOC_WRK_01~02`, `LOC_TRN_01~02`, `LOC_CLK_01~02`, `LOC_DRM_01~02`는 `story_event_rules.is_active=1` 행을 만들지 않는다.

---

## 2. 식별자 원칙

Production이 이미 `LOC_OBS_01` 같은 값을 Location Story 고유 ID로 사용하므로 새로운 `LOC_OBS` 체인 ID를 만들지 않는다.

```text
story_id = event_id = LOC_OBS_01
story_id = event_id = LOC_OBS_02
...
```

천문대의 1→2→3→4 순서는 별도 chain ID가 아니라 `story_event_conditions`의 `PREVIOUS_EVENT_COMPLETE`로 표현한다.

```text
LOC_OBS_02 requires LOC_OBS_01 COMPLETE
LOC_OBS_03 requires LOC_OBS_02 COMPLETE
LOC_OBS_04 requires LOC_OBS_03 COMPLETE
```

이 방식은 API `storyId/eventId`, 기존 Production ID, 선택/효과 ID를 모두 같은 canonical 이름 공간에 유지한다.

---

## 3. 논리 스키마

```text
Location
└─ LocationStory
   ├─ StoryEventRule
   ├─ StoryEventCondition[]
   ├─ StoryChoice[]
   │  └─ StoryChoiceEffect[]
   ├─ StoryEventEffect[]
   └─ DialogueSequence[characterId]
      ├─ DialogueNode[]
      └─ DialogueOption[]

StoryRole
├─ StoryRoleCandidate[]
└─ StoryRoleExclusion[]

DialogueSpeaker
```

Location Story도 Main/NPC와 동일한 대화 테이블을 사용한다. `location_dialogues` 같은 전용 테이블을 추가하지 않는다.

---

## 4. SQLite 물리 스키마

### 4.1 기존 v3 재사용

다음 테이블은 그대로 사용한다.

| 테이블 | Location 용도 |
|---|---|
| `locations` | OBS/GH/LIB 장소 표시·배경 |
| `stories` | 활성 Location Story 6개 |
| `story_events` | 실제 장면 이벤트 6개 |
| `story_steps` | 각 Story의 step 1, earliestWeek |
| `story_choices` | canonical choice 13개 |
| `story_choice_effects` | 선택 스탯/플래그 효과 |
| `story_event_effects` | 정상 완료/스킵 시 StoryProgress 완료 |
| `dialogue_speakers` | 세린 같은 비플레이어 화자 |
| `story_roles` | `LOC_GREENHOUSE_STUDENT` |
| `story_role_candidates` | 온실 학생 후보 8명 |
| `dialogue_sequences` | 32인 세트 확정 후 6×32 시퀀스 |
| `dialogue_nodes` | LINE / IMAGE / CHOICE / END |
| `dialogue_options` | 캐릭터별 선택 문구/분기 반응 |

### 4.2 v4 신규 테이블

`004_story_event_rules.sql`이 다음 3개 테이블과 역할 정책 컬럼을 추가한다.

#### `story_event_rules`

| 필드 | Location 값 | 의미 |
|---|---|---|
| `event_id` | `LOC_*` | canonical 이벤트 ID |
| `trigger_phase` | `AFTER_ACTIVITY` | SQLite v4 호환 분류값. 서버 런타임에서 Location은 활동 시작 체크포인트 직후·플레이 화면 직전에 평가 |
| `selection_policy` | `UNSEEN_FIRST` | 현재 장소에서 아직 완료하지 않은 이벤트 우선 |
| `repeat_policy` | `ONCE_PER_RUN` | 같은 회차 재발생 금지 |
| `requires_location_match` | `1` | 현재 방문 장소와 `stories.location_id` 일치 필요 |
| `limit_group` | `SIDE_STORY` | NPC+Location 공통 주간/일일 제한 그룹 |
| `cooldown_weeks` | `0` | 별도 콘텐츠별 쿨다운 없음 |
| `is_active` | `1` | 활성 6장면만 1 |

`SIDE_STORY`의 현재 서버 공통 제한:

- NPC + Location 합계 주당 최대 2회
- Location 자체 주당 최대 1회
- 결과를 가지는 Story 하루 최대 1회
- Main Story는 이 제한에 포함하지 않음

이 숫자는 이벤트마다 중복 저장하지 않고 서버 정책이 `limit_group`을 기준으로 적용한다.

#### `story_event_conditions`

`story_steps.earliest_week`, 장소 일치, step 1만으로 표현할 수 없는 추가 조건을 저장한다.

현재 Location에서 필요한 행은 천문대 선행 3개뿐이다.

| eventId | conditionType | subjectRef | operator | value |
|---|---|---|---|---|
| `LOC_OBS_02` | `PREVIOUS_EVENT_COMPLETE` | `LOC_OBS_01` | `EQ` | `true` |
| `LOC_OBS_03` | `PREVIOUS_EVENT_COMPLETE` | `LOC_OBS_02` | `EQ` | `true` |
| `LOC_OBS_04` | `PREVIOUS_EVENT_COMPLETE` | `LOC_OBS_03` | `EQ` | `true` |

향후 NPC Story에서는 같은 테이블에 `NPC_ENCOUNTER_GTE`, `STORY_STATUS`, `EVENT_FLAG`, `ACTIVITY_TYPE` 등을 사용할 수 있다.

#### `story_role_exclusions`

동적 배역 간 **절대 같은 캐릭터가 되면 안 되는 관계**를 저장한다.

현재 행:

```text
LOC_GREENHOUSE_STUDENT != MAIN_GREENHOUSE_STUDENT
```

### 4.3 `story_roles.prior_assignment_policy`

v4에서 다음 정책을 추가한다.

- `ALLOW`: 앞서 배정된 캐릭터 재사용 허용
- `PREFER_DISTINCT`: 가능하면 앞선 역할과 다른 캐릭터, 없으면 hard exclusion을 지키면서 재사용 가능
- `REQUIRE_DISTINCT`: 앞선 동적 역할과 반드시 다른 캐릭터

현재:

```text
Main 7개 동적 역할 = REQUIRE_DISTINCT
LOC_GREENHOUSE_STUDENT = PREFER_DISTINCT
```

`LOC_GREENHOUSE_STUDENT`는 `assignment_order=8`이다. 후보는:

```text
CH19 요한
→ CH20 하젤
→ CH10 엘리아
→ CH28 실비아
→ CH12 리네
→ CH27 미엘
→ CH02 세라
→ CH09 에녹
```

선정 순서:

1. 현재 주인공 제외
2. `story_role_exclusions`의 `MAIN_GREENHOUSE_STUDENT` 제외
3. 가능하면 assignment_order 1~7에서 이미 사용한 학생 제외
4. 첫 사용 가능한 후보 확정
5. 3번 조건 때문에 후보가 없으면, 1·2번은 계속 지킨 채 앞선 다른 Main 역할과의 중복만 fallback 허용

---

## 5. 장소 마스터

`seed_location_story_master.py`가 아래 3개 `locations` 행을 upsert한다.

| locationId | displayName | backgroundAssetRef |
|---|---|---|
| `OBS` | 별빛 천문대 | `BG05_starlight_observatory_1920x1080_015.png` |
| `GH` | 유리 온실·약초원 | `BG06_glass_greenhouse_1920x1080_016.png` |
| `LIB` | 대서고 | `BG04_grand_library_1920x1080_014.png` |

---

## 6. 화자 마스터

### 세린

`LOC_LIB_01`용 텍스트 화자:

```text
speaker_id = SERIN
display_name = 세린
speaker_type = TEXT_ONLY
portrait_asset_ref = NULL
```

엔진 payload에서는 `portraitSrc=null`인 NPC로 컴파일한다.

### 온실 학생

DB 대사 노드에는 다음을 저장한다.

```text
speaker_ref = ROLE:LOC_GREENHOUSE_STUDENT
```

FastAPI가 현재 `activeRun.storyCast.LOC_GREENHOUSE_STUDENT`를 실제 `CHARACTER:CHxx`로 해석한다.

---

## 7. 선택·효과

canonical choice는 총 **13개**다.

모든 Location 일반 선택의 기본값:

```text
VISIBLE_STAT +1
Primary HIDDEN_STAT +5
필요한 choiceNode만 Secondary HIDDEN_STAT +2
```

따라서 기본 선택 효과는 `13 × 2 = 26행`이며, 현재 제작안에는 Secondary Hidden **10행**이 추가된다. 같은 choiceNode 안에서는 Hidden 총량을 동일하게 유지한다.

`LOC_OBS_04`의 세 표식은 완료 기록을 남겨야 하므로 선택별 `EVENT_FLAG` 1행을 추가한다.

```text
LOC_OBS_04_STAR    → location.obs.mark = "STAR"
LOC_OBS_04_MOON    → location.obs.mark = "MOON"
LOC_OBS_04_SPARKLE → location.obs.mark = "SPARKLE"
```

`LOC_OBS_04` 표식 `EVENT_FLAG` 3행까지 포함한 최종 `story_choice_effects` 예상 행 수는 **39행**이다.

`completionMode=SKIP`에서는 choice effect 전체를 적용하지 않으므로 표식도 기록하지 않는다. Story 완료 자체는 `story_event_effects`로 처리한다.

---

## 8. Story 완료 효과

6개 이벤트 각각 `story_event_effects`에 한 행을 둔다.

```text
effectType = STORY_PROGRESS
applyOn = COMPLETE_OR_SKIP
target = <storyId>
value = {"step":1,"status":"COMPLETED"}
```

따라서 대화 스킵이 허용된 회차에서도 해당 Location Story는 다시 발생하지 않는다. 단, 선택 보상과 `LOC_OBS_04` 표식은 0이다.

---

## 9. Firestore 회차 상태

마스터 데이터는 SQLite/서버 콘텐츠 DB에 있고, 실제 플레이 상태는 Firestore `activeRun`에 저장한다.

### `storyProgress`

Location은 현재 canonical Story ID별로 관리한다.

```json
{
  "LOC_OBS_01": {"step":1,"status":"COMPLETED","lastAdvancedWeek":3},
  "LOC_OBS_02": {"step":1,"status":"NOT_STARTED","lastAdvancedWeek":null},
  "LOC_GH_01": {"step":1,"status":"COMPLETED","lastAdvancedWeek":9}
}
```

Location 진행도는 **회차 단위 `activeRun` 데이터**다. 새 회차에서는 초기화한다. 계정 영구 해금 데이터로 승격하지 않는다.

### `pendingStoryEvent`

활동 시작 체크포인트 저장 후 Location 이벤트가 선정되었지만 아직 `END/SKIP` 완료 저장 전인 상태를 보존한다. NPC Story는 기존처럼 활동 결과 저장 후 선정한다.

```json
{
  "storyId": "LOC_GH_01",
  "eventId": "LOC_GH_01",
  "storyType": "LOCATION",
  "sourceLocationId": "GH",
  "selectedWeek": 9,
  "selectedDay": "WED"
}
```

목적:

- 이야기 실행 전/중 앱 종료 후 같은 pending Story 재개
- 같은 활동 결과에서 이벤트를 다시 뽑아 중복 발생시키지 않음
- 이야기 완료 저장 성공 전 다음 일정 진행 차단

### `storyEventWindow`

NPC/Location 공통 주간·일일 제한을 위한 최소 회차 상태:

```json
{
  "week": 9,
  "sideStoryCount": 1,
  "locationStoryCount": 1,
  "lastResultStoryDay": "WED"
}
```

- `sideStoryCount`: 해당 주의 NPC + Location Story 완료/스킵 수
- `locationStoryCount`: 해당 주의 Location Story 완료/스킵 수, 최대 1
- `lastResultStoryDay`: 결과를 가진 Story가 마지막으로 완료된 게임 내 요일
- 새 주가 시작되면 `week`를 갱신하고 카운터를 초기화

이 값은 후보 선정 제어용이며 친밀도나 점수가 아니다.

---

## 10. 서버 후보 판정

현재 Location Story 후보 판정은 고정 확률을 사용하지 않는다.

```text
활동 시작 체크포인트 저장 성공
→ pendingStoryEvent 있으면 새 후보 판정 금지
→ storyEventWindow 주간/일일 제한 + Location 주 1회 제한 확인
→ 방금 활동 장소와 stories.location_id가 같은 활성 Location Story 조회
→ earliestWeek 이하인지 확인
→ PREVIOUS_EVENT_COMPLETE 등 conditions 확인
→ 이미 COMPLETED인 storyProgress 제외
→ 아직 보지 않은 eligible Location Story 우선
→ event 선정 및 pendingStoryEvent 저장
→ DialoguePayload 로드
→ END/SKIP 저장 성공 후 phase를 ACTIVITY_IN_PROGRESS로 복귀
→ 원래 미니게임/모험/특수 활동 화면 시작
```

천문대에서는 선행 조건 때문에 항상 다음 한 장면만 eligible이 된다.

Main 강제 스토리 방문에서는 Location 후보 판정을 하지 않는다.

---

## 11. 32인 대화 데이터 최종 구조

Location 공통 원고와 CH01~CH32 Character Set은 작성 및 수량 검산이 완료됐고, `seed_location_story_master.py`가 이 둘을 병합해 실제 `dialogue_sequences/nodes/options`로 적재한다. **2026-10-18 사용자가 개발용 SQLite 파일에 seed를 실제 실행해 정상 결과를 확인했다.**

현재 Character Set 검산값과 실제 DB 적재 기준 수:

```text
6 events × 32 characters = 192 dialogue_sequences
6 choice nodes × 32 characters = 192 CHOICE nodes
13 choice options × 32 characters = 416 dialogue_options
```

실제 `dialogue_nodes` 총 행 수는 **3616개**다.

원칙:

- 공통 NARRATION/IMAGE는 그대로 복제 가능
- PLAYER DIALOGUE/THOUGHT/선택 문구는 캐릭터 Voice 적용
- 온실 branch reaction은 실제 `LOC_GREENHOUSE_STUDENT` 성격/대체 캐스팅 반영
- 세린 대사는 세린 고정 Voice 유지
- canonical `choiceId`는 32명 모두 동일
- 현재 온실 reaction 검산: `CH12/CH19 → 하젤` 4 option reaction, 나머지 30명 → 요한 60 option reaction

공통 대사만 32번 임시 복제해 출시 데이터로 사용하지 않는다.

---

## 12. 현재 seed 단계

### 구현·실행 검증 완료

`seed_location_story_master.py`는 다음을 한 트랜잭션에서 적재한다.

- 장소 3개
- Location Story 6개
- event/step 6개
- event rule 6개
- 천문대 선행 조건 3개
- canonical choice 13개
- choice effect 39개
- event completion effect 6개
- 세린 speaker 1개
- `LOC_GREENHOUSE_STUDENT` 역할 1개
- 역할 후보 8개
- Main 온실 학생과 hard exclusion 1개
- Location `dialogue_sequences` 192개
- Location `dialogue_options` 416개
- Location `dialogue_nodes` 3616개

대화 적재 시 공통 master 100개 노드를 32명분으로 컴파일한 3200개 노드에 선택별 reaction 416개를 추가한다. 각 캐릭터는 6개 sequence / 6개 CHOICE / 13개 option을 가져야 하며, signature override와 branch reaction이 Character Set 원문과 일치하는지 seed 내부에서 검증한다.

---

## 13. 마이그레이션·적재 명령

기존 Main DB 파일을 그대로 사용한다.

```bash
cd /Users/mongpark/codyssey/final_rumia

python3 backend/database/sqlite/seed_location_story_master.py \
  --migrate \
  --version dev-dialogue-v1
```

기본 DB:

```text
backend/database/sqlite/lumia-content.sqlite3
```

`--migrate`가 기존 v3 DB에 `004_story_event_rules.sql`을 적용해 `PRAGMA user_version = 4`로 올린다.

---

## 14. 검증값

2026-10-18 사용자가 실제 seed 실행에서 다음 핵심 값을 정상 확인했다.

```text
schema user_version: 4
Location stories: 6
Location events: 6
Location canonical choices: 13
Location choice effects: 39
Location dialogue sequences: 192
Location dialogue options: 416
validation: OK
```

seed 내부 검증은 Location `dialogue_nodes=3616`, `CHOICE nodes=192`, canonical 참조, ROLE/NPC 참조, FK, graph reachability를 검사하며 오류가 있으면 `validation: OK`까지 도달하지 않는다. 별도 SQL 파일로 같은 값을 다시 점검할 수도 있다.

직접 SQL 확인:

```bash
sqlite3 backend/database/sqlite/lumia-content.sqlite3 "
PRAGMA user_version;
SELECT COUNT(*) FROM stories WHERE story_type='LOCATION';
SELECT COUNT(*) FROM story_event_rules WHERE event_id LIKE 'LOC_%' AND is_active=1;
SELECT COUNT(*) FROM story_choices WHERE event_id LIKE 'LOC_%';
SELECT COUNT(*) FROM story_choice_effects WHERE event_id LIKE 'LOC_%';
SELECT COUNT(*) FROM dialogue_sequences WHERE story_id LIKE 'LOC_%';
SELECT COUNT(*) FROM dialogue_options WHERE story_id LIKE 'LOC_%';
"
```

현재 단계 예상값:

```text
4
6
6
13
39
192
416
```

같은 검증을 파일로 실행하려면 다음을 사용한다.

```bash
sqlite3 backend/database/sqlite/lumia-content.sqlite3 \
  < backend/database/sqlite/validate_location_story.sql
```

현재 `validate_location_story.sql`은 개발 버전 `dev-dialogue-v1`을 기준으로 작성되어 있다. gameDataVersion을 바꾸면 검증 SQL의 version literal도 함께 바꾼다.

---

## 15. 완료 상태 구분

현재 작업이 끝나면 다음 상태다.

- **Location DB 논리 스키마:** 완료
- **Location DB 물리 스키마 v4:** 완료
- **Location 마스터/선택/효과 seed 코드:** 구현 완료
- **32인 대화 원고:** 작성·수량 검산 완료 / 사람 검수 단계
- **Location dialogue_sequences/nodes/options seed 코드:** 구현 완료 (`192 / 3616 / 416` 검증 포함)
- **실제 로컬 SQLite 적재·검증:** **완료 — 2026-10-18 사용자 실행 결과 정상 확인**
- **FastAPI 후보 선정/Dialogue API 구현:** 미완료
- **Firestore 트랜잭션 구현:** 미완료
