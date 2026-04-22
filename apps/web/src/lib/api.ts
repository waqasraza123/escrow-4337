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

export type UserCapability = {
  allowed: boolean;
  reason: string | null;
  grantedBy: 'linked_arbitrator_wallet' | 'none';
  requiredWalletAddress: string | null;
};

export type UserCapabilities = {
  escrowResolution: UserCapability;
  escrowOperations: UserCapability;
  chainAuditSync: UserCapability;
  jobHistoryImport: UserCapability;
  marketplaceModeration: UserCapability;
};

export type WorkspaceKind = 'client' | 'freelancer';
export type OrganizationKind = 'personal' | 'client' | 'agency';
export type OrganizationRole =
  | 'client_owner'
  | 'client_recruiter'
  | 'agency_owner'
  | 'agency_member'
  | 'freelancer'
  | 'operator'
  | 'moderator';
export type WorkspaceCapabilities = {
  manageProfile: boolean;
  applyToOpportunity: boolean;
  createOpportunity: boolean;
  reviewApplications: boolean;
  manageWorkspace: boolean;
};
export type WorkspaceSummary = {
  workspaceId: string;
  kind: WorkspaceKind;
  label: string;
  slug: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationKind: OrganizationKind;
  roles: OrganizationRole[];
  capabilities: WorkspaceCapabilities;
  isDefault: boolean;
};
export type OrganizationSummary = {
  id: string;
  slug: string;
  name: string;
  kind: OrganizationKind;
  roles: OrganizationRole[];
  workspaces: WorkspaceSummary[];
};
export type OrganizationMembership = {
  membershipId: string;
  userId: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationKind: OrganizationKind;
  role: OrganizationRole;
  status: 'active';
  workspaceIds: string[];
};
export type OrganizationInvitation = {
  invitationId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationKind: OrganizationKind;
  invitedEmail: string;
  role: 'client_owner' | 'client_recruiter' | 'agency_owner' | 'agency_member';
  status: 'pending' | 'accepted' | 'revoked';
  invitedByUserId: string;
  acceptedByUserId: string | null;
  acceptedAt: number | null;
  createdAt: number;
  updatedAt: number;
  workspaceIds: string[];
};
export type RoleCapabilitiesResponse = {
  activeWorkspace: WorkspaceSummary | null;
  workspaceRoles: Record<
    WorkspaceKind,
    {
      roles: OrganizationRole[];
      capabilities: WorkspaceCapabilities;
    }
  >;
};

export type UserProfile = {
  id: string;
  email: string;
  shariahMode: boolean;
  defaultExecutionWalletAddress: string | null;
  wallets: UserWallet[];
  capabilities: UserCapabilities;
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary | null;
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
  operations: {
    chainSync: {
      lastAttemptedAt: number;
      lastOutcome: 'succeeded' | 'failed' | 'blocked';
      lastMode: 'preview' | 'persisted';
      lastSuccessfulAt?: number;
      lastPersistedAt?: number;
      lastSyncedBlock?: number;
      lastIssueCount: number;
      lastCriticalIssueCount: number;
      lastReconciliationIssueCount: number;
      lastErrorMessage?: string;
    } | null;
    executionFailureWorkflow: {
      claimedByUserId: string;
      claimedByEmail: string;
      claimedAt: number;
      status: 'investigating' | 'blocked_external' | 'ready_to_retry' | 'monitoring';
      acknowledgedFailureAt?: number;
      note?: string;
      updatedAt: number;
    } | null;
    staleWorkflow: {
      claimedByUserId: string;
      claimedByEmail: string;
      claimedAt: number;
      note?: string;
      updatedAt: number;
    } | null;
    commercial: JobCommercial | null;
  };
};

export type PublicJobView = Omit<JobView, 'contractorParticipation'> & {
  contractorParticipation: {
    status: 'pending' | 'joined';
    joinedAt: number | null;
  } | null;
};

export type ProjectArtifactStorageKind = 'external_url';

export type ProjectArtifact = {
  id: string;
  label: string;
  url: string;
  sha256: string;
  mimeType: string | null;
  byteSize: number | null;
  storageKind: ProjectArtifactStorageKind;
  uploadedByUserId: string;
  createdAt: number;
};

export type ProjectSubmissionStatus =
  | 'submitted'
  | 'revision_requested'
  | 'approved'
  | 'delivered';

export type ProjectSubmission = {
  id: string;
  jobId: string;
  milestoneIndex: number;
  note: string;
  artifacts: ProjectArtifact[];
  status: ProjectSubmissionStatus;
  revisionRequest:
    | {
        note: string;
        requestedByUserId: string;
        requestedByEmail: string;
        requestedAt: number;
      }
    | null;
  approval:
    | {
        note: string | null;
        approvedByUserId: string;
        approvedByEmail: string;
        approvedAt: number;
      }
    | null;
  deliveredAt: number | null;
  createdAt: number;
  updatedAt: number;
  submittedBy: {
    userId: string;
    email: string;
  };
};

export type ProjectMessage = {
  id: string;
  jobId: string;
  senderRole: 'client' | 'worker';
  body: string;
  createdAt: number;
  sender: {
    userId: string;
    email: string;
  };
};

