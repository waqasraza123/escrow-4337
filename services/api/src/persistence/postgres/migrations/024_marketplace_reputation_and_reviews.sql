CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_role TEXT NOT NULL,
  reviewee_role TEXT NOT NULL,
  rating SMALLINT NOT NULL,
  scores_json JSONB NOT NULL,
  headline TEXT NULL,
  body TEXT NULL,
  visibility_status TEXT NOT NULL DEFAULT 'visible',
  moderation_note TEXT NULL,
  moderated_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  moderated_at_ms BIGINT NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS marketplace_reviews_job_reviewer_uidx
ON marketplace_reviews (job_id, reviewer_user_id);

CREATE INDEX IF NOT EXISTS marketplace_reviews_reviewee_idx
ON marketplace_reviews (reviewee_user_id, visibility_status, created_at_ms DESC);

CREATE TABLE IF NOT EXISTS marketplace_identity_risk_reviews (
  id TEXT PRIMARY KEY,
  subject_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  confidence_label TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  flags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  operator_summary TEXT NULL,
  reviewed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_at_ms BIGINT NOT NULL,
  created_at_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS marketplace_identity_risk_reviews_subject_uidx
ON marketplace_identity_risk_reviews (subject_user_id);
