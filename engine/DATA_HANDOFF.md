# 엔진 연결·인계 안내

<a id="dialogue-runtime-2026-10-18"></a>

## 2026-10-18 실제 진입점 연결과 남은 인계

기준 `document/dialogue/01_ENGINE_API_CONTRACT.md`의 `loadDialogue / completeDialogue`를 실제 진입점에 연결했습니다. 아래 추가 필드는 **현재 엔진의 provider 표시·캐시 형식**이며 새 HTTP/Firestore 스키마 확정이 아닙니다. 백엔드 담당 adapter가 운영 DTO를 변환해 제공해야 합니다.

| 입력 | 엔진에서 필요한 조건 |
|---|---|
| 대화 시작 | `loadDialogue({slotId:'slot-1',eventId})`. 현재 슬롯의 `serverRevision`이 완료 요청 전에 제공되어야 하며 엔진이 임의 revision을 생성하지 않음 |
| 완료 | `success:true`, 동일한 `completionMode`, 새 `serverRevision`, 엔진 호환 `activeRun`. 회차/캐릭터/주차/일자/phase와 기존 활동 기록은 유지하고 완료된 pending story는 해제되어야 함 |
| Main 완료 | `mainStory.completedIds`에 해당 ID 포함, `pendingId` 해제. MS01이면 `flags.admissionPending`도 해제 |
| 활동 후 이야기 | 기존 `storyEvents`에 현재 uid/slot/activityToken에 맞는 서버 선정 `eventId` 제공. 엔진 내부 `pendingDialogue`를 저장해 다음 활동과 금요일 주차 전환을 차단하며 완료 응답에서 해제 |
| 결과 표시 | `appliedSummary.visibleStatDelta`의 실제 적용량만 사용. SKIP 보상은 0, 누락된 증가량을 엔진이 역산하지 않음 |
| 선택적 표시 상태 | 완료 응답의 `meta`, `settings`, `growthRewardConfig`는 기존 엔진 표시 모델로 변환된 경우에만 전달. 기존 해금을 제거하거나 잠긴 펫/방을 적용하는 응답은 거부 |

`createDialogueRuntime`은 서비스 완료와 개발 저장을 연결합니다. 저장 실패 시 이전 화면 상태를 보존하며 같은 완료 응답으로 저장만 재시도합니다. 계정/슬롯/회차가 바뀐 뒤 도착한 응답은 적용하지 않습니다. 정식 서비스 일부만 제공된 경우에도 임시 보상 경로로 우회하지 않습니다.

`activeRun.dialogueHistory`는 완료 사실의 표시용 캐시입니다. 이벤트 ID, 제목, 주/일, COMPLETE/SKIP, 선택 노드·선택 ID, 수신한 실제 성장량만 저장하고 대사 원문 전체·선택별 숨은 보상은 복사하지 않습니다. 이 캐시는 서버의 storyProgress 판정 원본이 아닙니다. 같은 이벤트의 Main 기록과 겹치면 다이어리/주간 요약에서 한 번만 표시합니다. 선택 문구의 정식 과거 조회 서비스는 아직 없으므로, ID만 있는 기록에 임의 문구를 만들지 않습니다.

`loadEnding` 연결 시 엔진 내부 `endingRecord.type='PENDING'`으로 서버 직업을 기다리며, 한 번 받은 직업은 편지 재조회 때 변경하지 않습니다. 저장된 과거 편지는 메뉴의 `지난 엔딩 편지`에서 생성/완료 호출 없이 조회합니다. 계정·슬롯 초기 로드, 원격 설정 저장, 엔딩 최종 `타이틀로`의 서버 완료 계약은 별도 인계가 필요하며 현재 로컬 저장을 운영 저장으로 취급하지 않습니다.

미니게임 데모·원본 자산·기준 기획 문서는 이번 연결 작업에서 변경하지 않습니다. 음악 매칭은 asset/audio/README.md를 따릅니다. 공통 등록표·모험/미니게임·이야기 시작곡은 연결했고 메인 내부 씬별 전환 정보는 API에서 추가 전달해야 합니다.

최종 자동 검증: 엔진 테스트 301개 통과, 미리보기 진입점 문법 검사·변경 파일 공백 검사 통과. 정식 API와 실제 브라우저/기기 검수는 별도입니다. 서버형 `slot-1`과 엔진형 `1`은 경계에서 정규화하며 uid와 activityToken 검증을 생략하지 않습니다.

