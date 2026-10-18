# Dialogue 선택지별 스탯 효과 참조표

> 상태: **Main / NPC / Location Story 77개 canonical choice 결과 확정**  
> 목적: 실제 대화 원고의 `choiceId`를 보고 서버 적용 스탯을 빠르게 확인하는 제작·QA 참조표  
> 공통 정책: `document/content/02_STATS_EVENTS_ENDINGS/04_STORY_CHOICE_REWARDS.md`

## 적용 원칙

- CH01~CH32에서 실제 선택 문구가 달라도 **같은 canonical `choiceId`면 스탯 효과는 동일**하다.
- 선택 버튼에는 아래 스탯 정보를 표시하지 않는다.
- END에서 서버가 선택 효과를 합산·저장한 뒤 **실제 적용된 Visible Stat 총합만** 결과 화면에 표시한다.
- Hidden Stat은 결과 화면에 표시하지 않는다.
- `-`는 Secondary Hidden 없음이다.
- 아래 표의 canonical 원본은 각 `story/*/*_PRODUCTION.md`이며, 이 문서는 Dialogue 제작·검수용 통합 참조다.

---

# Main Story

## MS01 · 각자의 이유로 아카데미에

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `MS01_S1_LEARN` | 새로운 것을 배우고 싶다 | 지식 +2 | 호기심 +8 | 독립성 +3 |
| `MS01_S1_FRIENDS` | 새로운 친구를 만나고 싶다 | 표현력 +2 | 협력 +8 | 용기 +3 |
| `MS01_S2_CLASS` | 수업이 가장 궁금하다 | 지식 +2 | 책임 +8 | 솔직함 +3 |
| `MS01_S2_ADVENTURE` | 모험이 가장 궁금하다 | 탐험 +2 | 호기심 +8 | 솔직함 +3 |
| `MS01_S3_ASK` | 룬의 이상을 바로 물어본다 | 표현력 +2 | 솔직함 +8 | 용기 +3 |
| `MS01_S3_OBSERVE` | 조금 더 지켜본다 | 탐험 +2 | 신중함 +8 | 독립성 +3 |
| `MS01_S4_CLASS_FIRST` | 먼저 수업을 해 보고 싶다 | 지식 +2 | 책임 +8 | - |
| `MS01_S4_ADVENTURE_FIRST` | 먼저 모험을 해 보고 싶다 | 탐험 +2 | 독립성 +8 | - |

## MS02 · 온실을 삼킨 마법 덩굴

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `MS02_S1_TRAPPED_FIRST` | 안쪽 친구를 먼저 안심시킨다 | 표현력 +2 | 공감 +8 | 용기 +3 |
| `MS02_S1_HELPER_FIRST` | 밖의 학생과 해결 방법부터 확인한다 | 지식 +2 | 협력 +8 | 책임 +3 |
| `MS02_S4_GENTLE` | 꽃봉오리에 다정하게 말을 건다 | 표현력 +2 | 공감 +8 | - |
| `MS02_S4_LOWER_MAGIC` | 마력을 천천히 낮춘다 | 마법 +2 | 신중함 +8 | - |

## MS03 · 울리지 않는 시계탑

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `MS03_S1_TIME` | 시각이 틀린 이유부터 묻는다 | 지식 +2 | 호기심 +8 | - |
| `MS03_S1_BELL` | 종의 상태부터 묻는다 | 탐험 +2 | 호기심 +8 | - |
| `MS03_S2_POWER` | 마력이 부족한 것 같다고 말한다 | 마법 +2 | 호기심 +8 | 용기 +3 |
| `MS03_S2_FLOW` | 마력의 흐름이 어긋난 것 같다고 말한다 | 마법 +2 | 신중함 +8 | 책임 +3 |
| `MS03_S4_MORE_MAGIC` | 약한 구간에 소량의 마력을 보태며 반응을 확인한다 | 마법 +2 | 용기 +8 | - |
| `MS03_S4_TUNE_FLOW` | 천천히 흐름을 조율하자고 한다 | 마법 +2 | 신중함 +8 | - |

