-- LUMIA player-local SQLite schema, version 1.
-- Run on a new local database. Enable foreign_keys on EVERY connection.
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;

CREATE TABLE game_data_versions (
    version TEXT NOT NULL PRIMARY KEY,
    installed_at_utc TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1))
);
CREATE UNIQUE INDEX ux_game_data_versions_one_active
    ON game_data_versions(is_active) WHERE is_active = 1;

CREATE TABLE characters (
    version TEXT NOT NULL,
    character_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    portrait_asset_ref TEXT,
    full_body_asset_ref TEXT,
    is_initially_unlocked INTEGER NOT NULL DEFAULT 0 CHECK (is_initially_unlocked IN (0, 1)),
    knowledge_modifier INTEGER NOT NULL DEFAULT 0 CHECK (knowledge_modifier BETWEEN -10 AND 10),
    expression_modifier INTEGER NOT NULL DEFAULT 0 CHECK (expression_modifier BETWEEN -10 AND 10),
    skill_modifier INTEGER NOT NULL DEFAULT 0 CHECK (skill_modifier BETWEEN -10 AND 10),
    exploration_modifier INTEGER NOT NULL DEFAULT 0 CHECK (exploration_modifier BETWEEN -10 AND 10),
    magic_modifier INTEGER NOT NULL DEFAULT 0 CHECK (magic_modifier BETWEEN -10 AND 10),
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    PRIMARY KEY (version, character_id),
    FOREIGN KEY (version) REFERENCES game_data_versions(version) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE TABLE pets (
    version TEXT NOT NULL,
    pet_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    asset_ref TEXT,
    is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    knowledge_modifier INTEGER NOT NULL DEFAULT 0 CHECK (knowledge_modifier BETWEEN 0 AND 10),
    expression_modifier INTEGER NOT NULL DEFAULT 0 CHECK (expression_modifier BETWEEN 0 AND 10),
    skill_modifier INTEGER NOT NULL DEFAULT 0 CHECK (skill_modifier BETWEEN 0 AND 10),
    exploration_modifier INTEGER NOT NULL DEFAULT 0 CHECK (exploration_modifier BETWEEN 0 AND 10),
    magic_modifier INTEGER NOT NULL DEFAULT 0 CHECK (magic_modifier BETWEEN 0 AND 10),
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    PRIMARY KEY (version, pet_id),
    FOREIGN KEY (version) REFERENCES game_data_versions(version) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE UNIQUE INDEX ux_pets_one_default_per_version
    ON pets(version) WHERE is_default = 1;

CREATE TABLE locations (
    version TEXT NOT NULL,
    location_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    background_asset_ref TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    PRIMARY KEY (version, location_id),
    FOREIGN KEY (version) REFERENCES game_data_versions(version) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE TABLE activities (
    version TEXT NOT NULL,
    activity_id TEXT NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('CLASS', 'ADVENTURE', 'REST', 'SPECIAL')),
    display_name TEXT NOT NULL,
    description TEXT,
    location_id TEXT,
    stamina_cost INTEGER NOT NULL DEFAULT 0 CHECK (stamina_cost BETWEEN 0 AND 100),
    target_stat TEXT CHECK (target_stat IS NULL OR target_stat IN ('knowledge', 'expression', 'skill', 'exploration', 'magic')),
    content_ref TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    PRIMARY KEY (version, activity_id),
    FOREIGN KEY (version) REFERENCES game_data_versions(version) ON DELETE CASCADE,
    FOREIGN KEY (version, location_id) REFERENCES locations(version, location_id)
) WITHOUT ROWID;
CREATE INDEX ix_activities_type_location ON activities(version, activity_type, location_id);

CREATE TABLE minigames (
    version TEXT NOT NULL,
    game_id TEXT NOT NULL,
    activity_id TEXT,
    display_name TEXT NOT NULL,
    target_stat TEXT NOT NULL CHECK (target_stat IN ('knowledge', 'expression', 'skill', 'exploration', 'magic')),
    scene_ref TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    PRIMARY KEY (version, game_id),
    FOREIGN KEY (version) REFERENCES game_data_versions(version) ON DELETE CASCADE,
    FOREIGN KEY (version, activity_id) REFERENCES activities(version, activity_id)
) WITHOUT ROWID;
CREATE INDEX ix_minigames_activity ON minigames(version, activity_id);

CREATE TABLE stories (
    version TEXT NOT NULL,
    story_id TEXT NOT NULL,
    story_type TEXT NOT NULL CHECK (story_type IN ('MAIN', 'NPC', 'LOCATION')),
    display_name TEXT NOT NULL,
    npc_id TEXT,
    location_id TEXT,
    content_ref TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    PRIMARY KEY (version, story_id),
    FOREIGN KEY (version) REFERENCES game_data_versions(version) ON DELETE CASCADE,
    FOREIGN KEY (version, location_id) REFERENCES locations(version, location_id)
) WITHOUT ROWID;
CREATE INDEX ix_stories_type_location ON stories(version, story_type, location_id);

CREATE TABLE story_events (
    version TEXT NOT NULL,
    event_id TEXT NOT NULL,
    story_id TEXT NOT NULL,
    display_name TEXT,
    scene_ref TEXT,
    content_ref TEXT,
    PRIMARY KEY (version, event_id),
    UNIQUE (version, story_id, event_id),
    FOREIGN KEY (version, story_id) REFERENCES stories(version, story_id) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE TABLE story_steps (
    version TEXT NOT NULL,
    story_id TEXT NOT NULL,
    step_no INTEGER NOT NULL CHECK (step_no >= 1),
    event_id TEXT NOT NULL,
    earliest_week INTEGER CHECK (earliest_week IS NULL OR earliest_week BETWEEN 1 AND 52),
    display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    PRIMARY KEY (version, story_id, step_no),
    FOREIGN KEY (version, story_id) REFERENCES stories(version, story_id) ON DELETE CASCADE,
    FOREIGN KEY (version, story_id, event_id) REFERENCES story_events(version, story_id, event_id)
) WITHOUT ROWID;
CREATE INDEX ix_story_steps_event ON story_steps(version, event_id);

CREATE TABLE story_choices (
    version TEXT NOT NULL,
    event_id TEXT NOT NULL,
    choice_id TEXT NOT NULL,
    choice_text TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    next_event_id TEXT,
    summary_text TEXT,
    PRIMARY KEY (version, event_id, choice_id),
    FOREIGN KEY (version, event_id) REFERENCES story_events(version, event_id) ON DELETE CASCADE,
    FOREIGN KEY (version, next_event_id) REFERENCES story_events(version, event_id)
) WITHOUT ROWID;
CREATE INDEX ix_story_choices_order ON story_choices(version, event_id, display_order);

CREATE TABLE endings (
    version TEXT NOT NULL,
    ending_id TEXT NOT NULL,
    ending_type TEXT NOT NULL CHECK (ending_type IN ('CAREER', 'FALLBACK')),
    display_name TEXT NOT NULL,
    subtitle TEXT,
    career_anchor TEXT,
    future_scene_guide TEXT,
    illustration_asset_ref TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    PRIMARY KEY (version, ending_id),
    FOREIGN KEY (version) REFERENCES game_data_versions(version) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX ix_endings_type_order ON endings(version, ending_type, sort_order);

CREATE TABLE collectibles (
    version TEXT NOT NULL,
    collectible_type TEXT NOT NULL CHECK (collectible_type IN ('BADGE', 'PUZZLE_PIECE', 'ROOM_BACKGROUND')),
    collectible_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    asset_ref TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    PRIMARY KEY (version, collectible_type, collectible_id),
    FOREIGN KEY (version) REFERENCES game_data_versions(version) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX ix_collectibles_order ON collectibles(version, collectible_type, sort_order);

CREATE TABLE unlock_conditions (
    version TEXT NOT NULL,
    condition_id TEXT NOT NULL,
    reward_timing TEXT NOT NULL CHECK (reward_timing IN ('IMMEDIATE', 'RUN_COMPLETE')),
    hint_text TEXT,
    server_rule_ref TEXT NOT NULL,
    PRIMARY KEY (version, condition_id),
    FOREIGN KEY (version) REFERENCES game_data_versions(version) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE TABLE unlock_rewards (
    version TEXT NOT NULL,
    condition_id TEXT NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('CHARACTER', 'PET', 'BADGE', 'PUZZLE_PIECE', 'ROOM_BACKGROUND', 'PERMANENT_BONUS')),
    reward_id TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 1 CHECK (amount BETWEEN 1 AND 15),
    PRIMARY KEY (version, condition_id, reward_type, reward_id),
    FOREIGN KEY (version, condition_id) REFERENCES unlock_conditions(version, condition_id) ON DELETE CASCADE
) WITHOUT ROWID;

-- Per-UID client data. These rows are caches or pending requests, not server authority.
CREATE TABLE local_run_cache (
    uid TEXT NOT NULL,
    slot_id INTEGER NOT NULL CHECK (slot_id BETWEEN 1 AND 5),
    server_revision TEXT NOT NULL,
    snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
    cached_at_utc TEXT NOT NULL,
    PRIMARY KEY (uid, slot_id)
) WITHOUT ROWID;

CREATE TABLE local_ui_state (
    uid TEXT NOT NULL,
    state_key TEXT NOT NULL,
    state_json TEXT NOT NULL CHECK (json_valid(state_json)),
    updated_at_utc TEXT NOT NULL,
    PRIMARY KEY (uid, state_key)
) WITHOUT ROWID;

CREATE TABLE pending_requests (
    uid TEXT NOT NULL,
    request_id TEXT NOT NULL,
    request_type TEXT NOT NULL,
    request_json TEXT NOT NULL CHECK (json_valid(request_json)),
    expected_server_revision TEXT,
    created_at_utc TEXT NOT NULL,
    last_attempt_at_utc TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    PRIMARY KEY (uid, request_id)
) WITHOUT ROWID;
CREATE INDEX ix_pending_requests_retry ON pending_requests(uid, created_at_utc);

CREATE TABLE local_activity_log (
    uid TEXT NOT NULL,
    local_event_id TEXT NOT NULL,
    run_id TEXT,
    slot_id INTEGER CHECK (slot_id IS NULL OR slot_id BETWEEN 1 AND 5),
    event_type TEXT NOT NULL,
    content_id TEXT,
    occurred_at_utc TEXT NOT NULL,
    summary_json TEXT NOT NULL CHECK (json_valid(summary_json)),
    server_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (server_confirmed IN (0, 1)),
    PRIMARY KEY (uid, local_event_id)
) WITHOUT ROWID;
CREATE INDEX ix_local_activity_recent ON local_activity_log(uid, occurred_at_utc DESC);

PRAGMA user_version = 1;
COMMIT;
