# NPC Story 32인 Character Set

이 폴더는 `document/dialogue/npc/NPC_GUIDE_01.md`~`NPC_LULU_04.md`의 공통 대화 마스터를 기반으로, 플레이 캐릭터 32명의 **실제 PLAYER 발화·선택 문구와 선택 직후 상대 반응**을 사전 작성한 검수용 Character Set이다.

## 1. 병합 방식

공통 나레이션·이미지·고정 사건 대사는 32번 복제하지 않는다.

```text
공통 NPC Story master
+ protagonist Character Set override
+ protagonist 충돌 시 NPC actor substitution
= 최종 사전 작성 Dialogue Sequence
```

Character Set에 적히지 않은 `PLAYER(BASE)` 노드는 공통 마스터 문구를 그대로 사용한다. `choiceId`, 선택 의미, 스탯 효과, 이미지 순서, 장면 순서는 캐릭터별로 바꾸지 않는다.

## 2. 실제 작성 범위

32명 모두 다음을 가진다.

- 캐릭터성이 강하게 드러나는 대표 `PLAYER(BASE)` 노드 override
- NPC Story 12개 `CHOICE` 화면의 실제 선택 문구
- 24개 선택 각각에 대한 실제 상대 반응
- GUIDE / WORK / LULU 공통 사건 구조 유지

따라서 DB 변환 시 32명 모두 동일한 canonical choice 24개를 사용하되 화면 문구와 reaction만 달라진다.

## 3. 상대역 규칙

- 기본 GUIDE actor: 티아 `CH16`
- 주인공이 티아 `CH16`: GUIDE actor를 로빈 `CH15`로 교체
- 기본 WORK actor: 렌 `CH25`
- 주인공이 렌 `CH25`: WORK actor를 다나 `CH26`으로 교체
- LULU: 항상 루루

CH16/CH25의 대체 actor는 선택 reaction만 바꾸는 것이 아니라 해당 4장면의 고정 상대 대사도 바꾼다. 전체 고정 대사는 [ACTOR_SUBSTITUTIONS.md](ACTOR_SUBSTITUTIONS.md)를 사용한다.

## 4. 문서 구성

- [ACTOR_SUBSTITUTIONS.md](ACTOR_SUBSTITUTIONS.md) — CH16 로빈 GUIDE / CH25 다나 WORK 전체 actor 대사
- [SET_NT_CH01_CH08.md](SET_NT_CH01_CH08.md) — 카엘~아이리스
- [SET_NF_CH09_CH16.md](SET_NF_CH09_CH16.md) — 에녹~티아
- [SET_SJ_CH17_CH24.md](SET_SJ_CH17_CH24.md) — 바론~미리엄
- [SET_SP_CH25_CH32.md](SET_SP_CH25_CH32.md) — 렌~리코

말투 기준은 중복 문서를 만들지 않고 [`../../main/character_sets/VOICE_GUIDES.md`](../../main/character_sets/VOICE_GUIDES.md)를 공통 사용한다.

## 5. canonical choiceId

각 Character Set 표는 아래 12개 choiceNode의 24개 canonical choiceId를 모두 적는다.

```text
NPC_GUIDE_01_RESPONSE
  GUIDE_01_JOKE / GUIDE_01_HELP
NPC_GUIDE_02_PLACE
  GUIDE_02_BUSY_PATH / GUIDE_02_EYE_LEVEL
NPC_GUIDE_03_COLOR
  GUIDE_03_BRIGHT / GUIDE_03_CALM
NPC_GUIDE_04_ORDER
  GUIDE_04_GUIDE_FIRST / GUIDE_04_DECOR_FIRST

NPC_WORK_01_SORT
  WORK_01_SHAPE / WORK_01_GROOVES
NPC_WORK_02_CHECK
  WORK_02_TWO_GROOVES / WORK_02_COMPARE
NPC_WORK_03_ORDER
  WORK_03_WIPE_FIRST / WORK_03_PLACE_FIRST
NPC_WORK_04_FIND
  WORK_04_TELL_LOCATION / WORK_04_ASK_TOGETHER

NPC_LULU_01_PATTERN
  LULU_01_STAR / LULU_01_ROUND
NPC_LULU_02_STORE
  LULU_02_VISIBLE / LULU_02_SAFE
NPC_LULU_03_FAVORITE
  LULU_03_SHINY / LULU_03_RUSTLE
NPC_LULU_04_FAVORITE
  LULU_04_FEATHER / LULU_04_SEED
```

## 6. DB 적재 전 검사

1. CH01~CH32가 모두 존재하는지 확인한다.
2. 각 캐릭터가 12개 choiceNode / 24개 canonical choiceId를 모두 가지는지 확인한다.
3. CH16의 GUIDE actor가 로빈인지 확인한다.
4. CH25의 WORK actor가 다나인지 확인한다.
5. `WORK_02_TWO_GROOVES / WORK_02_COMPARE` 어느 쪽도 정답·오답 처리하지 않는다.
6. 공통 master의 nodeId / assetRef / sequence 순서를 변경하지 않는다.
7. 선택 효과는 `NPC_STORY_PRODUCTION.md`의 canonical 효과를 서버 권위 데이터로 사용하고 대화 payload에 수치 보상을 중복 저장하지 않는다.

현재 문서 상태는 **32인 실제 NPC 대사 검수 승인 / SQLite v4 NPC seed 구현 완료 / 실제 DB 실행 검증 전**이다. DB 컴파일 기준은 `backend/database/NPC_STORY_DB_SPEC.md`와 `backend/database/sqlite/seed_npc_story.py`를 따른다.
