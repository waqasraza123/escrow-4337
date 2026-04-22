import type {
  OtpEntry,
  OtpRequestThrottleRecord,
  SessionRecord,
} from '../modules/auth/auth.types';
import type { EscrowJobRecord } from '../modules/escrow/escrow.types';
import type {
  OrganizationMembershipRecord,
  OrganizationInvitationRecord,
  OrganizationRecord,
  WorkspaceRecord,
} from '../modules/organizations/organizations.types';
import type {
  EscrowExecutionRecord,
  EscrowChainCursorRecord,
  EscrowChainEventRecord,
  EscrowOnchainProjectionRecord,
} from '../modules/escrow/escrow.types';
import type {
  MarketplaceApplicationRecord,
  MarketplaceApplicationRevisionRecord,
  MarketplaceApplicationDecisionRecord,
  MarketplaceAbuseReportRecord,
  MarketplaceContractDraftRecord,
  MarketplaceAutomationRuleRecord,
  MarketplaceIdentityRiskReviewRecord,
  MarketplaceInteractionEventRecord,
  MarketplaceInterviewMessageRecord,
  MarketplaceInterviewThreadRecord,
  MarketplaceOfferRecord,
  MarketplaceOpportunityInviteRecord,
  MarketplaceOpportunityRecord,
  MarketplaceProfileRecord,
  MarketplaceReviewRecord,
  MarketplaceSavedSearchRecord,
  MarketplaceTalentPoolMemberRecord,
  MarketplaceTalentPoolRecord,
  MarketplaceOpportunitySearchDocument,
  MarketplaceTalentSearchDocument,
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

export interface OrganizationsRepository {
  getOrganizationById(id: string): Promise<OrganizationRecord | null>;
  getOrganizationBySlug(slug: string): Promise<OrganizationRecord | null>;
  getInvitationById(id: string): Promise<OrganizationInvitationRecord | null>;
  listOrganizationsByUserId(userId: string): Promise<OrganizationRecord[]>;
  listMembershipsByUserId(
    userId: string,
  ): Promise<OrganizationMembershipRecord[]>;
  listMembershipsByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationMembershipRecord[]>;
  listInvitationsByUserEmail(
    email: string,
  ): Promise<OrganizationInvitationRecord[]>;
  listInvitationsByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationInvitationRecord[]>;
  listWorkspacesByUserId(userId: string): Promise<WorkspaceRecord[]>;
  listWorkspacesByOrganizationId(organizationId: string): Promise<WorkspaceRecord[]>;
  getWorkspaceById(id: string): Promise<WorkspaceRecord | null>;
  saveOrganization(organization: OrganizationRecord): Promise<void>;
  saveMembership(membership: OrganizationMembershipRecord): Promise<void>;
  saveInvitation(invitation: OrganizationInvitationRecord): Promise<void>;
  saveWorkspace(workspace: WorkspaceRecord): Promise<void>;
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
  findExecutionByIdempotencyKey(input: {
    idempotencyKey: string;
    jobId?: string;
  }): Promise<{
    job: EscrowJobRecord;
    execution: EscrowExecutionRecord;
  } | null>;
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
  saveOnchainProjection(
    projection: EscrowOnchainProjectionRecord,
  ): Promise<void>;
}

export interface MarketplaceRepository {
  getProfileByUserId(userId: string): Promise<MarketplaceProfileRecord | null>;
  getProfileBySlug(slug: string): Promise<MarketplaceProfileRecord | null>;
  listProfiles(): Promise<MarketplaceProfileRecord[]>;
  saveProfile(profile: MarketplaceProfileRecord): Promise<void>;
  listTalentSearchDocuments(): Promise<MarketplaceTalentSearchDocument[]>;
  saveTalentSearchDocument(
    document: MarketplaceTalentSearchDocument,
  ): Promise<void>;
  getOpportunityById(
    opportunityId: string,
  ): Promise<MarketplaceOpportunityRecord | null>;
  listOpportunities(): Promise<MarketplaceOpportunityRecord[]>;
  saveOpportunity(opportunity: MarketplaceOpportunityRecord): Promise<void>;
  listOpportunitySearchDocuments(): Promise<MarketplaceOpportunitySearchDocument[]>;
  saveOpportunitySearchDocument(
    document: MarketplaceOpportunitySearchDocument,
  ): Promise<void>;
  getApplicationById(
    applicationId: string,
  ): Promise<MarketplaceApplicationRecord | null>;
  listApplications(): Promise<MarketplaceApplicationRecord[]>;
  saveApplication(application: MarketplaceApplicationRecord): Promise<void>;
  getApplicationRevisionById(
    revisionId: string,
  ): Promise<MarketplaceApplicationRevisionRecord | null>;
  listApplicationRevisions(): Promise<MarketplaceApplicationRevisionRecord[]>;
  saveApplicationRevision(
    revision: MarketplaceApplicationRevisionRecord,
  ): Promise<void>;
  getInterviewThreadById(
    threadId: string,
  ): Promise<MarketplaceInterviewThreadRecord | null>;
  listInterviewThreads(): Promise<MarketplaceInterviewThreadRecord[]>;
  saveInterviewThread(thread: MarketplaceInterviewThreadRecord): Promise<void>;
  getInterviewMessageById(
    messageId: string,
  ): Promise<MarketplaceInterviewMessageRecord | null>;
  listInterviewMessages(): Promise<MarketplaceInterviewMessageRecord[]>;
  saveInterviewMessage(
    message: MarketplaceInterviewMessageRecord,
  ): Promise<void>;
  getOfferById(offerId: string): Promise<MarketplaceOfferRecord | null>;
  listOffers(): Promise<MarketplaceOfferRecord[]>;
  saveOffer(offer: MarketplaceOfferRecord): Promise<void>;
  getContractDraftById(
    draftId: string,
  ): Promise<MarketplaceContractDraftRecord | null>;
  getContractDraftByApplicationId(
    applicationId: string,
  ): Promise<MarketplaceContractDraftRecord | null>;
  listContractDrafts(): Promise<MarketplaceContractDraftRecord[]>;
  saveContractDraft(draft: MarketplaceContractDraftRecord): Promise<void>;
  getApplicationDecisionById(
    decisionId: string,
  ): Promise<MarketplaceApplicationDecisionRecord | null>;
  listApplicationDecisions(): Promise<MarketplaceApplicationDecisionRecord[]>;
  saveApplicationDecision(
    decision: MarketplaceApplicationDecisionRecord,
  ): Promise<void>;
  getSavedSearchById(
    searchId: string,
  ): Promise<MarketplaceSavedSearchRecord | null>;
  listSavedSearches(): Promise<MarketplaceSavedSearchRecord[]>;
  saveSavedSearch(search: MarketplaceSavedSearchRecord): Promise<void>;
  deleteSavedSearch(searchId: string): Promise<void>;
  getTalentPoolById(poolId: string): Promise<MarketplaceTalentPoolRecord | null>;
  listTalentPools(): Promise<MarketplaceTalentPoolRecord[]>;
  saveTalentPool(pool: MarketplaceTalentPoolRecord): Promise<void>;
  getTalentPoolMemberById(
    memberId: string,
  ): Promise<MarketplaceTalentPoolMemberRecord | null>;
  listTalentPoolMembers(): Promise<MarketplaceTalentPoolMemberRecord[]>;
  saveTalentPoolMember(member: MarketplaceTalentPoolMemberRecord): Promise<void>;
  getAutomationRuleById(
    ruleId: string,
  ): Promise<MarketplaceAutomationRuleRecord | null>;
  listAutomationRules(): Promise<MarketplaceAutomationRuleRecord[]>;
  saveAutomationRule(rule: MarketplaceAutomationRuleRecord): Promise<void>;
  getOpportunityInviteById(
    inviteId: string,
  ): Promise<MarketplaceOpportunityInviteRecord | null>;
  listOpportunityInvites(): Promise<MarketplaceOpportunityInviteRecord[]>;
  saveOpportunityInvite(invite: MarketplaceOpportunityInviteRecord): Promise<void>;
  getAbuseReportById(
    reportId: string,
  ): Promise<MarketplaceAbuseReportRecord | null>;
  listAbuseReports(): Promise<MarketplaceAbuseReportRecord[]>;
  saveAbuseReport(report: MarketplaceAbuseReportRecord): Promise<void>;
  getReviewById(reviewId: string): Promise<MarketplaceReviewRecord | null>;
  listReviews(): Promise<MarketplaceReviewRecord[]>;
  saveReview(review: MarketplaceReviewRecord): Promise<void>;
  getIdentityRiskReviewByUserId(
    userId: string,
  ): Promise<MarketplaceIdentityRiskReviewRecord | null>;
  listIdentityRiskReviews(): Promise<MarketplaceIdentityRiskReviewRecord[]>;
  saveIdentityRiskReview(
    review: MarketplaceIdentityRiskReviewRecord,
  ): Promise<void>;
  listInteractionEvents(): Promise<MarketplaceInteractionEventRecord[]>;
  saveInteractionEvent(event: MarketplaceInteractionEventRecord): Promise<void>;
}

export interface WalletLinkChallengesRepository {
  create(challenge: WalletLinkChallengeRecord): Promise<void>;
  getById(challengeId: string): Promise<WalletLinkChallengeRecord | null>;
  recordFailedAttempt(challengeId: string, failedAt: number): Promise<void>;
  markConsumed(challengeId: string, consumedAt: number): Promise<void>;
}

export type PersistenceDriver = 'postgres' | 'file';

export type PersistenceFileData = {
  version: 27;
  users: Record<string, UserRecord>;
  organizations: Record<string, OrganizationRecord>;
  organizationMemberships: Record<string, OrganizationMembershipRecord>;
  organizationInvitations: Record<string, OrganizationInvitationRecord>;
  workspaces: Record<string, WorkspaceRecord>;
  otpEntries: Record<string, OtpEntry>;
  otpRequestThrottles: Record<string, OtpRequestThrottleRecord>;
  sessions: Record<string, SessionRecord>;
  escrowJobs: Record<string, EscrowJobRecord>;
  escrowChainCursors: Record<string, EscrowChainCursorRecord>;
  escrowChainEvents: Record<string, EscrowChainEventRecord>;
  escrowOnchainProjections: Record<string, EscrowOnchainProjectionRecord>;
  marketplaceProfiles: Record<string, MarketplaceProfileRecord>;
  marketplaceTalentSearchDocuments: Record<string, MarketplaceTalentSearchDocument>;
  marketplaceOpportunities: Record<string, MarketplaceOpportunityRecord>;
  marketplaceOpportunitySearchDocuments: Record<
    string,
    MarketplaceOpportunitySearchDocument
  >;
  marketplaceApplications: Record<string, MarketplaceApplicationRecord>;
  marketplaceApplicationRevisions: Record<
    string,
    MarketplaceApplicationRevisionRecord
  >;
  marketplaceInterviewThreads: Record<string, MarketplaceInterviewThreadRecord>;
  marketplaceInterviewMessages: Record<
    string,
    MarketplaceInterviewMessageRecord
  >;
  marketplaceOffers: Record<string, MarketplaceOfferRecord>;
  marketplaceContractDrafts: Record<string, MarketplaceContractDraftRecord>;
  marketplaceApplicationDecisions: Record<
    string,
    MarketplaceApplicationDecisionRecord
  >;
  marketplaceSavedSearches: Record<string, MarketplaceSavedSearchRecord>;
  marketplaceTalentPools: Record<string, MarketplaceTalentPoolRecord>;
  marketplaceTalentPoolMembers: Record<string, MarketplaceTalentPoolMemberRecord>;
  marketplaceAutomationRules: Record<string, MarketplaceAutomationRuleRecord>;
  marketplaceOpportunityInvites: Record<string, MarketplaceOpportunityInviteRecord>;
  marketplaceAbuseReports: Record<string, MarketplaceAbuseReportRecord>;
  marketplaceReviews: Record<string, MarketplaceReviewRecord>;
  marketplaceIdentityRiskReviews: Record<string, MarketplaceIdentityRiskReviewRecord>;
  marketplaceInteractionEvents: Record<string, MarketplaceInteractionEventRecord>;
  walletLinkChallenges: Record<string, WalletLinkChallengeRecord>;
};
