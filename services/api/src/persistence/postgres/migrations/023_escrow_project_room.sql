ALTER TABLE escrow_jobs
  ADD COLUMN IF NOT EXISTS project_room_json JSONB NOT NULL DEFAULT '{"submissions":[],"messages":[],"activity":[]}'::jsonb;
