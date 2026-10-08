# LUMIA Prototype Plan

## Episode 1 빛을 잃은 온실 — Prototype 구현 명세

> 문서 상태: **Implementation Specification v2.3 · 2026-10-06**
>
> **변경 요약:** 첨부 원본의 상세 내용을 보존하고 Intro/Admission, MAP04 대형 맵, Dialogue/UI, Heart, Mobile, 보호자 경계 및 Prototype 한정 캐릭터 범위를 관련 본문에 통합했다.

## 0. Prototype 확정 범위와 콘텐츠 경계

- 전체 게임에서는 기존 32명 중 플레이할 캐릭터를 선택한다. **이번 Prototype에만** 32명 Card/상세/큰 이미지 열람, 카엘(CH01)만 실제 시작/Confirm/플레이 조건을 적용한다. 다른 31명은 시작 버튼·별도 제한 안내 없는 열람 전용이다. Player Life/SD는 카엘이다.
- 기존 3×3 Connect/Rotate 퍼즐의 격자·조각·연결 판정을 유지한다.
- Rune 해결 후 직접 재관찰할 수 있지만 회복 꽃 재조사는 선택 사항이다. 재조사 없이 입구로 돌아가도 시온 Life 대화가 이어진다.
- Episode 완료/Diary 저장 뒤 ♥100을 1회 지급한다. 임시 밸런스 값이며 재조정은 후속 검토다.
- Desktop/Mobile 반응형과 터치 조작을 모두 구현·검증한다.
- Entry는 제공 Intro Movie, Admission은 UI07 원본을 사용한다. My Room 시간대는 기존 배경과 조명/창밖 Overlay로 표현한다. 이미지 경로 교체로 완성본을 연결한다.
- 발렌티누스는 사용자 제공 전신의 임시 투명 PNG를 사용한다. 손/머리카락 가장자리 QA는 디자이너 완성본 교체 시 처리하며 원본 변경/추가 AI 재생성은 하지 않는다.
- 기존 저장 키 `lumia-greenhouse-v1`은 읽거나 덮어쓰지 않는다. `lumia-greenhouse-v2`를 별도 사용한다.
- §3은 구현 상태/저장/예외, §3A는 전체 Script v2의 실제 카피와 세부 Scene 연결을 기록한다. 두 절은 같은 사양으로 유지한다.
- 다음 날 아침은 종료 상태로 가방/다이어리 열람만 제공한다. 방 나가기/Episode 2는 노출하지 않는다.

### BERN_SHORT_TALK_EP01 — 선택형 일상 대화

진입: MYROOM_EVENING_FREE의 [베른과 이야기하기]. Heart Reflection과 분리된 Small Choice이며 분석/교훈/채점/Heart 지급/Reflection 재실행을 하지 않는다. 선택 답변이나 새로운 성격·감정 데이터를 저장하지 않고, 첫 대화 완료 여부 bernShortTalkSeen만 저장한다.

첫 대화:

- 베른: 아직 잠들기엔 조금 이른 시간이군요.
- 베른: 조금 더 이야기할까요, {characterName}?
- Player: 응. 잠깐만.
- 베른: 그럼 하나만 물어볼게요.
- 베른: 지금은 뭘 하고 싶나요?

Small Choice 1: 조금 쉬고 싶어.

- Player: 오늘은 이것저것 많이 봐서 / 조금 쉬고 싶어.
- 베른: 그럼 아무것도 하지 않아도 괜찮아요. / 편하게 쉬고 있어요.
- 베른: 방은 제가 조용히 지켜 드릴게요.

Small Choice 2: 오늘 있었던 일을 조금 더 생각해 보고 싶어.

- Player: 오늘 있었던 일을 / 조금 더 생각해 보고 싶어.
- 베른: 그래도 좋지요.
- 베른: 다이어리를 다시 보고 싶다면 / 언제든 펼쳐 볼 수 있어요.
- 대화 종료 후 다이어리는 그대로 이용 가능하되 자동으로 열지 않는다.

Small Choice 3: 그냥 베른이랑 이야기하고 싶어.

- Player: 그냥 베른이랑 이야기하고 싶어.
- 베른: 저와요? (잠깐 놀라는 표정; 별도 표정 에셋 미완성 시 원본 기본 표정 유지)
- 베른: 후후, 그건 기쁜 일이군요.
- 베른: 저는 언제든 여기 있으니까 / 생각나면 또 말을 걸어 주세요.

세 분기 모두 같은 저녁 My Room으로 복귀: [가방] [다이어리] [베른과 이야기하기] [오늘을 마무리하기]. 시간은 변하지 않는다.

같은 저녁 두 번째부터:

- 베른: 아직 조금 더 쉬고 싶은가요, {characterName}?
- 베른: 저는 여기 있으니 편하게 있다 가세요.

중단/재로드한 Small Choice는 답변을 저장하지 않고 MYROOM_EVENING_FREE로 복귀한다. 새 이야기 시작 시 bernShortTalkSeen을 초기화한다.

> 상태: Implementation Specification v2.3 + Episode 1 Script v2 본문 정규화본. 이 문서는 화면·상태·저장·카피·예외·수용 조건의 구현 기준이다. 명시되지 않은 기능은 임의로 만들지 않는다.
>
> Episode 1 Script v2는 Playthrough 검수를 반영한 구현 기준이다. 아직 실제 아동 5명 이상 User Test 전이며, 특히 룬 직행 시 탐험 경험이 약해지는지와 Soft Guidance 필요 여부는 관찰 항목으로 남긴다. 이 문서에 적힌 State Flow, UX 규칙, 저장 경계와 충돌하도록 임의 변경하면 안 된다.
>
> [TBD]=기획 미확정(추정 구현 금지), [개발 확인]=기술 방식 확인 필요, [Asset TBD]=파일/규격 미확정, [Prototype 제외]=이번 빌드에서 만들지 않음.

## 1. 범위와 공통 원칙

### 1.1 완주 범위

GAME ENTRY → RUNE AWAKENING → ARCADIA REVEAL → LUMIA TITLE → CHARACTER SELECT 32명 → CONFIRM → ADMISSION → FRONTEND RUNE/FADE → 시계탑 광장 FIRST ARRIVAL → 발렌티누스 → 시온 첫 만남 → EPISODE 1 TITLE → 온실 LIFE → GREENHOUSE ADVENTURE(조사/수집/퍼즐/WORLD CHANGE) → 온실 LIFE 복귀/CHOICE → 저녁 MY ROOM → BERN → HEART REFLECTION → HEART RECORD 생성 → DIARY 저장 → Episode 완료 Heart 지급 → 저녁 My Room 자유 상태 → 오늘을 마무리하기 → DAY END → 다음 날 아침 MY ROOM.

Prototype은 다음 날 아침 My Room에서 끝난다. Episode 2는 시작하지 않는다.

### 1.2 Writing Rule: 초3~4학년

- 짧고 구체적인 문장만 쓴다. 관찰·설명·추론·다음 행동을 한 문장에 섞지 않는다.
- 초3~4학년이 한 번에 이해할 수 있게 한 문장에는 한 핵심만 둔다. 캐릭터가 발견해야 할 답을 먼저 말하지 않으며, 교훈이나 도덕 평가를 직접 설명하지 않는다.
- 버튼은 행동을 말한다. 예: 온실 살펴보기, 가방에 넣기.
- 낯선 세계관 말은 눈앞의 모습으로 짧게 설명한다. 장문 기술 안내와 사전식 설명은 금지한다.
- 선택지는 정답/오답·착함/나쁨처럼 보이지 않게 병렬로 쓴다. 점수, 우열색, 정답 효과음은 없다.

### 1.3 플레이어보다 먼저 답을 말하지 않는 규칙

- NPC/HUD/조사창은 플레이어가 관찰하지 않은 원인·정답·다음 해결법을 말하지 않는다.
- 조사 결과는 확인 가능한 사실만 준다. 그러므로, 때문에, 고쳐야 한다로 결론 내리지 않는다.
- 행동 목표는 허용한다. 예: 원에서 마름모까지 빛을 이어요.
- 온실 전/직후에 룬 원인, 깊은 곳 조사, 룬 고장, 배열 수정 필요를 말하는 카피는 금지한다.
- Hint는 관찰 → 원리 → 첫 행동 순서이며 정답 배치 전체를 보여 주지 않는다.

### 1.4 Life Dialogue Presentation Rule

- Life는 큰 배경·큰 인물·Dialogue/Choice/Event 중심의 정적 생활 화면이다. SD 이동은 없다.
- Player는 왼쪽, 대화 NPC는 오른쪽에 고정한다. 화자가 바뀌어도 위치를 교환하지 않는다.
- Player는 왼쪽, NPC는 오른쪽에 고정한다. 모든 인물은 opacity 100%, blur 없음, 기본 scale/position 고정이다. 화자 brightness 100%와 비화자의 약한 brightness 감소를 약 150~250ms로 전환한다.
- 하단 단일 Dialogue Panel을 사용하며 일반 대화는 panel click/tap과 작은 Dialogue Advance Arrow로 진행한다. 일반 [계속]/[다음] 버튼은 사용하지 않는다. Choice 동안 arrow를 숨기고 실제 행동/상태전환 버튼의 텍스트는 유지한다.
- Desktop Choice는 두 캐릭터 사이 중앙 Safe Area에 세로 배치한다. Mobile에서는 Dialogue Box 위로 이동하고 긴 문장은 자동 높이로 처리한다. 선택 후 Choice를 닫고 Player 실제 발화 → NPC 반응으로 이어진다.
- Dialogue Context Image Slot은 유리꽃/달빛 약초/룬을 보여 줄 필요가 있는 장면만 사용한다. 고정 portrait slot이 아니다.
- Bag/Diary/Menu은 icon + short label로 표시한다. [Playtest 확인] 1~2% scale 변화는 필요성 검토 옵션이며 기본 동작이 아니다.
- 기본 대화창은 하나다. 화자 변경 시 이름/내용만 갱신한다. 두 창의 지속 중첩은 금지한다.
- 원본 인물이 상대 반대 방향을 보면 Presentation Layer에서만 horizontal flip한다. 원본 파일/별도 반전 Asset은 만들지 않는다. 문자·비대칭 소품의 예외는 [Asset TBD].
- Choice는 같은 Scene 위에 보이며 선택 후 Player 실제 대사 → NPC 반응으로 이어진다.

### 1.5 Adventure / HUD / 시간

