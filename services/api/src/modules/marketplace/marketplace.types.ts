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
export type EscrowReadinessStatus =
  | 'ready'
  | 'wallet_required'
  | 'smart_account_required';
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
export type MarketplaceProofArtifactKind =
  | 'portfolio'
  | 'escrow_delivery'
  | 'escrow_case'
  | 'external_case_study';
export type MarketplaceAbuseReportSubjectType = 'profile' | 'opportunity';
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
export type MarketplaceAbuseReportEvidenceReviewStatus =
  | 'pending'
  | 'supports_report'
  | 'insufficient_evidence'
  | 'contradicts_report';
export type MarketplaceAbuseReportClaimState = 'claimed' | 'unclaimed';
export type MarketplaceAbuseReportSortBy =
  | 'priority'
  | 'oldest_open'
  | 'stale_activity'
  | 'recent_activity';
export type MarketplaceAbuseReportQueuePriority =
  | 'critical'
  | 'high'
  | 'normal'
  | 'closed';
export type MarketplaceSavedSearchKind = 'talent' | 'opportunity';
export type MarketplaceSavedSearchAlertFrequency =
  | 'manual'
  | 'daily'
  | 'weekly';
export type MarketplaceOpportunityInviteStatus =
  | 'pending'
  | 'applied'
  | 'dismissed';
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
export type MarketplaceNoHireReason =
  | 'budget_changed'
  | 'scope_changed'
  | 'fit_not_strong_enough'
  | 'candidate_withdrew'
  | 'timeline_mismatch'
  | 'other';
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

export type MarketplaceTalentProofArtifact = {
  id: string;
  label: string;
  url: string;
  kind: MarketplaceProofArtifactKind;
  jobId: string | null;
};

export type MarketplaceCategoryStat = {
  category: string;
  count: number;
};

