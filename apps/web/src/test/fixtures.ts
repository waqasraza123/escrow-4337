import type {
  AuditBundle,
  JobView,
  JobsListResponse,
  SessionTokens,
  UserProfile,
  VerifyResponse,
  UserWallet,
  WalletLinkChallenge,
  WalletState,
} from '../lib/api';

export const sessionStorageKey = 'escrow4337.web.session';

export function createSessionTokens(): SessionTokens {
  return {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-123',
  };
}

export function createVerifyResponse(): VerifyResponse {
  return {
    ...createSessionTokens(),
    user: createUserProfile(),
  };
}

export function createEoaWallet(): Extract<UserWallet, { walletKind: 'eoa' }> {
  return {
    address: '0x1111111111111111111111111111111111111111',
    label: 'Verified owner',
    createdAt: 100,
    updatedAt: 100,
    walletKind: 'eoa',
    verificationMethod: 'siwe',
    verificationChainId: 84532,
    verifiedAt: 100,
  };
}

export function createSmartAccountWallet(
  ownerAddress = createEoaWallet().address,
): Extract<UserWallet, { walletKind: 'smart_account' }> {
  return {
    address: '0x2222222222222222222222222222222222222222',
    label: 'Primary execution wallet',
    createdAt: 120,
    updatedAt: 120,
    walletKind: 'smart_account',
    ownerAddress,
    recoveryAddress: ownerAddress,
    chainId: 84532,
    providerKind: 'mock',
    entryPointAddress: '0xentrypoint',
    factoryAddress: '0xfactory',
    sponsorshipPolicy: 'sponsored',
    provisionedAt: 120,
  };
}

export function createWalletState(): WalletState {
  const eoaWallet = createEoaWallet();
  const smartWallet = createSmartAccountWallet(eoaWallet.address);

  return {
    defaultExecutionWalletAddress: smartWallet.address,
    wallets: [eoaWallet, smartWallet],
  };
}

export function createUserProfile(): UserProfile {
  const walletState = createWalletState();

  return {
    id: 'user-1',
    email: 'client@example.com',
    shariahMode: false,
    defaultExecutionWalletAddress: walletState.defaultExecutionWalletAddress,
    wallets: walletState.wallets,
  };
}

export function createJobView(): JobView {
  return {
    id: 'job-1',
    title: 'Escrowed implementation',
    description: 'Build the requested product slice.',
    category: 'software-development',
    termsJSON: {
      currency: 'USDC',
    },
    jobHash: '0xjobhash',
    fundedAmount: '100',
    status: 'funded',
    createdAt: 100,
    updatedAt: 400,
    milestones: [
      {
        title: 'Discovery',
        deliverable: 'Accepted scope and milestone plan',
        amount: '50',
        dueAt: 150,
        status: 'delivered',
        deliveredAt: 200,
        deliveryNote: 'Discovery package shared for review.',
        deliveryEvidenceUrls: ['https://example.com/discovery'],
      },
      {
        title: 'Delivery',
        deliverable: 'Final shipped implementation',
        amount: '50',
        dueAt: 250,
        status: 'pending',
      },
    ],
    onchain: {
      chainId: 84532,
      contractAddress: '0xcontract',
      escrowId: 'escrow-1',
      clientAddress: '0xclient',
      workerAddress: '0xworker',
      currencyAddress: '0xusdc',
    },
  };
}

export function createJobsListResponse(): JobsListResponse {
  return {
    jobs: [
      {
        job: createJobView(),
        participantRoles: ['client', 'worker'],
      },
    ],
  };
}

export function createAuditBundle(): AuditBundle {
  return {
    bundle: {
      job: createJobView(),
      audit: [
        {
          type: 'job.funded',
          at: 180,
          payload: { jobId: 'job-1' },
        },
        {
          type: 'milestone.delivered',
          at: 200,
          payload: { jobId: 'job-1', milestoneIndex: 0 },
        },
      ],
      executions: [
        {
          id: 'execution-1',
          action: 'deliver_milestone',
          actorAddress: '0xworker',
          chainId: 84532,
          contractAddress: '0xcontract',
          txHash: '0xdeliveryhash',
          status: 'confirmed',
          blockNumber: 22,
          submittedAt: 195,
          confirmedAt: 200,
          milestoneIndex: 0,
          escrowId: 'escrow-1',
        },
      ],
    },
  };
}

export function createWalletLinkChallenge(): WalletLinkChallenge {
  return {
    challengeId: 'challenge-123',
    message: 'Sign in to link your wallet.',
    issuedAt: 100,
    expiresAt: 200,
  };
}
