# API

API 서버 코드와 계약을 두는 공간입니다.

- 언어/프레임워크: **Python + FastAPI**
- 배포: **Render Web Service**
- 인증: Firebase Authentication에서 발급한 ID Token 검증
- 계정 정책: Email/Password 가입 후 이메일 인증 완료 사용자만 보호 API 사용
- 데이터: Cloud Firestore
- 생성형 AI: Gemini API. 기본 모델 `gemini-3.8-flash`, `GEMINI_MODEL` 환경변수로 교체

FastAPI는 저장·회차·해금·엔딩 판정처럼 신뢰해야 하는 게임 규칙을 처리하고, 엔딩 직업 확정 후 Gemini에 개인화 편지 생성을 요청합니다. 실제 endpoint와 request/response 계약은 구현 시 별도로 정의합니다.
