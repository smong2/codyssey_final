# 캐릭터 디자인 제작 자료

## 분류 및 순서

| 순서 | 분류 | 내용 |
|---|---|---|
| 00 | [제작 명세](design_design_spec_008.md) | 전체 기획·디자인 시스템·QA |
| 01 | [캐릭터](characters_overview_055.md) | 학생 32인 이미지, 학생·NPC 프롬프트 |
| 02 | [아이템](items_overview_061.md) | 소품·가구 20종 |
| 03 | [배경](backgrounds_overview_065.md) | 장소 10종 |
| 04 | [UI 재료](ui_overview_074.md) | 5종 |
| 05 | [효과](effects_overview_080.md) | 공통 룬 빛 1종 |
| 06 | [탐험 환경](adventure_environment_overview_084.md) | 온실 13종 |
| 07 | [조사 오브젝트](adventure_objects_overview_088.md) | 상태 변화 포함 5종 |
| 08 | [SD 캐릭터](sd_character_overview_093.md) | 카엘 기준·걷기 시안 2종, 걷기 QA 불합격 |
| 09 | [퍼즐](puzzle_overview_098.md) | 바탕·연결선·상태 시안 |
| 10 | [화면 시안](screen_mockups_README_101.md) | 기존 시안과 22개 순차 화면 |
| 11 | [어드벤처 맵](adventure_map_README_116.md) | 맵·백팩·HUD·무드 검토 |
| 12 | [정리·검증](organization_numbering_rules_126.md) | 번호 규칙·이동표·검수 |

