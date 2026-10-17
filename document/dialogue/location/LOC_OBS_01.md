# LOC_OBS_01 · 틀린 별자리

> 상태: **검수용 대화 마스터**  
> 장소: 별빛 천문대 · 관측 일기 1/4  
> 발생: 장소 방문 후 Location Story 시스템 판정  
> 선택 화면: 1회 · 2지  
> 신규 이미지: `ART-L01`

## 장면 목적

- 과거 학생의 서툰 첫 관측을 가볍고 친근하게 보여 준다.
- 실수를 놀리거나 교훈으로 평가하지 않고 다음 기록이 궁금해지는 정도의 여운만 남긴다.
- 과거 학생의 이름·정체·메인 룬 단서를 만들지 않는다.

## 화자

- `PLAYER(BASE)`
- 화자 없는 일기 기록 `NARRATION`

## 이미지

- 기존 `BG05_starlight_observatory_1920x1080_015.png`
- `ART-L01` — 오래된 관측 일기. 이후 OBS 02~04에서도 같은 이미지 재사용

## Sequence

### S1 · 오래된 일기

**LOC_OBS_01_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG05_starlight_observatory_1920x1080_015.png`

**LOC_OBS_01_S1_N01 · NARRATION / NONE**  
천문대 한쪽 관측대 옆에 오래된 일기 한 권이 펼쳐져 있다.

**LOC_OBS_01_S1_I02 · IMAGE / FOCUS SHOW**  
`ART-L01`

**LOC_OBS_01_S1_N02 · NARRATION / KEEP**  
첫 기록에는 별자리를 직접 찾아보기로 한 날의 이야기가 적혀 있다.

**LOC_OBS_01_S1_T01 · THOUGHT / PLAYER / KEEP**  
누가 쓴 건지는 모르지만, 처음 관측하던 날을 적어 둔 것 같다.

---

### S2 · 자꾸 틀린 별

**LOC_OBS_01_S2_N01 · NARRATION / KEEP**  
“저 별이라고 생각해서 손가락으로 가리켰는데 또 아니었다. 세 번이나 다른 별을 찾았다.”

**LOC_OBS_01_S2_L01 · DIALOGUE / PLAYER(BASE) / KEEP**  
“처음 보면 비슷해 보이는 별이 많았나 봐.”

**LOC_OBS_01_S2_N02 · NARRATION / KEEP**  
기록은 틀릴 때마다 다시 하늘을 올려다봤다고 이어진다.

**LOC_OBS_01_S2_T01 · THOUGHT / PLAYER / KEEP**  
그래도 관측을 그만두진 않았네.

---

### S3 · 엉뚱한 낙서

**LOC_OBS_01_S3_N01 · NARRATION / KEEP**  
마지막에는 “오늘 찾은 별들을 이어 그렸더니 원래 별자리와 전혀 다른 모양이 됐다.”라는 문장이 적혀 있다.

**LOC_OBS_01_S3_C01 · CHOICE · `LOC_OBS_01_REACTION`**

- `LOC_OBS_01_CUTE` — “그 낙서, 왠지 귀여웠을 것 같아.”
  - reaction / PLAYER(BASE): “틀린 모양이어도 그날을 기억하기엔 딱 좋았겠다.”
- `LOC_OBS_01_ME_TOO` — “나도 처음 보면 헷갈릴 것 같아.”
  - reaction / PLAYER(BASE): “몇 번은 다른 별을 가리켜 봐야 눈에 익을지도 모르겠네.”

**공통 합류**

**LOC_OBS_01_S3_N02 · NARRATION / KEEP**  
기록은 틀린 별자리 이야기를 지우지 않은 채 그대로 끝난다.

**LOC_OBS_01_S3_T01 · THOUGHT / PLAYER / KEEP**  
다음 장에는 어떤 관측이 적혀 있을까.

**LOC_OBS_01_END · END**

## 검수 메모

- `ART-L01` 자체에 별 낙서가 실제로 그려져 있다고 가정하지 않는다. 낙서 내용은 대사창의 기록으로만 전달한다.
- `CUTE / ME_TOO` 어느 선택도 과거 학생을 평가하거나 놀리는 방향으로 쓰지 않는다.
- 선택 결과는 Production 기준 `표현력 +1`과 각각 `공감 +3 / 솔직함 +3`이며 대사에는 수치를 표시하지 않는다.
