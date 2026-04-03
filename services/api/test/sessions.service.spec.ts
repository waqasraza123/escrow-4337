import { UnauthorizedException } from '@nestjs/common';
import { SessionsService } from '../src/modules/auth/sessions.service';

describe('SessionsService', () => {
  let sessionsService: SessionsService;
  let currentTime: number;

  beforeEach(() => {
    sessionsService = new SessionsService();
    currentTime = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates and validates an active session', () => {
    const session = sessionsService.create('user-1', 'user@example.com');

    expect(sessionsService.validate(session.sid)).toEqual(session);
  });

  it('rejects revoked sessions', () => {
    const session = sessionsService.create('user-1', 'user@example.com');

    sessionsService.revoke(session.sid);

    expect(() => sessionsService.validate(session.sid)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects expired sessions', () => {
    const session = sessionsService.create('user-1', 'user@example.com');

    currentTime += 14 * 24 * 60 * 60 * 1000 + 1;

    expect(() => sessionsService.validate(session.sid)).toThrow(
      UnauthorizedException,
    );
  });

  it('ignores revocation of unknown session ids', () => {
    expect(() => sessionsService.revoke('missing-session')).not.toThrow();
  });
});
