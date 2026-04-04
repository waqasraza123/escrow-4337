import { AuthConfigService } from '../src/modules/auth/auth.config';
import {
  HttpStatus,
  UnauthorizedException,
  type HttpException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { OtpRequestThrottleService } from '../src/modules/auth/otp-request-throttle.service';
import { PersistenceModule } from '../src/persistence/persistence.module';
import { OtpStore } from '../src/modules/auth/otp.store';
import { configureFilePersistence } from './support/test-persistence';

async function captureHttpException(
  action: () => Promise<void>,
): Promise<HttpException> {
  try {
    await action();
  } catch (error) {
    return error as HttpException;
  }

  throw new Error('Expected HttpException to be thrown');
}

describe('OtpStore', () => {
  let otpStore: OtpStore;
  let moduleRef: TestingModule;
  let cleanupPersistence: (() => void) | undefined;
  let currentTime: number;

  beforeEach(async () => {
    const persistence = configureFilePersistence();
    cleanupPersistence = persistence.cleanup;
    delete process.env.AUTH_OTP_TTL_SEC;
    delete process.env.AUTH_OTP_IP_SEND_WINDOW_SEC;
    delete process.env.AUTH_OTP_IP_SEND_MAX_PER_WINDOW;
    delete process.env.AUTH_OTP_SEND_MAX_PER_WINDOW;
    currentTime = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
    moduleRef = await Test.createTestingModule({
      imports: [PersistenceModule],
      providers: [AuthConfigService, OtpRequestThrottleService, OtpStore],
    }).compile();
    otpStore = moduleRef.get(OtpStore);
  });

  afterEach(async () => {
    await moduleRef?.close();
    cleanupPersistence?.();
    cleanupPersistence = undefined;
    jest.restoreAllMocks();
  });

  it('verifies a valid code once and invalidates it after use', async () => {
    await otpStore.request('User@example.com');
    await otpStore.set('User@example.com', '123456');

    await expect(
      otpStore.verify('user@example.com', '123456'),
    ).resolves.toBeUndefined();
    await expect(
      otpStore.verify('user@example.com', '123456'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects expired codes', async () => {
    await otpStore.request('user@example.com');
    await otpStore.set('user@example.com', '654321');

    currentTime += 10 * 60 * 1000 + 1;

    await expect(
      otpStore.verify('user@example.com', '654321'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('locks verification after repeated invalid attempts', async () => {
    await otpStore.request('user@example.com');
    await otpStore.set('user@example.com', '111111');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        otpStore.verify('user@example.com', '000000'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }

    await expect(otpStore.verify('user@example.com', '111111')).rejects.toThrow(
      'Locked',
    );
  });

  it('rate limits repeated OTP requests inside the active window', async () => {
    for (let requestCount = 0; requestCount < 5; requestCount += 1) {
      await expect(
        otpStore.request('user@example.com'),
      ).resolves.toBeUndefined();
    }

    const exception = await captureHttpException(() =>
      otpStore.request('user@example.com'),
    );

    expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(exception.message).toBe('Too many requests');
  });

  it('rate limit window resets after enough time passes', async () => {
    for (let requestCount = 0; requestCount < 5; requestCount += 1) {
      await otpStore.request('user@example.com');
    }

    currentTime += 60 * 60 * 1000 + 1;

    await expect(otpStore.request('user@example.com')).resolves.toBeUndefined();
  });

  it('rejects new requests while the OTP entry is still locked', async () => {
    await otpStore.request('user@example.com');
    await otpStore.set('user@example.com', '222222');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        otpStore.verify('user@example.com', '999999'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }

    const exception = await captureHttpException(() =>
      otpStore.request('user@example.com'),
    );

    expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(exception.message).toBe('Temporarily locked');
  });

  it('uses the configured otp ttl', async () => {
    await moduleRef.close();
    process.env.AUTH_OTP_TTL_SEC = '1';

    moduleRef = await Test.createTestingModule({
      imports: [PersistenceModule],
      providers: [AuthConfigService, OtpRequestThrottleService, OtpStore],
    }).compile();
    otpStore = moduleRef.get(OtpStore);

    await otpStore.request('user@example.com');
    await otpStore.set('user@example.com', '333333');

    currentTime += 1001;

    await expect(
      otpStore.verify('user@example.com', '333333'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rate limits otp requests from the same ip across different emails', async () => {
    await moduleRef.close();
    process.env.AUTH_OTP_IP_SEND_MAX_PER_WINDOW = '2';

    moduleRef = await Test.createTestingModule({
      imports: [PersistenceModule],
      providers: [AuthConfigService, OtpRequestThrottleService, OtpStore],
    }).compile();
    otpStore = moduleRef.get(OtpStore);

    await expect(
      otpStore.request('one@example.com', '127.0.0.1'),
    ).resolves.toBeUndefined();
    await expect(
      otpStore.request('two@example.com', '127.0.0.1'),
    ).resolves.toBeUndefined();

    const exception = await captureHttpException(() =>
      otpStore.request('three@example.com', '127.0.0.1'),
    );

    expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(exception.message).toBe('Too many requests');
  });

  it('resets the ip rate-limit window after enough time passes', async () => {
    await moduleRef.close();
    process.env.AUTH_OTP_IP_SEND_MAX_PER_WINDOW = '2';
    process.env.AUTH_OTP_IP_SEND_WINDOW_SEC = '60';

    moduleRef = await Test.createTestingModule({
      imports: [PersistenceModule],
      providers: [AuthConfigService, OtpRequestThrottleService, OtpStore],
    }).compile();
    otpStore = moduleRef.get(OtpStore);

    await otpStore.request('one@example.com', '127.0.0.1');
    await otpStore.request('two@example.com', '127.0.0.1');

    currentTime += 60_001;

    await expect(
      otpStore.request('three@example.com', '127.0.0.1'),
    ).resolves.toBeUndefined();
  });
});