- Adventure는 기존 Arcadia 장소의 SD 직접 탐험 모드이며 별도 Stage 세계가 아니다. Prototype 장소는 유리 온실·약초원 하나다.
- `MAP04_어드벤처_전체맵_무드시안.png` 기반 Large Map Illustration을 고해상도 원본으로 보존하고 배포 raster WebP World Background를 만든다. 카엘 SD + player-follow camera + 코드 좌표 collision polygon/rectangle + interaction points + UI overlay로 구성한다. 신규 Tile/Modular Map Engine·Tile asset 제작은 [Prototype 제외]. World Change는 Restored Map 또는 부분 overlay, foreground는 필요한 경우만 별도 레이어다.
- Desktop 화면을 단순 축소하지 않는다. touch target과 safe area, 긴 Choice의 자동 높이, Dialogue overflow를 고려해 UI를 재배치한다. Intro Movie는 핵심 Rune을 central safe area에 두어 모바일 crop에 대응한다. Adventure는 Mobile에서도 큰 World Map 일부를 viewport로 보여 주며 player-follow camera를 유지한다. PC는 방향키/WASD 이동 + E 상호작용, Mobile/Tablet은 가상 조이스틱 이동 + 문맥 행동 버튼을 설계·검증한다. 입력 감지·지도 메모리·터치 충돌은 [개발 확인], 조작감/가독성은 [Playtest 확인]이다. iPhone 6s는 저사양 최적화 참고 수준이며 실기기 성능 검증은 완료조건이 아니다.
- 8방향 이동, 대각선 속도 정규화, 근접 대상 Highlight, 문맥 행동을 지원한다. PC=방향키/WASD + E, Mobile/Tablet=가상 조이스틱/문맥 행동 버튼. 입력 감지는 [개발 확인].
- HUD는 현재 목표, 알아낸 것, 가방/힌트/메뉴만 제공한다. 발견 기록, Quest Log, Minimap, HP와 Heart Balance 상시 표시는 없다.
- 가방은 Adventure/My Room 공통 Collection Card Grid다. 카드 필수값은 이미지, 이름, 수량이다.
- Hint는 L1 관찰 → L2 원리 → L3 첫 행동. 벌점·사용횟수 평가·자동정답은 없다.
- HP, 전투, 사망, GAME OVER, 시간 제한, 퍼즐 실패 페널티는 없다.
- 시간은 morning/day/evening Story State다. 걷기, 가방/다이어리, Adventure 장기 플레이는 시간을 진행시키지 않는다. Story Action/Event/명시적 시간 보내기만 진행할 수 있으나, 이번 흐름에는 시간 보내기를 노출하지 않는다.
- My Room은 별도 방이 아니라 같은 방의 조명/창밖 Overlay다. 아침=부드러운 햇빛, 낮=기본 밝기, 저녁=따뜻한 실내등/어두운 창밖. [Asset TBD]
- Heart Balance는 일반 Life/Adventure 및 모든 Dialogue/Puzzle에서는 숨긴다. My Room 기본 화면은 예외로 compact icon + balance를 표시한다. Heart 획득 연출과 My Room, 향후 Heart 사용/Theme 화면에서만 현재 보유량을 표시한다.

### 1.6 No Player Stat / Heart Reward Currency

- Lumia에는 Visible Player Stat이 없다. 공감·용기·절제·인성·호감도 등의 수치화, 평가, 레벨, 랭크는 금지한다. Choice를 포함한 플레이 행동으로 Player의 성격이나 능력을 점수화하지 않는다.
- `Heart(♥)`는 이야기를 경험하며 모으는 게임 보상 재화이며, My Room 테마·꾸미기 요소 해금에 사용한다. 착함·공감·인성 점수나 Choice의 정답 보상이 아니다.
- Episode 완료 시에만 동일한 기본 Heart를 지급한다. Choice 내용, Hint 사용, Puzzle 실패 횟수, Adventure 중단/재개, 해결 속도에 따라 지급량을 차등 적용하거나 감소시키지 않는다.
- Episode 1 Prototype 지급량은 `♥ 하트 +100 (Prototype 임시 밸런스)`이다. 지급 사유 이벤트는 반드시 `EPISODE_COMPLETION_REWARD`이며, Heart Reflection 답변·좋은 선택·Hint·Puzzle 성과가 아니라 Episode 완료에 대한 보상으로 정의한다.
- 용어를 다음처럼 구분한다: `Heart(♥) = My Room 테마 등에 사용하는 보상 재화`; `Heart Reflection = 하루/에피소드 경험을 돌아보는 평가하지 않는 개인 성찰`; `Heart Record = Episode 경험이 저장되는 개인 다이어리 기록`.
- 장기 루프: `Story/Adventure → Episode 완료 → Heart Record + Heart 획득 → Heart 누적 → My Room Theme 해금/적용 → 다음 Story`.

## 2. 저장 데이터와 중단

| 그룹 | 필드 | 저장 규칙 |
|---|---|---|
| Profile | selectedCharacterId/name, characterConfirmed | Confirm 전 Card 선택은 Local UI State만 사용 |
| Entry | entryProgress, admissionRead, firstArrivalSeen, valentinusMet, sionMet | 각 Scene 완료 때 저장 |
| Day | dayIndex, timeOfDay, dayEndCompleted | 종료는 dayIndex=2, morning |
| Episode | episode1Status, titleSeen, greenhouseLifePhase, choiceId | Choice는 중립 메타데이터만 저장 |
| Adventure | playerPosition, knowledgeFlags, collectedItems, runeState, worldChangeState, objectiveId, puzzleRotations | 조사/채집/회전/중단 때 저장. `knowledgeFlags`는 객관적 사실만 기록 |
| Reflection | reflectionCompleted, heartRecords[], diarySaved, dayEndUnlocked | Heart Record는 append, overwrite 금지 |
| Reward | heartBalance, episode1HeartRewardClaimed, rewardReason | `rewardReason=EPISODE_COMPLETION_REWARD`; Episode 완료 보상은 1회만 지급하고 즉시 Local Save |
| Privacy | Reflection/Diary raw content | 로컬 private 기록이며 보호자 전송·공개 없음; guardianEmail/연결 기능은 [Later]/[Prototype 제외] |

- [개발 확인] Autosave: Confirm, Admission, 첫 만남, 조사/채집, 조각 회전, Rune 해결, Choice, Reflection, Diary, Episode 완료 Heart 지급, Day End 직후.
- 저장 실패 시 현재 화면을 유지하고 저장하지 못했어요. 다시 시도해 주세요.를 표시한다.
- Adventure 중단 Copy는 SCENE 18과 동일하다: [메뉴] → [탐험 그만하기] → `온실 탐험을 그만할까요?` / `지금까지 찾은 것은 그대로 남아 있어요. 나중에 다시 와서 이어서 할 수 있어요.` → [계속 탐험하기]/[그만하고 돌아가기].
- 재진입은 위치, Knowledge, 약초, 조각 회전, Rune/World Change, 목표를 복원하고 중복 지급하지 않는다. 중단은 실패/포기가 아니다.

## 3. 화면·상태 구현 명세

### 3.0 상태 명세 공통 필드와 표시 경계

각 ST/SCENE의 목적·진입, Asset/UI/Copy, Player Action, 저장/예외, Transition/다음 State, 완료 조건을 함께 적용한다. 아래 값은 장면에서 별도 지정하지 않은 공통 표시 경계다.

| 상태군 | Background/Asset | 등장 Character | UI/Action/Transition | Local Save/중단 |
|---|---|---|---|---|
| Entry/Intro/Title | 시작 화면/intro.mp4/BG01/LUMIA Logo | 없음 | 시작/Skip/Title 메뉴, Intro 후 reveal | Intro 재생은 진행 불변; Title 복귀→Intro |
| Character Select/Confirm | UI03/UI02 + 32명 Canon 이미지 | 열람 32명, Confirm 카엘만 | 카드/확대/scroll, Confirm 후 fade | 열람 local UI만, Confirm 후 Profile |
| Admission/Plaza/온실 Life | UI07, BG02, BG07 Before/After | 카엘/발렌티누스/시온 | single Dialogue Panel, arrow/click, action button; Life 전환 fade | Scene 완료 autosave, copy·노드 복원 |
| Adventure/조사/수집 | MAP04 WebP/SD/필요 context image | 카엘 SD; 조사 overlay 중 이동 정지 | follow camera, collision/interaction, overlay 닫기→동일 world | 위치/flags/collection 즉시 저장 |
| Puzzle/Hint/World Change | 기존 3×3 조각/Restored Map·overlay | Puzzle UI에 portrait 없음 | 회전/Hint/나가기, 해결 후 world 유지 | 회전/Hint/변화 복원, 중단 무벌점 |
| My Room/Bern/Reflection/Diary | BG03 + morning/evening overlay, Bern/Record image | 카엘/Bern 대화; Record UI는 필요 이미지 | compact Heart는 방 기본 화면만; 대화/Choice는 §1.4 | Reflection private/Record 누적, 실패 시 재시도 |
| Reward/Day End/Day02 | 별도 ♥100 feedback/방 조명 overlay | reward는 UI, Day02 Bern 인사 | Diary 알림 후 reward, 명시 Day End 후 아침 | reward 1회/Day End 반복 없음/Endpoint 유지 |

Overlay에서는 배경과 world 상태를 유지한다. 긴 대사는 Dialogue Panel 내부 overflow 처리로 Choice/버튼을 가리지 않는다. 스크롤/선택/확대 입력을 분리한다. 게임 내 메뉴의 [Title로 돌아가기]는 진행을 먼저 저장한 뒤 Intro부터 재생한다.

### ST-00 GAME_ENTRY
- 목적/진입: 신규 시작점.
- UI/Asset/Copy: 시작 배경 [Asset TBD], 시작하기. LUMIA 로고와 Episode 제목은 표시하지 않는다.
- 행동/전환: 시작하기 → ST-01.
- 저장/예외: 저장 없음. 로딩 실패는 재시도만 제공.
- 완료 조건: Game Entry와 Episode 시작이 분리된다.

### ST-01 RUNE_AWAKENING / INTRO_MOVIE
- 목적/진입: ST-00 [시작하기] 또는 게임 내 [Title로 돌아가기] 이후 세계 진입 영상. 저장 유무와 무관하다.
- Background/Asset/Character/UI: `intro/intro.mp4`, 인물 없음, 중앙 Rune, touch-safe [Skip]. Intro에는 Episode/퍼즐 원인 설명을 넣지 않는다.
- Copy/행동/Transition: 어둠 → 작은 빛 → 원형 Rune Awakening → 밝아짐은 영상이다. 완료/Skip → 실제 BG01 Arcadia Reveal → ST-02. `마음이 룬을 깨웁니다.`는 기존 Script v2 Copy로 유지한다.
- Local Save/예외: 기존 게임 진행 save를 변경하지 않는다. 영상 실패/재생 불가 시 정적 Rune → 실제 Arcadia → Title fallback. BGM/환경음/SFX 없음.
- Acceptance Criteria: central safe area crop, Skip touch, 재진입 Intro 재생, 저장된 진행 보존을 확인한다. Admission 실시간 Rune/Fade와 별개다.

### ST-02 LUMIA_TITLE
- 목적/진입: Intro/Arcadia Reveal 후 게임 전체 Title. Episode Title과 구분한다.
- Background/Asset/Character/UI/Copy: BG01 실제 Arcadia + LUMIA Logo; 인물 없음. 저장 없음 [이야기를 시작합니다], 저장 있음 [이어하기] [새 이야기 시작].
- Player Action/Transition: 신규 → ST-03, 이어하기 → 마지막 autosave 상태. 새 이야기 시작은 기존 데이터 초기화 확인 후 ST-03. 취소하면 현재 저장 유지.
- Local Save/예외: Title 열람은 진행 불변. 저장 판독 실패 시 오류 재시도와 신규 시작을 제공하되 손상 save를 자동 덮어쓰지 않는다.
- Acceptance Criteria: 저장이 있어도 Intro 뒤 Title을 거친다. 게임 내 Title 돌아가기는 ST-01부터 재생하며, 이어하기를 누르면 저장 상태로 복원한다.

