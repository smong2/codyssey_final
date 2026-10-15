# 루미아 UI 검수 시안 v05

이 폴더는 `dev-jw` 로컬 체크아웃에서 검토할 이미지와 조작 가능한 화면을 함께 보관한다. 1920×1080 전체화면 시안은 [`screens.html`](screens.html)에서 순서대로 볼 수 있고, 마이룸 두 안의 낮·노을·밤 비교는 [`myroom-times.html`](myroom-times.html)에서 볼 수 있다. 빈 프레임과 UI 없는 배경은 [`assets.html`](assets.html), 클릭 가능한 시연 화면은 [`index.html`](index.html)에 있다. 수치와 기록은 예시이며 게임 저장과 연결되어 있지 않다.

이전 28장은 `C:/Users/josep/Desktop/Final Project/asset/ui_gold_v04/screens/01-screen.png`부터 `28-screen.png`까지 별도로 보존되어 있다. 이 폴더의 21장은 새 검수 시안이다.

## 전체화면 PNG

| 번호 | 파일 | 내용 |
| --- | --- | --- |
| 01 | [01-screen.png](screens/01-screen.png) | 32인 통합 캐릭터 선택 · 전체 |
| 02 | [02-screen.png](screens/02-screen.png) | 남자 필터 |
| 03 | [03-screen.png](screens/03-screen.png) | 여자 필터 |
| 04 | [04-screen.png](screens/04-screen.png) | 체력 포함 보이는 스탯 6종 |
| 05 | [05-screen.png](screens/05-screen.png) | 저체력과 유효값 |
| 06 | [06-screen.png](screens/06-screen.png) | 백팩 · 아이템과 배지 |
| 07 | [07-screen.png](screens/07-screen.png) | 5개 배지 분류 상세 |
| 08 | [08-screen.png](screens/08-screen.png) | 펫 |
| 09 | [09-screen.png](screens/09-screen.png) | 배경 퍼즐 |
| 10 | [10-screen.png](screens/10-screen.png) | 다이어리 · 주별 활동 |
| 11 | [11-screen.png](screens/11-screen.png) | 다이어리 · 지난주 요약 |
| 12 | [12-screen.png](screens/12-screen.png) | 다이어리 · 이야기와 만남 |
| 13 | [13-screen.png](screens/13-screen.png) | 다이어리 · 엔딩과 편지 |
| 14 | [14-screen.png](screens/14-screen.png) | 월~금 주간 일정 |
| 15 | [15-screen.png](screens/15-screen.png) | 첫 번째 캐릭터 카드 이름칸 비교 |
| 16 | [16-screen.png](screens/16-screen.png) | 마이룸 안 2 · 창가 독서실 · 낮 (기존 이미지 유지) |
| 17 | [17-screen.png](screens/17-screen.png) | 마이룸 안 3 · 룬 연구실 · 노을 (기존 이미지 유지) |
| 18 | [18-screen.png](screens/18-screen.png) | 마이룸 안 2 · 창가 독서실 · 노을 (신규) |
| 19 | [19-screen.png](screens/19-screen.png) | 마이룸 안 2 · 창가 독서실 · 밤 (신규) |
| 20 | [20-screen.png](screens/20-screen.png) | 마이룸 안 3 · 룬 연구실 · 낮 (신규) |
| 21 | [21-screen.png](screens/21-screen.png) | 마이룸 안 3 · 룬 연구실 · 밤 (신규) |

## 핵심 원본 에셋

| 파일 | 용도 |
| --- | --- |
| [card_green_000.png](assets/card_green_000.png) | 첫 번째 골드 캐릭터 카드의 빈 이름칸을 기존 진한 녹색으로 채운 안 |
| [button_light_001.png](assets/button_light_001.png) | 남자·여자 필터의 연한 녹색 버튼 |
| [myroom_02_reading.png](assets/myroom_02_reading.png) | 창가 독서실 · 낮 (기존 이미지 유지) |
| [myroom_02_sunset.png](assets/myroom_02_sunset.png) | 창가 독서실 · 노을 (신규) |
| [myroom_02_night.png](assets/myroom_02_night.png) | 창가 독서실 · 밤 (신규) |
| [myroom_03_day.png](assets/myroom_03_day.png) | 룬 연구실 · 낮 (신규) |
| [myroom_03_rune.png](assets/myroom_03_rune.png) | 룬 연구실 · 노을 (기존 이미지 유지) |
| [myroom_03_night.png](assets/myroom_03_night.png) | 룬 연구실 · 밤 (신규) |
| [date_01_original.png](assets/date_01_original.png), [date_02_soft.png](assets/date_02_soft.png), [date_03_pastel.png](assets/date_03_pastel.png) | 날짜 프레임 3색 |
| [dialogue_01_original.png](assets/dialogue_01_original.png), [dialogue_02_lighter.png](assets/dialogue_02_lighter.png) | 대화창의 원래 녹색·약간 밝힌 녹색 이름표 |
| [버튼 비율·색상 시안 2종](assets/button_variants/README.md) | 원본보다 짧고 높은 골드 버튼 · 현재 올리브색/진한 녹색, 투명 PNG |

그 밖의 골드 대형 패널·스탯창 5종·컬렉션창·다이어리 5종·활동 결과 5종·배지 프레임과 심벌은 [`assets.html`](assets.html)에 파일명과 미리보기를 정리했다. 두 마이룸 원본은 내장 이미지 생성 도구로 기존 `room.png`를 스타일 참고로 제작했다. 이번 네 장은 각각 해당 방의 원본을 편집 대상으로 삼아 배치와 가구를 유지하고 시간대의 조명만 바꿨다. 두 방 모두 새 꽃·문자·UI 없이 빈 배경으로 저장한 뒤, 전체화면에는 기존 골드 UI를 별도 합성했다.

## 화면 규칙

- 보이는 스탯: 체력 0–100, 지식·표현력·솜씨·탐험·마법 각 0–500.
- 캐릭터: 32명 한 프레임, 기본 6명만 선택 가능. 전체/남자/여자 필터.
- 배지: 대분류 5개 × 소분류 5개 × 단계 8개. 배지 보상은 다음 회차 성장 능력에 적용하며 각 능력의 상한은 +15.
- 이 폴더는 로컬 `dev-jw` 검토 자료다. 전체화면 시안 21장의 복사본은 GitHub `dev-jw`의 `asset/Full screen/`에도 보관하며, `main`은 변경하지 않았다.
