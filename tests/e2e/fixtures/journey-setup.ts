import { Wallet } from 'ethers';
import type { BootstrapSessionTokens } from './session-bootstrap';
import {
  createJobForApiSession,
  fundJobForApiSession,
  linkWalletForApiSession,
  provisionSmartAccountForApiSession,
  setMilestonesForApiSession,
} from './escrow-api';
import {
  applyToMarketplaceOpportunityForApiSession,
  createMarketplaceOpportunityForApiSession,
  publishMarketplaceOpportunityForApiSession,
  upsertMarketplaceProfileForApiSession,
} from './marketplace-api';

type SeededMarketplaceProfileInput = {
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  skills: string[];
  portfolioUrls?: string[];
};

type SeededMarketplaceOpportunityInput = {
  title: string;
  summary: string;
  description: string;
  category: string;
  currencyAddress: string;
  requiredSkills: string[];
  budgetMin: string;
  budgetMax: string;
  timeline: string;
};

export async function seedJoinReadyJobViaApi(input: {
  apiBaseUrl: string;
  client: {
    session: BootstrapSessionTokens;
    wallet: Wallet;
    ensureWalletLinked?: boolean;
    ensureSmartAccountProvisioned?: boolean;
  };
  contractor: {
    email: string;
    wallet: Wallet;
    session?: BootstrapSessionTokens;
    ensureWalletLinked?: boolean;
  };
  job: {
    title: string;
    description: string;
    currencyAddress: string;
  };
}) {
  if (input.client.ensureWalletLinked ?? true) {
    await linkWalletForApiSession({
      apiBaseUrl: input.apiBaseUrl,
      session: input.client.session,
      wallet: input.client.wallet,
    });
  }

  if (input.client.ensureSmartAccountProvisioned ?? true) {
    await provisionSmartAccountForApiSession({
      apiBaseUrl: input.apiBaseUrl,
      session: input.client.session,
      ownerAddress: input.client.wallet.address,
    });
  }

  if (
    input.contractor.session &&
    (input.contractor.ensureWalletLinked ?? true)
  ) {
    await linkWalletForApiSession({
      apiBaseUrl: input.apiBaseUrl,
      session: input.contractor.session,
      wallet: input.contractor.wallet,
    });
  }

  const jobId = await createJobForApiSession({
    apiBaseUrl: input.apiBaseUrl,
    session: input.client.session,
    contractorEmail: input.contractor.email,
    workerAddress: input.contractor.wallet.address,
    currencyAddress: input.job.currencyAddress,
    title: input.job.title,
    description: input.job.description,
  });

  await fundJobForApiSession({
    apiBaseUrl: input.apiBaseUrl,
    session: input.client.session,
    jobId,
    amount: '100',
  });

  await setMilestonesForApiSession({
    apiBaseUrl: input.apiBaseUrl,
    session: input.client.session,
    jobId,
    milestones: [
      {
        title: 'Discovery',
        deliverable: 'Accepted scope and milestone plan',
        amount: '50',
      },
      {
        title: 'Delivery',
        deliverable: 'Final shipped implementation',
        amount: '50',
      },
    ],
  });

  return { jobId };
}

export async function seedMarketplaceHireReadyOpportunityViaApi(input: {
  apiBaseUrl: string;
  client: {
    session: BootstrapSessionTokens;
    wallet: Wallet;
    profile: SeededMarketplaceProfileInput;
    ensureWalletLinked?: boolean;
    ensureSmartAccountProvisioned?: boolean;
  };
  talent: {
    session: BootstrapSessionTokens;
    wallet: Wallet;
    profile: SeededMarketplaceProfileInput;
    ensureWalletLinked?: boolean;
  };
  opportunity: SeededMarketplaceOpportunityInput;
}) {
  const { opportunityId } = await seedMarketplacePublishedOpportunityViaApi(input);

  await applyToMarketplaceOpportunityForApiSession({
    apiBaseUrl: input.apiBaseUrl,
    session: input.talent.session,
    opportunityId,
    selectedWalletAddress: input.talent.wallet.address,
    portfolioUrls: input.talent.profile.portfolioUrls ?? [],
  });

  return {
    opportunityId,
  };
}

export async function seedMarketplacePublishedOpportunityViaApi(input: {
  apiBaseUrl: string;
  client: {
    session: BootstrapSessionTokens;
    wallet: Wallet;
    profile: SeededMarketplaceProfileInput;
    ensureWalletLinked?: boolean;
    ensureSmartAccountProvisioned?: boolean;
  };
  talent: {
    session: BootstrapSessionTokens;
    wallet: Wallet;
    profile: SeededMarketplaceProfileInput;
    ensureWalletLinked?: boolean;
  };
  opportunity: SeededMarketplaceOpportunityInput;
}) {
  if (input.client.ensureWalletLinked ?? true) {
    await linkWalletForApiSession({
      apiBaseUrl: input.apiBaseUrl,
      session: input.client.session,
      wallet: input.client.wallet,
    });
  }

  if (input.client.ensureSmartAccountProvisioned ?? true) {
    await provisionSmartAccountForApiSession({
      apiBaseUrl: input.apiBaseUrl,
      session: input.client.session,
      ownerAddress: input.client.wallet.address,
    });
  }

  if (input.talent.ensureWalletLinked ?? true) {
    await linkWalletForApiSession({
      apiBaseUrl: input.apiBaseUrl,
      session: input.talent.session,
      wallet: input.talent.wallet,
    });
  }

  await upsertMarketplaceProfileForApiSession({
    apiBaseUrl: input.apiBaseUrl,
    session: input.client.session,
    profile: input.client.profile,
  });

  const createdOpportunity = await createMarketplaceOpportunityForApiSession({
    apiBaseUrl: input.apiBaseUrl,
    session: input.client.session,
    opportunity: {
      title: input.opportunity.title,
      summary: input.opportunity.summary,
      description: input.opportunity.description,
      category: input.opportunity.category,
      currencyAddress: input.opportunity.currencyAddress,
      requiredSkills: input.opportunity.requiredSkills,
      budgetMin: input.opportunity.budgetMin,
      budgetMax: input.opportunity.budgetMax,
      timeline: input.opportunity.timeline,
      visibility: 'public',
    },
  });

  await publishMarketplaceOpportunityForApiSession({
    apiBaseUrl: input.apiBaseUrl,
    session: input.client.session,
    opportunityId: createdOpportunity.opportunity.id,
  });

  await upsertMarketplaceProfileForApiSession({
    apiBaseUrl: input.apiBaseUrl,
    session: input.talent.session,
    profile: input.talent.profile,
  });

  return {
    opportunityId: createdOpportunity.opportunity.id,
  };
}
