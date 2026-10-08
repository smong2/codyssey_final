# LUMIA Designer Guide

## 그래픽 제작 가이드

> 문서 상태: **Current Specification v1.3 · 2026-10-06**
>
> 현재 확정된 제작 기준입니다. 명시된 `TBD`/개발 확인/Playtest 확인 항목만 후속 검토합니다.
>
> 상위 기준 문서: `LUMIA_GAME_DESIGN.md`

> **변경 요약:** 첨부 원본의 상세 내용을 보존하고 Intro/Admission, MAP04 대형 맵, Dialogue/UI, Heart, Mobile, 보호자 경계 및 Prototype 한정 캐릭터 범위를 관련 본문에 통합했다.

> 이 Part는 Lumia의 화면 구조와 그래픽 제작 원칙을 이해하기 위한 설명입니다. 실제 작업 항목은 PART 2에서 확인합니다.

## 관련 문서

- 전체 게임 기준: `LUMIA_GAME_DESIGN.md`
- 전체 제작 목록: `LUMIA_DESIGNER_PRODUCTION_REQUEST.md`
- 첫 Prototype: `LUMIA_PROTOTYPE_PLAN.md`

# 1. Lumia는 어떤 게임인가요?

### 이번 Prototype 제작 기준

Desktop/Mobile에서 Intro Movie → Title → 32명 Card/상세/큰 이미지 열람 및 카엘 시작/확인 → UI07 입학 → 광장 Life → 온실 Life/Adventure → World Change/시온 Choice → My Room/Bern/Reflection → Heart Record/Diary → ♥100 Episode 완료 보상 → 저녁 자유 상태/Bern Short Talk → Day End → Day02 My Room까지 검증한다. 이번 Prototype만 카엘 1명 플레이이며 다른 31명은 시작 버튼·제한 안내 없는 열람 전용이다. 전체 게임의 32명 선택·플레이 설계는 유지한다. 전투·HP/EXP·Stage Map·Mini Game·전체 SD·보호자 UI는 [Prototype 제외]다.

이미지와 텍스트는 임시 JSON으로 연결한다. 실제 API/로그인/서버 저장은 후속 단계다. 디자인 자산이 완성되면 같은 ID에 연결된 이미지 경로와 표시 정보를 교체한다. 임시 자산 사용이 디자인 승인 또는 게임 적용 QA 완료를 뜻하지 않는다.

Lumia는 아이가 Arcadia에서 사람들과 대화하고 사건을 발견하며, 필요한 경우 직접 장소를 탐험하고 문제를 해결한 뒤 자신의 경험을 돌아보는 따뜻한 판타지 생활 모험 게임입니다.

현재 게임의 핵심 플레이 흐름은 다음과 같습니다.

**게임 시작 → 캐릭터 선택 → 입학 → Arcadia Life → 사건 발견/조사 → 필요하면 Adventure → Encounter/Puzzle → World Change → Arcadia Life 복귀 → My Room → Bern/Reflection → 다음 이야기**

가장 중요한 점은 **Arcadia Life와 Adventure가 서로 다른 세계가 아니라는 것**입니다.

같은 장소여도 모드별 배경 자산과 화면 구도는 다르다. Life용 배경에 SD만 작게 얹는 방식으로 두 모드를 표현하지 않는다. Adventure는 MAP04 기반 Large Map Illustration을 World Background로 사용하고, 카메라 viewport·SD·코드 collision/interaction 좌표·UI overlay로 조작 가능한 공간을 구성한다.

예를 들어 평소의 온실은 큰 배경과 캐릭터 일러스트가 등장하는 대화 중심의 Life 화면입니다. 하지만 Episode 중 온실을 직접 조사해야 한다면 같은 온실이 SD 캐릭터를 움직이는 Adventure 화면으로 전환됩니다.

---

# 2. 두 가지 화면 방식을 먼저 이해해 주세요

## 2.1 Arcadia Life Mode

Life Mode는 정적인 장소 화면을 중심으로 진행됩니다.

- 큰 장소 배경
- 큰 캐릭터 이미지
- Dialogue
- Choice
- Event
- 장소 이동 UI

캐릭터가 SD 모습으로 화면을 걸어 다니지 않습니다.

예:

**온실 배경 + 큰 NPC 캐릭터 + 대화창**

