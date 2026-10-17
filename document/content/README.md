# LUMIA 콘텐츠 기획 상세

이 디렉터리는 LUMIA의 **52주 육성형 RPG 플레이 구조**를 구체화하는 상세 기획 문서 모음입니다. 상위 문서인 [게임 콘텐츠 요소](../06_GAME_CONTENT.md)의 원칙을 유지하면서, 실제 플레이 루프·수업·미니게임·스탯·이벤트·수집·해금·세이브·회차 계승 규칙을 정의합니다.

## 문서 읽는 순서

1. [01_CORE_LOOP.md](01_CORE_LOOP.md) — 52주 플레이와 주간 일정
2. [02_STATS_EVENTS_ENDINGS/README.md](02_STATS_EVENTS_ENDINGS/README.md) — 스탯, NPC/공간 이벤트, 엔딩 조건
   - [01_STATS_SYSTEM.md](02_STATS_EVENTS_ENDINGS/01_STATS_SYSTEM.md) — 보이는 스탯, 보이지 않는 스탯, 기본값과 증감 원칙
   - [02_EVENTS.md](02_STATS_EVENTS_ENDINGS/02_EVENTS.md) — NPC·공간 이벤트 발생 규칙
   - [03_ENDINGS.md](02_STATS_EVENTS_ENDINGS/03_ENDINGS.md) — 미래 직업 엔딩 판정 구조
3. [03_COLLECTION_UNLOCKS/README.md](03_COLLECTION_UNLOCKS/README.md) — 수집 배지, 캐릭터·펫·배경 해금
   - [01_BADGE_COLLECTION_DESIGN.md](03_COLLECTION_UNLOCKS/01_BADGE_COLLECTION_DESIGN.md) — 가방 수집 배지 200개의 분류·조립형 디자인 기준
   - [02_CHARACTER_UNLOCK_TIMING.md](03_COLLECTION_UNLOCKS/02_CHARACTER_UNLOCK_TIMING.md) — 추가 플레이 가능 캐릭터의 조건 달성·해금·사용 가능 시점
   - [03_PET_UNLOCK_TIMING.md](03_COLLECTION_UNLOCKS/03_PET_UNLOCK_TIMING.md) — 기본 1마리와 추가 9마리의 장기 해금 속도 기준
   - [04_ROOM_BACKGROUND_PUZZLE.md](03_COLLECTION_UNLOCKS/04_ROOM_BACKGROUND_PUZZLE.md) — 마이룸 배경 3종과 36개 퍼즐 조각 획득 규칙
4. [04_SAVE_META_PROGRESSION.md](04_SAVE_META_PROGRESSION.md) — 저장과 회차 계승
5. [05_OPEN_DECISIONS.md](05_OPEN_DECISIONS.md) — 아직 확정하지 않은 항목
6. [06_CLASSES_MINIGAMES.md](06_CLASSES_MINIGAMES.md) — 수업과 보이는 스탯 대응, 기존 4종 게임 재활용, 미니게임 설계 원칙
   - [06_01_LOCATION_ACTIVITIES.md](06_01_LOCATION_ACTIVITIES.md) — 본편 6개 미니게임 + 요정의 거래, 결과·난이도 보정·자동저장 복구 계약
7. [07_MINIGAME_DEMO_IMPLEMENTATION_SPEC.md](07_MINIGAME_DEMO_IMPLEMENTATION_SPEC.md) — Phaser 3 미니게임 독립 데모의 과거 구현·플레이테스트 참고 사양
8. [08_ACCOUNT_POLICY.md](08_ACCOUNT_POLICY.md) — Email/Password 가입·인증, 최소 개인정보, 계정 관리·탈퇴 정책
9. [09_TITLE_ACCOUNT_UI.md](09_TITLE_ACCOUNT_UI.md) — WBS 4.4 로그인·이메일 인증·이어 하기 5슬롯·게임 내 계정 화면 계약
10. [10_COMMON_ENGINE_FRAME.md](10_COMMON_ENGINE_FRAME.md) — WBS 4.1 공통 HUD·마이룸·주간 연속 진행·모험 지도·공통 오류/취소 계약
11. [11_FEATURE_FRAME.md](11_FEATURE_FRAME.md) — WBS 4.3 가방·배지·마이룸 퍼즐·대화 인수·엔딩 화면 계약
12. [12_USER_UCS.md](12_USER_UCS.md) — WBS 4.2 가입·이어 하기·주간 진행·장소 이야기·가방·엔딩·계정의 완결된 사용자 상호작용 순서
13. [13_DIALOGUE_SEQUENCE.md](13_DIALOGUE_SEQUENCE.md) — Main/NPC/Location 공통 대화의 캐릭터별 원고, DB 식별자, 이미지·선택·완료/스킵 저장 계약. 엔진 DTO는 [대화 시스템 문서](../dialogue/README.md)를 함께 확인

독립 상위 개념은 `01_`, `02_`처럼 파일로 유지하고, 상세 문서가 여러 개 생기는 도메인은 `03_COLLECTION_UNLOCKS/`처럼 폴더로 분리합니다. 폴더 안에서는 `README.md`를 상위 개요로 두고 상세 문서는 `01_`, `02_` 순번을 사용합니다.

## 현재 게임의 한 문장 정의

> 원하는 학생을 주인공으로 선택해 52주의 학원생활을 계획하고, 수업·모험·휴식·관계·선택을 통해 서로 다른 능력과 이야기를 쌓아 미래의 직업 엔딩을 발견하는 멀티엔딩 육성 RPG.

## 문서 상태 규칙

- **확정**: 현재 기획 기준으로 사용합니다.
- **방향 확정·수치 미정**: 시스템의 역할은 정했지만 수치나 세부 조건은 밸런싱 단계에서 정합니다.
- **미정**: 시나리오·디자인·구현 조건을 확인한 뒤 결정합니다.

이 문서들은 구현 완료 목록이 아닙니다. 실제 코드·데이터가 존재하는지 여부는 각 작업 영역에서 별도로 확인합니다.

