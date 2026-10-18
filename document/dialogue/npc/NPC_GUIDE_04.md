# NPC_GUIDE_04 · 남은 준비 돕기

> 상태: **검수용 공통 대화 마스터**  
> 체인: GUIDE 4/4  
> 기본 상대: 티아 `CH16`  
> 대체: 주인공이 티아면 로빈 `CH15`  
> 노출 시작: 41주차  
> 선택 화면: 1회 · 2지  
> 신규 이미지: 없음 · `ART-N01`, `ART-N02` 재사용 가능

## 장면 목적

- 네 번째 만남답게 설명을 줄이고 서로 익숙하게 준비를 마친다.
- 지난번 리본 선택이 실제 준비에 반영됐음을 짧게 확인한다.
- 체인 완료를 친밀도 선언이 아니라 자연스러운 호흡으로 보여 준다.

## Sequence

### S1 · 거의 끝난 준비

**NPC_GUIDE_04_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG02_clocktower_plaza_1920x1080_011.png`

**NPC_GUIDE_04_S1_L01 · DIALOGUE / NPC_GUIDE_ACTOR / SPEAKER**  
“왔구나! 이제 진짜 거의 끝났어.”

**NPC_GUIDE_04_S1_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“이번엔 종이가 날아다니진 않네.”

**NPC_GUIDE_04_S1_L03 · DIALOGUE / NPC_GUIDE_ACTOR / SPEAKER**  
“하하, 그건 이제 안 놓치지. 지난번 네가 골라 준 리본도 잘 달아 놨어.”

### S2 · 마지막 확인

**NPC_GUIDE_04_S2_I01 · IMAGE / FOCUS SHOW**  
`ART-N02`

**NPC_GUIDE_04_S2_L01 · DIALOGUE / NPC_GUIDE_ACTOR / KEEP**  
“남은 건 안내지랑 장식을 한 번씩 확인하는 거야. 뭐부터 볼까?”

**NPC_GUIDE_04_S2_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“둘 다 금방 볼 수 있겠다.”

### S3 · 익숙한 순서

**NPC_GUIDE_04_S3_C01 · CHOICE · `NPC_GUIDE_04_ORDER`**

- `GUIDE_04_GUIDE_FIRST` — “안내지부터 확인하고 장식을 보자.”
  - reaction / GUIDE: “좋아. 사람들이 보는 것부터 챙기고 끝내자.”
- `GUIDE_04_DECOR_FIRST` — “장식부터 보고 안내지를 확인하자.”
  - reaction / GUIDE: “좋아. 눈에 보이는 데부터 훑고 마무리하자.”

**공통 합류**

**NPC_GUIDE_04_S3_N01 · NARRATION / KEEP**  
둘은 익숙하게 광장을 한 바퀴 돌며 남은 준비를 확인한다.

**NPC_GUIDE_04_S3_L01 · DIALOGUE / NPC_GUIDE_ACTOR / SPEAKER**  
“됐다. 처음엔 안내지 몇 장에도 정신없었는데, 이번엔 금방 끝났네.”

**NPC_GUIDE_04_S3_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“이제 네가 먼저 뭘 볼지 말 안 해도 알 것 같아.”

**NPC_GUIDE_04_S3_L03 · DIALOGUE / NPC_GUIDE_ACTOR / SPEAKER**  
“나도. 같이 준비해 줘서 고마워. 이번 모임은 마음 놓고 시작할 수 있겠다.”

**NPC_GUIDE_04_END · END**

## 검수 메모

- GUIDE 체인은 여기서 끝난다. 5회차나 체인 전용 상시 인사를 추가하지 않는다.
- 선택 효과: `GUIDE_04_GUIDE_FIRST = 지식 +1 / 책임 +3`, `GUIDE_04_DECOR_FIRST = 솜씨 +1 / 책임 +3`.
