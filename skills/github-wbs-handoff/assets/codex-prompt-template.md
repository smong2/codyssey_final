# Codex GitHub WBS handoff prompt template

Use this template only when one or more related GitHub WBS issues need a Project Status or comment update after repository documentation has already been updated.

```text
저장소: <owner/repo>

이번 작업은 GitHub WBS 상태와 issue comment 정리만 수행한다.
저장소 파일은 수정하지 마라.

먼저 아래 이슈의 현재 Project Status, issue body, 최근 comment를 확인한 뒤 중복 작업 없이 반영해라.

대상 이슈:
- #<issue>: <title>
- #<issue>: <title>

문서에서 확정된 최신 결정:
- <decision 1>
- <decision 2>

이슈별 처리:

## #<issue>
예상 상태: <current → target 또는 유지>

comment 취지:
- <evidence>
- <scope/completion consequence>

comment는 가능하면 한 문장, 길어도 두 문장 이내로 작성한다. 상세 설계는 반복하지 않는다.

## #<issue>
...

중요:
- repository 파일 수정 금지
- commit / branch / PR 생성 금지
- issue를 임의로 close하지 말 것
- 가능하면 GitHub Project Status만 변경할 것
- issue body를 대규모 재작성하지 말 것
- 동일한 내용의 최신 comment가 이미 있으면 중복 comment를 추가하지 말 것
- 스펙 아웃된 항목은 미완료로 해석하지 말고 범위 제거로 기록할 것
- 부모 이슈는 active child 완료 여부를 확인한 뒤에만 작업완료로 판단할 것

작업 후 다음 형식으로 보고해라.

#<issue> 기존 상태 → 변경 상태 / 추가·수정한 comment 요약
```

