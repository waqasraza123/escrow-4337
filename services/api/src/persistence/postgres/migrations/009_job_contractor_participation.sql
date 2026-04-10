ALTER TABLE escrow_jobs
ADD COLUMN IF NOT EXISTS contractor_participation_json JSONB NULL;
