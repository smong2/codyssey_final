# 이미지 자원의 분류·상태

전체 작업 공간에 `asset/`이 있으면 그 폴더가 이미지 파일의 실제 위치다. 이 AI 문서만 전달된 환경에서는 이미지 파일이 제공되었다고 가정하지 않는다. 파일명 속 CH·IT·BG·ENV 등의 ID를 유지하여 인물·장소·오브젝트와 연결한다.

| 폴더 | 내용 | 예시 ID·파일 |
|---|---|---|
| `asset/character/` | 학생 전신과 상반신 감정 표현 이미지 | `kael0_fullbody.png`, `kael1_base.png`, `kael2_listening.png` |
| `asset/item/` | 소지품·가구·조사 오브젝트 | `IT01_heart_diary_000.png`, `OBJ01_inspect_plant_wilted_020.png` |
| `asset/background/` | 학원 장소·마이룸 배경과 테마 시안 | 게임용 15장과 테마 시안 15장; `myroom/`의 창가 독서실 3장은 UI 검토용 원본이며 게임 적용은 별도 |
| `asset/environment/` | 바닥·식물·구조물·전경 | `ENV05_small_plant_A_006.png` |
| `asset/puzzle/` | 퍼즐 바탕과 연결 상태 | `PZ01_puzzle_tile_base_000.png`, `PZ_start_active_005.svg` |
| `asset/ui/` | 카드·초대장·가방·기록·대화창·로고 | `UI07_admission_invitation_004.png` |
| `asset/effect/` | 룬 빛과 달빛 광휘 | `FX01_shared_rune_light_000.png` |
| `asset/pet/` | 본편 펫 10종과 동물 NPC 루루 | `PT01~PT10` 이미지가 게임 ID `PET01~PET10`과 번호별 대응; 루루는 펫 아님 |
| `asset/map/` | 온실 모험맵과 대서고·천문대 추가 맵 | 온실은 `MP01` 원본·WebP·충돌 자원이 엔진 연결됨; `MP02/MP03` 전체맵·전경·충돌 자원은 보유하나 엔진 연결/검수 별도 |
| `asset/font_files/` | 게임용 WOFF2·창작 룬 SVG·폰트 원본·라이선스 | 자체 서체 시제품, 무료 웹폰트, `originals/`, `licenses/` |
| `asset/font_files/typography/` | 제목·레터링 방향 참고 PNG | 학술형·비문형·문학형·달빛형·필사본형 5안 |
| `asset/Full screen/` | UI·배경 합성 전체화면 검토 시안 | `FS01~FS21` PNG; 구현 화면이나 최종 채택본 아님 |
| `asset/Full screen/screen/` | 과거 화면 흐름 참고 시안 | PNG/JPG 9장; 최종 진행 순서 아님 |

**상태 경계:** 파일이 존재해도 최종 선택, 실제 화면 합성, 가장자리·크롭·애니메이션 검수가 완료된 것은 아니다. 학생 32명은 각자 `전신 1장 + 상반신 5장(기본/경청/생각/격려/안도)`을 가지며 총 192장이 표준 캐릭터 세트다. 엘리아는 별도의 전신 크기 보정본 1장이 더 있어 `asset/character/`의 학생 이미지 총수는 193장이다. 엘리아 보정본의 실제 사용 여부는 미정이다. `asset/pet/`의 `PT01~PT10` 이미지 10종은 게임 ID `PET01~PET10`과 번호 순서대로 1:1 연결한다. 같은 폴더의 루루 이미지는 펫이 아닌 NPC 자원이다. 베른이라는 단일 펫 캐릭터 설정은 본편에서 사용하지 않는다. 회복 식물은 현재 `asset/item/plant2_restored.png`만 확인되며 과거 문서의 별도 변형본은 현재 폴더에서 확인되지 않는다. 기존 신비 로고 1안·5안은 시안으로 남아 있고, 현재 최종 사용 로고는 `asset/ui/lumia_logo_final_034.png`, 전용 빛무리는 `asset/effect/lumia_logo_glow_003.png`이다.

