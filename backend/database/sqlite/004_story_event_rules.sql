-- LUMIA common story-event eligibility schema, version 4.
-- Apply once after 003_dialogue_runtime_content.sql.
-- Adds shared occurrence/eligibility metadata for Main/NPC/Location Story
-- without duplicating dialogue tables per story type.
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;

-- Dynamic storyCast roles need to distinguish hard uniqueness from soft
-- "prefer another student" behavior. Existing Main dynamic roles are strict.
ALTER TABLE story_roles ADD COLUMN prior_assignment_policy TEXT NOT NULL DEFAULT 'ALLOW'
    CHECK (prior_assignment_policy IN ('ALLOW', 'PREFER_DISTINCT', 'REQUIRE_DISTINCT'));

UPDATE story_roles
SET prior_assignment_policy = 'REQUIRE_DISTINCT'
WHERE resolver_type = 'STORY_CAST'
  AND role_scope = 'MAIN';

-- Explicit hard role-to-role exclusions. Example:
-- LOC_GREENHOUSE_STUDENT must never equal MAIN_GREENHOUSE_STUDENT even when
-- other previously assigned Main roles may be reused as a fallback.
CREATE TABLE story_role_exclusions (
    version TEXT NOT NULL,
    role_id TEXT NOT NULL,
    excluded_role_id TEXT NOT NULL,
    exclusion_type TEXT NOT NULL DEFAULT 'DISTINCT_CHARACTER'
        CHECK (exclusion_type IN ('DISTINCT_CHARACTER')),
    PRIMARY KEY (version, role_id, excluded_role_id),
    CHECK (role_id <> excluded_role_id),
    FOREIGN KEY (version, role_id)
        REFERENCES story_roles(version, role_id) ON DELETE CASCADE,
    FOREIGN KEY (version, excluded_role_id)
        REFERENCES story_roles(version, role_id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX ix_story_role_exclusions_reverse
    ON story_role_exclusions(version, excluded_role_id, role_id);

-- Per-event occurrence policy. Dynamic limits such as "NPC+Location Story max
-- 2 per week / 1 result-bearing story per day" remain server rules keyed by
-- limit_group rather than being duplicated as mutable counters in master data.
CREATE TABLE story_event_rules (
    version TEXT NOT NULL,
    event_id TEXT NOT NULL,
    trigger_phase TEXT NOT NULL
        CHECK (trigger_phase IN ('FIXED_DATE', 'AFTER_ACTIVITY', 'WEEKEND', 'MANUAL')),
    selection_policy TEXT NOT NULL
        CHECK (selection_policy IN ('FIXED', 'UNSEEN_FIRST', 'WEIGHTED')),
    repeat_policy TEXT NOT NULL DEFAULT 'ONCE_PER_RUN'
        CHECK (repeat_policy IN ('ONCE_PER_RUN', 'REPEATABLE')),
    requires_location_match INTEGER NOT NULL DEFAULT 0
        CHECK (requires_location_match IN (0, 1)),
    limit_group TEXT,
    cooldown_weeks INTEGER NOT NULL DEFAULT 0 CHECK (cooldown_weeks >= 0),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    PRIMARY KEY (version, event_id),
    FOREIGN KEY (version, event_id)
        REFERENCES story_events(version, event_id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX ix_story_event_rules_candidate
    ON story_event_rules(version, is_active, trigger_phase, selection_policy, limit_group);

-- Optional normalized event conditions for rules that cannot be expressed by
-- story_steps.earliest_week, the story's location_id, or sequential step order.
-- The server owns interpretation and validates subject_ref/value_json by type.
CREATE TABLE story_event_conditions (
    version TEXT NOT NULL,
    event_id TEXT NOT NULL,
    condition_order INTEGER NOT NULL CHECK (condition_order >= 1),
    condition_type TEXT NOT NULL CHECK (condition_type IN (
        'PREVIOUS_EVENT_COMPLETE',
        'LOCATION_ID',
        'ACTIVITY_TYPE',
        'NPC_ENCOUNTER_GTE',
        'STORY_STATUS',
        'EVENT_FLAG',
        'MAIN_PROGRESS',
        'CUSTOM'
    )),
    subject_ref TEXT,
    operator TEXT NOT NULL DEFAULT 'EQ'
        CHECK (operator IN ('EQ', 'NE', 'GTE', 'LTE', 'IN', 'NOT_IN')),
    value_json TEXT NOT NULL CHECK (json_valid(value_json)),
    PRIMARY KEY (version, event_id, condition_order),
    FOREIGN KEY (version, event_id)
        REFERENCES story_events(version, event_id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX ix_story_event_conditions_type
    ON story_event_conditions(version, condition_type, subject_ref);

PRAGMA user_version = 4;
COMMIT;
