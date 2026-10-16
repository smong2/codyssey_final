# 이미지 자원의 분류·상태

전체 작업 공간에 `asset/`이 있으면 그 폴더가 이미지 파일의 실제 위치다. 이 AI 문서만 전달된 환경에서는 이미지 파일이 제공되었다고 가정하지 않는다. 파일명 속 CH·IT·BG·ENV 등의 ID를 유지하여 인물·장소·오브젝트와 연결한다.

| 폴더 | 내용 | 예시 ID·파일 |
|---|---|---|
| `asset/character/` | 학생 전신과 상반신 감정 표현 이미지 | `kael0_fullbody.png`, `kael1_base.png`, `kael2_listening.png` |
| `asset/item/` | 소지품·가구·조사 오브젝트 | `IT01_heart_diary_000.png`, `OBJ01_inspect_plant_wilted_020.png` |
| `asset/background/` | 학원 장소 배경 | `BG02_clocktower_plaza_1920x1080_011.png` |
| `asset/puzzle/` | 퍼즐 바탕과 연결 상태 | `PZ01_puzzle_tile_base_000.png`, `PZ_start_active_005.svg` |
| `asset/ui/` | 카드·초대장·가방·기록·대화창·로고와 게임용 환경 이미지 15장 | `UI07_admission_invitation_004.png`, `UI20_environment_arch1_greenhouse.png` |
| `asset/effect/` | 공통 룬 빛과 확정 로고 전용 빛무리 | `FX01_shared_rune_light.png`, `FX02_lumia_logo_glow.png` |
| `asset/bern/` | 본편 펫 10종 | 물리 경로명은 과거 이름이나 의미상 `asset/pet/`; `PET01~PET10` 실제 사용 자원 |
| `asset/map/` | 온실 모험맵 원본과 런타임 파생 자원 | 3840×2160 마스터·투명 전경·충돌 원본, 4K WebP 배경/전경, 1920×1080 충돌 마스크·배경 썸네일 |
| `asset/font_files/` | 폰트 관련 이미지 18개와 README | 서체 비교 PNG 3장, 레터링 방향 PNG 5장, 창작 룬 SVG 10장. 게임용 웹폰트 2개와 라이선스는 `engine/fonts/` |

**상태 경계:** 파일이 존재해도 최종 선택, 실제 화면 합성, 가장자리·크롭·애니메이션 검수가 완료된 것은 아니다. 학생 32명은 각자 `전신 1장 + 상반신 5장(기본/경청/생각/격려/안도)`을 가지며 총 192장이 표준 캐릭터 세트다. 엘리아는 별도의 전신 크기 보정본 1장이 더 있어 `asset/character/`의 학생 이미지 총수는 193장이다. 엘리아 보정본의 실제 사용 여부는 미정이다. `asset/bern/`은 물리 경로명만 과거 이름을 유지하며 **본편 펫 자원 폴더**로 사용한다. 내부 10개 이미지는 `PET01~PET10`에 번호 순서대로 1:1 연결한다. 베른이라는 단일 펫 캐릭터 설정은 본편에서 사용하지 않는다. 회복 식물은 변형본이 있고 사용본은 미정이다. 기존 신비 로고 1안·5안은 시안으로 남아 있고, 현재 최종 사용 로고는 `asset/ui/LG01_lumia_logo_final.png`, 전용 빛무리는 `asset/effect/FX02_lumia_logo_glow.png`이다.

현재 엔진은 `asset/ui/LG01_lumia_logo_final.png`와 `asset/effect/FX02_lumia_logo_glow.png`를 타이틀에 사용한다. 온실 모험은 `asset/map/`의 4K WebP 배경·전경과 1920×1080 흑백 충돌 마스크를 사용하며 원본 PNG는 보존한다. 전경의 오브젝트별 정렬 데이터는 미정이라 현재 엔진에서만 임시로 항상 캐릭터 앞에 둔다. 인트로 영상은 이미지 자원이 아니며 `prototype/assets/intro.mp4`의 교체본을 엔진에서 사용한다. 상세 파일과 내보내기 기준은 각 카테고리 README와 엔진 README를 우선 확인한다.

기존 `asset/environment/`의 게임 규격 PNG 15장은 픽셀 내용 그대로 `asset/ui/UI20_environment_*.png`에 통합했다. 물리적인 `asset/environment/` 폴더는 제거했으며, 이미지가 이동했다고 실제 게임 배치·가림 검수가 완료된 것은 아니다.

달빛명조·서고체·맑은 대화체 및 각 가독성 개선형의 웹폰트·원본·비교 이미지는 사용자 요청으로 자원 목록에서 제거했다. 게임에서 실제 쓰는 고운바탕과 Pretendard의 WOFF2 및 라이선스는 `engine/fonts/`로 옮겨 실행 경로를 유지한다. Noto Serif KR은 비교 이미지만 남겼다. 룬 SVG 10종은 `FN_RUNE_01~10.svg`, 레터링 방향 5안은 `FN_TYPO_01~05_*.png`, 서체 비교 3장은 `FN_PREVIEW_01~03_*.png`로 `asset/font_files/`에 정리했다. 제목·레터링 시안은 설치 가능한 폰트나 최종 채택을 뜻하지 않으며, 미리보기와 설명은 `asset/font_files/README.md`에 있다.

현재 작업용 자원에는 지도 콘셉트·화면 시안·상태창·생성 원본·미선정 후보가 포함될 수 있다. 이 자료의 보관 위치가 현재 환경에 없으면 존재·승인 여부를 추측하지 않는다. 이미지 생성·교체 작업 전에는 실제 파일, 자원 상태, 화면 사용처를 확인한다.

현재 저장소의 각 이미지 카테고리에는 실제 파일 목록과 미리보기가 있는 `README.md`가 있다. 이미지를 추가·삭제·교체하면 **같은 카테고리 README의 목록·설명·미리보기도 같은 작업에서 갱신**한다. 디자인 담당 참고 브랜치는 `dev-jw`이며 임의로 브랜치를 바꾸지 않는다.

상세 자료가 있을 때: [이미지 자원 설명](../document/04_ASSETS.md), [자원 폴더 안내](../asset/README.md), [펫 시스템](../document/content/03_COLLECTION_UNLOCKS/05_PET_SYSTEM.md).
