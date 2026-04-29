ALTER TABLE marketplace_notifications
  ADD COLUMN IF NOT EXISTS message_thread_href TEXT NULL;
