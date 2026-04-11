import type {
  OtpEntry,
  OtpRequestThrottleRecord,
  SessionRecord,
} from '../../modules/auth/auth.types';
import type {
  EscrowChainSyncRecord,
  EscrowContractorParticipationRecord,
  EscrowFailureRemediationStatus,
  EscrowExecutionFailureWorkflowRecord,
  EscrowJobRecord,
  EscrowStaleWorkflowRecord,
} from '../../modules/escrow/escrow.types';
import type {
  EoaUserWalletRecord,
  SmartAccountUserWalletRecord,
  UserRecord,
  UserWalletRecord,
} from '../../modules/users/users.types';
import type { WalletLinkChallengeRecord } from '../../modules/wallet/wallet.types';
import type {
  EscrowRepository,
  OtpRepository,
  OtpRequestThrottlesRepository,
  SessionsRepository,
  UsersRepository,
  WalletLinkChallengesRepository,
} from '../persistence.types';
import { FilePersistenceStore } from './file-persistence.store';

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function normalizeFailureWorkflowStatus(
  status?: EscrowFailureRemediationStatus,
): EscrowFailureRemediationStatus {
  switch (status) {
    case 'blocked_external':
    case 'monitoring':
    case 'ready_to_retry':
      return status;
    case 'investigating':
    default:
      return 'investigating';
  }
}

