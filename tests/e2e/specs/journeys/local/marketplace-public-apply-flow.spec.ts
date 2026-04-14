import { Wallet } from 'ethers';
import type { Locator, Page } from '@playwright/test';
import { makeTestCurrencyAddress } from '../../../data/builders';
import {
  apiBaseUrl,
  closeLocalProfileDb,
  webBaseUrl,
} from '../../../fixtures/local-profile';
import { seedMarketplacePublishedOpportunityViaApi } from '../../../fixtures/journey-setup';
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

function panelCard(panel: Locator, title: string): Locator {
  return panel.locator('article').filter({ hasText: title }).first();
}

test('public brief detail can hand off into workspace application submission', async ({
  browser,
  localSessionFactory,
  runId,
}) => {
  test.setTimeout(180_000);

  const clientWallet = Wallet.createRandom();
  const talentWallet = Wallet.createRandom();
  const clientActor = await localSessionFactory({
    role: `marketplace-brief-client.${runId}`,
    linkedWallet: clientWallet,
    provisionSmartAccountOwner: clientWallet.address,
  });
  const talentActor = await localSessionFactory({
    role: `marketplace-brief-talent.${runId}`,
    linkedWallet: talentWallet,
  });

  const opportunityTitle = `Marketplace Brief ${runId}`;
  const opportunitySummary = `Apply from detail route ${runId}`;

  const { opportunityId } = await seedMarketplacePublishedOpportunityViaApi({
    apiBaseUrl,
    client: {
      session: clientActor.session,
      wallet: clientWallet,
      ensureWalletLinked: false,
      ensureSmartAccountProvisioned: false,
      profile: {
        slug: `detail-client-${runId}`.slice(0, 40),
        displayName: `Client ${runId}`,
        headline: 'Startup hiring through escrow',
        bio: 'We publish briefs and convert selected applicants into escrow.',
        skills: ['product', 'react'],
        portfolioUrls: [`https://example.com/client/${runId}`],
      },
    },
    talent: {
      session: talentActor.session,
      wallet: talentWallet,
      ensureWalletLinked: false,
      profile: {
        slug: `detail-talent-${runId}`.slice(0, 40),
        displayName: `Talent ${runId}`,
        headline: 'Structured applicant',
        bio: 'I move from public brief detail into authenticated application flow.',
        skills: ['typescript', 'react'],
        portfolioUrls: [`https://example.com/talent/${runId}`],
      },
    },
    opportunity: {
      title: opportunityTitle,
      summary: opportunitySummary,
      description: 'Validate the public-detail-to-workspace application handoff.',
      category: 'software-development',
      currencyAddress: makeTestCurrencyAddress('7'),
      requiredSkills: ['typescript', 'react'],
      budgetMin: '2000',
      budgetMax: '3500',
      timeline: `3 weeks ${runId}`,
    },
  });

  const talentContext = await browser.newContext({
    storageState: talentActor.storageState,
  });
  const talentPage = await talentContext.newPage();

  await talentPage.goto(`${webBaseUrl}/marketplace/opportunities/${opportunityId}`);
  await expect(talentPage.getByRole('heading', { name: opportunityTitle })).toBeVisible();
  await expect(talentPage.getByText(opportunitySummary)).toBeVisible();
  await expect(
    talentPage.getByRole('link', { name: 'Open workspace' }),
  ).toHaveAttribute('href', '/app/marketplace');

  await talentPage.getByRole('link', { name: 'Open workspace' }).click();
  await expect(talentPage.getByRole('heading', { name: 'Credibility profile' })).toBeVisible();

  const stableOpportunityCard = talentPage.getByTestId(
    `marketplace-open-brief-${opportunityId}`,
  );
  await expect(stableOpportunityCard.getByText(opportunitySummary)).toBeVisible();
  await expect(
    stableOpportunityCard.getByRole('textbox', { name: 'Cover note' }),
  ).toBeVisible();
  await stableOpportunityCard
    .getByRole('button', { name: 'Submit structured application' })
    .click();
  await expect(talentPage.getByText('Structured application submitted.')).toBeVisible();

  const myApplicationCard = panelCard(
    workspacePanel(talentPage, 'My applications'),
    opportunityTitle,
  );
  await expect(myApplicationCard.getByText('Submitted')).toBeVisible();
  await expect(myApplicationCard.getByRole('button', { name: 'Withdraw' })).toBeVisible();

  await talentContext.close();
});