export type JobCommercial = {
  feePolicy: {
    scheduleId: string;
    feeMode: 'client_platform_fee';
    realizationTrigger: 'milestone_release_or_resolution';
    refundTreatment: 'no_fee_on_refund';
    defaultPlatformFeeBps: number;
    effectivePlatformFeeBps: number;
    platformFeeLabel: string;
    treasuryAccountRef: string;
    feeDisclosure: string;
    feeDecision:
      | 'default'
      | 'waive_open_and_future'
      | 'refund_realized_and_waive'
      | 'manual_review';
    feeDecisionNote: string | null;
    approvedByUserId: string | null;
    approvedAt: number | null;
    updatedAt: number;
  };
  treasuryAccount: {
    accountRef: string;
    label: string;
    settlementAsset: string;
    network: 'base';
    destinationAddress: string;
    reconciliationMode: 'offchain_ledger';
    lastReviewedAt: number | null;
  };
  feeLedger: Array<{
    id: string;
    jobId: string;
    milestoneIndex: number | null;
    kind: 'platform_fee_accrued' | 'platform_fee_reversed';
    source:
      | 'milestone_release'
      | 'dispute_resolution_release'
      | 'support_fee_refund';
    amount: string;
    currencyAddress: string;
    treasuryAccountRef: string;
    note: string | null;
    createdAt: number;
  }>;
  payoutLedger: Array<{
    id: string;
    jobId: string;
    milestoneIndex: number;
    kind: 'worker_payout' | 'client_refund';
    source:
      | 'milestone_release'
      | 'dispute_resolution_release'
      | 'dispute_refund';
    amount: string;
    currencyAddress: string;
    note: string | null;
    createdAt: number;
  }>;
  reconciliation: {
    status: 'balanced' | 'attention';
    expectedReleasedAmount: string;
    expectedRefundedAmount: string;
    expectedRealizedFees: string;
    recordedReleasedAmount: string;
    recordedRefundedAmount: string;
    recordedRealizedFees: string;
    openSupportCaseCount: number;
    activeFeeException: boolean;
    issueCount: number;
    issues: Array<{
      code:
        | 'fee_mismatch'
        | 'payout_mismatch'
        | 'stuck_funding'
        | 'support_followup'
        | 'unowned_support_case';
      severity: 'warning' | 'critical';
      summary: string;
      detail: string | null;
    }>;
    lastComputedAt: number;
  } | null;
};

export type SupportCase = {
  id: string;
  jobId: string;
  milestoneIndex: number | null;
  reason:
    | 'general_help'
    | 'fee_question'
    | 'fee_exception'
    | 'stuck_funding'
    | 'dispute_followup'
    | 'release_delay';
  status:
    | 'open'
    | 'investigating'
    | 'waiting_on_client'
    | 'waiting_on_worker'
    | 'resolved';
  severity: 'routine' | 'elevated' | 'critical';
  subject: string;
  description: string;
  ownerUserId: string | null;
  ownerEmail: string | null;
  feeDecision:
    | 'default'
    | 'waive_open_and_future'
    | 'refund_realized_and_waive'
    | 'manual_review'
    | null;
  feeDecisionNote: string | null;
  feeImpactAmount: string | null;
  openedAt: number;
  updatedAt: number;
  resolvedAt: number | null;
  createdBy: {
    userId: string;
    email: string;
  };
  messages: Array<{
    id: string;
    authorRole: 'client' | 'worker' | 'operator';
    visibility: 'external' | 'internal';
    body: string;
    createdAt: number;
    author: {
      userId: string;
      email: string;
    };
  }>;
};

export type ProjectActivity =
  | {
      id: string;
      source: 'room';
      type:
        | 'submission_posted'
        | 'revision_requested'
        | 'submission_approved'
        | 'submission_delivered'
        | 'message_posted'
        | 'support_case_opened'
        | 'support_case_message_posted'
        | 'support_case_status_updated';
      actorRole: 'client' | 'worker';
      milestoneIndex: number | null;
      relatedSubmissionId: string | null;
      summary: string;
      detail: string | null;
      createdAt: number;
      actor: {
        userId: string;
        email: string;
      };
    }
  | {
      id: string;
      source: 'audit';
      type: string;
      actorRole: 'client' | 'worker' | 'system';
      milestoneIndex: number | null;
      summary: string;
      detail: string | null;
      createdAt: number;
    };

