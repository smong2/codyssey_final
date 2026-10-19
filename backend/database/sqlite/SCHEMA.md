# LUMIA 콘텐츠/로컬 SQLite 스키마 v4

이 문서는 [001_initial.sql](001_initial.sql), [002_dialogue_sequences.sql](002_dialogue_sequences.sql), [003_dialogue_runtime_content.sql](003_dialogue_runtime_content.sql), [004_story_event_rules.sql](004_story_event_rules.sql)에 실제로 생성되는 테이블·컬럼·제약을 설명한다. 저장 위치와 Firestore와의 권한 경계는 [STORAGE_DESIGN.md](../STORAGE_DESIGN.md), 중앙 사용자 문서의 상세 구조는 [SCHEMA.md](../SCHEMA.md)를 따른다. SQL이 실행 기준이며, 이 문서는 그 의미를 설명한다.

## 범위와 공통 규칙

- 빈 SQLite DB에는 `001 → 002 → 003 → 004` 순서로 적용한다. 적용 후 `PRAGMA user_version = 4`다.
- 개발용 SQLite 파일의 기본 경로는 저장소 기준 **`backend/database/sqlite/lumia-content.sqlite3`**다. `seed_dialogue_content.py`에서 `--db`를 생략하면 이 경로에 파일을 생성/갱신한다. 생성 DB와 WAL/SHM 파일은 Git 추적 대상이 아니다.
- v4는 총 **29개 테이블**이다. 25개는 배포 버전별 읽기용 게임/대화/이벤트 마스터, 4개는 UID별 로컬 캐시·임시 상태·전송 대기 데이터다.
- `003`은 Main/NPC/Location 공통 대화 표현 필드, 비플레이어 화자, 동적 역할 후보, 선택 효과, 이벤트 공통 효과를 추가한다.
- `004`는 Main/NPC/Location 공통 발생 정책·추가 조건·동적 배역 hard exclusion을 추가한다. 이벤트별 가변 카운터를 마스터 DB에 저장하지 않고 서버가 `limit_group`과 Firestore 회차 상태를 함께 사용한다.
- Main Story 마스터 행은 [seed_dialogue_content.py](seed_dialogue_content.py), NPC Story 마스터·규칙·32인 대화 행은 [seed_npc_story.py](seed_npc_story.py), Location Story 마스터·규칙·32인 대화 행은 [seed_location_story_master.py](seed_location_story_master.py)가 검수된 Markdown에서 생성한다. Location seed는 공통 6개 master와 CH01~CH32 Character Set을 병합해 같은 `dialogue_*` 테이블에 **192 sequence / 416 option / 3616 node**를 생성하도록 구현돼 있다.
- 마스터의 `version`은 `game_data_versions.version`을 참조한다. `game_data_versions.is_active = 1`은 전체 DB에서 최대 한 행이다. 새 버전 적재·활성화와 구버전 삭제는 후속 동기화 구현에서 다룬다.
- `uid`는 Firebase Authentication UID다. 로컬 테이블의 `uid`는 계정별 데이터를 구분할 뿐 권한을 증명하지 않는다. 로그인·계정 전환 때 현재 인증 UID와 일치하는 행만 읽는다.
- `*_at_utc` 필드는 UTC 시각 문자열을 저장한다. 현재 DDL은 문자열 형식 자체를 검사하지 않으므로 애플리케이션에서 일관된 ISO 8601 형식으로 기록한다.
- JSON 필드는 `TEXT`와 `json_valid(...)` 제약으로 유효한 JSON만 받는다. JSON 내부 필드 구조와 서버 판정은 애플리케이션/API 계약에서 검증한다.
- SQLite의 `INTEGER` 0/1은 불리언을 뜻한다. 열거형은 DDL의 `CHECK` 목록만 허용한다. 모든 연결에서 `PRAGMA foreign_keys = ON`을 다시 실행해야 외래 키가 적용된다.
- 관리자 설정·통계·감사로그, 비밀번호·토큰·API 키, 권위 있는 세이브·해금·엔딩 결과는 이 DB에 저장하지 않는다. 중앙 원본은 Firestore와 서버다.

### 관계 개요

```text
game_data_versions (1)
  ├─ characters, pets, locations, endings, collectibles
  ├─ dialogue_speakers
  ├─ story_roles ── story_role_candidates ── characters
  │      └─ story_role_exclusions ── story_roles
  ├─ activities ── locations
  ├─ minigames ── activities
  ├─ stories ── locations
  │    └─ story_events ── story_steps / story_choices ── story_choice_effects
  │              ├─ story_event_rules
  │              ├─ story_event_conditions
  │              └─ story_event_effects
  │                           └─ dialogue_sequences (캐릭터별)
  │                                └─ dialogue_nodes / dialogue_options
  └─ unlock_conditions ── unlock_rewards

Firebase Auth uid (로컬 구분 키; SQLite 외래 키 없음)
  ├─ local_run_cache
  ├─ local_ui_state
  ├─ pending_requests
  └─ local_activity_log
```

## 기본 마스터 사본 테이블 (14개)

