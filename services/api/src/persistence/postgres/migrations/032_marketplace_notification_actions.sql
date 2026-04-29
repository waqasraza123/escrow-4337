ALTER TABLE marketplace_notifications
  ADD COLUMN IF NOT EXISTS message_action_label TEXT NULL;

ALTER TABLE marketplace_notifications
  ADD COLUMN IF NOT EXISTS message_action_prompt TEXT NULL;
