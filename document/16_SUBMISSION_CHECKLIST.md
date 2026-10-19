# LUMIA Final Project 최종 제출 체크리스트

> **기준:** `document/08_REQUEST.md`  
> **목적:** Final Project의 필수 조건과 실제 제출 근거를 1:1로 연결해 최종 제출 누락을 방지한다.

## 1. 필수 조건 점검

| 요구사항 | LUMIA 적용 | 근거 | 상태 |
|---|---|---|:---:|
| 생성형 AI 또는 AI Agent가 서비스의 핵심 기능 | 52주 실제 플레이 기록 기반 Gemini 개인화 엔딩 편지 | `document/09_AI_ENDING_LETTER.md`, `document/14_AI_TECH_SPECIFICATION.md` | ✅ |
| 필수 기술 요소 2개 이상 | Automated Workflow + Long-term Memory | `document/14_AI_TECH_SPECIFICATION.md` | ✅ |
| 외부 배포 | 게임 Vercel + 관리자 Vercel + FastAPI Render | `README.md`, `document/실행방법.md` | ✅ |
| 실제 사용자 최소 5명 테스트 | T01~T05, PC·태블릿 / Chrome·Safari | `document/13_USER_TEST_REPORT.md` | ✅ |
| 피드백 수집·반영 | 8개 주요 피드백을 우선순위화하고 6개 직접 반영, 1개 부분 반영, 1개 후속 개선 | `document/13_USER_TEST_REPORT.md` | ✅ |
| 모든 소스·문서 GitHub 관리 | `smong2/codyssey_final` | 루트 `README.md`, GitHub 이력 | ✅ |
| AI 생성 콘텐츠 안내 | Gemini 편지에 AI 생성 안내, fallback 구분 | `document/09_AI_ENDING_LETTER.md`, `document/12_REQUIREMENTS_ARCHITECTURE.md` | ✅ |
| 개인정보 안전 관리 | Email 외 최소 수집, 동의 버전/시각 기록, 탈퇴 시 사용자 데이터 삭제, 비밀키 서버 환경변수 관리 | `document/12_REQUIREMENTS_ARCHITECTURE.md`, `document/content/08_ACCOUNT_POLICY.md` | ✅ |

## 2. 최종 산출물 점검

| 산출물 | 제출 근거 | 상태 |
|---|---|:---:|
| 프로젝트 기획서 | `document/11_PROJECT_PLAN.md` | ✅ |
| 기능·비기능 요구 명세·아키텍처 | `document/12_REQUIREMENTS_ARCHITECTURE.md` | ✅ |
| AI 핵심 기능 설계 | `document/09_AI_ENDING_LETTER.md` | ✅ |
| AI 기술 보고서·구현 증빙 | `document/14_AI_TECH_SPECIFICATION.md` | ✅ |
| 기술 선택 근거 | `document/10_TECH_STACK.md` | ✅ |
| 배포·실행 방법 | `document/실행방법.md`, `README.md` | ✅ |
| 사용자 테스트·개선 기록 | `document/13_USER_TEST_REPORT.md` | ✅ |
| GitHub README | `README.md` | ✅ |
| 발표 자료 원고 | `document/15_PRESENTATION.md` | ✅ |
| 발표용 슬라이드 | 공용 저장소에는 공개용 대체(fake) PPT/PDF, 실제 발표에는 별도 비공개 real PPT 사용 | ✅ 준비 |

## 3. 운영 서비스 주소

- **Game:** `https://lumia-web-six.vercel.app/`
- **Admin Console:** `https://codyssey-final-ujhz.vercel.app/`
- **Backend API:** `https://lumia-api-pcxd.onrender.com/`
- **Health:** `https://lumia-api-pcxd.onrender.com/health`
- **GitHub:** `https://github.com/smong2/codyssey_final`

## 4. 구현·검증 근거

- Firebase 가입·이메일 인증·게임 진입 확인
- 5개 Save Slot·새 회차·Story·활동 저장 확인
- 재접속 후 진행 상태 복구 확인
- 실제 Gemini API 생성 및 서버 검증 성공 확인
- 52주 테스트 fixture를 이용한 **엔딩 진입 → 서버 직업 결정 → Gemini 편지 생성 → 엔딩 표시 → 회차 완료** 운영 E2E 확인
- 일반 사용자와 관리자 API 권한 경계 확인
- 계정 탈퇴 시 Firebase Auth와 Firestore 사용자 데이터 삭제 검증 기록
- 실제 사용자 5명 테스트 및 피드백 반영

