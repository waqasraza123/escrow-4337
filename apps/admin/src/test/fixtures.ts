import type {
  AuditBundle,
  EscrowChainIngestionStatus,
  EscrowHealthReport,
  RuntimeProfile,
  SessionTokens,
  WorkspaceSummary,
  UserCapabilities,
  UserProfile,
  WalletLinkChallenge,
  UserWallet,
} from '../lib/api';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer Item>
    ? Array<DeepPartial<Item>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

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

export function createUserCapabilities(
  overrides: DeepPartial<UserCapabilities> = {},
  options: {
    controlsArbitratorWallet?: boolean;
    requiredWalletAddress?: string | null;
  } = {},
): UserCapabilities {
  const requiredWalletAddress =
    options.requiredWalletAddress ?? createHexAddress('2');
  const controlsArbitratorWallet = options.controlsArbitratorWallet ?? false;
  const baseCapability = {
    allowed: controlsArbitratorWallet,
    reason: controlsArbitratorWallet
      ? 'Authenticated user controls the configured arbitrator wallet'
      : 'Authenticated user must control the configured arbitrator wallet',
    grantedBy: controlsArbitratorWallet
      ? ('linked_arbitrator_wallet' as const)
      : ('none' as const),
    requiredWalletAddress,
  };
  const base: UserCapabilities = {
    escrowResolution: { ...baseCapability },
    escrowOperations: { ...baseCapability },
    chainAuditSync: { ...baseCapability },
    jobHistoryImport: { ...baseCapability },
    marketplaceModeration: { ...baseCapability },
  };

  return {
    ...base,
    ...overrides,
    escrowResolution: {
      ...base.escrowResolution,
      ...overrides.escrowResolution,
    },
    escrowOperations: {
      ...base.escrowOperations,
      ...overrides.escrowOperations,
    },
    chainAuditSync: {
      ...base.chainAuditSync,
      ...overrides.chainAuditSync,
    },
    jobHistoryImport: {
      ...base.jobHistoryImport,
      ...overrides.jobHistoryImport,
    },
    marketplaceModeration: {
      ...base.marketplaceModeration,
      ...overrides.marketplaceModeration,
    },
  };
}

export function createUserProfile(
  wallets: UserWallet[] = [],
): UserProfile {
  const controlsArbitratorWallet = wallets.some(
    (wallet) => wallet.address === createHexAddress('2'),
  );
  const operatorWorkspace: WorkspaceSummary = {
    workspaceId: 'workspace-client-operator',
    kind: 'client',
    label: 'Personal client workspace',
    slug: 'personal-client-operator',
    organizationId: 'org-personal-operator',
    organizationName: 'Personal workspace',
    organizationSlug: 'personal-operator',
    organizationKind: 'personal',
    roles: ['client_owner'],
    capabilities: {
      manageProfile: false,
      applyToOpportunity: false,
      createOpportunity: true,
      reviewApplications: true,
      manageWorkspace: true,
    },
    isDefault: true,
  };
  return {
    id: 'operator-user-1',
    email: 'operator@example.com',
    shariahMode: false,
    defaultExecutionWalletAddress: null,
    wallets,
    capabilities: createUserCapabilities({}, { controlsArbitratorWallet }),
    workspaces: [operatorWorkspace],
    activeWorkspace: operatorWorkspace,
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
  overrides: DeepPartial<RuntimeProfile> = {},
): RuntimeProfile {
  const base: RuntimeProfile = {
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
    operations: {
      chainIngestion: {
        enabled: true,
        authorityReadsEnabled: false,
        status: 'ok',
        summary: 'Escrow chain ingestion is healthy.',
        confirmationDepth: 6,
        batchBlocks: 1000,
        resyncBlocks: 20,
        latestBlock: 120,
        finalizedBlock: 114,
        lagBlocks: 0,
        cursor: {
          nextFromBlock: 115,
          lastFinalizedBlock: 114,
          lastScannedBlock: 114,
          updatedAt: 1_700_000_000_000,
        },
        projections: {
          totalJobs: 4,
          projectedJobs: 3,
          healthyJobs: 3,
          degradedJobs: 0,
          staleJobs: 0,
        },
        issues: [],
        warnings: [],
      },
      chainSyncDaemon: {
        status: 'ok',
        summary:
          'Recurring chain-sync daemon is optional in this environment.',
        required: false,
        rpcConfigured: false,
        persistDefault: false,
        intervalSeconds: 300,
        runOnStart: true,
        lockProvider: 'postgres_advisory',
        alertingConfigured: false,
        alertMinSeverity: 'critical',
        alertSendRecovery: true,
        alertResendIntervalSeconds: 3600,
        thresholds: {
          maxHeartbeatAgeSeconds: 900,
          maxCurrentRunAgeSeconds: 1800,
          maxConsecutiveFailures: 3,
          maxConsecutiveSkips: 6,
        },
        issues: [],
        warnings: [],
      },
    },
    warnings: [
      'Escrow execution is using mock mode, so lifecycle mutations are not exercising deployed contract relay infrastructure.',
    ],
  };

  return {
    ...base,
    ...overrides,
    environment: {
      ...base.environment,
      ...overrides.environment,
    },
    providers: {
      ...base.providers,
      ...overrides.providers,
    },
    operator: {
      ...base.operator,
      ...overrides.operator,
    },
    operations: {
      chainIngestion: {
        ...base.operations.chainIngestion,
        ...overrides.operations?.chainIngestion,
        cursor: {
          ...base.operations.chainIngestion.cursor,
          ...overrides.operations?.chainIngestion?.cursor,
        },
        projections: {
          ...base.operations.chainIngestion.projections,
          ...overrides.operations?.chainIngestion?.projections,
        },
      },
      chainSyncDaemon: {
        ...base.operations.chainSyncDaemon,
        ...overrides.operations?.chainSyncDaemon,
        thresholds: {
          ...base.operations.chainSyncDaemon.thresholds,
          ...overrides.operations?.chainSyncDaemon?.thresholds,
        },
      },
    },
    warnings: overrides.warnings ?? base.warnings,
  };
}

export function createEscrowHealthReport(
  overrides: DeepPartial<EscrowHealthReport> = {},
): EscrowHealthReport {
  const base: EscrowHealthReport = {
    generatedAt: '2026-04-07T00:00:00.000Z',
    filters: {
      reason: null,
      limit: 25,
    },
    thresholds: {
      chainSyncBacklogHours: 6,
      chainSyncBacklogMs: 21_600_000,
      staleJobHours: 72,
      staleJobMs: 259_200_000,
      defaultLimit: 25,
      maxLimit: 100,
    },
    summary: {
      totalJobs: 4,
      jobsNeedingAttention: 1,
      matchedJobs: 1,
      chainSyncBacklogJobs: 0,
      openDisputeJobs: 1,
      reconciliationDriftJobs: 0,
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
          chainSyncBacklog: false,
          openDisputes: 1,
          failedExecutions: 0,
        },
        chainSync: null,
        executionFailureWorkflow: null,
        staleWorkflow: null,
        latestFailedExecution: null,
        failedExecutionDiagnostics: null,
        failureGuidance: null,
        reconciliation: null,
        onchain: {
          chainId: 84532,
          contractAddress: '0xcontract',
          escrowId: 'escrow-ops-1',
        },
        authority: {
          source: 'local_fallback',
          authorityReadsEnabled: false,
          projectionAvailable: false,
          projectionFresh: false,
          projectionHealthy: false,
          projectedAt: null,
          lastProjectedBlock: null,
          lastEventCount: null,
          reason: 'projection_missing',
        },
      },
    ],
  };

  return {
    ...base,
    ...overrides,
    filters: {
      ...base.filters,
      ...overrides.filters,
    },
    thresholds: {
      ...base.thresholds,
      ...overrides.thresholds,
    },
    summary: {
      ...base.summary,
      ...overrides.summary,
    },
    jobs: (overrides.jobs as EscrowHealthReport['jobs'] | undefined) ?? base.jobs,
  };
}

