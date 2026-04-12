import { Wallet } from 'ethers';
import type { Page } from '@playwright/test';
import { makeTestCurrencyAddress } from '../../../data/builders';
import {
  closeLocalProfileDb,
  webBaseUrl,
} from '../../../fixtures/local-profile';
import { expect, test } from '../../../fixtures/local-journeys';

test.afterAll(async () => {
  await closeLocalProfileDb();
});

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
    input.page.getByRole('heading', { name: 'Marketplace profile' }),
  ).toBeVisible();
  await input.page.getByLabel('Slug').fill(input.slug);
  await input.page.getByLabel('Display name').fill(input.displayName);
  await input.page.getByLabel('Headline').fill(input.headline);
  await input.page.getByLabel('Bio').fill(input.bio);
  await input.page.getByLabel('Skills').fill(input.skills);
  await input.page.getByLabel('Portfolio URLs').fill(input.portfolioUrl);
  await input.page.getByRole('button', { name: 'Save profile' }).click();
  await expect(input.page.getByText('Marketplace profile saved.')).toBeVisible();
}

test('local marketplace journey publishes, applies, and hires into escrow', async ({
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

  const clientContext = await browser.newContext({
    storageState: clientActor.storageState,
  });
  const talentContext = await browser.newContext({
    storageState: talentActor.storageState,
  });
  const clientPage = await clientContext.newPage();
  const talentPage = await talentContext.newPage();

  const opportunityTitle = `Marketplace Product Engineer ${runId}`;
  const opportunitySummary = `Ship the client workspace ${runId}`;
  const opportunityTimeline = `2 weeks ${runId}`;
  const currencyAddress = makeTestCurrencyAddress('6');

  await saveMarketplaceProfile({
    page: clientPage,
    slug: `client-${runId}`.slice(0, 40),
    displayName: `Client ${runId}`,
    headline: 'Startup hiring through escrow',
    bio: 'We want one contractor and one escrow-backed workflow.',
    skills: 'product, react',
    portfolioUrl: `https://example.com/client/${runId}`,
  });

  await clientPage.getByLabel('Title').fill(opportunityTitle);
  await clientPage.getByLabel('Summary').fill(opportunitySummary);
  await clientPage
    .getByLabel('Description')
    .fill('Build the first marketplace and escrow workspace.');
  await clientPage.getByLabel('Category').fill('software-development');
  await clientPage.getByLabel('Visibility').selectOption('public');
  await clientPage.getByLabel('Settlement token address').fill(currencyAddress);
  await clientPage.getByLabel('Budget minimum').fill('1500');
  await clientPage.getByLabel('Budget maximum').fill('3000');
  await clientPage.getByLabel('Timeline').fill(opportunityTimeline);
  await clientPage.getByLabel('Required skills').fill('typescript, react');
  await clientPage.getByRole('button', { name: 'Create draft brief' }).click();
  await expect(clientPage.getByText('Marketplace brief created as draft.')).toBeVisible();

  const clientOpportunityCard = clientPage.locator('article').filter({
    hasText: opportunityTitle,
  }).first();
  await clientOpportunityCard
    .getByRole('button', { name: 'Publish' })
    .click();
  await expect(clientPage.getByText('Marketplace brief published.')).toBeVisible();
  await expect(clientOpportunityCard.getByText('public • published • 0 applications')).toBeVisible();

  await saveMarketplaceProfile({
    page: talentPage,
    slug: `talent-${runId}`.slice(0, 40),
    displayName: `Talent ${runId}`,
    headline: 'Full-stack contractor',
    bio: 'I apply with a verified wallet and expect escrow.',
    skills: 'typescript, react',
    portfolioUrl: `https://example.com/talent/${runId}`,
  });

  await talentPage.reload();
  const publicOpportunityCard = talentPage.locator('article').filter({
    hasText: opportunityTitle,
  }).first();
  await expect(publicOpportunityCard.getByText(opportunitySummary)).toBeVisible();
  await publicOpportunityCard
    .getByPlaceholder('Add a short application note')
    .fill(`Ready to ship this build ${runId}`);
  await publicOpportunityCard.getByRole('button', { name: 'Apply' }).click();
  await expect(talentPage.getByText('Application submitted.')).toBeVisible();
  await expect(talentPage.getByText(opportunityTitle)).toBeVisible();

  await clientPage.reload();
  const reloadedOpportunityCard = clientPage.locator('article').filter({
    hasText: opportunityTitle,
  }).first();
  await reloadedOpportunityCard
    .getByRole('button', { name: 'Load applications' })
    .click();
  await expect(reloadedOpportunityCard.getByText(`Talent ${runId}`)).toBeVisible();
  await reloadedOpportunityCard
    .getByRole('button', { name: 'Shortlist' })
    .click();
  await expect(clientPage.getByText('Application shortlisted.')).toBeVisible();
  await reloadedOpportunityCard
    .getByRole('button', { name: 'Hire to escrow' })
    .click();
  await expect(
    clientPage.getByText(/Application hired and escrow contract .* created\./),
  ).toBeVisible();
  await expect(
    reloadedOpportunityCard.getByRole('link', { name: 'View contract' }),
  ).toBeVisible();

  await reloadedOpportunityCard.getByRole('link', { name: 'View contract' }).click();
  await expect(
    clientPage.getByRole('heading', { name: opportunityTitle }),
  ).toBeVisible();

  await talentPage.goto(`${webBaseUrl}/app/marketplace`);
  const hiredApplicationCard = talentPage.locator('article').filter({
    hasText: opportunityTitle,
  }).first();
  await expect(hiredApplicationCard.getByText(`Client ${runId} • hired`)).toBeVisible();
  await expect(
    hiredApplicationCard.getByRole('link', { name: 'View contract' }),
  ).toBeVisible();

  await Promise.all([clientContext.close(), talentContext.close()]);
});
