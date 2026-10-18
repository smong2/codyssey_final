# NPC_WORK_03 · 도구 정돈하기

> 상태: **검수용 공통 대화 마스터**  
> 체인: WORK 3/4  
> 기본 상대: 렌 `CH25`  
> 대체: 주인공이 렌이면 다나 `CH26`  
> 노출 시작: 32주차  
> 조건: 마도 공방 + 마법훈련 결과 저장 후  
> 선택 화면: 1회 · 2지  
> 신규 이미지: `ART-N04`

## 장면 목적

- 함께 부품을 살펴보던 관계가 작업대 정리까지 자연스럽게 이어진다.
- `도구를 닦기부터 / 자리를 정하기부터`를 작업 순서 차이로만 다룬다.
- 실제 정리는 대화와 이미지 전환으로 표현하고 플레이어 직접 조작을 요구하지 않는다.

## Sequence

### S1 · 작업 뒤의 책상

**NPC_WORK_03_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG08_magic_workshop_1920x1080_018.png`

**NPC_WORK_03_S1_N01 · NARRATION / NONE**  
작업이 끝난 작업대에는 마른 먼지가 조금 남아 있고 작은 도구들이 제자리에서 벗어나 있다.

**NPC_WORK_03_S1_L01 · DIALOGUE / NPC_WORK_ACTOR / SPEAKER**  
“오늘 작업은 끝. 이제 정리만 남았네.”

**NPC_WORK_03_S1_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“지난번보다 도구가 더 많이 나와 있네.”

**NPC_WORK_03_S1_L03 · DIALOGUE / NPC_WORK_ACTOR / SPEAKER**  
“먼저 닦아도 되고, 자리부터 정해도 돼. 끝나고 찾기 쉬우면 돼.”

### S2 · 순서를 정하다

**NPC_WORK_03_S2_L01 · DIALOGUE / PLAYER(BASE) / NONE**  
“둘 다 해야 하니까 먼저 하기 편한 쪽부터 정하면 되겠다.”

**NPC_WORK_03_S2_L02 · DIALOGUE / NPC_WORK_ACTOR / SPEAKER**  
“응. 어떤 순서로 할까?”

### S3 · 정리 방식

**NPC_WORK_03_S3_C01 · CHOICE · `NPC_WORK_03_ORDER`**

- `WORK_03_WIPE_FIRST` — “먼저 도구를 닦고 자리를 찾자.”
  - reaction / WORK: “좋아. 깨끗해지면 모양도 더 잘 보이겠네.”
- `WORK_03_PLACE_FIRST` — “먼저 둘 자리를 정하고 닦자.”
  - reaction / WORK: “좋아. 어디에 놓을지 정하면 움직일 일이 줄겠네.”

**공통 합류**

**NPC_WORK_03_S3_I01 · IMAGE / FOCUS SHOW**  
`ART-N04`

**NPC_WORK_03_S3_N01 · NARRATION / KEEP**  
잠시 뒤 작은 도구와 마른 천이 가지런히 놓이고 작업대가 정돈된다.

**NPC_WORK_03_S3_L01 · DIALOGUE / NPC_WORK_ACTOR / KEEP**  
“됐다. 다음에 찾을 때 훨씬 빠르겠어.”

**NPC_WORK_03_S3_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“다음엔 어디에 뭐가 있는지 바로 알겠다.”

**NPC_WORK_03_END · END**

## 검수 메모

- `ART-N04`는 정리된 상태를 보여 주는 공용 컷이다.
- 선택 효과: `WORK_03_WIPE_FIRST = 솜씨 +1 / 책임 +3`, `WORK_03_PLACE_FIRST = 지식 +1 / 신중함 +3`.
