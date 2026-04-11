import { Wallet } from 'ethers';
import { type Page } from '@playwright/test';
import {
  closeLocalProfileDb,
  createJobForSession,
  createLocalSession,
  fundJobForSession,
  linkWalletForSession,
  provisionSmartAccountForSession,
  setMilestonesForSession,
  webBaseUrl,
  webSessionStorageKey,
} from '../../../fixtures/local-profile';
import { expect, test } from '../../../fixtures/test';
import { makeTestCurrencyAddress } from '../../../data/builders';

test.afterAll(async () => {
  await closeLocalProfileDb();
});

async function seedWebSession(
  page: Page,
  session: { accessToken: string; refreshToken: string },
) {
  await page.addInitScript(
    ({ sessionStorageKey, tokens }) => {
      window.localStorage.setItem(sessionStorageKey, JSON.stringify(tokens));
    },
    {
      sessionStorageKey: webSessionStorageKey,
      tokens: session,
    },
  );
}

async function createFundedJoinReadyJob(input: {
  clientEmail: string;
  clientWallet: Wallet;
  contractorEmail: string;
  workerAddress: string;
  title: string;
}) {
  const clientSession = await createLocalSession(input.clientEmail);
  await linkWalletForSession(clientSession, input.clientWallet);
  await provisionSmartAccountForSession(clientSession, input.clientWallet.address);

  const jobId = await createJobForSession(clientSession, {
    contractorEmail: input.contractorEmail,
    workerAddress: input.workerAddress,
    currencyAddress: makeTestCurrencyAddress(),
    title: input.title,
    description:
      'Deterministic local-browser setup for contractor join gating and delivery unlock coverage.',
  });

  await fundJobForSession(clientSession, jobId, '100');
  await setMilestonesForSession(clientSession, jobId, [
    {
      title: 'Discovery',
      deliverable: 'Accepted scope and milestone plan',
      amount: '50',
    },
    {
      title: 'Delivery',
      deliverable: 'Final shipped implementation',
      amount: '50',
    },
  ]);

  return { clientSession, jobId };
}

test('deliver route stays blocked until the contractor joins', async ({ page, runId }) => {
  const clientWallet = Wallet.createRandom();
  const workerWallet = Wallet.createRandom();
  const contractorEmail = `deliver.contractor.${runId}@example.com`;
  const contractorSession = await createLocalSession(contractorEmail);
  const { jobId } = await createFundedJoinReadyJob({
    clientEmail: `deliver.client.${runId}@example.com`,
    clientWallet,
    contractorEmail,
    workerAddress: workerWallet.address,
    title: `Blocked delivery ${runId}`,
  });

  await seedWebSession(page, contractorSession);
  await page.goto(`${webBaseUrl}/app/contracts/${jobId}/deliver`);

  await expect(
    page.getByRole('heading', { name: `Blocked delivery ${runId}` }),
  ).toBeVisible();
  await expect(
    page.getByText(`Link ${workerWallet.address.toLowerCase()} before delivering this milestone.`),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Deliver selected milestone' }),
  ).toHaveCount(0);
});

test('contractor join rejects a session whose email does not match the pending contractor email', async ({
  page,
  runId,
}) => {
  const clientWallet = Wallet.createRandom();
  const wrongUserWallet = Wallet.createRandom();
  const wrongUserEmail = `wrong.contractor.${runId}@example.com`;
  const wrongUserSession = await createLocalSession(wrongUserEmail);
  await linkWalletForSession(wrongUserSession, wrongUserWallet);

  const { jobId } = await createFundedJoinReadyJob({
    clientEmail: `mismatch.client.${runId}@example.com`,
    clientWallet,
    contractorEmail: `expected.contractor.${runId}@example.com`,
    workerAddress: wrongUserWallet.address,
    title: `Join mismatch ${runId}`,
  });

  await seedWebSession(page, wrongUserSession);
  await page.goto(`${webBaseUrl}/app/contracts/${jobId}`);

  await expect(
    page.getByRole('heading', { name: `Join mismatch ${runId}` }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Join contract' }).click();
  await expect(
    page.getByText('Authenticated email must match the pending contractor email'),
  ).toBeVisible();
  await expect(
    page.getByText('Contractor join access'),
  ).toBeVisible();
});

test('eligible contractor can join from the contract route and then reach delivery', async ({
  page,
  runId,
}) => {
  const clientWallet = Wallet.createRandom();
  const contractorWallet = Wallet.createRandom();
  const contractorEmail = `join.contractor.${runId}@example.com`;
  const contractorSession = await createLocalSession(contractorEmail);
  await linkWalletForSession(contractorSession, contractorWallet);

  const { jobId } = await createFundedJoinReadyJob({
    clientEmail: `join.client.${runId}@example.com`,
    clientWallet,
    contractorEmail,
    workerAddress: contractorWallet.address,
    title: `Join success ${runId}`,
  });

  await seedWebSession(page, contractorSession);
  await page.goto(`${webBaseUrl}/app/contracts/${jobId}`);

  await expect(
    page.getByRole('heading', { name: `Join success ${runId}` }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Join contract' }).click();
  await expect(
    page.getByText('Contract joined. Worker delivery is now enabled for this session.'),
  ).toBeVisible();
  await expect(
    page.getByText('This contract has already been joined by the bound contractor identity.'),
  ).toBeVisible();

  await page.goto(`${webBaseUrl}/app/contracts/${jobId}/deliver`);
  await expect(
    page.getByRole('button', { name: 'Deliver selected milestone' }),
  ).toBeVisible();
});
