-- LUMIA dialogue/runtime content schema, version 3.
-- Apply once after 001_initial.sql and 002_dialogue_sequences.sql.
-- This migration keeps the normalized graph model and adds the fields required
-- by the final Main/NPC/Location Dialogue API contract.
PRAGMA foreign_keys = OFF;
BEGIN IMMEDIATE;

-- Story scheduling/eligibility metadata shared by Main/NPC/Location.
ALTER TABLE story_steps ADD COLUMN scheduled_month INTEGER
    CHECK (scheduled_month IS NULL OR scheduled_month BETWEEN 1 AND 12);
ALTER TABLE story_steps ADD COLUMN scheduled_day INTEGER
    CHECK (scheduled_day IS NULL OR scheduled_day BETWEEN 1 AND 31);
ALTER TABLE story_steps ADD COLUMN availability_rule_ref TEXT;

-- Stable choice metadata. Important choices are candidates for representative
-- memory/ending-letter records; this does not change the choice reward itself.
ALTER TABLE story_choices ADD COLUMN is_important INTEGER NOT NULL DEFAULT 0
    CHECK (is_important IN (0, 1));
ALTER TABLE story_choices ADD COLUMN choice_group_id TEXT;

-- Non-playable/text-only speakers are separate from the 32 playable characters.
-- Future NPC/Location content can add LULU/SERIN/etc. without changing the
-- dialogue node schema. A null portrait is a valid text-only speaker.
CREATE TABLE dialogue_speakers (
    version TEXT NOT NULL,
    speaker_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    speaker_type TEXT NOT NULL CHECK (speaker_type IN ('NPC', 'CREATURE', 'TEXT_ONLY')),
    portrait_asset_ref TEXT,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    PRIMARY KEY (version, speaker_id),
    FOREIGN KEY (version) REFERENCES game_data_versions(version) ON DELETE CASCADE
) WITHOUT ROWID;

