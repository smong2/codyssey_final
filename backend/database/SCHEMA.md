# LUMIA Firestore 사용자 데이터 스키마

이 문서는 LUMIA 백엔드의 사용자 데이터 저장 구조를 정의합니다. 인증은 Firebase Authentication이 담당하고, 사용자별 게임 상태는 Cloud Firestore에 저장합니다.

문서는 **논리 스키마(Logical Schema)** 와 **물리 스키마(Physical Schema)** 를 분리해 설명합니다.

---

# 1. 설계 원칙

## 1.1 인증과 게임 데이터 분리

- Email/Password 인증은 Firebase Authentication에서 처리합니다.
- Firestore에는 사용자 비밀번호를 저장하지 않습니다.
- Firestore 사용자 데이터의 기준 키는 Firebase Authentication의 `uid`입니다.

## 1.2 계정 전역 데이터와 회차 데이터를 분리

LUMIA는 한 계정에 최대 5개의 세이브 슬롯을 제공하며, 해금/수집/누적 기록은 모든 슬롯이 공유합니다.

```text
Account
├─ Account Profile
├─ Account Settings
├─ Global Meta Progress
├─ Global Statistics
├─ Unlock State
├─ Save Slots (최대 5개)
│  └─ Active Run
└─ Ending Records
```

## 1.3 사용자 상태와 마스터 데이터 분리

다음과 같은 게임 정의 데이터는 사용자 문서에 복사하지 않는 것을 기본으로 합니다.

- 캐릭터 기본 스탯과 보정값
- 펫 스탯 보정값
- 배지 정의와 획득 조건
- 퍼즐 보상 조건
- 엔딩 판정 조건
- 스토리/이벤트 마스터 데이터

이 데이터는 Git에서 관리되는 코드/JSON/문서 등 마스터 데이터에서 조회합니다.

## 1.4 증가하는 히스토리는 별도 문서로 분리

엔딩 기록처럼 계속 누적될 수 있는 데이터는 `users/{uid}` 한 문서에 배열로 계속 추가하지 않고 subcollection으로 분리합니다.

## 1.5 버전 필드 유지

세이브 구조와 게임 규칙 변경에 대비해 다음 버전을 구분합니다.

- `schemaVersion`: Firestore 문서 구조 버전
- `saveVersion`: 세이브 데이터 구조 버전
- `gameDataVersion`: 해당 데이터를 생성/저장할 때 사용한 게임 마스터 데이터 버전

---

# 2. 논리 스키마

## 2.1 Account

사용자 계정의 기본 식별 및 관리 정보입니다.

| 필드 | 논리 타입 | 필수 | 설명 |
|---|---|---:|---|
| `uid` | String | Y | Firebase Authentication UID |
| `email` | String | Y | 표시/관리용 이메일 mirror |
| `createdAt` | DateTime | Y | 계정 생성 시각 |
| `updatedAt` | DateTime | Y | 사용자 루트 정보 최종 갱신 시각 |
| `lastLoginAt` | DateTime | N | 마지막 로그인 시각 |
| `lastPlayedAt` | DateTime | N | 마지막 게임 플레이 시각 |
| `schemaVersion` | Integer | Y | 사용자 루트 스키마 버전 |

> `password`는 저장하지 않습니다.

---

## 2.2 Account Settings

슬롯과 무관하게 계정 전체에서 공유하는 선택 상태입니다.

| 필드 | 논리 타입 | 필수 | 설명 |
|---|---|---:|---|
| `activePetId` | String | Y | 현재 활성 펫 ID. 초기값 `PET01` |
| `activeRoomBackgroundId` | String | N | 현재 선택한 마이룸 배경 ID |
| `locale` | String | N | UI 언어 설정 |
| `updatedAt` | DateTime | Y | 최종 변경 시각 |

### 무결성 규칙

- `activePetId`는 반드시 `Global Meta Progress.unlockedPetIds`에 포함되어야 합니다.
- 유효하지 않은 펫 ID는 기본 펫 `PET01`로 복구할 수 있어야 합니다.
- 펫 보정값 자체는 사용자 저장 데이터에 저장하지 않습니다.

---

## 2.3 Global Meta Progress

