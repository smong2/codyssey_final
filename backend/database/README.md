# Database

데이터베이스는 **플레이어 브라우저의 로컬 SQLite + 중앙 Cloud Firestore**로 나눕니다. SQLite는 플레이어의 마스터·화면 캐시와 임시 상태를 담당하고, Firestore는 계정별 확정 게임 상태와 관리자 조회·통계·설정·감사로그를 담당합니다.

저장 경계와 로컬 SQLite 테이블·관리자 Firestore 문서 목록은 [STORAGE_DESIGN.md](STORAGE_DESIGN.md), 사용자 데이터의 기존 논리/물리 스키마는 [SCHEMA.md](SCHEMA.md)를 기준으로 합니다.

## 저장 원칙

- Firebase Authentication UID와 연결되는 사용자 메타
- 계정 전역 Global Meta Progress
- 계정 전역 플레이 누적 통계 및 해금 조건 처리 상태
- 5개 세이브 슬롯과 현재 active run
- 캐릭터·펫·배지·퍼즐·배경·엔딩 해금 상태
- 플레이 완료 캐릭터와 누적 행동 카운터
- 엔딩 판정 및 AI 편지에 필요한 실제 플레이 기록
- 완료 회차별 엔딩 결과와 개인화 편지 기록

캐릭터 정의, 스토리 원본, 배지 조건, 펫 보정값, 엔딩 조건 같은 **게임 마스터 데이터의 원본은 Git으로 버전 관리**합니다. 플레이어의 반복 조회에 필요한 사본을 로컬 SQLite에 적재하며, 실제 보상·해금·엔딩 판정은 서버가 검증합니다.

Email/Password 인증과 패스워드 관리는 Firebase Authentication이 담당하며 Firestore에는 비밀번호를 저장하지 않습니다. Firestore 사용자 데이터는 Firebase UID를 기준 키로 사용합니다.

## 문서

- [Firestore 사용자 논리/물리 스키마](SCHEMA.md)
- [플레이어 로컬 SQLite 상세 스키마](sqlite/SCHEMA.md)
- [SQLite 기본 테이블 생성 SQL](sqlite/001_initial.sql)
- [SQLite 캐릭터별 대화 테이블 추가 SQL](sqlite/002_dialogue_sequences.sql)
- [SQLite Dialogue 런타임/효과 v3 마이그레이션](sqlite/003_dialogue_runtime_content.sql)
- [SQLite Story 발생 정책 v4 마이그레이션](sqlite/004_story_event_rules.sql)
- [펫 대사 테이블 확장](sqlite/pet_dialogues_extension.sql) · [펫 대사 200개 적재기](sqlite/seed_pet_dialogues.py)
- [Main Story 대화 마스터 적재기](sqlite/seed_dialogue_content.py)
- [NPC Story 마스터·32인 대화 적재기](sqlite/seed_npc_story.py)
- [NPC Story v4 검증 SQL](sqlite/validate_npc_story.sql)
- [NPC Story DB 스키마·적재 명세](NPC_STORY_DB_SPEC.md)
- [Location Story 마스터·32인 대화 적재기](sqlite/seed_location_story_master.py)
- [수업·모험·휴식·특수 활동 마스터 적재기](sqlite/seed_activities.py)
- [Location Story v4 검증 SQL](sqlite/validate_location_story.sql)
- [Story 선택 보상 전용 재적재기](sqlite/seed_story_choice_rewards.py)
- [Story 선택 보상 통합 검증 SQL](sqlite/validate_story_choice_rewards.sql)
- [Location Story DB 스키마·적재 명세](LOCATION_STORY_DB_SPEC.md)
- [Firestore + SQLite 저장 경계와 테이블 목록](STORAGE_DESIGN.md)

