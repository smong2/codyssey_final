# API

API 서버 코드와 계약을 두는 공간입니다.

- 언어/프레임워크: **Python + FastAPI**
- 배포: **Render Web Service**
- 인증: Firebase Authentication에서 발급한 ID Token 검증
- 계정 정책: Email/Password 가입 후 이메일 인증 완료 사용자만 보호 API 사용
- 데이터: Cloud Firestore(계정별 확정 상태·관리자 데이터). 플레이어 브라우저의 로컬 SQLite는 서버 DB가 아니며 [저장 경계](../database/STORAGE_DESIGN.md)를 참조
- 생성형 AI: Gemini API. 기본 모델 `gemini-3.8-flash`, `GEMINI_MODEL` 환경변수로 교체

FastAPI는 저장·회차·해금·엔딩 판정처럼 신뢰해야 하는 게임 규칙을 처리하고, 엔딩 직업 확정 후 Gemini에 개인화 편지 생성을 요청합니다.

대화 기능은 팀에서 확정한 [대화 시스템 안내](../../document/dialogue/README.md)와 [Dialogue API · Engine 계약](../../document/dialogue/01_ENGINE_API_CONTRACT.md)을 따른다. 대화 마스터는 FastAPI가 접근 가능한 서버 측 콘텐츠 저장소에서 읽고, 현재 플레이 캐릭터·`storyCast`·자원 경로·스킵 가능 여부를 해석해 엔진용 `LINE / IMAGE / CHOICE / END` 순차 payload로 변환한다. 선택 보상은 payload에 노출하지 않고 `completeDialogue` 시 서버가 검증·계산·저장한다. 실제 HTTP endpoint 경로와 인증/오류 코드는 구현 단계에서 이 계약을 유지하는 범위로 확정한다.

## Phase 2–3 실행 기반

`app/main.py`는 `/health`와 Firebase Admin 초기화를 제공한다. 인증·계정·일부 게임 API는 코드 및 오프라인 테스트까지만 구현했으며, 실제 Firebase 프로젝트 검증은 아직 완료되지 않았다. 실행 전 `requirements.txt`를 설치하고 다음 서버 환경변수를 설정한다.

| 변수 | Phase 2 동작 |
|---|---|
| `FIREBASE_PROJECT_ID` | 필수. 서비스 계정의 `project_id`와 일치해야 함 |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 필수. 서비스 계정 JSON 원문을 비밀 환경변수로 주입; 파일·로그·Git에 저장하지 않음 |
| `CORS_ORIGINS` | 쉼표로 구분한 정확한 `http(s)://host[:port]` 목록. 비어 있으면 교차 출처 요청을 허용하지 않음. `*` 금지 |
| `GEMINI_API_KEY` | Phase 9 엔딩 편지 생성에 사용. 미설정/호출 실패 시 검수된 서버 fallback 편지 사용 |
| `GEMINI_MODEL` / `GEMINI_THINKING_LEVEL` | Phase 9 Gemini 호출 설정. 기본값 `gemini-3.8-flash` / `low` |
| `CONTENT_SQLITE_PATH` | 서버가 읽을 SQLite 마스터 파일. 미설정 시 `backend/database/sqlite/lumia-content.sqlite3` |
| `DIALOGUE_TOKEN_SECRET` | Dialogue 완료 토큰 서명용 서버 비밀값. 32자 이상으로 설정하고 클라이언트에 노출하지 않음 |

저장소 루트에서 실행한다.

```sh
python3.13 -m venv backend/api/.venv
backend/api/.venv/bin/pip install -r backend/api/requirements.txt
backend/api/.venv/bin/uvicorn backend.api.app.main:app --host 127.0.0.1 --port 8000
```

`/health`의 `{"status":"ok"}`는 앱 초기화 확인용이며 Firebase 네트워크 연결·권한 또는 Firestore 읽기/쓰기 성공을 증명하지 않는다. Firebase 앱은 프로세스 안에서 재사용하고, 환경변수/인증서 오류는 비밀값을 포함하지 않는 메시지로 startup을 중단한다. 서버 자격 증명이나 Gemini 키를 프론트의 `VITE_*` 변수에 넣지 않는다.

## Phase 3 계정 API

보호 API는 `Authorization: Bearer <Firebase ID Token>`을 요구하고, 서버가 서명·폐기 여부와 `email_verified`를 확인한다. UID는 토큰에서만 가져오며 요청 경로/본문의 UID를 신뢰하지 않는다. 토큰 오류는 401, 이메일 미인증은 403이다.

