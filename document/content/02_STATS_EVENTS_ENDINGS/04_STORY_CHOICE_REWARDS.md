# Story 선택 스탯 보상·결과 공개 규칙

> 상태: **Main / NPC / Location Story 77개 canonical choice 스탯 결과 확정**  
> 대상: `MS01~MS06`, `NPC_GUIDE / NPC_WORK / NPC_LULU`, 활성 Location Story 6개  
> DB 원본: 각 Production 문서의 선택 결과 표 → `story_choice_effects`

## 1. 목적

스토리 대화의 선택이 플레이 스타일을 충분히 기록하면서도, 플레이어가 스탯 효율을 보고 대사를 공략하지 않도록 선택 보상과 결과 공개 방식을 통일한다.

현재 본편의 canonical 선택지는 총 **77개**다.

| Story 유형 | canonical choice | 선택 보상 기본값 |
|---|---:|---|
| Main | 40 | Visible `+2` + Primary Hidden `+8` + 일부 Secondary `+3` |
| NPC | 24 | Visible `+1` + Primary Hidden `+5` + 일부 Secondary `+2` |
| Location | 13 | Visible `+1` + Primary Hidden `+5` + 일부 Secondary `+2` |
| **합계** | **77** | 모든 선택에 Visible + Primary Hidden 존재 |

선택별 정확한 대상 스탯은 다음 문서가 canonical 원본이다.

- `story/main/MAIN_STORY_PRODUCTION.md` — Main 40개
- `story/npc/NPC_STORY_PRODUCTION.md` — NPC 24개
- `story/location/LOCATION_STORY_PRODUCTION.md` — Location 13개

이 문서는 세 Production의 공통 적용·공개·DB 규칙을 정의한다.

---

## 2. 선택 순간에는 스탯 정보를 공개하지 않는다

선택 UI에는 플레이어가 실제로 말하거나 행동할 문구만 표시한다.

```text
어떻게 할까?

[확인한 사실을 모두에게 먼저 알린다]
[가까운 친구부터 차례로 알린다]
```

다음 정보는 선택 버튼에 표시하지 않는다.

- `표현력 +2`
- `솔직함 +8`
- `용기 +3`
- 스탯 아이콘
- 어떤 선택이 더 큰 보상을 주는지 추측할 수 있는 등급·색상

이유는 선택을 **대사의 의미와 플레이 스타일**로 고르게 하기 위함이다. 다음 플레이에서 특정 스탯을 얻기 위해 대사를 암기하는 구조를 만들지 않는다.

---

## 3. 한 선택의 효과 구조

Story choice 한 개는 아래 구조를 사용한다.

```text
VISIBLE_STAT 1종
+ Primary HIDDEN_STAT 1종
+ Secondary HIDDEN_STAT 0~1종
```

### 3.1 Visible Stat

보이는 성장 스탯은 한 선택당 기본 1종이다.

- `knowledge`
- `expression`
- `skill`
- `exploration`
- `magic`

Main은 `+2`, NPC·Location은 `+1`을 기본값으로 한다.

### 3.2 Primary Hidden

모든 Story choice는 선택의 핵심 의미를 나타내는 Primary Hidden을 정확히 1종 가진다.

- `empathy`
- `responsibility`
- `curiosity`
- `courage`
- `cooperation`
- `independence`
- `caution`
- `honesty`

Main은 `+8`, NPC·Location은 `+5`다.

### 3.3 Secondary Hidden

선택 의미에 두 번째 성향이 명확하게 포함될 때만 Secondary Hidden을 1종 추가한다.

- Main: `+3`
- NPC·Location: `+2`

Secondary를 넣기 위해 선택 의미를 억지로 해석하지 않는다. Primary와 Secondary는 서로 다른 Hidden Stat을 사용한다.

---

## 4. 같은 선택 화면의 보상 총량은 동일하게 유지

같은 `choiceNodeId`에 속한 보기들은 스탯 효율의 정답이 생기지 않아야 한다.

따라서 같은 선택 화면 안에서는:

1. Visible 기본 총량이 같다.
2. Primary Hidden 기본 총량이 같다.
3. Secondary Hidden을 한 보기에 넣는다면 다른 보기에도 같은 Secondary 총량을 넣는다.
4. 대상 스탯 종류는 의미에 따라 달라질 수 있다.

예:

```text
A. 바로 멈추자고 한다
→ 마법 +2 / 용기 +8 / 책임 +3

B. 상태를 확인하며 멈추자고 한다
→ 탐험 +2 / 신중함 +8 / 책임 +3
```

