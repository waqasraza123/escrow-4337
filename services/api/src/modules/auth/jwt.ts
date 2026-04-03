import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';

type JwtPayload = {
  sub: string;
  email: string;
  sid: string;
  typ: 'access' | 'refresh';
};
type VerifyResult = { userId: string; email: string; sid: string };

@Injectable()
export class JwtService {
  private readonly secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'dev_secret_change_me',
  );
  private readonly issuer = process.env.JWT_ISSUER || 'escrow4337';
  private readonly audience = process.env.JWT_AUDIENCE || 'escrow4337:web';
  private readonly accessTtlSec = parseInt(
    process.env.JWT_ACCESS_TTL_SEC || '900',
    10,
  );
  private readonly refreshTtlSec = parseInt(
    process.env.JWT_REFRESH_TTL_SEC || '1209600',
    10,
  );

  async signAccess(userId: string, email: string, sid: string) {
    const now = Math.floor(Date.now() / 1000);
    return await new SignJWT({
      sub: userId,
      email,
      sid,
      typ: 'access',
    } as JwtPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setIssuedAt(now)
      .setExpirationTime(now + this.accessTtlSec)
      .sign(this.secret);
  }

  async signRefresh(userId: string, email: string, sid: string) {
    const now = Math.floor(Date.now() / 1000);
    return await new SignJWT({
      sub: userId,
      email,
      sid,
      typ: 'refresh',
    } as JwtPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setIssuedAt(now)
      .setExpirationTime(now + this.refreshTtlSec)
      .sign(this.secret);
  }

  async verifyAccess(token: string): Promise<VerifyResult> {
    const { payload } = await jwtVerify(token, this.secret, {
      issuer: this.issuer,
      audience: this.audience,
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
    const { payload } = await jwtVerify(token, this.secret, {
      issuer: this.issuer,
      audience: this.audience,
    });
    if (payload.typ !== 'refresh')
      throw new UnauthorizedException('Invalid token');
    return {
      userId: String(payload.sub),
      email: String(payload.email),
      sid: String(payload.sid),
    };
  }
}
