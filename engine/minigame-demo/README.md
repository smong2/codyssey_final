# LUMIA 미니게임 독립 데모

Phaser 3 Scene으로 구현한 7종 수업 게임의 **2차 플레이테스트 버전**입니다. 통합 게임, 캐릭터 상태, 수업 일정, 저장 데이터와 연결되지 않습니다. 게임은 결과 객체만 내보내며 스탯을 직접 변경하지 않습니다. [초기 구현 사양](../../document/content/07_MINIGAME_DEMO_IMPLEMENTATION_SPEC.md)의 1차 게임 4종 코드는 데이터 보존을 위해 남겼지만 현재 메뉴에는 노출하지 않습니다.

## 실행

Node.js가 필요합니다. 추가 패키지 설치나 네트워크 연결은 필요하지 않습니다. Phaser 3.90.0 배포본과 MIT 라이선스가 `vendor/`에 동봉되어 있습니다.

저장소 루트에서:

```sh
node engine/minigame-demo/server.mjs
```

브라우저에서 `http://127.0.0.1:4174/`에 접속합니다. 포트가 이미 사용 중이면 `LUMIA_MINIGAME_PORT=4175 node engine/minigame-demo/server.mjs`처럼 지정합니다. 서버는 `Ctrl+C`로 종료합니다.

테스트:

```sh
cd engine/minigame-demo
npm test
```

`npm test`는 Node 내장 테스트 러너만 사용합니다. `npm install`은 필요 없습니다.

## 게임 목록

| ID | 게임 | 공간 | 수업 연결 | 스탯 | 난이도 변화 |
|---|---|---|---|---|---|
| `rune-circuit` | 룬 회로 | 마도 공방 | 마법훈련 | 마법 | 기본 연결 → 고정 회로 → 두 마법진 분기 |
| `excavation` | 호숫가 유물 발굴 | 학원 호숫가 | 탐사 수업(제안) | 탐험 | 조각 배치 → 두 번 발굴하는 암석 → 암석 증가 |
| `rune-link` | 기억의 서고 | 대서고 | 고대학 수업(제안) | 지식 | 연결 → 가려진 책 → 열쇠와 잠긴 책장 |
| `training-guardian` | 훈련장 수호 | 룬 수련장 | 검술훈련 | 솜씨 | 접근 표적 → 예고 돌진 → 원거리 표적 |
| `rune-merge` | 온실 룬 연성 | 유리 온실 | 고대학 수업(제안) | 지식 | 기본 합성 → 이슬 룬 → 높은 단계 혼합 |
| `mirror-magic` | 거울 마법 | 별빛 천문대 | 마법훈련 | 마법 | 거울 → 장애물 → 프리즘 분기와 두 목표 |
| `seal-dismantle` | 시계탑 봉인 해체 | 시계탑 광장 | 탐사 수업(제안) | 탐험 | 색 분류 → 보관칸 축소 → 겹친 봉인 |

고대학·탐사 수업명과 스탯 연결은 데모 제안이며, 실제 스탯 증가량은 엔진/기획에서 확정해야 합니다. 표적은 안전한 훈련 도구이며 `집중`은 해당 미니게임 판 안에서만 쓰는 도전 자원입니다.

## 코드 구조와 가져오기

- `src/minigames/index.js`: 7개 Scene의 metadata registry. 메뉴는 이 registry에서 카드를 생성합니다.
- `src/minigames/<game>/logic.js`: 가능한 게임의 Phaser/DOM에 의존하지 않는 규칙·판정. 실시간 훈련장 수호는 Scene 내 시뮬레이션입니다.
- `src/minigames/<game>/*Scene.js`: 클릭/터치 UI, 게임 진행, 결과 생성.
- `src/minigames/shared/`: seed RNG, 일회성 결과 이벤트, 공통 Scene 계약.
- `src/ui/theme.js`: 장소별 배경·팔레트, 패널, 버튼.
- `src/scenes/`: 데모 전용 메뉴와 결과 화면. 통합 엔진으로 가져갈 필요는 없습니다.
- `src/main.js`: 데모 전용 Phaser.Game 생성과 배경 texture 등록.

