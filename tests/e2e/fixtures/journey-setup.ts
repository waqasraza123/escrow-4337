import { Wallet } from 'ethers';
import type { BootstrapSessionTokens } from './session-bootstrap';
import {
  createJobForApiSession,
  fundJobForApiSession,
  linkWalletForApiSession,
  provisionSmartAccountForApiSession,
  setMilestonesForApiSession,
} from './escrow-api';

export async function seedJoinReadyJobViaApi(input: {
  apiBaseUrl: string;
  client: {
    session: BootstrapSessionTokens;
    wallet: Wallet;
    ensureWalletLinked?: boolean;
    ensureSmartAccountProvisioned?: boolean;
  };
  contractor: {
    email: string;
    wallet: Wallet;
    session?: BootstrapSessionTokens;
    ensureWalletLinked?: boolean;
  };
  job: {
    title: string;
    description: string;
    currencyAddress: string;
  };
}) {
  if (input.client.ensureWalletLinked ?? true) {
    await linkWalletForApiSession({
      apiBaseUrl: input.apiBaseUrl,
      session: input.client.session,
      wallet: input.client.wallet,
    });
  }

  if (input.client.ensureSmartAccountProvisioned ?? true) {
    await provisionSmartAccountForApiSession({
      apiBaseUrl: input.apiBaseUrl,
      session: input.client.session,
      ownerAddress: input.client.wallet.address,
    });
  }

  if (
    input.contractor.session &&
    (input.contractor.ensureWalletLinked ?? true)
  ) {
    await linkWalletForApiSession({
      apiBaseUrl: input.apiBaseUrl,
      session: input.contractor.session,
      wallet: input.contractor.wallet,
    });
  }

  const jobId = await createJobForApiSession({
    apiBaseUrl: input.apiBaseUrl,
    session: input.client.session,
    contractorEmail: input.contractor.email,
    workerAddress: input.contractor.wallet.address,
    currencyAddress: input.job.currencyAddress,
    title: input.job.title,
    description: input.job.description,
  });

  await fundJobForApiSession({
    apiBaseUrl: input.apiBaseUrl,
    session: input.client.session,
    jobId,
    amount: '100',
  });

  await setMilestonesForApiSession({
    apiBaseUrl: input.apiBaseUrl,
    session: input.client.session,
    jobId,
    milestones: [
      {
        title: 'Discovery',
        deliverable: 'Accepted scope and milestone plan',
        amount: '50',
      },
      {
        title: 'Delivery',
        deliverable: 'Final shipped implementation',
        amount: '50',
      },
    ],
  });

  return { jobId };
}
