# LUMIA Firebase · Firestore · FastAPI 구현 순서

> 목적: 현재 완료된 게임 콘텐츠/Story SQLite를 기준으로, Firebase Authentication + Cloud Firestore + FastAPI를 실제 게임 저장·대화·엔딩·관리자 기능에 연결하기 위한 **Codex 실행 순서**를 정의한다.  
> 이 문서는 구현 순서와 완료 기준을 설명하는 작업 지시서이며, 문서가 존재한다는 사실만으로 각 기능의 구현 완료를 의미하지 않는다.

---

## 1. 현재 기준 상태

### 1.1 이미 설계/제작된 것

- Firebase Authentication: Email/Password + 이메일 인증 사용 결정
- Cloud Firestore: 사용자 확정 게임 상태의 서버 권위 저장소로 사용 결정
- 사용자 Firestore 논리/물리 스키마: `backend/database/SCHEMA.md`
- SQLite/Firestore 저장 경계: `backend/database/STORAGE_DESIGN.md`
- Main/NPC/Location Story 실제 대화 및 32인 Character Set
- Story SQLite v4 스키마와 seed 코드
- Story 선택 보상: Main/NPC/Location 합계 `77 canonical choice / 205 choice effect`
- Dialogue 엔진/API 계약: `document/dialogue/01_ENGINE_API_CONTRACT.md`
- 관리자 기능 범위: `backend/admin/README.md`

### 1.2 아직 구현해야 하는 것

- Firebase Admin SDK 초기화 코드
- FastAPI 앱 실행 구조
- Firebase ID Token / `email_verified` 검증
- Firestore 사용자 초기 문서 생성
- Firestore repository / transaction / idempotency 구현
- 5개 슬롯 / ActiveRun 저장·복구
- Story 후보 판정 / Dialogue load / complete transaction
- 일정·체력·미니게임·모험 결과 API
- 수집·해금·엔딩 판정 API
- Gemini 엔딩 편지 workflow
- 관리자 회원 조회 / 기간 통계 / balance / audit API
- Phaser 엔진의 실제 API adapter 연결

### 1.3 구현 상태를 구분하는 표현

각 작업은 반드시 아래 상태를 구분한다.

```text
설계 확정
문서화 완료
코드 구현 완료
로컬 테스트 완료
Firebase Emulator 검증 완료
실제 Firebase 프로젝트 검증 완료
엔진 통합 검증 완료
```

문서나 모델만 작성된 상태를 `구현 완료`로 처리하지 않는다.

---

# 2. 전체 작업 순서

```text
0. Story/SQLite 데이터 회귀 검증
   ↓
1. Firebase/Firestore 구현 계약 마지막 확정
   ↓
2. FastAPI 프로젝트 기반 + Firebase Admin 연결
   ↓
3. 인증/계정 bootstrap API
   ↓
4. Firestore 사용자 저장 Repository + Transaction
   ↓
5. 5개 슬롯 / ActiveRun API
   ↓
6. Story 후보 선정 + Dialogue API
   ↓
7. 일정·체력·미니게임·모험 결과 API
   ↓
8. 수집·해금·엔딩 판정 API
   ↓
9. Gemini 엔딩 편지 Workflow
   ↓
10. 관리자 기록·통계·balance·audit API
   ↓
11. Phaser API adapter 통합
   ↓
12. 실제 Firebase/Render/Vercel 통합 테스트
```

**Codex에는 가능한 한 한 단계씩 맡긴다.** 여러 단계를 한 번에 구현하게 해 완료 기준이 섞이지 않도록 한다.

---

# 3. Phase 0 — Story/SQLite 데이터 회귀 검증

Firebase 구현 전에 게임 마스터 데이터가 고정되어 있는지 확인한다.

## 작업

1. 빈 개발 DB를 기준으로 migration `001 → 002 → 003 → 004` 적용 가능 여부 확인
2. 동일 `gameDataVersion`에 다음 순서로 seed
   - Main
   - NPC
   - Location
3. 통합 Story choice reward 검증
4. FK / orphan / graph reachability 검증

## 현재 기준 숫자

