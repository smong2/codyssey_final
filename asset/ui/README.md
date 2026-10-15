# UI 이미지

확정 로고 파일을 포함하면 이 폴더의 PNG/SVG는 35개입니다. 배경·프레임·아이콘·로고는 동적 텍스트나 실제 UI 동작과 구분합니다. 최종 사용 로고는 `lumia_logo_final_034.png`로 확정되었습니다. 기존 신비 로고 1안·5안은 이전 시안으로 보존하며, 실제 화면 합성·게임 적용 검수는 별도입니다. 새 이미지의 추가·삭제·교체 시 이 표를 갱신하세요.

## 추가 자원 설명

| 파일 구분 | 명칭·용도 |
|---|---|
| UI01~UI04 및 UI07의 source 5개 | 양피지·모서리·카드·전신 미리보기·초대장의 source 자료. 동명 출력본과 구별 |
| journal_button_icon_019~023 | 기록 버튼 아이콘 변형 5개 |
| player_status_frame_015 | 플레이어 상태창 프레임 |
| relationship_status_frame_016 | 관계 상태창 프레임 |
| title_layout_dialogue_title_layout_024~028 | 대화 제목 배치 변형 5개 |
| title_layout_reference_title_layout_029~033 | 참조 카드 제목 배치 변형 5개 |

번호는 파일 식별자이며 진행 단계가 아닙니다. 변형의 최종 사용처·수치·동작은 별도 구현·검수 대상입니다. 아래에 개별 파일과 미리보기를 모두 유지합니다. 향후 제작할 stat 이미지와 기존 상태창 프레임을 중복 계산하지 않습니다.

## 제목 배치 시안 제작 기록

현재 보존된 `title_layout_*` 10종은 대화창 5안과 참조카드 5안의 위치·비율 검토용 시안입니다.

- 대화창 기준 캔버스는 1280×320, 참조카드는 384×448로 검토했습니다.
- 제목·화자명·본문은 SVG에 굽지 않고 HTML 텍스트로 분리하는 방향으로 확인했습니다.
- 참조카드는 상단 타이틀을 두지 않고 제목을 참조 이미지 아래에 배치하는 안을 검토했습니다.
- `발렌티누스 아르카디아 교수`, `빛을 되찾은 온실의 유리꽃`처럼 긴 이름·제목으로 넘침 여부를 확인했고 10종 모두 검토 화면의 제목 박스를 벗어나지 않았습니다.
- 긴 화자명은 검토 화면에서 글자 크기를 줄여 대응했으며, 최종 이름표 크기와 글자 크기 기준은 별도 확정이 필요합니다.
- 이 SVG들은 위치·비율 판단용 시안이며 최종 게임 UI 적용 승인본을 의미하지 않습니다.

검토 당시 세부 배치는 다음과 같았습니다.

| 구분 | 검토안 |
|---|---|
| 대화 D01 | 상단 왼쪽 320×64 |
| 대화 D02 | 상단 중앙 400×72 |
| 대화 D03 | 왼쪽 내부 300×64 |
| 대화 D04 | 하단 왼쪽 360×64 |
| 대화 D05 | 상단 넓게 520×80 |
| 참조 R01 | 하단 내부 288×64 |
| 참조 R02 | 하단 겹침 320×72 |
| 참조 R03 | 하단 넓은 띠 340×88 |
| 참조 R04 | 하단 두 줄 280×104 |
| 참조 R05 | 하단 왼쪽 264×76 |

## 대화 기록·다이어리·달력 검토 이력

`journal_button_icon_019~023`은 각각 다음 5개 대화 기록 UI 시안과 짝으로 검토했습니다. HTML/CSS 기반 인터랙티브 시안 자체는 최종 런타임 구현이 아니며, 아래 콘셉트와 정보 구조만 제작 이력으로 보존합니다.

| 안 | 이름 | 핵심 구조 |
|---|---|---|
| J01 | 기억의 서책 | 고전적인 펼친 책, 왼쪽 목차·오른쪽 대화 |
| J02 | 온실 관찰 일지 | 식물 표본 노트, 날짜순 기록·관찰 메모 |
| J03 | 별빛 기록실 | 짙은 남색 표지, 넓은 본문·장별 북마크 |
| J04 | 친구의 편지함 | 편지 묶음, 인물별 찾기·따뜻한 산호색 |
| J05 | 서고의 기록함 | 도서관 문서형, 검색·필터·읽기 중심 |

