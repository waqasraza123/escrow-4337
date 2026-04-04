import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { OTP_REPOSITORY } from '../../persistence/persistence.tokens';
import type { OtpRepository } from '../../persistence/persistence.types';
import type { OtpEntry } from './auth.types';

class TooManyRequestsException extends HttpException {
  constructor(message = 'Too many requests') {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

@Injectable()
export class OtpStore {
  private readonly ttlMs = 10 * 60 * 1000;
  private readonly verifyMaxAttempts = 5;
  private readonly lockMs = 10 * 60 * 1000;
  private readonly sendWindowMs = 60 * 60 * 1000;
  private readonly sendMaxPerWindow = 5;

  constructor(
    @Inject(OTP_REPOSITORY)
    private readonly otpRepository: OtpRepository,
  ) {}

  private key(email: string) {
    return email.trim().toLowerCase();
  }

  private hash(code: string, salt: string) {
    return createHash('sha256')
      .update(salt + code)
      .digest('hex');
  }

  private genSalt() {
    return randomBytes(16).toString('hex');
  }

  private now() {
    return Date.now();
  }

  async request(email: string, ip?: string) {
    const key = this.key(email);
    const now = this.now();
    const entry = await this.otpRepository.getByEmail(key);
    void ip;

    if (entry?.lockedUntil && entry.lockedUntil > now) {
      throw new TooManyRequestsException('Temporarily locked');
    }

    if (entry) {
      if (now - entry.sentCountWindow.windowStart > this.sendWindowMs) {
        entry.sentCountWindow = { windowStart: now, count: 0 };
      }
      if (entry.sentCountWindow.count >= this.sendMaxPerWindow) {
        throw new TooManyRequestsException('Too many requests');
      }
      entry.sentCountWindow.count += 1;
      entry.lastSentAt = now;
      await this.otpRepository.set(entry);
      return;
    }

    const initialEntry: OtpEntry = {
      email: key,
      hash: '',
      salt: '',
      exp: 0,
      attempts: 0,
      lastSentAt: now,
      sentCountWindow: { windowStart: now, count: 1 },
    };
    await this.otpRepository.set(initialEntry);
  }

  async set(email: string, code: string) {
    const key = this.key(email);
    const salt = this.genSalt();
    const hash = this.hash(code, salt);
    const now = this.now();
    const base = await this.otpRepository.getByEmail(key);

    const entry: OtpEntry = {
      email: key,
      hash,
      salt,
      exp: now + this.ttlMs,
      attempts: 0,
      lastSentAt: base?.lastSentAt ?? now,
      sentCountWindow: base?.sentCountWindow ?? { windowStart: now, count: 1 },
      lockedUntil: base?.lockedUntil,
    };

    await this.otpRepository.set(entry);
  }

  async verify(email: string, code: string) {
    const key = this.key(email);
    const now = this.now();
    const entry = await this.otpRepository.getByEmail(key);
    if (!entry) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    if (entry.lockedUntil && entry.lockedUntil > now) {
      throw new UnauthorizedException('Locked');
    }
    if (entry.exp < now) {
      await this.otpRepository.delete(key);
      throw new UnauthorizedException('Invalid or expired code');
    }

    const candidate = Buffer.from(this.hash(code, entry.salt));
    const actual = Buffer.from(entry.hash);
    const isValid =
      candidate.length === actual.length && timingSafeEqual(candidate, actual);

    if (!isValid) {
      entry.attempts += 1;
      if (entry.attempts >= this.verifyMaxAttempts) {
        entry.lockedUntil = now + this.lockMs;
      }
      await this.otpRepository.set(entry);
      throw new UnauthorizedException('Invalid or expired code');
    }

    await this.otpRepository.delete(key);
  }
}