## MS04 · 도망친 그림자를 찾아서

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `MS04_S1_JOKE` | 가볍게 웃겨 긴장을 풀어 준다 | 표현력 +2 | 용기 +8 | - |
| `MS04_S1_REASSURE` | 차분하게 괜찮다고 안심시킨다 | 표현력 +2 | 공감 +8 | - |
| `MS04_S4_DANCE` | 그림자와 춤 동작을 해 본다 | 표현력 +2 | 독립성 +8 | 용기 +3 |
| `MS04_S4_WAVE` | 그림자와 손 흔들기를 해 본다 | 표현력 +2 | 협력 +8 | 용기 +3 |

## MS05 · 별빛 축제의 마지막 소원

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `MS05_S2_FIRST_FRIEND_A` | 친구 A의 소원을 먼저 듣는다 | 표현력 +2 | 공감 +8 | 협력 +3 |
| `MS05_S2_FIRST_FRIEND_B` | 친구 B의 소원을 먼저 듣는다 | 표현력 +2 | 공감 +8 | 협력 +3 |
| `MS05_S2_FIRST_FRIEND_C` | 친구 C의 소원을 먼저 듣는다 | 표현력 +2 | 공감 +8 | 협력 +3 |
| `MS05_S3_TELL_ALL` | 확인한 사실을 모두에게 먼저 알린다 | 표현력 +2 | 솔직함 +8 | 용기 +3 |
| `MS05_S3_TELL_CLOSE` | 가까운 친구부터 차례로 알린다 | 표현력 +2 | 신중함 +8 | 공감 +3 |
| `MS05_S4_STOP_NOW` | 바로 증폭 장치를 멈추자고 제안 | 마법 +2 | 용기 +8 | 책임 +3 |
| `MS05_S4_CHECK_THEN_STOP` | 상태를 확인하며 함께 멈추자고 제안 | 탐험 +2 | 신중함 +8 | 책임 +3 |
| `MS05_S4_ONE_BY_ONE` | 한 사람씩 소원을 연결하자고 제안 | 마법 +2 | 책임 +8 | - |
| `MS05_S4_SHARE_ROLES` | 역할을 나눠 소원을 연결하자고 제안 | 표현력 +2 | 협력 +8 | - |
| `MS05_S5_STAR` | 별 표식을 남긴다 | 마법 +2 | 호기심 +8 | - |
| `MS05_S5_COMPASS` | 나침반 표식을 남긴다 | 탐험 +2 | 독립성 +8 | - |
| `MS05_S5_LINKED_STARS` | 이어진 두 별 표식을 남긴다 | 표현력 +2 | 협력 +8 | - |

## MS06 · 우리가 지켜낸 것

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `MS06_S3_GREENHOUSE` | 온실 장식 놀이를 고른다 | 솜씨 +2 | 책임 +8 | - |
| `MS06_S3_CLOCK` | 시계탑 정오 맞히기를 고른다 | 지식 +2 | 호기심 +8 | - |
| `MS06_S3_SHADOW` | 그림자 몸짓 놀이를 고른다 | 표현력 +2 | 용기 +8 | - |
| `MS06_S4_FIRST_FRIEND_A` | 친구 A에게 먼저 인사한다 | 표현력 +2 | 공감 +8 | 협력 +3 |
| `MS06_S4_FIRST_FRIEND_B` | 친구 B에게 먼저 인사한다 | 표현력 +2 | 공감 +8 | 협력 +3 |
| `MS06_S4_FIRST_FRIEND_C` | 친구 C에게 먼저 인사한다 | 표현력 +2 | 공감 +8 | 협력 +3 |

Main 합계: **40 canonical choice / 102 `story_choice_effects`**.

---

# NPC Story