### `game_data_versions`

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version` | TEXT, PK | 배포 마스터 데이터 버전. 다른 마스터 테이블의 참조 키 |
| `installed_at_utc` | TEXT, NOT NULL | 해당 버전을 로컬에 적재한 시각 |
| `is_active` | INTEGER, NOT NULL, 기본 0, 0/1 | 조회에 사용할 활성 버전 여부 |

`ux_game_data_versions_one_active` 부분 UNIQUE 인덱스로 활성 버전은 **최대 하나**다. 초기 SQL은 활성 행을 만들지 않으며, 마스터 적재 후 활성화해야 한다.

### `characters`

PK: `(version, character_id)`. `version`은 `game_data_versions`를 참조하며 버전 삭제 시 함께 삭제된다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `character_id` | TEXT, NOT NULL, 복합 PK | 마스터 버전과 캐릭터 ID (`CH01` 등) |
| `display_name` | TEXT, NOT NULL | 표시 이름 |
| `description` | TEXT, NULL | 캐릭터 설명 |
| `portrait_asset_ref`, `full_body_asset_ref` | TEXT, NULL | 초상·전신 이미지 자원 참조 |
| `is_initially_unlocked` | INTEGER, 기본 0, 0/1 | 초기 선택 가능 여부의 표시용 사본 |
| `knowledge_modifier`, `expression_modifier`, `skill_modifier`, `exploration_modifier`, `magic_modifier` | INTEGER, 기본 0, 각각 -10~10 | 시작 스탯 보정의 표시용 사본 |
| `sort_order` | INTEGER, 기본 0, 0 이상 | 목록 순서 |

### `pets`

PK: `(version, pet_id)`. 버전별 `is_default = 1`은 `ux_pets_one_default_per_version`으로 **최대 한 행**이다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `pet_id` | TEXT, NOT NULL, 복합 PK | 버전과 펫 ID (`PET01` 등) |
| `display_name` | TEXT, NOT NULL | 표시 이름 |
| `description`, `asset_ref` | TEXT, NULL | 설명·이미지 참조 |
| `is_default` | INTEGER, 기본 0, 0/1 | 기본 펫 표시 |
| `knowledge_modifier`, `expression_modifier`, `skill_modifier`, `exploration_modifier`, `magic_modifier` | INTEGER, 기본 0, 각각 0~10 | 펫 보정의 표시용 사본 |
| `sort_order` | INTEGER, 기본 0, 0 이상 | 목록 순서 |

### `locations`

PK: `(version, location_id)`. `activities`와 `stories`가 같은 버전의 장소를 참조한다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `location_id` | TEXT, NOT NULL, 복합 PK | 버전과 장소 ID |
| `display_name` | TEXT, NOT NULL | 표시 이름 |
| `description`, `background_asset_ref` | TEXT, NULL | 설명·배경 이미지 참조 |
| `sort_order` | INTEGER, 기본 0, 0 이상 | 목록 순서 |

### `activities`

PK: `(version, activity_id)`. `(version, location_id)`는 `locations`를 참조하며 장소가 없는 활동은 `location_id = NULL`로 둘 수 있다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `activity_id` | TEXT, NOT NULL, 복합 PK | 버전과 활동 ID |
| `activity_type` | TEXT, NOT NULL, `CLASS`/`ADVENTURE`/`REST`/`SPECIAL` | 활동 유형 |
| `display_name` | TEXT, NOT NULL | 표시 이름 |
| `description`, `content_ref` | TEXT, NULL | 설명·콘텐츠 참조 |
| `location_id` | TEXT, NULL, FK | 연결 장소 |
| `stamina_cost` | INTEGER, 기본 0, 0~100 | 표시용 체력 소모값 |
| `target_stat` | TEXT, NULL, 5종 성장 스탯 중 하나 | 대상 스탯 |
| `sort_order` | INTEGER, 기본 0, 0 이상 | 목록 순서 |

`ix_activities_type_location(version, activity_type, location_id)`는 활성 버전의 유형·장소별 목록 조회용이다.

### `minigames`

PK: `(version, game_id)`. `(version, activity_id)`는 `activities`를 참조하며 연결 활동이 없으면 NULL이다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `game_id` | TEXT, NOT NULL, 복합 PK | 버전과 미니게임 ID |
| `activity_id` | TEXT, NULL, FK | 연결 활동 ID |
| `display_name` | TEXT, NOT NULL | 표시 이름 |
| `target_stat` | TEXT, NOT NULL, 5종 성장 스탯 중 하나 | 보상 대상 스탯 |
| `scene_ref` | TEXT, NULL | 클라이언트 장면 참조 |
| `sort_order` | INTEGER, 기본 0, 0 이상 | 목록 순서 |

`ix_minigames_activity(version, activity_id)`는 활동별 미니게임 조회용이다.

### `stories`

PK: `(version, story_id)`. `(version, location_id)`는 `locations`를 참조한다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `story_id` | TEXT, NOT NULL, 복합 PK | 버전과 스토리 ID |
| `story_type` | TEXT, NOT NULL, `MAIN`/`NPC`/`LOCATION` | 스토리 유형 |
| `display_name` | TEXT, NOT NULL | 표시 이름 |
| `npc_id` | TEXT, NULL | 연관 NPC 식별자. 별도 SQLite FK 없음 |
| `location_id` | TEXT, NULL, FK | 연관 장소 |
| `content_ref` | TEXT, NULL | 스토리 원문 참조 |
| `sort_order` | INTEGER, 기본 0, 0 이상 | 목록 순서 |

`ix_stories_type_location(version, story_type, location_id)`는 유형·장소별 목록 조회용이다.

### `story_events`

PK: `(version, event_id)`. `(version, story_id)`는 `stories`를 참조하고 버전/스토리 삭제 시 함께 삭제된다. `(version, story_id, event_id)`도 UNIQUE로 보장해 `story_steps`가 **같은 스토리의 이벤트**만 가리키게 한다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `event_id` | TEXT, NOT NULL, 복합 PK | 버전과 이벤트 ID |
| `story_id` | TEXT, NOT NULL, FK | 소속 스토리 |
| `display_name`, `scene_ref`, `content_ref` | TEXT, NULL | 표시 이름·장면·콘텐츠 참조 |

### `story_steps`

PK: `(version, story_id, step_no)`. `(version, story_id, event_id)`는 `story_events`를 참조한다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `story_id` | TEXT, NOT NULL, PK/FK | 소속 스토리 |
| `step_no` | INTEGER, 1 이상, PK | 스토리 내 단계 번호 |
| `event_id` | TEXT, NOT NULL, FK | 이 단계의 이벤트 |
| `earliest_week` | INTEGER, NULL 또는 1~52 | 가장 이른 노출 주차 |
| `display_order` | INTEGER, 기본 0, 0 이상 | 같은 맥락에서의 표시 순서 |
| `scheduled_month` | INTEGER, NULL 또는 1~12 | 날짜가 고정된 Main Story 등의 월 |
| `scheduled_day` | INTEGER, NULL 또는 1~31 | 날짜가 고정된 Main Story 등의 일 |
| `availability_rule_ref` | TEXT, NULL | 서버가 사용할 발생 규칙 식별자. 예: `MAIN_FIXED_DATE`; NPC/Location 가중치·선행 조건은 서버 규칙으로 확장 |

`ix_story_steps_event(version, event_id)`는 이벤트에서 단계 찾기용이다.

### `story_choices`

PK: `(version, event_id, choice_id)`. 선택지는 원본 이벤트를 참조하며 `next_event_id`가 있으면 같은 버전의 이벤트를 참조한다. 현재 DDL은 다음 이벤트가 **같은 스토리인지**까지 제한하지 않는다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `event_id`, `choice_id` | TEXT, NOT NULL, 복합 PK | 이벤트별 선택지 ID |
| `choice_text` | TEXT, NOT NULL | 사용자에게 보이는 선택 문구 |
| `display_order` | INTEGER, 기본 0, 0 이상 | 선택지 순서 |
| `next_event_id` | TEXT, NULL, FK | 후속 이벤트. NULL이면 여기서 연결 종료 |
| `summary_text` | TEXT, NULL | 선택 결과 요약 |
| `is_important` | INTEGER, 기본 0, 0/1 | 중요 선택/장기 기억 후보 여부. 보상 수치와는 별개 |
| `choice_group_id` | TEXT, NULL | 이벤트 안에서 같은 선택 화면에 속한 선택지 그룹 ID. 예: `MS05_S4_RECONNECT` |

`ix_story_choices_order(version, event_id, display_order)`는 이벤트별 선택지 순서 조회용이다.

### `endings`

PK: `(version, ending_id)`. 직업 조건 판정은 서버 규칙이 수행하며 이 테이블은 표시 정보만 담는다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `ending_id` | TEXT, NOT NULL, 복합 PK | 버전과 엔딩 ID |
| `ending_type` | TEXT, NOT NULL, `CAREER`/`FALLBACK` | 정규 직업 또는 대체 엔딩 |
| `display_name` | TEXT, NOT NULL | 직업/엔딩 표시 이름 |
| `subtitle`, `career_anchor`, `future_scene_guide`, `illustration_asset_ref` | TEXT, NULL | 엔딩 문구·작가 가이드·이미지 참조 |
| `sort_order` | INTEGER, 기본 0, 0 이상 | 목록 순서 |

`ix_endings_type_order(version, ending_type, sort_order)`는 유형별 목록 조회용이다.

### `collectibles`

PK: `(version, collectible_type, collectible_id)`. ID는 유형과 버전의 조합 안에서 유일하다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `collectible_id` | TEXT, NOT NULL, PK | 버전과 수집품 ID |
| `collectible_type` | TEXT, NOT NULL, PK, `BADGE`/`PUZZLE_PIECE`/`ROOM_BACKGROUND` | 수집품 유형 |
| `display_name` | TEXT, NOT NULL | 표시 이름 |
| `description`, `asset_ref` | TEXT, NULL | 설명·이미지 참조 |
| `sort_order` | INTEGER, 기본 0, 0 이상 | 목록 순서 |

`ix_collectibles_order(version, collectible_type, sort_order)`는 유형별 목록 조회용이다.

### `unlock_conditions`

PK: `(version, condition_id)`. 조건 판정식을 이 DB에 두지 않고 서버 규칙의 식별자만 연결한다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `condition_id` | TEXT, NOT NULL, 복합 PK | 버전과 조건 ID |
| `reward_timing` | TEXT, NOT NULL, `IMMEDIATE`/`RUN_COMPLETE` | 보상 시점 안내 |
| `hint_text` | TEXT, NULL | 사용자용 해금 힌트 |
| `server_rule_ref` | TEXT, NOT NULL | 서버 판정 규칙 참조. 클라이언트 판정 근거 아님 |

### `unlock_rewards`

PK: `(version, condition_id, reward_type, reward_id)`. `(version, condition_id)`는 `unlock_conditions`를 참조한다. `reward_id`는 보상 유형별 식별자이므로 SQL 외래 키로 대상 테이블까지 검증하지 않는다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `condition_id` | TEXT, NOT NULL, PK/FK | 보상을 내는 조건 |
| `reward_type` | TEXT, NOT NULL, PK, `CHARACTER`/`PET`/`BADGE`/`PUZZLE_PIECE`/`ROOM_BACKGROUND`/`PERMANENT_BONUS` | 보상 유형 |
| `reward_id` | TEXT, NOT NULL, PK | 대상 ID 또는 영구 보너스 종류 |
| `amount` | INTEGER, 기본 1, 1~15 | 안내용 수량/보너스값 |

## 대화 화자·역할 마스터 (4개, v4)

### `dialogue_speakers`

플레이 가능한 32명은 `characters`에 두고, 그 밖의 고정 NPC·생물·초상 없는 텍스트 화자는 이 테이블에 둔다. 따라서 발렌티누스, 그림자, 향후 룰루·세린을 위해 `characters`에 가짜 플레이 캐릭터 행을 만들지 않는다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `speaker_id` | TEXT, NOT NULL, 복합 PK | 마스터 버전과 비플레이어 화자 ID |
| `display_name` | TEXT, NOT NULL | UI 표시 이름 |
| `speaker_type` | `NPC`/`CREATURE`/`TEXT_ONLY` | 화자 표현 유형 |
| `portrait_asset_ref` | TEXT, NULL | 초상 자원. NULL이면 텍스트 화자로 정상 처리 |
| `description` | TEXT, NULL | 제작용 설명 |
| `sort_order` | INTEGER, 0 이상 | 관리/목록 순서 |

대화 노드의 `speaker_ref = NPC:<speaker_id>`가 이 마스터를 참조한다. SQL FK로 문자열 prefix까지 묶지는 않고 적재 검증기가 존재 여부를 검사한다.

### `story_roles`

`ROLE:<roleId>`의 서버 해석 규칙이다. `STORY_CAST`는 회차 시작 때 실제 학생을 뽑아 `activeRun.storyCast`에 저장하고, `FIXED_CHARACTER`/`FIXED_SPEAKER`는 고정 대상을 해석한다.

| 컬럼 | 의미 |
|---|---|
| `role_id` | `MAIN_GUIDE_STUDENT`, `MAIN_TEACHER` 같은 안정 역할 ID |
| `role_scope` | `MAIN`/`NPC`/`LOCATION`/`GLOBAL` |
| `resolver_type` | `STORY_CAST`/`FIXED_CHARACTER`/`FIXED_SPEAKER` |
| `fixed_ref` | 고정 역할일 때 `CHARACTER:CHxx` 또는 `NPC:<speakerId>` |
| `exclude_player` | 동적 후보에서 현재 주인공 제외 여부 |
| `assignment_order` | 회차 시작 시 동적 역할을 확정하는 순서. 0은 고정 역할/배정 순서 없음 |
| `prior_assignment_policy` | `ALLOW` / `PREFER_DISTINCT` / `REQUIRE_DISTINCT`. 앞서 배정된 학생과의 중복 처리 정책 |
| `description` | 제작용 설명 |

`assignment_order > 0`은 버전 안에서 UNIQUE다. 서버는 이 순서대로 `STORY_CAST` 역할을 확정해야 앞선 역할과의 캐릭터 중복 회피가 결정론적으로 동작한다. Main 7개 동적 역할은 1~7이며 `REQUIRE_DISTINCT`, `LOC_GREENHOUSE_STUDENT`는 8번이며 `PREFER_DISTINCT`를 사용한다. NPC Story의 `NPC_GUIDE_ACTOR`와 `NPC_WORK_ACTOR`는 각각 9·10번이며 `ALLOW`를 사용한다. 두 NPC 역할은 다른 Story 역할과의 중복 자체를 금지하지 않고 **현재 주인공과의 중복만 제외**한다.

### `story_role_candidates`

PK는 `(version, role_id, priority)`이며 같은 역할 안에서 캐릭터 중복 후보를 금지한다. Main Story 7개 동적 학생 역할은 현재 우선 후보 8명씩 총 56행, Location `LOC_GREENHOUSE_STUDENT`는 8행, NPC `NPC_GUIDE_ACTOR`와 `NPC_WORK_ACTOR`는 각각 2행을 사용한다. 서버는 각 역할의 `prior_assignment_policy`와 hard exclusion을 적용한 뒤 `priority`가 가장 작은 사용 가능 후보를 선택한다.

`MAIN_TEACHER`는 후보 행을 갖지 않고 `FIXED_SPEAKER → NPC:VALENTINUS`로 저장한다. NPC Story는 `NPC_GUIDE_ACTOR = CH16→CH15`, `NPC_WORK_ACTOR = CH25→CH26` 순서로 후보를 저장해 주인공이 기본 actor일 때만 대체 캐릭터를 사용한다.

### `story_role_exclusions` (v4)

동적 배역 사이의 **절대 중복 금지**를 저장한다. `prior_assignment_policy=PREFER_DISTINCT`처럼 다른 역할 재사용을 fallback으로 허용하더라도 이 테이블의 관계는 반드시 지켜야 한다.

| 컬럼 | 의미 |
|---|---|
| `version`, `role_id`, `excluded_role_id` | 복합 PK. 두 역할 관계 |
| `exclusion_type` | 현재 `DISTINCT_CHARACTER`만 지원 |

현재 Location 행은 `LOC_GREENHOUSE_STUDENT != MAIN_GREENHOUSE_STUDENT` 한 건이다.

## 캐릭터별 대화 마스터 테이블 (3개, v3~v4 공통)

이 세 테이블은 [대화 시퀀스 콘텐츠 계약](../../../document/content/13_DIALOGUE_SEQUENCE.md)에 따라 **스토리 진행 단계마다 참여 가능한 플레이 캐릭터별로** 사전 작성한 읽기용 데이터다. `event_id`는 `story_steps`에 묶인 이벤트여야 한다. Main/NPC/Location 모두 캐릭터 32명분을 seed할 수 있다. NPC는 GUIDE `티아→로빈`, WORK `렌→다나`, Location 온실은 CH12·CH19 protagonist에서 하젤·그 외 요한 reaction으로 충돌을 해결한다. SQL의 행 제약 외에 각 seed가 필수 선택, 캐릭터 수, canonical choice 참조, graph reachability까지 검사한다.

### `dialogue_sequences`

PK: `(version, story_id, step_no, character_id)`. `(version, story_id, step_no, event_id)`는 `story_steps`를, `(version, character_id)`는 `characters`를 참조한다. `entry_node_id`는 같은 시퀀스의 `dialogue_nodes`를 지연 외래 키로 참조하므로 한 트랜잭션에서 시퀀스와 노드를 함께 넣을 수 있다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version` | TEXT, NOT NULL, PK/FK | 마스터 데이터 버전 |
| `story_id` | TEXT, NOT NULL, PK/FK | 메인·지역·NPC 스토리 ID |
| `step_no` | INTEGER, NOT NULL, PK/FK | 52주 플레이 회차가 아닌 **스토리 진행 단계** 번호 |
| `event_id` | TEXT, NOT NULL, FK | 이 단계에 연결된 이벤트 ID |
| `character_id` | TEXT, NOT NULL, PK/FK | 현재 플레이 캐릭터 ID |
| `entry_node_id` | TEXT, NOT NULL, 지연 FK | 재생을 시작할 노드 ID |

