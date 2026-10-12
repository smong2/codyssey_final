# 엔진 개발 AI에게 전달할 프롬프트

아래 블록을 엔진 담당자의 AI 대화 시작 메시지로 복사하세요. 엔진 담당자는 이 파일과 `engine/minigame-demo/README.md`를 함께 전달하거나 저장소 경로를 알려주면 됩니다.

```text
당신은 LUMIA 통합 게임의 엔진 담당자입니다. 이 저장소의 AGENTS.md와 document_for_ai/00_READ_FIRST.md를 먼저 읽고, 자신에게 적용되는 최신 작업 규칙을 확인하세요. 이어서 document/content/07_MINIGAME_DEMO_IMPLEMENTATION_SPEC.md, document/content/06_CLASSES_MINIGAMES.md, document/content/02_STATS_EVENTS_ENDINGS/01_STATS_SYSTEM.md, engine/minigame-demo/README.md를 읽으세요. 문서나 소스가 바뀌어 있다면 현재 파일을 다시 확인하고, 예전 대화 기억보다 현재 파일과 git diff를 우선하세요.

engine/minigame-demo/에는 독립 실행형 Phaser 3 미니게임 7종의 2차 플레이테스트 버전이 있습니다. 현재 실행 목록은 src/minigames/index.js의 registry를 기준으로 확인하세요. 과거 4종 소스는 보존되어 있지만 메뉴에서는 사용하지 않습니다. 현재 엔진의 Phaser 버전·Scene lifecycle·UI 구조를 먼저 조사한 뒤, 필요한 게임 Scene을 통합하세요. 데모 메뉴/결과 Scene과 데모 전용 server는 통합 게임에 그대로 넣지 않습니다. 각 게임 폴더의 logic.js가 있으면 순수 판정으로 가져가고, Scene·shared/·ui/theme.js의 필요한 부분을 검토해 엔진에 맞는 adapter를 작성하세요. 훈련장 수호는 실시간 Scene 로직입니다. 기존 엔진 코드나 다른 담당 영역의 데이터를 덮어쓰지 말고, 기존 변경을 보존하세요.

시작 data 계약: { difficulty: 1, seed: '재현 가능한 문자열', maxDurationMs: 180000 }. 성공/실패/시간 종료에는 minigame:complete, 중단에는 minigame:quit을 판당 한 번만 받습니다. result는 { gameId, outcome: 'success'|'failure'|'timeout'|'quit', score, durationMs, difficulty, seed, metrics } 형태입니다. failure는 해당 판의 종료이며 캐릭터 체력이나 성장 스탯 감소를 의미하지 않습니다. Scene이 LUMIA 스탯·캐릭터 저장소·localStorage를 직접 변경하지 않게 유지하세요. 수업/성장 시스템에서 result를 해석하고 반영하세요. 재시작 시 이전 timer/listener/tween이 남지 않는지도 확인하세요.

현재 데모의 고대학·탐사 수업명은 제안명입니다. 이를 최종 기획 확정치로 취급하지 말고, 변경이 필요하면 근거와 영향을 보고하세요. 점수→스탯 증가량은 이 데모에 없으므로 임의로 확정하지 마세요. 배경은 asset/background/의 기존 장소 이미지 7장을 사용합니다. 데모의 /world-assets/ 경로는 통합 엔진의 asset loader에 맞춰 바꾸고 원본 파일은 복제·교체하지 마세요.

작업 후 각 게임의 기동·중단·재시작·완료 이벤트, 동일 seed 재현, 결과 중복 발행 없음, 다른 게임으로의 이동, 반응형 크기를 검사하세요. 기존 테스트와 통합 엔진 테스트를 실행하고, document/실행방법.md 및 관련 문서를 실제 검증한 값으로 갱신하세요. 마지막으로 git diff를 검토해 변경 파일, 검증 결과, 남은 기획 결정사항을 간결하게 보고하세요. 권한 밖의 담당 영역 변경이나 최종 기획 판단이 필요하면 멈추고 사용자에게 구체적으로 질문하세요.
```

이 프롬프트는 엔진 담당자가 **현재 파일을 다시 읽고 변경을 스스로 반영**하도록 설계했습니다. 특정 AI 제품의 기억에 의존하지 않습니다.
