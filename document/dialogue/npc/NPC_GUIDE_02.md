# NPC_GUIDE_02 · 안내지 놓기

> 상태: **검수용 공통 대화 마스터**  
> 체인: GUIDE 2/4  
> 기본 상대: 티아 `CH16`  
> 대체: 주인공이 티아면 로빈 `CH15`  
> 노출 시작: 15주차  
> 선택 화면: 1회 · 2지  
> 신규 이미지: 없음 · `ART-N01` 재사용 가능

## 장면 목적

- GUIDE 상대가 첫 만남을 기억하고 먼저 알아본다.
- 안내지를 어디에 두면 보기 좋은지 두 기준을 비교한다.
- 선택은 `사람이 많이 지나는 곳 / 편하게 볼 수 있는 눈높이`의 서로 다른 관점이다.

## 이미지

| 용도 | 실제 연결 | 상태 | 미리보기 |
|---|---|---|---|
| 배경 | [`BG02_clocktower_plaza_1920x1080_011.png`](../../../asset/background/BG02_clocktower_plaza_1920x1080_011.png) | 실제 파일·API 연결 가능 | <img src="../../../asset/background/BG02_clocktower_plaza_1920x1080_011.png" width="240" alt="시계탑 광장"> |
| `ART-N01` 재사용 | [`IT_focus_NPC_GUIDE_01_meeting_notices_01.png`](../../../asset/item/IT_focus_NPC_GUIDE_01_meeting_notices_01.png) | **채택·API 연결** | <img src="../../../asset/item/IT_focus_NPC_GUIDE_01_meeting_notices_01.png" width="220" alt="모임 안내지"> |

화자는 기본 [`티아`](../../../asset/character/tia0_fullbody.png) <img src="../../../asset/character/tia0_fullbody.png" width="72" alt="티아 전신">, CH16 주인공일 때 [`로빈`](../../../asset/character/robin0_fullbody.png) <img src="../../../asset/character/robin0_fullbody.png" width="72" alt="로빈 전신">으로 대체된다.

## Sequence

### S1 · 먼저 알아보는 얼굴

**NPC_GUIDE_02_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG02_clocktower_plaza_1920x1080_011.png`

**NPC_GUIDE_02_S1_L01 · DIALOGUE / NPC_GUIDE_ACTOR / SPEAKER**  
“아, 지난번에 안내지 같이 주워 준 사람!”

**NPC_GUIDE_02_S1_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“이번에는 안 날아가고 있네.”

**NPC_GUIDE_02_S1_L03 · DIALOGUE / NPC_GUIDE_ACTOR / SPEAKER**  
“이번엔 꽉 잡고 왔지. 대신 어디에 두면 잘 보일지가 고민이야.”

### S2 · 두 자리

**NPC_GUIDE_02_S2_I01 · IMAGE / FOCUS SHOW**  
`ART-N01`

**NPC_GUIDE_02_S2_L01 · DIALOGUE / NPC_GUIDE_ACTOR / KEEP**  
“계단 입구는 사람이 많이 지나가고, 저 게시대는 서서 보기 편해 보여.”

**NPC_GUIDE_02_S2_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“둘 다 눈에 띌 만한 이유가 있네.”

### S3 · 어디가 좋을까

**NPC_GUIDE_02_S3_C01 · CHOICE · `NPC_GUIDE_02_PLACE`**

- `GUIDE_02_BUSY_PATH` — “사람이 많이 지나는 쪽에 두자.”
  - reaction / GUIDE: “좋아. 지나가다 한 번씩은 보겠네.”
- `GUIDE_02_EYE_LEVEL` — “천천히 보기 편한 높이에 두자.”
  - reaction / GUIDE: “그것도 좋다. 멈춰서 읽기엔 그쪽이 편하겠어.”

**공통 합류**

**NPC_GUIDE_02_S3_N01 · NARRATION / KEEP**  
잠시 뒤 안내지는 사람들이 지나며 볼 수 있는 자리에 가지런히 놓인다.

**NPC_GUIDE_02_S3_L01 · DIALOGUE / NPC_GUIDE_ACTOR / SPEAKER**  
“됐다. 이번엔 바람보다 사람이 먼저 보겠지?”

**NPC_GUIDE_02_S3_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“누가 보고 찾아오면 알려 줘.”

**NPC_GUIDE_02_END · END**

## 검수 메모

- 다음 GUIDE03에서 `안내지를 보고 모임에 온 학생이 있었다`는 짧은 기억을 사용한다.
- 선택 효과: `GUIDE_02_BUSY_PATH = 탐험 +1 / 호기심 +3`, `GUIDE_02_EYE_LEVEL = 표현력 +1 / 공감 +3`.
