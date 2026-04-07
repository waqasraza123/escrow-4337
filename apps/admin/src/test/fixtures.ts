import type {
  AuditBundle,
  EscrowHealthReport,
  RuntimeProfile,
  SessionTokens,
  UserProfile,
  WalletLinkChallenge,
  UserWallet,
} from '../lib/api';

export const lookupHistoryStorageKey = 'escrow4337.admin.recent-lookups';
export const sessionStorageKey = 'escrow4337.admin.session';

export function createHexAddress(fill: string) {
  return `0x${fill.repeat(40)}`;
}

export function createSessionTokens(): SessionTokens {
  return {
    accessToken: 'admin-access-token-123',
    refreshToken: 'admin-refresh-token-123',
  };
}

export function createEoaWallet(
  address = createHexAddress('2'),
): Extract<UserWallet, { walletKind: 'eoa' }> {
  return {
    address,
    label: 'Operator signer',
    createdAt: 100,
    updatedAt: 100,
    walletKind: 'eoa',
    verificationMethod: 'siwe',
    verificationChainId: 84532,
    verifiedAt: 100,
  };
}

export function createUserProfile(
  wallets: UserWallet[] = [],
): UserProfile {
  return {
    id: 'operator-user-1',
    email: 'operator@example.com',
    shariahMode: false,
    defaultExecutionWalletAddress: null,
    wallets,
  };
}

export function createWalletLinkChallenge(): WalletLinkChallenge {
  return {
    challengeId: 'operator-challenge-123',
    message: 'Sign this challenge to link the arbitrator wallet.',
    issuedAt: 100,
    expiresAt: 200,
  };
}

export function createRuntimeProfile(
  overrides: Partial<RuntimeProfile> = {},
): RuntimeProfile {
  return {
    generatedAt: '2026-04-06T00:00:00.000Z',
    profile: 'local-mock',
    summary:
      'This backend profile is optimized for local development and uses mock providers for operator-visible flows.',
    environment: {
      nodeEnv: 'development',
      persistenceDriver: 'postgres',
      trustProxyRaw: 'loopback',
      corsOrigins: ['http://localhost', 'http://localhost:3000', 'http://localhost:3001'],
    },
    providers: {
      emailMode: 'mock',
      smartAccountMode: 'mock',
      escrowMode: 'mock',
    },
    operator: {
      arbitratorAddress: createHexAddress('2'),
      resolutionAuthority: 'linked_arbitrator_wallet',
      exportSupport: true,
    },
    warnings: [
      'Escrow execution is using mock mode, so lifecycle mutations are not exercising deployed contract relay infrastructure.',
    ],
    ...overrides,
  };
}

export function createEscrowHealthReport(
  overrides: Partial<EscrowHealthReport> = {},
): EscrowHealthReport {
  return {
    generatedAt: '2026-04-07T00:00:00.000Z',
    filters: {
      reason: null,
      limit: 25,
    },
    thresholds: {
      staleJobHours: 72,
      staleJobMs: 259_200_000,
      defaultLimit: 25,
      maxLimit: 100,
    },
    summary: {
      totalJobs: 4,
      jobsNeedingAttention: 1,
      matchedJobs: 1,
      openDisputeJobs: 1,
      failedExecutionJobs: 0,
      staleJobs: 0,
    },
    jobs: [
      {
        jobId: 'job-ops-1',
        title: 'Operator backlog',
        status: 'disputed',
        updatedAt: 500,
        latestActivityAt: 500,
        staleForMs: null,
        reasons: ['open_dispute'],
        counts: {
          openDisputes: 1,
          failedExecutions: 0,
        },
        staleWorkflow: null,
        latestFailedExecution: null,
        failedExecutionDiagnostics: null,
        onchain: {
          chainId: 84532,
          contractAddress: '0xcontract',
          escrowId: 'escrow-ops-1',
        },
      },
    ],
    ...overrides,
  };
}

export function createAuditBundle(): AuditBundle {
  return {
    bundle: {
      job: {
        id: 'job-123',
        title: 'Disputed implementation',
        description: 'Operator review case',
        category: 'software-development',
        fundedAmount: '100',
        status: 'disputed',
        createdAt: 100,
        updatedAt: 500,
        milestones: [
          {
            title: 'Discovery',
            deliverable: 'Accepted plan',
            amount: '50',
            status: 'released',
            releasedAt: 200,
          },
          {
            title: 'Delivery',
            deliverable: 'Final feature shipment',
            amount: '50',
            status: 'disputed',
            deliveredAt: 300,
            disputedAt: 400,
            disputeReason: 'Acceptance criteria not met',
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
      },
      audit: [
        {
          type: 'job.funded',
          at: 150,
          payload: { jobId: 'job-123' },
        },
        {
          type: 'milestone.disputed',
          at: 400,
          payload: { jobId: 'job-123', milestoneIndex: 1 },
        },
      ],
      executions: [
        {
          id: 'exec-1',
          action: 'open_dispute',
          actorAddress: '0xclient',
          status: 'confirmed',
          txHash: '0xconfirm',
          submittedAt: 395,
          confirmedAt: 400,
          milestoneIndex: 1,
        },
        {
          id: 'exec-2',
          action: 'resolve_dispute',
          actorAddress: '0xoperator',
          status: 'failed',
          txHash: '0xfail',
          submittedAt: 450,
          failureCode: 'relay_rejected',
          failureMessage: 'Bundler rejected the request',
          milestoneIndex: 1,
        },
      ],
    },
  };
}

export function createQuietAuditBundle(): AuditBundle {
  return {
    bundle: {
      job: {
        id: 'job-quiet',
        title: 'Healthy implementation',
        description: 'Operator empty-state case',
        category: 'software-development',
        fundedAmount: '100',
        status: 'in_progress',
        createdAt: 100,
        updatedAt: 300,
        milestones: [
          {
            title: 'Discovery',
            deliverable: 'Accepted plan',
            amount: '50',
            status: 'released',
            releasedAt: 200,
          },
        ],
        onchain: {
          chainId: 84532,
          contractAddress: '0xcontract',
          escrowId: 'escrow-quiet',
          clientAddress: '0xclient',
          workerAddress: '0xworker',
          currencyAddress: '0xusdc',
        },
      },
      audit: [
        {
          type: 'job.created',
          at: 100,
          payload: { jobId: 'job-quiet' },
        },
      ],
      executions: [],
    },
  };
}

export function createResolvedAuditBundle(): AuditBundle {
  return {
    bundle: {
      ...createAuditBundle().bundle,
      job: {
        ...createAuditBundle().bundle.job,
        status: 'resolved',
        milestones: [
          createAuditBundle().bundle.job.milestones[0],
          {
            ...createAuditBundle().bundle.job.milestones[1],
            status: 'released',
            resolvedAt: 500,
            resolutionAction: 'release',
            resolutionNote: 'Released after operator review',
          },
        ],
      },
      audit: [
        ...createAuditBundle().bundle.audit,
        {
          type: 'milestone.resolved',
          at: 500,
          payload: { jobId: 'job-123', milestoneIndex: 1, action: 'release' },
        },
      ],
      executions: [
        ...createAuditBundle().bundle.executions.filter(
          (execution) => execution.id !== 'exec-2',
        ),
        {
          id: 'exec-3',
          action: 'resolve_dispute',
          actorAddress: createHexAddress('2'),
          status: 'confirmed',
          txHash: '0xresolved',
          submittedAt: 500,
          confirmedAt: 501,
          milestoneIndex: 1,
        },
      ],
    },
  };
}
