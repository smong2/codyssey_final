# 플레이어 로컬 SQLite + 중앙 Firestore 저장 설계 초안

이 문서는 저장 위치와 필요한 테이블·문서 목록을 정리한다. 플레이어 로컬 SQLite의 기본 18개 테이블은 [001_initial.sql](sqlite/001_initial.sql), 캐릭터별 대화 시퀀스 3개 테이블은 [002_dialogue_sequences.sql](sqlite/002_dialogue_sequences.sql)에 정의했다. 전체 21개 테이블의 컬럼·키·제약은 [SQLite 상세 스키마](sqlite/SCHEMA.md)에 설명했다. Firestore 인덱스와 동기화 API는 후속 상세 설계에서 확정한다. 사용자별 Firestore 필드의 기존 정의는 [SCHEMA.md](SCHEMA.md)를 따른다.

## 1. 저장 위치와 권한

| 위치 | 소유·접근 | 저장 대상 |
|---|---|---|
| Firebase Authentication | Firebase 및 인증된 사용자 | 이메일/비밀번호, 이메일 인증, 로그인 세션, 관리자 권한 |
| 플레이어 브라우저 SQLite | 해당 브라우저의 게임 클라이언트 | 게임 마스터의 로컬 사본, 화면·미니게임 임시 상태, 재조회용 캐시, 전송 대기 요청 |
| Cloud Firestore | FastAPI가 서버 권한으로 접근; 관리자 API가 중앙 조회 | 계정별 세이브·Global Meta·엔딩, 관리자 기간 통계용 기록·집계, 전역 보상 배율, 감사로그 |

관리자 콘솔은 플레이어 기기의 SQLite에 접근하지 않는다. 전체 사용자 조회·통계·운영 설정은 중앙 Firestore 데이터로 처리한다. 브라우저 SQLite는 **플레이어별 로컬 저장소**이므로 다른 기기와 공유되지 않고, 게임 판정이나 관리자 통계의 단일 원본으로 사용하지 않는다. 사용자가 로컬 DB를 수정해도 스탯·해금·엔딩·운영 값을 바꿀 수 없도록 FastAPI에서 검증한다.