세이브 슬롯이나 회차가 바뀌어도 유지되는 계정 단위 메타 진행 데이터입니다.

### 2.3.1 영구 보너스

현재 캐릭터의 일반 성장 스탯을 그대로 계승하지 않고, 수집 보상 등으로 획득한 영구 보너스만 저장합니다.

| 필드 | 논리 타입 | 설명 |
|---|---|---|
| `permanentBonuses.knowledge` | Integer | 지식 시작 보너스 |
| `permanentBonuses.expression` | Integer | 표현력 시작 보너스 |
| `permanentBonuses.skill` | Integer | 솜씨 시작 보너스 |
| `permanentBonuses.exploration` | Integer | 탐험 시작 보너스 |
| `permanentBonuses.magic` | Integer | 마법 시작 보너스 |
| `permanentBonuses.maxStamina` | Integer | 최대 체력 영구 보너스. 실제 사용 여부는 밸런스 확정에 따름 |

### 2.3.2 캐릭터/펫/수집 해금

| 필드 | 논리 타입 | 설명 |
|---|---|---|
| `unlockedCharacterIds` | Set<String> | 현재 선택 가능한 캐릭터 ID 목록 |
| `playedCharacterIds` | Set<String> | 엔딩까지 완료한 캐릭터 ID 목록 |
| `unlockedPetIds` | Set<String> | 해금한 펫 ID 목록 |
| `acquiredBadgeIds` | Set<String> | 획득한 배지 ID 목록 |
| `acquiredPuzzlePieceIds` | Set<String> | 획득한 퍼즐 조각 ID 목록 |
| `unlockedRoomBackgroundIds` | Set<String> | 해금한 마이룸 배경 ID 목록 |
| `seenEndingIds` | Set<String> | 한 번 이상 확인한 직업 엔딩 ID 목록 |
| `updatedAt` | DateTime | 메타 진행 최종 갱신 시각 |

### 논리적 주의사항

`unlockedCharacterIds`와 `playedCharacterIds`는 서로 다른 의미입니다.

```text
해금됨 != 해당 캐릭터로 52주 완주함
```

---

## 2.4 Global Statistics

해금 조건, 퍼즐 보상, 엔딩 편지 요약 등에 활용하는 계정 단위 누적 기록입니다.

| 필드 | 논리 타입 | 설명 |
|---|---|---|
| `totalCompletedRuns` | Integer | 전체 완료 회차 수 |
| `totalClassCount` | Integer | 전체 수업 수행 횟수 |
| `totalAdventureCount` | Integer | 전체 모험 수행 횟수 |
| `totalRestCount` | Integer | 전체 일반 휴식 횟수 |
| `totalMinigamePlayCount` | Integer | 전체 미니게임 플레이 횟수 |
| `totalMinigameClearCount` | Integer | 전체 미니게임 클리어 횟수 |
| `clearedMinigameIds` | Set<String> | 한 번 이상 클리어한 서로 다른 미니게임 ID |
| `totalNpcEncounterCount` | Integer | 전체 NPC 조우 횟수 |
| `completedNpcStoryCount` | Integer | 완료한 NPC 개별 스토리 수 |
| `classCounts.knowledge` | Integer | 지식 계열 수업 누적 횟수 |
| `classCounts.expression` | Integer | 표현력 계열 수업 누적 횟수 |
| `classCounts.skill` | Integer | 솜씨 계열 수업 누적 횟수 |
| `classCounts.exploration` | Integer | 탐험 계열 수업 누적 횟수 |
| `classCounts.magic` | Integer | 마법 계열 수업 누적 횟수 |
| `characterPlayCounts` | Map<CharacterId, Integer> | 캐릭터별 완료 회차 수 |
| `endingViewCounts` | Map<EndingId, Integer> | 엔딩별 확인 횟수 |
| `updatedAt` | DateTime | 누적 기록 최종 갱신 시각 |

### 사용 예시

다음과 같은 조건을 이 데이터로 판정할 수 있습니다.

- 모험 누적 100회
- NPC 스토리 5개 완료
- 서로 다른 엔딩 3개 확인
- 수업 누적 150회 + 모험 누적 150회 + NPC 만남 30회
- 미니게임 누적 250회
- NPC 만남 누적 500회

