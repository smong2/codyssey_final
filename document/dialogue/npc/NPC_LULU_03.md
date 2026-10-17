# NPC_LULU_03 · 발견물 나누기

> 상태: **검수용 공통 대화 마스터**  
> 체인: LULU 3/4  
> 상대: `NPC:LULU`  
> 노출 시작: 35주차  
> 조건: 유리 온실·약초원 방문 결과 저장 후  
> 선택 화면: 1회 · 2지  
> 신규 이미지: 없음 · `ART-N06` 재사용

## 장면 목적

- 루루가 보물상자를 먼저 열어 보여 줄 만큼 플레이어와 익숙해진 모습을 보여 준다.
- 새 소품 이미지를 추가하지 않고 `반짝이는 것 / 바스락거리는 것`을 대사로만 묘사한다.
- 플레이어 취향을 루루가 기억하는 작은 관계 변화를 만든다.

## Sequence

### S1 · 다시 열린 보물상자

**NPC_LULU_03_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG06_glass_greenhouse_1920x1080_016.png`

**NPC_LULU_03_S1_L01 · DIALOGUE / LULU / SPEAKER**  
“마침 잘 왔어! 오늘은 내가 먼저 보여 줄 게 있어.”

**NPC_LULU_03_S1_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“보물상자 이야기지?”

**NPC_LULU_03_S1_L03 · DIALOGUE / LULU / SPEAKER**  
“맞아! 전에 넣어 둔 단추도 잘 있고, 새로 찾은 것도 생겼어.”

### S2 · 서로 다른 발견물

**NPC_LULU_03_S2_I01 · IMAGE / FOCUS SHOW**  
`ART-N06`

**NPC_LULU_03_S2_L01 · DIALOGUE / LULU / KEEP**  
“하나는 빛을 받으면 반짝하고, 하나는 만지면 바스락바스락 소리가 나.”

**NPC_LULU_03_S2_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“보는 재미가 있는 거랑 소리 듣는 재미가 있는 거네.”

**NPC_LULU_03_S2_L03 · DIALOGUE / LULU / KEEP**  
“응! 나는 둘 다 좋은데, 너는 어떤 쪽이 더 먼저 궁금해?”

### S3 · 플레이어 취향

**NPC_LULU_03_S3_C01 · CHOICE · `NPC_LULU_03_FAVORITE`**

- `LULU_03_SHINY` — “나는 반짝이는 쪽이 더 궁금해.”
  - reaction / LULU: “알겠어! 다음에 반짝이는 걸 보면 네 생각도 날 것 같아.”
- `LULU_03_RUSTLE` — “나는 바스락거리는 쪽이 더 궁금해.”
  - reaction / LULU: “알겠어! 다음에 재미있는 소리가 나면 네 생각도 날 것 같아.”

**공통 합류**

**NPC_LULU_03_S3_L01 · DIALOGUE / LULU / KEEP**  
“혼자 모을 때도 재미있지만, 같이 보면 다른 데가 눈에 들어와.”

### S4 · 다음 발견 약속

**NPC_LULU_03_S4_L01 · DIALOGUE / PLAYER(BASE) / NONE**  
“다음에 또 신기한 거 찾으면 보여 줘.”

**NPC_LULU_03_S4_L02 · DIALOGUE / LULU / SPEAKER**  
“그럼! 네가 좋아할 만한 것도 잘 기억해 둘게.”

**NPC_LULU_03_END · END**

## 검수 메모

- 반짝이는 물건과 바스락거리는 물건의 구체 정체를 새 아이템으로 확정하지 않는다.
- LULU04에서는 정확한 선택을 시스템 설명으로 반복하지 않고 `네가 재미있어할 것 같아서` 같은 자연스러운 기억 표현만 사용한다.
- 선택 효과: `LULU_03_SHINY = 마법 +1 / 호기심 +3`, `LULU_03_RUSTLE = 탐험 +1 / 호기심 +3`.
