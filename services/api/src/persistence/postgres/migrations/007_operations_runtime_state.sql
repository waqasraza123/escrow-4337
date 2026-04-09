CREATE TABLE IF NOT EXISTS operations_runtime_state (
  state_key TEXT PRIMARY KEY,
  snapshot_json JSONB NOT NULL,
  updated_at_ms BIGINT NOT NULL
);
