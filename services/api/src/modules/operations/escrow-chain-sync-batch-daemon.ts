import type { EscrowChainSyncBatchReport } from './escrow-health.types';
import type { EscrowChainSyncDaemonWorkerIdentity } from './escrow-chain-sync-daemon-status.service';
import type { EscrowChainSyncRunPermit } from './escrow-chain-sync-run-lock.service';

type TimeoutHandle = ReturnType<typeof setTimeout>;

type EscrowChainSyncBatchDaemonLog =
  | {
      type: 'chain_sync_batch_daemon_started';
      at: string;
      intervalMs: number;
      runOnStart: boolean;
      overrideLimit: number | null;
      overridePersist: boolean | null;
    }
  | {
      type: 'chain_sync_batch_daemon_tick_completed';
      at: string;
      durationMs: number;
      lockProvider: EscrowChainSyncRunPermit['provider'];
      mode: EscrowChainSyncBatchReport['mode'];
      filters: EscrowChainSyncBatchReport['filters'];
      selection: EscrowChainSyncBatchReport['selection'];
      summary: EscrowChainSyncBatchReport['summary'];
    }
  | {
      type: 'chain_sync_batch_daemon_tick_skipped';
      at: string;
      durationMs: number;
      lockProvider: EscrowChainSyncRunPermit['provider'];
      reason: 'lock_unavailable';
    }
  | {
      type: 'chain_sync_batch_daemon_tick_failed';
      at: string;
      durationMs: number;
      lockProvider: EscrowChainSyncRunPermit['provider'] | null;
      message: string;
    }
  | {
      type: 'chain_sync_batch_daemon_stopped';
      at: string;
    };

type EscrowChainSyncBatchDaemonOptions = {
  worker: EscrowChainSyncDaemonWorkerIdentity;
  intervalMs: number;
  runOnStart: boolean;
  runBatchBackfill: () => Promise<EscrowChainSyncBatchReport>;
  acquireRunPermit?: () => Promise<EscrowChainSyncRunPermit>;
  onStarted?: (input: { atMs: number }) => Promise<unknown>;
  onRunStarted?: (input: { startedAtMs: number }) => Promise<unknown>;
  onRunCompleted?: (input: {
    startedAtMs: number;
    completedAtMs: number;
    durationMs: number;
    lockProvider: EscrowChainSyncRunPermit['provider'];
    report: EscrowChainSyncBatchReport;
  }) => Promise<unknown>;
  onRunSkipped?: (input: {
    startedAtMs: number;
    completedAtMs: number;
    durationMs: number;
    lockProvider: EscrowChainSyncRunPermit['provider'];
    reason: 'lock_unavailable';
  }) => Promise<unknown>;
  onRunFailed?: (input: {
    startedAtMs: number;
    completedAtMs: number;
    durationMs: number;
    lockProvider: EscrowChainSyncRunPermit['provider'] | null;
    message: string;
  }) => Promise<unknown>;
  onStopped?: (input: { atMs: number }) => Promise<unknown>;
  log: (entry: EscrowChainSyncBatchDaemonLog) => void;
  overrideLimit: number | null;
  overridePersist: boolean | null;
  schedule?: (callback: () => void, delayMs: number) => TimeoutHandle;
  clearScheduled?: (handle: TimeoutHandle) => void;
  now?: () => number;
};

export class EscrowChainSyncBatchDaemon {
  private readonly schedule: (
    callback: () => void,
    delayMs: number,
  ) => TimeoutHandle;
  private readonly clearScheduled: (handle: TimeoutHandle) => void;
  private readonly now: () => number;
  private timer: TimeoutHandle | null = null;
  private running: Promise<void> | null = null;
  private started = false;
  private stopping = false;

  constructor(private readonly options: EscrowChainSyncBatchDaemonOptions) {
    this.schedule = options.schedule ?? setTimeout;
    this.clearScheduled = options.clearScheduled ?? clearTimeout;
    this.now = options.now ?? Date.now;
  }

