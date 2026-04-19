ALTER TABLE escrow_executions
  ADD COLUMN IF NOT EXISTS request_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT NULL,
  ADD COLUMN IF NOT EXISTS operation_key TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS escrow_executions_idempotency_key_idx
  ON escrow_executions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS escrow_executions_correlation_id_idx
  ON escrow_executions (correlation_id)
  WHERE correlation_id IS NOT NULL;

