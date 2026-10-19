# NPC_LULU_01 · 단추 발견

> 상태: **검수용 공통 대화 마스터**  
> 체인: LULU 1/4  
> 상대: `NPC:LULU`  
> 노출 시작: 12주차  
> 조건: 유리 온실·약초원 방문 결과 저장 후  
> 선택 화면: 1회 · 2지  
> 신규 이미지: `ART-N05`

## 장면 목적

- 루루의 첫인상을 `작은 물건을 발견하면 신나게 살펴보는 다람쥐`로 보여 준다.
- 단추 무늬를 함께 바라보는 짧은 대화로 수집 취향을 자연스럽게 소개한다.
- 별/동그라미 어느 해석도 정답으로 만들지 않는다.

## 이미지

| 용도 | 연결 | 상태 | 미리보기 |
|---|---|---|---|
| 배경 | [`BG06_glass_greenhouse_1920x1080_016.png`](../../../asset/background/BG06_glass_greenhouse_1920x1080_016.png) | 현재 NPC Story DB의 `GH` 배경 | <img src="../../../asset/background/BG06_glass_greenhouse_1920x1080_016.png" width="240" alt="유리 온실"> |
| `ART-N05` · 손 위의 무늬 단추 | 예약 파일 `IT_focus_NPC_LULU_01_patterned_button_01.png` | **예약·미납** | 미리보기 없음 |
| 루루 화자 초상 | `NPC:LULU portrait_asset_ref=NULL` | **현재 런타임 미연결** | 미리보기 없음 |

`asset/pet/`에는 루루 의상 3세트가 존재하지만 스토리 회차와 의상 번호의 대응은 확정되지 않았다. 따라서 이 문서에서는 특정 의상 이미지를 대화 초상으로 임의 연결하지 않는다.

## Sequence

### S1 · 반짝이는 작은 것

**NPC_LULU_01_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG06_glass_greenhouse_1920x1080_016.png`

**NPC_LULU_01_S1_N01 · NARRATION / NONE**  
온실 가장자리에서 작은 다람쥐가 무언가를 앞발 위에 올려놓고 들여다보고 있다.

**NPC_LULU_01_S1_L01 · DIALOGUE / LULU / SPEAKER**  
“찾았다! 반짝이는 작은 보물!”

**NPC_LULU_01_S1_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“그게 뭐야?”

**NPC_LULU_01_S1_I02 · IMAGE / FOCUS SHOW**  
`ART-N05`

**NPC_LULU_01_S1_L03 · DIALOGUE / LULU / KEEP**  
“단추야. 그런데 그냥 단추가 아니야. 여기 무늬가 있어!”

### S2 · 루루의 보물 기준

**NPC_LULU_01_S2_L01 · DIALOGUE / PLAYER(BASE) / KEEP**  
“작은 물건을 모으는 걸 좋아해?”

**NPC_LULU_01_S2_L02 · DIALOGUE / LULU / KEEP**  
“응! 반짝이거나, 바스락거리거나, 모양이 재미있으면 한 번 더 봐.”

### S3 · 어떤 무늬일까

**NPC_LULU_01_S3_C01 · CHOICE · `NPC_LULU_01_PATTERN`**

- `LULU_01_STAR` — “나는 작은 별처럼 보여.”
  - reaction / LULU: “별 단추! 그러고 보니 뾰족한 데가 반짝반짝해!”
- `LULU_01_ROUND` — “나는 동그란 무늬처럼 보여.”
  - reaction / LULU: “동그란 단추! 빙글빙글 돌리면 더 그렇게 보여!”

**공통 합류**

**NPC_LULU_01_S3_L01 · DIALOGUE / LULU / KEEP**  
“어느 쪽이든 마음에 들어. 오늘 찾은 건 잘 기억해 둘래.”

**NPC_LULU_01_S3_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“잃어버리지 않게 잘 챙겨.”

**NPC_LULU_01_S3_L03 · DIALOGUE / LULU / SPEAKER**  
“응! 그리고 너도 기억할게. 다음에 또 만나면 먼저 부를 거야.”

**NPC_LULU_01_END · END**

## 검수 메모

- 루루는 펫이 아니라 별도 동물 NPC다.
- 루루 화자 초상은 `asset/pet/`의 실제 NPC_LULU 자산 중 최종 채택본을 서버가 해석하고, 이 원고에서는 의상 번호를 확정하지 않는다.
- 선택 효과: `LULU_01_STAR = 마법 +1 / 호기심 +3`, `LULU_01_ROUND = 탐험 +1 / 호기심 +3`.
