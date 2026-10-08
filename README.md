# LUMIA

LUMIA는 9~11세 어린이가 룬 학원 아르카디아의 학생이 되어 친구와 관계를 맺고, 사건을 탐색하며, 자신의 선택으로 세계의 변화를 만드는 웹 기반 판타지 생활 어드벤처 게임입니다. 선택을 점수나 정답으로 평가하지 않고 대화·관계·환경의 반응으로 보여주는 것이 핵심 원칙입니다.

## 처음 읽을 문서

| 대상 | 문서 | 내용 |
|---|---|---|
| 팀원 | [문서 안내](document/00_README.md) | 읽는 순서와 기준 |
| 팀원 | [프로젝트 개요](document/01_PROJECT_OVERVIEW.md) | 목표, 대상, 원칙, 환경 |
| 팀원 | [세계관](document/02_WORLDVIEW.md) | 룬, 그림자 룬, 아르카디아 |
| 팀원 | [캐릭터](document/03_CHARACTERS.md) | 학생 32명과 주요 인물 |
| 팀원 | [이미지 자원](document/04_ASSETS.md) | 카테고리, 상태, 이미지 연결 |
| 팀원 | [팀 역할](document/05_TEAM_ROLES.md) | 작업 영역과 담당 확인 항목 |
| 팀원 | [게임 콘텐츠](document/06_GAME_CONTENT.md) | 콘텐츠 유형과 플레이 흐름 |
| AI | [AI 시작 문서](document_for_ai/00_READ_FIRST.md) | 읽는 순서, 우선순위, 변경 확인 규칙 |

## 디렉터리 구조

```text
asset/             게임에 활용할 이미지 자원과 자원 안내
  character/       학생 및 인물 이미지
  item/            아이템과 조사 오브젝트
  background/      장소 배경
  environment/     환경 구성 요소
  puzzle/          퍼즐 이미지
  ui/              인터페이스 이미지
  effect/          시각 효과
document_for_ai/   AI에게 먼저 제공할 간결한 기준 문서
document/          팀원이 읽는 상세 문서
engine/            게임 엔진 담당 작업 공간
story/             메인·NPC·장소·서브·엔딩 이야기
backend/           API·DB·향후 관리자 영역
lumia/             최종 통합 결과물 영역
prototype/         기존 기준물 보존 영역
```

새 작업의 기준은 `document/`와 `document_for_ai/`입니다. 확정되지 않은 사항은 문서에 `미정` 또는 `검토 필요`로 표시했습니다. 과거 상세 원문은 현재 저장소에서 제공되지 않으므로, 확인하지 못한 원문을 새로운 결정의 근거로 사용하지 마세요.

## AI / Coding Agent 안내

작업 전 [AI 시작 문서](document_for_ai/00_READ_FIRST.md)와 작업 대상 폴더의 README를 읽으세요. 평소에는 담당 영역 밖 파일을 임의로 수정하지 않습니다. 상세한 경계와 공통 문서 갱신 규칙은 [협업 규칙](document_for_ai/06_WORKSPACE_RULES.md)을 따릅니다.
