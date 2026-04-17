import { Wallet } from 'ethers';
import type { Locator, Page } from '@playwright/test';
import {
  readDeployedLaunchCandidateFlowConfig,
  readDeployedProfileConfig,
} from '../../../fixtures/deployed-profile';
import { expect, test } from '../../../fixtures/deployed-journeys';
import { seedMarketplaceHireReadyOpportunityViaApi } from '../../../fixtures/journey-setup';
import {
  commitSelectedJobMilestones,
  deliverSelectedMilestone,
  fundSelectedJob,
  openMilestoneDispute,
  resolveDisputedMilestone,
} from '../../../flows/launch-candidate-flow';
import {
  buildEscrowExportProbes,
  expectExportDownload,
} from '../../../flows/operator-export-flow';

const deployed = readDeployedProfileConfig();
const deployedFlow = readDeployedLaunchCandidateFlowConfig();

function workspacePanel(page: Page, heading: string): Locator {
  return page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: heading }) })
    .first();
}

function panelCard(panel: Locator, title: string): Locator {
  return panel.locator('article').filter({ hasText: title }).first();
}

test('[@seeded] deployed environment can exercise the seeded marketplace hire-to-refund flow with operator exports', async ({
  browser,
  deployedJourneyActorFactory,
  request,
  runId,
}) => {
  test.skip(
    !deployedFlow,
    'Set PLAYWRIGHT_DEPLOYED_FLOW_* secrets to run the staged seeded marketplace canary.',
  );
  test.setTimeout(300_000);

  const runtimeResponse = await request.get(`${deployed.apiBaseUrl}/operations/runtime-profile`);
  expect(runtimeResponse.ok()).toBeTruthy();
  const runtimeProfile = (await runtimeResponse.json()) as {
    operator: {
      arbitratorAddress: string | null;
      exportSupport: boolean;
    };
  };
  const operatorWallet = new Wallet(deployedFlow!.operator.privateKey);

  expect(runtimeProfile.operator.arbitratorAddress?.toLowerCase()).toBe(
    operatorWallet.address.toLowerCase(),
  );
  expect(runtimeProfile.operator.exportSupport).toBeTruthy();

  const clientActor = await deployedJourneyActorFactory('client');
  const contractorActor = await deployedJourneyActorFactory('contractor');
  const operatorActor = await deployedJourneyActorFactory('operator');

  const opportunityTitle = `Deployed Marketplace Engineer ${runId}`;
  const opportunitySummary = `Staged marketplace escrow proof ${runId}`;
  const deliveryNote = `Marketplace staged delivery ${runId}`;
  const deliveryEvidenceUrl = `https://example.com/deployed-marketplace-delivery/${runId}`;
  const disputeReason = `Marketplace staged dispute ${runId}`;
  const disputeEvidenceUrl = `https://example.com/deployed-marketplace-dispute/${runId}`;
  const resolutionNote = `Marketplace staged operator refund ${runId}`;

  const { opportunityId } = await seedMarketplaceHireReadyOpportunityViaApi({
    apiBaseUrl: deployed.apiBaseUrl,
    client: {
      session: clientActor.session,
      wallet: clientActor.wallet,
      profile: {
        slug: `deployed-client-${runId}`.slice(0, 40),
        displayName: `Deployed Client ${runId}`,
        headline: 'Staged client using escrow-backed marketplace hiring',
        bio: 'This staged canary proves marketplace-origin escrow behavior against deployed infrastructure.',
        skills: ['product', 'react'],
        portfolioUrls: [`https://example.com/deployed-client/${runId}`],
      },
    },
    talent: {
      session: contractorActor.session,
      wallet: contractorActor.wallet,
      profile: {
        slug: `deployed-talent-${runId}`.slice(0, 40),
        displayName: `Deployed Talent ${runId}`,
        headline: 'Staged marketplace contractor',
        bio: 'I apply from seeded marketplace state and join the resulting escrow contract.',
        skills: ['typescript', 'react'],
        portfolioUrls: [`https://example.com/deployed-talent/${runId}`],
      },
    },
    opportunity: {
      title: opportunityTitle,
      summary: opportunitySummary,
      description:
        'Staged canary proving marketplace hire, join, delivery, dispute, refund, and export behavior.',
      category: 'software-development',
      currencyAddress: deployedFlow!.currencyAddress,
      requiredSkills: ['typescript', 'react'],
      budgetMin: '1800',
      budgetMax: '3200',
      timeline: `2 weeks ${runId}`,
    },
  });

  const clientContext = await browser.newContext({
    storageState: clientActor.storageState,
  });
  const contractorContext = await browser.newContext({
    storageState: contractorActor.storageState,
  });
  const operatorContext = await browser.newContext({
    storageState: operatorActor.storageState,
  });
  const clientPage = await clientContext.newPage();
  const contractorPage = await contractorContext.newPage();
  const operatorPage = await operatorContext.newPage();

  await clientPage.goto(`${deployed.webBaseUrl}/app/marketplace`);
  const clientOpportunityCard = clientPage.getByTestId(
    `marketplace-my-opportunity-${opportunityId}`,
  );
  await expect(clientOpportunityCard.getByText('Public brief • Published')).toBeVisible();
  await clientOpportunityCard.getByRole('button', { name: 'Load review board' }).click();
  await expect(clientOpportunityCard.getByText(`Deployed Talent ${runId}`)).toBeVisible();
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
    throw new Error('Seeded deployed marketplace hire did not expose a client contract href');
  }
  const clientContractUrl = new URL(clientContractHref, deployed.webBaseUrl);
  const clientContractPath = clientContractUrl.pathname;
  const jobId = clientContractPath.split('/').at(-1);
  if (!jobId) {
    throw new Error(
      'Unable to derive the hired job id from the seeded deployed marketplace contract link',
    );
  }

  await clientPage.goto(`${deployed.webBaseUrl}${clientContractPath}`);
  await expect(clientPage.getByRole('heading', { name: opportunityTitle })).toBeVisible();
  await fundSelectedJob(clientPage);
  await commitSelectedJobMilestones(clientPage);

  await contractorPage.goto(`${deployed.webBaseUrl}/app/marketplace`);
  const hiredApplicationCard = panelCard(
    workspacePanel(contractorPage, 'My applications'),
    opportunityTitle,
  );
  await expect(hiredApplicationCard.getByText('Hired')).toBeVisible();
  const contractorContractLink = hiredApplicationCard.getByRole('link', {
    name: 'View contract',
  });
  await expect(contractorContractLink).toBeVisible();
  await expect(contractorContractLink).toHaveAttribute('href', /\/app\/contracts\//);
  const contractorContractHref = await contractorContractLink.getAttribute('href');
  if (!contractorContractHref) {
    throw new Error('Seeded deployed marketplace hire did not expose a worker contract href');
  }
  const contractorContractUrl = new URL(contractorContractHref, deployed.webBaseUrl);
  expect(contractorContractUrl.pathname).toBe(clientContractPath);
  expect(contractorContractHref).toContain('invite=');

  await contractorPage.goto(`${deployed.webBaseUrl}${contractorContractHref}`);
  await expect(contractorPage.getByRole('heading', { name: opportunityTitle })).toBeVisible();
  await contractorPage.getByRole('button', { name: 'Join contract' }).click();
  await expect(
    contractorPage.getByText(
      'Contract joined. Worker delivery is now enabled for this session.',
    ),
  ).toBeVisible();

  await contractorPage.goto(
    `${deployed.webBaseUrl}${contractorContractUrl.pathname}/deliver${contractorContractUrl.search}`,
  );
  await deliverSelectedMilestone({
    page: contractorPage,
    note: deliveryNote,
    evidenceUrl: deliveryEvidenceUrl,
  });

  await clientPage.goto(`${deployed.webBaseUrl}${clientContractPath}/dispute`);
  await expect(clientPage.getByRole('heading', { name: opportunityTitle })).toBeVisible();
  await openMilestoneDispute({
    page: clientPage,
    reason: disputeReason,
    evidenceUrl: disputeEvidenceUrl,
  });

  await operatorPage.goto(`${deployed.adminBaseUrl}/cases/${jobId}`);
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
  await expect(operatorPage.getByText('Audit source:', { exact: false }).first()).toBeVisible();

  for (const probe of buildEscrowExportProbes(jobId)) {
    await expectExportDownload(operatorPage, probe);
  }

  await clientPage.goto(`${deployed.webBaseUrl}${clientContractPath}`);
  await expect(clientPage.getByText('Resolution', { exact: true }).first()).toBeVisible();
  await expect(
    clientPage.getByText(`refund: ${resolutionNote}`, { exact: true }),
  ).toBeVisible();
  await expect(clientPage.getByText(disputeReason, { exact: true }).first()).toBeVisible();
  await expect(clientPage.getByRole('link', { name: disputeEvidenceUrl })).toBeVisible();
  await expect(clientPage.getByText(deliveryNote, { exact: true }).first()).toBeVisible();
  await expect(clientPage.getByRole('link', { name: deliveryEvidenceUrl })).toBeVisible();

  await Promise.all([
    clientContext.close(),
    contractorContext.close(),
    operatorContext.close(),
  ]);
});
