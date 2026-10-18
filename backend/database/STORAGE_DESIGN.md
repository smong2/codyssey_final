# 플레이어 로컬 SQLite + 중앙 Firestore 저장 설계 초안

이 문서는 저장 위치와 필요한 테이블·문서 목록을 정리한다. 플레이어 로컬 SQLite의 기본 18개 테이블은 [001_initial.sql](sqlite/001_initial.sql), 캐릭터별 대화 그래프 3개 테이블은 [002_dialogue_sequences.sql](sqlite/002_dialogue_sequences.sql), 최종 Dialogue 계약용 화자·역할·표현 필드·효과는 [003_dialogue_runtime_content.sql](sqlite/003_dialogue_runtime_content.sql), 공통 Story 발생 정책·조건·역할 중복 금지는 [004_story_event_rules.sql](sqlite/004_story_event_rules.sql)에 정의했다. v4의 전체 **29개 테이블** 컬럼·키·제약은 [SQLite 상세 스키마](sqlite/SCHEMA.md)에 설명한다. Main Story 마스터 행은 [seed_dialogue_content.py](sqlite/seed_dialogue_content.py), NPC Story 마스터·발생 규칙·32인 대화는 [seed_npc_story.py](sqlite/seed_npc_story.py), Location Story 마스터·발생 규칙·선택 효과는 [seed_location_story_master.py](sqlite/seed_location_story_master.py)가 생성한다. NPC/Location 상세 매핑은 [NPC_STORY_DB_SPEC.md](NPC_STORY_DB_SPEC.md), [LOCATION_STORY_DB_SPEC.md](LOCATION_STORY_DB_SPEC.md)를 따른다. Firestore 인덱스와 동기화 API는 후속 상세 설계에서 확정한다.

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
| `dialogue_speakers` | `version + speaker_id` | 32인 외 고정 NPC·생물·텍스트 전용 화자 표시 정보 |
| `story_roles` | `version + role_id` | `ROLE:*`의 동적 storyCast/고정 화자 해석 규칙 |
| `story_role_candidates` | `version + role_id + priority` | 동적 역할의 캐릭터 후보 우선순위 |
| `story_role_exclusions` | `version + role_id + excluded_role_id` | 특정 동적 역할끼리 같은 캐릭터를 쓰지 못하게 하는 hard exclusion |
| `dialogue_sequences` | `version + story_id + step_no + character_id` | 스토리 단계·이벤트·플레이 캐릭터별 사전 작성 대화 |
| `dialogue_nodes` | 시퀀스 키 + `node_id` | 대사·이미지·선택·종료 노드 |
| `dialogue_options` | 시퀀스 키 + `choice_node_id + choice_id` | 캐릭터별 선택 문구와 상대 반응 진입점 |
| `story_choice_effects` | `version + event_id + choice_id + effect_order` | 선택별 보이는/보이지 않는 스탯·플래그 등 서버 검증용 효과 |
| `story_event_effects` | `version + event_id + effect_order` | COMPLETE/SKIP 완료 시 적용할 스토리 진행·공통 플래그 |
| `story_event_rules` | `version + event_id` | 고정/미확인 우선/가중 선택, 반복 정책, Location 일치, 제한 그룹 등 발생 정책 |
| `story_event_conditions` | `version + event_id + condition_order` | 선행 이벤트, 조우, 플래그, 활동 유형 등 추가 후보 조건 |
| `endings` | `version + ending_id` | 직업명·작가 고정 표시 정보 |
| `collectibles` | `version + collectible_type + collectible_id` | 배지·퍼즐 조각·마이룸 배경 표시 정보 |
| `unlock_conditions` | `version + condition_id` | UI 안내용 해금 조건 사본; 판정은 서버 전용 |
| `unlock_rewards` | `version + condition_id + reward_type + reward_id` | 보상 안내용 정의 |
| `local_run_cache` | `uid + slot_id` | 서버에서 마지막으로 확인한 슬롯·회차의 화면 조회 캐시와 서버 버전 |
| `local_ui_state` | `uid + state_key` | 열린 화면·선택 중인 일정 등 서버 저장 전 임시 UI 상태 |
| `pending_requests` | `uid + request_id` | 네트워크 오류 시 같은 요청 ID로 재시도할 최소 요청 정보 |
| `local_activity_log` | `uid + local_event_id` | 플레이어 화면의 최근 활동 표시용 로컬 기록; 관리자 통계 원본 아님 |

