# NPC_WORK_02 · 필요한 부품 찾기

> 상태: **검수용 공통 대화 마스터**  
> 체인: WORK 2/4  
> 기본 상대: 렌 `CH25`  
> 대체: 주인공이 렌이면 다나 `CH26`  
> 노출 시작: 20주차  
> 조건: 마도 공방 + 마법훈련 결과 저장 후  
> 선택 화면: 1회 · 2지  
> 신규 이미지: 없음 · `ART-N03` 재사용

## 장면 목적

- 지난번 부품 분류가 실제로 도움이 됐다는 기억에서 시작한다.
- `홈이 두 개인 쪽이 더 맞아 보인다 / 둘을 다시 나란히 비교한다`를 정답/오답이 아닌 두 관찰 방식으로 만든다.
- 어느 선택에서도 마지막 규격 확인은 상대가 한다.

## Sequence

### S1 · 지난번 정리 덕분

**NPC_WORK_02_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG08_magic_workshop_1920x1080_018.png`

**NPC_WORK_02_S1_L01 · DIALOGUE / NPC_WORK_ACTOR / SPEAKER**  
“지난번에 나눈 부품들, 오늘 바로 써먹겠네.”

**NPC_WORK_02_S1_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“찾기 쉬워졌어?”

**NPC_WORK_02_S1_L03 · DIALOGUE / NPC_WORK_ACTOR / SPEAKER**  
“응. 필요한 규격이 거의 보이는데, 비슷한 게 둘 남았어.”

### S2 · 비슷한 두 부품

**NPC_WORK_02_S2_I01 · IMAGE / FOCUS SHOW**  
`ART-N03`

**NPC_WORK_02_S2_L01 · DIALOGUE / NPC_WORK_ACTOR / KEEP**  
“필요한 건 가장자리 홈이 두 개야. 둘 다 비슷해서 마지막 확인만 하면 돼.”

**NPC_WORK_02_S2_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“한쪽은 홈이 더 또렷해 보이고, 둘을 붙여 보면 차이가 더 잘 보일 것 같아.”

### S3 · 어떻게 확인할까

**NPC_WORK_02_S3_C01 · CHOICE · `NPC_WORK_02_CHECK`**

- `WORK_02_TWO_GROOVES` — “홈이 두 개인 쪽이 더 맞아 보여.”
  - reaction / WORK: “나도 그렇게 보여. 그래도 끼우기 전에 규격은 한 번 더 볼게.”
- `WORK_02_COMPARE` — “둘을 한 번 더 나란히 비교해 보자.”
  - reaction / WORK: “좋아. 가까이 두면 가장자리 차이가 더 잘 보이겠네.”

**공통 합류**

**NPC_WORK_02_S3_N01 · NARRATION / KEEP**  
상대는 두 부품의 홈과 크기를 마지막으로 확인한다.

**NPC_WORK_02_S3_L01 · DIALOGUE / NPC_WORK_ACTOR / SPEAKER**  
“확인 끝. 이쪽이 맞아.”

**NPC_WORK_02_S3_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“비슷한 건 마지막에 한 번 더 보는 게 편하네.”

**NPC_WORK_02_END · END**

## 검수 메모

- `WORK_02_TWO_GROOVES`를 퀴즈 정답처럼 연출하지 않는다. 상대의 최종 규격 확인이 항상 뒤따른다.
- 다나 대체 버전은 `홈/규격/정렬` 표현을 조금 더 직접적으로 사용한다.
- 선택 효과: `WORK_02_TWO_GROOVES = 지식 +1 / 독립성 +3`, `WORK_02_COMPARE = 탐험 +1 / 신중함 +3`.
