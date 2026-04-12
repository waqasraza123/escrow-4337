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

export type MarketplaceProfileRecord = {
  userId: string;
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
  displayName: string;
  profileSlug: string | null;
};

export type MarketplaceTalentSummary = {
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

export type MarketplaceApplicationOpportunitySummary = {
  id: string;
  title: string;
  visibility: OpportunityVisibility;
  status: OpportunityStatus;
  ownerDisplayName: string;
};

export type MarketplaceApplicationView = Omit<
  MarketplaceApplicationRecord,
  'applicantUserId'
> & {
  applicant: MarketplaceTalentSummary;
  opportunity: MarketplaceApplicationOpportunitySummary;
  fitScore: number;
  fitBreakdown: MarketplaceFitBreakdownEntry[];
  riskFlags: string[];
  dossier: MarketplaceApplicationDossier;
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
  };
  agingOpportunities: Array<{
    opportunityId: string;
    title: string;
    ownerDisplayName: string;
    ageDays: number;
    status: OpportunityStatus;
    visibility: OpportunityVisibility;
  }>;
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

export type MarketplaceMatchesResponse = {
  matches: MarketplaceApplicationDossier[];
};

export type MarketplaceApplicationDossierResponse = {
  dossier: MarketplaceApplicationDossier;
};

export type HireApplicationResponse = {
  applicationId: string;
  opportunityId: string;
  jobId: string;
};
