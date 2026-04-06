import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import {
  adminBaseUrl,
  adminPort,
  apiBaseUrl,
  apiReadyUrl,
  apiPort,
  localApiEnv,
  webBaseUrl,
  webPort,
} from './tests/e2e/local-profile';
import { readDeployedProfileConfig } from './tests/e2e/deployed-profile';

function shellEnv(input: Record<string, string>) {
  return Object.entries(input)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(' ');
}

const localApiEnvString = shellEnv(localApiEnv);
const playwrightProfile =
  process.env.PLAYWRIGHT_PROFILE?.trim() === 'deployed' ? 'deployed' : 'local';

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

loadOptionalProfileEnv(playwrightProfile);

if (playwrightProfile === 'deployed') {
  readDeployedProfileConfig();
}

const localProject = {
  name: 'chromium',
  testIgnore: [/deployed-profile-smoke\.spec\.ts$/],
  use: {
    ...devices['Desktop Chrome'],
  },
};

const deployedProject = {
  name: 'deployed-chromium',
  testMatch: /deployed-profile-smoke\.spec\.ts$/,
  use: {
    ...devices['Desktop Chrome'],
  },
};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  timeout: 120_000,
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    playwrightProfile === 'deployed' ? deployedProject : localProject,
  ],
  webServer:
    playwrightProfile === 'deployed'
      ? undefined
      : [
          {
            command: `${localApiEnvString} pnpm --filter escrow4334-api build && ${localApiEnvString} pnpm --filter escrow4334-api db:migrate && ${localApiEnvString} pnpm --filter escrow4334-api exec node dist/main`,
            url: apiReadyUrl,
            reuseExistingServer: false,
            timeout: 180_000,
          },
          {
            command: `NEXT_PUBLIC_API_BASE_URL=${JSON.stringify(apiBaseUrl)} pnpm --filter web exec next dev --port ${webPort}`,
            url: webBaseUrl,
            reuseExistingServer: false,
            timeout: 120_000,
          },
          {
            command: `NEXT_PUBLIC_API_BASE_URL=${JSON.stringify(apiBaseUrl)} pnpm --filter admin exec next dev --port ${adminPort}`,
            url: adminBaseUrl,
            reuseExistingServer: false,
            timeout: 120_000,
          },
        ],
});
