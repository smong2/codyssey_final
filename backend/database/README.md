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
- [Firestore + SQLite 저장 경계와 테이블 목록](STORAGE_DESIGN.md)

Security Rules, 실제 API 요청/응답 모델, 브라우저 SQLite 마이그레이션 실행·동기화 정책은 구현 단계에서 이 설계를 기준으로 구체화합니다.
