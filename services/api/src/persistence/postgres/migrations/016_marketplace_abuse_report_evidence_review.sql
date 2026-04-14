ALTER TABLE marketplace_abuse_reports
  ADD COLUMN IF NOT EXISTS evidence_review_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS investigation_summary TEXT NULL,
  ADD COLUMN IF NOT EXISTS evidence_reviewed_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evidence_reviewed_at_ms BIGINT NULL;