```text
Main     40 canonical choices / 102 effects
NPC      24 canonical choices / 64 effects
Location 13 canonical choices / 39 effects
--------------------------------------------
Total    77 canonical choices / 205 effects
```

NPC 예상:

```text
384 dialogue_sequences
768 dialogue_options
```

Location 검증 완료 기준:

```text
192 dialogue_sequences
416 dialogue_options
3616 dialogue_nodes
```

## 완료 기준

- canonical ID 불일치 없음
- SQLite `PRAGMA foreign_key_check` 오류 없음
- Main/NPC/Location seed가 같은 v4 DB에 공존
- Firebase/API 작업 중 Story 콘텐츠 구조를 다시 설계할 필요가 없는 상태

> 이 단계는 새 콘텐츠 제작 단계가 아니다. 데이터 회귀 검증만 수행한다.

---

# 4. Phase 1 — Firebase/Firestore 구현 계약 마지막 확정

`backend/database/SCHEMA.md`의 사용자 데이터 구조는 이미 기준으로 사용한다. 이 단계에서는 아직 세부값이 남아 있는 **관리 통계/운영 문서만 구현 가능한 수준으로 확정**한다.

## 4.1 사용자 문서 — 기존 계약 유지

```text
users/{uid}
├─ settings/account
├─ meta/progress
├─ statistics/global
├─ unlockState/global
├─ saveSlots/{1..5}
├─ endingRecords/{recordId}
└─ activityDays/{kstDate}
```

인증 이메일/비밀번호는 Firestore에 중복 저장하지 않는다.

## 4.2 관리자/운영 문서

```text
analyticsDays/{kstDate}
systemSettings/balance
adminAuditLogs/{logId}
```

### `activityDays/{kstDate}` 최소 필드

관리자 집계를 위한 **하루 단위 요약**으로 사용하며 상세 이벤트 로그로 만들지 않는다.

권장 최소 구조:

```text
kstDate
uid
firstActivityAt
lastActivityAt

activityCounts
  class
  adventure
  rest
  special

minigame
  playCount
  failCount
  successCount
  greatCount
  byGameId

story
  npcCompletedCount
  locationCompletedCount
  mainCompletedCount

run
  completedRunCount
  endingIds

updatedAt
```

실제 필드명은 Pydantic/Firestore 모델 작성 시 확정하되, 관리자 요구사항을 넘는 원시 대화·hidden stat 상세 로그를 추가하지 않는다.

### `analyticsDays/{kstDate}`

`activityDays`를 기반으로 재생성 가능한 파생 집계로 둔다.

최소 집계 대상:

- 가입 사용자 수
- 활동 사용자 수
- 완료 회차 수
- 수업/모험/휴식/특수 활동 횟수
- 미니게임별 FAIL/SUCCESS/GREAT
- 엔딩별 노출 수
- 필요한 해금 집계

주/월 통계는 KST 날짜의 `analyticsDays`를 합산하는 방식을 기본으로 한다.

### `systemSettings/balance`

```text
rewardMultiplier
  knowledge: 1.0
  expression: 1.0
  skill: 1.0
  exploration: 1.0
  magic: 1.0

version
updatedAt
updatedBy
```

제약:

```text
0.5 <= multiplier <= 1.0
step = 0.1
```

### `adminAuditLogs/{logId}`

필수 범위:

1. 관리자 로그인 성공/실패
2. balance 변경

비밀번호, Firebase ID Token, Gemini Key, Firebase Admin 자격 증명은 저장하지 않는다.

## 4.3 Firestore 접근 정책

현재 구조에서는 **게임 상태 변경을 FastAPI 서버 권한으로만 수행**하는 것을 기본으로 한다.

따라서 Firestore Client SDK에서 직접 사용자 세이브를 쓰게 하지 않는다.

Codex 구현 시:

- `firestore.rules`: 게임 핵심 사용자 데이터에 대한 임의 client write 차단
- `firestore.indexes.json`: 실제 조회 API가 요구하는 인덱스만 추가
- 서버 Firebase Admin SDK는 Rules 우회 권한이므로 API 내부 UID/권한 검증을 필수로 한다.

## 완료 기준

