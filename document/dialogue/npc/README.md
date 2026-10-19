# NPC Story 대화 마스터

이 폴더는 `story/npc/NPC_STORY_PRODUCTION.md`의 본편 NPC Story 12장면을 실제 공통 Dialogue 시퀀스로 옮긴 사람 검수용 원고다.

## 제작 범위

| 체인 | 기본 상대 | 주인공 중복 시 대체 | 장면 |
|---|---|---|---:|
| GUIDE | 티아 `CH16` | 주인공이 티아면 로빈 `CH15` | 4 |
| WORK | 렌 `CH25` | 주인공이 렌이면 다나 `CH26` | 4 |
| LULU | 루루 | 없음 | 4 |
| **합계** |  |  | **12** |

`TBD1 / TBD2`는 본편에서 제외하며 대화·이미지·32인 세트를 만들지 않는다.

## 우선순위

1. `story/npc/NPC_STORY_PRODUCTION.md` — 사건·선택·스탯·이미지·분량
2. `story/npc/NPC_INTERACTION_STORIES.md` — 체인 연속성·티아/로빈·렌/다나 Voice
3. `document/dialogue/02_DIALOGUE_WRITING_GUIDE.md` — 어린이 문체·선택·lineMode
4. 이 폴더 실제 대사

## 공통 화자 표기

- `PLAYER(BASE)` — 32인 변형 전 공통 주인공 문장
- `ROLE:NPC_GUIDE_ACTOR` — 기본 티아, 주인공이 티아일 때 로빈
- `ROLE:NPC_WORK_ACTOR` — 기본 렌, 주인공이 렌일 때 다나
- `NPC:LULU` — 고정 동물 NPC 루루

공통 원고의 GUIDE 대사는 티아, WORK 대사는 렌을 기준으로 먼저 작성한다. CH16 세트에서는 GUIDE 상대를 로빈 Voice로, CH25 세트에서는 WORK 상대를 다나 Voice로 교체한다. 사건·선택 `choiceId`·이미지·결말은 바꾸지 않는다.

## 관계 변화 원칙

NPC Story는 한 번의 큰 사건이 아니라 4번의 작은 만남이 이어지는 이야기다.

```text
1회차: 처음 같이 작은 일을 해 봄
2회차: 상대가 지난 만남을 기억함
3회차: 서로 의견을 자연스럽게 묻고 답함
4회차: 설명이 줄어도 호흡이 맞는 분위기로 마무리
```

친밀도 수치나 `우리는 친해졌어` 같은 설명은 사용하지 않는다. 관계 변화는 상대가 먼저 알아보고, 지난 일을 짧게 기억하고, 부탁을 더 자연스럽게 하는 방식으로 보여 준다.

## 이미지

기존 배경:

- GUIDE: `BG02_clocktower_plaza_1920x1080_011.png`
- WORK: `BG08_magic_workshop_1920x1080_018.png`
- LULU: 현재 DB location `GH`의 `BG06_glass_greenhouse_1920x1080_016.png`

Production 신규 소품 식별자:

- `ART-N01` — 흩어진 작은 모임 안내지
- `ART-N02` — 색이 다른 장식 리본 두 개
- `ART-N03` — 홈·모양이 다른 공방 부품 여러 개
- `ART-N04` — 마른 천·작은 도구·정돈된 작업대
- `ART-N05` — 루루의 작은 앞발 위 단추
- `ART-N06` — 루루의 열린 보물상자

현재 실제 연결 상태:

| 제작 ID | 실제 파일 | 상태 | 미리보기 |
|---|---|---|---|
| `ART-N01` | [`IT_focus_NPC_GUIDE_01_meeting_notices_01.png`](../../../asset/item/IT_focus_NPC_GUIDE_01_meeting_notices_01.png) | **채택·API 연결** | <img src="../../../asset/item/IT_focus_NPC_GUIDE_01_meeting_notices_01.png" width="220" alt="바람에 흩어진 모임 안내지"> |
| `ART-N02` | `IT_focus_NPC_GUIDE_03_two_ribbons_01.png` | 예약·미납 | 미리보기 없음 |
| `ART-N03` | `IT_focus_NPC_WORK_01_workshop_parts_01.png` | 예약·미납 | 미리보기 없음 |
| `ART-N04` | `IT_focus_NPC_WORK_03_tidy_workbench_02.png` | 예약·미납 | 미리보기 없음 |
| `ART-N05` | `IT_focus_NPC_LULU_01_patterned_button_01.png` | 예약·미납 | 미리보기 없음 |
| `ART-N06` | [`IT_focus_NPC_LULU_02_treasure_chest_02.png`](../../../asset/item/IT_focus_NPC_LULU_02_treasure_chest_02.png) | **채택·API 연결** | <img src="../../../asset/item/IT_focus_NPC_LULU_02_treasure_chest_02.png" width="220" alt="루루의 열린 보물상자"> |