빈 SQLite DB에 001·002·003·004 마이그레이션을 순서대로 한 번씩 적용한다. 적용 후 `PRAGMA user_version = 4`이며, SQLite 연결마다 외래 키를 활성화한다. 마스터 데이터는 버전별로 적재하고 `game_data_versions.is_active`를 통해 활성 버전을 구분한다. Main seed로 캐릭터/Main 대화를 먼저 넣고, 같은 `gameDataVersion`에 NPC 3체인·32인 대화를 넣은 뒤 Location 6개 master·32인 대화를 이어서 넣는다. 현재 Story 선택 효과는 Main **40 choice / 102 effect**, NPC **24 / 64**, Location **13 / 39**로 총 **77 canonical choice / 205 story_choice_effects**이며 사용자가 선택 보상 DB 결과를 확인했다. NPC seed는 384 dialogue sequence / 768 dialogue option, Location seed는 **192 dialogue sequence / 416 dialogue option / 3616 dialogue node**를 생성한다. **Location은 2026-10-18 사용자가 실제 로컬 SQLite seed 실행 결과를 정상 확인했다.**

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

`activeRun`은 슬롯 문서 내부 필드다. `storyProgress`, `pendingStoryEvent`, `storyEventWindow`도 여기에 포함한다. 일반 UI 조회는 로컬 캐시를 사용할 수 있지만, 로그인·계정 전환·저장 충돌 후에는 서버 상태를 확인한다. 활동 중 매 프레임의 이동·조작·임시 미니게임 상태를 Firestore에 전송하지 않는다. Location Story는 활동 시작 체크포인트 저장 직후 실제 플레이 화면 전에 `pendingStoryEvent`를 저장하고, 완료 후 같은 `IN_PROGRESS` 활동으로 복귀한다. NPC Story는 활동 결과 저장 뒤 선정한다. Story의 END/SKIP 완료 트랜잭션에서 효과·진행·주간 제한 카운터를 함께 반영한 뒤 pending을 지운다. `storyEventWindow`는 NPC+Location 합계 주 2회·하루 1회와 함께 Location 전용 `locationStoryCount` 주 1회 제한을 유지한다.

### 3.2 관리자와 기간 통계

| 경로 | 내용 | 쓰기 권한 |
|---|---|---|
| `users/{uid}/activityDays/{kstDate}` | 해당 실제 KST 날짜의 활동·미니게임 결과·스토리 진행·회차 완료 요약과 관리자 집계에 필요한 최소 차원 | FastAPI |
| `analyticsDays/{kstDate}` | 전체 사용자 일별 집계의 조회용 문서. 주·월 화면은 KST 날짜들을 합산 | 서버 집계 작업 |
| `systemSettings/balance` | 5개 성장 스탯별 `rewardMultiplier`, `version`, `updatedAt`, `updatedBy` | 관리자 API |
| `adminAuditLogs/{logId}` | 관리자 로그인 성공/실패, 운영 값 변경 내역 | 관리자 API |

`activityDays`는 모든 조작을 쌓는 상세 이벤트 로그가 아니라 **하루 단위 요약**이다. 관리자 일·주·월 통계를 각 기기의 SQLite 없이 계산하기 위한 중앙 데이터다. `analyticsDays`는 재생성 가능한 파생 집계이며, 아래 계약을 구현 기준으로 사용한다. 과도한 단일 문서 갱신은 피하고 실제 사용자 규모에 맞춰 집계 방식을 검증한다. 사용자 삭제 시 해당 UID의 `activityDays`를 삭제하고 영향받는 날짜의 파생 집계를 다시 계산한다.

관리자 로그인 실패도 감사로그 대상이므로, 실패 시 식별자는 필요 범위에서 마스킹하거나 해시로 보관한다. 비밀번호·토큰·비밀키를 저장하지 않는다. 관리자 권한은 Firebase Custom Claims 또는 서버 승인 UID 기준으로 확인하며 로컬 SQLite 값으로 판정하지 않는다.

### 3.3 일별 사용자 요약 계약

`users/{uid}/activityDays/{kstDate}`의 ID와 `kstDate` 필드는 실제 확정 시각을 `Asia/Seoul`로 변환한 `YYYY-MM-DD`이며 서로 같아야 한다. 모든 `*At` 필드는 Firestore Timestamp(UTC 시각)다. 클라이언트가 보낸 날짜나 로컬 SQLite 로그는 집계 기준으로 신뢰하지 않는다.