상세 운영 검증은 `backend/api/deploy/PHASE12_VALIDATION.md`를 사용한다.

## 5. 사용자 테스트 결과 요약

실제 사용자 5명은 모두 회원가입/로그인, 게임 시작, 캐릭터 선택을 완료했다. 사용자 테스트에서 가장 큰 문제는 주간 일정 등록 UX였고, Story 선택지 가독성, 모험의 목표 전달, 저장/이어하기 정보, 게임 진행 속도, 캐릭터별 대사 차별화, 수업 가이드가 주요 개선 항목으로 확인됐다.

주요 반영 결과:

- 콘텐츠 선택만으로 빈 평일 일정에 순차 자동 등록
- Story 선택 버튼 스킨·크기·긴 버튼 처리
- 모험에 숨은 목표·단서·조사·시간 제한과 추가 맵 적용
- Save Slot에 캐릭터·주차·저장일시 표시
- 저장 요청 묶음·일부 비동기 처리·Render Region 조정
- 32종 캐릭터별 대화와 NPC 반응 세트
- 수업 화면 플레이 방법 안내

개선 후 별도의 사용자 재테스트는 수행하지 않았으며, Final Project 원 요구사항의 `5명 테스트 + 피드백 반영` 근거와 구분해 기록한다.

## 6. 발표 시 반드시 설명할 기술적 의사결정

1. **왜 AI가 핵심인가:** 52주 누적 기록의 조합을 고정 문장보다 개인화된 서사 보상으로 돌려주기 위해 사용했다.
2. **왜 AI Agent를 쓰지 않았나:** 직업·보상처럼 재현 가능해야 하는 게임 결과를 자율 Agent에 맡기지 않고, 결정론적 규칙 + 생성형 AI 표현으로 책임을 분리했다.
3. **Long-term Memory가 일반 세이브와 다른 이유:** 여러 세션의 플레이 기억을 52주 종료 시 다시 읽어 실제 Gemini 입력에 사용한다.
4. **Automated Workflow:** 직업 판정 → Memory 선별 → Gemini → 검증 → 재시도/fallback → 저장 → 엔딩 표시가 자동 연결된다.
5. **왜 Phaser인가:** 기존 데모 때문이 아니라 브라우저 우선 2D 실행, WebGL/Canvas, JavaScript 웹 생태계와 단순한 배포 경계를 우선했다.
6. **왜 관리자 UI는 Next.js인가:** 게임 Canvas가 아니라 표·검색·통계·설정 Form 중심의 DOM 업무 UI이기 때문이다.

## 7. 제출 직전 수동 확인

아래는 문서 작성이 아니라 **발표·제출 당일 수행할 운영 확인**이다.

- [ ] Game URL 접속 및 로그인 화면 확인
- [ ] `/health` 호출로 Render warm-up
- [ ] 시연 계정 이메일 인증·로그인 확인
- [ ] 시연용 Save Slot과 엔딩 결과 준비
- [ ] Admin URL 로그인 화면 확인
- [ ] 공용 저장소에 등록된 발표 파일이 **공개용 대체(fake) 자료**인지 확인
- [ ] 실제 발표용 **real PPT가 공용 저장소나 공개 링크에 포함되지 않았는지** 확인
- [ ] 실제 발표용 real PPT가 발표 장비에서 정상 열리는지 확인
- [ ] 공개용/실제 발표용 자료 모두에 API Key, 서비스 계정 JSON, ID Token, 실제 사용자 이메일이 없는지 확인
- [ ] 인터넷 장애 대비 핵심 화면 캡처 준비
- [ ] Git 작업공간이 깨끗하고 최종 변경이 GitHub `main`에 반영됐는지 확인

## 8. 최종 판단

문서와 서비스 근거 기준으로 Final Project의 필수 제출 산출물은 모두 준비되어 있다. 남은 작업은 새로운 제출 문서 작성이 아니라 **최종 변경 커밋·푸시, 발표 슬라이드 최종 디자인 검수, 발표 당일 운영 URL 점검과 실제 제출 절차**다.

