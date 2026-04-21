CREATE TABLE IF NOT EXISTS marketplace_application_revisions (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES marketplace_applications(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES marketplace_opportunities(id) ON DELETE CASCADE,
  applicant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  cover_note TEXT NOT NULL,
  proposed_rate TEXT NULL,
  screening_answers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_approach TEXT NOT NULL,
  milestone_plan_summary TEXT NOT NULL,
  estimated_start_at_ms BIGINT NULL,
  relevant_proof_artifacts_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  portfolio_urls_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  revision_reason TEXT NULL,
  created_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_application_revisions_application_idx
ON marketplace_application_revisions (application_id, revision_number DESC);

CREATE TABLE IF NOT EXISTS marketplace_interview_threads (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES marketplace_applications(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES marketplace_opportunities(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  applicant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_interview_threads_application_idx
ON marketplace_interview_threads (application_id, updated_at_ms DESC);

CREATE TABLE IF NOT EXISTS marketplace_interview_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES marketplace_interview_threads(id) ON DELETE CASCADE,
  application_id TEXT NOT NULL REFERENCES marketplace_applications(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES marketplace_opportunities(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_workspace_id TEXT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_interview_messages_thread_idx
ON marketplace_interview_messages (thread_id, created_at_ms ASC);

CREATE TABLE IF NOT EXISTS marketplace_offers (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES marketplace_applications(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES marketplace_opportunities(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  applicant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT NULL,
  counter_message TEXT NULL,
  decline_reason TEXT NULL,
  proposed_rate TEXT NULL,
  milestones_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  revision_number INTEGER NOT NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_offers_application_idx
ON marketplace_offers (application_id, revision_number DESC, updated_at_ms DESC);

CREATE TABLE IF NOT EXISTS marketplace_application_decisions (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES marketplace_applications(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL REFERENCES marketplace_opportunities(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reason TEXT NULL,
  no_hire_reason TEXT NULL,
  created_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_application_decisions_application_idx
ON marketplace_application_decisions (application_id, created_at_ms ASC);