2026-10-17. 이 문서는 엔진 내부 표시 모델과 인계 경계를 설명합니다. 운영 API 스키마·보상 판정·기준 기획을 확정하거나 변경하지 않습니다. 현재 실행은 로컬 저장을 사용하며, 아래 서비스와 실제 해금/원고 데이터는 기본 주입되어 있지 않습니다.

대서고·천문대의 MP02·MP03 모험 지도와 가방용 short 이미지 버튼을 연결했습니다. 추가 방 3종은 퍼즐 README의 순서대로 우주방·공주방·식물방과 낮/노을/밤·12조각 PNG를 연결합니다. 원본 존재와 최종 화면 검수는 구분하며 루루 화면 적용은 후속입니다. Long-term Play Memory·서버 워크플로우는 운영 백엔드 범위이며 로컬 세이브만으로 구현 완료라고 주장하지 않습니다.

[데이터 입력](#담당자에게-필요한-것) · [애셋 인계](#asset-handoff) · [지도 교체](#map-handoff) · [엔딩 프레임](ENDING_FRAME.md)

## 담당자에게 필요한 것

| 영역 | 엔진에서 준비한 것 | 받아야 할 것 |
|---|---|---|
| 본편 수업 | 문서의 6개 게임, 결과·성장·실패 도움·포기 | 최종 퍼즐 풀/난이도와 실제 조작 검수 |
| 배지 | 5 → 25 → 8 계층, 조건·진행도·2/5/8 보상 표시 | 안정적인 배지 ID 매핑, 실제 획득/수령 결과와 누적 태그 |
| 마이룸 | 기본+3개 배경, 각 12조각, 명시적 선택·설정 저장 | 배경별 이미지·조각 인덱스 매핑, 보유 조각·해금 사실 |
| 캐릭터 | 실제 해금 목록으로 다음 회차 선택, 초기 보정+영구 보너스 | 계정 해금 결과, 추가 캐릭터 모험용 SD |
| 이야기 | pending story 차단·완료 저장·다음 일정 복귀·`lumiaEngineServices` 연결 경계 | 정식 Dialogue API payload, 이벤트 발생 결정, 실제 원고·선택 효과 |
| 엔딩 | 질문→직업/부제→편지/기록→선택적 해금 요약, 재진입·저장 보호 | 같은 회차·직업의 검증된 편지/실제 기록과 계정 메타 결과 |

가방 순서는 사용자 결정으로 **배지 / 펫 / 캐릭터 / 마이룸**이며 기본 탭은 배지입니다. 카드 실루엣·정보 동작, 날짜 UI의 일정 진입, 버튼 확인형 모험 결과는 유지합니다. 모험 중 NPC 조우는 제거했으며, 인사도 결과 저장 후 별도 장면에서만 실행합니다.

## 1. 수집·설정 입력

`profile.meta`의 기존 `unlockedCharacters`, `unlockedPetIds`, `permanentBonuses`를 소비합니다. `permanentBonuses`는 5개 성장 스탯별 0~15 정수이며 새 회차 생성에만 적용합니다. 엔진이 수집 조건을 평가해 이 목록을 만들어 내지는 않습니다.

추가 표시 DTO는 `meta.collectionView`입니다. 실제 API의 이름이 아니라 수신 adapter에서 변환할 엔진 모델입니다.

- `badges`: `{categoryId, subcategoryTitle, current, earnedTiers, awardedMilestones}` 목록. 분류/이름은 `BADGE_GROUPS`, 획득 단계는 1~8, 지급 단계는 2/5/8입니다. 미제공 진행도는 연결 대기, 미제공 획득 매핑은 미확정으로 구분합니다. 원래 `meta.badges`를 삭제하거나 추정 ID로 치환하지 않습니다.
- 활동·태그의 `current`가 없으면 오래된 개발용 `meta.counters`로 채우지 않습니다. 실제 수신 진행값 0도 유효한 값이며, 미수신과 0을 구분합니다. 기존 누적 기록은 보존하고, 엔진은 임의 초기화·보상 소급 지급을 하지 않습니다.
- `rooms`: `{id, pieces, unlocked, images?}` 목록. 추가 방 ID는 `room-1~3`, 조각 인덱스는 0~11(4열×3행, 왼쪽 위부터 행 우선)입니다. `room-1`은 `BG11_myroom4_cosmos_*` / `PZ01_우주방`, `room-2`는 `BG11_myroom5_princess_*` / `PZ02_공주방`, `room-3`은 `BG11_myroom6_botanical_*` / `PZ03_식물방`입니다. 실제 소유를 전달받은 조각만 표시합니다. `images`를 생략하면 이 마스터를 사용하고, 기존 전달값 `{day, sunset?, night?}`이 있으면 보존합니다. 다른 낮 이미지로 전달된 기존 방은 해당 이미지의 4×3 영역을 표시하여 원래 배경과 새 조각이 섞이지 않게 합니다. 아트 파일이 있어도 소유·해금 상태는 새로 만들지 않습니다.
- `settings.activeRoomBackgroundId`: 사용자가 선택한 해금 배경. 저장 시 계정 설정만 갱신하고 활동 중 미저장 회차는 넣지 않습니다. 잘못된/미제공 이미지는 표시만 기본 방으로 대체하고 저장 원본을 바꾸지 않습니다.

배지 획득·75단계 보너스 지급·퍼즐 무작위 지급·12조각 완성 판정은 담당 결과를 기다립니다. UI의 체크 표시는 지급 결과이며, 조건 수치 도달만으로 지급했다고 표시하지 않습니다.

### 수집 알림 수신

`lumiaEngineServices.collectionEvents`는 이미 지급된 결과를 알리는 엔진 입력 목록입니다. 각 항목은 `{receiptId, slotId:'slot-1', activityToken:'1:1:0', roomId:'room-2', pieceCount:8, unlocked:false}`입니다. 인증 서비스 사용 시 `uid`도 필요하며 현재 계정·슬롯·활동 토큰과 모두 일치해야 합니다. 기본 로컬 미리보기에는 uid 없는 항목만 사용합니다.

- `meta.collectionView.rooms`에 **이미 전달·저장된 소유 상태와 일치하는 알림**만 소비합니다. 이 이벤트 자체로 조각·보상·해금을 지급하거나 수신 스키마를 운영 API 계약으로 확정하지 않습니다. 최신 소유 상태 수신·서버 원자성은 provider 인계 사항입니다.
- 성공한 활동 결과 저장 뒤 안내하며 `meta.collectionNoticeState`의 `processedIds / unreadRoomIds`로 중복과 미확인 표시를 보존합니다. 방 상세 확인은 표시만 지우고 보유 조각·해금을 바꾸지 않습니다. 확인 저장 실패 시 기존 NEW를 유지합니다.
- 실제 이벤트·소유 상태가 없거나 잘못되면 보상을 추정하지 않습니다. 잘못된 수집 알림이 정상 활동 결과 저장을 막지는 않습니다. 강제 화면 이동·배경 자동 변경·일정 중단은 없습니다.

배지 획득 팝업은 이미 지급된 `lumiaEngineServices.collectionEvents` 항목 중 아래 엔진 adapter 형태를 받습니다. 이는 운영 API 계약이 아니며, 실제 provider 결과를 이 형태로 변환해 전달해야 합니다.

```js
{ kind: 'badge', receiptId, slotId: 'slot-1', activityToken: '1:1:0',
  categoryId: 'forest', subcategoryTitle: '오늘도 탐험!', tier: 1 }
```

- 인증 서비스는 항목에 `uid`를 포함합니다. 엔진은 현재 계정·슬롯·활동 토큰과 일치하는 항목만 받습니다.
- `meta.collectionView.badges`의 같은 분류·소분류 `earnedTiers`에 해당 단계가 실제 포함된 경우에만 이미지 조합 팝업을 표시합니다. 배지 보유 정보는 이 이벤트로 수정하지 않습니다.
- receipt ID와 확인 전 알림을 `meta.collectionNoticeState`에 저장합니다. 모험 결과를 먼저 확인하고 배지 팝업에서 `확인`을 눌러 저장한 뒤 다음 장면으로 이동합니다. 재접속 알림은 이어서 확인할 수 있으며 저장 실패 시 확인 상태를 보존합니다.
- 현재 기본 실행에는 실제 배지 지급 provider가 연결되어 있지 않습니다. 따라서 화면 흐름은 구현되어도 실제 플레이에서 획득 팝업이 발생하려면 provider가 receipt와 갱신된 earned tier를 함께 전달해야 합니다.

<a id="account-slot-boundary"></a>

### 계정·슬롯 연결 경계

계정 SDK·서버 endpoint·운영 저장소를 만들지 않고 부팅 전 `globalThis.lumiaEngineServices.account`의 함수만 사용합니다. 함수는 Promise 또는 값을 반환하고 실패 시 reject/throw합니다. 누락된 동작은 비활성화합니다.

| 함수 | 입력·결과 |
|---|---|
| `getSession()` | `null` 또는 세션 |
| `login({email,password})` | 세션 |
| `signup({email,password,privacyConsent:true})` | 미인증 세션. 인증 메일 전송은 provider 담당 |
| `checkVerification()` | 갱신 세션 |
| `sendVerification()` / `resetPassword({email})` | 요청 성공 또는 오류 |
| `changePassword({currentPassword,newPassword})` | 요청 성공 또는 오류 |
| `revokeOtherSessions({password})` | **현재 uid가 유지된 인증 세션** |
| `logout()` | 현재 기기 세션만 해제 |
| `deleteAccount({password?})` | 사용자 영구 삭제 확인 후 호출. 실제 UID 데이터 삭제는 provider 담당 |

세션 표시 모델은 `{uid,email,emailVerified,createdAt?}`입니다. 날짜는 Date 또는 파싱 가능한 날짜이며 누락은 미등록입니다. `REAUTH_REQUIRED` 오류는 탈퇴 전 현재 비밀번호 재입력을 요구합니다. 비밀번호·인증 토큰은 엔진 로컬 세이브·AI 편지 입력에 저장하지 않습니다. 가입 동의와 최소 8자·확인 일치 검사는 클라이언트 검사일 뿐 서버 검증을 대체하지 않습니다.

현재 연결 저장은 개발용 localStorage이며 uid별로 격리합니다. 서버 슬롯 조회/삭제·UID 데이터 삭제·원격 로그아웃의 실제 효력과 API 보안 검증은 후속입니다. 로그인 전 기존 공용 개발 저장을 계정에 이관하지 않으며 로그아웃 시 원본 저장을 지우지 않습니다.

슬롯 조회 실패의 `LOAD_ERROR`는 화면 전용이고 저장 상태로 쓰지 않습니다. 슬롯별 원본 검사·재시도·강한 삭제 확인을 제공합니다. 로컬 데이터는 5개 슬롯이 한 묶음이므로 일부 손상 시 정상 슬롯의 **표시만 유지**하고 전체 묶음이 정상화될 때까지 게임 진입·새 저장을 잠급니다. 손상 슬롯 삭제는 해당 슬롯만 바꾸며 다른 슬롯 원문·메타·설정을 보존합니다. 전체 JSON/전역 메타 파손·저장소 접근 실패는 개별 삭제하지 않습니다. 운영의 독립 슬롯 API로 바꾸는 작업은 별도 인계입니다.

## 2. 이야기 입력

정식 대화 연결은 [대화 시스템 안내](../document/dialogue/README.md)와 [Dialogue API · Engine 계약](../document/dialogue/01_ENGINE_API_CONTRACT.md)을 따른다. 엔진 개발 AI는 [대화 시스템 엔진 AI 인계](../document_for_ai/07_DIALOGUE_ENGINE_HANDOFF.md)도 함께 읽는다.

Main Story, NPC Story, Location Story는 모두 **공통 DialoguePlayer 하나**를 사용한다. 현재 엔진에 남아 있는 `content.lines / content.choices / content.closing`, 오래된 Location 장면 목록, 임시 Main Story 프레임과 테스트 대사는 정식 API 연결 후 제거·교체 가능한 테스트 데이터다.

엔진은 부팅 전에 주입된 `globalThis.lumiaEngineServices` provider를 통해 대화를 읽고 완료한다.

```text
loadDialogue({slotId,eventId})
completeDialogue({dialogueToken,completionMode,selectedChoices,requestId,expectedServerRevision})
```

엔진 내부에서 실제 HTTP URL, Firebase ID Token, 서버 재시도 규칙을 하드코딩하지 않는다. provider/adapter가 이를 처리한다.

### DialoguePayload

엔진이 받는 대화는 DB node graph가 아니라 순차 `sequence[]`다.

| 타입 | 엔진 처리 |
|---|---|
| `LINE` | 텍스트 표시. `lineMode`는 `DIALOGUE / NARRATION / THOUGHT / CONTEXT`, `visualMode`는 `SPEAKER / KEEP / NONE` |
| `IMAGE` | `BACKGROUND` 또는 단일 `FOCUS` 이미지 `SHOW / REPLACE / HIDE` |
| `CHOICE` | 옵션 표시, `choiceNodeId + choiceId` 기억, 짧은 reaction 뒤 다음 sequence로 합류 |
| `END` | 정상 완료 요청 |

화면의 중심 이미지는 기본 한 장만 사용한다. 캐릭터/NPC가 `DIALOGUE`로 말하면 해당 화자 이미지를 표시하고, 플레이어 초상은 표시하지 않는다. `NARRATION/CONTEXT`는 화자 없이, `THOUGHT`는 플레이어 속마음으로 표시한다. 이미지가 없는 화자는 텍스트만 표시한다. 아이템·사건 그림은 `IMAGE target=FOCUS`로 표시하며 설명 중 유지해야 하면 다음 `LINE.visualMode=KEEP`를 사용한다.

API는 동적 `ROLE:<roleId>`를 서버에서 현재 `activeRun.storyCast`의 실제 캐릭터로 해석한 뒤 `characterId / name / portraitSrc`를 전달한다. 엔진은 role 후보 선정 로직을 중복 구현하지 않는다.

### 선택 결과와 저장

엔진은 선택 효과를 직접 적용하지 않는다.

```text
선택
→ choiceNodeId + choiceId만 메모리에서 수집
→ 대화 중간 저장 없음
→ END에서 completeDialogue(COMPLETE) 1회
→ 서버가 선택 효과·스토리 진행을 검증/저장
→ 최신 activeRun 수신
→ 엔진 상태 갱신
```

따라서 정식 payload에는 `growth`, `hiddenDelta`, 결과 `flags`, 해금 보상을 넣지 않는다. 기존 `finishNarrative()`의 클라이언트 스탯 직접 적용은 정식 서버 연결 시 제거할 책임이다.

### 스킵

엔진은 payload의 `canSkip`만 보고 건너뛰기 버튼을 표시한다.

서버 관리자 정책은 `AFTER_FIRST_ENDING / ALWAYS / NEVER`이며 운영 기본은 첫 엔딩 이후 허용, QA 중에는 `ALWAYS`를 사용할 수 있다.

`SKIP` 완료는 Story/Event 완료로 인정하지만 해당 장면의 선택 보상은 전부 적용하지 않는다. 스킵 전에 고른 선택은 기록할 수 있으나 효과는 0이며, 도달하지 않은 선택 노드는 서버가 `SKIPPED`로 계산한다.

### 복구와 진행 차단

- pending story가 있으면 다음 일정을 시작하지 않는다.
- 대화 중간 위치를 장기 저장하지 않는다.
- 완료 API 저장 성공 후에만 다음 일정으로 이동한다.
- 금요일 Story가 끝나기 전에는 주차를 넘기지 않는다.
- API/저장 실패 시 같은 pending story에서 재시도한다.
- `requestId` 재전송은 서버에서 멱등 처리한다.

## 3. 엔딩 입력

부팅 전에 `globalThis.lumiaEngineServices.loadEnding({slotId, runNumber})` 조회 함수를 전달할 수 있습니다. 엔진은 HTTP 주소·인증·AI 생성 호출을 만들지 않습니다. API 담당 adapter가 준비 결과를 [엔딩 표시 모델](ENDING_FRAME.md)로 변환해야 합니다.

수신 후 순서: 슬롯/회차/확정 직업 검증 → 준비 편지 로컬 저장 → 표시 → 최종 확인 저장. 저장된 ready 편지는 다시 조회·생성하지 않습니다. 재접속 시 중간 페이지가 아니라 질문부터 보여 줍니다. pending/실패 상태는 최종 회차 완료를 막고, 안전 검증을 마친 fallback 편지는 정상 편지와 똑같이 진행합니다.

`newUnlocks`는 **이미 판정된 신규 결과의 표시 목록**일 뿐입니다. 이 목록을 읽는 것만으로 `meta`에 지급하지 않습니다. 실제 계정 메타 갱신·엔딩 저장의 운영 원자성은 백엔드 통합 때 확정해야 합니다. 기본 실행에는 편지 서비스가 없어 52주 엔딩의 편지 단계에서 연결 대기로 남습니다.

## 4. 사용자 Chrome 검수 항목

1. PC와 낮은 가로 화면에서 6개 수업의 조작·포기·시간 종료, 실제 난이도 체감을 확인합니다.
2. 가방 배지의 5→5→8 탐색과 방 12조각/배경 선택 후 닫기·재열기를 확인합니다.
3. 전달 원고가 있는 경우 선택→반응→마무리→다이어리, 재접속 중복 반영 방지를 확인합니다.
4. 제공 편지가 있는 경우 준비/실패·재시도/ready, 엔딩 중 재접속, 최종 저장 실패 후 재시도를 확인합니다.
5. 테스트 저장의 슬롯별 오류/재시도·삭제 확인과 계정 연결 대기 화면을 확인합니다. 실제 provider 제공 시 미인증 차단·로그인·기기 로그아웃도 확인합니다. 운영 계정이나 실제 저장을 실험용으로 삭제하지 마세요.
6. 테스트용 실제 수신 모델이 있을 때만 퍼즐 안내→NEW→방 상세 확인과 재접속을 확인합니다. 기본 실행에서 허구 획득을 만들지 않습니다.

새 테스트 프로필로 검수하되 기존 브라우저 저장을 지우지 마세요. 다른 포트는 localStorage가 분리됩니다. 이번 구현에서는 브라우저를 자동 조작하지 않았습니다.

<a id="asset-handoff"></a>

## 5. 애셋 인계

원본 자원은 읽기 전용으로 사용합니다. 파일 존재·코드 참조 확인을 최종 아트 승인이나 실기기 검수로 간주하지 않습니다.

| 대상 | 현재 연결·원본 위치 | 남은 확인 |
|---|---|---|
| 타이틀·초대장·프로필 | `asset/ui/`, `asset/effect/` | 최종 PNG 버튼·프레임 선택과 화면 합성 검수 |
| 학생·펫 | `asset/character/`, `asset/pet/` | 캐릭터별 크롭·투명 여백과 루루 화면 매핑 |
| 모험 플레이어 | `asset/sd_character/`의 기본 6명 × 8방향 | 추가 캐릭터 SD, 모션 최종 검수 |
| 마이룸 | 마이룸2 낮·노을·밤 세트와 전달받은 선택 배경 | 추가 3종의 이미지·조각 인덱스·해금 결과 |
| 활동 썸네일 | 현재 장소 배경·지도 설정의 썸네일 | 전용 최종 활동 이미지 여부 |
| 모험 지도 | `asset/map/`의 MP01·MP02·MP03 런타임 자원 | 금지 영역·목표 마스터·최종 시작점과 정렬 기준 |
| 배지·퍼즐 | 배지 조립 자원과 전달된 진행도 표시 프레임 | 실제 획득 ID·지급 결과·배경별 12조각 아트 매핑 |

### 제공 경로와 교체 원칙

| 화면 요청 경로 | 저장소 자원 |
|---|---|
| `world-assets/{파일}` | `asset/background/{파일}` |
| `character-assets/{파일}` | `asset/character/{파일}` |
| `design-assets/{분류}/{파일}` | 서버가 허용한 `asset/{분류}/{파일}` |
| `sd-assets/SD03_{방향}_strip.png` | `prototype/assets/`의 이전 시안 호환 경로. 현재 모험은 전용 SD 로더 사용 |

- 이전 파일명은 `src/core/asset-paths.mjs`의 호환표로 연결하며 원본을 복제하지 않습니다.
- 정적 서버가 허용하지 않는 파일은 존재하더라도 공개되지 않습니다. 신규 경로는 실제 HTTP 응답과 사용 화면을 함께 확인합니다.
- 영상·음악·효과음은 [실행 안내의 오디오 절](README.md#타이틀-음악-전환)과 [오디오 원본 안내](../asset/audio/README.md)를 따릅니다.
- 규격·투명 여백·안전 크롭 기준이 없으면 담당자 확인 대상으로 남깁니다. 임의 신장·최종 아트 선택·퍼즐 지급 규칙을 만들지 않습니다.
- 전경은 기준선·영역 데이터 인계 전까지 사용자 승인대로 항상 캐릭터 앞에 표시합니다.
- 2026-10-14의 상세 자산 표와 당시 확인 요청은 [자산 인계 이력](UPDATE_PLAN.md#asset-history)에 보존했습니다. 그 표의 과거 파일명·사용 화면을 현재 구현으로 해석하지 않습니다.

원본 목록·파일명·규격은 각 카테고리 문서를 확인하세요: [전체 자원](../asset/README.md), [UI](../asset/ui/README.md), [효과](../asset/effect/README.md), [배경](../asset/background/README.md), [캐릭터](../asset/character/README.md), [펫](../asset/pet/README.md), [SD](../asset/sd_character/README.md), [아이템](../asset/item/README.md), [배지](../asset/badge/README.md), [퍼즐](../asset/puzzle/README.md), [맵](../asset/map/README.md).

<a id="map-handoff"></a>

## 6. 지도 교체와 활동 후 이야기

지도 설정은 `src/core/adventure-mission.mjs` 한곳에서 관리합니다. 현재 `greenhouse`(MP01)·`library`(MP02)는 새 3840×2160 PNG 전체맵·전경·마스크를 사용하고 `observatory`(MP03)는 기존 WebP와 1920×1080 마스크를 사용합니다. MP01·MP02의 `thumbnail`은 같은 PNG 전체맵입니다. 서버는 `asset/map/`을 직접 제공하며 실제 화면의 가림·충돌·확대 품질은 플레이 검수 대기입니다. 다음 지도 교체는 아래 순서를 따릅니다.

1. `ADVENTURE_MAPS`에 새 지도 ID를 만들고 `world / mask / foreground / thumbnail` 파일 경로를 지정합니다. 파일은 기존 `asset/map/`의 런타임 자원을 사용합니다.
2. 같은 월드 좌표 기준으로 `spawn` 시작점과 `zoom`을 설정합니다. `placement.forbiddenZones`에는 배치 금지 사각형 `{x, y, width, height}`를 넣습니다. 현재 온실의 금지 영역 데이터는 미제공이므로 빈 배열이며, 임의의 연출 영역을 금지 영역으로 추정하지 않습니다.
3. 교체할 장소의 `ADVENTURE_LOCATIONS.mapId`를 새 지도 ID로 지정합니다. 플레이 맵과 활동 카드·달력·다이어리 썸네일이 같은 설정을 읽습니다. 미등록 지도 ID는 온실로 몰래 대체하지 않고 오류로 처리합니다.

배치의 발 영역 여유는 현재 24 월드 단위, 조사 반경은 88, 목표 간격은 최소 200이며 조사 원의 지름보다 작아지지 않습니다. 수치는 교체 가능한 시안 상수입니다. 마스크 해상도에 맞춰 월드 크기의 여유를 환산하고, 그 여유를 확보할 수 없는 좁은 통로 너머의 목표 후보는 제외합니다. 시작점까지 충분한 여유가 없거나 후보가 부족하면 같은 활동을 재시도할 수 있는 오류 화면을 표시합니다.

`src/core/story-events.mjs`는 일반 조우와 기존 임시 이야기 저장 호환을 유지합니다. 새 정식 이야기 조건과 결과는 `src/core/narrative.mjs`, 제공 데이터의 표시와 선택은 `src/ui/narrative.mjs`로 분리합니다. 실제 발생 결정과 정식 원고는 전달받으며, 새 임시 이야기를 무작위로 생성하지 않습니다. 백엔드 계약이나 스토리 원문은 이 작업에서 변경하지 않았습니다.

저장·화면 순서는 다음과 같습니다.

1. 활동 결과와 `pendingActivityStory`(선정 대기 토큰) 저장.
2. 모험이면 결과 팝업을 유지하고 사용자의 `다음으로` 확인을 기다림.
3. 해당 활동의 전달 결정을 읽고, 별도 이야기 시작점 또는 후보 없음 상태 저장.
4. 이야기가 있으면 대화·선택·반응을 표시하고 장면 종료 결과 저장.
5. 다음 예정 일정으로 자동 진행. 금요일이면 이야기 저장 후에만 주간 종료.

결과 저장 전에는 후보를 선정하지 않습니다. 저장 실패 시 다음 활동을 잠그고 같은 스냅샷·후속 동작을 재시도합니다. 재접속하면 선정 대기 토큰 또는 저장된 이야기 시작점을 복구하며, 대사·선택 중간 위치는 저장하지 않습니다. 중단 복구는 새 이야기 토큰을 만들지 않습니다. 발생 결정이 없는 기본 실행에서는 장면을 임의 생성하지 않습니다. 실제 발생 결정·가중 선정 서비스와 정식 원고 연결은 후속입니다.
