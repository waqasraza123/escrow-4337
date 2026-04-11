import type { StorageState } from '@playwright/test';
import { Wallet } from 'ethers';
import { makeTestEmail } from '../data/builders';
import {
  adminBaseUrl,
  adminSessionStorageKey,
  createLocalSession,
  linkWalletForSession,
  provisionSmartAccountForSession,
  type LocalSessionTokens,
  webBaseUrl,
  webSessionStorageKey,
} from './local-profile';
import { expect, test as base } from './test';

type LocalActorApp = 'web' | 'admin';

export type LocalSessionActor = {
  app: LocalActorApp;
  email: string;
  session: LocalSessionTokens;
  storageState: StorageState;
};

type LocalSessionFactoryInput = {
  role: string;
  app?: LocalActorApp;
  linkedWallet?: Wallet;
  provisionSmartAccountOwner?: string;
};

type LocalSessionFactory = (
  input: LocalSessionFactoryInput,
) => Promise<LocalSessionActor>;

function createSessionStorageState(input: {
  origin: string;
  storageKey: string;
  session: LocalSessionTokens;
}): StorageState {
  return {
    cookies: [],
    origins: [
      {
        origin: input.origin,
        localStorage: [
          {
            name: input.storageKey,
            value: JSON.stringify(input.session),
          },
        ],
      },
    ],
  };
}

export const test = base.extend<{
  localSessionFactory: LocalSessionFactory;
}>({
  localSessionFactory: [
    async ({}, use, workerInfo) => {
      let actorSequence = 0;
      const workerPrefix = `w${workerInfo.workerIndex}-${Date.now()}`;

      await use(async (input) => {
        actorSequence += 1;
        const app = input.app ?? 'web';
        const email = makeTestEmail(
          `${input.role}.${workerPrefix}.${actorSequence}`,
          workerPrefix,
        );
        const session = await createLocalSession(email);

        if (input.linkedWallet) {
          await linkWalletForSession(session, input.linkedWallet);
        }

        if (input.provisionSmartAccountOwner) {
          await provisionSmartAccountForSession(session, input.provisionSmartAccountOwner);
        }

        const storageState =
          app === 'admin'
            ? createSessionStorageState({
                origin: adminBaseUrl,
                storageKey: adminSessionStorageKey,
                session,
              })
            : createSessionStorageState({
                origin: webBaseUrl,
                storageKey: webSessionStorageKey,
                session,
              });

        return {
          app,
          email,
          session,
          storageState,
        };
      });
    },
    { scope: 'worker' },
  ],
});

export { expect };
