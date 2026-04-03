import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OtpStore } from './otp.store';
import { EmailService } from './email.service';
import { UsersService } from '../users/users.service';
import { JwtService } from './jwt';
import { SessionsService } from './sessions.service';
import { StartDto, VerifyDto, RefreshDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpStore,
    private readonly emailer: EmailService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly sessions: SessionsService,
  ) {}

  start(dto: StartDto, ip?: string) {
    const email = dto.email.trim().toLowerCase();
    this.otp.request(email, ip);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.otp.set(email, code);
    this.emailer.sendOtp(email, code);
    return { ok: true as const };
  }

  async verify(dto: VerifyDto) {
    const email = dto.email.trim().toLowerCase();
    this.otp.verify(email, dto.code);
    const user = this.users.getOrCreateByEmail(email);
    const session = this.sessions.create(user.id, user.email);
    const accessToken = await this.jwt.signAccess(
      user.id,
      user.email,
      session.sid,
    );
    const refreshToken = await this.jwt.signRefresh(
      user.id,
      user.email,
      session.sid,
    );
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, shariahMode: user.shariahMode },
    };
  }

  async refresh(dto: RefreshDto) {
    const { userId, email, sid } = await this.jwt.verifyRefresh(
      dto.refreshToken,
    );
    this.sessions.validate(sid);
    const accessToken = await this.jwt.signAccess(userId, email, sid);
    const newRefresh = await this.jwt.signRefresh(userId, email, sid);
    return { accessToken, refreshToken: newRefresh };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return { ok: true as const };
    try {
      const { sid } = await this.jwt.verifyRefresh(refreshToken);
      this.sessions.revoke(sid);
    } catch {
      return { ok: true as const };
    }
    return { ok: true as const };
  }

  me(userId: string) {
    const u = this.users.getById(userId);
    if (!u) throw new UnauthorizedException('Not found');
    return { id: u.id, email: u.email, shariahMode: u.shariahMode };
  }

  setShariah(userId: string, value: boolean) {
    const u = this.users.setShariahMode(userId, value);
    if (!u) throw new UnauthorizedException('Not found');
    return { id: u.id, email: u.email, shariahMode: u.shariahMode };
  }
}
