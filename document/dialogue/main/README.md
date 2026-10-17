# Main Story 대화 마스터

이 폴더는 `MS01`~`MS06` 메인 스토리를 실제 대화 시스템으로 옮기기 위한 **사람 검수용 마스터 원고**다.

우선순위는 다음과 같다.

1. `story/main/MAIN_STORY_PRODUCTION.md` — 사건·단계·선택 수·이미지 제작 기준
2. `story/main/main_final.md` — 서사 의미와 종료 상태
3. `document/dialogue/02_DIALOGUE_WRITING_GUIDE.md` — 어린이 대상 문체·선택·교육성·lineMode 기준
4. 이 폴더의 실제 대사 원고

## 현재 상태

이 문서는 **사람이 읽고 수정하는 Main Story 대화 원본**이다. 현재는 32인 변형과 Main DB 적재/기존 v3 실행 검증까지 진행된 상태다.

- 사건 순서, 해결 결과, 선택 화면 수는 Production 문서를 유지한다.
- `LINE / IMAGE / CHOICE / END`와 `DIALOGUE / NARRATION / THOUGHT / CONTEXT`를 실제 순서대로 작성한다.
- 신규 그림은 `ART-M01~M06`, 기존 배경은 실제 파일명을 사용한다.
- 선택지는 정답/오답이 아니라 서로 다른 그럴듯한 접근으로 작성한다.
- 모든 선택은 짧은 반응 뒤 공통 흐름으로 합류한다.
- `PLAYER(BASE)` 문구는 **32명 공통 의미를 검수하기 위한 기본 문장**이다. 현재 `character_sets/`에 32명 전원의 Voice 변형 초안과 선택 직후 상대방 반응 변형까지 작성되어 있다.
- `ROLE:*` 대사는 아래 기본 우선 캐스팅의 성격을 반영한 마스터다. 주인공 충돌 7건은 `character_sets/CAST_MATRIX.md`에 정리했으며 해당 Character Set에는 대체 화자 반응을 반영했다.
- 현재 상태는 **32인 Character Set 작성 완료 / Main SQLite 적재 코드 구현 / 기존 v3 Main 실행 검증 완료**다. `backend/database/sqlite/seed_dialogue_content.py`가 공통 마스터와 Character Set을 병합해 canonical `choiceId`·분기 반응·선택 효과를 실제 DB 행으로 생성하며, 사용자가 로컬 DB에서 `192 sequences / 40 canonical choices / 80 choice effects` 결과를 확인했다. 스크립트는 현재 공통 Story 발생 정책이 추가된 SQLite v4 migration까지 지원하며, v4는 Location master seed 실행과 함께 추가 검증한다.

## 기본 우선 캐스팅 기준

| 역할 | 마스터 원고의 기본 화자 |
|---|---|
| `MAIN_GUIDE_STUDENT` | 티아(CH16) |
| `MAIN_GREENHOUSE_STUDENT` | 리네(CH12) |
| `MAIN_GREENHOUSE_TRAPPED` | 아이리스(CH08) |
| `MAIN_CLOCK_STUDENT` | 다나(CH26) |
| `MAIN_TRAINING_STUDENT` | 카일(CH29) |
| `MAIN_TRAINING_WITNESS` | 렌(CH25) |
| `MAIN_FESTIVAL_LEAD` | 미리엄(CH24) |
| `MAIN_TEACHER` | 발렌티누스 |

`MS05`와 `MS06`의 친구 그룹은 리네·다나·카일 역할을 그대로 재사용한다.

## 파일

- [MS01 · 각자의 이유로 아카데미에](MS01.md)
- [MS02 · 온실을 삼킨 마법 덩굴](MS02.md)
- [MS03 · 울리지 않는 시계탑](MS03.md)
- [MS04 · 도망친 그림자를 찾아서](MS04.md)
- [MS05 · 별빛 축제의 마지막 소원](MS05.md)
- [MS06 · 우리가 지켜낸 것](MS06.md)
- [32인 Character Set · Voice/배역/대사 변형](character_sets/README.md)

## 제작·적재 상태

공통 마스터를 한 벌만 출시 데이터로 쓰지 않고 32인 변형을 병합해 적재한다.

```text
마스터 원고 승인
→ PLAYER(BASE) 32인 Voice 변형 + 상대 branch reaction 변형 [작성 완료]
→ protagonist별 storyCast 충돌 대체 배역 반영 [작성 완료]
→ 사람 검수
→ 작성용 축약 choice 표기를 canonical choiceId로 정규화 [적재기 구현]
→ choiceId / nodeId / assetRef 최종 검산 [적재기 검증 로직 구현]
→ Dialogue DB 데이터 생성 [seed 코드 구현]
→ 기존 v3 Main 실행 검증 [완료: 192 / 40 / 80]
→ v4 공통 Story 정책 migration [Location master seed와 함께 검증 예정]
→ API payload 검증
```

사건 의미, `choiceId`, 이미지 전환 순서는 변형 과정에서도 유지한다.

