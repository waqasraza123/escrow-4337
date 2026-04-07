ALTER TABLE escrow_jobs
  ADD COLUMN IF NOT EXISTS operations_json JSONB NOT NULL DEFAULT '{}'::jsonb;
