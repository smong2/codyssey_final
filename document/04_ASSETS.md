# 이미지 자원 분류와 사용 상태

이미지는 [작업용 자원 폴더](../asset/)에 카테고리별로 모았습니다. 기존 파일명과 ID를 유지하여 현재 파일을 식별할 수 있습니다. **파일 존재는 최종 선정 또는 실제 화면 검수 완료와 다릅니다.** 원본·다른 버전·검토 기록은 현재 저장소에 포함되어 있지 않습니다.

| 카테고리 | 용도와 예시 | 대표 이미지 | 확인할 점 |
|---|---|---|---|
| [캐릭터](../asset/character/) | 학생 전신과 인물 이미지 | [카엘](../asset/character/kael0_fullbody.png) | 32명 설정과 파일 ID 일치, 가장자리·투명도 검수 |
| [아이템](../asset/item/) | 소지품, 마이룸 가구, 조사 상태 | [마음 일기](../asset/item/diary1_heart.png) | 아이템·조사 오브젝트 구분, 상태별 표시 |
| [배경](../asset/background/) | 학원 장소와 마이룸 | [유리 온실](../asset/background/BG06_glass_greenhouse_1920x1080_016.png) | 실제 화면 크롭·배치 검수 |
| [환경 재료 — UI에 통합](../asset/ui/README.md) | 바닥, 식물, 구조물, 전경 | [온실 식물](../asset/ui/UI20_environment_plant1_white_flower.png) | `UI20_environment_` 묶음; 반복·경계·가림·접지 검수 |
| [퍼즐](../asset/puzzle/) | 타일 바탕, 연결/회전 상태 | [퍼즐 바탕](../asset/puzzle/tile0_base.png) | 상태와 규칙 연결, 상호작용 가독성 |
| [UI](../asset/ui/) | 카드, 초대장, 가방, 기록, 힌트, 대화창, 로고 | [입학 초대장](../asset/ui/UI07_admission_invitation_004.png) | 텍스트는 동적 표시, 로고 변형 최종 선택 미정 |
| [효과](../asset/effect/) | 룬 발광, 달빛 광휘 | [룬 빛](../asset/effect/FX01_shared_rune_light_000.png) | 합성, 애니메이션, 밝기 검수 |

## 구분이 필요한 파일

- 환경 이미지는 `asset/ui/UI20_environment_*`로 통합됐으며 별도 `asset/environment/README.md`는 사용하지 않습니다. 타이포그래피·룬 시안은 `asset/font_files/FN_TYPO_*`, `FN_RUNE_*`이며 목록과 미리보기는 [폰트 안내](../asset/font_files/README.md)에 있습니다. 과거 `originals/`·`typography/`의 README와 TTF 원본은 현재 저장소 구성에 포함되지 않으므로 필수 입력으로 요구하지 않습니다. 게임용 WOFF2와 라이선스는 현재 폰트 안내의 경로를 따릅니다.
- 현재 게임 UI의 학생 이미지는 전신 원본만 사용합니다. NPC 대화·선택지도 전신으로 표시하고 플레이어 이미지는 표시하지 않으며, 마이룸 기본 프로필의 작은 얼굴 이미지는 제거합니다. 상반신 표정 `img1~img5`는 과거 제작 자원으로 구분하고 새 화면에는 연결하지 않습니다. 사용자 검수에서 상·좌·우 가장자리가 잘린 상반신 16장은 삭제해 현재 144장을 보유합니다.
- [엘리아 기본 전신](../asset/character/elia0_fullbody.png)과 [크기 보정본](../asset/character/elia6_fullbody_resized.png)은 둘 다 보존되어 있습니다. 실제 사용본 선택은 미정입니다.
- [`asset/pet/`](../asset/pet/)의 `PT01~PT10` 이미지 10종은 게임 데이터 ID `PET01~PET10`에 번호 순서대로 1:1 대응합니다. 데모의 단일 캐릭터 `베른` 설정은 본편에서 사용하지 않습니다. 동물 NPC 루루 이미지는 같은 폴더에 있지만 펫 목록에는 포함되지 않습니다. 상세 매핑은 [펫 시스템](content/03_COLLECTION_UNLOCKS/05_PET_SYSTEM.md)을 따릅니다.
- 조사 오브젝트의 상태는 파일명으로 구분합니다. 현재 확인되는 것은 [시든 식물](../asset/item/plant1_wilted.png)과 [회복 식물](../asset/item/plant2_restored.png)입니다. 과거 문서의 회복 식물 변형본은 현재 폴더에서 확인되지 않습니다.
- [로고 1안](../asset/ui/lumia_logo_mystic_01_017.png)과 [로고 5안](../asset/ui/lumia_logo_mystic_05_018.png)은 모두 보존했습니다. [달빛 광휘](../asset/effect/lumia_moonlight_sparkle_002.svg)는 1안과의 조합을 기준으로 제작되었고 다른 조합은 검토가 필요합니다.
- 지도는 [`asset/map/`](../asset/map/README.md)에 온실·대서고·천문대 자원이 있으며, 화면 시안은 [`asset/Full screen/`](../asset/Full%20screen/README.md), UI 프레임·검토 시안은 [`asset/ui/`](../asset/ui/README.md)에 있습니다. 파일 존재만으로 채택·엔진 연결·검수 완료를 단정하지 마세요.

## 자원 추가·교체 시

1. 카테고리와 안정적인 ID를 정하고, 같은 이름의 다른 이미지를 덮어쓰지 않습니다.
2. 어떤 화면·상태에 쓰는지, 최종 선정 여부와 검수 상태를 기록합니다.
3. 캐릭터·세계관·콘텐츠 문서의 연결을 확인하고, 실제 표시 크기와 크롭을 검수합니다.
4. 새 자원의 출처와 선정·검수 기록을 해당 카테고리 README에 남깁니다.

작성 당시 제작 목록·승인 기록·디자인 가이드를 참고했으나 원문은 현재 저장소에 없습니다. 새 작업에서는 [현재 자원 목록](../asset/README.md)과 실제 파일을 확인하세요.
