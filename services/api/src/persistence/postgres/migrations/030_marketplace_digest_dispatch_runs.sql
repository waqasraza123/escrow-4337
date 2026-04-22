CREATE TABLE IF NOT EXISTS marketplace_digest_dispatch_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  triggered_by_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  mode TEXT NOT NULL,
  summary TEXT NOT NULL,
  recipients_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_digest_dispatch_runs_workspace_idx
  ON marketplace_digest_dispatch_runs (workspace_id, created_at_ms DESC);

CREATE INDEX IF NOT EXISTS marketplace_digest_dispatch_runs_triggered_by_idx
  ON marketplace_digest_dispatch_runs (triggered_by_user_id, created_at_ms DESC);

ALTER TABLE marketplace_digests
  ADD COLUMN IF NOT EXISTS dispatch_run_id TEXT REFERENCES marketplace_digest_dispatch_runs (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS marketplace_digests_dispatch_run_idx
  ON marketplace_digests (dispatch_run_id);
