import { EscrowChainSyncBatchDaemon } from '../src/modules/operations/escrow-chain-sync-batch-daemon';
import type { EscrowChainSyncBatchReport } from '../src/modules/operations/escrow-health.types';

describe('EscrowChainSyncBatchDaemon', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs immediately when configured and never overlaps in-flight work', async () => {
    const resolveRuns: Array<(report: EscrowChainSyncBatchReport) => void> = [];
    const runBatchBackfill = jest.fn(
      () =>
        new Promise<EscrowChainSyncBatchReport>((resolve) => {
          resolveRuns.push(resolve);
        }),
    );

    const daemon = new EscrowChainSyncBatchDaemon({
      worker: createWorker(),
      intervalMs: 1_000,
      runOnStart: true,
      runBatchBackfill,
      log: jest.fn(),
      overrideLimit: null,
      overridePersist: null,
    });

    await daemon.start();
    expect(runBatchBackfill).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(5_000);
    expect(runBatchBackfill).toHaveBeenCalledTimes(1);

    const firstResolve = resolveRuns.shift();
    if (!firstResolve) {
      throw new Error('Expected first daemon run resolver');
    }
    firstResolve(createReport());
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(999);
    expect(runBatchBackfill).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(runBatchBackfill).toHaveBeenCalledTimes(2);

    const secondResolve = resolveRuns.shift();
    if (!secondResolve) {
      throw new Error('Expected second daemon run resolver');
    }
    secondResolve(createReport());
    await Promise.resolve();

    await daemon.stop();
  });

  it('waits for the first interval when configured and stops future ticks', async () => {
    const runBatchBackfill = jest.fn().mockResolvedValue(createReport());

    const daemon = new EscrowChainSyncBatchDaemon({
      worker: createWorker(),
      intervalMs: 1_000,
      runOnStart: false,
      runBatchBackfill,
      log: jest.fn(),
      overrideLimit: 10,
      overridePersist: true,
    });

    await daemon.start();
    expect(runBatchBackfill).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(999);
    expect(runBatchBackfill).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(runBatchBackfill).toHaveBeenCalledTimes(1);

    await daemon.stop();
    await jest.advanceTimersByTimeAsync(5_000);
    expect(runBatchBackfill).toHaveBeenCalledTimes(1);
  });

  it('skips a tick when a distributed run lock is unavailable', async () => {
    const log = jest.fn();
    const runBatchBackfill = jest.fn().mockResolvedValue(createReport());

    const daemon = new EscrowChainSyncBatchDaemon({
      worker: createWorker(),
      intervalMs: 1_000,
      runOnStart: true,
      acquireRunPermit: async () => ({
        acquired: false,
        provider: 'postgres_advisory',
        reason: 'lock_unavailable',
      }),
      runBatchBackfill,
      log,
      overrideLimit: null,
      overridePersist: null,
    });

    await daemon.start();
    await Promise.resolve();
    await Promise.resolve();

    expect(runBatchBackfill).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'chain_sync_batch_daemon_tick_skipped',
        lockProvider: 'postgres_advisory',
        reason: 'lock_unavailable',
      }),
    );

    await daemon.stop();
  });
});

function createReport(): EscrowChainSyncBatchReport {
  return {
    startedAt: '2026-04-08T00:00:00.000Z',
    completedAt: '2026-04-08T00:00:01.000Z',
    mode: 'preview',
    filters: {
      scope: 'all',
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
