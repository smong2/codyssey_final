# LUMIA · 빛을 잃은 온실

프런트엔드 PC Prototype. 임시 대본과 기존 디자이너 자산으로 전체 흐름을 확인합니다.

## 실행

Node.js가 설치된 PC에서 저장소 폴더의 터미널을 열고 실행합니다. 별도 패키지 설치는 없습니다.

```powershell
node prototype/server.mjs
```

브라우저에서 http://127.0.0.1:4173 을 엽니다. 종료는 터미널에서 Ctrl+C입니다. `index.html`을 직접 더블 클릭하지 마세요. JSON은 로컬 HTTP 서버를 통해 읽습니다. 이 서버는 정적 파일을 제공하는 개발 도구이며 인증/DB 백엔드가 아닙니다.

## 조작과 흐름

타이틀 → 카엘 선택 → 입학 → 광장 → 온실 Life → Adventure → 온실 Life/선택 → My Room → 성찰 → 추억 기록 → 부모 리포트 미리보기.

- WASD 또는 방향키: 8방향 이동. 바닥 클릭: 해당 방향으로 이동 (자동 길찾기는 없음).
- E 또는 화면 아래 상호작용 버튼: 가까운 대상 조사/채집/룬/입구.
- 가방: 소지한 달빛 약초. 발견 기록: 식물 조사로 알아낸 사실.
- 룬: 조각을 90도씩 회전시켜 시작 원과 도착 마름모를 연결. 힌트 3단계, 벌점 없음.
- 회복 후 입구로 돌아가 시온의 사정을 듣고 선택. 일반 질문 답변은 저장하지 않음.
- 메뉴/Escape: 잠시 쉬기와 타이틀 복귀. 이어하기는 같은 브라우저의 로컬 기록을 사용.

새 이야기는 기존 기록 교체를 확인합니다. 로그인·서버 저장·실제 보호자 리포트 전송은 구현하지 않습니다.

## 콘텐츠 수정

`content.json`에서 assets의 이미지 경로, dialogue의 대사, choices/반응, reflections, report 문구를 바꿉니다. 자산 ID와 주요 선택 ID는 유지하세요. 이미지 경로는 이 Prototype 폴더 기준이며 후속 URL도 사용할 수 있습니다. 원격 자산은 공급 서버의 CORS 허용이 필요합니다.

SD는 `sd`의 방향·셀 크기·발 기준점·표시 크기로 조정합니다. 오브젝트 크기·배치는 `map.objects`와 `decorations`, 충돌은 `collisions`, 이동 속도는 `speed`입니다. 퍼즐 판정은 이미지와 분리된 `puzzle.mjs`에서 관리합니다.

자산 출처: main `c751696`의 `document/03_characters`. 필요한 파일만 prototype/assets에 원본 내용 그대로 복사했습니다. 카엘 보행·베른 외곽·식물 상태 정렬은 미완료 QA 자산입니다. 시온 캐스팅과 대본은 임시입니다.

Phaser 3.90.0은 `vendor/phaser.min.js`에 고정 동봉했고 MIT 라이선스는 `vendor/PHASER-LICENSE.txt`입니다.

## 검증

```powershell
node --test --test-isolation=none prototype/tests/*.test.mjs
```

전체 PC 플레이 및 검증 결과는 `VERIFICATION.md`에서 확인합니다.