한 게임만 통합하려면 해당 게임 폴더와 `shared/`, `ui/theme.js`를 가져오고 Scene을 기존 Phaser config에 등록합니다. `BaseMinigameScene`은 완료 시 이 데모의 `result` 또는 `menu` Scene으로 이동하므로 통합 엔진에서는 이 이동 부분을 adapter로 바꿔야 합니다. 순수 판정 로직은 그대로 사용할 수 있습니다. 구체적인 작업 지시는 [엔진 통합 프롬프트](ENGINE_INTEGRATION_PROMPT.md)에 있습니다.

```js
import { RuneCircuitScene } from './minigames/rune-circuit/RuneCircuitScene.js';

// 기존 Phaser.Game의 scene 배열에 RuneCircuitScene 등록 후:
game.scene.start('rune-circuit', {
  difficulty: 1,
  seed: 'week-1-character-123',
  maxDurationMs: 180000,
});

game.events.on('minigame:complete', result => {
  // 수업 시스템이 result를 해석해 성장량·저장을 결정한다.
  console.log(result);
});
game.events.on('minigame:quit', result => {
  // 중단 처리. 성장량은 여기서 자동 적용하지 않는다.
  console.log(result);
});
```

시작 데이터의 기본값은 `difficulty: 1`, `seed: 'demo-seed'`, `maxDurationMs: 180000`입니다. 같은 seed는 랜덤 게임의 같은 초기 상태를 재현합니다.

```js
{
  gameId: 'rune-circuit',
  outcome: 'success', // success | failure | timeout | quit
  score: 820,
  durationMs: 83420,
  difficulty: 1,
  seed: 'week-1-character-123',
  metrics: { turns: 14, roundsCleared: 3 }
}
```

성공·실패·시간 종료는 `minigame:complete`, 목록으로 중단은 `minigame:quit`으로 한 번만 발생합니다. `failure`는 해당 판의 훈련/퍼즐 종료이며 캐릭터 체력·성장 스탯 감소를 뜻하지 않습니다. `다시 시작`은 결과 이벤트 없이 현재 판을 새로 엽니다. Scene 종료 시 타이머, tween, 입력 listener를 정리합니다. `score`는 데모 비교값이지 LUMIA 스탯 증가량이 아닙니다.

## 그래픽과 입력

배경은 [세계관 장소 정의](../../document/02_WORLDVIEW.md)에 대응하는 등록된 `asset/background/` 파일 7장을 사용합니다. 데모 서버가 `/world-assets/` 경로로 원본을 읽어 제공하므로 이미지 복제본은 만들지 않습니다. 장소·이미지·강조색 매핑은 `src/ui/theme.js`의 `SPACES`에서 관리합니다. 다른 엔진에 가져갈 때는 해당 경로를 프로젝트의 asset loader에 맞춰 교체하세요. 배경 파일 존재가 최종 화면 검수나 아트 승인 완료를 뜻하지 않습니다.

기본 조작은 클릭/터치입니다. 훈련장 수호는 WASD/방향키 이동, 온실 연성은 숫자 1~7 열 선택도 지원합니다. 봉인 해체에는 한 수 되돌리기가 있습니다. 데스크톱/태블릿 가로 화면을 기준으로 1280×720을 `FIT`으로 축소합니다. 작은 세로형 휴대폰에서의 가독성과 실제 플레이 시간은 별도 사용자 테스트가 필요합니다.

## 검증 범위와 남은 판단

자동 테스트는 시드 재현, 결과 한 번 발행, 기존 퍼즐 해답, 새 배치·합성·봉인 판정을 검증합니다. 브라우저에서 공간별 배경, 메뉴 진입, 새 게임의 기본 입력을 확인했습니다. 7종의 실제 재미와 1~3분 체류, 난이도 곡선은 신규 플레이어 플레이테스트로 계측해야 합니다. 수업 제안명과 점수의 스탯 환산은 이 데모가 확정하지 않습니다.
