# 캐릭터 디자인 제작 자료

## 분류 및 순서

| 순서 | 분류 | 내용 |
|---|---|---|
| 00 | [제작 명세](00_design/01_design_spec.md) | 전체 기획·디자인 시스템·QA |
| 01 | [캐릭터](01_characters/01_overview.md) | 학생 32인 이미지, 학생·NPC 프롬프트 |
| 02 | [아이템](02_items/01_overview.md) | 소품·가구 20종 |
| 03 | [배경](03_backgrounds/01_overview.md) | 장소 10종 |
| 04 | [UI 재료](04_ui/01_overview.md) | 5종 |
| 05 | [효과](05_effects/01_overview.md) | 공통 룬 빛 1종 |
| 06 | [탐험 환경](06_adventure_environment/01_overview.md) | 온실 13종 |
| 07 | [조사 오브젝트](07_adventure_objects/01_overview.md) | 상태 변화 포함 5종 |
| 08 | [SD 캐릭터](08_sd_character/01_overview.md) | 카엘 기준·걷기 시안 2종, 걷기 QA 불합격 |
| 09 | [퍼즐](09_puzzle/01_overview.md) | 바탕·연결선·상태 시안 |
| 10 | [화면 시안](10_screen_mockups/00_README.md) | 기존 시안과 22개 순차 화면 |
| 11 | [어드벤처 맵](11_adventure_map/00_README.md) | 맵·백팩·HUD·무드 검토 |
| 12 | [정리·검증](12_organization/01_numbering_rules.md) | 번호 규칙·이동표·검수 |

작업 브랜치는 **dev-jw**다. 각 폴더 안에서 하위 폴더와 파일을 각각 00부터 연속 번호로 정렬한다. 에셋 ID는 정렬 번호 뒤에 유지한다. [번호 부여 규칙](12_organization/01_numbering_rules.md)과 각 폴더의 00_README.md를 먼저 확인한다. 기존 에셋 등록표는 [01_manifest.json](01_manifest.json), 전체 제작 파일은 [현재 파일 목록](12_organization/04_file_inventory.json)을 참조한다.

## 전체 이미지 매칭표

기존 학생 32장 + 아이템 20장 + 배경 10장 = 62장. 이번 Prototype 제작 이미지 28장(베른 포함)을 더해 등록 PNG 90장이다. 원본 보관본·수정 시안과 퍼즐 SVG 8종은 이 수량에서 제외한다. 생성 저장과 게임 적용 QA 합격은 다르다.