export type MarketplaceEscrowStats = {
  totalContracts: number;
  completionCount: number;
  disputeCount: number;
  completionRate: number;
  disputeRate: number;
  onTimeDeliveryRate: number;
  averageContractValueBand: 'small' | 'medium' | 'large' | 'unknown';
  completedByCategory: MarketplaceCategoryStat[];
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

export type MarketplaceTalentSearchDocument = {
  profileUserId: string;
  profileSlug: string;
  workspaceId: string | null;
  organizationId: string | null;
  displayName: string;
  headline: string;
  searchableText: string;
  skills: string[];
  specialties: string[];
  timezone: string;
  availability: MarketplaceAvailability;
  preferredEngagements: MarketplaceEngagementType[];
  cryptoReadiness: MarketplaceCryptoReadiness;
  verificationLevel: MarketplaceVerificationLevel | 'unverified';
  ranking: MarketplaceRankingFeatureSnapshot;
  reasons: MarketplaceSearchReason[];
  updatedAt: number;
};

export type MarketplaceOpportunitySearchDocument = {
  opportunityId: string;
  ownerUserId: string;
  ownerWorkspaceId: string | null;
  ownerOrganizationId: string | null;
  title: string;
  summary: string;
  category: string;
  searchableText: string;
  requiredSkills: string[];
  mustHaveSkills: string[];
  engagementType: MarketplaceEngagementType;
  cryptoReadinessRequired: MarketplaceCryptoReadiness;
  timezoneOverlapHours: number | null;
  budgetMin: string | null;
  budgetMax: string | null;
  visibility: OpportunityVisibility;
  status: OpportunityStatus;
  ranking: MarketplaceRankingFeatureSnapshot;
  reasons: MarketplaceSearchReason[];
  publishedAt: number | null;
  updatedAt: number;
};

export type MarketplaceSavedSearchRecord = {
  id: string;
  userId: string;
  workspaceId: string | null;
  kind: MarketplaceSavedSearchKind;
  label: string;
  query: Record<string, string | number | boolean | null>;
  alertFrequency: MarketplaceSavedSearchAlertFrequency;
  lastResultCount: number;
  createdAt: number;
  updatedAt: number;
};

export type MarketplaceOpportunityInviteRecord = {
  id: string;
  opportunityId: string;
  invitedProfileUserId: string;
  invitedProfileSlug: string;
  invitedByUserId: string;
  invitedWorkspaceId: string | null;
  message: string | null;
  status: MarketplaceOpportunityInviteStatus;
  createdAt: number;
  updatedAt: number;
};

export type MarketplaceProfileRecord = {
  userId: string;
  organizationId: string | null;
  workspaceId: string | null;
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  skills: string[];
  specialties: string[];
  portfolioUrls: string[];
  rateMin: string | null;
  rateMax: string | null;
  timezone: string;
  availability: MarketplaceAvailability;
  preferredEngagements: MarketplaceEngagementType[];
  proofArtifacts: MarketplaceTalentProofArtifact[];
  cryptoReadiness: MarketplaceCryptoReadiness;
  moderationStatus: ModerationStatus;
  createdAt: number;
  updatedAt: number;
};

export type MarketplaceOpportunityRecord = {
  id: string;
  ownerUserId: string;
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
  moderationStatus: ModerationStatus;
  publishedAt: number | null;
  hiredApplicationId: string | null;
  hiredJobId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type MarketplaceApplicationRecord = {
  id: string;
  opportunityId: string;
  applicantUserId: string;
  applicantOrganizationId: string | null;
  applicantWorkspaceId: string | null;
  coverNote: string;
  proposedRate: string | null;
  selectedWalletAddress: string;
  screeningAnswers: MarketplaceScreeningAnswer[];
  deliveryApproach: string;
  milestonePlanSummary: string;
  estimatedStartAt: number | null;
  relevantProofArtifacts: MarketplaceTalentProofArtifact[];
  portfolioUrls: string[];
  status: ApplicationStatus;
  hiredJobId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type MarketplaceApplicationRevisionRecord = {
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
  relevantProofArtifacts: MarketplaceTalentProofArtifact[];
  portfolioUrls: string[];
  revisionReason: string | null;
  createdAt: number;
};

export type MarketplaceInterviewThreadRecord = {
  id: string;
  applicationId: string;
  opportunityId: string;
  clientUserId: string;
  applicantUserId: string;
  status: MarketplaceInterviewThreadStatus;
  createdAt: number;
  updatedAt: number;
};

export type MarketplaceInterviewMessageRecord = {
  id: string;
  threadId: string;
  applicationId: string;
  opportunityId: string;
  senderUserId: string;
  senderWorkspaceId: string | null;
  kind: MarketplaceInterviewMessageKind;
  body: string;
  createdAt: number;
};

export type MarketplaceOfferMilestoneDraft = {
  title: string;
  deliverable: string;
  amount: string;
  dueAt: number | null;
};

export type MarketplaceOfferRecord = {
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

export type MarketplaceApplicationDecisionRecord = {
  id: string;
  applicationId: string;
  opportunityId: string;
  actorUserId: string;
  action: MarketplaceDecisionAction;
  reason: string | null;
  noHireReason: MarketplaceNoHireReason | null;
  createdAt: number;
};

export type MarketplaceAbuseReportRecord = {
  id: string;
  subjectType: MarketplaceAbuseReportSubjectType;
  subjectId: string;
  reporterUserId: string;
  reason: MarketplaceAbuseReportReason;
  details: string | null;
  evidenceUrls: string[];
  status: MarketplaceAbuseReportStatus;
  claimedByUserId: string | null;
  claimedAt: number | null;
  escalationReason: string | null;
  escalatedByUserId: string | null;
  escalatedAt: number | null;
  evidenceReviewStatus: MarketplaceAbuseReportEvidenceReviewStatus;
  investigationSummary: string | null;
  evidenceReviewedByUserId: string | null;
  evidenceReviewedAt: number | null;
  resolutionNote: string | null;
  resolvedByUserId: string | null;
  subjectModerationStatus: ModerationStatus | null;
  subjectModeratedByUserId: string | null;
  subjectModeratedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type MarketplaceProfileView = Omit<
  MarketplaceProfileRecord,
  'moderationStatus'
> & {
  verifiedWalletAddress: string | null;
  verificationLevel: MarketplaceVerificationLevel;
  escrowStats: MarketplaceEscrowStats;
  completedEscrowCount: number;
  isComplete: boolean;
};

export type MarketplaceAdminProfileView = MarketplaceProfileView & {
  moderationStatus: ModerationStatus;
};

export type MarketplaceClientSummary = {
  userId: string;
  organizationId: string | null;
  workspaceId: string | null;
  workspaceKind: 'client';
  displayName: string;
  profileSlug: string | null;
};

export type MarketplaceTalentSummary = {
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
  completedEscrowCount: number;
};

export type MarketplaceApplicationOpportunitySummary = {
  id: string;
  title: string;
  visibility: OpportunityVisibility;
  status: OpportunityStatus;
  ownerDisplayName: string;
  ownerWorkspaceId: string | null;
};

export type MarketplaceApplicationView = Omit<
  MarketplaceApplicationRecord,
  'applicantUserId'
> & {
  contractPath: string | null;
  applicant: MarketplaceTalentSummary;
  opportunity: MarketplaceApplicationOpportunitySummary;
  fitScore: number;
  fitBreakdown: MarketplaceFitBreakdownEntry[];
  riskFlags: string[];
  dossier: MarketplaceApplicationDossier;
};

export type MarketplaceApplicationRevisionView =
  MarketplaceApplicationRevisionRecord;

export type MarketplaceInterviewMessageView = MarketplaceInterviewMessageRecord & {
  senderEmail: string;
};

export type MarketplaceInterviewThreadView = MarketplaceInterviewThreadRecord & {
  messages: MarketplaceInterviewMessageView[];
};

export type MarketplaceOfferView = MarketplaceOfferRecord;

export type MarketplaceApplicationDecisionView =
  MarketplaceApplicationDecisionRecord;

export type MarketplaceApplicationTimelineView = {
  application: MarketplaceApplicationView;
  revisions: MarketplaceApplicationRevisionView[];
  interviewThread: MarketplaceInterviewThreadView | null;
  offers: MarketplaceOfferView[];
  decisions: MarketplaceApplicationDecisionView[];
};

export type MarketplaceApplicationComparisonView = {
  application: MarketplaceApplicationView;
  latestRevision: MarketplaceApplicationRevisionView | null;
  latestOffer: MarketplaceOfferView | null;
  latestMessageAt: number | null;
  decisionCount: number;
};

export type MarketplaceOpportunityView = Omit<
  MarketplaceOpportunityRecord,
  'ownerUserId' | 'moderationStatus'
> & {
  owner: MarketplaceClientSummary;
  escrowReadiness: EscrowReadinessStatus;
  applicationCount: number;
};

export type MarketplaceAdminOpportunityView = MarketplaceOpportunityView & {
  moderationStatus: ModerationStatus;
};

export type MarketplaceOpportunityDetailView = MarketplaceOpportunityView & {
  applications?: MarketplaceApplicationView[];
};

export type MarketplaceSavedSearchView = MarketplaceSavedSearchRecord & {
  activeWorkspaceId: string | null;
};

export type MarketplaceOpportunityInviteView = {
  id: string;
  status: MarketplaceOpportunityInviteStatus;
  message: string | null;
  createdAt: number;
  updatedAt: number;
  opportunity: MarketplaceApplicationOpportunitySummary;
  talent: MarketplaceTalentSummary;
};

export type MarketplaceTalentSearchResult = {
  profile: MarketplaceProfileView;
  reasons: MarketplaceSearchReason[];
  ranking: MarketplaceRankingFeatureSnapshot;
  inviteStatus: MarketplaceOpportunityInviteStatus | null;
};

export type MarketplaceOpportunitySearchResult = {
  opportunity: MarketplaceOpportunityView;
  reasons: MarketplaceSearchReason[];
  ranking: MarketplaceRankingFeatureSnapshot;
  inviteStatus: MarketplaceOpportunityInviteStatus | null;
};

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

export type MarketplaceAbuseReportView = {
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
  claimedBy: {
    userId: string;
    email: string;
  } | null;
  claimedAt: number | null;
  escalationReason: string | null;
  escalatedBy: {
    userId: string;
    email: string;
  } | null;
  escalatedAt: number | null;
  evidenceReviewStatus: MarketplaceAbuseReportEvidenceReviewStatus;
  investigationSummary: string | null;
  evidenceReviewedBy: {
    userId: string;
    email: string;
  } | null;
  evidenceReviewedAt: number | null;
  resolutionNote: string | null;
  resolvedBy: {
    userId: string;
    email: string;
  } | null;
  subjectModerationStatus: ModerationStatus | null;
  subjectModeratedBy: {
    userId: string;
    email: string;
  } | null;
  subjectModeratedAt: number | null;
  queuePriority: MarketplaceAbuseReportQueuePriority;
  ageHours: number;
  hoursSinceUpdate: number;
  createdAt: number;
  updatedAt: number;
};

export type MarketplaceModerationDashboard = {
  generatedAt: string;
  summary: {
    totalProfiles: number;
    visibleProfiles: number;
    hiddenProfiles: number;
    suspendedProfiles: number;
    totalOpportunities: number;
    publishedOpportunities: number;
    hiredOpportunities: number;
    visibleOpportunities: number;
    hiddenOpportunities: number;
    suspendedOpportunities: number;
    totalApplications: number;
    submittedApplications: number;
    shortlistedApplications: number;
    hiredApplications: number;
    hireConversionPercent: number;
    agingOpportunityCount: number;
    totalAbuseReports: number;
    openAbuseReports: number;
    reviewingAbuseReports: number;
    claimedAbuseReports: number;
    unclaimedAbuseReports: number;
    escalatedAbuseReports: number;
    agingAbuseReports: number;
    staleAbuseReports: number;
    oldestActiveAbuseReportHours: number | null;
  };
  thresholds: {
    abuseReportAgingHours: number;
    abuseReportStaleHours: number;
  };
  agingOpportunities: Array<{
    opportunityId: string;
    title: string;
    ownerDisplayName: string;
    ageDays: number;
    status: OpportunityStatus;
    visibility: OpportunityVisibility;
  }>;
  recentAbuseReports: MarketplaceAbuseReportView[];
};

export type MarketplaceProfilesListResponse = {
  profiles: MarketplaceProfileView[];
};

export type MarketplaceAdminProfilesListResponse = {
  profiles: MarketplaceAdminProfileView[];
};

export type MarketplaceProfileResponse = {
  profile: MarketplaceProfileView;
};

export type MarketplaceOpportunitiesListResponse = {
  opportunities: MarketplaceOpportunityView[];
};

export type MarketplaceAdminOpportunitiesListResponse = {
  opportunities: MarketplaceAdminOpportunityView[];
};

export type MarketplaceOpportunityResponse = {
  opportunity: MarketplaceOpportunityDetailView;
};

export type MarketplaceApplicationsListResponse = {
  applications: MarketplaceApplicationView[];
};

export type MarketplaceApplicationTimelineResponse = {
  timeline: MarketplaceApplicationTimelineView;
};

export type MarketplaceApplicationComparisonResponse = {
  candidates: MarketplaceApplicationComparisonView[];
};

export type MarketplaceMatchesResponse = {
  matches: MarketplaceApplicationDossier[];
};

export type MarketplaceTalentSearchResponse = {
  results: MarketplaceTalentSearchResult[];
};

export type MarketplaceOpportunitySearchResponse = {
  results: MarketplaceOpportunitySearchResult[];
};

export type MarketplaceSavedSearchesResponse = {
  searches: MarketplaceSavedSearchView[];
};

export type MarketplaceSavedSearchResponse = {
  search: MarketplaceSavedSearchView;
};

export type MarketplaceOpportunityInvitesResponse = {
  invites: MarketplaceOpportunityInviteView[];
};

export type MarketplaceOpportunityInviteResponse = {
  invite: MarketplaceOpportunityInviteView;
};

export type MarketplaceApplicationDossierResponse = {
  dossier: MarketplaceApplicationDossier;
};

export type MarketplaceApplicationRevisionResponse = {
  revision: MarketplaceApplicationRevisionView;
};

export type MarketplaceInterviewThreadResponse = {
  thread: MarketplaceInterviewThreadView;
};

export type MarketplaceOfferResponse = {
  offer: MarketplaceOfferView;
};

export type MarketplaceAbuseReportResponse = {
  report: MarketplaceAbuseReportView;
};

export type MarketplaceAbuseReportsListResponse = {
  reports: MarketplaceAbuseReportView[];
};

export type HireApplicationResponse = {
  applicationId: string;
  opportunityId: string;
  jobId: string;
};