다섯 안은 1120×700 기준으로 `열기/닫기`, 목차, 이전·다음 기록 등의 배치를 검토했으며 예시 대화 내용 자체는 본편 확정 스토리가 아닙니다.

달력은 긴 일정명을 작은 월간 칸 안에 밀어 넣지 않는 원칙으로 3안을 비교했습니다.

| 안 | 구조 | 당시 판단 |
|---|---|---|
| C01 | 월간 달력 + 선택한 날의 별도 일정 영역 | **권장안**. 월간 칸에는 날짜·표식만, 긴 일정명은 넓은 상세 영역에 표시 |
| C02 | 주간 수업 카드 | 한 주 계획 중심, 카드 안에서 일정명을 자연스럽게 줄바꿈 |
| C03 | 날짜 목록 + 시간순 일정 | 좁은 화면이나 긴 일정명이 많은 경우 안정적 |

위 달력의 날짜·수업명·시간대는 검토용 예시였으며 실제 게임의 일정 데이터와 시간 체계를 확정하는 근거로 사용하지 않습니다.

| 파일 | 설명 | 미리보기 |
|---|---|---|
| `UI01_parchment_tile_000.png` | 양피지 질감 타일 | <img src="./UI01_parchment_tile_000.png" width="160" alt="양피지 타일"> |
| `UI02_frame_corner_001.png` | UI 프레임 모서리 재료 | <img src="./UI02_frame_corner_001.png" width="160" alt="프레임 모서리"> |
| `UI03_character_card_background_002.png` | 캐릭터 카드 배경 | <img src="./UI03_character_card_background_002.png" width="160" alt="캐릭터 카드 배경"> |
| `UI04_fullbody_preview_background_003.png` | 전신 미리보기 배경 | <img src="./UI04_fullbody_preview_background_003.png" width="160" alt="전신 미리보기 배경"> |
| `UI07_admission_invitation_004.png` | 입학 초대장 이미지 재료 | <img src="./UI07_admission_invitation_004.png" width="160" alt="입학 초대장"> |
| `UI08_bag_005.svg` | 가방 아이콘 | <img src="./UI08_bag_005.svg" width="160" alt="가방 아이콘"> |
| `UI09_discovery_journal_006.svg` | 발견 기록 아이콘 | <img src="./UI09_discovery_journal_006.svg" width="160" alt="발견 기록 아이콘"> |
| `UI10_hint_007.svg` | 힌트 아이콘 | <img src="./UI10_hint_007.svg" width="160" alt="힌트 아이콘"> |
| `dialogue_frame_013.png` | 일반 대화창 프레임 | <img src="./dialogue_frame_013.png" width="160" alt="대화창 프레임"> |
| `lumia_logo_mystic_01_017.png` | LUMIA 신비 로고 1안 | <img src="./lumia_logo_mystic_01_017.png" width="160" alt="LUMIA 로고 1안"> |
| `lumia_logo_mystic_05_018.png` | LUMIA 신비 로고 5안 | <img src="./lumia_logo_mystic_05_018.png" width="160" alt="LUMIA 로고 5안"> |
| `lumia_logo_final_034.png` | **최종 확정 LUMIA 로고** (1774×887 투명 PNG). 빛 효과는 `../effect/lumia_logo_glow_003.png`로 별도 합성 | <img src="./lumia_logo_final_034.png" width="160" alt="확정 LUMIA 로고"> |
| `reference_card_title_014.png` | 제목 영역이 있는 참조 카드 | <img src="./reference_card_title_014.png" width="160" alt="제목 영역이 있는 참조 카드"> |

## 파일 미리보기