웹 게임이므로 브라우저 SQLite 구현은 SQLite WASM과 OPFS 기반 저장을 검토한다. 이 기능은 Web Worker와 브라우저 지원·저장 공간 검증이 필요하다. 미지원 환경에서는 서버 데이터로 게임을 사용할 수 있는 대체 경로를 설계하고, 로컬 데이터 삭제·기기 교체 후에는 Firestore에서 복구한다. [SQLite WASM 영속 저장 문서](https://sqlite.org/wasm/doc/trunk/persistence.md), [MDN OPFS 안내](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system).

## 2. 플레이어 로컬 SQLite 테이블

마스터 데이터의 원본은 Git의 코드/JSON/문서와 서버 규칙이다. 배포 버전에 맞는 읽기용 사본을 클라이언트 SQLite에 적재한다. 클라이언트에 있는 규칙은 신뢰하지 않고 서버에서 다시 판정한다.

| 테이블 | 기본 키 | 로컬 역할 |
|---|---|---|
| `game_data_versions` | `version` | 내려받은 마스터 데이터 버전과 적용 상태 |
| `characters` | `version + character_id` | 캐릭터 표시·선택 정보와 시작 보정의 읽기용 사본 |
| `pets` | `version + pet_id` | 펫 표시·보정 정보의 읽기용 사본 |
| `locations` | `version + location_id` | 장소·활동 연결 |
| `activities` | `version + activity_id` | 수업·모험·휴식·특수 활동 표시 정보 |
| `minigames` | `version + game_id` | 미니게임 표시·활동 연결 정보 |
| `stories` | `version + story_id` | 메인·NPC·Location Story 표시 정보 |
| `story_events` | `version + event_id` | 스토리에 속한 장면과 콘텐츠 참조 |
| `story_steps` | `version + story_id + step_no` | 장면·단계 연결 |
| `story_choices` | `version + event_id + choice_id` | 이벤트 단위 선택 의미·후속 장면 연결 |
| `dialogue_sequences` | `version + story_id + step_no + character_id` | 스토리 단계·이벤트·플레이 캐릭터별 사전 작성 대화 |
| `dialogue_nodes` | 시퀀스 키 + `node_id` | 대사·이미지·선택·종료 노드 |
| `dialogue_options` | 시퀀스 키 + `choice_node_id + choice_id` | 캐릭터별 선택 문구와 상대 반응 진입점 |
| `endings` | `version + ending_id` | 직업명·작가 고정 표시 정보 |
| `collectibles` | `version + collectible_type + collectible_id` | 배지·퍼즐 조각·마이룸 배경 표시 정보 |
| `unlock_conditions` | `version + condition_id` | UI 안내용 해금 조건 사본; 판정은 서버 전용 |
| `unlock_rewards` | `version + condition_id + reward_type + reward_id` | 보상 안내용 정의 |
| `local_run_cache` | `uid + slot_id` | 서버에서 마지막으로 확인한 슬롯·회차의 화면 조회 캐시와 서버 버전 |
| `local_ui_state` | `uid + state_key` | 열린 화면·선택 중인 일정 등 서버 저장 전 임시 UI 상태 |
| `pending_requests` | `uid + request_id` | 네트워크 오류 시 같은 요청 ID로 재시도할 최소 요청 정보 |
| `local_activity_log` | `uid + local_event_id` | 플레이어 화면의 최근 활동 표시용 로컬 기록; 관리자 통계 원본 아님 |

빈 SQLite DB에 001과 002 마이그레이션을 순서대로 한 번씩 적용한다. 적용 후 `PRAGMA user_version = 2`이며, SQLite 연결마다 외래 키를 활성화한다. 마스터 데이터는 버전별로 적재하고 `game_data_versions.is_active`를 통해 활성 버전을 구분한다. 로컬 테이블에는 비밀번호, Firebase ID Token, Gemini API Key, 관리자 권한·감사로그를 넣지 않는다. 계정 전환 시 다른 UID의 로컬 캐시를 표시하지 않으며, 계정 탈퇴 시 해당 UID의 로컬 데이터도 제거한다. 브라우저 저장소가 지워지면 캐시는 다시 내려받는다. `pending_requests`는 서버가 처리 성공을 확인하면 제거하고, 재시도해도 서버에서 결과가 중복 반영되지 않도록 요청 ID를 검증한다.

## 3. 중앙 Firestore 문서 목록

### 3.1 사용자 게임 상태

| 경로 | 내용 |
|---|---|
| `users/{uid}` | 계정 생성·최근 플레이·개인정보 동의 시각/버전 |
| `users/{uid}/settings/account` | 활성 펫·마이룸 배경·언어 |
| `users/{uid}/meta/progress` | 영구 보너스와 캐릭터·펫·배지·퍼즐·배경·엔딩 해금 |
| `users/{uid}/statistics/global` | 해금 판정용 전체 회차 누적 카운터 |
| `users/{uid}/unlockState/global` | 처리 완료 조건과 보류 중인 해금 |
| `users/{uid}/saveSlots/{1..5}` | 확정된 슬롯 상태와 현재 `activeRun`; 장기 플레이 기억의 원본 |
| `users/{uid}/endingRecords/{recordId}` | 완료 회차의 직업·편지·편지에 사용한 기록 |

`activeRun`은 슬롯 문서 내부 필드다. 일반 UI 조회는 로컬 캐시를 사용할 수 있지만, 로그인·계정 전환·저장 충돌 후에는 서버 상태를 확인한다. 활동 중 매 프레임의 이동·조작·임시 미니게임 상태를 Firestore에 전송하지 않는다. 기존 기획의 **활동 결과·주간 종료·엔딩 등 안정 저장 경계**에서는 서버 저장 성공을 확인해야 다음 확정 단계로 진행한다.

### 3.2 관리자와 기간 통계

| 경로 | 내용 | 쓰기 권한 |
|---|---|---|
| `users/{uid}/activityDays/{kstDate}` | 해당 실제 KST 날짜의 활동·미니게임 결과·스토리 진행·회차 완료 요약과 관리자 집계에 필요한 최소 차원 | FastAPI |
| `analyticsDays/{kstDate}` | 전체 사용자 일별 집계의 조회용 문서. 주·월 화면은 KST 날짜들을 합산 | 서버 집계 작업 |
| `systemSettings/balance` | 5개 성장 스탯별 `rewardMultiplier`, `version`, `updatedAt`, `updatedBy` | 관리자 API |
| `adminAuditLogs/{logId}` | 관리자 로그인 성공/실패, 운영 값 변경 내역 | 관리자 API |

`activityDays`는 모든 조작을 쌓는 상세 이벤트 로그가 아니라 **하루 단위 요약**이다. 관리자 일·주·월 통계를 각 기기의 SQLite 없이 계산하기 위한 중앙 데이터다. `analyticsDays`는 재생성 가능한 파생 집계이며, 정확한 지표·중복 방지·갱신 주기는 상세 설계에서 확정한다. 과도한 단일 문서 갱신은 피하고 실제 사용자 규모에 맞춰 집계 방식을 검증한다. 사용자 삭제 시 해당 UID의 `activityDays`를 삭제하고 영향받는 날짜의 파생 집계를 다시 계산한다.

관리자 로그인 실패도 감사로그 대상이므로, 실패 시 식별자는 필요 범위에서 마스킹하거나 해시로 보관한다. 비밀번호·토큰·비밀키를 저장하지 않는다. 관리자 권한은 Firebase Custom Claims 또는 서버 승인 UID 기준으로 확인하며 로컬 SQLite 값으로 판정하지 않는다.

## 4. 비용·동기화 경계

1. SQLite는 마스터·화면 데이터의 반복 조회와 미확정 조작을 로컬에서 처리한다. Firestore 읽기·쓰기와 네트워크 사용량 절감은 **실제 요청 패턴을 측정해 검증**한다. SQLite를 추가하는 것만으로 확정 세이브나 관리자 중앙 집계 비용이 없어지지는 않는다.
2. FastAPI는 `uid`, `requestId`, 저장 버전과 게임 규칙을 검증한 뒤 확정 결과를 Firestore에 기록한다. 클라이언트 SQLite의 스탯·해금·활동 횟수는 서버 판정의 근거로 신뢰하지 않는다.
3. 로컬 `pending_requests`는 전송 대기·재시도 도구다. 서버 응답을 받지 못했다고 결과가 미저장이라고 단정하지 않고 같은 요청 ID로 조회·재시도한다. 미확정 요청만으로 다음 활동이나 엔딩을 확정 표시하지 않는다.
4. 중앙 `activityDays`와 사용자 세이브의 갱신·집계 시점은 함께 설계한다. 관리자 통계는 로컬 `local_activity_log`를 읽지 않는다.
5. 브라우저 캐시 삭제·저장 공간 부족·지원되지 않는 브라우저·기기 교체를 테스트한다. 로컬 데이터 손실 후에도 서버에 확정된 진행은 다시 불러올 수 있어야 한다.

## 5. 후속 상세 설계

- 브라우저별 SQLite WASM/OPFS 동작 검증과 대체 경로
- SQLite WASM/OPFS 초기화·마이그레이션 실행 코드, 마스터 사본 생성·버전 교체 절차
- Firestore `activityDays`의 지표·문서 크기·집계 전략 및 실제 읽기/쓰기 측정
- 요청 ID, 세이브 버전, 충돌·재접속·계정 전환·삭제 계약
- Firestore 보안 규칙과 관리자 API 권한·감사로그 보존 정책

