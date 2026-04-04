import type { OtpEntry, SessionRecord } from '../modules/auth/auth.types';
import type { EscrowJobRecord } from '../modules/escrow/escrow.types';
import type { UserRecord } from '../modules/users/users.types';
import type { WalletLinkChallengeRecord } from '../modules/wallet/wallet.types';

export interface UsersRepository {
  getByEmail(email: string): Promise<UserRecord | null>;
  getById(id: string): Promise<UserRecord | null>;
  getByWalletAddress(address: string): Promise<UserRecord | null>;
  create(user: UserRecord): Promise<UserRecord>;
  update(user: UserRecord): Promise<UserRecord>;
}

export interface OtpRepository {
  getByEmail(email: string): Promise<OtpEntry | null>;
  set(entry: OtpEntry): Promise<void>;
  delete(email: string): Promise<void>;
}

export interface SessionsRepository {
  create(session: SessionRecord): Promise<SessionRecord>;
  getBySid(sid: string): Promise<SessionRecord | null>;
  revoke(sid: string): Promise<void>;
  rotate(
    sid: string,
    currentRefreshTokenId: string,
    nextRefreshTokenId: string,
  ): Promise<SessionRecord | null>;
}

export interface EscrowRepository {
  create(job: EscrowJobRecord): Promise<void>;
  getById(jobId: string): Promise<EscrowJobRecord | null>;
  save(job: EscrowJobRecord): Promise<void>;
}

export interface WalletLinkChallengesRepository {
  create(challenge: WalletLinkChallengeRecord): Promise<void>;
  getById(challengeId: string): Promise<WalletLinkChallengeRecord | null>;
  recordFailedAttempt(challengeId: string, failedAt: number): Promise<void>;
  markConsumed(challengeId: string, consumedAt: number): Promise<void>;
}

export type PersistenceDriver = 'postgres' | 'file';

export type PersistenceFileData = {
  version: 6;
  users: Record<string, UserRecord>;
  otpEntries: Record<string, OtpEntry>;
  sessions: Record<string, SessionRecord>;
  escrowJobs: Record<string, EscrowJobRecord>;
  walletLinkChallenges: Record<string, WalletLinkChallengeRecord>;
};
