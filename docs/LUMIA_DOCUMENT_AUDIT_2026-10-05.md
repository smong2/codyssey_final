# LUMIA 문서 정규화 완료 감사
> 감사 기준일: 2026-10-06 · Document Audit v2.0
> 파일명은 기존 링크 호환을 위해 LUMIA_DOCUMENT_AUDIT_2026-10-05.md를 유지한다. 이 문서는 문서 정합성 결과이며 Prototype 구현·실기기 QA 완료를 뜻하지 않는다.

## 1. 문서별 역할

| 문서 | 역할/공유 대상 |
|---|---|
| GAME_DESIGN | 전체 게임 철학·시스템과 이번 Prototype 범위; 팀 공통/기획 |
| PROTOTYPE_PLAN | 화면·상태·실제 Copy·저장·예외·수용조건의 상세 구현 Source of Truth; 개발/QA/기획 |
| DESIGNER_GUIDE | 화면 방식/레이어/납품/반응형 원칙; 디자이너 |
| DESIGNER_PRODUCTION_REQUEST | 실제 제작물/상태/권장 규격/제외 목록; 디자이너 |
| DOCUMENT_AUDIT | 본문 정규화 결과와 남은 확인; PM/기획/QA |

## 2. 본문 정규화 완료 체크

- [x] 첨부 원본 본문을 기반으로 복원했다. 상단 최신 우선순위 절을 제거하고 관련 섹션·표·흐름·제작물·수용조건에 확정사항을 통합했다.
- [x] 전체 게임은 기존 32명 중 플레이 캐릭터를 선택한다. 이번 Prototype에만 32명 Card/상세/큰 이미지 열람, 카엘(CH01)만 Confirm/시작/플레이, 다른 31명 시작 버튼·제한 안내 없는 열람 전용을 적용한다.
- [x] Intro는 제공 영상의 어둠→작은 빛→원형 Rune→밝아짐, 실제 BG01 Arcadia, LUMIA Title로 연결한다. Skip/Title 돌아가기 Intro 재생/저장 뒤 Title 메뉴/정적 fallback을 명시했다. Admission 실시간 Rune/Fade와 구분하고 BGM·환경음·SFX는 제외했다.
- [x] Admission은 UI07 원본/개인화 이름/Script v2/[입학하기]이며 CSS 대체 디자인을 금지했다.
- [x] Adventure는 MAP04 Large Map Illustration/원본 보존/배포 raster WebP/follow camera/코드 collision polygon·rectangle/interaction points/UI overlay다. World Change는 Restored Map 또는 부분 overlay, foreground는 선택 사항이다. 신규 Tile/Modular 엔진·Tile asset 제작은 제외했다.
- [x] Dialogue는 Player 좌/NPC 우, opacity 100%/no blur/기본 scale·position 고정/brightness 150~250ms, 단일 하단 panel click+advance arrow다. Choice 동안 arrow를 숨기며 일반 진행 버튼은 제거했다.
- [x] Choice는 Desktop 중앙 Safe Area 세로/Mobile Dialogue Box 위 fallback이며 선택 후 Player 실제 발화→NPC 반응이다. Context Image Slot은 필요한 물체에만 쓰고 고정 portrait slot이 아니다.
- [x] Advance Arrow/Context Image Slot·Frame/Bag·Diary·Menu Icon/Heart Balance HUD/Heart +100 Reward Feedback을 실제 제작 목록에 추가했다.
- [x] Heart는 Episode completion reward currency다. Diary 저장 뒤 ♥100을 1회 지급하며 Choice/Hint/실패/중단/속도와 무관하다. 일반 Life/Adventure/Dialogue/Puzzle에서 숨기고 My Room 기본 화면만 compact balance를 표시한다. Theme 구매/복잡 경제는 제외했다.
- [x] Mobile은 touch/safe area/긴 Choice 자동 높이/Dialogue overflow/Intro central crop/Adventure viewport follow를 검증한다. iPhone 6s는 최적화 참고이며 실기기 완료조건이 아니다.
- [x] Parent Report 미리보기는 아이 Prototype Flow에 없다. 전체 게임의 향후 Settings→보호자 설정→이야기 편지/부모 리포트 철학과 Reflection/Diary raw content 비공개를 유지했다.
- [x] Script v2 SCENE 01–32와 추가 14A/29A의 34개 장면 heading을 모두 유지했다. 주요 대화/Choice/Reflection 실제 Copy를 원본과 비교했고 BERN_SHORT_TALK_EP01 블록은 원문 전체와 동일하다.
- [x] 초3~4학년 Writing Rule, 답을 미리 말하지 않기, 세 객관 조사 사실, 알아낸 것 HUD, Optional Moonlight Herb, Hint L1/L2/L3, 무벌점 stop/resume, World Change 재관찰, 시온 고백/Choice, Diary/Heart/Day02, no visible stats/전투·죽음·GAME OVER 없음/Episode2 제외를 유지했다.
- [x] ST-11C 햇빛/ST-11D 룬 및 Script Scene 연결을 일치시켰다. 회복 꽃 재관찰은 가능하지만 필수가 아니다. BERN Small Choice 답변 비저장·보상/평가 없음을 보존했다.
- [x] 문서 버전/변경요약을 갱신하고 전체 동기화를 다음 갱신으로 미루는 문장을 제거했다.