- SCHEMA/STORAGE_DESIGN과 충돌하는 새 컬렉션을 임의로 만들지 않음
- 관리자 통계 필드와 생성/갱신 책임이 코드 작성 가능한 수준으로 확정
- Firestore Rules/Index 작성 기준 확정

---

# 5. Phase 2 — FastAPI 기반과 Firebase Admin 연결

## 권장 코드 구조

현재 `backend/api/`는 README 중심이므로 다음과 같이 확장한다.

```text
backend/api/
├─ app/
│  ├─ main.py
│  ├─ config.py
│  ├─ firebase.py
│  ├─ dependencies/
│  │  ├─ auth.py
│  │  └─ admin_auth.py
│  ├─ models/
│  ├─ repositories/
│  ├─ services/
│  └─ routers/
├─ tests/
└─ requirements.txt 또는 pyproject.toml
```

구체적인 파일 분리는 Codex가 현재 코드 규모를 보고 조정할 수 있지만, **router → service → repository** 책임은 분리한다.

## 구현 항목

### 환경변수

```text
FIREBASE_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_JSON
CORS_ORIGINS
GEMINI_API_KEY
GEMINI_MODEL
GEMINI_THINKING_LEVEL
```

비밀값은 저장소에 커밋하지 않는다.

### Firebase Admin 초기화

- 서비스 계정 JSON은 환경변수에서 읽음
- 앱 프로세스에서 중복 initialize 방지
- Auth client / Firestore client 공통 제공
- 테스트에서는 emulator 또는 dependency override 가능하게 설계

### FastAPI 기본

최소:

```text
GET /health
```

CORS는 `CORS_ORIGINS` 기준 allowlist로 구성한다.

## 테스트

- 환경변수 누락 시 명확한 startup/config 오류
- Firebase 초기화 중복 없음
- `/health` 정상
- 비밀값이 로그/응답에 노출되지 않음

## 완료 기준

`FastAPI 실행 가능 + Firebase Admin client 생성 가능 + test dependency 교체 가능`

아직 계정/세이브 API가 없어도 이 단계는 완료할 수 있다.

---

# 6. Phase 3 — 인증과 계정 Bootstrap

관련 WBS: **#162 가입·로그인·인증 API**, **#163 계정 관리·탈퇴 처리**

Firebase Authentication의 가입/로그인 UI 자체는 클라이언트 Firebase SDK가 담당한다. FastAPI는 보호 API에서 Firebase ID Token을 검증한다.

## 6.1 공통 인증 dependency

Bearer Token 검증 결과 최소:

```text
uid
email_verified
firebase auth_time / token time
admin claim if needed
```

보호 API:

- invalid token → 401
- revoked token → 401
- `email_verified != true` → 403

## 6.2 최초 사용자 Bootstrap

이메일 인증 완료 후 처음 게임 API를 호출할 때 서버가 다음 기본 문서를 idempotent하게 생성한다.

```text
users/{uid}
settings/account
meta/progress
statistics/global
unlockState/global
saveSlots/1..5   # 또는 API에서 EMPTY 합성 정책을 택하면 그 정책을 명시
```

초기 해금:

```text
Characters: CH01, CH02, CH08, CH15, CH16, CH31
Pet: PET01
Room: ROOM_DEFAULT
```

초기값은 `backend/database/SCHEMA.md`를 단일 기준으로 사용한다.

## 6.3 계정 API

최소 구현 후보:

```text
GET  /v1/account/me
POST /v1/account/bootstrap
DELETE /v1/account
```

실제 route 이름은 코드에서 확정해 API README에 기록한다.

### 계정 삭제

삭제 범위:

- `users/{uid}` 이하 전체 Firestore 데이터
- Ending Records
- Activity Days
- Firebase Authentication user

파생 `analyticsDays`는 영향 날짜를 재집계할 수 있는 경로를 마련한다.

## 완료 기준

- 다른 UID 데이터 접근 불가
- 미인증 이메일 보호 API 사용 불가
- bootstrap 재호출해도 중복/초기화 없음
- 탈퇴 후 사용자 Firestore 데이터와 Auth 계정 삭제 확인

---

# 7. Phase 4 — Firestore Repository · Transaction · Idempotency

이 단계는 이후 모든 게임 API의 기반이다.

## 7.1 Pydantic Domain Model

