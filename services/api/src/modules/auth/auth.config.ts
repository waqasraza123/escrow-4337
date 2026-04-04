import { Injectable } from '@nestjs/common';

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readRequiredSecret(
  value: string | undefined,
  envName: string,
  fallback: string | null,
) {
  const candidate = value?.trim() || fallback;
  if (!candidate) {
    throw new Error(`${envName} must be set`);
  }
  if (candidate.length < 32) {
    throw new Error(`${envName} must be at least 32 characters`);
  }
  return candidate;
}

function readPositiveMilliseconds(
  value: string | undefined,
  fallbackSeconds: number,
) {
  return readPositiveInteger(value, fallbackSeconds) * 1000;
}

@Injectable()
export class AuthConfigService {
  get jwtSecret() {
    return readRequiredSecret(
      process.env.JWT_SECRET,
      'JWT_SECRET',
      process.env.NODE_ENV === 'test'
        ? 'test_jwt_secret_for_integration_123'
        : null,
    );
  }

  get jwtIssuer() {
    return process.env.JWT_ISSUER?.trim() || 'escrow4337';
  }

  get jwtAudience() {
    return process.env.JWT_AUDIENCE?.trim() || 'escrow4337:web';
  }

  get accessTtlSec() {
    return readPositiveInteger(process.env.JWT_ACCESS_TTL_SEC, 900);
  }

  get refreshTtlSec() {
    return readPositiveInteger(process.env.JWT_REFRESH_TTL_SEC, 1_209_600);
  }

  get sessionTtlMs() {
    return readPositiveMilliseconds(
      process.env.AUTH_SESSION_TTL_SEC,
      1_209_600,
    );
  }

  get otpTtlMs() {
    return readPositiveMilliseconds(process.env.AUTH_OTP_TTL_SEC, 600);
  }

  get otpVerifyMaxAttempts() {
    return readPositiveInteger(process.env.AUTH_OTP_VERIFY_MAX_ATTEMPTS, 5);
  }

  get otpLockMs() {
    return readPositiveMilliseconds(process.env.AUTH_OTP_LOCK_SEC, 600);
  }

  get otpSendWindowMs() {
    return readPositiveMilliseconds(process.env.AUTH_OTP_SEND_WINDOW_SEC, 3600);
  }

  get otpSendMaxPerWindow() {
    return readPositiveInteger(process.env.AUTH_OTP_SEND_MAX_PER_WINDOW, 5);
  }
}
