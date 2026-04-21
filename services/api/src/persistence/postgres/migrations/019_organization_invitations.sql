CREATE TABLE IF NOT EXISTS organization_invitations (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  invited_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accepted_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  accepted_at_ms BIGINT NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS organization_invitations_org_idx
ON organization_invitations (organization_id, updated_at_ms DESC);

CREATE INDEX IF NOT EXISTS organization_invitations_email_idx
ON organization_invitations (invited_email, updated_at_ms DESC);
