import { Injectable } from '@nestjs/common';
import type {
  EscrowChainSyncDaemonHealthIssue,
  EscrowChainSyncDaemonHealthReport,
  EscrowChainSyncDaemonStatus,
} from './escrow-health.types';
import { EscrowChainSyncDaemonStatusService } from './escrow-chain-sync-daemon-status.service';
import { OperationsConfigService } from './operations.config';

@Injectable()
export class EscrowChainSyncDaemonMonitoringService {
  constructor(
    private readonly daemonStatusService: EscrowChainSyncDaemonStatusService,
    private readonly operationsConfig: OperationsConfigService,
  ) {}

  async getReport(now = Date.now()): Promise<EscrowChainSyncDaemonHealthReport> {
    const daemon = await this.daemonStatusService.getStatus();
    const issues = daemon ? this.evaluateDaemon(daemon, now) : this.missingDaemon();
    const status = highestStatus(issues);

    return {
      generatedAt: new Date(now).toISOString(),
      ok: status === 'ok',
      status,
      required: this.operationsConfig.escrowBatchSyncDaemonRequired,
      summary: buildSummary(status, daemon, issues),
      thresholds: {
        maxHeartbeatAgeMs: this.operationsConfig.escrowBatchSyncDaemonMaxHeartbeatAgeMs,
        maxCurrentRunAgeMs:
          this.operationsConfig.escrowBatchSyncDaemonMaxCurrentRunAgeMs,
        maxConsecutiveFailures:
          this.operationsConfig.escrowBatchSyncDaemonMaxConsecutiveFailures,
        maxConsecutiveSkips:
          this.operationsConfig.escrowBatchSyncDaemonMaxConsecutiveSkips,
      },
      issues,
      daemon,
    };
  }

  private missingDaemon(): EscrowChainSyncDaemonHealthIssue[] {
    return [
      {
        code: 'daemon_missing',
        severity: this.operationsConfig.escrowBatchSyncDaemonRequired
          ? 'critical'
          : 'warning',
        summary: 'No recurring chain-sync daemon status has been published.',
        detail: this.operationsConfig.escrowBatchSyncDaemonRequired
          ? 'A daemon status snapshot is required for this environment, but none has been recorded yet.'
          : 'No daemon snapshot is available yet. This may be expected if the recurring worker has not been started.',
      },
    ];
  }

  private evaluateDaemon(
    daemon: EscrowChainSyncDaemonStatus,
    now: number,
  ): EscrowChainSyncDaemonHealthIssue[] {
    const issues: EscrowChainSyncDaemonHealthIssue[] = [];
    const lastHeartbeatAgeMs =
      now - Date.parse(daemon.heartbeat.lastHeartbeatAt);

    if (
      daemon.worker.state === 'stopped' &&
      this.operationsConfig.escrowBatchSyncDaemonRequired
    ) {
      issues.push({
        code: 'worker_stopped',
        severity: 'critical',
        summary: 'The recurring chain-sync daemon is stopped.',
        detail: `The latest worker ${daemon.worker.workerId} reported a stopped state at ${daemon.worker.stoppedAt}.`,
      });
    }

    if (
      lastHeartbeatAgeMs >
      this.operationsConfig.escrowBatchSyncDaemonMaxHeartbeatAgeMs
    ) {
      issues.push({
        code: 'heartbeat_stale',
        severity: 'critical',
        summary: 'The recurring chain-sync daemon heartbeat is stale.',
        detail: `The last daemon heartbeat is ${lastHeartbeatAgeMs}ms old, which exceeds the configured max of ${this.operationsConfig.escrowBatchSyncDaemonMaxHeartbeatAgeMs}ms.`,
      });
    }

    if (daemon.currentRun) {
      const currentRunAgeMs = now - Date.parse(daemon.currentRun.startedAt);
      if (
        currentRunAgeMs >
        this.operationsConfig.escrowBatchSyncDaemonMaxCurrentRunAgeMs
      ) {
        issues.push({
          code: 'run_stalled',
          severity: 'critical',
          summary: 'The recurring chain-sync daemon appears stalled in an active run.',
          detail: `The current run started at ${daemon.currentRun.startedAt} and has been active for ${currentRunAgeMs}ms, which exceeds the configured max of ${this.operationsConfig.escrowBatchSyncDaemonMaxCurrentRunAgeMs}ms.`,
        });
      }
    }

    if (
      daemon.heartbeat.consecutiveFailures >=
      this.operationsConfig.escrowBatchSyncDaemonMaxConsecutiveFailures
    ) {
      issues.push({
        code: 'consecutive_failures',
        severity: 'critical',
        summary: 'The recurring chain-sync daemon has exceeded the consecutive failure threshold.',
        detail: `The daemon recorded ${daemon.heartbeat.consecutiveFailures} consecutive failures, exceeding the configured max of ${this.operationsConfig.escrowBatchSyncDaemonMaxConsecutiveFailures}.`,
      });
    } else if (daemon.heartbeat.lastRunOutcome === 'failed') {
      issues.push({
        code: 'last_run_failed',
        severity: 'warning',
        summary: 'The latest recurring chain-sync daemon run failed.',
        detail: daemon.heartbeat.lastErrorMessage,
      });
    }

    if (
      daemon.heartbeat.consecutiveSkips >=
      this.operationsConfig.escrowBatchSyncDaemonMaxConsecutiveSkips
    ) {
      issues.push({
        code: 'consecutive_skips',
        severity: 'warning',
        summary: 'The recurring chain-sync daemon has exceeded the consecutive skip threshold.',
        detail: `The daemon recorded ${daemon.heartbeat.consecutiveSkips} consecutive skipped runs, exceeding the configured max of ${this.operationsConfig.escrowBatchSyncDaemonMaxConsecutiveSkips}.`,
      });
    }

    return issues;
  }
}

function highestStatus(issues: EscrowChainSyncDaemonHealthIssue[]) {
  if (issues.some((issue) => issue.severity === 'critical')) {
    return 'failed' as const;
  }
  if (issues.length > 0) {
    return 'warning' as const;
  }
  return 'ok' as const;
}

function buildSummary(
  status: EscrowChainSyncDaemonHealthReport['status'],
  daemon: EscrowChainSyncDaemonStatus | null,
  issues: EscrowChainSyncDaemonHealthIssue[],
) {
  if (status === 'ok' && daemon) {
    return `Recurring chain-sync daemon is healthy on worker ${daemon.worker.workerId}.`;
  }

  if (issues.length === 0) {
    return 'Recurring chain-sync daemon status is unavailable.';
  }

  return issues[0]?.summary ?? 'Recurring chain-sync daemon requires attention.';
}
