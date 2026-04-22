CREATE TABLE IF NOT EXISTS marketplace_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  digest_cadence TEXT NOT NULL,
  talent_invites_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  application_activity_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  interview_messages_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  offer_activity_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  review_activity_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  automation_activity_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  lifecycle_digest_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  analytics_digest_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS marketplace_digests (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces (id) ON DELETE SET NULL,
  cadence TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  highlights_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_digests_user_idx
  ON marketplace_digests (user_id, updated_at_ms DESC);

CREATE INDEX IF NOT EXISTS marketplace_digests_workspace_idx
  ON marketplace_digests (workspace_id, updated_at_ms DESC);
