import type {
  EscrowChainIngestionStatus,
  EscrowChainSyncDaemonHealthReport,
} from '../src/modules/operations/escrow-health.types';
import { LaunchReadinessService } from '../src/modules/operations/launch-readiness.service';
import type { BackendRuntimeProfile } from '../src/modules/operations/runtime-profile.types';

describe('LaunchReadinessService', () => {
  function createRuntimeProfile(
    overrides: Partial<BackendRuntimeProfile> = {},
  ): BackendRuntimeProfile {
    return {
      generatedAt: '2026-04-09T00:00:00.000Z',
      profile: 'deployment-like',
      summary:
        'This backend profile is relay-backed and aligned with deployed infrastructure expectations.',
      environment: {
        nodeEnv: 'production',
        persistenceDriver: 'postgres',
        trustProxyRaw: 'loopback',
        corsOrigins: ['https://web.example.com', 'https://admin.example.com'],
      },
      providers: {
        emailMode: 'relay',
        smartAccountMode: 'relay',
        escrowMode: 'relay',
      },
      operator: {
        arbitratorAddress: '0x2222222222222222222222222222222222222222',
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
          latestBlock: 100,
          finalizedBlock: 94,
          lagBlocks: 0,
          cursor: {
            nextFromBlock: 95,
            lastFinalizedBlock: 94,
            lastScannedBlock: 94,
            updatedAt: 1_700_000_000_000,
          },
          projections: {
            totalJobs: 0,
            projectedJobs: 0,
            healthyJobs: 0,
            degradedJobs: 0,
            staleJobs: 0,
          },
          issues: [],
          warnings: [],
        },
        chainSyncDaemon: {
          status: 'ok',
          summary: 'Recurring chain-sync daemon deployment posture is aligned.',
          required: true,
          rpcConfigured: true,
          persistDefault: true,
          intervalSeconds: 300,
          runOnStart: true,
          lockProvider: 'postgres_advisory',
          alertingConfigured: true,
          alertMinSeverity: 'warning',
          alertSendRecovery: true,
          alertResendIntervalSeconds: 900,
          thresholds: {
            maxHeartbeatAgeSeconds: 600,
            maxCurrentRunAgeSeconds: 1800,
            maxConsecutiveFailures: 3,
            maxConsecutiveSkips: 6,
          },
          issues: [],
          warnings: [],
        },
      },
      warnings: [],
      ...overrides,
    };
  }

  function createIngestionStatus(
    overrides: Partial<EscrowChainIngestionStatus> = {},
  ): EscrowChainIngestionStatus {
    return {
      generatedAt: '2026-04-09T00:00:00.000Z',
      enabled: true,
      authorityReadsEnabled: false,
      chainId: 84532,
      contractAddress: '0x1111111111111111111111111111111111111111',
      confirmations: 6,
      batchBlocks: 1000,
      resyncBlocks: 20,
      latestBlock: 100,
      finalizedBlock: 94,
      lagBlocks: 0,
      cursor: {
        chainId: 84532,
        contractAddress: '0x1111111111111111111111111111111111111111',
        streamName: 'workstream_escrow',
        nextFromBlock: 95,
        lastFinalizedBlock: 94,
        lastScannedBlock: 94,
        lastError: null,
        updatedAt: 1_700_000_000_000,
      },
      projections: {
        totalJobs: 0,
        projectedJobs: 0,
        healthyJobs: 0,
        degradedJobs: 0,
        staleJobs: 0,
      },
      status: 'ok',
      summary: 'Escrow chain ingestion is healthy.',
      issues: [],
      warnings: [],
      ...overrides,
    };
  }

  function createDaemonHealth(
    overrides: Partial<EscrowChainSyncDaemonHealthReport> = {},
  ): EscrowChainSyncDaemonHealthReport {
    return {
      generatedAt: '2026-04-09T00:00:00.000Z',
      ok: true,
      status: 'ok',
      required: true,
      summary: 'Recurring chain-sync daemon is healthy on worker worker-1.',
      thresholds: {
        maxHeartbeatAgeMs: 600_000,
        maxCurrentRunAgeMs: 1_800_000,
        maxConsecutiveFailures: 3,
        maxConsecutiveSkips: 6,
      },
      issues: [],
      daemon: null,
      ingestion: createIngestionStatus(),
      ...overrides,
    };
  }

  function createService(
    runtimeProfile = createRuntimeProfile(),
    daemonHealth = createDaemonHealth(),
    ingestionStatus = createIngestionStatus(),
  ) {
    return new LaunchReadinessService(
      {
        getProfile: jest.fn().mockResolvedValue(runtimeProfile),
      } as never,
      {
        getReport: jest.fn().mockResolvedValue(daemonHealth),
      } as never,
      {
        getStatus: jest.fn().mockResolvedValue(ingestionStatus),
      } as never,
    );
  }

  it('reports ready when deployment posture and daemon health are both green', async () => {
    const report = await createService().getReport();

    expect(report.ready).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.summary).toBe(
      'Launch readiness checks are green for the currently supported surface.',
    );
    expect(
      report.checks.find((check) => check.id === 'backend-profile'),
    ).toMatchObject({
      status: 'ok',
      blocker: false,
    });
    expect(
      report.checks.find((check) => check.id === 'chain-ingestion-health'),
    ).toMatchObject({
      status: 'ok',
      blocker: false,
    });
    expect(
      report.checks.find((check) => check.id === 'chain-sync-daemon-health'),
    ).toMatchObject({
      status: 'ok',
      blocker: false,
    });
  });

  it('surfaces blocking failures for mock providers and missing operator prerequisites', async () => {
    const runtimeProfile = createRuntimeProfile({
      profile: 'mixed',
      summary:
        'This backend profile mixes deployed and mock dependencies. Validate operator behavior carefully before treating it as staging-ready.',
      providers: {
        emailMode: 'relay',
        smartAccountMode: 'mock',
        escrowMode: 'mock',
      },
      operator: {
        arbitratorAddress: null,
        resolutionAuthority: 'linked_arbitrator_wallet',
        exportSupport: false,
      },
    });

    const report = await createService(runtimeProfile).getReport();

    expect(report.ready).toBe(false);
    expect(report.blockers).toContain(
      'Backend profile is mixed, so launch readiness is blocked.',
    );
    expect(report.blockers).toContain(
      'Smart-account provisioning is still using mock mode.',
    );
    expect(report.blockers).toContain(
      'Escrow execution is still using mock mode.',
    );
    expect(report.blockers).toContain(
      'Operator launch prerequisites are incomplete.',
    );
  });

  it('keeps readiness blocked when the required daemon is unhealthy and trust proxy is unset', async () => {
    const runtimeProfile = createRuntimeProfile({
      environment: {
        nodeEnv: 'production',
        persistenceDriver: 'postgres',
        trustProxyRaw: null,
        corsOrigins: ['https://web.example.com'],
      },
      operations: {
        chainIngestion: createRuntimeProfile().operations.chainIngestion,
        chainSyncDaemon: {
          ...createRuntimeProfile().operations.chainSyncDaemon,
          status: 'failed',
          summary:
            'Recurring chain-sync daemon deployment posture is misconfigured.',
          issues: [
            'Recurring chain sync is required, but OPERATIONS_ESCROW_RPC_URL or ESCROW_CHAIN_RPC_URL is not set.',
          ],
          warnings: [],
        },
      },
    });
    const daemonHealth = createDaemonHealth({
      ok: false,
      status: 'failed',
      summary: 'The recurring chain-sync daemon heartbeat is stale.',
      issues: [
        {
          code: 'heartbeat_stale',
          severity: 'critical',
          summary: 'The recurring chain-sync daemon heartbeat is stale.',
          detail:
            'The last daemon heartbeat exceeded the configured threshold.',
        },
      ],
    });
    const ingestionStatus = createIngestionStatus({
      status: 'warning',
      summary: 'Escrow chain ingestion is lagging behind finalized chain head.',
      warnings: [
        'Escrow chain ingestion is 120 block(s) behind the finalized head.',
      ],
      lagBlocks: 120,
    });

    const report = await createService(
      runtimeProfile,
      daemonHealth,
      ingestionStatus,
    ).getReport();

    expect(report.ready).toBe(false);
    expect(report.blockers).toContain(
      'Recurring chain-sync daemon deployment posture is misconfigured.',
    );
    expect(report.blockers).toContain(
      'The recurring chain-sync daemon heartbeat is stale.',
    );
    expect(report.warnings).toContain(
      'Trusted proxy handling is not explicitly configured.',
    );
    expect(report.warnings).toContain(
      'Escrow chain ingestion is lagging behind finalized chain head.',
    );
  });
});
