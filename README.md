# LUMIA

> **9~11세 어린이를 위한 웹 기반 판타지 생활 육성 어드벤처**  
> 52주 동안 수업·모험·관계·선택을 쌓고, 실제 플레이 기록을 바탕으로 생성형 AI가 플레이어만의 엔딩 편지를 완성합니다.

## Live Service

- **Game:** https://lumia-web-six.vercel.app/
- **Backend API:** https://lumia-api-pcxd.onrender.com/
- **API Health:** https://lumia-api-pcxd.onrender.com/health
- **Admin Console:** https://codyssey-final-ujhz.vercel.app/

최종 사용자는 별도 설치 없이 Chrome, Edge, Safari 등 현대적인 웹 브라우저에서 Game URL에 접속해 플레이할 수 있습니다. Email/Password로 가입한 뒤 이메일 인증을 완료하면 게임을 시작할 수 있습니다.

---

## 1. 프로젝트 소개

LUMIA는 룬 학원 **아르카디아**에서 52주를 보내며 친구와 관계를 맺고, 수업과 모험을 경험하고, 여러 사건 앞에서 자신의 선택을 만들어 가는 웹 기반 판타지 생활 육성 게임입니다.

프로젝트는 **아이들이 다른 사람의 마음을 이해하고 배려하며 함께 문제를 풀어 보는 경험을 어떻게 만들 수 있을까**라는 질문에서 출발했습니다. 플레이어의 선택을 선악 점수나 정답으로 평가하지 않고, 인물의 반응과 세계의 변화로 되돌려 주는 것을 핵심 원칙으로 삼았습니다.

52주의 마지막에는 규칙 엔진이 플레이 결과에 따라 미래 직업 엔딩을 먼저 결정합니다. 그 뒤 생성형 AI가 이번 회차에서 실제로 저장된 활동·성향·중요 선택을 바탕으로 **개인화된 엔딩 편지**를 작성합니다. 같은 직업 엔딩이라도 플레이 과정이 다르면 다른 회고와 미래 이야기를 받을 수 있도록 설계했습니다.

### 주요 콘텐츠

- 52주 단위의 주간 일정 육성 루프
- 수업 · 모험 · 휴식 · 강제휴식 · 특수 활동
- 5종의 본편 수업 미니게임
- 온실 · 대서고 · 천문대 3개 지역 모험
- Main / NPC / Location Story
- 플레이 캐릭터 32종
- 펫 10종
- 배지 200종과 마이룸 퍼즐·배경 수집
- 정규 직업 엔딩 10종 + fallback 엔딩 `별길 개척자`
- 계정당 5개 Save Slot
- 52주 Long-term Play Memory 기반 Gemini 개인화 엔딩 편지

---

## 2. 핵심 AI 활용

LUMIA에서 생성형 AI는 부가 기능이 아니라 **52주 플레이의 최종 보상을 완성하는 핵심 기능**입니다.

### 개인화 엔딩 편지

```text
52주 플레이
    ↓
Long-term Play Memory 누적
    ↓
규칙 엔진이 직업 엔딩 확정
    ↓
대표 활동 기록 4~6개 + 중요 선택 최대 2개 선별
    ↓
Gemini API 개인화 편지 생성
    ↓
서버 검증 / 재시도
    ↓ 실패 시
검수된 fallback 편지
    ↓
Ending Record 영구 저장
```

AI는 플레이어의 직업을 선택하거나 성격·진로를 진단하지 않습니다. **직업·보상·해금과 같은 게임 결과는 결정론적 서버 규칙이 먼저 확정**하고, Gemini는 검증된 실제 플레이 기록을 자연어 이야기로 표현하는 역할만 담당합니다.

Final Project의 필수 기술 요소 중 LUMIA가 적용한 두 요소는 다음과 같습니다.

- **Automated Workflow** — 직업 판정 → Memory 선별 → Gemini 호출 → 응답 검증 → 재시도/fallback → 결과 저장을 하나의 엔딩 파이프라인으로 연결
- **Long-term Memory** — 여러 주차와 로그인 세션에 걸친 활동 횟수·선택·성장 기록을 회차별로 누적하고 엔딩 생성 시 다시 활용