두 선택의 방향은 다르지만 총 성장량은 같다.

친구 A/B/C 중 누구를 먼저 고르는 것처럼 **선호 자체가 능력 판정이 아닌 선택**은 스탯 결과까지 동일하게 둘 수 있다.

---

## 5. Hidden Stat은 선악 점수나 반대쌍이 아니다

Hidden Stat은 플레이어의 선택 경향을 기록한다.

```text
협력 +5
→ 독립성 -5 하지 않음

독립성 +5
→ 협력 -5 하지 않음
```

어떤 Hidden Stat도 선택의 벌점으로 자동 감소시키지 않는다. 실패·오답을 이유로 Hidden Stat을 깎지 않는다.

---

## 6. 이벤트 종료 시 보이는 스탯만 합산해서 공개

선택을 할 때마다 `+1`, `+2`를 팝업으로 보여 주지 않는다. 한 이벤트에 여러 선택 노드가 있다면 END에서 모두 합산한다.

예:

```text
선택 1 → 지식 +2 / 호기심 +8
선택 2 → 탐험 +2 / 솔직함 +8
선택 3 → 지식 +2 / 책임 +8

이벤트 완료 결과 화면
→ 지식 +4
→ 탐험 +2
```

Hidden 결과인 `호기심 +8 / 솔직함 +8 / 책임 +8`은 플레이어에게 표시하지 않는다.

### 6.1 실제 적용량만 표시

표시값은 nominal reward가 아니라 **상한 clamp 이후 실제 저장값이 증가한 양**이다.

```text
이벤트 전 지식 = 499
이벤트 nominal 지식 보상 = +4
저장 결과 = 500
결과 화면 = 지식 +1
```

상한 때문에 실제 증가량이 `0`이면 `+4` 같은 허위 보상을 표시하지 않는다.

---

## 7. 서버 저장·응답 순서

Story choice reward는 서버 권위 결과다.

```text
Dialogue 진행
→ 엔진은 choiceNodeId + choiceId만 수집
→ END
→ completeDialogue 요청
→ 서버가 선택 유효성 검증
→ story_choice_effects 조회
→ 모든 Visible / Hidden / Flag 효과 합산
→ Visible 0~500 clamp
→ Hidden 0~300 clamp
→ Firestore transaction 저장
→ 저장 성공
→ 실제 적용된 Visible delta만 응답
→ 결과 화면 표시
```

대화 로딩 payload에는 선택 보상 수치를 넣지 않는다.

완료 응답은 예를 들어 다음 정도만 결과 표현용으로 전달한다.

```json
{
  "visibleStatDelta": {
    "knowledge": 4,
    "expression": 2,
    "exploration": 0,
    "skill": 0,
    "magic": 0
  }
}
```

`hiddenStatDelta`는 엔진 응답에 포함하지 않는다. 최신 `activeRun` 전체를 반환하는 API 구조를 사용하더라도 클라이언트 UI는 Hidden Stat 값을 노출하지 않으며, 가능하면 Hidden Stat을 별도 비공개 서버 데이터로 유지한다.

---

## 8. Story choice 보상에는 반복 육성 보정을 적용하지 않는다

Story choice는 수업·모험처럼 체력을 소비해 수행 성과를 내는 반복 콘텐츠가 아니다.

따라서:

- 관리자 `adminRewardMultiplier` 미적용
- 저체력 성장량 `-50%` 미적용
- 펫 보정 미적용
- 선택별 정답/실패 배율 미적용
- 저장 상한 clamp만 적용

즉 Main `+2`, NPC·Location `+1`은 Story 선택의 고정 명시 보상이다.

---

## 9. SKIP

`completionMode=SKIP`이면 Story 진행에 필요한 공통 Event Effect만 적용한다.

```text
StoryProgress / 진행 필수 flag
→ 적용 가능

VISIBLE_STAT
HIDDEN_STAT
선택 전용 EVENT_FLAG
→ 전부 적용하지 않음
```

스킵하기 전에 일부 선택을 실제로 했더라도 해당 이벤트의 choice reward는 전체 `0`으로 처리한다. 선택하지 않은 성향을 서버가 임의로 추정하지 않는다.

---

## 10. Hidden Stat 선택 기회 편향 검산

Secondary를 도입하기 전 77개 canonical option의 Primary Hidden 태그 기회는 다음처럼 편향돼 있었다.

