CREATE TABLE IF NOT EXISTS auth_otp_request_throttles (
  scope TEXT NOT NULL,
  throttle_key TEXT NOT NULL,
  window_start_ms BIGINT NOT NULL,
  request_count INTEGER NOT NULL,
  updated_at_ms BIGINT NOT NULL,
  PRIMARY KEY (scope, throttle_key)
);
