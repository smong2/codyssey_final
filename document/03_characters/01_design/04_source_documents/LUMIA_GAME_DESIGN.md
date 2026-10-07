# LUMIA 통합 게임 기획서

> 문서 상태: **Draft v1.0**
>
> 용도: 팀 공유용 통합 기준 문서
>
> 기존 01~04 문서와 본 통합 기획서가 충돌하는 경우, 팀 논의를 통해 이후 확정된 본 통합 기획서의 설계를 현재 기준으로 사용합니다. 단, 변경하지 않은 기존 세계관·캐릭터 설정은 계속 유효합니다.

## 이 문서 읽는 법

- **[원본 기반]** 기존 프로젝트 문서에서 가져온 설정/방향
- **[확정 설계]** 이후 팀 논의에서 현재 기준으로 확정한 구조
- **[신규 설계]** 원안에 없었으나 추가한 구조
- **[설계 변경]** 기존 제안에서 의도적으로 변경한 구조
- **[TBD]** 아직 결정하지 않은 항목
- **[Later/Optional]** Prototype 이후 필요성을 보고 결정할 항목

## Lumia 한눈에 보기

**Character Select → Admission → Arcadia Life → 사건/대화/조사 → 직접 탐험이 필요하면 기존 Arcadia 장소를 Adventure Mode로 전환 → SD 탐험/Encounter/Puzzle → Choice → World Change → Arcadia Life 복귀 → My Room/Bern/Reflection → 다음 이야기**

- Arcadia Life = 큰 장소 배경 + 큰 캐릭터 + Dialogue/Choice/Event 중심의 정적 생활 화면
- Adventure = Episode 중 직접 탐색과 조작이 필요할 때 **기존 Arcadia 장소**를 SD 직접 조작 화면으로 전환하는 플레이 모드
- 이번 프로젝트에서는 새로운 Adventure 전용 장소를 추가하지 않는다.
- 첫 Adventure Prototype 장소는 **유리 온실·약초원**이다.
- 대서고/천문대 Adventure 적용 여부는 온실 Prototype 이후 결정한다.
- Player에게 보이는 마음 Stat/HP/EXP/Level은 사용하지 않는다.
- Prototype 핵심 검증은 `Life → Adventure → Life → My Room`의 연결과 현재 팀 규모에서의 반복 제작 가능성이다.

### 현재 확정 / TBD

**확정:** 전체 게임 Skeleton, Episode 제작 구조, Parent Feedback 철학, Life/Adventure 표현 분리, 신규 장소 추가 없음, 기존 Arcadia 장소 기반 Adventure, Greenhouse 첫 Prototype, Prototype 검증 목표/질문.

**TBD:** 정식 Episode 1, Greenhouse 이후 Adventure 장소, Prototype Character Select 인원/캐스팅, SD/Tile/Map/Atlas 최종 규격, Balance/DB 세부값, Engine, Arcadia 이동 UI.

------------------------------------------------------------------------


## 1. 프로젝트 개요

### 1.1 프로젝트 정의

**루미아(LUMIA)**는 초등학교 중·고학년 아이들이 아카데믹 클래식 판타지
세계의 주인공이 되어 다양한 성향의 동료들과 관계를 맺고, 사건을
탐험하고, 주체적인 선택을 내리는 웹 기반 생활 어드벤처 게임이다.

**슬로건**\
\> 마음의 선택으로 나와 세상을 성장시키는 따뜻한 룬 판타지 생활 모험

### 1.2 핵심 철학

-   교육을 전면에 내세우지 않는다.
-   아이는 교육 콘텐츠가 아니라 판타지 세계의 탐험, 관계, 사건, 선택에
    몰입한다.
-   선택에는 단순한 정답/오답을 두지 않는다.
-   선택의 결과는 점수가 아니라 NPC, 룬, 환경, 이야기의 변화로 보여준다.
-   실패는 종료나 벌점이 아니라 새로운 정보와 가능성을 얻는 과정이다.
-   재미에 직접 필요하지 않은 시스템은 만들지 않는다.

### 1.3 핵심 문장

> **Lumia는 아이의 마음을 점수로 성장시키는 게임이 아니다. 아이가 내린
> 선택을 세계가 기억하고 반응하는 게임이다.**

------------------------------------------------------------------------

## 2. 대상 사용자와 경험 목표

### 2.1 플레이 대상

-   핵심 연령: 약 9\~11세
-   유아적으로 느껴지는 표현을 피하고, 아이가 동경할 수 있는 조금 더
    성숙한 아카데미 판타지 경험을 제공한다.
-   완성형 학생 캐릭터를 선택하여 플레이한다.

### 2.2 학부모

