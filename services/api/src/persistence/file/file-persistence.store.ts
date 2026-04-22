import { mkdir, readFile, rename, stat, writeFile } from 'fs/promises';
import { Injectable } from '@nestjs/common';
import { dirname } from 'path';
import type { PersistenceFileData } from '../persistence.types';
import { PersistenceConfigService } from '../persistence.config';

function createInitialData(): PersistenceFileData {
  return {
    version: 31,
    users: {},
    organizations: {},
    organizationMemberships: {},
    organizationInvitations: {},
    workspaces: {},
    otpEntries: {},
    otpRequestThrottles: {},
    sessions: {},
    escrowJobs: {},
    escrowChainCursors: {},
    escrowChainEvents: {},
    escrowOnchainProjections: {},
    marketplaceProfiles: {},
    marketplaceTalentSearchDocuments: {},
    marketplaceOpportunities: {},
    marketplaceOpportunitySearchDocuments: {},
    marketplaceApplications: {},
    marketplaceApplicationRevisions: {},
    marketplaceInterviewThreads: {},
    marketplaceInterviewMessages: {},
    marketplaceOffers: {},
    marketplaceContractDrafts: {},
    marketplaceApplicationDecisions: {},
    marketplaceSavedSearches: {},
    marketplaceTalentPools: {},
    marketplaceTalentPoolMembers: {},
    marketplaceAutomationRules: {},
    marketplaceAutomationRuns: {},
    marketplaceNotifications: {},
    marketplaceNotificationPreferences: {},
    marketplaceDigests: {},
    marketplaceDigestDispatchRuns: {},
    marketplaceOpportunityInvites: {},
    marketplaceAbuseReports: {},
    marketplaceReviews: {},
    marketplaceIdentityRiskReviews: {},
    marketplaceInteractionEvents: {},
    walletLinkChallenges: {},
  };
}

@Injectable()
export class FilePersistenceStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly config: PersistenceConfigService) {}

  async read<T>(reader: (data: PersistenceFileData) => T | Promise<T>) {
    return this.withLock(async () => reader(await this.load()));
  }

  async write<T>(writer: (data: PersistenceFileData) => T | Promise<T>) {
    return this.withLock(async () => {
      const data = await this.load();
      const result = await writer(data);
      await this.persist(data);
      return result;
    });
  }

  private async withLock<T>(task: () => Promise<T>) {
    const run = this.queue.then(task, task);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async load(): Promise<PersistenceFileData> {
    const filePath = this.config.filePath;

    try {
      await stat(filePath);
    } catch {
      return createInitialData();
    }

    let raw: string;
    try {
      raw = await readFile(filePath, 'utf8');
    } catch {
      return createInitialData();
    }

    const parsed = JSON.parse(raw) as Partial<PersistenceFileData>;

    return {
      version: 31,
      users: parsed.users ?? {},
      organizations: parsed.organizations ?? {},
      organizationMemberships: parsed.organizationMemberships ?? {},
      organizationInvitations: parsed.organizationInvitations ?? {},
      workspaces: parsed.workspaces ?? {},
      otpEntries: parsed.otpEntries ?? {},
      otpRequestThrottles: parsed.otpRequestThrottles ?? {},
      sessions: parsed.sessions ?? {},
      escrowJobs: parsed.escrowJobs ?? {},
      escrowChainCursors: parsed.escrowChainCursors ?? {},
      escrowChainEvents: parsed.escrowChainEvents ?? {},
      escrowOnchainProjections: parsed.escrowOnchainProjections ?? {},
      marketplaceProfiles: parsed.marketplaceProfiles ?? {},
      marketplaceTalentSearchDocuments:
        parsed.marketplaceTalentSearchDocuments ?? {},
      marketplaceOpportunities: parsed.marketplaceOpportunities ?? {},
      marketplaceOpportunitySearchDocuments:
        parsed.marketplaceOpportunitySearchDocuments ?? {},
      marketplaceApplications: parsed.marketplaceApplications ?? {},
      marketplaceApplicationRevisions:
        parsed.marketplaceApplicationRevisions ?? {},
      marketplaceInterviewThreads: parsed.marketplaceInterviewThreads ?? {},
      marketplaceInterviewMessages: parsed.marketplaceInterviewMessages ?? {},
      marketplaceOffers: parsed.marketplaceOffers ?? {},
      marketplaceContractDrafts: parsed.marketplaceContractDrafts ?? {},
      marketplaceApplicationDecisions:
        parsed.marketplaceApplicationDecisions ?? {},
      marketplaceSavedSearches: parsed.marketplaceSavedSearches ?? {},
      marketplaceTalentPools: parsed.marketplaceTalentPools ?? {},
      marketplaceTalentPoolMembers: parsed.marketplaceTalentPoolMembers ?? {},
      marketplaceAutomationRules: parsed.marketplaceAutomationRules ?? {},
      marketplaceAutomationRuns: parsed.marketplaceAutomationRuns ?? {},
      marketplaceNotifications: parsed.marketplaceNotifications ?? {},
      marketplaceNotificationPreferences:
        parsed.marketplaceNotificationPreferences ?? {},
      marketplaceDigests: parsed.marketplaceDigests ?? {},
      marketplaceDigestDispatchRuns: parsed.marketplaceDigestDispatchRuns ?? {},
      marketplaceOpportunityInvites: parsed.marketplaceOpportunityInvites ?? {},
      marketplaceAbuseReports: parsed.marketplaceAbuseReports ?? {},
      marketplaceReviews: parsed.marketplaceReviews ?? {},
      marketplaceIdentityRiskReviews:
        parsed.marketplaceIdentityRiskReviews ?? {},
      marketplaceInteractionEvents: parsed.marketplaceInteractionEvents ?? {},
      walletLinkChallenges: parsed.walletLinkChallenges ?? {},
    };
  }

  private async persist(data: PersistenceFileData) {
    const filePath = this.config.filePath;
    const tempPath = `${filePath}.tmp`;
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await rename(tempPath, filePath);
  }
}