현재 엔진은 `asset/ui/lumia_logo_final_034.png`와 `asset/effect/lumia_logo_glow_003.png`를 타이틀에 사용한다. 온실 모험은 `asset/map/`의 4K WebP 배경·전경과 1920×1080 흑백 충돌 마스크를 사용하며 원본 PNG는 보존한다. 전경의 오브젝트별 정렬 데이터는 미정이라 현재 엔진에서만 임시로 항상 캐릭터 앞에 둔다. 인트로 영상은 이미지 자원이 아니며 `prototype/assets/intro.mp4`의 교체본을 엔진에서 사용한다. 상세 파일과 내보내기 기준은 각 카테고리 README와 엔진 README를 우선 확인한다.

자체 서체 3종과 가독성 개선형은 각 198개 코드 포인트만 지원하는 시제품이며 완성 한글 폰트가 아니다. 게임용 WOFF2와 별도로 이전 작업 폴더에만 있던 TTF 8개를 `asset/font_files/originals/`로, Pretendard·Noto Serif KR·Gowun Batang의 라이선스 원문을 `asset/font_files/licenses/`로 이관했다. 룬 SVG 10종은 현재 `creative_rune_font01~10.svg`가 기준이다. 대화 기록·달력·제목 배치 시안의 제작 판단은 `asset/ui/README.md`, 타이포그래피 5안의 제작 판단은 `asset/font_files/typography/README.md`에 요약되어 있으며 시안 존재를 최종 게임 적용 승인으로 간주하지 않는다.

현재 작업용 자원에는 지도 콘셉트·화면 시안·상태창·생성 원본·미선정 후보가 포함될 수 있다. 이 자료의 보관 위치가 현재 환경에 없으면 존재·승인 여부를 추측하지 않는다. 이미지 생성·교체 작업 전에는 실제 파일, 자원 상태, 화면 사용처를 확인한다.

스토리 제작용 신규 정적 이미지 **예산**은 `story/ASSET_DIALOGUE_LEDGER.md` 기준으로 메인 6장 + NPC 6장 + Location 4장 + 엔딩 공용 1장 = **총 17장**이다. MS05 별빛 축제는 신규 2장을 만들지 않고 이미 존재하는 `BG02_clocktower_plaza_starlight_festival_lit_3840x2161.png` / `BG02_clocktower_plaza_starlight_festival_unlit_3840x2161.png`를 전체 배경으로 교체 사용한다. 현재 저장소에서 시계탑 광장의 낮·노을·밤 3종 시간대 세트는 확인되지 않으며, 명확한 시간대 세트는 마이룸 계열에 존재한다. 이 17장은 제작 요청량이지 `asset/`에 17장이 이미 존재한다는 뜻이 아니다. 메인 학생 역할은 기존 32명 스프라이트를 재사용하고, Location의 학생 사서 `세린`은 전용 초상/스프라이트 없이 화자명·대화창만으로 등장할 수 있으므로 역할 캐스팅 때문에 신규 캐릭터 이미지가 추가되지 않는다. 루루 기본 NPC 스프라이트가 실제로 없다면 별도 자산 확인이 필요하다.

현재 저장소의 각 이미지 카테고리에는 실제 파일 목록과 미리보기가 있는 `README.md`가 있다. 이미지를 추가·삭제·교체하면 **같은 카테고리 README의 목록·설명·미리보기도 같은 작업에서 갱신**한다. 디자인 담당 참고 브랜치는 `dev-jw`이며 임의로 브랜치를 바꾸지 않는다.

상세 자료가 있을 때: [이미지 자원 설명](../document/04_ASSETS.md), [자원 폴더 안내](../asset/README.md), [펫 시스템](../document/content/03_COLLECTION_UNLOCKS/05_PET_SYSTEM.md).
