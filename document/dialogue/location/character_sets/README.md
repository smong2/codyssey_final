# Location Story 32인 Character Set

이 폴더는 `document/dialogue/location/LOC_OBS_01.md`~`LOC_LIB_01.md` 공통 마스터를 기반으로, CH01~CH32 플레이 캐릭터의 **실제 PLAYER 발화·THOUGHT·선택 문구와 선택 직후 reaction**을 사전 작성한 검수용 Character Set이다.

## 1. 병합 방식

공통 NARRATION·IMAGE·고정 NPC 대사는 32번 새로 집필하지 않는다.

```text
공통 Location Story master
+ protagonist Character Set override
+ activeRun.storyCast.LOC_GREENHOUSE_STUDENT
= 최종 사전 작성 Dialogue Sequence
```

Character Set에 적히지 않은 PLAYER 노드는 공통 마스터 문구를 그대로 사용한다. `choiceId`, 선택 의미, 스탯 효과, 이미지 순서, 장면 순서는 캐릭터별로 바꾸지 않는다.

## 2. 실제 작성 범위

32명 모두 다음을 가진다.

- Location Story 6개 장면에서 캐릭터성이 드러나는 대표 PLAYER/THOUGHT override 6개
- 6개 `CHOICE` 화면의 실제 선택 문구
- 13개 canonical choice 각각의 실제 branch reaction
- 천문대 4회는 혼자 읽는 장면이므로 선택 직후 PLAYER reaction도 protagonist Voice로 작성
- 온실은 실제 `LOC_GREENHOUSE_STUDENT` 화자의 반응을 작성
- 대서고는 세린의 고정 성격을 유지하면서 protagonist의 제안 방식에 자연스럽게 반응하도록 작성

DB 변환 시 32명 모두 동일한 canonical choice 13개를 사용하며 화면 문구와 reaction만 달라진다.

검산 목표:

```text
32 characters × 6 choiceNode = 192 character-specific choice screens
32 characters × 13 canonical choiceId = 416 actual choice texts
```

## 3. `LOC_GREENHOUSE_STUDENT` 실제 배역

Location Production의 후보·충돌 규칙과 현재 Main `CAST_MATRIX.md`를 적용한 결과는 [CAST_MATRIX.md](CAST_MATRIX.md)를 따른다.

현재 결과:

- CH12 리네 protagonist → 하젤 CH20
- CH19 요한 protagonist → 하젤 CH20
- 그 외 30명 protagonist → 요한 CH19

모든 조합이 `PREFER_DISTINCT`의 우선 단계에서 해결되며 fallback은 필요하지 않다. 주인공 자신과 `MAIN_GREENHOUSE_STUDENT`는 항상 제외한다.

## 4. canonical choiceId

```text
LOC_OBS_01_REACTION
  LOC_OBS_01_CUTE / LOC_OBS_01_ME_TOO

LOC_OBS_02_FEELING
  LOC_OBS_02_WARM / LOC_OBS_02_GRATEFUL

LOC_OBS_03_RESPONSE
  LOC_OBS_03_HAPPY / LOC_OBS_03_LEAVE_SEAT

LOC_OBS_04_MARK
  LOC_OBS_04_STAR / LOC_OBS_04_MOON / LOC_OBS_04_SPARKLE

LOC_GH_01_CARE
  LOC_GH_01_WATER / LOC_GH_01_MOVE_AND_WATCH

LOC_LIB_01_SHELF
  LOC_LIB_01_SAME_MARK / LOC_LIB_01_SAME_TOPIC
```

선택 스탯 결과는 캐릭터별로 바꾸지 않는다. `story/location/LOCATION_STORY_PRODUCTION.md`와 `document/dialogue/CHOICE_STAT_EFFECTS.md`의 canonical 효과를 사용한다.

## 5. 파일 구성

- [CAST_MATRIX.md](CAST_MATRIX.md) — protagonist별 실제 온실 학생
- [SET_NT_CH01_CH08.md](SET_NT_CH01_CH08.md) — 카엘~아이리스
- [SET_NF_CH09_CH16.md](SET_NF_CH09_CH16.md) — 에녹~티아
- [SET_SJ_CH17_CH24.md](SET_SJ_CH17_CH24.md) — 바론~미리엄
- [SET_SP_CH25_CH32.md](SET_SP_CH25_CH32.md) — 렌~리코

말투 기준은 중복 문서를 만들지 않고 [`../../main/character_sets/VOICE_GUIDES.md`](../../main/character_sets/VOICE_GUIDES.md)를 공통 사용한다.

## 6. DB 적재 전 검사

1. CH01~CH32가 모두 존재한다.
2. 각 캐릭터가 6개 choiceNode / 13개 canonical choiceId를 모두 가진다.
3. 천문대 reaction이 해당 protagonist Voice로 작성되어 있다.
4. CH12/CH19의 온실 actor는 하젤, 나머지는 요한이다.
5. 온실 actor reaction이 요한/하젤의 성격을 유지한다.
6. 세린 reaction은 세린의 실용적이고 친절한 학생 사서 Voice를 유지한다.
7. `LOC_OBS_04` 3개 표식은 우열 없이 취향 선택으로 유지한다.
8. 공통 master의 nodeId / assetRef / sequence 순서를 변경하지 않는다.
9. 선택 스탯 수치는 Dialogue payload에 중복 저장하지 않는다.

현재 상태는 **CH01~CH32 Location Character Set 작성 및 수량 검산 완료 / `seed_location_story_master.py` DB 변환 구현 완료 / 실제 SQLite 재실행 검증 pending**이다. 검산 결과는 `32명 / 192 choiceNode / 416 canonical choice 문구`, 온실 branch reaction은 `하젤 4줄(CH12·CH19) / 요한 60줄(나머지 30명)`이며 DB 목표는 `192 sequences / 416 options / 3616 nodes`다.