| 필드 | 타입·의미 |
|---|---|
| `uid`, `kstDate` | 경로와 일치하는 문자열 |
| `firstActivityAt`, `lastActivityAt` | 그날 확정된 첫/마지막 게임 활동 시각; 가입·로그인만으로는 설정하지 않음 |
| `activityCounts` | `class`, `adventure`, 일반 `rest`, `special`, `forcedRest`의 확정 횟수(음수 불가). 강제휴식은 일반 휴식 누적 통계와 섞지 않음 |
| `minigame` | `playCount`, `failCount`, `successCount`, `greatCount`, `byGameId.{gameId}.{fail|success|great}`; 게임별 결과 합계가 전체 결과와 일치 |
| `story` | `mainCompletedCount`, `npcCompletedCount`, `locationCompletedCount` |
| `run` | `completedRunCount`, `firstCompletedRunUserCount`(계정 최초 완주일에만 1), `endingViewCounts.{endingId}`, `finalStatSums.{stat}`, `finalStatGte300Counts.{stat}`, `finalStatGte500Counts.{stat}` |
| `unlocks` | `newByTypeAndId.{type}.{id}`; 이 날짜에 계정에 **처음** 추가된 해금만 1회 집계. 기본 지급 항목은 제외 |
| `updatedAt` | 서버가 마지막으로 요약을 확정한 시각 |

`stat`은 `knowledge/expression/skill/exploration/magic`의 다섯 키다. `endingViewCounts`는 엔딩 화면 진입 시점이 아닌 최종 `타이틀로` 저장 성공 때 증가하며 fallback 엔딩도 포함한다. 같은 날 같은 엔딩을 두 번 완료하면 횟수 2로 저장한다. 최종 스탯 합계와 `300 이상`/`500 도달` 개수도 같은 완료 회차에서만 증가한다. 원시 대화, 선택 문구, hidden stat 수치, 이메일은 이 요약에 저장하지 않는다.

FastAPI는 확정 게임 결과·`requestId` 멱등성 확인과 같은 저장 경계에서 해당 날짜의 요약을 **함께** 갱신한다. 실패한 요청, 재전송된 동일 `requestId`, 아직 확정되지 않은 화면 조작은 카운트를 증가시키지 않는다. 회차 완료·엔딩 확인의 정확한 트랜잭션 분리는 [Firestore 스키마](SCHEMA.md)의 엔딩 저장 원칙을 따른다. 계정 탈퇴 시 요약도 UID 하위 데이터와 함께 삭제하고, 영향받은 날짜를 재집계한다.

### 3.4 전체 일별 집계와 조회 계약

`analyticsDays/{kstDate}`는 식별 정보가 없는 서버 생성 파생 문서다. 해당 날짜의 살아 있는 계정 `activityDays`를 합산해 `activeUserCount`(활동 시각이 있는 UID 수), `activityCounts`, `minigame` 결과·게임별 결과, `story` 완료 횟수, `run` 완료 횟수·최초 완주 사용자 수·엔딩별 확인 횟수·최종 스탯 합계/임계값 개수, `unlocks.newByTypeAndId`를 만든다. `newUserCount`는 `users/{uid}.createdAt`의 KST 날짜로 별도 계산하며, 이 시각은 Firebase Auth 생성 시각을 기준으로 서버가 기록한다. 이 지표는 이메일 인증 후 bootstrap된 서비스 계정만 세며 미인증 Auth-only 가입은 포함하지 않는다. 파생 문서에는 `kstDate`, `generatedAt`도 둔다. 원천 사용자 요약에 없는 이메일·UID 목록은 넣지 않는다.

게임 결과 확정 후 집계 문서를 동기 트랜잭션마다 직접 증가시키지 않는다. 서버 집계 작업이 영향 날짜를 재계산해 **교체**하며, 동시 재계산은 이전 결과가 최신 결과를 덮지 않게 직렬화하거나 원천 버전을 확인한다. 관리자 응답은 `generatedAt`을 함께 제공하여 집계 지연을 숨기지 않는다. 계정 삭제·데이터 복구 시에도 해당 날짜를 재생성한다. 집계가 없으면 0으로 단정하지 말고 재생성 또는 미집계 상태를 표시한다.

일/주/월 범위는 KST 달력 경계로 계산한다. 활동 횟수·스탯 합계·신규 사용자 수처럼 **가산 가능한 지표만** `analyticsDays`의 날짜별 값을 합산한다. 주·월의 순사용자 수는 일별 `activeUserCount` 합이 아니다. 서버가 해당 기간의 `activityDays`를 `kstDate` 범위로 collection-group 조회하고 활동 시각이 있는 UID를 중복 제거한다. 최근 7일/30일도 같은 방식이다. 사용자당 평균 완료 회차와 최종 스탯 평균·임계값 비율은 합계와 완료 사용자/회차 분모로 계산하며 일별 평균을 다시 평균하지 않는다. 현재 전체 가입·플레이·완주 사용자 수와 **현재 보유** 해금 분포는 살아 있는 계정의 `users`, `statistics/global`, `meta/progress`를 별도로 집계한다. 일별 `unlocks`는 새 획득량이며 현재 보유량으로 표시하지 않는다.

### 3.5 밸런스·감사·접근 정책