| ID | 이름 | 이미지 | 프롬프트 |
|---|---|---|---|
| CH01 | 카엘 | [PNG](01_characters/01_images/01_CH01_카엘.png) | [프롬프트](01_characters/00_prompts/01_CH01_DELTA.txt) |
| CH02 | 세라 | [PNG](01_characters/01_images/02_CH02_세라.png) | [프롬프트](01_characters/00_prompts/02_CH02_DELTA.txt) |
| CH03 | 시온 | [PNG](01_characters/01_images/03_CH03_시온.png) | [프롬프트](01_characters/00_prompts/03_CH03_DELTA.txt) |
| CH04 | 로엔 | [PNG](01_characters/01_images/04_CH04_로엔.png) | [프롬프트](01_characters/00_prompts/04_CH04_DELTA.txt) |
| CH05 | 레온 | [PNG](01_characters/01_images/05_CH05_레온.png) | [프롬프트](01_characters/00_prompts/05_CH05_DELTA.txt) |
| CH06 | 벨라 | [PNG](01_characters/01_images/06_CH06_벨라.png) | [프롬프트](01_characters/00_prompts/06_CH06_DELTA.txt) |
| CH07 | 유안 | [PNG](01_characters/01_images/07_CH07_유안.png) | [프롬프트](01_characters/00_prompts/07_CH07_DELTA.txt) |
| CH08 | 아이리스 | [PNG](01_characters/01_images/08_CH08_아이리스.png) | [프롬프트](01_characters/00_prompts/08_CH08_DELTA.txt) |
| CH09 | 에녹 | [PNG](01_characters/01_images/09_CH09_에녹.png) | [프롬프트](01_characters/00_prompts/09_CH09_DELTA.txt) |
| CH10 | 엘리아 | [PNG](01_characters/01_images/10_CH10_엘리아.png) | [프롬프트](01_characters/00_prompts/10_CH10_DELTA.txt) |
| CH11 | 루카 | [PNG](01_characters/01_images/11_CH11_루카.png) | [프롬프트](01_characters/00_prompts/11_CH11_DELTA.txt) |
| CH12 | 리네 | [PNG](01_characters/01_images/12_CH12_리네.png) | [프롬프트](01_characters/00_prompts/12_CH12_DELTA.txt) |
| CH13 | 아드리안 | [PNG](01_characters/01_images/13_CH13_아드리안.png) | [프롬프트](01_characters/00_prompts/13_CH13_DELTA.txt) |
| CH14 | 스텔라 | [PNG](01_characters/01_images/14_CH14_스텔라.png) | [프롬프트](01_characters/00_prompts/14_CH14_DELTA.txt) |
| CH15 | 로빈 | [PNG](01_characters/01_images/15_CH15_로빈.png) | [프롬프트](01_characters/00_prompts/15_CH15_DELTA.txt) |
| CH16 | 티아 | [PNG](01_characters/01_images/16_CH16_티아.png) | [프롬프트](01_characters/00_prompts/16_CH16_DELTA.txt) |
| CH17 | 바론 | [PNG](01_characters/01_images/17_CH17_바론.png) | [프롬프트](01_characters/00_prompts/17_CH17_DELTA.txt) |
| CH18 | 클레어 | [PNG](01_characters/01_images/18_CH18_클레어.png) | [프롬프트](01_characters/00_prompts/18_CH18_DELTA.txt) |
| CH19 | 요한 | [PNG](01_characters/01_images/19_CH19_요한.png) | [프롬프트](01_characters/00_prompts/19_CH19_DELTA.txt) |
| CH20 | 하젤 | [PNG](01_characters/01_images/20_CH20_하젤.png) | [프롬프트](01_characters/00_prompts/20_CH20_DELTA.txt) |
| CH21 | 빅터 | [PNG](01_characters/01_images/21_CH21_빅터.png) | [프롬프트](01_characters/00_prompts/21_CH21_DELTA.txt) |
| CH22 | 로렌 | [PNG](01_characters/01_images/22_CH22_로렌.png) | [프롬프트](01_characters/00_prompts/22_CH22_DELTA.txt) |
| CH23 | 테오 | [PNG](01_characters/01_images/23_CH23_테오.png) | [프롬프트](01_characters/00_prompts/23_CH23_DELTA.txt) |
| CH24 | 미리엄 | [PNG](01_characters/01_images/24_CH24_미리엄.png) | [프롬프트](01_characters/00_prompts/24_CH24_DELTA.txt) |
| CH25 | 렌 | [PNG](01_characters/01_images/25_CH25_렌.png) | [프롬프트](01_characters/00_prompts/25_CH25_DELTA.txt) |
| CH26 | 다나 | [PNG](01_characters/01_images/26_CH26_다나.png) | [프롬프트](01_characters/00_prompts/26_CH26_DELTA.txt) |
| CH27 | 미엘 | [PNG](01_characters/01_images/27_CH27_미엘.png) | [프롬프트](01_characters/00_prompts/27_CH27_DELTA.txt) |
| CH28 | 실비아 | [PNG](01_characters/01_images/28_CH28_실비아.png) | [프롬프트](01_characters/00_prompts/28_CH28_DELTA.txt) |
| CH29 | 카일 | [PNG](01_characters/01_images/29_CH29_카일.png) | [프롬프트](01_characters/00_prompts/29_CH29_DELTA.txt) |
| CH30 | 제나 | [PNG](01_characters/01_images/30_CH30_제나.png) | [프롬프트](01_characters/00_prompts/30_CH30_DELTA.txt) |
| CH31 | 니코 | [PNG](01_characters/01_images/31_CH31_니코.png) | [프롬프트](01_characters/00_prompts/31_CH31_DELTA.txt) |
| CH32 | 리코 | [PNG](01_characters/01_images/32_CH32_리코.png) | [프롬프트](01_characters/00_prompts/32_CH32_DELTA.txt) |
| IT01 | 마음 일기 | [PNG](02_items/00_images/01_IT01_마음_일기.png) | [프롬프트](02_items/02_prompts.json) |
| IT02 | 룬 램프 | [PNG](02_items/00_images/02_IT02_룬_램프.png) | [프롬프트](02_items/02_prompts.json) |
| IT03 | 차 세트 | [PNG](02_items/00_images/03_IT03_차_세트.png) | [프롬프트](02_items/02_prompts.json) |
| IT04 | 약초 화분 | [PNG](02_items/00_images/04_IT04_약초_화분.png) | [프롬프트](02_items/02_prompts.json) |
| IT05 | 룬 조각 | [PNG](02_items/00_images/05_IT05_룬_조각.png) | [프롬프트](02_items/02_prompts.json) |
| IT06 | 추억 액자 | [PNG](02_items/00_images/06_IT06_추억_액자.png) | [프롬프트](02_items/02_prompts.json) |
| IT07 | 마이룸 책상 | [PNG](02_items/00_images/07_IT07_마이룸_책상.png) | [프롬프트](02_items/02_prompts.json) |
| IT08 | 마이룸 의자 | [PNG](02_items/00_images/08_IT08_마이룸_의자.png) | [프롬프트](02_items/02_prompts.json) |
| IT09 | 마이룸 침대 | [PNG](02_items/00_images/09_IT09_마이룸_침대.png) | [프롬프트](02_items/02_prompts.json) |
| IT10 | 마이룸 책장 | [PNG](02_items/00_images/10_IT10_마이룸_책장.png) | [프롬프트](02_items/02_prompts.json) |
| IT11 | 마이룸 러그 | [PNG](02_items/00_images/11_IT11_마이룸_러그.png) | [프롬프트](02_items/02_prompts.json) |
| IT12 | 룬 오브제 | [PNG](02_items/00_images/12_IT12_룬_오브제.png) | [프롬프트](02_items/02_prompts.json) |
| IT13 | 룬 고서 | [PNG](02_items/00_images/13_IT13_룬_고서.png) | [프롬프트](02_items/02_prompts.json) |
| IT14 | 양피지 편지 | [PNG](02_items/00_images/14_IT14_양피지_편지.png) | [프롬프트](02_items/02_prompts.json) |
| IT15 | 마석 공방 도구 | [PNG](02_items/00_images/15_IT15_마석_공방_도구.png) | [프롬프트](02_items/02_prompts.json) |
| IT16 | 훈련용 목검 | [PNG](02_items/00_images/16_IT16_훈련용_목검.png) | [프롬프트](02_items/02_prompts.json) |
| IT17 | 공방 마석 | [PNG](02_items/00_images/17_IT17_공방_마석.png) | [프롬프트](02_items/02_prompts.json) |
| IT18 | 마음 룬 | [PNG](02_items/00_images/18_IT18_마음_룬.png) | [프롬프트](02_items/02_prompts.json) |
| IT19 | 그림자 룬 | [PNG](02_items/00_images/19_IT19_그림자_룬.png) | [프롬프트](02_items/02_prompts.json) |
| IT20 | 정화된 룬 | [PNG](02_items/00_images/20_IT20_정화된_룬.png) | [프롬프트](02_items/02_prompts.json) |
| BG01 | 아르카디아 입구와 호수 | [PNG](03_backgrounds/00_images/01_BG01_아르카디아_입구와_호수.png) | [프롬프트](03_backgrounds/02_prompts.json) |
| BG02 | 시계탑 광장 | [PNG](03_backgrounds/00_images/02_BG02_시계탑_광장.png) | [프롬프트](03_backgrounds/02_prompts.json) |
| BG03 | 빈 마이룸 | [PNG](03_backgrounds/00_images/03_BG03_빈_마이룸.png) | [프롬프트](03_backgrounds/02_prompts.json) |
| BG04 | 학원 기숙사 | [PNG](03_backgrounds/00_images/04_BG04_학원_기숙사.png) | [프롬프트](03_backgrounds/02_prompts.json) |
| BG05 | 대서고 | [PNG](03_backgrounds/00_images/05_BG05_대서고.png) | [프롬프트](03_backgrounds/02_prompts.json) |
| BG06 | 별빛 천문대 | [PNG](03_backgrounds/00_images/06_BG06_별빛_천문대.png) | [프롬프트](03_backgrounds/02_prompts.json) |
| BG07 | 유리 온실 | [PNG](03_backgrounds/00_images/07_BG07_유리_온실.png) | [프롬프트](03_backgrounds/02_prompts.json) |
| BG08 | 치유의 약초원 | [PNG](03_backgrounds/00_images/08_BG08_치유의_약초원.png) | [프롬프트](03_backgrounds/02_prompts.json) |
| BG09 | 마도 공방 | [PNG](03_backgrounds/00_images/09_BG09_마도_공방.png) | [프롬프트](03_backgrounds/02_prompts.json) |
| BG10 | 룬 수련장 | [PNG](03_backgrounds/00_images/10_BG10_룬_수련장.png) | [프롬프트](03_backgrounds/02_prompts.json) |

