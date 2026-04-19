import {
  BadRequestException,
  HttpStatus,
  UnauthorizedException,
  type HttpException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodValidationPipe } from '../src/common/zod.pipe';
import * as authDto from '../src/modules/auth/auth.dto';
import { AuthModule } from '../src/modules/auth/auth.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { EmailService } from '../src/modules/auth/email.service';
import { configureFilePersistence } from './support/test-persistence';

type SentOtp = {
  email: string;
  code: string;
};

async function captureHttpException(
  action: () => Promise<unknown>,
): Promise<HttpException> {
  try {
    await action();
  } catch (error) {
    return error as HttpException;
  }

  throw new Error('Expected HttpException to be thrown');
}

describe('Auth integration', () => {
  let authService: AuthService;
  let moduleFixture: TestingModule;
  let cleanupPersistence: (() => void) | undefined;
  const sentOtps: SentOtp[] = [];

  const emailService = {
    sendOtp(email: string, code: string) {
      sentOtps.push({ email, code });
      return Promise.resolve({
        providerKind: 'mock' as const,
        acceptedAt: Date.now(),
      });
    },
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret_for_integration_123';
    delete process.env.AUTH_OTP_IP_SEND_WINDOW_SEC;
    delete process.env.AUTH_OTP_IP_SEND_MAX_PER_WINDOW;
    const persistence = configureFilePersistence();
    cleanupPersistence = persistence.cleanup;

    moduleFixture = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailService)
      .compile();

    authService = moduleFixture.get(AuthService);
    sentOtps.length = 0;
  });

  afterEach(async () => {
    await moduleFixture.close();
    cleanupPersistence?.();
    cleanupPersistence = undefined;
  });

  it('rejects invalid auth start payloads', () => {
    const pipe = new ZodValidationPipe(authDto.startSchema);

    expect(() => pipe.transform({ email: 'not-an-email' })).toThrow(
      BadRequestException,
    );
  });

  it('supports the full auth session flow', async () => {
    const email = 'User@example.com';

    const startResult = await authService.start({ email }, '127.0.0.1');
    expect(startResult).toEqual({ ok: true });

    expect(sentOtps).toHaveLength(1);
    expect(sentOtps[0]?.email).toBe(email.toLowerCase());
    expect(sentOtps[0]?.code).toMatch(/^\d{6}$/);

    const verifyResult = await authService.verify({
      email,
      code: sentOtps[0]?.code ?? '',
    });

    expect(verifyResult.user).toEqual(
      expect.objectContaining({
        email: email.toLowerCase(),
        shariahMode: false,
        defaultExecutionWalletAddress: null,
        wallets: [],
        capabilities: expect.objectContaining({
          escrowResolution: expect.objectContaining({
            allowed: false,
          }),
          marketplaceModeration: expect.objectContaining({
            allowed: false,
          }),
        }),
      }),
    );
    expect(verifyResult.accessToken).toEqual(expect.any(String));
    expect(verifyResult.refreshToken).toEqual(expect.any(String));

    const meResult = await authService.me(verifyResult.user.id);
    expect(meResult).toEqual(
      expect.objectContaining({
        email: email.toLowerCase(),
        shariahMode: false,
        defaultExecutionWalletAddress: null,
        wallets: [],
        capabilities: expect.objectContaining({
          escrowOperations: expect.objectContaining({
            allowed: false,
          }),
        }),
      }),
    );

    const shariahResult = await authService.setShariah(
      verifyResult.user.id,
      true,
    );
    expect(shariahResult).toEqual(
      expect.objectContaining({
        email: email.toLowerCase(),
        shariahMode: true,
        defaultExecutionWalletAddress: null,
        wallets: [],
        capabilities: expect.objectContaining({
          jobHistoryImport: expect.objectContaining({
            allowed: false,
          }),
        }),
      }),
    );

    const refreshResult = await authService.refresh({
      refreshToken: verifyResult.refreshToken,
    });
    expect(refreshResult.accessToken).toEqual(expect.any(String));
    expect(refreshResult.refreshToken).toEqual(expect.any(String));
    expect(refreshResult.refreshToken).not.toBe(verifyResult.refreshToken);

    await expect(
      authService.refresh({ refreshToken: verifyResult.refreshToken }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      authService.refresh({ refreshToken: refreshResult.refreshToken }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await authService.logout(refreshResult.refreshToken);

    await expect(
      authService.refresh({ refreshToken: refreshResult.refreshToken }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('retains users and sessions after the auth module is recreated', async () => {
    const email = 'persisted@example.com';

    await authService.start({ email });
    const verification = await authService.verify({
      email,
      code: sentOtps[0]?.code ?? '',
    });

    const persistedRefreshToken = verification.refreshToken;
    const userId = verification.user.id;

    await moduleFixture.close();

    moduleFixture = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailService)
      .compile();
    authService = moduleFixture.get(AuthService);

    const meResult = await authService.me(userId);
    expect(meResult.email).toBe(email);

    const refreshResult = await authService.refresh({
      refreshToken: persistedRefreshToken,
    });
    expect(refreshResult.accessToken).toEqual(expect.any(String));
  });

  it('clears the issued OTP when email delivery fails', async () => {
    const failingDeliveryOtps: SentOtp[] = [];
    await moduleFixture.close();

    moduleFixture = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(EmailService)
      .useValue({
        sendOtp(email: string, code: string) {
          failingDeliveryOtps.push({ email, code });
          return Promise.reject(new Error('Email delivery failed'));
        },
      })
      .compile();

    authService = moduleFixture.get(AuthService);
    const email = 'delivery-failure@example.com';

    await expect(authService.start({ email })).rejects.toThrow(
      'Email delivery failed',
    );

    expect(failingDeliveryOtps).toHaveLength(1);
    await expect(
      authService.verify({
        email,
        code: failingDeliveryOtps[0]?.code ?? '',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rate limits auth start requests from the same ip across different emails', async () => {
    await moduleFixture.close();
    process.env.AUTH_OTP_IP_SEND_MAX_PER_WINDOW = '2';

    moduleFixture = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailService)
      .compile();

    authService = moduleFixture.get(AuthService);

    await expect(
      authService.start({ email: 'one@example.com' }, '127.0.0.1'),
    ).resolves.toEqual({ ok: true });
    await expect(
      authService.start({ email: 'two@example.com' }, '127.0.0.1'),
    ).resolves.toEqual({ ok: true });

    const exception = await captureHttpException(() =>
      authService.start({ email: 'three@example.com' }, '127.0.0.1'),
    );

    expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(exception.message).toBe('Too many requests');
  });

  it('retains an OTP verification lock after the auth module is recreated', async () => {
    await moduleFixture.close();
    process.env.AUTH_OTP_VERIFY_MAX_ATTEMPTS = '2';
    process.env.AUTH_OTP_LOCK_SEC = '3600';

    moduleFixture = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailService)
      .compile();

    authService = moduleFixture.get(AuthService);

    const email = 'locked@example.com';
    await authService.start({ email }, '127.0.0.1');

    await expect(
      authService.verify({
        email,
        code: '000000',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      authService.verify({
        email,
        code: '111111',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const issuedCode = sentOtps[0]?.code ?? '';
    await moduleFixture.close();

    moduleFixture = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailService)
      .compile();

    authService = moduleFixture.get(AuthService);

    await expect(
      authService.verify({
        email,
        code: issuedCode,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