## 3. 구버전 개념 전수 감사

| 검색 개념 | 현재 결과 |
|---|---|
| Prototype 부모 리포트 미리보기 | 아이 Flow에서 없음; 후속 보호자 기능/제외 표현만 존재 |
| PC-only/Tablet 보류 | Desktop/Mobile responsive·touch 구현/검증으로 교체 |
| Tile/Modular 중심 Adventure | Large Map Illustration 방식; Tile 언급은 제작·엔진 제외 용도 |
| Intro 영상 불필요 | 제공 intro.mp4 사용; Admission/Day End는 별도 실시간 전환 |
| 기본 scale 화자 강조 | scale 고정; 1~2%는 Playtest 옵션 |
| 반복 계속/다음 버튼 | panel click/advance arrow; 실제 중단·행동·상태전환 텍스트 버튼 유지 |
| Coin 기본 보상 | Episode 완료 Heart; 별도 Coin은 Later/TBD로 분리 |
| 32명 모두 플레이 또는 카엘만 보임 | 전체 게임 32명 선택·플레이 / Prototype 32명 열람·카엘만 플레이로 범위 구분 |

## 4. 남은 [TBD] / [개발 확인] / [Playtest 확인]

| 구분 | 항목/경계 |
|---|---|
| [Asset TBD] | Character Canon 파일/표시 정보, Life 표정/시간대 overlay, 원본 교체·QA, SD cell/필요 atlas와 WebP export 규격 |
| [TBD: Later] | 전체 게임 Heart 보상/Theme 가격, 온실 이후 장소, 전체 Arcadia 이동 UI, 서버 DB/API·보호자 연결/동의/인증·발송 |
| [개발 확인] | 제공 영상 코덱/Skip/fallback, MAP04 world 좌표/collision/interaction/camera clamp, WebP 메모리·압축, 모바일 조이스틱/행동·입력 감지, local save 실패·복구/중복 보상 방지, 접근성 |
| [개발 확인: Asset QA] | 기존 카엘 SD 책 위치/보행, 베른 투명 경계, 발렌티누스 손·머리카락 경계, 식물 Before/After 화분 정렬; 완성본 교체 시 실제 크기/밝고 어두운 배경 재검수 |
| [Playtest 확인] | 실제 아동 5명 이상, 룬 직행 시 탐험 경험/Soft Guidance, 세 사실 이해도, 긴 Choice·Dialogue overflow·touch target, camera/이동 속도/거리, 1~2% scale 옵션 |
| 최적화 참고 | iPhone 6s 수준을 참고하지만 실기기 성능 완료조건으로 선언하지 않음 |

확정된 기존 3×3 Puzzle, 시온 캐스팅/Script v2, 카엘 Prototype Player, Day02 방 나가기 미노출은 TBD가 아니다. 문서 체크 완료와 Prototype 수용조건 충족은 구분한다. 구현/Playtest 체크는 PROTOTYPE_PLAN의 미완료 수용조건을 따라 별도 수행한다.
