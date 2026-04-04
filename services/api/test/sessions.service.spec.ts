import { UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { SessionsService } from '../src/modules/auth/sessions.service';
import { PersistenceModule } from '../src/persistence/persistence.module';
import { configureFilePersistence } from './support/test-persistence';

describe('SessionsService', () => {
  let sessionsService: SessionsService;
  let moduleRef: TestingModule;
  let cleanupPersistence: (() => void) | undefined;
  let currentTime: number;

  beforeEach(async () => {
    const persistence = configureFilePersistence();
    cleanupPersistence = persistence.cleanup;
    currentTime = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
    moduleRef = await Test.createTestingModule({
      imports: [PersistenceModule],
      providers: [SessionsService],
    }).compile();
    sessionsService = moduleRef.get(SessionsService);
  });

  afterEach(async () => {
    await moduleRef.close();
    cleanupPersistence?.();
    cleanupPersistence = undefined;
    jest.restoreAllMocks();
  });

  it('creates and validates an active session', async () => {
    const session = await sessionsService.create('user-1', 'user@example.com');

    await expect(sessionsService.validate(session.sid)).resolves.toEqual(
      session,
    );
  });

  it('rejects revoked sessions', async () => {
    const session = await sessionsService.create('user-1', 'user@example.com');

    await sessionsService.revoke(session.sid);

    await expect(sessionsService.validate(session.sid)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects expired sessions', async () => {
    const session = await sessionsService.create('user-1', 'user@example.com');

    currentTime += 14 * 24 * 60 * 60 * 1000 + 1;

    await expect(sessionsService.validate(session.sid)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('ignores revocation of unknown session ids', async () => {
    await expect(
      sessionsService.revoke('missing-session'),
    ).resolves.toBeUndefined();
  });

  it('rotates refresh tokens for an active session', async () => {
    const session = await sessionsService.create('user-1', 'user@example.com');

    const rotatedSession = await sessionsService.rotateRefreshToken(
      session.sid,
      session.refreshTokenId,
    );

    expect(rotatedSession.refreshTokenId).not.toBe(session.refreshTokenId);
    await expect(sessionsService.validate(session.sid)).resolves.toEqual(
      rotatedSession,
    );
  });

  it('revokes the session when an old refresh token is replayed', async () => {
    const session = await sessionsService.create('user-1', 'user@example.com');
    const rotatedSession = await sessionsService.rotateRefreshToken(
      session.sid,
      session.refreshTokenId,
    );

    await expect(
      sessionsService.rotateRefreshToken(session.sid, session.refreshTokenId),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      sessionsService.rotateRefreshToken(
        rotatedSession.sid,
        rotatedSession.refreshTokenId,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
