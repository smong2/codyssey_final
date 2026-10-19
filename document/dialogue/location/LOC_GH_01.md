# LOC_GH_01 · 시든 화분 돌보기

> 상태: **검수용 대화 마스터**  
> 장소: 유리 온실 · 독립 1회  
> 발생: 장소 방문 후 Location Story 시스템 판정  
> 선택 화면: 1회 · 2지  
> 신규 이미지: `ART-L02`, `ART-L03`

## 장면 목적

- 메인 `MS02`의 마법 덩굴과 무관한 평범한 허브 화분의 일상 변화를 다룬다.
- 플레이어가 직접 물을 붓거나 화분을 옮기는 조작을 하지 않고, 돌봄 방법을 말로 제안한다.
- `물을 조금 주기`와 `밝은 자리로 옮기고 살피기`를 모두 자연스러운 접근으로 유지한다.
- 독립 1회 장면이므로 `발견 → 함께 관찰 → 방법 선택 → 며칠 뒤 회복 확인`까지 한 편 안에서 완결한다.

## 화자

- `PLAYER(BASE)`
- `ROLE:LOC_GREENHOUSE_STUDENT` — 마스터 기준 요한

## 이미지

| 용도 | 연결 | 상태 | 미리보기 |
|---|---|---|---|
| 배경 | [`BG06_glass_greenhouse_1920x1080_016.png`](../../../asset/background/BG06_glass_greenhouse_1920x1080_016.png) | 실제 파일·API 연결 가능 | <img src="../../../asset/background/BG06_glass_greenhouse_1920x1080_016.png" width="240" alt="유리 온실"> |
| `ART-L02` · 시든 작은 허브 화분 | 예약 파일 `IT_focus_LOC_GH_01_wilted_pot_01.png` | **예약·미납**; 기존 시든 화분 카드는 후보 | 미리보기 없음 |
| `ART-L03` · 같은 화분의 건강한 상태 | 예약 파일 `IT_focus_LOC_GH_01_restored_pot_02.png` | **예약·미납**; 기존 회복 화분 카드는 후보 | 미리보기 없음 |

현재 서버는 `LOC_GH_01`의 두 FOCUS가 미납인 동안 해당 IMAGE 명령을 `HIDE`로 처리해 장면 진행을 막지 않는다. `IT_card_candidate_GH_wilted_plant_01.png` / `IT_card_candidate_GH_restored_plant_02.png`는 승인 FOCUS가 아니므로 연결하지 않는다.

마스터 기본 화자는 요한이며 실제 회차는 캐스팅 규칙에 따라 하젤 등이 배정될 수 있다.

| 배역 예시 | 실제 파일 | 미리보기 |
|---|---|---|
| 기본 요한 `CH19` | [`johan0_fullbody.png`](../../../asset/character/johan0_fullbody.png) | <img src="../../../asset/character/johan0_fullbody.png" width="90" alt="요한 전신"> |
| 대체 예시 하젤 `CH20` | [`hazel0_fullbody.png`](../../../asset/character/hazel0_fullbody.png) | <img src="../../../asset/character/hazel0_fullbody.png" width="90" alt="하젤 전신"> |

## Sequence

### S1 · 어제와 다른 화분

