import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OrganizationsService } from '../organizations/organizations.service';
import { UserCapabilitiesService } from '../users/user-capabilities.service';
import { UsersService } from '../users/users.service';
import { toUserProfile } from '../users/users.types';
import { RefreshDto, StartDto, VerifyDto } from './auth.dto';
import { EmailService } from './email.service';
import { JwtService } from './jwt';
import { OtpStore } from './otp.store';
import { SessionsService } from './sessions.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpStore,
    private readonly emailer: EmailService,
    private readonly users: UsersService,
    private readonly organizations: OrganizationsService,
    private readonly userCapabilities: UserCapabilitiesService,
    private readonly jwt: JwtService,
    private readonly sessions: SessionsService,
  ) {}

  async start(dto: StartDto, ip?: string) {
    const email = dto.email.trim().toLowerCase();
    await this.otp.request(email, ip);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.otp.set(email, code);
    try {
      await this.emailer.sendOtp(email, code);
      return { ok: true as const };
    } catch (error) {
      await this.otp.clear(email);
      throw error;
    }
  }

  async verify(dto: VerifyDto) {
    const email = dto.email.trim().toLowerCase();
    await this.otp.verify(email, dto.code);
    const user = await this.users.getOrCreateByEmail(email);
    const session = await this.sessions.create(user.id, user.email);
    const accessToken = await this.jwt.signAccess(
      user.id,
      user.email,
      session.sid,
      session.exp,
    );
    const refreshToken = await this.jwt.signRefresh(
      user.id,
      user.email,
      session.sid,
      session.refreshTokenId,
      session.exp,
    );
    const workspaceContext =
      await this.organizations.buildWorkspaceContextForUser(user);

    return {
      accessToken,
      refreshToken,
      user: toUserProfile(
        workspaceContext.user,
        this.userCapabilities.buildCapabilities(workspaceContext.user),
        workspaceContext,
      ),
    };
  }

  async refresh(dto: RefreshDto) {
    const { userId, email, sid, refreshTokenId } = await this.jwt.verifyRefresh(
      dto.refreshToken,
    );
    const session = await this.sessions.rotateRefreshToken(
      sid,
      String(refreshTokenId),
    );
    const accessToken = await this.jwt.signAccess(
      userId,
      email,
      sid,
      session.exp,
    );
    const newRefresh = await this.jwt.signRefresh(
      userId,
      email,
      sid,
      session.refreshTokenId,
      session.exp,
    );
    return { accessToken, refreshToken: newRefresh };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return { ok: true as const };
    }
    try {
      const { sid } = await this.jwt.verifyRefresh(refreshToken);
      await this.sessions.revoke(sid);
    } catch {
      return { ok: true as const };
    }
    return { ok: true as const };
  }

  async me(userId: string) {
    const user = await this.users.getById(userId);
    if (!user) {
      throw new UnauthorizedException('Not found');
    }
    const workspaceContext = await this.organizations.buildWorkspaceContextForUser(user);
    return toUserProfile(
      workspaceContext.user,
      this.userCapabilities.buildCapabilities(workspaceContext.user),
      workspaceContext,
    );
  }

  async setShariah(userId: string, value: boolean) {
    const user = await this.users.setShariahMode(userId, value);
    if (!user) {
      throw new UnauthorizedException('Not found');
    }
    const workspaceContext = await this.organizations.buildWorkspaceContextForUser(user);
    return toUserProfile(
      workspaceContext.user,
      this.userCapabilities.buildCapabilities(workspaceContext.user),
      workspaceContext,
    );
  }
}
