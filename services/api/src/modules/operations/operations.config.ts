import { Injectable } from '@nestjs/common';
import { tmpdir } from 'os';
import { join } from 'path';
import { readPositiveInteger } from '../../common/config/readers';

@Injectable()
export class OperationsConfigService {
  get escrowBatchSyncAlertStateFilePath() {
    return (
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_ALERT_STATE_FILE?.trim() ||
      join(tmpdir(), 'escrow4337-chain-sync-daemon-alert-state.json')
    );
  }

  get escrowBatchSyncDaemonAlertWebhookUrl() {
    return process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_URL?.trim()
      ? process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_URL!.trim()
      : null;
  }

  get escrowBatchSyncDaemonAlertWebhookBearerToken() {
    return process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_BEARER_TOKEN?.trim()
      ? process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_BEARER_TOKEN!.trim()
      : null;
  }

  get escrowBatchSyncDaemonAlertWebhookTimeoutMs() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_TIMEOUT_MS,
      5_000,
    );
  }

  get escrowBatchSyncDaemonAlertMinSeverity() {
    const raw =
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_MIN_SEVERITY
        ?.trim()
        .toLowerCase() ?? 'critical';

    return raw === 'warning' ? 'warning' : 'critical';
  }

  get escrowBatchSyncDaemonAlertResendIntervalSeconds() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_RESEND_INTERVAL_SEC,
      3_600,
    );
  }

  get escrowBatchSyncDaemonAlertResendIntervalMs() {
    return this.escrowBatchSyncDaemonAlertResendIntervalSeconds * 1000;
  }

  get escrowBatchSyncDaemonAlertSendRecovery() {
    const raw =
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_SEND_RECOVERY
        ?.trim()
        .toLowerCase() ?? 'true';
    return raw !== '0' && raw !== 'false' && raw !== 'no';
  }

  get escrowBatchSyncStatusFilePath() {
    return (
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_STATUS_FILE?.trim() ||
      join(tmpdir(), 'escrow4337-chain-sync-daemon-status.json')
    );
  }

  get escrowBatchSyncStatusRecentRunsLimit() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_STATUS_RECENT_RUNS_LIMIT,
      10,
    );
  }

  get escrowBatchSyncDaemonRequired() {
    const raw = process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_REQUIRED
      ?.trim()
      .toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes';
  }

  get escrowBatchSyncDaemonMaxHeartbeatAgeSeconds() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_MAX_HEARTBEAT_AGE_SEC,
      900,
    );
  }

  get escrowBatchSyncDaemonMaxHeartbeatAgeMs() {
    return this.escrowBatchSyncDaemonMaxHeartbeatAgeSeconds * 1000;
  }

  get escrowBatchSyncDaemonMaxCurrentRunAgeSeconds() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_MAX_CURRENT_RUN_AGE_SEC,
      1800,
    );
  }

  get escrowBatchSyncDaemonMaxCurrentRunAgeMs() {
    return this.escrowBatchSyncDaemonMaxCurrentRunAgeSeconds * 1000;
  }

  get escrowBatchSyncDaemonMaxConsecutiveFailures() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_MAX_CONSECUTIVE_FAILURES,
      3,
    );
  }

  get escrowBatchSyncDaemonMaxConsecutiveSkips() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_MAX_CONSECUTIVE_SKIPS,
      6,
    );
  }

  get escrowBatchSyncDaemonLockId() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_LOCK_ID,
      433704337,
    );
  }

  get escrowBatchSyncScheduleIntervalSeconds() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_SCHEDULE_INTERVAL_SEC,
      300,
    );
  }

  get escrowBatchSyncScheduleRunOnStart() {
    const raw =
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_SCHEDULE_RUN_ON_START?.trim().toLowerCase();
    return raw !== '0' && raw !== 'false' && raw !== 'no';
  }

  get escrowBatchSyncLimit() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_LIMIT,
      this.escrowHealthDefaultLimit,
    );
  }

  get escrowBatchSyncPersist() {
    const raw =
      process.env.OPERATIONS_ESCROW_BATCH_SYNC_PERSIST?.trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes';
  }

  get escrowSyncRpcUrl() {
    return (
      process.env.OPERATIONS_ESCROW_RPC_URL?.trim() ||
      process.env.ESCROW_CHAIN_RPC_URL?.trim() ||
      null
    );
  }

  get escrowSyncLookbackBlocks() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_SYNC_LOOKBACK_BLOCKS,
      20,
    );
  }

  get escrowSyncMaxRangeBlocks() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_SYNC_MAX_RANGE_BLOCKS,
      25_000,
    );
  }

  get escrowStaleJobHours() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_STALE_JOB_HOURS,
      72,
    );
  }

  get escrowChainSyncBacklogHours() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_CHAIN_SYNC_BACKLOG_HOURS,
      6,
    );
  }

  get escrowChainSyncBacklogMs() {
    return this.escrowChainSyncBacklogHours * 60 * 60 * 1000;
  }

  get escrowStaleJobMs() {
    return this.escrowStaleJobHours * 60 * 60 * 1000;
  }

  get escrowHealthDefaultLimit() {
    return readPositiveInteger(
      process.env.OPERATIONS_ESCROW_HEALTH_DEFAULT_LIMIT,
      25,
    );
  }

  get escrowHealthMaxLimit() {
    const configured = readPositiveInteger(
      process.env.OPERATIONS_ESCROW_HEALTH_MAX_LIMIT,
      100,
    );

    return Math.max(configured, this.escrowHealthDefaultLimit);
  }
}