`ix_dialogue_sequences_event_character(version, event_id, character_id)`는 선정 이벤트와 현재 캐릭터의 대화 조회용이다. `ux_story_steps_dialogue_binding`은 단계와 이벤트의 결합을 외래 키로 검증하기 위한 고유 인덱스다.

### `dialogue_nodes`

PK: `(version, story_id, step_no, character_id, node_id)`. 앞의 네 컬럼은 `dialogue_sequences`를 참조하고, `next_node_id`가 있으면 **같은 캐릭터·같은 시퀀스** 안의 다음 노드를 가리킨다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `story_id`, `step_no`, `character_id` | TEXT/TEXT/INTEGER/TEXT, NOT NULL, PK/FK | 소속 대화 시퀀스 |
| `node_id` | TEXT, NOT NULL, PK | 시퀀스 내 노드 ID |
| `node_kind` | TEXT, NOT NULL, `LINE`/`IMAGE`/`CHOICE`/`END` | 대사·이미지·선택 지점·종료 |
| `line_mode` | `DIALOGUE`/`NARRATION`/`THOUGHT`/`CONTEXT`, LINE 필수 | LINE 표현 모드 |
| `speaker_kind` | TEXT, NULL, `PLAYER`/`NPC`/`NARRATOR` | 대사 화자 유형. `LINE`에는 필수 |
| `speaker_ref` | TEXT, NULL | `ROLE:<roleId>`, `NPC:<speakerId>` 등. `speaker_kind = NPC`면 필수 |
| `line_text` | TEXT, NULL | LINE 실제 문구. 공백만 허용하지 않음 |
| `visual_mode` | `SPEAKER`/`KEEP`/`NONE`, LINE 필수 | 현재 중심 이미지 처리 |
| `image_target` | `BACKGROUND`/`FOCUS`, IMAGE 필수 | 이미지 출력 슬롯 |
| `image_action` | `SHOW`/`REPLACE`/`HIDE`, IMAGE 필수 | 이미지 동작 |
| `image_asset_type` | `CHARACTER`/`ITEM`/`SCENE`/`EFFECT`, IMAGE 필수 | 자원 의미 유형 |
| `image_asset_ref` | TEXT, NULL | HIDE 외 IMAGE에서 필수인 안정 자원 참조 |
| `image_alt` | TEXT, NULL | 접근성/관리용 설명 |
| `choice_group_id` | TEXT, NULL, CHOICE 필수 | 제작 문서의 선택 화면 의미 ID. 예: `MS05_S4_RECONNECT` |
| `choice_prompt` | TEXT, NULL | 선택 화면 별도 프롬프트가 필요할 때 사용 |
| `next_node_id` | TEXT, NULL, 지연 FK | `LINE`/`IMAGE` 다음 노드. `CHOICE`/`END`에는 없음 |

