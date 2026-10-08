# LUMIA Designer Production Request

## 전체 그래픽 제작 요청서

> 문서 상태: **Current Specification v1.3 · 2026-10-06**
>
> 현재 확정된 제작 기준입니다. 명시된 `TBD`/개발 확인/Playtest 확인 항목만 후속 검토합니다.
>
> 상위 기준 문서: `LUMIA_GAME_DESIGN.md`

> **변경 요약:** 첨부 원본의 상세 내용을 보존하고 Intro/Admission, MAP04 대형 맵, Dialogue/UI, Heart, Mobile, 보호자 경계 및 Prototype 한정 캐릭터 범위를 관련 본문에 통합했다.

> 이 Part는 실제로 제작·확인해야 하는 Asset을 관리하는 작업용 목록입니다. 목록에 포함되어 있어도 모두 지금 제작하는 것은 아니며, 반드시 상태 표시를 확인합니다.

## 관련 문서

- 전체 게임 기준: `LUMIA_GAME_DESIGN.md`
- 그래픽 제작 방식: `LUMIA_DESIGNER_GUIDE.md`
- 첫 Prototype: `LUMIA_PROTOTYPE_PLAN.md`

# 1. 전체 제작 목록

### 이번 Prototype 요청 범위 — 2026-10-06

Intro Movie/Title/32명 Card·상세·큰 이미지 열람/카엘 확인/UI07 입학부터 광장 Life, 온실 Life/Adventure, World Change/시온 Choice, My Room/Bern/Reflection, Heart Record/Diary, ♥100 Episode 완료 보상, 저녁 자유 상태/Bern Short Talk, Day End/Day02까지 Desktop/Mobile에서 검증한다. 전체 게임은 32명 중 플레이 캐릭터를 선택한다. 이번 Prototype만 카엘 Life/SD를 지원하며 다른 31명은 시작 버튼·제한 안내 없는 열람 전용이다. NPC는 발렌티누스/시온/베른이다.

Life와 Adventure는 같은 온실이며 모드별 배경 자산·구도·조작 방식이 다르다. BG07은 Life 재사용 후보, Adventure는 MAP04 Large Map Illustration의 WebP World Background + 기존 카엘 SD + follow camera + 코드 collision/interaction + UI overlay로 구성한다. 전투·HP/EXP·Stage Map·Mini Game·전체 SD 제작은 제외한다.

이미지 경로와 텍스트는 임시 JSON으로 제공한다. 자산은 안정적인 ID와 버전, 표시 크기·기준점·프레임 정보를 연결하여 교체한다. 원본을 보존하고 실패 후보는 사용 후보에서 제외한다. 실제 로그인/서버 저장/API용 화면 제작은 이번 요청에 포함하지 않는다.

| 구분 | 재사용 후보 / 남은 작업 |
|---|---|
| Life 배경 | BG02 광장, BG07 온실, BG03 My Room 기존 내보내기 활용; 실제 화면 크롭/가독성 검수 |
| 캐릭터 | CH01 카엘, 학생 NPC 기존 원화; NPC03 베른은 투명 경계 QA 미완료 |
| Adventure | MAP04 Large Map Illustration 원본/배포 WebP, 카엘 SD03 24프레임, 코드 좌표 collision·interaction, 선택적 foreground; viewport·크기·접지·가림과 동선 검수 |
| 상태 변화 | OBJ01/02 식물 화분 정렬 미완료, OBJ04/05 룬 상태 전환 검수 |
| UI/퍼즐 | UI01~04/07/08~10, FX01, PZ01+퍼즐 SVG 재사용; 임시 텍스트와 반응형 UI 조합 |
| 시작/끝 화면 | 임시 Title/카엘 확인/입학, Reflection/Heart Record/Diary/Heart reward 공통 UI 조립; 신규 통짜 그림은 필수 아님 |

생성·분리 파일이 있다는 사실은 사용 승인과 다르다. 미완성 자산은 임시로 연결해 흐름을 확인하고 완성 후 교체·재검수한다. 발렌티누스/시온/베른 표정은 Script v2에서 필요한 것만 요청한다.

## 1.1 Start / Title / Admission