학부모는 직접 플레이 대상이 아니라 **피드백 대상**이다.

학부모 피드백의 목적은: - 아이를 평가하거나 통제하는 것 X - 아이의 실제
성격을 진단하는 것 X - 아이가 게임에서 경험한 상황과 선택을 이해하는 것
O - 부모-아이의 대화를 시작하는 Bridge 역할 O

### 2.3 핵심 가치

1.  타인 이해 / 다양성 존중
2.  갈등 회복 탄력성 / 소통
3.  도덕적 주체성 / 선택의 책임
4.  자아존중감 / 성장 마인드셋

------------------------------------------------------------------------

## 3. 게임 디자인 원칙

### 3.1 시스템 추가 판단 기준

새 기능을 제안할 때 다음을 먼저 확인한다.

1.  정말 재미에 필요한가?
2.  기존 시스템으로 해결할 수 없는가?
3.  콘텐츠 제작량을 계속 증가시키는 구조인가?

### 3.2 제작 원칙

> **스토리 구조는 단순하게, 탐험 경험은 풍부하게.**

> **새 Episode ≠ 새 System**\
> **새 Episode = 기존 System + 새 Story + 필요한 기존 장소 활용 + 새 Encounter/상황 + 새 Choice + 새 World Reaction**

### 3.3 Visible Stat 없음

플레이어에게 다음 수치를 제공하지 않는다. - HP - 공격력 / 방어력 - 공감
/ 절제 / 판단 / 책임감 등의 마음 Stat - Character Level / EXP - 숫자형
NPC 호감도

대신 내부적으로 다음 State/Data는 존재할 수 있다. - choice_logs -
dimensionTags - Knowledge flags - NPC Memory - Episode / Adventure /
Encounter state - Inventory / Coin / Room Theme

`dimensionTags`는 콘텐츠 분류와 리포트 맥락 정리를 위한 내부 데이터이며
플레이어의 성격 점수로 변환하지 않는다.

------------------------------------------------------------------------

## 4. 세계관과 Arcadia

### 4.1 주요 공간

-   시계탑 광장 & 분수대
-   대서고
-   별빛 천문대
-   유리 온실 & 치유의 약초원
-   마도 공방
-   수련장
-   학원 기숙사
-   My Room

### 4.2 공간별 게임 역할

  -----------------------------------------------------------------------
  공간                                게임 역할
  ----------------------------------- -----------------------------------
  시계탑 광장                         사람, 생활, Event, 사건의 시작

  대서고                              기록된 역사, Lore, Knowledge

  별빛 천문대                         **\[신규 설계\]** 현재 세계의
                                      변화·날씨·마법·원거리 이상 현상
                                      관측

  유리 온실                           식물, 관계, 감정, 채집, 생활 Event

  마도 공방                           재료 → 도구 제작, 수리, 실천적 해결

  수련장                              **\[신규 설계\]** 안전한
                                      조작/Mechanic 연습 공간

  기숙사                              학생들의 일상, 소문, 생활 Dialogue,
                                      저녁 Event

  My Room                             개인 안식처, 수집, Room Theme,
                                      Bern, Reflection, Day End
  -----------------------------------------------------------------------

### 4.3 Rune / Shadow Rune

Rune은 마음과 의지에 반응한다. Shadow Rune 및 이상 현상은 단순한 악이나
처치 대상이 아니라 불안, 질투, 외로움, 오해, 단절 같은 갈등이 세계에
드러나는 방식으로 활용한다.

해결의 기본 흐름:
`이상 현상 → 관찰/경청/탐색 → 이해 → 행동/Choice → World Change`

------------------------------------------------------------------------

## 5. 전체 플레이 루프

```text
GAME START → CHARACTER SELECT → ADMISSION
→ ARCADIA LIFE
  - 기존 장소를 UI로 이동
  - 큰 배경 + 큰 캐릭터 + Dialogue / Event / Choice
  - 사건 발견 / 조사 / Knowledge
→ 직접 탐험이 필요한 경우
  - 같은 Arcadia 장소를 ADVENTURE MODE로 전환
  - SD 8방향 이동 / 탐색 / 조사 / 채집
  - Encounter / Puzzle / 필요 시 Mini Game
  - Knowledge / Item / Meaningful Choice
  - World Change
→ ARCADIA LIFE 복귀
  - 변화된 NPC / Dialogue / 상황
→ MY ROOM / BERN
→ HEART REFLECTION / HEART RECORD
→ NEXT STORY / DAY
```

원래 Heart Loop인 `갈등/사건 발견 → 탐색 및 경청 → 주체적 선택 → 룬/세계 변화 → My Room 성찰`을 실제 플레이 구조로 확장한다.

