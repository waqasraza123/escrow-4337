import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SESSIONS_REPOSITORY } from '../../persistence/persistence.tokens';
import type { SessionsRepository } from '../../persistence/persistence.types';
import { AuthConfigService } from './auth.config';
import type { SessionRecord } from './auth.types';

@Injectable()
export class SessionsService {
  constructor(
    private readonly config: AuthConfigService,
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async create(userId: string, email: string) {
    const session: SessionRecord = {
      sid: crypto.randomUUID(),
      userId,
      email,
      exp: Date.now() + this.config.sessionTtlMs,
      revoked: false,
      refreshTokenId: crypto.randomUUID(),
    };

    return this.sessionsRepository.create(session);
  }

  async validate(sid: string) {
    const session = await this.sessionsRepository.getBySid(sid);
    if (!session || session.revoked || session.exp < Date.now()) {
      throw new UnauthorizedException('Invalid session');
    }
    return session;
  }

  async revoke(sid: string) {
    await this.sessionsRepository.revoke(sid);
  }

  async rotateRefreshToken(sid: string, refreshTokenId: string) {
    const session = await this.sessionsRepository.getBySid(sid);
    if (!session || session.revoked || session.exp < Date.now()) {
      throw new UnauthorizedException('Invalid session');
    }

    if (session.refreshTokenId !== refreshTokenId) {
      await this.sessionsRepository.revoke(sid);
      throw new UnauthorizedException('Invalid session');
    }

    const rotatedSession = await this.sessionsRepository.rotate(
      sid,
      refreshTokenId,
      crypto.randomUUID(),
    );
    if (!rotatedSession) {
      await this.sessionsRepository.revoke(sid);
      throw new UnauthorizedException('Invalid session');
    }

    return rotatedSession;
  }
}
