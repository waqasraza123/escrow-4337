CREATE TABLE IF NOT EXISTS marketplace_abuse_reports (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  evidence_urls_json JSONB NOT NULL,
  status TEXT NOT NULL,
  resolution_note TEXT,
  resolved_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_abuse_reports_status_updated_idx
ON marketplace_abuse_reports (status, updated_at_ms DESC);

CREATE INDEX IF NOT EXISTS marketplace_abuse_reports_subject_idx
ON marketplace_abuse_reports (subject_type, subject_id, updated_at_ms DESC);