## 문서

- [캐릭터 설정과 이미지](../03_characters.md)
- [아이템 제작 목록](02_items/01_overview.md)
- [배경 원화](03_backgrounds/01_overview.md)
- [전체 제작 명세서](00_design/01_design_spec.md)
- [기계 판독용 파일 매칭표](01_manifest.json)

생성 원화 단계: 투명 경계, 게임 합성, 룬 상태별 문양 통일 및 레이어·Idle 후속 작업은 각 문서의 적용 메모를 따른다.


## 제작 전 필수 확인

[02 크기 기준·미제작 파일 목록](00_design/02_size_and_production_plan.md) · [03 파일별 크기 실측](00_design/03_size_audit.json)


## 2026-10-01 Prototype 제작 기준

[05 중복 검사·카테고리별 체크리스트](00_design/04_prototype_checklist.md) · [06 생성 큐](00_design/05_prototype_queue.json) · [신규 기준 문서](00_design/00_source_documents/)

- [Prototype 01_characters](01_characters/02_prototype_overview.md)
- [Prototype 04_ui](04_ui/01_overview.md)
- [Prototype 05_effects](05_effects/01_overview.md)
- [Prototype 06_adventure_environment](06_adventure_environment/01_overview.md)
- [Prototype 07_adventure_objects](07_adventure_objects/01_overview.md)
- [Prototype 08_sd_character](08_sd_character/01_overview.md)
- [Prototype 09_puzzle](09_puzzle/01_overview.md)