---

## 2.5 Unlock State

이미 처리한 해금/보상 조건을 기록하여 중복 지급을 방지합니다.

| 필드 | 논리 타입 | 설명 |
|---|---|---|
| `completedConditionIds` | Set<String> | 이미 처리한 보상/해금 조건 ID |
| `pendingCharacterUnlockIds` | Set<String> | 현재 회차에서 조건을 만족했으나 회차 종료까지 실제 사용을 보류하는 캐릭터 ID |
| `updatedAt` | DateTime | 최종 갱신 시각 |

### 예시

```text
PUZZLE_MINIGAME_PLAY_005
PUZZLE_MINIGAME_PLAY_010
PET_UNLOCK_PET04
CHARACTER_UNLOCK_CH10
```

### 설계 이유

`acquiredPuzzlePieceIds`만 저장하면 같은 조건이 다시 달성되었을 때 보상을 중복 지급했는지 판단하기 어렵습니다.

따라서 다음 둘을 구분합니다.

```text
조건을 처리했는가?      -> completedConditionIds
어떤 보상을 보유하는가? -> acquiredPuzzlePieceIds / unlockedPetIds / ...
```

---

## 2.6 Save Slot

한 계정당 최대 5개를 가집니다.

| 필드 | 논리 타입 | 필수 | 설명 |
|---|---|---:|---|
| `slotId` | Integer | Y | 1~5 |
| `status` | Enum | Y | `EMPTY`, `PLAYING`, `RUN_COMPLETE` |
| `completedRunCount` | Integer | Y | 해당 슬롯에서 완료한 회차 수 |
| `lastCompletedCharacterId` | String | N | 직전 완료 캐릭터 ID |
| `lastEndingId` | String | N | 직전 완료 엔딩 ID |
| `createdAt` | DateTime | N | 슬롯 최초 사용 시각 |
| `lastSavedAt` | DateTime | N | 실제 저장 상태가 변경된 최근 시각 |
| `saveVersion` | Integer | Y | 세이브 데이터 구조 버전 |
| `gameDataVersion` | String | Y | 저장 당시 게임 데이터 버전 |
| `activeRun` | ActiveRun | N | 진행 중 회차. 엔딩 확정 후 `null` |

### 상태 규칙

```text
EMPTY
- activeRun = null

PLAYING
- activeRun != null

RUN_COMPLETE
- activeRun = null
- completedRunCount >= 1
```

---

## 2.7 Active Run

현재 진행 중인 한 번의 52주 플레이입니다.

### 2.7.1 기본 진행

| 필드 | 논리 타입 | 설명 |
|---|---|---|
| `runId` | String | 회차 고유 식별자 |
| `runNumber` | Integer | 해당 슬롯의 현재 회차 번호 |
| `characterId` | String | 현재 플레이 캐릭터 |
| `week` | Integer | 1~52 |
| `day` | Enum/String | 현재 진행 위치 |
| `phase` | String | 일정 등록/활동 진행/주말 처리/엔딩 진입 등 세부 진행 단계 |
| `startedAt` | DateTime | 회차 시작 시각 |
| `updatedAt` | DateTime | 현재 회차 최종 갱신 시각 |

### 2.7.2 현재 성장 상태

| 필드 | 논리 타입 | 설명 |
|---|---|---|
| `stats.knowledge` | Integer | 지식 저장값 |
| `stats.expression` | Integer | 표현력 저장값 |
| `stats.skill` | Integer | 솜씨 저장값 |
| `stats.exploration` | Integer | 탐험 저장값 |
| `stats.magic` | Integer | 마법 저장값 |
| `stamina.current` | Integer | 현재 체력 |
| `stamina.max` | Integer | 해당 회차 최대 체력 |

펫 보정은 `stats`에 합산 저장하지 않습니다.

```text
run.stats + active pet modifier = effectiveStats
```

### 2.7.3 보이지 않는 스탯

| 필드 | 논리 타입 |
|---|---|
| `hiddenStats.empathy` | Integer |
| `hiddenStats.responsibility` | Integer |
| `hiddenStats.curiosity` | Integer |
| `hiddenStats.courage` | Integer |
| `hiddenStats.cooperation` | Integer |
| `hiddenStats.independence` | Integer |
| `hiddenStats.caution` | Integer |
| `hiddenStats.honesty` | Integer |

