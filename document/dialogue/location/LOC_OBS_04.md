# LOC_OBS_04 · 빈 관측 칸

> 상태: **검수용 대화 마스터**  
> 장소: 별빛 천문대 · 관측 일기 4/4  
> 발생: `LOC_OBS_03` 이후 장소 방문 시 시스템 판정  
> 선택 화면: 1회 · 3지  
> 신규 이미지: 없음 · `ART-L01` 재사용

## 장면 목적

- 앞선 세 기록을 짧게 떠올린 뒤 과거 학생의 이야기를 더 캐지 않고 마무리한다.
- 플레이어가 자기 흔적을 하나 보태며 천문대 연속 이야기를 끝낸다.
- 자유 입력이나 신규 일기 페이지 이미지를 요구하지 않고 준비된 3개 표식 선택만 사용한다.

## 화자

- `PLAYER(BASE)`
- 화자 없는 일기 기록 `NARRATION`

## 이미지

- 기존 `BG05_starlight_observatory_1920x1080_015.png`
- `ART-L01` — OBS 01~03과 같은 오래된 관측 일기

## Sequence

### S1 · 마지막 기록

**LOC_OBS_04_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG05_starlight_observatory_1920x1080_015.png`

**LOC_OBS_04_S1_I02 · IMAGE / FOCUS SHOW**  
`ART-L01`

**LOC_OBS_04_S1_CX01 · CONTEXT / KEEP**  
이 일기에는 틀린 별자리, 늦은 관측, 말없이 놓인 차와 남겨 둔 자리 이야기가 이어져 있었다.

**LOC_OBS_04_S1_N01 · NARRATION / KEEP**  
이번에 펼친 마지막 쪽은 앞부분보다 글이 훨씬 적다.

**LOC_OBS_04_S1_L01 · DIALOGUE / PLAYER(BASE) / KEEP**  
“끝까지 다 쓴 건 아니었네.”

---

### S2 · 다음 사람에게

**LOC_OBS_04_S2_N01 · NARRATION / KEEP**  
빈 칸 위에는 짧은 문장이 하나 남아 있다.

**LOC_OBS_04_S2_N02 · NARRATION / KEEP**  
“다음에 이 일기를 보는 사람도 오늘 하늘에서 기억하고 싶은 모양 하나를 남겨 주면 좋겠다.”

**LOC_OBS_04_S2_T01 · THOUGHT / PLAYER / KEEP**  
앞의 기록처럼 거창한 답은 아니어도 되는 것 같다.

---

### S3 · 오늘의 표식

**LOC_OBS_04_S3_C01 · CHOICE · `LOC_OBS_04_MARK`**

- `LOC_OBS_04_STAR` — “작은 별 모양을 남길래.”
  - reaction / PLAYER(BASE): “오늘 천문대에서 본 것 중엔 역시 별이 제일 먼저 떠오른다.”
- `LOC_OBS_04_MOON` — “달 모양을 남길래.”
  - reaction / PLAYER(BASE): “별들 사이에 조용히 떠 있던 달도 기억하고 싶다.”
- `LOC_OBS_04_SPARKLE` — “반짝임 모양을 남길래.”
  - reaction / PLAYER(BASE): “정확한 모양보다 오늘 반짝였던 느낌을 남기고 싶다.”

**공통 합류**

**LOC_OBS_04_S3_N01 · NARRATION / KEEP**  
선택한 모양이 작은 기호로 빈 칸에 기록된다.

**LOC_OBS_04_S3_T01 · THOUGHT / PLAYER / KEEP**  
이제 이 일기에는 예전 학생의 기록과 오늘의 흔적이 함께 남았다.

**LOC_OBS_04_S3_N02 · NARRATION / KEEP**  
일기를 덮자 천문대 창밖의 별빛이 그대로 보인다.

**LOC_OBS_04_END · END**

## 검수 메모

- 선택한 표식은 완료 기록/UI 기호로 처리하며 신규 낙서 이미지·새 일기 페이지를 만들지 않는다.
- `STAR / MOON / SPARKLE` 어느 선택도 더 좋은 표식으로 취급하지 않는다.
- 과거 학생의 이름·정체·후속 비밀을 밝히지 않고 천문대 연속 이야기를 여기서 끝낸다.
- 선택 결과는 Production 기준 각각 `마법+호기심 / 지식+신중함 / 표현력+독립성`, 수치는 `+1 / +3`이다.
