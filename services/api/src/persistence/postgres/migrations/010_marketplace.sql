CREATE TABLE IF NOT EXISTS marketplace_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  bio TEXT NOT NULL,
  skills_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  portfolio_urls_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  rate_min TEXT NULL,
  rate_max TEXT NULL,
  timezone TEXT NOT NULL,
  availability TEXT NOT NULL,
  moderation_status TEXT NOT NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS marketplace_opportunities (
  id TEXT PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  currency_address TEXT NOT NULL,
  required_skills_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  visibility TEXT NOT NULL,
  status TEXT NOT NULL,
  budget_min TEXT NULL,
  budget_max TEXT NULL,
  timeline TEXT NOT NULL,
  moderation_status TEXT NOT NULL,
  published_at_ms BIGINT NULL,
  hired_application_id TEXT NULL,
  hired_job_id TEXT NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS marketplace_applications (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES marketplace_opportunities(id) ON DELETE CASCADE,
  applicant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cover_note TEXT NOT NULL,
  proposed_rate TEXT NULL,
  selected_wallet_address TEXT NOT NULL,
  portfolio_urls_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL,
  hired_job_id TEXT NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL,
  UNIQUE (opportunity_id, applicant_user_id)
);

CREATE INDEX IF NOT EXISTS marketplace_profiles_slug_idx
ON marketplace_profiles (slug);

CREATE INDEX IF NOT EXISTS marketplace_opportunities_owner_idx
ON marketplace_opportunities (owner_user_id, updated_at_ms DESC);

CREATE INDEX IF NOT EXISTS marketplace_opportunities_status_idx
ON marketplace_opportunities (status, visibility, moderation_status, updated_at_ms DESC);

CREATE INDEX IF NOT EXISTS marketplace_applications_opportunity_idx
ON marketplace_applications (opportunity_id, updated_at_ms DESC);