| 경로 | 동작 |
|---|---|
| `POST /v1/account/bootstrap` | JSON `{ "privacyConsentAccepted": true, "privacyConsentVersion": "2026-10-15" }`. Firebase Auth의 인증 완료 계정만 자기 UID 아래 초기 문서 10개를 원자적 batch create한다. 기존 계정 재호출은 세이브를 덮어쓰지 않고 `created: false`를 반환한다. |
| `GET /v1/account/me` | 자기 계정의 최소 메타만 반환한다. 미초기화는 404다. |
| `GET /v1/account/settings` | 계정 전역 `activePetId / activeRoomBackgroundId / locale`을 반환한다. 슬롯별 설정으로 복제하지 않는다. |
| `PATCH /v1/account/settings` | `activePetId` 또는 `activeRoomBackgroundId` 일부 변경. 서버가 현재 계정의 해금 목록에 포함된 ID만 허용하며 펫은 `PET01~PET10`, 마이룸 배경은 `ROOM_DEFAULT / ROOM_01~03`만 받는다. |
| `DELETE /v1/account` | JSON `{ "confirm": true }`와 최근 5분 내 재인증된 ID Token을 요구한다. 자기 UID 하위 문서, Auth 계정을 삭제한다. |

초기 슬롯 5개는 실제 `EMPTY` 문서로 생성한다. 초기 `gameDataVersion`은 현재 SQLite seed의 `dev-dialogue-v1`이며, 마스터 버전 운영 정책은 슬롯 API 단계에서 재확인한다. 탈퇴 시 영향받는 KST 날짜의 `analyticsDays` 파생 문서를 먼저 제거해 오래된 집계가 표시되지 않게 한다. 일별 집계 재생성 작업은 관리자 통계 단계에서 연결해야 한다. Firestore와 Firebase Auth 간 분산 트랜잭션은 없으므로, Auth 삭제 전 오류가 나면 `deletionPending` 표시를 유지해 재인증 후 재시도한다. Auth 삭제 후 마지막 Firestore 루트 삭제가 실패하는 경우에는 운영자 정리가 필요하다. 이 경계는 실제 Firebase Emulator/프로젝트에서 추가 검증해야 한다.

## Phase 4 저장 Repository

`app/repositories.py`가 UID 하위의 계정 문서와 슬롯 변경을 담당한다. Router는 Firestore 원시 문서를 직접 읽거나 쓰지 않는다. 초기 슬롯의 `serverRevision`은 0이며, 이 필드가 없는 과거 슬롯은 0으로 읽고 첫 정상 저장 때 기록한다. `SaveSlotRepository.apply`는 게임 API가 재사용할 내부 경계이고 아직 별도 HTTP 게임 경로는 열지 않았다.

변경 요청은 `requestId`, `expectedServerRevision`, 작업 종류와 명령 내용을 받는다. 한 트랜잭션에서 계정 삭제 표식·슬롯·필요한 추가 사용자 문서·`users/{uid}/requestReceipts/{sha256(requestId)}`를 읽은 뒤, 슬롯/추가 문서와 처리 영수증을 함께 기록한다. 같은 `requestId`와 명령을 다시 보내면 저장을 반복하지 않고 이전 revision을 반환한다. 같은 ID로 다른 명령을 보내면 `RequestIdReused`, 새 요청의 예상 revision이 다르면 `RevisionConflict`가 난다. 클라이언트에는 다음 슬롯 API 단계에서 각각 409로 매핑한다. 영수증에는 원문 requestId나 요청 본문을 저장하지 않고 해시와 최소 결과만 저장한다. 추가 문서의 모든 읽기는 쓰기 전에 수행하고, 변경 계산 함수는 Firestore의 트랜잭션 재시도를 고려해 외부 부작용 없이 작성해야 한다.

`app/models.py`는 계정 기본 문서와 슬롯의 Pydantic 검증 모델을 제공한다. ActiveRun·엔딩·관리자 모델은 해당 API 단계에서 구체화한다. 트랜잭션/멱등성 검증은 모의 Firestore 기반 로컬 테스트이며 Firebase Emulator와 실제 프로젝트 검증을 대신하지 않는다.

테스트는 `requirements-dev.txt` 설치 후 `backend/api/.venv/bin/python -m pytest backend/api/tests`로 실행한다. 테스트는 Firebase 초기화 대체 함수와 FastAPI dependency override를 사용하므로 실제 서비스 계정 키가 필요 없다. 실제 Firebase/Render/Vercel 연결은 후속 단계에서 진행한다.

## Phase 5 저장 슬롯·회차 API

