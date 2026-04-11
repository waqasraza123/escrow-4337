import { readFile } from 'node:fs/promises';
import { type Download, type Locator, type Page } from '@playwright/test';
import { expect, test } from '../../../fixtures/test';
import {
  describeDeployedRuntimeAlignment,
  getRuntimeProfileLabel,
  readDeployedProfileConfig,
  type RuntimeProfileResponse,
} from '../../../fixtures/deployed-profile';

type LaunchReadinessResponse = {
  generatedAt: string;
  ready: boolean;
  summary: string;
  profile: RuntimeProfileResponse['profile'];
  scope: {
    supportedSurfaces: string[];
    exclusions: string[];
  };
  checks: Array<{
    id: string;
    owner: 'deployment' | 'frontend' | 'operator' | 'worker';
    status: 'ok' | 'warning' | 'failed';
    summary: string;
    details?: string;
    blocker: boolean;
  }>;
  blockers: string[];
  warnings: string[];
};

type BrowserRuntimeProfileProbe =
  | {
      ok: true;
      status: number;
      runtimeProfile: RuntimeProfileResponse;
      message: '';
    }
  | {
      ok: false;
      status: number | null;
      runtimeProfile: null;
      message: string;
    };

const deployed = readDeployedProfileConfig();

type ExportProbe = {
  artifact: 'job-history' | 'dispute-case';
  format: 'json' | 'csv';
  buttonName: string;
  successMessage: string;
  fileNamePattern: RegExp;
  requiredText: string;
};

function runtimePanel(page: Page) {
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Backend profile validation' }),
  });
}

function summaryValue(panel: Locator, label: string) {
  return panel.locator('article', { hasText: label }).locator('strong').first();
}

async function probeBrowserRuntimeProfile(
  page: Page,
  apiBaseUrl: string,
): Promise<BrowserRuntimeProfileProbe> {
  return page.evaluate(async (baseUrl) => {
    async function readErrorMessage(response: Response) {
      const text = await response.text();
      if (!text) {
        return `Request failed with ${response.status}`;
      }

      try {
        const body = JSON.parse(text) as {
          message?: string | string[];
          error?: string;
        };
        if (Array.isArray(body.message)) {
          return body.message.join(', ');
        }

        return body.message || body.error || text;
      } catch {
        return text;
      }
    }

    try {
      const response = await fetch(`${baseUrl}/operations/runtime-profile`, {
        headers: {
          accept: 'application/json',
        },
      });

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          runtimeProfile: null,
          message: await readErrorMessage(response),
        };
      }

      return {
        ok: true,
        status: response.status,
        runtimeProfile: (await response.json()) as RuntimeProfileResponse,
        message: '',
      };
    } catch (error) {
      return {
        ok: false,
        status: null,
        runtimeProfile: null,
        message: error instanceof Error ? error.message : 'Failed to fetch',
      };
    }
  }, apiBaseUrl);
}

async function expectRuntimeValidationPanel(page: Page, apiBaseUrl: string) {
  const panel = runtimePanel(page);
  const browserRuntimeProfile = await probeBrowserRuntimeProfile(page, apiBaseUrl);
  const currentOrigin = new URL(page.url()).origin;
  const runtimeAlignment = describeDeployedRuntimeAlignment(
    apiBaseUrl,
    currentOrigin,
    browserRuntimeProfile.runtimeProfile,
  );

  await expect(summaryValue(panel, 'Frontend origin')).toHaveText(currentOrigin);
  await expect(summaryValue(panel, 'CORS readiness')).toHaveText(runtimeAlignment.corsLabel);
  await expect(summaryValue(panel, 'API transport')).toHaveText(runtimeAlignment.transportLabel);
  await expect(summaryValue(panel, 'Persistence')).toHaveText(runtimeAlignment.persistenceLabel);
  await expect(summaryValue(panel, 'Trust proxy')).toHaveText(runtimeAlignment.trustProxyLabel);
  await expect(summaryValue(panel, 'Allowed origins')).toHaveText(
    runtimeAlignment.corsOriginsLabel,
  );
  await expect(panel.getByText(runtimeAlignment.corsMessage, { exact: true })).toBeVisible();
  await expect(panel.getByText(runtimeAlignment.transportMessage, { exact: true })).toBeVisible();

  if (!browserRuntimeProfile.ok) {
    await expect(summaryValue(panel, 'Profile')).toHaveText('Unavailable');
    await expect(summaryValue(panel, 'Providers')).toHaveText('Unknown');
    await expect(panel.getByText(browserRuntimeProfile.message, { exact: true })).toBeVisible();
    await expect(panel.getByText('Validation warning')).toHaveCount(0);
    return;
  }

  await expect(summaryValue(panel, 'Profile')).toHaveText(
    getRuntimeProfileLabel(browserRuntimeProfile.runtimeProfile.profile),
  );
  await expect(summaryValue(panel, 'Providers')).toHaveText(
    `${browserRuntimeProfile.runtimeProfile.providers.emailMode}/${browserRuntimeProfile.runtimeProfile.providers.smartAccountMode}/${browserRuntimeProfile.runtimeProfile.providers.escrowMode}`,
  );
  await expect(
    panel.getByText(browserRuntimeProfile.runtimeProfile.summary, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(panel.getByText('Validation warning')).toHaveCount(
    browserRuntimeProfile.runtimeProfile.warnings.length,
  );

  for (const warning of browserRuntimeProfile.runtimeProfile.warnings) {
    await expect(panel.getByText(warning, { exact: true })).toBeVisible();
  }
}

async function readDownloadText(download: Download) {
  const filePath = await download.path();

  if (!filePath) {
    throw new Error('Playwright did not persist the downloaded file.');
  }

  return readFile(filePath, 'utf8');
}

async function expectExportDownload(page: Page, probe: ExportProbe) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: probe.buttonName }).click(),
  ]);

  await expect(page.getByText(probe.successMessage, { exact: true })).toBeVisible();
  expect(download.suggestedFilename()).toMatch(probe.fileNamePattern);

  const content = await readDownloadText(download);
  expect(content).toContain(probe.requiredText);

  if (probe.format === 'json') {
    expect(content).toContain(`"artifact":"${probe.artifact}"`);
    return;
  }

  expect(content).toContain('job_id,job_title,artifact');
}

