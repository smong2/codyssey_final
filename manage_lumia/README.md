# LUMIA 관리자 콘솔

`manage_lumia/`는 운영팀 전용 Next.js + Tailwind CSS 웹 콘솔입니다. Firebase Authentication으로 로그인한 뒤 FastAPI `/admin/session`이 서버 측 `admin` 권한을 확인해야 화면에 들어갈 수 있습니다. 사용자 데이터는 API에서만 읽고, 브라우저에서 Firestore에 직접 접근하지 않습니다.

## 제공 화면

- 운영 현황: 일·주·월(KST) 통계, 이전 기간 비교, 활동·미니게임·Story·성장·엔딩·해금 집계. 누락된 날짜는 표시하고 운영자가 명시적으로 집계 생성 가능
- 회원 조회: 기본 최대 50명 목록, 정확한 이메일/UID 검색, 슬롯·누적 활동·해금·완료 회차 편지 상세 조회
- 보상 배율: 5개 보이는 성장 스탯의 0.5~1.0 배율 조회와 변경. 저장 전 변경 내역 확인

API 계약은 [`backend/admin/README.md`](../backend/admin/README.md)와 [`backend/api/app/admin.py`](../backend/api/app/admin.py)를 따릅니다. 사용자별 세이브 수정, 콘텐츠 CRUD, 비밀키 관리 UI는 포함하지 않습니다.

## 로컬 실행

1. `.env.example`을 `.env.local`로 복사하고 Firebase Web App의 **공개** 설정값을 채웁니다. 운영 키, Gemini 키, Firebase 서비스 계정 JSON은 입력하지 않습니다.
2. 저장소의 이 디렉터리에서 `npm ci`, `npm run dev`를 실행합니다.
3. 로컬 주소 `http://localhost:3000`을 Render의 `CORS_ORIGINS`에 추가해야 실제 API 요청이 가능합니다. 운영 환경변수에 로컬 주소를 넣고 싶지 않다면 별도 로컬 API로 테스트합니다.

```sh
cd manage_lumia
cp .env.example .env.local
npm ci
npm run dev
```

`npm run typecheck`와 `npm run build`로 검증합니다. 별도 관리자 웹 프로젝트를 배포하기 전에도 인증된 계정에 서버 측 `admin: true` Custom Claim이 있어야 합니다. Claim이 추가된 뒤 기존 로그인 토큰은 갱신하거나 다시 로그인해야 합니다.

## Vercel 배포 판단

현재 게임 Vercel 프로젝트는 **저장소 루트**의 `vercel.json`이 `web-dist` 정적 빌드를 지정합니다. 그 프로젝트의 기존 주소에 이 Next.js 앱이 자동으로 나타나지 않습니다. 게임 주소와 분리한다는 관리자 요구사항에 맞게 **같은 Git 저장소를 연결한 별도 Vercel 프로젝트**를 만들고 Root Directory를 `manage_lumia`로 지정합니다. Framework Preset은 Next.js로 둡니다. 루트 `vercel.json`은 관리자 프로젝트에 적용하지 않습니다.

관리자 Vercel 프로젝트에는 아래 공개 환경변수만 설정합니다.

| 환경변수 | 값 |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | 기존 Render API origin, 예: `https://lumia-api-pcxd.onrender.com` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web App의 공개 `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Web App의 `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `codyssey-final` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web App의 공개 `appId` |

새 Vercel 관리자 주소가 정해지면 다음을 운영 설정에 반영해야 실제 로그인·API 조회가 가능합니다.

1. Firebase Authentication의 Authorized domains에 관리자 호스트를 추가합니다.
2. Render의 `CORS_ORIGINS`에 관리자 **origin**(`https://host`, 끝의 `/` 없이)을 기존 게임 origin과 쉼표로 구분해 추가합니다. 기존 게임 주소는 유지합니다.
3. Vercel 빌드와 관리자 브라우저에서 로그인 → `/admin/session` → 조회·통계·배율 조회를 확인합니다. 실제 balance 변경은 운영자 판단 아래 별도로 검증합니다.

`NEXT_PUBLIC_*` 값은 Next.js 빌드 시 브라우저 번들에 고정되므로 변경 후에는 관리자 프로젝트를 다시 빌드·배포합니다.

관리자 주소와 Vercel 프로젝트는 아직 생성되지 않았으므로 현재 배포된 게임 URL만으로 관리자 화면에 접근할 수는 없습니다. 이 저장소의 변경만으로 운영 배포나 Firebase·Render 설정이 자동 적용되지는 않습니다.

### 현재 API의 제한

- `GET /admin/users` 기본 목록은 최대 50명만 반환하며 페이지 커서가 없습니다. 콘솔은 이를 명시하고 이메일/UID 정확 일치 검색을 제공합니다.
- Firebase 비밀번호 오류는 Firebase 단계에서 끝나므로 FastAPI의 `/admin/session`이 그 실패를 수신하지 못합니다. 서버 감사로그는 `/admin/session`에 도달한 성공·권한 거부·토큰 오류를 기록합니다. 명세의 모든 비밀번호 실패 감사가 필요하면 별도 서버 계약이 필요합니다.
- 감사로그 기록 API는 있지만 감사로그 조회 API는 현재 없습니다. 콘솔에 조회 화면을 만들지 않았습니다.