| 파일명 | 미리보기 |
|---|---|
| [UI01_parchment_tile_source_008.png](./UI01_parchment_tile_source_008.png) | <img src="./UI01_parchment_tile_source_008.png" width="120" alt="UI01_parchment_tile_source_008.png"> |
| [UI02_frame_corner_source_009.png](./UI02_frame_corner_source_009.png) | <img src="./UI02_frame_corner_source_009.png" width="120" alt="UI02_frame_corner_source_009.png"> |
| [UI03_character_card_background_source_010.png](./UI03_character_card_background_source_010.png) | <img src="./UI03_character_card_background_source_010.png" width="120" alt="UI03_character_card_background_source_010.png"> |
| [UI04_fullbody_preview_background_source_011.png](./UI04_fullbody_preview_background_source_011.png) | <img src="./UI04_fullbody_preview_background_source_011.png" width="120" alt="UI04_fullbody_preview_background_source_011.png"> |
| [UI07_admission_invitation_source_012.png](./UI07_admission_invitation_source_012.png) | <img src="./UI07_admission_invitation_source_012.png" width="120" alt="UI07_admission_invitation_source_012.png"> |
| [journal_button_icon_019.svg](./journal_button_icon_019.svg) | <img src="./journal_button_icon_019.svg" width="120" alt="journal_button_icon_019.svg"> |
| [journal_button_icon_020.svg](./journal_button_icon_020.svg) | <img src="./journal_button_icon_020.svg" width="120" alt="journal_button_icon_020.svg"> |
| [journal_button_icon_021.svg](./journal_button_icon_021.svg) | <img src="./journal_button_icon_021.svg" width="120" alt="journal_button_icon_021.svg"> |
| [journal_button_icon_022.svg](./journal_button_icon_022.svg) | <img src="./journal_button_icon_022.svg" width="120" alt="journal_button_icon_022.svg"> |
| [journal_button_icon_023.svg](./journal_button_icon_023.svg) | <img src="./journal_button_icon_023.svg" width="120" alt="journal_button_icon_023.svg"> |
| [player_status_frame_015.png](./player_status_frame_015.png) | <img src="./player_status_frame_015.png" width="120" alt="player_status_frame_015.png"> |
| [relationship_status_frame_016.png](./relationship_status_frame_016.png) | <img src="./relationship_status_frame_016.png" width="120" alt="relationship_status_frame_016.png"> |
| [title_layout_dialogue_title_layout_024.svg](./title_layout_dialogue_title_layout_024.svg) | <img src="./title_layout_dialogue_title_layout_024.svg" width="120" alt="title_layout_dialogue_title_layout_024.svg"> |
| [title_layout_dialogue_title_layout_025.svg](./title_layout_dialogue_title_layout_025.svg) | <img src="./title_layout_dialogue_title_layout_025.svg" width="120" alt="title_layout_dialogue_title_layout_025.svg"> |
| [title_layout_dialogue_title_layout_026.svg](./title_layout_dialogue_title_layout_026.svg) | <img src="./title_layout_dialogue_title_layout_026.svg" width="120" alt="title_layout_dialogue_title_layout_026.svg"> |
| [title_layout_dialogue_title_layout_027.svg](./title_layout_dialogue_title_layout_027.svg) | <img src="./title_layout_dialogue_title_layout_027.svg" width="120" alt="title_layout_dialogue_title_layout_027.svg"> |
| [title_layout_dialogue_title_layout_028.svg](./title_layout_dialogue_title_layout_028.svg) | <img src="./title_layout_dialogue_title_layout_028.svg" width="120" alt="title_layout_dialogue_title_layout_028.svg"> |
| [title_layout_reference_title_layout_029.svg](./title_layout_reference_title_layout_029.svg) | <img src="./title_layout_reference_title_layout_029.svg" width="120" alt="title_layout_reference_title_layout_029.svg"> |
| [title_layout_reference_title_layout_030.svg](./title_layout_reference_title_layout_030.svg) | <img src="./title_layout_reference_title_layout_030.svg" width="120" alt="title_layout_reference_title_layout_030.svg"> |
| [title_layout_reference_title_layout_031.svg](./title_layout_reference_title_layout_031.svg) | <img src="./title_layout_reference_title_layout_031.svg" width="120" alt="title_layout_reference_title_layout_031.svg"> |
| [title_layout_reference_title_layout_032.svg](./title_layout_reference_title_layout_032.svg) | <img src="./title_layout_reference_title_layout_032.svg" width="120" alt="title_layout_reference_title_layout_032.svg"> |
| [title_layout_reference_title_layout_033.svg](./title_layout_reference_title_layout_033.svg) | <img src="./title_layout_reference_title_layout_033.svg" width="120" alt="title_layout_reference_title_layout_033.svg"> |
| [lumia_logo_final_034.png](./lumia_logo_final_034.png) | <img src="./lumia_logo_final_034.png" width="120" alt="lumia_logo_final_034.png"> |