| 제작물 | 상태 | 게임에서 보이는 크기/역할 | 초기 제작 권장 px | 투명 | 분리 | 수량/State | 비고 |
|---|---|---|---|---|---|---|---|
| Title 화면 구성 | 🔴 | 게임 첫 화면 전체 | 1920×1080 | X | - | 1 | Layout 기준 |
| Lumia Logo | 🔴/🔵 | Title 중심 Logo | 폭 약 1024 이하 | O | O | 1 | 기존 여부 확인 |
| Intro Movie | 🔴/🔵 | 어둠→작은 빛→원형 Rune Awakening→밝아짐 | 제공 intro/intro.mp4 원본 | X | - | 1 | 제공 영상 사용; central safe area/Skip/코덱 fallback 검증; BGM/SFX 제외 |
| Arcadia Reveal | 🔴/🔵 | 영상 뒤 실제 Arcadia 이미지 | BG01 원본 | X | - | 1 | 이후 LUMIA Logo/Main Title UI |
| Admission Rune Effect | 🔴 | 초대장 이후 실시간 빛 전환 | 약 256~512 | O | O | 1계열 | Intro 영상과 구분 |
| Start Button | 🔴 | 이야기 시작 Button | 폭 약 512 이하 원본 | O | O | 필요한 State | 공통 Button Style |
| 입학 초대장 | 🔴/🔵 | UI07 원본 Admission | UI07 원본 규격 | 원본 유지 | Text/UI 분리 | 1 | UI07_입학_초대장.png + 개인화 이름/Script v2/[입학하기]; CSS 대체 금지 |
| Admission Transition | 🔴 | 화면 전체 전환 | 화면 기준 | O | O | 실시간 Fade/Rune | 2~3초, Intro Movie와 별개 |
| Skip UI | 🔴 | Intro 건너뛰기 | UI 기준 | O | O | 1 | 넓은 touch target 및 safe area |

Intro는 제공 영상과 실제 BG01을 사용합니다. Skip/Title 돌아가기 시 Intro 재생/저장 후 Title 이어하기·새 이야기 시작/영상 실패 정적 Rune fallback을 확인합니다. Loading용 새 대형 일러스트는 의무 제작하지 않습니다.

---

## 1.2 Character Select

| 제작물 | 상태 | 게임에서 보이는 크기/역할 | 초기 제작 권장 px | 투명 | 분리 | 수량/State | 비고 |
|---|---|---|---|---|---|---|---|
| Select 전체 Layout | 🔴 | 전체 선택 화면 | 1920×1080 | - | - | 1 | Layout. Mobile=Card 목록 터치 세로 스크롤, PC=휠 부드러운 스크롤 |
| Character Card | 🔴 | 목록의 작은 캐릭터 Card | 폭 약 300~400 기준 시안 | O | O | 기본/선택 | `UI03_캐릭터_카드_배경.png` 재사용 우선. Card 본문=선택, 내부 `+`=확대 열람 |
| Character Image | 🔵 | Card/상세에 사용 | 약 1024×1536 | O | O | 기존 32명 | 신규 32명 제작 아님 |
| Gender Tab | 🔴 | 남성/여성 전환 | UI 기준 | O | O | 기본/선택 | |
| Character Info Panel | 🔴 | 이름/칭호/성격 등 | Layout 기준 | O | O | 1 Template | |
| 확대 Button | 🔴 | Card 안쪽 모서리에서 큰 이미지 Overlay 열기 | 약 128×128 원본, 실제 터치 영역은 반응형 기준 이상 | O | O | 1 | `+` Icon. 선택/Confirm과 분리하며 UI03 배경에 합성 금지 |
| Confirm Popup | 🔴 | 최종 캐릭터 확인 | 폭 약 800~1000 | O | O | 1 | |
| Prototype 열람 캐릭터 | 🔵 | Card/상세/큰 이미지 | 기존 이미지 활용 | O | - | 32명 | 32명 전원 열람; UI03/UI02 재사용 |
| Prototype 플레이 캐릭터 | 🔵 | 카엘 시작/Confirm/Life/SD | CH01 기존 이미지 | O | - | 1명 | 다른 31명 시작 버튼/제한 안내 없음; 전체 게임 32명 플레이 설계와 구분 |

---

## 1.3 Arcadia Life Background

| 장소 | 상태 | 역할 | 초기 제작 권장 px | Prototype |
|---|---|---|---|---|
| 시계탑 광장 | 🔴/🔵 | 사건 시작 Life 화면 | 1920×1080 | O |
| 대서고 | 🟡/🔵 | Knowledge 중심 Life 장소 | 1920×1080 | X |
| 천문대 | 🟡/🔵 | 관찰 중심 Life 장소 | 1920×1080 | X |
| 유리 온실·약초원 | 🔴/🔵 | Life + Prototype Adventure 진입 | 1920×1080 | O |
| 마도 공방 | 🟡/🔵 | 제작/조작 중심 Life 장소 | 1920×1080 | X |
| 수련장 | 🟡/🔵 | 조작/집중 중심 Life 장소 | 1920×1080 | X |
| 기숙사 | 🟡/🔵 | 일상/관계 Story | 1920×1080 | X |
| My Room | 🔴/🔵 | 휴식/Reflection | 1920×1080 | O |

