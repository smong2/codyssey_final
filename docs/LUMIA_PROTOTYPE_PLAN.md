# LUMIA Prototype Plan
## 첫 Prototype 제작 범위 및 검증 계획

> 문서 상태: **Draft v1.1 · 2026-10-04**
>
> 팀 검토용 초안입니다. `TBD` 항목은 팀 논의와 Prototype 검증 결과에 따라 변경될 수 있습니다.
>
> 상위 기준 문서: `LUMIA_GAME_DESIGN.md`

> 이 Part는 첫 Prototype에서 실제로 어디까지 만들고 무엇을 검증할지 정리합니다. PART 2의 전체 제작 목록 중 `🔴 Prototype` 항목을 실제 Scenario와 연결해 확인하는 기준입니다.

## 관련 문서

- 전체 게임 기준: `LUMIA_GAME_DESIGN.md`
- 그래픽 제작 방식: `LUMIA_DESIGNER_GUIDE.md`
- 전체 제작 목록: `LUMIA_DESIGNER_PRODUCTION_REQUEST.md`

# 1. Prototype Scenario 기준 실제 범위

### 2026-10-04 확정 범위

PC 브라우저에서 게임의 시작부터 끝까지 프런트엔드로 검증한다. 실제 로그인·인증·API 통신·서버 저장·보호자 계정 연결은 이번 범위 밖이다.

- Title/Character Select/Admission은 임시 화면으로 포함한다. 선택 가능한 플레이어는 카엘 1명이며 확인 후 입학한다.
- Life 온실과 Adventure 온실은 같은 장소다. 모드에 따라 배경 자산·구도·조작 방식이 달라진다. Life는 정적 대화, Adventure는 별도 탐험용 배경/타일·오브젝트와 SD 이동을 사용한다.
- 학생 NPC는 기존 인물 중 후보를 제안하여 결정한다. 임시 대본·질문·선택지를 제공하며 정식 Episode 확정을 뜻하지 않는다.
- 달빛 약초는 수집 대상이다. 채집 시 Item으로 가방에 보관하고 조사 시 Knowledge로 발견 기록에 남기는 차이를 보여준다. 약초를 퍼즐 조건이나 소모 재료로 쓰지 않는다.
- My Room의 Bern/Reflection과 Heart Record 후 부모 리포트 미리보기까지 포함한다. 리포트는 이야기·주요 선택·결과·대화 제안으로 구성하며 성찰 원문/일반 질문 답변은 제외한다.

### 콘텐츠 교체와 로컬 이어하기

이미지 경로, 대화·질문·선택지·힌트와 장면 설정은 임시 JSON에서 읽는다. 콘텐츠 ID는 유지하고 자산 URL/경로와 표시 크기·기준점·프레임 정보를 교체한다. 이미지 변경만으로 조사·채집·퍼즐 규칙을 바꾸지 않는다. 이후 API 연결을 위해 콘텐츠 로더와 저장 어댑터를 분리한다.

같은 PC·같은 브라우저에서 새로고침/종료 후 이어하기를 검증한다. 저장 버전, 현재 장면/대화, 조사·채집, 퍼즐, 세계 회복, 주요 선택, 성찰·기록 상태를 보관한다. 획득/해결/기록 중복을 방지한다. 새 게임은 기존 기록 초기화를 확인하고 시작한다. 저장 데이터 손상/버전 불일치/저장 불가 시 안내하고 새 게임 경로를 제공한다. 다른 기기 동기화는 제공하지 않는다.

현재 Prototype 검증용 Scenario는 **「빛을 잃은 온실」(가제)**입니다.

이는 정식 Episode 1 확정안이 아닙니다.

### 플레이 흐름

**Title  
→ Character Select  
→ Admission  
→ 시계탑 광장 Life  
→ 작은 사건 발견  
→ 온실 Life  
→ Greenhouse Adventure  
→ 자유 이동  
→ 식물 조사 → Knowledge  
→ 달빛 약초 채집 → Item  
→ Encounter 발견  
→ Rune 관찰  
→ Connect/Rotate Puzzle  
→ 필요 시 Hint  
→ Rune 활성화  
→ 식물 회복 / World Change  
→ 온실 Life 복귀  
→ NPC/Story Reaction  
→ Meaningful Choice  
→ My Room  
→ Bern  
→ Heart Reflection  
→ 간단한 Heart Record
→ 부모 리포트 미리보기**

Optional 수집품은 별도 요청 전까지 보류합니다. 달빛 약초는 핵심 Item/Knowledge 검증에 포함됩니다.

---

# 2. Prototype에서 지금 만들지 않는 것

다음 항목은 현재 제작 범위에서 제외합니다.

- 32명 전체 SD 캐릭터
- 대서고 Adventure
- 천문대 Adventure
- 새로운 Adventure 전용 장소
- 공방 Mini Game
- 수련장 Mini Game
- 여러 Episode
- 모든 NPC의 표정 Variation
- 모든 장소의 시간대별 Background
- 자유 가구 배치
- 전체 Room Theme System
- 완전한 Coin Economy
- 복잡한 NPC Question API용 그래픽
- Quest Log
- Stage Map
- Rune Portal
- Checkpoint Object
- Combat UI
- HP / EXP / Level UI
- Mini Map
- Rank / Star / Collection %
- Episode마다 신규 대표 Illustration
- Parent Analytics Dashboard
- 실제 로그인 / 인증 / 서버 저장 / 보호자 계정 연결 / API 통신

---

# 3. Prototype에서 확인해야 하는 질문

Prototype의 목적은 완성된 콘텐츠를 많이 만드는 것이 아니라 다음 질문에 답하는 것입니다.

