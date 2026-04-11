import {
  adminBaseUrl,
  forceOtpCode,
  localOtpCode,
  webBaseUrl,
} from '../../../fixtures/local-profile';
import { expect, test } from '../../../fixtures/local-journeys';
import { signInWithOtp } from '../../../flows/launch-candidate-flow';

test('web sign-in can verify an OTP session through the browser UI', async ({
  page,
  runId,
}) => {
  const email = `auth.web.${runId}@example.com`;

  await signInWithOtp({
    page,
    url: `${webBaseUrl}/app/sign-in`,
    email,
    otpCode: localOtpCode,
    afterOtpIssued: () => forceOtpCode(email, localOtpCode),
  });

  await page.goto(`${webBaseUrl}/app/setup`);
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText('Console state is current.')).toBeVisible();
});

test('web restores, refreshes, and clears a seeded session', async ({
  browser,
  localSessionFactory,
  runId,
}) => {
  const actor = await localSessionFactory({
    role: `auth-web-restore.${runId}`,
  });
  const context = await browser.newContext({
    storageState: actor.storageState,
  });
  const page = await context.newPage();

  await page.goto(`${webBaseUrl}/app/setup`);
  await expect(page.getByText(actor.email)).toBeVisible();
  await expect(page.getByText('Console state is current.')).toBeVisible();

  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByText('Session refreshed.')).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByText('Authenticate first. The console will then load your profile, wallets, and jobs.')).toBeVisible();
  await expect(page.getByText(actor.email)).toHaveCount(0);

  await context.close();
});

test('admin restores, refreshes, and clears a seeded operator session', async ({
  browser,
  localSessionFactory,
  runId,
}) => {
  const operator = await localSessionFactory({
    role: `auth-admin-restore.${runId}`,
    app: 'admin',
  });
  const context = await browser.newContext({
    storageState: operator.storageState,
  });
  const page = await context.newPage();

  await page.goto(adminBaseUrl);
  await expect(page.getByText(operator.email)).toBeVisible();
  await expect(page.getByText('Operator session is current.')).toBeVisible();

  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByText('Operator session refreshed.')).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByText('No operator session')).toBeVisible();
  await expect(page.getByText(operator.email)).toHaveCount(0);

  await context.close();
});
