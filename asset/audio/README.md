# 오디오 매칭표

실제 파일 기준. 파일명과 확장자는 모두 소문자 `.mp3`이며, 같은 곡을 여러 장면에서 재사용합니다.

## 경로와 API 기준

- BGM 원본: `asset/audio/bgm/{파일명}`
- SFX 원본: `asset/audio/sfx/{파일명}`
- 웹 재생 URL: `{웹 배포 주소}/audio-assets/{파일명}` — API 서버 주소와 구분합니다.
- 메인 스토리: `storyId`와 원고의 씬 `S1~S5`로 매칭합니다.
- NPC·장소 스토리: 아래의 이벤트 ID로 매칭합니다. 범위 표기는 해당 ID들을 뜻하며 API에는 개별 ID를 사용합니다.

현재 대화 API에는 BGM 명령이 없습니다. 아래는 **연결할 파일과 전환 지점의 기준**입니다. 원고의 씬 번호를 API의 `stepNo`와 같은 값으로 가정하지 않으며, 씬별 BGM 전환 지점은 API·엔진에 추가 전달해야 합니다.

## 기본 화면·활동

| 매칭 대상 | 파일명 | 반복 |
|---|---|---|
| 인트로 영상 | `bgm_title_intro.mp3` | 아니요 |
| 타이틀·캐릭터 선택·슬롯 선택 | `bgm_title_main.mp3` | 예 |
| 최초 입학 초대장 → 시계탑 광장 | `bgm_admission_invitation.mp3` | 아니요 |
| 마이룸 | `bgm_myroom.mp3` | 예 |
| 모험맵 3종 전체 | `bgm_map.mp3` | 예 |
| 미니게임 전체 | `bgm_minigame.mp3` | 예 |

모험맵이 연속으로 이어지면 장소가 바뀌어도 같은 곡을 유지하고, 미니게임도 연속으로 이어지면 종류가 바뀌어도 같은 곡을 유지합니다.

## 메인 스토리

각 행의 시작 씬에서 적용하고, 같은 파일을 사용하는 동안 재생을 이어갑니다.

| storyId | 씬 | 파일명 |
|---|---|---|
| `MS01` | S1 | `bgm_admission_invitation.mp3` |
| `MS01` | S2 | `bgm_daily_bright_01.mp3` |
| `MS01` | S3 | `bgm_mystery_03.mp3` |
| `MS01` | S4 | `bgm_myroom.mp3` |
| `MS01` | S5 | `bgm_daily_bright_01.mp3` |
| `MS02`, `MS03` | S1~S3 | `bgm_mystery_02.mp3` |
| `MS02`, `MS03` | S4~S5 | `bgm_gentle_resolution_01.mp3` |
| `MS04` | S1~S3 | `bgm_playful_01.mp3` |
| `MS04` | S4~S5 | `bgm_calm_01.mp3` |
| `MS05` | S1~S2 | `bgm_playful_01.mp3` |
| `MS05` | S3 | `bgm_mystery_01.mp3` |
| `MS05` | S4 | `bgm_hopeful_restoration_01.mp3` |
| `MS05` | S5 | `bgm_playful_01.mp3` |
| `MS06` | S1~S5 | `bgm_winter_gathering_01.mp3` |

- MS01 S2는 입학 음악이 재생 중이면 끝까지 유지한 뒤 공통 일상곡으로 전환합니다. 마이룸 진입 시에는 마이룸 음악으로 전환합니다.
- 미스터리 번호: `01` 어두움·위기 / `02` 추리·조사 / `03` 가벼운 신비·호기심.
- `bgm_gentle_resolution_01.mp3`은 일반 대화·부드러운 해결용입니다. 곡 안의 감정 변화와 특정 대사의 재생 시점이 일치한다고 가정하지 않습니다.

## NPC·장소 스토리

| 이벤트 ID | 파일명 |
|---|---|
| `NPC_GUIDE_01~04` | `bgm_daily_bright_01.mp3` |
| `NPC_WORK_01~04` | `bgm_calm_01.mp3` |
| `NPC_LULU_01~04` | `bgm_playful_01.mp3` |
| `LOC_OBS_01~04` | `bgm_observatory_01.mp3` |
| `LOC_GH_01`, `LOC_LIB_01` | `bgm_calm_01.mp3` |

## 효과음

| 동작 | 파일명 |
|---|---|
| 활성 버튼 클릭 | `sfx_button_press.mp3` |
| 다이어리 열기 | `sfx_diary_open.mp3` |

다이어리 열기는 전용 효과음만 재생하고 기본 클릭음을 중복 재생하지 않습니다.

## 재생·연결 규칙

- 동일한 곡이면 재시작하지 않습니다. 다른 곡으로 바뀔 때 기본 0.8초 교차 페이드를 사용합니다.
- 인트로 음악 종료 약 6초 전 타이틀 음악으로 교차 페이드합니다. 건너뛰기·다시보기는 기존 타이틀 전환 규칙을 따릅니다.
- 인트로 영상이 먼저 끝나도 인트로 음악은 계속 재생합니다.
- 일반 스토리 BGM은 반복합니다. 인트로·입학 음악만 1회 재생합니다.
- BGM과 SFX의 켜기·끄기는 각각 적용합니다. 화면 스피커는 BGM만 제어합니다.
- 현재 연결된 BGM은 인트로·타이틀·입학·마이룸 4곡입니다. 신규 BGM의 API·엔진 연결은 후속 작업입니다.
- 클릭 효과음은 엔진·미리보기 서버·배포 복사 목록 모두 `sfx_button_press.mp3`를 사용합니다.
- 신규 곡을 제공하려면 `engine/server.mjs`와 `backend/api/deploy/build-web.mjs`의 오디오 허용·복사 목록도 갱신해야 합니다.
- 같은 용도의 음원 교체는 기존 파일명을 유지합니다. 이름을 바꾸면 `engine/src/core/title-audio.mjs`의 등록 경로와 서버·배포 목록을 함께 수정하고, 대소문자만 바뀌어도 Git에 이름 변경을 기록합니다.
- 테스트로 오디오 경로 응답·트랙 전환을 확인하고, 실제 브라우저에서 재생·음량·반복 연결을 확인합니다.

기준: [메인 대사](../../document/dialogue/main/), [NPC 대사](../../document/dialogue/npc/), [장소 대사](../../document/dialogue/location/), [대화 API 계약](../../document/dialogue/01_ENGINE_API_CONTRACT.md).