### ST-03 CHARACTER_SELECT_32 / OV-03A CONFIRM
- 목적/진입: 전체 32명을 열람하고 이번 Prototype 플레이어 카엘을 확정한다. 다른 31명은 열람 전용이다.
- UI/Asset/Copy: 32 Card Grid, 기존 남성/여성 탭을 사용하면 합계 32명 전원 노출. Mobile은 Card 목록을 터치 세로 스크롤로, PC는 마우스 휠로 부드럽게 이동한다. 각 Card 본문은 선택용이며, Card 안쪽 모서리의 작은 `[+]`는 해당 인물의 큰 이미지 Overlay를 연다. 우측 이름/나이/칭호/짧은 성격·배경/강점/어려움/대표 대사. [이 캐릭터로 시작하기]는 카엘에게만 표시한다. 다른 31명에게는 시작 버튼·별도 제한 안내 없음. UI03 카드 배경/UI02 모서리 프레임을 재사용한다. 전신 이미지를 상세영역에 중복 배치하지 않는다. 전체 데이터 [Asset TBD].
- 행동/전환: Card 선택/탭/[+] 확대는 32명 모두 열람. 카엘의 시작하기만 Confirm으로 연결한다. 스크롤 제스처는 Card 선택/확대를 실행하지 않으며, 짧은 탭/클릭만 실행한다. 확대 Overlay를 닫으면 이전 탭/페이지/선택 Card로 돌아온다. Confirm=카엘과 이야기를 시작할까요?, [다시 볼게요]/[시작하기]. 시작하기 → ST-04.
- 저장/예외: 선택 중 값은 저장 금지; Confirm 후 Profile 저장. 일부 인원만 보이는 축소 구현 금지.
- 완료 조건: 32명 모두 Card/상세/큰 이미지 열람 가능, 카엘만 Confirm/실제 시작. 다른 31명에게 시작 버튼·제한 안내 없음. Confirm 전 영속 Profile 불변, 이후 카엘 이름/일러스트/SD의 단일 원본이 된다.

### ST-04 ADMISSION → ST-05 FRONTEND_RUNE_FADE
- 목적/진입: 선택 캐릭터의 입학과 광장 도착 연결.
- UI/Asset/Copy: `UI07_입학_초대장.png` 원본 + 이름 개인화 + §3A SCENE 06 Script v2 문구, [입학하기]; CSS 대체 디자인 금지; 이후 전면 Rune/빛과 Fade [Asset TBD].
- 행동/전환: 입학하기 → ST-05 자동 → ST-06.
- 저장/예외: admissionRead, entryProgress=arrivalTransitionSeen. 이름 하드코딩 금지; 효과 실패 시 즉시 Fade.
- 완료 조건: Frontend Rune은 전환 효과이며 광장/온실 Rune과 혼동되지 않는다.

### ST-06 CLOCK_PLAZA_FIRST_ARRIVAL
- 목적/진입: Arcadia 첫 도착. ST-05 완료.
- UI/Asset/Copy: 시계탑 광장 Life 배경 [Asset TBD], 선택 Player, 장소 Copy `아르카디아` / `시계탑 광장`.
- 행동/전환: 짧은 도착 표시 후 자동/대화창 클릭·advance arrow → ST-07.
- 저장/예외: firstArrivalSeen=true, timeOfDay=day. SD 광장 이동은 범위 아님.
- 완료 조건: Episode 제목/온실 해답이 나오지 않는다.

### ST-07 VALENTINUS_FIRST_MEET
- 목적/진입: 발렌티누스가 환영·질문·방향을 제공하되 Quest 정답을 주지 않는다.
- UI/Asset/Copy: Player 왼쪽/발렌티누스 오른쪽, 단일 대화창, 대사/표정 [Asset TBD]. Player가 먼저 `{characterName}`을 소개한 뒤 발렌티누스가 이름을 부른다. 발렌티누스는 `나는 이곳에서 룬을 가르치고 있단다.`와 `처음 보는 게 많을 거야. 궁금한 게 생기면 가까이 가서 살펴보렴. 모르는 게 있다면 친구들에게 물어봐도 좋고. 오늘은 천천히 둘러보렴.` 방향의 쉬운 대사를 사용한다.
- 행동/전환: 대사 진행 → ST-08.
- 저장/예외: valentinusMet=true. 룬 원인/퍼즐 답을 말하면 실패.
- 완료 조건: Life Dialogue Rule 적용.

### ST-08 SION_FIRST_MEET
- 목적/진입: 시온의 걱정으로 사건을 발견한다.
- UI/Asset/Copy: Player 왼쪽/시온 오른쪽. 시온이 첫날인지 묻고 Player는 막 도착했다고 답한다. Player가 시온이 자꾸 다른 곳을 보는 것을 관찰해 `그런데 무슨 일 있어? 아까부터 자꾸 어디를 보고 있네.`라고 먼저 묻는다. 이후 시온은 온실과 유리꽃 문제를 설명하고 `나도 무슨 일인지 알아보러 가려던 참이야.`라고 말한다. Player가 같이 가도 되는지 묻고 시온이 동의한다. 실제 대사는 §3A Scene 09를 따른다.
- 행동/전환: 마지막 수락 → ST-09.
- 저장/예외: sionMet=true, episode1Status=offered. 룬/고장/배열/원인 추정 금지.
- 완료 조건: Player가 문제만 알고 조사 대상·해답은 모른다.

### ST-09 EPISODE1_TITLE → ST-10 GREENHOUSE_LIFE_BEFORE
- 목적/진입: Episode 시작 경계와 Adventure 전 동기 제공.
- UI/Asset/Copy: EPISODE 1 / 빛을 잃은 온실, 약 1.5~2초 자동 표시. 온실 Life와 시든 꽃 [Asset TBD]. Script: 시온 `여기야. 저게 유리꽃이야.` / Player `정말 빛이 거의 없네.` / 시온 `응…… 원래는 훨씬 밝게 빛나.` / Player `가까이 가서 살펴볼게.` / 시온 `응. 부탁해.` / `[온실 살펴보기]`.
- 행동/전환: 타이틀 자동 완료 → ST-10; 온실 살펴보기 → ST-11.
- 저장/예외: titleSeen=true, status=started, adventure available. 시온이 깊은 룬/조사 위치를 지목하면 안 된다.
- 완료 조건: Life에는 SD 이동이 없고 버튼은 행동만 제시한다.

### ST-11 ADV_GREENHOUSE_EXPLORE
- 목적/진입: 직접 이동·조사·선택 수집·Rune 발견. ST-10 또는 재진입.
- UI/Asset/Copy: MAP04 기반 WebP World Background/카엘 SD, 목표 유리꽃이 왜 시들었는지 살펴보자., 비어 있는 알아낸 것, 가방/힌트/메뉴. 최초 1회 안내는 실제 입력 방식과 일치해야 한다: Prototype이 E 상호작용이면 `방향키로 움직여 보세요. 가까이 가서 E를 누르면 살펴볼 수 있어요.` 및 근처 대상 `E 살펴보기` Prompt를 표시한다. PC는 방향키/WASD + E, Mobile은 조이스틱 + 문맥 행동 버튼으로 같은 동작을 제공한다. Mobile 안내는 `조이스틱으로 움직여 보세요. 가까이 가서 살펴보기 버튼을 눌러 보세요.`다. 입력 감지는 [개발 확인].
- 행동/전환: 이동/조사/채집/가방/힌트/메뉴. 룬을 먼저 찾아도 룬 살펴보기 → ST-12. 중단 → ST-10 재진입 가능. 발견 순서는 자유이고 알아낸 것은 발견 순서대로 쌓인다.
- 저장/예외: 위치·조사·수집·목표·Hint 저장. Adventure 시간은 시간대 불변.
- 완료 조건: 최소 HUD이며 중단 후 같은 진행으로 재개한다.

#### ST-11A 유리꽃 조사 Overlay
- 목적/UI/Copy: 관찰 사실 하나. 유리꽃을 살펴봤어요. 꽃은 시들어 있지만, 흙은 아직 촉촉해요. 알아낸 것에 유리꽃의 흙은 충분히 젖어 있다.
- 행동/전환/저장: 닫기 → ST-11; knowledge.glassFlowerSoil=true.
- 예외/완료: 물 부족 아님/룬의 빛/다음 행동을 말하지 않는다.

#### ST-11B 달빛 약초 수집 Overlay: Optional
- 목적/UI/Copy: Optional Collectible. 달빛 약초를 찾았어요!, 가방에 넣기, 카드 달빛 약초 ×1.
- 행동/전환/저장: 넣기 → ST-11; moonlightHerb 증가 및 재채집 방지.
- 예외/완료: 필수 재료·점수·판매품이 아니며 수집하지 않아도 진행한다.

#### ST-11C 온실 햇빛 조사 Overlay
- 목적/UI/Copy: `GREENHOUSE_INSPECT_SUNLIGHT`. 배경/유리창을 조사해 객관적 사실 하나를 발견한다. `온실 안을 살펴봤어요.` / `유리창 사이로 햇빛이 들어오고 있어요.` → `새로운 사실을 발견했어요!` → 알아낸 것 `☀ 온실 안에는 햇빛이 들어오고 있다.`
- 행동/전환/저장: 닫기 → ST-11; `knowledge.greenhouseSunlight=true`.
- 예외/완료: `햇빛 부족이 원인이 아니다`, `룬이 원인이다`처럼 추론하거나 원인을 말하지 않는다.

#### ST-11D 오래된 룬 조사 Overlay
- 목적/UI/Copy: 퍼즐 단서. 오래된 룬이 있어요. 돌 위의 빛이 중간에서 끊겨 있어요. Knowledge=룬의 빛이 중간에서 끊겨 있다. 이어서 돌 위에 여러 개의 길이 그려져 있어요. 몇몇 길은 서로 이어지지 않아요. / [빛의 길 살펴보기].
- 행동/전환/저장: 빛의 길 살펴보기 → ST-12, 닫기 → ST-11; knowledge.runeLightBroken=true. `3/3 단서` 체크리스트나 Puzzle 강제 해금은 사용하지 않는다.
- [Playtest 확인] 룬 직행으로 탐험 경험이 약해지는지 실제 User Test에서 관찰한다. 필요 시 Soft Guidance 후보 `다른 곳에도 이상한 점이 있는지 조금 더 살펴볼까?` / `[주변을 더 살펴보기] [룬을 살펴보기]`를 검토하되 현재 강제 구현 요구는 아니다.
- 예외/완료: 룬 고장, 꽃 원인, 배열 수정의 단정이 없다.