  async start() {
    if (this.started) {
      return;
    }

    this.started = true;
    const startedAtMs = this.now();
    await this.options.onStarted?.({ atMs: startedAtMs });
    this.options.log({
      type: 'chain_sync_batch_daemon_started',
      at: new Date(startedAtMs).toISOString(),
      intervalMs: this.options.intervalMs,
      runOnStart: this.options.runOnStart,
      overrideLimit: this.options.overrideLimit,
      overridePersist: this.options.overridePersist,
    });

    if (this.options.runOnStart) {
      this.triggerRun();
      return;
    }

    this.scheduleNextTick();
  }

  async stop() {
    if (this.stopping) {
      await this.running;
      return;
    }

    this.stopping = true;
    if (this.timer) {
      this.clearScheduled(this.timer);
      this.timer = null;
    }

    await this.running;

    if (this.started) {
      const stoppedAtMs = this.now();
      await this.options.onStopped?.({ atMs: stoppedAtMs });
      this.options.log({
        type: 'chain_sync_batch_daemon_stopped',
        at: new Date(stoppedAtMs).toISOString(),
      });
    }
  }

  private scheduleNextTick() {
    if (this.stopping) {
      return;
    }

    this.timer = this.schedule(() => {
      this.timer = null;
      this.triggerRun();
    }, this.options.intervalMs);
  }

  private triggerRun() {
    if (this.stopping || this.running) {
      return;
    }

    this.running = this.executeRun().finally(() => {
      this.running = null;
      this.scheduleNextTick();
    });
  }

  private async executeRun() {
    const startedAt = this.now();
    let permit: EscrowChainSyncRunPermit | null = null;

    try {
      await this.options.onRunStarted?.({ startedAtMs: startedAt });
      permit = this.options.acquireRunPermit
        ? await this.options.acquireRunPermit()
        : {
            acquired: true,
            provider: 'local',
            release: () => Promise.resolve(),
          };

      const permitCheckedAtMs = this.now();
      if (!permit.acquired) {
        await this.options.onRunSkipped?.({
          startedAtMs: startedAt,
          completedAtMs: permitCheckedAtMs,
          durationMs: permitCheckedAtMs - startedAt,
          lockProvider: permit.provider,
          reason: permit.reason,
        });
        this.options.log({
          type: 'chain_sync_batch_daemon_tick_skipped',
          at: new Date(permitCheckedAtMs).toISOString(),
          durationMs: permitCheckedAtMs - startedAt,
          lockProvider: permit.provider,
          reason: permit.reason,
        });
        return;
      }

      const report = await this.options.runBatchBackfill();
      const completedAtMs = this.now();
      await this.options.onRunCompleted?.({
        startedAtMs: startedAt,
        completedAtMs,
        durationMs: completedAtMs - startedAt,
        lockProvider: permit.provider,
        report,
      });
      this.options.log({
        type: 'chain_sync_batch_daemon_tick_completed',
        at: new Date(completedAtMs).toISOString(),
        durationMs: completedAtMs - startedAt,
        lockProvider: permit.provider,
        mode: report.mode,
        filters: report.filters,
        selection: report.selection,
        summary: report.summary,
      });
    } catch (error) {
      const completedAtMs = this.now();
      const message =
        error instanceof Error
          ? error.message
          : 'Escrow chain sync batch daemon run failed';
      await this.options.onRunFailed?.({
        startedAtMs: startedAt,
        completedAtMs,
        durationMs: completedAtMs - startedAt,
        lockProvider: permit?.provider ?? null,
        message,
      });
      this.options.log({
        type: 'chain_sync_batch_daemon_tick_failed',
        at: new Date(completedAtMs).toISOString(),
        durationMs: completedAtMs - startedAt,
        lockProvider: permit?.provider ?? null,
        message,
      });
    } finally {
      if (permit?.acquired) {
        await permit.release();
      }
    }
  }
}
