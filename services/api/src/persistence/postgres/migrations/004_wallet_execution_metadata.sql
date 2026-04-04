ALTER TABLE user_wallets
  ADD COLUMN IF NOT EXISTS verification_method TEXT NULL,
  ADD COLUMN IF NOT EXISTS verification_chain_id INTEGER NULL,
  ADD COLUMN IF NOT EXISTS verified_at_ms BIGINT NULL,
  ADD COLUMN IF NOT EXISTS owner_address TEXT NULL,
  ADD COLUMN IF NOT EXISTS recovery_address TEXT NULL,
  ADD COLUMN IF NOT EXISTS chain_id INTEGER NULL,
  ADD COLUMN IF NOT EXISTS provider_kind TEXT NULL,
  ADD COLUMN IF NOT EXISTS entry_point_address TEXT NULL,
  ADD COLUMN IF NOT EXISTS factory_address TEXT NULL,
  ADD COLUMN IF NOT EXISTS sponsorship_policy TEXT NULL,
  ADD COLUMN IF NOT EXISTS provisioned_at_ms BIGINT NULL;

UPDATE user_wallets
SET
  verification_method = COALESCE(verification_method, 'legacy_link'),
  verified_at_ms = COALESCE(verified_at_ms, updated_at_ms)
WHERE wallet_kind = 'eoa';