기존 배경 Asset이 있다면 반드시 먼저 재사용 가능 여부를 확인합니다.

---

## 1.4 Life Character / Dialogue UI

| 제작물 | 상태 | 역할 | 초기 제작 권장 px | 투명 | 수량/State | 비고 |
|---|---|---|---|---|---|---|
| 큰 Character Image | 🔵 | Life 대화의 인물 | 약 1024×1536 | O | 기존 활용 | Scenario 등장인물만 사용 |
| 추가 표정 | ⚪ | 필요한 감정 표현 | 기존 원본 기준 | O | 필요한 것만 | 32명 표정 세트 선제작 금지 |
| Dialogue Panel | 🔴 | 하단 단일 대화 Text | Desktop/Mobile Layout 기준 | 원본 Frame 기준 | 1 Template | 인물 opacity 100%/no blur/고정 scale-position, brightness 150~250ms |
| Dialogue Advance Arrow | 🔴 | 작은 대화 진행 표시 | UI 기준 | O | 1 | panel click/tap 진행; Choice 때 숨김; 넓은 touch target |
| Context Image Slot/Frame | 🔴 | 유리꽃/약초/룬 필요 장면 | responsive Layout 기준 | O | 1 Template | 고정 portrait slot 아님 |
| Choice Button | 🔴 | Story 선택 | 폭 약 600~900 원본 | O | 기본/선택 | Desktop 중앙 Safe Area 세로/ Mobile Dialogue Box 위; 긴 문장 자동 높이; 선택 후 Player 실제 발화→NPC 반응 |
| Objective Panel | 🔴 | 현재 할 일 | 폭 약 600~800 | O | 1 | |
| Notification | 🔴 | 발견/획득 등 알림 | 폭 약 600~800 | O | 1 Template | |
| 장소 이동 UI | 🟡 Later | 전체 Arcadia 장소 이동 | Layout 기준 | O | 방식 TBD | Prototype은 확정 장면/온실 진입·귀환/Day End만 구현 |

---

## 1.5 Adventure SD Character

| 제작물 | 상태 | 역할 | 초기 제작 권장 px | 투명 | 수량/State | 비고 |
|---|---|---|---|---|---|---|
| 대표 SD Character | 🔴 | 직접 조작 캐릭터 | **TBD** | O | 1명 | Gameplay Test 후 크기 확정 |
| Walk Animation | 🔴 | 8방향 이동 | SD Cell과 동일 | O | 최대 24 Frame | 8방향×3 |
| Idle | 🔴 | 정지 | Walk 중립 Frame 재사용 | O | 별도 제작 최소화 | |
| SD Master Sheet | 🔴 | AI/검수용 원본 | Cell 확정 후 | O | 1~분할 Sheet | 자동 Crop |

### 제작 순서

**대표 캐릭터 → 8방향 Base Pose → 3Frame Walk → 실제 화면 Test → Lumia SD Base Rule 확정**

처음부터 32명의 SD 캐릭터를 제작하지 않습니다.

---

## 1.6 Greenhouse Adventure — Large Map Illustration

| 제작물 | 상태 | 역할 | 원본/배포 규격 | 분리 | 비고 |
|---|---|---|---|---|---|
| MAP04 Greenhouse Large Map | 🔴/🔵 | 전체 World Background | 고해상도 원본 보존 / raster WebP 배포본 | 맵 1장 | MAP04_어드벤처_전체맵_무드시안.png 기반; 크기/압축 [개발 확인] |
| Restored Map | 🔴 | World Change After | Before와 동일 좌표/기준점 | 전체 맵 또는 부분 overlay | 기존 동선/interaction 좌표 유지 |
| Change Overlay | 🔴 | 회복 꽃/Rune 빛 변화 | Map 좌표 기준 | 필요한 부분만 | Restored Map과 중복 제작은 필요성 확인 |
| Foreground layer | ⚫ Optional | SD 앞을 가림 | 맵 기준점과 배치 정보 포함 | 필요한 것만 | depth/occlusion은 개발에서 처리 |
| 지도 배치 참고 | 🔴 | 동선/조사 지점 전달 | MAP04 좌표 기준 | 구현 설정 분리 | collision polygon/rectangle·interaction points는 코드로 정의 |

