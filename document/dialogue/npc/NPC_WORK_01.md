# NPC_WORK_01 · 부품 모으기

> 상태: **검수용 공통 대화 마스터**  
> 체인: WORK 1/4  
> 기본 상대: 렌 `CH25`  
> 대체: 주인공이 렌이면 다나 `CH26`  
> 노출 시작: 8주차  
> 조건: 마도 공방 + 마법훈련 결과 저장 후  
> 선택 화면: 1회 · 2지  
> 신규 이미지: `ART-N03`

## 장면 목적

- 공방에서 렌과 처음 작은 정리를 같이 한다.
- 모양과 홈 개수라는 두 분류 기준을 모두 합리적인 방법으로 보여 준다.
- 렌은 긴 칭찬 대신 정리 결과로 플레이어의 관찰을 인정한다.

## 이미지

| 용도 | 연결 | 상태 | 미리보기 |
|---|---|---|---|
| 배경 | [`BG08_magic_workshop_1920x1080_018.png`](../../../asset/background/BG08_magic_workshop_1920x1080_018.png) | 실제 파일·API 연결 가능 | <img src="../../../asset/background/BG08_magic_workshop_1920x1080_018.png" width="240" alt="마도 공방"> |
| `ART-N03` · 홈·모양이 다른 공방 부품 | 예약 파일 `IT_focus_NPC_WORK_01_workshop_parts_01.png` | **예약·미납** | 미리보기 없음 |

`NPC_WORK_ACTOR`는 기본 [`렌`](../../../asset/character/ren0_fullbody.png) <img src="../../../asset/character/ren0_fullbody.png" width="72" alt="렌 전신">, CH25 주인공일 때 [`다나`](../../../asset/character/dana0_fullbody.png) <img src="../../../asset/character/dana0_fullbody.png" width="72" alt="다나 전신">로 대체된다.

## Sequence

### S1 · 섞여 버린 부품

**NPC_WORK_01_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG08_magic_workshop_1920x1080_018.png`

**NPC_WORK_01_S1_N01 · NARRATION / NONE**  
공방 작업대 한쪽에 크기와 모양이 조금씩 다른 작은 부품들이 섞여 있다.

**NPC_WORK_01_S1_L01 · DIALOGUE / NPC_WORK_ACTOR / SPEAKER**  
“끝나고 보니 부품이 다 섞였네.”

**NPC_WORK_01_S1_I02 · IMAGE / FOCUS SHOW**  
`ART-N03`

**NPC_WORK_01_S1_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“비슷해 보여도 조금씩 다르다.”

**NPC_WORK_01_S1_L03 · DIALOGUE / NPC_WORK_ACTOR / KEEP**  
“응. 다음에 찾기 쉽게 나눠 두면 돼.”

### S2 · 어떤 기준으로 나눌까

**NPC_WORK_01_S2_L01 · DIALOGUE / PLAYER(BASE) / KEEP**  
“모양도 다르고, 가장자리 홈 수도 다르네.”

**NPC_WORK_01_S2_L02 · DIALOGUE / NPC_WORK_ACTOR / KEEP**  
“둘 다 기준으로 쓸 수 있어. 네가 먼저 눈에 들어오는 쪽으로 해.”

### S3 · 분류 시작

**NPC_WORK_01_S3_C01 · CHOICE · `NPC_WORK_01_SORT`**

- `WORK_01_SHAPE` — “비슷한 모양끼리 먼저 모아 보자.”
  - reaction / WORK: “좋아. 큰 차이가 먼저 보여서 빠르겠네.”
- `WORK_01_GROOVES` — “홈 개수가 같은 것끼리 모아 보자.”
  - reaction / WORK: “좋아. 작은 부품도 기준이 확실하겠네.”

**공통 합류**

**NPC_WORK_01_S3_N01 · NARRATION / KEEP**  
잠시 뒤 뒤섞였던 부품들이 몇 무리로 나뉜다.

**NPC_WORK_01_S3_L01 · DIALOGUE / NPC_WORK_ACTOR / SPEAKER**  
“이 정도면 다음엔 바로 찾겠다.”

**NPC_WORK_01_S3_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“정리하고 나니까 차이가 더 잘 보여.”

**NPC_WORK_01_END · END**

## 검수 메모

- CH25 주인공 세트에서는 상대를 다나로 교체하고 `규격/정렬/위치` 중심의 더 간결한 Voice를 사용한다.
- 선택 효과: `WORK_01_SHAPE = 탐험 +1 / 호기심 +3`, `WORK_01_GROOVES = 지식 +1 / 신중함 +3`.