### ST-12 RUNE_CONNECT_ROTATE_PUZZLE / ST-12A HINT
- 목적/진입: 끊긴 빛길을 직접 잇는다. ST-11D에서 진입.
- UI/Asset/Copy: 회전 조각, 시작 원, 도착 마름모 [Asset TBD], 목표 `조각을 눌러 돌려 보세요. 원에서 마름모까지 빛의 길을 이어 주세요.`, [힌트]/[나가기]. 기존 3×3 Grid/조각/연결 판정을 유지한다. 표시 크기·난이도는 [Playtest 확인].
- 행동/전환: 조각을 90° 회전, Hint, 나가기(ST-11), 성공(ST-13).
- 저장/예외: 회전 배열/본 Hint 단계 매 행동 저장. 실패 팝업·벌점·자동 리셋·GAME OVER 없음.
- Hint: L1 `빛은 왼쪽 위의 원에서 시작해요. 어디에서 길이 끊겼는지 살펴보세요.` / L2 `맞닿은 두 조각의 길이 서로 이어져야 빛이 다음 조각으로 갈 수 있어요.` / L3 `윗줄 가운데 조각을 한 번 돌려 보세요.`
- 완료 조건: 세 Hint를 모두 써도 Player가 직접 완성한다.

### ST-13 RUNE_WORLD_CHANGE → ST-14 ADV_GREENHOUSE_AFTER_RUNE
- 목적/진입: Puzzle 성공의 변화가 같은 Adventure 세계에 남는다.
- UI/Asset/Copy: 빛의 길이 이어졌어요!, Rune Glow, 퍼지는 빛, MAP04 Restored Map 또는 부분 change overlay, 꽃 Before→After [Asset TBD], 목표 온실에 어떤 변화가 생겼는지 살펴보자.
- 행동/전환: 연출 후 ST-14. 회복 꽃 조사=`유리꽃이 다시 고개를 들었어요. 잎과 꽃잎에서 빛이 반짝여요.` 후 목표 시온에게 돌아가 알려주자. 입구 이동 → ST-15.
- 저장/예외: runeState=active, worldChange=greenhouseRecovered, 회복 조사 flag 저장. Puzzle 직후 Life 자동 복귀 금지. 중단/재개도 After State 복원.
- 완료 조건: Adventure에서 회복 꽃을 직접 재관찰할 수 있다. 재조사는 선택 사항이며 조사 없이도 입구에서 ST-15로 갈 수 있다.

### ST-15 GREENHOUSE_LIFE_AFTER
- 목적/진입: Life에도 World Change가 지속되고 시온과 Meaningful Choice를 한다.
- UI/Asset/Copy: 회복 온실 [Asset TBD], Player/시온 대화. 시온은 원인을 확실히 알고 숨긴 것이 아니라, 어제 룬 조각 몇 개를 돌린 자기 행동 때문일지 두려워 말하지 못한 것이다. 고백과 Choice 실제 Copy는 §3A Scene 22~24를 따른다.
- 행동/전환: Choice 하나 확정 → ST-16.
- 저장/예외: choiceId와 중립 메타데이터 저장. 우열색/점수/성격판정/분기 GAME OVER 금지. 32명 별도 대사 [Prototype 제외].
- 완료 조건: 선택 후 Player 대사 → 시온 반응 → 공통 흐름이다.

### ST-16 EVENING_MY_ROOM_ARRIVAL → ST-17 BERN_REFLECTION
- 목적/진입: 사건 후 저녁 개인 공간에서 평가 없는 성찰로 이동한다.
- UI/Asset/Copy: 저녁 My Room Overlay, Bern/가방/다이어리 [Asset TBD]. My Room 기본 화면에는 compact icon + balance를 제공하되 Bern Dialogue/Reflection 중에는 숨긴다. global persistent HUD는 없다. Bern은 `돌아왔군요, {characterName}. 오늘은 어떤 하루였나요?`와 `하루를 마치기 전에 기억에 남은 장면을 하나 떠올려 볼까요?` 방향으로 말한다. Heart는 재화 보유량일 뿐 성찰·Choice 평가가 아니다.
- 행동/전환: Bern 대화 → Reflection 완료 → ST-18.
- 저장/예외: timeOfDay=evening, episode resolved, reflectionAnswers는 private 저장. Episode 2 자동 시작 금지.
- 완료 조건: Bern은 좋은 답/나쁜 답을 말하거나 채점하지 않는다.

### ST-18 HEART_RECORD_CREATE
- 목적/진입: Episode 경험을 누적 Record로 만들고 Diary에 저장. Reflection 완료 후.
- UI/Asset/Copy: `오늘의 이야기`, `마음에 남은 장면`, `내가 건넨 말`과 실제 선택 문장, Reflection 값을 표시한다. 대표 이미지 [Asset TBD], [다이어리에 남기기].
- 행동/전환: 저장 → `OV-18A EPISODE_COMPLETE_HEART_REWARD` → ST-19.
- 저장/예외: 저장 시 heartRecords append 및 diarySaved=true. Diary 저장 UI 이벤트와 Episode 완료 보상 이벤트를 분리한다. 이어서 `EPISODE_COMPLETION_REWARD`에서 `episode1HeartRewardClaimed`가 false일 때만 `heartBalance += 100`와 지급 완료 상태를 Local Save하고 ST-19로 간다. 기존 Record overwrite, 중복 지급, 점수/등급/보호자 공개 라벨은 금지한다.
- 완료 조건: Diary에서 누적 목록으로 확인한다.

#### OV-18A EPISODE_COMPLETE_HEART_REWARD
- 목적/진입: Diary 저장 뒤 Episode 1 완료를 알리고 동일한 기본 Heart를 1회 지급한다. Heart Reflection 답변의 결과나 평가가 아니다.
- UI/Copy: 먼저 별도 Diary 저장 알림 `오늘의 이야기가 다이어리에 남았어요.`. 다음 별도 보상 Overlay에서 `이야기를 하나 마쳤어요!` / `♥ 하트 +100`. 첫 Heart 획득 시 1회 `♥ 하트` / `이야기를 경험하면 모을 수 있어요.` / `모은 하트로 나중에 My Room의 새로운 테마를 꾸밀 수 있어요.`를 표시한다.
- 행동/전환: 표시 완료 또는 panel click/advance arrow → ST-19. 일반 [계속] 버튼 없음.
- 저장/예외: `episode1HeartRewardClaimed=false`일 때만 `rewardReason=EPISODE_COMPLETION_REWARD`와 함께 `heartBalance`에 100을 더하고 즉시 Local Save한다. 이미 지급됐으면 증가 없이 현재 보유량으로 통과한다. Choice, Reflection, Hint, Puzzle 실패, Adventure 중단/재개, 해결 속도는 이 값에 영향을 주지 않는다.
- 완료 조건: Heart 지급은 Diary 저장과 Episode 완료 뒤에만 발생하며, Reflection 직후에는 발생하지 않는다.

### ST-19 EVENING_MY_ROOM_FREE
- 목적/진입: Diary 후 Player가 하루 종료를 선택한다.
- UI/Asset/Copy: 저녁 My Room, `♥ {heartBalance}` 현재 보유량, 가방/다이어리/Bern/오늘을 마무리하기. 가방=모은 것, 다이어리=경험한 이야기, Heart=이야기를 경험하며 모은 보상이다.
- 행동/전환: 가방/다이어리/Bern은 상태 유지; 오늘을 마무리하기 → 확인 UI `오늘을 마무리할까요? 다음 날 아침으로 넘어가요.` / `[조금 더 있을래요] [오늘을 마무리하기]` → ST-20.
- 저장/예외: 열람은 시간 불변. Episode 완료 Heart 지급 뒤 `dayEndUnlocked=true`; 그 전에는 버튼 비활성/오늘의 기록을 먼저 남겨 보세요. Heart UI는 열람만 가능하며 구매/차감하지 않는다.
- 완료 조건: Diary 후 Episode 2로 강제 이동하지 않으며 Day End는 명시적 선택이다.

### ST-20 DAY_END
- 목적/진입: 첫날을 짧게 종료. ST-19 활성 버튼.
- UI/Asset/Copy: 저녁 방 조명 어두워짐 → Fade Out → 아르카디아에서의 첫날이 저물었어요. → Fade → 다음 날 아침.
- 행동/전환: 자동 fade → ST-21. 별도 [계속]/[다음] 버튼 없음.
- 저장/예외: dayIndex=2/timeOfDay=morning/dayEndCompleted=true. 중단 후 재개는 ST-21. 긴 영상/되돌리기 없음.
- 완료 조건: Episode 메뉴가 아닌 하루 경계이며 한 번만 실행된다.

### ST-21 NEXT_MORNING_MY_ROOM: Prototype End
- 목적/진입: Core Loop 완주 검증. ST-20 완료.
- UI/Asset/Copy: 아침 My Room Overlay, `♥ {heartBalance}`, 가방/다이어리, 최초 1회 `새로운 아침이 밝았어요.` Bern `좋은 아침이에요, {characterName}. 오늘은 어떤 이야기를 만나게 될까요?` Prototype End 개발용 표시는 세계관/NPC 대사와 분리한다.
- 행동/전환: 가방/다이어리 열람. 방 나가기/Episode 2/새 사건은 노출하지 않는다. 공통 메뉴의 [Title로 돌아가기]는 Intro 재생으로 연결하며 save를 유지한다. Prototype End Overlay.
- 저장/예외: Episode 1/수집품/Heart Record/보유 Heart 유지. 로드 시 Day End 재생 금지.
- 완료 조건: 다음 날 아침에 전날 Card/Record와 보유 Heart를 확인하고 Prototype 종료가 명확하다.

## 3A. Episode 1 Script v2 통합 장면 명세 (SCENE 01–32)

### 적용 방법

- 각 Scene의 `구현 상태`는 §3의 `ST-*`에 연결되는 Script v2 ID다. §3의 저장/예외와 아래 실제 Copy는 같은 사양이다. 대화 진행에는 §1.4의 panel click/advance arrow 규칙을 공통 적용한다.
- Life 대화는 모든 Scene에서 Player 왼쪽/NPC 오른쪽, 하나의 대화창, 현재 화자 강조를 사용한다. 원본이 서로 마주보지 않으면 Presentation Layer에서만 horizontal flip한다. Player/NPC 위치나 원본 Asset을 바꾸지 않는다.
- `알아낸 것`에는 플레이어가 직접 본 사실만 짧게 추가한다. 추론(“물이 부족한 것은 아니다”), 원인(“룬 때문에 꽃이 시들었다”), 해결법은 기록하지 않는다. NPC도 조사 전에 이를 말하지 않는다.
- `{characterName}`은 Confirm한 플레이어의 이름으로 치환한다. 이번 Prototype의 Confirm/실제 Player는 카엘(CH01)만 가능하다. 32명 Card 열람은 Profile을 바꾸지 않는다. 전체 게임의 32명 선택·플레이 설계와 이 구현 제한을 구분한다.

### SCENE 01 — Rune Awakening

