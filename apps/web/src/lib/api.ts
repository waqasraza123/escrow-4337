import {
  requestJson,
  resolveApiBaseUrl,
  resolveLocalApiBaseUrl,
} from '@escrow4334/frontend-core';

export type UserWallet =
  | {
      address: string;
      label?: string;
      createdAt: number;
      updatedAt: number;
      walletKind: 'eoa';
      verificationMethod: 'siwe' | 'legacy_link';
      verificationChainId?: number;
      verifiedAt: number;
    }
  | {
      address: string;
      label?: string;
      createdAt: number;
      updatedAt: number;
      walletKind: 'smart_account';
      ownerAddress: string;
      recoveryAddress: string;
      chainId: number;
      providerKind: 'mock' | 'relay';
      entryPointAddress: string;
      factoryAddress: string;
      sponsorshipPolicy: 'disabled' | 'sponsored';
      provisionedAt: number;
    };

export type UserProfile = {
  id: string;
  email: string;
  shariahMode: boolean;
  defaultExecutionWalletAddress: string | null;
  wallets: UserWallet[];
};

export type WalletState = {
  defaultExecutionWalletAddress: string | null;
  wallets: UserWallet[];
};

export type WalletLinkChallenge = {
  challengeId: string;
  message: string;
  issuedAt: number;
  expiresAt: number;
};

export type SmartAccountProvisionResponse = WalletState & {
  smartAccount: Extract<UserWallet, { walletKind: 'smart_account' }>;
  sponsorship: {
    eligible: boolean;
    policy: 'disabled' | 'sponsored';
    providerKind: 'mock' | 'relay';
    chainId: number;
    reason?: string;
  };
};

export type JobStatus =
  | 'draft'
  | 'funded'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'resolved';

export type MilestoneStatus =
  | 'pending'
  | 'delivered'
  | 'released'
  | 'disputed'
  | 'refunded';

export type JobView = {
  id: string;
  title: string;
  description: string;
  category: string;
  termsJSON: Record<string, unknown>;
  jobHash: string;
  fundedAmount: string | null;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  contractorParticipation: {
    contractorEmail?: string;
    status: 'pending' | 'joined';
    joinedAt: number | null;
    inviteLastSentAt: number | null;
    inviteLastSentMode: 'email' | 'manual' | null;
  } | null;
  milestones: Array<{
    title: string;
    deliverable: string;
    amount: string;
    dueAt?: number;
    status: MilestoneStatus;
    deliveredAt?: number;
    releasedAt?: number;
    disputedAt?: number;
    resolvedAt?: number;
    deliveryNote?: string;
    deliveryEvidenceUrls?: string[];
    disputeReason?: string;
    disputeEvidenceUrls?: string[];
    resolutionAction?: 'release' | 'refund';
    resolutionNote?: string;
  }>;
  onchain: {
    chainId: number;
    contractAddress: string;
    escrowId: string | null;
    clientAddress: string;
    workerAddress: string;
    currencyAddress: string;
  };
};

export type PublicJobView = Omit<JobView, 'contractorParticipation'> & {
  contractorParticipation: {
    status: 'pending' | 'joined';
    joinedAt: number | null;
  } | null;
};

export type ContractorInviteResponse = {
  jobId: string;
  contractorParticipation: NonNullable<JobView['contractorParticipation']>;
  invite: {
    contractorEmail: string;
    delivery: 'email' | 'manual';
    joinUrl: string;
    regenerated: boolean;
    sentAt: number;
  };
};

export type ContractorJoinReadiness = {
  jobId: string;
  status:
    | 'invite_required'
    | 'invite_invalid'
    | 'joined'
    | 'claimed_by_other'
    | 'wrong_email'
    | 'wallet_not_linked'
    | 'wrong_wallet'
    | 'ready';
  contractorEmailHint: string | null;
  workerAddress: string;
  linkedWalletAddresses: string[];
  contractorParticipation: NonNullable<PublicJobView['contractorParticipation']>;
};

export type JobsListResponse = {
  jobs: Array<{
    job: JobView;
    participantRoles: Array<'client' | 'worker'>;
  }>;
};

