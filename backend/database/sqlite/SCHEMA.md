# 플레이어 로컬 SQLite 스키마 v2

이 문서는 [001_initial.sql](001_initial.sql)과 [002_dialogue_sequences.sql](002_dialogue_sequences.sql)에 실제로 생성되는 테이블·컬럼·제약을 설명한다. 저장 위치와 Firestore와의 권한 경계는 [STORAGE_DESIGN.md](../STORAGE_DESIGN.md), 중앙 사용자 문서의 상세 구조는 [SCHEMA.md](../SCHEMA.md)를 따른다. SQL이 실행 기준이며, 이 문서는 그 의미를 설명한다.

## 범위와 공통 규칙

- 빈 SQLite DB에 `001_initial.sql`을 한 번 적용한 뒤 `002_dialogue_sequences.sql`을 한 번 적용한다. 적용 후 `PRAGMA user_version = 2`다.
- 21개 테이블 중 17개는 배포 버전별 **읽기용 게임 마스터 사본**, 4개는 UID별 **로컬 캐시·임시 상태·전송 대기 데이터**다. SQL은 테이블과 인덱스만 만들며 마스터 행은 넣지 않는다.
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
  ├─ activities ── locations
  ├─ minigames ── activities
  ├─ stories ── locations
  │    └─ story_events ── story_steps / story_choices
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

## 캐릭터별 대화 마스터 테이블 (3개, v2)

이 세 테이블은 [대화 시퀀스 콘텐츠 계약](../../../document/content/13_DIALOGUE_SEQUENCE.md)에 따라 **스토리 진행 단계마다 참여 가능한 플레이 캐릭터별로** 사전 작성한 읽기용 데이터다. `event_id`는 `story_steps`에 묶인 이벤트여야 한다. 메인·지역 단계는 캐릭터 32명분, NPC 단계는 대상 NPC와 같은 플레이 캐릭터를 제외한 참여 가능 캐릭터분을 적재한다. 현재 SQL은 행의 키와 참조를 검증하지만 **필수 선택이 모든 경로에 존재하는지, 캐릭터 수가 충분한지**는 마스터 버전 활성화 전 콘텐츠 검증기가 검사한다.

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
| `speaker_kind` | TEXT, NULL, `PLAYER`/`NPC`/`NARRATOR` | 대사 화자 유형. `LINE`에는 필수 |
| `speaker_ref` | TEXT, NULL | NPC 화자 식별자 또는 `ROLE:<roleId>` 동적 배역 참조. `speaker_kind = NPC`면 필수 |
| `line_text` | TEXT, NULL | 대사 또는 선택 프롬프트. `LINE`이면 비어 있지 않아야 함 |
| `image_asset_ref` | TEXT, NULL | 스토리 원고에 지정된 이미지 자원 참조. `IMAGE`이면 필수 |
| `next_node_id` | TEXT, NULL, 지연 FK | `LINE`/`IMAGE` 다음 노드. `CHOICE`/`END`에는 없음 |

`IMAGE` 노드는 이미지가 나타나는 순서를 명시한다. `LINE`에도 같은 순간 표시할 `image_asset_ref`를 둘 수 있다. 실제 이미지 사용 여부는 스토리 원고와 대조한다. `speaker_ref`가 `ROLE:`로 시작하면 현재 슬롯 `activeRun.storyCast`에서 실제 캐릭터 ID를 조회해 이름·스프라이트를 표시한다. 해석할 수 없는 role 참조는 다른 NPC로 임의 대체하지 않고 콘텐츠 데이터 오류로 처리한다. `CHOICE`에서 다음 노드로 가는 간선은 `dialogue_options`에 저장한다.

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

- 새 DB 생성 예: `sqlite3 lumia-client.sqlite3 < backend/database/sqlite/001_initial.sql` 다음 `sqlite3 lumia-client.sqlite3 < backend/database/sqlite/002_dialogue_sequences.sql`. 이 명령은 개발 검증용 예시다. 브라우저에서는 SQLite WASM/OPFS 초기화 코드가 두 SQL을 순서대로 마이그레이션으로 실행해야 한다.
- 이 스키마는 **마이그레이션 실행 코드, 마스터 데이터 적재, Firestore 동기화 API, 계정 삭제 시 로컬 정리**를 아직 구현하지 않는다. 해당 동작을 SQL 파일 존재만으로 완료 처리하지 않는다.
- 로컬 계정 탈퇴 시 위 4개 UID별 테이블에서 해당 `uid` 행을 제거한다. 마스터 사본은 UID와 무관하므로 유지할 수 있다. 로그아웃·계정 전환 시 다른 UID의 캐시를 노출하지 않는다.
- 마스터 사본의 `ON DELETE CASCADE`는 구버전 정리 시 종속 행을 함께 지우기 위한 것이다. 로컬 UID별 테이블에는 마스터 버전 외래 키가 없으므로 마스터 갱신과 별개로 수명주기를 관리한다.
- 활동 결과·주간 종료·엔딩의 권위 있는 저장은 [Firestore 스키마](../SCHEMA.md)와 서버 트랜잭션 계약에 따른다.
