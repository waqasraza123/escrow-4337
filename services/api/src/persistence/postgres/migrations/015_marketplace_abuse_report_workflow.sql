ALTER TABLE marketplace_abuse_reports
  ADD COLUMN IF NOT EXISTS subject_moderation_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS subject_moderated_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject_moderated_at_ms BIGINT NULL;