현재 `seed_dialogue_content.py`는 Main Story 32인 대화와 **40 canonical choice / 102 choice effect**, `seed_npc_story.py`는 NPC 3체인·12이벤트의 **24 canonical choice / 64 choice effect / 384 dialogue sequence / 768 dialogue option**, `seed_location_story_master.py`는 Location 6개 master와 **13 canonical choice / 39 choice effect / 192 dialogue sequence / 416 dialogue option / 3616 dialogue node**를 생성하도록 구현되어 있습니다. Location seed는 공통 master와 CH01~CH32 Character Set을 직접 병합하고 signature/선택 문구/reaction, 온실 배역, canonical choice 연결, FK, graph reachability를 함께 검증합니다. 세 Story 유형의 선택 보상 합계 **77 canonical choice / 205 choice effect**는 사용자가 `seed_story_choice_rewards.py --bootstrap-missing` 실행 결과를 정상 확인했습니다. **2026-10-18 사용자가 Location 32인 seed를 실제 로컬 SQLite에 실행해 `192 sequences / 416 options / validation: OK` 정상 결과를 확인했으므로 Location DB 적재·검수도 완료 상태입니다.**

개발용 SQLite 파일의 기본 경로는 **`backend/database/sqlite/lumia-content.sqlite3`**입니다. 기존 Main DB에 NPC Story를 이어 넣을 때는 저장소 루트에서 `python3 backend/database/sqlite/seed_npc_story.py --migrate --version dev-dialogue-v1`를 실행합니다. Location은 같은 버전에 `python3 backend/database/sqlite/seed_location_story_master.py --migrate --version dev-dialogue-v1`를 실행하면 master/효과와 함께 CH01~CH32 대화까지 다시 적재합니다. `--db`는 다른 경로를 사용할 때만 지정하면 됩니다. Location 정상 결과는 **192 sequences / 416 options / 3616 nodes**입니다.

이미 Main/NPC/Location canonical `story_choices` 77개가 들어 있는 v4 DB에서 **선택 스탯 효과만 최신 Production 값으로 갱신**하려면 전체 대화를 다시 seed하지 않고 `python3 backend/database/sqlite/seed_story_choice_rewards.py --version dev-dialogue-v1`를 사용합니다. 이 명령은 `story_choice_effects`만 77개 선택 기준으로 재생성하고 `40/102 + 24/64 + 13/39 = 77 choices / 205 effects`를 검증합니다.

기존 DB가 Main만 있고 NPC/Location `story_choices`가 아직 없다면 `python3 backend/database/sqlite/seed_story_choice_rewards.py --version dev-dialogue-v1 --bootstrap-missing`를 사용합니다. 스크립트가 도메인별 canonical choice를 비교해 **불일치한 Main/NPC/Location만 기존 정식 full seed로 먼저 적재**한 뒤 선택 보상 205행을 갱신합니다. 현재 Main만 있는 개발 DB에서는 보통 NPC와 Location만 bootstrap됩니다.

Phase 7 일정 API용 활동 마스터는 Story seed 이후 `python3 backend/database/sqlite/seed_activities.py --version dev-dialogue-v1`로 추가합니다. 수업 5개는 현행 일정에 사용하고 룬 핀 훈련 ID는 기존 일정 호환용으로 유지하며, 모험 3개는 장소별 `ADV_GREENHOUSE / ADV_LIBRARY / ADV_OBSERVATORY`, 휴식은 `REST_DEFAULT`, 특수 활동은 `fairy-trade`입니다. 기존 행은 보존하되 정령 화분 정리의 성장 대상만 지식에서 솜씨로 갱신하며, 그 외 같은 ID의 계약이 다르면 트랜잭션을 중단합니다. 이 로컬 개발 DB는 11개 활동·6개 미니게임을 적재해 무결성을 확인했지만, 배포 빌드에는 해당 seed 명령을 별도로 연결해야 합니다. 모험 맵의 `previewOnly` 엔진 상태 및 수업·모험 결과 서버 검증은 별도 완료 조건입니다.

Security Rules, 실제 API 요청/응답 모델, 브라우저 SQLite 마이그레이션 실행·동기화 정책은 구현 단계에서 이 설계를 기준으로 구체화합니다. 저장소 작업 도구 자체에는 임의 셸 실행 기능이 없지만, 실제 로컬 SQLite 실행 결과는 사용자가 별도로 확인한 경우 문서에 그 검증 상태를 명시합니다.
