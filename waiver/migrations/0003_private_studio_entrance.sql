CREATE TABLE studio_entrance (
  slot INTEGER PRIMARY KEY CHECK (slot = 1),
  token_hash TEXT NOT NULL UNIQUE
);
ALTER TABLE studio_access ADD COLUMN entrance_hash TEXT
  REFERENCES studio_entrance(token_hash) ON DELETE CASCADE;
CREATE INDEX studio_access_entrance ON studio_access(entrance_hash);
