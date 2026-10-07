# 온실 전체맵 · 베른 후보 01–05 · 대화 UI 4종

2026-10-07 사용자의 저장 요청으로 dev-jw에 추가한 10개 이미지입니다.
기존 원본 파일은 변경하지 않았습니다. 새 파일명 끝의 번호는 각 이미지 카테고리의 기존 마지막 번호에서 이어집니다.

## 온실 전체맵

전체맵은 미술 방향과 직선 통로를 확인하는 **콘셉트 시안**입니다. 충돌/가림 레이어로 분리된 실제 플레이맵이 아닙니다. 이후 시점 통일과 레이어 검토가 필요한 상태를 유지합니다.

## 베른 후보 01–05

저장 요청에 따라 기존 다섯 안을 보관합니다. 특정 동물이 최종 베른으로 선택되었다는 의미는 아닙니다. 기존 부드러운 색 번짐도 원본 그대로 보존했습니다.

## 이미지 목록

| 분류/이름 | 규격 | 파일 |
|---|---:|---|
| 온실 직선 전체맵 콘셉트 | 1920×1080 | [greenhouse_fullmap_straight_concept_007.png](../assets/map_images/greenhouse_fullmap_straight_concept_007.png) |
| 베른 후보 01 부엉이 | 1024×1536 | [bern_candidate01_owl_088.png](../assets/character_images/bern_candidate01_owl_088.png) |
| 베른 후보 02 여우 | 1024×1536 | [bern_candidate02_fox_089.png](../assets/character_images/bern_candidate02_fox_089.png) |
| 베른 후보 03 토끼 | 1024×1536 | [bern_candidate03_rabbit_090.png](../assets/character_images/bern_candidate03_rabbit_090.png) |
| 베른 후보 04 수달 | 1024×1536 | [bern_candidate04_otter_091.png](../assets/character_images/bern_candidate04_otter_091.png) |
| 베른 후보 05 강아지 | 1024×1536 | [bern_candidate05_puppy_092.png](../assets/character_images/bern_candidate05_puppy_092.png) |
| 일반 대화창 | 1280×320 | [dialogue_frame_013.png](../assets/ui_images/dialogue_frame_013.png) |
| 참조 이미지 카드 - 타이틀 칸 추가 | 384×448 | [reference_card_title_014.png](../assets/ui_images/reference_card_title_014.png) |
| 플레이어 상태창 | 512×192 | [player_status_frame_015.png](../assets/ui_images/player_status_frame_015.png) |
| 관계 상태창 | 384×160 | [relationship_status_frame_016.png](../assets/ui_images/relationship_status_frame_016.png) |

## UI 내용 분리

일반 대화창은 상단 화자 탭, 참조 카드에는 새 상단 타이틀 칸과 하단 캡션 칸을 둡니다. 카드 중앙은 별도 이미지를 놓는 투명 창입니다. 이름/타이틀/본문/게이지는 이미지에 굽지 않고 동적 요소로 표시합니다.
참조 카드의 수정 전 원본은 기존 로컬 검토 폴더에 보존했습니다. 상태창은 외형 제작물이며 HP/MP/EXP 등 게임 규칙 확정을 의미하지 않습니다.

## 저장하지 않은 신규 후보

새 베른 후보 06 고양이 / 07 레서판다 / 08 다람쥐 / 09 고슴도치 / 10 아기 사슴은 사용자 확인 전이므로 이 커밋에 포함하지 않습니다. 로고·폰트·이동 테스트 코드 역시 이번 저장 범위에 포함하지 않았습니다.
