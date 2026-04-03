import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomBytes, timingSafeEqual, createHash } from 'crypto';

class TooManyRequestsException extends HttpException {
  constructor(message = 'Too many requests') {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

type Entry = {
  hash: string;
  salt: string;
  exp: number;
  email: string;
  attempts: number;
  lockedUntil?: number;
  lastSentAt: number;
  sentCountWindow: { windowStart: number; count: number };
};

@Injectable()
export class OtpStore {
  private readonly codes = new Map<string, Entry>();
  private readonly ttlMs = 10 * 60 * 1000;
  private readonly verifyMaxAttempts = 5;
  private readonly lockMs = 10 * 60 * 1000;
  private readonly sendWindowMs = 60 * 60 * 1000;
  private readonly sendMaxPerWindow = 5;

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

  request(email: string, ip?: string) {
    const key = this.key(email);
    const now = this.now();
    const e = this.codes.get(key);
    console.log(ip);

    if (e?.lockedUntil && e.lockedUntil > now)
      throw new TooManyRequestsException('Temporarily locked');

    if (e) {
      if (now - e.sentCountWindow.windowStart > this.sendWindowMs) {
        e.sentCountWindow = { windowStart: now, count: 0 };
      }
      if (e.sentCountWindow.count >= this.sendMaxPerWindow)
        throw new TooManyRequestsException('Too many requests');
      e.sentCountWindow.count += 1;
      e.lastSentAt = now;
      this.codes.set(key, e);
    } else {
      this.codes.set(key, {
        email: key,
        hash: '',
        salt: '',
        exp: 0,
        attempts: 0,
        lastSentAt: now,
        sentCountWindow: { windowStart: now, count: 1 },
      });
    }
  }

  set(email: string, code: string) {
    const key = this.key(email);
    const salt = this.genSalt();
    const hash = this.hash(code, salt);
    const now = this.now();
    const base = this.codes.get(key);
    const entry: Entry = {
      email: key,
      hash,
      salt,
      exp: now + this.ttlMs,
      attempts: 0,
      lastSentAt: base?.lastSentAt ?? now,
      sentCountWindow: base?.sentCountWindow ?? { windowStart: now, count: 1 },
      lockedUntil: base?.lockedUntil,
    };
    this.codes.set(key, entry);
  }

  verify(email: string, code: string) {
    const key = this.key(email);
    const now = this.now();
    const e = this.codes.get(key);
    if (!e) throw new UnauthorizedException('Invalid or expired code');
    if (e.lockedUntil && e.lockedUntil > now)
      throw new UnauthorizedException('Locked');
    if (e.exp < now) {
      this.codes.delete(key);
      throw new UnauthorizedException('Invalid or expired code');
    }
    const candidate = Buffer.from(this.hash(code, e.salt));
    const actual = Buffer.from(e.hash);
    const ok =
      candidate.length === actual.length && timingSafeEqual(candidate, actual);
    if (!ok) {
      e.attempts += 1;
      if (e.attempts >= this.verifyMaxAttempts) {
        e.lockedUntil = now + this.lockMs;
      }
      this.codes.set(key, e);
      throw new UnauthorizedException('Invalid or expired code');
    }
    this.codes.delete(key);
  }
}
