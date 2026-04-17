import { Wallet } from 'ethers';
import type { Locator, Page } from '@playwright/test';
import { makeTestCurrencyAddress } from '../../../data/builders';
import {
  adminBaseUrl,
  apiBaseUrl,
  closeLocalProfileDb,
  localArbitratorWallet,
  webBaseUrl,
} from '../../../fixtures/local-profile';
import {
  commitSelectedJobMilestones,
  deliverSelectedMilestone,
  fundSelectedJob,
  openMilestoneDispute,
  resolveDisputedMilestone,
} from '../../../flows/launch-candidate-flow';
import { seedMarketplaceHireReadyOpportunityViaApi } from '../../../fixtures/journey-setup';
import { expect, test } from '../../../fixtures/local-journeys';
import {
  buildEscrowExportProbes,
  expectExportDownload,
} from '../../../flows/operator-export-flow';

test.afterAll(async () => {
  await closeLocalProfileDb();
});

function workspacePanel(page: Page, heading: string): Locator {
  return page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: heading }) })
    .first();
}

function panelCard(panel: Locator, title: string): Locator {
  return panel.locator('article').filter({ hasText: title }).first();
}

test('seeded marketplace journey hires from review and resolves the downstream escrow flow with refund', async ({
  browser,
  localSessionFactory,
  runId,
}) => {
  test.setTimeout(180_000);

  const clientWallet = Wallet.createRandom();
  const talentWallet = Wallet.createRandom();
  const deliveryNote = `Marketplace seeded delivery ${runId}`;
  const deliveryEvidenceUrl = `https://example.com/marketplace-seeded-delivery/${runId}`;
  const disputeReason = `Marketplace seeded dispute ${runId}`;
  const disputeEvidenceUrl = `https://example.com/marketplace-seeded-dispute/${runId}`;
  const resolutionNote = `Marketplace seeded operator refund ${runId}`;
  const clientActor = await localSessionFactory({
    role: `marketplace-client.${runId}`,
    linkedWallet: clientWallet,
    provisionSmartAccountOwner: clientWallet.address,
  });
  const talentActor = await localSessionFactory({
    role: `marketplace-talent.${runId}`,
    linkedWallet: talentWallet,
  });
  const operatorActor = await localSessionFactory({
    role: `marketplace-operator.${runId}`,
    app: 'admin',
    linkedWallet: localArbitratorWallet,
  });

  const opportunityTitle = `Marketplace Product Engineer ${runId}`;
  const opportunitySummary = `Ship the client workspace ${runId}`;

  const { opportunityId } = await seedMarketplaceHireReadyOpportunityViaApi({
    apiBaseUrl,
    client: {
      session: clientActor.session,
      wallet: clientWallet,
      ensureWalletLinked: false,
      ensureSmartAccountProvisioned: false,
      profile: {
        slug: `client-${runId}`.slice(0, 40),
        displayName: `Client ${runId}`,
        headline: 'Startup hiring through escrow',
        bio: 'We want one contractor and one escrow-backed workflow.',
        skills: ['product', 'react'],
        portfolioUrls: [`https://example.com/client/${runId}`],
      },
    },
    talent: {
      session: talentActor.session,
      wallet: talentWallet,
      ensureWalletLinked: false,
      profile: {
        slug: `talent-${runId}`.slice(0, 40),
        displayName: `Talent ${runId}`,
        headline: 'Full-stack contractor',
        bio: 'I apply with a verified wallet and expect escrow.',
        skills: ['typescript', 'react'],
        portfolioUrls: [`https://example.com/talent/${runId}`],
      },
    },
    opportunity: {
      title: opportunityTitle,
      summary: opportunitySummary,
      description: 'Build the first marketplace and escrow workspace.',
      category: 'software-development',
      currencyAddress: makeTestCurrencyAddress('6'),
      requiredSkills: ['typescript', 'react'],
      budgetMin: '1500',
      budgetMax: '3000',
      timeline: `2 weeks ${runId}`,
    },
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

  await clientPage.goto(`${webBaseUrl}/app/marketplace`);
  const clientOpportunityCard = clientPage.getByTestId(
    `marketplace-my-opportunity-${opportunityId}`,
  );
  await expect(clientOpportunityCard.getByText('Public brief • Published')).toBeVisible();
  await clientOpportunityCard.getByRole('button', { name: 'Load review board' }).click();
  await expect(clientOpportunityCard.getByText(`Talent ${runId}`)).toBeVisible();
  await clientOpportunityCard.getByRole('button', { name: 'Shortlist' }).click();
  await expect(clientPage.getByText('Application shortlisted.')).toBeVisible();
  await clientOpportunityCard.getByRole('button', { name: 'Hire into escrow' }).click();
  await expect(
    clientPage.getByText(/Application hired and escrow contract .* created\./),
  ).toBeVisible();
  const clientContractLink = clientOpportunityCard.getByRole('link', {
    name: 'View contract',
  });
  await expect(clientContractLink).toBeVisible();
  await expect(clientContractLink).toHaveAttribute('href', /\/app\/contracts\//);
  const clientContractHref = await clientContractLink.getAttribute('href');
  if (!clientContractHref) {
    throw new Error('Seeded marketplace hire did not expose a client contract href');
  }
  const clientContractUrl = new URL(clientContractHref, webBaseUrl);
  const clientContractPath = clientContractUrl.pathname;
  const jobId = clientContractPath.split('/').at(-1);
  if (!jobId) {
    throw new Error('Unable to derive the hired job id from the seeded marketplace contract link');
  }
  await clientPage.goto(`${webBaseUrl}${clientContractPath}`);
  await expect(clientPage.getByRole('heading', { name: opportunityTitle })).toBeVisible();
  await fundSelectedJob(clientPage);
  await commitSelectedJobMilestones(clientPage);

  await talentPage.goto(`${webBaseUrl}/app/marketplace`);
  const hiredApplicationCard = panelCard(
    workspacePanel(talentPage, 'My applications'),
    opportunityTitle,
  );
  await expect(hiredApplicationCard.getByText('Hired')).toBeVisible();
  const talentContractLink = hiredApplicationCard.getByRole('link', {
    name: 'View contract',
  });
  await expect(talentContractLink).toBeVisible();
  await expect(talentContractLink).toHaveAttribute('href', /\/app\/contracts\//);
  const talentContractHref = await talentContractLink.getAttribute('href');
  if (!talentContractHref) {
    throw new Error('Seeded marketplace hire did not expose a worker contract href');
  }
  const talentContractUrl = new URL(talentContractHref, webBaseUrl);
  expect(talentContractUrl.pathname).toBe(clientContractPath);
  expect(talentContractHref).toContain('invite=');

  await talentPage.goto(`${webBaseUrl}${talentContractHref}`);
  await expect(talentPage.getByRole('heading', { name: opportunityTitle })).toBeVisible();
  await talentPage.getByRole('button', { name: 'Join contract' }).click();
  await expect(
    talentPage.getByText(
      'Contract joined. Worker delivery is now enabled for this session.',
    ),
  ).toBeVisible();

  await talentPage.goto(
    `${webBaseUrl}${talentContractUrl.pathname}/deliver${talentContractUrl.search}`,
  );
  await deliverSelectedMilestone({
    page: talentPage,
    note: deliveryNote,
    evidenceUrl: deliveryEvidenceUrl,
  });

  await clientPage.goto(`${webBaseUrl}${clientContractPath}/dispute`);
  await expect(clientPage.getByRole('heading', { name: opportunityTitle })).toBeVisible();
  await openMilestoneDispute({
    page: clientPage,
    reason: disputeReason,
    evidenceUrl: disputeEvidenceUrl,
  });

  await operatorPage.goto(`${adminBaseUrl}/cases/${jobId}`);
  await expect(operatorPage.getByText('Operator case loaded.', { exact: false })).toBeVisible();
  await expect(operatorPage.getByText(operatorActor.email)).toBeVisible();
  await resolveDisputedMilestone({
    page: operatorPage,
    action: 'refund',
    note: resolutionNote,
  });

  await expect(
    operatorPage.getByRole('button', { name: 'Export job history JSON' }),
  ).toBeVisible();
  await expect(
    operatorPage.getByText('Audit source:', { exact: false }).first(),
  ).toBeVisible();

  for (const probe of buildEscrowExportProbes(jobId)) {
    await expectExportDownload(operatorPage, probe);
  }

  await clientPage.goto(`${webBaseUrl}${clientContractPath}`);
  await expect(clientPage.getByText('Resolution', { exact: true }).first()).toBeVisible();
  await expect(
    clientPage.getByText(`refund: ${resolutionNote}`, { exact: true }),
  ).toBeVisible();
  await expect(clientPage.getByText(disputeReason, { exact: true }).first()).toBeVisible();
  await expect(
    clientPage.getByRole('link', { name: disputeEvidenceUrl }),
  ).toBeVisible();
  await expect(clientPage.getByText(deliveryNote, { exact: true }).first()).toBeVisible();
  await expect(
    clientPage.getByRole('link', { name: deliveryEvidenceUrl }),
  ).toBeVisible();

  await Promise.all([
    clientContext.close(),
    talentContext.close(),
    operatorContext.close(),
  ]);
});