**[확정 설계] Adventure는 별도의 세계나 Stage 진행 구조가 아니라, Episode 중 기존 Arcadia 장소에서 직접 탐색과 조작이 필요할 때 사용하는 플레이 모드다.**

------------------------------------------------------------------------

## 6. Entry / Character Select / Admission

### 6.1 Entry

-   Intro
-   Loading
-   World Reveal
-   Title
-   Story Start

문구는 최종 카피 단계에서 조정한다.

### 6.2 Character Select

-   성별은 별도 Scene이 아니라 `[남성] [여성]` 탭으로 처리한다.
-   캐릭터 Card 선택 시 우측 정보가 변경된다.
-   큰 이미지 보기를 위한 확대 버튼을 제공한다.
-   상세 영역에는 전신 이미지를 반복해서 넣지 않는다.

표시 정보: - 이름 / 나이 - **칭호** - 짧은 성격 - 짧은 배경 - 강점 -
약점/어려움 - 대표 대사 - `[이 캐릭터로 시작하기]`

### 6.3 Confirmation / Admission

`캐릭터 선택 → 확인 Popup → 개인화된 입학 초대장 → Arcadia 도착`

최종 선택만 저장한다. 탐색 중의 Card 선택은 Local UI State다.

------------------------------------------------------------------------

## 7. Character / NPC 역할

### 7.1 32 Character

기존 완성형 캐릭터 설정을 기본 자료로 사용한다. 각 캐릭터는 성격, 배경,
강점, 약점, 말투, 칭호 등의 고유 설정을 가진다.

### 7.2 Valentinus

-   세계관 / Rune 원리 / Adventure 방향 안내
-   단순 Quest Giver가 아니다.
-   질문과 힌트를 통해 플레이어가 스스로 판단하도록 돕는다.

### 7.3 Bern

-   My Room 전담 조력자
-   휴식 / 지지 / Heart Reflection 담당
-   아이의 선택을 평가하거나 도덕적으로 채점하지 않는다.

역할 분리: `Valentinus = 바깥세상과 모험의 방향`\
`Bern = 경험을 돌아보는 안전한 개인 공간`

------------------------------------------------------------------------

## 8. Arcadia Life

Arcadia는 Click-only Hub가 아니다. 미니 캐릭터를 직접 조작해 돌아다니는
생활 공간이다.

기본 문법: `MOVE → DISCOVER → APPROACH → INTERACT → REACTION`

포함: - NPC Dialogue - 생활 Event - Random Question - Knowledge 발견 -
Workshop - My Room - 시간대에 따른 환경/NPC 변화

------------------------------------------------------------------------

## 9. Movement / Camera / Interaction

### 9.1 Movement

-   8방향 이동
-   PC: Arrow Keys + WASD
-   Tablet: Virtual Analog Joystick
-   대각선 이동 속도 Normalize
-   초기 Sprint 없음

### 9.2 Camera

-   Follow Camera
-   작은 Dead Zone
-   Smooth Follow
-   항상 강제 중앙 고정하지 않음

### 9.3 Collision / Depth

-   통과 가능 / 불가능 영역
-   큰 Object는 밑동/바닥 중심 Hitbox
-   2.5D Depth Sorting
-   필요 시 큰 전경 Object의 가시성 처리

### 9.4 Interaction

근처 상호작용 대상 감지 후 현재 Target을 정한다. 여러 대상이 가까우면
가장 적절한 Target을 Highlight한다.

Contextual Action 예: - 대화하기 - 살펴보기 - 열어보기 - 채집하기

------------------------------------------------------------------------

## 10. Exploration HUD

항상 보이는 HUD는 최소화한다. - 현재 Objective - Bag - Menu -
Tablet에서만 Joystick / Interaction Control

초기 제외: - HP Bar - EXP - Level - Skill Bar - Minimap - 일반 Gold
HUD - 마음 Stat

Objective는 Checklist가 아니라 한 문장의 자연어 Hint로 보여준다.

------------------------------------------------------------------------

## 11. Day / Time System

기본 Cycle: `아침 → 낮 → 저녁 → My Room / Day End → 다음 아침`

-   표준 Night Phase는 초기에는 만들지 않는다.
-   Story상 특별한 밤 Event는 가능하다.
-   Real-time Clock이 아니다.
-   가만히 있거나 이동한다고 시간이 흐르지 않는다.
-   Adventure 플레이 시간도 Arcadia 시간을 자동 진행시키지 않는다.
-   의미 있는 Event/Activity, Story Action, `[시간 보내기]` 등이 시간을
    진행시킬 수 있다.
-   놓친 시간대 콘텐츠가 영구 실패가 되지 않도록 설계한다.