최소 모델 단위:

```text
AccountProfile
AccountSettings
GlobalMetaProgress
GlobalStatistics
UnlockState
SaveSlot
ActiveRun
RunStatistics
NpcProgress
StoryProgress
PendingStoryEvent
StoryEventWindow
EndingRecord
ActivityDay
BalanceSettings
```

Firestore raw dict를 router에서 직접 수정하지 않는다.

## 7.2 Repository

최소 책임:

```text
UserRepository
SaveSlotRepository
EndingRepository
ActivityDayRepository
SettingsRepository
AdminAuditRepository
```

## 7.3 동시성 / 버전

게임 상태 변경 API에는 다음 개념을 둔다.

```text
requestId
expectedServerRevision
serverRevision
saveVersion
gameDataVersion
```

`requestId`는 재전송 멱등 키다.

`expectedServerRevision`이 현재 서버 상태와 다르면 클라이언트의 오래된 상태 덮어쓰기를 거부한다.

권장 오류 의미:

```text
409 REVISION_CONFLICT
409 REQUEST_ALREADY_APPLIED   # 같은 결과를 재반환할 수 있으면 재반환 우선
```

## 7.4 Transaction 원칙

다음은 Firestore Transaction/Batch의 원자 경계로 구현한다.

- 새 회차 생성
- 활동 시작 체크포인트
- 활동 결과 확정
- Story END/SKIP 완료
- 해금/메타 반영
- 엔딩 확정

## 완료 기준

- router가 Firestore 문서를 직접 조작하지 않음
- 동일 requestId 재전송으로 성장/해금/스토리 진행 중복 반영 없음
- revision conflict 검증 테스트 존재

---

# 8. Phase 5 — 5개 슬롯 · ActiveRun 저장/복구

관련 WBS: **#164 전역 메타·슬롯·회차 저장**

## API 범위

최소 의미:

```text
GET    /v1/save-slots
GET    /v1/save-slots/{slotId}
POST   /v1/save-slots/{slotId}/runs
DELETE /v1/save-slots/{slotId}
```

route naming은 구현 단계에서 확정 가능하다.

## 새 회차 생성

서버 처리:

```text
slot EMPTY 또는 RUN_COMPLETE 확인
→ character unlock 확인
→ 기본 stats + character modifier + permanent bonus
→ stamina=100
→ hiddenStats=0
→ storyCast 1회 결정
→ storyProgress 초기화
→ runStatistics 초기화
→ storyEventWindow 초기화
→ activeRun 생성
→ slot PLAYING
→ transaction commit
```

## 슬롯 삭제

삭제:

- 해당 slot ActiveRun
- slot run summary

유지:

- Global Meta
- Statistics
- Unlock
- Ending Record
- activityDays

## 복구

`ScheduleEntry.status=IN_PROGRESS`인 상태를 로드할 때 기존 저장/복구 계약에 따라 `INTERRUPTED` 처리하는 서비스 경계를 준비한다.

## 완료 기준

- 항상 5개 슬롯 상태 반환
- 슬롯 간 activeRun 혼선 없음
- 슬롯 삭제가 Global Meta를 삭제하지 않음
- 새 회차가 동일 character를 재선택할 수 있음
- storyCast가 같은 run 안에서 재추첨되지 않음

---

# 9. Phase 6 — Story 후보 선정 · Dialogue API

관련 WBS: **#166 Story·Event·Choice DB/API**, 엔진 연결 **#147**

이 단계부터 SQLite Story 마스터와 Firestore ActiveRun이 실제로 연결된다.

## 9.1 서버 Story 후보 선정

활동 결과 저장 후:

```text
현재 location/activity/result
+ activeRun.storyProgress
+ npcProgress
+ eventFlags
+ storyEventWindow
+ SQLite story_event_rules / conditions
→ eligible event 계산
→ 정책에 따라 event 선택
→ pendingStoryEvent 저장
```

핵심 제한:

```text
NPC + Location Story: 주당 최대 2회
결과 Story: 하루 최대 1회
Main Story: 위 SIDE_STORY 제한 제외
```

pending이 이미 있으면 reroll하지 않는다.

## 9.2 `loadDialogue`

계약:

