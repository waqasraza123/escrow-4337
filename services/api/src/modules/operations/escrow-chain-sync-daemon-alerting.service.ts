import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import type { EscrowChainSyncDaemonHealthReport } from './escrow-health.types';
import {
  EscrowChainSyncDaemonAlertStateService,
  type EscrowChainSyncDaemonAlertSeverity,
  type EscrowChainSyncDaemonAlertState,
} from './escrow-chain-sync-daemon-alert-state.service';
import { EscrowChainSyncDaemonMonitoringService } from './escrow-chain-sync-daemon-monitoring.service';
import { OperationsConfigService } from './operations.config';

type NotificationEvent = 'alert' | 'recovery';

type AlertingDecision =
  | {
      action: 'suppress';
      reason:
        | 'below_threshold'
        | 'no_active_alert'
        | 'recovery_disabled'
        | 'duplicate_within_resend_window';
      event: null;
      severity: EscrowChainSyncDaemonAlertSeverity | null;
      fingerprint: string | null;
      nextState: null;
    }
  | {
      action: 'send';
      reason: 'alert_changed' | 'alert_resend_due' | 'recovery_sent';
      event: NotificationEvent;
      severity: EscrowChainSyncDaemonAlertSeverity | null;
      fingerprint: string | null;
      nextState: EscrowChainSyncDaemonAlertState;
    };

export type EscrowChainSyncDaemonAlertDispatchReport = {
  generatedAt: string;
  report: EscrowChainSyncDaemonHealthReport;
  notification: {
    configured: boolean;
    attempted: boolean;
    sent: boolean;
    dryRun: boolean;
    event: NotificationEvent | null;
    severity: EscrowChainSyncDaemonAlertSeverity | null;
    fingerprint: string | null;
    reason:
      | 'webhook_unconfigured'
      | AlertingDecision['reason']
      | 'alert_sent'
      | 'recovery_delivered';
    webhookResponseStatus: number | null;
  };
};

@Injectable()
export class EscrowChainSyncDaemonAlertingService {
  constructor(
    private readonly monitoringService: EscrowChainSyncDaemonMonitoringService,
    private readonly alertStateService: EscrowChainSyncDaemonAlertStateService,
    private readonly operationsConfig: OperationsConfigService,
  ) {}

  async dispatchAlert(
    input: { dryRun?: boolean } = {},
    now = Date.now(),
  ): Promise<EscrowChainSyncDaemonAlertDispatchReport> {
    const generatedAt = new Date(now).toISOString();
    const report = await this.monitoringService.getReport(now);
    const webhookUrl =
      this.operationsConfig.escrowBatchSyncDaemonAlertWebhookUrl;

    if (!webhookUrl) {
      return {
        generatedAt,
        report,
        notification: {
          configured: false,
          attempted: false,
          sent: false,
          dryRun: input.dryRun === true,
          event: null,
          severity: null,
          fingerprint: null,
          reason: 'webhook_unconfigured',
          webhookResponseStatus: null,
        },
      };
    }

    const existingState = await this.alertStateService.getState();
    const decision = this.decideAlert(report, existingState, now);

    if (decision.action === 'suppress') {
      return {
        generatedAt,
        report,
        notification: {
          configured: true,
          attempted: false,
          sent: false,
          dryRun: input.dryRun === true,
          event: null,
          severity: decision.severity,
          fingerprint: decision.fingerprint,
          reason: decision.reason,
          webhookResponseStatus: null,
        },
      };
    }

    if (input.dryRun === true) {
      return {
        generatedAt,
        report,
        notification: {
          configured: true,
          attempted: true,
          sent: false,
          dryRun: true,
          event: decision.event,
          severity: decision.severity,
          fingerprint: decision.fingerprint,
          reason: decision.reason,
          webhookResponseStatus: null,
        },
      };
    }

    const responseStatus = await this.sendWebhook(
      webhookUrl,
      this.buildPayload(report, decision, generatedAt),
    );
    await this.alertStateService.saveState(decision.nextState, now);

    return {
      generatedAt,
      report,
      notification: {
        configured: true,
        attempted: true,
        sent: true,
        dryRun: false,
        event: decision.event,
        severity: decision.severity,
        fingerprint: decision.fingerprint,
        reason:
          decision.event === 'alert' ? 'alert_sent' : 'recovery_delivered',
        webhookResponseStatus: responseStatus,
      },
    };
  }

