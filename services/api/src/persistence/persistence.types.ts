import type { OtpEntry, SessionRecord } from '../modules/auth/auth.types';
import type { EscrowJobRecord } from '../modules/escrow/escrow.types';
import type { UserRecord } from '../modules/users/users.types';

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
}

export interface EscrowRepository {
  create(job: EscrowJobRecord): Promise<void>;
  getById(jobId: string): Promise<EscrowJobRecord | null>;
  save(job: EscrowJobRecord): Promise<void>;
}

export type PersistenceDriver = 'postgres' | 'file';

export type PersistenceFileData = {
  version: 3;
  users: Record<string, UserRecord>;
  otpEntries: Record<string, OtpEntry>;
  sessions: Record<string, SessionRecord>;
  escrowJobs: Record<string, EscrowJobRecord>;
};