### 2.7.4 NPC 조우/스토리/이벤트

| 필드 | 논리 타입 | 설명 |
|---|---|---|
| `npcProgress` | Map<NpcId, NpcProgress> | NPC별 만남 횟수와 마지막 만남 주차. 친밀도 수치가 아님 |
| `storyProgress` | Map<StoryId, StoryProgress> | 메인/서브/NPC/장소 스토리 진행 상태 |
| `eventFlags` | Map<String, Boolean/Value> | 회차 한정 이벤트/선택 플래그 |
| `representativeEventIds` | List<String> | 엔딩 편지 후보가 될 중요 사건 ID |
| `representativeChoices` | List<Object> | 엔딩 편지 후보가 될 중요 선택 기록 |

#### `NpcProgress`

| 필드 | 논리 타입 | 설명 |
|---|---|---|
| `encounterCount` | Integer | 현재 회차에서 해당 NPC와 실제로 만난 횟수 |
| `lastEncounterWeek` | Integer/Null | 마지막으로 만난 주차. 최근 미등장 출현 보정에 사용 |

숫자형 친밀도·호감도 필드는 두지 않습니다. NPC 출현·엔딩·스토리 조건이 NPC 교류를 필요로 할 때는 `encounterCount`, `storyProgress`, `eventFlags`를 사용합니다.

#### `StoryProgress`

| 필드 | 논리 타입 | 설명 |
|---|---|---|
| `step` | Integer | 현재까지 완료한 단계 또는 다음 진행 기준 단계 |
| `status` | Enum | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` |
| `lastAdvancedWeek` | Integer/Null | 마지막 단계가 진행된 주차. 동일 NPC 스토리 주당 1단계 제한에 사용 가능 |

#### `representativeChoices` 최소 저장 예시

```json
{
  "eventId": "NPC_SION_02",
  "choiceId": "CHOICE_LISTEN",
  "week": 18
}
```

선택 문장 원문 전체를 사용자 세이브에 복사하지 않고 `eventId + choiceId`로 마스터 데이터를 참조하는 것을 기본으로 합니다. 이후 대사 조건에 필요한 선택은 `eventFlags`로 별도 저장합니다.

### 2.7.5 주간 일정/강제 휴식

| 필드 | 논리 타입 | 설명 |
|---|---|---|
| `weeklySchedule` | Map<Weekday, ScheduleEntry> | 월~금 등록 일정 |
| `completedWeekdayCount` | Integer | 현재 주 완료 평일 수 |
| `forcedRest.remainingWeekdays` | Integer | 남은 강제휴식 평일 수 |
| `forcedRest.active` | Boolean | 강제휴식 활성 여부 |

### ScheduleEntry 예시

```json
{
  "type": "CLASS | ADVENTURE | REST | FORCED_REST",
  "contentId": "CLASS_MAGIC_01",
  "status": "PLANNED | IN_PROGRESS | COMPLETED"
}
```

### 2.7.6 회차 한정 플레이 통계

엔딩 판정과 개인화 편지를 위해 현재 회차 통계를 별도로 유지합니다.

| 필드 | 논리 타입 | 설명 |
|---|---|---|
| `runStatistics.classCount` | Integer | 현재 회차 수업 횟수 |
| `runStatistics.adventureCount` | Integer | 현재 회차 모험 횟수 |
| `runStatistics.restCount` | Integer | 현재 회차 일반 휴식 횟수 |
| `runStatistics.minigamePlayCount` | Integer | 현재 회차 미니게임 플레이 수 |
| `runStatistics.minigameClearCount` | Integer | 현재 회차 미니게임 클리어 수 |
| `runStatistics.npcEncounterCount` | Integer | 현재 회차 NPC 조우 수 |
| `runStatistics.completedNpcStoryCount` | Integer | 현재 회차 NPC 스토리 완료 수 |
| `runStatistics.locationDiscoveryCount` | Integer | 새로운 장소 발견 수 |
| `runStatistics.specialItemDiscoveryCount` | Integer | 특별 아이템/발견물 획득 수 |
| `runStatistics.classCounts` | Map<StatType, Integer> | 계열별 수업 횟수 |

---

## 2.8 Ending Record

각 완료 회차의 엔딩 결과와 당시 편지를 장기 보관하는 히스토리입니다.

`seenEndingIds`는 엔딩 판정용 집합이고, `Ending Record`는 실제 과거 결과 조회용 히스토리입니다.

| 필드 | 논리 타입 | 설명 |
|---|---|---|
| `endingRecordId` | String | 엔딩 기록 고유 ID |
| `runId` | String | 완료한 회차 ID |
| `slotId` | Integer | 회차가 진행된 슬롯 |
| `runNumber` | Integer | 해당 슬롯의 회차 번호 |
| `characterId` | String | 플레이 캐릭터 |
| `endingId` | String | 확정된 직업 엔딩 ID |
| `completedAt` | DateTime | 엔딩 완료 시각 |
| `finalStats` | Object | 엔딩 당시 보이는 스탯 |
| `hiddenStatsSummary` | Object | 편지/판정에 사용한 보이지 않는 스탯 요약 |
| `playStatistics` | Object | 해당 회차 주요 실제 플레이 기록 |
| `representativeEvents` | List<Object/String> | 편지 회고에 사용한 대표 사건 |
| `representativeChoices` | List<Object> | 편지 회고에 사용한 대표 선택 |
| `letter` | Object | 생성된 개인화 엔딩 편지 |
| `gameDataVersion` | String | 엔딩 판정에 사용한 게임 데이터 버전 |

### Letter

| 필드 | 논리 타입 | 설명 |
|---|---|---|
| `content` | String | 최종 편지 본문 |
| `generationStatus` | Enum | `GENERATED`, `FALLBACK` |
| `model` | String | 생성에 사용한 Gemini 모델 |
| `promptVersion` | String | 프롬프트 버전 |
| `generatedAt` | DateTime | 편지 생성 시각 |

### 저장 원칙

같은 `endingId`가 반복되어도 각각 별도 `Ending Record`를 만듭니다.

```text
ENDING_03
├─ run A에서 본 기록/편지
├─ run B에서 본 기록/편지
└─ run C에서 본 기록/편지
```

---

# 3. 논리 관계도

```text
Firebase Auth User
       │ 1:1
       ▼