고정된 책상, 벽, 창문, 식물 등은 배경에 포함해도 됩니다. 다만 Episode에 따라 움직이거나 상태가 변해야 하는 물체는 별도 이미지로 분리할 수 있습니다.

- Player는 왼쪽, NPC는 오른쪽에 고정한다. 모든 인물은 opacity 100%, blur 없음, 기본 scale/position 고정이다. 화자 brightness 100%와 비화자의 약한 brightness 감소를 약 150~250ms로 전환한다.
- 하단 단일 Dialogue Panel을 사용하며 일반 대화는 panel click/tap과 작은 Dialogue Advance Arrow로 진행한다. 일반 [계속]/[다음] 버튼은 사용하지 않는다. Choice 동안 arrow를 숨기고 실제 행동/상태전환 버튼의 텍스트는 유지한다.
- Desktop Choice는 두 캐릭터 사이 중앙 Safe Area에 세로 배치한다. Mobile에서는 Dialogue Box 위로 이동하고 긴 문장은 자동 높이로 처리한다. 선택 후 Choice를 닫고 Player 실제 발화 → NPC 반응으로 이어진다.
- Dialogue Context Image Slot은 유리꽃/달빛 약초/룬을 보여 줄 필요가 있는 장면만 사용한다. 고정 portrait slot이 아니다.
- Bag/Diary/Menu은 icon + short label로 표시한다. [Playtest 확인] 1~2% scale 변화는 필요성 검토 옵션이며 기본 동작이 아니다.

## 2.2 Adventure Mode

Adventure Mode는 기존 Arcadia 장소를 직접 탐험할 때 사용하는 화면입니다.

- SD 캐릭터 직접 이동
- 8방향 이동
- MAP04 Large Map Illustration / WebP World Background
- Player-follow camera viewport
- 코드 collision polygon/rectangle 및 interaction points
- 조사·수집·Rune UI overlay
- Restored Map 또는 부분 World Change overlay
- 필요 시 선택적 foreground layer
- 조사/채집
- Encounter
- Puzzle
- [Later] 필요할 경우 Mini Game; 이번 Prototype 제외
- Knowledge/Item 발견
- World Change

**Adventure는 새로운 장소가 아닙니다.**

Prototype에서는 기존 장소 중 **유리 온실·약초원**만 Adventure로 제작합니다. `MAP04_어드벤처_전체맵_무드시안.png`를 기반으로 고해상도 원본을 보존하고 배포용 raster WebP를 제공합니다. 신규 Tile/Modular Map Engine·Tile asset 제작은 [Prototype 제외]입니다. 조사 포인트는 그림을 잘라 붙이는 방식이 아니라 개발 좌표/overlay로 연결합니다.

## 2.3 Character Select Card / 확대 열람

Character Select의 Card는 인물 선택과 이미지 확대 열람을 구분한다. Card 본문을 누르면 선택 상태와 정보 Panel만 바뀌며, **Card 안쪽 모서리의 작은 `+` Button**을 누르면 해당 인물의 큰 이미지를 Modal/Overlay로 연다.

- `+` Button은 기존 `UI03_캐릭터_카드_배경.png` 위에 실제 UI Overlay로 배치한다. 배경 이미지에 합성하지 않는다.
- 현재 선택 표시와 `+` Button의 역할을 시각적으로 구분한다. `+`는 선택/Confirm을 대신하지 않는다.
- 큰 이미지를 닫으면 같은 탭·페이지·Card 선택 상태로 복귀한다. 상세 Panel에는 같은 전신 이미지를 다시 중복 표시하지 않는다.
- Mobile에서는 Card 목록을 터치 세로 스크롤로 이동한다. `+`의 실제 터치 영역을 충분히 크게 확보하고, Card Grid의 스크롤·탭과 충돌하지 않게 한다.
- PC에서는 Card 목록을 마우스 휠로 부드럽게 이동한다. 클릭과 `+` Button은 스크롤 제스처와 구분하며, 확대 Overlay는 화면 Safe Area 안에서 닫을 수 있어야 한다.

---

# 3. 게임 그래픽 제작에 필요한 주요 개념

## State

같은 물체가 상황에 따라 다른 모습으로 변하는 것을 말합니다.

예:

**어두운 Rune → 활성화된 Rune**

**시든 식물 → 회복된 식물**

따라서 Rune을 두 개의 서로 다른 물체로 생각하기보다 `Rune의 두 State`라고 생각하면 됩니다.

