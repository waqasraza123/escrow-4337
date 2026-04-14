import type { BootstrapSessionTokens } from './session-bootstrap';
import { apiJson } from './session-bootstrap';

type MarketplaceAvailability = 'open' | 'limited' | 'unavailable';
type MarketplaceEngagementType = 'fixed_scope' | 'milestone_retainer' | 'advisory';
type MarketplaceCryptoReadiness =
  | 'wallet_only'
  | 'smart_account_ready'
  | 'escrow_power_user';

export async function upsertMarketplaceProfileForApiSession(input: {
  apiBaseUrl: string;
  session: BootstrapSessionTokens;
  profile: {
    slug: string;
    displayName: string;
    headline: string;
    bio: string;
    skills: string[];
    specialties?: string[];
    timezone?: string;
    availability?: MarketplaceAvailability;
    preferredEngagements?: MarketplaceEngagementType[];
    cryptoReadiness?: MarketplaceCryptoReadiness;
    portfolioUrls?: string[];
  };
}) {
  return apiJson<{ profile: { slug: string; displayName: string } }>(
    input.apiBaseUrl,
    '/marketplace/profiles',
    {
      method: 'POST',
      body: JSON.stringify({
        slug: input.profile.slug,
        displayName: input.profile.displayName,
        headline: input.profile.headline,
        bio: input.profile.bio,
        skills: input.profile.skills,
        specialties: input.profile.specialties ?? [],
        rateMin: null,
        rateMax: null,
        timezone: input.profile.timezone ?? 'UTC',
        availability: input.profile.availability ?? 'open',
        preferredEngagements: input.profile.preferredEngagements ?? ['fixed_scope'],
        cryptoReadiness: input.profile.cryptoReadiness ?? 'wallet_only',
        portfolioUrls: input.profile.portfolioUrls ?? [],
      }),
    },
    input.session.accessToken,
  );
}

export async function createMarketplaceOpportunityForApiSession(input: {
  apiBaseUrl: string;
  session: BootstrapSessionTokens;
  opportunity: {
    title: string;
    summary: string;
    description: string;
    category: string;
    currencyAddress: string;
    requiredSkills: string[];
    mustHaveSkills?: string[];
    outcomes?: string[];
    acceptanceCriteria?: string[];
    visibility?: 'public' | 'private';
    budgetMin?: string | null;
    budgetMax?: string | null;
    timeline: string;
    engagementType?: MarketplaceEngagementType;
    cryptoReadinessRequired?: MarketplaceCryptoReadiness;
  };
}) {
  return apiJson<{ opportunity: { id: string; title: string } }>(
    input.apiBaseUrl,
    '/marketplace/opportunities',
    {
      method: 'POST',
      body: JSON.stringify({
        title: input.opportunity.title,
        summary: input.opportunity.summary,
        description: input.opportunity.description,
        category: input.opportunity.category,
        currencyAddress: input.opportunity.currencyAddress,
        requiredSkills: input.opportunity.requiredSkills,
        mustHaveSkills: input.opportunity.mustHaveSkills ?? [],
        outcomes: input.opportunity.outcomes ?? [],
        acceptanceCriteria: input.opportunity.acceptanceCriteria ?? [],
        screeningQuestions: [],
        visibility: input.opportunity.visibility ?? 'public',
        budgetMin: input.opportunity.budgetMin ?? null,
        budgetMax: input.opportunity.budgetMax ?? null,
        timeline: input.opportunity.timeline,
        desiredStartAt: null,
        timezoneOverlapHours: null,
        engagementType: input.opportunity.engagementType ?? 'fixed_scope',
        cryptoReadinessRequired:
          input.opportunity.cryptoReadinessRequired ?? 'wallet_only',
      }),
    },
    input.session.accessToken,
  );
}

export async function publishMarketplaceOpportunityForApiSession(input: {
  apiBaseUrl: string;
  session: BootstrapSessionTokens;
  opportunityId: string;
}) {
  return apiJson(
    input.apiBaseUrl,
    `/marketplace/opportunities/${input.opportunityId}/publish`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    input.session.accessToken,
  );
}

export async function applyToMarketplaceOpportunityForApiSession(input: {
  apiBaseUrl: string;
  session: BootstrapSessionTokens;
  opportunityId: string;
  selectedWalletAddress: string;
  portfolioUrls?: string[];
  application?: {
    coverNote?: string;
    proposedRate?: string | null;
    deliveryApproach?: string;
    milestonePlanSummary?: string;
  };
}) {
  return apiJson(
    input.apiBaseUrl,
    `/marketplace/opportunities/${input.opportunityId}/applications`,
    {
      method: 'POST',
      body: JSON.stringify({
        coverNote:
          input.application?.coverNote ??
          'I meet the brief requirements and I am ready to move this into escrow.',
        proposedRate: input.application?.proposedRate ?? null,
        selectedWalletAddress: input.selectedWalletAddress,
        screeningAnswers: [],
        deliveryApproach:
          input.application?.deliveryApproach ??
          'I will align on acceptance criteria first, then deliver against milestone checkpoints.',
        milestonePlanSummary:
          input.application?.milestonePlanSummary ??
          'Milestone 1 covers scope alignment and first delivery. Milestone 2 covers validation and handoff.',
        estimatedStartAt: null,
        relevantProofArtifacts: [],
        portfolioUrls: input.portfolioUrls ?? [],
      }),
    },
    input.session.accessToken,
  );
}
