import { expect, test } from '@playwright/test';

test('web console renders onboarding shell', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000');

  await expect(
    page.getByRole('heading', {
      name: 'Operate the escrow lifecycle from OTP login to dispute resolution.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Connect injected wallet' }),
  ).toBeVisible();
  await expect(
    page.getByText('Authenticate first. The console will then load your profile, wallets, and jobs.'),
  ).toBeVisible();
});

test('admin console renders public audit review shell', async ({ page }) => {
  await page.goto('http://127.0.0.1:3001');

  await expect(
    page.getByRole('heading', {
      name: 'Review disputes and execution issues from the public audit trail.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'What this surface can review today' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Load public bundle' }),
  ).toBeVisible();
});
