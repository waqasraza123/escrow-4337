import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AuthConfigService } from './auth.config';

type JwtPayload = {
  sub: string;
  email: string;
  sid: string;
  rid?: string;
  typ: 'access' | 'refresh';
  iss: string;
  aud: string;
  iat: number;
  exp: number;
};
type VerifyResult = {
  userId: string;
  email: string;
  sid: string;
  refreshTokenId?: string;
};

@Injectable()
export class JwtService {
  constructor(private readonly config: AuthConfigService) {}

  async signAccess(
    userId: string,
    email: string,
    sid: string,
    sessionExpiresAtMs?: number,
  ) {
    const now = Math.floor(Date.now() / 1000);
    const expirationTime = this.resolveExpirationTime(
      now,
      this.config.accessTtlSec,
      sessionExpiresAtMs,
    );
    return this.sign({
      sub: userId,
      email,
      sid,
      typ: 'access',
      iss: this.config.jwtIssuer,
      aud: this.config.jwtAudience,
      iat: now,
      exp: expirationTime,
    });
  }

  async signRefresh(
    userId: string,
    email: string,
    sid: string,
    refreshTokenId: string,
    sessionExpiresAtMs?: number,
  ) {
    const now = Math.floor(Date.now() / 1000);
    const expirationTime = this.resolveExpirationTime(
      now,
      this.config.refreshTtlSec,
      sessionExpiresAtMs,
    );
    return this.sign({
      sub: userId,
      email,
      sid,
      rid: refreshTokenId,
      typ: 'refresh',
      iss: this.config.jwtIssuer,
      aud: this.config.jwtAudience,
      iat: now,
      exp: expirationTime,
    });
  }

  async verifyAccess(token: string): Promise<VerifyResult> {
    const payload = this.verify(token);
    if (payload.typ !== 'access')
      throw new UnauthorizedException('Invalid token');
    return {
      userId: String(payload.sub),
      email: String(payload.email),
      sid: String(payload.sid),
    };
  }

  async verifyRefresh(token: string): Promise<VerifyResult> {
    const payload = this.verify(token);
    if (payload.typ !== 'refresh')
      throw new UnauthorizedException('Invalid token');
    return {
      userId: String(payload.sub),
      email: String(payload.email),
      sid: String(payload.sid),
      refreshTokenId: String(payload.rid ?? payload.sid),
    };
  }

  private resolveExpirationTime(
    issuedAtSec: number,
    ttlSec: number,
    sessionExpiresAtMs?: number,
  ) {
    if (sessionExpiresAtMs === undefined) {
      return issuedAtSec + ttlSec;
    }

    const sessionExpiresAtSec = Math.floor(sessionExpiresAtMs / 1000);
    return Math.min(issuedAtSec + ttlSec, sessionExpiresAtSec);
  }

  private sign(payload: JwtPayload) {
    const encodedHeader = this.encodeBase64Url(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    );
    const encodedPayload = this.encodeBase64Url(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = this.signInput(signingInput);
    return `${signingInput}.${signature}`;
  }

  private verify(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token');
    }

    const [encodedHeader, encodedPayload, signature] = parts as [
      string,
      string,
      string,
    ];
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    if (!this.isExpectedSignature(signature, this.signInput(signingInput))) {
      throw new UnauthorizedException('Invalid token');
    }

    const header = this.decodeJson(encodedHeader) as {
      alg?: unknown;
      typ?: unknown;
    };
    if (header.alg !== 'HS256') {
      throw new UnauthorizedException('Invalid token');
    }

    const payload = this.decodeJson(encodedPayload) as Partial<JwtPayload>;
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.sid !== 'string' ||
      (payload.rid !== undefined && typeof payload.rid !== 'string') ||
      (payload.typ !== 'access' && payload.typ !== 'refresh') ||
      payload.iss !== this.config.jwtIssuer ||
      payload.aud !== this.config.jwtAudience ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      throw new UnauthorizedException('Invalid token');
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Invalid token');
    }

    return payload as JwtPayload;
  }

  private signInput(signingInput: string) {
    return createHmac('sha256', this.config.jwtSecret)
      .update(signingInput)
      .digest('base64url');
  }

  private isExpectedSignature(actual: string, expected: string) {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    return (
      actualBuffer.byteLength === expectedBuffer.byteLength &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  private encodeBase64Url(value: string) {
    return Buffer.from(value, 'utf8').toString('base64url');
  }

  private decodeJson(value: string) {
    try {
      return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