| 경로 | 동작 |
|---|---|
| `GET /v1/save-slots` | 1~5번을 항상 반환한다. 누락·손상 슬롯은 `LOAD_ERROR`로 표시하며 `EMPTY`로 오인하지 않는다. |
| `GET /v1/save-slots/{slot_id}` | 해당 슬롯과 `recoveryRequired`를 조회한다. 조회만으로 저장 상태를 바꾸지 않는다. |
| `POST /v1/save-slots/{slot_id}/runs` | `{requestId, expectedServerRevision, characterId}`. 비어 있는 슬롯은 첫 번째 빈 슬롯만 사용하고, 완료 슬롯은 다음 회차를 시작할 수 있다. |
| `POST /v1/save-slots/{slot_id}/recover` | `{requestId, expectedServerRevision}`. 단일 `IN_PROGRESS` 활동을 `INTERRUPTED`로 저장한 뒤 마이룸 복귀 경계에 둔다. 체력 소비는 유지하고 보상·실패 카운터는 추가하지 않는다. |
| `DELETE /v1/save-slots/{slot_id}` | `{confirm: true, requestId, expectedServerRevision}`. 해당 슬롯만 초기화하며 계정 전역 메타·통계·해금·엔딩 기록은 보존한다. |

새 회차의 캐릭터 해금, 시작 스탯(기본 50 + 캐릭터 보정 + 영구 보너스), `storyCast`, 주간/스토리 카운터는 서버가 계산한다. `storyCast`는 회차 생성 시 한 번 저장하고 조회·복구에서 다시 추첨하지 않는다. 정상 시작은 MS01 진입 전 저장을 완료한다. 모든 변경은 Phase 4의 UID별 request receipt와 slot revision 트랜잭션을 사용한다. 충돌은 409이며 동일 명령 재전송은 `replayed: true`를 반환한다. 이 코드는 로컬 모의 Firestore에서 검증했으며 Firebase Emulator/실제 프로젝트와 클라이언트 연결은 아직 검증하지 않았다.

SQLite 파일은 `.gitignore` 대상이므로 Render의 새 빌드 환경에는 자동으로 존재하지 않는다. 서버를 시작하기 전에 저장소 루트에서 다음 순서로 버전 `dev-dialogue-v1` 마스터를 생성·검증하고, 결과 파일을 `CONTENT_SQLITE_PATH`로 지정해야 한다. 파일이 없거나 캐스팅 데이터가 불완전하면 새 회차 생성은 503으로 실패하며 임의 기본값으로 진행하지 않는다.

```sh
python3 backend/database/sqlite/seed_dialogue_content.py --migrate --version dev-dialogue-v1
python3 backend/database/sqlite/seed_npc_story.py --migrate --version dev-dialogue-v1
python3 backend/database/sqlite/seed_location_story_master.py --migrate --version dev-dialogue-v1
python3 backend/database/sqlite/seed_activities.py --version dev-dialogue-v1
```

## Phase 6 Story 후보·Dialogue API

`app/story_candidates.py`는 서버가 확정한 활동 결과를 받는 내부 후보 선정기다. Main 고정 일정 우선, 기존 pending 유지, NPC/Location 주당 2회·하루 1회, 주차·장소·선행 이벤트·NPC 조우·체인 단계 조건을 검사한다. NPC 가중치는 기본/장소/진행 중/메인 직접 연관/최근 미등장 보정을 사용하며, 동일 입력에서 결과가 재추첨되지 않도록 안정적인 회차·활동 식별자로 결정한다. 이 모듈은 클라이언트가 임의 활동을 보내 Story를 뽑는 공개 endpoint가 아니다. Phase 7의 **활동 결과 저장 트랜잭션 안에서** 호출해 pending을 함께 저장해야 한다.

| 경로 | 동작 |
|---|---|
| `GET /v1/save-slots/{slot_id}/dialogue/{event_id}` | 현재 pending 이벤트와 32인 원고를 확인해 `LINE/IMAGE/CHOICE/END` 순차 payload, 실제 배역 화자, `canSkip`, 서명된 `dialogueToken`을 반환한다. 선택 보상은 노출하지 않는다. |
| `POST /v1/dialogue/complete` | `{dialogueToken, completionMode, selectedChoices, requestId, expectedServerRevision}`. 순서대로 가능한 선택만 받고 효과·Story 진행·pending 해제를 한 슬롯 트랜잭션에 저장한다. 같은 요청은 중복 적용하지 않는다. |

현재 스킵 운영 기본값은 계정 전역 `seenEndingIds`가 있는 경우에만 허용하는 `AFTER_FIRST_ENDING`이다. `ALWAYS/NEVER` 관리자 설정 연동은 관리자 API 단계에 남아 있다. `COMPLETE`는 0~500 보이는 스탯과 0~300 보이지 않는 스탯 상한을 적용하고, 결과 UI에는 **실제로 증가한 보이는 스탯 합계만** 반환한다. `SKIP`은 진행만 확정하고 선택 보상은 적용하지 않는다. 토큰 만료는 6시간이며 만료 후 같은 pending 이벤트를 다시 조회할 수 있다.

