CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  shariah_mode BOOLEAN NOT NULL DEFAULT FALSE,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_otp_entries (
  email TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  expires_at_ms BIGINT NOT NULL,
  attempts INTEGER NOT NULL,
  locked_until_ms BIGINT NULL,
  last_sent_at_ms BIGINT NOT NULL,
  send_window_start_ms BIGINT NOT NULL,
  send_window_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  sid UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at_ms BIGINT NOT NULL,
  revoked_at_ms BIGINT NULL
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx
  ON auth_sessions (user_id);

CREATE TABLE IF NOT EXISTS escrow_jobs (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  terms_json JSONB NOT NULL,
  job_hash TEXT NOT NULL,
  funded_amount TEXT NULL,
  status TEXT NOT NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL,
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  onchain_escrow_id TEXT NULL,
  client_address TEXT NOT NULL,
  worker_address TEXT NOT NULL,
  currency_address TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS escrow_milestones (
  job_id UUID NOT NULL REFERENCES escrow_jobs(id) ON DELETE CASCADE,
  milestone_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  deliverable TEXT NOT NULL,
  amount TEXT NOT NULL,
  due_at_ms BIGINT NULL,
  status TEXT NOT NULL,
  delivered_at_ms BIGINT NULL,
  released_at_ms BIGINT NULL,
  disputed_at_ms BIGINT NULL,
  resolved_at_ms BIGINT NULL,
  delivery_note TEXT NULL,
  delivery_evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  dispute_reason TEXT NULL,
  resolution_action TEXT NULL,
  resolution_note TEXT NULL,
  PRIMARY KEY (job_id, milestone_index)
);

CREATE TABLE IF NOT EXISTS escrow_audit_events (
  job_id UUID NOT NULL REFERENCES escrow_jobs(id) ON DELETE CASCADE,
  event_index INTEGER NOT NULL,
  type TEXT NOT NULL,
  at_ms BIGINT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (job_id, event_index)
);

CREATE TABLE IF NOT EXISTS escrow_executions (
  job_id UUID NOT NULL REFERENCES escrow_jobs(id) ON DELETE CASCADE,
  execution_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  tx_hash TEXT NULL,
  status TEXT NOT NULL,
  block_number BIGINT NULL,
  submitted_at_ms BIGINT NOT NULL,
  confirmed_at_ms BIGINT NULL,
  milestone_index INTEGER NULL,
  escrow_id TEXT NULL,
  failure_code TEXT NULL,
  failure_message TEXT NULL,
  PRIMARY KEY (job_id, execution_id)
);