  private decideAlert(
    report: EscrowChainSyncDaemonHealthReport,
    state: EscrowChainSyncDaemonAlertState | null,
    now: number,
  ): AlertingDecision {
    const timestamp = new Date(now).toISOString();
    const severity = this.toConfiguredSeverity(report.status);

    if (!severity) {
      if (!state?.activeAlertFingerprint) {
        return {
          action: 'suppress',
          reason:
            report.status === 'ok' ? 'no_active_alert' : 'below_threshold',
          event: null,
          severity: null,
          fingerprint: null,
          nextState: null,
        };
      }

      if (!this.operationsConfig.escrowBatchSyncDaemonAlertSendRecovery) {
        return {
          action: 'suppress',
          reason: 'recovery_disabled',
          event: null,
          severity: null,
          fingerprint: state.activeAlertFingerprint,
          nextState: null,
        };
      }

      return {
        action: 'send',
        reason: 'recovery_sent',
        event: 'recovery',
        severity: null,
        fingerprint: state.activeAlertFingerprint,
        nextState: {
          updatedAt: timestamp,
          activeAlertFingerprint: null,
          activeAlertSeverity: null,
          activeAlertFirstSentAt: null,
          activeAlertLastSentAt: null,
          lastRecoverySentAt: timestamp,
          lastEvent: 'recovery',
        },
      };
    }

    const fingerprint = this.buildFingerprint(report, severity);
    const resendDue =
      !state?.activeAlertLastSentAt ||
      now - Date.parse(state.activeAlertLastSentAt) >=
        this.operationsConfig.escrowBatchSyncDaemonAlertResendIntervalMs;
    const changed =
      state?.activeAlertFingerprint !== fingerprint ||
      state.activeAlertSeverity !== severity;

    if (!changed && !resendDue) {
      return {
        action: 'suppress',
        reason: 'duplicate_within_resend_window',
        event: null,
        severity,
        fingerprint,
        nextState: null,
      };
    }

    return {
      action: 'send',
      reason: changed ? 'alert_changed' : 'alert_resend_due',
      event: 'alert',
      severity,
      fingerprint,
      nextState: {
        updatedAt: timestamp,
        activeAlertFingerprint: fingerprint,
        activeAlertSeverity: severity,
        activeAlertFirstSentAt:
          changed || !state?.activeAlertFirstSentAt
            ? timestamp
            : state.activeAlertFirstSentAt,
        activeAlertLastSentAt: timestamp,
        lastRecoverySentAt: state?.lastRecoverySentAt ?? null,
        lastEvent: 'alert',
      },
    };
  }

  private toConfiguredSeverity(
    status: EscrowChainSyncDaemonHealthReport['status'],
  ): EscrowChainSyncDaemonAlertSeverity | null {
    const severity =
      status === 'failed'
        ? 'critical'
        : status === 'warning'
          ? 'warning'
          : null;
    if (!severity) {
      return null;
    }

    return compareSeverity(
      severity,
      this.operationsConfig.escrowBatchSyncDaemonAlertMinSeverity,
    ) >= 0
      ? severity
      : null;
  }

  private buildFingerprint(
    report: EscrowChainSyncDaemonHealthReport,
    severity: EscrowChainSyncDaemonAlertSeverity,
  ) {
    return createHash('sha256')
      .update(
        JSON.stringify({
          severity,
          status: report.status,
          summary: report.summary,
          issues: report.issues.map((issue) => ({
            code: issue.code,
            severity: issue.severity,
            summary: issue.summary,
            detail: issue.detail,
          })),
          daemon: report.daemon
            ? {
                workerId: report.daemon.worker.workerId,
                state: report.daemon.worker.state,
                lastHeartbeatAt: report.daemon.heartbeat.lastHeartbeatAt,
                lastRunOutcome: report.daemon.heartbeat.lastRunOutcome,
                consecutiveFailures:
                  report.daemon.heartbeat.consecutiveFailures,
                consecutiveSkips: report.daemon.heartbeat.consecutiveSkips,
                lastErrorMessage: report.daemon.heartbeat.lastErrorMessage,
                currentRunStartedAt:
                  report.daemon.currentRun?.startedAt ?? null,
              }
            : null,
        }),
      )
      .digest('hex');
  }

  private buildPayload(
    report: EscrowChainSyncDaemonHealthReport,
    decision: Extract<AlertingDecision, { action: 'send' }>,
    generatedAt: string,
  ) {
    return {
      source: 'escrow_chain_sync_daemon',
      environment: process.env.NODE_ENV ?? 'unknown',
      generatedAt,
      notification: {
        event: decision.event,
        reason: decision.reason,
        severity: decision.severity,
        fingerprint: decision.fingerprint,
        minSeverity:
          this.operationsConfig.escrowBatchSyncDaemonAlertMinSeverity,
      },
      report,
    };
  }

  private async sendWebhook(
    webhookUrl: string,
    payload: Record<string, unknown>,
  ): Promise<number> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    const bearerToken =
      this.operationsConfig.escrowBatchSyncDaemonAlertWebhookBearerToken;
    if (bearerToken) {
      headers.authorization = `Bearer ${bearerToken}`;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(
        this.operationsConfig.escrowBatchSyncDaemonAlertWebhookTimeoutMs,
      ),
    });

    if (response.ok) {
      return response.status;
    }

    const body = truncate(await response.text(), 500);
    throw new Error(
      `Daemon alert webhook returned ${response.status}${body ? `: ${body}` : ''}`,
    );
  }
}

function compareSeverity(
  left: EscrowChainSyncDaemonAlertSeverity,
  right: EscrowChainSyncDaemonAlertSeverity,
) {
  return severityRank(left) - severityRank(right);
}

function severityRank(value: EscrowChainSyncDaemonAlertSeverity) {
  return value === 'critical' ? 2 : 1;
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength
    ? value
    : `${value.slice(0, maxLength - 3)}...`;
}
