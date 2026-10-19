# LOC_OBS_02 · 늦은 관측

> 상태: **검수용 대화 마스터**  
> 장소: 별빛 천문대 · 관측 일기 2/4  
> 발생: `LOC_OBS_01` 이후 장소 방문 시 시스템 판정  
> 선택 화면: 1회 · 2지  
> 신규 이미지: 없음 · `ART-L01` 재사용

## 장면 목적

- 혼자 남은 관측 시간과 말없이 놓인 따뜻한 차를 통해 작은 배려의 여운을 보여 준다.
- 차를 둔 사람의 정체를 추적하지 않는다.
- 배려가 좋다는 교훈을 직접 말하지 않고 기록을 읽는 느낌으로 끝낸다.

## 화자

- `PLAYER(BASE)`
- 화자 없는 일기 기록 `NARRATION`

## 이미지

| 용도 | 실제 연결 | 상태 | 미리보기 |
|---|---|---|---|
| 배경 | [`BG05_starlight_observatory_1920x1080_015.png`](../../../asset/background/BG05_starlight_observatory_1920x1080_015.png) | 실제 파일·API 연결 가능 | <img src="../../../asset/background/BG05_starlight_observatory_1920x1080_015.png" width="240" alt="별빛 천문대"> |
| `ART-L01` 재사용 | [`IT_focus_LOC_OBS_01_observation_diary_03.png`](../../../asset/item/IT_focus_LOC_OBS_01_observation_diary_03.png) | **채택·API 연결** | <img src="../../../asset/item/IT_focus_LOC_OBS_01_observation_diary_03.png" width="220" alt="오래된 관측 일기"> |

## Sequence

### S1 · 늦어진 관측

**LOC_OBS_02_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG05_starlight_observatory_1920x1080_015.png`

**LOC_OBS_02_S1_I02 · IMAGE / FOCUS SHOW**  
`ART-L01`

**LOC_OBS_02_S1_CX01 · CONTEXT / KEEP**  
지난번에는 별자리를 자꾸 잘못 찾았던 첫 관측 기록을 읽었다.

**LOC_OBS_02_S1_N01 · NARRATION / KEEP**  
다음 기록에는 관측이 평소보다 늦게 끝난 날의 이야기가 적혀 있다.

**LOC_OBS_02_S1_N02 · NARRATION / KEEP**  
“다들 돌아가고 나니 천문대가 갑자기 너무 넓게 느껴졌다. 조금 어색해서 괜히 망원경만 다시 닦았다.”

**LOC_OBS_02_S1_T01 · THOUGHT / PLAYER / KEEP**  
혼자 남으니 익숙한 곳도 다르게 느껴졌나 보다.

---

### S2 · 옆자리의 차

**LOC_OBS_02_S2_N01 · NARRATION / KEEP**  
다음 줄에는 옆자리에 따뜻한 차 한 잔이 놓여 있었다고 적혀 있다.

**LOC_OBS_02_S2_L01 · DIALOGUE / PLAYER(BASE) / KEEP**  
“누가 두고 간 걸까?”

**LOC_OBS_02_S2_N02 · NARRATION / KEEP**  
“누가 놓았는지는 못 봤다. 그래도 컵이 따뜻해서 한동안 손을 올려 두고 있었다.”

**LOC_OBS_02_S2_T01 · THOUGHT / PLAYER / KEEP**  
말은 없어도 누군가 근처에 있었던 느낌이 들었겠다.

---

### S3 · 남은 마음

**LOC_OBS_02_S3_N01 · NARRATION / KEEP**  
마지막에는 “조금 전까지 낯설었는데, 차를 보고 나니 오늘 천문대가 덜 낯설게 느껴졌다.”라고 적혀 있다.

**LOC_OBS_02_S3_C01 · CHOICE · `LOC_OBS_02_FEELING`**

- `LOC_OBS_02_WARM` — “마음이 조금 따뜻해졌겠다.”
  - reaction / PLAYER(BASE): “작은 차 한 잔이어도 혼자라는 느낌은 많이 줄었을 것 같아.”
- `LOC_OBS_02_GRATEFUL` — “누군진 몰라도 참 고마웠겠다.”
  - reaction / PLAYER(BASE): “이름을 몰라도 고맙다는 마음은 오래 남을 수 있겠네.”

**공통 합류**

**LOC_OBS_02_S3_N02 · NARRATION / KEEP**  
기록에는 끝까지 차를 둔 사람이 누구였는지 적혀 있지 않다.

**LOC_OBS_02_S3_T01 · THOUGHT / PLAYER / KEEP**  
다음 기록에는 이 일이 다시 나올지도 모르겠다.

**LOC_OBS_02_END · END**

## 검수 메모

- 차를 둔 사람의 정체를 밝히거나 추리 선택지를 추가하지 않는다.
- `ART-L01`에 찻잔 자국이 실제로 보인다고 가정하지 않는다. 차 이야기는 기록 텍스트로만 전달한다.
- 선택 결과는 Production 기준 `WARM = 표현력 +1 / 공감 +5 / 협력 +2`, `GRATEFUL = 표현력 +1 / 협력 +5 / 공감 +2`다.
