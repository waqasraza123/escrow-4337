ALTER TABLE escrow_chain_events
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'rpc_log';

ALTER TABLE escrow_chain_events
  ADD COLUMN IF NOT EXISTS ingestion_kind TEXT NOT NULL DEFAULT 'legacy_backfill';

ALTER TABLE escrow_chain_events
  ADD COLUMN IF NOT EXISTS ingested_at_ms BIGINT NULL;

ALTER TABLE escrow_chain_events
  ADD COLUMN IF NOT EXISTS correlation_id TEXT NULL;

ALTER TABLE escrow_chain_events
  ADD COLUMN IF NOT EXISTS mirror_status TEXT NOT NULL DEFAULT 'persisted';

ALTER TABLE escrow_chain_events
  ADD COLUMN IF NOT EXISTS persisted_via TEXT NULL;

CREATE INDEX IF NOT EXISTS escrow_chain_events_ingestion_idx
  ON escrow_chain_events (chain_id, contract_address, ingestion_kind, ingested_at_ms DESC, block_number DESC, log_index DESC);
