-- Validate LUMIA Main/NPC/Location Story choice reward master data.
-- Usage from repository root:
--   sqlite3 backend/database/sqlite/lumia-content.sqlite3 \
--     < backend/database/sqlite/validate_story_choice_rewards.sql

.headers on
.mode column

-- Canonical choice/effect counts.
SELECT 'main_choices' AS metric, COUNT(*) AS actual, 40 AS expected
FROM story_choices
WHERE version='dev-dialogue-v1' AND event_id LIKE 'MS%';

SELECT 'main_choice_effects' AS metric, COUNT(*) AS actual, 102 AS expected
FROM story_choice_effects
WHERE version='dev-dialogue-v1' AND event_id LIKE 'MS%';

SELECT 'npc_choices' AS metric, COUNT(*) AS actual, 24 AS expected
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

SELECT 'location_choices' AS metric, COUNT(*) AS actual, 13 AS expected
FROM story_choices
WHERE version='dev-dialogue-v1'
  AND event_id IN ('LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01');

SELECT 'location_choice_effects' AS metric, COUNT(*) AS actual, 39 AS expected
FROM story_choice_effects
WHERE version='dev-dialogue-v1'
  AND event_id IN ('LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01');

SELECT 'all_story_choices' AS metric, COUNT(*) AS actual, 77 AS expected
FROM story_choices
WHERE version='dev-dialogue-v1'
  AND (
    event_id LIKE 'MS%'
    OR event_id LIKE 'NPC_GUIDE_%'
    OR event_id LIKE 'NPC_WORK_%'
    OR event_id LIKE 'NPC_LULU_%'
    OR event_id IN ('LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01')
  );

SELECT 'all_story_choice_effects' AS metric, COUNT(*) AS actual, 205 AS expected
FROM story_choice_effects
WHERE version='dev-dialogue-v1'
  AND (
    event_id LIKE 'MS%'
    OR event_id LIKE 'NPC_GUIDE_%'
    OR event_id LIKE 'NPC_WORK_%'
    OR event_id LIKE 'NPC_LULU_%'
    OR event_id IN ('LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01')
  );

-- Every canonical choice must have exactly one visible effect.
SELECT 'choices_without_exactly_one_visible' AS metric, COUNT(*) AS actual, 0 AS expected
FROM (
  SELECT sc.event_id, sc.choice_id
  FROM story_choices sc
  LEFT JOIN story_choice_effects sce
    ON sce.version=sc.version
   AND sce.event_id=sc.event_id
   AND sce.choice_id=sc.choice_id
   AND sce.effect_type='VISIBLE_STAT'
  WHERE sc.version='dev-dialogue-v1'
    AND (
      sc.event_id LIKE 'MS%'
      OR sc.event_id LIKE 'NPC_GUIDE_%'
      OR sc.event_id LIKE 'NPC_WORK_%'
      OR sc.event_id LIKE 'NPC_LULU_%'
      OR sc.event_id IN ('LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01')
    )
  GROUP BY sc.event_id, sc.choice_id
  HAVING COUNT(sce.effect_order) <> 1
);

-- Every choice has Primary Hidden and at most one Secondary Hidden.
SELECT 'choices_with_invalid_hidden_count' AS metric, COUNT(*) AS actual, 0 AS expected
FROM (
  SELECT sc.event_id, sc.choice_id
  FROM story_choices sc
  LEFT JOIN story_choice_effects sce
    ON sce.version=sc.version
   AND sce.event_id=sc.event_id
   AND sce.choice_id=sc.choice_id
   AND sce.effect_type='HIDDEN_STAT'
  WHERE sc.version='dev-dialogue-v1'
    AND (
      sc.event_id LIKE 'MS%'
      OR sc.event_id LIKE 'NPC_GUIDE_%'
      OR sc.event_id LIKE 'NPC_WORK_%'
      OR sc.event_id LIKE 'NPC_LULU_%'
      OR sc.event_id IN ('LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01')
    )
  GROUP BY sc.event_id, sc.choice_id
  HAVING COUNT(sce.effect_order) NOT IN (1,2)
);

-- Primary and Secondary must not target the same Hidden Stat.
SELECT 'choices_with_duplicate_hidden_target' AS metric, COUNT(*) AS actual, 0 AS expected
FROM (
  SELECT event_id, choice_id, target
  FROM story_choice_effects
  WHERE version='dev-dialogue-v1'
    AND effect_type='HIDDEN_STAT'
    AND (
      event_id LIKE 'MS%'
      OR event_id LIKE 'NPC_GUIDE_%'
      OR event_id LIKE 'NPC_WORK_%'
      OR event_id LIKE 'NPC_LULU_%'
      OR event_id IN ('LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01')
    )
  GROUP BY event_id, choice_id, target
  HAVING COUNT(*) > 1
);