**LOC_GH_01_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG06_glass_greenhouse_1920x1080_016.png`

**LOC_GH_01_S1_N01 · NARRATION / NONE**  
온실 한쪽 선반에서 작은 허브 화분 하나가 다른 화분보다 축 처져 있다.

**LOC_GH_01_S1_L01 · DIALOGUE / LOC_GREENHOUSE_STUDENT / SPEAKER**  
“잠깐 이것 좀 같이 봐줄래? 어제 정리할 때는 멀쩡했는데 오늘 아침부터 잎이 축 처졌어.”

**LOC_GH_01_S1_I02 · IMAGE / FOCUS SHOW**  
`ART-L02`

**LOC_GH_01_S1_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“하루 사이에 이렇게 달라졌어?”

**LOC_GH_01_S1_L03 · DIALOGUE / LOC_GREENHOUSE_STUDENT / KEEP**  
“응. 아픈 식물은 아닌 것 같아. 며칠 동안 햇빛이 약했고, 물 주는 시간도 조금 엇갈렸거든.”

---

### S2 · 두 가지 단서

**LOC_GH_01_S2_N01 · NARRATION / KEEP**  
화분의 흙은 겉이 조금 말라 있고, 옆의 큰 잎이 창가에서 들어오는 빛을 일부 가리고 있다.

**LOC_GH_01_S2_L01 · DIALOGUE / PLAYER(BASE) / KEEP**  
“물도 조금 부족해 보이고, 빛도 전보다 덜 받는 것 같아.”

**LOC_GH_01_S2_L02 · DIALOGUE / LOC_GREENHOUSE_STUDENT / KEEP**  
“나도 둘 다 신경 쓰였어. 한꺼번에 이것저것 바꾸기보다 하나부터 해 보고 잎을 살펴볼까?”

**LOC_GH_01_S2_T01 · THOUGHT / PLAYER / KEEP**  
둘 다 해볼 만한 방법이다. 먼저 무엇을 바꿀지만 정하면 될 것 같다.

---

### S3 · 먼저 해 볼 일

**LOC_GH_01_S3_C01 · CHOICE · `LOC_GH_01_CARE`**

- `LOC_GH_01_WATER` — “지금 물을 조금만 주고 지켜보자.”
  - reaction / 온실 학생: “좋아. 흙이 촉촉해지는 정도만 챙기고, 잎이 어떻게 변하는지 볼게.”
- `LOC_GH_01_MOVE_AND_WATCH` — “조금 더 밝은 자리로 옮기고 살펴보자.”
  - reaction / 온실 학생: “좋아. 햇빛이 너무 세지 않은 자리로 옮기고, 잎이 어떻게 변하는지 볼게.”

**공통 합류**

**LOC_GH_01_S3_L01 · DIALOGUE / LOC_GREENHOUSE_STUDENT / KEEP**  
“그럼 오늘은 먼저 그 방법부터 해 볼게. 바로 달라지지 않아도 조금 기다려 보자.”

**LOC_GH_01_S3_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“응. 내일 잎이 어떻게 됐는지 보면 다음에 뭘 할지도 알 수 있겠다.”

**LOC_GH_01_S3_N01 · NARRATION / KEEP**  
그 뒤로 온실 학생은 화분 상태를 보며 물과 햇빛을 조금씩 조절한다.

---

### S4 · 다시 선 잎

**LOC_GH_01_S4_I01 · IMAGE / FOCUS REPLACE**  
`ART-L03`

**LOC_GH_01_S4_N01 · NARRATION / KEEP**  
며칠이 지난 뒤, 축 처졌던 잎이 다시 위로 올라와 있다.

**LOC_GH_01_S4_L01 · DIALOGUE / LOC_GREENHOUSE_STUDENT / KEEP**  
“봐, 잎이 다시 섰어. 처음엔 빨리 뭐라도 더 해야 하나 했는데, 상태를 보면서 천천히 챙기길 잘했어.”

**LOC_GH_01_S4_L02 · DIALOGUE / PLAYER(BASE) / KEEP**  
“이제 옆 화분들이랑 다시 비슷해 보인다.”

**LOC_GH_01_S4_L03 · DIALOGUE / LOC_GREENHOUSE_STUDENT / KEEP**  
“응. 같이 살펴봐 줘서 고마워. 다음엔 이렇게 축 처지기 전에 내가 먼저 알아볼게.”

**LOC_GH_01_END · END**

## 검수 메모

- 메인 덩굴 사건과 연결하거나 `MS02` 해법을 다시 가르치지 않는다.
- 선택 직후 실제 조작 장면을 만들지 않고 NPC의 돌봄과 짧은 시간 전환으로 결과를 보여 준다.
- `ART-L02 → ART-L03`는 같은 화분·같은 시점의 상태 변화다.
- 물 부족과 빛 부족의 두 단서를 함께 보여 주어 어느 선택도 정답처럼 보이지 않게 한다.
- `LOC_GREENHOUSE_STUDENT`는 주인공과 `MAIN_GREENHOUSE_STUDENT`를 피하는 별도 회차 캐스팅을 사용한다.
- 선택 결과는 Production 기준 `WATER = 솜씨 +1 / 책임 +5 / 용기 +2`, `MOVE_AND_WATCH = 지식 +1 / 신중함 +5 / 책임 +2`다.
