import { Wallet } from 'ethers';
import { makeTestCurrencyAddress } from '../../../data/builders';
import {
  adminBaseUrl,
  closeLocalProfileDb,
  localArbitratorWallet,
  webBaseUrl,
} from '../../../fixtures/local-profile';
import { expect, test } from '../../../fixtures/local-journeys';
import { runAuthenticatedMarketplaceExactFlow } from '../../../flows/marketplace-exact-flow';

test.afterAll(async () => {
  await closeLocalProfileDb();
});

test('exact marketplace journey publishes, applies, hires, and resolves through escrow', async ({
  browser,
  localSessionFactory,
  runId,
}) => {
  test.setTimeout(180_000);

  const clientWallet = Wallet.createRandom();
  const talentWallet = Wallet.createRandom();
  const disputeReason = `Marketplace dispute ${runId}`;
  const disputeEvidenceUrl = `https://example.com/marketplace-dispute/${runId}`;
  const resolutionNote = `Marketplace operator release ${runId}`;
  const clientActor = await localSessionFactory({
    role: `marketplace-exact-client.${runId}`,
    linkedWallet: clientWallet,
    provisionSmartAccountOwner: clientWallet.address,
  });
  const talentActor = await localSessionFactory({
    role: `marketplace-exact-talent.${runId}`,
    linkedWallet: talentWallet,
  });
  const operatorActor = await localSessionFactory({
    role: `marketplace-exact-operator.${runId}`,
    app: 'admin',
    linkedWallet: localArbitratorWallet,
  });

  const clientContext = await browser.newContext({
    storageState: clientActor.storageState,
  });
  const talentContext = await browser.newContext({
    storageState: talentActor.storageState,
  });
  const operatorContext = await browser.newContext({
    storageState: operatorActor.storageState,
  });
  const clientPage = await clientContext.newPage();
  const talentPage = await talentContext.newPage();
  const operatorPage = await operatorContext.newPage();

  const opportunityTitle = `Marketplace Exact Engineer ${runId}`;
  const opportunitySummary = `Ship the exact funnel ${runId}`;
  const opportunityTimeline = `2 weeks ${runId}`;
  const currencyAddress = makeTestCurrencyAddress('8');
  const deliveryNote = `Marketplace delivery note ${runId}`;
  const deliveryEvidenceUrl = `https://example.com/marketplace-delivery/${runId}`;
  await runAuthenticatedMarketplaceExactFlow({
    clientPage,
    contractorPage: talentPage,
    operatorPage,
    webBaseUrl,
    adminBaseUrl,
    clientProfile: {
      slug: `exact-client-${runId}`.slice(0, 40),
      displayName: `Client ${runId}`,
      headline: 'Startup hiring through escrow',
      bio: 'We want one contractor and one escrow-backed workflow.',
      skills: 'product, react',
      portfolioUrl: `https://example.com/client/${runId}`,
    },
    contractorProfile: {
      slug: `exact-talent-${runId}`.slice(0, 40),
      displayName: `Talent ${runId}`,
      headline: 'Full-stack contractor',
      bio: 'I apply with a verified wallet and expect escrow.',
      skills: 'typescript, react',
      portfolioUrl: `https://example.com/talent/${runId}`,
    },
    opportunity: {
      title: opportunityTitle,
      summary: opportunitySummary,
      description: 'Build the exact marketplace browser canary.',
      category: 'software-development',
      currencyAddress,
      requiredSkills: 'typescript, react',
      budgetMin: '1800',
      budgetMax: '3200',
      timeline: opportunityTimeline,
    },
    contractorDisplayName: `Talent ${runId}`,
    operatorEmail: operatorActor.email,
    deliveryNote,
    deliveryEvidenceUrl,
    disputeReason,
    disputeEvidenceUrl,
    resolutionAction: 'release',
    resolutionNote,
  });

  await Promise.all([clientContext.close(), talentContext.close(), operatorContext.close()]);
});
