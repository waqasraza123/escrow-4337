import { Wallet } from 'ethers';
import type { Locator, Page } from '@playwright/test';
import { makeTestCurrencyAddress } from '../../../data/builders';
import {
  commitSelectedJobMilestones,
  deliverSelectedMilestone,
  fundSelectedJob,
  openMilestoneDispute,
  resolveDisputedMilestone,
} from '../../../flows/launch-candidate-flow';
import {
  adminBaseUrl,
  closeLocalProfileDb,
  localArbitratorWallet,
  webBaseUrl,
} from '../../../fixtures/local-profile';
import { expect, test } from '../../../fixtures/local-journeys';

test.afterAll(async () => {
  await closeLocalProfileDb();
});

function workspacePanel(page: Page, heading: string): Locator {
  return page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: heading }) })
    .first();
}

async function saveMarketplaceProfile(input: {
  page: Page;
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  skills: string;
  portfolioUrl: string;
}) {
  await input.page.goto(`${webBaseUrl}/app/marketplace`);
  await expect(
    input.page.getByRole('heading', { name: 'Credibility profile' }),
  ).toBeVisible();
  await input.page.getByLabel('Slug', { exact: true }).fill(input.slug);
  await input.page.getByLabel('Display name', { exact: true }).fill(input.displayName);
  await input.page.getByLabel('Headline', { exact: true }).fill(input.headline);
  await input.page.getByLabel('Bio', { exact: true }).fill(input.bio);
  await input.page.getByLabel('Skills', { exact: true }).fill(input.skills);
  await input.page.getByLabel('Portfolio URLs', { exact: true }).fill(input.portfolioUrl);
  await input.page.getByRole('button', { name: 'Save profile' }).click();
  await expect(
    input.page.getByText('Marketplace profile and proof artifacts saved.'),
  ).toBeVisible();
}

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

  await saveMarketplaceProfile({
    page: clientPage,
    slug: `exact-client-${runId}`.slice(0, 40),
    displayName: `Client ${runId}`,
    headline: 'Startup hiring through escrow',
    bio: 'We want one contractor and one escrow-backed workflow.',
    skills: 'product, react',
    portfolioUrl: `https://example.com/client/${runId}`,
  });

  await clientPage.getByLabel('Title', { exact: true }).fill(opportunityTitle);
  await clientPage.getByLabel('Summary', { exact: true }).fill(opportunitySummary);
  await clientPage
    .getByLabel('Description', { exact: true })
    .fill('Build the exact marketplace browser canary.');
  await clientPage.getByLabel('Category', { exact: true }).fill('software-development');
  await clientPage
    .getByLabel('Settlement token address', { exact: true })
    .fill(currencyAddress);
  await clientPage
    .getByLabel('Required skills', { exact: true })
    .fill('typescript, react');
  await clientPage.getByLabel('Budget minimum', { exact: true }).fill('1800');
  await clientPage.getByLabel('Budget maximum', { exact: true }).fill('3200');
  await clientPage.getByLabel('Timeline', { exact: true }).fill(opportunityTimeline);
  await clientPage.getByRole('button', { name: 'Create draft brief' }).click();
  await expect(
    clientPage.getByText('Decision-ready marketplace brief created as draft.'),
  ).toBeVisible();

  const clientOpportunitiesPanel = workspacePanel(clientPage, 'My opportunities');
  const draftOpportunityCard = clientOpportunitiesPanel
    .locator('article')
    .filter({ hasText: opportunityTitle })
    .first();
  await draftOpportunityCard.getByRole('button', { name: 'Publish' }).click();
  await expect(clientPage.getByText('Marketplace brief published.')).toBeVisible();

  const publicBriefLink = draftOpportunityCard.getByRole('link', {
    name: 'View public brief',
  });
  const publicBriefPath = await publicBriefLink.getAttribute('href');
  if (!publicBriefPath) {
    throw new Error('Published brief link did not expose a public detail href');
  }
  const opportunityId = publicBriefPath.split('/').at(-1);
  if (!opportunityId) {
    throw new Error('Unable to derive opportunity id from public brief href');
  }

  const clientOpportunityCard = clientPage.getByTestId(
    `marketplace-my-opportunity-${opportunityId}`,
  );
  await expect(clientOpportunityCard.getByText('Public brief • Published')).toBeVisible();

  await saveMarketplaceProfile({
    page: talentPage,
    slug: `exact-talent-${runId}`.slice(0, 40),
    displayName: `Talent ${runId}`,
    headline: 'Full-stack contractor',
    bio: 'I apply with a verified wallet and expect escrow.',
    skills: 'typescript, react',
    portfolioUrl: `https://example.com/talent/${runId}`,
  });

  await talentPage.goto(`${webBaseUrl}${publicBriefPath}`);
  await expect(talentPage.getByRole('heading', { name: opportunityTitle })).toBeVisible();
  await expect(talentPage.getByText(opportunitySummary)).toBeVisible();
  await talentPage.getByRole('link', { name: 'Open workspace' }).click();
  await expect(
    talentPage.getByRole('heading', { name: 'Credibility profile' }),
  ).toBeVisible();

  const openBriefCard = talentPage.getByTestId(
    `marketplace-open-brief-${opportunityId}`,
  );
  await expect(openBriefCard.getByText(opportunitySummary)).toBeVisible();
  await expect(
    openBriefCard.getByRole('textbox', { name: 'Cover note' }),
  ).toBeVisible();
  await openBriefCard
    .getByRole('button', { name: 'Submit structured application' })
    .click();
  await expect(talentPage.getByText('Structured application submitted.')).toBeVisible();

  const myApplicationsPanel = workspacePanel(talentPage, 'My applications');
  const submittedApplicationCard = myApplicationsPanel
    .locator('article')
    .filter({ hasText: opportunityTitle })
    .first();
  await expect(submittedApplicationCard.getByText('Submitted')).toBeVisible();

  await clientPage.reload();
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
    throw new Error('Client hired opportunity did not expose a contract href');
  }
  const clientContractUrl = new URL(clientContractHref, webBaseUrl);
  const clientContractPath = clientContractUrl.pathname;
  const jobId = clientContractPath.split('/').at(-1);
  if (!jobId) {
    throw new Error('Unable to derive the hired job id from the client contract link');
  }

  await clientPage.goto(`${webBaseUrl}${clientContractPath}`);
  await expect(clientPage.getByRole('heading', { name: opportunityTitle })).toBeVisible();
  await fundSelectedJob(clientPage);
  await commitSelectedJobMilestones(clientPage);

  await talentPage.goto(`${webBaseUrl}/app/marketplace`);
  const hiredApplicationCard = myApplicationsPanel
    .locator('article')
    .filter({ hasText: opportunityTitle })
    .first();
  await expect(hiredApplicationCard.getByText('Hired')).toBeVisible();
  const talentContractLink = hiredApplicationCard.getByRole('link', {
    name: 'View contract',
  });
  await expect(talentContractLink).toHaveAttribute('href', /\/app\/contracts\//);
  const talentContractHref = await talentContractLink.getAttribute('href');
  if (!talentContractHref) {
    throw new Error('Hired application did not expose a contract href');
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
  await expect(
    talentPage.getByText(
      'This contract has already been joined by the bound contractor identity.',
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

  await clientPage.goto(`${webBaseUrl}${clientContractPath}`);
  await expect(clientPage.getByText(deliveryNote, { exact: true }).first()).toBeVisible();
  await expect(
    clientPage.getByRole('link', { name: deliveryEvidenceUrl }),
  ).toBeVisible();

  await clientPage.goto(`${webBaseUrl}${clientContractPath}/dispute`);
  await expect(clientPage.getByRole('heading', { name: opportunityTitle })).toBeVisible();
  await openMilestoneDispute({
    page: clientPage,
    reason: disputeReason,
    evidenceUrl: disputeEvidenceUrl,
  });

  await operatorPage.goto(`${adminBaseUrl}/cases/${jobId}`);
  await expect(operatorPage.getByText('Operator case loaded.')).toBeVisible();
  await expect(operatorPage.getByText(operatorActor.email)).toBeVisible();
  await resolveDisputedMilestone({
    page: operatorPage,
    action: 'release',
    note: resolutionNote,
  });

  await clientPage.goto(`${webBaseUrl}${clientContractPath}`);
  await expect(clientPage.getByText('Resolution', { exact: true }).first()).toBeVisible();
  await expect(
    clientPage.getByText(`release: ${resolutionNote}`, { exact: true }),
  ).toBeVisible();
  await expect(clientPage.getByText(disputeReason, { exact: true }).first()).toBeVisible();
  await expect(
    clientPage.getByRole('link', { name: disputeEvidenceUrl }),
  ).toBeVisible();

  await Promise.all([clientContext.close(), talentContext.close(), operatorContext.close()]);
});
