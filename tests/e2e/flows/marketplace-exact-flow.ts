import { expect, type Locator, type Page } from '@playwright/test';
import {
  commitSelectedJobMilestones,
  deliverSelectedMilestone,
  fundSelectedJob,
  openMilestoneDispute,
  resolveDisputedMilestone,
} from './launch-candidate-flow';
import {
  downloadExportDocument,
  type ExportProbe,
} from './operator-export-flow';

type MarketplaceProfileInput = {
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  skills: string;
  portfolioUrl: string;
  expectedLane: 'client' | 'freelancer';
  expectedEmptyState: string;
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

async function clickWorkspaceAction(button: Locator) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
      await button.click({ timeout: 5_000 });
      return;
    } catch (error) {
      if (attempt === 0) {
        await button.click({ force: true, timeout: 5_000 }).catch(() => undefined);
        continue;
      }

      throw error;
    }
  }
}

function marketplaceCardByTitle(
  page: Page,
  testIdPrefix: string,
  title: string,
): Locator {
  return page
    .locator(`[data-testid^="${testIdPrefix}"]`)
    .filter({ hasText: title })
    .first();
}

async function saveMarketplaceProfile(input: {
  page: Page;
  webBaseUrl: string;
  profile: MarketplaceProfileInput;
}) {
  const { page, profile, webBaseUrl } = input;

  await page.goto(`${webBaseUrl}/app/marketplace`);
  await expect(
    page.getByRole('heading', { name: 'Choose your marketplace lane' }),
  ).toBeVisible();
  const clientLaneCard = page.getByTestId('marketplace-mode-card-client');
  const freelancerLaneCard = page.getByTestId('marketplace-mode-card-freelancer');
  await expect(clientLaneCard).toBeVisible();
  await expect(freelancerLaneCard).toBeVisible();
  if (profile.expectedLane === 'client') {
    const currentLane = clientLaneCard.getByText('Current lane');
    if ((await currentLane.count()) === 0) {
      await clickWorkspaceAction(
        clientLaneCard.getByRole('button', { name: /Hire:/ }),
      );
    }
    await expect(currentLane).toBeVisible();
  } else {
    const currentLane = freelancerLaneCard.getByText('Current lane');
    if ((await currentLane.count()) === 0) {
      await clickWorkspaceAction(
        freelancerLaneCard.getByRole('button', { name: /Freelance:/ }),
      );
    }
    await expect(currentLane).toBeVisible();
  }
  await expect(page.getByText(profile.expectedEmptyState)).toBeVisible();
  if (profile.expectedLane === 'client') {
    await expect(page.getByRole('heading', { name: 'Create hiring spec' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Credibility profile' }),
    ).not.toBeVisible();
    return;
  }
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

  const draftOpportunityCard = marketplaceCardByTitle(
    clientPage,
    'marketplace-my-opportunity-',
    opportunity.title,
  );
  await expect(draftOpportunityCard).toBeVisible();
  await clickWorkspaceAction(
    draftOpportunityCard.getByRole('button', { name: 'Publish' }),
  );
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
  await clickWorkspaceAction(
    openBriefCard.getByRole('button', { name: 'Submit structured application' }),
  );

  const submittedApplicationCard = marketplaceCardByTitle(
    contractorPage,
    'marketplace-my-application-',
    opportunity.title,
  );
  await expect(submittedApplicationCard).toBeVisible();
  await expect(submittedApplicationCard.getByText('Submitted')).toBeVisible();

  await clientPage.reload();
  await clickWorkspaceAction(
    clientOpportunityCard.getByRole('button', { name: 'Load review board' }),
  );
  await expect(clientOpportunityCard.getByText(contractorDisplayName)).toBeVisible();
  await clickWorkspaceAction(
    clientOpportunityCard.getByRole('button', { name: 'Shortlist' }),
  );
  await expect(clientPage.getByText('Application shortlisted.')).toBeVisible();
  await clickWorkspaceAction(
    clientOpportunityCard.getByRole('button', { name: 'Hire into escrow' }),
  );
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
  const hiredApplicationCard = marketplaceCardByTitle(
    contractorPage,
    'marketplace-my-application-',
    opportunity.title,
  );
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
  const downloadedExports: Array<{
    artifact: 'job-history' | 'dispute-case';
    format: 'json' | 'csv';
    suggestedFilename: string;
    content: string;
    json: Record<string, unknown> | null;
  }> = [];
  if (exportProbes.length) {
    await expect(
      operatorPage.getByRole('button', { name: 'Export job history JSON' }),
    ).toBeVisible();
    await expect(operatorPage.getByText('Audit source:', { exact: false }).first()).toBeVisible();

    for (const probe of exportProbes) {
      const exported = await downloadExportDocument(operatorPage, probe);
      downloadedExports.push({
        artifact: probe.artifact,
        format: probe.format,
        suggestedFilename: exported.suggestedFilename,
        content: exported.content,
        json: exported.json,
      });
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
    contractPath: clientContractPath,
    exportedJobHistoryJson:
      downloadedExports.find(
        (entry) => entry.artifact === 'job-history' && entry.format === 'json',
      )?.json ?? null,
    exportedDisputeCaseJson:
      downloadedExports.find(
        (entry) => entry.artifact === 'dispute-case' && entry.format === 'json',
      )?.json ?? null,
  };
}