생성된 편지는 게임 화면에서 **AI가 작성한 콘텐츠임을 표시**하며, 이미 준비된 편지는 재접속하더라도 다시 생성하지 않고 저장된 결과를 사용합니다.

상세 구조와 안전 기준은 [AI 핵심 기능](document/09_AI_ENDING_LETTER.md)과 [AI 기술 명세서](document/14_AI_TECH_SPECIFICATION.md)를 참고합니다.

---

## 3. 시스템 아키텍처

```text
[Player Browser]
        │
        ▼
Vercel
Phaser 3 + JavaScript + Vite
        │
        ├── Firebase Authentication
        │      Email / Password + 이메일 인증
        │
        ▼ Firebase ID Token
Render / FastAPI
        │
        ├── Cloud Firestore
        │      계정 · Save Slot · Global Meta · Long-term Memory · Ending Record
        │
        ├── SQLite Content Master
        │      Story · Activity · Character · Pet 등 검증된 게임 마스터
        │
        └── Gemini API
               개인화 엔딩 편지

[Operator Browser]
        │
        ▼
Next.js + Tailwind CSS Admin Console
        │
        ├── Firebase Authentication
        │
        ▼ admin 권한 검증
FastAPI /admin/*
        ├── 회원 · 플레이 기록 조회
        ├── 일/주/월 운영 통계
        ├── 성장 보상 배율 설정
        └── 감사로그
```

게임 클라이언트는 보상·해금·엔딩 같은 신뢰해야 하는 결과를 직접 확정하지 않습니다. FastAPI가 Firebase ID Token과 서버 규칙을 검증한 뒤 Firestore에 확정 상태를 저장합니다. Gemini API Key와 Firebase Admin 자격 증명은 서버 환경변수에만 보관하고 브라우저에 전달하지 않습니다.

자세한 시스템 경계와 기술 선정 이유는 [기능·비기능 요구 명세·아키텍처](document/12_REQUIREMENTS_ARCHITECTURE.md)와 [기술 스택](document/10_TECH_STACK.md)을 참고합니다.

---

## 4. 기술 스택

| 영역           | 기술                             | 사용 목적                                         |
| -------------- | -------------------------------- | ------------------------------------------------- |
| Game Engine    | **Phaser 3**                     | 브라우저 기반 2D 게임 Scene, 입력, 미니게임, 모험 |
| Game Frontend  | **JavaScript, Node.js, Vite**    | 게임 클라이언트 개발·빌드                         |
| Admin Frontend | **Next.js, React, Tailwind CSS** | 운영자용 통계·회원·설정 웹 UI                     |
| Backend        | **Python 3.13, FastAPI**         | 저장·보상·해금·엔딩 판정·관리자 API·AI 호출       |
| Authentication | **Firebase Authentication**      | Email/Password, 이메일 인증, 관리자 인증 기반     |
| Database       | **Cloud Firestore**              | 계정·세이브·해금·회차 기록·엔딩·운영 데이터       |
| Content Master | **SQLite**                       | Story·Activity 등 서버 검증용 게임 마스터         |
| Generative AI  | **Gemini API**                   | 실제 플레이 기록 기반 개인화 엔딩 편지            |
| Game Deploy    | **Vercel**                       | 사용자 웹 게임 배포                               |
| Admin Deploy   | **Vercel 별도 프로젝트**         | 운영 관리자 콘솔 배포                             |
| API Deploy     | **Render**                       | FastAPI 운영                                      |
| Collaboration  | **GitHub / Git**                 | 코드·문서·WBS·변경 이력 관리                      |

Phaser 3는 기존 데모를 재사용하기 위해서가 아니라, **브라우저에서 바로 실행되는 2D 게임을 가볍게 배포하면서 WebGL/Canvas 렌더링과 Scene·입력·Asset·Audio 등 게임 엔진 기능을 확보하기 위해 선택**했습니다. 관리자 화면은 게임 Canvas가 아니라 표·검색·통계·설정 Form이 중심이므로 Next.js + Tailwind CSS로 분리했습니다.