- **구현 상태 / 목적:** `INTRO_RUNE_AWAKENING` → `ST-01`. 세계 진입의 짧은 감각을 만들며 세계관·온실·퍼즐을 설명하지 않는다.
- **장소/모드/진입:** 어두운 추상 화면 / Intro / `ST-00 GAME_ENTRY`에서 `[시작하기]` 후.
- **인물·Asset·UI:** 인물 없음. 제공 `intro/intro.mp4`의 작은 빛·원형 Rune·어두운 배경; [Skip]을 safe area에 표시한다.
- **실제 Copy/연출:** `마음이 룬을 깨웁니다.` 영상으로 어둠 → 작은 빛 → 원형 Rune Awakening → 밝아짐을 재생하고 완료 후 진행한다. 길이는 제공 영상 기준이다.
- **행동·저장·예외:** [Skip]은 Arcadia Reveal로 연결한다. Intro 재생은 기존 autosave 진행을 덮어쓰지 않는다. 영상 실패는 정적 Rune+같은 Copy 후 실제 Arcadia로 전환한다. BGM/환경음/SFX 없음.
- **전환/수용:** `Rune Glow → 빛 확산 → Arcadia 배경이 희미하게 드러남` → `INTRO_ARCADIA_REVEAL`. 온실의 고장 Rune과 연결하거나 설명하지 않으면 통과.

### SCENE 02 — Arcadia Reveal

- **구현 상태 / 목적:** `INTRO_ARCADIA_REVEAL` (신규 세부 상태, `ST-01`과 `ST-02` 사이). 첫 세계 모습을 먼저 보게 한다.
- **장소/모드/진입:** Arcadia 전경 / Intro / Scene 01 자동 완료 후.
- **인물·Asset·UI / Copy:** 실제 BG01 Arcadia 배경, 설명 문구·버튼·Episode 정보 없음. 1~2초 밝아진 전경만 보여 준다.
- **행동·상태·전환:** 저장값 추가 없음. LUMIA Logo가 나타나며 `TITLE_MAIN`으로 자동 전환. 로딩 실패 시 정적 전경 후 Title로 안전 전환한다.
- **수용:** 아이가 글을 읽지 않아도 세계를 먼저 보며, 이 화면에 `빛을 잃은 온실`, `PC Prototype`, 선택 캐릭터 정보가 나오지 않는다.

### SCENE 03 — LUMIA Title

- **구현 상태 / 목적:** `TITLE_MAIN` → `ST-02 LUMIA_TITLE`. 게임 전체 제목과 시작/재개 진입을 분리한다.
- **장소/모드/진입:** Title / Scene 02 후.
- **UI/Copy:** 중앙 `LUMIA`. 저장 데이터 없음: `[이야기를 시작합니다]`; 저장 데이터 있음: `[이어하기] [새 이야기 시작]`. Episode 제목, `PC Prototype`, 특정 캐릭터, 로컬 기록 표기는 금지한다.
- **행동·저장·예외:** 새 시작은 `CHARACTER_SELECT`; 이어하기는 마지막 autosave State로 복원한다. 저장 데이터 판독 실패는 `[이야기를 시작합니다]`만 제공하고 오류 재시도 UI를 보인다.
- **수용:** Game Title과 Episode Title이 분리되고, 저장이 있어도 Intro 뒤 이 Title을 거쳐 이어하기/새 이야기 시작을 선택한다. 게임 내 Title로 돌아가기는 Intro부터 재생한다.

### SCENE 04 — Character Select (32명)

- **구현 상태 / 목적:** `CHARACTER_SELECT` → `ST-03 CHARACTER_SELECT_32`. 32명 모두를 열람하고 Prototype 플레이어 카엘을 확정한다.
- **장소/모드/진입:** Character Select / Title의 새 시작 후.
- **UI/Asset/Copy:** 상단 `함께 이야기를 시작할 친구를 골라보세요.`; `[남성] [여성]` 탭과 해당 Card 목록으로 합계 32명 전원을 노출한다. Card 본문을 누르면 선택되고, Card 안쪽 모서리의 작은 `[+]` Button을 누르면 해당 인물의 큰 이미지 Overlay를 연다. 우측에는 이름/나이/칭호/짧은 성격·배경/강점/어려워하는 것/대표 대사를 표시하며 `[이 캐릭터로 시작하기]`는 카엘일 때만 표시한다. 다른 31명은 시작 버튼과 제한 안내 없는 열람 전용이다. 예시 카엘: `17세`, `그림자 도서관의 전략가`, `말보다 먼저 주변을 살펴보는 조용한 아이.`, `작은 변화도 잘 알아차려요.`, `계획에 없던 일이 생기면 잠시 고민이 길어져요.`, `“잠깐. 놓친 게 있을지도 몰라.”`
- **행동·저장·예외:** 탭/카드/`[+]` 확대는 Local UI State만 바꾼다. 확대 Overlay를 닫으면 기존 탭/페이지/선택 Card를 보존한다. `[+]`는 선택 또는 시작하기를 실행하지 않는다. 카엘의 `[이 캐릭터로 시작하기]`만 → Scene 05. Canon 원문을 사용하며 일부 인원 축소·신규 설정은 금지한다.
- **수용/다음:** 32명 모두 Card/상세 열람 가능, 카엘만 Confirm/시작, 각 Card의 `[+]`로 큰 이미지를 볼 수 있음, 전신 이미지를 상세영역에 중복 배치하지 않음, Confirm 전 Profile은 불변 → `CHARACTER_CONFIRM`.

### SCENE 05 — Character Confirm

- **구현 상태 / 목적:** `CHARACTER_CONFIRM` → `OV-03A CONFIRM`. 실수 없는 영속 선택을 받는다.
- **UI/Copy:** `카엘과 이야기를 시작할까요?`; `[다시 볼게요] [시작하기]`.
- **행동·저장·예외:** 다시 보기 → Scene 04, 저장 없음. 시작하기 → `selectedCharacterId/name`, `characterConfirmed=true` 저장 후 짧은 Fade. 저장 실패 시 현재 Confirm을 유지하고 `저장하지 못했어요. 다시 시도해 주세요.`를 표시한다.
- **다음/수용:** 선택 Player가 이후 Life 그림·이름의 단일 원본이 되며 → `ADMISSION`.

### SCENE 06 — Admission

- **구현 상태 / 목적:** `ADMISSION` → `ST-04`. 캐릭터 선택과 Arcadia 도착을 초대장으로 잇는다.
- **장소/모드/진입:** 입학 초대장 / Confirm 후.
- **Asset/UI/Copy:** `UI07_입학_초대장.png` 원본 위 개인화 텍스트와 버튼을 얹는다. CSS 대체 디자인 금지. `{characterName}에게` / `아르카디아에 온 것을 환영합니다.` / `이곳에서는 신비한 룬과 여러 친구들이 당신을 기다리고 있습니다.` / `이제, 당신의 이야기를 시작해 보세요.` / `[입학하기]`.
- **행동·상태·예외:** `admissionRead=true` 저장. 이름 하드코딩 금지. 더 긴 세계관 설명은 추가하지 않는다.
- **다음/수용:** 입학하기 → Scene 07. 입학 문구는 Puzzle Rune의 원리·온실 사건을 설명하지 않는다.

### SCENE 07 — Frontend Rune / Fade Transition

- **구현 상태 / 목적:** `ADMISSION_TRANSITION` → `ST-05 FRONTEND_RUNE_FADE`. 전환 전용 Rune을 광장/온실 Rune과 혼동하지 않게 한다.
- **UI/Copy/연출:** 초대장의 Rune 발광 → 화면 전체 빛 → Warm/White Overlay → 뒤 배경을 시계탑 광장으로 교체 → Overlay Fade Out. 영상 파일은 쓰지 않으며 총 2~3초.
- **상태·예외:** `entryProgress=arrivalTransitionSeen` 저장. 효과 실패 시 즉시 Fade로 광장 도착을 보장한다.
- **다음/수용:** `PLAZA_FIRST_ARRIVAL`. 전환 Rune을 조사·퍼즐 대상처럼 보이게 하지 않는다.

### SCENE 08 — First Arrival / Valentinus 첫 만남

- **구현 상태 / 목적:** `PLAZA_FIRST_ARRIVAL` → `ST-06` 후 `ST-07`. Arcadia 첫 도착과 발렌티누스의 환영을 연결한다.
- **장소/모드/진입:** 시계탑 광장 / Life / Scene 07 후, `timeOfDay=day`.
- **Asset/UI:** 먼저 인물 없이 장소 표기 `아르카디아` / `시계탑 광장`을 짧게 보인 뒤 Player 왼쪽·발렌티누스 오른쪽. 단일 대화창과 현재 화자 강조.
- **실제 Dialogue:** 발렌티누스 `처음 보는 얼굴이구나. 오늘 온 학생이지?` / Player `네. 오늘 처음 왔어요. 저는 {characterName}이에요.` / 발렌티누스 `반갑구나, {characterName}. 나는 발렌티누스란다.` / `나는 이곳에서 룬을 가르치고 있단다.` / Player `룬이요?` / 발렌티누스 `그래. 아르카디아 곳곳에서 볼 수 있는 신비한 힘이란다.` / `처음 보는 게 많을 거야.` / `궁금한 게 생기면 가까이 가서 살펴보렴.` / `모르는 게 있다면 친구들에게 물어봐도 좋고.` / `오늘은 천천히 둘러보렴.` / Player `네!`
- **상태·전환·수용:** `firstArrivalSeen=true`, `valentinusMet=true` 저장, 발렌티누스 퇴장 → `PLAZA_NORMAL_FIRST_DAY`/Scene 09. Rune 작동 원리·온실 해답을 말하지 않으면 통과.

### SCENE 09 — 시온 첫 만남

- **구현 상태 / 목적:** `PLAZA_SHION_FIRST_MEET` → `ST-08`. 사건을 발견시키되 원인·조사 위치·답은 숨긴다.
- **장소/모드/진입:** 시계탑 광장 / Life / Scene 08 후. Player 왼쪽·시온 오른쪽, 시온의 표정은 Player가 묻기 전 잠시 어두워진다.
- **실제 Dialogue:** 시온 `어? 처음 보는 얼굴인데?` / `오늘이 첫날이야?` / Player `응. 이제 막 도착했어.` / 시온 `그렇구나. 나는 시온이야.` / Player `나는 {characterName}이야.` / Player `그런데 무슨 일 있어?` / `아까부터 자꾸 어디를 보고 있네.` / 시온 `사실 온실에 이상한 일이 생겼어.` / `유리꽃들이 오늘 아침부터 빛을 잃었거든.` / Player `유리꽃?` / 시온 `온실에서 자라는 특별한 꽃이야. 원래는 반짝반짝 빛나.` / `나도 무슨 일인지 알아보러 가려던 참이야.` / Player `그럼 나도 같이 가도 돼?` / 시온 `물론이야. 같이 가 줘.`
- **상태·다음·수용:** `sionMet=true`, `episode1Status=offered` 저장 → Scene 10. `룬에 문제가 있는 것 같아`, `빛의 흐름이 끊어진 것 같아`, `룬의 배열을 확인해 보자`는 절대 표시하지 않는다.

### SCENE 10 — Episode 1 Title Card

- **구현 상태 / 목적:** `EP01_TITLE` → `ST-09` 전반. Episode 경계를 분명히 한다.
- **UI/Copy/전환:** 짧은 Fade 뒤 `EPISODE 1` / `빛을 잃은 온실`, 약 1.5~2초 자동 표시 → `GREENHOUSE_LIFE_INTRO`.
- **상태/수용:** `titleSeen=true`, `episode1Status=started` 저장. Game Title과 구분되며 해답·목표 외 설명이 없다.

