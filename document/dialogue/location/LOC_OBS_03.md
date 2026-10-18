# LOC_OBS_03 · 자리 맡아 주기

> 상태: **검수용 대화 마스터**  
> 장소: 별빛 천문대 · 관측 일기 3/4  
> 발생: `LOC_OBS_02` 이후 장소 방문 시 시스템 판정  
> 선택 화면: 1회 · 2지  
> 신규 이미지: 없음 · `ART-L01` 재사용

## 장면 목적

- 앞 회차의 따뜻한 차를 기억하는 기록에서 자연스럽게 이어진다.
- 직접 고맙다고 말하는 것만이 유일한 표현 방식은 아니라는 점을 행동으로 보여 준다.
- 과거 학생이나 차를 둔 친구의 정체를 밝히지 않는다.

## 화자

- `PLAYER(BASE)`
- 화자 없는 일기 기록 `NARRATION`

## 이미지

- 기존 `BG05_starlight_observatory_1920x1080_015.png`
- `ART-L01` — 동일한 관측 일기 이미지 재사용

## Sequence

### S1 · 다시 나온 차 이야기

**LOC_OBS_03_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG05_starlight_observatory_1920x1080_015.png`

**LOC_OBS_03_S1_I02 · IMAGE / FOCUS SHOW**  
`ART-L01`

**LOC_OBS_03_S1_CX01 · CONTEXT / KEEP**  
지난 기록에서는 늦은 관측 뒤 누군가 말없이 따뜻한 차를 두고 갔다.

**LOC_OBS_03_S1_N01 · NARRATION / KEEP**  
새 기록의 첫 줄에는 “그날의 차가 자꾸 생각났다.”라고 적혀 있다.

**LOC_OBS_03_S1_L01 · DIALOGUE / PLAYER(BASE) / KEEP**  
“아직도 기억하고 있었네.”

---

### S2 · 남겨 둔 자리

**LOC_OBS_03_S2_N01 · NARRATION / KEEP**  
“고맙다고 바로 말하진 못했다. 대신 다음 관측 날, 창가에서 잘 보이는 자리를 하나 비워 뒀다.”

**LOC_OBS_03_S2_T01 · THOUGHT / PLAYER / KEEP**  
누가 올지 알고 자리를 남겨 둔 것 같다.

**LOC_OBS_03_S2_N02 · NARRATION / KEEP**  
“그 친구가 와서 그 자리에 앉았지만, 우리 둘 다 차 이야기는 하지 않았다.”

**LOC_OBS_03_S2_L01 · DIALOGUE / PLAYER(BASE) / KEEP**  
“그래도 서로 알아본 것 같은데.”

---

### S3 · 말하지 않은 답

**LOC_OBS_03_S3_N01 · NARRATION / KEEP**  
기록 끝에는 “말하지 않아도 전해지는 게 가끔 있나 보다.”라는 짧은 문장이 남아 있다.

**LOC_OBS_03_S3_C01 · CHOICE · `LOC_OBS_03_RESPONSE`**

- `LOC_OBS_03_HAPPY` — “친구도 그 자리를 보고 기뻤겠다.”
  - reaction / PLAYER(BASE): “자기 자리를 기억해 줬다는 게 꽤 반가웠을 것 같아.”
- `LOC_OBS_03_LEAVE_SEAT` — “나도 좋은 자리를 하나 남겨 주고 싶다.”
  - reaction / PLAYER(BASE): “누군가 편하게 볼 수 있는 자리를 기억해 두면 좋겠네.”

**공통 합류**

**LOC_OBS_03_S3_N02 · NARRATION / KEEP**  
그 뒤로는 두 사람이 어떤 말을 나눴는지 적혀 있지 않다.

**LOC_OBS_03_S3_T01 · THOUGHT / PLAYER / KEEP**  
이 일기는 큰 사건보다 이런 작은 일을 더 오래 적어 둔 것 같다.

**LOC_OBS_03_END · END**

## 검수 메모

- `친구가 기뻤겠다`와 `나도 자리를 남기고 싶다`를 감정/행동의 서로 다른 자연스러운 반응으로 유지한다.
- 자리표나 별표 이미지를 별도로 요구하지 않는다. `ART-L01` 한 장만 재사용한다.
- 선택 결과는 Production 기준 `HAPPY = 표현력 +1 / 공감 +5 / 협력 +2`, `LEAVE_SEAT = 표현력 +1 / 협력 +5 / 책임 +2`다.
