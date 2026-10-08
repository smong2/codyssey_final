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
- [x] 최초 큐 25개 + SD2개 + 퍼즐 바탕1개 = 28개 생성/편집 시안. 퍼즐 SVG 8개 별도.
- [ ] 생성 결과의 실제 크기·투명도·상태 연속성 검수. 반환 크기가 다르면 pending_normalization으로 기록.
- [x] 생성 원본은 보존하고 테스트/납품 크기와 구분. 단순 확대를 고해상도 원화로 칭하지 않음.

## 2. 파일별 생성 큐

체크는 생성 파일 저장 여부를 뜻한다. 게임 적용 승인·크기 합격·반복 타일 합격과는 구분한다. 세부 상태는 05_prototype_queue.json 및 카테고리 파일 목록을 따른다.

- [x] NPC03 — `01_characters/01_images/33_NPC03_베른.png` — 1024×1536 — 초기 제작 기준
- [x] UI01 — `04_ui/00_images/01_UI01_양피지_타일.png` — 512×512 — 초기 제작 기준
- [x] UI02 — `04_ui/00_images/02_UI02_프레임_모서리.png` — 192×192 — 초기 제작 기준
- [x] UI03 — `04_ui/00_images/03_UI03_캐릭터_카드_배경.png` — 480×640 — 초기 제작 기준
- [x] UI04 — `04_ui/00_images/04_UI04_전신_미리보기_배경.png` — 800×1200 — 초기 제작 기준
- [x] UI07 — `04_ui/00_images/05_UI07_입학_초대장.png` — 1200×800 — 초기 제작 기준
- [x] FX01 — `05_effects/00_images/01_FX01_공통_룬_빛.png` — 512×512 — 초기 제작 기준
- [x] ENV01 — `06_adventure_environment/00_images/01_ENV01_온실_바닥_기본.png` — 128×128 — 초기 테스트값, 게임 Scale 검증 전
- [x] ENV02 — `06_adventure_environment/00_images/02_ENV02_온실_바닥_변형_A.png` — 128×128 — 초기 테스트값, 게임 Scale 검증 전
- [x] ENV03 — `06_adventure_environment/00_images/04_ENV03_온실_바닥_변형_B.png` — 128×128 — 초기 테스트값, 게임 Scale 검증 전
- [x] ENV04 — `06_adventure_environment/00_images/06_ENV04_온실_경계.png` — 128×128 — 초기 테스트값, 게임 Scale 검증 전
- [x] ENV05 — `06_adventure_environment/00_images/07_ENV05_작은_식물_A.png` — 256×256 — 초기 테스트값, 게임 Scale 검증 전
- [x] ENV06 — `06_adventure_environment/00_images/08_ENV06_작은_식물_B.png` — 256×256 — 초기 테스트값, 게임 Scale 검증 전
- [x] ENV07 — `06_adventure_environment/00_images/09_ENV07_큰_식물_A.png` — 512×512 — 초기 테스트값, 게임 Scale 검증 전
- [x] ENV08 — `06_adventure_environment/00_images/10_ENV08_큰_식물_B.png` — 512×512 — 초기 테스트값, 게임 Scale 검증 전
- [x] ENV09 — `06_adventure_environment/00_images/11_ENV09_온실_화단.png` — 1024×512 — 초기 테스트값, 게임 Scale 검증 전
- [x] ENV10 — `06_adventure_environment/00_images/12_ENV10_온실_덩굴.png` — 512×512 — 초기 테스트값, 게임 Scale 검증 전
- [x] ENV11 — `06_adventure_environment/00_images/13_ENV11_온실_구조물.png` — 1024×1024 — 초기 테스트값, 게임 Scale 검증 전
- [x] ENV12 — `06_adventure_environment/00_images/14_ENV12_전경_식물_A.png` — 1024×1024 — 초기 테스트값, 게임 Scale 검증 전
- [x] ENV13 — `06_adventure_environment/00_images/15_ENV13_전경_식물_B.png` — 1024×1024 — 초기 테스트값, 게임 Scale 검증 전
- [x] OBJ01 — `07_adventure_objects/00_images/01_OBJ01_조사_식물_시듦.png` — 512×512 — 초기 제작 기준
- [x] OBJ02 — `07_adventure_objects/00_images/02_OBJ02_조사_식물_회복.png` — 512×512 — 초기 제작 기준 — 기존/직전 원본 편집
- [x] OBJ03 — `07_adventure_objects/00_images/04_OBJ03_달빛_약초.png` — 256×256 — 초기 제작 기준
- [x] OBJ04 — `07_adventure_objects/00_images/05_OBJ04_사건_룬_비활성.png` — 512×512 — 초기 제작 기준 — 기존/직전 원본 편집
- [x] OBJ05 — `07_adventure_objects/00_images/06_OBJ05_사건_룬_활성.png` — 512×512 — 초기 제작 기준 — 기존/직전 원본 편집

