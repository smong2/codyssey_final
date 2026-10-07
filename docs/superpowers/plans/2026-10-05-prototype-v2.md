# LUMIA Prototype v2 Implementation Plan

> **For agentic workers:** Execute inline using executing-plans and test-driven-development. The user's existing dev-ds checkout and preview remain the working location; do not create another branch or push without a request.

**Goal:** Deliver the approved Episode 1 flow through Day 2 morning with replaceable JSON content and safe local continuation.

**Architecture:** Keep Phaser's existing Adventure renderer and fixed 3×3 puzzle. Separate story state, transactional persistence, content/catalogue and screen presentation. No backend, external runtime dependency, or generated character art.

**Tech Stack:** Vanilla browser modules, Phaser 3.90.0, Node test runner, localStorage.

**Spec:** docs/LUMIA_PROTOTYPE_PLAN.md plus the user's 2026-10-05 decisions recorded there.

## Global Constraints

- 32 browsable cards, only Kael has a start button; no restriction notice.
- PC arrows/WASD + E; no tablet joystick.
- Optional herb and flower reinspection; solved rune allows return to Sion immediately.
- Script v2 copy overrides conflicting earlier copy; user dialogue overrides both.
- Reward +100 once after Diary save, reason EPISODE_COMPLETION_REWARD, no evaluation.
- Preserve lumia-greenhouse-v1 untouched; store v2 under a new key.
- No parent report UI, login/server, episode 2, theme shop or player stats.
- Keep original asset files unchanged; Valentinus cutout is temporary with known edge residue.
- Bern Small Choice is ephemeral; persist only bernShortTalkSeen, no choice/affect analysis.

## Task 1: State and safe persistence

Files: prototype/state.mjs, storage.mjs, tests/core.test.mjs, tests/v2.test.mjs.

Interfaces: freshState(), validateState(state), applyEvent(state,event,content), saveState(state,storage), loadSave(storage), commitState(previous,next,storage).

- [x] Write tests: reward before Diary forbidden; duplicate record/reward forbidden; all branches reward equally; dayEnd load resumes morning; other characters cannot confirm; facts preserve discovery order; Small Choice is not stored; failed commit retains previous state; v1 key unchanged.
- [x] Run `node --test --test-isolation=none prototype/tests/*.test.mjs`; expect new assertions to fail because v2 behavior is absent.
- [x] Implement immutable event transitions, validators and new-key persistence. Save failure returns previous state and retries the exact pending candidate.
- [x] Run the same tests; expect all state/persistence tests to pass.

## Task 2: JSON content and assets

Files: prototype/content.json, characters.json, tools/build-catalog.mjs, assets/, tests/content.test.mjs.

Interfaces: content.dialogue[scene] is a list of {speaker,portrait,text}; catalogue is {id,name,gender,age,title,background,personality,strength,difficulty,quote,asset,playable}[]; asset paths are relative to prototype.

- [x] Test 32 unique profiles and files, both gender groups, only CH01 playable; all story dialogue endpoints and three branches resolve; no cause spoilers in pre-investigation content; all four reflection memories render.
- [x] Run the test file; expect absent catalogue/new dialogue failures.
- [x] Copy original 32 PNGs without modification and temporary Valentinus; derive profile fields verbatim from document/03_characters.md, with approved Kael Script v2 example. Add script and Bern copy to JSON, objective facts and sunlight interactable.
- [x] Re-run tests; expect all referenced files and content branches to resolve.

## Task 3: Story screens and adventure

Files: prototype/app.mjs, story-view.mjs, styles.css, adventure.mjs, tests/view.test.mjs.

Interfaces: renderStory(state,content,catalogue,ui) returns HTML; catalogue hover/card state is ephemeral; story events use applyEvent then commitState.

- [x] Test generated screens: other characters have no start button; both Life portraits fixed; choice reaction uses actual player line; completed room has bag/Diary/Bern/end-day but no report; morning has no exit/episode2; retry screen holds failed scene.
- [x] Run view tests before implementation; expect missing renderStory assertions to fail.
- [x] Implement Entry/Rune/Reveal/Title/Confirm/Admission/arrival, both first meetings, episode card, Life/Adventure/choice, Reflection/Record/Diary/reward, free room/Bern/day end/morning. All timers clear on navigation; save retries block input; static effects respect reduced motion.
- [x] Keep puzzle geometry, auto-complete on final connected tile; add sunlight, discovery HUD and bag card; menu stop/resume restores progress; flower reinspection optional.
- [x] Run all tests and syntax checks; expect no failures.

## Task 4: End-to-end verification and handoff

Files: prototype/README.md, VERIFICATION.md, docs/LUMIA_PROTOTYPE_PLAN.md.

- [x] Browser-play from fresh v2 through morning, exercise Small Choice and reload, test puzzle hint/navigation, stop/reentry and verify optional herb and optional reinspection.
- [x] Inspect portrait/catalogue/puzzle/room screenshots and console errors.
- [x] Re-run Node tests and `git diff --check`. Document actual outcomes, remaining designer-edge QA and no tablet/backend support.
- [x] Leave local changes for review; do not push.

## Progress

- Baseline: clean dev-ds at 827fcaf. Existing fixed geometry and SD reused.
- User resolved all behavioral conflicts listed in Global Constraints; asset replacement remains content-only.
- Completed: 29 tests pass; module syntax and diff checks pass; 76 original asset hashes match.
- Browser: full fresh-start through Day 2 morning, catalogue, puzzle/hints, optional flower reinspection skip, stop/reentry, Bern talk/repeat and reload verified.
- Review finding fixed: successful save retry reconciles Adventure input pause; regression test added.
- README and VERIFICATION updated; local changes retained without commit/push.