```text
loadDialogue({slotId, eventId})
```

서버는:

1. 현재 uid/slot/run 확인
2. pending/Main event 권한 확인
3. protagonist Character Set 조회
4. `storyCast`로 ROLE speaker 해석
5. SQLite graph 검증
6. 엔진용 순차 payload compile
7. opaque `dialogueToken` 발급

Payload 명령:

```text
LINE
IMAGE
CHOICE
END
```

## 9.3 `completeDialogue`

```text
completeDialogue({
  dialogueToken,
  completionMode,
  selectedChoices,
  requestId,
  expectedServerRevision
})
```

`COMPLETE`:

- 실제 가능한 choice 조합 검증
- `story_choice_effects` 적용
- `story_event_effects` 적용
- stats clamp
- hidden stats 적용
- storyProgress/eventFlags/representativeChoices 반영
- storyEventWindow 반영
- pendingStoryEvent clear
- revision 증가

`SKIP`:

- Story/Event 진행 효과 적용
- Choice reward 0
- pending clear

## 완료 기준

- Main/NPC/Location 동일 compiler 사용
- ROLE이 실제 화자로 resolve됨
- client payload에 hidden reward/서버 판정값 노출하지 않음
- COMPLETE/SKIP transaction이 한 번만 적용됨
- 같은 requestId 재시도 중복 적용 없음
- API 실패 시 pending 유지

---

# 10. Phase 7 — 일정 · 체력 · 미니게임 · 모험 결과 API

관련 WBS: **#167**

## 구현 범위

- 주간 일정 확정
- 활동 시작 checkpoint
- stamina 선차감
- 미니게임 결과 검증
- 저체력 보정
- 관리자 `rewardMultiplier` 적용
- FAIL streak / assist difficulty
- 휴식 회복
- 강제휴식
- Adventure 결과
- 활동 완료 후 Story 선정 호출
- `activityDays` 일일 요약 증가

## 신뢰 경계

클라이언트가 보낸 최종 stats 값을 저장하지 않는다.

클라이언트는 **결과 데이터**를 보내고 서버가 성장량을 계산한다.

```text
baseGrowth
× rewardMultiplier
× staminaMultiplier
→ floor
→ 0..500 clamp
```

Main/NPC/Location 일회성 Story reward에는 관리자 rewardMultiplier를 적용하지 않는다.

## 완료 기준

- 체력/성장량 서버 계산
- replay된 requestId 중복 증가 없음
- Activity 결과 저장과 Story pending 선정 순서 보장
- `activityDays`와 사용자 세이브의 기준 이벤트가 일치

---

# 11. Phase 8 — 수집 · 해금 · 엔딩 판정

관련 WBS: **#168**

## 구현 범위

- 배지 획득 조건 판정
- 2/5/8 영구 보너스
- 캐릭터 해금 pending → 엔딩 시 확정
- 펫 해금
- 퍼즐 36개 비중복 지급
- 마이룸 배경 해금
- 엔딩 후보 판정
- 미노출 우선/적합도/동률 규칙
- fallback `ENDING_STARPATH_PIONEER`

## 완료 기준

- `completedConditionIds`로 보상 중복 차단
- 슬롯 삭제 후 Global Meta 유지
- fallback이 정규 10종 수집 수에 포함되지 않음
- 엔딩 판정이 Gemini 호출보다 먼저 확정됨

---

# 12. Phase 9 — Gemini 엔딩 편지 Workflow

규칙 엔진이 직업 엔딩을 먼저 확정한 뒤 실행한다.

```text
엔딩 판정
→ activeRun Long-term Play Memory 로드
→ 대표 플레이 기록 4~6개
→ 중요 선택 최대 2개
→ AI Memory Context 생성
→ Gemini 호출
→ 응답 검증
→ 실패 시 fallback
→ Ending Record 저장
→ Global Meta/회차 완료 transaction
```

AI에 전달하지 않는 것:

- 이메일
- Firebase UID가 필요하지 않다면 UID
- 비밀번호/토큰
- 전체 원시 세이브
- 관리자 정보

AI 실패가 직업 엔딩·해금·회차 완료를 막아서는 안 된다.

## 완료 기준