작업 브랜치는 **dev-jw**다. 각 폴더 안에서 하위 폴더와 파일을 각각 00부터 연속 번호로 정렬한다. 에셋 ID는 정렬 번호 뒤에 유지한다. [번호 부여 규칙](organization_numbering_rules_126.md)과 각 폴더의 00_README.md를 먼저 확인한다. 기존 에셋 등록표는 [01_manifest.json](production_asset_records_130.md#manifest_074), 전체 제작 파일은 [현재 파일 목록](json_cleanup_131.md#제거한-json-기록)을 참조한다.

## 전체 이미지 매칭표

기존 학생 32장 + 아이템 20장 + 배경 10장 = 62장. 이번 Prototype 제작 이미지 28장(베른 포함)을 더해 등록 PNG 90장이다. 원본 보관본·수정 시안과 퍼즐 SVG 8종은 이 수량에서 제외한다. 생성 저장과 게임 적용 QA 합격은 다르다.

| ID | 이름 | 이미지 | 프롬프트 |
|---|---|---|---|
| CH01 | 카엘 | [PNG](../assets/character_images/CH01_kael_000.png) | [프롬프트](characters_prompts_CH01_DELTA_018.txt) |
| CH02 | 세라 | [PNG](../assets/character_images/CH02_sera_001.png) | [프롬프트](characters_prompts_CH02_DELTA_019.txt) |
| CH03 | 시온 | [PNG](../assets/character_images/CH03_sion_002.png) | [프롬프트](characters_prompts_CH03_DELTA_020.txt) |
| CH04 | 로엔 | [PNG](../assets/character_images/CH04_roen_003.png) | [프롬프트](characters_prompts_CH04_DELTA_021.txt) |
| CH05 | 레온 | [PNG](../assets/character_images/CH05_leon_004.png) | [프롬프트](characters_prompts_CH05_DELTA_022.txt) |
| CH06 | 벨라 | [PNG](../assets/character_images/CH06_bella_005.png) | [프롬프트](characters_prompts_CH06_DELTA_023.txt) |
| CH07 | 유안 | [PNG](../assets/character_images/CH07_yuan_006.png) | [프롬프트](characters_prompts_CH07_DELTA_024.txt) |
| CH08 | 아이리스 | [PNG](../assets/character_images/CH08_iris_007.png) | [프롬프트](characters_prompts_CH08_DELTA_025.txt) |
| CH09 | 에녹 | [PNG](../assets/character_images/CH09_enoch_008.png) | [프롬프트](characters_prompts_CH09_DELTA_026.txt) |
| CH10 | 엘리아 | [PNG](../assets/character_images/CH10_elia_009.png) | [프롬프트](characters_prompts_CH10_DELTA_027.txt) |
| CH11 | 루카 | [PNG](../assets/character_images/CH11_luca_010.png) | [프롬프트](characters_prompts_CH11_DELTA_028.txt) |
| CH12 | 리네 | [PNG](../assets/character_images/CH12_rine_011.png) | [프롬프트](characters_prompts_CH12_DELTA_029.txt) |
| CH13 | 아드리안 | [PNG](../assets/character_images/CH13_adrian_012.png) | [프롬프트](characters_prompts_CH13_DELTA_030.txt) |
| CH14 | 스텔라 | [PNG](../assets/character_images/CH14_stella_013.png) | [프롬프트](characters_prompts_CH14_DELTA_031.txt) |
| CH15 | 로빈 | [PNG](../assets/character_images/CH15_robin_014.png) | [프롬프트](characters_prompts_CH15_DELTA_032.txt) |
| CH16 | 티아 | [PNG](../assets/character_images/CH16_tia_015.png) | [프롬프트](characters_prompts_CH16_DELTA_033.txt) |
| CH17 | 바론 | [PNG](../assets/character_images/CH17_baron_016.png) | [프롬프트](characters_prompts_CH17_DELTA_034.txt) |
| CH18 | 클레어 | [PNG](../assets/character_images/CH18_claire_017.png) | [프롬프트](characters_prompts_CH18_DELTA_035.txt) |
| CH19 | 요한 | [PNG](../assets/character_images/CH19_johan_018.png) | [프롬프트](characters_prompts_CH19_DELTA_036.txt) |
| CH20 | 하젤 | [PNG](../assets/character_images/CH20_hazel_019.png) | [프롬프트](characters_prompts_CH20_DELTA_037.txt) |
| CH21 | 빅터 | [PNG](../assets/character_images/CH21_victor_020.png) | [프롬프트](characters_prompts_CH21_DELTA_038.txt) |
| CH22 | 로렌 | [PNG](../assets/character_images/CH22_lauren_021.png) | [프롬프트](characters_prompts_CH22_DELTA_039.txt) |
| CH23 | 테오 | [PNG](../assets/character_images/CH23_theo_022.png) | [프롬프트](characters_prompts_CH23_DELTA_040.txt) |
| CH24 | 미리엄 | [PNG](../assets/character_images/CH24_miriam_023.png) | [프롬프트](characters_prompts_CH24_DELTA_041.txt) |
| CH25 | 렌 | [PNG](../assets/character_images/CH25_ren_024.png) | [프롬프트](characters_prompts_CH25_DELTA_042.txt) |
| CH26 | 다나 | [PNG](../assets/character_images/CH26_dana_025.png) | [프롬프트](characters_prompts_CH26_DELTA_043.txt) |
| CH27 | 미엘 | [PNG](../assets/character_images/CH27_miel_026.png) | [프롬프트](characters_prompts_CH27_DELTA_044.txt) |
| CH28 | 실비아 | [PNG](../assets/character_images/CH28_sylvia_027.png) | [프롬프트](characters_prompts_CH28_DELTA_045.txt) |
| CH29 | 카일 | [PNG](../assets/character_images/CH29_kyle_028.png) | [프롬프트](characters_prompts_CH29_DELTA_046.txt) |
| CH30 | 제나 | [PNG](../assets/character_images/CH30_jena_029.png) | [프롬프트](characters_prompts_CH30_DELTA_047.txt) |
| CH31 | 니코 | [PNG](../assets/character_images/CH31_nico_030.png) | [프롬프트](characters_prompts_CH31_DELTA_048.txt) |
| CH32 | 리코 | [PNG](../assets/character_images/CH32_rico_031.png) | [프롬프트](characters_prompts_CH32_DELTA_049.txt) |
| IT01 | 마음 일기 | [PNG](../assets/item_images/IT01_heart_diary_000.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT02 | 룬 램프 | [PNG](../assets/item_images/IT02_rune_lamp_001.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT03 | 차 세트 | [PNG](../assets/item_images/IT03_tea_set_002.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT04 | 약초 화분 | [PNG](../assets/item_images/IT04_herb_pot_003.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT05 | 룬 조각 | [PNG](../assets/item_images/IT05_rune_fragment_004.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT06 | 추억 액자 | [PNG](../assets/item_images/IT06_memory_frame_005.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT07 | 마이룸 책상 | [PNG](../assets/item_images/IT07_myroom_desk_006.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT08 | 마이룸 의자 | [PNG](../assets/item_images/IT08_myroom_chair_007.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT09 | 마이룸 침대 | [PNG](../assets/item_images/IT09_myroom_bed_008.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT10 | 마이룸 책장 | [PNG](../assets/item_images/IT10_myroom_bookshelf_009.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT11 | 마이룸 러그 | [PNG](../assets/item_images/IT11_myroom_rug_010.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT12 | 룬 오브제 | [PNG](../assets/item_images/IT12_rune_ornament_011.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT13 | 룬 고서 | [PNG](../assets/item_images/IT13_rune_ancient_book_012.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT14 | 양피지 편지 | [PNG](../assets/item_images/IT14_parchment_letter_013.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT15 | 마석 공방 도구 | [PNG](../assets/item_images/IT15_magic_stone_workshop_tools_014.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT16 | 훈련용 목검 | [PNG](../assets/item_images/IT16_practice_wooden_sword_015.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT17 | 공방 마석 | [PNG](../assets/item_images/IT17_workshop_magic_stone_016.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT18 | 마음 룬 | [PNG](../assets/item_images/IT18_heart_rune_017.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT19 | 그림자 룬 | [PNG](../assets/item_images/IT19_shadow_rune_018.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| IT20 | 정화된 룬 | [PNG](../assets/item_images/IT20_purified_rune_019.png) | [프롬프트](production_asset_records_130.md#items_prompts_078) |
| BG01 | 아르카디아 입구와 호수 | [PNG](../assets/background_images/BG01_arcadia_entrance_and_lake_000.png) | [프롬프트](production_asset_records_130.md#backgrounds_prompts_084) |
| BG02 | 시계탑 광장 | [PNG](../assets/background_images/BG02_clocktower_plaza_001.png) | [프롬프트](production_asset_records_130.md#backgrounds_prompts_084) |
| BG03 | 빈 마이룸 | [PNG](../assets/background_images/BG03_empty_myroom_002.png) | [프롬프트](production_asset_records_130.md#backgrounds_prompts_084) |
| BG04 | 학원 기숙사 | [PNG](../assets/background_images/BG04_academy_dormitory_003.png) | [프롬프트](production_asset_records_130.md#backgrounds_prompts_084) |
| BG05 | 대서고 | [PNG](../assets/background_images/BG05_grand_library_004.png) | [프롬프트](production_asset_records_130.md#backgrounds_prompts_084) |
| BG06 | 별빛 천문대 | [PNG](../assets/background_images/BG06_starlight_observatory_005.png) | [프롬프트](production_asset_records_130.md#backgrounds_prompts_084) |
| BG07 | 유리 온실 | [PNG](../assets/background_images/BG07_glass_greenhouse_006.png) | [프롬프트](production_asset_records_130.md#backgrounds_prompts_084) |
| BG08 | 치유의 약초원 | [PNG](../assets/background_images/BG08_healing_herb_garden_007.png) | [프롬프트](production_asset_records_130.md#backgrounds_prompts_084) |
| BG09 | 마도 공방 | [PNG](../assets/background_images/BG09_magic_workshop_008.png) | [프롬프트](production_asset_records_130.md#backgrounds_prompts_084) |
| BG10 | 룬 수련장 | [PNG](../assets/background_images/BG10_rune_training_ground_009.png) | [프롬프트](production_asset_records_130.md#backgrounds_prompts_084) |

## 문서

- [캐릭터 설정과 이미지](../03_characters.md)
- [아이템 제작 목록](items_overview_061.md)
- [배경 원화](backgrounds_overview_065.md)
- [전체 제작 명세서](design_design_spec_008.md)
- [기계 판독용 파일 매칭표](production_asset_records_130.md#manifest_074)

생성 원화 단계: 투명 경계, 게임 합성, 룬 상태별 문양 통일 및 레이어·Idle 후속 작업은 각 문서의 적용 메모를 따른다.


## 제작 전 필수 확인

[02 크기 기준·미제작 파일 목록](design_size_and_production_plan_009.md) · [03 파일별 크기 실측](json_cleanup_131.md#제거한-json-기록)


## 2026-10-01 Prototype 제작 기준

[05 중복 검사·카테고리별 체크리스트](design_prototype_checklist_010.md) · [06 생성 큐](production_asset_records_130.md#design_prototype_queue_012) · [신규 기준 문서](00_design/00_source_documents/)

- [Prototype 01_characters](characters_prototype_overview_056.md)
- [Prototype 04_ui](ui_overview_074.md)
- [Prototype 05_effects](effects_overview_080.md)
- [Prototype 06_adventure_environment](adventure_environment_overview_084.md)
- [Prototype 07_adventure_objects](adventure_objects_overview_088.md)
- [Prototype 08_sd_character](sd_character_overview_093.md)
- [Prototype 09_puzzle](puzzle_overview_098.md)


[최신 제작·검수 결과와 미완료 항목](design_production_review_011.md)

## 최신 작업 현황
[완료·미완료·다음 작업](design_work_status_012.md). 등록 PNG는 원본·시안·수정·파생·내보내기 포함 139개, SVG 8개 별도. 고유 디자인 수 또는 게임 승인본 수가 아님.

[최신 제한 수정·미제작 UI 납품 기록](design_delivery_record_014.md) · [UI08~UI10](ui_icon_guide_076.md)

[공통 UI 재사용 검수 페이지](../code/ui_ui_review_008.html) · [검수 결과](ui_ui_review_results_077.md)

[SC01 마이룸 완성 화면 시안](backgrounds_scene_reviews_review_070.md) — 1920×1080, 기존 에셋 참조 목표 화면.

## 11. 조립 화면 시안 (2026-10-02)
[게임 시작·캐릭터 선택·온실 모험 3종 및 검수 기록](screen_mockups_review_and_delivery_109.md). 기존 에셋 재사용, 1920×1080 검토용 출력. 사용자 시안 확인 후 다음 제작 진행.


## 12. 큰 탐험 맵과 백팩 (2026-10-04)
[맵 조립도·부분 카메라·백팩 및 HUD 조사](adventure_map_review_121.md). [마이룸 다음 작업안 — 사용자 승인 대기](adventure_map_myroom_proposal_pending_122.md).

