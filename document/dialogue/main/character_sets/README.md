# Main Story 32인 Character Set

이 폴더는 승인된 `document/dialogue/main/MS01.md`~`MS06.md` 공통 마스터를 기반으로, 플레이 캐릭터 32명의 **말투·속마음·선택 문구와 그 선택을 받은 상대방 반응**을 분리해 검수하기 위한 변형 세트다.

## 1. 왜 전체 원고를 32벌 복사하지 않는가

나레이션, 이미지, 사건 설명, 장면 순서처럼 캐릭터와 무관한 부분까지 32벌 복제하면 수정 누락과 DB 중복이 커진다.

따라서 한 캐릭터의 최종 시퀀스는 다음처럼 만든다.

```text
공통 Main Story 마스터
+ 해당 protagonist Character Set override
+ 현재 회차 storyCast의 실제 화자 정보
= 최종 사전 작성 Dialogue Sequence
```

Character Set에 적히지 않은 노드는 공통 마스터의 문구를 그대로 사용한다.

### 작성용 축약 표기

일부 초기 Character Set 문서에는 긴 `choiceId`를 반복하지 않기 위해, 해당 `CHOICE` 절 안에서만 의미가 분명한 `A / B / C`, `STAR / COMPASS / LINKED_STARS`, `CLASS / ADVENTURE` 같은 **작성용 suffix 축약 표기**가 남아 있다.

이 축약 표기는 검수 문서에서만 허용한다. DB 적재 데이터에서는 반드시 공통 마스터의 canonical `choiceId` 전체값으로 정규화한다.

```text
MS05_S2_FIRST_STORY > A
→ MS05_S2_FIRST_FRIEND_A

MS05_S5_MARK > STAR
→ MS05_S5_STAR
```

축약 표기를 별도의 새 `choiceId`로 만들거나 저장하지 않는다.

## 2. Character Set에서 반드시 바꾸는 것

- `THOUGHT` — 캐릭터의 내적 언어가 가장 잘 드러나는 노드
- 18개 `CHOICE` 화면의 실제 선택 문구
- 선택 직후 상대방의 `reaction` 중 플레이어의 말투와 관계 방식에 반응해야 하는 문구
- 공통 마스터의 짧은 PLAYER 대사 중 캐릭터성을 강하게 드러내야 하는 경우

선택의 **의미와 choiceId는 절대 바꾸지 않는다.**

예:

```text
MS03_S2_POWER
카엘: "빛의 양이 부족한 가능성부터 확인해 보자."
아이리스: "마력이 모자란 거면 조금만 더 줘 보면 바로 알 수 있지 않을까?"
티아: "빛이 힘이 빠진 것처럼 보여. 조금만 보태 보면 어떨까?"

→ 표현은 달라도 모두 같은 choiceId와 같은 선택 효과
```

## 3. 상대방 반응 규칙

상대방도 플레이어 캐릭터의 말투와 접근 방식에 맞춰 자연스럽게 반응한다.

- 분석적인 캐릭터에게는 관찰·근거를 이어 받는 반응
- 다정한 캐릭터에게는 상대의 배려를 받아 주는 반응
- 행동적인 캐릭터에게는 역할을 나누거나 바로 움직이는 반응
- 유쾌한 캐릭터에게는 가벼운 농담을 받아 주되 사건의 긴장감을 깨지 않는 반응
- 조용한 캐릭터에게는 말을 재촉하지 않고 짧게 받아 주는 반응

단, 상대방의 고유 성격을 없애지 않는다. 예를 들어 같은 카엘의 말이라도 티아는 티아답게, 다나는 다나답게 반응한다.

## 4. storyCast 충돌

주인공이 기본 역할 캐릭터와 같으면 `MAIN_STORY_PRODUCTION.md`의 후보 순서로 다음 학생이 배정된다.

각 protagonist별 실제 Main Story 배역은 [CAST_MATRIX.md](CAST_MATRIX.md)를 사용한다.

특히 다음 주인공은 기본 역할이 바뀐다.

- CH08 아이리스 → `MAIN_GREENHOUSE_TRAPPED=로빈`
- CH12 리네 → `MAIN_GREENHOUSE_STUDENT=요한`
- CH16 티아 → `MAIN_GUIDE_STUDENT=로빈`
- CH24 미리엄 → `MAIN_FESTIVAL_LEAD=리코`
- CH25 렌 → `MAIN_TRAINING_WITNESS=제나`
- CH26 다나 → `MAIN_CLOCK_STUDENT=시온`
- CH29 카일 → `MAIN_TRAINING_STUDENT=로렌`

## 5. 문서 구성

- [VOICE_GUIDES.md](VOICE_GUIDES.md) — 32명 말투 기준
- [CAST_MATRIX.md](CAST_MATRIX.md) — protagonist별 Main Story 실제 배역
- [SET_NT_CH01_CH08.md](SET_NT_CH01_CH08.md) — 카엘~아이리스
- [SET_NF_CH09_CH16.md](SET_NF_CH09_CH16.md) — 에녹~티아
- [SET_SJ_CH17_CH24.md](SET_SJ_CH17_CH24.md) — 바론~미리엄
- [SET_SP_CH25_CH32.md](SET_SP_CH25_CH32.md) — 렌~리코

## 6. DB 적재 기준

사람 검수가 끝나면 각 캐릭터 세트를 공통 마스터와 병합해 최종 데이터로 만든다.

```text
(gameDataVersion, storyId, stepNo, playerCharacterId)
```

단위의 Dialogue Sequence에는 최종 문구를 미리 적재한다. 게임 실행 중 AI가 대사를 생성하거나 말투를 변환하지 않는다.

`choiceId`, 사건 결과, 이미지 순서, 스탯 효과는 캐릭터별 문구 차이와 무관하게 공통 의미를 유지한다.

DB 변환 전에는 다음 검사를 반드시 수행한다.

1. 32명 모두 18개 선택 화면 override가 존재하는지 확인한다.
2. 작성용 축약 표기를 canonical `choiceId`로 모두 확장한다.
3. `CAST_MATRIX.md`의 주인공-역할 충돌 대체 배역을 최종 화자에 반영한다.
4. 공통 마스터의 `nodeId / assetRef / sequence` 순서를 변경하지 않았는지 확인한다.
