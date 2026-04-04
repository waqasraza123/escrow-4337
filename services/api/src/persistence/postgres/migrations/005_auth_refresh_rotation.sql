ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS refresh_token_id TEXT NULL;

UPDATE auth_sessions
SET refresh_token_id = sid::text
WHERE refresh_token_id IS NULL;

ALTER TABLE auth_sessions
  ALTER COLUMN refresh_token_id SET NOT NULL;
