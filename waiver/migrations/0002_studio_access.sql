CREATE TABLE studio_access (
  link_hash TEXT PRIMARY KEY NOT NULL,
  issued INTEGER NOT NULL,
  session_hash TEXT UNIQUE,
  session_expires INTEGER
);
CREATE INDEX studio_access_issued ON studio_access(issued);