export type EscrowAuthorityStatus = {
  source: 'chain_projection' | 'local_fallback';
  authorityReadsEnabled: boolean;
  projectionAvailable: boolean;
  projectionFresh: boolean;
  projectionHealthy: boolean;
  projectedAt: number | null;
  lastProjectedBlock: number | null;
  lastEventCount: number | null;
  reason: string | null;
};

export type AuditBundle = {
  bundle: {
    job: PublicJobView;
    audit: Array<{
      type: string;
      at: number;
      payload: Record<string, unknown>;
    }>;
    executions: Array<{
      id: string;
      action: string;
      actorAddress: string;
      chainId: number;
      contractAddress: string;
      txHash?: string;
      status: 'confirmed' | 'failed';
      blockNumber?: number;
      submittedAt: number;
      confirmedAt?: number;
      milestoneIndex?: number;
      escrowId?: string;
      failureCode?: string;
      failureMessage?: string;
    }>;
    authority: EscrowAuthorityStatus;
  };
};

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

export type VerifyResponse = SessionTokens & {
  user: UserProfile;
};

export type RuntimeProfile = {
  generatedAt: string;
  profile: 'local-mock' | 'mixed' | 'deployment-like';
  summary: string;
  environment: {
    nodeEnv: string;
    persistenceDriver: 'postgres' | 'file';
    trustProxyRaw: string | null;
    corsOrigins: string[];
  };
  providers: {
    emailMode: 'mock' | 'relay';
    smartAccountMode: 'mock' | 'relay';
    escrowMode: 'mock' | 'relay';
  };
  operator: {
    arbitratorAddress: string | null;
    resolutionAuthority: 'linked_arbitrator_wallet';
    exportSupport: boolean;
  };
  operations: {
    chainIngestion: {
      enabled: boolean;
      authorityReadsEnabled: boolean;
      status: 'ok' | 'warning' | 'failed';
      summary: string;
      confirmationDepth: number;
      batchBlocks: number;
      resyncBlocks: number;
      latestBlock: number | null;
      finalizedBlock: number | null;
      lagBlocks: number | null;
      cursor: {
        nextFromBlock: number | null;
        lastFinalizedBlock: number | null;
        lastScannedBlock: number | null;
        updatedAt: number | null;
      };
      projections: {
        totalJobs: number;
        projectedJobs: number;
        healthyJobs: number;
        degradedJobs: number;
        staleJobs: number;
      };
      issues: string[];
      warnings: string[];
    };
    chainSyncDaemon: {
      status: 'ok' | 'warning' | 'failed';
      summary: string;
      required: boolean;
      rpcConfigured: boolean;
      persistDefault: boolean;
      intervalSeconds: number;
      runOnStart: boolean;
      lockProvider: 'local' | 'postgres_advisory';
      alertingConfigured: boolean;
      alertMinSeverity: 'warning' | 'critical';
      alertSendRecovery: boolean;
      alertResendIntervalSeconds: number;
      thresholds: {
        maxHeartbeatAgeSeconds: number;
        maxCurrentRunAgeSeconds: number;
        maxConsecutiveFailures: number;
        maxConsecutiveSkips: number;
      };
      issues: string[];
      warnings: string[];
    };
  };
  warnings: string[];
};

export type MarketplaceAvailability = 'open' | 'limited' | 'unavailable';
export type OpportunityVisibility = 'public' | 'private';
export type OpportunityStatus =
  | 'draft'
  | 'published'
  | 'paused'
  | 'closed'
  | 'hired'
  | 'archived';
export type ApplicationStatus =
  | 'submitted'
  | 'shortlisted'
  | 'rejected'
  | 'withdrawn'
  | 'hired';
export type ModerationStatus = 'visible' | 'hidden' | 'suspended';
export type MarketplaceVerificationLevel =
  | 'wallet_verified'
  | 'wallet_and_escrow_history'
  | 'wallet_escrow_and_delivery';
export type MarketplaceCryptoReadiness =
  | 'wallet_only'
  | 'smart_account_ready'
  | 'escrow_power_user';
export type MarketplaceEngagementType =
  | 'fixed_scope'
  | 'milestone_retainer'
  | 'advisory';
