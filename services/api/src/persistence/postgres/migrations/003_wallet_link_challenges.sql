CREATE TABLE IF NOT EXISTS wallet_link_challenges (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  wallet_kind TEXT NOT NULL,
  label TEXT NULL,
  chain_id INTEGER NOT NULL,
  nonce TEXT NOT NULL,
  message TEXT NOT NULL,
  issued_at_ms BIGINT NOT NULL,
  expires_at_ms BIGINT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at_ms BIGINT NULL,
  last_failed_at_ms BIGINT NULL
);

CREATE INDEX IF NOT EXISTS wallet_link_challenges_user_id_idx
  ON wallet_link_challenges (user_id);
