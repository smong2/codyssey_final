# Phase 12 실환경 검증 기록

기준일: 2026-10-18 (KST)
기준 브랜치: GitHub `main` (검증 코드 정리 `ca5cf58`)
판정: **운영 핵심 흐름 검증 완료**. 실제 가입부터 1주차 종료, 운영 관리자 API, Gemini 단독 호출, 일회용 계정 탈퇴를 검증했고, 이후 52주 테스트 fixture를 이용해 운영 환경의 엔딩 통합 흐름까지 추가 확인했다.

## 환경 및 배포

| 항목 | 확인 결과 |
|---|---|
| Firebase 프로젝트 | `codyssey-final`; 웹 앱 `lumia-web` 등록 |
| Authentication | Email/Password 활성화, `lumia-web-six.vercel.app` 승인 도메인 등록 |
| Firestore | `(default)` DB `asia-northeast3 (Seoul)`, 직접 Client 접근을 거부하는 Rules 확인 |
| Firestore 색인 | `activityDays.kstDate` 컬렉션 그룹 오름차순 예외 준비 상태 확인 |
| Render API | `https://lumia-api-pcxd.onrender.com/health`에서 `{"status":"ok"}` 확인 |
| Vercel 웹 | `https://lumia-web-six.vercel.app/` 로그인·실제 게임 화면 확인 |
| 웹 API 연결 | 공개 `runtime-config.json`의 `apiBaseUrl`이 실제 Render 주소를 가리키고 Emulator 주소가 없음 |

## 로컬·Emulator 회귀

- Python API 회귀: 153 passed, 1 skipped (Emulator opt-in).
- Firebase Auth·Firestore Emulator SDK 테스트: 1 passed. 인증, bootstrap, 5개 슬롯, 회차 재전송·충돌, MS01 대화, 일정/휴식, 관리자 Claim, 직접 Firestore 접근 거부, 계정 삭제를 포함한다.
- 엔진·미니게임 회귀: 328 + 13 passed. 엔진 전체 테스트는 로컬 포트 바인딩이 허용된 실행에서 통과했다.
- Emulator 브라우저: 가입·인증·bootstrap·회차 시작·MS01 Dialogue 조회·재접속 복구 확인.
- 운영과 동일한 공개 설정을 사용한 웹 빌드: 성공. `runtime-config.json`에 실제 API 주소 반영 확인.

## 운영 브라우저 E2E

`backend/FIREBASE_API_IMPLEMENTATION_PLAN.md`의 Phase 12 최소 시나리오를 기준으로 기록한다. 사용자 소유 시험 계정으로 운영 웹과 API에 접속했다. 인증 주소·UID·토큰·서비스 계정 키는 저장소에 기록하지 않는다.

| 번호 | 시나리오 | 상태 |
|---:|---|---|
| 1–2 | 가입·실제 이메일 인증 | 사용자 직접 완료, 인증 후 게임 진입 확인 |
| 3 | 개인정보 동의 후 bootstrap·5개 슬롯 | 운영 화면에서 5개 슬롯과 빈 슬롯 4개 확인 |
| 4–5 | 새 슬롯·회차 시작·MS01 | 슬롯 1, 카엘 1회차 시작 및 MS01 선택·완료 저장 확인 |
| 6–7 | 주간 일정·활동 결과 | 1주차 일정 저장. 휴식, 수업 `QUIT`, 요정의 거래 1포인트 교환, 남은 휴식, 주간 종료까지 서버 저장 확인. 재접속 후 요약에 기록된 일정 5/5일·수업 1회·체력 소비/회복 10 표시 확인 |
| 8–9 | Location Story pending·Dialogue load | 수업 `QUIT` 후 `LOC_OBS_01` pending 발생. 재접속 뒤 정식 대화와 관측 일기 그림 로드 확인 |
| 10 | 선택 후 COMPLETE·재전송 멱등성 | `LOC_OBS_01` 선택·완료 저장 확인. 동일 요청 재전송은 Emulator SDK 테스트에서만 확인, 운영 재전송은 미검증 |
| 11 | 재접속·재로그인 복구 | 새로고침과 ‘이어서 하기’로 pending Story 복구 확인. 별도 재로그인은 미검증 |
| 12–13 | 52주/엔딩, Ending Record, Gemini 편지 | **성공 확인**. 테스트용 52주 누적 fixture로 엔딩 진입 → 서버 직업 결정 → Gemini 개인화 편지 생성 → 엔딩 표시 → 회차 완료 흐름을 운영 환경에서 확인 |
| 14 | 운영 관리자 사용자·통계 확인과 일반 사용자 403 | `smong2@gmail.com`에 승인된 `admin: true` Custom Claim 부여. 부여 전 동일 계정의 `/admin/balance` 403, 부여 후 새 토큰으로 `/admin/session`, 사용자 검색, 월간 통계, balance 조회 모두 200. 관리자 웹 콘솔 통합은 별도 미검증 |
| 15 | 테스트 계정 탈퇴 및 Auth/Firestore 정리 | 일회용 일반 계정을 Admin SDK로 만들고 `email_verified`를 설정한 뒤 운영 API bootstrap 200·탈퇴 200 확인. 이후 해당 UID의 Firestore 사용자 문서와 Firebase Auth 계정이 모두 없음 확인. 주 계정은 유지 |