export type MarketplaceProofArtifact = {
  id: string;
  label: string;
  url: string;
  kind: 'portfolio' | 'escrow_delivery' | 'escrow_case' | 'external_case_study';
  jobId: string | null;
};
export type MarketplaceEscrowStats = {
  totalContracts: number;
  completionCount: number;
  disputeCount: number;
  completionRate: number;
  disputeRate: number;
  onTimeDeliveryRate: number;
  averageContractValueBand: 'small' | 'medium' | 'large' | 'unknown';
  completedByCategory: Array<{
    category: string;
    count: number;
  }>;
};
export type MarketplaceScreeningQuestion = {
  id: string;
  prompt: string;
  required: boolean;
};
export type MarketplaceScreeningAnswer = {
  questionId: string;
  answer: string;
};
export type MarketplaceFitBreakdownEntry = {
  factor:
    | 'must_have_skills'
    | 'category_overlap'
    | 'escrow_track_record'
    | 'screening_quality'
    | 'crypto_readiness'
    | 'proposal_quality';
  score: number;
  weight: number;
  summary: string;
};
export type MarketplaceMatchSummary = {
  fitScore: number;
  requirementCoverage: number;
  skillOverlap: string[];
  mustHaveSkillGaps: string[];
  riskFlags: string[];
  missingRequirements: string[];
  fitBreakdown: MarketplaceFitBreakdownEntry[];
};
export type MarketplaceApplicationDossier = {
  applicationId: string;
  opportunityId: string;
  recommendation: 'strong_match' | 'review' | 'risky';
  matchSummary: MarketplaceMatchSummary;
  whyShortlisted: string[];
};

export type MarketplaceProfile = {
  userId: string;
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
  portfolioUrls: string[];
  proofArtifacts: MarketplaceProofArtifact[];
  cryptoReadiness: MarketplaceCryptoReadiness;
  verifiedWalletAddress: string | null;
  verificationLevel: MarketplaceVerificationLevel;
  escrowStats: MarketplaceEscrowStats;
  completedEscrowCount: number;
  isComplete: boolean;
};

export type MarketplaceOpportunity = {
  id: string;
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
  visibility: OpportunityVisibility;
  status: OpportunityStatus;
  budgetMin: string | null;
  budgetMax: string | null;
  timeline: string;
  desiredStartAt: number | null;
  timezoneOverlapHours: number | null;
  engagementType: MarketplaceEngagementType;
  cryptoReadinessRequired: MarketplaceCryptoReadiness;
  publishedAt: number | null;
  hiredApplicationId: string | null;
  hiredJobId: string | null;
  createdAt: number;
  updatedAt: number;
  owner: {
    userId: string;
    displayName: string;
    profileSlug: string | null;
  };
  escrowReadiness: 'ready' | 'wallet_required' | 'smart_account_required';
  applicationCount: number;
};

export type MarketplaceApplication = {
  id: string;
  opportunityId: string;
  coverNote: string;
  proposedRate: string | null;
  selectedWalletAddress: string;
  screeningAnswers: MarketplaceScreeningAnswer[];
  deliveryApproach: string;
  milestonePlanSummary: string;
  estimatedStartAt: number | null;
  relevantProofArtifacts: MarketplaceProofArtifact[];
  portfolioUrls: string[];
  status: ApplicationStatus;
  hiredJobId: string | null;
  createdAt: number;
  updatedAt: number;
  applicant: {
    userId: string;
    displayName: string;
    profileSlug: string | null;
    headline: string;
    specialties: string[];
    verifiedWalletAddress: string | null;
    verificationLevel: MarketplaceVerificationLevel;
    cryptoReadiness: MarketplaceCryptoReadiness;
    escrowStats: MarketplaceEscrowStats;
    completedEscrowCount: number;
  };
  opportunity: {
    id: string;
    title: string;
    visibility: OpportunityVisibility;
    status: OpportunityStatus;
    ownerDisplayName: string;
  };
  fitScore: number;
  fitBreakdown: MarketplaceFitBreakdownEntry[];
  riskFlags: string[];
  dossier: MarketplaceApplicationDossier;
};

export type MarketplaceOpportunityDetail = MarketplaceOpportunity & {
  applications?: MarketplaceApplication[];
};

export type MarketplaceAbuseReportReason =
  | 'spam'
  | 'scam'
  | 'impersonation'
  | 'harassment'
  | 'off_platform_payment'
  | 'policy_violation'
  | 'other';