export type ProjectRoom = {
  job: JobView;
  participantRoles: Array<'client' | 'worker'>;
  submissions: ProjectSubmission[];
  messages: ProjectMessage[];
  activity: ProjectActivity[];
  supportCases: SupportCase[];
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
      chainId?: number;
      contractAddress?: string;
      requestId?: string;
      correlationId?: string;
      idempotencyKey?: string;
      operationKey?: string;
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
  | 'interviewing'
  | 'offer_sent'
  | 'countered'
  | 'accepted'
  | 'declined'
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
export type MarketplaceSearchReasonCode =
  | 'strong_skill_match'
  | 'timezone_overlap'
  | 'escrow_backed_delivery_history'
  | 'verified_wallet'
  | 'smart_account_ready'
  | 'complete_brief'
  | 'budget_clear'
  | 'recent_brief'
  | 'category_match'
  | 'must_have_coverage'
  | 'response_ready_profile'
  | 'invite_pending';
export type MarketplaceSearchReason = {
  code: MarketplaceSearchReasonCode;
  label: string;
};
export type MarketplaceRankingFeatureSnapshot = {
  score: number;
  profileCompleteness: number;
  skillMatchPercent: number;
  completionRate: number;
  disputeRate: number;
  inviteAcceptanceRate: number;
  responseRate: number;
  recencyDays: number;
  timezoneOverlapHours: number | null;
  budgetClarity: number;
  fitDensity: number;
  fundedVolumeBand: 'none' | 'small' | 'medium' | 'large';
  verificationLevel: MarketplaceVerificationLevel | 'unverified';
};
export type MarketplaceSavedSearch = {
  id: string;
  userId: string;
  workspaceId: string | null;
  kind: 'talent' | 'opportunity';
  label: string;
  query: Record<string, string | number | boolean | null>;
  alertFrequency: 'manual' | 'daily' | 'weekly';
  lastResultCount: number;
  activeWorkspaceId: string | null;
  createdAt: number;
  updatedAt: number;
};
export type MarketplaceTalentPoolMemberStage =
  | 'saved'
  | 'contacted'
  | 'interviewing'
  | 'offered'
  | 'rehire_ready'
  | 'archived';
export type MarketplaceAutomationRuleKind =
  | 'saved_search_digest'
  | 'talent_pool_digest'
  | 'invite_followup'
  | 'rehire_digest';
export type MarketplaceAutomationRuleSchedule = 'manual' | 'daily' | 'weekly';
export type MarketplaceTalentPoolMember = {
  id: string;
  poolId: string;
  addedByUserId: string;
  stage: MarketplaceTalentPoolMemberStage;
  note: string | null;
  sourceOpportunityId: string | null;
  sourceApplicationId: string | null;
  sourceJobId: string | null;
  createdAt: number;
  updatedAt: number;
  profile: MarketplaceApplication['applicant'];
  reviewAverage: number | null;
  activeInviteStatus: MarketplaceOpportunityInvite['status'] | null;
};
export type MarketplaceTalentPool = {
  id: string;
  ownerUserId: string;
  workspaceId: string;
  label: string;
  focusSkills: string[];
  note: string | null;
  createdAt: number;
  updatedAt: number;
  members: MarketplaceTalentPoolMember[];
};
export type MarketplaceLifecycleTask = {
  id: string;
  kind:
    | 'saved_search_refresh'
    | 'invite_followup'
    | 'pool_followup'
    | 'rehire_prompt';
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  relatedEntityId: string | null;
};
export type MarketplaceAutomationRule = {
  id: string;
  ownerUserId: string;
  workspaceId: string;
  kind: MarketplaceAutomationRuleKind;
  label: string;
  targetId: string | null;
  schedule: MarketplaceAutomationRuleSchedule;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  pendingTaskCount: number;
  summary: string;
};
export type MarketplaceRehireCandidate = {
  jobId: string;
  completedAt: number | null;
  title: string;
  profile: MarketplaceApplication['applicant'];
  reviewAverage: number | null;
  relationshipStrength: 'repeat_ready' | 'trusted' | 'watch';
};
export type MarketplaceLifecycleDigest = {
  generatedAt: string;
  workspace:
    | {
        workspaceId: string;
        kind: WorkspaceKind;
        organizationId: string;
        organizationKind: OrganizationKind;
      }
    | null;
  poolSummary: {
    poolCount: number;
    trackedTalentCount: number;
    contactedCount: number;
    interviewingCount: number;
    offeredCount: number;
    rehireReadyCount: number;
  };
  rehireCandidates: MarketplaceRehireCandidate[];
  tasks: MarketplaceLifecycleTask[];
};
export type MarketplaceOpportunityInvite = {
  id: string;
  status: 'pending' | 'applied' | 'dismissed';
  message: string | null;
  createdAt: number;
  updatedAt: number;
  opportunity: {
    id: string;
    title: string;
    visibility: OpportunityVisibility;
    status: OpportunityStatus;
    ownerDisplayName: string;
    ownerWorkspaceId: string | null;
  };
  talent: MarketplaceApplication['applicant'];
};
export type MarketplaceInterviewThreadStatus = 'open' | 'closed';
export type MarketplaceInterviewMessageKind =
  | 'clarification'
  | 'interview'
  | 'system';
export type MarketplaceOfferStatus =
  | 'draft'
  | 'sent'
  | 'countered'
  | 'accepted'
  | 'declined'
  | 'withdrawn';
export type MarketplaceContractDraftStatus =
  | 'draft'
  | 'finalized'
  | 'converted'
  | 'cancelled';
export type MarketplaceReviewVisibilityStatus = 'visible' | 'hidden';
export type MarketplaceIdentityConfidenceLabel =
  | 'email_verified'
  | 'wallet_verified'
  | 'smart_account_ready'
  | 'operator_reviewed_proof';
export type MarketplaceNoHireReason =
  | 'budget_changed'
  | 'scope_changed'
  | 'fit_not_strong_enough'
  | 'candidate_withdrew'
  | 'timeline_mismatch'
  | 'other';
export type MarketplaceDecisionAction =
  | 'applied'
  | 'revised'
  | 'shortlisted'
  | 'interview_started'
  | 'offer_sent'
  | 'offer_countered'
  | 'offer_accepted'
  | 'offer_declined'
  | 'rejected'
  | 'withdrawn'
  | 'hired'
  | 'no_hire';
export type MarketplaceTalentSearchResult = {
  profile: MarketplaceProfile;
  reasons: MarketplaceSearchReason[];
  ranking: MarketplaceRankingFeatureSnapshot;
  inviteStatus: MarketplaceOpportunityInvite['status'] | null;
};
export type MarketplaceOpportunitySearchResult = {
  opportunity: MarketplaceOpportunity;
  reasons: MarketplaceSearchReason[];
  ranking: MarketplaceRankingFeatureSnapshot;
  inviteStatus: MarketplaceOpportunityInvite['status'] | null;
};
export type MarketplaceSearchKind = 'talent' | 'opportunity';
export type MarketplaceInteractionEntityType =
  | 'search'
  | 'profile'
  | 'opportunity'
  | 'application'
  | 'saved_search'
  | 'job';
export type MarketplaceInteractionEventType =
  | 'search_impression'
  | 'result_click'
  | 'detail_view'
  | 'saved_search_created'
  | 'invite_sent'
  | 'application_submitted'
  | 'application_revised'
  | 'application_withdrawn'
  | 'application_shortlisted'
  | 'application_rejected'
  | 'interview_started'
  | 'interview_message_posted'
  | 'offer_created'
  | 'offer_accepted'
  | 'offer_declined'
  | 'contract_converted'
  | 'hire_recorded'
  | 'no_hire_recorded'
  | 'job_funded'
  | 'milestone_released'
  | 'milestone_disputed'
  | 'review_submitted';
export type MarketplaceInteractionSurface =
  | 'public_marketplace'
  | 'workspace'
  | 'admin'
  | 'system';
export type MarketplaceAnalyticsFunnelStage = {
  key:
    | 'search_impressions'
    | 'result_clicks'
    | 'saved_searches'
    | 'applications'
    | 'shortlists'
    | 'interviews'
    | 'offers'
    | 'hires'
    | 'funded_jobs'
    | 'released_milestones'
    | 'disputed_milestones';
  label: string;
  count: number;
};
export type MarketplaceLiquiditySlice = {
  label: string;
  demandCount: number;
  supplyCount: number;
  gap: number;
  posture: 'balanced' | 'demand_heavy' | 'supply_heavy';
};
export type MarketplaceNoHireReasonStat = {
  reason: MarketplaceNoHireReason;
  count: number;
};
export type MarketplaceTopSearchStat = {
  searchKind: MarketplaceSearchKind;
  queryLabel: string;
  impressions: number;
  resultClicks: number;
  saveCount: number;
};
export type MarketplaceStalledItem = {
  opportunityId: string;
  title: string;
  category: string;
  publishedAt: number | null;
  daysOpen: number;
  applicationCount: number;
  shortlistCount: number;
  offerCount: number;
  lastDecisionAt: number | null;
};
export type MarketplaceAnalyticsOverview = {
  generatedAt: string;
  workspace:
    | {
        workspaceId: string;
        kind: WorkspaceKind;
        organizationId: string;
        organizationKind: OrganizationKind;
      }
    | null;
  summary: {
    searchImpressions: number;
    resultClicks: number;
    savedSearches: number;
    applications: number;
    shortlists: number;
    interviews: number;
    offers: number;
    hires: number;
    activeContracts: number;
  };
  funnel: MarketplaceAnalyticsFunnelStage[];
  liquidity: MarketplaceLiquiditySlice[];
  noHireReasons: MarketplaceNoHireReasonStat[];
  topSearches: MarketplaceTopSearchStat[];
  stalledItems: MarketplaceStalledItem[];
  retention: {
    talentPools: number;
    trackedTalent: number;
    automationRules: number;
    pendingLifecycleTasks: number;
    rehireCandidates: number;
  };
};
export type MarketplaceRankingAuditEntry = {
  entityType: 'profile' | 'opportunity';
  entityId: string;
  label: string;
  score: number;
  outcomeScore: number;
  momentumScore: number;
  moderationStatus: ModerationStatus;
  reasons: MarketplaceSearchReason[];
  signals: {
    completionRate: number;
    disputeRate: number;
    inviteAcceptanceRate: number;
    responseRate: number;
    reviewAverage: number | null;
    hireCount: number;
    noHireCount: number;
    recencyDays: number;
  };
};
export type MarketplaceIntelligenceReport = {
  generatedAt: string;
  funnel: MarketplaceAnalyticsFunnelStage[];
  liquidityByCategory: MarketplaceLiquiditySlice[];
  liquidityByTimezone: MarketplaceLiquiditySlice[];
  noHireReasons: MarketplaceNoHireReasonStat[];
  topSearches: MarketplaceTopSearchStat[];
  stalledOpportunities: MarketplaceStalledItem[];
  rankingAudit: MarketplaceRankingAuditEntry[];
  retention: {
    talentPools: number;
    trackedTalent: number;
    automationRules: number;
    pendingLifecycleTasks: number;
    rehireCandidates: number;
    clientWorkspacesWithRetentionSetup: number;
  };
};
export type MarketplaceReviewScores = {
  scopeClarity: number;
  communication: number;
  timeliness: number;
  outcomeQuality: number;
};
export type MarketplaceReview = {
  id: string;
  jobId: string;
  reviewerRole: 'client' | 'worker';
  revieweeRole: 'client' | 'worker';
  rating: number;
  scores: MarketplaceReviewScores;
  headline: string | null;
  body: string | null;
  visibilityStatus: MarketplaceReviewVisibilityStatus;
  moderationNote: string | null;
  moderatedBy: {
    userId: string;
    email: string;
  } | null;
  moderatedAt: number | null;
  reviewer: {
    userId: string;
    displayName: string;
    role: 'client' | 'worker';
  };
  reviewee: {
    userId: string;
    role: 'client' | 'worker';
  };
  createdAt: number;
  updatedAt: number;
};
export type MarketplaceReputationSnapshot = {
  subjectUserId: string;
  role: 'client' | 'worker';
  identityConfidence: MarketplaceIdentityConfidenceLabel;
  publicReviewCount: number;
  averageRating: number | null;
  ratingBreakdown: {
    oneStar: number;
    twoStar: number;
    threeStar: number;
    fourStar: number;
    fiveStar: number;
  };
  totalContracts: number;
  completionRate: number;
  disputeRate: number;
  onTimeDeliveryRate: number;
  responseRate: number | null;
  inviteAcceptanceRate: number | null;
  revisionRate: number | null;
  averageContractValueBand: MarketplaceEscrowStats['averageContractValueBand'];
};

export type MarketplaceProfile = {
  userId: string;
  organizationId: string | null;
  workspaceId: string | null;
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
  reputation: MarketplaceReputationSnapshot;
  publicReviews: MarketplaceReview[];
  completedEscrowCount: number;
  isComplete: boolean;
};

export type MarketplaceOpportunity = {
  id: string;
  ownerOrganizationId: string | null;
  ownerWorkspaceId: string | null;
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
    organizationId: string | null;
    workspaceId: string | null;
    workspaceKind: 'client';
    displayName: string;
    profileSlug: string | null;
    reputation: MarketplaceReputationSnapshot;
  };
  escrowReadiness: 'ready' | 'wallet_required' | 'smart_account_required';
  applicationCount: number;
};