온실 환경은 문서 수량의 최소 테스트 세트(바닥1+변형2, 경계1, 작은식물2, 큰식물2, 화단1, 덩굴1, 구조1, 전경2)만 제작한다. 정확한 게임 Tile/Atlas는 미확정이며 이 시안을 32인/다른 장소에 확대 생산하지 않는다. 식물은 잎마다 분리하지 않는다.

## 3. 요청서 전 항목 처리표

| 요청서 | 카테고리 | 처리 |
|---|---|---|
| 1.1 | Title/Admission | 기존 입구 배경 재사용, 초대장 UI07 신규. 로고는 벡터, Start/Fade는 CSS/SVG, 별도 Intro/Loading 대형 그림 없음 |
| 1.2 | Character Select | 기존32인 재사용, 카드 재료 신규. Tab/정보패널/확대/확인창은 공통 UI 조합. 노출 인원 TBD |
| 1.3 | Life Background | 기존10장 재사용 후보, Prototype은 광장/온실/마이룸. 1920×1080 Export는 원본 보존 후 별도 검수, 새 장소 그림 없음 |
| 1.4 | Dialogue UI | 큰 인물 재사용. 추가 표정은 캐스팅·대본 후. Dialogue/Choice/Objective/Notification 공통 Panel/Button, 이동 UI TBD |
| 1.5 | SD Character | 사용자 위임으로 카엘·256 Cell 시험. 기준과 시트 생성, 시트 방향 오류로 게임용 분리 미완료 |
| 1.6 | Tile/Environment | 위 ENV01~13 테스트 세트, 화분은 IT04 재사용 검토. 게임 Scale·반복 경계·가림 적용 검수 필요 |
| 1.7 | Investigation | OBJ01~05, 약초 Icon은 원본 축소 우선. 유리꽃 씨앗/Icon Optional 보류 |
| 1.8 | Puzzle | Connect/Rotate 규칙만 확정. 사용자 위임으로 3×3 Grid, 256 Tile 시험. 바탕 및 연결선 8종 생성. Panel은 공통 UI, FX01 재사용 |
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

모든 결과는 document/03_characters 아래 기존 번호 체계를 유지한다. 01_characters는 베른을 추가, 04_ui·05_effects·06_adventure_environment·07_adventure_objects는 이번 생성 항목에 필요한 분류다. 각 분류는 01_overview.md / 02_prompts.json / 03_manifest.json / 04_images 순서. 카테고리 생성 종료마다 체크리스트와 파일 목록을 갱신하고 GitHub에 commit/push한다. 크기 미일치나 게임 QA 미완료를 숨기지 않는다.

## 6. 사용자 후속 지시에 따른 테스트 규격 결정

사용자가 용어 설명 후 크기·비율 판단을 위임했다. 앞의 SD/퍼즐 결정 대기 표시는 이 항목에 한해 해제한다. 최종 게임 규격 확정이 아니라 시험 제작이다.
- 대표 SD: 기존 CH01 카엘을 우선 사용. 원본 정체성 유지.
- SD Cell 256×256, 3열×8행 마스터 768×2048. 행 S/SW/W/NW/N/NE/E/SE, 열 왼발/중립/오른발. 중립 재사용 Idle.
- 바닥128×128, SD 표시64×64(원본25%), 실험 화면1920×1080. 실제 플레이테스트 전 추가 인물 양산 금지.
- 퍼즐3×3, 타일256×256, 조각 사이16px 기준800×800 보드. 원본 타일 바탕1개 + SVG 직선/곡선/시작/도착 활성·비활성으로 제작. 회전은 코드.
- [x] SD01 — 08_sd_character/00_images/01_SD01_카엘_기준.png — 256×256
- [x] SD02 — 08_sd_character/00_images/02_SD02_카엘_걷기_마스터.png — 768×2048 시안 저장. 방향·후광 QA 불합격으로 게임용 24칸 자동 분리 미완료
- [x] PZ01 — 09_puzzle/00_images/01_PZ01_퍼즐_타일_바탕.png — 256×256
- [x] 퍼즐 직선/곡선·시작/도착 SVG 8종, 활성/비활성 2상태, 256×256 viewBox
추가 후 생성/편집 큐는28개(24프레임 파생 파일과 SVG 제외).



## 7. 최종 저장·검수 기록
- [x] 신규 PNG 28개 목표 크기 일치 확인.
- [x] 전체 PNG 90개 파일 경로·해시 대조.
- [x] 카테고리별 생성 결과 GitHub 저장.
- [ ] SD 방향·후광 수정 후 게임용 24프레임 분리.
- [ ] 바닥 반복 경계·후광·식물 상태 기준점 검수 통과.
상세: [제작·검수 결과](design_production_review_011.md).


## 후속 수정 현황
[현재 현황](design_work_status_012.md)에 SD 24프레임 분리, 바닥 v2, 규격 내보내기와 미완료 QA를 갱신했다. 본문의 최초 검수 상태는 역사 기록이다.
