import { Wallet } from 'ethers';
import { makeTestEmail } from '../data/builders';
import {
  adminBaseUrl,
  adminSessionStorageKey,
  createLocalSession,
  findLocalUserEmailByWalletAddress,
  linkWalletForSession,
  provisionSmartAccountForSession,
  type LocalSessionTokens,
  webBaseUrl,
  webSessionStorageKey,
} from './local-profile';
import { createSessionStorageState } from './session-bootstrap';
import { expect, test as base } from './test';

type LocalActorApp = 'web' | 'admin';

export type LocalSessionActor = {
  app: LocalActorApp;
  email: string;
  session: LocalSessionTokens;
  storageState: ReturnType<typeof createSessionStorageState>;
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
        let email = makeTestEmail(
          `${input.role}.${workerPrefix}.${actorSequence}`,
          workerPrefix,
        );
        let session = await createLocalSession(email);

        if (input.linkedWallet) {
          try {
            await linkWalletForSession(session, input.linkedWallet);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Unknown wallet link failure';
            if (message !== 'Wallet address is already linked') {
              throw error;
            }

            const existingEmail = await findLocalUserEmailByWalletAddress(
              input.linkedWallet.address,
            );
            if (!existingEmail) {
              throw error;
            }

            email = existingEmail;
            session = await createExistingWalletOwnerSession(existingEmail);
          }
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

async function createExistingWalletOwnerSession(email: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await createLocalSession(email);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown session bootstrap failure';
      if (message !== 'Invalid or expired code' || attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error(`Unable to create a local session for ${email}`);
}