### SCENE 11 — Greenhouse Life

- **구현 상태 / 목적:** `GREENHOUSE_LIFE_INTRO` → `ST-10 GREENHOUSE_LIFE_BEFORE`. Adventure로 갈 동기를 준다.
- **장소/모드/진입:** 유리 온실 / Life / Scene 10 후. 시든 꽃 Before 배경, Player 왼쪽·시온 오른쪽.
- **Dialogue/Copy:** 시온 `여기야. 저게 유리꽃이야.` / Player `정말 빛이 거의 없네.` / 시온 `응…… 원래는 훨씬 밝게 빛나.` / Player `가까이 가서 살펴볼게.` / 시온 `응. 부탁해.` / `[온실 살펴보기]`.
- **행동·상태·다음:** 버튼 → Scene 12. 룬을 지목하지 않으며 SD 이동을 Life에 넣지 않는다. 재진입 시 Adventure 저장 상태를 읽어 해당 Life 배경/목적을 유지한다.

### SCENE 12 — Adventure 시작

- **구현 상태 / 목적:** `GREENHOUSE_ADVENTURE_START` → `ST-11`. 직접 관찰하는 SD 탐험 시작.
- **장소/모드/진입:** 유리 온실·약초원 / Adventure / Scene 11의 버튼 또는 중단 후 재진입. 카엘 Life 그림을 기존 카엘 SD로 교체한다. MAP04 Large Map Illustration의 배포 WebP + player-follow camera + collision polygon/rectangle + interaction points를 사용한다. 화면은 전체 지도를 축소하지 않은 viewport다.
- **HUD/Copy:** 현재 목표 `유리꽃이 왜 시들었는지 살펴보자.`; 알아낸 것 `아직 알아낸 것이 없어요.`; `[가방] [힌트] [메뉴]`. 최초 1회 실제 Prototype 입력과 일치하는 `방향키로 움직여 보세요. 가까이 가서 E를 누르면 살펴볼 수 있어요.`와 근처 대상 `E 살펴보기` Prompt를 제공한다. PC는 방향키/WASD + E, Mobile은 조이스틱 + 문맥 행동 버튼으로 같은 동작을 제공한다. Mobile 안내는 `조이스틱으로 움직여 보세요. 가까이 가서 살펴보기 버튼을 눌러 보세요.`다. 입력 감지는 [개발 확인].
- **행동·저장·예외:** 8방향 이동/근접 Highlight/조사/선택 수집, 가방·힌트·메뉴. 시간대는 day로 고정. 위치/목표/Knowledge/수집/Hint/회전을 각 변화 때 저장. 다음: 유리꽃 Scene 13, 약초 Scene 14, 햇빛 Scene 14A, 룬 Scene 15, 메뉴 Scene 18. 발견 순서는 자유이며 알아낸 것은 발견 순서대로 쌓인다.
- **수용:** HUD에 Quest Log·Minimap·HP·발견 기록 버튼이 없고 Adventure는 별도 Stage가 아니다.

### SCENE 13 — 유리꽃 조사

- **구현 상태 / 목적:** `GREENHOUSE_INSPECT_FLOWER` → `ST-11A`. 관찰 가능한 사실 하나를 얻는다.
- **UI/Copy:** `유리꽃을 살펴봤어요.` / `꽃은 시들어 있지만, 흙은 아직 촉촉해요.`
- **행동·저장·다음:** 닫기 → Scene 12. `knowledge.glassFlowerSoil=true` 저장, HUD에 `🌱 유리꽃의 흙은 충분히 젖어 있다.`를 추가한다.
- **수용:** `물이 부족해서 시든 것은 아니다` 또는 다음 행동·원인을 말하지 않는다.

### SCENE 14 — Optional 달빛 약초 / 가방

- **구현 상태 / 목적:** `GREENHOUSE_COLLECT_HERB` → `ST-11B`. 이야기 진행과 무관한 선택 수집을 보여 준다.
- **UI/Copy:** `달빛 약초를 찾았어요!` / `은은하게 빛나는 작은 약초예요.` / `[가방에 넣기]`.
- **행동·저장·다음:** 넣기 → `달빛 약초 ×1` Collection Card를 추가하고 `가방에 달빛 약초를 넣었어요.` Toast 후 Scene 12. 가방 상세: `달빛 약초` / `[이미지]` / `은은한 빛을 품은 작은 약초. 유리 온실에서 발견했다.`
- **예외/수용:** 중복 상호작용은 수량을 다시 늘리지 않는다. 필수 재료·점수·판매품·룬 수리 재료라고 설명하지 않으며, 얻지 않아도 Story가 진행된다.

### SCENE 14A — 온실 햇빛 조사

- **구현 상태 / 목적:** `GREENHOUSE_INSPECT_SUNLIGHT` → `ST-11C`. 배경/유리창을 조사해 객관적 사실 하나를 찾는다.
- **UI/Copy:** `온실 안을 살펴봤어요.` / `유리창 사이로 햇빛이 들어오고 있어요.` → `새로운 사실을 발견했어요!`; HUD 추가 `☀ 온실 안에는 햇빛이 들어오고 있다.`
- **행동·저장·다음:** 닫기 → Scene 12. `knowledge.greenhouseSunlight=true` 저장.
- **수용:** `햇빛 부족이 원인이 아니다`, `룬이 원인이다` 같은 추론·원인을 게임이 말하지 않는다.

### SCENE 15 — 룬 조사

- **구현 상태 / 목적:** `GREENHOUSE_INSPECT_RUNE` → `ST-11D`. Puzzle의 관찰 단서를 플레이어가 직접 찾는다.
- **UI/Copy:** `오래된 룬이 있어요.` / `돌 위로 빛이 흐르고 있어요. 그런데 빛이 중간에서 끊겨 있어요.`; HUD 추가 `✨ 룬의 빛이 중간에서 끊겨 있다.`
- **행동·저장·다음:** `knowledge.runeLightBroken=true` 저장. 다시 조사 시 `돌 위에 여러 개의 길이 그려져 있어요. 몇몇 길은 서로 이어지지 않아요.` / `[빛의 길 살펴보기]` → Scene 16; 닫기 → Scene 12. `3/3 단서` 체크리스트나 강제 Puzzle 해금은 없다.
- **수용:** 룬 고장, 꽃의 원인, 배열 수정 필요를 단정하지 않는다. 룬을 먼저 찾아도 Puzzle 진입 가능하다. [Playtest 확인] 룬 직행이 탐험 경험을 약하게 만드는지 User Test에서 관찰하고, 필요 시 Soft Guidance 후보 `다른 곳에도 이상한 점이 있는지 조금 더 살펴볼까?` / `[주변을 더 살펴보기] [룬을 살펴보기]`를 검토한다. 현재 강제 구현은 아니다.

### SCENE 16 — Connect / Rotate Puzzle

- **구현 상태 / 목적:** `GREENHOUSE_RUNE_PUZZLE_INTRO` / `ST-12`. 끊긴 빛길을 직접 잇는다.
- **UI/Copy:** 제목 `끊긴 빛의 길`; `조각을 눌러 돌려 보세요. 원에서 마름모까지 빛의 길을 이어 주세요.` `[힌트] [나가기]`; 조각/시작 원/도착 마름모 `[Asset TBD]`.
- **행동·저장·예외:** 각 조각은 90° 회전, `puzzleRotations`와 현재 Hint 단계는 매 행동 저장. 나가기 → Scene 12, 성공 → Scene 19. 실패 팝업·벌점·자동 리셋·GAME OVER는 없다.
- **수용:** 목표는 조작 목표일 뿐 사건의 원인 정답을 말하지 않으며, 3개 Hint 이후에도 Player가 마지막 조각을 직접 완성한다.

### SCENE 17 — 3단계 Hint

- **구현 상태 / 목적:** `GREENHOUSE_RUNE_HINT_L1/L2/L3` → `ST-12A`. 관찰→원리→첫 행동 순서를 지원한다.
- **실제 Copy:** L1 `빛은 왼쪽 위의 원에서 시작해요. 어디에서 길이 끊겼는지 살펴보세요.` / L2 `맞닿은 두 조각의 길이 서로 이어져야 빛이 다음 조각으로 갈 수 있어요.` / L3 `윗줄 가운데 조각을 한 번 돌려 보세요.`
- **행동·저장·다음:** Hint를 누를 때 단계만 1씩 올리고 Puzzle로 복귀한다. 사용 벌점·점수 감소·보상 감소·실패 횟수 표시는 없다.
- **수용:** L3도 전체 답/자동 회전을 제공하지 않는다. (ST-12A와 동일한 Episode 1 Script v2 Copy다.)

### SCENE 18 — Adventure 중간 종료 / 재진입

- **구현 상태 / 목적:** 모든 `ADV_*`에서 접근하는 중단 Overlay. 실패가 아닌 안전한 중단을 제공한다.
- **UI/Copy:** `[메뉴]` → `온실 탐험` / `[계속 탐험하기] [탐험 그만하기]`; 그만하기 → `온실 탐험을 그만할까요?` / `지금까지 찾은 것은 그대로 남아 있어요. 나중에 다시 와서 이어서 할 수 있어요.` / `[계속 탐험하기] [그만하고 돌아가기]`.
- **상태·전환:** 확인 시 위치, 알아낸 것, Collection, Puzzle 진행/해결, World Change, 목표를 저장하고 Scene 11 Life로 복귀. 재진입은 같은 값을 복원하며 중복 지급하지 않는다.
- **수용:** “포기”, “실패” 표시가 없고 Adventure 장기 플레이·가방·다이어리 열람으로 시간대가 변하지 않는다.

### SCENE 19 — Puzzle 해결

- **구현 상태 / 목적:** `GREENHOUSE_RUNE_SOLVED` → `ST-13`. 직접 푼 행동의 즉각적 변화를 보인다.
- **UI/Copy/연출:** 마지막 조각 연결 → `빛의 길이 이어졌어요!` → Rune Glow → 온실 전체로 빛 확산 → 유리꽃이 하나씩 고개를 든다.
- **상태·다음:** `runeState=active`, `worldChangeState=greenhouseRecovered` 저장 → Scene 20 Adventure 유지.
- **수용:** Puzzle 직후 Life로 자동 이동하지 않으며, 변화는 동일 Adventure 세계에 남는다.

### SCENE 20 — World Change 직접 확인

- **구현 상태 / 목적:** `GREENHOUSE_WORLD_CHANGED` → `ST-14`. Player가 `내 행동 → 세계 변화`를 직접 확인하게 한다.
- **HUD/Copy:** 현재 목표 `온실에 어떤 변화가 생겼는지 살펴보자.`; 배경은 MAP04 Restored Map 또는 부분 overlay; 회복 꽃 조사 `유리꽃이 다시 고개를 들었어요. 잎과 꽃잎에서 빛이 반짝여요.`; 선택 룬 조사 `룬의 길을 따라 빛이 계속 흐르고 있어요.`
- **행동·저장·다음:** 회복 꽃 조사 flag 저장 후 현재 목표 `시온에게 돌아가 알려주자.` 입구 이동 → Scene 21. 회복 꽃을 조사하지 않은 경우도 입구 이동은 허용한다. 중단/재진입도 After 상태·목표를 복원한다.
- **수용:** Puzzle 후 Adventure를 유지하고 직접 재관찰을 제공한다. 회복 꽃 재조사는 선택이며 조사 없이 입구 귀환해도 Scene 21로 진행한다.