실제 파일이 있는 배경·캐릭터 이미지는 API의 `/world-assets/`, `/character-assets/`에서 제공한다. `ART-M/L/N`은 현재 제작 식별자이지 배포 가능한 파일명이 아니므로 해당 장면은 503으로 차단한다. 임의 그림으로 대체하지 않는다. 수업·특수활동·모험 결과 저장 뒤 Story 후보를 같은 transaction 경계에서 선정하는 서버 연결은 Phase 7 코드에 반영돼 있다. 엔진 provider/공통 Dialogue 세션 연결은 Phase 11 코드에 반영했으며, Render/Vercel 간 이미지 URL 라우팅·미제작 아트 인계와 Firebase Emulator/실제 서비스 검증은 아직 남아 있다. 현재 검증 기반은 SQLite 마스터와 모의 Firestore 오프라인 테스트다.

## Phase 7: 일정·활동 체크포인트·결과 API (수업 리플레이 & 모험)

| 경로 | 동작 |
|---|---|
| `POST /v1/save-slots/{slot_id}/schedule` | `{requestId, expectedServerRevision, activityIds}`. 월~금 순서의 5칸을 확정한다. 강제휴식으로 잠긴 앞쪽 평일은 `null`로 보내고, 나머지는 SQLite 마스터의 활동 ID를 사용한다. Main Story·주간 요약 pending 중에는 거부한다. |
| `POST /v1/save-slots/{slot_id}/activities/start` | `{requestId, expectedServerRevision}`. 오늘 일정을 `IN_PROGRESS`로 저장하고 수업 10·모험 15 체력을 선차감한다. 하루 시작 체력이 0~9이거나 강제휴식 잔여일이 있으면 기존 일정을 잠긴 강제휴식으로 교체한다. 수업이면 저장 스탯과 실패 연속 횟수로 보상/플레이 난이도를 구분해 돌려주고, 정식 6종에는 서버 생성 `seed`, `maxDurationMs`, `replayVersion`, `replaySupported`를 체크포인트와 응답에 고정한다. 모험이면 서버가 저장 탐험 스탯으로 `adventureDifficulty / targetCount / durationSeconds`를 확정하고 `missionId / seed`와 함께 체크포인트에 저장한다. 현재 `201~350` 어려움 구간의 검수된 3개 모험 master는 목표 수 3개를 사용한다. |
| `POST /v1/save-slots/{slot_id}/activities/complete-rest` | `{requestId, expectedServerRevision}`. 시작된 일반 휴식만 서버가 `+40/+50/+70` 중 하나로 판정한다. 슬롯·전역 휴식 통계·실제 KST 날짜의 `activityDays`를 같은 트랜잭션으로 확정하고 다음 평일로 이동한다. 금요일은 주말 처리 대기 상태에 둔다. |
| `POST /v1/save-slots/{slot_id}/activities/complete-special` | `{requestId, expectedServerRevision, skip, transfer}`. 시작된 요정의 거래를 건너뛰거나 `transfer: {fromStat, toStat, amount}`로 서로 다른 성장 스탯 사이의 1~5점을 이전한다. 서버가 잔여량·500 상한을 검증하고 슬롯·KST 일별 요약·Story 후보를 함께 저장한다. |
| `POST /v1/save-slots/{slot_id}/activities/complete-forced-rest` | `{requestId, expectedServerRevision}`. 강제휴식 한 평일을 확정한다. 3번째 평일 완료 시에만 체력을 100으로 회복하며, 일별 `forcedRest` 수를 일반 휴식과 별도로 기록한다. |
| `POST /v1/save-slots/{slot_id}/activities/complete-class-quit` | `{requestId, expectedServerRevision}`. 시작된 수업의 명시적 포기를 서버가 `FAIL`로 확정한다. 저장된 난이도·시작 전 체력과 읽기 전용 `systemSettings/balance`로 성장량을 계산하고 슬롯·계정 통계·일별 요약·Story 후보를 원자적으로 저장한다. |
| `POST /v1/save-slots/{slot_id}/activities/complete-class-replay` | `{requestId, expectedServerRevision, inputLog}`. 현재 본편 수업 6종의 입력 규칙을 서버가 재생해 FAIL/SUCCESS/GREAT·보상을 계산한다. 브라우저의 outcome·score·metrics는 입력받지 않는다. 리듬 수업은 실제 서버 시작 시각에서 75초가 지나야 확정 가능하다. |
| `POST /v1/save-slots/{slot_id}/activities/complete-adventure` | `{requestId, expectedServerRevision, resolution, foundCount, targetCount}`. 온실·대서고·천문대 모험 결과를 확정한다. `targetCount`는 클라이언트 결정값이 아니라 시작 체크포인트의 서버 확정값을 되돌려 보내는 검증 필드이며 불일치하면 저장하지 않는다. `MISSION_COMPLETE`는 정상 탐험 성장을 부여하고, `TIMEOUT`은 관리자 배율·저체력 보정을 먼저 반영한 정상 성공 성장량에서 발견 비율 × 0.5를 계산하며 1개 이상 발견 시 500 상한 안에서 최소 `+1`을 보장한다. 결과 저장과 `activityDays` 증가, NPC/Location Story 후보 선정은 같은 슬롯 transaction에서 처리한다. |
| `POST /v1/save-slots/{slot_id}/weeks/close` | `{requestId, expectedServerRevision}`. 금요일과 선택된 Story의 완료를 확인하고 주간 요약을 저장한다. 현재 마스터에 주말 Story가 없을 때만 다음 월요일로 이동하며, 다음 주 Main Story를 일정 전에 pending으로 둔다. 52주차는 마지막 요약에 멈춘다. |
| `POST /v1/save-slots/{slot_id}/weeks/ack-summary` | `{requestId, expectedServerRevision}`. 저장된 요약을 확인한 뒤 다음 주 Main Story·일정 또는 52주차 엔딩 대기 상태를 연다. |

