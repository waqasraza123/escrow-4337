CREATE TABLE IF NOT EXISTS marketplace_talent_search_documents (
  profile_user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_slug TEXT NOT NULL,
  workspace_id TEXT NULL,
  organization_id TEXT NULL,
  display_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  searchable_text TEXT NOT NULL,
  skills_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  specialties_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  timezone TEXT NOT NULL,
  availability TEXT NOT NULL,
  preferred_engagements_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  crypto_readiness TEXT NOT NULL,
  verification_level TEXT NOT NULL,
  ranking_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  reasons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_talent_search_documents_slug_idx
ON marketplace_talent_search_documents (profile_slug);

CREATE INDEX IF NOT EXISTS marketplace_talent_search_documents_updated_idx
ON marketplace_talent_search_documents (updated_at_ms DESC);

CREATE TABLE IF NOT EXISTS marketplace_opportunity_search_documents (
  opportunity_id TEXT PRIMARY KEY REFERENCES marketplace_opportunities(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_workspace_id TEXT NULL,
  owner_organization_id TEXT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  searchable_text TEXT NOT NULL,
  required_skills_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  must_have_skills_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  engagement_type TEXT NOT NULL,
  crypto_readiness_required TEXT NOT NULL,
  timezone_overlap_hours INTEGER NULL,
  budget_min TEXT NULL,
  budget_max TEXT NULL,
  visibility TEXT NOT NULL,
  status TEXT NOT NULL,
  ranking_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  reasons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at_ms BIGINT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_opportunity_search_documents_owner_idx
ON marketplace_opportunity_search_documents (owner_user_id, updated_at_ms DESC);

CREATE INDEX IF NOT EXISTS marketplace_opportunity_search_documents_status_idx
ON marketplace_opportunity_search_documents (status, visibility, updated_at_ms DESC);

CREATE TABLE IF NOT EXISTS marketplace_saved_searches (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  query_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  alert_frequency TEXT NOT NULL,
  last_result_count INTEGER NOT NULL DEFAULT 0,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_saved_searches_user_idx
ON marketplace_saved_searches (user_id, updated_at_ms DESC);

CREATE TABLE IF NOT EXISTS marketplace_opportunity_invites (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES marketplace_opportunities(id) ON DELETE CASCADE,
  invited_profile_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_profile_slug TEXT NOT NULL,
  invited_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_workspace_id TEXT NULL,
  message TEXT NULL,
  status TEXT NOT NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_opportunity_invites_profile_idx
ON marketplace_opportunity_invites (invited_profile_user_id, updated_at_ms DESC);

CREATE INDEX IF NOT EXISTS marketplace_opportunity_invites_opportunity_idx
ON marketplace_opportunity_invites (opportunity_id, updated_at_ms DESC);