`IMAGE`와 `LINE`의 표현 필드는 최종 Dialogue API 계약을 그대로 보존한다. `speaker_ref`가 `ROLE:`이면 `story_roles` 및 현재 슬롯 `activeRun.storyCast`로 해석하고, `NPC:`이면 `dialogue_speakers`에서 표시 정보를 찾는다. 해석할 수 없는 참조는 다른 화자로 임의 대체하지 않고 콘텐츠 데이터 오류로 처리한다. `CHOICE`에서 다음 노드로 가는 간선은 `dialogue_options`에 저장한다.

### `dialogue_options`

PK: `(version, story_id, step_no, character_id, choice_node_id, choice_id)`. `choice_node_id`와 `response_node_id`는 모두 같은 시퀀스의 노드를 참조한다. 선택 직후 첫 반응은 `response_node_id`에서 시작한다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `version`, `story_id`, `step_no`, `character_id` | TEXT/TEXT/INTEGER/TEXT, NOT NULL, PK/FK | 소속 대화 시퀀스 |
| `choice_node_id` | TEXT, NOT NULL, PK/FK | 선택지를 보여 줄 `CHOICE` 노드 ID |
| `choice_id` | TEXT, NOT NULL, PK | 서버 결과 처리에 사용할 안정적인 의미 ID |
| `choice_text` | TEXT, NOT NULL, 공백만 허용하지 않음 | 캐릭터별 실제 선택 문구 |
| `response_node_id` | TEXT, NOT NULL, 지연 FK | 선택 직후 상대 반응 시작 노드 |
| `sort_order` | INTEGER, 기본 0, 0 이상 | 선택지 표시 순서 |

