# NPC_LULU_04 · 새 발견 함께 보기

> 상태: **검수용 공통 대화 마스터**  
> 체인: LULU 4/4  
> 상대: `NPC:LULU`  
> 노출 시작: 48주차  
> 조건: 유리 온실·약초원 방문 결과 저장 후  
> 선택 화면: 1회 · 2지  
> 신규 이미지: 없음 · `ART-N06` 재사용

## 장면 목적

- 마지막 만남에서 루루가 먼저 플레이어를 기다린 듯한 친근함을 보여 준다.
- 깃털과 단풍 씨앗은 대사로만 소개하고 새 소품 이미지를 만들지 않는다.
- 관계 마무리는 `친구가 됐다`고 설명하지 않고 서로 발견을 보여 주는 게 자연스러워진 모습으로 끝낸다.

## 이미지

| 용도 | 실제 연결 | 상태 | 미리보기 |
|---|---|---|---|
| 배경 | [`BG06_glass_greenhouse_1920x1080_016.png`](../../../asset/background/BG06_glass_greenhouse_1920x1080_016.png) | 현재 NPC Story DB의 `GH` 배경 | <img src="../../../asset/background/BG06_glass_greenhouse_1920x1080_016.png" width="240" alt="유리 온실"> |
| `ART-N06` 재사용 | [`IT_focus_NPC_LULU_02_treasure_chest_02.png`](../../../asset/item/IT_focus_NPC_LULU_02_treasure_chest_02.png) | **채택·API 연결** | <img src="../../../asset/item/IT_focus_NPC_LULU_02_treasure_chest_02.png" width="220" alt="루루의 열린 보물상자"> |
| 루루 화자 초상 | `NPC:LULU portrait_asset_ref=NULL` | **현재 런타임 미연결** | 미리보기 없음 |

깃털·단풍 씨앗은 새 FOCUS를 만들지 않는 Production 범위이므로 `ART-N06` 보물상자만 재사용한다.

## Sequence

### S1 · 오늘도 먼저 보여 주기

**NPC_LULU_04_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG06_glass_greenhouse_1920x1080_016.png`

**NPC_LULU_04_S1_L01 · DIALOGUE / LULU / SPEAKER**  
“왔다! 오늘도 네가 재미있어할 것 같은 걸 챙겨 뒀어.”

**NPC_LULU_04_S1_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“이제 내가 뭘 좋아할지 꽤 잘 아는 것 같은데?”

**NPC_LULU_04_S1_L03 · DIALOGUE / LULU / SPEAKER**  
“몇 번이나 같이 봤잖아. 보면 생각나는 게 생기는 거지!”

### S2 · 새로 들어온 두 가지

**NPC_LULU_04_S2_I01 · IMAGE / FOCUS SHOW**  
`ART-N06`

**NPC_LULU_04_S2_L01 · DIALOGUE / LULU / KEEP**  
“이번엔 가볍고 부드러운 깃털 하나랑, 빙글빙글 돌면서 떨어지는 단풍 씨앗이 있어.”

**NPC_LULU_04_S2_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“둘 다 움직이는 모습이 재미있겠다.”

**NPC_LULU_04_S2_L03 · DIALOGUE / LULU / KEEP**  
“그치? 그래서 둘 중 뭐가 더 기억에 남는지 궁금해.”

### S3 · 오늘 기억에 남는 것

**NPC_LULU_04_S3_C01 · CHOICE · `NPC_LULU_04_FAVORITE`**

- `LULU_04_FEATHER` — “나는 가볍게 흔들리는 깃털이 더 기억에 남아.”
  - reaction / LULU: “나도 바람 불 때 움직이는 걸 계속 보게 되더라!”
- `LULU_04_SEED` — “나는 빙글빙글 도는 씨앗이 더 기억에 남아.”
  - reaction / LULU: “맞아! 떨어질 때마다 방향이 달라져서 계속 보게 돼.”

**공통 합류**

**NPC_LULU_04_S3_L01 · DIALOGUE / LULU / KEEP**  
“다음에 또 신기한 걸 찾으면 나 혼자만 보진 않을래.”

**NPC_LULU_04_S3_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“응. 나도 재미있는 걸 보면 네 생각이 날 것 같아.”

**NPC_LULU_04_S3_L03 · DIALOGUE / LULU / SPEAKER**  
“좋아! 그럼 각자 찾다가, 또 만나면 서로 보여 주자.”

**NPC_LULU_04_END · END**

## 검수 메모

- LULU 체인은 여기서 끝난다. 5회차나 체인 완료 후 전용 반복 대사를 추가하지 않는다.
- 깃털·단풍 씨앗은 별도 아이템 ID나 영구 수집품으로 만들지 않는다.
- 선택 효과: `LULU_04_FEATHER = 탐험 +1 / 호기심 +3`, `LULU_04_SEED = 지식 +1 / 호기심 +3`.