## NPC_GUIDE_01 · 안내지 줍기

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `GUIDE_01_JOKE` | 바람을 탓하며 가볍게 웃는다 | 표현력 +1 | 솔직함 +5 | 용기 +2 |
| `GUIDE_01_HELP` | 함께 정리하자고 격려한다 | 솜씨 +1 | 협력 +5 | 책임 +2 |

## NPC_GUIDE_02 · 안내지 놓기

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `GUIDE_02_BUSY_PATH` | 사람이 많이 지나는 곳을 권한다 | 탐험 +1 | 호기심 +5 | 협력 +2 |
| `GUIDE_02_EYE_LEVEL` | 보기 편한 눈높이를 권한다 | 표현력 +1 | 공감 +5 | 책임 +2 |

## NPC_GUIDE_03 · 색 리본 고르기

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `GUIDE_03_BRIGHT` | 밝은 색을 권한다 | 표현력 +1 | 솔직함 +5 | 용기 +2 |
| `GUIDE_03_CALM` | 차분한 색을 권한다 | 표현력 +1 | 신중함 +5 | 솔직함 +2 |

## NPC_GUIDE_04 · 남은 준비 돕기

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `GUIDE_04_GUIDE_FIRST` | 안내물부터 확인한다 | 지식 +1 | 책임 +5 | - |
| `GUIDE_04_DECOR_FIRST` | 장식부터 확인한다 | 솜씨 +1 | 책임 +5 | - |

## NPC_WORK_01 · 부품 모으기

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `WORK_01_SHAPE` | 모양 기준으로 분류한다 | 탐험 +1 | 호기심 +5 | 독립성 +2 |
| `WORK_01_GROOVES` | 홈 개수 기준으로 분류한다 | 지식 +1 | 신중함 +5 | 책임 +2 |

## NPC_WORK_02 · 필요한 부품 찾기

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `WORK_02_TWO_GROOVES` | 홈이 두 개인 쪽이 더 맞아 보인다고 말한다 | 지식 +1 | 독립성 +5 | 용기 +2 |
| `WORK_02_COMPARE` | 두 부품을 다시 나란히 비교하자고 한다 | 탐험 +1 | 신중함 +5 | 협력 +2 |

## NPC_WORK_03 · 도구 정돈하기

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `WORK_03_WIPE_FIRST` | 도구를 먼저 닦는다 | 솜씨 +1 | 책임 +5 | 협력 +2 |
| `WORK_03_PLACE_FIRST` | 도구 자리를 먼저 정한다 | 지식 +1 | 신중함 +5 | 독립성 +2 |

## NPC_WORK_04 · 작업대 살펴보기

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `WORK_04_TELL_LOCATION` | 기억나는 위치를 직접 알려 준다 | 지식 +1 | 독립성 +5 | 솔직함 +2 |
| `WORK_04_ASK_TOGETHER` | NPC와 함께 위치를 확인한다 | 표현력 +1 | 협력 +5 | 신중함 +2 |

## NPC_LULU_01 · 단추 발견

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `LULU_01_STAR` | 별 무늬처럼 보인다고 말한다 | 마법 +1 | 호기심 +5 | - |
| `LULU_01_ROUND` | 동그란 무늬처럼 보인다고 말한다 | 탐험 +1 | 호기심 +5 | - |

## NPC_LULU_02 · 단추 보관하기

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `LULU_02_VISIBLE` | 상자 윗칸에 잘 보이게 둔다 | 표현력 +1 | 솔직함 +5 | 책임 +2 |
| `LULU_02_SAFE` | 상자 안쪽에 안전하게 둔다 | 솜씨 +1 | 책임 +5 | 신중함 +2 |

## NPC_LULU_03 · 발견물 나누기

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `LULU_03_SHINY` | 반짝이는 물건을 고른다 | 마법 +1 | 호기심 +5 | - |
| `LULU_03_RUSTLE` | 바스락거리는 물건을 고른다 | 탐험 +1 | 호기심 +5 | - |