## 운영에서 발견해 수정한 문제

- `LOC_OBS_01` 조회가 승인된 `ART-L01`의 실제 파일 경로를 찾지 못해 503을 반환했다. `c3d08e4`에서 승인된 FOCUS 3장만 `/item-assets/`로 연결했고, 미승인 그림은 계속 fail-closed로 둔다.
- 대화 로드 실패 화면의 재시도 함수가 전달되지 않았다. `c3d08e4`에서 동일 pending 이벤트를 다시 로드하도록 고쳤다.
- 1주차를 닫으면 서버는 `weeklySchedule`을 비우고 `lastWeekSummary`를 보존하지만, 웹은 비워진 일정에서 요약을 만들고 있었다. `bf50013`에서 서버의 주간 요약 수치를 우선 표시하도록 고쳤다. Vercel 운영 화면 재접속 후 5/5일과 성장·수업·체력 수치가 표시됨을 확인했다.

## 운영 Gemini·관리자·탈퇴 추가 검증

- Render에 비밀 환경변수 `GEMINI_API_KEY`가 설정·재배포된 뒤, 허구의 플레이 문맥을 사용한 임시 관리자 전용 점검 경로에서 실제 Gemini 생성과 편지 규칙 검증이 첫 시도에 성공했다 (`provider=gemini`, `validated=true`, `attempts=1`). 이 경로는 검증 후 `ca5cf58`에서 제거했다. 이후 테스트용 52주 누적 fixture를 사용해 실제 엔딩 API·클라이언트 통합 흐름도 성공 확인했다.
- 운영 관리자 조회는 서버에서 부여한 Firebase Custom Claim으로만 허용되는 것을 확인했다. 같은 계정의 게임 데이터는 보존했다. 일반 사용자 403은 Claim 부여 전 계정에서 확인했으며, 일회용 일반 계정의 관리자 거부는 별도로 재시험하지 않았다.
- 탈퇴 시험의 일회용 계정은 실제 메일 인증 링크를 거치지 않고 Admin SDK에서 검증 상태로 만들었다. 실제 메일 수신·링크 검증은 앞서 사용자 소유 계정으로 확인했다. 탈퇴 시험에는 일회용 계정만 사용했다.

`ART-M01/M02` 등 미납 FOCUS 그림은 [ID별 파일·공개 경로 예약표](FOCUS_ASSET_LINKS.md)에 향후 주소만 정했으며 실제 대화에는 연결하지 않았다. 따라서 52주 전체 진행에는 승인 자산 준비가 필요하다. 자동 문서 동기화 검사는 작업 공간에 없는 세 원본 README 때문에 `UNAVAILABLE`에서 멈췄다: `asset/environment/README.md`, `asset/font_files/originals/README.md`, `asset/font_files/typography/README.md`.
