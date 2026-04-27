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
  warnings: string[];
  providers: {
    emailMode: 'mock' | 'relay';
    smartAccountMode: 'mock' | 'relay';
    escrowMode: 'mock' | 'relay';
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

export type JobMilestone = {
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
};

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
  milestones: JobMilestone[];
  onchain: {
    chainId: number;
    contractAddress: string;
    escrowId: string | null;
    clientAddress: string;
    workerAddress: string;
    currencyAddress: string;
  };
};

export type JobsListResponse = {
  jobs: Array<{
    job: JobView;
    participantRoles: Array<'client' | 'worker'>;
  }>;
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
  contractorParticipation: {
    status: 'pending' | 'joined';
    joinedAt: number | null;
  };
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
  revisionRequest: {
    note: string;
    requestedByUserId: string;
    requestedByEmail: string;
    requestedAt: number;
  } | null;
  approval: {
    note: string | null;
    approvedByUserId: string;
    approvedByEmail: string;
    approvedAt: number;
  } | null;
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

export type SupportCaseReason =
  | 'general_help'
  | 'fee_question'
  | 'fee_exception'
  | 'stuck_funding'
  | 'dispute_followup'
  | 'release_delay';

export type SupportCaseStatus =
  | 'open'
  | 'investigating'
  | 'waiting_on_client'
  | 'waiting_on_worker'
  | 'resolved';

export type SupportCaseSeverity = 'routine' | 'elevated' | 'critical';

export type SupportCaseMessage = {
  id: string;
  authorRole: 'client' | 'worker' | 'operator';
  visibility: 'external' | 'internal';
  body: string;
  createdAt: number;
  author: {
    userId: string;
    email: string;
  };
};

export type SupportCase = {
  id: string;
  jobId: string;
  milestoneIndex: number | null;
  reason: SupportCaseReason;
  status: SupportCaseStatus;
  severity: SupportCaseSeverity;
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
  messages: SupportCaseMessage[];
};

export type ProjectSupportCaseSummary = SupportCase;

export type ProjectRoom = {
  job: JobView;
  participantRoles: Array<'client' | 'worker'>;
  submissions: ProjectSubmission[];
  messages: ProjectMessage[];
  activity: ProjectActivity[];
  supportCases: SupportCase[];
};

export type MarketplaceReviewVisibilityStatus = 'visible' | 'hidden';

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

export type MarketplaceScreeningQuestion = {
  id: string;
  prompt: string;
  required: boolean;
};

export type MarketplaceScreeningAnswer = {
  questionId: string;
  answer: string;
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

export type MarketplaceReviewScores = {
  scopeClarity: number;
  communication: number;
  timeliness: number;
  outcomeQuality: number;
};

export type MarketplaceReputationSnapshot = {
  subjectUserId: string;
  role: 'client' | 'worker';
  identityConfidence:
    | 'email_verified'
    | 'wallet_verified'
    | 'smart_account_ready'
    | 'operator_reviewed_proof';
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
  publicReviews: unknown[];
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

export type MarketplaceOpportunityDetail = MarketplaceOpportunity & {
  applications?: MarketplaceApplication[];
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
  contractPath: string | null;
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
  riskFlags: string[];
};

export type MarketplaceSearchReason = {
  code: string;
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

export type MarketplaceTalentSearchResult = {
  profile: MarketplaceProfile;
  reasons: MarketplaceSearchReason[];
  ranking: MarketplaceRankingFeatureSnapshot;
  inviteStatus: 'pending' | 'applied' | 'dismissed' | null;
};

export type MarketplaceOpportunitySearchResult = {
  opportunity: MarketplaceOpportunity;
  reasons: MarketplaceSearchReason[];
  ranking: MarketplaceRankingFeatureSnapshot;
  inviteStatus: 'pending' | 'applied' | 'dismissed' | null;
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
};

export type MarketplaceNotification = {
  id: string;
  userId: string;
  workspaceId: string | null;
  kind: string;
  status: 'unread' | 'read' | 'dismissed';
  title: string;
  detail: string;
  relatedOpportunityId: string | null;
  relatedApplicationId: string | null;
  relatedJobId: string | null;
  createdAt: number;
  updatedAt: number;
};