핵심 문장: \> **시간은 플레이어를 재촉하지 않는다. 시간은 세계를
변화시킨다.**

------------------------------------------------------------------------

## 12. Episode / Event / Objective

### 12.1 Episode

하나의 완결된 이야기 / Heart Loop 단위다.

구성 가능 요소: - Main Objective - Event - Knowledge / Clue - Adventure
(Optional) - Major Choice - World Change - Reflection

Episode와 Adventure는 1:1이 아니다. Arcadia 내부에서 끝나는 Episode도
가능하다.

### 12.2 Objective

플레이어에게 지금의 방향을 한 문장으로 보여준다. Progress Counter형
Checklist를 만들지 않는다.

### 12.3 Event

조건에 의해 발생하는 장면/세계 변화. 반드시 Quest일 필요는 없다.

### 12.4 Side Event

복잡한 Side Quest 대신 짧은 `발견 → 행동 → 반응` 구조를 사용한다. -
Quest Accept 화면 없음 - Reward Popup 없음 - Daily Quest 없음 - Quest
Failure 없음

------------------------------------------------------------------------

## 13. Adventure Mode **[확정 설계]**

> **Adventure(무사수행)는 새로운 장소가 아니라, Episode 진행 중 기존 Arcadia 장소에서 직접 탐색과 조작이 필요할 때 전환되는 플레이 모드다.**

같은 장소를 Life에서는 큰 배경+캐릭터+Dialogue로, Adventure에서는 SD 캐릭터+Tile/Object+직접 조작으로 표현한다.

핵심 요소:
- SD 8방향 이동
- Tile 기반 바닥 / Modular Object
- 조사 / 채집 / 상호작용
- Encounter
- Puzzle / 필요 시 Mini Game
- Knowledge / Item
- Meaningful Choice
- World Change
- 최소 HUD

장소 적용:
- **Greenhouse:** 첫 Adventure Prototype 확정
- **Grand Library:** Greenhouse 검증 후 후보
- **Observatory:** Greenhouse 검증 후 후보
- 8개 장소 전체를 Adventure Map으로 만들 필요는 없다.

------------------------------------------------------------------------

## 14. Stage / Area / Portal 구조 **[설계 변경]**

현재 핵심 구조에서는 `Stage / Stage Map`, 플레이어가 인식하는 필수 `Area` 계층, 기본 이동용 `Rune Portal`, 전용 `Checkpoint Object`, `Stage Clear / 별 / Rank / Collection %`를 사용하지 않는다.

개발상 Map Chunk가 필요하면 내부 기술 용어로 Area를 사용할 수 있으나 플레이어 경험의 필수 구조는 아니다. Rune은 세계관/이상 현상 요소로 유지한다.

------------------------------------------------------------------------

## 15. Adventure 저장 / 복귀

- Adventure는 Episode 내부의 짧은 직접 탐험 Segment다.
- 필요하면 현재 Adventure 진행 상태를 저장할 수 있다.
- 별도 Checkpoint Object는 필요하지 않다.
- 해결 후 같은 장소의 Life Mode로 돌아가 변화된 NPC/Dialogue/환경 반응을 확인한다.
- 죽음/Respawn/부활 Loop는 사용하지 않는다.

------------------------------------------------------------------------

## 16. Arcadia 장소별 플레이 역할 **[확정 설계]**

| 장소 | 기본 역할 | Adventure 관계 |
|---|---|---|
| 시계탑 광장 | Life / Story / NPC / Event / Choice | 현재 강제하지 않음 |
| 대서고 | Life + Puzzle / Knowledge / 기록 | Greenhouse 이후 후보 |
| 천문대 | Life + Puzzle / 관찰 | Greenhouse 이후 후보 |
| 유리 온실·약초원 | Life + 발견/식물/관계 | **첫 Adventure Prototype** |
| 마도 공방 | Life + 제작/조작 Mini Game | Adventure 필수 아님 |
| 수련장 | Life + 반응/조작 Mini Game | Adventure 필수 아님 |
| 기숙사 | Life / Story / 관계 Event | 현재 강제하지 않음 |
| My Room | 휴식 / 수집 / Bern / Reflection | **Life Mode only** |

Adventure는 직접 탐험 **모드**, Puzzle/Mini Game은 Story나 Adventure 안에서 호출할 수 있는 **플레이 요소**다.

------------------------------------------------------------------------

## 17. Inventory / Item

### 17.1 Material

약초, 과일, 광석, Rune Fragment, 목재 등. Stack 가능.

### 17.2 Adventure Tool

Key, Rope, Lantern, Map Fragment, Rune Lens 등. 새로운 Contextual
Interaction을 연다.

