# Database

데이터베이스는 **Cloud Firestore**를 사용합니다.

사용자 데이터의 논리/물리 스키마와 Firestore collection/document 구조는 [SCHEMA.md](SCHEMA.md)를 기준으로 합니다.

## 저장 원칙

- Firebase Authentication UID와 연결되는 사용자 메타
- 계정 전역 Global Meta Progress
- 계정 전역 플레이 누적 통계 및 해금 조건 처리 상태
- 5개 세이브 슬롯과 현재 active run
- 캐릭터·펫·배지·퍼즐·배경·엔딩 해금 상태
- 플레이 완료 캐릭터와 누적 행동 카운터
- 엔딩 판정 및 AI 편지에 필요한 실제 플레이 기록
- 완료 회차별 엔딩 결과와 개인화 편지 기록

캐릭터 정의, 스토리 원본, 배지 조건, 펫 보정값, 엔딩 조건 같은 **게임 마스터 데이터는 가능한 한 Git의 코드/JSON/문서로 버전 관리**하고 Firestore에는 사용자별 상태를 중심으로 저장합니다.

Email/Password 인증과 패스워드 관리는 Firebase Authentication이 담당하며 Firestore에는 비밀번호를 저장하지 않습니다. Firestore 사용자 데이터는 Firebase UID를 기준 키로 사용합니다.

## 문서

- [논리/물리 DB 스키마](SCHEMA.md)

Security Rules, 실제 API 요청/응답 모델, 마이그레이션 정책은 FastAPI 구현 단계에서 이 스키마를 기준으로 구체화합니다.
