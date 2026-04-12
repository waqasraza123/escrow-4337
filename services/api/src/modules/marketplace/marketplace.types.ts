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

export type MarketplaceProfileRecord = {
  userId: string;
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  skills: string[];
  rateMin: string | null;
  rateMax: string | null;
  timezone: string;
  availability: MarketplaceAvailability;
  portfolioUrls: string[];
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
  visibility: OpportunityVisibility;
  status: OpportunityStatus;
  budgetMin: string | null;
  budgetMax: string | null;
  timeline: string;
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
  verifiedWalletAddress: string | null;
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

export type HireApplicationResponse = {
  applicationId: string;
  opportunityId: string;
  jobId: string;
};
