import { expect, test as base } from '@playwright/test';
import {
  adminBaseUrl as localAdminBaseUrl,
  apiBaseUrl as localApiBaseUrl,
  webBaseUrl as localWebBaseUrl,
} from './local-profile';
import { readDeployedProfileConfig } from './deployed-profile';
import { makeRunId } from '../data/builders';

export type AppUrls = {
  profile: 'local' | 'deployed';
  apiBaseUrl: string;
  webBaseUrl: string;
  adminBaseUrl: string;
};

export const test = base.extend<{
  appUrls: AppUrls;
  runId: string;
}>({
  appUrls: async ({}, use) => {
    if (process.env.PLAYWRIGHT_PROFILE?.trim() === 'deployed') {
      const deployed = readDeployedProfileConfig();
      await use({
        profile: 'deployed',
        apiBaseUrl: deployed.apiBaseUrl,
        webBaseUrl: deployed.webBaseUrl,
        adminBaseUrl: deployed.adminBaseUrl,
      });
      return;
    }

    await use({
      profile: 'local',
      apiBaseUrl: localApiBaseUrl,
      webBaseUrl: localWebBaseUrl,
      adminBaseUrl: localAdminBaseUrl,
    });
  },
  runId: async ({}, use) => {
    await use(makeRunId());
  },
});

export { expect };
