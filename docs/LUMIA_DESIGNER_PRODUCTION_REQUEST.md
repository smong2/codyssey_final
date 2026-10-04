# LUMIA Designer Production Request
## 전체 그래픽 제작 요청서

> 문서 상태: **Draft v1.1 · 2026-10-04**
>
> 팀 검토용 초안입니다. `TBD` 항목은 팀 논의와 Prototype 검증 결과에 따라 변경될 수 있습니다.
>
> 상위 기준 문서: `LUMIA_GAME_DESIGN.md`

> 이 Part는 실제로 제작·확인해야 하는 Asset을 관리하는 작업용 목록입니다. 목록에 포함되어 있어도 모두 지금 제작하는 것은 아니며, 반드시 상태 표시를 확인합니다.

## 관련 문서

- 전체 게임 기준: `LUMIA_GAME_DESIGN.md`
- 그래픽 제작 방식: `LUMIA_DESIGNER_GUIDE.md`
- 첫 Prototype: `LUMIA_PROTOTYPE_PLAN.md`

# 1. 전체 제작 목록

### 이번 Prototype 요청 범위 — 2026-10-04

임시 Title/카엘 선택·확인/입학부터 광장 Life, 온실 Life/Adventure, 온실 Life 복귀, My Room/Bern/Reflection, Heart Record, 부모 리포트 미리보기까지 PC에서 검증한다. 선택 가능한 플레이어와 SD는 카엘 1명이다. 학생 NPC는 기존 인물 중 제안 후 결정한다.

Life와 Adventure는 같은 온실이며 모드별 배경 자산·구도·조작 방식이 다르다. BG07은 Life 재사용 후보, Adventure는 기존 ENV/OBJ/SD를 사용해 탐험용 공간을 구성한다. 전투·HP/EXP·Stage Map·Mini Game·전체 SD 제작은 제외한다.

이미지 경로와 텍스트는 임시 JSON으로 제공한다. 자산은 안정적인 ID와 버전, 표시 크기·기준점·프레임 정보를 연결하여 교체한다. 원본을 보존하고 실패 후보는 사용 후보에서 제외한다. 실제 로그인/서버 저장/API용 화면 제작은 이번 요청에 포함하지 않는다.

| 구분 | 재사용 후보 / 남은 작업 |
|---|---|
| Life 배경 | BG02 광장, BG07 온실, BG03 My Room 기존 내보내기 활용; 실제 화면 크롭/가독성 검수 |
| 캐릭터 | CH01 카엘, 학생 NPC 기존 원화; NPC03 베른은 투명 경계 QA 미완료 |
| Adventure | 카엘 SD03 24프레임, ENV 바닥/식물/구조, OBJ 식물/약초/룬; 투영·크기·접지·가림과 동선 검수 |
| 상태 변화 | OBJ01/02 식물 화분 정렬 미완료, OBJ04/05 룬 상태 전환 검수 |
| UI/퍼즐 | UI01~04/07/08~10, FX01, PZ01+퍼즐 SVG 재사용; 임시 텍스트와 반응형 UI 조합 |
| 시작/끝 화면 | 임시 Title/카엘 확인/입학, Reflection/Heart Record/부모 리포트 공통 UI 조립; 신규 통짜 그림은 필수 아님 |

생성·분리 파일이 있다는 사실은 사용 승인과 다르다. 미완성 자산은 임시로 연결해 흐름을 확인하고 완성 후 교체·재검수한다. 학생 NPC 표정 추가는 캐스팅과 대본 검토 이후 필요한 것만 요청한다.

## 1.1 Start / Title / Admission

| 제작물 | 상태 | 게임에서 보이는 크기/역할 | 초기 제작 권장 px | 투명 | 분리 | 수량/State | 비고 |
|---|---|---|---|---|---|---|---|
| Title 화면 구성 | 🔴 | 게임 첫 화면 전체 | 1920×1080 | X | - | 1 | Layout 기준 |
| Lumia Logo | 🔴/🔵 | Title 중심 Logo | 폭 약 1024 이하 | O | O | 1 | 기존 여부 확인 |
| Rune Effect | 🔴 | 시작/전환의 빛 효과 | 약 256~512 | O | O | 1계열 | 여러 화면 재사용 |
| Start Button | 🔴 | 이야기 시작 Button | 폭 약 512 이하 원본 | O | O | 필요한 State | 공통 Button Style |
| 입학 초대장 | 🔴 | 화면 중앙의 양피지/초대장 | 약 1200×800 | O 권장 | O | 1 | 캐릭터 이름은 UI Text |
| 화면 Transition | 🔴 | 화면 전체 전환 | 화면 기준 | O | O | Fade/Rune | 별도 영상 제작 불필요 |

