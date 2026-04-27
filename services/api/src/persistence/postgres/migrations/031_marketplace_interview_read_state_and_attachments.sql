ALTER TABLE marketplace_interview_threads
  ADD COLUMN IF NOT EXISTS last_read_by_client_at BIGINT NULL;

ALTER TABLE marketplace_interview_threads
  ADD COLUMN IF NOT EXISTS last_read_by_applicant_at BIGINT NULL;

ALTER TABLE marketplace_interview_messages
  ADD COLUMN IF NOT EXISTS attachments_json JSONB NOT NULL DEFAULT '[]'::jsonb;
