import { expect, type Locator, type Page } from '@playwright/test';
import {
  commitSelectedJobMilestones,
  deliverSelectedMilestone,
  fundSelectedJob,
  openMilestoneDispute,
  resolveDisputedMilestone,
} from './launch-candidate-flow';
import {
  type ExportProbe,
  expectExportDownload,
} from './operator-export-flow';

type MarketplaceProfileInput = {
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  skills: string;
  portfolioUrl: string;
};

type MarketplaceOpportunityInput = {
  title: string;
  summary: string;
  description: string;
  category: string;
  currencyAddress: string;
  requiredSkills: string;
  budgetMin: string;
  budgetMax: string;
  timeline: string;
};

type MarketplaceExactFlowInput = {
  clientPage: Page;
  contractorPage: Page;
  operatorPage: Page;
  webBaseUrl: string;
  adminBaseUrl: string;
  clientProfile: MarketplaceProfileInput;
  contractorProfile: MarketplaceProfileInput;
  opportunity: MarketplaceOpportunityInput;
  contractorDisplayName: string;
  operatorEmail: string;
  deliveryNote: string;
  deliveryEvidenceUrl: string;
  disputeReason: string;
  disputeEvidenceUrl: string;
  resolutionAction: 'release' | 'refund';
  resolutionNote: string;
  exportProbeFactory?: (jobId: string) => ExportProbe[];
};

function workspacePanel(page: Page, heading: string): Locator {
  return page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: heading }) })
    .first();
}

async function saveMarketplaceProfile(input: {
  page: Page;
  webBaseUrl: string;
  profile: MarketplaceProfileInput;
}) {
  const { page, profile, webBaseUrl } = input;

  await page.goto(`${webBaseUrl}/app/marketplace`);
  await expect(page.getByRole('heading', { name: 'Credibility profile' })).toBeVisible();
  await page.getByLabel('Slug', { exact: true }).fill(profile.slug);
  await page.getByLabel('Display name', { exact: true }).fill(profile.displayName);
  await page.getByLabel('Headline', { exact: true }).fill(profile.headline);
  await page.getByLabel('Bio', { exact: true }).fill(profile.bio);
  await page.getByLabel('Skills', { exact: true }).fill(profile.skills);
  await page.getByLabel('Portfolio URLs', { exact: true }).fill(profile.portfolioUrl);
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(
    page.getByText('Marketplace profile and proof artifacts saved.'),
  ).toBeVisible();
}