배포본은 WebP World Background로 player-follow camera viewport에서 일부만 보입니다. 신규 Tile/Modular Map Engine, 바닥 Tile/Floor Variant/Environment 조립 asset 제작은 [Prototype 제외]입니다. 독립적인 상태 변화나 가림이 필요한 요소만 분리합니다.

---

## 1.7 Investigation / Collection / Encounter

| 제작물 | 상태 | 역할 | 초기 제작 권장 px | 투명 | State/수량 | 비고 |
|---|---|---|---|---|---|---|
| 시든 식물 | 🔴 | 조사 대상 | 256~512 | O | 시듦/회복 | World Change 재사용 |
| 달빛 약초 | 🔴 | 채집 Item | 128~256 | O | 기본/채집 후 제거 | Prototype Item |
| 달빛 약초 Icon | 🔴 | Inventory 표시 | 약 128×128 | O | 1 | 원본 축소가 불명확할 때만 별도 단순화 |
| Encounter Rune | 🔴 | 사건 중심 Object | 256~512 | O | 어두움/활성 | |
| 유리꽃 씨앗 | ⚫ | Optional 발견물 | 128~256 | O | 1 | 시간 부족 시 제외 |
| 유리꽃 Icon | ⚫ | Optional Inventory | 약 128×128 | O | 1 | 필요할 때만 |

---

## 1.8 Puzzle

### Prototype Mechanic

**Connect / Rotate**

이는 이미지 이름이 아니라 **게임 규칙**입니다.

기존 3×3 퍼즐 자산을 시험 출발점으로 사용한다. Prototype에서는 기존 3×3 격자/조각/연결 판정을 유지한다. 최종 표시 크기·난이도는 [Playtest 확인]이다. 달빛 약초 획득은 퍼즐 진입/해결 조건이 아니다.

플레이어가 Rune 조각을 회전시켜 끊긴 빛의 흐름을 연결합니다.

### 그래픽 제작물

| 제작물 | 상태 | 역할 | 초기 제작 권장 px | 투명 | State/수량 | 비고 |
|---|---|---|---|---|---|---|
| Puzzle 전체 Layout | 🔴 | Puzzle 화면 구성 | 1920×1080 기준 | - | 1 | |
| Puzzle Panel | 🔴 | Puzzle 영역 | 화면 약 60~80% 기준 | O | 1 | 향후 재사용 |
| Rune Puzzle Piece | 🔴 | 회전하는 조각 | **TBD** | O | 기존 3×3 | 새 Grid 제작 제외 |
| Rune Pattern | 🔴 | 직선/곡선 등 | Puzzle 조각 기준 | O | 최소 Set | |
| Rune 비활성 State | 🔴 | 빛이 흐르지 않음 | Puzzle 조각 기준 | O | 1계열 | |
| Rune 활성 State | 🔴 | 빛이 연결됨 | Puzzle 조각 기준 | O | 1계열 | |
| Start/Goal 표시 | 🔴 | 시작/도착 지점 | Puzzle 조각 기준 | O | 1 Set | |
| Puzzle Light Effect | 🔴 | 연결 Feedback | 약 256~512 원본 | O | 공통 | Rune Effect 재사용 |

---

## 1.9 Mini Game / Mechanic Library

첫 Prototype에서는 **Mini Game을 제작하지 않습니다.**

| 항목 | 상태 | 현재 방향 |
|---|---|---|
| 공방 Mini Game | ⚪ TBD | 구체 Mechanic 추후 결정 |
| 수련장 Mini Game | ⚪ TBD | 구체 Mechanic 추후 결정 |
| Match / Group | ⚪ 후보 | 기존 Mechanic Library |
| Dig / Search | ⚪ 후보 | 기존 Mechanic Library |
| Catch / Avoid | ⚪ 후보 | 기존 Mechanic Library |
| Pair / Match | ⚪ 후보 | 기존 Mechanic Library |

향후 한 Mechanic을 여러 장소/이야기에 Theme만 바꾸어 재사용할 수 있습니다.

예:

`Connect/Rotate → 온실 Rune 흐름 / 천문대 별빛 경로 / 공방 마법 회로`

---

## 1.10 Adventure HUD / Inventory / Knowledge / Hint