### 17.3 Story Item

편지, 일기, NPC 물건, 단서 등. - 폐기 X - 판매 X - Crafting 재료 X

### 17.4 Collectible

장식품, 기념품, 희귀 발견물. My Room과 연결.

초기 Bag Capacity 제한 없음. 임의의 `[사용]` 버튼보다 상황에 맞는
Context Action을 사용한다.

------------------------------------------------------------------------

## 18. Knowledge / Clue / Journal

`ITEM = 내가 가진 것`\
`KNOWLEDGE = 내가 아는 것`

-   Clue: 아직 해결/연결되지 않은 관찰
-   Knowledge: 플레이어가 알아낸 사실

획득 경로: - 환경 관찰 - NPC Dialogue - Item 조사 - Encounter - 실패 -
Puzzle 규칙 - Story

Knowledge는 실제 플레이에 영향을 줘야 한다. - 새 Dialogue - 새
Interaction - 새 행동 - 새 길 - Objective 변화

초기 Journal: - `[현재 이야기]` - `[발견한 것]`

복잡한 수동 Clue Board는 만들지 않는다.

------------------------------------------------------------------------

## 19. NPC Dialogue / Random Question

### 19.1 Dialogue

모든 Dialogue에 선택지를 넣지 않는다. - 일반 Dialogue - Story Dialogue -
현재 상황 Reaction - Random Question - Special Event - Meaningful Choice

### 19.2 1000+ NPC Question Pool

백엔드에서 제공 예정인 Question Pool은 Full Random이 아니라 **Filtered
Random**으로 사용한다.

`Question Pool → 조건 Filter → 최근/반복 제외 → Eligible Pool → Random`

Filter 후보: - NPC / 성격 / Voice - 장소 - 시간 - Episode / Story
State - Knowledge - 관계/Context

Random Question은 설문이나 도덕 시험이 아니다. 모든 답변을 의미 있는
영구 상태로 저장하지 않는다.

------------------------------------------------------------------------

## 20. Choice System

종류: 1. Small Choice 2. State Choice 3. Major Choice

Choice는 `착한 선택 vs 나쁜 선택`이 아니라 서로 다른 현실적인 접근
방식으로 작성한다.

중요 Choice는 `choice_logs`에 저장할 수 있다. - episodeId - choiceId -
selected text - dimensionTags 등

`dimensionTags`는 내부 분류용이며 `공감 +10` 같은 Visible Stat으로
변환하지 않는다.

Choice 결과는: - NPC 대사/표정/행동 - 환경 - Rune - 향후 Dialogue -
Story State 등으로 보여준다.

------------------------------------------------------------------------

## 21. Encounter System

독립적인 Monster/Combat System을 만들지 않는다.

Encounter Category: - 존재 - 환경 - 마법 / Rune 이상 - 인물 - 돌발 사건

핵심 질문: \> **무슨 일이 일어나고 있지? 어떻게 해결할 수 있을까?**

해결 Channel: - 관찰 - 탐색 - Dialogue - Item - Knowledge - Puzzle -
Mini Game - Choice - 우회 - 도움 요청 - 환경 활용

중요 Encounter는 해결 후 반드시 World Reaction을 만든다.

------------------------------------------------------------------------

## 22. Failure / Hint

절대 원칙: - Death 없음 - GAME OVER 없음 - HP 없음 - Attempt Limit
없음 - Score Penalty 없음 - Hint Penalty 없음

핵심: \> **실패는 게임을 끝내는 것이 아니라 새로운 정보를 얻는
과정이다.**

실패 후 최소 하나의 정보, 경험, Hint 또는 새로운 가능성을 얻는다.

가능한 다음 행동: - 다시 시도 - 다른 방법 - 도움 받기 - 잠시 나가기 /
나중에 다시 하기

Hint 단계: 1. 관찰할 것 제시 2. 원리/규칙 제시 3. 첫 행동 제시

------------------------------------------------------------------------

## 23. Puzzle / Mini Game / Mechanic Library

-   Puzzle: "어떻게 해결하지?"
-   Mini Game: "한번 해볼까?"

기존 Prototype Mechanic을 재맥락화해 재사용한다.

Mechanic Library: 1. Match / Group 2. Dig / Search 3. Connect / Rotate
4. Catch / Avoid 5. Pair / Match 6. Choice

사용 공식:
`Mechanic + World Context + Story + Failure/Hint + World Change`

기존 Prototype에서 가져오지 않는 것: - Visible 인성/절제/판단 Stat -
+Stat Reward - Correct Moral Answer - Energy Gate - Broad Coin Economy

------------------------------------------------------------------------

## 24. World Change

Stage / Encounter / Episode 해결의 핵심 Feedback이다.

