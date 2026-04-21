CREATE TABLE IF NOT EXISTS marketplace_contract_drafts (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES marketplace_applications(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES marketplace_opportunities(id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL REFERENCES marketplace_offers(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  applicant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  latest_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_hash TEXT NOT NULL,
  revisions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_approved_at_ms BIGINT NULL,
  applicant_approved_at_ms BIGINT NULL,
  finalized_at_ms BIGINT NULL,
  converted_job_id TEXT NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS marketplace_contract_drafts_application_idx
ON marketplace_contract_drafts (application_id);

CREATE INDEX IF NOT EXISTS marketplace_contract_drafts_status_idx
ON marketplace_contract_drafts (status, updated_at_ms DESC);