function normalizeEscrowJobRecord(
  job:
    | EscrowJobRecord
    | (Omit<EscrowJobRecord, 'operations' | 'contractorParticipation'> & {
        contractorParticipation?: EscrowContractorParticipationRecord | null;
        operations?: {
          chainSync?: EscrowChainSyncRecord | null;
          executionFailureWorkflow?: EscrowExecutionFailureWorkflowRecord | null;
          staleWorkflow?: EscrowStaleWorkflowRecord | null;
        };
      }),
): EscrowJobRecord {
  return {
    ...job,
    contractorParticipation: job.contractorParticipation
      ? {
          contractorEmail: normalizeEmail(
            job.contractorParticipation.contractorEmail,
          ),
          status:
            job.contractorParticipation.status === 'joined'
              ? 'joined'
              : 'pending',
          joinedUserId: job.contractorParticipation.joinedUserId ?? null,
          joinedAt: job.contractorParticipation.joinedAt ?? null,
          invite: {
            token: job.contractorParticipation.invite?.token ?? null,
            tokenIssuedAt:
              job.contractorParticipation.invite?.tokenIssuedAt ?? null,
            lastSentAt: job.contractorParticipation.invite?.lastSentAt ?? null,
            lastSentMode:
              job.contractorParticipation.invite?.lastSentMode === 'email'
                ? 'email'
                : job.contractorParticipation.invite?.lastSentMode === 'manual'
                  ? 'manual'
                  : null,
          },
        }
      : null,
    operations: {
      chainSync: job.operations?.chainSync
        ? {
            ...job.operations.chainSync,
          }
        : null,
      executionFailureWorkflow: job.operations?.executionFailureWorkflow
        ? {
            ...job.operations.executionFailureWorkflow,
            status: normalizeFailureWorkflowStatus(
              job.operations.executionFailureWorkflow.status,
            ),
          }
        : null,
      staleWorkflow: job.operations?.staleWorkflow ?? null,
    },
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function throttleStorageKey(scope: string, key: string) {
  return `${scope}:${key.trim().toLowerCase()}`;
}

function normalizeSessionRecord(
  session:
    | SessionRecord
    | (Omit<SessionRecord, 'refreshTokenId'> & { refreshTokenId?: string }),
): SessionRecord {
  return {
    ...session,
    refreshTokenId: session.refreshTokenId ?? session.sid,
  };
}

function normalizeUserRecord(
  user:
    | UserRecord
    | (Omit<UserRecord, 'wallets' | 'defaultExecutionWalletAddress'> & {
        wallets?: UserRecord['wallets'];
        defaultExecutionWalletAddress?: string | null;
      }),
): UserRecord {
  const normalizedWallets = (user.wallets ?? []).map((wallet) =>
    normalizeUserWallet(wallet),
  );

  return {
    ...user,
    defaultExecutionWalletAddress: user.defaultExecutionWalletAddress ?? null,
    wallets: structuredClone(normalizedWallets),
  };
}

function normalizeUserWallet(
  wallet: Partial<UserWalletRecord>,
): UserWalletRecord {
  const createdAt = Number(wallet.createdAt ?? 0);
  const updatedAt = Number(wallet.updatedAt ?? createdAt);

  if (wallet.walletKind === 'smart_account') {
    const smartAccountWallet = wallet as Partial<SmartAccountUserWalletRecord>;
    return {
      address: String(smartAccountWallet.address),
      walletKind: 'smart_account',
      ownerAddress: String(smartAccountWallet.ownerAddress),
      recoveryAddress: String(
        smartAccountWallet.recoveryAddress ?? smartAccountWallet.ownerAddress,
      ),
      chainId: Number(smartAccountWallet.chainId),
      providerKind:
        smartAccountWallet.providerKind === 'relay' ? 'relay' : 'mock',
      entryPointAddress: String(smartAccountWallet.entryPointAddress),
      factoryAddress: String(smartAccountWallet.factoryAddress),
      sponsorshipPolicy:
        smartAccountWallet.sponsorshipPolicy === 'sponsored'
          ? 'sponsored'
          : 'disabled',
      provisionedAt: Number(smartAccountWallet.provisionedAt ?? createdAt),
      label:
        typeof smartAccountWallet.label === 'string'
          ? smartAccountWallet.label
          : undefined,
      createdAt,
      updatedAt,
    } satisfies SmartAccountUserWalletRecord;
  }

  const eoaWallet = wallet as Partial<EoaUserWalletRecord>;
  return {
    address: String(eoaWallet.address),
    walletKind: 'eoa',
    verificationMethod:
      eoaWallet.verificationMethod === 'siwe' ? 'siwe' : 'legacy_link',
    verificationChainId:
      typeof eoaWallet.verificationChainId === 'number'
        ? eoaWallet.verificationChainId
        : undefined,
    verifiedAt: Number(eoaWallet.verifiedAt ?? updatedAt),
    label: typeof eoaWallet.label === 'string' ? eoaWallet.label : undefined,
    createdAt,
    updatedAt,
  } satisfies EoaUserWalletRecord;
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

export class FileOtpRequestThrottlesRepository
  implements OtpRequestThrottlesRepository
{
  constructor(private readonly store: FilePersistenceStore) {}

  async get(scope: OtpRequestThrottleRecord['scope'], key: string) {
    const storageKey = throttleStorageKey(scope, key);
    return this.store.read((data) => {
      const record = data.otpRequestThrottles[storageKey];
      return record ? cloneValue(record) : null;
    });
  }

  async set(record: OtpRequestThrottleRecord) {
    const storageKey = throttleStorageKey(record.scope, record.key);
    await this.store.write((data) => {
      data.otpRequestThrottles[storageKey] = cloneValue(record);
    });
  }
}

export class FileSessionsRepository implements SessionsRepository {
  constructor(private readonly store: FilePersistenceStore) {}

  async create(session: SessionRecord) {
    return this.store.write((data) => {
      const normalizedSession = normalizeSessionRecord(session);
      data.sessions[session.sid] = cloneValue(normalizedSession);
      return cloneValue(normalizedSession);
    });
  }

  async getBySid(sid: string) {
    return this.store.read((data) => {
      const session = data.sessions[sid];
      return session ? normalizeSessionRecord(cloneValue(session)) : null;
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

  async rotate(
    sid: string,
    currentRefreshTokenId: string,
    nextRefreshTokenId: string,
  ) {
    return this.store.write((data) => {
      const session = data.sessions[sid];
      if (!session) {
        return null;
      }

      const normalizedSession = normalizeSessionRecord(session);
      if (
        normalizedSession.revoked ||
        normalizedSession.exp < Date.now() ||
        normalizedSession.refreshTokenId !== currentRefreshTokenId
      ) {
        return null;
      }

      const rotatedSession: SessionRecord = {
        ...normalizedSession,
        refreshTokenId: nextRefreshTokenId,
      };
      data.sessions[sid] = cloneValue(rotatedSession);
      return cloneValue(rotatedSession);
    });
  }
}

export class FileEscrowRepository implements EscrowRepository {
  constructor(private readonly store: FilePersistenceStore) {}

  async create(job: EscrowJobRecord) {
    await this.store.write((data) => {
      data.escrowJobs[job.id] = cloneValue(normalizeEscrowJobRecord(job));
    });
  }

  async getById(jobId: string) {
    return this.store.read((data) => {
      const job = data.escrowJobs[jobId];
      return job ? cloneValue(normalizeEscrowJobRecord(job)) : null;
    });
  }

  async listAll() {
    return this.store.read((data) =>
      Object.values(data.escrowJobs)
        .map((job) => cloneValue(normalizeEscrowJobRecord(job)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async listByParticipantAddresses(addresses: string[]) {
    const normalizedAddresses = new Set(addresses);

    return this.store.read((data) =>
      Object.values(data.escrowJobs)
        .filter(
          (job) =>
            normalizedAddresses.has(job.onchain.clientAddress) ||
            normalizedAddresses.has(job.onchain.workerAddress),
        )
        .map((job) => cloneValue(normalizeEscrowJobRecord(job)))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    );
  }

  async save(job: EscrowJobRecord) {
    await this.store.write((data) => {
      data.escrowJobs[job.id] = cloneValue(normalizeEscrowJobRecord(job));
    });
  }
}

export class FileWalletLinkChallengesRepository
  implements WalletLinkChallengesRepository
{
  constructor(private readonly store: FilePersistenceStore) {}

  async create(challenge: WalletLinkChallengeRecord) {
    await this.store.write((data) => {
      data.walletLinkChallenges[challenge.id] = cloneValue(challenge);
    });
  }

  async getById(challengeId: string) {
    return this.store.read((data) => {
      const challenge = data.walletLinkChallenges[challengeId];
      return challenge ? cloneValue(challenge) : null;
    });
  }

  async recordFailedAttempt(challengeId: string, failedAt: number) {
    await this.store.write((data) => {
      const challenge = data.walletLinkChallenges[challengeId];
      if (!challenge || challenge.consumedAt !== undefined) {
        return;
      }
      challenge.failedAttempts += 1;
      challenge.lastFailedAt = failedAt;
      data.walletLinkChallenges[challengeId] = challenge;
    });
  }

  async markConsumed(challengeId: string, consumedAt: number) {
    await this.store.write((data) => {
      const challenge = data.walletLinkChallenges[challengeId];
      if (!challenge) {
        return;
      }
      challenge.consumedAt = consumedAt;
      data.walletLinkChallenges[challengeId] = challenge;
    });
  }
}
