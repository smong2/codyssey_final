# Responsive World Prototype Implementation Plan

> Execute inline using executing-plans and test-driven-development. Preserve existing dev-ds changes; no worktree reset, commit or push.

**Goal:** Approved video Intro, original invitation/card assets, MAP04 world and responsive dialogue/touch controls without changing Script v2 or save progression.
**Architecture:** Existing state/persistence/Phaser retained; separate Intro lifecycle and pointer gesture helpers. World geometry remains JSON, viewport uses container dimensions rather than scaling a fixed PC canvas.
**Tech Stack:** Browser modules, Phaser 3.90, localStorage v2, Node tests, WebP raster/MP4.
**Spec:** Four shared docs latest applied section and LUMIA_DOCUMENT_AUDIT_2026-10-05.md. User clarified low-end optimization target, not real iPhone 6s testing.

## Global constraints
Preserve script/facts/choice/reflection/diary/reward/day02 and existing uncommitted work. No sound/backend/new tile engine. Both portraits fully opaque/no blur/no scale motion. Choice blocks progression. Mobile joystick+nearby action approved. Original assets untouched.

## Task 1 — Intro and asset delivery
- [x] Test video/Skip rendering, invitation asset, Intro timeout/error/end lifecycle and no duplicate completion.
- [x] Run tests before implementation and observe failures.
- [x] Add intro-player.mjs attaching ended/error/rejected play/stall deadline, disposal and Skip; replay Intro without overwriting saved gameplay.
- [x] Copy original video and UI03, create optimized world WebP/video derivative where encoder available; support video MIME/range serving.
- [x] Re-run tests and inspect video metadata/assets.

## Task 2 — Dialogue and catalogue gestures
- [x] Test rendering click progression without repeated buttons, choice arrow hidden, internal card + independent selection.
- [x] Implement fixed portrait brightness, 200ms transition, vertical safe-area choices, original invitation and card frame, scroll/tap guard and scroll restoration.
- [x] Re-run all Node tests; preserve meaningful action buttons and actual choice speech.

## Task 3 — World and mobile input
- [x] Test normalized joystick, cancelled input, viewport sizes/capped renderer, coordinate bounds.
- [x] Replace tile/decor world with MAP04 image and restore overlay; maintain collision/interaction JSON and local saved positions.
- [x] Add container-resize camera viewport, limited preload, joystick pointer capture/release, modal/blur cancellation and responsive HUD.
- [x] Re-run tests and inspect actual map/collision placement.

## Task 4 — Verify and document
- [x] Desktop and mobile viewport core flow including Intro/Skip/title replay, catalogue scroll/+ selection, invitation, dialogue/Choice, Adventure movement/interactions/puzzle/stop-resume.
- [x] Confirm retained Diary/reward/Bern/Day02 invariants; test errors through automated lifecycle tests.
- [x] Update audit/README/verification with actual evidence, asset costs and pending playtest/development items; no actual-device claim.
- [x] Fresh tests/syntax/diff check; leave local edits for review.

Verification qualification: viewport/gesture helper checks are not physical multitouch or actual-device performance tests. Fine collision alignment and child playtest remain in VERIFICATION.md; user excluded iPhone 6s hardware validation.
