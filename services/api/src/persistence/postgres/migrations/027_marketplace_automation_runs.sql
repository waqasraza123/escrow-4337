CREATE TABLE IF NOT EXISTS marketplace_automation_runs (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL REFERENCES marketplace_automation_rules(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  schedule TEXT NOT NULL,
  trigger TEXT NOT NULL,
  rule_label TEXT NOT NULL,
  matched_task_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT NOT NULL,
  created_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_automation_runs_workspace_idx
ON marketplace_automation_runs (workspace_id, created_at_ms DESC);

CREATE INDEX IF NOT EXISTS marketplace_automation_runs_rule_idx
ON marketplace_automation_runs (rule_id, created_at_ms DESC);
