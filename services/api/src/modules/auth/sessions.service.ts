import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SESSIONS_REPOSITORY } from '../../persistence/persistence.tokens';
import type { SessionsRepository } from '../../persistence/persistence.types';
import type { SessionRecord } from './auth.types';

@Injectable()
export class SessionsService {
  private readonly ttlMs = 14 * 24 * 60 * 60 * 1000;

  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async create(userId: string, email: string) {
    const session: SessionRecord = {
      sid: crypto.randomUUID(),
      userId,
      email,
      exp: Date.now() + this.ttlMs,
      revoked: false,
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
}
