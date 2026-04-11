import { Wallet } from 'ethers';
import {
  apiJson,
  type BootstrapSessionTokens,
} from './session-bootstrap';

type WalletLinkChallengeResponse = {
  challengeId: string;
  message: string;
};

type CreateJobResponse = {
  jobId: string;
};

function readWalletChainId() {
  const raw =
    process.env.WALLET_SMART_ACCOUNT_CHAIN_ID ||
    process.env.ESCROW_CHAIN_ID ||
    '84532';
  const chainId = Number(raw);

  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error(`Invalid wallet chain id for browser test setup: ${raw}`);
  }

  return chainId;
}

export async function linkWalletForApiSession(input: {
  apiBaseUrl: string;
  session: BootstrapSessionTokens;
  wallet: Wallet;
  chainId?: number;
}) {
  const chainId = input.chainId ?? readWalletChainId();
  const challenge = await apiJson<WalletLinkChallengeResponse>(
    input.apiBaseUrl,
    '/wallet/link/challenge',
    {
      method: 'POST',
      body: JSON.stringify({
        address: input.wallet.address,
        walletKind: 'eoa',
        chainId,
      }),
    },
    input.session.accessToken,
  );
  const signature = await input.wallet.signMessage(challenge.message);

  return apiJson(
    input.apiBaseUrl,
    '/wallet/link/verify',
    {
      method: 'POST',
      body: JSON.stringify({
        challengeId: challenge.challengeId,
        message: challenge.message,
        signature,
      }),
    },
    input.session.accessToken,
  );
}

export async function provisionSmartAccountForApiSession(input: {
  apiBaseUrl: string;
  session: BootstrapSessionTokens;
  ownerAddress: string;
}) {
  return apiJson(
    input.apiBaseUrl,
    '/wallet/smart-account/provision',
    {
      method: 'POST',
      body: JSON.stringify({
        ownerAddress: input.ownerAddress,
        setAsDefault: true,
      }),
    },
    input.session.accessToken,
  );
}

export async function createJobForApiSession(input: {
  apiBaseUrl: string;
  session: BootstrapSessionTokens;
  contractorEmail: string;
  workerAddress: string;
  currencyAddress: string;
  title: string;
  description: string;
  category?: string;
  termsJSON?: Record<string, string | number | boolean>;
}) {
  const response = await apiJson<CreateJobResponse>(
    input.apiBaseUrl,
    '/jobs',
    {
      method: 'POST',
      body: JSON.stringify({
        contractorEmail: input.contractorEmail,
        workerAddress: input.workerAddress,
        currencyAddress: input.currencyAddress,
        title: input.title,
        description: input.description,
        category: input.category ?? 'software-development',
        termsJSON: input.termsJSON ?? {
          disputeModel: 'operator-mediation',
          reviewWindowDays: 3,
          evidenceExpectation: 'Delivery note plus linked evidence URLs',
        },
      }),
    },
    input.session.accessToken,
  );

  return response.jobId;
}

export async function fundJobForApiSession(input: {
  apiBaseUrl: string;
  session: BootstrapSessionTokens;
  jobId: string;
  amount: string;
}) {
  return apiJson(
    input.apiBaseUrl,
    `/jobs/${input.jobId}/fund`,
    {
      method: 'POST',
      body: JSON.stringify({ amount: input.amount }),
    },
    input.session.accessToken,
  );
}

export async function setMilestonesForApiSession(input: {
  apiBaseUrl: string;
  session: BootstrapSessionTokens;
  jobId: string;
  milestones: Array<{
    title: string;
    deliverable: string;
    amount: string;
    dueAt?: number;
  }>;
}) {
  return apiJson(
    input.apiBaseUrl,
    `/jobs/${input.jobId}/milestones`,
    {
      method: 'POST',
      body: JSON.stringify({ milestones: input.milestones }),
    },
    input.session.accessToken,
  );
}
