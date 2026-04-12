ALTER TABLE escrow_onchain_projections
  DROP CONSTRAINT IF EXISTS escrow_onchain_projections_job_id_fkey;

ALTER TABLE escrow_onchain_projections
  ALTER COLUMN job_id TYPE UUID
  USING job_id::uuid;

ALTER TABLE escrow_onchain_projections
  ADD CONSTRAINT escrow_onchain_projections_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES escrow_jobs(id) ON DELETE CASCADE;
