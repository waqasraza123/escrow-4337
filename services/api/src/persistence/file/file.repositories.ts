import type { OtpEntry, SessionRecord } from '../../modules/auth/auth.types';
import type { EscrowJobRecord } from '../../modules/escrow/escrow.types';
import type { UserRecord } from '../../modules/users/users.types';
import type {
  EscrowRepository,
  OtpRepository,
  SessionsRepository,
  UsersRepository,
} from '../persistence.types';
import { FilePersistenceStore } from './file-persistence.store';

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUserRecord(
  user:
    | UserRecord
    | (Omit<UserRecord, 'wallets' | 'defaultExecutionWalletAddress'> & {
        wallets?: UserRecord['wallets'];
        defaultExecutionWalletAddress?: string | null;
      }),
): UserRecord {
  return {
    ...user,
    defaultExecutionWalletAddress: user.defaultExecutionWalletAddress ?? null,
    wallets: structuredClone(user.wallets ?? []),
  };
}

export class FileUsersRepository implements UsersRepository {
  constructor(private readonly store: FilePersistenceStore) {}

  async getByEmail(email: string) {
    const normalizedEmail = normalizeEmail(email);
    return this.store.read((data) => {
      const user = Object.values(data.users).find(
        (candidate) => candidate.email === normalizedEmail,
      );
      return user ? normalizeUserRecord(cloneValue(user)) : null;
    });
  }

  async getById(id: string) {
    return this.store.read((data) => {
      const user = data.users[id];
      return user ? normalizeUserRecord(cloneValue(user)) : null;
    });
  }

  async getByWalletAddress(address: string) {
    return this.store.read((data) => {
      const user = Object.values(data.users).find((candidate) =>
        normalizeUserRecord(candidate).wallets.some(
          (wallet) => wallet.address === address,
        ),
      );
      return user ? normalizeUserRecord(cloneValue(user)) : null;
    });
  }

  async create(user: UserRecord) {
    return this.store.write((data) => {
      const normalizedUser = normalizeUserRecord(user);
      data.users[user.id] = cloneValue(normalizedUser);
      return cloneValue(normalizedUser);
    });
  }

  async update(user: UserRecord) {
    return this.store.write((data) => {
      const normalizedUser = normalizeUserRecord(user);
      data.users[user.id] = cloneValue(normalizedUser);
      return cloneValue(normalizedUser);
    });
  }
}

export class FileOtpRepository implements OtpRepository {
  constructor(private readonly store: FilePersistenceStore) {}

  async getByEmail(email: string) {
    const normalizedEmail = normalizeEmail(email);
    return this.store.read((data) => {
      const entry = data.otpEntries[normalizedEmail];
      return entry ? cloneValue(entry) : null;
    });
  }

  async set(entry: OtpEntry) {
    await this.store.write((data) => {
      data.otpEntries[normalizeEmail(entry.email)] = cloneValue(entry);
    });
  }

  async delete(email: string) {
    const normalizedEmail = normalizeEmail(email);
    await this.store.write((data) => {
      delete data.otpEntries[normalizedEmail];
    });
  }
}

export class FileSessionsRepository implements SessionsRepository {
  constructor(private readonly store: FilePersistenceStore) {}

  async create(session: SessionRecord) {
    return this.store.write((data) => {
      data.sessions[session.sid] = cloneValue(session);
      return cloneValue(session);
    });
  }

  async getBySid(sid: string) {
    return this.store.read((data) => {
      const session = data.sessions[sid];
      return session ? cloneValue(session) : null;
    });
  }

  async revoke(sid: string) {
    await this.store.write((data) => {
      const session = data.sessions[sid];
      if (!session) {
        return;
      }
      session.revoked = true;
      data.sessions[sid] = session;
    });
  }
}

export class FileEscrowRepository implements EscrowRepository {
  constructor(private readonly store: FilePersistenceStore) {}

  async create(job: EscrowJobRecord) {
    await this.store.write((data) => {
      data.escrowJobs[job.id] = cloneValue(job);
    });
  }

  async getById(jobId: string) {
    return this.store.read((data) => {
      const job = data.escrowJobs[jobId];
      return job ? cloneValue(job) : null;
    });
  }

  async save(job: EscrowJobRecord) {
    await this.store.write((data) => {
      data.escrowJobs[job.id] = cloneValue(job);
    });
  }
}
