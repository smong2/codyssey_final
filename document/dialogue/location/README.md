# Location Story 대화 마스터

이 폴더는 `story/location/LOCATION_STORY_PRODUCTION.md`의 활성 6개 Location Story를 실제 대화 시스템으로 옮기기 위한 **사람 검수용 공통 마스터 원고**다.

우선순위는 다음과 같다.

1. `story/location/LOCATION_STORY_PRODUCTION.md` — 활성 범위·사건·선택·스탯·이미지 기준
2. `story/location/장소기반_규칙.md` — 발생 순서·장소 방문·런타임 판정 규칙
3. `document/dialogue/02_DIALOGUE_WRITING_GUIDE.md` — 어린이 대상 문체·선택·교육성·lineMode 기준
4. 이 폴더의 실제 대사 원고

## 현재 제작 범위

| ID | 제목 | 선택 | 이미지 |
|---|---|---:|---|
| `LOC_OBS_01` | 틀린 별자리 | 1회 · 2지 | `ART-L01` 최초 사용 |
| `LOC_OBS_02` | 늦은 관측 | 1회 · 2지 | `ART-L01` 재사용 |
| `LOC_OBS_03` | 자리 맡아 주기 | 1회 · 2지 | `ART-L01` 재사용 |
| `LOC_OBS_04` | 빈 관측 칸 | 1회 · 3지 | `ART-L01` 재사용 |
| `LOC_GH_01` | 시든 화분 돌보기 | 1회 · 2지 | `ART-L02`, `ART-L03` |
| `LOC_LIB_01` | 책 한 권 제자리 찾기 | 1회 · 2지 | `ART-L04` |

다른 과거 Location Story는 현재 본편 제작 범위에서 제외한다.

## 작성 원칙

- 사건 의미와 선택 `choiceId`는 Production을 바꾸지 않는다.
- 오브젝트 클릭·드래그·자유 입력·물 주기 미니게임을 새로 만들지 않는다.
- 선택지는 모두 그럴듯한 접근이며 정답/오답으로 보이지 않게 한다.
- 선택별 짧은 반응 뒤 반드시 공통 흐름으로 합류한다.
- 사회성·배려·책임·관찰 같은 의미를 교훈 문장으로 직접 설명하지 않는다.
- 한 말풍선에는 가능한 한 한 가지 정보나 감정만 담는다.
- 천문대 과거 학생의 이름·정체·메인 룬 단서를 새로 만들지 않는다.
- 천문대 일기의 새 정보는 화면에서 읽고 있는 기록이므로 주로 `NARRATION`으로 제시한다. 이미 앞 회차에서 읽은 사실을 되짚을 때만 `CONTEXT`를 사용한다.
- 천문대의 선택은 혼자 읽는 장면이므로 `PLAYER(BASE)`의 짧은 선택 후 반응을 사용한다. 32인 세트 작성 시 이 반응까지 캐릭터 Voice에 맞게 바꾼다.
- `LOC_GH_01`은 `ROLE:LOC_GREENHOUSE_STUDENT`를 사용한다. 마스터 기준 화자는 요한이며 실제 회차 배역은 `storyCast`가 결정한다.
- `LOC_LIB_01`의 세린은 전용 초상 없이 `NPC:SERIN` 텍스트 화자로 사용한다.
- 발생 날짜·주차는 이 대화 원고에서 새로 확정하지 않는다. 런타임 발생 규칙은 별도 시스템 문서를 따른다.
- 한 번으로 끝나는 `LOC_GH_01`, `LOC_LIB_01`은 연속 장면보다 대화를 충분히 확보해 `발견 → 상황 이해 → 선택 → 변화/정리 → 마무리`의 작은 완결 구조를 한 회차 안에서 보여 준다. 단, 설명을 늘리기 위해 새로운 사건·퀘스트·이미지를 추가하지 않는다.

## 실제 배경과 신규 이미지

기존 배경:

- 별빛 천문대: `BG05_starlight_observatory_1920x1080_015.png`
- 유리 온실: `BG06_glass_greenhouse_1920x1080_016.png`
- 대서고: `BG04_grand_library_1920x1080_014.png`

Production 신규 이미지 요청:

- `ART-L01` — 오래된 관측 일기 1장, OBS 4회 공용
- `ART-L02` — 시든 작은 허브 화분
- `ART-L03` — 같은 화분의 건강한 상태
- `ART-L04` — 책장 위에 가로로 놓인 책 한 권

`ART-L01~L04`는 제작 식별자다. 실제 asset 파일이 확인되기 전까지 임의 파일명을 만들지 않는다.

## 파일

- [LOC_OBS_01 · 틀린 별자리](LOC_OBS_01.md)
- [LOC_OBS_02 · 늦은 관측](LOC_OBS_02.md)
- [LOC_OBS_03 · 자리 맡아 주기](LOC_OBS_03.md)
- [LOC_OBS_04 · 빈 관측 칸](LOC_OBS_04.md)
- [LOC_GH_01 · 시든 화분 돌보기](LOC_GH_01.md)
- [LOC_LIB_01 · 책 한 권 제자리 찾기](LOC_LIB_01.md)

## 이후 작업 순서

사용자가 확정한 공통 제작 순서는 다음과 같다.

```text
공통 대화 시퀀스 작성·사람 검수
→ 32인 Character Set 작성
→ 주인공/상대방 Voice 및 배역 충돌 검산
→ 작성용 alias를 canonical choiceId로 정규화
→ 같은 SQLite v4에 Location Story 32인 대화 데이터 적재
→ 실제 DB 실행 검증
```

현재 상태는 **공통 대화 시퀀스 작성 완료 + Location DB v4 스키마/마스터 seed 작성 완료 / 32인 Character Set 작성 전**이다. `backend/database/sqlite/seed_location_story_master.py`로 장소·Story·발생 규칙·13개 canonical choice·효과·세린·온실 ROLE까지 먼저 적재할 수 있지만, 32인 세트가 없으므로 `dialogue_sequences/nodes/options`는 아직 만들지 않는다. 상세는 `backend/database/LOCATION_STORY_DB_SPEC.md`를 따른다.
