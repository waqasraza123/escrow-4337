import { expect, test } from '@playwright/test';
import { Wallet } from 'ethers';
import {
  adminBaseUrl,
  closeLocalProfileDb,
  forceOtpCode,
  localOtpCode,
  resetOtpState,
  waitForJobIdByTitle,
  webBaseUrl,
} from './local-profile';

function makeHexAddress(fill: string) {
  return `0x${fill.repeat(40)}`;
}

test.afterAll(async () => {
  await closeLocalProfileDb();
});

test('client can sign in, link a wallet, provision, create and fund a job, then load it in admin', async ({
  browser,
  page,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `playwright.${runId}@escrow.local`;
  const jobTitle = `Playwright Local Flow ${runId}`;
  const workerWallet = Wallet.createRandom();
  const ownerWallet = Wallet.createRandom();
  const currencyAddress = makeHexAddress('5');

  await resetOtpState(email);

  await page.goto(webBaseUrl);
  await page.getByPlaceholder('client@example.com').fill(email);
  await page.getByRole('button', { name: 'Send OTP' }).click();

  await expect(
    page.getByText('OTP issued. Check your configured mail inbox or relay logs.'),
  ).toBeVisible();

  await forceOtpCode(email, localOtpCode);

  await page.getByPlaceholder('123456').fill(localOtpCode);
  await page.getByRole('button', { name: 'Verify session' }).click();

  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText('Authenticated')).toBeVisible();

  await page.getByRole('textbox', { name: 'EOA address' }).fill(ownerWallet.address);
  await page.getByRole('button', { name: 'Create SIWE challenge' }).click();

  await expect(
    page.getByText(
      'Challenge created. Sign the SIWE message in your wallet, then paste the signature.',
    ),
  ).toBeVisible();

  const challengeMessage = await page
    .getByRole('textbox', { name: 'Issued message' })
    .inputValue();
  const signature = await ownerWallet.signMessage(challengeMessage);

  await page.getByRole('textbox', { name: 'Wallet signature' }).fill(signature);
  await page.getByRole('button', { name: 'Verify linked wallet' }).click();

  await expect(
    page.getByText('Wallet linked and ready for smart-account provisioning.'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Provision smart account' }).click();

  await expect(
    page.getByText('Smart account ready. Sponsorship policy: sponsored.'),
  ).toBeVisible();

  await page
    .getByPlaceholder('Milestone-based product implementation')
    .fill(jobTitle);
  await page
    .getByPlaceholder(
      'Describe the scope, delivery expectations, and what the worker will be paid to complete.',
    )
    .fill('Playwright-backed local-profile coverage for the guided client path.');
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await page.getByRole('textbox', { name: 'Worker wallet' }).fill(workerWallet.address);
  await page
    .getByRole('textbox', { name: 'Settlement token address' })
    .fill(currencyAddress);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Create guided job' }).click();

  await expect(page.getByText(/^Job created\. Escrow id /).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: jobTitle })).toBeVisible();

  await page.getByRole('button', { name: 'Fund selected job' }).click();

  await expect(page.getByText(/^Funding confirmed via /).first()).toBeVisible();

  const jobId = await waitForJobIdByTitle(jobTitle);

  const adminPage = await browser.newPage();
  await adminPage.goto(adminBaseUrl);
  await adminPage.getByPlaceholder('Paste a job UUID').fill(jobId);
  await adminPage.getByRole('button', { name: 'Load public bundle' }).click();

  await expect(adminPage.getByRole('heading', { name: jobTitle })).toBeVisible();
  await expect(adminPage.getByText(jobId, { exact: true })).toBeVisible();
  await expect(adminPage.getByText('Operator case loaded.')).toBeVisible();

  await adminPage.close();
});