export type MarketplaceApplication = {
  id: string;
  opportunityId: string;
  applicantOrganizationId: string | null;
  applicantWorkspaceId: string | null;
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
  contractPath: string | null;
  createdAt: number;
  updatedAt: number;
  applicant: {
    userId: string;
    organizationId: string | null;
    workspaceId: string | null;
    workspaceKind: 'freelancer';
    displayName: string;
    profileSlug: string | null;
    headline: string;
    specialties: string[];
    verifiedWalletAddress: string | null;
    verificationLevel: MarketplaceVerificationLevel;
    cryptoReadiness: MarketplaceCryptoReadiness;
    escrowStats: MarketplaceEscrowStats;
    reputation: MarketplaceReputationSnapshot;
    completedEscrowCount: number;
  };
  opportunity: {
    id: string;
    title: string;
    visibility: OpportunityVisibility;
    status: OpportunityStatus;
    ownerDisplayName: string;
    ownerWorkspaceId: string | null;
  };
  fitScore: number;
  fitBreakdown: MarketplaceFitBreakdownEntry[];
  riskFlags: string[];
  dossier: MarketplaceApplicationDossier;
};

export type MarketplaceApplicationRevision = {
  id: string;
  applicationId: string;
  opportunityId: string;
  applicantUserId: string;
  revisionNumber: number;
  coverNote: string;
  proposedRate: string | null;
  screeningAnswers: MarketplaceScreeningAnswer[];
  deliveryApproach: string;
  milestonePlanSummary: string;
  estimatedStartAt: number | null;
  relevantProofArtifacts: MarketplaceProofArtifact[];
  portfolioUrls: string[];
  revisionReason: string | null;
  createdAt: number;
};

export type MarketplaceInterviewMessage = {
  id: string;
  threadId: string;
  applicationId: string;
  opportunityId: string;
  senderUserId: string;
  senderWorkspaceId: string | null;
  senderEmail: string;
  kind: MarketplaceInterviewMessageKind;
  body: string;
  createdAt: number;
};

export type MarketplaceInterviewThread = {
  id: string;
  applicationId: string;
  opportunityId: string;
  clientUserId: string;
  applicantUserId: string;
  status: MarketplaceInterviewThreadStatus;
  createdAt: number;
  updatedAt: number;
  messages: MarketplaceInterviewMessage[];
};