예: - 환경 변화 - NPC 위치/행동/표정 변화 - Dialogue 변화 - Rune 변화 -
길이 열림 - 새로운 Interaction - Arcadia의 작은 변화

별도의 Star/Score 기반 Clear 평가보다 세계의 변화 자체가 성취를
전달한다.

------------------------------------------------------------------------

## 25. Workshop / Crafting

Loop:
`Adventure → Material → Workshop → Tool → New Interaction → Adventure`

-   Recipe는 Story / Knowledge / NPC를 통해 자동 Unlock
-   재료가 충분하면 제작
-   Craft 실패 없음
-   Durability 없음
-   Repair Cost 없음
-   Upgrade Level 없음
-   Equipment Tier 없음
-   일반 제작 Mini Game 없음
-   Recipe Book 별도 시스템 초기 제외

Output: 1. Exploration Tool 2. My Room Object

Story Item은 Craft/Consume하지 않는다.

------------------------------------------------------------------------

## 26. Coin / Collection

Coin은 Broad Economy가 아니라 **My Room 성장 자원**이다.

획득: - 탐험 / Optional Discovery - Collection Activity - Side Event

하지 않음: - Mario식 Coin Row - Story Choice Reward - Reflection
Reward - Shop / Selling - NPC Gift Farming - 장비 강화

특별 Collectible은 판매하지 않고 기억/전시 대상으로 남긴다.

------------------------------------------------------------------------

## 27. My Room / Room Growth

### 27.1 My Room

개인의 안전한 공간. - Bern - Room Theme - Collectible - Heart
Reflection - Heart Record - Day End

### 27.2 Collectible Display

**초기:** 특별 Collectible 자동 전시\
**Later:** 자유 배치

원안의 자유 배치 비전은 유지하되 초기 구현량을 줄인다.

### 27.3 Room Theme

Unlock 조건: `Episode Progress + Coin`

-   Player EXP 없음
-   이전 Theme 재선택 가능
-   Cosmetic Only
-   Stat Bonus 없음

------------------------------------------------------------------------

## 28. Heart Reflection / Heart Record

### 28.1 Heart Reflection

의미 있는 Event/Choice가 있을 때만 발생한다. - Bern이 질문 - 1\~2 Tap
중심 - 선택 평가 X - 도덕적 해설 X - Reward X - Story 결과 변경 X

### 28.2 Heart Record

자동 기록형 추억책.

포함 가능: - Episode - 중요한 Story Choice - Reflection - 작은 대표
이미지/추억

구분: `Journal = 세계에서 무엇을 알아냈나?`\
`Heart Record = 나는 어떤 이야기를 겪었나?`

Heart Reflection과 Heart Record는 **아이의 Private 영역**으로 취급한다.

------------------------------------------------------------------------

## 29. Parent Feedback System

### 29.1 목적

> **아이를 평가하는 성적표가 아니라, 아이가 Lumia에서 어떤 상황을
> 경험하고 어떤 방법을 선택했는지 부모가 이해하고 대화를 시작할 수
> 있도록 돕는 기록.**

### 29.2 **\[설계 변경\]** 기존 점수형 리포트

기존 기술안의 `empathyScore`, `assertivenessScore`,
`responsibilityScore`, `flexibilityScore`, MBTI 행동 패턴 집계 및 심리적
해석 중심 구조는 현재 게임 철학과 맞지 않아 사용하지 않는다.

대신: `Play Record → Contextual Observation → Conversation Prompt`

### 29.3 Data Boundary

부모에게 전달 가능: - 완료된/리포트 대상 Episode Context - Major Story
Choice - Choice의 중립적 행동 설명 - World Reaction - 함께 이야기할 질문

부모에게 직접 공개하지 않음: - Heart Reflection 원문 - Heart Record
원문 - 일반 NPC Dialogue - Random NPC Question 개별 답변 - Puzzle 실패
횟수 - Hint 사용량 - Coin / Collection 수치 - 실시간 Episode 진행률 /
Stage 위치

### 29.4 Episode Report

구조: 1. 어떤 이야기였나요? 2. 아이는 어떻게 했나요? 3. 그 뒤에는 어떻게
되었나요? 4. 함께 이야기해 보세요

아이의 행동은 평가가 아니라 관찰 언어로 설명한다.

예: - X: "공감 능력이 높은 선택입니다." - O: "친구에게 바로 이야기하도록
권하기보다 시간을 주는 방법을 선택했습니다."

### 29.5 Recent Stories

누적 리포트는 성향 판정이 아니라 최근 경험/선택의 흐름을 보여줄 수 있다.
데이터가 충분하지 않을 때는 Pattern을 일반화하지 않는다.

