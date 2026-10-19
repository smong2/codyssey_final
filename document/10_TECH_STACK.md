# LUMIA 기술 스택과 선정 이유

## 1. 확정 기술 스택

| 영역 | 기술 | 역할 |
|---|---|---|
| 게임 엔진 | **Phaser 3** | 브라우저 기반 2D 게임 화면, Scene, 입력, 미니게임 |
| 프론트 개발 환경 | **JavaScript + Node.js + Vite** | 게임 클라이언트 개발·빌드 |
| 프론트 배포 | **Vercel** | 사용자가 접속하는 웹 게임 배포 |
| API 서버 | **Python + FastAPI** | 게임 저장·해금·엔딩 판정·AI 호출 등 서버 로직 |
| API 배포 | **Render Web Service** | FastAPI 서비스 운영 |
| 인증 | **Firebase Authentication** | 이메일/비밀번호 가입·로그인 및 이메일 인증 |
| 데이터베이스 | **Cloud Firestore + 플레이어 로컬 SQLite** | Firestore: 계정별 확정 상태·엔딩·관리자 통계·운영 설정·감사로그. SQLite: 플레이어 브라우저의 마스터·화면 캐시와 임시 상태 |
| 생성형 AI | **Gemini API** | 52주 종료 후 개인화 엔딩 편지 생성 |
| AI 기본 모델 | **`gemini-3.8-flash`** | 엔딩 편지 생성 기본 모델. 환경변수로 교체 가능 |
| 관리자 콘솔 | **Next.js + Tailwind CSS + Firebase Auth + FastAPI** | 운영팀 전용 회원·플레이 조회, 통계, 밸런스 설정 |
| 관리자 프론트 배포 | **Vercel 별도 프로젝트** | 게임 URL과 분리된 관리자 웹 콘솔 배포 |
| 버전 관리 | **GitHub / Git** | 소스·문서·협업 기록 관리 |

## 2. 전체 구조

