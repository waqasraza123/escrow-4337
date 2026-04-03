import {
  HttpStatus,
  UnauthorizedException,
  type HttpException,
} from '@nestjs/common';
import { OtpStore } from '../src/modules/auth/otp.store';

function captureHttpException(action: () => void): HttpException {
  try {
    action();
  } catch (error) {
    return error as HttpException;
  }

  throw new Error('Expected HttpException to be thrown');
}

describe('OtpStore', () => {
  let otpStore: OtpStore;
  let currentTime: number;

  beforeEach(() => {
    otpStore = new OtpStore();
    currentTime = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('verifies a valid code once and invalidates it after use', () => {
    otpStore.request('User@example.com');
    otpStore.set('User@example.com', '123456');

    expect(() => otpStore.verify('user@example.com', '123456')).not.toThrow();
    expect(() => otpStore.verify('user@example.com', '123456')).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects expired codes', () => {
    otpStore.request('user@example.com');
    otpStore.set('user@example.com', '654321');

    currentTime += 10 * 60 * 1000 + 1;

    expect(() => otpStore.verify('user@example.com', '654321')).toThrow(
      UnauthorizedException,
    );
  });

  it('locks verification after repeated invalid attempts', () => {
    otpStore.request('user@example.com');
    otpStore.set('user@example.com', '111111');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(() => otpStore.verify('user@example.com', '000000')).toThrow(
        UnauthorizedException,
      );
    }

    expect(() => otpStore.verify('user@example.com', '111111')).toThrow(
      'Locked',
    );
  });

  it('rate limits repeated OTP requests inside the active window', () => {
    for (let requestCount = 0; requestCount < 5; requestCount += 1) {
      expect(() => otpStore.request('user@example.com')).not.toThrow();
    }

    const exception = captureHttpException(() =>
      otpStore.request('user@example.com'),
    );

    expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(exception.message).toBe('Too many requests');
  });

  it('rate limit window resets after enough time passes', () => {
    for (let requestCount = 0; requestCount < 5; requestCount += 1) {
      otpStore.request('user@example.com');
    }

    currentTime += 60 * 60 * 1000 + 1;

    expect(() => otpStore.request('user@example.com')).not.toThrow();
  });

  it('rejects new requests while the OTP entry is still locked', () => {
    otpStore.request('user@example.com');
    otpStore.set('user@example.com', '222222');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(() => otpStore.verify('user@example.com', '999999')).toThrow(
        UnauthorizedException,
      );
    }

    const exception = captureHttpException(() =>
      otpStore.request('user@example.com'),
    );

    expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(exception.message).toBe('Temporarily locked');
  });
});
