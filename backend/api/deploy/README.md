# Phase 12 배포·실환경 검증

현재 상태: Firebase Auth·Firestore Emulator SDK 테스트와 로컬 브라우저 흐름은 통과했다. `codyssey-final`에 웹 앱 `lumia-web`과 Email/Password 공급자를 설정했고 Firestore 기본 DB를 `asia-northeast3`에 프로덕션 모드로 생성했다. `activityDays.kstDate` 컬렉션 그룹 오름차순 색인은 Console에서 준비 상태를 확인했다. Vercel 프론트는 `https://lumia-web-six.vercel.app/`에 배포되어 로그인 화면 로드를 확인했고, 이 호스트를 Firebase 승인 도메인에 추가했다. Render API는 `https://lumia-api-pcxd.onrender.com/health`에서 200 응답을 확인했다. 운영 브라우저 15단계 E2E는 남아 있다. 운영 확인 전 `backend/FIREBASE_API_IMPLEMENTATION_PLAN.md`의 Phase 12를 완료로 표시하지 않는다.

## 1. Firebase 프로젝트 준비

1. Firebase Console에서 `codyssey-final`의 Authentication **Email/Password** 공급자가 활성화된 것을 확인한다. 테스트 인증 메일을 실제로 받을 수 있는 테스트 계정을 준비한다.
2. Cloud Firestore `(default)` DB의 위치 `asia-northeast3 (Seoul)`과 프로덕션 모드의 전체 거부 Rules를 확인한다. 이미 생성했으므로 다시 만들지 않는다.
3. 등록된 Web App `lumia-web`의 공개 설정값 `apiKey`, `authDomain`, `projectId`, `appId`를 Firebase Console에서 확인한다. `projectId`는 `codyssey-final`이어야 한다.
4. 운영 콘솔의 Rules가 저장소 루트 `firestore.rules`와 같은 전체 거부 정책인지 확인한다. `firestore.indexes.json`의 `activityDays.kstDate` 컬렉션 그룹 오름차순 색인이 준비 상태인지 확인한다. 추가 변경이 필요하면 Firebase CLI 인증 후 **이 프로젝트에만** 배포한다: `firebase deploy --project codyssey-final --only firestore:rules,firestore:indexes`. Emulator와 Admin SDK는 Rules를 우회하므로 운영 Rules 결과를 별도로 확인한다.
5. Admin SDK용 서비스 계정 자격 증명을 발급해 Render의 비밀 환경변수로만 넣는다. JSON 원문을 Git, 채팅, 프론트 `VITE_*` 값, 일반 로그에 넣지 않는다.

## 2. Render API

저장소 루트의 `render.yaml` Blueprint로 Python Web Service `lumia-api`를 생성한다. `.python-version`은 Python 3.13을 지정한다. `backend/api/deploy/build.sh`가 의존성 설치와 SQLite 마스터 seed 네 개를 빌드 중 실행한다. `/health`는 프로세스 초기화만 확인한다.

| 환경변수 | 값 |
|---|---|
| `FIREBASE_PROJECT_ID` | `codyssey-final` (`render.yaml`에 선언) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 같은 프로젝트의 서비스 계정 JSON 원문, Render Secret |
| `CORS_ORIGINS` | 실제 Vercel 웹 주소의 origin. 쉼표로 여러 주소를 지정할 수 있으며 `/`와 경로를 붙이지 않는다. |
| `DIALOGUE_TOKEN_SECRET` | Blueprint에서 생성하는 32자 이상 서버 비밀값 |
| `GEMINI_API_KEY` | Gemini 호출을 사용할 때만 비밀값으로 입력. 없어도 검수된 fallback 편지 사용 |
| `GEMINI_MODEL`, `GEMINI_THINKING_LEVEL` | 기본 `gemini-3.8-flash`, `low` |

현재 `CORS_ORIGINS`에 입력할 운영 origin은 `https://lumia-web-six.vercel.app`이다. Render URL에서 `/health`가 200을 반환한 뒤에도 인증·Firestore 권한·DB 쓰기를 별도로 확인해야 한다. `CONTENT_SQLITE_PATH` 기본값은 빌드 스크립트의 출력 경로와 같다.

