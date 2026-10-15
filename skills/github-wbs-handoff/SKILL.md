---
name: github-wbs-handoff
description: After LUMIA planning, content, architecture, or project documentation is updated, inspect related GitHub WBS issues and produce a Codex-ready prompt for only the necessary Project Status and issue comment changes. Use this after document edits, scope decisions, spec-outs, or completion-criteria changes. Do not directly mutate GitHub unless the user explicitly asks.
---

# GitHub WBS handoff after document changes

Use this skill **after document changes are finished** in the LUMIA repository.

The purpose is to keep the documentation and GitHub WBS aligned without mixing responsibilities:

- Documentation/content decisions are updated in the repository first.
- GitHub WBS status/comment changes are reviewed only after the document work is complete.
- The normal output is a **Codex prompt** that performs GitHub status/comment work.
- Do **not** change GitHub directly unless the user explicitly asks for direct GitHub mutation.

## Required inputs

Use the current repository state and the current conversation. Do not ask the user to repeat information already available.

Inspect as needed:

- changed documentation from `git status` / `git diff`
- WBS numbers explicitly mentioned in the changed documents or current conversation
- relevant GitHub parent/child issues
- current issue body, current Project Status, and recent comments when available
- completion criteria in the repository documents

If GitHub data is not accessible, do not invent current issue status. Generate a prompt that tells Codex which issues to inspect before acting.

## Workflow

### 1. Finish and validate the document work first

Do not start the WBS handoff while the document decision is still unresolved.

Confirm that:

- the requested document/content changes are actually written,
- directly connected summary documents are synchronized when required by repository rules,
- unrelated existing diffs were preserved,
- no implementation completion is inferred merely because a design document exists.

### 2. Identify related WBS issues

Map the completed document change to the smallest relevant GitHub WBS range.

Prefer explicit evidence in this order:

1. WBS/issue IDs written in the changed document or user request
2. related parent/child issues in GitHub
3. issue completion criteria and linked repository documents

Do not broaden into unrelated WBS areas only because nearby documents changed.

### 3. Compare repository evidence with GitHub state

For each related issue, decide one of:

- `변경 없음`
- `Backlog → 진행중`
- `진행중 → 작업완료`
- `Backlog → 작업완료` only when the deliverable is genuinely complete without an intermediate implementation step
- `스펙 아웃 / Not planned`
- status unchanged but a progress/scope comment is needed

Use these rules:

- **Backlog**: required work has not materially started or no repository evidence exists.
- **진행중**: some required work is complete, but at least one completion criterion remains.
- **작업완료**: the issue's stated deliverable is complete and verifiable from current repository evidence.
- **스펙 아웃 / Not planned**: the user intentionally removed the deliverable from project scope. This is not a failed or unfinished task.
- A parent issue becomes `작업완료` only when all **active** children needed for that parent are complete. Children intentionally spec'd out do not block parent completion.
- Do not mark implementation/test issues complete because planning documents were completed.
- Do not mark a parent complete merely because a summary document says so; verify active child criteria.

### 4. Decide whether a GitHub comment is needed

A comment is useful when it records a decision that changes how the issue should be interpreted, including:

- scope reduction or spec-out
- completion criteria satisfied
- completion criteria changed by an approved design decision
- parent issue remains in progress because specific children remain
- an old issue requirement is no longer valid

Avoid duplicate comments. If the latest issue comments already record the same decision, do not instruct Codex to post another identical comment.

Comments should state evidence and consequence, not repeat the entire design document.

Keep comments deliberately short:

- Prefer **one sentence** per issue; use at most two short sentences when necessary.
- Record only the completion/scope decision and its core evidence.
- Do not copy checklists, detailed design rules, or long summaries into issue comments when the repository document already contains them.

### 5. Preserve the project's GitHub operating policy

Unless the user explicitly overrides it, the generated Codex prompt must say:

- repository files must not be modified
- no commit, branch, or PR creation
- do not close issues merely because Project Status becomes `작업완료`
- prefer updating the GitHub Project Status field and adding/updating concise issue comments
- do not rewrite issue bodies wholesale
- do not duplicate an existing equivalent comment
- for removed scope, use `스펙 아웃`, `취소`, or `Not planned` if such a Project status exists; otherwise keep the closest valid status and make the scope removal explicit in the comment
- after execution, report each issue as `기존 상태 → 변경 상태 / comment 요약`

### 6. Produce the handoff result

Always finish document-editing tasks with a **GitHub WBS follow-up** section.

If no GitHub status/comment change is needed, output:

```text
GitHub WBS 후속 확인: 변경할 상태/코멘트 없음. Codex GitHub 작업 불필요.
```

If any change is needed, provide:

1. a compact decision table
2. a complete Codex prompt using the structure in `assets/codex-prompt-template.md`

The Codex prompt must be self-contained. It must include the repository, target issue numbers, confirmed decisions, expected status changes, exact comment intent, and constraints.

## Quality checks

Before finalizing, verify:

- Did the repository documentation actually change?
- Did you inspect only related WBS issues?
- Did you distinguish planning completion from implementation completion?
- Did you treat spec-out as an intentional scope decision rather than unfinished work?
- Did you verify parent completion against active children?
- Did you avoid instructing Codex to edit repository files?
- Did you avoid closing issues unless explicitly requested?
- Is the Codex prompt executable without requiring the user to explain the same decision again?
- Are proposed issue comments limited to the shortest useful completion/scope note (normally one sentence)?

