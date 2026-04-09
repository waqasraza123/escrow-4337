import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { EscrowChainSyncDaemonStatusService } from '../src/modules/operations/escrow-chain-sync-daemon-status.service';
import { OperationsConfigService } from '../src/modules/operations/operations.config';
import { PersistenceConfigService } from '../src/persistence/persistence.config';
import { PostgresDatabaseService } from '../src/persistence/postgres/postgres-database.service';

describe('EscrowChainSyncDaemonStatusService', () => {
  const originalEnv = { ...process.env };
  let tempDir: string | null = null;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    tempDir = await mkdtemp(join(tmpdir(), 'escrow4337-daemon-status-'));
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('persists daemon status to the configured file path and caps recent runs', async () => {
    process.env.PERSISTENCE_DRIVER = 'file';
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_STATUS_FILE = join(
      tempDir ?? tmpdir(),
      'daemon-status.json',
    );
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_STATUS_RECENT_RUNS_LIMIT = '2';

    const service = new EscrowChainSyncDaemonStatusService(
      new PersistenceConfigService(),
      {} as PostgresDatabaseService,
      new OperationsConfigService(),
    );
    const worker = createWorker();

    await service.recordDaemonStarted(worker, 1_000);
    await service.recordRunStarted(worker, 1_100);
    await service.recordRunCompleted(worker, {
      startedAtMs: 1_100,
      completedAtMs: 1_150,
      durationMs: 50,
      lockProvider: 'local',
      report: createReport(),
    });
    await service.recordRunStarted(worker, 1_200);
    await service.recordRunSkipped(worker, {
      startedAtMs: 1_200,
      completedAtMs: 1_210,
      durationMs: 10,
      lockProvider: 'local',
    });
    await service.recordRunStarted(worker, 1_300);
    await service.recordRunFailed(worker, {
      startedAtMs: 1_300,
      completedAtMs: 1_360,
      durationMs: 60,
      lockProvider: 'local',
      errorMessage: 'RPC timed out',
    });

    const status = await service.getStatus();
    const raw = await readFile(
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_STATUS_FILE!,
      'utf8',
    );

    expect(status).toMatchObject({
      worker: {
        workerId: worker.workerId,
        state: 'idle',
      },
      heartbeat: {
        lastRunOutcome: 'failed',
        consecutiveFailures: 1,
        consecutiveSkips: 0,
        lastErrorMessage: 'RPC timed out',
      },
      lastRun: {
        outcome: 'failed',
      },
    });
    expect(status?.recentRuns.map((run) => run.outcome)).toEqual([
      'failed',
      'skipped',
    ]);
    expect(JSON.parse(raw)).toMatchObject({
      worker: {
        workerId: worker.workerId,
      },
    });
  });

  it('reads daemon status from Postgres when postgres persistence is enabled', async () => {
    process.env.PERSISTENCE_DRIVER = 'postgres';
    process.env.DATABASE_URL =
      'postgresql://escrow:escrow@localhost:5432/escrow';

    const snapshot = {
      updatedAt: '2026-04-08T00:00:00.000Z',
      worker: {
        workerId: 'worker-1',
        hostname: 'host-1',
        pid: 1234,
        state: 'idle',
        intervalMs: 1000,
        runOnStart: true,
        overrideLimit: null,
        overridePersist: null,
        startedAt: '2026-04-08T00:00:00.000Z',
        stoppedAt: null,
      },
      heartbeat: {
        lastHeartbeatAt: '2026-04-08T00:00:00.000Z',
        lastRunStartedAt: null,
        lastRunCompletedAt: null,
        lastRunOutcome: null,
        consecutiveFailures: 0,
        consecutiveSkips: 0,
        lastErrorMessage: null,
      },
      currentRun: null,
      lastRun: null,
      recentRuns: [],
    };
    const postgresDatabase = {
      query: jest.fn().mockResolvedValue({
        rows: [{ snapshotJson: snapshot }],
      }),
    } as unknown as PostgresDatabaseService;

    const service = new EscrowChainSyncDaemonStatusService(
      new PersistenceConfigService(),
      postgresDatabase,
      new OperationsConfigService(),
    );

    await expect(service.getStatus()).resolves.toEqual(snapshot);
  });
});

function createWorker() {
  return {
    workerId: 'worker-1',
    hostname: 'local-test',
    pid: 1234,
    intervalMs: 1_000,
    runOnStart: true,
    overrideLimit: null,
    overridePersist: null,
  };
}

function createReport() {
  return {
    startedAt: '2026-04-08T00:00:00.000Z',
    completedAt: '2026-04-08T00:00:01.000Z',
    mode: 'preview' as const,
    filters: {
      scope: 'all' as const,
      reason: null,
      limit: 25,
    },
    selection: {
      totalJobs: 0,
      matchedJobs: 0,
      selectedJobs: 0,
    },
    summary: {
      processedJobs: 0,
      cleanJobs: 0,
      changedJobs: 0,
      persistedJobs: 0,
      blockedJobs: 0,
      failedJobs: 0,
      criticalIssueJobs: 0,
    },
    jobs: [],
  };
}
