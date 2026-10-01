# 2026-10-01 Prototype 디자인 제작 체크리스트

이미지 생성 전에 작성. 네 신규 문서 전체 제작 요청서 1.1~1.16과 기존 62장 파일을 대조했다. 새 문서는 Draft v1.0이며 초기 권장/테스트/TBD를 구분한다. 아래 순서는 이번 제작 실행 순서다. 기존 02_size_and_production_plan.md의 21종·전체 표정/추가 장소 계획보다 이번 Prototype 범위가 우선한다.

## 1. 변경 및 중복 검사
- [x] 기존 학생 CH01~CH32 보존·재사용. 신규 학생 32인 생성 없음.
- [x] 기존 BG02 광장, BG07 온실, BG08 약초원, BG03 마이룸 재사용. 나머지 배경은 Later 보관. 추가 장소·기숙사 외관·회랑 생성 보류.
- [x] 기존 IT04 약초 화분은 환경 화분/선택적 수집품의 재사용 후보. 새 화분을 중복 제작하지 않는다.
- [x] 기존 IT14 양피지 편지는 원근이 있는 오브젝트이며, UI 텍스트를 얹는 정면 입학 초대장과 용도가 달라 초대장만 신규 제작.
- [x] 기존 IT19 그림자 룬을 사건 룬의 참조로 사용해 소형 가독성을 편집하고 활성 상태는 같은 원본에서 편집.
- [x] 베른은 문서에 Existing으로 적혀 있으나 이미지 없음. NPC03 신규 필요. 이시스/발렌티누스는 Prototype 캐스팅이 정해지기 전 보류.
- [x] 통합 기획 구 8장 Life 직접 이동 표현은 상단 확정 설계·13장·Designer Guide의 Life/Adventure 분리와 충돌한다. 최신 명시 설계에 따라 Life는 정적, Adventure만 SD 조작.
- [x] 파일 규격은 현재 Prototype 권장(큰 인물1024×1536, Life1920×1080)을 우선하며 이전 마스터2048×3072/배경2560×1440은 현 단계 필수 아님.
- [x] 현재 수량: 베른1 + UI재료5 + 공통FX1 + 온실 환경 테스트13 + 사건 오브젝트5 = 25개 생성/편집 시안.
- [ ] 생성 결과의 실제 크기·투명도·상태 연속성 검수. 반환 크기가 다르면 pending_normalization으로 기록.
- [ ] 생성 원본은 보존하고 테스트/납품 크기와 구분. 단순 확대를 고해상도 원화로 칭하지 않음.

## 2. 파일별 생성 큐

체크는 생성 파일 저장 여부를 뜻한다. 게임 적용 승인·크기 합격·반복 타일 합격과는 구분한다. 세부 상태는 06_prototype_queue.json 및 카테고리 파일 목록을 따른다.

