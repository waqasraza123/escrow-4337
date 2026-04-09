import { Injectable } from '@nestjs/common';
import { PersistenceConfigService } from '../../persistence/persistence.config';
import type { ChainSyncDaemonRuntimePosture } from './runtime-profile.types';
import { OperationsConfigService } from './operations.config';

@Injectable()
export class EscrowChainSyncDaemonDeploymentService {
  constructor(
    private readonly operationsConfig: OperationsConfigService,
    private readonly persistenceConfig: PersistenceConfigService,
  ) {}

  getPosture(): ChainSyncDaemonRuntimePosture {
    const required = this.operationsConfig.escrowBatchSyncDaemonRequired;
    const rpcConfigured = this.operationsConfig.escrowSyncRpcUrl !== null;
    const alertingConfigured =
      this.operationsConfig.escrowBatchSyncDaemonAlertWebhookUrl !== null;
    const persistDefault = this.operationsConfig.escrowBatchSyncPersist;
    const intervalSeconds =
      this.operationsConfig.escrowBatchSyncScheduleIntervalSeconds;
    const maxHeartbeatAgeSeconds =
      this.operationsConfig.escrowBatchSyncDaemonMaxHeartbeatAgeSeconds;
    const maxCurrentRunAgeSeconds =
      this.operationsConfig.escrowBatchSyncDaemonMaxCurrentRunAgeSeconds;

    const issues: string[] = [];
    const warnings: string[] = [];

    if (required && !rpcConfigured) {
      issues.push(
        'Recurring chain sync is required, but OPERATIONS_ESCROW_RPC_URL or ESCROW_CHAIN_RPC_URL is not set.',
      );
    }

    if (required && !alertingConfigured) {
      issues.push(
        'Recurring chain sync is required, but OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_URL is not set.',
      );
    }

    if (required && intervalSeconds >= maxHeartbeatAgeSeconds) {
      issues.push(
        'OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_MAX_HEARTBEAT_AGE_SEC must exceed OPERATIONS_ESCROW_BATCH_SYNC_SCHEDULE_INTERVAL_SEC so an idle daemon does not appear stale between scheduled ticks.',
      );
    }

    if (required && !persistDefault) {
      warnings.push(
        'OPERATIONS_ESCROW_BATCH_SYNC_PERSIST=false leaves the recurring daemon in preview mode, so it will not repair persisted audit state.',
      );
    }

    if (maxCurrentRunAgeSeconds <= intervalSeconds) {
      warnings.push(
        'OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_MAX_CURRENT_RUN_AGE_SEC is less than or equal to the schedule interval, so long-running syncs may appear stalled before the next cadence completes.',
      );
    }

    return {
      status:
        issues.length > 0 ? 'failed' : warnings.length > 0 ? 'warning' : 'ok',
      summary: buildSummary(required, issues, warnings),
      required,
      rpcConfigured,
      persistDefault,
      intervalSeconds,
      runOnStart: this.operationsConfig.escrowBatchSyncScheduleRunOnStart,
      lockProvider:
        this.persistenceConfig.driver === 'postgres'
          ? 'postgres_advisory'
          : 'local',
      alertingConfigured,
      alertMinSeverity:
        this.operationsConfig.escrowBatchSyncDaemonAlertMinSeverity,
      alertSendRecovery:
        this.operationsConfig.escrowBatchSyncDaemonAlertSendRecovery,
      alertResendIntervalSeconds:
        this.operationsConfig.escrowBatchSyncDaemonAlertResendIntervalSeconds,
      thresholds: {
        maxHeartbeatAgeSeconds,
        maxCurrentRunAgeSeconds,
        maxConsecutiveFailures:
          this.operationsConfig.escrowBatchSyncDaemonMaxConsecutiveFailures,
        maxConsecutiveSkips:
          this.operationsConfig.escrowBatchSyncDaemonMaxConsecutiveSkips,
      },
      issues,
      warnings,
    };
  }
}

function buildSummary(required: boolean, issues: string[], warnings: string[]) {
  if (issues.length > 0) {
    return 'Recurring chain-sync daemon deployment posture is misconfigured.';
  }

  if (warnings.length > 0) {
    return 'Recurring chain-sync daemon deployment posture needs operator review.';
  }

  return required
    ? 'Recurring chain-sync daemon deployment posture is configured for a deployment-owned worker.'
    : 'Recurring chain-sync daemon is optional in this environment.';
}
