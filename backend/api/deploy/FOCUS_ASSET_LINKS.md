# FOCUS 그림 ID별 파일·공개 경로

기준: 2026-10-18. 제작 범위와 장면 설명은 [`story/ASSET_DIALOGUE_LEDGER.md`](../../../story/ASSET_DIALOGUE_LEDGER.md), 실제 채택 상태는 [`asset/item/README.md`](../../../asset/item/README.md)를 따른다. 이 표는 `ART-*` ID에서 **채택된 파일 경로를 역으로 찾기 위한 납품표**다. 17개 파일은 로컬 저장소에 납품됐으며, 대화 FOCUS 16개는 API 매핑에 연결된다. 운영 배포 여부는 별도 확인한다.

- 파일 위치: `asset/item/<파일명>`
- API 상대 경로: `/item-assets/<파일명>`
- 현재 운영 origin: `https://lumia-api-pcxd.onrender.com` (배포 주소가 바뀌면 origin만 교체)
- 파일명 규칙: 기존 `IT_focus_<최초 장면>_<대상>_<번호>.png` 형식을 유지한다. 아래 납품명은 같은 ID에 다른 파일을 잘못 붙이지 않기 위한 **확정 이름**이다. 이름이 변경되면 이 표와 API 매핑을 함께 변경한다.

아래 `공개 URL`은 운영 origin 기준의 목표 주소다. 파일과 로컬 API·엔진 경로는 검증하되, 운영 배포의 HTTP 200은 배포 후 별도로 확인한다. 기존 후보 `IT_card_candidate_*`와 일반 소품은 확정 FOCUS를 대체하지 않는다.

| 제작 ID | 최초 사용·그림 내용 | 파일명 (`asset/item/` 아래) | 공개 URL (Render API) | 상태 |
|---|---|---|---|---|
| `ART-M01` | `MS02-S1` 출입구를 막은 덩굴 | `IT_focus_MS02_blocked_vines_01.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_MS02_blocked_vines_01.png` | 채택·파일 등록·API 연결 |
| `ART-M02` | `MS02-S3` 커진 덩굴과 빛나는 꽃봉오리 | `IT_focus_MS02_glowing_bud_vines_02.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_MS02_glowing_bud_vines_02.png` | 채택·파일 등록·API 연결 |
| `ART-M03` | `MS03-S1` 틀린 시각의 시계판과 흐릿한 문양 | `IT_focus_MS03_wrong_clock_rune_01.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_MS03_wrong_clock_rune_01.png` | 채택·파일 등록·API 연결 |
| `ART-M04` | `MS04-S1` 떨어져 나온 그림자 | `IT_focus_MS04_detached_shadow_01.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_MS04_detached_shadow_01.png` | 채택·파일 등록·API 연결 |
| `ART-M05` | `MS04-S3` 그림자가 비치는 방패 | `IT_focus_MS04_shadow_shield_02.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_MS04_shadow_shield_02.png` | 채택·파일 등록·API 연결 |
| `ART-M06` | `MS06-S1` 겨울 놀이회 장식 레이어 | `IT_focus_MS06_winter_games_decor_01.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_MS06_winter_games_decor_01.png` | 채택·파일 등록·API 연결 |
| `ART-N01` | `NPC_GUIDE_01` 모임 안내지 | `IT_focus_NPC_GUIDE_01_meeting_notices_01.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_NPC_GUIDE_01_meeting_notices_01.png` | 채택·파일 등록·API 연결 |
| `ART-N02` | `NPC_GUIDE_03` 서로 다른 장식 리본 두 개 | `IT_focus_NPC_GUIDE_03_two_ribbons_01.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_NPC_GUIDE_03_two_ribbons_01.png` | 채택·파일 등록·API 연결 |
| `ART-N03` | `NPC_WORK_01` 모양이 다른 공방 부품 | `IT_focus_NPC_WORK_01_workshop_parts_01.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_NPC_WORK_01_workshop_parts_01.png` | 채택·파일 등록·API 연결 |
| `ART-N04` | `NPC_WORK_03` 천·도구·정돈된 작업대 | `IT_focus_NPC_WORK_03_tidy_workbench_02.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_NPC_WORK_03_tidy_workbench_02.png` | 채택·파일 등록·API 연결 |
| `ART-N05` | `NPC_LULU_01` 손 위의 무늬 단추 | `IT_focus_NPC_LULU_01_patterned_button_01.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_NPC_LULU_01_patterned_button_01.png` | 채택·파일 등록·API 연결 |
| `ART-N06` | `NPC_LULU_02` 열린 보물상자 | `IT_focus_NPC_LULU_02_treasure_chest_02.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_NPC_LULU_02_treasure_chest_02.png` | 채택·파일 등록·API 연결 |
| `ART-L01` | `LOC_OBS_01` 펼친 관측 일기 | `IT_focus_LOC_OBS_01_observation_diary_03.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_LOC_OBS_01_observation_diary_03.png` | 채택·파일 등록·API 연결 |
| `ART-L02` | `LOC_GH_01` 시든 화분 | `IT_focus_LOC_GH_01_wilted_pot_01.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_LOC_GH_01_wilted_pot_01.png` | 채택·파일 등록·API 연결 |
| `ART-L03` | `LOC_GH_01` 같은 화분의 회복 상태 | `IT_focus_LOC_GH_01_restored_pot_02.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_LOC_GH_01_restored_pot_02.png` | 채택·파일 등록·API 연결 |
| `ART-L04` | `LOC_LIB_01` 책장 위 가로로 놓인 평범한 책 | `IT_focus_LOC_LIB_01_plain_book_01.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_LOC_LIB_01_plain_book_01.png` | 채택·파일 등록·API 연결 |
| `ART-E01` | `END` 글자 없는 공용 직업 카드·편지 받침 | `IT_focus_END_career_letter_card_01.png` | `https://lumia-api-pcxd.onrender.com/item-assets/IT_focus_END_career_letter_card_01.png` | 채택·파일 등록·엔딩 UI 연결 |

합계 **17개 ID = 대화 FOCUS 16개 + 엔딩 UI 1개**. `ART-M06`은 겨울 놀이회 장식이며 `MS05` 별빛 축제 배경이 아니다.

## 납품 뒤 연결 순서

1. 해당 ID의 제작 대장 설명에 맞는 이미지를 검수·채택하고 확정명으로 `asset/item/`에 넣는다. 같은 작업에서 `asset/item/README.md`의 목록·설명·미리보기를 갱신한다.
2. `backend/api/app/dialogue_master.py`의 `DELIVERED_FOCUS_ASSETS`에 **채택된 대화 그림 ID만** 추가한다. 기존 후보나 파일이 없는 파일이 없는 ID를 등록하지 않는다. 엔딩 `ART-E01`은 실제 엔딩 화면의 표시 경로도 별도로 연결한다.
3. API 테스트와 실제 Dialogue `load`에서 `image.src`가 위 상대 경로인지 확인하고, 운영 URL에서 파일 응답 및 게임 화면 표시를 검증한다. 검증된 행만 상태를 `채택·API 연결`로 바꾼다.

Phase 12의 52주 엔딩 운영 검증은 필요한 그림의 납품과 연결이 끝난 뒤 수행한다. 파일 경로만으로 운영 배포 완료로 처리하지 않는다.
