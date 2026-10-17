# API

API 서버 코드와 계약을 두는 공간입니다.

- 언어/프레임워크: **Python + FastAPI**
- 배포: **Render Web Service**
- 인증: Firebase Authentication에서 발급한 ID Token 검증
- 계정 정책: Email/Password 가입 후 이메일 인증 완료 사용자만 보호 API 사용
- 데이터: Cloud Firestore(계정별 확정 상태·관리자 데이터). 플레이어 브라우저의 로컬 SQLite는 서버 DB가 아니며 [저장 경계](../database/STORAGE_DESIGN.md)를 참조
- 생성형 AI: Gemini API. 기본 모델 `gemini-3.8-flash`, `GEMINI_MODEL` 환경변수로 교체

FastAPI는 저장·회차·해금·엔딩 판정처럼 신뢰해야 하는 게임 규칙을 처리하고, 엔딩 직업 확정 후 Gemini에 개인화 편지 생성을 요청합니다.

대화 기능은 팀에서 확정한 [대화 시스템 안내](../../document/dialogue/README.md)와 [Dialogue API · Engine 계약](../../document/dialogue/01_ENGINE_API_CONTRACT.md)을 따른다. 대화 마스터는 FastAPI가 접근 가능한 서버 측 콘텐츠 저장소에서 읽고, 현재 플레이 캐릭터·`storyCast`·자원 경로·스킵 가능 여부를 해석해 엔진용 `LINE / IMAGE / CHOICE / END` 순차 payload로 변환한다. 선택 보상은 payload에 노출하지 않고 `completeDialogue` 시 서버가 검증·계산·저장한다. 실제 HTTP endpoint 경로와 인증/오류 코드는 구현 단계에서 이 계약을 유지하는 범위로 확정한다.
