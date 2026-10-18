# 게임용 아이템

이 폴더에는 스토리에서 채택한 FOCUS 3장, 채택 전 프레임 카드 3장, 배치 후보 소품·가구 25장, 총 **31장**이 있습니다. 마이룸·일지의 UI 재료 5장은 용도에 맞춰 [`asset/ui/`](../ui/README.md)로 옮겼습니다.

## 빠른 탐색

| 순서 | 찾을 내용 | 이 폴더에서 확인할 곳 |
|---|---|---|
| 1 | `NPC_GUIDE_01`, `NPC_LULU_02`, `LOC_OBS_01`의 채택 FOCUS | [스토리 FOCUS 연결 상태](#스토리-focus-연결-상태) → [채택한 스토리 FOCUS](#채택한-스토리-focus--3장) |
| 2 | 온실 화분·대서고 고서의 카드 후보 | [스토리 FOCUS 연결 상태](#스토리-focus-연결-상태) → [기존 프레임형 조사 이미지](#기존-프레임형-조사-이미지--3장) |
| 3 | 마이룸 가구·일반 소품 후보 | [일반 아이템 아트](#일반-아이템-아트--25장) |

파일명은 `IT_<역할>_<장면 또는 후보 영역>_<대상>_<번호>.png`입니다. `focus`의 `NPC_*`·`LOC_*`는 **최초 등장 장면**이고 재사용 회차는 아래 사용처에 적었습니다. `card`·`prop`·`furniture`의 `candidate`는 **배치 제안**이므로 확정 스토리 이미지로 사용하지 않습니다. 원래 제작 ID `ART-N01`·`ART-N06`·`ART-L01`은 파일명 대신 아래 표와 [에셋 전체 장면표](../README.md)에 계속 기록합니다. 소유·해금·획득 조건은 이미지 파일명만으로 확정되지 않습니다.

이미지의 경로가 등록된 것과 게임 화면에 표시되는 것은 별도입니다. 엔진의 아트 미리보기 목록과 에셋 경로 테스트는 새 `IT` 이름으로 동기화했습니다. 일부 `document/`·`document_for_ai/` 문서는 옛 파일명 예시를 유지하므로, 에셋 밖 문서 정리 시 새 경로로 교체해야 합니다.

## 스토리 FOCUS 연결 상태

아래 그림은 보유 이미지입니다. `ART-*`는 최신 제작 문서의 **필요 그림 ID**이며, 이름이나 장소가 비슷하다는 이유로 자동 확정하지 않습니다. [전체 장면 연결표](../README.md)에서 배경·화자와 함께 확인하세요.

| 이야기·필요 그림 | 현재 보유 이미지 · 미리보기 | 판단 |
|---|---|---|
| `LOC_OBS_01–04` · `ART-L01` 펼친 관측 일기 | [먼지·거미줄이 쌓인 펼친 관측 일기](./IT_focus_LOC_OBS_01_observation_diary_03.png)<br>큰 미리보기는 아래 `ART-L01` 항목 참조 | **이미지 채택**: 네 회차가 이 한 장을 재사용. 엔진 표시 검수는 별도 |
| `LOC_GH_01-R1` · `ART-L02` 시든 허브 화분 | [시든 화분 카드](./IT_card_candidate_GH_wilted_plant_01.png)<br><img src="./IT_card_candidate_GH_wilted_plant_01.png" width="200" alt="시든 화분 카드"> | **채택 후보**: 프레임을 포함한 3840×2161 카드. 온실 배경 위 FOCUS 표시 방식 검수 필요 |
| `LOC_GH_01-R2` · `ART-L03` 같은 화분의 회복 상태 | [회복 화분 카드](./IT_card_candidate_GH_restored_plant_02.png)<br><img src="./IT_card_candidate_GH_restored_plant_02.png" width="200" alt="회복 화분 카드"> | **채택 후보**: L02와 한 쌍. 상태 전환·규격 검수 필요 |
| `LOC_LIB_01-R1` · `ART-L04` 책장 위 평범한 책 | [장식 있는 고서 카드](./IT_card_candidate_LIB_ancient_book_03.png)<br><img src="./IT_card_candidate_LIB_ancient_book_03.png" width="200" alt="장식 있는 고서 카드"> | **불일치 후보**: 보유 그림은 장식 있는 고서 카드. 평범한 책이 책장 위에 가로로 놓인 구도가 아님 |

`MS02`의 마법 덩굴은 `ART-M01/M02`로 별도 제작 지시가 있습니다. 여기의 일상 시든·회복 화분이나 `LOC_GH_01` 카드를 MS02에 자동 연결하지 않습니다. `ART-N01` 안내지와 `ART-N06` 루루 보물상자는 아래의 전용 FOCUS를 사용합니다. 그 밖의 `ART-N02–N05`, `ART-M01–M06`, `ART-E01`은 이름이 비슷한 일반 아이템을 대신 연결하지 않습니다.

## 채택한 스토리 FOCUS · 3장

다음 세 장은 사용자 승인에 따라 같은 밝은 아이보리 바탕·얇은 장식 프레임으로 교체했습니다. 미리보기는 좁은 표에서 줄어들지 않도록 각각 따로 배치하고 모두 폭 280px로 맞췄습니다. 프레임 밖은 투명합니다. 아래 규격은 파일의 실제 픽셀 수입니다. **이미지 경로 확정과 엔진 화면 연결 완료는 별개**이며, 게임 화면의 표시·크기 검수는 남아 있습니다.

### `ART-N01` · 바람에 흩어진 모임 안내지

<img src="./IT_focus_NPC_GUIDE_01_meeting_notices_01.png" width="280" alt="밝은 아이보리 프레임 속 바람에 흩어진 작은 모임 안내지 여러 장">

- 파일: [IT_focus_NPC_GUIDE_01_meeting_notices_01.png](./IT_focus_NPC_GUIDE_01_meeting_notices_01.png) · 1672×941 투명 PNG
- 사용처: `NPC_GUIDE_01` 시계탑 광장에서 처음 표시. `NPC_GUIDE_02`, `NPC_GUIDE_04`에서 같은 그림 재사용. 읽히는 글자 대신 단순 문양 사용.

### `ART-N06` · 루루의 열린 보물상자

<img src="./IT_focus_NPC_LULU_02_treasure_chest_02.png" width="280" alt="밝은 아이보리 프레임 속 수집품이 보이는 루루의 열린 보물상자">

- 파일: [IT_focus_NPC_LULU_02_treasure_chest_02.png](./IT_focus_NPC_LULU_02_treasure_chest_02.png) · 1672×941 투명 PNG
- 사용처: `NPC_LULU_02` 온실 또는 약초원에서 처음 표시. `NPC_LULU_03–04`에서 같은 그림 재사용. 이후 새 발견물은 대사로 설명.

### `ART-L01` · 펼쳐진 관측 일기

<img src="./IT_focus_LOC_OBS_01_observation_diary_03.png" width="280" alt="밝은 아이보리 프레임 속 먼지와 거미줄이 수북한 펼친 관측 일기">

- 파일: [IT_focus_LOC_OBS_01_observation_diary_03.png](./IT_focus_LOC_OBS_01_observation_diary_03.png) · 1672×941 투명 PNG
- 사용처: `LOC_OBS_01` 별빛 천문대에서 처음 표시. `LOC_OBS_02–04`에서 같은 그림 재사용. 회차별 기록 내용은 대화창 텍스트로 표시.

## 기존 프레임형 조사 이미지 · 3장

기존 아이템 디자인을 바탕으로 만든 밝은 아이보리 카드 시안입니다. 원본 아이템은 그대로 유지합니다. 얇은 모서리 장식 프레임 3장을 한 묶음으로 정리했습니다. 모두 3840×2161 PNG이며 생성 시안을 확대한 출력물입니다. 게임 화면 적용 검수는 별도입니다.

| 파일 | 명칭·용도 | 규격 | 미리보기 |
|---|---|---:|:---:|
| [IT_card_candidate_GH_wilted_plant_01.png](./IT_card_candidate_GH_wilted_plant_01.png) | 온실: 시든 식물, 얇은 아이보리 프레임 | 3840×2161 | <img src="./IT_card_candidate_GH_wilted_plant_01.png" width="220" alt="시든 식물"> |
| [IT_card_candidate_GH_restored_plant_02.png](./IT_card_candidate_GH_restored_plant_02.png) | 온실: 되살아난 식물, 얇은 아이보리 프레임 | 3840×2161 | <img src="./IT_card_candidate_GH_restored_plant_02.png" width="220" alt="되살아난 식물"> |
| [IT_card_candidate_LIB_ancient_book_03.png](./IT_card_candidate_LIB_ancient_book_03.png) | 대서고: 고서, 얇은 아이보리 프레임 | 3840×2161 | <img src="./IT_card_candidate_LIB_ancient_book_03.png" width="220" alt="얇은 아이보리 프레임 속 대서고 고서"> |

원본: `C:/Users/josep/Desktop/Final Project/asset/item/originals`. 이전 회복 식물: `asset/item/review`. 기존 소지품·가구 20장은 1254×1254 원본에서 1024×1024로 축소했습니다. 기존 조사 오브젝트는 픽셀 데이터를 유지했습니다. 기존 25장은 새 이미지 생성 없이 정리한 파일이고, 위 프레임형 3장은 새로 생성한 투명 배경 PNG 시안입니다. 실제 게임 적용 검수는 별도입니다.

## 일반 아이템 아트 · 25장

같은 대상을 그린 일반 PNG와 프레임 카드는 화면 역할이 다릅니다. 일반 PNG는 소품·가구 이미지 후보이고, 프레임 카드는 대화 중 중앙에 띄울 FOCUS 후보입니다. 아래의 `마이룸`, `온실`, `공방` 등은 파일명·그림 내용에 따른 후보 장소입니다. 제작 문서가 장면 ID를 지정하기 전에는 엔진이 이 표만 보고 배치하지 않습니다.

| 파일 | 명칭·용도 | 배치 후보 · 연결 상태 | 규격 | 미리보기 |
|---|---|---|---:|:---:|
| [IT_prop_candidate_MYROOM_heart_diary_01.png](./IT_prop_candidate_MYROOM_heart_diary_01.png) | 마음 일기: 일반 기록 소품. 관측 일기 `ART-L01`과 별개 | 개인 기록·마이룸 소품 후보. `ART-L01` 관측 일기 아님; 화면 배치 미확인 | 1024×1024 | <img src="./IT_prop_candidate_MYROOM_heart_diary_01.png" width="140" alt="IT_prop_candidate_MYROOM_heart_diary_01.png"> |
| [IT_prop_candidate_MYROOM_rune_lamp_02.png](./IT_prop_candidate_MYROOM_rune_lamp_02.png) | 룬 램프: 조명 소품 | 마이룸 조명 소품 후보; 화면 배치 미확인 | 1024×1024 | <img src="./IT_prop_candidate_MYROOM_rune_lamp_02.png" width="140" alt="IT_prop_candidate_MYROOM_rune_lamp_02.png"> |
| [IT_prop_candidate_MYROOM_tea_set_03.png](./IT_prop_candidate_MYROOM_tea_set_03.png) | 차 세트: 생활 소품 | 마이룸 생활 소품 후보; 화면 배치 미확인 | 1024×1024 | <img src="./IT_prop_candidate_MYROOM_tea_set_03.png" width="140" alt="IT_prop_candidate_MYROOM_tea_set_03.png"> |
| [IT_prop_candidate_GH_herb_pot_04.png](./IT_prop_candidate_GH_herb_pot_04.png) | 약초 화분 | 마이룸·온실 화분 후보. `ART-L02/L03` 확정 그림 아님 | 1024×1024 | <img src="./IT_prop_candidate_GH_herb_pot_04.png" width="140" alt="IT_prop_candidate_GH_herb_pot_04.png"> |
| [IT_prop_candidate_RUNE_fragment_05.png](./IT_prop_candidate_RUNE_fragment_05.png) | 룬 조각 | 룬 수집·조사 소품 후보; 획득 조건·화면 배치 미확인 | 1024×1024 | <img src="./IT_prop_candidate_RUNE_fragment_05.png" width="140" alt="IT_prop_candidate_RUNE_fragment_05.png"> |
| [IT_prop_candidate_MYROOM_memory_frame_06.png](./IT_prop_candidate_MYROOM_memory_frame_06.png) | 추억 액자 | 마이룸 장식 후보; 화면 배치 미확인 | 1024×1024 | <img src="./IT_prop_candidate_MYROOM_memory_frame_06.png" width="140" alt="IT_prop_candidate_MYROOM_memory_frame_06.png"> |
| [IT_furniture_candidate_MYROOM_desk_07.png](./IT_furniture_candidate_MYROOM_desk_07.png) | 마이룸 책상 | 마이룸 가구 후보; 화면 배치 미확인 | 1024×1024 | <img src="./IT_furniture_candidate_MYROOM_desk_07.png" width="140" alt="IT_furniture_candidate_MYROOM_desk_07.png"> |
| [IT_furniture_candidate_MYROOM_chair_08.png](./IT_furniture_candidate_MYROOM_chair_08.png) | 마이룸 의자 | 마이룸 가구 후보; 화면 배치 미확인 | 1024×1024 | <img src="./IT_furniture_candidate_MYROOM_chair_08.png" width="140" alt="IT_furniture_candidate_MYROOM_chair_08.png"> |
| [IT_furniture_candidate_MYROOM_bed_09.png](./IT_furniture_candidate_MYROOM_bed_09.png) | 마이룸 침대 | 마이룸 가구 후보; 화면 배치 미확인 | 1024×1024 | <img src="./IT_furniture_candidate_MYROOM_bed_09.png" width="140" alt="IT_furniture_candidate_MYROOM_bed_09.png"> |
| [IT_furniture_candidate_MYROOM_bookshelf_10.png](./IT_furniture_candidate_MYROOM_bookshelf_10.png) | 마이룸 책장 | 마이룸 가구 후보; 화면 배치 미확인 | 1024×1024 | <img src="./IT_furniture_candidate_MYROOM_bookshelf_10.png" width="140" alt="IT_furniture_candidate_MYROOM_bookshelf_10.png"> |
| [IT_furniture_candidate_MYROOM_rug_11.png](./IT_furniture_candidate_MYROOM_rug_11.png) | 마이룸 러그 | 마이룸 가구 후보; 화면 배치 미확인 | 1024×1024 | <img src="./IT_furniture_candidate_MYROOM_rug_11.png" width="140" alt="IT_furniture_candidate_MYROOM_rug_11.png"> |
| [IT_prop_candidate_MYROOM_rune_ornament_12.png](./IT_prop_candidate_MYROOM_rune_ornament_12.png) | 룬 장식품 | 마이룸 룬 장식 후보; 화면 배치 미확인 | 1024×1024 | <img src="./IT_prop_candidate_MYROOM_rune_ornament_12.png" width="140" alt="IT_prop_candidate_MYROOM_rune_ornament_12.png"> |
| [IT_prop_candidate_LIB_ancient_book_13.png](./IT_prop_candidate_LIB_ancient_book_13.png) | 고서 | 대서고 소품 후보. `ART-L04`의 평범한 가로 책과 불일치 | 1024×1024 | <img src="./IT_prop_candidate_LIB_ancient_book_13.png" width="140" alt="IT_prop_candidate_LIB_ancient_book_13.png"> |
| [IT_prop_candidate_GENERAL_parchment_letter_14.png](./IT_prop_candidate_GENERAL_parchment_letter_14.png) | 양피지 편지 | 편지·문서 소품 후보. `MS01` 초대장이나 `END` 편지로 확정되지 않음 | 1024×1024 | <img src="./IT_prop_candidate_GENERAL_parchment_letter_14.png" width="140" alt="IT_prop_candidate_GENERAL_parchment_letter_14.png"> |
| [IT_prop_candidate_WORKSHOP_tools_15.png](./IT_prop_candidate_WORKSHOP_tools_15.png) | 공방 도구 | 마도 공방 소품 후보. `ART-N03/N04`로 확정되지 않음 | 1024×1024 | <img src="./IT_prop_candidate_WORKSHOP_tools_15.png" width="140" alt="IT_prop_candidate_WORKSHOP_tools_15.png"> |
| [IT_prop_candidate_TRAINING_wooden_sword_16.png](./IT_prop_candidate_TRAINING_wooden_sword_16.png) | 목검: 훈련 소품 | 훈련 소품 후보; 룬 수련장 배치 미확인 | 1024×1024 | <img src="./IT_prop_candidate_TRAINING_wooden_sword_16.png" width="140" alt="IT_prop_candidate_TRAINING_wooden_sword_16.png"> |
| [IT_prop_candidate_RUNE_magic_stone_17.png](./IT_prop_candidate_RUNE_magic_stone_17.png) | 마석 | 마법 재료 후보; 스토리 배정 미확인 | 1024×1024 | <img src="./IT_prop_candidate_RUNE_magic_stone_17.png" width="140" alt="IT_prop_candidate_RUNE_magic_stone_17.png"> |
| [IT_prop_candidate_RUNE_heart_rune_18.png](./IT_prop_candidate_RUNE_heart_rune_18.png) | 마음의 룬 | 룬 수집·조사 소품 후보; 스토리 배정 미확인 | 1024×1024 | <img src="./IT_prop_candidate_RUNE_heart_rune_18.png" width="140" alt="IT_prop_candidate_RUNE_heart_rune_18.png"> |
| [IT_prop_candidate_RUNE_shadow_rune_19.png](./IT_prop_candidate_RUNE_shadow_rune_19.png) | 그림자 룬 | 룬 수집·조사 소품 후보. `ART-M04/M05` 그림자 장면 아님 | 1024×1024 | <img src="./IT_prop_candidate_RUNE_shadow_rune_19.png" width="140" alt="IT_prop_candidate_RUNE_shadow_rune_19.png"> |
| [IT_prop_candidate_RUNE_purified_rune_20.png](./IT_prop_candidate_RUNE_purified_rune_20.png) | 정화된 룬 | 룬 수집·조사 소품 후보; 스토리 배정 미확인 | 1024×1024 | <img src="./IT_prop_candidate_RUNE_purified_rune_20.png" width="140" alt="IT_prop_candidate_RUNE_purified_rune_20.png"> |
| [IT_prop_candidate_GH_wilted_plant_21.png](./IT_prop_candidate_GH_wilted_plant_21.png) | 시든 식물: 회복 전 | 온실 상태 소품 후보. `ART-L02` 프레임 카드는 아래 별도 파일 | 512×512 | <img src="./IT_prop_candidate_GH_wilted_plant_21.png" width="140" alt="IT_prop_candidate_GH_wilted_plant_21.png"> |
| [IT_prop_candidate_GH_restored_plant_22.png](./IT_prop_candidate_GH_restored_plant_22.png) | 회복된 식물: 승인 v2 | 온실 상태 소품 후보. `ART-L03` 프레임 카드는 아래 별도 파일 | 512×512 | <img src="./IT_prop_candidate_GH_restored_plant_22.png" width="140" alt="IT_prop_candidate_GH_restored_plant_22.png"> |
| [IT_prop_candidate_GH_moonlight_herb_23.png](./IT_prop_candidate_GH_moonlight_herb_23.png) | 달빛 약초: 조사 소품 | 약초원 조사 소품 후보; 획득 조건·장면 배정 미확인 | 256×256 | <img src="./IT_prop_candidate_GH_moonlight_herb_23.png" width="140" alt="IT_prop_candidate_GH_moonlight_herb_23.png"> |
| [IT_prop_candidate_EVENT_rune_inactive_24.png](./IT_prop_candidate_EVENT_rune_inactive_24.png) | 이벤트 룬: 비활성 | 이벤트 룬 비활성 상태 후보; 장면 배정 미확인 | 512×512 | <img src="./IT_prop_candidate_EVENT_rune_inactive_24.png" width="140" alt="IT_prop_candidate_EVENT_rune_inactive_24.png"> |
| [IT_prop_candidate_EVENT_rune_active_25.png](./IT_prop_candidate_EVENT_rune_active_25.png) | 이벤트 룬: 활성 | 이벤트 룬 활성 상태 후보; 장면 배정 미확인 | 512×512 | <img src="./IT_prop_candidate_EVENT_rune_active_25.png" width="140" alt="IT_prop_candidate_EVENT_rune_active_25.png"> |