`systemSettings/balance`는 `rewardMultiplier`에 다섯 성장 스탯을 모두 가지며 각 값은 `0.5~1.0`의 `0.1` 단위다. 기본값은 모두 `1.0`; `version`은 양의 정수로 시작해 실제 변경마다 증가하며 `updatedAt`·`updatedBy`(초기화 시 `SYSTEM`, 이후 승인된 관리자 UID)를 함께 기록한다. 관리자 API는 이전값/새값/버전을 같은 변경 경계의 `adminAuditLogs/{logId}`에 남긴다. 일회성 Story 보상과 hidden stat에는 배율을 적용하지 않는다.

감사로그는 `eventType`(`ADMIN_LOGIN`/`BALANCE_CHANGE`), `occurredAt`, `result`(`SUCCESS`/`FAILURE`), 성공한 관리자 `adminUid` 또는 실패 식별자의 마스킹·해시값, 비밀정보 없는 `reasonCode`를 기본으로 한다. 로그인 시도는 확보 가능한 경우에만 IP/User-Agent를 추가하고, balance 변경은 `target`, `before`, `after`, `version`을 추가한다. 비밀번호·토큰·서비스 계정·Gemini Key는 기록하지 않는다. 로그의 운영 보존 기간은 별도 운영 결정 전까지 임의 자동 삭제하지 않는다.

브라우저와 관리자 웹은 Firebase Authentication만 직접 사용한다. Firestore 게임 상태·관리 데이터의 읽기/쓰기는 인증된 FastAPI 경유로 한정하므로 루트 [`firestore.rules`](../../firestore.rules)는 모든 Client SDK 접근을 거부한다. Firebase Admin SDK의 Rules 우회 권한을 고려해 API가 매 요청의 UID·이메일 인증·관리자 권한을 검사하고 서버 자격 증명은 최소 권한 IAM으로 관리한다. 이 초안을 실제 Firebase 프로젝트에 적용하기 전 Emulator에서 일반 사용자·관리자 Client SDK의 읽기/쓰기 거부와 서버 경유 정상 동작을 검증한다.

[`firestore.indexes.json`](../../firestore.indexes.json)은 기간 순사용자 집계에 필요한 `activityDays.kstDate` collection-group 단일 필드 인덱스만 명시한다. UID별 문서 직접 조회, `analyticsDays` 날짜 ID 범위, `endingRecords.completedAt` 단일 필드 정렬은 기본 인덱스를 사용한다. 향후 API에 복합 필터가 실제 생길 때 그 쿼리·Emulator 오류를 근거로 인덱스를 추가하며 추측으로 선행 생성하지 않는다.

## 4. 비용·동기화 경계

1. SQLite는 마스터·화면 데이터의 반복 조회와 미확정 조작을 로컬에서 처리한다. Firestore 읽기·쓰기와 네트워크 사용량 절감은 **실제 요청 패턴을 측정해 검증**한다. SQLite를 추가하는 것만으로 확정 세이브나 관리자 중앙 집계 비용이 없어지지는 않는다.
2. FastAPI는 `uid`, `requestId`, 저장 버전과 게임 규칙을 검증한 뒤 확정 결과를 Firestore에 기록한다. 클라이언트 SQLite의 스탯·해금·활동 횟수는 서버 판정의 근거로 신뢰하지 않는다.
3. 로컬 `pending_requests`는 전송 대기·재시도 도구다. 서버 응답을 받지 못했다고 결과가 미저장이라고 단정하지 않고 같은 요청 ID로 조회·재시도한다. 미확정 요청만으로 다음 활동이나 엔딩을 확정 표시하지 않는다.
4. 중앙 `activityDays`와 사용자 세이브의 갱신·집계 시점은 함께 설계한다. 관리자 통계는 로컬 `local_activity_log`를 읽지 않는다.
5. 브라우저 캐시 삭제·저장 공간 부족·지원되지 않는 브라우저·기기 교체를 테스트한다. 로컬 데이터 손실 후에도 서버에 확정된 진행은 다시 불러올 수 있어야 한다.

## 5. 후속 상세 설계

- 브라우저별 SQLite WASM/OPFS 동작 검증과 대체 경로
- SQLite WASM/OPFS 초기화·브라우저 마이그레이션 실행 코드와 Main/NPC/Location 전체 마스터 버전 생성·교체 절차. Location 32인 `dialogue_sequences/nodes/options` 변환·실제 SQLite 검증은 완료됐다.
- Firestore `activityDays`/`analyticsDays`의 실제 문서 크기·쓰기 경쟁·집계 지연·읽기 비용 측정과 필요 시 집계 작업 분할
- 요청 ID, 세이브 버전, 충돌·재접속·계정 전환·삭제 계약
- Firestore Rules의 Emulator 검증과 관리자 API 권한·감사로그 운영 보존 기간 결정