export async function runAuthenticatedMarketplaceExactFlow(
  input: MarketplaceExactFlowInput,
) {
  const {
    adminBaseUrl,
    clientPage,
    clientProfile,
    contractorDisplayName,
    contractorPage,
    contractorProfile,
    deliveryEvidenceUrl,
    deliveryNote,
    disputeEvidenceUrl,
    disputeReason,
    exportProbeFactory,
    operatorEmail,
    operatorPage,
    opportunity,
    resolutionAction,
    resolutionNote,
    webBaseUrl,
  } = input;

  await saveMarketplaceProfile({
    page: clientPage,
    webBaseUrl,
    profile: clientProfile,
  });

  await clientPage.getByLabel('Title', { exact: true }).fill(opportunity.title);
  await clientPage.getByLabel('Summary', { exact: true }).fill(opportunity.summary);
  await clientPage
    .getByLabel('Description', { exact: true })
    .fill(opportunity.description);
  await clientPage.getByLabel('Category', { exact: true }).fill(opportunity.category);
  await clientPage
    .getByLabel('Settlement token address', { exact: true })
    .fill(opportunity.currencyAddress);
  await clientPage
    .getByLabel('Required skills', { exact: true })
    .fill(opportunity.requiredSkills);
  await clientPage.getByLabel('Budget minimum', { exact: true }).fill(opportunity.budgetMin);
  await clientPage.getByLabel('Budget maximum', { exact: true }).fill(opportunity.budgetMax);
  await clientPage.getByLabel('Timeline', { exact: true }).fill(opportunity.timeline);
  await clientPage.getByRole('button', { name: 'Create draft brief' }).click();
  await expect(
    clientPage.getByText('Decision-ready marketplace brief created as draft.'),
  ).toBeVisible();

  const clientOpportunitiesPanel = workspacePanel(clientPage, 'My opportunities');
  const draftOpportunityCard = clientOpportunitiesPanel
    .locator('article')
    .filter({ hasText: opportunity.title })
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
    page: contractorPage,
    webBaseUrl,
    profile: contractorProfile,
  });

  await contractorPage.goto(`${webBaseUrl}${publicBriefPath}`);
  await expect(
    contractorPage.getByRole('heading', { name: opportunity.title }),
  ).toBeVisible();
  await expect(contractorPage.getByText(opportunity.summary)).toBeVisible();
  await contractorPage.getByRole('link', { name: 'Open workspace' }).click();
  await expect(
    contractorPage.getByRole('heading', { name: 'Credibility profile' }),
  ).toBeVisible();

  const openBriefCard = contractorPage.getByTestId(
    `marketplace-open-brief-${opportunityId}`,
  );
  await expect(openBriefCard.getByText(opportunity.summary)).toBeVisible();
  await expect(openBriefCard.getByRole('textbox', { name: 'Cover note' })).toBeVisible();
  await openBriefCard
    .getByRole('button', { name: 'Submit structured application' })
    .click();
  await expect(contractorPage.getByText('Structured application submitted.')).toBeVisible();

  const myApplicationsPanel = workspacePanel(contractorPage, 'My applications');
  const submittedApplicationCard = myApplicationsPanel
    .locator('article')
    .filter({ hasText: opportunity.title })
    .first();
  await expect(submittedApplicationCard.getByText('Submitted')).toBeVisible();

  await clientPage.reload();
  await clientOpportunityCard.getByRole('button', { name: 'Load review board' }).click();
  await expect(clientOpportunityCard.getByText(contractorDisplayName)).toBeVisible();
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
    throw new Error('Marketplace hire did not expose a client contract href');
  }
  const clientContractUrl = new URL(clientContractHref, webBaseUrl);
  const clientContractPath = clientContractUrl.pathname;
  const jobId = clientContractPath.split('/').at(-1);
  if (!jobId) {
    throw new Error('Unable to derive the hired job id from the marketplace contract link');
  }

  await clientPage.goto(`${webBaseUrl}${clientContractPath}`);
  await expect(clientPage.getByRole('heading', { name: opportunity.title })).toBeVisible();
  await fundSelectedJob(clientPage);
  await commitSelectedJobMilestones(clientPage);

  await contractorPage.goto(`${webBaseUrl}/app/marketplace`);
  const hiredApplicationCard = myApplicationsPanel
    .locator('article')
    .filter({ hasText: opportunity.title })
    .first();
  await expect(hiredApplicationCard.getByText('Hired')).toBeVisible();
  const contractorContractLink = hiredApplicationCard.getByRole('link', {
    name: 'View contract',
  });
  await expect(contractorContractLink).toHaveAttribute('href', /\/app\/contracts\//);
  const contractorContractHref = await contractorContractLink.getAttribute('href');
  if (!contractorContractHref) {
    throw new Error('Hired application did not expose a contract href');
  }
  const contractorContractUrl = new URL(contractorContractHref, webBaseUrl);
  expect(contractorContractUrl.pathname).toBe(clientContractPath);
  expect(contractorContractHref).toContain('invite=');

  await contractorPage.goto(`${webBaseUrl}${contractorContractHref}`);
  await expect(
    contractorPage.getByRole('heading', { name: opportunity.title }),
  ).toBeVisible();
  await contractorPage.getByRole('button', { name: 'Join contract' }).click();
  await expect(
    contractorPage.getByText(
      'Contract joined. Worker delivery is now enabled for this session.',
    ),
  ).toBeVisible();
  await expect(
    contractorPage.getByText(
      'This contract has already been joined by the bound contractor identity.',
    ),
  ).toBeVisible();

  await contractorPage.goto(
    `${webBaseUrl}${contractorContractUrl.pathname}/deliver${contractorContractUrl.search}`,
  );
  await deliverSelectedMilestone({
    page: contractorPage,
    note: deliveryNote,
    evidenceUrl: deliveryEvidenceUrl,
  });

  await clientPage.goto(`${webBaseUrl}${clientContractPath}`);
  await expect(clientPage.getByText(deliveryNote, { exact: true }).first()).toBeVisible();
  await expect(clientPage.getByRole('link', { name: deliveryEvidenceUrl })).toBeVisible();

  await clientPage.goto(`${webBaseUrl}${clientContractPath}/dispute`);
  await expect(clientPage.getByRole('heading', { name: opportunity.title })).toBeVisible();
  await openMilestoneDispute({
    page: clientPage,
    reason: disputeReason,
    evidenceUrl: disputeEvidenceUrl,
  });

  await operatorPage.goto(`${adminBaseUrl}/cases/${jobId}`);
  await expect(operatorPage.getByText('Operator case loaded.', { exact: false })).toBeVisible();
  await expect(operatorPage.getByText(operatorEmail)).toBeVisible();
  await resolveDisputedMilestone({
    page: operatorPage,
    action: resolutionAction,
    note: resolutionNote,
  });

  const exportProbes = exportProbeFactory?.(jobId) ?? [];
  if (exportProbes.length) {
    await expect(
      operatorPage.getByRole('button', { name: 'Export job history JSON' }),
    ).toBeVisible();
    await expect(operatorPage.getByText('Audit source:', { exact: false }).first()).toBeVisible();

    for (const probe of exportProbes) {
      await expectExportDownload(operatorPage, probe);
    }
  }

  await clientPage.goto(`${webBaseUrl}${clientContractPath}`);
  await expect(clientPage.getByText('Resolution', { exact: true }).first()).toBeVisible();
  await expect(
    clientPage.getByText(`${resolutionAction}: ${resolutionNote}`, { exact: true }),
  ).toBeVisible();
  await expect(clientPage.getByText(disputeReason, { exact: true }).first()).toBeVisible();
  await expect(clientPage.getByRole('link', { name: disputeEvidenceUrl })).toBeVisible();

  return {
    jobId,
    opportunityId,
  };
}
