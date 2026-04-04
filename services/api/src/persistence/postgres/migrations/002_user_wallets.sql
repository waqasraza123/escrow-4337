ALTER TABLE users
  ADD COLUMN IF NOT EXISTS default_execution_wallet_address TEXT NULL;

CREATE TABLE IF NOT EXISTS user_wallets (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL UNIQUE,
  wallet_kind TEXT NOT NULL,
  label TEXT NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL,
  PRIMARY KEY (user_id, address)
);

CREATE INDEX IF NOT EXISTS user_wallets_user_id_idx
  ON user_wallets (user_id);