1. SD 캐릭터를 직접 움직이는 것 자체가 재미있는가?
2. 탐색하면서 다음에 무엇이 있을지 궁금해지는가?
3. `조사 → Knowledge`, `채집 → Item`의 차이가 자연스럽게 이해되는가?
4. Encounter를 발견하고 관찰하여 해결 방법을 찾아가는 과정이 자연스러운가?
5. Puzzle이 갑자기 등장한 별개의 게임처럼 느껴지지 않고 Adventure와 연결되는가?
6. 해결 후 World Change가 충분한 만족감을 주는가?
7. `Life → Adventure → Life → My Room`이 하나의 이야기 경험처럼 자연스럽게 이어지는가?
8. 이 Adventure 하나를 제작하는 데 걸린 개발·디자인 작업량이 현재 팀이 Episode마다 반복할 수 있는 수준인가?
9. Title부터 부모 리포트 미리보기까지 막힘 없이 완료할 수 있는가?
10. 로컬 이어하기 시 조사·채집·퍼즐·Choice·기록이 복원되고 중복 발생하지 않는가?
11. JSON의 이미지/대사 교체가 진행 로직 수정 없이 반영되는가?
12. 부모 리포트에서 개인 성찰과 일반 질문 답변이 제외되는가?

추가 Gameplay Test:

- SD 표시 크기
- Tile 크기
- 이동 속도
- Camera
- Map 크기
- 길 폭
- 8방향 Animation
- 상호작용 거리
- Object Scale
- Foreground/가림
- PC와 Tablet 조작감

---

# 4. Prototype 결과 이후 결정할 것

Greenhouse Prototype을 먼저 제작하고 Test합니다.

그 결과를 보고 다음을 결정합니다.

- 대서고도 Adventure로 만들 것인가?
- 천문대도 Adventure로 만들 것인가?
- Adventure를 몇 장소까지 확대할 것인가?
- SD 캐릭터를 몇 명까지 제작할 것인가?
- Mini Game을 어떤 장소에서 어떤 Mechanic으로 사용할 것인가?
- 정확한 SD Cell / Tile / Atlas / Export 규격은 무엇인가?
- Optional Collectible을 유지할 것인가?

즉 **온실을 만들기 전에 세 장소의 Adventure Asset을 동시에 제작하지 않습니다.**

---

# 5. 디자이너가 작업을 시작하기 전에 확인할 체크리스트

작업 요청을 받았을 때 다음 순서로 확인해 주세요.

- [ ] 상태가 🔴 Prototype인가?
- [ ] 기존 Asset으로 해결할 수 없는가?
- [ ] 실제 Scenario에서 필요한가?
- [ ] 화면에서 어떤 역할을 하는지 이해했는가?
- [ ] 투명 배경이 필요한가?
- [ ] 다른 그림과 분리해야 하는가?
- [ ] State가 여러 개 필요한가?
- [ ] 초기 제작 권장 크기가 확정되어 있는가?
- [ ] `TBD`인데 임의로 크기를 정하고 있지는 않은가?
- [ ] 비슷한 UI/Effect를 새로 만들지 않고 공통 Asset을 사용할 수 없는가?
- [ ] AI로 여러 Frame을 만들 경우 Master Sheet 방식이 가능한가?

하나라도 불명확하면 대량 제작을 시작하기 전에 팀에서 확인합니다.

---

# 6. 현재 제작 우선순위 요약

첫 Prototype에서 가장 중요한 신규 그래픽은 크게 다음 범위입니다.

**공통 화면/UI**
- Title
- Character Select
- Admission
- Dialogue / Choice
- Adventure HUD
- Inventory / Knowledge
- Puzzle / Hint
- Reflection
- Heart Record
- Parent Report Mockup

**Life**
- 시계탑 광장
- 온실
- My Room
- 실제 Scenario에 필요한 기존 Character Art

**Adventure**
- 대표 SD 캐릭터 1명
- 8방향 × 3Frame
- 작은 Greenhouse Adventure Map용 Tile/Object
- 조사 식물
- 달빛 약초
- Encounter Rune
- 필요한 Before/After State
- 최소 Rune/VFX

**Puzzle**
- Connect / Rotate 1종

**Mini Game**
- 첫 Prototype에서는 제작하지 않음

---

# 7. 최종 원칙

> **Lumia의 제작 목록은 화면 수를 세는 목록이 아니라 실제로 새로 만들어야 하는 Asset을 관리하는 목록입니다.**

> **같은 UI, Effect, Mechanic은 가능한 한 재사용합니다.**

> **전체 게임에 필요하다는 이유만으로 지금 제작하지 않습니다. Prototype에서 검증된 것부터 확장합니다.**

> **스토리 구조는 단순하게, 탐험 경험은 풍부하게 만듭니다.**

> **재미에 직접 필요하지 않은 시스템은 만들지 않습니다.**

---

## 문서 상태 메모

현재 확정하지 않은 주요 항목:

- 학생 NPC 캐스팅과 임시 대본의 구체 내용 (플레이어/선택 화면은 카엘 1명 확정)
- Prototype에 사용할 기존 학생 NPC (Bern 역할과 플레이어 카엘은 확정)
- 「빛을 잃은 온실」의 정식 Episode 채택 여부
- 정확한 SD Sprite Cell
- 정확한 Tile/Map 크기
- Puzzle 난이도/배치 (기존 3×3 시험 규격을 출발점으로 검토)
- 대서고/천문대 Adventure 제작 여부
- 공방/수련장 Mini Game Mechanic
- 최종 Engine
- 최종 Atlas/Export 규격
- Arcadia 장소 이동 UI 방식

이 항목들은 `TBD` 상태를 유지합니다.