모든 Asset에 여러 State가 필요한 것은 아닙니다. **실제 플레이에서 모습이 달라져야 할 때만 제작합니다.**

## Layer

서로 독립적으로 움직이거나 바뀌어야 하는 그림을 따로 만드는 것입니다.

예를 들어 온실 배경 전체를 한 장으로 만들더라도, 사건 해결 후 빛나야 하는 Rune은 별도 PNG로 만들 수 있습니다.

## Large Map Illustration / Viewport

온실 전체를 큰 한 장의 World Background로 그립니다. 고해상도 원본과 배포 raster WebP를 구분합니다. 실제 화면에는 전체 지도를 축소하지 않고 viewport 안의 일부만 보여 주며 카메라가 SD를 따라갑니다.

collision polygon/rectangle과 interaction point는 개발에서 지도 좌표로 정의합니다. 디자이너는 맵 기준점·이동 가능한 길·조사 포인트의 시각 정보를 함께 전달합니다. World Change는 Restored Map 또는 부분 overlay로 납품합니다.

## Foreground

캐릭터보다 앞쪽에 보여야 하는 물체입니다.

예를 들어 SD 캐릭터가 큰 식물 뒤로 걸어가면 식물 일부가 캐릭터를 가릴 수 있습니다.

디자이너가 실제 앞뒤 계산을 구현할 필요는 없습니다. **앞을 가릴 가능성이 있는 이미지를 별도로 준비**하면 개발에서 처리합니다.

## Master Sheet

SD 캐릭터의 방향/걷기 Frame을 24장씩 따로 생성하는 대신 일정한 Grid 안에 여러 Frame을 함께 제작한 원본입니다.

승인된 Master Sheet를 프로그램으로 자동 분리합니다.

---

# 4. Asset 제작 공통 원칙

1. **기존 Asset을 사용할 수 있으면 새로 만들지 않습니다.**
2. 같은 기능의 UI와 Effect는 공통 Asset을 재사용합니다.
3. 움직이거나, 상호작용하거나, 상태가 변하거나, 캐릭터 앞뒤를 가려야 하는 요소만 필요에 따라 분리합니다.
4. 캐릭터 표정과 Object State는 실제 Scenario에서 필요한 것만 제작합니다.
5. Full Game 항목이라고 해서 지금 제작하지 않습니다.
6. Prototype에서 검증되지 않은 콘텐츠를 대량 생산하지 않습니다.
7. Puzzle/Mini Game Mechanic은 Episode마다 새로 만들지 않고 작은 Mechanic Library를 재사용합니다.
8. AI 이미지는 `작은 시안 → 검토 → 선택 → 필요한 크기의 원본 제작 → 게임 적용` 순서로 진행합니다.
9. SD Animation은 개별 Frame 생성보다 `Master Sheet → 검수 → 자동 분리`를 우선합니다.
10. 정확한 Sprite Cell, World Map WebP 크기/압축, 필요 Atlas, Export 규격은 실제 Desktop/Mobile viewport와 Prototype Scale을 테스트한 뒤 확정합니다.
11. UI 안에 변경될 수 있는 텍스트를 이미지에 직접 굽지 않습니다.
12. 배경이 없어야 하는 캐릭터/Object/Icon은 투명 PNG를 기본으로 합니다.

---

# 5. 제작 상태 표시

### 교체 가능한 납품 정보

자산별로 ID, 파일 경로/추후 URL, 버전, 제작/QA 상태, 원본 크기, 게임 표시 크기, 투명 여부와 기준점 정보를 연결한다. SD는 방향·프레임 순서·프레임 크기·발 기준점을 포함한다. 식물/룬의 Before/After는 같은 배치 기준점을 유지한다. 충돌/상호작용 정보는 개발 설정으로 분리한다.

대화·질문·선택지·이름표·힌트·리포트 문구는 이미지에 굽지 않는다. 긴 임시 대사가 최종 대사로 바뀌어도 공통 UI가 대응하도록 구성한다. 화면 통짜 시안은 배치 참고용이며 조작 가능한 게임 UI와 구분한다.

기존 카엘 SD의 책 위치/보행, 베른 투명 경계, 식물 상태 전환의 화분 정렬은 미완료 QA로 유지한다. 후속 자산을 교체할 때 실제 게임 표시 크기와 밝고 어두운 배경에서 다시 확인한다. 실패 후보를 자동으로 최신본으로 선택하지 않는다.