Intro와 Loading용 대형 일러스트를 별도로 의무 제작하지 않습니다.

---

## 1.2 Character Select

| 제작물 | 상태 | 게임에서 보이는 크기/역할 | 초기 제작 권장 px | 투명 | 분리 | 수량/State | 비고 |
|---|---|---|---|---|---|---|---|
| Select 전체 Layout | 🔴 | 전체 선택 화면 | 1920×1080 | - | - | 1 | Layout |
| Character Card | 🔴 | 목록의 작은 캐릭터 Card | 폭 약 300~400 기준 시안 | O | O | 기본/선택 | Template 재사용 |
| Character Image | 🔵 | Card/상세에 사용 | 약 1024×1536 | O | O | 기존 32명 | 신규 32명 제작 아님 |
| Gender Tab | 🔴 | 남성/여성 전환 | UI 기준 | O | O | 기본/선택 | |
| Character Info Panel | 🔴 | 이름/칭호/성격 등 | Layout 기준 | O | O | 1 Template | |
| 확대 Button | 🔴 | 캐릭터 이미지 확대 | 약 128×128 | O | O | 1 | 공통 Icon 가능 |
| Confirm Popup | 🔴 | 최종 캐릭터 확인 | 폭 약 800~1000 | O | O | 1 | |
| Prototype 노출 캐릭터 | 🔵 | 카엘 선택/확인 | 기존 이미지 활용 | O | - | 1명 | 플레이어 카엘 고정 |

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
| Dialogue Panel | 🔴 | 대화 Text 표시 | 1920×1080 Layout 기준 | O | 1 Template | |
| Choice Button | 🔴 | Story 선택 | 폭 약 600~900 원본 | O | 기본/선택 | 재사용 |
| Objective Panel | 🔴 | 현재 할 일 | 폭 약 600~800 | O | 1 | |
| Notification | 🔴 | 발견/획득 등 알림 | 폭 약 600~800 | O | 1 Template | |
| 장소 이동 UI | 🔴 | Arcadia 장소 이동 | Layout 기준 | O | 방식 TBD | 정확한 UI는 미확정 |

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

## 1.6 Greenhouse Adventure - Tile / Environment

| 제작물 | 상태 | 역할 | 초기 제작 권장 px | 투명 | 분리 | 예상 수량 | 비고 |
|---|---|---|---|---|---|---|---|
| 기본 Floor Tile | 🔴 | 온실 바닥 반복 | 약 128×128 테스트 | X | O | 1 | 최종 TBD |
| Floor Variant | 🔴 | 반복감 감소 | 약 128×128 | X | O | 2~3 | |
| Path/Border | 🔴 | 길/경계 | Tile 기준 | 상황별 | O | 필요한 것만 | |
| 작은 식물 | 🔴 | 환경 장식 | 128~256 | O | O | 2~3 | 재사용 가능 |
| 큰 식물 | 🔴 | 환경/가림 | 256~512 | O | O | 2~3 | |
| 화단 | 🔴 | 공간 경계 | 512~1024 | O | O | 1~2 | 충돌은 개발에서 설정 |
| 화분 | 🔴 | 환경 Object | 256~512 | O | O | 1~2 | |
| 덩굴 | 🔴 | 장식/단서 | 256~512 | O | O | 1~2 | |
| 온실 구조물 | 🔴 | 공간 특징 | 512~1024+ | O | 필요 시 | 최소 | |
| Foreground 식물 | 🔴 | 캐릭터 앞을 가림 | 512~1024 | O | O | 2~3 | Depth 표현용 |

> 모든 잎과 식물을 별도 파일로 분리하지 않습니다. **독립적으로 움직이거나 상호작용하거나 상태가 변하거나 캐릭터를 가려야 할 때만 분리합니다.**

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

기존 3×3 퍼즐 자산을 시험 출발점으로 사용한다. 최종 난이도/배치는 플레이테스트로 조정한다. 달빛 약초 획득은 퍼즐 진입/해결 조건이 아니다.

플레이어가 Rune 조각을 회전시켜 끊긴 빛의 흐름을 연결합니다.

### 그래픽 제작물