`ix_dialogue_options_order(version, story_id, step_no, character_id, choice_node_id, sort_order)`는 선택지 순서 조회용이다. 기존 `story_choices`는 이벤트 단위의 선택 의미·후속 이벤트 연결을 보관하며, 이 테이블은 캐릭터별 화면 문구·대화 분기를 보관한다. 두 테이블의 `choice_id`가 같은 이벤트 안에서 일치하는지 콘텐츠 적재 시 검사한다.

## 선택·이벤트 효과 마스터 (2개, v3)

### `story_choice_effects`

선택 문구와 실제 결과를 분리한다. PK는 `(version, event_id, choice_id, effect_order)`다. `effect_type`은 현재 `VISIBLE_STAT / HIDDEN_STAT / EVENT_FLAG / COUNTER`, `target`은 `knowledge`, `empathy` 같은 서버 도메인 키, `value_json`은 JSON 정수·불리언·문자열 등을 저장한다.

현재 Story 선택 효과는 각 choice의 `VISIBLE_STAT 1개 + Primary HIDDEN_STAT 1개 + 선택적으로 Secondary HIDDEN_STAT 1개`를 저장한다. Main은 canonical choice 40개에 **102행**, NPC는 24개에 **64행**, Location은 13개에 **39행**(`LOC_OBS_04` 표식 EVENT_FLAG 3행 포함)으로 총 **205행**이다. 정확한 보상 계층과 결과 공개 규칙은 `document/content/02_STATS_EVENTS_ENDINGS/04_STORY_CHOICE_REWARDS.md`를 따른다. 엔진 대화 로드 payload에는 이 값을 넣지 않고 `completeDialogue` 시 서버가 `choiceId`로 조회한다. `completionMode=SKIP`이면 이 테이블의 선택 효과를 적용하지 않는다.