export type MarketplaceOfferMilestoneDraft = {
  title: string;
  deliverable: string;
  amount: string;
  dueAt: number | null;
};

export type MarketplaceOffer = {
  id: string;
  applicationId: string;
  opportunityId: string;
  clientUserId: string;
  applicantUserId: string;
  status: MarketplaceOfferStatus;
  message: string | null;
  counterMessage: string | null;
  declineReason: string | null;
  proposedRate: string | null;
  milestones: MarketplaceOfferMilestoneDraft[];
  revisionNumber: number;
  createdAt: number;
  updatedAt: number;
};

export type MarketplaceContractMetadataSnapshot = {
  title: string;
  description: string;
  category: string;
  contractorEmail: string;
  workerAddress: string;
  currencyAddress: string;
  scopeSummary: string;
  acceptanceCriteria: string[];
  outcomes: string[];
  timeline: string;
  milestones: MarketplaceOfferMilestoneDraft[];
  reviewWindowDays: number;
  disputeModel: string;
  evidenceExpectation: string;
  kickoffNote: string;
  platformFeeBps: number;
  platformFeeLabel: string;
  offerId: string;
  offerRevisionNumber: number;
  opportunityId: string;
  applicationId: string;
};

export type MarketplaceContractDraftRevision = {
  revisionNumber: number;
  snapshot: MarketplaceContractMetadataSnapshot;
  metadataHash: string;
  revisedByUserId: string;
  reason: string | null;
  createdAt: number;
};

