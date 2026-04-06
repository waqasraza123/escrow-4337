import { expect, test } from '@playwright/test';
import {
  getRuntimeProfileLabel,
  readDeployedProfileConfig,
} from './deployed-profile';

type RuntimeProfileResponse = {
  profile: 'local-mock' | 'mixed' | 'deployment-like';
  environment: {
    persistenceDriver: 'postgres' | 'file';
  };
  providers: {
    emailMode: 'mock' | 'relay';
    smartAccountMode: 'mock' | 'relay';
    escrowMode: 'mock' | 'relay';
  };
  warnings: string[];
};

const deployed = readDeployedProfileConfig();

test('deployed runtime-profile endpoint reports the expected backend posture', async ({
  request,
}) => {
  const runtimeResponse = await request.get(
    `${deployed.apiBaseUrl}/operations/runtime-profile`,
  );

  expect(runtimeResponse.ok()).toBeTruthy();

  const runtimeProfile = (await runtimeResponse.json()) as RuntimeProfileResponse;

  expect(runtimeProfile.profile).toBe(deployed.expectedProfile);
  expect(runtimeProfile.environment.persistenceDriver).toBe('postgres');

  if (deployed.expectedProfile === 'deployment-like') {
    expect(runtimeProfile.providers).toEqual({
      emailMode: 'relay',
      smartAccountMode: 'relay',
      escrowMode: 'relay',
    });
    expect(runtimeProfile.warnings).toEqual([]);
  }

  const authResponse = await request.get(`${deployed.apiBaseUrl}/auth/me`);
  expect([401, 403]).toContain(authResponse.status());
});

test('web console surfaces the expected deployed API target and runtime posture', async ({
  page,
}) => {
  await page.goto(deployed.webBaseUrl);

  await expect(
    page.getByRole('heading', {
      name: 'Operate the escrow lifecycle from OTP login to dispute resolution.',
    }),
  ).toBeVisible();
  await expect(page.getByText(deployed.apiBaseUrl, { exact: true })).toBeVisible();

  const runtimePanel = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Backend profile validation' }),
  });

  await expect(
    runtimePanel.getByText(getRuntimeProfileLabel(deployed.expectedProfile), {
      exact: true,
    }),
  ).toBeVisible();
});

test('admin console surfaces the expected deployed API target and runtime posture', async ({
  page,
}) => {
  await page.goto(deployed.adminBaseUrl);

  await expect(
    page.getByRole('heading', {
      name: 'Review disputes and execution issues from the public audit trail.',
    }),
  ).toBeVisible();
  await expect(page.getByText(deployed.apiBaseUrl, { exact: true })).toBeVisible();

  const runtimePanel = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Backend profile validation' }),
  });

  await expect(
    runtimePanel.getByText(getRuntimeProfileLabel(deployed.expectedProfile), {
      exact: true,
    }),
  ).toBeVisible();
});

test('admin can load the configured deployed audit bundle', async ({ page, request }) => {
  test.skip(
    !deployed.auditJobId,
    'PLAYWRIGHT_DEPLOYED_AUDIT_JOB_ID is required for deployed public-audit lookup validation.',
  );

  const auditResponse = await request.get(
    `${deployed.apiBaseUrl}/jobs/${deployed.auditJobId}/audit`,
  );
  expect(auditResponse.ok()).toBeTruthy();

  await page.goto(deployed.adminBaseUrl);
  await page.getByPlaceholder('Paste a job UUID').fill(deployed.auditJobId!);
  await page.getByRole('button', { name: 'Load public bundle' }).click();

  await expect(page.getByText(deployed.auditJobId!, { exact: true })).toBeVisible();
  await expect(page.getByText('Operator case loaded.')).toBeVisible();
});