### `story_event_effects`

선택과 무관한 사건 완료 결과를 저장한다. `apply_on`은 `COMPLETE_ONLY` 또는 `COMPLETE_OR_SKIP`이고, 현재 `STORY_PROGRESS / EVENT_FLAG / COUNTER`를 지원한다.

스토리 진행 완료처럼 스킵해도 반드시 이어져야 하는 결과는 `COMPLETE_OR_SKIP`로 둔다. Main Story에서는 각 `MS01~MS06` 완료 진행 효과와 `MS05 guardianRuneResolved=true`를 이 방식으로 적재한다. 선택 보상과 진행 필드를 분리했기 때문에 QA/첫 엔딩 이후 스킵에서도 스탯 보상 없이 사건만 정상 완료할 수 있다.

## Story 발생 규칙 마스터 (2개, v4)

### `story_event_rules`

Main/NPC/Location 이벤트별 후보 선정 정책을 공통으로 저장한다. PK는 `(version, event_id)`다.

| 컬럼 | 허용값/의미 |
|---|---|
| `trigger_phase` | `FIXED_DATE` / `AFTER_ACTIVITY` / `WEEKEND` / `MANUAL` |
| `selection_policy` | `FIXED` / `UNSEEN_FIRST` / `WEIGHTED` |
| `repeat_policy` | `ONCE_PER_RUN` / `REPEATABLE` |
| `requires_location_match` | 현재 활동 장소와 `stories.location_id` 일치 필요 여부 |
| `limit_group` | 공통 발생 제한 그룹. NPC/Location은 `SIDE_STORY` |
| `cooldown_weeks` | 콘텐츠별 추가 쿨다운. 현재 NPC/Location은 0 |
| `is_active` | 런타임 후보 사용 여부 |