모든 변경 요청은 슬롯 revision·request receipt 트랜잭션을 사용해 재시도에서 일정·체력·결과·일별 통계를 중복 적용하지 않는다. 강제휴식은 평일 3칸을 잠그고 주말을 건너 다음 주로 이어지며 일반 휴식 통계와 분리한다. 활동 시작 기록에는 시작 전 체력·수업 난이도·실패 연속 횟수를 보존한다. 휴식 회복량은 클라이언트가 보내지 않고 서버가 트랜잭션 바깥에서 한 번 추첨한다. 특수 활동, 수업, 모험 결과에서 Story가 선정되면 해당 날짜를 유지하고 대화 완료 시 다음 평일로 이동한다. `systemSettings/balance`가 없으면 기본 배율 1.0을 적용하고, 존재하지만 값이 손상됐으면 보상 확정을 차단한다. 주간 저장은 현재 마스터에 주말 Story 규칙이 없음을 확인한 뒤에만 진행하며 미래에 규칙이 생기면 미구현 이벤트를 건너뛰지 않고 차단한다. `seed_dialogue_content.py`는 확정 `PET01~PET10` 마스터와 보정값도 SQLite에 적재하고, 모험 제한시간은 서버가 현재 계정 `activePetId`의 **탐험 보정만** 읽어 계산한다. 모험 난이도·목표 수는 기획대로 저장 `run.stats.exploration`만 사용한다. `seed_activities.py`는 수업 6·모험 3·휴식 1·요정의 거래 1을 기존 v4 DB에 추가하며 충돌 시 중단한다. **로컬 개발 DB에는 적재·무결성 확인을 완료했지만** Render의 새 빌드는 위 seed 명령을 실행해야 한다. 본편 수업 6종 서버 재생과 모험의 서버 소유 mission checkpoint·결과 검증에 대한 기존 `backend/api/tests/test_phase7_*.py` 회귀 테스트는 사용자가 로컬 `.venv`에서 성공을 확인했다. 이번 Phase 11 후속 변경의 펫 시간 보정·계정 설정 테스트는 로컬 재검증 전이며 실제 Firebase/Render/Vercel E2E 검증은 별도 통합 단계다.

`inputLog`는 최대 512개이며 각 항목의 `atMs`는 시작 후 경과 밀리초다. 서가는 `{atMs, action:"MOVE", pieceId:"A"|"B"|"C"|"H"|"D"|"E", delta:-1|1}`, `{atMs, action:"UNDO"}` 또는 `{atMs, action:"RESET"}`을 사용한다. 화분은 `{atMs, action:"POUR", fromPot:0..7, toPot:0..7}`, 룬 핀은 `{atMs, action:"FIRE"}`를 사용한다. 회로는 `{atMs, action:"ROTATE", cellIndex:0..24}`, 거울은 `{atMs, action:"TOGGLE", mirrorIndex:0..3}`, 별빛 무대는 `{atMs, action:"PRESS"|"RELEASE", lane:0..2}`를 사용한다. 별빛 무대는 빈 로그도 제한시간 후 FAIL로 판정할 수 있다. 결과 API는 서버가 저장한 시작 시각·시드·난이도·제한시간과 로그를 대조하며 원시 로그 대신 SHA-256 digest와 재생 결과만 슬롯에 보존한다. Phase 11 엔진은 정식 6종에서 이 입력 로그를 생성해 `/complete-class-replay`로 보내며, 성공/실패/성장량은 서버 재생 결과만 사용한다.

## Phase 8: 수집·해금·엔딩 판정 API