## NPC_LULU_04 · 새 발견 함께 보기

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `LULU_04_FEATHER` | 깃털이 더 흥미롭다고 말한다 | 탐험 +1 | 호기심 +5 | - |
| `LULU_04_SEED` | 단풍 씨앗이 더 흥미롭다고 말한다 | 지식 +1 | 호기심 +5 | - |

NPC 합계: **24 canonical choice / 64 `story_choice_effects`**.

---

# Location Story

## LOC_OBS_01 · 틀린 별자리

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `LOC_OBS_01_CUTE` | 엉뚱한 별자리 낙서가 귀엽다고 말한다 | 표현력 +1 | 공감 +5 | 솔직함 +2 |
| `LOC_OBS_01_ME_TOO` | 나도 헷갈릴 것 같다고 말한다 | 표현력 +1 | 솔직함 +5 | 공감 +2 |

## LOC_OBS_02 · 늦은 관측

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `LOC_OBS_02_WARM` | 마음이 따뜻했겠다고 말한다 | 표현력 +1 | 공감 +5 | 협력 +2 |
| `LOC_OBS_02_GRATEFUL` | 참 고마웠겠다고 말한다 | 표현력 +1 | 협력 +5 | 공감 +2 |

## LOC_OBS_03 · 자리 맡아 주기

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `LOC_OBS_03_HAPPY` | 친구가 기뻤겠다고 말한다 | 표현력 +1 | 공감 +5 | 협력 +2 |
| `LOC_OBS_03_LEAVE_SEAT` | 나도 좋은 자리를 남기고 싶다고 말한다 | 표현력 +1 | 협력 +5 | 책임 +2 |

## LOC_OBS_04 · 빈 관측 칸

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `LOC_OBS_04_STAR` | 별 모양을 남긴다 | 마법 +1 | 호기심 +5 | - |
| `LOC_OBS_04_MOON` | 달 모양을 남긴다 | 지식 +1 | 신중함 +5 | - |
| `LOC_OBS_04_SPARKLE` | 반짝임 모양을 남긴다 | 표현력 +1 | 독립성 +5 | - |

위 3개 선택은 스탯 외에 기존 `location.obs.mark` 완료 기록도 가진다.

## LOC_GH_01 · 시든 화분 돌보기

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `LOC_GH_01_WATER` | 지금 조금 물을 주자고 제안한다 | 솜씨 +1 | 책임 +5 | 용기 +2 |
| `LOC_GH_01_MOVE_AND_WATCH` | 밝은 자리로 옮기고 살피자고 제안한다 | 지식 +1 | 신중함 +5 | 책임 +2 |

## LOC_LIB_01 · 책 한 권 제자리 찾기

| choiceId | 선택 의미 | Visible | Primary Hidden | Secondary Hidden |
|---|---|---:|---:|---:|
| `LOC_LIB_01_SAME_MARK` | 같은 표식 책들 옆을 제안한다 | 지식 +1 | 신중함 +5 | 책임 +2 |
| `LOC_LIB_01_SAME_TOPIC` | 같은 주제 책들 옆을 제안한다 | 지식 +1 | 호기심 +5 | 독립성 +2 |

Location 합계: **13 canonical choice / 39 `story_choice_effects`**. 39에는 `LOC_OBS_04` 표식 EVENT_FLAG 3개가 포함된다.

---

# 전체 DB 기대값

```text
Main     40 choices / 102 effects
NPC      24 choices /  64 effects
Location 13 choices /  39 effects
---------------------------------
Total    77 choices / 205 effects
```

통합 SQL 검증:

```bash
sqlite3 backend/database/sqlite/lumia-content.sqlite3 \
  < backend/database/sqlite/validate_story_choice_rewards.sql
```

기존 v4 DB의 77개 canonical `story_choices`가 이미 최신 상태라면 선택 보상만 재적재할 수 있다.

```bash
python3 backend/database/sqlite/seed_story_choice_rewards.py \
  --version dev-dialogue-v1
```