| 제작물 | 상태 | 역할 | 초기 제작 권장 px | 투명 | State | 비고 |
|---|---|---|---|---|---|---|
| Objective HUD | 🔴 | 현재 목표 | Layout 기준 | O | 1 | |
| Interaction Button | 🔴 | 살펴보기/채집 등 | 128~256 원본 | O | 기본/활성 | |
| Bag Icon | 🔴 | Inventory 열기 | 약 128×128 | O | 1 | icon + short label |
| Inventory Panel | 🔴 | 보유 Item | 폭 약 800~1200 | O | 1 | 최소 기능 |
| Item Slot | 🔴 | Item 표시 | 약 128×128 원본 | O | Empty/Item/Selected 필요 시 | |
| 알아낸 것 HUD | 🔴 | 객관적 조사 사실 | responsive Layout 기준 | O | 1 | 흙 촉촉/햇빛 들어옴/룬 빛 중간 끊김; 발견 기록/Journal 버튼 제거 |
| Diary Icon | 🔴 | My Room 기록 열기 | 약 128×128 | O | 1 | icon + short label |
| Menu Icon | 🔴 | 메뉴 열기 | 약 128×128 | O | 1 | icon + short label |
| Hint Button | 🔴 | 도움 요청 | 128~256 | O | 1 | |
| Hint Panel | 🔴 | 단계적 Hint | 폭 약 800~1000 | O | 1 Template | L1/L2/L3 같은 UI |
| Mobile/Tablet Joystick | 🔴 | Tablet 이동 | 256~512 원본 | O | 기본/입력 | Gameplay Test |
| Mobile/Tablet Action | 🔴 | Tablet 상호작용 | 128~256 | O | 기본/활성 | |
| PC Key Guide | 🔴 | PC 조작 안내 | UI 기준 | O | 최소 | 항상 표시할지는 Test |

### Hint의 3단계

- L1: 관찰할 부분을 알려줌
- L2: 해결 원리를 알려줌
- L3: 첫 행동을 구체적으로 알려줌

세 단계마다 다른 UI를 만들지 않습니다.

---

## 1.11 World Change

World Change는 MAP04 Restored Map 또는 부분 change overlay로 동일 Adventure 안에서 표현합니다. Puzzle 직후 Life로 자동 전환하지 않습니다. 직접 재관찰을 제공하되 회복 꽃 재조사는 선택이며 입구 귀환을 막지 않습니다.

Prototype에서는 다음 State 변화가 핵심입니다.

| 대상 | Before | After |
|---|---|---|
| Encounter Rune | 어둡고 비활성 | 빛나며 활성 |
| 식물 | 시듦 | 회복 |
| 주변 Effect | 어둡거나 없음 | Rune Light |
| Life 온실 | 사건 상태 | 회복 상태를 작은 Overlay/Effect로 표현 가능 |

**Puzzle 보상은 점수보다 세계가 실제로 변하는 느낌으로 전달합니다.**

---

## 1.12 My Room / Bern / Reflection

| 제작물 | 상태 | 역할 | 초기 제작 권장 px | 투명 | State/수량 | 비고 |
|---|---|---|---|---|---|---|
| My Room Background | 🔴/🔵 | 개인 공간 | 1920×1080 | X | 1 | 기존 우선 |
| Day Cycle Overlay | 🔴 | 아침 햇빛/저녁 실내등·창밖 | 배경 기준 | O | morning/evening | 같은 방, Story State로만 변화 |
| Heart Balance HUD | 🔴 | My Room 기본 화면 compact icon + balance | UI 기준 | O | 1 | 일반 Life/Adventure 및 Bern 포함 모든 Dialogue/Puzzle에서는 숨김 |
| Heart +100 Reward Feedback | 🔴 | Diary 뒤 Episode 완료 | UI 기준 | O | 1 | 평가/성과 무관 1회; Diary 저장 알림과 분리 |
| Day End Transition | 🔴 | 명시적 하루 종료→Day02 | 화면 기준 | O | 1 | Episode2 미노출 종료점 |
| Bern | 🔵 | 대화/Reflection | 기존 큰 Character 기준 약 1024×1536 | O | 필요한 State만 | 표정 대량 선제작 금지 |
| Reflection Panel | 🔴 | 경험 돌아보기 | 폭 약 1000~1400 | O | 1 | |
| Reflection Choice | 🔴 | 짧은 응답 | Choice UI 재사용 | O | 공통 | |
| 수집품 화분 | ⚫ | Optional 발견의 흔적 | 256~512 | O | 1 | Prototype 여유 시 |

