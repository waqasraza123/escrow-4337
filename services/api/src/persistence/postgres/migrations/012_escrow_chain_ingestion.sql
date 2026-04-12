CREATE TABLE IF NOT EXISTS escrow_chain_cursors (
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  stream_name TEXT NOT NULL,
  next_from_block BIGINT NOT NULL,
  last_finalized_block BIGINT NULL,
  last_scanned_block BIGINT NULL,
  last_error TEXT NULL,
  updated_at_ms BIGINT NOT NULL,
  PRIMARY KEY (chain_id, contract_address, stream_name)
);

CREATE TABLE IF NOT EXISTS escrow_chain_events (
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  escrow_id TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  block_number BIGINT NOT NULL,
  block_hash TEXT NOT NULL,
  block_time_ms BIGINT NOT NULL,
  event_name TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  PRIMARY KEY (chain_id, contract_address, transaction_hash, log_index)
);

CREATE INDEX IF NOT EXISTS escrow_chain_events_contract_block_idx
  ON escrow_chain_events (chain_id, contract_address, block_number, log_index);

CREATE INDEX IF NOT EXISTS escrow_chain_events_escrow_idx
  ON escrow_chain_events (chain_id, contract_address, escrow_id, block_number, log_index);

CREATE TABLE IF NOT EXISTS escrow_onchain_projections (
  job_id UUID PRIMARY KEY REFERENCES escrow_jobs(id) ON DELETE CASCADE,
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  escrow_id TEXT NOT NULL,
  projected_at_ms BIGINT NOT NULL,
  last_projected_block BIGINT NULL,
  last_event_block BIGINT NULL,
  last_event_count INTEGER NOT NULL,
  projection_digest TEXT NOT NULL,
  projection_health TEXT NOT NULL,
  degraded_reason TEXT NULL,
  funded_amount TEXT NULL,
  status TEXT NOT NULL,
  milestones_json JSONB NOT NULL,
  chain_audit_json JSONB NOT NULL,
  drift_summary_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS escrow_onchain_projections_contract_idx
  ON escrow_onchain_projections (chain_id, contract_address, escrow_id);
