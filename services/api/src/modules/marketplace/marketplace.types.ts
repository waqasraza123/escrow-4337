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
export type MarketplaceAutomationRuleSchedule =
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
export type MarketplaceIdentityRiskLevel = 'low' | 'medium' | 'high';
export type MarketplaceRiskSignalSeverity = 'low' | 'medium' | 'high';
export type MarketplaceRiskSignalCode =
  | 'high_dispute_rate'
  | 'repeat_abuse_reports'
  | 'review_hidden_by_operator'
  | 'identity_mismatch'
  | 'off_platform_payment_report'
  | 'revision_heavy_delivery';
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

export type MarketplaceTalentPoolRecord = {
  id: string;
  ownerUserId: string;
  workspaceId: string;
  label: string;
  focusSkills: string[];
  note: string | null;
  createdAt: number;
  updatedAt: number;
};

export type MarketplaceTalentPoolMemberRecord = {
  id: string;
  poolId: string;
  profileUserId: string;
  profileSlug: string;
  addedByUserId: string;
  stage: MarketplaceTalentPoolMemberStage;
  note: string | null;
  sourceOpportunityId: string | null;
  sourceApplicationId: string | null;
  sourceJobId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type MarketplaceAutomationRuleRecord = {
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

export type MarketplaceContractDraftRevisionRecord = {
  revisionNumber: number;
  snapshot: MarketplaceContractMetadataSnapshot;
  metadataHash: string;
  revisedByUserId: string;
  reason: string | null;
  createdAt: number;
};

export type MarketplaceContractDraftRecord = {
  id: string;
  applicationId: string;
  opportunityId: string;
  offerId: string;
  clientUserId: string;
  applicantUserId: string;
  status: MarketplaceContractDraftStatus;
  latestSnapshot: MarketplaceContractMetadataSnapshot;
  metadataHash: string;
  revisions: MarketplaceContractDraftRevisionRecord[];
  clientApprovedAt: number | null;
  applicantApprovedAt: number | null;
  finalizedAt: number | null;
  convertedJobId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type MarketplaceReviewScores = {
  scopeClarity: number;
  communication: number;
  timeliness: number;
  outcomeQuality: number;
};

export type MarketplaceReviewRecord = {
  id: string;
  jobId: string;
  reviewerUserId: string;
  revieweeUserId: string;
  reviewerRole: 'client' | 'worker';
  revieweeRole: 'client' | 'worker';
  rating: number;
  scores: MarketplaceReviewScores;
  headline: string | null;
  body: string | null;
  visibilityStatus: MarketplaceReviewVisibilityStatus;
  moderationNote: string | null;
  moderatedByUserId: string | null;
  moderatedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type MarketplaceIdentityRiskReviewRecord = {
  id: string;
  subjectUserId: string;
  confidenceLabel: MarketplaceIdentityConfidenceLabel;
  riskLevel: MarketplaceIdentityRiskLevel;
  flags: MarketplaceRiskSignalCode[];
  operatorSummary: string | null;
  reviewedByUserId: string;
  reviewedAt: number;
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

export type MarketplaceInteractionEventRecord = {
  id: string;
  actorUserId: string | null;
  actorWorkspaceId: string | null;
  surface: MarketplaceInteractionSurface;
  entityType: MarketplaceInteractionEntityType;
  eventType: MarketplaceInteractionEventType;
  entityId: string | null;
  searchKind: MarketplaceSearchKind | null;
  queryLabel: string | null;
  category: string | null;
  timezone: string | null;
  skillTags: string[];
  resultCount: number;
  relatedOpportunityId: string | null;
  relatedProfileUserId: string | null;
  relatedApplicationId: string | null;
  relatedJobId: string | null;
  createdAt: number;
};

export type MarketplaceProfileView = Omit<
  MarketplaceProfileRecord,
  'moderationStatus'
> & {
  verifiedWalletAddress: string | null;
  verificationLevel: MarketplaceVerificationLevel;
  escrowStats: MarketplaceEscrowStats;
  reputation: MarketplaceReputationSnapshot;
  publicReviews: MarketplaceReviewView[];
  completedEscrowCount: number;
  isComplete: boolean;
};

export type MarketplaceAdminProfileView = MarketplaceProfileView & {
  moderationStatus: ModerationStatus;
  identityReview: MarketplaceIdentityRiskReviewView | null;
  riskSignals: MarketplaceRiskSignalView[];
};

export type MarketplaceClientSummary = {
  userId: string;
  organizationId: string | null;
  workspaceId: string | null;
  workspaceKind: 'client';
  displayName: string;
  profileSlug: string | null;
  reputation: MarketplaceReputationSnapshot;
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
  reputation: MarketplaceReputationSnapshot;
  completedEscrowCount: number;
};

export type MarketplaceReviewView = Omit<
  MarketplaceReviewRecord,
  'reviewerUserId' | 'revieweeUserId' | 'moderatedByUserId'
> & {
  reviewer: {
    userId: string;
    displayName: string;
    role: 'client' | 'worker';
  };
  reviewee: {
    userId: string;
    role: 'client' | 'worker';
  };
  moderatedBy: {
    userId: string;
    email: string;
  } | null;
};

export type MarketplaceIdentityRiskReviewView = Omit<
  MarketplaceIdentityRiskReviewRecord,
  'reviewedByUserId'
> & {
  reviewedBy: {
    userId: string;
    email: string;
  };
};

export type MarketplaceRiskSignalView = {
  code: MarketplaceRiskSignalCode;
  severity: MarketplaceRiskSignalSeverity;
  summary: string;
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
  contractDraft: MarketplaceContractDraftView | null;
};

export type MarketplaceApplicationComparisonView = {
  application: MarketplaceApplicationView;
  latestRevision: MarketplaceApplicationRevisionView | null;
  latestOffer: MarketplaceOfferView | null;
  latestMessageAt: number | null;
  decisionCount: number;
  contractDraftStatus: MarketplaceContractDraftStatus | null;
};

export type MarketplaceContractDraftView = MarketplaceContractDraftRecord;

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

export type MarketplaceTalentPoolMemberView =
  Omit<MarketplaceTalentPoolMemberRecord, 'profileUserId' | 'profileSlug'> & {
    profile: MarketplaceTalentSummary;
    reviewAverage: number | null;
    activeInviteStatus: MarketplaceOpportunityInviteStatus | null;
  };

export type MarketplaceTalentPoolView = MarketplaceTalentPoolRecord & {
  members: MarketplaceTalentPoolMemberView[];
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

export type MarketplaceAutomationRuleView = MarketplaceAutomationRuleRecord & {
  pendingTaskCount: number;
  summary: string;
};

export type MarketplaceRehireCandidateView = {
  jobId: string;
  completedAt: number | null;
  title: string;
  profile: MarketplaceTalentSummary;
  reviewAverage: number | null;
  relationshipStrength: 'repeat_ready' | 'trusted' | 'watch';
};

export type MarketplaceLifecycleDigest = {
  generatedAt: string;
  workspace:
    | {
        workspaceId: string;
        kind: 'client' | 'freelancer';
        organizationId: string;
        organizationKind: 'personal' | 'client' | 'agency';
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
  rehireCandidates: MarketplaceRehireCandidateView[];
  tasks: MarketplaceLifecycleTask[];
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
    totalReviews: number;
    visibleReviews: number;
    hiddenReviews: number;
    highRiskIdentityReviews: number;
    operatorReviewedIdentities: number;
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
        kind: 'client' | 'freelancer';
        organizationId: string;
        organizationKind: 'personal' | 'client' | 'agency';
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

export type MarketplaceTalentPoolsResponse = {
  pools: MarketplaceTalentPoolView[];
};

export type MarketplaceTalentPoolResponse = {
  pool: MarketplaceTalentPoolView;
};

export type MarketplaceAutomationRulesResponse = {
  rules: MarketplaceAutomationRuleView[];
};

export type MarketplaceAutomationRuleResponse = {
  rule: MarketplaceAutomationRuleView;
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

export type MarketplaceContractDraftResponse = {
  draft: MarketplaceContractDraftView;
};

export type MarketplaceAbuseReportResponse = {
  report: MarketplaceAbuseReportView;
};

export type MarketplaceAbuseReportsListResponse = {
  reports: MarketplaceAbuseReportView[];
};

export type MarketplaceJobReviewsResponse = {
  reviews: MarketplaceReviewView[];
};

export type MarketplaceReviewResponse = {
  review: MarketplaceReviewView;
};

export type MarketplaceModerationReviewsListResponse = {
  reviews: MarketplaceReviewView[];
};

export type MarketplaceIdentityRiskReviewResponse = {
  review: MarketplaceIdentityRiskReviewView;
};

export type MarketplaceAnalyticsOverviewResponse = {
  overview: MarketplaceAnalyticsOverview;
};

export type MarketplaceLifecycleDigestResponse = {
  digest: MarketplaceLifecycleDigest;
};

export type MarketplaceIntelligenceReportResponse = {
  report: MarketplaceIntelligenceReport;
};

export type HireApplicationResponse = {
  applicationId: string;
  opportunityId: string;
  jobId: string;
};