현재 NPC 12개는 `AFTER_ACTIVITY / WEIGHTED / ONCE_PER_RUN / requires_location_match=1 / SIDE_STORY`, Location 6개는 `AFTER_ACTIVITY / UNSEEN_FIRST / ONCE_PER_RUN / requires_location_match=1 / SIDE_STORY`다. `SIDE_STORY`의 **주당 2회·하루 1회** 같은 가변 카운터는 이 테이블에 저장하지 않고 Firestore `activeRun.storyEventWindow`와 서버 정책으로 적용한다.

### `story_event_conditions`

`earliest_week`, Location 일치, 고정 날짜 같은 기본 컬럼만으로 표현되지 않는 추가 선행 조건을 정규화한다. PK는 `(version, event_id, condition_order)`다.

지원 `condition_type`:

- `PREVIOUS_EVENT_COMPLETE`
- `LOCATION_ID`
- `ACTIVITY_TYPE`
- `NPC_ENCOUNTER_GTE`
- `STORY_STATUS`
- `EVENT_FLAG`
- `MAIN_PROGRESS`
- `CUSTOM`

조건값은 `value_json`에 유효 JSON으로 저장하고 `operator`는 `EQ / NE / GTE / LTE / IN / NOT_IN`을 사용한다. 현재 NPC는 2~4단계의 `PREVIOUS_EVENT_COMPLETE` 9행과 WORK 1~4단계의 `ACTIVITY_TYPE=CLASS` 4행을 합쳐 **13행**을 사용한다. 첫 단계 선행 조우 조건은 2026-10-20 승인으로 제거했다. 천문대는 `LOC_OBS_02→OBS_01`, `OBS_03→OBS_02`, `OBS_04→OBS_03`의 완료 조건 3행을 갖는다.

## UID별 로컬 테이블 (4개)

### `local_run_cache`

PK: `(uid, slot_id)`. Firestore 슬롯에서 마지막으로 확인한 스냅샷을 화면 조회에 사용한다. 서버 원본이 아니다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `uid` | TEXT, NOT NULL, PK | 현재 계정 UID |
| `slot_id` | INTEGER, PK, 1~5 | 세이브 슬롯 번호 |
| `server_revision` | TEXT, NOT NULL | 캐시가 반영한 서버 저장 버전/리비전 |
| `snapshot_json` | TEXT, NOT NULL, 유효 JSON | 슬롯·회차 화면 조회 스냅샷 |
| `cached_at_utc` | TEXT, NOT NULL | 서버 확인 결과를 캐시한 시각 |

로그인 직후, 저장 충돌 후, 다른 기기에서 플레이한 뒤에는 서버 값을 다시 확인한다. 캐시 값으로 스탯·보상을 확정하지 않는다.

### `local_ui_state`

PK: `(uid, state_key)`. 미확정 화면 상태만 담는다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `uid`, `state_key` | TEXT, NOT NULL, 복합 PK | 계정과 UI 상태 이름 |
| `state_json` | TEXT, NOT NULL, 유효 JSON | 열린 화면·입력 중인 선택 등 |
| `updated_at_utc` | TEXT, NOT NULL | 로컬 상태 수정 시각 |

### `pending_requests`

PK: `(uid, request_id)`. 네트워크 실패 뒤 **같은 요청 ID**로 결과 조회·재시도를 하기 위한 전송 대기 정보다. 서버가 중복 반영 방지와 저장 판정을 수행한다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `uid`, `request_id` | TEXT, NOT NULL, 복합 PK | 계정과 멱등 요청 ID |
| `request_type` | TEXT, NOT NULL | API 요청 유형. 허용 목록은 API 계약에서 결정 |
| `request_json` | TEXT, NOT NULL, 유효 JSON | 재전송에 필요한 최소 요청 내용 |
| `expected_server_revision` | TEXT, NULL | 낙관적 충돌 확인에 사용할 서버 리비전 |
| `created_at_utc` | TEXT, NOT NULL | 요청 생성 시각 |
| `last_attempt_at_utc` | TEXT, NULL | 마지막 전송 시도 시각 |
| `attempt_count` | INTEGER, 기본 0, 0 이상 | 전송 시도 횟수 |

`ix_pending_requests_retry(uid, created_at_utc)`는 UID별 오래된 미처리 요청 조회용이다. 성공 응답으로 서버 반영이 확인되면 행을 삭제한다.

