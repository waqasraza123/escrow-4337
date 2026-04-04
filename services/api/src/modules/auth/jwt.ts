import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import { AuthConfigService } from './auth.config';

type JwtPayload = {
  sub: string;
  email: string;
  sid: string;
  rid?: string;
  typ: 'access' | 'refresh';
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
    return await new SignJWT({
      sub: userId,
      email,
      sid,
      typ: 'access',
    } as JwtPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(this.config.jwtIssuer)
      .setAudience(this.config.jwtAudience)
      .setIssuedAt(now)
      .setExpirationTime(expirationTime)
      .sign(this.getSecret());
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
    return await new SignJWT({
      sub: userId,
      email,
      sid,
      rid: refreshTokenId,
      typ: 'refresh',
    } as JwtPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(this.config.jwtIssuer)
      .setAudience(this.config.jwtAudience)
      .setIssuedAt(now)
      .setExpirationTime(expirationTime)
      .sign(this.getSecret());
  }

  async verifyAccess(token: string): Promise<VerifyResult> {
    const { payload } = await jwtVerify(token, this.getSecret(), {
      issuer: this.config.jwtIssuer,
      audience: this.config.jwtAudience,
    });
    if (payload.typ !== 'access')
      throw new UnauthorizedException('Invalid token');
    return {
      userId: String(payload.sub),
      email: String(payload.email),
      sid: String(payload.sid),
    };
  }

  async verifyRefresh(token: string): Promise<VerifyResult> {
    const { payload } = await jwtVerify(token, this.getSecret(), {
      issuer: this.config.jwtIssuer,
      audience: this.config.jwtAudience,
    });
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

  private getSecret() {
    return new TextEncoder().encode(this.config.jwtSecret);
  }
}
