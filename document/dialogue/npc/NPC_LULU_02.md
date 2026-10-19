# NPC_LULU_02 · 단추 보관하기

> 상태: **검수용 공통 대화 마스터**  
> 체인: LULU 2/4  
> 상대: `NPC:LULU`  
> 노출 시작: 25주차  
> 조건: 유리 온실·약초원 방문 결과 저장 후  
> 선택 화면: 1회 · 2지  
> 신규 이미지: `ART-N06`

## 장면 목적

- 루루가 플레이어를 먼저 알아보며 지난 단추 이야기를 이어 간다.
- 단추 주인을 찾는 별도 퀘스트를 만들지 않고, 찾을 수 있을 때까지 안전하게 보관하는 작은 결정을 한다.
- `잘 보이게 / 안전하게`를 서로 다른 보관 기준으로 다룬다.

## 이미지

| 용도 | 실제 연결 | 상태 | 미리보기 |
|---|---|---|---|
| 배경 | [`BG06_glass_greenhouse_1920x1080_016.png`](../../../asset/background/BG06_glass_greenhouse_1920x1080_016.png) | 현재 NPC Story DB의 `GH` 배경 | <img src="../../../asset/background/BG06_glass_greenhouse_1920x1080_016.png" width="240" alt="유리 온실"> |
| `ART-N06` · 열린 보물상자 | [`IT_focus_NPC_LULU_02_treasure_chest_02.png`](../../../asset/item/IT_focus_NPC_LULU_02_treasure_chest_02.png) | **채택·API 연결** | <img src="../../../asset/item/IT_focus_NPC_LULU_02_treasure_chest_02.png" width="220" alt="루루의 열린 보물상자"> |
| 루루 화자 초상 | `NPC:LULU portrait_asset_ref=NULL` | **현재 런타임 미연결** | 미리보기 없음 |

루루 의상 자원은 보유하고 있지만 회차별 배정이 미정이므로 특정 의상을 자동 연결하지 않는다.

## Sequence

### S1 · 먼저 다가오는 루루

**NPC_LULU_02_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG06_glass_greenhouse_1920x1080_016.png`

**NPC_LULU_02_S1_L01 · DIALOGUE / LULU / SPEAKER**  
“아! 단추 같이 봤던 친구다!”

**NPC_LULU_02_S1_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“그 단추 아직 가지고 있어?”

**NPC_LULU_02_S1_L03 · DIALOGUE / LULU / SPEAKER**  
“응. 그런데 생각해 보니까 누가 잃어버린 걸 수도 있잖아.”

### S2 · 루루의 보물상자

**NPC_LULU_02_S2_I01 · IMAGE / FOCUS SHOW**  
`ART-N06`

**NPC_LULU_02_S2_L01 · DIALOGUE / LULU / KEEP**  
“그래서 바로 내 보물이라고 하진 않고, 여기 잘 넣어 두려고.”

**NPC_LULU_02_S2_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“좋네. 나중에 주인을 알게 되면 꺼내 줄 수도 있겠다.”

**NPC_LULU_02_S2_L03 · DIALOGUE / LULU / KEEP**  
“응! 그런데 어디에 두면 좋을까? 위는 잘 보이고, 안쪽은 안 떨어질 것 같아.”

### S3 · 보관 위치

**NPC_LULU_02_S3_C01 · CHOICE · `NPC_LULU_02_STORE`**

- `LULU_02_VISIBLE` — “윗칸에 잘 보이게 두자.”
  - reaction / LULU: “좋아! 열 때마다 바로 보여서 잊지 않겠어.”
- `LULU_02_SAFE` — “안쪽에 안전하게 두자.”
  - reaction / LULU: “좋아! 굴러 나가지 않게 안쪽에 딱 넣어 둘게.”

**공통 합류**

**NPC_LULU_02_S3_N01 · NARRATION / KEEP**  
루루는 단추를 보물상자 안에 조심스럽게 넣는다.

**NPC_LULU_02_S3_L01 · DIALOGUE / LULU / KEEP**  
“됐다. 이제 잃어버릴 걱정은 없겠다.”

**NPC_LULU_02_S3_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“다음엔 상자 안에 뭐가 더 있는지도 보여 줘.”

**NPC_LULU_02_END · END**

## 검수 메모

- 단추 주인 찾기는 미해결 퀘스트로 만들지 않는다.
- `ART-N06`은 이후 LULU03~04에서 재사용한다.
- 선택 효과: `LULU_02_VISIBLE = 표현력 +1 / 솔직함 +3`, `LULU_02_SAFE = 솜씨 +1 / 책임 +3`.
