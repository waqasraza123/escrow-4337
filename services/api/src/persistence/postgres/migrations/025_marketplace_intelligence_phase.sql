CREATE TABLE IF NOT EXISTS marketplace_interaction_events (
  id TEXT PRIMARY KEY,
  actor_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  actor_workspace_id TEXT NULL,
  surface TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_id TEXT NULL,
  search_kind TEXT NULL,
  query_label TEXT NULL,
  category TEXT NULL,
  timezone TEXT NULL,
  skill_tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_count INTEGER NOT NULL DEFAULT 1,
  related_opportunity_id TEXT NULL,
  related_profile_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  related_application_id TEXT NULL,
  related_job_id TEXT NULL,
  created_at_ms BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_interaction_events_created_idx
ON marketplace_interaction_events (created_at_ms DESC);

CREATE INDEX IF NOT EXISTS marketplace_interaction_events_event_idx
ON marketplace_interaction_events (event_type, entity_type, created_at_ms DESC);

CREATE INDEX IF NOT EXISTS marketplace_interaction_events_actor_idx
ON marketplace_interaction_events (actor_user_id, actor_workspace_id, created_at_ms DESC);

CREATE INDEX IF NOT EXISTS marketplace_interaction_events_search_idx
ON marketplace_interaction_events (search_kind, query_label, created_at_ms DESC);
