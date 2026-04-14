import { Wallet } from 'ethers';
import type { Locator, Page } from '@playwright/test';
import { makeTestCurrencyAddress } from '../../../data/builders';
import {
  apiBaseUrl,
  closeLocalProfileDb,
  webBaseUrl,
} from '../../../fixtures/local-profile';
import { seedMarketplaceHireReadyOpportunityViaApi } from '../../../fixtures/journey-setup';
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

test('seeded marketplace journey reviews an application and hires into escrow', async ({
  browser,
  localSessionFactory,
  runId,
}) => {
  test.setTimeout(180_000);

  const clientWallet = Wallet.createRandom();
  const talentWallet = Wallet.createRandom();
  const clientActor = await localSessionFactory({
    role: `marketplace-client.${runId}`,
    linkedWallet: clientWallet,
    provisionSmartAccountOwner: clientWallet.address,
  });
  const talentActor = await localSessionFactory({
    role: `marketplace-talent.${runId}`,
    linkedWallet: talentWallet,
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
  const clientPage = await clientContext.newPage();
  const talentPage = await talentContext.newPage();

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

  await Promise.all([clientContext.close(), talentContext.close()]);
});