-- ROLE:* references are resolved by the server. Dynamic student roles use
-- STORY_CAST and a priority-ordered candidate table; fixed roles point to a
-- CHARACTER:* or NPC:* reference. This also gives Location/NPC stories a common
-- role representation when they are authored later.
CREATE TABLE story_roles (
    version TEXT NOT NULL,
    role_id TEXT NOT NULL,
    role_scope TEXT NOT NULL CHECK (role_scope IN ('MAIN', 'NPC', 'LOCATION', 'GLOBAL')),
    resolver_type TEXT NOT NULL CHECK (resolver_type IN ('STORY_CAST', 'FIXED_CHARACTER', 'FIXED_SPEAKER')),
    fixed_ref TEXT,
    exclude_player INTEGER NOT NULL DEFAULT 1 CHECK (exclude_player IN (0, 1)),
    assignment_order INTEGER NOT NULL DEFAULT 0 CHECK (assignment_order >= 0),
    description TEXT,
    PRIMARY KEY (version, role_id),
    CHECK (
        (resolver_type = 'STORY_CAST' AND fixed_ref IS NULL)
        OR (resolver_type = 'FIXED_CHARACTER' AND fixed_ref LIKE 'CHARACTER:%')
        OR (resolver_type = 'FIXED_SPEAKER' AND fixed_ref LIKE 'NPC:%')
    ),
    FOREIGN KEY (version) REFERENCES game_data_versions(version) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE UNIQUE INDEX ux_story_roles_assignment_order
    ON story_roles(version, assignment_order)
    WHERE assignment_order > 0;

CREATE TABLE story_role_candidates (
    version TEXT NOT NULL,
    role_id TEXT NOT NULL,
    priority INTEGER NOT NULL CHECK (priority >= 1),
    character_id TEXT NOT NULL,
    PRIMARY KEY (version, role_id, priority),
    UNIQUE (version, role_id, character_id),
    FOREIGN KEY (version, role_id)
        REFERENCES story_roles(version, role_id) ON DELETE CASCADE,
    FOREIGN KEY (version, character_id)
        REFERENCES characters(version, character_id)
) WITHOUT ROWID;
CREATE INDEX ix_story_role_candidates_character
    ON story_role_candidates(version, character_id, role_id);

-- Rebuild the v2 dialogue tables so LINE/IMAGE/CHOICE can store the final API
-- semantics directly. The old tables are copied forward if they already contain
-- rows. PRAGMA foreign_keys is intentionally disabled for this table rebuild.
ALTER TABLE dialogue_options RENAME TO dialogue_options_v2;
ALTER TABLE dialogue_nodes RENAME TO dialogue_nodes_v2;
ALTER TABLE dialogue_sequences RENAME TO dialogue_sequences_v2;

CREATE TABLE dialogue_sequences (
    version TEXT NOT NULL,
    story_id TEXT NOT NULL,
    step_no INTEGER NOT NULL,
    event_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    entry_node_id TEXT NOT NULL,
    PRIMARY KEY (version, story_id, step_no, character_id),
    FOREIGN KEY (version, story_id, step_no, event_id)
        REFERENCES story_steps(version, story_id, step_no, event_id) ON DELETE CASCADE,
    FOREIGN KEY (version, character_id)
        REFERENCES characters(version, character_id),
    FOREIGN KEY (version, story_id, step_no, character_id, entry_node_id)
        REFERENCES dialogue_nodes(version, story_id, step_no, character_id, node_id)
        DEFERRABLE INITIALLY DEFERRED
) WITHOUT ROWID;

CREATE TABLE dialogue_nodes (
    version TEXT NOT NULL,
    story_id TEXT NOT NULL,
    step_no INTEGER NOT NULL,
    character_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    node_kind TEXT NOT NULL CHECK (node_kind IN ('LINE', 'IMAGE', 'CHOICE', 'END')),

    -- LINE fields.
    line_mode TEXT CHECK (line_mode IS NULL OR line_mode IN ('DIALOGUE', 'NARRATION', 'THOUGHT', 'CONTEXT')),
    speaker_kind TEXT CHECK (speaker_kind IS NULL OR speaker_kind IN ('PLAYER', 'NPC', 'NARRATOR')),
    speaker_ref TEXT,
    line_text TEXT,
    visual_mode TEXT CHECK (visual_mode IS NULL OR visual_mode IN ('SPEAKER', 'KEEP', 'NONE')),

    -- IMAGE fields.
    image_target TEXT CHECK (image_target IS NULL OR image_target IN ('BACKGROUND', 'FOCUS')),
    image_action TEXT CHECK (image_action IS NULL OR image_action IN ('SHOW', 'REPLACE', 'HIDE')),
    image_asset_type TEXT CHECK (image_asset_type IS NULL OR image_asset_type IN ('CHARACTER', 'ITEM', 'SCENE', 'EFFECT')),
    image_asset_ref TEXT,
    image_alt TEXT,

    -- CHOICE authoring metadata. choice_group_id is the semantic authoring key
    -- such as MS05_S4_RECONNECT; node_id remains the stable graph node key.
    choice_group_id TEXT,
    choice_prompt TEXT,

    next_node_id TEXT,
    PRIMARY KEY (version, story_id, step_no, character_id, node_id),

    CHECK (
        node_kind != 'LINE' OR (
            line_mode IS NOT NULL
            AND speaker_kind IS NOT NULL
            AND line_text IS NOT NULL
            AND length(trim(line_text)) > 0
            AND visual_mode IS NOT NULL
            AND next_node_id IS NOT NULL
        )
    ),
    CHECK (
        node_kind != 'IMAGE' OR (
            image_target IS NOT NULL
            AND image_action IS NOT NULL
            AND image_asset_type IS NOT NULL
            AND (image_action = 'HIDE' OR (image_asset_ref IS NOT NULL AND length(trim(image_asset_ref)) > 0))
            AND next_node_id IS NOT NULL
        )
    ),
    CHECK (
        node_kind != 'CHOICE' OR (
            choice_group_id IS NOT NULL
            AND length(trim(choice_group_id)) > 0
            AND next_node_id IS NULL
        )
    ),
    CHECK (node_kind != 'END' OR (
        line_mode IS NULL
        AND speaker_kind IS NULL
        AND speaker_ref IS NULL
        AND line_text IS NULL
        AND image_target IS NULL
        AND image_action IS NULL
        AND image_asset_type IS NULL
        AND image_asset_ref IS NULL
        AND choice_group_id IS NULL
        AND next_node_id IS NULL
    )),
    CHECK (speaker_kind IS NOT 'NPC' OR (speaker_ref IS NOT NULL AND length(trim(speaker_ref)) > 0)),

    FOREIGN KEY (version, story_id, step_no, character_id)
        REFERENCES dialogue_sequences(version, story_id, step_no, character_id) ON DELETE CASCADE,
    FOREIGN KEY (version, story_id, step_no, character_id, next_node_id)
        REFERENCES dialogue_nodes(version, story_id, step_no, character_id, node_id)
        DEFERRABLE INITIALLY DEFERRED
) WITHOUT ROWID;

CREATE TABLE dialogue_options (
    version TEXT NOT NULL,
    story_id TEXT NOT NULL,
    step_no INTEGER NOT NULL,
    character_id TEXT NOT NULL,
    choice_node_id TEXT NOT NULL,
    choice_id TEXT NOT NULL,
    choice_text TEXT NOT NULL CHECK (length(trim(choice_text)) > 0),
    response_node_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    PRIMARY KEY (version, story_id, step_no, character_id, choice_node_id, choice_id),
    FOREIGN KEY (version, story_id, step_no, character_id, choice_node_id)
        REFERENCES dialogue_nodes(version, story_id, step_no, character_id, node_id) ON DELETE CASCADE,
    FOREIGN KEY (version, story_id, step_no, character_id, response_node_id)
        REFERENCES dialogue_nodes(version, story_id, step_no, character_id, node_id)
        DEFERRABLE INITIALLY DEFERRED
) WITHOUT ROWID;

-- Preserve any existing v2 rows. Legacy rows did not store line/image modes, so
-- conservative defaults are assigned. Newly seeded v3 content always writes the
-- explicit values from the approved dialogue documents.
INSERT INTO dialogue_sequences(version, story_id, step_no, event_id, character_id, entry_node_id)
SELECT version, story_id, step_no, event_id, character_id, entry_node_id
FROM dialogue_sequences_v2;

INSERT INTO dialogue_nodes(
    version, story_id, step_no, character_id, node_id, node_kind,
    line_mode, speaker_kind, speaker_ref, line_text, visual_mode,
    image_target, image_action, image_asset_type, image_asset_ref, image_alt,
    choice_group_id, choice_prompt, next_node_id
)
SELECT
    version, story_id, step_no, character_id, node_id, node_kind,
    CASE
        WHEN node_kind = 'LINE' AND speaker_kind = 'NARRATOR' THEN 'NARRATION'
        WHEN node_kind = 'LINE' THEN 'DIALOGUE'
        ELSE NULL
    END,
    speaker_kind,
    speaker_ref,
    line_text,
    CASE
        WHEN node_kind = 'LINE' AND speaker_kind = 'NPC' THEN 'SPEAKER'
        WHEN node_kind = 'LINE' THEN 'NONE'
        ELSE NULL
    END,
    CASE WHEN node_kind = 'IMAGE' THEN 'FOCUS' ELSE NULL END,
    CASE WHEN node_kind = 'IMAGE' THEN 'SHOW' ELSE NULL END,
    CASE WHEN node_kind = 'IMAGE' THEN 'SCENE' ELSE NULL END,
    image_asset_ref,
    NULL,
    CASE WHEN node_kind = 'CHOICE' THEN node_id ELSE NULL END,
    NULL,
    next_node_id
FROM dialogue_nodes_v2;

INSERT INTO dialogue_options(
    version, story_id, step_no, character_id,
    choice_node_id, choice_id, choice_text, response_node_id, sort_order
)
SELECT
    version, story_id, step_no, character_id,
    choice_node_id, choice_id, choice_text, response_node_id, sort_order
FROM dialogue_options_v2;

DROP TABLE dialogue_options_v2;
DROP TABLE dialogue_nodes_v2;
DROP TABLE dialogue_sequences_v2;

CREATE INDEX ix_dialogue_sequences_event_character
    ON dialogue_sequences(version, event_id, character_id);
CREATE INDEX ix_dialogue_options_order
    ON dialogue_options(version, story_id, step_no, character_id, choice_node_id, sort_order);
CREATE INDEX ix_dialogue_nodes_kind
    ON dialogue_nodes(version, story_id, step_no, character_id, node_kind);

-- Choice rewards are server-authoritative master data. The engine never receives
-- these rows. value_json supports integer stat deltas and future boolean/string
-- flags without mixing reward data into dialogue text.
CREATE TABLE story_choice_effects (
    version TEXT NOT NULL,
    event_id TEXT NOT NULL,
    choice_id TEXT NOT NULL,
    effect_order INTEGER NOT NULL CHECK (effect_order >= 1),
    effect_type TEXT NOT NULL CHECK (effect_type IN ('VISIBLE_STAT', 'HIDDEN_STAT', 'EVENT_FLAG', 'COUNTER')),
    target TEXT NOT NULL CHECK (length(trim(target)) > 0),
    value_json TEXT NOT NULL CHECK (json_valid(value_json)),
    PRIMARY KEY (version, event_id, choice_id, effect_order),
    FOREIGN KEY (version, event_id, choice_id)
        REFERENCES story_choices(version, event_id, choice_id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX ix_story_choice_effects_lookup
    ON story_choice_effects(version, event_id, choice_id, effect_order);

-- Event-level effects are separated from choice rewards so progression-critical
-- state can still be applied when a dialogue is legitimately SKIPped.
CREATE TABLE story_event_effects (
    version TEXT NOT NULL,
    event_id TEXT NOT NULL,
    effect_order INTEGER NOT NULL CHECK (effect_order >= 1),
    apply_on TEXT NOT NULL CHECK (apply_on IN ('COMPLETE_ONLY', 'COMPLETE_OR_SKIP')),
    effect_type TEXT NOT NULL CHECK (effect_type IN ('STORY_PROGRESS', 'EVENT_FLAG', 'COUNTER')),
    target TEXT NOT NULL CHECK (length(trim(target)) > 0),
    value_json TEXT NOT NULL CHECK (json_valid(value_json)),
    PRIMARY KEY (version, event_id, effect_order),
    FOREIGN KEY (version, event_id)
        REFERENCES story_events(version, event_id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX ix_story_event_effects_lookup
    ON story_event_effects(version, event_id, effect_order);

PRAGMA user_version = 3;
COMMIT;
PRAGMA foreign_keys = ON;
