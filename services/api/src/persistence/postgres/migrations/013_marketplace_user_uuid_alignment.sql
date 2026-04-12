ALTER TABLE marketplace_profiles
  DROP CONSTRAINT IF EXISTS marketplace_profiles_user_id_fkey;

ALTER TABLE marketplace_opportunities
  DROP CONSTRAINT IF EXISTS marketplace_opportunities_owner_user_id_fkey;

ALTER TABLE marketplace_applications
  DROP CONSTRAINT IF EXISTS marketplace_applications_applicant_user_id_fkey;

ALTER TABLE marketplace_profiles
  ALTER COLUMN user_id TYPE UUID
  USING user_id::uuid;

ALTER TABLE marketplace_opportunities
  ALTER COLUMN owner_user_id TYPE UUID
  USING owner_user_id::uuid;

ALTER TABLE marketplace_applications
  ALTER COLUMN applicant_user_id TYPE UUID
  USING applicant_user_id::uuid;

ALTER TABLE marketplace_profiles
  ADD CONSTRAINT marketplace_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE marketplace_opportunities
  ADD CONSTRAINT marketplace_opportunities_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE marketplace_applications
  ADD CONSTRAINT marketplace_applications_applicant_user_id_fkey
  FOREIGN KEY (applicant_user_id) REFERENCES users(id) ON DELETE CASCADE;
