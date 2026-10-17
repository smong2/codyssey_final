# NPC_WORK_04 · 작업대 살펴보기

> 상태: **검수용 공통 대화 마스터**  
> 체인: WORK 4/4  
> 기본 상대: 렌 `CH25`  
> 대체: 주인공이 렌이면 다나 `CH26`  
> 노출 시작: 44주차  
> 조건: 마도 공방 + 마법훈련 결과 저장 후  
> 선택 화면: 1회 · 2지  
> 신규 이미지: 없음 · `ART-N04` 재사용

## 장면 목적

- 여러 번 같이 정리한 덕분에 서로 설명을 길게 하지 않아도 작업 흐름이 맞는 모습을 보여 준다.
- `위치를 직접 알려 주기 / 상대에게 먼저 확인해 보기`를 독립성과 협력의 다른 방식으로 다룬다.
- WORK 체인은 이 장면에서 자연스럽게 끝낸다.

## Sequence

### S1 · 익숙해진 작업대

**NPC_WORK_04_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG08_magic_workshop_1920x1080_018.png`

**NPC_WORK_04_S1_I02 · IMAGE / FOCUS SHOW**  
`ART-N04`

**NPC_WORK_04_S1_L01 · DIALOGUE / NPC_WORK_ACTOR / KEEP**  
“정돈 상태 괜찮네. 지난번보다 찾는 시간이 줄었어.”

**NPC_WORK_04_S1_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“이제 자리가 거의 눈에 익은 것 같아.”

### S2 · 마지막 확인

**NPC_WORK_04_S2_L01 · DIALOGUE / NPC_WORK_ACTOR / KEEP**  
“그럼 하나만 확인하자. 얇은 조정 도구가 어디 있었지?”

**NPC_WORK_04_S2_T01 · THOUGHT / PLAYER / KEEP**  
기억나는 위치를 바로 말해도 되고, 같이 다시 확인해도 금방 찾을 수 있겠다.

### S3 · 어떻게 찾을까

**NPC_WORK_04_S3_C01 · CHOICE · `NPC_WORK_04_FIND`**

- `WORK_04_TELL_LOCATION` — “오른쪽 작은 칸에 있었던 것 같아.”
  - reaction / WORK: “맞아. 바로 찾았네.”
- `WORK_04_ASK_TOGETHER` — “같이 한 번 확인해 보자.”
  - reaction / WORK: “좋아. 둘이 보면 금방 끝나겠지.”

**공통 합류**

**NPC_WORK_04_S3_N01 · NARRATION / KEEP**  
상대는 필요한 도구를 꺼내 작업대 한쪽에 놓는다.

**NPC_WORK_04_S3_L01 · DIALOGUE / NPC_WORK_ACTOR / SPEAKER**  
“찾았다. 예전엔 부품부터 도구까지 매번 한참 찾았는데.”

**NPC_WORK_04_S3_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“몇 번 같이 정리하니까 이제 순서를 알겠어.”

**NPC_WORK_04_S3_L03 · DIALOGUE / NPC_WORK_ACTOR / SPEAKER**  
“나도. 다음 작업은 훨씬 빨리 시작하겠네.”

**NPC_WORK_04_END · END**

## 검수 메모

- 체인 완료 후 WORK 전용 5회차·상시 후속 대사를 만들지 않는다.
- `WORK_04_TELL_LOCATION`의 구체 위치는 선택 문구용 기억 표현이며 실제 공방 UI 좌표 계약이 아니다.
- 선택 효과: `WORK_04_TELL_LOCATION = 지식 +1 / 독립성 +3`, `WORK_04_ASK_TOGETHER = 표현력 +1 / 협력 +3`.