기술별 비교와 선정 근거는 [기술 스택과 선정 이유](document/10_TECH_STACK.md)에 정리했습니다.

---

## 5. 팀원 및 역할

| 팀원       | 역할                      | 주요 담당                                                               |
| ---------- | ------------------------- | ----------------------------------------------------------------------- |
| **이대선** | 엔진 · 게임 UI            | Phaser 게임 엔진, 플레이 시스템, 화면/UI, 입력·상호작용, 엔진 통합 검증 |
| **최현서** | 스토리                    | Main · NPC · Location · Ending 시나리오 작성 및 스토리 검수             |
| **최주원** | 디자인                    | 캐릭터·배경·아이템·UI 그래픽 제작, 자원 정리와 시각 검수                |
| **박순몽** | 백엔드 · 콘텐츠 기획 · PM | FastAPI·DB·AI 연동, 콘텐츠 규칙·밸런스 기획, 일정·WBS·영역 간 통합 조율 |

세부 R&R과 협업 경계는 [팀 역할 문서](document/05_TEAM_ROLES.md)를 기준으로 합니다.

팀은 [GitHub Project 애자일 보드](https://github.com/users/smong2/projects/2)에서 WBS 이슈의 담당자·목표 일정·진행 현황과 처리 내용을 공유했습니다. 약 3주간 기획하고 매일 회의하며 핵심 방향을 유지한 채 세부 작업을 조정했습니다. `story/`·`asset/`·`engine/`·`backend/`의 역할별 작업 공간과 공통 인계 문서를 사용해 병렬 작업을 이어 갔습니다.

---

## 6. 실행 방법

### 6.1 최종 사용자

별도 설치가 필요하지 않습니다.

1. https://lumia-web-six.vercel.app/ 접속
2. Email/Password로 회원가입
3. 수신한 인증 메일에서 이메일 인증
4. 로그인
5. 새 게임 또는 기존 Save Slot을 선택해 플레이

### 6.2 게임 엔진 로컬 미리보기

저장소를 내려받은 뒤 루트에서 실행합니다.

```bash
git clone https://github.com/smong2/codyssey_final.git
cd codyssey_final
node engine/server.mjs
```

브라우저에서 아래 주소로 접속합니다.

```text
http://127.0.0.1:4173/
```

이 실행은 엔진 개발 미리보기입니다. 실제 Firebase 계정·운영 API가 연결된 최종 서비스 확인은 위 Vercel Game URL을 사용합니다.

### 6.3 운영 웹 빌드

```bash
npm ci
npm run build:web
```

운영 웹 빌드에는 Render API 주소와 Firebase Web App 공개 설정값이 필요합니다. 서비스 계정 JSON이나 Gemini API Key 같은 서버 비밀값은 웹 환경변수에 넣지 않습니다.

### 6.4 FastAPI 로컬 실행

Python 3.13을 기준으로 저장소 루트에서 실행합니다.

```bash
python3.13 -m venv backend/api/.venv
backend/api/.venv/bin/pip install -r backend/api/requirements.txt
backend/api/.venv/bin/uvicorn backend.api.app.main:app --host 127.0.0.1 --port 8000
```

필수 서버 환경변수에는 Firebase Project ID, Firebase Admin 서비스 계정, CORS Origin이 있으며 Gemini 엔딩 생성을 사용할 경우 Gemini API Key를 추가합니다. 실제 비밀값은 Git에 커밋하지 않습니다.

### 6.5 관리자 콘솔 로컬 실행

```bash
cd manage_lumia
cp .env.example .env.local
npm ci
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다. Firebase Authentication 로그인 후 서버에서 `admin=true` 권한이 확인된 계정만 관리자 기능을 사용할 수 있습니다.

환경변수와 배포 절차의 상세 기준은 [실행·배포 방법](document/실행방법.md)과 [배포 안내](backend/api/deploy/README.md)를 참고합니다.

---

## 7. 프로젝트 결과

### 7.1 구현 결과

Final Project 제출 범위를 기준으로 다음 구조를 구현했습니다.

- Phaser 3 기반 웹 게임과 52주 주간 플레이 루프
- 캐릭터 선택, Save Slot 5개, 주간 일정, 수업, 모험, 휴식
- Main / NPC / Location 공통 Dialogue 흐름
- 수집·해금·회차 진행 데이터 구조
- FastAPI 기반 서버 권위형 저장·보상·엔딩 API
- Firebase Authentication + Cloud Firestore 계정/세이브 구조
- 규칙 기반 10개 직업 엔딩 + fallback 엔딩
- Long-term Play Memory 기반 Gemini 개인화 엔딩 편지
- Gemini 실패 시 검수된 fallback 편지와 중복 생성 방지
- Next.js + Tailwind CSS 기반 운영 관리자 콘솔
- Vercel 게임 프론트 + Render FastAPI 외부 배포

### 7.2 실제 사용자 테스트

실제 사용자 **5명**을 대상으로 PC와 태블릿 환경에서 핵심 플레이 흐름을 테스트했습니다.

| 참가자 구성           | 환경            |
| --------------------- | --------------- |
| 10대 · 게임 경험 많음 | 태블릿 / Chrome |
| 20대 · 게임 경험 많음 | 태블릿 / Safari |
| 30대 · 게임 경험 많음 | 태블릿 / Safari |
| 40대 · 게임 경험 적음 | PC / Chrome     |
| 50대 · 게임 경험 보통 | PC / Chrome     |

5명 모두 회원가입/로그인, 게임 시작, 캐릭터 선택을 완료했고 수업 콘텐츠도 실행할 수 있었습니다. 캐릭터·펫의 다양성, 비주얼과 사운드, 다양한 Story와 수집 시스템은 긍정적인 요소로 평가됐습니다.

### 7.3 주요 피드백과 개선

| 사용자 피드백                                                  | 반영한 개선                                                                                               |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 세이브 슬롯을 구분하기 어렵고 일부 불러오기 실패 사례가 있었음 | 캐릭터명·진행 주차·최근 저장 일시를 슬롯에 표시하고, 개발 중 구조 변경으로 발생한 구버전 저장 충돌을 정리 |
| 주간 일정 등록 방법이 직관적이지 않음                          | 활동 콘텐츠를 누르면 가장 이른 빈 평일에 순서대로 자동 등록하도록 변경                                    |
| Story 선택 버튼이 작고 긴 문장이 넘침                          | Phaser 버튼 기능 + 디자인 스킨을 적용하고 긴 선택지를 위한 가로형 버튼 추가                               |
| 모험이 보이는 아이템을 누르는 데 그쳐 탐색 재미가 약함         | 목표 아이템을 숨기고 단서·조사·방향 힌트·시간 제한을 추가, 모험 맵을 총 3개로 확장                        |
| 활동 사이 저장·전환이 느리게 느껴짐                            | 저장 요청을 묶을 수 있는 구간은 통합하고 일부 비동기 처리, Render Region 설정 조정                        |
| 캐릭터가 많지만 대사가 비슷함                                  | 32종 플레이 캐릭터별 대화 세트와 캐릭터별 NPC 반응 세트를 구성                                            |
| 수업 게임성과 가이드가 부족함                                  | 수업 게임 구성을 재조정하고 화면 상단에 플레이 방법 안내 버튼 추가                                        |
| 어린 사용자의 이메일 로그인 접근성이 낮음                      | 제출판은 Email/Password를 유지하고 소셜 로그인은 후속 개선 항목으로 분류                                  |

상세한 테스트 방법, 우선순위와 피드백 반영 기록은 [사용자 테스트·피드백 보고서](document/13_USER_TEST_REPORT.md)를 참고합니다.

### 7.4 현재 검증 상태

- Game Frontend: Vercel 외부 배포
- FastAPI: Render 외부 배포 및 `/health` 확인
- 실제 Firebase 가입·이메일 인증·회차 시작·Story·활동·재접속 흐름 검증 기록 존재
- 운영 Gemini API 단독 호출 검증 기록 존재
- 사용자 5명 테스트 및 주요 피드백 반영 완료
- **52주 엔딩 전체 운영 E2E:** 성공 — 52주 엔딩 진입, 서버 직업 결정, Gemini 개인화 편지 생성, 엔딩 표시와 회차 완료 흐름까지 확인
- **피드백 반영 후 사용자 재검증:** 별도 재테스트는 수행하지 않음

---

## 8. 향후 개선

Final Project 제출판 이후에는 다음 항목을 확장할 계획입니다.

- 미니게임 조작감·연출·피드백과 게임성 고도화
- 기능 중심 UI의 시각적 완성도 향상
- Google 등 소셜 로그인 지원 검토
- 관리자 콘텐츠 CMS 확장
- 상황별 BGM/SFX 세분화
- 추가 캐릭터·공간과 주인공별 경험 차별화
- 여러 회차 기록을 활용한 부모/보호자 대화 지원 기능 검토
- 웹 서비스를 앱으로 확장하는 방안 검토

---

## 9. 프로젝트 문서

| 문서                                                           | 내용                                                            |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| [Final Project 기획서](document/11_PROJECT_PLAN.md)            | 문제 정의, 대상 사용자, AI 활용, 일정, 팀 R&R                   |
| [요구 명세·아키텍처](document/12_REQUIREMENTS_ARCHITECTURE.md) | 기능·비기능 요구사항, 시스템 구조, AI 활용 구조                 |
| [AI 핵심 기능](document/09_AI_ENDING_LETTER.md)                | 개인화 엔딩 편지의 입력·출력·안전 기준                          |
| [AI 기술 명세서](document/14_AI_TECH_SPECIFICATION.md)         | Automated Workflow와 Long-term Memory 구현 구조                 |
| [기술 스택](document/10_TECH_STACK.md)                         | 기술 선택 근거와 환경변수 기준                                  |
| [사용자 테스트 보고서](document/13_USER_TEST_REPORT.md)        | 실제 사용자 5명 테스트, 피드백, 개선 반영                       |
| [실행·배포 방법](document/실행방법.md)                         | 로컬 실행, 환경변수, Vercel·Render 배포 기준                    |
| [발표자료 원고](document/15_PRESENTATION.md)                   | 문제 정의·AI 활용·기술 결정·사용자 피드백·개선 결과 발표 구성안 |
| [최종 제출 체크리스트](document/16_SUBMISSION_CHECKLIST.md)    | 필수 산출물·운영 URL·검증 근거와 제출 직전 확인 목록            |

---

## 10. Repository Structure

```text
asset/             게임 이미지·오디오·UI 자원
backend/           FastAPI, Firestore/SQLite, 관리자 API, Gemini 연동
document/          Final Project 제출 및 팀 상세 문서
document_for_ai/   AI 협업용 프로젝트 기준 요약
engine/            Phaser 3 게임 엔진과 UI, 미니게임, 모험
manage_lumia/      Next.js + Tailwind CSS 관리자 콘솔
story/             Main / NPC / Location Story 제작 자료
lumia/             최종 통합 결과물 영역
prototype/         기존 기준물 보존 영역
```

---

## 11. 제출 링크

- **서비스:** https://lumia-web-six.vercel.app/
- **GitHub:** https://github.com/smong2/codyssey_final
- **관리자 콘솔:** https://codyssey-final-ujhz.vercel.app/

발표 자료는 README 내용을 그대로 반복하지 않고, [발표자료 원고](document/15_PRESENTATION.md)를 기준으로 프로젝트의 문제 정의·AI 활용·기술적 의사결정·사용자 피드백과 개선 결과를 발표 흐름에 맞게 별도로 구성합니다. **공용 저장소에는 실제 발표본의 민감한 화면·운영 정보가 포함되지 않도록 공개용 대체(fake) 자료만 올리고, 실제 발표에서는 별도로 관리하는 real PPT를 사용합니다.**