export type MarketplaceContractDraft = {
  id: string;
  applicationId: string;
  opportunityId: string;
  offerId: string;
  clientUserId: string;
  applicantUserId: string;
  status: MarketplaceContractDraftStatus;
  latestSnapshot: MarketplaceContractMetadataSnapshot;
  metadataHash: string;
  revisions: MarketplaceContractDraftRevision[];
  clientApprovedAt: number | null;
  applicantApprovedAt: number | null;
  finalizedAt: number | null;
  convertedJobId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type MarketplaceApplicationDecision = {
  id: string;
  applicationId: string;
  opportunityId: string;
  actorUserId: string;
  action: MarketplaceDecisionAction;
  reason: string | null;
  noHireReason: MarketplaceNoHireReason | null;
  createdAt: number;
};

export type MarketplaceApplicationTimeline = {
  application: MarketplaceApplication;
  revisions: MarketplaceApplicationRevision[];
  interviewThread: MarketplaceInterviewThread | null;
  offers: MarketplaceOffer[];
  decisions: MarketplaceApplicationDecision[];
  contractDraft: MarketplaceContractDraft | null;
};

export type MarketplaceApplicationComparison = {
  application: MarketplaceApplication;
  latestRevision: MarketplaceApplicationRevision | null;
  latestOffer: MarketplaceOffer | null;
  latestMessageAt: number | null;
  decisionCount: number;
  contractDraftStatus: MarketplaceContractDraftStatus | null;
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
  listOrganizations(accessToken: string) {
    return requestJson<{ organizations: OrganizationSummary[] }>(
      apiBaseUrl,
      '/organizations',
      { method: 'GET' },
      accessToken,
    );
  },
  listMemberships(accessToken: string) {
    return requestJson<{ memberships: OrganizationMembership[] }>(
      apiBaseUrl,
      '/memberships',
      { method: 'GET' },
      accessToken,
    );
  },
  listOrganizationMemberships(organizationId: string, accessToken: string) {
    return requestJson<{ memberships: OrganizationMembership[] }>(
      apiBaseUrl,
      `/organizations/${organizationId}/memberships`,
      { method: 'GET' },
      accessToken,
    );
  },
  listInvitations(accessToken: string) {
    return requestJson<{ invitations: OrganizationInvitation[] }>(
      apiBaseUrl,
      '/invitations',
      { method: 'GET' },
      accessToken,
    );
  },
  listOrganizationInvitations(organizationId: string, accessToken: string) {
    return requestJson<{ invitations: OrganizationInvitation[] }>(
      apiBaseUrl,
      `/organizations/${organizationId}/invitations`,
      { method: 'GET' },
      accessToken,
    );
  },
  getRoleCapabilities(accessToken: string) {
    return requestJson<RoleCapabilitiesResponse>(
      apiBaseUrl,
      '/role-capabilities',
      { method: 'GET' },
      accessToken,
    );
  },
  createOrganization(
    input: {
      name: string;
      kind: 'client' | 'agency';
      slug?: string;
      setActive?: boolean;
    },
    accessToken: string,
  ) {
    return requestJson<{ organization: OrganizationSummary }>(
      apiBaseUrl,
      '/organizations',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  createOrganizationInvitation(
    organizationId: string,
    input: {
      email: string;
      role: 'client_owner' | 'client_recruiter' | 'agency_owner' | 'agency_member';
    },
    accessToken: string,
  ) {
    return requestJson<{ invitation: OrganizationInvitation }>(
      apiBaseUrl,
      `/organizations/${organizationId}/invitations`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  revokeOrganizationInvitation(
    organizationId: string,
    invitationId: string,
    accessToken: string,
  ) {
    return requestJson<{ invitation: OrganizationInvitation }>(
      apiBaseUrl,
      `/organizations/${organizationId}/invitations/${invitationId}/revoke`,
      {
        method: 'POST',
      },
      accessToken,
    );
  },
  acceptOrganizationInvitation(
    invitationId: string,
    input: {
      setActive?: boolean;
    },
    accessToken: string,
  ) {
    return requestJson<{
      activeWorkspace: WorkspaceSummary;
      workspaces: WorkspaceSummary[];
    }>(
      apiBaseUrl,
      `/invitations/${invitationId}/accept`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  selectWorkspace(workspaceId: string, accessToken: string) {
    return requestJson<{
      activeWorkspace: WorkspaceSummary;
      workspaces: WorkspaceSummary[];
    }>(
      apiBaseUrl,
      '/workspaces/select',
      {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
      },
      accessToken,
    );
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
  getProjectRoom(jobId: string, accessToken: string) {
    return requestJson<{ room: ProjectRoom }>(
      apiBaseUrl,
      `/jobs/${jobId}/project-room`,
      { method: 'GET' },
      accessToken,
    );
  },
  getJobSupportOperations(jobId: string, accessToken: string) {
    return requestJson<{
      commercial: JobCommercial;
      supportCases: SupportCase[];
    }>(
      apiBaseUrl,
      `/jobs/${jobId}/support-operations`,
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
      apiBaseUrl,
      `/jobs/${jobId}/support-cases`,
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
      apiBaseUrl,
      `/jobs/${jobId}/support-cases/${caseId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  postProjectRoomMessage(
    jobId: string,
    input: {
      body: string;
    },
    accessToken: string,
  ) {
    return requestJson<{ message: ProjectMessage }>(
      apiBaseUrl,
      `/jobs/${jobId}/project-room/messages`,
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
      apiBaseUrl,
      `/jobs/${jobId}/project-room/milestones/${milestoneIndex}/submissions`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  getMarketplaceJobReviews(jobId: string, accessToken: string) {
    return requestJson<{ reviews: MarketplaceReview[] }>(
      apiBaseUrl,
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
      apiBaseUrl,
      `/marketplace/jobs/${encodeURIComponent(jobId)}/reviews`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  createMarketplaceRehireOpportunity(
    jobId: string,
    input: {
      title?: string;
      summary?: string;
      description?: string;
      budgetMin?: string | null;
      budgetMax?: string | null;
      timeline?: string;
      message?: string | null;
    },
    accessToken: string,
  ) {
    return requestJson<{ opportunity: MarketplaceOpportunity }>(
      apiBaseUrl,
      `/marketplace/jobs/${encodeURIComponent(jobId)}/rehire-opportunity`,
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
    input: {
      note: string;
    },
    accessToken: string,
  ) {
    return requestJson<{ submission: ProjectSubmission }>(
      apiBaseUrl,
      `/jobs/${jobId}/project-room/submissions/${submissionId}/revision-request`,
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
    input: {
      note?: string | null;
    },
    accessToken: string,
  ) {
    return requestJson<{ submission: ProjectSubmission }>(
      apiBaseUrl,
      `/jobs/${jobId}/project-room/submissions/${submissionId}/approve`,
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
      apiBaseUrl,
      `/jobs/${jobId}/project-room/submissions/${submissionId}/deliver`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      accessToken,
    );
  },
  listMarketplaceProfiles(query?: {
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
  }) {
    const search = new URLSearchParams();
    if (query?.q) search.set('q', query.q);
    if (query?.skill) search.set('skill', query.skill);
    if (query?.skills) search.set('skills', query.skills);
    if (query?.timezone) search.set('timezone', query.timezone);
    if (query?.availability) search.set('availability', query.availability);
    if (query?.cryptoReadiness) {
      search.set('cryptoReadiness', query.cryptoReadiness);
    }
    if (query?.engagementType) {
      search.set('engagementType', query.engagementType);
    }
    if (query?.verificationLevel) {
      search.set('verificationLevel', query.verificationLevel);
    }
    if (query?.sort) search.set('sort', query.sort);
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
    skills?: string;
    category?: string;
    engagementType?: MarketplaceEngagementType;
    cryptoReadinessRequired?: MarketplaceCryptoReadiness;
    minBudget?: string;
    maxBudget?: string;
    timezoneOverlapHours?: number;
    sort?: 'relevance' | 'recent';
    limit?: number;
  }) {
    const search = new URLSearchParams();
    if (query?.q) search.set('q', query.q);
    if (query?.skill) search.set('skill', query.skill);
    if (query?.skills) search.set('skills', query.skills);
    if (query?.category) search.set('category', query.category);
    if (query?.engagementType) {
      search.set('engagementType', query.engagementType);
    }
    if (query?.cryptoReadinessRequired) {
      search.set('cryptoReadinessRequired', query.cryptoReadinessRequired);
    }
    if (query?.minBudget) search.set('minBudget', query.minBudget);
    if (query?.maxBudget) search.set('maxBudget', query.maxBudget);
    if (query?.timezoneOverlapHours !== undefined) {
      search.set('timezoneOverlapHours', String(query.timezoneOverlapHours));
    }
    if (query?.sort) search.set('sort', query.sort);
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
  searchMarketplaceTalent(query?: {
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
  }) {
    const search = new URLSearchParams();
    if (query?.q) search.set('q', query.q);
    if (query?.skill) search.set('skill', query.skill);
    if (query?.skills) search.set('skills', query.skills);
    if (query?.timezone) search.set('timezone', query.timezone);
    if (query?.availability) search.set('availability', query.availability);
    if (query?.cryptoReadiness) {
      search.set('cryptoReadiness', query.cryptoReadiness);
    }
    if (query?.engagementType) {
      search.set('engagementType', query.engagementType);
    }
    if (query?.verificationLevel) {
      search.set('verificationLevel', query.verificationLevel);
    }
    if (query?.sort) search.set('sort', query.sort);
    if (query?.limit) search.set('limit', String(query.limit));
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return requestJson<{ results: MarketplaceTalentSearchResult[] }>(
      apiBaseUrl,
      `/marketplace/talent/search${suffix}`,
      { method: 'GET' },
    );
  },
  searchMarketplaceOpportunities(query?: {
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
  }) {
    const search = new URLSearchParams();
    if (query?.q) search.set('q', query.q);
    if (query?.skill) search.set('skill', query.skill);
    if (query?.skills) search.set('skills', query.skills);
    if (query?.category) search.set('category', query.category);
    if (query?.engagementType) {
      search.set('engagementType', query.engagementType);
    }
    if (query?.cryptoReadinessRequired) {
      search.set('cryptoReadinessRequired', query.cryptoReadinessRequired);
    }
    if (query?.minBudget) search.set('minBudget', query.minBudget);
    if (query?.maxBudget) search.set('maxBudget', query.maxBudget);
    if (query?.timezoneOverlapHours !== undefined) {
      search.set('timezoneOverlapHours', String(query.timezoneOverlapHours));
    }
    if (query?.sort) search.set('sort', query.sort);
    if (query?.limit) search.set('limit', String(query.limit));
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return requestJson<{ results: MarketplaceOpportunitySearchResult[] }>(
      apiBaseUrl,
      `/marketplace/opportunities/search${suffix}`,
      { method: 'GET' },
    );
  },
  recordMarketplaceInteraction(input: {
    surface: MarketplaceInteractionSurface;
    entityType: MarketplaceInteractionEntityType;
    eventType: MarketplaceInteractionEventType;
    entityId?: string | null;
    searchKind?: MarketplaceSearchKind | null;
    queryLabel?: string | null;
    category?: string | null;
    timezone?: string | null;
    skillTags?: string[];
    resultCount?: number;
    relatedOpportunityId?: string | null;
    relatedProfileUserId?: string | null;
    relatedApplicationId?: string | null;
    relatedJobId?: string | null;
  }) {
    return requestJson<{ ok: true }>(
      apiBaseUrl,
      '/marketplace/analytics/interactions',
      {
        method: 'POST',
        body: JSON.stringify({
          ...input,
          skillTags: input.skillTags ?? [],
          resultCount: input.resultCount ?? 1,
        }),
      },
    );
  },
  getMarketplaceAnalyticsOverview(accessToken: string) {
    return requestJson<{ overview: MarketplaceAnalyticsOverview }>(
      apiBaseUrl,
      '/marketplace/analytics/overview',
      { method: 'GET' },
      accessToken,
    );
  },
  getTalentRecommendations(
    query: {
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
    },
    accessToken: string,
  ) {
    const search = new URLSearchParams();
    if (query.q) search.set('q', query.q);
    if (query.skill) search.set('skill', query.skill);
    if (query.skills) search.set('skills', query.skills);
    if (query.category) search.set('category', query.category);
    if (query.engagementType) search.set('engagementType', query.engagementType);
    if (query.cryptoReadinessRequired) {
      search.set('cryptoReadinessRequired', query.cryptoReadinessRequired);
    }
    if (query.minBudget) search.set('minBudget', query.minBudget);
    if (query.maxBudget) search.set('maxBudget', query.maxBudget);
    if (query.timezoneOverlapHours !== undefined) {
      search.set('timezoneOverlapHours', String(query.timezoneOverlapHours));
    }
    if (query.sort) search.set('sort', query.sort);
    if (query.limit) search.set('limit', String(query.limit));
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return requestJson<{ results: MarketplaceTalentSearchResult[] }>(
      apiBaseUrl,
      `/marketplace/recommendations/talent${suffix}`,
      { method: 'GET' },
      accessToken,
    );
  },
  getOpportunityRecommendations(
    query: {
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
    },
    accessToken: string,
  ) {
    const search = new URLSearchParams();
    if (query.q) search.set('q', query.q);
    if (query.skill) search.set('skill', query.skill);
    if (query.skills) search.set('skills', query.skills);
    if (query.timezone) search.set('timezone', query.timezone);
    if (query.availability) search.set('availability', query.availability);
    if (query.cryptoReadiness) {
      search.set('cryptoReadiness', query.cryptoReadiness);
    }
    if (query.engagementType) search.set('engagementType', query.engagementType);
    if (query.verificationLevel) {
      search.set('verificationLevel', query.verificationLevel);
    }
    if (query.sort) search.set('sort', query.sort);
    if (query.limit) search.set('limit', String(query.limit));
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return requestJson<{ results: MarketplaceOpportunitySearchResult[] }>(
      apiBaseUrl,
      `/marketplace/recommendations/opportunities${suffix}`,
      { method: 'GET' },
      accessToken,
    );
  },
  listMarketplaceSavedSearches(
    query: { kind?: 'talent' | 'opportunity' } | undefined,
    accessToken: string,
  ) {
    const search = new URLSearchParams();
    if (query?.kind) search.set('kind', query.kind);
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return requestJson<{ searches: MarketplaceSavedSearch[] }>(
      apiBaseUrl,
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
      apiBaseUrl,
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
      apiBaseUrl,
      `/marketplace/saved-searches/${id}`,
      { method: 'DELETE' },
      accessToken,
    );
  },
  listMarketplaceTalentPools(accessToken: string) {
    return requestJson<{ pools: MarketplaceTalentPool[] }>(
      apiBaseUrl,
      '/marketplace/talent-pools',
      { method: 'GET' },
      accessToken,
    );
  },
  createMarketplaceTalentPool(
    input: {
      label: string;
      focusSkills?: string[];
      note?: string | null;
    },
    accessToken: string,
  ) {
    return requestJson<{ pool: MarketplaceTalentPool }>(
      apiBaseUrl,
      '/marketplace/talent-pools',
      {
        method: 'POST',
        body: JSON.stringify({
          ...input,
          focusSkills: input.focusSkills ?? [],
        }),
      },
      accessToken,
    );
  },
  addMarketplaceTalentPoolMember(
    poolId: string,
    input: {
      profileSlug: string;
      stage?: MarketplaceTalentPoolMemberStage;
      note?: string | null;
      sourceOpportunityId?: string | null;
      sourceApplicationId?: string | null;
      sourceJobId?: string | null;
    },
    accessToken: string,
  ) {
    return requestJson<{ pool: MarketplaceTalentPool }>(
      apiBaseUrl,
      `/marketplace/talent-pools/${encodeURIComponent(poolId)}/members`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  updateMarketplaceTalentPoolMember(
    poolId: string,
    memberId: string,
    input: {
      stage?: MarketplaceTalentPoolMemberStage;
      note?: string | null;
    },
    accessToken: string,
  ) {
    return requestJson<{ pool: MarketplaceTalentPool }>(
      apiBaseUrl,
      `/marketplace/talent-pools/${encodeURIComponent(poolId)}/members/${encodeURIComponent(memberId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  listMarketplaceAutomationRules(accessToken: string) {
    return requestJson<{ rules: MarketplaceAutomationRule[] }>(
      apiBaseUrl,
      '/marketplace/automation-rules',
      { method: 'GET' },
      accessToken,
    );
  },
  createMarketplaceAutomationRule(
    input: {
      kind: MarketplaceAutomationRuleKind;
      label: string;
      targetId?: string | null;
      schedule?: MarketplaceAutomationRuleSchedule;
      enabled?: boolean;
    },
    accessToken: string,
  ) {
    return requestJson<{ rule: MarketplaceAutomationRule }>(
      apiBaseUrl,
      '/marketplace/automation-rules',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  updateMarketplaceAutomationRule(
    id: string,
    input: {
      label?: string;
      targetId?: string | null;
      schedule?: MarketplaceAutomationRuleSchedule;
      enabled?: boolean;
    },
    accessToken: string,
  ) {
    return requestJson<{ rule: MarketplaceAutomationRule }>(
      apiBaseUrl,
      `/marketplace/automation-rules/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  getMarketplaceLifecycleDigest(accessToken: string) {
    return requestJson<{ digest: MarketplaceLifecycleDigest }>(
      apiBaseUrl,
      '/marketplace/lifecycle/digest',
      { method: 'GET' },
      accessToken,
    );
  },
  listMyMarketplaceInvites(accessToken: string) {
    return requestJson<{ invites: MarketplaceOpportunityInvite[] }>(
      apiBaseUrl,
      '/marketplace/invites/mine',
      { method: 'GET' },
      accessToken,
    );
  },
  inviteTalentToMarketplaceOpportunity(
    id: string,
    input: {
      profileSlug: string;
      message?: string | null;
    },
    accessToken: string,
  ) {
    return requestJson<{ invite: MarketplaceOpportunityInvite }>(
      apiBaseUrl,
      `/marketplace/opportunities/${id}/invite`,
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
  withdrawMarketplaceApplication(
    id: string,
    accessToken: string,
    input?: {
      reason?: string | null;
      noHireReason?: MarketplaceNoHireReason | null;
    },
  ) {
    return requestJson<{ applications: MarketplaceApplication[] }>(
      apiBaseUrl,
      `/marketplace/applications/${id}/withdraw`,
      {
        method: 'POST',
        body: JSON.stringify(input ?? {}),
      },
      accessToken,
    );
  },
  shortlistMarketplaceApplication(
    id: string,
    accessToken: string,
    input?: {
      reason?: string | null;
      noHireReason?: MarketplaceNoHireReason | null;
    },
  ) {
    return requestJson<{ applications: MarketplaceApplication[] }>(
      apiBaseUrl,
      `/marketplace/applications/${id}/shortlist`,
      {
        method: 'POST',
        body: JSON.stringify(input ?? {}),
      },
      accessToken,
    );
  },
  rejectMarketplaceApplication(
    id: string,
    accessToken: string,
    input?: {
      reason?: string | null;
      noHireReason?: MarketplaceNoHireReason | null;
    },
  ) {
    return requestJson<{ applications: MarketplaceApplication[] }>(
      apiBaseUrl,
      `/marketplace/applications/${id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify(input ?? {}),
      },
      accessToken,
    );
  },
  reviseMarketplaceApplication(
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
      revisionReason?: string | null;
    },
    accessToken: string,
  ) {
    return requestJson<{ revision: MarketplaceApplicationRevision }>(
      apiBaseUrl,
      `/marketplace/applications/${id}/revisions`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  getMarketplaceApplicationTimeline(id: string, accessToken: string) {
    return requestJson<{ timeline: MarketplaceApplicationTimeline }>(
      apiBaseUrl,
      `/marketplace/applications/${id}/timeline`,
      { method: 'GET' },
      accessToken,
    );
  },
  getMarketplaceApplicationInterviewThread(id: string, accessToken: string) {
    return requestJson<{ thread: MarketplaceInterviewThread }>(
      apiBaseUrl,
      `/marketplace/applications/${id}/interview`,
      { method: 'GET' },
      accessToken,
    );
  },
  postMarketplaceApplicationInterviewMessage(
    id: string,
    input: {
      kind: 'clarification' | 'interview';
      body: string;
    },
    accessToken: string,
  ) {
    return requestJson<{ thread: MarketplaceInterviewThread }>(
      apiBaseUrl,
      `/marketplace/applications/${id}/interview/messages`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  createMarketplaceApplicationOffer(
    id: string,
    input: {
      message?: string | null;
      proposedRate?: string | null;
      milestones: MarketplaceOfferMilestoneDraft[];
    },
    accessToken: string,
  ) {
    return requestJson<{ offer: MarketplaceOffer }>(
      apiBaseUrl,
      `/marketplace/applications/${id}/offers`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  hireMarketplaceApplication(
    id: string,
    accessToken: string,
    input?: {
      reason?: string | null;
      noHireReason?: MarketplaceNoHireReason | null;
    },
  ) {
    return requestJson<HireApplicationResponse>(
      apiBaseUrl,
      `/marketplace/applications/${id}/hire`,
      {
        method: 'POST',
        body: JSON.stringify(input ?? {}),
      },
      accessToken,
    );
  },
  getMarketplaceOpportunityApplicationComparison(
    id: string,
    accessToken: string,
  ) {
    return requestJson<{ candidates: MarketplaceApplicationComparison[] }>(
      apiBaseUrl,
      `/marketplace/opportunities/${id}/compare`,
      { method: 'GET' },
      accessToken,
    );
  },
  respondToMarketplaceOffer(
    id: string,
    input: {
      action: 'accept' | 'counter' | 'decline';
      message?: string | null;
      proposedRate?: string | null;
      milestones?: MarketplaceOfferMilestoneDraft[];
      declineReason?: string | null;
    },
    accessToken: string,
  ) {
    return requestJson<{ offer: MarketplaceOffer }>(
      apiBaseUrl,
      `/marketplace/offers/${id}/respond`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  getMarketplaceContractDraft(id: string, accessToken: string) {
    return requestJson<{ draft: MarketplaceContractDraft }>(
      apiBaseUrl,
      `/marketplace/contract-drafts/${id}`,
      { method: 'GET' },
      accessToken,
    );
  },
  reviseMarketplaceContractDraft(
    id: string,
    input: {
      title: string;
      description: string;
      scopeSummary: string;
      acceptanceCriteria: string[];
      outcomes: string[];
      timeline: string;
      milestones: MarketplaceOfferMilestoneDraft[];
      reviewWindowDays: number;
      disputeModel: string;
      evidenceExpectation: string;
      kickoffNote: string;
      reason?: string | null;
    },
    accessToken: string,
  ) {
    return requestJson<{ draft: MarketplaceContractDraft }>(
      apiBaseUrl,
      `/marketplace/contract-drafts/${id}/revise`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  approveMarketplaceContractDraft(id: string, accessToken: string) {
    return requestJson<{ draft: MarketplaceContractDraft }>(
      apiBaseUrl,
      `/marketplace/contract-drafts/${id}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      accessToken,
    );
  },
  convertMarketplaceContractDraft(id: string, accessToken: string) {
    return requestJson<HireApplicationResponse>(
      apiBaseUrl,
      `/marketplace/contract-drafts/${id}/convert`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      accessToken,
    );
  },
};
