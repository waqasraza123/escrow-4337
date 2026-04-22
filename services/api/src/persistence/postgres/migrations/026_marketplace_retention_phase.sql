CREATE TABLE IF NOT EXISTS marketplace_talent_pools (
  id TEXT PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  label TEXT NOT NULL,
  focus_skills_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  note TEXT NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_talent_pools_workspace_idx
ON marketplace_talent_pools (workspace_id, updated_at_ms DESC);

CREATE TABLE IF NOT EXISTS marketplace_talent_pool_members (
  id TEXT PRIMARY KEY,
  pool_id TEXT NOT NULL REFERENCES marketplace_talent_pools(id) ON DELETE CASCADE,
  profile_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_slug TEXT NOT NULL,
  added_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  note TEXT NULL,
  source_opportunity_id TEXT NULL REFERENCES marketplace_opportunities(id) ON DELETE SET NULL,
  source_application_id TEXT NULL REFERENCES marketplace_applications(id) ON DELETE SET NULL,
  source_job_id UUID NULL REFERENCES escrow_jobs(id) ON DELETE SET NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS marketplace_talent_pool_members_pool_profile_uidx
ON marketplace_talent_pool_members (pool_id, profile_user_id);

CREATE INDEX IF NOT EXISTS marketplace_talent_pool_members_stage_idx
ON marketplace_talent_pool_members (pool_id, stage, updated_at_ms DESC);

CREATE TABLE IF NOT EXISTS marketplace_automation_rules (
  id TEXT PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  target_id TEXT NULL,
  schedule TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_automation_rules_workspace_idx
ON marketplace_automation_rules (workspace_id, updated_at_ms DESC);
