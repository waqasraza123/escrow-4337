import { createQueryString, requestJson, resolveApiBaseUrl } from '../http';
import type {
  ContractorJoinReadiness,
  JobStatus,
  JobsListResponse,
  MarketplaceAnalyticsOverview,
  MarketplaceApplication,
  MarketplaceAvailability,
  MarketplaceCryptoReadiness,
  MarketplaceEngagementType,
  MarketplaceNotification,
  MarketplaceOpportunity,
  MarketplaceOpportunityDetail,
  MarketplaceOpportunitySearchResult,
  MarketplaceProfile,
  MarketplaceProofArtifact,
  MarketplaceNotificationPreferences,
  MarketplaceDigest,
  MarketplaceDigestDispatchRun,
  MarketplaceReview,
  MarketplaceReviewScores,
  MarketplaceScreeningAnswer,
  MarketplaceScreeningQuestion,
  MarketplaceSavedSearch,
  MarketplaceSavedSearchRerunResponse,
  MarketplaceTalentSearchResult,
  MarketplaceVerificationLevel,
  ProjectMessage,
  ProjectRoom,
  ProjectSubmission,
  RuntimeProfile,
  SessionTokens,
  SmartAccountProvisionResponse,
  SupportCase,
  UserProfile,
  VerifyResponse,
  WalletLinkChallenge,
  WalletState,
} from './types';

export type ProductApiClientOptions = {
  baseUrl?: string;
};

export type MarketplaceTalentQuery = {
  q?: string;
  skill?: string;
  skills?: string;
  timezone?: string;
  availability?: MarketplaceAvailability;
  cryptoReadiness?: MarketplaceCryptoReadiness;
  engagementType?: MarketplaceEngagementType;
  verificationLevel?: MarketplaceVerificationLevel;
  sort?: 'relevance' | 'recent';
  limit?: number;
};

export type MarketplaceOpportunityQuery = {
  q?: string;
  skill?: string;
  skills?: string;
  category?: string;
  engagementType?: MarketplaceEngagementType;
  cryptoReadinessRequired?: MarketplaceCryptoReadiness;
  minBudget?: string;
  maxBudget?: string;
  timezoneOverlapHours?: number;
  sort?: 'relevance' | 'recent';
  limit?: number;
};