| Hidden Stat | Primary 기회 수 |
|---|---:|
| 공감 | 13 |
| 책임 | 9 |
| 호기심 | 17 |
| 용기 | 4 |
| 협력 | 9 |
| 독립성 | 6 |
| 신중함 | 13 |
| 솔직함 | 6 |

`호기심 / 공감 / 신중함`은 자연스럽게 선택 기회가 많고 `용기 / 독립성 / 솔직함`은 적다. Primary 의미를 억지로 바꾸지 않고 자연스러운 Secondary만 추가한 현재 제작안의 **태그 기회 수**는 다음과 같다.

| Hidden Stat | Primary+Secondary 태그 기회 수 |
|---|---:|
| 공감 | 16 |
| 책임 | 20 |
| 호기심 | 17 |
| 용기 | 15 |
| 협력 | 20 |
| 독립성 | 11 |
| 신중함 | 15 |
| 솔직함 | 11 |

이는 **77개 canonical option 전체에서 해당 Hidden을 얻을 수 있는 보기 수**를 센 제작 검산값이며, 한 플레이어가 한 회차에 실제로 모두 획득한다는 뜻은 아니다. Story 출현 여부와 한 choiceNode에서 하나만 고르는 구조 때문에 실제 회차 결과는 훨씬 낮고 선택에 따라 달라진다.

Hidden Stat은 단순 절대값뿐 아니라 어떤 선택 기회에서 누적됐는지 해석해야 하므로, 향후 엔딩·해금 판정에서 특정 Hidden 하나를 과도하게 높은 단일 임계값으로 사용하지 않는다.

---

## 11. SQLite 저장 규칙

별도 migration은 필요하지 않다. 기존 `story_choice_effects`는 한 choice에 여러 effect 행을 허용한다.

권장 `effect_order`:

```text
1 = VISIBLE_STAT
2 = Primary HIDDEN_STAT
3 = Secondary HIDDEN_STAT (있을 때만)
4 = choice-specific EVENT_FLAG/COUNTER (앞 효과 수에 따라 다음 번호)
```

Location `LOC_OBS_04`처럼 Secondary가 없는 선택의 표식 flag는 기존처럼 다음 effect order에 저장한다.

현재 예상 행 수:

| Story 유형 | choice | Visible | Primary Hidden | Secondary Hidden | 기타 choice effect | 총 `story_choice_effects` |
|---|---:|---:|---:|---:|---:|---:|
| Main | 40 | 40 | 40 | 22 | 0 | **102** |
| NPC | 24 | 24 | 24 | 16 | 0 | **64** |
| Location | 13 | 13 | 13 | 10 | 3 (`LOC_OBS_04` mark) | **39** |
| **합계** | **77** | **77** | **77** | **48** | **3** | **205** |

DB 적재기는 Production 표를 읽어 이 행들을 생성한다. 각 choice마다 Visible은 정확히 1개, Hidden은 1~2개여야 한다.

이미 Main/NPC/Location의 77개 `story_choices`가 존재하는 개발 DB에는 아래 전용 명령으로 **대화 시퀀스를 재생성하지 않고 선택 효과만** 갱신할 수 있다.

```bash
python3 backend/database/sqlite/seed_story_choice_rewards.py \
  --version dev-dialogue-v1
```

성공 기대값:

```text
Main choices/effects: 40/102
NPC choices/effects: 24/64
Location choices/effects: 13/39
Total choices/effects: 77/205
validation: OK
```

---

## 12. 제작·QA 체크리스트

- [ ] canonical choice 77개 모두 Visible 1개가 있는가
- [ ] 77개 모두 Primary Hidden 1개가 있는가
- [ ] Secondary는 최대 1개인가
- [ ] Primary와 Secondary가 같은 Hidden Stat이 아닌가
- [ ] 같은 choiceNode에서 Hidden 총량이 동일한가
- [ ] 선택 화면에 스탯 수치가 노출되지 않는가
- [ ] END 전에는 choice reward가 확정 저장되지 않는가
- [ ] COMPLETE 후 actual Visible delta만 결과 화면에 보이는가
- [ ] Hidden delta가 결과 UI에 노출되지 않는가
- [ ] SKIP이 choice reward를 0으로 처리하는가
- [ ] clamp 전 nominal 값이 아니라 실제 증가량을 표시하는가
- [ ] DB `story_choice_effects` 총수가 Main 102 / NPC 64 / Location 39인지 검증하는가