## 3. Vercel 웹

루트 디렉터리를 프로젝트 루트로 지정하고 `vercel.json`을 사용한다. `npm run build:web`이 `web-dist`를 만든다. 빌드에는 실제 API URL과 Firebase Web App 공개 설정이 필요하다.

| 환경변수 | 값 |
|---|---|
| `LUMIA_API_BASE_URL` | 운영 Render API의 `https://...onrender.com` origin, 끝의 `/` 없이. Vercel에서는 공개 Config 변수로 설정하며 `VITE_API_BASE_URL`보다 우선한다. |
| `VITE_API_BASE_URL` | 로컬/기존 빌드의 API origin 대체값. `LUMIA_API_BASE_URL`이 없을 때 사용한다. |
| `VITE_FIREBASE_API_KEY` | Firebase Web App의 공개 `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Web App의 `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `codyssey-final` |
| `VITE_FIREBASE_APP_ID` | Firebase Web App의 `appId` |

운영 `LUMIA_API_BASE_URL` 값은 `https://lumia-api-pcxd.onrender.com`이다.

빌드 결과의 `runtime-config.json`에는 이 공개 설정과 API 주소만 들어간다. Firebase 서비스 계정 JSON과 Gemini 키는 웹 빌드에 입력하지 않는다. Vercel 주소가 정해지면 Firebase Authentication의 승인된 도메인에 해당 **호스트명**을 추가하고 Render `CORS_ORIGINS`에 전체 origin을 넣는다. Vercel 환경변수를 바꾸면 재빌드한다. 배포한 `runtime-config.json`에 Emulator URL이 없는지 확인한다.

## 4. 로컬 Emulator 재현

JDK 21 이상, Firebase CLI, Python 3.13, Node/npm을 준비한다. 프로젝트 루트에서 각 명령을 별도 터미널로 실행한다. Emulator는 데모 프로젝트 `demo-lumia-phase12`만 사용한다.

```sh
firebase emulators:start --project demo-lumia-phase12 --only auth,firestore
```

```sh
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
GCLOUD_PROJECT=demo-lumia-phase12 \
python -m pytest backend/api/tests/test_phase12_emulator.py -q
```

일반 Python 회귀: `python -m pytest backend/api/tests -q`. 엔진 회귀: `node --test engine/tests/*.test.mjs`. 브라우저 Emulator 통합 빌드의 정확한 설정은 `build-web.mjs`의 `LUMIA_LOCAL_TEST=1` 경계를 사용한다. 운영 키를 Emulator에 연결하지 않는다.

## 5. 운영 브라우저 E2E 기록

고유한 테스트 계정과 슬롯을 사용하고, 각 단계의 URL, 시각, 기대/실제 결과를 기록한다. API와 관리자 테스트는 실제 배포 주소를 사용한다.

1. 가입
2. 실제 인증 메일 수신과 이메일 인증
3. 개인정보 동의 후 bootstrap 및 5개 슬롯 확인
4. 새 슬롯 생성
5. 회차 시작과 MS01 진입
6. 주간 일정 확정
7. 수업·특수활동·모험 중 활동 결과 저장
8. NPC 또는 Location Story pending
9. Dialogue load
10. 선택 후 COMPLETE와 재전송 멱등성
11. 새로고침·재로그인 후 상태 복구
12. 52주 또는 테스트용 엔딩 트리거(운영 데이터 우회 금지)
13. Ending Record 및 Gemini/fallback 편지, 재접속 시 같은 편지
14. 별도 관리자 계정의 Custom Claim으로 사용자·통계 확인, 일반 계정의 403 확인
15. 테스트 계정 탈퇴와 Auth/Firestore 정리 확인

실제 Gemini 키, 관리자 Claim, 52주 진행 방법이 준비되지 않았다면 해당 항목을 미검증으로 남긴다. `/health`나 Emulator 통과만으로 이 목록을 통과 처리하지 않는다.
