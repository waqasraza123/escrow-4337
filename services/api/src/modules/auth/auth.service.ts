import { Injectable, UnauthorizedException } from '@nestjs/common';

type StartDto = { email: string };
type VerifyDto = { email: string; code: string };

type StartResult = { ok: true };
type VerifyResult = { token: string };

@Injectable()
export class AuthService {
  private readonly ttl = 10 * 60 * 1000;
  private readonly codes = new Map<string, { code: string; exp: number }>();

  start({ email }: StartDto): StartResult {
    const key = email.trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.codes.set(key, { code, exp: Date.now() + this.ttl });
    return { ok: true };
  }

  verify({ email, code }: VerifyDto): VerifyResult {
    const key = email.trim().toLowerCase();
    const entry = this.codes.get(key);
    if (!entry || entry.exp < Date.now() || entry.code !== code) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    this.codes.delete(key);
    return { token: 'JWT_PLACEHOLDER' };
  }
}
