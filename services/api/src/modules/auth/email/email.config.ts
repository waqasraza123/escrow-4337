import { Injectable } from '@nestjs/common';
import type { EmailDeliveryMode } from './email.types';

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readRequiredValue(
  value: string | undefined,
  envName: string,
  fallback: string | null,
) {
  const candidate = value?.trim() || fallback;
  if (!candidate) {
    throw new Error(`${envName} must be set`);
  }
  return candidate;
}

@Injectable()
export class EmailConfigService {
  get mode(): EmailDeliveryMode {
    const configuredMode = process.env.AUTH_EMAIL_MODE?.trim().toLowerCase();
    if (configuredMode === 'mock') {
      return 'mock';
    }
    if (configuredMode === 'relay') {
      return 'relay';
    }
    return process.env.NODE_ENV === 'test' ? 'mock' : 'relay';
  }

  get fromEmail() {
    return readRequiredValue(
      process.env.AUTH_EMAIL_FROM_EMAIL,
      'AUTH_EMAIL_FROM_EMAIL',
      process.env.NODE_ENV === 'test' ? 'no-reply@escrow.local' : null,
    );
  }

  get fromName() {
    return process.env.AUTH_EMAIL_FROM_NAME?.trim() || 'Escrow4337';
  }

  get replyTo() {
    return process.env.AUTH_EMAIL_REPLY_TO?.trim() || undefined;
  }

  get otpSubject() {
    return process.env.AUTH_EMAIL_OTP_SUBJECT?.trim() || 'Your Escrow4337 code';
  }

  get otpTtlMinutes() {
    return readPositiveInteger(process.env.AUTH_EMAIL_OTP_TTL_MINUTES, 10);
  }

  get relayBaseUrl() {
    return readRequiredValue(
      process.env.AUTH_EMAIL_RELAY_BASE_URL,
      'AUTH_EMAIL_RELAY_BASE_URL',
      process.env.NODE_ENV === 'test' ? 'https://email-relay.local' : null,
    ).replace(/\/+$/, '');
  }

  get relayApiKey() {
    return process.env.AUTH_EMAIL_RELAY_API_KEY?.trim() || null;
  }
}
