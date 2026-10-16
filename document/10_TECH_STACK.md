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
| 데이터베이스 | **Cloud Firestore** | 계정별 세이브 슬롯, Global Meta, 해금·누적 기록 저장 |
| 생성형 AI | **Gemini API** | 52주 종료 후 개인화 엔딩 편지 생성 |
| AI 기본 모델 | **`gemini-3.8-flash`** | 엔딩 편지 생성 기본 모델. 환경변수로 교체 가능 |
| 관리자 콘솔 | **별도 웹 프론트 + Firebase Auth + FastAPI** | 운영팀 전용 회원·플레이 조회, 통계, 밸런스 설정 |
| 버전 관리 | **GitHub / Git** | 소스·문서·협업 기록 관리 |

## 2. 전체 구조

```text
사용자 브라우저
    ↓
Vercel
Phaser 3 + JavaScript/Vite
    ↓
Firebase Authentication
이메일/비밀번호 + 이메일 인증
    ↓ Firebase ID Token
Render
Python + FastAPI
    ├─ Cloud Firestore
    │   ├─ Global Meta
    │   └─ Save Slots × 5
    └─ Gemini API
        └─ 개인화 엔딩 편지 생성

운영자 브라우저
    ↓ 별도 Admin URL
관리자 웹 프론트
    ↓ Firebase Authentication + admin 권한
Render / FastAPI `/admin/*`
    ├─ 회원·플레이 조회
    ├─ 운영 통계
    ├─ 전역 성장 보상 설정
    └─ 감사로그
```

게임 클라이언트는 Firestore의 게임 상태를 임의로 직접 변경하는 구조보다 FastAPI를 통해 서버 규칙을 적용하는 것을 기본으로 합니다. Firebase Authentication은 클라이언트에서 로그인하고, FastAPI는 전달받은 Firebase ID Token을 검증해 API 요청 사용자를 식별합니다.

## 3. 선정 이유

### Phaser 3 + JavaScript/Node.js/Vite

- 현재 독립 미니게임 데모가 Phaser 3와 JavaScript로 구현되어 있어 기존 결과물을 이어서 사용할 수 있습니다.
- LUMIA가 웹 기반 2D 게임이므로 별도 네이티브 앱 배포 없이 브라우저에서 실행할 수 있습니다.
- Node.js와 Vite는 개발 서버·번들링·Vercel 배포 흐름을 단순하게 유지합니다.

### Python + FastAPI

- REST/JSON 기반 게임 API를 간결하게 구현할 수 있습니다.
- Firebase Admin SDK와 Gemini API 같은 Python 생태계와 연결하기 쉽습니다.
- 엔딩 판정, 저장 검증, AI 입력 가공처럼 서버에서 처리해야 할 규칙을 게임 클라이언트와 분리할 수 있습니다.

### Vercel + Render

- 사용자는 Vercel의 하나의 웹 주소로 게임에 접속합니다.
- 정적/프론트 배포와 Python API 서버 운영 책임을 분리합니다.
- 별도 보유 서버 없이 GitHub 기반 배포가 가능합니다.
- 실제 Vercel·Render URL은 배포 완료 후 기록합니다.

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
- 캐릭터·펫·배지·퍼즐·엔딩 해금과 누적 카운터처럼 사용자별 상태 저장에 적합합니다.
- 게임 마스터 데이터와 스토리 원본은 가능한 한 Git의 JSON/코드/문서로 버전 관리하고, Firestore는 사용자 상태 저장에 집중합니다.

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
| `VITE_API_BASE_URL` | Render API 기본 주소 | 아니오 |
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

## 6. 아직 배포 후 확정할 값

- 실제 Vercel 서비스 URL
- 실제 관리자 콘솔 URL
- 실제 Render API URL
- Firebase 프로젝트 ID와 Web App 설정값
- Vercel 허용 Origin
- Gemini API 키
- 사용자 테스트를 통해 결정할 Gemini 모델·thinking level 최종값

이 문서는 **기술 선택 기준**이며, 위 서비스가 이미 구현·배포 완료됐다는 의미는 아닙니다.