export function createProductApiClient(options: ProductApiClientOptions = {}) {
  const baseUrl = resolveApiBaseUrl(options.baseUrl);

  return {
    baseUrl,
    getRuntimeProfile() {
      return requestJson<RuntimeProfile>(
        baseUrl,
        '/operations/runtime-profile',
        { method: 'GET' },
      );
    },
    startAuth(email: string) {
      return requestJson<{ ok: true }>(baseUrl, '/auth/start', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
    verifyAuth(email: string, code: string) {
      return requestJson<VerifyResponse>(baseUrl, '/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
    },
    refresh(refreshToken: string) {
      return requestJson<SessionTokens>(baseUrl, '/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    },
    logout(refreshToken: string | null) {
      return requestJson<{ ok: true }>(baseUrl, '/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    },
    me(accessToken: string) {
      return requestJson<UserProfile>(
        baseUrl,
        '/auth/me',
        { method: 'GET' },
        accessToken,
      );
    },
    setShariah(shariah: boolean, accessToken: string) {
      return requestJson<UserProfile>(
        baseUrl,
        '/auth/shariah',
        {
          method: 'PATCH',
          body: JSON.stringify({ shariah }),
        },
        accessToken,
      );
    },
    selectWorkspace(workspaceId: string, accessToken: string) {
      return requestJson<{
        activeWorkspace: UserProfile['activeWorkspace'];
        workspaces: UserProfile['workspaces'];
      }>(
        baseUrl,
        '/workspaces/select',
        {
          method: 'POST',
          body: JSON.stringify({ workspaceId }),
        },
        accessToken,
      );
    },
    getWalletState(accessToken: string) {
      return requestJson<WalletState>(
        baseUrl,
        '/wallet',
        { method: 'GET' },
        accessToken,
      );
    },
    createWalletChallenge(
      input: {
        address: string;
        walletKind: 'eoa';
        chainId: number;
        label?: string;
      },
      accessToken: string,
    ) {
      return requestJson<WalletLinkChallenge>(
        baseUrl,
        '/wallet/link/challenge',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    verifyWalletChallenge(
      input: {
        challengeId: string;
        message: string;
        signature: string;
      },
      accessToken: string,
    ) {
      return requestJson<WalletState>(
        baseUrl,
        '/wallet/link/verify',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    provisionSmartAccount(
      input: {
        ownerAddress: string;
        label?: string;
        setAsDefault?: boolean;
      },
      accessToken: string,
    ) {
      return requestJson<SmartAccountProvisionResponse>(
        baseUrl,
        '/wallet/smart-account/provision',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    setDefaultWallet(address: string, accessToken: string) {
      return requestJson<WalletState>(
        baseUrl,
        '/wallet/default',
        {
          method: 'PATCH',
          body: JSON.stringify({ address }),
        },
        accessToken,
      );
    },
    listJobs(accessToken: string) {
      return requestJson<JobsListResponse>(
        baseUrl,
        '/jobs',
        { method: 'GET' },
        accessToken,
      );
    },
    createJob(
      input: {
        contractorEmail: string;
        workerAddress: string;
        currencyAddress: string;
        title: string;
        description: string;
        category: string;
        termsJSON: Record<string, unknown>;
      },
      accessToken: string,
    ) {
      return requestJson<{
        jobId: string;
        jobHash: string;
        status: JobStatus;
        escrowId: string;
        txHash: string;
      }>(
        baseUrl,
        '/jobs',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    fundJob(jobId: string, amount: string, accessToken: string) {
      return requestJson<{ txHash: string }>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/fund`,
        {
          method: 'POST',
          body: JSON.stringify({ amount }),
        },
        accessToken,
      );
    },
    setMilestones(
      jobId: string,
      milestones: Array<{
        title: string;
        deliverable: string;
        amount: string;
        dueAt?: number;
      }>,
      accessToken: string,
    ) {
      return requestJson<{ txHash: string }>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/milestones`,
        {
          method: 'POST',
          body: JSON.stringify({ milestones }),
        },
        accessToken,
      );
    },
    getContractorJoinReadiness(
      jobId: string,
      inviteToken: string | null,
      accessToken: string,
    ) {
      const suffix = createQueryString({ inviteToken });
      return requestJson<ContractorJoinReadiness>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/contractor/join-readiness${suffix}`,
        { method: 'GET' },
        accessToken,
      );
    },
    joinContractor(jobId: string, inviteToken: string, accessToken: string) {
      return requestJson<{
        jobId: string;
        contractorParticipation: {
          status: 'pending' | 'joined';
          joinedAt: number | null;
        };
      }>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/contractor/join`,
        {
          method: 'POST',
          body: JSON.stringify({ inviteToken }),
        },
        accessToken,
      );
    },
    deliverMilestone(
      jobId: string,
      milestoneIndex: number,
      input: { note: string; evidenceUrls: string[] },
      accessToken: string,
    ) {
      return requestJson<{ txHash: string }>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/milestones/${milestoneIndex}/deliver`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    disputeMilestone(
      jobId: string,
      milestoneIndex: number,
      input: { reason: string; evidenceUrls: string[] },
      accessToken: string,
    ) {
      return requestJson<{ txHash: string }>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/milestones/${milestoneIndex}/dispute`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    releaseMilestone(jobId: string, milestoneIndex: number, accessToken: string) {
      return requestJson<{ txHash: string }>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/milestones/${milestoneIndex}/release`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        accessToken,
      );
    },
    getProjectRoom(jobId: string, accessToken: string) {
      return requestJson<{ room: ProjectRoom }>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/project-room`,
        { method: 'GET' },
        accessToken,
      );
    },
    createSupportCase(
      jobId: string,
      input: {
        reason: SupportCase['reason'];
        severity?: SupportCase['severity'];
        milestoneIndex?: number | null;
        subject: string;
        description: string;
      },
      accessToken: string,
    ) {
      return requestJson<{ supportCase: SupportCase }>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/support-cases`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    postSupportCaseMessage(
      jobId: string,
      caseId: string,
      input: {
        body: string;
        visibility?: 'external' | 'internal';
      },
      accessToken: string,
    ) {
      return requestJson<{ supportCase: SupportCase }>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/support-cases/${encodeURIComponent(caseId)}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    postProjectRoomMessage(
      jobId: string,
      input: { body: string },
      accessToken: string,
    ) {
      return requestJson<{ message: ProjectMessage }>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/project-room/messages`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    submitProjectMilestone(
      jobId: string,
      milestoneIndex: number,
      input: {
        note: string;
        artifacts: Array<{
          label: string;
          url: string;
          sha256: string;
          mimeType?: string | null;
          byteSize?: number | null;
        }>;
      },
      accessToken: string,
    ) {
      return requestJson<{ submission: ProjectSubmission }>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/project-room/milestones/${milestoneIndex}/submissions`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    requestProjectRevision(
      jobId: string,
      submissionId: string,
      input: { note: string },
      accessToken: string,
    ) {
      return requestJson<{ submission: ProjectSubmission }>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/project-room/submissions/${encodeURIComponent(
          submissionId,
        )}/revision-request`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    approveProjectSubmission(
      jobId: string,
      submissionId: string,
      input: { note?: string | null },
      accessToken: string,
    ) {
      return requestJson<{ submission: ProjectSubmission }>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/project-room/submissions/${encodeURIComponent(
          submissionId,
        )}/approve`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    deliverProjectSubmission(
      jobId: string,
      submissionId: string,
      accessToken: string,
    ) {
      return requestJson<{ submission: ProjectSubmission; txHash: string }>(
        baseUrl,
        `/jobs/${encodeURIComponent(jobId)}/project-room/submissions/${encodeURIComponent(
          submissionId,
        )}/deliver`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        accessToken,
      );
    },
    listMarketplaceProfiles(query?: MarketplaceTalentQuery) {
      return requestJson<{ profiles: MarketplaceProfile[] }>(
        baseUrl,
        `/marketplace/profiles${createQueryString(query)}`,
        { method: 'GET' },
      );
    },
    getMarketplaceProfile(slug: string) {
      return requestJson<{ profile: MarketplaceProfile }>(
        baseUrl,
        `/marketplace/profiles/${encodeURIComponent(slug)}`,
        { method: 'GET' },
      );
    },
    getMyMarketplaceProfile(accessToken: string) {
      return requestJson<{ profile: MarketplaceProfile }>(
        baseUrl,
        '/marketplace/profiles/me',
        { method: 'GET' },
        accessToken,
      );
    },
    upsertMarketplaceProfile(
      input: {
        slug: string;
        displayName: string;
        headline: string;
        bio: string;
        skills: string[];
        specialties: string[];
        rateMin: string | null;
        rateMax: string | null;
        timezone: string;
        availability: MarketplaceAvailability;
        preferredEngagements: MarketplaceEngagementType[];
        cryptoReadiness: MarketplaceCryptoReadiness;
        portfolioUrls: string[];
      },
      accessToken: string,
    ) {
      return requestJson<{ profile: MarketplaceProfile }>(
        baseUrl,
        '/marketplace/profiles',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    updateMarketplaceProofs(
      input: { proofArtifacts: MarketplaceProofArtifact[] },
      accessToken: string,
    ) {
      return requestJson<{ profile: MarketplaceProfile }>(
        baseUrl,
        '/marketplace/profiles/me/proofs',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    listMarketplaceOpportunities(query?: MarketplaceOpportunityQuery) {
      return requestJson<{ opportunities: MarketplaceOpportunity[] }>(
        baseUrl,
        `/marketplace/opportunities${createQueryString(query)}`,
        { method: 'GET' },
      );
    },
    getMarketplaceOpportunity(id: string) {
      return requestJson<{ opportunity: MarketplaceOpportunityDetail }>(
        baseUrl,
        `/marketplace/opportunities/${encodeURIComponent(id)}`,
        { method: 'GET' },
      );
    },
    listMyMarketplaceOpportunities(accessToken: string) {
      return requestJson<{ opportunities: MarketplaceOpportunity[] }>(
        baseUrl,
        '/marketplace/opportunities/mine',
        { method: 'GET' },
        accessToken,
      );
    },
    createMarketplaceOpportunity(
      input: {
        title: string;
        summary: string;
        description: string;
        category: string;
        currencyAddress: string;
        requiredSkills: string[];
        mustHaveSkills: string[];
        outcomes: string[];
        acceptanceCriteria: string[];
        screeningQuestions: MarketplaceScreeningQuestion[];
        visibility: 'public' | 'private';
        budgetMin: string | null;
        budgetMax: string | null;
        timeline: string;
        desiredStartAt: number | null;
        timezoneOverlapHours: number | null;
        engagementType: MarketplaceEngagementType;
        cryptoReadinessRequired: MarketplaceCryptoReadiness;
      },
      accessToken: string,
    ) {
      return requestJson<{ opportunity: MarketplaceOpportunity }>(
        baseUrl,
        '/marketplace/opportunities',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    applyToMarketplaceOpportunity(
      id: string,
      input: {
        coverNote: string;
        proposedRate: string | null;
        selectedWalletAddress: string;
        screeningAnswers: MarketplaceScreeningAnswer[];
        deliveryApproach: string;
        milestonePlanSummary: string;
        estimatedStartAt: number | null;
        relevantProofArtifacts: MarketplaceProofArtifact[];
        portfolioUrls: string[];
      },
      accessToken: string,
    ) {
      return requestJson<{ opportunity: MarketplaceOpportunityDetail }>(
        baseUrl,
        `/marketplace/opportunities/${encodeURIComponent(id)}/applications`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    searchMarketplaceTalent(query?: MarketplaceTalentQuery) {
      return requestJson<{ results: MarketplaceTalentSearchResult[] }>(
        baseUrl,
        `/marketplace/talent/search${createQueryString(query)}`,
        { method: 'GET' },
      );
    },
    searchMarketplaceOpportunities(query?: MarketplaceOpportunityQuery) {
      return requestJson<{ results: MarketplaceOpportunitySearchResult[] }>(
        baseUrl,
        `/marketplace/opportunities/search${createQueryString(query)}`,
        { method: 'GET' },
      );
    },
    listMarketplaceSavedSearches(
      query: { kind?: 'talent' | 'opportunity' } | undefined,
      accessToken: string,
    ) {
      const search = new URLSearchParams();
      if (query?.kind) {
        search.set('kind', query.kind);
      }
      const suffix = search.toString() ? `?${search.toString()}` : '';
      return requestJson<{ searches: MarketplaceSavedSearch[] }>(
        baseUrl,
        `/marketplace/saved-searches${suffix}`,
        { method: 'GET' },
        accessToken,
      );
    },
    createMarketplaceSavedSearch(
      input: {
        kind: 'talent' | 'opportunity';
        label: string;
        query: Record<string, string | number | boolean | null>;
        alertFrequency?: 'manual' | 'daily' | 'weekly';
      },
      accessToken: string,
    ) {
      return requestJson<{ search: MarketplaceSavedSearch }>(
        baseUrl,
        '/marketplace/saved-searches',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    deleteMarketplaceSavedSearch(id: string, accessToken: string) {
      return requestJson<{ ok: true }>(
        baseUrl,
        `/marketplace/saved-searches/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
        accessToken,
      );
    },
    rerunMarketplaceSavedSearch(id: string, accessToken: string) {
      return requestJson<MarketplaceSavedSearchRerunResponse>(
        baseUrl,
        `/marketplace/saved-searches/${encodeURIComponent(id)}/rerun`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        accessToken,
      );
    },
    listMyMarketplaceApplications(accessToken: string) {
      return requestJson<{ applications: MarketplaceApplication[] }>(
        baseUrl,
        '/marketplace/applications/mine',
        { method: 'GET' },
        accessToken,
      );
    },
    getMarketplaceJobReviews(jobId: string, accessToken: string) {
      return requestJson<{ reviews: MarketplaceReview[] }>(
        baseUrl,
        `/marketplace/jobs/${encodeURIComponent(jobId)}/reviews`,
        { method: 'GET' },
        accessToken,
      );
    },
    createMarketplaceJobReview(
      jobId: string,
      input: {
        rating: number;
        scores: MarketplaceReviewScores;
        headline?: string | null;
        body: string;
      },
      accessToken: string,
    ) {
      return requestJson<{ review: MarketplaceReview }>(
        baseUrl,
        `/marketplace/jobs/${encodeURIComponent(jobId)}/reviews`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    getMarketplaceAnalyticsOverview(accessToken: string) {
      return requestJson<{ overview: MarketplaceAnalyticsOverview }>(
        baseUrl,
        '/marketplace/analytics/overview',
        { method: 'GET' },
        accessToken,
      );
    },
    listMarketplaceNotifications(accessToken: string) {
      return requestJson<{ notifications: MarketplaceNotification[] }>(
        baseUrl,
        '/marketplace/notifications',
        { method: 'GET' },
        accessToken,
      );
    },
    getMarketplaceNotificationPreferences(accessToken: string) {
      return requestJson<{ preferences: MarketplaceNotificationPreferences }>(
        baseUrl,
        '/marketplace/notification-preferences',
        { method: 'GET' },
        accessToken,
      );
    },
    updateMarketplaceNotificationPreferences(
      input: Partial<
        Pick<
          MarketplaceNotificationPreferences,
          | 'digestCadence'
          | 'talentInvitesEnabled'
          | 'applicationActivityEnabled'
          | 'interviewMessagesEnabled'
          | 'offerActivityEnabled'
          | 'reviewActivityEnabled'
          | 'automationActivityEnabled'
          | 'lifecycleDigestEnabled'
          | 'analyticsDigestEnabled'
        >
      >,
      accessToken: string,
    ) {
      return requestJson<{ preferences: MarketplaceNotificationPreferences }>(
        baseUrl,
        '/marketplace/notification-preferences',
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    listMarketplaceDigests(accessToken: string) {
      return requestJson<{ digests: MarketplaceDigest[] }>(
        baseUrl,
        '/marketplace/digests',
        { method: 'GET' },
        accessToken,
      );
    },
    listMarketplaceDigestDispatchRuns(accessToken: string) {
      return requestJson<{ runs: MarketplaceDigestDispatchRun[] }>(
        baseUrl,
        '/marketplace/digest-dispatch-runs',
        { method: 'GET' },
        accessToken,
      );
    },
    generateMarketplaceDigest(
      input: {
        cadence?: MarketplaceNotificationPreferences['digestCadence'];
      },
      accessToken: string,
    ) {
      return requestJson<{ digest: MarketplaceDigest }>(
        baseUrl,
        '/marketplace/digests/generate',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
    dispatchMarketplaceDigests(
      input: {
        mode?: 'due' | 'all_enabled';
        trigger?: 'manual' | 'scheduled';
      },
      accessToken: string,
    ) {
      return requestJson<{ run: MarketplaceDigestDispatchRun }>(
        baseUrl,
        '/marketplace/digest-dispatch-runs/dispatch',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        accessToken,
      );
    },
  };
}

export type ProductApiClient = ReturnType<typeof createProductApiClient>;