Account
 ├─ 1:1 Account Settings
 ├─ 1:1 Global Meta Progress
 ├─ 1:1 Global Statistics
 ├─ 1:1 Unlock State
 ├─ 1:N Save Slot (max 5)
 │       └─ 0:1 Active Run
 └─ 1:N Ending Record
```

### 주요 참조 관계

```text
Account Settings.activePetId
  -> Global Meta Progress.unlockedPetIds

Save Slot.activeRun.characterId
  -> Character Master

Global Meta Progress.unlockedCharacterIds
  -> Character Master

Global Meta Progress.unlockedPetIds
  -> Pet Master

Global Meta Progress.acquiredBadgeIds
  -> Badge Master

Global Meta Progress.seenEndingIds
  -> Ending Master

Ending Record.endingId
  -> Ending Master
```

---

# 4. 물리 스키마 — Firestore

Firestore에는 다음 collection/document 구조를 사용합니다.

```text
users/{uid}
│
├─ settings/account
├─ meta/progress
├─ statistics/global
├─ unlockState/global
│
├─ saveSlots/{slotId}
│
└─ endingRecords/{endingRecordId}
```

---

## 4.1 `users/{uid}`

```json
{
  "email": "player@example.com",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "lastLoginAt": "Timestamp",
  "lastPlayedAt": "Timestamp",
  "schemaVersion": 1
}
```

### Document ID

```text
{uid} = Firebase Authentication UID
```

---

## 4.2 `users/{uid}/settings/account`

```json
{
  "activePetId": "PET01",
  "activeRoomBackgroundId": "ROOM_DEFAULT",
  "locale": "ko-KR",
  "updatedAt": "Timestamp"
}
```

---

## 4.3 `users/{uid}/meta/progress`

```json
{
  "permanentBonuses": {
    "knowledge": 0,
    "expression": 0,
    "skill": 0,
    "exploration": 0,
    "magic": 0,
    "maxStamina": 0
  },
  "unlockedCharacterIds": [
    "CH01",
    "CH15",
    "CH31",
    "CH02",
    "CH08",
    "CH16"
  ],
  "playedCharacterIds": [],
  "unlockedPetIds": ["PET01"],
  "acquiredBadgeIds": [],
  "acquiredPuzzlePieceIds": [],
  "unlockedRoomBackgroundIds": ["ROOM_DEFAULT"],
  "seenEndingIds": [],
  "updatedAt": "Timestamp"
}
```

---

## 4.4 `users/{uid}/statistics/global`

```json
{
  "totalCompletedRuns": 0,
  "totalClassCount": 0,
  "totalAdventureCount": 0,
  "totalRestCount": 0,
  "totalMinigamePlayCount": 0,
  "totalMinigameClearCount": 0,
  "clearedMinigameIds": [],
  "totalNpcEncounterCount": 0,
  "completedNpcStoryCount": 0,
  "classCounts": {
    "knowledge": 0,
    "expression": 0,
    "skill": 0,
    "exploration": 0,
    "magic": 0
  },
  "characterPlayCounts": {},
  "endingViewCounts": {},
  "updatedAt": "Timestamp"
}
```

---

## 4.5 `users/{uid}/unlockState/global`

```json
{
  "completedConditionIds": [],
  "pendingCharacterUnlockIds": [],
  "updatedAt": "Timestamp"
}
```

---

## 4.6 `users/{uid}/saveSlots/{slotId}`

`slotId`는 문자열 Document ID `1`, `2`, `3`, `4`, `5`를 사용합니다.

### 빈 슬롯

```json
{
  "slotId": 1,
  "status": "EMPTY",
  "completedRunCount": 0,
  "lastCompletedCharacterId": null,
  "lastEndingId": null,
  "createdAt": null,
  "lastSavedAt": null,
  "saveVersion": 1,
  "gameDataVersion": "2026.10.1",
  "activeRun": null
}
```

### 진행 중 슬롯

```json
{
  "slotId": 1,
  "status": "PLAYING",
  "completedRunCount": 1,
  "lastCompletedCharacterId": "CH01",
  "lastEndingId": "ENDING_03",
  "createdAt": "Timestamp",
  "lastSavedAt": "Timestamp",
  "saveVersion": 1,
  "gameDataVersion": "2026.10.1",
  "activeRun": {
    "runId": "run_uuid",
    "runNumber": 2,
    "characterId": "CH08",
    "week": 18,
    "day": "WEDNESDAY",
    "phase": "WEEKLY_ACTIVITY",
    "startedAt": "Timestamp",
    "updatedAt": "Timestamp",

    "stats": {
      "knowledge": 120,
      "expression": 95,
      "skill": 88,
      "exploration": 104,
      "magic": 130
    },

    "stamina": {
      "current": 65,
      "max": 100
    },

    "hiddenStats": {
      "empathy": 0,
      "responsibility": 0,
      "curiosity": 0,
      "courage": 0,
      "cooperation": 0,
      "independence": 0,
      "caution": 0,
      "honesty": 0
    },

    "npcProgress": {
      "CH03": {
        "encounterCount": 3,
        "lastEncounterWeek": 16
      }
    },
    "storyProgress": {},
    "eventFlags": {},

    "representativeEventIds": [],
    "representativeChoices": [],

    "weeklySchedule": {
      "MONDAY": {
        "type": "CLASS",
        "contentId": "CLASS_MAGIC_01",
        "status": "COMPLETED"
      },
      "TUESDAY": {
        "type": "ADVENTURE",
        "contentId": "ADV_GREENHOUSE",
        "status": "COMPLETED"
      },
      "WEDNESDAY": {
        "type": "REST",
        "contentId": "REST_DEFAULT",
        "status": "IN_PROGRESS"
      }
    },

    "completedWeekdayCount": 2,

    "forcedRest": {
      "active": false,
      "remainingWeekdays": 0
    },

    "runStatistics": {
      "classCount": 38,
      "adventureCount": 24,
      "restCount": 25,
      "minigamePlayCount": 38,
      "minigameClearCount": 34,
      "npcEncounterCount": 17,
      "completedNpcStoryCount": 2,
      "locationDiscoveryCount": 4,
      "specialItemDiscoveryCount": 3,
      "classCounts": {
        "knowledge": 8,
        "expression": 7,
        "skill": 8,
        "exploration": 7,
        "magic": 8
      }
    }
  }
}
```

---

## 4.7 `users/{uid}/endingRecords/{endingRecordId}`

Document ID는 UUID/ULID 등 충돌 가능성이 낮고 시간 정렬이 가능한 ID를 사용할 수 있습니다.

```json
{
  "endingRecordId": "01JXXXXXXXXXXXXXXX",
  "runId": "run_uuid",
  "slotId": 1,
  "runNumber": 1,
  "characterId": "CH01",
  "endingId": "ENDING_03",
  "completedAt": "Timestamp",

  "finalStats": {
    "knowledge": 342,
    "expression": 205,
    "skill": 318,
    "exploration": 377,
    "magic": 241
  },

  "hiddenStatsSummary": {
    "dominant": ["curiosity", "courage", "independence"]
  },

  "playStatistics": {
    "classCount": 74,
    "adventureCount": 41,
    "restCount": 31,
    "minigamePlayCount": 74,
    "minigameClearCount": 68,
    "npcEncounterCount": 86,
    "completedNpcStoryCount": 9,
    "locationDiscoveryCount": 12,
    "specialItemDiscoveryCount": 7
  },

  "representativeEvents": [
    "EVENT_GREENHOUSE_DISCOVERY"
  ],

  "representativeChoices": [],

  "letter": {
    "content": "...",
    "generationStatus": "GENERATED",
    "model": "gemini-3.8-flash",
    "promptVersion": "ending-letter-v1",
    "generatedAt": "Timestamp"
  },

  "gameDataVersion": "2026.10.1"
}
```

---

# 5. Firestore 타입 매핑

| 논리 타입 | Firestore 타입 |
|---|---|
| String | string |
| Integer | integer |
| Boolean | boolean |
| DateTime | timestamp |
| Enum | string |
| List<T> | array |
| Set<T> | array + 서버 중복 방지 검증 |
| Map<K,V> | map |
| Object | map |
| Nullable | null 허용 |

Firestore에는 Set 타입이 없으므로 배열로 저장하되 백엔드 서비스 계층에서 중복을 막습니다.

---

# 6. 트랜잭션 경계

다음 처리는 가능한 한 하나의 Firestore Transaction 또는 일관된 서버 작업 단위로 묶습니다.

## 6.1 주간 종료 저장

```text
Active Run 상태 갱신
+ 해당 주의 확정 결과를 Global Statistics에 누적 반영
+ 해금 조건 판정
+ 즉시 지급 가능한 펫/배지/퍼즐 보상 반영
+ lastSavedAt 갱신
```

> `runStatistics`는 현재 회차의 누적 스냅샷이므로 매주 전체 값을 Global Statistics에 다시 더하지 않습니다. Global Statistics에는 **해당 주에 새로 확정된 delta만** 누적하거나, 별도 이벤트 처리 계층에서 한 번만 반영해야 합니다.

## 6.2 엔딩 확정

```text
엔딩 판정
→ Ending Record 생성
→ seenEndingIds 갱신
→ endingViewCounts 갱신
→ playedCharacterIds 갱신
→ characterPlayCounts 갱신
→ totalCompletedRuns 갱신
→ 회차 종료 시 확정되는 캐릭터 해금 반영
→ Save Slot.completedRunCount + 1
→ Save Slot.lastCompletedCharacterId 갱신
→ Save Slot.lastEndingId 갱신
→ Save Slot.activeRun = null
→ Save Slot.status = RUN_COMPLETE
```

AI 편지 생성 실패가 엔딩/해금 데이터 확정을 막아서는 안 됩니다. 직업 엔딩과 메타 데이터는 먼저 확정 가능해야 하며, 편지는 재시도 또는 fallback으로 저장합니다.

---

# 7. 삭제 범위

## 7.1 세이브 슬롯 삭제

삭제 또는 초기화 대상:

- 해당 슬롯 `activeRun`
- `completedRunCount`
- `lastCompletedCharacterId`
- `lastEndingId`
- 슬롯의 저장 시각/요약 정보

유지 대상:

- `meta/progress`
- `statistics/global`
- `unlockState/global`
- `endingRecords`
- `settings/account`

즉, 슬롯 삭제는 계정 전역 메타 진행을 초기화하지 않습니다.

## 7.2 계정 삭제

계정 자체를 삭제하는 경우 Firebase Authentication 계정과 함께 `users/{uid}` 아래 사용자 서버 데이터를 모두 삭제하는 정책을 별도로 구현합니다.

---

# 8. 초기 데이터 생성

신규 사용자 생성 시 최소 초기 상태는 다음과 같습니다.

```text
users/{uid}
settings/account
meta/progress
statistics/global
unlockState/global
saveSlots/1
saveSlots/2
saveSlots/3
saveSlots/4
saveSlots/5
```

초기 해금 상태:

```text
캐릭터:
CH01 / CH15 / CH31 / CH02 / CH08 / CH16

