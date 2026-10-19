-- Additive v4 content extension. Existing game and player rows are preserved.
CREATE TABLE IF NOT EXISTS pet_dialogues (
    version TEXT NOT NULL,
    pet_id TEXT NOT NULL,
    line_no INTEGER NOT NULL CHECK (line_no BETWEEN 1 AND 20),
    line_text TEXT NOT NULL CHECK (length(line_text) BETWEEN 1 AND 200),
    PRIMARY KEY (version, pet_id, line_no),
    FOREIGN KEY (version, pet_id) REFERENCES pets(version, pet_id) ON DELETE CASCADE
) WITHOUT ROWID;
