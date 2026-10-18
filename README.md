# LUMIA

LUMIA는 9~11세 어린이가 룬 학원 아르카디아의 학생이 되어 친구와 관계를 맺고, 사건을 탐색하며, 자신의 선택으로 세계의 변화를 만드는 웹 기반 판타지 생활 어드벤처 게임입니다. 선택을 점수나 정답으로 평가하지 않고 대화·관계·환경의 반응으로 보여주는 것이 핵심 원칙입니다.

## 팀원 및 역할

| 팀원 | 역할 | 주요 담당 |
|---|---|---|
| **이대선** | 엔진 · 게임 UI | 게임 엔진, 플레이 시스템, 게임 화면/UI 구현 및 기술 통합 |
| **최현서** | 스토리 | 메인·NPC·장소·서브·엔딩 시나리오 |
| **최주원** | 디자인 | 캐릭터·배경·아이템·UI 그래픽 등 시각 디자인 및 자원 검수 |
| **박순몽** | 백엔드 · 콘텐츠 기획 · PM | API·DB, 콘텐츠 시스템 기획, 일정·이슈·통합 조율 |

세부 R&R과 협업 경계는 [팀 역할 문서](document/05_TEAM_ROLES.md)를 기준으로 합니다.

## 핵심 AI 기능

LUMIA는 52주 플레이가 끝나면 게임 규칙으로 미래 직업 엔딩을 먼저 결정합니다. 정규 직업 10종의 필수 조건을 하나도 만족하지 못하면 준비된 직업을 억지로 배정하지 않고 별도 fallback 직업 **`별길 개척자`** 를 보여 줍니다. 이후 생성형 AI가 **확정된 직업 + 실제 플레이 기록 4~6개 + 성장 방향 + 필요한 중요 선택**을 바탕으로 플레이어마다 다른 개인화 엔딩 편지를 작성합니다. AI는 직업 엔딩을 임의로 바꾸지 않으며, 이번 플레이에서 보여 준 방식을 회고하고 해당 직업에서의 미래 모습을 따뜻하게 상상해 주는 역할을 합니다.

상세한 입력·출력·안전 기준과 실패 대응은 [AI 핵심 기능 — 개인화 엔딩 편지](document/09_AI_ENDING_LETTER.md)를 참고합니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| Game | **Phaser 3**, JavaScript, Node.js, Vite |
| Frontend Deploy | **Vercel** |
| Backend | **Python, FastAPI** |
| API Deploy | **Render** |
| Authentication | **Firebase Authentication** — Email/Password + 이메일 인증 |
| Database | **Cloud Firestore** (중앙 데이터) + **SQLite WASM/OPFS** (플레이어 로컬 데이터) |
| Generative AI | **Gemini API** — 기본 `gemini-3.8-flash`, 환경변수로 모델 교체 |

프론트는 [LUMIA Vercel 주소](https://lumia-web-six.vercel.app/)에 배포했습니다. [Render API](https://lumia-api-pcxd.onrender.com/health)는 `/health` 응답을 확인했으며, 실제 Firebase 계정·저장·게임 흐름의 운영 검증은 Phase 12에서 진행 중입니다. 기술 선택 근거와 환경변수 기준은 [기술 스택 문서](document/10_TECH_STACK.md)에 정리합니다.

## 처음 읽을 문서

| 대상 | 문서 | 내용 |
|---|---|---|
| 팀원 | [문서 안내](document/00_README.md) | 읽는 순서와 기준 |
| 팀원 | [프로젝트 개요](document/01_PROJECT_OVERVIEW.md) | 목표, 대상, 원칙, 환경 |
| 팀원 | [세계관](document/02_WORLDVIEW.md) | 룬, 그림자 룬, 아르카디아 |
| 팀원 | [캐릭터](document/03_CHARACTERS.md) | 학생 32명과 주요 인물 |
| 팀원 | [이미지 자원](document/04_ASSETS.md) | 카테고리, 상태, 이미지 연결 |
| 팀원 | [팀 역할](document/05_TEAM_ROLES.md) | 작업 영역과 담당 확인 항목 |
| 팀원 | [게임 콘텐츠](document/06_GAME_CONTENT.md) | 콘텐츠 유형과 플레이 흐름 |
| 팀원·AI | [Final Project 요구사항](document/08_REQUEST.md) | 필수 조건, 산출물, 참고 예시와 LUMIA 점검 항목 |
| 팀원 | [AI 핵심 기능](document/09_AI_ENDING_LETTER.md) | 개인화 엔딩 편지의 역할, 데이터 흐름, 안전 기준 |
| 팀원 | [기술 스택](document/10_TECH_STACK.md) | 확정 기술, 아키텍처, 선정 이유, 환경변수 기준 |
| 팀원·제출 | [Final Project 기획서](document/11_PROJECT_PLAN.md) | 문제 정의, 대상 사용자, AI 활용 방식, 일정, R&R |
| 팀원·제출 | [요구 명세·아키텍처](document/12_REQUIREMENTS_ARCHITECTURE.md) | 기능·비기능 요구사항, 최소 기록 조회, 시스템 구조 |
| 팀원 | [AI 작업 시작 안내](document/07_AI_WORK_GUIDE.md) | AI로 작업을 시작하는 방법과 프롬프트 |
| AI | [AI 시작 문서](document_for_ai/00_READ_FIRST.md) | 읽는 순서, 우선순위, 변경 확인 규칙 |

## 디렉터리 구조

```text
asset/             게임에 활용할 이미지 자원과 자원 안내
  character/       학생 및 인물 이미지
  item/            아이템과 조사 오브젝트
  background/      장소 배경
  environment/     환경 구성 요소
  puzzle/          퍼즐 이미지
  ui/              인터페이스 이미지
  effect/          시각 효과
document_for_ai/   AI에게 먼저 제공할 간결한 기준 문서
document/          팀원이 읽는 상세 문서
engine/            게임 엔진 담당 작업 공간
story/             메인·NPC·장소·서브·엔딩 이야기
backend/           API·DB·향후 관리자 영역
lumia/             최종 통합 결과물 영역
prototype/         기존 기준물 보존 영역
```

새 작업의 기준은 `document/`와 `document_for_ai/`입니다. 확정되지 않은 사항은 문서에 `미정` 또는 `검토 필요`로 표시했습니다. 과거 상세 원문은 현재 저장소에서 제공되지 않으므로, 확인하지 못한 원문을 새로운 결정의 근거로 사용하지 마세요.

## AI / Coding Agent 안내

작업 전 [AI 시작 문서](document_for_ai/00_READ_FIRST.md)와 작업 대상 폴더의 README를 읽으세요. 평소에는 담당 영역 밖 파일을 임의로 수정하지 않습니다. 상세한 경계와 공통 문서 갱신 규칙은 [협업 규칙](document_for_ai/06_WORKSPACE_RULES.md)을 따릅니다.