### 29.6 아이에게 알릴 경계

보호자 연결 과정에서 쉬운 언어로 다음을 알려야 한다. - 중요한 Story
Choice는 Parent Report에 활용될 수 있음 - My Room Reflection / Heart
Record는 개인 영역 - 일반 NPC 대화는 Parent Report에 공개하지 않음

------------------------------------------------------------------------

## 30. Episode Production Template

모든 Episode 제작 시 공통 사용한다.

### 0. Play Experience Goal

이번 Episode에서 아이가 어떤 플레이 경험을 하게 할 것인가?

### 1. Episode 기본 정보

-   ID
-   제목
-   중심 장소
-   중심 NPC

### 2. 시작 상태 → 종료 상태

### 3. 중심 갈등

-   NPC의 고민
-   초기 오해
-   플레이어가 알아야 할 사실
-   마지막 Choice
-   사건 이후 변화

### 4. Main Objective Flow

한 번에 한 Objective만 노출.

### 5. Event

### 6. Clue / Knowledge

### 7. Adventure

-   필요 여부
-   Unlock Context

### 8. Stage / Area 구조

### 9. Encounter

### 10. Mechanic

기존 Mechanic Library 우선 사용.

### 11. Failure / Hint

### 12. Major Choice

-   선택지
-   각 접근 방식
-   즉시/지연 결과

### 13. World Change

### 14. Coin / Collection

### 15. My Room / Bern Reflection

### 16. Heart Record

### 17. Parent Feedback Metadata

-   Report 대상 Choice
-   상황 요약
-   각 Choice의 중립적 행동 설명
-   Story Result
-   대화 질문 후보
-   Private Data 자동 제외

------------------------------------------------------------------------

## 32. Greenhouse Prototype **[확정 설계]**

### 31.1 목적

> **정적인 Arcadia Life Mode와 SD 직접 조작 Adventure Mode가 하나의 이야기 안에서 자연스럽게 연결되고, Adventure 자체가 실제로 재미있는가?**

> **이 구조를 현재 팀 규모로 Episode마다 반복 제작할 수 있는가?**

### 31.2 구현 장소

- 시계탑 광장: Life only / 사건 시작
- 유리 온실·약초원: Life + Adventure / 핵심 검증
- My Room: Life only / Bern + Reflection / 마무리

다른 Arcadia 장소는 삭제된 것이 아니라 첫 Prototype 구현 범위 밖이다.

### 31.3 검증용 Scenario — 「빛을 잃은 온실」(가제)

정식 Episode 1 확정안이 아니다.

1. 시계탑 광장에서 온실 식물이 갑자기 시들었다는 사건을 듣는다.
2. 온실 Life에서 NPC와 대화하고 Adventure로 진입한다.
3. 시든 식물 조사 → Knowledge.
4. 달빛 약초 채집 → Item.
5. 시든 식물/어두운 Rune/덩굴 등을 관찰해 사건 정보를 얻는다.
6. Connect/Rotate Rune Puzzle로 끊긴 빛의 흐름을 연결한다.
7. 필요하면 L1 관찰 → L2 원리 → L3 첫 행동 Hint를 사용한다. 벌점은 없다.
8. Rune이 빛나고 식물이 회복되는 World Change를 Adventure에서 즉시 보여준다.
9. 사건 관련 학생이 실수를 숨긴 이유가 드러난다. 기존 32명 중 Casting은 TBD.
10. 정답 없는 Meaningful Choice 후 작은 NPC 반응 차이를 보여주고 공통 흐름으로 복귀한다.
11. Greenhouse Life에서 변화된 Dialogue/상황을 확인한다.
12. My Room에서 Bern과 Reflection하고 간단한 Heart Record로 마무리한다.

### 31.4 Prototype 검증 질문

1. SD 캐릭터를 직접 움직이는 것 자체가 재미있는가?
2. 탐색하면서 다음에 무엇이 있을지 궁금해지는가?
3. `조사 → Knowledge`, `채집 → Item`의 차이가 자연스럽게 이해되는가?
4. Encounter를 발견하고 관찰하여 해결 방법을 찾아가는 과정이 자연스러운가?
5. Puzzle이 별개의 게임처럼 느껴지지 않고 Adventure와 연결되는가?
6. 해결 후 World Change가 충분한 만족감을 주는가?
7. `Life → Adventure → Life → My Room`이 하나의 이야기처럼 이어지는가?
8. 제작 작업량이 현재 팀이 Episode마다 반복할 수 있는 수준인가?

추가 Test: SD/Tile 크기, 이동 속도, Camera, Map 크기, 길 폭, 8방향 Animation, Interaction 거리, Object Scale, Foreground/Occlusion, PC/Tablet 조작감.

