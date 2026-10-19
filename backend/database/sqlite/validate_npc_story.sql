-- LUMIA NPC Story SQLite v4 validation queries.
-- Default target version used by current local development:
--   dev-dialogue-v1
--
-- Run from repository root:
--   sqlite3 backend/database/sqlite/lumia-content.sqlite3 \
--     < backend/database/sqlite/validate_npc_story.sql

.headers on
.mode column

SELECT 'schema_user_version' AS metric, user_version AS actual, 4 AS expected
FROM pragma_user_version;

SELECT 'npc_stories' AS metric, COUNT(*) AS actual, 3 AS expected
FROM stories
WHERE version='dev-dialogue-v1'
  AND story_type='NPC'
  AND story_id IN ('NPC_GUIDE','NPC_WORK','NPC_LULU');

SELECT 'npc_events' AS metric, COUNT(*) AS actual, 12 AS expected
FROM story_events
WHERE version='dev-dialogue-v1'
  AND event_id IN (
    'NPC_GUIDE_01','NPC_GUIDE_02','NPC_GUIDE_03','NPC_GUIDE_04',
    'NPC_WORK_01','NPC_WORK_02','NPC_WORK_03','NPC_WORK_04',
    'NPC_LULU_01','NPC_LULU_02','NPC_LULU_03','NPC_LULU_04'
  );

SELECT 'npc_steps' AS metric, COUNT(*) AS actual, 12 AS expected
FROM story_steps
WHERE version='dev-dialogue-v1'
  AND story_id IN ('NPC_GUIDE','NPC_WORK','NPC_LULU');

SELECT 'npc_event_rules' AS metric, COUNT(*) AS actual, 12 AS expected
FROM story_event_rules
WHERE version='dev-dialogue-v1'
  AND event_id LIKE 'NPC_%';

SELECT 'npc_event_conditions' AS metric, COUNT(*) AS actual, 13 AS expected
FROM story_event_conditions
WHERE version='dev-dialogue-v1'
  AND event_id IN (
    'NPC_GUIDE_01','NPC_GUIDE_02','NPC_GUIDE_03','NPC_GUIDE_04',
    'NPC_WORK_01','NPC_WORK_02','NPC_WORK_03','NPC_WORK_04',
    'NPC_LULU_01','NPC_LULU_02','NPC_LULU_03','NPC_LULU_04'
  );

SELECT 'npc_canonical_choices' AS metric, COUNT(*) AS actual, 24 AS expected
FROM story_choices
WHERE version='dev-dialogue-v1'
  AND event_id IN (
    'NPC_GUIDE_01','NPC_GUIDE_02','NPC_GUIDE_03','NPC_GUIDE_04',
    'NPC_WORK_01','NPC_WORK_02','NPC_WORK_03','NPC_WORK_04',
    'NPC_LULU_01','NPC_LULU_02','NPC_LULU_03','NPC_LULU_04'
  );

SELECT 'npc_choice_effects' AS metric, COUNT(*) AS actual, 64 AS expected
FROM story_choice_effects
WHERE version='dev-dialogue-v1'
  AND event_id IN (
    'NPC_GUIDE_01','NPC_GUIDE_02','NPC_GUIDE_03','NPC_GUIDE_04',
    'NPC_WORK_01','NPC_WORK_02','NPC_WORK_03','NPC_WORK_04',
    'NPC_LULU_01','NPC_LULU_02','NPC_LULU_03','NPC_LULU_04'
  );

SELECT 'npc_event_effects' AS metric, COUNT(*) AS actual, 12 AS expected
FROM story_event_effects
WHERE version='dev-dialogue-v1'
  AND event_id IN (
    'NPC_GUIDE_01','NPC_GUIDE_02','NPC_GUIDE_03','NPC_GUIDE_04',
    'NPC_WORK_01','NPC_WORK_02','NPC_WORK_03','NPC_WORK_04',
    'NPC_LULU_01','NPC_LULU_02','NPC_LULU_03','NPC_LULU_04'
  );

SELECT 'npc_dialogue_sequences' AS metric, COUNT(*) AS actual, 384 AS expected
FROM dialogue_sequences
WHERE version='dev-dialogue-v1'
  AND story_id IN ('NPC_GUIDE','NPC_WORK','NPC_LULU');

SELECT 'npc_dialogue_options' AS metric, COUNT(*) AS actual, 768 AS expected
FROM dialogue_options
WHERE version='dev-dialogue-v1'
  AND story_id IN ('NPC_GUIDE','NPC_WORK','NPC_LULU');

SELECT 'npc_roles' AS metric, COUNT(*) AS actual, 2 AS expected
FROM story_roles
WHERE version='dev-dialogue-v1'
  AND role_id IN ('NPC_GUIDE_ACTOR','NPC_WORK_ACTOR');

SELECT 'npc_role_candidates' AS metric, COUNT(*) AS actual, 4 AS expected
FROM story_role_candidates
WHERE version='dev-dialogue-v1'
  AND role_id IN ('NPC_GUIDE_ACTOR','NPC_WORK_ACTOR');

SELECT 'lulu_speaker' AS metric, COUNT(*) AS actual, 1 AS expected
FROM dialogue_speakers
WHERE version='dev-dialogue-v1'
  AND speaker_id='LULU';

-- Every protagonist must have all 12 NPC event sequences.
SELECT character_id, COUNT(*) AS npc_sequences
FROM dialogue_sequences
WHERE version='dev-dialogue-v1'
  AND story_id IN ('NPC_GUIDE','NPC_WORK','NPC_LULU')
GROUP BY character_id
HAVING COUNT(*) <> 12
ORDER BY character_id;

-- Every protagonist must have all 24 NPC choice options.
SELECT character_id, COUNT(*) AS npc_options
FROM dialogue_options
WHERE version='dev-dialogue-v1'
  AND story_id IN ('NPC_GUIDE','NPC_WORK','NPC_LULU')
GROUP BY character_id
HAVING COUNT(*) <> 24
ORDER BY character_id;

-- Every NPC choice node must have exactly two options.
SELECT story_id, step_no, character_id, choice_node_id, COUNT(*) AS option_count
FROM dialogue_options
WHERE version='dev-dialogue-v1'
  AND story_id IN ('NPC_GUIDE','NPC_WORK','NPC_LULU')
GROUP BY story_id, step_no, character_id, choice_node_id
HAVING COUNT(*) <> 2
ORDER BY story_id, step_no, character_id;

-- Collision substitutions: these should show Robin/Dana authored text while
-- speaker_ref remains the stable ROLE:* reference resolved by storyCast.
SELECT character_id, story_id, step_no, node_id, speaker_ref, line_text
FROM dialogue_nodes
WHERE version='dev-dialogue-v1'
  AND (
    (character_id='CH16' AND story_id='NPC_GUIDE' AND node_id='NPC_GUIDE_01_S1_L01')
    OR
    (character_id='CH25' AND story_id='NPC_WORK' AND node_id='NPC_WORK_01_S1_L01')
  )
ORDER BY character_id;

-- WORK_02 remains a two-approach observation choice, not a correct/incorrect quiz.
SELECT character_id, choice_id, choice_text
FROM dialogue_options
WHERE version='dev-dialogue-v1'
  AND story_id='NPC_WORK'
  AND step_no=2
  AND character_id IN ('CH01','CH16','CH25','CH32')
ORDER BY character_id, sort_order;

PRAGMA foreign_key_check;