펫:
PET01

마이룸 배경:
ROOM_DEFAULT
```

5개 세이브 슬롯은 모두 `EMPTY`로 생성하거나, 첫 사용 시 lazy-create하는 방식 모두 가능합니다. API 구현에서는 5개 슬롯을 항상 반환해야 하므로 서버에서 빈 슬롯을 합성하는 방식도 허용합니다.

---

# 9. 인덱스와 조회 전략

대부분의 사용자 데이터는 `uid` 하위 경로로 직접 조회하므로 복합 인덱스 요구는 크지 않습니다.

필요 가능성이 높은 조회:

```text
/users/{uid}/endingRecords
  orderBy(completedAt desc)
```

관리자 기능에서 전체 사용자 엔딩 기록을 cross-user로 조회할 계획이 생기면 Collection Group Query와 별도 인덱스를 추가합니다.

현재 단계에서는 사용자 본인 데이터 접근을 기본으로 하고, 관리자 통계용 역정규화 컬렉션은 만들지 않습니다.

---

# 10. 보안 규칙 방향

현재 백엔드 구조에서는 게임 클라이언트가 Firebase Authentication으로 로그인하고, FastAPI 서버가 Firebase ID Token과 이메일 인증 상태를 검증하는 구조를 우선합니다.

권장 원칙:

- 사용자 데이터 변경은 가능한 한 FastAPI를 통해 수행합니다.
- 서버는 요청 토큰의 `uid`와 대상 `users/{uid}`가 같은지 검증합니다.
- 클라이언트가 임의로 스탯, 해금 목록, 엔딩 결과, 누적 카운터를 수정하지 못하게 합니다.
- AI API 키와 Firebase Admin 자격 증명은 서버 환경변수로만 관리합니다.

직접 Firestore Client SDK 접근을 허용하는 기능이 생기면 Security Rules를 별도로 정의해야 합니다.

---

# 11. 구현 단계에서 추가 확정할 항목

다음 항목은 스키마의 큰 구조를 변경하지 않고 구현 단계에서 세부 타입/계약을 확정합니다.

1. 직업별 엔딩 판정 데이터 구조
2. AI 편지 재생성 허용 여부와 호출 횟수 정책
3. `Ending Record`에서 원시 hidden stats를 보관할지 요약만 보관할지
4. 영구 최대 체력 보너스의 실제 사용 여부와 상한
5. 관리자 통계를 위한 별도 집계 컬렉션 필요 여부

---

# 12. 권장 API 모델 단위

FastAPI/Pydantic 모델은 물리 Firestore 문서와 1:1로 묶기보다 다음 도메인 단위로 나누는 것을 권장합니다.

```text
AccountProfile
AccountSettings
GlobalMetaProgress
GlobalStatistics
UnlockState
SaveSlot
ActiveRun
RunStatistics
EndingRecord
EndingLetter
```

이 구조를 사용하면 Firestore 저장 모델과 API 응답 모델을 분리하기 쉽고, 세이브 버전 마이그레이션 및 서버 검증 로직을 계층화할 수 있습니다.