[최신 제작·검수 결과와 미완료 항목](00_design/08_production_review.md)

## 최신 작업 현황
[완료·미완료·다음 작업](00_design/09_work_status.md). 등록 PNG는 원본·시안·수정·파생·내보내기 포함 139개, SVG 8개 별도. 고유 디자인 수 또는 게임 승인본 수가 아님.

[최신 제한 수정·미제작 UI 납품 기록](00_design/15_delivery_record.md) · [UI08~UI10](04_ui/06_icon_guide.md)

[공통 UI 재사용 검수 페이지](04_ui/07_ui_review.html) · [검수 결과](04_ui/08_ui_review_results.md)

[SC01 마이룸 완성 화면 시안](03_backgrounds/02_scene_reviews/04_review.md) — 1920×1080, 기존 에셋 참조 목표 화면.

## 11. 조립 화면 시안 (2026-10-02)
[게임 시작·캐릭터 선택·온실 모험 3종 및 검수 기록](10_screen_mockups/05_review_and_delivery.md). 기존 에셋 재사용, 1920×1080 검토용 출력. 사용자 시안 확인 후 다음 제작 진행.


## 12. 큰 탐험 맵과 백팩 (2026-10-04)
[맵 조립도·부분 카메라·백팩 및 HUD 조사](11_adventure_map/05_review.md). [마이룸 다음 작업안 — 사용자 승인 대기](11_adventure_map/07_myroom_proposal_pending.md).