### `local_activity_log`

PK: `(uid, local_event_id)`. 최근 활동 화면을 위한 로컬 표시 기록이다. 관리자 통계나 해금의 근거가 아니다.

| 컬럼 | 타입·제약 | 의미 |
|---|---|---|
| `uid`, `local_event_id` | TEXT, NOT NULL, 복합 PK | 계정과 로컬 이벤트 ID |
| `run_id`, `content_id` | TEXT, NULL | 관련 회차·콘텐츠 참조 |
| `slot_id` | INTEGER, NULL 또는 1~5 | 관련 슬롯 |
| `event_type` | TEXT, NOT NULL | 표시할 이벤트 유형. 목록은 화면 계약에서 결정 |
| `occurred_at_utc` | TEXT, NOT NULL | 발생 시각 |
| `summary_json` | TEXT, NOT NULL, 유효 JSON | 화면 표시용 요약 |
| `server_confirmed` | INTEGER, 기본 0, 0/1 | 서버 확정 결과를 확인했는지 여부 |

`ix_local_activity_recent(uid, occurred_at_utc DESC)`는 최근 활동 조회용이다. `server_confirmed = 0`은 보상·활동 확정 표시의 근거가 될 수 없다.

## 적용·운영 경계

- 새 DB는 `001_initial.sql → 002_dialogue_sequences.sql → 003_dialogue_runtime_content.sql → 004_story_event_rules.sql` 순서로 적용한다. `seed_dialogue_content.py --migrate`, `seed_npc_story.py --migrate`, `seed_location_story_master.py --migrate`는 v4까지 자동 적용한다.
- 저장소 루트에서 Main Story 데이터 적재 예: `python3 backend/database/sqlite/seed_dialogue_content.py --migrate --version dev-dialogue-v1`. 성공하면 **`backend/database/sqlite/lumia-content.sqlite3`**가 생성된다. 다른 DB를 사용할 때만 `--db <경로>`를 지정한다. 전체 마스터 버전이 준비되기 전에는 `--activate`를 생략하고, NPC/Location 등 같은 버전 데이터까지 검증된 뒤 활성화한다.
- Main v3의 이전 선택 보상 규칙에서는 `192 sequences / 40 choices / 80 effects` 결과를 사용자가 실제 로컬 DB에서 확인했다. **현재 Primary/Secondary Hidden 규칙으로 다시 seed하면 Main 기대값은 102 effects**다. 새 보상 규칙에 대한 실제 SQLite 재검증은 아직 전이다.
- NPC 적재 예: `python3 backend/database/sqlite/seed_npc_story.py --migrate --version dev-dialogue-v1`. 현재 구현 기대값은 `NPC stories=3 / events=12 / event conditions=13 / canonical choices=24 / choice effects=64 / dialogue sequences=384 / dialogue options=768`이다. 상세는 [NPC Story DB 명세](../NPC_STORY_DB_SPEC.md)와 `validate_npc_story.sql`을 따른다.
- Location 전체 적재 예: `python3 backend/database/sqlite/seed_location_story_master.py --migrate --version dev-dialogue-v1`. 검증 기준은 `user_version=4 / Location stories=6 / events=6 / canonical choices=13 / choice effects=39 / dialogue_sequences=192 / dialogue_options=416 / dialogue_nodes=3616`이며, **2026-10-18 사용자가 실제 로컬 SQLite 실행 결과를 정상 확인했다.**
- 세 Story 유형의 선택 보상만 통합 검증하려면 `validate_story_choice_rewards.sql`을 실행하며 기대값은 **77 choices / 205 effects**다.
- Location DB 상세 설계·Firestore 경계·검증 SQL은 [Location Story DB 명세](../LOCATION_STORY_DB_SPEC.md)를 따른다.
- 저장소 작업 도구 자체에는 임의 셸 실행 권한이 없다. 따라서 도구에서 직접 실행하지 못한 영역은 별도로 구분하되, **Location seed는 사용자 로컬 실행으로 실제 DB 검증 완료** 상태다. NPC 전체 seed의 실행 검증 상태는 해당 NPC 문서 기준을 따른다.
- Firestore 동기화 API와 정식 FastAPI Dialogue compiler/complete transaction은 별도 구현 작업이다. SQL과 seed 파일 존재만으로 서버 런타임 완료로 보지 않는다.
- 로컬 계정 탈퇴 시 위 4개 UID별 테이블에서 해당 `uid` 행을 제거한다. 마스터 사본은 UID와 무관하므로 유지할 수 있다. 로그아웃·계정 전환 시 다른 UID의 캐시를 노출하지 않는다.
- 마스터 사본의 `ON DELETE CASCADE`는 구버전 정리 시 종속 행을 함께 지우기 위한 것이다. 로컬 UID별 테이블에는 마스터 버전 외래 키가 없으므로 마스터 갱신과 별개로 수명주기를 관리한다.
- 활동 결과·주간 종료·엔딩의 권위 있는 저장은 [Firestore 스키마](../SCHEMA.md)와 서버 트랜잭션 계약에 따른다.