`app/progression_rules.py`는 Firestore transaction 안에서 재시도해도 같은 결과가 나오도록 I/O 없는 규칙 엔진으로 구현한다. 배지·퍼즐·펫·캐릭터 pending은 계정 전역 `meta/progress + statistics/global + unlockState/global`을 함께 읽어 판정하며 `completedConditionIds`와 실제 획득 ID로 중복 지급을 막는다. 현재 수업/모험/Dialogue 완료 경계에서 관련 통계를 갱신한 뒤 같은 transaction 안에서 progression을 평가한다. Story의 Hidden Stat **수치**는 공개하지 않지만, 선택 효과에 실제로 등장한 행동 태그의 발생 횟수는 `behaviorTagCounts`에 누적해 배지 조건에 사용한다. NPC Story는 장면 완료/스킵 시 조우 1회, 4단계 완료 시 체인 완료 1회를 누적한다.

| 경로 | 동작 |
|---|---|
| `GET /v1/collection` | 계정 전역 수집·해금 진행 상태와 통계, 아직 다음 회차에 반영되지 않은 캐릭터 pending 목록을 반환한다. 현재 회차의 raw Hidden Stat 점수는 반환하지 않는다. |
| `POST /v1/save-slots/{slot_id}/my-room/open` | `{requestId, expectedServerRevision}`. 같은 `runId + week`에는 한 번만 `myRoomActiveWeekCount`를 증가시키고 배지/해금 규칙을 다시 판정한다. |
| `POST /v1/save-slots/{slot_id}/ending/decision` | `{requestId, expectedServerRevision}`. 52주 마지막 요약까지 끝난 `ENDING_PENDING` 회차에서 규칙 엔진이 직업을 확정하고 `activeRun.endingDecision`에 저장한 뒤 `ENDING_DECIDED`로 전환한다. Gemini 호출보다 먼저 실행하며 AI가 직업을 변경할 수 없다. |

배지 세이브 ID는 기획의 안정 ID 규칙과 승인된 자원 slug를 결합해 `BADGE_{CATEGORY}_{SUBCATEGORY}_{01..08}`을 사용한다. 예: `BADGE_FOREST_COMPASS_01`, `BADGE_WORKSHOP_PUZZLE_05`. `2/8 / 5/8 / 8/8` 보상은 `BADGE_STAGE_*` condition으로 한 번만 처리하고 해당 대분류 성장 스탯의 `permanentBonuses`를 즉시 `+1`한다. 이 값은 **현재 회차 `run.stats`를 올리지 않고 다음 회차 시작값부터 적용**한다. 23개 배지 연동 캐릭터는 5/8 달성 시 `pendingCharacterUnlockIds`에만 들어가며 실제 선택 가능 전환은 엔딩 마지막 `타이틀로` 저장에서 수행한다. `CH13/CH14/CH32`와 `PET02`처럼 회차/엔딩 열람 완료에 의존하는 조건도 규칙 엔진에 정의하되 Phase 9의 최종 정산 뒤 평가한다.

마이룸 퍼즐은 추가 배경 `ROOM_01 / ROOM_02 / ROOM_03`, 각 12조각의 세이브 ID `PUZZLE_ROOM_01_01..12` 형식을 사용한다. 36개 조건은 각각 한 번만 처리하고, transaction 재시도에서 결과가 바뀌지 않도록 `uid + conditionId`와 남은 조각 집합으로 결정적 선택을 한다. 획득 조각은 중복되지 않으며 한 배경의 12조각을 모두 모으면 해당 `ROOM_*`을 영구 해금한다. 자동 적용은 하지 않는다.

직업 엔딩은 정규 10종의 대표 성장 스탯 `>=300`을 후보 게이트로 사용한다. 후보가 여러 개면 `미노출 우선 → 적합도(보조 스탯/Hidden/플레이 기록) → 동률 대표 기록 → 대표 스탯 → 결정적 난수` 순으로 정하고, 만족 후보가 모두 이미 노출됐다면 후보 전체에서 결정적 난수로 하나를 고른다. 정규 후보가 없으면 `ENDING_STARPATH_PIONEER`를 저장한다. 여기서의 결정적 난수는 Firestore transaction 재시도 안전성을 위한 서버 선택 방식이며 플레이어에게 점수·Hidden 수치를 노출하지 않는다. Phase 8의 결정 단계에서는 `seenEndingIds`, `endingViewCounts`, `totalCompletedRuns`, `RUN_COMPLETE`, Ending Record를 아직 확정하지 않는다. 이 정산과 pending 캐릭터 승격은 Phase 9의 편지 저장/`타이틀로` 성공 경계에서 한 번만 처리한다.

`locationDiscoveryCount`는 현재 `MISSION_COMPLETE` 모험에서 1회 증가시킨다. 반면 `특별 아이템·발견물`은 기획상 콘텐츠 마스터가 통계 대상으로 지정한 발견만 세어야 하며 현재 SQLite 활동 마스터에는 그 지정 필드가 없으므로 임의 증가시키지 않는다. 따라서 `totalSpecialItemDiscoveryCount`를 사용하는 배지/엔딩 동률 기록은 규칙 엔진은 지원하지만 실제 증가원은 콘텐츠 마스터 확장 후 연결해야 한다.