### SCENE 21 — 시온에게 Life 복귀

- **구현 상태 / 목적:** `GREENHOUSE_LIFE_AFTER_ADVENTURE` → `ST-15` 전반. 발견 후 공유로 감정 장면을 연다.
- **장소/모드/진입:** 회복된 온실 / Life / Scene 20 입구 도착. Player 왼쪽·시온 오른쪽.
- **Dialogue:** 시온 `정말 빛이 돌아왔어!` / Player `안쪽에 있던 룬의 빛이 중간에서 끊겨 있었어.` / `길을 다시 이어 주니까 유리꽃도 다시 빛나기 시작했어.` / 시온 `……{characterName}.` / `사실 나, 말하지 않은 게 있어.`
- **상태/수용:** `episode1Status=resolved`는 Choice/Reflection 완료 전 확정하지 않는다. 이곳의 룬 언급은 이미 직접 조사한 사실이므로 허용된다 → Scene 22.

### SCENE 22 — 시온 고백

- **구현 상태 / 목적:** `GREENHOUSE_SHION_CONFESSION` → `ST-15` 후반. 문제 해결 뒤에 숨긴 감정을 드러낸다.
- **Dialogue/연출:** 시온 `어제 내가 저 룬을 만졌어.` / Player `룬을?` / 시온 `꽃을 더 밝게 만들고 싶었어.` / `그래서 룬 조각 몇 개를 돌렸어.` / `오늘 꽃이 시든 걸 보고……` / `혹시 나 때문일까 봐 무서웠어.` / `혼날까 봐 겁이 났어.`
- **상태·다음·수용:** 시온은 원인을 확실히 알고 숨긴 것이 아니다. 자신의 행동 때문일지 두려워 말하지 못한 것이다. 문장을 짧게 분리하고 채점·교훈을 붙이지 않는다. 고백은 Adventure 해결 뒤에만 발생 → Scene 23.

### SCENE 23 — 3개 Meaningful Choice

- **구현 상태 / 목적:** `GREENHOUSE_SHION_CHOICE` → `ST-15`. 플레이어의 돌봄 방식을 고르되 정답을 만들지 않는다.
- **UI/Copy:** `시온에게 어떤 말을 할까?` / `선생님께 같이 이야기하러 갈까?` / `천천히 생각해 봐. 내가 옆에 있을게.` / `내가 어떻게 도와주면 좋을까?`
- **행동·저장:** 하나를 확정하면 선택 문장 자체를 `choiceId`와 함께 저장하고 Scene 24로 간다. A/B/C 문자, 정답색, 점수/우열 효과음/성격 판정/호감도는 없다.
- **수용:** Choice는 같은 Scene 위에서 Player 실제 대사 → NPC 반응으로 진행하며 모두 공통 흐름으로 합류한다.

### SCENE 24 — Choice별 실제 반응

- **구현 상태 / 목적:** `GREENHOUSE_SHION_CHOICE_REACTION` → `ST-15`, 완료 후 `ST-16`. 선택의 말을 실제로 보여 주고 평가 없이 반응한다.
- **첫 선택 Copy:** Player `선생님께 같이 이야기하러 갈까?` / 시온 `응. 같이 가 준다면 말할 수 있을 것 같아.`
- **둘째 선택 Copy:** Player `천천히 생각해 봐. 내가 옆에 있을게.` / 시온 `고마워. 조금만 생각해 볼게.`
- **셋째 선택 Copy:** Player `내가 어떻게 도와주면 좋을까?` / 시온 `룬을 제대로 다루는 방법을 배우고 싶어.` / `다음에는 먼저 선생님께 물어볼래.`
- **상태·전환·수용:** 선택 후 반드시 같은 Dialogue Scene에서 Player가 선택 문장을 실제로 말하고 시온이 반응한다. 반응 뒤 짧은 공통 흐름으로 합류하며 교훈 문장은 금지한다. Reaction 완료 후 `episode1Status=resolved`, `timeOfDay=evening` 저장 → Scene 25. 어떤 선택도 더 좋은 결말/보상/분기로 만들지 않는다.

### SCENE 25 — 저녁 My Room

- **구현 상태 / 목적:** `MYROOM_EVENING_EP01` → `ST-16` 전반. 해결 후 개인 공간과 성찰을 시작한다.
- **장소/모드/진입:** 같은 My Room의 evening Overlay / Life / Scene 24 후. 따뜻한 실내등·어두운 창밖 `[Asset TBD]`; 별도 방이 아니다.
- **UI/Copy:** Fade 뒤 `어느새 해가 저물고 있어요.`; `[가방] [다이어리]`; 가방은 Adventure 공통 Collection Card Grid로 달빛 약초를 그대로 보인다. Bern 등장. 가방=모은 것, 다이어리=경험한 이야기, Heart=이야기를 경험하며 모은 보상이다. My Room 기본 화면의 compact balance는 재화만 표시하며 Bern Dialogue/Reflection 중에는 숨긴다.
- **상태·다음·수용:** 실제 플레이 시간과 무관하게 Story State로만 day→evening 전환. 가방/다이어리 열람은 시간 불변 → Scene 26. Episode 2를 시작하지 않는다.

### SCENE 26 — Bern

- **구현 상태 / 목적:** `MYROOM_BERN_REFLECTION_INTRO` → `ST-17`. 평가 없는 돌아보기를 권한다.
- **Dialogue/UI:** Bern `돌아왔군요, {characterName}. 오늘은 어떤 하루였나요?` / `하루를 마치기 전에 기억에 남은 장면을 하나 떠올려 볼까요?` / `[오늘 돌아보기]`.
- **행동·상태·다음:** 버튼 → Scene 27. 가방/다이어리 접근은 유지한다.
- **수용:** Bern은 칭찬 점수·성격 판단·Choice 평가·교훈 설명을 하지 않는다.

### SCENE 27 — Heart Reflection

- **구현 상태 / 목적:** `HEART_REFLECTION_EP01` → `ST-17` 후반. 개인 기억을 고른다.
- **UI/Copy:** `오늘 어떤 장면이 가장 기억에 남나요?`; 선택: `유리꽃을 가까이에서 살펴본 순간`, `끊어진 빛의 길을 이은 순간`, `시온의 이야기를 들은 순간`, `시온에게 말을 건넨 순간`.
- **행동·저장·다음:** 하나 선택 → `reflectionAnswers` private 저장, `reflectionCompleted=true` → Scene 28. 보상·점수 없음.
- **수용:** 선택 뒤 Bern은 평가·성격/능력 추론 없이 공통 중립 반응 `그 장면이 기억에 남았군요.`만 말한다. 이 답변은 개인 기록이며 Parent Letter/Report에 전달·미리보기하지 않는다.

### SCENE 28 — Heart Record 생성

- **구현 상태 / 목적:** `HEART_RECORD_EP01` → `ST-18`. Episode 경험을 재열람 가능한 누적 Record로 만든다.
- **UI/Copy:** `오늘의 이야기` / `EPISODE 1 · 빛을 잃은 온실`; 대표 이미지; `빛을 잃은 유리꽃을 살펴보고, 끊어진 룬의 빛을 다시 이어 주었어요.` / `그리고 말하지 못한 일이 있던 시온의 이야기를 들었어요.`; `내가 건넨 말`에는 실제 선택 문장, `마음에 남은 장면`에는 Reflection 값을 표시; `[다이어리에 남기기]`.
- **행동·저장·예외:** 저장 시 Heart Record를 `heartRecords[]`에 append(기존 overwrite 금지), `diarySaved=true` 저장 → Scene 29. 저장 실패 시 화면 유지·재시도. Diary 저장 UI 이벤트와 Heart 보상 데이터 이벤트는 분리한다. `dayEndUnlocked`와 Heart 지급은 Reflection 답변 또는 Record 생성의 보상이 아니라 Diary 저장 뒤 `EPISODE_COMPLETION_REWARD`에서만 처리한다.
- **수용:** Parent Report 미리보기/보호자 공개 라벨/점수·등급이 없다.

### SCENE 29 — Diary 저장

- **구현 상태 / 목적:** `DIARY_EP01_SAVED` → `ST-19` 진입. 생성된 Record를 영속 Diary에 확정한다.
- **UI/Copy:** `오늘의 이야기가 다이어리에 남았어요.`. Diary의 `HEART RECORD` Card Grid/List에 `EP.01` / `빛을 잃은 온실` Card를 표시하고 선택 시 Scene 28 Record를 재열람한다.
- **상태·다음·수용:** 중복 저장/중복 Card를 만들지 않는다 → 별도 Scene 29A. Diary는 시간대를 진행시키지 않는다.

### SCENE 29A — Episode 완료 Heart 지급

- **구현 상태 / 목적:** `EPISODE1_COMPLETE_HEART_REWARD` → `OV-18A`. Diary 저장 후 Episode 1 완료를 보상하고 Heart를 누적한다. Heart Reflection 답변에 대한 보상이나 Choice 평가가 아니다.
- **UI/Copy:** `이야기를 하나 마쳤어요!` / `♥ 하트 +100`. 첫 획득만 `♥ 하트` / `이야기를 경험하면 모을 수 있어요.` / `모은 하트로 나중에 My Room의 새로운 테마를 꾸밀 수 있어요.`를 이어서 표시한다.
- **행동·저장·다음:** 최초 완료 시 `rewardReason=EPISODE_COMPLETION_REWARD`, `heartBalance += 100`, `episode1HeartRewardClaimed=true`, `dayEndUnlocked=true`를 Local Save → Scene 30. 지급 완료 상태에서 재진입하면 추가 지급 없이 현재 보유 Heart를 표시한 뒤 Scene 30으로 간다.
- **수용:** Choice 내용, Hint 사용, Puzzle 실패 횟수, Adventure 중단/재개, 해결 속도와 무관하게 Episode 1 완료 보상은 동일하다. Heart는 착함·공감·인성 점수로 표시하거나 사용하지 않는다.

### SCENE 30 — 저녁 My Room 자유 상태

- **구현 상태 / 목적:** `MYROOM_EVENING_FREE` → `ST-19`. Player가 하루 종료를 명시적으로 선택하게 한다.
- **UI/행동:** 저녁 My Room에 현재 보유 Heart `♥ {heartBalance}`를 표시하고 `[가방] [다이어리] [베른과 이야기하기] [오늘을 마무리하기]`를 제공한다. 가방=모은 것, 다이어리=경험한 이야기, Heart=이야기를 경험하며 모은 보상이다. 앞 세 행동은 이 상태를 유지하고 시간은 흐르지 않는다. Theme Shop, 구매, 차감은 제공하지 않는다. `[오늘을 마무리하기]` → `오늘을 마무리할까요? 다음 날 아침으로 넘어가요.` / `[조금 더 있을래요] [오늘을 마무리하기]`.
- **상태·예외:** `dayEndUnlocked=false`면 마지막 버튼을 비활성화하고 `오늘의 기록을 먼저 남겨 보세요.`를 보인다. true면 Scene 31로.
- **수용:** Diary 직후 Episode 2 또는 다음 날로 강제 이동하지 않는다.

