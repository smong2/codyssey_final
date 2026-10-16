# 이미지 자원 분류와 사용 상태

이미지는 [작업용 자원 폴더](../asset/)에 카테고리별로 모았습니다. UI 파일은 `BT`(버튼)·`UI`(화면 요소)·`LG`(로고) 접두어와 용도로 식별합니다. **파일 존재는 최종 선정 또는 실제 화면 검수 완료와 다릅니다.** 원본·다른 버전·검토 기록은 현재 저장소에 포함되어 있지 않습니다.

| 카테고리 | 용도와 예시 | 대표 이미지 | 확인할 점 |
|---|---|---|---|
| [캐릭터](../asset/character/) | 학생 전신과 인물 이미지 | [카엘](../asset/character/CH01_kael_000.png) | 32명 설정과 파일 ID 일치, 가장자리·투명도 검수 |
| [아이템](../asset/item/) | 소지품, 마이룸 가구, 조사 상태 | [마음 일기](../asset/item/IT01_heart_diary_000.png) | 아이템·조사 오브젝트 구분, 상태별 표시 |
| [배경](../asset/background/) | 학원 장소와 마이룸 | [유리 온실](../asset/background/BG07_glass_greenhouse_1920x1080_016.png) | 실제 화면 크롭·배치 검수 |
| [퍼즐](../asset/puzzle/) | 타일 바탕, 연결/회전 상태 | [퍼즐 바탕](../asset/puzzle/PZ01_puzzle_tile_base_000.png) | 상태와 규칙 연결, 상호작용 가독성 |
| [UI](../asset/ui/) | 카드, 초대장, 가방, 기록, 힌트, 대화창, 로고 및 바닥·식물·구조물·전경 이미지 | [입학 초대장](../asset/ui/UI07_admission_invitation_004.png), [온실 아치](../asset/ui/UI20_environment_arch1_greenhouse.png) | 텍스트는 동적 표시; 환경 이미지의 반복·경계·가림·접지 검수 필요 |
| [효과](../asset/effect/) | 공통 룬 발광과 타이틀 로고 빛무리 | [룬 빛](../asset/effect/FX01_shared_rune_light.png), [로고 빛무리](../asset/effect/FX02_lumia_logo_glow.png) | 합성, 애니메이션, 밝기 검수 |

## 구분이 필요한 파일

- [엘리아 원본](../asset/character/CH10_elia_009.png)과 [1024×1536 보정본](../asset/character/CH10_elia_1024x1536_038.png)은 둘 다 보존했습니다. 실제 사용본 선택은 미정입니다.
- [`asset/bern/`](../asset/bern/)은 물리 폴더명만 과거 이름을 유지하는 **본편 펫 자원 폴더**입니다. 내부의 부엉이·여우·토끼·수달·강아지·고양이·레서판다·다람쥐·고슴도치·아기사슴 10종을 각각 `PET01~PET10`에 1:1로 사용합니다. 데모의 단일 캐릭터 `베른` 설정은 본편에서 사용하지 않습니다. 상세 매핑은 [펫 시스템](content/03_COLLECTION_UNLOCKS/05_PET_SYSTEM.md)을 따릅니다.
- 조사 오브젝트의 상태·버전은 파일명으로 구분했습니다. 예를 들어 [시든 식물](../asset/item/OBJ01_inspect_plant_wilted_020.png), [회복 식물](../asset/item/OBJ02_inspect_plant_restored_021.png), [회복 식물 변형](../asset/item/OBJ02_inspect_plant_restored_v2_022.png)입니다. 어느 회복 그림을 적용할지는 미정입니다.
- [로고 1안](../asset/ui/LG02_lumia_logo_mystic_01.png)과 [로고 5안](../asset/ui/LG03_lumia_logo_mystic_05.png)은 모두 보존했습니다. 현재 타이틀은 [확정 로고](../asset/ui/LG01_lumia_logo_final.png)와 [전용 빛무리](../asset/effect/FX02_lumia_logo_glow.png)를 사용합니다.
- 지도 콘셉트·화면 시안·상태창·원본·후보 이미지는 현재 작업용 폴더에 없습니다. 존재·선정 상태를 이 문서만으로 단정하지 마세요.

## 자원 추가·교체 시

1. 카테고리와 안정적인 ID를 정하고, 같은 이름의 다른 이미지를 덮어쓰지 않습니다.
2. 어떤 화면·상태에 쓰는지, 최종 선정 여부와 검수 상태를 기록합니다.
3. 캐릭터·세계관·콘텐츠 문서의 연결을 확인하고, 실제 표시 크기와 크롭을 검수합니다.
4. 새 자원의 출처와 선정·검수 기록을 해당 카테고리 README에 남깁니다.

작성 당시 제작 목록·승인 기록·디자인 가이드를 참고했으나 원문은 현재 저장소에 없습니다. 새 작업에서는 [현재 자원 목록](../asset/README.md)과 실제 파일을 확인하세요.