- 정상 Gemini 편지 저장
- timeout/API 오류/검증 실패 fallback 테스트
- 동일 엔딩 완료 요청이 편지를 중복 생성/저장하지 않음
- 완료된 Ending Record 재조회 가능

---

# 13. Phase 10 — 관리자 API

관련 범위: `backend/admin/README.md`

## 13.1 관리자 인증

Firebase ID Token 검증 후 서버 측 `admin` 권한 추가 확인.

```text
/admin/*
```

일반 사용자 token만으로 접근 불가.

## 13.2 회원·플레이 조회

- UID 검색
- 이메일 검색은 Firebase Auth Admin 조회와 연결
- 가입 시각/마지막 플레이
- 5 슬롯
- 현재 run 요약
- Global Statistics
- Unlock
- Ending Record

보이지 않는 스탯 원시값은 기본 관리자 화면에 제공하지 않는다.

## 13.3 통계

`activityDays → analyticsDays` 집계.

기간:

```text
day / week / month
```

월 경계는 KST.

## 13.4 balance

```text
GET /admin/balance
PUT/PATCH /admin/balance
```

변경 시:

```text
validate 0.5~1.0 / 0.1 step
→ version 증가
→ systemSettings/balance 저장
→ adminAuditLogs 추가
```

## 완료 기준

- 일반 사용자 접근 403
- 관리자 조회/통계/설정 동작
- balance 변경 audit 존재
- secret/token 로그 없음

---

# 14. Phase 11 — Phaser 엔진 API 통합

관련 WBS: **#147**, 통합 **#159**

엔진은 Firebase/HTTP 구현을 직접 소유하지 않는다.

기존:

```text
globalThis.lumiaEngineServices
```

에 provider를 연결한다.

필수:

```text
loadDialogue(...)
completeDialogue(...)
save/load slot 관련 service
activity result service
```

ID Token 취득, HTTP timeout/retry, 오류 변환은 adapter/provider 책임이다.

대화 엔진은 서버가 반환한 `activeRun`을 authoritative state로 적용한다.

## 완료 기준

- Main/NPC/Location 동일 DialoguePlayer
- API 오류/저장 실패 시 다음 일정 진행 차단
- pending Story 재접속 복구
- 동일 requestId 재시도
- 엔진에서 성장/hidden/unlock 직접 계산 제거

---

# 15. Phase 12 — 통합 검증 · 배포

## Firebase Emulator에서 먼저 검증

가능하면 실제 Firebase 프로젝트에 바로 쓰기 전에 다음을 Emulator Suite로 검증한다.

- Auth token dependency 테스트
- Firestore CRUD
- transaction 충돌
- idempotency
- 계정 삭제
- admin 권한
- Rules/index

## 실제 Firebase 프로젝트 검증

최소 시나리오:

```text
1. 가입
2. 이메일 인증
3. bootstrap
4. 새 슬롯 생성
5. 회차 시작
6. 일정 확정
7. 활동 결과 저장
8. NPC 또는 Location Story pending
9. Dialogue load
10. 선택 후 COMPLETE
11. 재접속 후 상태 복구
12. 52주/테스트 엔딩 트리거
13. Ending Record + Gemini/fallback
14. 관리자에서 사용자/통계 확인
15. 계정 탈퇴
```

Render 환경변수와 CORS, Vercel API base URL까지 연결한 뒤 실제 브라우저 E2E를 수행한다.

---

# 16. Codex에게 시킬 때의 작업 단위

Codex 작업은 다음 단위로 나누는 것을 권장한다.

| 순서 | Codex 작업 | 완료 후 다음 단계 |
|---:|---|---|
| 1 | Phase 0 Story DB 회귀 검증 코드/문서 점검 | Firebase 시작 |
| 2 | Phase 1 Firestore 상세 계약·Rules/Indexes 초안 | FastAPI 기반 |
| 3 | Phase 2 FastAPI + Firebase Admin 초기화 | Auth |
| 4 | Phase 3 Firebase token + account bootstrap | 저장 Repository |
| 5 | Phase 4 repository/transaction/idempotency | Slots |
| 6 | Phase 5 슬롯/ActiveRun | Dialogue |
| 7 | Phase 6 Story/Dialogue | 활동 결과 |
| 8 | Phase 7 Activity API | 해금/엔딩 |
| 9 | Phase 8 Unlock/Ending | Gemini |
| 10 | Phase 9 Gemini workflow | Admin |
| 11 | Phase 10 Admin API | Engine |
| 12 | Phase 11 Engine adapter | E2E |
| 13 | Phase 12 Firebase/Render/Vercel 통합 검증 | 제출 검증 |

