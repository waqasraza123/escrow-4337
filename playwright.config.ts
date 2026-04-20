import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import {
  adminBaseUrl,
  adminPort,
  apiBaseUrl,
  apiReadyUrl,
  apiPort,
  localApiEnv,
  webBaseUrl,
  webPort,
} from './tests/e2e/fixtures/local-profile';
import { readDeployedProfileConfig } from './tests/e2e/fixtures/deployed-profile';

function shellEnv(input: Record<string, string>) {
  return Object.entries(input)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(' ');
}

function loadOptionalProfileEnv(profile: 'local' | 'deployed') {
  const envPath = resolve(
    process.cwd(),
    profile === 'deployed' ? '.env.e2e.deployed' : '.env.e2e.local',
  );

  if (existsSync(envPath)) {
    loadDotenv({
      path: envPath,
      override: false,
    });
  }
}

function readReporters(): ReporterDescription[] {
  const explicitReporter = process.env.PLAYWRIGHT_REPORTER?.trim();
  if (explicitReporter) {
    return [[explicitReporter]];
  }

  if (!process.env.CI) {
    return [['list']];
  }

  return [
    ['list'],
    ['html', { open: 'never', outputFolder: 'artifacts/playwright/html-report' }],
    ['junit', { outputFile: 'artifacts/playwright/results/junit.xml' }],
    ['json', { outputFile: 'artifacts/playwright/results/results.json' }],
  ];
}

function readLocalServerMode() {
  return process.env.PLAYWRIGHT_LOCAL_SERVER_MODE?.trim() === 'built' || process.env.CI
    ? 'built'
    : 'dev';
}

const playwrightProfile =
  process.env.PLAYWRIGHT_PROFILE?.trim() === 'deployed' ? 'deployed' : 'local';
const localServerMode = readLocalServerMode();
const localApiEnvString = shellEnv(localApiEnv);

loadOptionalProfileEnv(playwrightProfile);

if (playwrightProfile === 'deployed') {
  readDeployedProfileConfig();
}

const localProjectBase = {
  use: {
    ...devices['Desktop Chrome'],
    baseURL: webBaseUrl,
    reducedMotion: 'reduce' as const,
  },
};

const deployedProjectBase = {
  use: {
    ...devices['Desktop Chrome'],
    reducedMotion: 'reduce' as const,
  },
};

const localProjects = [
  {
    name: 'local-smoke',
    testMatch: /smoke\/local\/.*\.spec\.ts$/,
    ...localProjectBase,
  },
  {
    name: 'local-journeys',
    testMatch: /journeys\/local\/.*\.spec\.ts$/,
    testIgnore: /journeys\/local\/launch-walkthrough-flow\.spec\.ts$/,
    ...localProjectBase,
  },
  {
    name: 'local-walkthrough',
    testMatch: /journeys\/local\/.*walkthrough.*\.spec\.ts$/,
    ...localProjectBase,
    use: {
      ...localProjectBase.use,
      trace: 'retain-on-failure',
      video: 'retain-on-failure',
    },
  },
];

const deployedProjects = [
  {
    name: 'deployed-smoke',
    testMatch: /smoke\/deployed\/.*\.spec\.ts$/,
    ...deployedProjectBase,
  },
  {
    name: 'deployed-seeded',
    testMatch: /journeys\/deployed\/.*seeded.*\.spec\.ts$/,
    ...deployedProjectBase,
  },
  {
    name: 'deployed-exact',
    testMatch: /journeys\/deployed\/.*exact.*\.spec\.ts$/,
    testIgnore: /journeys\/deployed\/.*walkthrough.*\.spec\.ts$/,
    ...deployedProjectBase,
  },
  {
    name: 'deployed-walkthrough',
    testMatch: /journeys\/deployed\/.*walkthrough.*\.spec\.ts$/,
    ...deployedProjectBase,
    use: {
      ...deployedProjectBase.use,
      trace: 'retain-on-failure',
      video: 'retain-on-failure',
    },
  },
];

const localWebCommand =
  localServerMode === 'built'
    ? `NEXT_PUBLIC_API_BASE_URL=${JSON.stringify(apiBaseUrl)} pnpm --filter web build && NEXT_PUBLIC_API_BASE_URL=${JSON.stringify(apiBaseUrl)} pnpm --filter web exec next start --port ${webPort}`
    : `NEXT_PUBLIC_API_BASE_URL=${JSON.stringify(apiBaseUrl)} pnpm --filter web exec next dev --port ${webPort}`;

const localAdminCommand =
  localServerMode === 'built'
    ? `NEXT_PUBLIC_API_BASE_URL=${JSON.stringify(apiBaseUrl)} pnpm --filter admin build && NEXT_PUBLIC_API_BASE_URL=${JSON.stringify(apiBaseUrl)} pnpm --filter admin exec next start --port ${adminPort}`
    : `NEXT_PUBLIC_API_BASE_URL=${JSON.stringify(apiBaseUrl)} pnpm --filter admin exec next dev --port ${adminPort}`;

const localApiCommand =
  `${localApiEnvString} pnpm --filter escrow4334-api build && ` +
  `${localApiEnvString} pnpm --filter escrow4334-api db:migrate && ` +
  `${localApiEnvString} pnpm --filter escrow4334-api exec node dist/main`;

export default defineConfig({
  testDir: './tests/e2e/specs',
  fullyParallel: true,
  timeout: 120_000,
  reporter: readReporters(),
  retries: Number(process.env.PLAYWRIGHT_RETRIES ?? (process.env.CI ? '1' : '0')),
  workers: process.env.CI ? 3 : undefined,
  outputDir: 'artifacts/playwright/test-results',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },
  projects: playwrightProfile === 'deployed' ? deployedProjects : localProjects,
  webServer:
    playwrightProfile === 'deployed'
      ? undefined
      : [
          {
            command: localApiCommand,
            url: apiReadyUrl,
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
          },
          {
            command: localWebCommand,
            url: webBaseUrl,
            reuseExistingServer: !process.env.CI,
            timeout: localServerMode === 'built' ? 180_000 : 120_000,
          },
          {
            command: localAdminCommand,
            url: adminBaseUrl,
            reuseExistingServer: !process.env.CI,
            timeout: localServerMode === 'built' ? 180_000 : 120_000,
          },
        ],
});
