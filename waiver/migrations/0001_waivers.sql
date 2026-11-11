CREATE TABLE invitations (
  token_hash TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, kind TEXT NOT NULL,
  expires INTEGER NOT NULL, email_hash TEXT, used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE signed_forms (
  id TEXT PRIMARY KEY REFERENCES invitations(id), received INTEGER NOT NULL,
  digest TEXT NOT NULL, details BLOB NOT NULL, pdf BLOB NOT NULL
);
CREATE INDEX signed_forms_time ON signed_forms(received, id);
CREATE TABLE mail_jobs (
  id TEXT PRIMARY KEY, waiver_id TEXT NOT NULL REFERENCES invitations(id),
  kind TEXT NOT NULL, destination BLOB NOT NULL, due INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, sent INTEGER, error TEXT
);
CREATE INDEX mail_due ON mail_jobs(sent,due);
CREATE TRIGGER lock_signed_invitation AFTER INSERT ON signed_forms BEGIN
  UPDATE invitations SET used=1 WHERE id=NEW.id;
END;
