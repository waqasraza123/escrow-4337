import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { Injectable } from '@nestjs/common';
import { dirname } from 'path';
import { PersistenceConfigService } from '../../persistence/persistence.config';
import { PostgresDatabaseService } from '../../persistence/postgres/postgres-database.service';
import type {
  EscrowChainSyncBatchReport,
  EscrowChainSyncDaemonLockProvider,
  EscrowChainSyncDaemonStatus,
  EscrowChainSyncDaemonStatusRun,
  EscrowChainSyncDaemonWorkerState,
} from './escrow-health.types';
import { OperationsConfigService } from './operations.config';

const daemonStatusStateKey = 'escrow_chain_sync_daemon_status';

export type EscrowChainSyncDaemonWorkerIdentity = {
  workerId: string;
  hostname: string;
  pid: number;
  intervalMs: number;
  runOnStart: boolean;
  overrideLimit: number | null;
  overridePersist: boolean | null;
};

@Injectable()
export class EscrowChainSyncDaemonStatusService {
  constructor(
    private readonly persistenceConfig: PersistenceConfigService,
    private readonly postgresDatabase: PostgresDatabaseService,
    private readonly operationsConfig: OperationsConfigService,
  ) {}

  async getStatus(): Promise<EscrowChainSyncDaemonStatus | null> {
    if (this.persistenceConfig.driver === 'postgres') {
      const result = await this.postgresDatabase.query<{
        snapshotJson: EscrowChainSyncDaemonStatus;
      }>(
        'SELECT snapshot_json AS "snapshotJson" FROM operations_runtime_state WHERE state_key = $1',
        [daemonStatusStateKey],
      );

      return result.rows[0]?.snapshotJson ?? null;
    }

    return this.readFileStatus();
  }

  async recordDaemonStarted(
    worker: EscrowChainSyncDaemonWorkerIdentity,
    now = Date.now(),
  ) {
    return this.mutateStatus((current) => {
      const status = current ?? createInitialStatus(worker, now);
      const timestamp = new Date(now).toISOString();

      return {
        ...status,
        updatedAt: timestamp,
        worker: {
          ...status.worker,
          ...worker,
          state: 'idle',
          startedAt: timestamp,
          stoppedAt: null,
        },
        heartbeat: {
          ...status.heartbeat,
          lastHeartbeatAt: timestamp,
        },
        currentRun: null,
      };
    }, now);
  }

  async recordRunStarted(
    worker: EscrowChainSyncDaemonWorkerIdentity,
    startedAtMs: number,
  ) {
    return this.mutateStatus((current) => {
      const status = current ?? createInitialStatus(worker, startedAtMs);
      const timestamp = new Date(startedAtMs).toISOString();

      return {
        ...status,
        updatedAt: timestamp,
        worker: {
          ...status.worker,
          ...worker,
          state: 'running',
          stoppedAt: null,
        },
        heartbeat: {
          ...status.heartbeat,
          lastHeartbeatAt: timestamp,
          lastRunStartedAt: timestamp,
        },
        currentRun: {
          startedAt: timestamp,
          lockProvider: null,
        },
      };
    }, startedAtMs);
  }

  async recordRunCompleted(
    worker: EscrowChainSyncDaemonWorkerIdentity,
    input: {
      startedAtMs: number;
      completedAtMs: number;
      durationMs: number;
      lockProvider: EscrowChainSyncDaemonLockProvider;
      report: EscrowChainSyncBatchReport;
    },
  ) {
    return this.recordRunResult(
      worker,
      {
        startedAt: new Date(input.startedAtMs).toISOString(),
        completedAt: new Date(input.completedAtMs).toISOString(),
        durationMs: input.durationMs,
        outcome: 'completed',
        workerId: worker.workerId,
        lockProvider: input.lockProvider,
        mode: input.report.mode,
        filters: input.report.filters,
        selection: input.report.selection,
        summary: input.report.summary,
        errorMessage: null,
        skipReason: null,
      },
      input.completedAtMs,
    );
  }

  async recordRunSkipped(
    worker: EscrowChainSyncDaemonWorkerIdentity,
    input: {
      startedAtMs: number;
      completedAtMs: number;
      durationMs: number;
      lockProvider: EscrowChainSyncDaemonLockProvider;
    },
  ) {
    return this.recordRunResult(
      worker,
      {
        startedAt: new Date(input.startedAtMs).toISOString(),
        completedAt: new Date(input.completedAtMs).toISOString(),
        durationMs: input.durationMs,
        outcome: 'skipped',
        workerId: worker.workerId,
        lockProvider: input.lockProvider,
        mode: null,
        filters: null,
        selection: null,
        summary: null,
        errorMessage: null,
        skipReason: 'lock_unavailable',
      },
      input.completedAtMs,
    );
  }

