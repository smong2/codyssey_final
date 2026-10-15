# 백엔드 작업 영역

이 디렉터리는 박순몽이 담당하는 백엔드 영역입니다. 백엔드는 **Python + FastAPI** 기반 API 서버로 구현하고 **Render Web Service**에 배포합니다. 인증은 Firebase Authentication, 데이터 저장은 Cloud Firestore, 생성형 AI는 Gemini API를 사용합니다.

| 디렉터리 | 용도 |
|---|---|
| [api/](api/README.md) | API 서버 코드와 계약 |
| [database/](database/README.md) | Firestore 사용자 데이터 구조와 저장 계약 |
| [admin/](admin/README.md) | 동일 계정 인증 기반 읽기 전용 플레이 기록·엔딩 편지 조회 페이지 |

게임 클라이언트는 Firebase Authentication으로 Email/Password 가입·로그인 및 이메일 인증을 수행하고, 이메일 인증을 마친 뒤에만 본편 게임을 이용합니다. 게스트 플레이는 Final Project 범위에서 제외합니다. FastAPI는 Firebase ID Token과 이메일 인증 상태를 검증합니다. Gemini API 키와 Firebase Admin 자격 증명은 Render의 비밀 환경변수로 관리하고 클라이언트에 노출하지 않습니다. 계정 탈퇴 시 해당 UID의 Firestore 사용자 데이터와 Firebase Auth 계정을 모두 삭제하는 정책을 사용합니다. 세부 API 경로와 Firestore 컬렉션 계약은 구현 단계에서 확정합니다.
