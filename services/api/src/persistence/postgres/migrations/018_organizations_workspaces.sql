CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS organization_memberships (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL,
  UNIQUE (organization_id, user_id, role)
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  slug TEXT NOT NULL,
  default_for_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS organization_memberships_user_idx
ON organization_memberships (user_id, updated_at_ms DESC);

CREATE INDEX IF NOT EXISTS organization_memberships_org_idx
ON organization_memberships (organization_id, updated_at_ms DESC);

CREATE INDEX IF NOT EXISTS workspaces_org_idx
ON workspaces (organization_id, updated_at_ms DESC);

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_default_user_kind_idx
ON workspaces (default_for_user_id, kind)
WHERE default_for_user_id IS NOT NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS active_workspace_id TEXT NULL REFERENCES workspaces(id) ON DELETE SET NULL;

ALTER TABLE marketplace_profiles
ADD COLUMN IF NOT EXISTS organization_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE marketplace_profiles
ADD COLUMN IF NOT EXISTS workspace_id TEXT NULL REFERENCES workspaces(id) ON DELETE SET NULL;

ALTER TABLE marketplace_opportunities
ADD COLUMN IF NOT EXISTS owner_organization_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE marketplace_opportunities
ADD COLUMN IF NOT EXISTS owner_workspace_id TEXT NULL REFERENCES workspaces(id) ON DELETE SET NULL;

ALTER TABLE marketplace_applications
ADD COLUMN IF NOT EXISTS applicant_organization_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE marketplace_applications
ADD COLUMN IF NOT EXISTS applicant_workspace_id TEXT NULL REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS marketplace_profiles_workspace_idx
ON marketplace_profiles (workspace_id);

CREATE INDEX IF NOT EXISTS marketplace_opportunities_workspace_idx
ON marketplace_opportunities (owner_workspace_id, updated_at_ms DESC);

CREATE INDEX IF NOT EXISTS marketplace_applications_workspace_idx
ON marketplace_applications (applicant_workspace_id, updated_at_ms DESC);
