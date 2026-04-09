import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { EscrowChainSyncDaemonAlertingService } from '../src/modules/operations/escrow-chain-sync-daemon-alerting.service';
import { EscrowChainSyncDaemonAlertStateService } from '../src/modules/operations/escrow-chain-sync-daemon-alert-state.service';
import { EscrowChainSyncDaemonMonitoringService } from '../src/modules/operations/escrow-chain-sync-daemon-monitoring.service';
import type { EscrowChainSyncDaemonHealthReport } from '../src/modules/operations/escrow-health.types';
import { OperationsConfigService } from '../src/modules/operations/operations.config';
import { PersistenceConfigService } from '../src/persistence/persistence.config';
import { PostgresDatabaseService } from '../src/persistence/postgres/postgres-database.service';

describe('EscrowChainSyncDaemonAlertingService', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  let tempDir: string | null = null;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env.PERSISTENCE_DRIVER = 'file';
    tempDir = await mkdtemp(join(tmpdir(), 'escrow4337-daemon-alerts-'));
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_ALERT_STATE_FILE = join(
      tempDir,
      'daemon-alert-state.json',
    );
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_URL =
      'https://alerts.example.com/daemon';
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_MIN_SEVERITY =
      'warning';
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_RESEND_INTERVAL_SEC =
      '3600';
    global.fetch = jest.fn();
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('sends an alert webhook once and suppresses duplicate alerts inside the resend interval', async () => {
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockResolvedValue(new Response('', { status: 202 }));

    const monitoring = createMonitoringService([
      createWarningReport(),
      createWarningReport(),
    ]);
    const service = createService(monitoring);

    const first = await service.dispatchAlert(
      {},
      Date.parse('2026-04-09T00:00:00.000Z'),
    );
    const second = await service.dispatchAlert(
      {},
      Date.parse('2026-04-09T00:05:00.000Z'),
    );

    expect(first.notification).toMatchObject({
      configured: true,
      sent: true,
      event: 'alert',
      reason: 'alert_sent',
      webhookResponseStatus: 202,
    });
    expect(second.notification).toMatchObject({
      configured: true,
      attempted: false,
      sent: false,
      event: null,
      reason: 'duplicate_within_resend_window',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends a recovery webhook after an active alert clears', async () => {
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));

    const monitoring = createMonitoringService([
      createFailedReport(),
      createOkReport(),
    ]);
    const service = createService(monitoring);

    const first = await service.dispatchAlert(
      {},
      Date.parse('2026-04-09T00:00:00.000Z'),
    );
    const second = await service.dispatchAlert(
      {},
      Date.parse('2026-04-09T00:10:00.000Z'),
    );

    expect(first.notification.event).toBe('alert');
    expect(second.notification).toMatchObject({
      sent: true,
      event: 'recovery',
      reason: 'recovery_delivered',
      webhookResponseStatus: 200,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('supports dry-run alert evaluation without sending or mutating alert state', async () => {
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));

    const monitoring = createMonitoringService([createFailedReport()]);
    const service = createService(monitoring);

    const result = await service.dispatchAlert(
      { dryRun: true },
      Date.parse('2026-04-09T00:00:00.000Z'),
    );

    expect(result.notification).toMatchObject({
      configured: true,
      attempted: true,
      sent: false,
      dryRun: true,
      event: 'alert',
      reason: 'alert_changed',
    });
    expect(fetchMock).not.toHaveBeenCalled();

    const stateService = createAlertStateService();
    await expect(stateService.getState()).resolves.toBeNull();
  });

  it('sends recovery when the report drops below the configured alert threshold', async () => {
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_MIN_SEVERITY =
      'critical';
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));

    const monitoring = createMonitoringService([
      createFailedReport(),
      createWarningReport(),
    ]);
    const service = createService(monitoring);

    const first = await service.dispatchAlert(
      {},
      Date.parse('2026-04-09T00:00:00.000Z'),
    );
    const second = await service.dispatchAlert(
      {},
      Date.parse('2026-04-09T00:10:00.000Z'),
    );

    expect(first.notification.event).toBe('alert');
    expect(second.notification).toMatchObject({
      event: 'recovery',
      sent: true,
      reason: 'recovery_delivered',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  function createService(
    monitoringService: EscrowChainSyncDaemonMonitoringService,
  ) {
    return new EscrowChainSyncDaemonAlertingService(
      monitoringService,
      createAlertStateService(),
      new OperationsConfigService(),
    );
  }

  function createAlertStateService() {
    return new EscrowChainSyncDaemonAlertStateService(
      new PersistenceConfigService(),
      {} as PostgresDatabaseService,
      new OperationsConfigService(),
    );
  }

  function createMonitoringService(
    reports: EscrowChainSyncDaemonHealthReport[],
  ) {
    return {
      getReport: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(reports.shift() ?? createOkReport()),
        ),
    } as unknown as EscrowChainSyncDaemonMonitoringService;
  }
});

function createOkReport(): EscrowChainSyncDaemonHealthReport {
  return {
    generatedAt: '2026-04-09T00:00:00.000Z',
    ok: true,
    status: 'ok' as const,
    required: true,
    summary: 'Recurring chain-sync daemon is healthy on worker worker-1.',
    thresholds: {
      maxHeartbeatAgeMs: 900_000,
      maxCurrentRunAgeMs: 1_800_000,
      maxConsecutiveFailures: 3,
      maxConsecutiveSkips: 6,
    },
    issues: [],
    daemon: {
      updatedAt: '2026-04-09T00:00:00.000Z',
      worker: {
        workerId: 'worker-1',
        hostname: 'api-1',
        pid: 1234,
        state: 'idle' as const,
        intervalMs: 300_000,
        runOnStart: true,
        overrideLimit: null,
        overridePersist: null,
        startedAt: '2026-04-09T00:00:00.000Z',
        stoppedAt: null,
      },
      heartbeat: {
        lastHeartbeatAt: '2026-04-09T00:00:00.000Z',
        lastRunStartedAt: '2026-04-09T00:00:00.000Z',
        lastRunCompletedAt: '2026-04-09T00:00:01.000Z',
        lastRunOutcome: 'completed' as const,
        consecutiveFailures: 0,
        consecutiveSkips: 0,
        lastErrorMessage: null,
      },
      currentRun: null,
      lastRun: null,
      recentRuns: [],
    },
  };
}

function createWarningReport(): EscrowChainSyncDaemonHealthReport {
  const base = createOkReport();
  return {
    ...base,
    ok: false,
    status: 'warning' as const,
    summary: 'The latest recurring chain-sync daemon run failed.',
    issues: [
      {
        code: 'last_run_failed' as const,
        severity: 'warning' as const,
        summary: 'The latest recurring chain-sync daemon run failed.',
        detail: 'RPC timed out',
      },
    ],
    daemon: {
      ...base.daemon!,
      heartbeat: {
        ...base.daemon!.heartbeat,
        lastRunOutcome: 'failed' as const,
        lastErrorMessage: 'RPC timed out',
      },
    },
  };
}

function createFailedReport(): EscrowChainSyncDaemonHealthReport {
  const base = createOkReport();
  return {
    ...base,
    ok: false,
    status: 'failed' as const,
    summary:
      'The recurring chain-sync daemon has exceeded the consecutive failure threshold.',
    issues: [
      {
        code: 'consecutive_failures' as const,
        severity: 'critical' as const,
        summary:
          'The recurring chain-sync daemon has exceeded the consecutive failure threshold.',
        detail: 'The daemon recorded 4 consecutive failures.',
      },
    ],
    daemon: {
      ...base.daemon!,
      heartbeat: {
        ...base.daemon!.heartbeat,
        lastRunOutcome: 'failed' as const,
        consecutiveFailures: 4,
        lastErrorMessage: 'Bundler returned 500',
      },
    },
  };
}
