import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodValidationPipe } from '../src/common/zod.pipe';
import * as authDto from '../src/modules/auth/auth.dto';
import { AuthModule } from '../src/modules/auth/auth.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { EmailService } from '../src/modules/auth/email.service';

type SentOtp = {
  email: string;
  code: string;
};

describe('Auth integration', () => {
  let authService: AuthService;
  const sentOtps: SentOtp[] = [];

  const emailService = {
    sendOtp(email: string, code: string) {
      sentOtps.push({ email, code });
      return true;
    },
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret_for_integration';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailService)
      .compile();

    authService = moduleFixture.get(AuthService);
  });

  beforeEach(() => {
    sentOtps.length = 0;
  });

  it('rejects invalid auth start payloads', () => {
    const pipe = new ZodValidationPipe(authDto.startSchema);

    expect(() => pipe.transform({ email: 'not-an-email' })).toThrow(
      BadRequestException,
    );
  });

  it('supports the full auth session flow', async () => {
    const email = 'User@example.com';

    const startResult = authService.start({ email }, '127.0.0.1');
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
      }),
    );
    expect(verifyResult.accessToken).toEqual(expect.any(String));
    expect(verifyResult.refreshToken).toEqual(expect.any(String));

    const meResult = authService.me(verifyResult.user.id);
    expect(meResult).toEqual(
      expect.objectContaining({
        email: email.toLowerCase(),
        shariahMode: false,
      }),
    );

    const shariahResult = authService.setShariah(verifyResult.user.id, true);
    expect(shariahResult).toEqual(
      expect.objectContaining({
        email: email.toLowerCase(),
        shariahMode: true,
      }),
    );

    const refreshResult = await authService.refresh({
      refreshToken: verifyResult.refreshToken,
    });
    expect(refreshResult.accessToken).toEqual(expect.any(String));
    expect(refreshResult.refreshToken).toEqual(expect.any(String));

    await authService.logout(verifyResult.refreshToken);

    await expect(
      authService.refresh({ refreshToken: verifyResult.refreshToken }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
