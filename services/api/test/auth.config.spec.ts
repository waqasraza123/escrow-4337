import { AuthConfigService } from '../src/modules/auth/auth.config';

describe('AuthConfigService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.JWT_SECRET;
    delete process.env.JWT_ISSUER;
    delete process.env.JWT_AUDIENCE;
    delete process.env.JWT_ACCESS_TTL_SEC;
    delete process.env.JWT_REFRESH_TTL_SEC;
    delete process.env.AUTH_SESSION_TTL_SEC;
    delete process.env.AUTH_OTP_TTL_SEC;
    delete process.env.AUTH_OTP_VERIFY_MAX_ATTEMPTS;
    delete process.env.AUTH_OTP_LOCK_SEC;
    delete process.env.AUTH_OTP_SEND_WINDOW_SEC;
    delete process.env.AUTH_OTP_SEND_MAX_PER_WINDOW;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reads auth timing and jwt settings from the environment', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    process.env.JWT_ISSUER = 'issuer.example';
    process.env.JWT_AUDIENCE = 'audience.example';
    process.env.JWT_ACCESS_TTL_SEC = '600';
    process.env.JWT_REFRESH_TTL_SEC = '7200';
    process.env.AUTH_SESSION_TTL_SEC = '3600';
    process.env.AUTH_OTP_TTL_SEC = '120';
    process.env.AUTH_OTP_VERIFY_MAX_ATTEMPTS = '7';
    process.env.AUTH_OTP_LOCK_SEC = '300';
    process.env.AUTH_OTP_SEND_WINDOW_SEC = '1800';
    process.env.AUTH_OTP_SEND_MAX_PER_WINDOW = '3';

    const config = new AuthConfigService();

    expect(config.jwtSecret).toBe('01234567890123456789012345678901');
    expect(config.jwtIssuer).toBe('issuer.example');
    expect(config.jwtAudience).toBe('audience.example');
    expect(config.accessTtlSec).toBe(600);
    expect(config.refreshTtlSec).toBe(7200);
    expect(config.sessionTtlMs).toBe(3_600_000);
    expect(config.otpTtlMs).toBe(120_000);
    expect(config.otpVerifyMaxAttempts).toBe(7);
    expect(config.otpLockMs).toBe(300_000);
    expect(config.otpSendWindowMs).toBe(1_800_000);
    expect(config.otpSendMaxPerWindow).toBe(3);
  });

  it('requires a strong jwt secret outside test mode', () => {
    process.env.NODE_ENV = 'production';

    const config = new AuthConfigService();

    expect(() => config.jwtSecret).toThrow('JWT_SECRET must be set');
    process.env.JWT_SECRET = 'too-short-secret';
    expect(() => config.jwtSecret).toThrow(
      'JWT_SECRET must be at least 32 characters',
    );
  });
});
