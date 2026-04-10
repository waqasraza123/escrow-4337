ALTER TABLE escrow_milestones
ADD COLUMN IF NOT EXISTS dispute_evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
