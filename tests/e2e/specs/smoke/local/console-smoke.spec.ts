import { expect, test } from '../../../fixtures/test';

test('web marketing homepage explains the narrowed launch candidate', async ({
  appUrls,
  page,
}) => {
  await page.goto(appUrls.webBaseUrl);

  await expect(
    page.getByRole('heading', {
      name: 'Milestone escrow for crypto service work',
    }),
  ).toBeVisible();
  await expect(page.getByText('Lock client funds upfront')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start a milestone escrow' }).first()).toBeVisible();
});

test('web app renders the routed onboarding shell', async ({ appUrls, page }) => {
  await page.goto(`${appUrls.webBaseUrl}/app`);

  await expect(
    page.getByRole('heading', {
      name: 'Operate the escrow lifecycle from OTP login to dispute resolution.',
    }),
  ).toBeVisible();
  await expect(
    page.getByText('Authenticate first. The console will then load your profile, wallets, and jobs.'),
  ).toBeVisible();
  await expect(page.getByText(appUrls.apiBaseUrl, { exact: true })).toBeVisible();
  await expect(page.getByText('Current origin allowed').first()).toBeVisible();
});

test('admin console renders public audit review shell', async ({ appUrls, page }) => {
  await page.goto(appUrls.adminBaseUrl);

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
  await expect(page.getByText(appUrls.apiBaseUrl, { exact: true })).toBeVisible();
  await expect(page.getByText('Current origin allowed').first()).toBeVisible();
});
