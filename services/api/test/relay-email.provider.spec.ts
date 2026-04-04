import { EmailConfigService } from '../src/modules/auth/email/email.config';
import { EmailProviderError } from '../src/modules/auth/email/email.errors';
import { RelayEmailProvider } from '../src/modules/auth/email/relay-email.provider';

describe('RelayEmailProvider', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'production';
    process.env.AUTH_EMAIL_MODE = 'relay';
    process.env.AUTH_EMAIL_FROM_EMAIL = 'no-reply@example.com';
    process.env.AUTH_EMAIL_RELAY_BASE_URL = 'https://email.example.com';
    process.env.AUTH_EMAIL_RELAY_API_KEY = 'relay-key';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it('posts the rendered email payload to the relay provider', async () => {
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          acceptedAt: 123456,
          messageId: 'msg_123',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const provider = new RelayEmailProvider(new EmailConfigService());

    const receipt = await provider.send({
      to: 'user@example.com',
      fromEmail: 'no-reply@example.com',
      fromName: 'Escrow4337',
      replyTo: 'support@example.com',
      subject: 'Your code',
      text: 'Code text',
      html: '<p>Code text</p>',
      tags: ['auth', 'otp'],
    });

    expect(receipt).toEqual({
      providerKind: 'relay',
      acceptedAt: 123456,
      messageId: 'msg_123',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://email.example.com/email/send',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          to: 'user@example.com',
          from: {
            email: 'no-reply@example.com',
            name: 'Escrow4337',
          },
          replyTo: 'support@example.com',
          subject: 'Your code',
          text: 'Code text',
          html: '<p>Code text</p>',
          tags: ['auth', 'otp'],
        }),
      }),
    );
  });

  it('surfaces relay failures as provider errors', async () => {
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'provider_rejected',
          message: 'Provider rejected the payload',
        }),
        {
          status: 502,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const provider = new RelayEmailProvider(new EmailConfigService());

    await expect(
      provider.send({
        to: 'user@example.com',
        fromEmail: 'no-reply@example.com',
        subject: 'Your code',
        text: 'Code text',
        html: '<p>Code text</p>',
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<EmailProviderError>>({
        name: 'EmailProviderError',
        code: 'provider_rejected',
        providerKind: 'relay',
        recipientEmail: 'user@example.com',
      }),
    );
  });
});
