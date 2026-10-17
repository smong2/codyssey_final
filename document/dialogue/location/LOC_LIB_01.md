# LOC_LIB_01 · 책 한 권 제자리 찾기

> 상태: **검수용 대화 마스터**  
> 장소: 대서고 · 독립 1회  
> 발생: 장소 방문 후 Location Story 시스템 판정  
> 선택 화면: 1회 · 2지  
> 신규 이미지: `ART-L04`

## 장면 목적

- 대서고의 평범한 정리 상황을 다루며 메인 룬 기록·비밀 문서와 연결하지 않는다.
- `같은 표식`과 `같은 주제`라는 서로 다른 분류 기준을 모두 그럴듯하게 보이게 한다.
- 세린은 전용 초상 없이 텍스트 화자로 등장할 수 있다.
- 독립 1회 장면이므로 `세린과 만남 → 제자리 잃은 책 확인 → 두 분류 기준 비교 → 정리 완료`까지 한 편 안에서 이해되게 한다.

## 화자

- `PLAYER(BASE)`
- `NPC:SERIN` — 학생 사서 세린, 전용 초상 없음

## 이미지

- 기존 `BG04_grand_library_1920x1080_014.png`
- `ART-L04` — 책장 위에 가로로 놓인 책 한 권

## Sequence

### S1 · 책장 사이의 목소리

**LOC_LIB_01_S1_I01 · IMAGE / BACKGROUND REPLACE**  
`BG04_grand_library_1920x1080_014.png`

**LOC_LIB_01_S1_N01 · NARRATION / NONE**  
대서고 한쪽에서 책 정리 소리가 들린다. 누군가 책장 사이를 빠르게 오가고 있다.

**LOC_LIB_01_S1_L01 · DIALOGUE / SERIN / SPEAKER**  
“안녕, 난 여기 학생 사서 세린이야.”

**LOC_LIB_01_S1_L02 · DIALOGUE / SERIN / SPEAKER**  
“지금 너무 바빠서 앞에서 제대로 인사해 주지 못해서 미안해. 반납된 책을 정리하고 있는데 한 권이 애매해서 말이야.”

**LOC_LIB_01_S1_L03 · DIALOGUE / PLAYER(BASE) / NONE**  
“어떤 책인데?”

**LOC_LIB_01_S1_I02 · IMAGE / FOCUS SHOW**  
`ART-L04`

**LOC_LIB_01_S1_N02 · NARRATION / KEEP**  
책장 위에 가로로 놓인 책 한 권이 보인다. 표지는 평범하고 작은 식별 표식이 붙어 있다.

**LOC_LIB_01_S1_L04 · DIALOGUE / SERIN / KEEP**  
“별 관측을 처음 배우는 사람용 책이야. 누가 찾다가 여기 올려 둔 것 같은데, 원래 자리 표시가 가려져서 바로는 모르겠어.”

---

### S2 · 어디에 두면 찾기 쉬울까

**LOC_LIB_01_S2_L01 · DIALOGUE / PLAYER(BASE) / KEEP**  
“표지에 붙은 이 작은 표식은 뭐야?”

**LOC_LIB_01_S2_L02 · DIALOGUE / SERIN / KEEP**  
“처음 읽는 사람용 책에 붙이는 표식이야. 저쪽 서가에 같은 표식 책들이 모여 있어.”

**LOC_LIB_01_S2_L03 · DIALOGUE / PLAYER(BASE) / KEEP**  
“그런데 제목은 전부 별 관측 이야기네.”

**LOC_LIB_01_S2_L04 · DIALOGUE / SERIN / KEEP**  
“맞아. 이쪽에는 관측 주제 책들이 모여 있고. 그래서 표식으로 찾는 사람과 주제로 찾는 사람, 둘 다 생각할 수 있어.”

**LOC_LIB_01_S2_T01 · THOUGHT / PLAYER / KEEP**  
어느 쪽에 둬도 이유가 있다. 누가 어떻게 찾을지를 생각해 보면 되겠다.

---

### S3 · 정리 기준을 고르다

**LOC_LIB_01_S3_L01 · DIALOGUE / SERIN / KEEP**  
“어느 쪽 기준으로 두는 게 찾기 쉬울까? 둘 다 이유는 있어 보여.”

**LOC_LIB_01_S3_C01 · CHOICE · `LOC_LIB_01_SHELF`**

- `LOC_LIB_01_SAME_MARK` — “같은 표식 책들 옆에 두는 게 찾기 쉬울 것 같아.”
  - reaction / 세린: “응. 표식을 보고 찾는 사람이라면 한눈에 같은 묶음인지 알 수 있겠네.”
- `LOC_LIB_01_SAME_TOPIC` — “같은 주제 책들 옆에 두는 게 찾기 쉬울 것 같아.”
  - reaction / 세린: “그것도 좋아. 비슷한 내용을 이어서 찾는 사람은 이쪽이 더 편하겠어.”

**공통 합류**

**LOC_LIB_01_S3_L02 · DIALOGUE / SERIN / KEEP**  
“좋아. 네가 말한 기준으로 주변 책들을 다시 보니까 이어지는 자리가 보이네. 거기에 맞춰 둘게.”

**LOC_LIB_01_S3_I01 · IMAGE / FOCUS HIDE**

**LOC_LIB_01_S3_N01 · NARRATION / NONE**  
책장 위에 가로로 놓여 있던 책이 보이지 않는다. 세린이 제자리에 정리한 모양이다.

---

### S4 · 제자리를 찾은 책

**LOC_LIB_01_S4_L01 · DIALOGUE / SERIN / SPEAKER**  
“됐다. 아까는 책 한 권만 따로 튀어나와 보여서 계속 마음에 걸렸거든.”

**LOC_LIB_01_S4_L02 · DIALOGUE / PLAYER(BASE) / NONE**  
“같은 책이어도 찾는 방법이 하나만 있는 건 아니네.”

**LOC_LIB_01_S4_L03 · DIALOGUE / SERIN / SPEAKER**  
“응. 그래서 서가를 정리할 때 가끔 이렇게 고민하게 돼. 그래도 지금은 다음 사람이 찾기 쉬울 것 같아.”

**LOC_LIB_01_S4_N01 · NARRATION / NONE**  
세린은 다시 반납된 책 더미 쪽으로 돌아간다. 조금 전 비어 있던 책장 위는 깔끔해져 있다.

**LOC_LIB_01_S4_L04 · DIALOGUE / SERIN / SPEAKER**  
“같이 봐줘서 고마워. 다음엔 앞에서 제대로 인사할게!”

**LOC_LIB_01_END · END**

## 검수 메모

- 세린은 `NPC:SERIN` 텍스트 화자로 사용하며 전용 캐릭터 이미지가 없어도 장면이 성립한다.
- 책의 내용은 평범한 별 관측 입문서 수준으로 두며 수호 룬·비밀 자료를 추가하지 않는다.
- `SAME_MARK / SAME_TOPIC`은 서로 다른 분류 기준일 뿐 정답/오답이 아니다.
- 선택 후 `ART-L04`를 숨기고 새 책장·꽂힌 책 이미지를 요구하지 않는다.
- 세린과 플레이어가 두 기준을 실제 대화로 비교하게 해 선택 이유를 이해할 수 있게 하되, 분류 원리를 교육 문장처럼 설명하지 않는다.
- 선택 결과는 Production 기준 `SAME_MARK = 지식 +1 / 신중함 +3`, `SAME_TOPIC = 지식 +1 / 호기심 +3`이다.