**한 Codex 실행에서 최대 1~2 Phase만 처리하는 것을 기본으로 한다.**

---

# 17. Codex 공통 작업 지시 템플릿

아래 형식을 각 단계에서 사용할 수 있다.

```text
현재 작업공간은 ~/codyssey/final_rumia 이다.

먼저 다음 문서를 읽고 현재 코드/문서 상태를 확인해라.
- AGENTS.md
- document_for_ai/00_READ_FIRST.md
- document_for_ai/06_WORKSPACE_RULES.md
- backend/FIREBASE_API_IMPLEMENTATION_PLAN.md
- backend/README.md
- backend/database/SCHEMA.md
- backend/database/STORAGE_DESIGN.md
- backend/api/README.md

이번 작업 범위는 FIREBASE_API_IMPLEMENTATION_PLAN.md의 Phase N만이다.
다음 Phase를 선행 구현하거나 prototype/, lumia/를 수정하지 마라.
기존 unrelated diff를 보존해라.

작업 전:
1. 현재 구현 상태를 조사한다.
2. 이번 Phase에서 수정할 파일과 구현 순서를 짧게 보고한다.
3. 문서에 이미 확정된 계약을 임의 변경하지 않는다.

작업 후:
1. 코드/구성 파일을 검증한다.
2. 가능한 자동 테스트를 실행한다.
3. 실행하지 못한 테스트는 명확히 구분한다.
4. 설계 확정 / 구현 완료 / 테스트 완료를 구분해 보고한다.
5. 다음 Phase로 넘어가기 전에 남은 blocker를 정리한다.
```

---

# 18. GitHub WBS 연결

현재 구현 순서와 직접 연결되는 주요 이슈:

```text
#219 Firestore DB 설계 확정·검증            → 설계 기준 문서
#162 가입·로그인·인증 API                  → Phase 3
#163 본인 계정 관리·탈퇴                   → Phase 3
#164 전역 메타·슬롯·회차 저장             → Phase 4~5
#166 스토리·이벤트·선택 결과 DB/API        → Phase 6
#167 일정·스탯·장소 게임 결과 API         → Phase 7
#168 수집·해금·엔딩 판정 API               → Phase 8
#147 대화·선택·스토리 장면 실행           → Phase 11
#159 계정·저장·API·엔딩 연결              → Phase 11~12
```

관리자 관련 WBS는 Phase 10에서 실제 범위와 다시 대조한다.

이 문서를 작성했다고 위 구현 이슈를 `작업완료`로 처리하지 않는다. 실제 코드와 테스트 증거를 기준으로 각 이슈 상태를 갱신한다.

---

# 19. 최종 완료 조건

Firebase/API 계층은 최소 다음이 실제로 검증되어야 완료로 본다.

- Firebase Email/Password 인증 사용자 식별
- 이메일 미인증 사용자 보호 API 차단
- 5개 슬롯 생성/조회/삭제/복구
- ActiveRun stable checkpoint 저장
- requestId 멱등성
- serverRevision 충돌 방지
- Story candidate / pendingStoryEvent
- Main/NPC/Location Dialogue load/complete
- Story reward 서버 적용
- 일정/체력/미니게임/모험 결과 서버 적용
- Global Meta/Unlock 처리
- 규칙 기반 엔딩 판정
- Gemini 정상/fallback 편지
- Ending Record 저장
- 관리자 회원 조회/통계/balance/audit
- 계정 탈퇴 전체 삭제
- Phaser 엔진 API 통합
- 실제 Firebase 프로젝트 + Render/Vercel 환경의 E2E 검증

이 상태가 되어야 `Firebase DB가 있다`가 아니라 **LUMIA의 서버 권위 게임 상태와 API가 실제로 동작한다**고 판단한다.
