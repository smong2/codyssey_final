-- Validate LUMIA Location Story master data after v4 migration + seed.
-- Usage:
--   sqlite3 backend/database/sqlite/lumia-content.sqlite3 \
--     < backend/database/sqlite/validate_location_story.sql
--
-- Current stage expects reviewed CH01~CH32 Location dialogue to be compiled.
-- Expected: 192 dialogue_sequences / 192 CHOICE nodes / 416 dialogue_options.

.headers on
.mode column

SELECT 'schema_user_version' AS metric, user_version AS value
FROM pragma_user_version;

SELECT 'location_stories' AS metric, COUNT(*) AS value
FROM stories
WHERE version = 'dev-dialogue-v1'
  AND story_type = 'LOCATION'
  AND story_id IN (
    'LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01'
  );

SELECT 'location_events' AS metric, COUNT(*) AS value
FROM story_events
WHERE version = 'dev-dialogue-v1'
  AND event_id IN (
    'LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01'
  );

SELECT 'location_event_rules' AS metric, COUNT(*) AS value
FROM story_event_rules
WHERE version = 'dev-dialogue-v1'
  AND is_active = 1
  AND event_id IN (
    'LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01'
  );

SELECT 'location_conditions' AS metric, COUNT(*) AS value
FROM story_event_conditions
WHERE version = 'dev-dialogue-v1'
  AND event_id IN ('LOC_OBS_02','LOC_OBS_03','LOC_OBS_04')
  AND condition_type = 'PREVIOUS_EVENT_COMPLETE';

SELECT 'location_canonical_choices' AS metric, COUNT(*) AS value
FROM story_choices
WHERE version = 'dev-dialogue-v1'
  AND event_id IN (
    'LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01'
  );

SELECT 'location_choice_effects' AS metric, COUNT(*) AS value, 39 AS expected
FROM story_choice_effects
WHERE version = 'dev-dialogue-v1'
  AND event_id IN (
    'LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01'
  );

SELECT 'location_event_effects' AS metric, COUNT(*) AS value
FROM story_event_effects
WHERE version = 'dev-dialogue-v1'
  AND event_id IN (
    'LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01'
  );

SELECT 'greenhouse_role_candidates' AS metric, COUNT(*) AS value
FROM story_role_candidates
WHERE version = 'dev-dialogue-v1'
  AND role_id = 'LOC_GREENHOUSE_STUDENT';

SELECT 'greenhouse_role_exclusion' AS metric, COUNT(*) AS value
FROM story_role_exclusions
WHERE version = 'dev-dialogue-v1'
  AND role_id = 'LOC_GREENHOUSE_STUDENT'
  AND excluded_role_id = 'MAIN_GREENHOUSE_STUDENT';

SELECT 'serin_speaker' AS metric, COUNT(*) AS value
FROM dialogue_speakers
WHERE version = 'dev-dialogue-v1'
  AND speaker_id = 'SERIN';

SELECT 'location_dialogue_sequences' AS metric, COUNT(*) AS value, 192 AS expected
FROM dialogue_sequences
WHERE version = 'dev-dialogue-v1'
  AND story_id IN (
    'LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01'
  );

SELECT 'location_choice_nodes' AS metric, COUNT(*) AS value, 192 AS expected
FROM dialogue_nodes
WHERE version = 'dev-dialogue-v1'
  AND node_kind = 'CHOICE'
  AND story_id IN (
    'LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01'
  );

SELECT 'location_dialogue_options' AS metric, COUNT(*) AS value, 416 AS expected
FROM dialogue_options
WHERE version = 'dev-dialogue-v1'
  AND story_id IN (
    'LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01'
  );

SELECT 'location_dialogue_nodes' AS metric, COUNT(*) AS value, 3616 AS expected
FROM dialogue_nodes
WHERE version = 'dev-dialogue-v1'
  AND story_id IN (
    'LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01'
  );

SELECT 'foreign_key_errors' AS metric, COUNT(*) AS value
FROM pragma_foreign_key_check;

-- Human-readable detail checks.
SELECT story_id, step_no, event_id, earliest_week
FROM story_steps
WHERE version = 'dev-dialogue-v1'
  AND story_id IN (
    'LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01'
  )
ORDER BY story_id;

SELECT event_id, condition_order, condition_type, subject_ref, operator, value_json
FROM story_event_conditions
WHERE version = 'dev-dialogue-v1'
  AND event_id LIKE 'LOC_%'
ORDER BY event_id, condition_order;

SELECT role_id, resolver_type, assignment_order, prior_assignment_policy
FROM story_roles
WHERE version = 'dev-dialogue-v1'
  AND role_id IN ('MAIN_GREENHOUSE_STUDENT','LOC_GREENHOUSE_STUDENT')
ORDER BY assignment_order;