### SCENE 31 — Day End

- **구현 상태 / 목적:** `DAY_END_EP01` → `ST-20`. 첫날의 명확한 Story Day Boundary를 만든다.
- **진입/Copy/연출:** Scene 30 활성 `[오늘을 마무리하기]` → 방 조명이 천천히 어두워짐 → Fade Out → `아르카디아에서의 첫날이 저물었어요.` → `다음 날 아침` → Warm Fade In. 별도 영상은 없다.
- **상태·예외:** `dayIndex=2`, `timeOfDay=morning`, `dayEndCompleted=true` 저장. 중단 후 로드하면 Day End 연출을 되풀이하지 않고 Scene 32로 간다. 되돌리기 없음.
- **수용/다음:** Episode 메뉴가 아닌 하루 경계이며 한 번만 실행 → `MYROOM_MORNING_DAY02`.

### SCENE 32 — 다음 날 아침 My Room (Prototype End)

- **구현 상태 / 목적:** `MYROOM_MORNING_DAY02` → `ST-21`. Core Loop 완주와 영속 데이터를 검증하는 공식 Prototype 종료점이다.
- **장소/모드/진입:** 같은 My Room의 morning Overlay / Life / Scene 31 또는 Day End 후 Load. 부드러운 햇빛 `[Asset TBD]`.
- **UI/Copy:** 최초 1회 `새로운 아침이 밝았어요.`; Bern 인사 `좋은 아침이에요, {characterName}. 오늘은 어떤 이야기를 만나게 될까요?`; My Room에서만 현재 보유 Heart `♥ {heartBalance}`; `[가방] [다이어리]`; Prototype End 개발용 Overlay는 세계관/NPC 대사와 분리한다. 방 나가기, Episode 2, 새 사건, Episode Title은 노출하지 않는다.
- **영속 검증/예외:** 가방에서 Episode 1 Collection(선택 수집품인 달빛 약초 포함)이 그대로 존재하고, Diary에서 `EP.01 빛을 잃은 온실` Heart Record가 그대로 열린다. `selectedCharacter`, `episode01.completed`, `episode01.choice`, Heart Reflection/Heart Record, `collectedItems`, `heartBalance=100`(초기 0 기준), `timeState=morning`, `day=2`가 Load 후에도 유지된다. 중단/재시작으로 Day End가 재생되지 않는다.
- **수용:** Story는 여기서 끝나지만 실제 My Room 상태는 유지한다. Prototype의 종료는 Episode 1 직후가 아니라 반드시 이 State다.

## 4. 보호자 이야기 편지 경계

- 아이 플레이에서 Parent Report/대시보드/성격·MBTI 추정/공감·책임 점수/메일 전송을 전부 제거한다. [Prototype 제외]
- 미래 보호자 경험은 게임과 분리된 보호자 설정에서 이메일 연결·동의 후 작동한다.
- 편지는 점수표가 아니라 어떤 이야기였나요? → 아이는 어떻게 했나요? → 그 뒤에는 어떻게 되었나요? → 함께 이야기해 보세요 형식이다.
- 전송 가능: 완료 Episode 맥락, Major Choice의 중립 행동 설명, World Reaction, 대화 질문 후보.
- 전송 금지: Reflection/Heart Record 원문, 일반 NPC 대화, Random 답변, Hint/실패, 수집 수치, 실시간 위치.
- 보호자 이메일 수집·동의·인증·발송은 [개발 확인]. Prototype은 데이터 경계 필드만 둘 수 있다.

## 5. Asset, 제외 범위, 수용 체크

### 필수 Asset 범주

- 제공 Intro Movie/BG01 Arcadia/LUMIA Logo/Skip, UI07 Admission 원본, Admission 실시간 Rune/Fade와 Day End UI
- 32 Character Card/정보와 선택 Player Life 일러스트. 32명 전원 SD는 불필요.
- 발렌티누스/시온/Bern Life Art 및 표정 [Asset TBD]
- 시계탑 Life, 온실 Life Before/After, My Room 아침/저녁 Overlay
- 카엘(CH01) Life/SD Player 1명. 전체 32명은 Card/상세/큰 이미지 열람 자료만 필요하며 다른 31명 SD는 [Prototype 제외].
- MAP04 Large Map Illustration 원본/배포 WebP, Restored Map 또는 change overlay, 선택적 foreground, 조사 context image, 꽃 Before/After, 약초, Rune Before/Active, VFX, 기존 카엘 8방향×3frame SD Master Sheet [Asset TBD]
- HUD/Bag/Puzzle/Hint/Reflection/Heart Record/Diary/Heart 획득 연출 및 My Room·향후 Theme 화면용 보유 Heart UI

### Prototype 제외

- Episode 2+, Episode 목록/Stage Map, 32명 전체 SD·개별 Episode Script
- 대서고/천문대 Adventure, 신규 Adventure 장소, 공방/수련장 Mini Game, Crafting/장비/상점
- Combat/HP/Death/GAME OVER/Energy/시간 제한, EXP/Level/마음 Stat/호감도/Rank/완성률
- Minimap/Quest Log/Checkpoint Object/Rune Portal/수동 저장
- [Prototype 제외] 자유 가구 배치/전체 Room Theme, 복잡한 재화 경제/상점/테마 구매·가격 밸런싱
- Parent Report UI·Analytics·이메일 백엔드
- 실제 시계/복잡한 밤 Event/모든 장소 시간대 Background/Intro 외 추가 긴 영상
- BGM/환경음/SFX, 새 Tile/Modular Map Engine 및 Tile asset 제작

### 최종 수용 체크

- [ ] ST-00~ST-21 및 Episode 1 Script v2 SCENE 01~32를 저장 포함 완주한다.
- [ ] 32명 Card/상세/큰 이미지 열람을 제공하고 카엘만 Confirm/시작한다. 다른 31명은 시작 버튼/제한 안내 없음. 카엘 Life/SD가 일치한다.
- [ ] 제공 Intro Movie/Skip/정적 fallback/실제 Arcadia/Title, 저장 유무별 Title 메뉴와 Title 돌아가기 시 Intro 재생, UI07 원본 Admission을 확인한다.
- [ ] MAP04 원본 보존/배포 WebP, follow camera, 코드 collision/interaction, Restored Map/overlay를 사용한다.
- [ ] Desktop/Mobile 재배치·touch·safe area·긴 Choice 자동 높이·Dialogue overflow·모바일 viewport follow를 검증한다. iPhone 6s 실기기는 완료조건이 아니다.
- [ ] Dialogue opacity 100%/no blur/기본 scale-position 고정/brightness 150~250ms/arrow+click 진행/Choice arrow 숨김/context image/icon+label을 검증한다.
- [ ] Game Entry Rune, LUMIA Title, Episode Title, Puzzle Rune이 구분된다.
- [ ] Life는 좌우 고정/화자 강조/단일 창/facing rule을 지킨다.
- [ ] 온실 전·조사 카피가 원인/정답/조사 위치를 미리 말하지 않는다.
- [ ] 8방향 Adventure는 실제 입력과 일치하는 상호작용 안내 및 `E 살펴보기` Prompt를 제공한다. [개발 확인]
- [ ] 알아낸 것은 발견 순서대로 쌓이며, 객관적 사실 `유리꽃의 흙은 충분히 젖어 있다`, `온실 안에는 햇빛이 들어오고 있다`, `룬의 빛이 중간에서 끊겨 있다`만 기록한다. 달빛 약초는 Optional Collection Item이며 알아낸 것에 들어가지 않는다.
- [ ] 3/3 단서 체크리스트와 Puzzle 강제 해금 없이 룬을 먼저 찾아도 Puzzle에 진입할 수 있다. 룬 직행 시 Soft Guidance 필요 여부는 5명 이상 User Test 관찰 항목이다.
- [ ] 8방향 Adventure, 조사 Knowledge, Optional 수집, 공통 Bag, 3단계 Hint가 작동한다.
- [ ] 실패/죽음/GAME OVER가 없고 중단·재진입 상태가 유지된다.
- [ ] Puzzle 뒤 Adventure 안에서 World Change/회복 꽃을 확인한다.
- [ ] Heart Record가 append되고 Diary에서 누적 확인된다.
- [ ] Lumia에 Visible Player Stat이 없고, 공감/용기/절제/인성/호감도 등의 수치화·평가·레벨·랭크가 표시되지 않는다.
- [ ] Heart는 `EPISODE_COMPLETION_REWARD`로만, Choice·Reflection·Hint·Puzzle 실패·Adventure 중단/재개·해결 속도와 무관한 Episode 완료 보상 `♥ 하트 +100 (Prototype 임시 밸런스)`이 1회만 지급된다.
- [ ] Diary 저장 뒤 먼저 `오늘의 이야기가 다이어리에 남았어요.`가 표시되고, 별도 보상으로 `이야기를 하나 마쳤어요!` / `♥ 하트 +100`이 표시된다. 첫 획득 1회 설명도 제공하며, Heart Reflection 답변에 대한 보상으로 보이지 않는다.
- [ ] Heart Balance는 Life/Adventure/Dialogue/Puzzle에서 상시 표시되지 않으며, 획득 순간과 My Room 및 향후 Heart 사용/Theme 화면에서만 확인할 수 있다. Theme Shop/구매/차감 UI는 없다.
- [ ] 보호자 기능은 아이 플레이에서 제거되고 private 경계가 반영된다.
- [ ] Episode 1 → 저녁 My Room → Bern → Heart Reflection → Heart Record 생성 → Diary 저장 → Episode 완료 Heart 지급 → 저녁 My Room 자유 상태 → Day End → 다음 날 아침 My Room 순서를 지킨다.
- [ ] ST-21에서 Episode 2를 시작하지 않는다.
- [ ] `MYROOM_MORNING_DAY02`에서 `selectedCharacter`, `episode01.completed`, `episode01.choice`, Heart Reflection/Heart Record, Episode 1 수집품(달빛 약초는 optional), `heartBalance=100`(초기 0 기준), `timeState=morning`, `day=2`가 저장·재로드 뒤 유지된다.
- [ ] Parent Report 미리보기는 Heart Record, Diary, My Room을 포함한 아이 Flow 어디에도 존재하지 않는다.

## 6. 남은 확인 항목

- [Asset TBD] Character Canon의 파일/최종 표시 정보, 원본 교체·표정 QA, My Room 시간대 Overlay, WebP export 크기/압축 수준.
- [개발 확인] Intro 코덱/재생 실패 fallback, MAP04 collision·interaction 좌표/카메라/메모리, 터치 조작·입력 감지, local save 실패/복구, 접근성.
- [Playtest 확인] 실제 아동 5명 이상 User Test, 룬 직행 시 탐험 경험/Soft Guidance, 긴 Choice·Dialogue overflow·touch target, 1~2% scale 옵션의 필요성.
- [TBD: 후속 밸런스] Prototype은 ♥100으로 고정하며 전체 게임 Episode 보상/Theme 가격은 후속 검토다. 보호자 동의/이메일 인증은 [Later]/[Prototype 제외].