- [x] NPC03 — `02_characters/04_images/NPC03_베른.png` — 1024×1536 — 초기 제작 기준
- [x] UI01 — `05_ui/04_images/UI01_양피지_타일.png` — 512×512 — 초기 제작 기준
- [x] UI02 — `05_ui/04_images/UI02_프레임_모서리.png` — 192×192 — 초기 제작 기준
- [x] UI03 — `05_ui/04_images/UI03_캐릭터_카드_배경.png` — 480×640 — 초기 제작 기준
- [x] UI04 — `05_ui/04_images/UI04_전신_미리보기_배경.png` — 800×1200 — 초기 제작 기준
- [x] UI07 — `05_ui/04_images/UI07_입학_초대장.png` — 1200×800 — 초기 제작 기준
- [ ] FX01 — `06_effects/04_images/FX01_공통_룬_빛.png` — 512×512 — 초기 제작 기준
- [ ] ENV01 — `07_adventure_environment/04_images/ENV01_온실_바닥_기본.png` — 128×128 — 초기 테스트값, 게임 Scale 검증 전
- [ ] ENV02 — `07_adventure_environment/04_images/ENV02_온실_바닥_변형_A.png` — 128×128 — 초기 테스트값, 게임 Scale 검증 전
- [ ] ENV03 — `07_adventure_environment/04_images/ENV03_온실_바닥_변형_B.png` — 128×128 — 초기 테스트값, 게임 Scale 검증 전
- [ ] ENV04 — `07_adventure_environment/04_images/ENV04_온실_경계.png` — 128×128 — 초기 테스트값, 게임 Scale 검증 전
- [ ] ENV05 — `07_adventure_environment/04_images/ENV05_작은_식물_A.png` — 256×256 — 초기 테스트값, 게임 Scale 검증 전
- [ ] ENV06 — `07_adventure_environment/04_images/ENV06_작은_식물_B.png` — 256×256 — 초기 테스트값, 게임 Scale 검증 전
- [ ] ENV07 — `07_adventure_environment/04_images/ENV07_큰_식물_A.png` — 512×512 — 초기 테스트값, 게임 Scale 검증 전
- [ ] ENV08 — `07_adventure_environment/04_images/ENV08_큰_식물_B.png` — 512×512 — 초기 테스트값, 게임 Scale 검증 전
- [ ] ENV09 — `07_adventure_environment/04_images/ENV09_온실_화단.png` — 1024×512 — 초기 테스트값, 게임 Scale 검증 전
- [ ] ENV10 — `07_adventure_environment/04_images/ENV10_온실_덩굴.png` — 512×512 — 초기 테스트값, 게임 Scale 검증 전
- [ ] ENV11 — `07_adventure_environment/04_images/ENV11_온실_구조물.png` — 1024×1024 — 초기 테스트값, 게임 Scale 검증 전
- [ ] ENV12 — `07_adventure_environment/04_images/ENV12_전경_식물_A.png` — 1024×1024 — 초기 테스트값, 게임 Scale 검증 전
- [ ] ENV13 — `07_adventure_environment/04_images/ENV13_전경_식물_B.png` — 1024×1024 — 초기 테스트값, 게임 Scale 검증 전
- [ ] OBJ01 — `08_adventure_objects/04_images/OBJ01_조사_식물_시듦.png` — 512×512 — 초기 제작 기준
- [ ] OBJ02 — `08_adventure_objects/04_images/OBJ02_조사_식물_회복.png` — 512×512 — 초기 제작 기준 — 기존/직전 원본 편집
- [ ] OBJ03 — `08_adventure_objects/04_images/OBJ03_달빛_약초.png` — 256×256 — 초기 제작 기준
- [ ] OBJ04 — `08_adventure_objects/04_images/OBJ04_사건_룬_비활성.png` — 512×512 — 초기 제작 기준 — 기존/직전 원본 편집
- [ ] OBJ05 — `08_adventure_objects/04_images/OBJ05_사건_룬_활성.png` — 512×512 — 초기 제작 기준 — 기존/직전 원본 편집

온실 환경은 문서 수량의 최소 테스트 세트(바닥1+변형2, 경계1, 작은식물2, 큰식물2, 화단1, 덩굴1, 구조1, 전경2)만 제작한다. 정확한 게임 Tile/Atlas는 미확정이며 이 시안을 32인/다른 장소에 확대 생산하지 않는다. 식물은 잎마다 분리하지 않는다.

## 3. 요청서 전 항목 처리표