### 31.5 첫 Prototype 제외 범위

32명 전체 SD, 대서고/천문대 Adventure, 공방/수련장 Mini Game, 여러 Episode, 신규 Adventure 장소, 복잡한 NPC Question API 전체, 자유 가구 배치, 완전한 Coin Economy, 복잡한 Day/Time Variation, Parent Analytics 전체 Backend, Quest Log, Stage Map, Rune Portal, Checkpoint, Combat/HP/EXP/Level.

------------------------------------------------------------------------

## 32. 기술 구조 개념

기존 방향: - HTML5 / CSS UI - Canvas 2.5D Game Layer - JavaScript /
TypeScript - Pixi.js 또는 Phaser 3 검토 - Firebase 또는 Supabase 계열
BaaS 검토

현재 설계로 추가 검토가 필요한 State: - episodeId - adventureId -
stageId - areaId - checkpoint - stage progress - inventory - knowledge
flags - choice_logs - NPC question memory - Coin - unlocked/selected
Room Theme - collectible display - Heart Record

**\[TBD\]** 구체적인 DB Schema와 Game Engine 선택은 개발팀 협의 후
확정한다.

------------------------------------------------------------------------

## 33. 원안 대비 주요 설계 변경

  -----------------------------------------------------------------------
  원안/초기 방향                      현재 확정 방향
  ----------------------------------- -----------------------------------
  Visible 마음 Stat 가능              제거

  공감/책임감 등의 Score형 Parent     Context + Choice + Conversation
  Report                              중심

  MBTI 행동 패턴/심리 분석            Parent Report의 아이 판정 용도로
                                      사용하지 않음

  전투/Monster 가능성                 Encounter 중심

  Death/Game Over 가능성              없음

  Energy 기반 반복 제한               없음

  Quest 중심 구조                     Event + Objective 중심

  교육형 Mini Game                    World Context에 통합된 Mechanic

  Broad Reward/Economy 가능성         Coin을 My Room 성장에 제한

  My Room 자유 배치                   비전 유지, 초기 자동 전시 → Later
                                      자유 배치
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 34. 의도적으로 만들지 않는 시스템

초기 게임 설계에는 다음을 넣지 않는다. - HP / Death / Revival / Game
Over - 독립 Combat / Monster System - Character Level / EXP - Visible
마음 Stat - Energy - Daily Quest - 복잡한 Quest Log - Rank / Star /
Stage Score - Collection Percentage - Minimap / Area Map - Manual Save -
Equipment Enhancement - Durability - Crafting Level - Random Craft
Failure - Broad Shop Economy - 숫자형 NPC Affection - Moral Score -
Correct / Wrong Choice

플레이테스트에서 명확한 필요성이 확인되기 전에는 추가하지 않는다.

------------------------------------------------------------------------

## 35. Prototype / Playtest 단계에서 정할 값

다음은 설계 누락이 아니라 실제 구현/테스트 값이다. - 이동 속도 -
Interaction 거리 - Camera 수치 - Episode당 Stage 수 - Stage당 Area 수 -
Coin 지급량 - Room Theme 가격 - Hint Timing - NPC Random Question 빈도 -
Day/Time 진행 빈도 - Material Reset 세부 정책 - Optional Help/Skip
접근성 세부 - Pixi.js vs Phaser 3 - DB Schema - Autosave Trigger 세부

------------------------------------------------------------------------

## 36. 팀 검토가 필요한 개발 항목

Backend Lead와 이후 검토: - Autosave - Episode / Adventure / Stage /
Area State - Checkpoint / Re-entry - Knowledge Flags - NPC Question API
Filter - choice_logs - Coin - Room Theme - Heart Record - Parent Report
Metadata / Privacy Boundary

기존 데이터 구조는 캐릭터 선택, Choice Log, My Room 배치/소지품 등의
기반을 제공하지만 Adventure/Stage/Area, Knowledge, Checkpoint 등은 새
설계가 필요하다.

------------------------------------------------------------------------

## 37. 현재 프로젝트 상태

-   Game Body Skeleton: **CLOSED**
-   Episode Production Structure: **CLOSED**
-   Parent Feedback Structure: **CLOSED**
-   Episode 1 Story: **미확정** (기존 예시는 Paper Simulation용)
-   Balance Values: **Playtest 단계**
-   Technical Detail / DB: **개발팀 협의 단계**
-   Prototype / MVP Scope: **TBD**

다음 단계: 1. 팀 기획서 검토 2. 디자이너 제작 요청서 검토 3.
Prototype/MVP 범위 확정 4. 역할/Owner 확정 5. 제작 및 개발
