import type {
  OtpEntry,
  OtpRequestThrottleRecord,
  SessionRecord,
} from '../modules/auth/auth.types';
import type { EscrowJobRecord } from '../modules/escrow/escrow.types';
import type {
  EscrowChainCursorRecord,
  EscrowChainEventRecord,
  EscrowOnchainProjectionRecord,
} from '../modules/escrow/escrow.types';
import type {
  MarketplaceApplicationRecord,
  MarketplaceOpportunityRecord,
  MarketplaceProfileRecord,
} from '../modules/marketplace/marketplace.types';
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

export interface OtpRequestThrottlesRepository {
  get(
    scope: OtpRequestThrottleRecord['scope'],
    key: string,
  ): Promise<OtpRequestThrottleRecord | null>;
  set(record: OtpRequestThrottleRecord): Promise<void>;
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
  listAll(): Promise<EscrowJobRecord[]>;
  listByParticipantAddresses(addresses: string[]): Promise<EscrowJobRecord[]>;
  save(job: EscrowJobRecord): Promise<void>;
  getChainCursor(input: {
    chainId: number;
    contractAddress: string;
    streamName: EscrowChainCursorRecord['streamName'];
  }): Promise<EscrowChainCursorRecord | null>;
  saveChainCursor(cursor: EscrowChainCursorRecord): Promise<void>;
  upsertChainEvents(events: EscrowChainEventRecord[]): Promise<void>;
  replaceChainEventsInRange(input: {
    chainId: number;
    contractAddress: string;
    fromBlock: number;
    toBlock: number;
    events: EscrowChainEventRecord[];
  }): Promise<void>;
  listChainEvents(input: {
    chainId: number;
    contractAddress: string;
    escrowId?: string;
    fromBlock?: number;
    toBlock?: number;
  }): Promise<EscrowChainEventRecord[]>;
  getOnchainProjection(
    jobId: string,
  ): Promise<EscrowOnchainProjectionRecord | null>;
  listOnchainProjections(
    jobIds?: string[],
  ): Promise<EscrowOnchainProjectionRecord[]>;
  saveOnchainProjection(projection: EscrowOnchainProjectionRecord): Promise<void>;
}

export interface MarketplaceRepository {
  getProfileByUserId(userId: string): Promise<MarketplaceProfileRecord | null>;
  getProfileBySlug(slug: string): Promise<MarketplaceProfileRecord | null>;
  listProfiles(): Promise<MarketplaceProfileRecord[]>;
  saveProfile(profile: MarketplaceProfileRecord): Promise<void>;
  getOpportunityById(
    opportunityId: string,
  ): Promise<MarketplaceOpportunityRecord | null>;
  listOpportunities(): Promise<MarketplaceOpportunityRecord[]>;
  saveOpportunity(opportunity: MarketplaceOpportunityRecord): Promise<void>;
  getApplicationById(
    applicationId: string,
  ): Promise<MarketplaceApplicationRecord | null>;
  listApplications(): Promise<MarketplaceApplicationRecord[]>;
  saveApplication(application: MarketplaceApplicationRecord): Promise<void>;
}

export interface WalletLinkChallengesRepository {
  create(challenge: WalletLinkChallengeRecord): Promise<void>;
  getById(challengeId: string): Promise<WalletLinkChallengeRecord | null>;
  recordFailedAttempt(challengeId: string, failedAt: number): Promise<void>;
  markConsumed(challengeId: string, consumedAt: number): Promise<void>;
}

export type PersistenceDriver = 'postgres' | 'file';

export type PersistenceFileData = {
  version: 13;
  users: Record<string, UserRecord>;
  otpEntries: Record<string, OtpEntry>;
  otpRequestThrottles: Record<string, OtpRequestThrottleRecord>;
  sessions: Record<string, SessionRecord>;
  escrowJobs: Record<string, EscrowJobRecord>;
  escrowChainCursors: Record<string, EscrowChainCursorRecord>;
  escrowChainEvents: Record<string, EscrowChainEventRecord>;
  escrowOnchainProjections: Record<string, EscrowOnchainProjectionRecord>;
  marketplaceProfiles: Record<string, MarketplaceProfileRecord>;
  marketplaceOpportunities: Record<string, MarketplaceOpportunityRecord>;
  marketplaceApplications: Record<string, MarketplaceApplicationRecord>;
  walletLinkChallenges: Record<string, WalletLinkChallengeRecord>;
};
