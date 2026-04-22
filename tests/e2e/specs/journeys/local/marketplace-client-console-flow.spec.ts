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

test('client console journey creates, hires, funds, and resolves through the dedicated client routes', async ({
  browser,
  localSessionFactory,
  runId,
}) => {
  test.setTimeout(180_000);

  const clientWallet = Wallet.createRandom();
  const talentWallet = Wallet.createRandom();
  const disputeReason = `Client console dispute ${runId}`;
  const disputeEvidenceUrl = `https://example.com/client-console-dispute/${runId}`;
  const resolutionNote = `Client console operator release ${runId}`;
  const clientActor = await localSessionFactory({
    role: `marketplace-console-client.${runId}`,
    linkedWallet: clientWallet,
    provisionSmartAccountOwner: clientWallet.address,
  });
  const talentActor = await localSessionFactory({
    role: `marketplace-console-talent.${runId}`,
    linkedWallet: talentWallet,
  });
  const operatorActor = await localSessionFactory({
    role: `marketplace-console-operator.${runId}`,
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

  const opportunityTitle = `Client Console Engineer ${runId}`;
  const opportunitySummary = `Ship the client console flow ${runId}`;
  const opportunityTimeline = `2 weeks ${runId}`;
  const currencyAddress = makeTestCurrencyAddress('9');
  const deliveryNote = `Client console delivery note ${runId}`;
  const deliveryEvidenceUrl = `https://example.com/client-console-delivery/${runId}`;

  await runAuthenticatedMarketplaceExactFlow({
    clientPage,
    contractorPage: talentPage,
    operatorPage,
    webBaseUrl,
    adminBaseUrl,
    clientSurface: 'console',
    clientProfile: {
      slug: `console-client-${runId}`.slice(0, 40),
      displayName: `Console Client ${runId}`,
      headline: 'Hiring through the dedicated client console',
      bio: 'We want the client dashboard flow to stay route-scoped end to end.',
      skills: 'product, react',
      portfolioUrl: `https://example.com/console-client/${runId}`,
      expectedLane: 'client',
      expectedEmptyState:
        'No briefs are live from this workspace yet. Start with one decision-ready brief so review and hire can stay inside the client lane.',
    },
    contractorProfile: {
      slug: `console-talent-${runId}`.slice(0, 40),
      displayName: `Console Talent ${runId}`,
      headline: 'Full-stack contractor',
      bio: 'I apply from the public brief and expect the client to review in the dedicated console.',
      skills: 'typescript, react',
      portfolioUrl: `https://example.com/console-talent/${runId}`,
      expectedLane: 'freelancer',
      expectedEmptyState:
        'Complete your freelancer profile here before applying so proposals carry proof, specialties, and crypto-readiness context.',
    },
    opportunity: {
      title: opportunityTitle,
      summary: opportunitySummary,
      description: 'Build the dedicated client console browser canary.',
      category: 'software-development',
      currencyAddress,
      requiredSkills: 'typescript, react',
      budgetMin: '1800',
      budgetMax: '3200',
      timeline: opportunityTimeline,
    },
    contractorDisplayName: `Console Talent ${runId}`,
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