```text
사용자 브라우저
    ↓
Vercel
Phaser 3 + JavaScript/Vite
    └─ SQLite WASM/OPFS (플레이어 기기: 마스터·화면 캐시)
    ↓
Firebase Authentication
이메일/비밀번호 + 이메일 인증
    ↓ Firebase ID Token
Render
Python + FastAPI
    ├─ Cloud Firestore
    │   ├─ Global Meta · Save Slots × 5 · 엔딩 편지
    │   └─ 관리자 기간 통계 · 전역 보상 배율 · 감사로그
    └─ Gemini API
        └─ 개인화 엔딩 편지 생성

운영자 브라우저
    ↓ 별도 Admin URL / Vercel 프로젝트
Next.js + Tailwind CSS 관리자 웹 프론트
    ↓ Firebase Authentication + admin 권한
Render / FastAPI `/admin/*`
    ├─ 회원·플레이 조회
    ├─ 운영 통계
    ├─ 전역 성장 보상 설정
    └─ 감사로그
```

게임 클라이언트는 로컬 SQLite의 값을 서버 판정의 근거로 사용하지 않고 FastAPI를 통해 저장·보상·해금 규칙을 적용합니다. Firebase Authentication은 클라이언트에서 로그인하고, FastAPI는 전달받은 Firebase ID Token을 검증해 API 요청 사용자를 식별합니다. 관리자 콘솔은 플레이어 기기의 SQLite에 접근하지 않습니다. 상세 저장 경계와 테이블 목록은 [백엔드 저장 설계](../backend/database/STORAGE_DESIGN.md)를 따릅니다.

## 3. 선정 이유

### Phaser 3 + JavaScript/Node.js/Vite

- LUMIA는 설치형 네이티브 게임보다 **브라우저에서 바로 실행되는 2D 웹 게임**을 목표로 한다. 따라서 엔진 선정에서 3D 범용 기능보다 웹 접근성, 초기 로딩과 실행 구조의 단순성, 2D 렌더링 성능, JavaScript 생태계와의 결합을 우선했다.
- Phaser는 처음부터 웹 브라우저를 주 실행 환경으로 설계된 HTML5 2D 게임 프레임워크다. JavaScript 라이브러리 형태로 페이지에 직접 포함하거나 npm/Vite로 번들링할 수 있어, 별도의 네이티브 플레이어나 전용 런타임으로 변환하는 과정 없이 현재 웹 애플리케이션 구조에 바로 결합할 수 있다.
- 렌더러는 WebGL을 활용해 다수의 2D Sprite를 GPU에서 처리하고, 필요한 경우 Canvas 렌더링 경로도 제공한다. LUMIA처럼 배경·캐릭터·SD 이동·퍼즐·UI가 중심인 2D 게임에서는 3D 엔진의 렌더링 기능을 가져오지 않고 필요한 범위에 집중할 수 있다.
- Scene, 입력, Asset Loader, 애니메이션/Tween, 오디오, 카메라, 충돌·간단한 물리 등 게임에 필요한 기본 기능을 이미 제공한다. 순수 DOM/Canvas로 직접 구현할 때 필요한 게임 루프·Scene 전환·입력 상태·자원 로딩 계층을 자체 제작하지 않아도 되므로 구현량을 줄이면서 게임 구조는 유지할 수 있다.
- 게임 코드가 JavaScript로 동작하므로 Firebase Web Auth, FastAPI REST API 호출, 브라우저 저장소, Vite 빌드와 같은 일반 웹 기술과 경계가 단순하다. Node.js/Vite 기반 개발 서버와 번들링 결과를 Vercel에 정적 웹 애플리케이션 형태로 배포하는 현재 운영 구조와도 직접 맞는다.

#### 웹 2D 게임 엔진 비교

| 선택지 | 장점 | LUMIA에서의 판단 |
|---|---|---|
| **Phaser 3** | 브라우저 우선 설계, JavaScript 직접 실행, WebGL/Canvas 2D 렌더링, Scene·입력·Asset·오디오 등 게임 기능 제공 | **채택.** 웹 2D 게임에 필요한 기능과 성능을 확보하면서 빌드·배포 구조를 가볍게 유지할 수 있다. |
| **Unity Web** | 강력한 에디터, 2D/3D 통합 기능, 방대한 생태계와 툴링 | Web 대상도 지원하지만 WebAssembly/WebGL용 빌드·런타임 계층이 추가되고, LUMIA에는 필요하지 않은 3D·범용 엔진 기능까지 포함한다. 브라우저 우선 2D 프로젝트에는 개발·빌드 복잡도가 상대적으로 크다고 판단했다. |
| **Godot Web** | 오픈소스, Scene/Node 구조, 2D·3D 기능과 편리한 에디터 | Web export가 가능하지만 WebAssembly와 WebGL 기반 Compatibility 렌더러를 사용하는 범용 엔진이다. LUMIA는 브라우저 JavaScript 생태계와 직접 결합하는 것이 더 중요해 Phaser를 선택했다. |
| **순수 DOM/Canvas/WebGL 직접 구현** | 런타임과 구조를 완전히 제어할 수 있고 필요한 코드만 구성 가능 | 렌더링 외에 Scene, 입력, Asset 로딩, 애니메이션, 오디오, 충돌 등을 직접 구축해야 해 일정 대비 구현·검증 비용이 크다. |

즉 Phaser 3는 "기존 데모가 Phaser였기 때문"이 아니라, **웹에서 즉시 실행되는 2D 게임을 가볍게 배포하면서도 게임 엔진 수준의 Scene·입력·렌더링 기능과 충분한 2D 성능을 확보하기 위한 선택**이다. 기존 코드 재사용은 이 결정의 부가 이점이지 핵심 선정 이유가 아니다.

참고: [Phaser — Why Phaser](https://phaser.io/why-phaser), [Phaser 3 Getting Started](https://phaser.io/tutorials/getting-started-phaser3), [Unity Web 소개](https://docs.unity3d.com/kr/current/Manual/webgl-intro.html), [Godot Web export JavaScript reference](https://docs.godotengine.org/en/latest/tutorials/platform/web/html5_shell_classref.html)

### Next.js + Tailwind CSS — 관리자 콘솔

- 관리자 화면은 게임처럼 실시간 Sprite 렌더링이 필요한 영역이 아니라 **회원·플레이 기록 조회, 검색, 표, 기간별 통계, 설정 폼**이 중심인 업무용 웹 애플리케이션이다. 따라서 게임 엔진과 분리해 일반 웹 UI에 적합한 Next.js를 사용한다.
- Next.js는 React 기반의 페이지·Layout·컴포넌트 구조와 Routing을 제공하므로 대시보드, 사용자 상세, 통계, 밸런스 설정처럼 화면이 늘어나는 관리자 기능을 공통 Layout과 재사용 가능한 컴포넌트로 관리하기 쉽다. 번들러와 빌드 구성을 프레임워크가 제공하고 Vercel 배포와도 자연스럽게 연결된다.
- 관리자 인증은 별도 비밀번호 체계를 만들지 않고 Firebase Authentication을 재사용한다. Next.js 클라이언트가 Firebase ID Token을 받고, 실제 데이터 조회·변경은 FastAPI `/admin/*`가 토큰과 `admin` 권한을 다시 검증한 뒤 수행한다. 관리자 권한 판정과 데이터 접근 권한은 프론트 코드에 맡기지 않는다.
- Tailwind CSS는 utility class를 조합해 표, 카드, 필터, 상태 Badge, Form, 반응형 Grid 같은 관리자 UI를 빠르게 일관된 규칙으로 구성할 수 있다. 별도 CSS 파일에 화면별 스타일을 계속 추가하는 방식보다 간격·크기·상태 표현을 공통 규칙으로 유지하기 쉽고, breakpoint utility를 사용해 노트북과 작은 화면에서도 같은 컴포넌트를 조정할 수 있다.
- Phaser 게임 클라이언트와 관리자 콘솔을 기술적으로 분리하면 게임 Canvas의 Scene/UI 코드와 운영용 DOM UI가 섞이지 않는다. 두 프론트는 Firebase Auth와 FastAPI API 계약만 공유하고 독립적으로 빌드·배포할 수 있다.

관리자 웹 콘솔은 **Next.js + Tailwind CSS**로 구현했으며 게임 프론트와 분리된 Vercel 프로젝트 `https://codyssey-final-ujhz.vercel.app/`에 배포했다. Firebase Authentication 로그인 뒤 FastAPI `/admin/*`가 서버 측 `admin` 권한을 검증하는 구조를 유지한다.

참고: [Next.js Documentation](https://nextjs.org/docs), [Tailwind CSS Utility Classes](https://tailwindcss.com/docs/styling-with-utility-classes), [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)

### Python + FastAPI

- REST/JSON 기반 게임 API를 간결하게 구현할 수 있습니다.
- Firebase Admin SDK와 Gemini API 같은 Python 생태계와 연결하기 쉽습니다.
- 엔딩 판정, 저장 검증, AI 입력 가공처럼 서버에서 처리해야 할 규칙을 게임 클라이언트와 분리할 수 있습니다.

### Vercel + Render

- 사용자는 Vercel의 하나의 웹 주소로 게임에 접속합니다.
- 정적/프론트 배포와 Python API 서버 운영 책임을 분리합니다.
- 별도 보유 서버 없이 GitHub 기반 배포가 가능합니다.
- 운영 게임 URL은 `https://lumia-web-six.vercel.app/`, 관리자 URL은 `https://codyssey-final-ujhz.vercel.app/`, Render API는 `https://lumia-api-pcxd.onrender.com/`을 사용합니다.

### Firebase Authentication

- 계정 방식은 기존 ID/Password 기획에서 **Email/Password** 방식으로 변경합니다.
- 가입 후 인증 이메일을 보내고 이메일 인증을 완료한 계정만 정상 게임 이용이 가능하도록 합니다.
- Final Project에서는 게스트/익명 플레이 후 계정 전환 기능을 제공하지 않습니다. 가입·인증을 먼저 완료한 뒤 게임을 시작하는 단일 흐름을 사용합니다.
- 비밀번호 해싱·계정 인증 체계를 직접 구현하지 않고 Firebase Authentication을 사용합니다.
- FastAPI는 Firebase ID Token을 검증하며, 보호 API에서는 이메일 인증 여부도 확인합니다.
- 관리자 콘솔도 Firebase Authentication을 사용할 수 있지만, FastAPI는 토큰 검증 뒤 Firebase Custom Claim 또는 서버가 승인한 UID 기준으로 `admin` 권한을 추가 확인합니다. 일반 사용자가 관리자 권한을 직접 획득하는 UI는 제공하지 않습니다.
- 브라우저 인증 상태는 로그아웃 전까지 유지하고 별도 `로그인 유지` 옵션은 만들지 않습니다.
- 게임 내부 계정 화면에서는 현재 비밀번호 재인증 후 비밀번호를 직접 변경할 수 있게 하며, 현재 비밀번호를 잊은 복구 상황에서만 이메일 재설정 링크를 사용합니다.
- `다른 기기에서 모두 로그아웃`은 기존 사용자 세션을 폐기하고 현재 기기를 즉시 재인증해 유지하는 보안 동작으로 설계합니다. 보호 API는 폐기된 인증 세션을 허용하지 않도록 구현 단계에서 revocation 검증을 포함합니다.

### Cloud Firestore

- LUMIA의 주요 영속 데이터는 계정별 Global Meta와 5개 세이브 슬롯 중심이며 문서형 구조와 잘 맞습니다.
- 캐릭터·펫·배지·퍼즐·엔딩 해금, 누적 카운터, 현재 회차 Long-term Play Memory, 회차별 편지처럼 재접속·복구가 필요한 사용자별 상태의 원본입니다.
- 관리자 일·주·월 통계용 활동 요약·집계, 전역 성장 보상 배율, 감사로그도 중앙 Firestore에 두어 전체 사용자를 대상으로 조회합니다. 관리자 통계는 플레이어 로컬 SQLite를 읽지 않습니다.

### 플레이어 로컬 SQLite

- 웹 클라이언트에서 SQLite WASM과 브라우저 OPFS를 사용해 마스터·화면 데이터의 반복 조회, 미확정 UI/미니게임 상태와 재시도 요청을 로컬에서 처리하는 방안을 검증합니다.
- 마스터 데이터 원본은 Git으로 관리합니다. 로컬 SQLite는 기기별 사본이며 다른 기기와 공유되지 않습니다. 보이는 스탯·해금·엔딩의 최종 값은 서버가 검증하고 Firestore에 확정합니다.
- 로컬 조회를 늘리면 Firestore 사용량을 줄일 수 있지만, 활동 결과 저장과 중앙 관리자 통계에는 Firestore 작업이 남습니다. 비용 절감량은 실제 읽기·쓰기·네트워크 사용을 측정해 확인합니다. [Firebase 과금 문서](https://firebase.google.com/docs/firestore/pricing), [SQLite WASM 영속 저장 문서](https://sqlite.org/wasm/doc/trunk/persistence.md)를 구현 기준으로 확인합니다.
- 브라우저 저장소가 지워지거나 지원되지 않아도 서버에 확정된 게임 상태는 복구할 수 있어야 합니다. 모바일 브라우저를 포함한 지원 범위와 대체 경로는 구현 전에 검증합니다.

### Gemini API

- AI는 직업 엔딩을 결정하지 않고, 규칙 엔진이 확정한 직업과 실제 52주 플레이 기록을 개인화된 편지로 변환합니다.
- 기본 모델은 `gemini-3.8-flash`로 사용합니다. 엔딩 편지는 회차 종료 시 한 번 생성하는 저빈도·품질 우선 작업이므로 Flash 계열의 상위 안정 모델을 기본값으로 둡니다.
- 모델명은 코드에 고정하지 않고 `GEMINI_MODEL` 환경변수로 관리합니다. 비용·속도 테스트 결과에 따라 `gemini-3.5-flash-lite` 같은 경량 모델로 교체할 수 있습니다.
- API 키는 프론트에 노출하지 않고 Render의 서버 환경변수에서만 관리합니다.
- 관리자 콘솔에서도 Gemini API Key 원문을 조회·등록·교체하지 않습니다. 키 교체는 Render 비밀 환경변수에서만 수행합니다.

## 4. 인증 흐름

```text
회원가입
→ Email + Password 등록
→ Firebase 인증 메일 발송
→ 사용자가 이메일 링크 확인
→ 이메일 인증 완료
→ 기존 가입 세션 갱신 또는 기존 사용자의 로그인
→ Firebase ID Token 발급
→ FastAPI 요청 시 Bearer Token 전달
→ FastAPI에서 토큰·email_verified 확인
→ 게임 API 사용
```

로그인 페이지 영역은 인증 메일 재발송과 이메일 인증 완료 확인까지 담당합니다. 로그인 상태에서 현재 비밀번호를 아는 사용자의 비밀번호 변경은 게임 내부 재인증 후 처리하고, 비밀번호 분실은 Firebase 비밀번호 재설정 이메일을 사용합니다. 계정 관리·탈퇴와 화면 흐름의 상세 기준은 `document/content/08_ACCOUNT_POLICY.md`, `document/content/09_TITLE_ACCOUNT_UI.md`를 따릅니다.

## 5. 환경변수 기준

실제 값은 Vercel/Render 대시보드에서 관리하고 Git에 비밀값을 커밋하지 않습니다.

### Vercel — 게임 클라이언트

| 변수 | 용도 | 비밀값 여부 |
|---|---|---|
| `LUMIA_API_BASE_URL` | 운영 Render API 기본 주소. 웹 빌드에서 `VITE_API_BASE_URL`보다 우선 | 아니오 |
| `VITE_API_BASE_URL` | 로컬·기존 웹 빌드에서 사용하는 API 주소 대체값 | 아니오 |
| `VITE_FIREBASE_API_KEY` | Firebase Web App 설정 | 아니오 |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth 도메인 | 아니오 |
| `VITE_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID | 아니오 |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | 아니오 |

Firebase 프로젝트 설정에 따라 `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`가 추가될 수 있습니다. Firebase Web App 설정값은 서버 비밀키와 구분하며, 실제 접근 권한은 Authentication·Firestore Security Rules·서버 검증으로 제어합니다.

### Render — FastAPI 서버

| 변수 | 용도 | 비밀값 여부 |
|---|---|---|
| `CORS_ORIGINS` | 허용할 게임·관리자 프론트 Origin 목록 | 아니오 |
| `FIREBASE_PROJECT_ID` | Firebase 프로젝트 식별 | 아니오 |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin SDK 서비스 계정 JSON | **예** |
| `GEMINI_API_KEY` | Gemini API 인증 | **예** |
| `GEMINI_MODEL` | Gemini 모델 선택. 기본 `gemini-3.8-flash` | 아니오 |
| `GEMINI_THINKING_LEVEL` | 엔딩 편지 생성 시 사고 수준. 초기값 `low` | 아니오 |

필요하면 운영 단계에서 `LOG_LEVEL`, 요청 timeout, AI 재시도 횟수 등을 추가합니다. 환경변수 이름은 구현 시 코드와 함께 최종 검증합니다.

## 6. 운영 배포와 남은 검증 항목

- 게임 프론트: `https://lumia-web-six.vercel.app/`
- 관리자 콘솔: `https://codyssey-final-ujhz.vercel.app/`
- Render API: `https://lumia-api-pcxd.onrender.com/`
- Firebase 프로젝트: `codyssey-final`
- 52주 엔딩 운영 E2E: 성공 확인
- 비밀값인 Firebase Admin 자격 증명과 Gemini API Key는 배포 환경에서만 관리하고 문서나 Git에 기록하지 않음
- 브라우저별 SQLite WASM/OPFS 지원·대체 경로와 로컬 캐시 동기화 방식은 계속 검증·개선 대상

이 문서는 **기술 선택 기준과 현재 운영 배포 구성을 함께 기록**하며, 향후 URL이나 실행 환경이 바뀌면 실제 배포 설정을 기준으로 갱신합니다.