test('deployed runtime-profile endpoint reports the expected backend posture', async ({
  request,
}) => {
  const runtimeResponse = await request.get(`${deployed.apiBaseUrl}/operations/runtime-profile`);

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

test('deployed launch-readiness endpoint reports the current launch posture', async ({
  request,
}) => {
  const readinessResponse = await request.get(`${deployed.apiBaseUrl}/operations/launch-readiness`);

  expect(readinessResponse.ok()).toBeTruthy();

  const readiness = (await readinessResponse.json()) as LaunchReadinessResponse;

  expect(readiness.profile).toBe(deployed.expectedProfile);
  expect(Array.isArray(readiness.checks)).toBe(true);
  expect(Array.isArray(readiness.blockers)).toBe(true);
  expect(Array.isArray(readiness.warnings)).toBe(true);
  expect(readiness.scope.supportedSurfaces.length).toBeGreaterThan(0);
  expect(readiness.scope.exclusions.length).toBeGreaterThan(0);

  if (deployed.expectLaunchReady) {
    expect(readiness.ready).toBe(true);
    expect(readiness.blockers).toEqual([]);
    expect(readiness.checks.filter((check) => check.status === 'failed')).toEqual([]);
  }
});

test('web routes surface the expected deployed marketing and app posture', async ({
  page,
}) => {
  await page.goto(deployed.webBaseUrl);

  await expect(
    page.getByRole('heading', {
      name: 'Milestone escrow for crypto service work',
    }),
  ).toBeVisible();
  await expect(page.getByText('Lock client funds upfront')).toBeVisible();

  await page.goto(`${deployed.webBaseUrl}/app`);

  await expect(
    page.getByRole('heading', {
      name: 'Operate the escrow lifecycle from OTP login to dispute resolution.',
    }),
  ).toBeVisible();
  await expect(page.getByText(deployed.apiBaseUrl, { exact: true })).toBeVisible();

  await expectRuntimeValidationPanel(page, deployed.apiBaseUrl);
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

  await expectRuntimeValidationPanel(page, deployed.apiBaseUrl);
});

test('admin can load the configured deployed audit bundle and download exports', async ({
  page,
  request,
}) => {
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

  const probes: ExportProbe[] = [
    {
      artifact: 'job-history',
      format: 'json',
      buttonName: 'Export job history JSON',
      successMessage: 'Downloaded job-history JSON export.',
      fileNamePattern: new RegExp(`^escrow-${deployed.auditJobId!}-job-history-.*\\.json$`),
      requiredText: deployed.auditJobId!,
    },
    {
      artifact: 'job-history',
      format: 'csv',
      buttonName: 'Export job history CSV',
      successMessage: 'Downloaded job-history CSV export.',
      fileNamePattern: new RegExp(`^escrow-${deployed.auditJobId!}-job-history-.*\\.csv$`),
      requiredText: deployed.auditJobId!,
    },
    {
      artifact: 'dispute-case',
      format: 'json',
      buttonName: 'Export dispute case JSON',
      successMessage: 'Downloaded dispute-case JSON export.',
      fileNamePattern: new RegExp(`^escrow-${deployed.auditJobId!}-dispute-case-.*\\.json$`),
      requiredText: deployed.auditJobId!,
    },
    {
      artifact: 'dispute-case',
      format: 'csv',
      buttonName: 'Export dispute case CSV',
      successMessage: 'Downloaded dispute-case CSV export.',
      fileNamePattern: new RegExp(`^escrow-${deployed.auditJobId!}-dispute-case-.*\\.csv$`),
      requiredText: deployed.auditJobId!,
    },
  ];

  for (const probe of probes) {
    await expectExportDownload(page, probe);
  }
});