`ART-N02~N05`는 예약 파일명이 있더라도 파일이 실제로 존재하지 않으므로 Sequence의 `ART-*` ID를 후보 그림으로 바꾸지 않는다.

루루 기본 NPC 이미지는 `asset/pet/`에 실제 파일이 존재하지만, 소품 IMAGE와 화자 초상은 별개로 취급한다. 현재 SQLite의 `NPC:LULU`는 `portrait_asset_ref=NULL`이며 어떤 의상 세트를 대화 초상으로 쓸지는 미정이다. 따라서 보유 의상을 회차 번호에 맞춰 임의 연결하지 않는다.

## 선택 구조

- 12장면 모두 `CHOICE` 1회
- 각 장면 2지선다
- canonical choice 총 24개
- 선택 직후 상대 반응 1줄
- 이후 중립 공통 흐름으로 합류
- NPC Story 선택 효과는 Production 기준 `보이는 스탯 +1 / 보이지 않는 스탯 +3`

`WORK_02`는 퀴즈가 아니다. `홈이 두 개인 쪽이 더 맞아 보인다 / 둘을 다시 나란히 비교하자` 모두 합리적인 관찰 방식이며, 어느 선택에서도 상대가 최종 규격을 확인한다.

## 파일

### GUIDE
- [NPC_GUIDE_01 · 안내지 줍기](NPC_GUIDE_01.md)
- [NPC_GUIDE_02 · 안내지 놓기](NPC_GUIDE_02.md)
- [NPC_GUIDE_03 · 색 리본 고르기](NPC_GUIDE_03.md)
- [NPC_GUIDE_04 · 남은 준비 돕기](NPC_GUIDE_04.md)

### WORK
- [NPC_WORK_01 · 부품 모으기](NPC_WORK_01.md)
- [NPC_WORK_02 · 필요한 부품 찾기](NPC_WORK_02.md)
- [NPC_WORK_03 · 도구 정돈하기](NPC_WORK_03.md)
- [NPC_WORK_04 · 작업대 살펴보기](NPC_WORK_04.md)

### LULU
- [NPC_LULU_01 · 단추 발견](NPC_LULU_01.md)
- [NPC_LULU_02 · 단추 보관하기](NPC_LULU_02.md)
- [NPC_LULU_03 · 발견물 나누기](NPC_LULU_03.md)
- [NPC_LULU_04 · 새 발견 함께 보기](NPC_LULU_04.md)

### 32인 실제 대사

- [Character Set 안내](character_sets/README.md)
- [CH01~CH08 · NT](character_sets/SET_NT_CH01_CH08.md)
- [CH09~CH16 · NF](character_sets/SET_NF_CH09_CH16.md)
- [CH17~CH24 · SJ](character_sets/SET_SJ_CH17_CH24.md)
- [CH25~CH32 · SP](character_sets/SET_SP_CH25_CH32.md)
- [CH16 로빈 GUIDE / CH25 다나 WORK 대체 화자 전체 대사](character_sets/ACTOR_SUBSTITUTIONS.md)

32명 모두 12개 choiceNode의 실제 선택 문구와 선택 직후 상대 반응을 가진다. 검산 기준은 **32명 × 12 choiceNode = 384개 선택 화면**, **32명 × 24 canonical choiceId = 768개 실제 선택 문구**다. Character Set에 별도 override가 없는 일반 PLAYER 문장은 공통 마스터 문구를 그대로 상속한다.

## 이후 작업 순서

```text
공통 12장면 작성
→ CH01~CH32 NPC Character Set 작성 완료
   - PLAYER Voice
   - 선택 문구
   - 선택 직후 상대 반응
   - CH16 GUIDE=로빈 전체 대체
   - CH25 WORK=다나 전체 대체
→ canonical choiceId / choiceNode 수량 검산 완료
→ 사람 검수
→ nodeId / assetRef DB 변환 검산
→ SQLite v4 NPC master + 32인 dialogue 적재
→ 실제 DB 검증
```

현재 단계는 **공통 12장면 + CH01~CH32 실제 NPC 대사 검수 승인 / SQLite v4 NPC seed 구현 완료 / 실제 DB 실행 검증 전**이다. `backend/database/sqlite/seed_npc_story.py`가 이 원고를 읽어 3 Story / 12 Event / **24 canonical choice / 64 choice effect** / 384 dialogue sequence / 768 dialogue option을 생성하도록 구현되어 있다. 선택 보상은 Visible +1 / Primary Hidden +5 / 일부 Secondary +2 규칙을 사용한다. 실제 로컬 DB 실행 결과는 별도 검증해야 한다.
