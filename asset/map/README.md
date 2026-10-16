# 온실 어드벤처 전체맵

기존 곡선·직선 전체맵은 참고 자원으로 보존합니다. 현재 엔진 모험은 아래 신규 온실 원본에서 내보낸 WebP와 충돌 마스크를 사용합니다.

## 현재 엔진 연결 (2026-10-14)

| 파일 | 역할 | 규격 |
|---|---|---|
| `map01_greenhouse_master_3840x2160.png` | 디자이너 배경 원본 · 보존 | 3840×2160 |
| `map01_greenhouse_foreground_3840x2160.png` | 투명 전경 원본 · 보존 | 3840×2160 |
| `map01_greenhouse_collision_mask_3840x2160.png` | 충돌 마스크 원본 · 보존 | 3840×2160 |
| `map01_greenhouse_world_3840x2160.webp` | 런타임 배경 · quality 85 시안 | 3840×2160 |
| `map01_greenhouse_world_1920x1080.webp` | 활동 카드 배경 썸네일 | 1920×1080 |
| `map01_greenhouse_foreground_3840x2160.webp` | 런타임 투명 전경 · 무손실 | 3840×2160 |
| `map01_greenhouse_collision_mask_1920x1080.png` | 런타임 흑백 충돌 · 흰색만 이동 가능 | 1920×1080 |

배경·전경은 동일한 world 좌표와 원점 (0,0)을 사용합니다. 충돌 마스크는 정규화 좌표로 대응합니다. 전경은 사용자 승인에 따라 임시로 항상 캐릭터 앞에 표시하며, 오브젝트별 기준선·영역 데이터는 미정입니다. 카메라 기본 확대율은 0.7이며 캐릭터를 추적합니다.

## 추가 모험 지도 (2026-10-16)

대서고(MP02)와 별빛 천문대(MP03)는 엔진 모험의 별도 지도 슬롯에 연결했습니다. 원본 이미지는 수정하지 않았으며, 실제 파일의 마지막 1px을 잘라 런타임 표준 크기로 맞춘 파생본만 생성했습니다.

| 장소 | 런타임 배경 원본 크기 | 카드 썸네일 | 투명 전경 | 충돌 마스크 | 미리보기 |
|---|---|---|---|---|---|
| 대서고 | `MP02_grand_library_world_3840x2160.webp` · 3840×2160, WebP quality 85 | `MP02_grand_library_world_1920x1080.webp` · 1920×1080 | `MP02_grand_library_foreground_3840x2160.webp` · 무손실 WebP | `MP02_grand_library_collision_mask_1920x1080.png` · 흰색 이동 가능 | <img src="./MP02_grand_library_world_1920x1080.webp" width="240" alt="대서고 모험맵 미리보기"> |
| 별빛 천문대 | `MP03_starlight_observatory_world_3840x2160.webp` · 3840×2160, WebP quality 85 | `MP03_starlight_observatory_world_1920x1080.webp` · 1920×1080 | `MP03_starlight_observatory_foreground_3840x2160.webp` · 무손실 WebP | `MP03_starlight_observatory_collision_mask_1920x1080.png` · 흰색 이동 가능 | <img src="./MP03_starlight_observatory_world_1920x1080.webp" width="240" alt="별빛 천문대 모험맵 미리보기"> |

각 원본 PNG는 폴더에 그대로 보존합니다. MP02/MP03 런타임 월드와 전경 원본은 3840×2161, 마스크는 1920×1081이므로 출력에서 맨 아래 1px 행을 제외해 16:9 표준 크기로 맞췄습니다. 지도별 시작점은 월드 좌표 `(1920, 2100)`, 기본 카메라 확대율은 `0.7`입니다. 금지 구역/오브젝트별 전경 정렬 정보는 제공되지 않아 임의로 만들지 않았습니다. 전경은 현재 임시 규칙에 따라 항상 캐릭터 앞에 표시합니다.

원본은 덮어쓰지 않습니다. 수정된 배경은 4K/축소 WebP, 수정된 전경은 4K 투명 WebP로 별도 내보냅니다. 미사용 1920×1080 전경 WebP는 삭제했습니다. `engine/assets/`는 사용하지 않으며 모든 맵 자원은 이 폴더에서 관리합니다.

| 파일 | 용도 | 규격 | 미리보기 |
|---|---|---|---|
| [map1_straight.png](./map1_straight.png) | 직선 전체맵 | 1920×1080 | <img src="./map1_straight.png" width="300" alt="밝은 직선 온실 전체맵"> |
| [map2_curved.png](./map2_curved.png) | 곡선 전체맵 | 1920×1080 | <img src="./map2_curved.png" width="300" alt="밝은 곡선 온실 전체맵"> |

## 로컬 보관

`C:/Users/josep/Desktop/Final Project/asset/map`

- `originals`: 원본 2개와 밝은 색감 수정본의 생성 원본 2개.
- `previous_versions`: 기존 전체맵·플레이·백팩·직선맵 6개.
- `map_archive_000.md`: 기존 파일 복사 검증 기록.

2026-10-10: 초기 MAP01~MAP03 및 이전 맵 파일을 GitHub에서 제거하고 두 전체맵만 유지했습니다. 두 맵 모두 기존 구조를 유지하고 SD 캐릭터가 배경에 묻히지 않도록 식물 채도와 그림자 대비를 낮춰 색감을 수정했습니다. 입구 상부 아치 연결부를 제거하고 양쪽 기둥만 유지했습니다. SD 캐릭터·UI·경로 표시가 없는 전체맵입니다. 이 PNG는 합쳐진 전체맵 이미지로, 이동 충돌·앞뒤 가림용 레이어나 타일 데이터는 포함하지 않습니다.
