-- Pre-authored, character-specific dialogue for a story event/step.
-- Apply once after 001_initial.sql. Enable foreign_keys on every connection.
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;

-- The event is part of the story step identity used by dialogue_sequences.
CREATE UNIQUE INDEX ux_story_steps_dialogue_binding
    ON story_steps(version, story_id, step_no, event_id);

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
CREATE INDEX ix_dialogue_sequences_event_character
    ON dialogue_sequences(version, event_id, character_id);

CREATE TABLE dialogue_nodes (
    version TEXT NOT NULL,
    story_id TEXT NOT NULL,
    step_no INTEGER NOT NULL,
    character_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    node_kind TEXT NOT NULL CHECK (node_kind IN ('LINE', 'IMAGE', 'CHOICE', 'END')),
    speaker_kind TEXT CHECK (speaker_kind IS NULL OR speaker_kind IN ('PLAYER', 'NPC', 'NARRATOR')),
    speaker_ref TEXT,
    line_text TEXT,
    image_asset_ref TEXT,
    next_node_id TEXT,
    PRIMARY KEY (version, story_id, step_no, character_id, node_id),
    CHECK (node_kind != 'LINE' OR (speaker_kind IS NOT NULL AND line_text IS NOT NULL AND length(trim(line_text)) > 0 AND next_node_id IS NOT NULL)),
    CHECK (node_kind != 'IMAGE' OR (image_asset_ref IS NOT NULL AND length(trim(image_asset_ref)) > 0 AND next_node_id IS NOT NULL)),
    CHECK (node_kind NOT IN ('CHOICE', 'END') OR next_node_id IS NULL),
    CHECK (node_kind != 'END' OR (line_text IS NULL AND image_asset_ref IS NULL)),
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
CREATE INDEX ix_dialogue_options_order
    ON dialogue_options(version, story_id, step_no, character_id, choice_node_id, sort_order);

-- Aggregate authoring rules (32 eligible variants, at least one choice node
-- with two options, reachability, and image declarations) are checked before
-- activating a master-data version; they cannot be expressed as row CHECKs.
PRAGMA user_version = 2;
COMMIT;