My Room Prototype은 방 꾸미기 시스템 전체를 만드는 것이 목적이 아닙니다. Theme 구매/복잡 경제는 [Prototype 제외]입니다. BERN_SHORT_TALK_EP01은 확정 Script를 사용하며 Small Choice 답변 비저장·보상/평가 없음입니다. 별도 표정이 없으면 기본 표정을 유지합니다.

---

## 1.13 Heart Record

| 제작물 | 상태 | 역할 | 초기 제작 권장 px | 수량 | 비고 |
|---|---|---|---|---|---|
| Memory Card | 🔴 | Episode 경험 기록 | 폭 약 800~1200 | 1 Template | |
| Memory Visual | 🔴 | 카드 대표 Visual | 기존 Asset 조합 우선 | 1 | 신규 Episode Illustration 의무 없음 |

`Background Crop + Character/Icon + Text`처럼 기존 Asset을 조합하여 제작량을 줄이는 방식을 우선합니다.

---

## 1.14 Parent Feedback — [Later]/[Prototype 제외]

아이 Prototype Flow에는 Parent Report/미리보기 화면이 없습니다. 향후 Settings → 보호자 설정 → 이야기 편지/부모 리포트의 별도 경험으로 연결합니다.

| 제작물 | 상태 | 역할 | 초기 제작 권장 px | 수량 |
|---|---|---|---|---|
| Parent Report Layout | 🟡 Later | 보호자용 이야기 편지 | 1920×1080 기준 | 1 |
| Report Card/Panel | 🟡 Later | 이야기/중립 행동/반응/대화 제안 | Layout 기준 | 1 Template |
| Icon | 🟡 Later | 보조 표시 | 약 128×128 | 공통 재사용 |

후속 정보 구조는 1. 어떤 이야기였나요? 2. 아이는 어떻게 했나요? 3. 그 뒤에는 어떻게 되었나요? 4. 함께 이야기해 보세요.입니다. 점수·등급·성격 판정·성장 그래프는 만들지 않습니다. Reflection/Diary/Heart Record raw content와 일반 NPC 답변은 공개하지 않습니다.

---

## 1.15 Common UI Kit

화면마다 새로운 Button/Panel을 만들지 않습니다.

공통으로 재사용할 수 있는 기본 Style을 먼저 만듭니다.

- Button
- Panel
- Tab
- Popup
- Card
- Item Slot
- Icon Background
- Selected 표시
- Disabled 표시 - 실제 필요한 경우만

UI는 고정 크기의 한 장짜리 이미지보다 **내용에 맞게 늘어날 수 있는 구조**가 중요합니다.

---

## 1.16 Common Effect Kit

Prototype에서 우선 필요한 Effect:

- Rune Glow
- Interaction Feedback
- Selection Feedback
- Puzzle 연결 Feedback
- World Change Light
- Fade / Transition

작은 Effect 원본은 약 **256~512px**을 초기 기준으로 사용하되 Full-screen Effect는 화면에 맞게 별도로 처리합니다.

---

## 1.17 Responsive / 납품 확인

Desktop 화면을 단순 축소하지 않는다. touch target과 safe area, 긴 Choice의 자동 높이, Dialogue overflow를 고려해 UI를 재배치한다. Intro Movie는 핵심 Rune을 central safe area에 두어 모바일 crop에 대응한다. Adventure는 Mobile에서도 큰 World Map 일부를 viewport로 보여 주며 player-follow camera를 유지한다. PC는 방향키/WASD 이동 + E 상호작용, Mobile/Tablet은 가상 조이스틱 이동 + 문맥 행동 버튼을 설계·검증한다. 입력 감지·지도 메모리·터치 충돌은 [개발 확인], 조작감/가독성은 [Playtest 확인]이다. iPhone 6s는 저사양 최적화 참고 수준이며 실기기 성능 검증은 완료조건이 아니다.

- [ ] 고해상도 원본/배포 WebP, 맵 기준점, 상태 변화 overlay를 구분한다.
- [ ] Intro/Admission은 별도 제작물이며 기존 영상/UI07을 실제 사용한다.
- [ ] 32명 열람/카엘만 시작을 이번 Prototype 제작 범위로 표기한다.
- [ ] Dialogue Advance Arrow/Context Image Slot·Frame/Bag·Diary·Menu Icon/Heart Balance HUD/Heart +100 Reward Feedback을 실제 납품·구현 항목으로 확인한다.
- [ ] BGM/환경음/SFX, 새 Tile/Modular 제작, Parent UI, Theme 경제, Episode2는 [Prototype 제외]다.
