# NPC_GUIDE_03 · 색 리본 고르기

> 상태: **검수용 공통 대화 마스터**  
> 체인: GUIDE 3/4  
> 기본 상대: 티아 `CH16`  
> 대체: 주인공이 티아면 로빈 `CH15`  
> 노출 시작: 29주차  
> 선택 화면: 1회 · 2지  
> 신규 이미지: `ART-N02`

## 장면 목적

- 앞선 안내 준비가 실제로 도움이 됐다는 작은 결과를 먼저 보여 준다.
- 모임 장식에 쓸 두 리본 분위기 중 하나를 고른다.
- 선택한 색을 다음 GUIDE04에서 `지난번 네가 골라 준 리본`으로 기억한다.

## 이미지

| 용도 | 연결 | 상태 | 미리보기 |
|---|---|---|---|
| 배경 | [`BG02_clocktower_plaza_1920x1080_011.png`](../../../asset/background/BG02_clocktower_plaza_1920x1080_011.png) | 실제 파일·API 연결 가능 | <img src="../../../asset/background/BG02_clocktower_plaza_1920x1080_011.png" width="240" alt="시계탑 광장"> |
| `ART-N02` · 색이 다른 리본 2개 | 예약 파일 `IT_focus_NPC_GUIDE_03_two_ribbons_01.png` | **예약·미납** | 미리보기 없음 |

화자는 기본 [`티아`](../../../asset/character/tia0_fullbody.png) <img src="../../../asset/character/tia0_fullbody.png" width="72" alt="티아 전신">, CH16 주인공일 때 [`로빈`](../../../asset/character/robin0_fullbody.png) <img src="../../../asset/character/robin0_fullbody.png" width="72" alt="로빈 전신">으로 대체된다. `ART-N02`와 비슷한 장식 후보가 있더라도 승인 FOCUS로 임의 연결하지 않는다.

## Sequence

### S1 · 안내를 보고 온 사람

**NPC_GUIDE_03_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG02_clocktower_plaza_1920x1080_011.png`

**NPC_GUIDE_03_S1_L01 · DIALOGUE / NPC_GUIDE_ACTOR / SPEAKER**  
“있잖아, 지난번 안내지 보고 모임에 온 학생이 있었어!”

**NPC_GUIDE_03_S1_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“정말? 잘 보이는 자리에 놓은 보람이 있었네.”

**NPC_GUIDE_03_S1_L03 · DIALOGUE / NPC_GUIDE_ACTOR / SPEAKER**  
“응. 그래서 이번엔 장식도 조금 해 보려고 하는데, 또 하나가 고민이야.”

### S2 · 두 리본

**NPC_GUIDE_03_S2_I01 · IMAGE / FOCUS SHOW**  
`ART-N02`

**NPC_GUIDE_03_S2_L01 · DIALOGUE / NPC_GUIDE_ACTOR / KEEP**  
“둘 다 예뻐 보여서 계속 번갈아 보고 있어. 하나는 밝고, 하나는 좀 차분한 느낌이야.”

**NPC_GUIDE_03_S2_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“모임 분위기를 어떻게 보이게 하고 싶은데?”

**NPC_GUIDE_03_S2_L03 · DIALOGUE / NPC_GUIDE_ACTOR / KEEP**  
“처음 오는 사람도 편하게 들어올 수 있으면 좋겠어. 네 눈에는 어느 쪽이 먼저 들어와?”

### S3 · 색을 고르다

**NPC_GUIDE_03_S3_C01 · CHOICE · `NPC_GUIDE_03_COLOR`**

- `GUIDE_03_BRIGHT` — “난 밝은 쪽이 먼저 눈에 들어와.”
  - reaction / GUIDE: “좋아! 멀리서 봐도 분위기가 한눈에 보이겠다.”
- `GUIDE_03_CALM` — “난 차분한 쪽이 더 편하게 보여.”
  - reaction / GUIDE: “그 느낌도 좋다. 오래 봐도 부담이 없겠어.”

**공통 합류**

**NPC_GUIDE_03_S3_N01 · NARRATION / KEEP**  
상대는 고른 리본을 다른 장식 사이에 걸어 본다.

**NPC_GUIDE_03_S3_L01 · DIALOGUE / NPC_GUIDE_ACTOR / SPEAKER**  
“응, 이렇게 두니까 느낌이 확 온다. 이걸로 갈게.”

### S4 · 다음에 다시 보기

**NPC_GUIDE_03_S4_L01 · DIALOGUE / PLAYER(BASE) / NONE**  
“다음에 오면 어디에 달았는지 바로 찾아볼게.”

**NPC_GUIDE_03_S4_L02 · DIALOGUE / NPC_GUIDE_ACTOR / SPEAKER**  
“좋아. 마지막 준비 때도 같이 한 번 봐줘!”

**NPC_GUIDE_03_END · END**

## 검수 메모

- 색별 이미지를 따로 만들지 않고 `ART-N02` 한 장만 사용한다.
- GUIDE04에서는 정확한 색 이름을 다시 말하지 않아도 `지난번 네가 골라 준 리본`이라고 기억할 수 있다.
- 선택 효과: `GUIDE_03_BRIGHT = 표현력 +1 / 솔직함 +3`, `GUIDE_03_CALM = 표현력 +1 / 신중함 +3`.