## Phase 9: Long-term Play Memory · Gemini 엔딩 편지 · 회차 최종 정산

Phase 9는 Phase 8의 `ENDING_DECIDED` 직업을 입력으로 사용하며 **Gemini가 직업을 다시 고르거나 변경하지 않는다.** 현재 회차 `activeRun`에 여러 주차에 걸쳐 누적된 `runStatistics`, 최종 스탯, Hidden 상위 태그, 중요 선택을 다시 읽어 AI Memory Context를 만든다. 대표 플레이 기록은 직업별 우선 기록을 먼저 고려한 뒤 공통 기록을 채워 `4~6개`, 중요 선택은 최신 주차 우선 `최대 2개`만 사용한다. 중요 선택은 SQLite `story_choices.summary_text`에 사람이 검수한 사실 요약이 있을 때만 AI 입력에 넣으며 플레이어 대사만 보고 서버가 의미를 추측하지 않는다. 현재 Main의 중요 선택 `MS05_S3_TELL_ALL / MS05_S3_TELL_CLOSE`에는 기존 기획 원문인 `확인한 사실을 모두에게 먼저 알린다 / 가까운 친구부터 차례로 알린다`를 seed `summary_text`로 적재한다.

| 경로 | 동작 |
|---|---|
| `POST /v1/save-slots/{slot_id}/ending/prepare` | `{requestId, expectedServerRevision}`. `ENDING_DECIDED`에서 Long-term Play Memory를 구성하고 Gemini 편지를 최대 2회 생성·검증한다. provider 오류·timeout·JSON/문구 검증 실패가 계속되면 서버 fallback 편지를 사용한다. 성공 결과를 `activeRun.endingPrepared`에 먼저 안전 저장하고 `ENDING_READY`로 전환한다. 이미 준비된 엔딩의 재호출은 저장된 결과를 반환하며 Gemini를 다시 호출하지 않는다. |
| `GET /v1/save-slots/{slot_id}/ending` | `ENDING_READY` 상태의 저장된 직업·편지·아르카디아 기록을 재조회한다. 재접속 시 AI를 재호출하지 않는다. raw Hidden 점수, prompt, UID, 이메일, provider 내부정보는 반환하지 않는다. |
| `POST /v1/save-slots/{slot_id}/ending/finish` | `{requestId, expectedServerRevision, recordId}`. 화면의 마지막 `타이틀로` 성공 경계다. Ending Record 생성, `totalCompletedRuns`, 캐릭터 플레이 횟수, 엔딩 열람 횟수, 정규 `seenEndingIds`, completion 기반 펫/캐릭터 조건, pending 캐릭터 승격, `activityDays.run`, 슬롯 `RUN_COMPLETE`를 한 transaction으로 확정한다. 같은 요청 재전송은 activeRun이 이미 삭제된 뒤에도 receipt로 replay된다. |
| `GET /v1/ending-records/{record_id}` | 현재 UID의 완료 회차 Ending Record를 읽는다. 최종 편지, 사용한 4~6개 기록, 검수된 대표 선택, 최종 보이는 스탯, Hidden dominant ID만 보존·반환한다. raw Hidden 점수는 기록 조회에 노출하지 않는다. |

Gemini 요청은 Render 서버의 `GEMINI_API_KEY`만 사용하고 클라이언트로 키를 전달하지 않는다. 현재 REST 경계는 `generateContent`와 JSON 응답을 사용하고 `System Instruction`에 어린이 대상 표현, 사실 기반 개인화, 직업 변경 금지, 심리·성격·진로 단정 금지, `무엇을 지켰니?`의 정답 대리 금지, raw 스탯 숫자 노출 금지를 고정한다. 응답은 서버가 길이·캐릭터명·직업명·서명·금지 표현을 다시 검증한다. 정상 Gemini 응답 여부와 관계없이 AI 실패가 회차 완료를 막지 않도록 검수된 fallback 편지가 항상 준비돼 있다.