  async recordRunFailed(
    worker: EscrowChainSyncDaemonWorkerIdentity,
    input: {
      startedAtMs: number;
      completedAtMs: number;
      durationMs: number;
      lockProvider: EscrowChainSyncDaemonLockProvider | null;
      errorMessage: string;
    },
  ) {
    return this.recordRunResult(
      worker,
      {
        startedAt: new Date(input.startedAtMs).toISOString(),
        completedAt: new Date(input.completedAtMs).toISOString(),
        durationMs: input.durationMs,
        outcome: 'failed',
        workerId: worker.workerId,
        lockProvider: input.lockProvider,
        mode: null,
        filters: null,
        selection: null,
        summary: null,
        errorMessage: input.errorMessage,
        skipReason: null,
      },
      input.completedAtMs,
    );
  }

  async recordDaemonStopped(
    worker: EscrowChainSyncDaemonWorkerIdentity,
    now = Date.now(),
  ) {
    return this.mutateStatus((current) => {
      const status = current ?? createInitialStatus(worker, now);
      const timestamp = new Date(now).toISOString();

      return {
        ...status,
        updatedAt: timestamp,
        worker: {
          ...status.worker,
          ...worker,
          state: 'stopped',
          stoppedAt: timestamp,
        },
        heartbeat: {
          ...status.heartbeat,
          lastHeartbeatAt: timestamp,
        },
        currentRun: null,
      };
    }, now);
  }

  private async recordRunResult(
    worker: EscrowChainSyncDaemonWorkerIdentity,
    run: EscrowChainSyncDaemonStatusRun,
    now: number,
  ) {
    return this.mutateStatus((current) => {
      const status = current ?? createInitialStatus(worker, now);
      const recentRuns = [run, ...status.recentRuns].slice(
        0,
        this.operationsConfig.escrowBatchSyncStatusRecentRunsLimit,
      );
      const consecutiveFailures =
        run.outcome === 'failed' ? status.heartbeat.consecutiveFailures + 1 : 0;
      const consecutiveSkips =
        run.outcome === 'skipped' ? status.heartbeat.consecutiveSkips + 1 : 0;

      return {
        ...status,
        updatedAt: run.completedAt,
        worker: {
          ...status.worker,
          ...worker,
          state: 'idle' as EscrowChainSyncDaemonWorkerState,
          stoppedAt: null,
        },
        heartbeat: {
          lastHeartbeatAt: run.completedAt,
          lastRunStartedAt: run.startedAt,
          lastRunCompletedAt: run.completedAt,
          lastRunOutcome: run.outcome,
          consecutiveFailures,
          consecutiveSkips,
          lastErrorMessage: run.errorMessage,
        },
        currentRun: null,
        lastRun: run,
        recentRuns,
      };
    }, now);
  }

  private async mutateStatus(
    mutator: (
      current: EscrowChainSyncDaemonStatus | null,
    ) => EscrowChainSyncDaemonStatus,
    now: number,
  ) {
    if (this.persistenceConfig.driver === 'postgres') {
      return this.postgresDatabase.transaction(async (client) => {
        await client.query(
          `INSERT INTO operations_runtime_state (state_key, snapshot_json, updated_at_ms)
           VALUES ($1, 'null'::jsonb, $2)
           ON CONFLICT (state_key) DO NOTHING`,
          [daemonStatusStateKey, now],
        );
        const existing = await client.query<{
          snapshotJson: EscrowChainSyncDaemonStatus | null;
        }>(
          `SELECT snapshot_json AS "snapshotJson"
           FROM operations_runtime_state
           WHERE state_key = $1
           FOR UPDATE`,
          [daemonStatusStateKey],
        );
        const next = mutator(existing.rows[0]?.snapshotJson ?? null);
        await client.query(
          `UPDATE operations_runtime_state
           SET snapshot_json = $2::jsonb, updated_at_ms = $3
           WHERE state_key = $1`,
          [daemonStatusStateKey, JSON.stringify(next), now],
        );
        return next;
      });
    }

    const current = await this.readFileStatus();
    const next = mutator(current);
    await this.writeFileStatus(next);
    return next;
  }

  private async readFileStatus() {
    try {
      const raw = await readFile(
        this.operationsConfig.escrowBatchSyncStatusFilePath,
        'utf8',
      );
      return JSON.parse(raw) as EscrowChainSyncDaemonStatus;
    } catch {
      return null;
    }
  }

  private async writeFileStatus(status: EscrowChainSyncDaemonStatus) {
    const filePath = this.operationsConfig.escrowBatchSyncStatusFilePath;
    const tempPath = `${filePath}.tmp`;
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(tempPath, `${JSON.stringify(status, null, 2)}\n`, 'utf8');
    await rename(tempPath, filePath);
  }
}

function createInitialStatus(
  worker: EscrowChainSyncDaemonWorkerIdentity,
  now: number,
): EscrowChainSyncDaemonStatus {
  const timestamp = new Date(now).toISOString();

  return {
    updatedAt: timestamp,
    worker: {
      workerId: worker.workerId,
      hostname: worker.hostname,
      pid: worker.pid,
      state: 'idle',
      intervalMs: worker.intervalMs,
      runOnStart: worker.runOnStart,
      overrideLimit: worker.overrideLimit,
      overridePersist: worker.overridePersist,
      startedAt: timestamp,
      stoppedAt: null,
    },
    heartbeat: {
      lastHeartbeatAt: timestamp,
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
}
