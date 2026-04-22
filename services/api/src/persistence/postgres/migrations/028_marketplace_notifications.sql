CREATE TABLE IF NOT EXISTS marketplace_notifications (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  actor_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  related_opportunity_id TEXT NULL REFERENCES marketplace_opportunities(id) ON DELETE SET NULL,
  related_application_id TEXT NULL REFERENCES marketplace_applications(id) ON DELETE SET NULL,
  related_offer_id TEXT NULL REFERENCES marketplace_offers(id) ON DELETE SET NULL,
  related_job_id UUID NULL REFERENCES escrow_jobs(id) ON DELETE SET NULL,
  related_automation_run_id TEXT NULL REFERENCES marketplace_automation_runs(id) ON DELETE SET NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_notifications_user_idx
ON marketplace_notifications (user_id, updated_at_ms DESC);

CREATE INDEX IF NOT EXISTS marketplace_notifications_workspace_idx
ON marketplace_notifications (workspace_id, updated_at_ms DESC);
