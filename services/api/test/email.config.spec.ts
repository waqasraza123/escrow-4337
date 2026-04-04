import { EmailConfigService } from '../src/modules/auth/email/email.config';

describe('EmailConfigService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AUTH_EMAIL_MODE;
    delete process.env.AUTH_EMAIL_FROM_EMAIL;
    delete process.env.AUTH_EMAIL_FROM_NAME;
    delete process.env.AUTH_EMAIL_REPLY_TO;
    delete process.env.AUTH_EMAIL_OTP_SUBJECT;
    delete process.env.AUTH_EMAIL_OTP_TTL_MINUTES;
    delete process.env.AUTH_EMAIL_RELAY_BASE_URL;
    delete process.env.AUTH_EMAIL_RELAY_API_KEY;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reads relay email settings from the environment', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_EMAIL_MODE = 'relay';
    process.env.AUTH_EMAIL_FROM_EMAIL = 'no-reply@example.com';
    process.env.AUTH_EMAIL_FROM_NAME = 'Escrow Ops';
    process.env.AUTH_EMAIL_REPLY_TO = 'support@example.com';
    process.env.AUTH_EMAIL_OTP_SUBJECT = 'Your login code';
    process.env.AUTH_EMAIL_OTP_TTL_MINUTES = '15';
    process.env.AUTH_EMAIL_RELAY_BASE_URL = 'https://email.example.com/';
    process.env.AUTH_EMAIL_RELAY_API_KEY = 'relay-secret';

    const config = new EmailConfigService();

    expect(config.mode).toBe('relay');
    expect(config.fromEmail).toBe('no-reply@example.com');
    expect(config.fromName).toBe('Escrow Ops');
    expect(config.replyTo).toBe('support@example.com');
    expect(config.otpSubject).toBe('Your login code');
    expect(config.otpTtlMinutes).toBe(15);
    expect(config.relayBaseUrl).toBe('https://email.example.com');
    expect(config.relayApiKey).toBe('relay-secret');
  });

  it('requires relay configuration outside test mode', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_EMAIL_MODE = 'relay';

    const config = new EmailConfigService();

    expect(() => config.fromEmail).toThrow('AUTH_EMAIL_FROM_EMAIL must be set');
    process.env.AUTH_EMAIL_FROM_EMAIL = 'no-reply@example.com';
    expect(() => config.relayBaseUrl).toThrow(
      'AUTH_EMAIL_RELAY_BASE_URL must be set',
    );
  });
});