export function createEscrowChainIngestionStatus(
  overrides: DeepPartial<EscrowChainIngestionStatus> = {},
): EscrowChainIngestionStatus {
  const base: EscrowChainIngestionStatus = {
    generatedAt: '2026-04-08T00:00:00.000Z',
    enabled: true,
    authorityReadsEnabled: false,
    chainId: 84532,
    contractAddress: '0xcontract',
    confirmations: 6,
    batchBlocks: 1000,
    resyncBlocks: 20,
    latestBlock: 120,
    finalizedBlock: 114,
    lagBlocks: 0,
    cursor: {
      chainId: 84532,
      contractAddress: '0xcontract',
      streamName: 'workstream_escrow',
      nextFromBlock: 115,
      lastFinalizedBlock: 114,
      lastScannedBlock: 114,
      lastError: null,
      updatedAt: 1_700_000_000_000,
    },
    projections: {
      totalJobs: 4,
      projectedJobs: 3,
      healthyJobs: 3,
      degradedJobs: 0,
      staleJobs: 0,
    },
    status: 'ok',
    summary: 'Escrow chain ingestion is healthy.',
    issues: [],
    warnings: [],
  };
  const baseCursor = base.cursor!;

  const cursor: EscrowChainIngestionStatus['cursor'] =
    overrides.cursor === null
      ? null
      : {
          chainId: overrides.cursor?.chainId ?? baseCursor.chainId,
          contractAddress:
            overrides.cursor?.contractAddress ?? baseCursor.contractAddress,
          streamName: overrides.cursor?.streamName ?? baseCursor.streamName,
          nextFromBlock:
            overrides.cursor?.nextFromBlock ?? baseCursor.nextFromBlock,
          lastFinalizedBlock:
            overrides.cursor?.lastFinalizedBlock ?? baseCursor.lastFinalizedBlock,
          lastScannedBlock:
            overrides.cursor?.lastScannedBlock ?? baseCursor.lastScannedBlock,
          lastError: overrides.cursor?.lastError ?? baseCursor.lastError,
          updatedAt: overrides.cursor?.updatedAt ?? baseCursor.updatedAt,
        };

  return {
    ...base,
    ...overrides,
    cursor,
    projections: {
      ...base.projections,
      ...overrides.projections,
    },
    issues: overrides.issues ?? base.issues,
    warnings: overrides.warnings ?? base.warnings,
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
            disputeEvidenceUrls: [],
          },
          {
            title: 'Delivery',
            deliverable: 'Final feature shipment',
            amount: '50',
            status: 'disputed',
            deliveredAt: 300,
            disputedAt: 400,
            disputeReason: 'Acceptance criteria not met',
            disputeEvidenceUrls: ['https://example.com/dispute-context'],
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
      authority: {
        source: 'chain_projection',
        authorityReadsEnabled: true,
        projectionAvailable: true,
        projectionFresh: true,
        projectionHealthy: true,
        projectedAt: 500,
        lastProjectedBlock: 28,
        lastEventCount: 4,
        reason: null,
      },
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
      authority: {
        source: 'local_fallback',
        authorityReadsEnabled: true,
        projectionAvailable: false,
        projectionFresh: false,
        projectionHealthy: false,
        projectedAt: null,
        lastProjectedBlock: null,
        lastEventCount: null,
        reason: 'projection_missing',
      },
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
