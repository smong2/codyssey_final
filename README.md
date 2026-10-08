# LUMIA

LUMIA는 9~11세 어린이가 룬 학원 아르카디아의 학생이 되어 친구와 관계를 맺고, 사건을 탐색하며, 자신의 선택으로 세계의 변화를 만드는 웹 기반 판타지 생활 어드벤처 게임입니다. 선택을 점수나 정답으로 평가하지 않고 대화·관계·환경의 반응으로 보여주는 것이 핵심 원칙입니다.

## 처음 읽을 문서

| 대상 | 문서 | 내용 |
|---|---|---|
| 팀원 | [문서 안내](document_new/00_README.md) | 읽는 순서와 기준 |
| 팀원 | [프로젝트 개요](document_new/01_PROJECT_OVERVIEW.md) | 목표, 대상, 원칙, 환경 |
| 팀원 | [세계관](document_new/02_WORLDVIEW.md) | 룬, 그림자 룬, 아르카디아 |
| 팀원 | [캐릭터](document_new/03_CHARACTERS.md) | 학생 32명과 주요 인물 |
| 팀원 | [이미지 자원](document_new/04_ASSETS.md) | 카테고리, 상태, 이미지 연결 |
| 팀원 | [팀 역할](document_new/05_TEAM_ROLES.md) | 작업 영역과 담당 확인 항목 |
| 팀원 | [게임 콘텐츠](document_new/06_GAME_CONTENT.md) | 콘텐츠 유형과 플레이 흐름 |
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
document_new/      팀원이 읽는 상세 문서
lagacy/            이동 전 자료의 원본 보관소 (디렉터리명 유지)
```

새 작업의 기준은 `document_new/`와 `document_for_ai/`입니다. `lagacy/`는 출처 확인용이며, 오래된 안과 현재 기준이 충돌하면 새 문서를 우선합니다. 확정되지 않은 사항은 문서에 `미정` 또는 `검토 필요`로 표시했습니다.