export type MarketplaceAbuseReportStatus =
  | 'open'
  | 'reviewing'
  | 'resolved'
  | 'dismissed';

export type MarketplaceAbuseReportSubjectSummary =
  | {
      type: 'profile';
      id: string;
      label: string;
      slug: string;
      moderationStatus: ModerationStatus;
    }
  | {
      type: 'opportunity';
      id: string;
      label: string;
      visibility: OpportunityVisibility;
      moderationStatus: ModerationStatus;
      status: OpportunityStatus;
    };

export type MarketplaceAbuseReport = {
  id: string;
  subject: MarketplaceAbuseReportSubjectSummary;
  reporter: {
    userId: string;
    email: string;
  };
  reason: MarketplaceAbuseReportReason;
  details: string | null;
  evidenceUrls: string[];
  status: MarketplaceAbuseReportStatus;
  resolutionNote: string | null;
  resolvedBy: {
    userId: string;
    email: string;
  } | null;
  createdAt: number;
  updatedAt: number;
};

export type HireApplicationResponse = {
  applicationId: string;
  opportunityId: string;
  jobId: string;
};

const apiBaseUrl = resolveApiBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL,
  resolveLocalApiBaseUrl(process.env.NEXT_PUBLIC_API_PORT),
);

export const webApi = {
  baseUrl: apiBaseUrl,
  getRuntimeProfile() {
    return requestJson<RuntimeProfile>(apiBaseUrl, '/operations/runtime-profile', {
      method: 'GET',
    });
  },
  startAuth(email: string) {
    return requestJson<{ ok: true }>(apiBaseUrl, '/auth/start', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  verifyAuth(email: string, code: string) {
    return requestJson<VerifyResponse>(apiBaseUrl, '/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },
  refresh(refreshToken: string) {
    return requestJson<SessionTokens>(apiBaseUrl, '/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
  logout(refreshToken: string | null) {
    return requestJson<{ ok: true }>(apiBaseUrl, '/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
  me(accessToken: string) {
    return requestJson<UserProfile>(apiBaseUrl, '/auth/me', { method: 'GET' }, accessToken);
  },
  setShariah(shariah: boolean, accessToken: string) {
    return requestJson<UserProfile>(
      apiBaseUrl,
      '/auth/shariah',
      {
        method: 'PATCH',
        body: JSON.stringify({ shariah }),
      },
      accessToken,
    );
  },
  getWalletState(accessToken: string) {
    return requestJson<WalletState>(apiBaseUrl, '/wallet', { method: 'GET' }, accessToken);
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
      apiBaseUrl,
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
      apiBaseUrl,
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
      apiBaseUrl,
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
      apiBaseUrl,
      '/wallet/default',
      {
        method: 'PATCH',
        body: JSON.stringify({ address }),
      },
      accessToken,
    );
  },
  listJobs(accessToken: string) {
    return requestJson<JobsListResponse>(apiBaseUrl, '/jobs', { method: 'GET' }, accessToken);
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
      apiBaseUrl,
      '/jobs',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  inviteContractor(
    jobId: string,
    input: {
      delivery: 'email' | 'manual';
      frontendOrigin: string;
      regenerate?: boolean;
    },
    accessToken: string,
  ) {
    return requestJson<ContractorInviteResponse>(
      apiBaseUrl,
      `/jobs/${jobId}/contractor/invite`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  updateContractorEmail(
    jobId: string,
    contractorEmail: string,
    accessToken: string,
  ) {
    return requestJson<{
      jobId: string;
      contractorParticipation: NonNullable<JobView['contractorParticipation']>;
    }>(
      apiBaseUrl,
      `/jobs/${jobId}/contractor/email`,
      {
        method: 'PATCH',
        body: JSON.stringify({ contractorEmail }),
      },
      accessToken,
    );
  },
  getContractorJoinReadiness(
    jobId: string,
    inviteToken: string | null,
    accessToken: string,
  ) {
    const search = inviteToken
      ? `?inviteToken=${encodeURIComponent(inviteToken)}`
      : '';
    return requestJson<ContractorJoinReadiness>(
      apiBaseUrl,
      `/jobs/${jobId}/contractor/join-readiness${search}`,
      {
        method: 'GET',
      },
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
      apiBaseUrl,
      `/jobs/${jobId}/contractor/join`,
      {
        method: 'POST',
        body: JSON.stringify({ inviteToken }),
      },
      accessToken,
    );
  },
  fundJob(jobId: string, amount: string, accessToken: string) {
    return requestJson<{ txHash: string }>(
      apiBaseUrl,
      `/jobs/${jobId}/fund`,
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
      apiBaseUrl,
      `/jobs/${jobId}/milestones`,
      {
        method: 'POST',
        body: JSON.stringify({ milestones }),
      },
      accessToken,
    );
  },
  deliverMilestone(
    jobId: string,
    milestoneIndex: number,
    input: {
      note: string;
      evidenceUrls: string[];
    },
    accessToken: string,
  ) {
    return requestJson<{ txHash: string }>(
      apiBaseUrl,
      `/jobs/${jobId}/milestones/${milestoneIndex}/deliver`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  releaseMilestone(jobId: string, milestoneIndex: number, accessToken: string) {
    return requestJson<{ txHash: string }>(
      apiBaseUrl,
      `/jobs/${jobId}/milestones/${milestoneIndex}/release`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      accessToken,
    );
  },
  disputeMilestone(
    jobId: string,
    milestoneIndex: number,
    input: {
      reason: string;
      evidenceUrls: string[];
    },
    accessToken: string,
  ) {
    return requestJson<{ txHash: string }>(
      apiBaseUrl,
      `/jobs/${jobId}/milestones/${milestoneIndex}/dispute`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  resolveMilestone(
    jobId: string,
    milestoneIndex: number,
    input: {
      action: 'release' | 'refund';
      note: string;
    },
    accessToken: string,
  ) {
    return requestJson<{ txHash: string }>(
      apiBaseUrl,
      `/jobs/${jobId}/milestones/${milestoneIndex}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  getAudit(jobId: string) {
    return requestJson<AuditBundle>(apiBaseUrl, `/jobs/${jobId}/audit`, {
      method: 'GET',
    });
  },
  listMarketplaceProfiles(query?: {
    q?: string;
    skill?: string;
    availability?: MarketplaceAvailability;
    limit?: number;
  }) {
    const search = new URLSearchParams();
    if (query?.q) search.set('q', query.q);
    if (query?.skill) search.set('skill', query.skill);
    if (query?.availability) search.set('availability', query.availability);
    if (query?.limit) search.set('limit', String(query.limit));
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return requestJson<{ profiles: MarketplaceProfile[] }>(
      apiBaseUrl,
      `/marketplace/profiles${suffix}`,
      { method: 'GET' },
    );
  },
  getMarketplaceProfile(slug: string) {
    return requestJson<{ profile: MarketplaceProfile }>(
      apiBaseUrl,
      `/marketplace/profiles/${encodeURIComponent(slug)}`,
      { method: 'GET' },
    );
  },
  getMyMarketplaceProfile(accessToken: string) {
    return requestJson<{ profile: MarketplaceProfile }>(
      apiBaseUrl,
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
      apiBaseUrl,
      '/marketplace/profiles',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  updateMarketplaceProofs(
    input: {
      proofArtifacts: MarketplaceProofArtifact[];
    },
    accessToken: string,
  ) {
    return requestJson<{ profile: MarketplaceProfile }>(
      apiBaseUrl,
      '/marketplace/profiles/me/proofs',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  listMarketplaceOpportunities(query?: {
    q?: string;
    skill?: string;
    category?: string;
    limit?: number;
  }) {
    const search = new URLSearchParams();
    if (query?.q) search.set('q', query.q);
    if (query?.skill) search.set('skill', query.skill);
    if (query?.category) search.set('category', query.category);
    if (query?.limit) search.set('limit', String(query.limit));
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return requestJson<{ opportunities: MarketplaceOpportunity[] }>(
      apiBaseUrl,
      `/marketplace/opportunities${suffix}`,
      { method: 'GET' },
    );
  },
  getMarketplaceOpportunity(id: string) {
    return requestJson<{ opportunity: MarketplaceOpportunityDetail }>(
      apiBaseUrl,
      `/marketplace/opportunities/${id}`,
      { method: 'GET' },
    );
  },
  listMyMarketplaceOpportunities(accessToken: string) {
    return requestJson<{ opportunities: MarketplaceOpportunity[] }>(
      apiBaseUrl,
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
      visibility: OpportunityVisibility;
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
      apiBaseUrl,
      '/marketplace/opportunities',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  updateMarketplaceOpportunityScreening(
    id: string,
    input: {
      outcomes: string[];
      acceptanceCriteria: string[];
      mustHaveSkills: string[];
      screeningQuestions: MarketplaceScreeningQuestion[];
      desiredStartAt: number | null;
      timezoneOverlapHours: number | null;
      engagementType?: MarketplaceEngagementType;
      cryptoReadinessRequired?: MarketplaceCryptoReadiness;
    },
    accessToken: string,
  ) {
    return requestJson<{ opportunity: MarketplaceOpportunity }>(
      apiBaseUrl,
      `/marketplace/opportunities/${id}/screening`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  publishMarketplaceOpportunity(id: string, accessToken: string) {
    return requestJson<{ opportunity: MarketplaceOpportunity }>(
      apiBaseUrl,
      `/marketplace/opportunities/${id}/publish`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      accessToken,
    );
  },
  pauseMarketplaceOpportunity(id: string, accessToken: string) {
    return requestJson<{ opportunity: MarketplaceOpportunity }>(
      apiBaseUrl,
      `/marketplace/opportunities/${id}/pause`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      accessToken,
    );
  },
  listOpportunityApplications(id: string, accessToken: string) {
    return requestJson<{ applications: MarketplaceApplication[] }>(
      apiBaseUrl,
      `/marketplace/opportunities/${id}/applications`,
      { method: 'GET' },
      accessToken,
    );
  },
  listOpportunityMatches(id: string, accessToken: string) {
    return requestJson<{ matches: MarketplaceApplicationDossier[] }>(
      apiBaseUrl,
      `/marketplace/opportunities/${id}/matches`,
      { method: 'GET' },
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
      apiBaseUrl,
      `/marketplace/opportunities/${id}/applications`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  reportMarketplaceProfile(
    slug: string,
    input: {
      reason: MarketplaceAbuseReportReason;
      details?: string | null;
      evidenceUrls: string[];
    },
    accessToken: string,
  ) {
    return requestJson<{ report: MarketplaceAbuseReport }>(
      apiBaseUrl,
      `/marketplace/profiles/${encodeURIComponent(slug)}/report`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  reportMarketplaceOpportunity(
    id: string,
    input: {
      reason: MarketplaceAbuseReportReason;
      details?: string | null;
      evidenceUrls: string[];
    },
    accessToken: string,
  ) {
    return requestJson<{ report: MarketplaceAbuseReport }>(
      apiBaseUrl,
      `/marketplace/opportunities/${encodeURIComponent(id)}/report`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  listMyMarketplaceApplications(accessToken: string) {
    return requestJson<{ applications: MarketplaceApplication[] }>(
      apiBaseUrl,
      '/marketplace/applications/mine',
      { method: 'GET' },
      accessToken,
    );
  },
  getMarketplaceApplicationDossier(id: string, accessToken: string) {
    return requestJson<{ dossier: MarketplaceApplicationDossier }>(
      apiBaseUrl,
      `/marketplace/applications/${id}/dossier`,
      { method: 'GET' },
      accessToken,
    );
  },
  withdrawMarketplaceApplication(id: string, accessToken: string) {
    return requestJson<{ applications: MarketplaceApplication[] }>(
      apiBaseUrl,
      `/marketplace/applications/${id}/withdraw`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      accessToken,
    );
  },
  shortlistMarketplaceApplication(id: string, accessToken: string) {
    return requestJson<{ applications: MarketplaceApplication[] }>(
      apiBaseUrl,
      `/marketplace/applications/${id}/shortlist`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      accessToken,
    );
  },
  rejectMarketplaceApplication(id: string, accessToken: string) {
    return requestJson<{ applications: MarketplaceApplication[] }>(
      apiBaseUrl,
      `/marketplace/applications/${id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      accessToken,
    );
  },
  hireMarketplaceApplication(id: string, accessToken: string) {
    return requestJson<HireApplicationResponse>(
      apiBaseUrl,
      `/marketplace/applications/${id}/hire`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      accessToken,
    );
  },
};
