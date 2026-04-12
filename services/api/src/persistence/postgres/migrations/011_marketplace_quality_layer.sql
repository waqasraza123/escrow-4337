ALTER TABLE marketplace_profiles
  ADD COLUMN IF NOT EXISTS specialties_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_engagements_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS proof_artifacts_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS crypto_readiness TEXT NOT NULL DEFAULT 'wallet_only';

ALTER TABLE marketplace_opportunities
  ADD COLUMN IF NOT EXISTS must_have_skills_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS outcomes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS acceptance_criteria_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS screening_questions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS desired_start_at_ms BIGINT NULL,
  ADD COLUMN IF NOT EXISTS timezone_overlap_hours INTEGER NULL,
  ADD COLUMN IF NOT EXISTS engagement_type TEXT NOT NULL DEFAULT 'fixed_scope',
  ADD COLUMN IF NOT EXISTS crypto_readiness_required TEXT NOT NULL DEFAULT 'wallet_only';

ALTER TABLE marketplace_applications
  ADD COLUMN IF NOT EXISTS screening_answers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_approach TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS milestone_plan_summary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS estimated_start_at_ms BIGINT NULL,
  ADD COLUMN IF NOT EXISTS relevant_proof_artifacts_json JSONB NOT NULL DEFAULT '[]'::jsonb;
