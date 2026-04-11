import { Wallet } from 'ethers';
import {
  adminSessionStorageKey,
  webSessionStorageKey,
} from './local-profile';
import {
  readDeployedLaunchCandidateFlowConfig,
  readDeployedProfileConfig,
  type DeployedLaunchCandidateActorConfig,
} from './deployed-profile';
import {
  createApiSession,
  createSessionStorageState,
  type BootstrapSessionTokens,
} from './session-bootstrap';
import { expect, test as base } from './test';

type DeployedJourneyRole = 'client' | 'contractor' | 'operator';

export type DeployedJourneyActor = {
  role: DeployedJourneyRole;
  email: string;
  wallet: Wallet;
  session: BootstrapSessionTokens;
  storageState: ReturnType<typeof createSessionStorageState>;
};

function actorConfigForRole(
  role: DeployedJourneyRole,
  config: NonNullable<ReturnType<typeof readDeployedLaunchCandidateFlowConfig>>,
): DeployedLaunchCandidateActorConfig {
  switch (role) {
    case 'client':
      return config.client;
    case 'contractor':
      return config.contractor;
    case 'operator':
      return config.operator;
  }
}

export const test = base.extend<{
  deployedJourneyActorFactory: (role: DeployedJourneyRole) => Promise<DeployedJourneyActor>;
}>({
  deployedJourneyActorFactory: [
    async ({}, use) => {
      const deployed = readDeployedProfileConfig();
      const flow = readDeployedLaunchCandidateFlowConfig();

      await use(async (role) => {
        if (!flow) {
          throw new Error(
            'Deployed journey actors require PLAYWRIGHT_DEPLOYED_FLOW_* credentials.',
          );
        }

        const actorConfig = actorConfigForRole(role, flow);
        const session = await createApiSession({
          apiBaseUrl: deployed.apiBaseUrl,
          email: actorConfig.email,
          otpCode: actorConfig.otpCode,
        });
        const wallet = new Wallet(actorConfig.privateKey);
        const appOrigin =
          role === 'operator' ? deployed.adminBaseUrl : deployed.webBaseUrl;
        const storageKey =
          role === 'operator' ? adminSessionStorageKey : webSessionStorageKey;

        return {
          role,
          email: actorConfig.email,
          wallet,
          session,
          storageState: createSessionStorageState({
            origin: appOrigin,
            storageKey,
            session,
          }),
        };
      });
    },
    { scope: 'worker' },
  ],
});

export { expect };