| 요청서 | 카테고리 | 처리 |
|---|---|---|
| 1.1 | Title/Admission | 기존 입구 배경 재사용, 초대장 UI07 신규. 로고는 벡터, Start/Fade는 CSS/SVG, 별도 Intro/Loading 대형 그림 없음 |
| 1.2 | Character Select | 기존32인 재사용, 카드 재료 신규. Tab/정보패널/확대/확인창은 공통 UI 조합. 노출 인원 TBD |
| 1.3 | Life Background | 기존10장 재사용 후보, Prototype은 광장/온실/마이룸. 1920×1080 Export는 원본 보존 후 별도 검수, 새 장소 그림 없음 |
| 1.4 | Dialogue UI | 큰 인물 재사용. 추가 표정은 캐스팅·대본 후. Dialogue/Choice/Objective/Notification 공통 Panel/Button, 이동 UI TBD |
| 1.5 | SD Character | 대표1인·8방향 Base→3Frame Walk 최대24, Cell/대표 인물 미확정. 답변/테스트 전 보류, Idle 중립 프레임 재사용 |
| 1.6 | Tile/Environment | 위 ENV01~13 테스트 세트, 화분은 IT04 재사용 검토. 게임 Scale·반복 경계·가림 적용 검수 필요 |
| 1.7 | Investigation | OBJ01~05, 약초 Icon은 원본 축소 우선. 유리꽃 씨앗/Icon Optional 보류 |
| 1.8 | Puzzle | Connect/Rotate 규칙만 확정. Grid/Tile TBD이므로 Rune Tile·직선/곡선·Start/Goal 크기 임의 확정 금지. Panel은 공통 UI, FX01 재사용 |
| 1.9 | Mini Game | Prototype 제외, 신규 제작 없음 |
| 1.10 | HUD/Inventory/Knowledge/Hint | 공통 UI 조합. Bag/Journal/Hint/Interaction/Slot/Joystick/Action/키안내는 SVG/CSS. Hint 3단계 같은 Panel |
| 1.11 | World Change | OBJ01→02, OBJ04→05와 FX01 재사용. 별도 전면 화면 없음 |
| 1.12 | My Room/Bern | BG03 재사용·NPC03 신규, Reflection 공통 Panel/Choice. 자유 가구 배치 전체 제작 없음 |
| 1.13 | Heart Record | Memory Card는 공통 Card+기존 BG/인물/Icon 합성. 신규 Episode 그림 없음 |
| 1.14 | Parent Feedback | 1920×1080 레이아웃 Mockup은 UI 디자인 후속. 이야기/선택/결과/대화제안 4영역, 점수/등급/성격판정/그래프 없음 |
| 1.15 | Common UI | 패널·버튼·탭·팝업·카드·슬롯·아이콘배경·선택 상태를 공통 CSS/SVG로 조합. 텍스트 없는 재료 UI01~04/07 사용 |
| 1.16 | Common FX | FX01 공통 룬빛. 선택/상호작용/퍼즐/세계변화에 재사용, Fade는 코드 |

## 4. 이미지 생성과 별개로 남는 디자인·테스트 체크

- [ ] 로고/학원 문장 SVG 및 공통 Icon/Panel/Button의 벡터·반응형 UI 설계. UI05 룬 문장은 기존 IT18 문양을 단순화한 벡터로 재사용 검토, 별도 래스터 중복 생성하지 않음.
- [ ] Title/Select/Dialogue/HUD/Puzzle/Reflection/Heart Record/Parent Report 1920×1080 레이아웃 검토. 화면 통짜 그림을 실제 UI로 대체하지 않음.
- [ ] 기존 Life 배경 크기 불일치:1672×941 vs 초기1920×1080. 기존 학생 엘리아 높이1535 vs1536. 원본 보존 후 Export 단계 해결.
- [ ] 대표 SD 인물·Cell·실제 화면 Scale 확인 후 SD Base→8방향→Master Sheet→자동 분리. 크기 미정 대량 제작 금지.
- [ ] 퍼즐 Grid·Tile 크기 확인 후 동일 Base의 비활성/활성·직선/곡선·Start/Goal 제작.
- [ ] 원근/발 기준점/알파/작은 크기 가독성/타일 반복 및 상태 전환 합성 QA.
- [ ] 문서 범위 밖의 Later/Optional 작업은 생성하지 않음.

## 5. 저장 규칙

모든 결과는 document/03_characters 아래 기존 번호 체계를 유지한다. 02_characters는 베른을 추가, 05_ui·06_effects·07_adventure_environment·08_adventure_objects는 이번 생성 항목에 필요한 분류다. 각 분류는 01_overview.md / 02_prompts.json / 03_manifest.json / 04_images 순서. 카테고리 생성 종료마다 체크리스트와 파일 목록을 갱신하고 GitHub에 commit/push한다. 크기 미일치나 게임 QA 미완료를 숨기지 않는다.








