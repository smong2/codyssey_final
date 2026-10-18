# Location Story protagonist별 `LOC_GREENHOUSE_STUDENT`

`story/location/LOCATION_STORY_PRODUCTION.md`와 `backend/database/LOCATION_STORY_DB_SPEC.md`의 현재 역할 후보·충돌 정책을 적용한 검산표다.

선정 규칙:

1. 현재 protagonist 제외
2. 현재 회차 `MAIN_GREENHOUSE_STUDENT` 제외
3. 가능하면 Main assignment_order 1~7에 이미 사용된 학생 제외
4. 후보 우선순위 `요한(CH19) → 하젤(CH20) → 엘리아(CH10) → 실비아(CH28) → 리네(CH12) → 미엘(CH27) → 세라(CH02) → 에녹(CH09)` 적용
5. 1·2를 지키면서 3만 fallback 가능

현재 Main `CAST_MATRIX.md`와 결합하면 모든 32명에서 fallback 없이 결정된다.

| protagonist | MAIN_GREENHOUSE_STUDENT | LOC_GREENHOUSE_STUDENT |
|---|---|---|
| CH01 카엘 | 리네 CH12 | 요한 CH19 |
| CH02 세라 | 리네 CH12 | 요한 CH19 |
| CH03 시온 | 리네 CH12 | 요한 CH19 |
| CH04 로엔 | 리네 CH12 | 요한 CH19 |
| CH05 레온 | 리네 CH12 | 요한 CH19 |
| CH06 벨라 | 리네 CH12 | 요한 CH19 |
| CH07 유안 | 리네 CH12 | 요한 CH19 |
| CH08 아이리스 | 리네 CH12 | 요한 CH19 |
| CH09 에녹 | 리네 CH12 | 요한 CH19 |
| CH10 엘리아 | 리네 CH12 | 요한 CH19 |
| CH11 루카 | 리네 CH12 | 요한 CH19 |
| CH12 리네 | 요한 CH19 | **하젤 CH20** |
| CH13 아드리안 | 리네 CH12 | 요한 CH19 |
| CH14 스텔라 | 리네 CH12 | 요한 CH19 |
| CH15 로빈 | 리네 CH12 | 요한 CH19 |
| CH16 티아 | 리네 CH12 | 요한 CH19 |
| CH17 바론 | 리네 CH12 | 요한 CH19 |
| CH18 클레어 | 리네 CH12 | 요한 CH19 |
| CH19 요한 | 리네 CH12 | **하젤 CH20** |
| CH20 하젤 | 리네 CH12 | 요한 CH19 |
| CH21 빅터 | 리네 CH12 | 요한 CH19 |
| CH22 로렌 | 리네 CH12 | 요한 CH19 |
| CH23 테오 | 리네 CH12 | 요한 CH19 |
| CH24 미리엄 | 리네 CH12 | 요한 CH19 |
| CH25 렌 | 리네 CH12 | 요한 CH19 |
| CH26 다나 | 리네 CH12 | 요한 CH19 |
| CH27 미엘 | 리네 CH12 | 요한 CH19 |
| CH28 실비아 | 리네 CH12 | 요한 CH19 |
| CH29 카일 | 리네 CH12 | 요한 CH19 |
| CH30 제나 | 리네 CH12 | 요한 CH19 |
| CH31 니코 | 리네 CH12 | 요한 CH19 |
| CH32 리코 | 리네 CH12 | 요한 CH19 |

`LOC_GH_01`의 DB `speaker_ref`는 캐릭터별로 바꾸지 않고 항상 `ROLE:LOC_GREENHOUSE_STUDENT`를 유지한다. Character Set의 reaction 문구만 위 실제 actor Voice에 맞춰 작성하고 FastAPI가 현재 `activeRun.storyCast`를 실제 캐릭터로 해석한다.