-- Domain target validation.
SELECT 'invalid_visible_targets' AS metric, COUNT(*) AS actual, 0 AS expected
FROM story_choice_effects
WHERE version='dev-dialogue-v1'
  AND effect_type='VISIBLE_STAT'
  AND target NOT IN ('knowledge','expression','skill','exploration','magic');

SELECT 'invalid_hidden_targets' AS metric, COUNT(*) AS actual, 0 AS expected
FROM story_choice_effects
WHERE version='dev-dialogue-v1'
  AND effect_type='HIDDEN_STAT'
  AND target NOT IN (
    'empathy','responsibility','curiosity','courage',
    'cooperation','independence','caution','honesty'
  );

-- Options in the same choice group must have the same Visible total.
SELECT 'choice_groups_with_unequal_visible_total' AS metric, COUNT(*) AS actual, 0 AS expected
FROM (
  SELECT event_id, choice_group_id
  FROM (
    SELECT sc.event_id,
           sc.choice_group_id,
           sc.choice_id,
           SUM(CASE WHEN sce.effect_type='VISIBLE_STAT' THEN CAST(sce.value_json AS INTEGER) ELSE 0 END) AS visible_total
    FROM story_choices sc
    JOIN story_choice_effects sce
      ON sce.version=sc.version
     AND sce.event_id=sc.event_id
     AND sce.choice_id=sc.choice_id
    WHERE sc.version='dev-dialogue-v1'
      AND sc.choice_group_id IS NOT NULL
      AND (
        sc.event_id LIKE 'MS%'
        OR sc.event_id LIKE 'NPC_GUIDE_%'
        OR sc.event_id LIKE 'NPC_WORK_%'
        OR sc.event_id LIKE 'NPC_LULU_%'
        OR sc.event_id IN ('LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01')
      )
    GROUP BY sc.event_id, sc.choice_group_id, sc.choice_id
  ) choice_totals
  GROUP BY event_id, choice_group_id
  HAVING MIN(visible_total) <> MAX(visible_total)
);

-- Options in the same choice group must have the same Hidden total.
SELECT 'choice_groups_with_unequal_hidden_total' AS metric, COUNT(*) AS actual, 0 AS expected
FROM (
  SELECT event_id, choice_group_id
  FROM (
    SELECT sc.event_id,
           sc.choice_group_id,
           sc.choice_id,
           SUM(CASE WHEN sce.effect_type='HIDDEN_STAT' THEN CAST(sce.value_json AS INTEGER) ELSE 0 END) AS hidden_total
    FROM story_choices sc
    JOIN story_choice_effects sce
      ON sce.version=sc.version
     AND sce.event_id=sc.event_id
     AND sce.choice_id=sc.choice_id
    WHERE sc.version='dev-dialogue-v1'
      AND sc.choice_group_id IS NOT NULL
      AND (
        sc.event_id LIKE 'MS%'
        OR sc.event_id LIKE 'NPC_GUIDE_%'
        OR sc.event_id LIKE 'NPC_WORK_%'
        OR sc.event_id LIKE 'NPC_LULU_%'
        OR sc.event_id IN ('LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01')
      )
    GROUP BY sc.event_id, sc.choice_group_id, sc.choice_id
  ) choice_totals
  GROUP BY event_id, choice_group_id
  HAVING MIN(hidden_total) <> MAX(hidden_total)
);

-- Hidden tag opportunity distribution across the 77 canonical options.
SELECT target AS hidden_stat, COUNT(*) AS tagged_choice_count
FROM story_choice_effects
WHERE version='dev-dialogue-v1'
  AND effect_type='HIDDEN_STAT'
  AND (
    event_id LIKE 'MS%'
    OR event_id LIKE 'NPC_GUIDE_%'
    OR event_id LIKE 'NPC_WORK_%'
    OR event_id LIKE 'NPC_LULU_%'
    OR event_id IN ('LOC_OBS_01','LOC_OBS_02','LOC_OBS_03','LOC_OBS_04','LOC_GH_01','LOC_LIB_01')
  )
GROUP BY target
ORDER BY target;

PRAGMA foreign_key_check;