편지를 저장하는 `ending/prepare`와 실제 열람 완료를 확정하는 `ending/finish`는 분리한다. 따라서 편지 표시 도중 종료하면 같은 저장 편지를 처음부터 다시 보여 주며 `seenEndingIds`, `endingViewCounts`, `totalCompletedRuns`, `RUN_COMPLETE`, completion 의존 해금은 증가하지 않는다. `ending/finish` 성공 시에만 이 값들을 한 번 반영한다. fallback `ENDING_STARPATH_PIONEER`는 `endingViewCounts`에는 포함하지만 정규 엔딩 수와 `seenEndingIds`에는 포함하지 않는다. Phase 11 엔진은 `ENDING_PENDING → 결정 → 준비 → 편지 → finish`를 이 API에 연결하고, `ENDING_READY` 재접속에서는 `GET .../ending`으로 저장 편지를 다시 읽어 Gemini를 재호출하지 않는다. `ending/prepare`는 생성형 API 특성상 일반 요청보다 긴 클라이언트 timeout을 사용하되 자동 중복 재전송은 하지 않고 동일 `requestId`의 명시적 저장 재시도로 복구한다. Phase 9의 모의 Firestore·주입식 Gemini generator 회귀 테스트는 사용자가 로컬 `.venv`에서 성공을 확인했다. 이번 엔진 엔딩 UI 통합 테스트는 로컬 재검증 전이며 실제 Gemini API 호출과 Firebase 프로젝트 검증은 별도 통합 검증 단계다.

## Phase 10: 관리자 기록·통계·balance·audit API

관리자 API는 `/admin/*`로 분리하고 Firebase ID Token의 서버 검증 뒤 `admin=true` Custom Claim을 추가 확인한다. 일반 이메일 인증 사용자는 정상 게임 API를 사용할 수 있어도 관리자 API는 403이다. 관리자 계정 발급·Custom Claim 부여 자체는 Firebase 운영 절차이며 게임 클라이언트나 이 API에서 관리자 권한을 만들거나 변경하지 않는다.

| 경로 | 동작 |
|---|---|
| `POST /admin/session` | 관리자 콘솔 진입용 권한 확인. 성공/실패를 `adminAuditLogs`에 `ADMIN_LOGIN`으로 기록하며 비밀번호·ID Token·비밀키는 저장하지 않는다. 비관리자 UID는 원문 대신 SHA-256 식별값만 남긴다. |
| `GET /admin/users` | 최대 50명 목록 또는 `query`의 정확한 UID/이메일 검색. 이메일은 Firebase Auth Admin 조회에서만 가져오며 Firestore에 복제하지 않는다. |
| `GET /admin/users/{uid}` | 가입/마지막 플레이, 5개 슬롯, 현재 회차의 보이는 스탯·주차·통계, Global Statistics, 해금/수집, 완료 Ending Record와 편지를 읽기 전용으로 반환한다. 현재 회차 raw Hidden Stat과 전체 대화 원문은 반환하지 않는다. |
| `POST /admin/analytics/rebuild` | `{period: day|week|month, anchor}`. KST 기간의 `users/*/activityDays/{date}`를 다시 합산해 식별정보 없는 `analyticsDays/{date}`를 교체 생성한다. 월 집계도 KST 달력 월을 사용한다. |
| `GET /admin/analytics` | 저장된 `analyticsDays`를 일/주/월로 합산한다. 빠진 날짜는 0으로 가장하지 않고 `complete=false + missingDates`로 표시한다. 기간 순사용자는 일별 active 합이 아니라 UID를 기간 전체에서 중복 제거해 계산한다. |
| `GET /admin/balance` | `systemSettings/balance`를 읽는다. 문서가 없으면 5개 성장 스탯 모두 1.0, version 0의 운영 기본값을 표시한다. |
| `PATCH /admin/balance` | 일부 또는 전체 `rewardMultiplier`를 0.5~1.0, 0.1 단위로 변경한다. version 증가와 `BALANCE_CHANGE` 감사로그를 같은 Firestore transaction에 기록한다. |

일별/기간 통계는 수업·모험·휴식·특수/강제휴식, 미니게임 FAIL/SUCCESS/GREAT 및 게임별 성공률, Main/NPC/Location Story 완료, 회차 완료/엔딩 분포, 최종 스탯 평균과 `>=300`/`500` 비율, 신규 해금을 집계한다. 현재 계정 스냅샷에는 전체/플레이/완주 사용자 수, 사용자당 평균 완료 회차, 최근 7/30일 순활성 사용자, 캐릭터·펫·배지·마이룸 배경 현재 보유 분포를 별도로 계산한다. 사용자별 스탯·세이브·해금 수정, 콘텐츠 CRUD, Gemini Key 관리 UI는 구현하지 않는다.

Phase 10 오프라인 테스트는 관리자/일반 사용자 권한 분리, 로그인 감사 개인정보 경계, UID/이메일 사용자 조회, Hidden 원시값 비노출, KST 월 집계의 순사용자 dedupe, balance step/version/audit 원자성을 검증한다. 현재 코드는 **구현 및 테스트 작성 완료 / 사용자의 로컬 pytest 재검증 전**이며 실제 Firebase Custom Claim, Firestore transaction, 배포된 관리자 콘솔과의 통합 검증은 Phase 12까지 남아 있다.
