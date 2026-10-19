# NPC_GUIDE_01 · 안내지 줍기

> 상태: **검수용 공통 대화 마스터**  
> 체인: GUIDE 1/4  
> 기본 상대: 티아 `CH16`  
> 대체: 주인공이 티아면 로빈 `CH15`  
> 노출 시작: 4주차  
> 선택 화면: 1회 · 2지  
> 신규 이미지: `ART-N01`

## 장면 목적

- 처음 만난 GUIDE 상대와 작은 일을 자연스럽게 같이 한다.
- 바람에 흩어진 안내지를 정리하는 단순한 사건으로 첫 인상을 만든다.
- 플레이어가 장난스럽게 반응해도, 바로 돕자고 해도 모두 같은 협력으로 이어진다.

## 화자

- `PLAYER(BASE)`
- `ROLE:NPC_GUIDE_ACTOR` — 기본 티아

## 이미지

| 용도 | 실제 연결 | 상태 | 미리보기 |
|---|---|---|---|
| 배경 | [`BG02_clocktower_plaza_1920x1080_011.png`](../../../asset/background/BG02_clocktower_plaza_1920x1080_011.png) | 실제 파일·API 연결 가능 | <img src="../../../asset/background/BG02_clocktower_plaza_1920x1080_011.png" width="240" alt="시계탑 광장"> |
| `ART-N01` · 모임 안내지 | [`IT_focus_NPC_GUIDE_01_meeting_notices_01.png`](../../../asset/item/IT_focus_NPC_GUIDE_01_meeting_notices_01.png) | **채택·API 연결** | <img src="../../../asset/item/IT_focus_NPC_GUIDE_01_meeting_notices_01.png" width="220" alt="바람에 흩어진 모임 안내지"> |

`NPC_GUIDE_ACTOR`는 기본 티아, 주인공이 티아일 때 로빈이다.

| 배역 | 실제 파일 | 미리보기 |
|---|---|---|
| 기본 티아 `CH16` | [`tia0_fullbody.png`](../../../asset/character/tia0_fullbody.png) | <img src="../../../asset/character/tia0_fullbody.png" width="90" alt="티아 전신"> |
| 대체 로빈 `CH15` | [`robin0_fullbody.png`](../../../asset/character/robin0_fullbody.png) | <img src="../../../asset/character/robin0_fullbody.png" width="90" alt="로빈 전신"> |

## Sequence

### S1 · 바람에 날린 안내지

**NPC_GUIDE_01_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG02_clocktower_plaza_1920x1080_011.png`

**NPC_GUIDE_01_S1_N01 · NARRATION / NONE**  
시계탑 광장을 지나는데 종이 몇 장이 바닥을 미끄러지듯 날아간다.

**NPC_GUIDE_01_S1_L01 · DIALOGUE / NPC_GUIDE_ACTOR / SPEAKER**  
“앗, 잠깐! 저쪽으로 또 날아간다!”

**NPC_GUIDE_01_S1_I02 · IMAGE / FOCUS SHOW**  
`ART-N01`

**NPC_GUIDE_01_S1_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“이 안내지들 네 거야?”

**NPC_GUIDE_01_S1_L03 · DIALOGUE / NPC_GUIDE_ACTOR / KEEP**  
“응. 작은 모임 안내지인데, 바람이 갑자기 세게 불어서 몽땅 흩어졌어.”

---

### S2 · 어디부터 챙길까

**NPC_GUIDE_01_S2_N01 · NARRATION / KEEP**  
안내지는 계단 쪽과 광장 난간 쪽으로 나뉘어 흩어져 있다.

**NPC_GUIDE_01_S2_L01 · DIALOGUE / NPC_GUIDE_ACTOR / KEEP**  
“혼자 뛰어다니면 또 놓칠 것 같아. 잠깐 같이 봐줄래?”

**NPC_GUIDE_01_S2_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“응. 금방 모을 수 있을 것 같아.”

---

### S3 · 첫 선택

**NPC_GUIDE_01_S3_C01 · CHOICE · `NPC_GUIDE_01_RESPONSE`**

- `GUIDE_01_JOKE` — “오늘 바람이 안내지를 읽고 싶었나 봐.”
  - reaction / GUIDE: “그러게! 너무 열심히 가져가려 해서 문제네.”
- `GUIDE_01_HELP` — “같이 정리하자. 난 이쪽부터 볼게.”
  - reaction / GUIDE: “좋아! 그럼 난 반대쪽부터 챙길게.”

**공통 합류**

**NPC_GUIDE_01_S3_N01 · NARRATION / KEEP**  
잠시 뒤 바닥에 흩어졌던 안내지가 한데 모인다.

**NPC_GUIDE_01_S3_L01 · DIALOGUE / NPC_GUIDE_ACTOR / SPEAKER**  
“다 모였다! 혼자였으면 한참 걸렸겠다.”

**NPC_GUIDE_01_S3_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“다음엔 바람 불기 전에 꼭 잡고 있어.”

**NPC_GUIDE_01_S3_L03 · DIALOGUE / NPC_GUIDE_ACTOR / SPEAKER**  
“명심할게. 다음에 만나면 내가 먼저 알아볼 수 있을 것 같아!”

**NPC_GUIDE_01_END · END**

## 검수 메모

- 티아 버전은 밝고 사람 중심의 반응을 사용한다.
- CH16 주인공 세트에서는 GUIDE 화자를 로빈으로 바꾸고 더 짧고 빠른 농담·행동형 반응으로 수정한다.
- 선택 효과: `GUIDE_01_JOKE = 표현력 +1 / 솔직함 +3`, `GUIDE_01_HELP = 솜씨 +1 / 협력 +3`.