| 제작물 | 상태 | 역할 | 초기 제작 권장 px | 투명 | State/수량 | 비고 |
|---|---|---|---|---|---|---|
| Puzzle 전체 Layout | 🔴 | Puzzle 화면 구성 | 1920×1080 기준 | - | 1 | |
| Puzzle Panel | 🔴 | Puzzle 영역 | 화면 약 60~80% 기준 | O | 1 | 향후 재사용 |
| Rune Tile | 🔴 | 회전하는 조각 | **TBD** | O | Grid 확정 후 | |
| Rune Pattern | 🔴 | 직선/곡선 등 | Tile 기준 | O | 최소 Set | |
| Rune 비활성 State | 🔴 | 빛이 흐르지 않음 | Tile 기준 | O | 1계열 | |
| Rune 활성 State | 🔴 | 빛이 연결됨 | Tile 기준 | O | 1계열 | |
| Start/Goal 표시 | 🔴 | 시작/도착 지점 | Tile 기준 | O | 1 Set | |
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
| Bag Icon | 🔴 | Inventory 열기 | 약 128×128 | O | 1 | |
| Inventory Panel | 🔴 | 보유 Item | 폭 약 800~1200 | O | 1 | 최소 기능 |
| Item Slot | 🔴 | Item 표시 | 약 128×128 원본 | O | Empty/Item/Selected 필요 시 | |
| Journal Icon | 🔴 | 발견한 것 열기 | 약 128×128 | O | 1 | 명칭 최종 TBD |
| 발견한 것 Panel | 🔴 | Knowledge 표시 | 폭 약 800~1200 | O | 1 | |
| Hint Button | 🔴 | 도움 요청 | 128~256 | O | 1 | |
| Hint Panel | 🔴 | 단계적 Hint | 폭 약 800~1000 | O | 1 Template | L1/L2/L3 같은 UI |
| Tablet Joystick | 🔴 | Tablet 이동 | 256~512 원본 | O | 기본/입력 | Gameplay Test |
| Tablet Action | 🔴 | Tablet 상호작용 | 128~256 | O | 기본/활성 | |
| PC Key Guide | 🔴 | PC 조작 안내 | UI 기준 | O | 최소 | 항상 표시할지는 Test |

### Hint의 3단계

- L1: 관찰할 부분을 알려줌
- L2: 해결 원리를 알려줌
- L3: 첫 행동을 구체적으로 알려줌

세 단계마다 다른 UI를 만들지 않습니다.

---

## 1.11 World Change

World Change를 위한 별도의 Full-screen 화면을 만들지 않습니다.

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
| Bern | 🔵 | 대화/Reflection | 기존 큰 Character 기준 약 1024×1536 | O | 필요한 State만 | 표정 대량 선제작 금지 |
| Reflection Panel | 🔴 | 경험 돌아보기 | 폭 약 1000~1400 | O | 1 | |
| Reflection Choice | 🔴 | 짧은 응답 | Choice UI 재사용 | O | 공통 | |
| 수집품 화분 | ⚫ | Optional 발견의 흔적 | 256~512 | O | 1 | Prototype 여유 시 |

My Room Prototype은 방 꾸미기 시스템 전체를 만드는 것이 목적이 아닙니다.

---

## 1.13 Heart Record

| 제작물 | 상태 | 역할 | 초기 제작 권장 px | 수량 | 비고 |
|---|---|---|---|---|---|
| Memory Card | 🔴 | Episode 경험 기록 | 폭 약 800~1200 | 1 Template | |
| Memory Visual | 🔴 | 카드 대표 Visual | 기존 Asset 조합 우선 | 1 | 신규 Episode Illustration 의무 없음 |

`Background Crop + Character/Icon + Text`처럼 기존 Asset을 조합하여 제작량을 줄이는 방식을 우선합니다.

---

## 1.14 Parent Feedback

Prototype에서는 이번 로컬 플레이의 주요 Story Choice와 World Reaction으로 **Report의 Tone과 정보 구조를 확인하는 미리보기**를 제작합니다. 보호자 계정 연결이나 실제 전송은 포함하지 않습니다. Reflection/Heart Record 원문과 일반 NPC 질문 답변을 리포트에 넣지 않습니다.

| 제작물 | 상태 | 역할 | 초기 제작 권장 px | 수량 |
|---|---|---|---|---|
| Parent Report Layout | 🔴 | 보호자용 Report 화면 | 1920×1080 기준 | 1 |
| Report Card/Panel | 🔴 | 이야기/선택/반응/대화 제안 | Layout 기준 | 1 Template |
| Icon | 🔴 | 보조 표시 | 약 128×128 원본 | 공통 재사용 |

Prototype Sample 구성:

1. 어떤 이야기였나요?
2. 아이는 어떻게 했나요?
3. 그 뒤에는 어떻게 되었나요?
4. 함께 이야기해 보세요.

점수, 등급, 성격 판정, 성장 그래프는 만들지 않습니다.

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