| 표시 | 의미 |
|---|---|
| 🔴 Prototype | 현재 첫 Prototype에서 실제로 필요 |
| 🔵 Existing | 기존 Asset을 우선 사용/보완 |
| 🟡 Later | 최종 게임에서 필요하지만 현재 제작하지 않음 |
| ⚪ TBD | Prototype 결과 또는 팀 결정 후 제작 여부 확정 |
| ⚫ Optional | 필요성이 확인될 때만 제작 |

> **⚪ TBD / 🟡 Later / ⚫ Optional 항목은 별도 요청 전까지 제작하지 않습니다.**

---

# 6. 이미지 크기를 읽는 방법

이 문서의 크기는 크게 세 종류입니다.

### 초기 제작 권장 크기

AI 생성이나 디자인 작업을 시작하기 위한 원본 크기입니다.

### 테스트 값

Prototype에서 먼저 시험해 볼 값입니다. 실제 플레이 결과에 따라 바뀔 수 있습니다.

### TBD

지금 확정하면 오히려 재작업 가능성이 높은 값입니다.

특히 Adventure는 다음 순서로 확정합니다.

**MAP04 전체 맵 원본 → Desktop/Mobile viewport → Camera → SD 표시 크기 → collision/interaction 기준점 → 필요 overlay/foreground → 배포 WebP/최종 Export 크기**

따라서 `TBD`라고 적힌 이미지는 크기를 임의로 확정하여 대량 제작하지 않습니다.

---

# 7. Intro / Admission 제작 구분

사용자 제공 `intro/intro.mp4`로 어둠 → 작은 빛 → 원형 Rune Awakening → 밝아짐을 재생한다. 이후 실제 `BG01` Arcadia 이미지 → LUMIA Logo/Main Title UI로 이어진다. Skip은 Arcadia Reveal/Title로 연결한다. 게임 내 Title로 돌아가기를 선택하면 Intro부터 재생하며 저장 진행을 덮어쓰지 않는다. 저장이 있어도 Intro 뒤 Title에서 [이어하기]/[새 이야기 시작]을 제공한다. 영상 재생/코덱 실패 시 정적 Rune → Arcadia → Title fallback을 사용한다. BGM·환경음·SFX는 [Prototype 제외]다. Admission의 실시간 Rune/Fade와 별개다.

Admission은 `UI07_입학_초대장.png` 원본을 실제 화면에 사용합니다. 개인화 이름·Script v2 문구·[입학하기]는 교체 가능한 UI Text로 올리고 CSS 대체 디자인은 만들지 않습니다. Intro 영상과 Admission 실시간 Rune/Fade를 같은 제작물로 처리하지 않습니다.

# 8. Responsive / Mobile

Desktop 화면을 단순 축소하지 않는다. touch target과 safe area, 긴 Choice의 자동 높이, Dialogue overflow를 고려해 UI를 재배치한다. Intro Movie는 핵심 Rune을 central safe area에 두어 모바일 crop에 대응한다. Adventure는 Mobile에서도 큰 World Map 일부를 viewport로 보여 주며 player-follow camera를 유지한다. PC는 방향키/WASD 이동 + E 상호작용, Mobile/Tablet은 가상 조이스틱 이동 + 문맥 행동 버튼을 설계·검증한다. 입력 감지·지도 메모리·터치 충돌은 [개발 확인], 조작감/가독성은 [Playtest 확인]이다. iPhone 6s는 저사양 최적화 참고 수준이며 실기기 성능 검증은 완료조건이 아니다.

# 9. Heart / Diary / 보호자 제작 경계

Episode 완료/Diary 저장 뒤 ♥+100 reward feedback, My Room의 compact icon+balance만 필요합니다. Life/Adventure/Dialogue/Puzzle에는 global persistent Heart HUD를 만들지 않습니다. 보상은 Choice/Hint/실패/중단/속도와 무관하며 성격 평가가 아닙니다. Theme 구매·복잡 경제는 [Prototype 제외]입니다.

Heart Record/Diary는 아이의 private 경험 기록입니다. BERN_SHORT_TALK_EP01은 Small Choice이며 답변 비저장·보상/평가 없음입니다. Parent Report/이야기 편지 UI는 [Later]/[Prototype 제외]로, 향후 Settings → 보호자 설정에서 별도 경험으로 제작합니다. Reflection/Diary raw content는 공개하지 않습니다.
