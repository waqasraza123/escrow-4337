import { Injectable, UnauthorizedException } from '@nestjs/common';

type Session = {
  sid: string;
  userId: string;
  email: string;
  exp: number;
  revoked: boolean;
};

@Injectable()
export class SessionsService {
  private readonly store = new Map<string, Session>();
  private readonly ttlMs = 14 * 24 * 60 * 60 * 1000;

  create(userId: string, email: string) {
    const sid = crypto.randomUUID();
    const exp = Date.now() + this.ttlMs;
    const s: Session = { sid, userId, email, exp, revoked: false };
    this.store.set(sid, s);
    return s;
  }

  validate(sid: string) {
    const s = this.store.get(sid);
    if (!s || s.revoked || s.exp < Date.now())
      throw new UnauthorizedException('Invalid session');
    return s;
  }

  revoke(sid: string) {
    const s = this.store.get(sid);
    if (s) {
      s.revoked = true;
      this.store.set(sid, s);
    }
  }
}
