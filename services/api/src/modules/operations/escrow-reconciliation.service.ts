import { Injectable } from '@nestjs/common';
import type {
  EscrowAuditEvent,
  EscrowExecutionRecord,
  EscrowJobRecord,
  EscrowMilestoneRecord,
  JobStatus,
  MilestoneStatus,
} from '../escrow/escrow.types';
import type {
  EscrowReconciliationIssue,
  EscrowReconciliationReport,
} from './escrow-health.types';

type MismatchedMilestone =
  EscrowReconciliationReport['projection']['mismatchedMilestones'][number];

type ReplayMilestoneState = {
  status: MilestoneStatus | null;
  lastAuditAt: number | null;
  lastAuditType: EscrowAuditEvent['type'] | null;
  deliveredAt: number | null;
  disputedAt: number | null;
  releasedAt: number | null;
  resolvedAt: number | null;
  resolutionAction: 'release' | 'refund' | null;
};

function confirmedExecutions(
  job: EscrowJobRecord,
  action?: EscrowExecutionRecord['action'],
  milestoneIndex?: number,
) {
  return job.executions.filter(
    (execution) =>
      execution.status === 'confirmed' &&
      (action ? execution.action === action : true) &&
      (milestoneIndex === undefined
        ? true
        : execution.milestoneIndex === milestoneIndex),
  );
}

function hasAuditEvent(
  job: EscrowJobRecord,
  type: EscrowAuditEvent['type'],
  milestoneIndex?: number,
  resolutionAction?: 'release' | 'refund',
) {
  return job.audit.some((event) => {
    if (event.type !== type) {
      return false;
    }

    if (milestoneIndex !== undefined) {
      if (
        !('milestoneIndex' in event.payload) ||
        event.payload.milestoneIndex !== milestoneIndex
      ) {
        return false;
      }
    }

    if (
      resolutionAction &&
      event.type === 'milestone.resolved' &&
      event.payload.action !== resolutionAction
    ) {
      return false;
    }

    return true;
  });
}

function deriveExpectedJobStatus(
  milestones: Array<Pick<EscrowMilestoneRecord, 'status'>>,
  fundedAmount: string | null,
): JobStatus {
  const milestoneStatuses = milestones.map((milestone) => milestone.status);

  if (milestoneStatuses.includes('disputed')) {
    return 'disputed';
  }

  const hasFinalMilestones =
    milestoneStatuses.length > 0 &&
    milestoneStatuses.every(
      (status) => status === 'released' || status === 'refunded',
    );

  if (hasFinalMilestones) {
    return milestoneStatuses.includes('refunded') ? 'resolved' : 'completed';
  }

  if (
    milestoneStatuses.some(
      (status) =>
        status === 'delivered' ||
        status === 'released' ||
        status === 'refunded',
    )
  ) {
    return 'in_progress';
  }

  if (fundedAmount !== null) {
    return 'funded';
  }

  return 'draft';
}

function formatCountLabel(count: number, label: string) {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}

function requiresDeliveredEvidence(status: MilestoneStatus) {
  return (
    status === 'delivered' ||
    status === 'released' ||
    status === 'disputed' ||
    status === 'refunded'
  );
}

function latestMilestoneSetCount(audit: EscrowAuditEvent[]) {
  const latest = [...audit]
    .reverse()
    .find((event) => event.type === 'job.milestones_set');

  return latest?.type === 'job.milestones_set' ? latest.payload.count : null;
}

function createReplayMilestoneState(): ReplayMilestoneState {
  return {
    status: 'pending',
    lastAuditAt: null,
    lastAuditType: null,
    deliveredAt: null,
    disputedAt: null,
    releasedAt: null,
    resolvedAt: null,
    resolutionAction: null,
  };
}

function highestReconciliationSeverity(
  issues: EscrowReconciliationIssue[],
): 'warning' | 'critical' {
  return issues.some((issue) => issue.severity === 'critical')
    ? 'critical'
    : 'warning';
}

@Injectable()
export class EscrowReconciliationService {
  buildReport(job: EscrowJobRecord): EscrowReconciliationReport | null {
    const issues: EscrowReconciliationIssue[] = [];
    const seenIssueKeys = new Set<string>();
    const pushIssue = (issue: EscrowReconciliationIssue) => {
      const key = `${issue.code}:${issue.summary}`;
      if (seenIssueKeys.has(key)) {
        return;
      }

      seenIssueKeys.add(key);
      issues.push(issue);
    };

    const projectedMilestoneCount =
      latestMilestoneSetCount(job.audit) ?? job.milestones.length;
    const projectedMilestones = Array.from(
      { length: projectedMilestoneCount },
      () => createReplayMilestoneState(),
    );
    const sortedAudit = job.audit
      .map((event, index) => ({
        event,
        index,
      }))
      .sort(
        (left, right) =>
          left.event.at - right.event.at || left.index - right.index,
      );
    let replayCreatedAt: number | null = null;
    let replayFundedAmount: string | null = null;
    let replayMilestonesConfigured = false;

    for (const { event } of sortedAudit) {
      switch (event.type) {
        case 'job.created': {
          if (replayCreatedAt !== null) {
            pushIssue({
              code: 'timeline_transition_mismatch',
              severity: 'warning',
              summary: 'The audit timeline contains duplicate job.created events.',
              detail:
                'Reconciliation replay expects job.created to appear at most once.',
            });
            break;
          }

          replayCreatedAt = event.at;
          break;
        }
        case 'job.funded': {
          if (replayCreatedAt === null) {
            pushIssue({
              code: 'timeline_transition_mismatch',
              severity: 'critical',
              summary:
                'The audit timeline funds the job before the create event is visible.',
              detail:
                'Replay encountered job.funded before job.created, so the persisted audit order is inconsistent.',
            });
          }

          if (replayFundedAmount !== null) {
            pushIssue({
              code: 'timeline_transition_mismatch',
              severity: 'warning',
              summary: 'The audit timeline contains duplicate job.funded events.',
              detail:
                'Replay expects funding to be applied once per escrow job aggregate.',
            });
            break;
          }

          replayFundedAmount = event.payload.amount;
          break;
        }
        case 'job.milestones_set': {
          if (replayFundedAmount === null) {
            pushIssue({
              code: 'timeline_transition_mismatch',
              severity: 'critical',
              summary:
                'The audit timeline configures milestones before funding is visible.',
              detail:
                'Replay encountered job.milestones_set before job.funded.',
            });
          }

          if (replayMilestonesConfigured) {
            pushIssue({
              code: 'timeline_transition_mismatch',
              severity: 'warning',
              summary:
                'The audit timeline contains multiple milestone setup events.',
              detail:
                'Replay expects milestone configuration to happen once per job.',
            });
          }

          replayMilestonesConfigured = true;
          if (event.payload.count > projectedMilestones.length) {
            projectedMilestones.push(
              ...Array.from(
                { length: event.payload.count - projectedMilestones.length },
                () => createReplayMilestoneState(),
              ),
            );
          }
          break;
        }
        case 'milestone.delivered':
        case 'milestone.released':
        case 'milestone.disputed':
        case 'milestone.resolved': {
          const milestone = projectedMilestones[event.payload.milestoneIndex];
          if (!milestone) {
            pushIssue({
              code: 'timeline_reference_mismatch',
              severity: 'critical',
              summary: `Audit event ${event.type} references milestone ${
                event.payload.milestoneIndex + 1
              } outside the projected milestone range.`,
              detail:
                'Replay could not map this audit entry to a configured milestone index.',
            });
            break;
          }

          const invalidTransition = (summary: string, detail: string) => {
            pushIssue({
              code: 'timeline_transition_mismatch',
              severity: 'critical',
              summary,
              detail,
            });
          };

          switch (event.type) {
            case 'milestone.delivered': {
              if (milestone.status !== 'pending') {
                invalidTransition(
                  `Milestone ${event.payload.milestoneIndex + 1} is delivered from ${milestone.status ?? 'unknown'} state in the audit replay.`,
                  'Replay expects milestone.delivered to transition from pending.',
                );
                break;
              }

              milestone.status = 'delivered';
              milestone.deliveredAt = event.at;
              milestone.lastAuditAt = event.at;
              milestone.lastAuditType = event.type;
              break;
            }
            case 'milestone.released': {
              if (milestone.status !== 'delivered') {
                invalidTransition(
                  `Milestone ${event.payload.milestoneIndex + 1} is released from ${milestone.status ?? 'unknown'} state in the audit replay.`,
                  'Replay expects milestone.released to transition from delivered.',
                );
                break;
              }

              milestone.status = 'released';
              milestone.releasedAt = event.at;
              milestone.lastAuditAt = event.at;
              milestone.lastAuditType = event.type;
              break;
            }
            case 'milestone.disputed': {
              if (milestone.status !== 'delivered') {
                invalidTransition(
                  `Milestone ${event.payload.milestoneIndex + 1} is disputed from ${milestone.status ?? 'unknown'} state in the audit replay.`,
                  'Replay expects milestone.disputed to transition from delivered.',
                );
                break;
              }

              milestone.status = 'disputed';
              milestone.disputedAt = event.at;
              milestone.lastAuditAt = event.at;
              milestone.lastAuditType = event.type;
              break;
            }
            case 'milestone.resolved': {
              if (milestone.status !== 'disputed') {
                invalidTransition(
                  `Milestone ${event.payload.milestoneIndex + 1} is resolved from ${milestone.status ?? 'unknown'} state in the audit replay.`,
                  'Replay expects milestone.resolved to transition from disputed.',
                );
                break;
              }

              milestone.status =
                event.payload.action === 'release' ? 'released' : 'refunded';
              milestone.resolvedAt = event.at;
              milestone.resolutionAction = event.payload.action;
              milestone.lastAuditAt = event.at;
              milestone.lastAuditType = event.type;
              if (event.payload.action === 'release') {
                milestone.releasedAt = event.at;
              }
              break;
            }
          }
        }
      }
    }

    if (confirmedExecutions(job, 'create_job').length === 0) {
      pushIssue({
        code: 'missing_create_confirmation',
        severity: 'critical',
        summary: 'Job aggregate is missing a confirmed create-job execution.',
        detail:
          'The persisted escrow job exists without a confirmed create_job receipt in its execution timeline.',
      });
    }

    const replayJobStatus = deriveExpectedJobStatus(
      projectedMilestones
        .filter((milestone) => milestone.status !== null)
        .map((milestone) => ({
          status: milestone.status!,
        })),
      replayFundedAmount,
    );

    if (job.status !== replayJobStatus) {
      pushIssue({
        code: 'job_status_mismatch',
        severity: 'critical',
        summary: `Job status is ${job.status} but replay projects ${replayJobStatus}.`,
        detail:
          'The aggregate status no longer matches the status derived from the persisted audit replay.',
      });
    }

    if (job.fundedAmount !== replayFundedAmount) {
      pushIssue({
        code: 'funding_state_mismatch',
        severity:
          job.fundedAmount === null || replayFundedAmount === null
            ? 'critical'
            : 'warning',
        summary: `Funded amount is ${job.fundedAmount ?? 'null'} but replay projects ${
          replayFundedAmount ?? 'null'
        }.`,
        detail:
          'The aggregate funding posture diverges from the amount derived from the persisted audit replay.',
      });
    }

    const mismatchedMilestones: MismatchedMilestone[] = [];
    for (
      let index = 0;
      index < Math.max(job.milestones.length, projectedMilestones.length);
      index += 1
    ) {
      const aggregateStatus = job.milestones[index]?.status ?? null;
      const projectedStatus = projectedMilestones[index]?.status ?? null;
      if (aggregateStatus === projectedStatus) {
        continue;
      }

      mismatchedMilestones.push({
        index,
        aggregateStatus,
        projectedStatus,
        lastAuditType: projectedMilestones[index]?.lastAuditType ?? null,
        lastAuditAt: projectedMilestones[index]?.lastAuditAt ?? null,
      });
    }

    if (mismatchedMilestones.length > 0) {
      pushIssue({
        code: 'milestone_state_mismatch',
        severity: 'critical',
        summary: `Milestone replay diverges from aggregate state on ${
          mismatchedMilestones.length
        } milestone${mismatchedMilestones.length === 1 ? '' : 's'}.`,
        detail: `Mismatched milestones: ${mismatchedMilestones
          .slice(0, 5)
          .map(
            (milestone) =>
              `${milestone.index + 1}(${milestone.aggregateStatus ?? 'null'} -> ${
                milestone.projectedStatus ?? 'null'
              })`,
          )
          .join(', ')}.`,
      });
    }

    const confirmedFunding = confirmedExecutions(job, 'fund_job').length;
    const hasFundingAudit = hasAuditEvent(job, 'job.funded');
    if (
      job.fundedAmount !== null &&
      (confirmedFunding === 0 || !hasFundingAudit)
    ) {
      pushIssue({
        code: 'funding_state_mismatch',
        severity: confirmedFunding === 0 ? 'critical' : 'warning',
        summary:
          'Funded amount is persisted without a matching confirmed funding timeline.',
        detail: `Aggregate funded amount exists, but reconciliation found ${formatCountLabel(
          confirmedFunding,
          'confirmed funding execution',
        )} and ${hasFundingAudit ? 'a' : 'no'} job.funded audit event.`,
      });
    }

    if (
      job.fundedAmount === null &&
      (confirmedFunding > 0 || hasFundingAudit)
    ) {
      pushIssue({
        code: 'funding_state_mismatch',
        severity: 'critical',
        summary:
          'Funding was confirmed in the timeline but the aggregate funded amount is empty.',
        detail: `Reconciliation found ${formatCountLabel(
          confirmedFunding,
          'confirmed funding execution',
        )} and ${hasFundingAudit ? 'a' : 'no'} job.funded audit event while fundedAmount is null.`,
      });
    }

    if (confirmedFunding > 1) {
      pushIssue({
        code: 'duplicate_confirmed_execution',
        severity: 'critical',
        summary:
          'Funding has multiple confirmed executions in the job timeline.',
        detail: `Expected at most one confirmed fund_job execution but found ${confirmedFunding}.`,
      });
    }

    const confirmedMilestoneSetup = confirmedExecutions(
      job,
      'set_milestones',
    ).length;
    const hasMilestoneSetupAudit = hasAuditEvent(job, 'job.milestones_set');
    if (
      job.milestones.length > 0 &&
      (confirmedMilestoneSetup === 0 || !hasMilestoneSetupAudit)
    ) {
      pushIssue({
        code: 'milestone_state_mismatch',
        severity: confirmedMilestoneSetup === 0 ? 'critical' : 'warning',
        summary:
          'Milestones are persisted without a matching confirmed setup timeline.',
        detail: `Aggregate milestone count is ${
          job.milestones.length
        }, but reconciliation found ${formatCountLabel(
          confirmedMilestoneSetup,
          'confirmed setup execution',
        )} and ${hasMilestoneSetupAudit ? 'a' : 'no'} job.milestones_set audit event.`,
      });
    }

    if (confirmedMilestoneSetup > 1) {
      pushIssue({
        code: 'duplicate_confirmed_execution',
        severity: 'critical',
        summary:
          'Milestone setup has multiple confirmed executions in the timeline.',
        detail: `Expected at most one confirmed set_milestones execution but found ${confirmedMilestoneSetup}.`,
      });
    }

    for (const [index, milestone] of job.milestones.entries()) {
      if (requiresDeliveredEvidence(milestone.status)) {
        const deliveryExecutions = confirmedExecutions(
          job,
          'deliver_milestone',
          index,
        ).length;
        const hasDeliveryAudit = hasAuditEvent(
          job,
          'milestone.delivered',
          index,
        );

        if (
          !milestone.deliveredAt ||
          deliveryExecutions === 0 ||
          !hasDeliveryAudit
        ) {
          pushIssue({
            code: 'milestone_state_mismatch',
            severity: deliveryExecutions === 0 ? 'critical' : 'warning',
            summary: `Milestone ${index + 1} is ${milestone.status} without a complete delivery timeline.`,
            detail: `Expected deliveredAt plus one confirmed deliver_milestone execution and milestone.delivered audit event, but found deliveredAt=${String(
              milestone.deliveredAt ?? null,
            )}, executions=${deliveryExecutions}, audit=${hasDeliveryAudit}.`,
          });
        }

        if (deliveryExecutions > 1) {
          pushIssue({
            code: 'duplicate_confirmed_execution',
            severity: 'critical',
            summary: `Milestone ${index + 1} has duplicate confirmed delivery executions.`,
            detail: `Expected at most one confirmed deliver_milestone execution but found ${deliveryExecutions}.`,
          });
        }
      }

      if (milestone.status === 'disputed') {
        const disputeExecutions = confirmedExecutions(
          job,
          'open_dispute',
          index,
        ).length;
        const hasDisputeAudit = hasAuditEvent(job, 'milestone.disputed', index);

        if (
          !milestone.disputedAt ||
          disputeExecutions === 0 ||
          !hasDisputeAudit
        ) {
          pushIssue({
            code: 'milestone_state_mismatch',
            severity: disputeExecutions === 0 ? 'critical' : 'warning',
            summary: `Milestone ${index + 1} is disputed without a complete dispute timeline.`,
            detail: `Expected disputedAt plus one confirmed open_dispute execution and milestone.disputed audit event, but found disputedAt=${String(
              milestone.disputedAt ?? null,
            )}, executions=${disputeExecutions}, audit=${hasDisputeAudit}.`,
          });
        }

        if (disputeExecutions > 1) {
          pushIssue({
            code: 'duplicate_confirmed_execution',
            severity: 'critical',
            summary: `Milestone ${index + 1} has duplicate confirmed dispute openings.`,
            detail: `Expected at most one confirmed open_dispute execution but found ${disputeExecutions}.`,
          });
        }
      }

      if (milestone.status === 'released') {
        if (milestone.resolutionAction === 'release' || milestone.resolvedAt) {
          const resolutionExecutions = confirmedExecutions(
            job,
            'resolve_dispute',
            index,
          ).length;
          const hasResolutionAudit = hasAuditEvent(
            job,
            'milestone.resolved',
            index,
            'release',
          );

          if (
            !milestone.resolvedAt ||
            resolutionExecutions === 0 ||
            !hasResolutionAudit
          ) {
            pushIssue({
              code: 'milestone_state_mismatch',
              severity: resolutionExecutions === 0 ? 'critical' : 'warning',
              summary: `Milestone ${index + 1} looks dispute-resolved without a complete resolution timeline.`,
              detail: `Expected resolvedAt plus one confirmed resolve_dispute execution and milestone.resolved(release) audit event, but found resolvedAt=${String(
                milestone.resolvedAt ?? null,
              )}, executions=${resolutionExecutions}, audit=${hasResolutionAudit}.`,
            });
          }

          if (resolutionExecutions > 1) {
            pushIssue({
              code: 'duplicate_confirmed_execution',
              severity: 'critical',
              summary: `Milestone ${index + 1} has duplicate confirmed dispute resolutions.`,
              detail: `Expected at most one confirmed resolve_dispute execution but found ${resolutionExecutions}.`,
            });
          }
        } else {
          const releaseExecutions = confirmedExecutions(
            job,
            'release_milestone',
            index,
          ).length;
          const hasReleaseAudit = hasAuditEvent(
            job,
            'milestone.released',
            index,
          );

          if (
            !milestone.releasedAt ||
            releaseExecutions === 0 ||
            !hasReleaseAudit
          ) {
            pushIssue({
              code: 'milestone_state_mismatch',
              severity: releaseExecutions === 0 ? 'critical' : 'warning',
              summary: `Milestone ${index + 1} is released without a complete release timeline.`,
              detail: `Expected releasedAt plus one confirmed release_milestone execution and milestone.released audit event, but found releasedAt=${String(
                milestone.releasedAt ?? null,
              )}, executions=${releaseExecutions}, audit=${hasReleaseAudit}.`,
            });
          }

          if (releaseExecutions > 1) {
            pushIssue({
              code: 'duplicate_confirmed_execution',
              severity: 'critical',
              summary: `Milestone ${index + 1} has duplicate confirmed releases.`,
              detail: `Expected at most one confirmed release_milestone execution but found ${releaseExecutions}.`,
            });
          }
        }
      }

      if (milestone.status === 'refunded') {
        const resolutionExecutions = confirmedExecutions(
          job,
          'resolve_dispute',
          index,
        ).length;
        const hasResolutionAudit = hasAuditEvent(
          job,
          'milestone.resolved',
          index,
          'refund',
        );

        if (
          !milestone.resolvedAt ||
          milestone.resolutionAction !== 'refund' ||
          resolutionExecutions === 0 ||
          !hasResolutionAudit
        ) {
          pushIssue({
            code: 'milestone_state_mismatch',
            severity: resolutionExecutions === 0 ? 'critical' : 'warning',
            summary: `Milestone ${index + 1} is refunded without a complete refund-resolution timeline.`,
            detail: `Expected resolvedAt, resolutionAction=refund, one confirmed resolve_dispute execution, and milestone.resolved(refund) audit event, but found resolvedAt=${String(
              milestone.resolvedAt ?? null,
            )}, resolutionAction=${milestone.resolutionAction ?? 'null'}, executions=${resolutionExecutions}, audit=${hasResolutionAudit}.`,
          });
        }

        if (resolutionExecutions > 1) {
          pushIssue({
            code: 'duplicate_confirmed_execution',
            severity: 'critical',
            summary: `Milestone ${index + 1} has duplicate confirmed refund resolutions.`,
            detail: `Expected at most one confirmed resolve_dispute execution but found ${resolutionExecutions}.`,
          });
        }
      }
    }

    const sortedIssues = issues
      .sort(
        (left, right) =>
          Number(right.severity === 'critical') -
            Number(left.severity === 'critical') ||
          left.summary.localeCompare(right.summary),
      )
      .slice(0, 7);

    if (sortedIssues.length === 0) {
      return null;
    }

    return {
      issueCount: sortedIssues.length,
      highestSeverity: highestReconciliationSeverity(sortedIssues),
      sourceCounts: {
        auditEvents: job.audit.length,
        confirmedExecutions: job.executions.filter(
          (execution) => execution.status === 'confirmed',
        ).length,
        failedExecutions: job.executions.filter(
          (execution) => execution.status === 'failed',
        ).length,
      },
      projection: {
        aggregateStatus: job.status,
        projectedStatus: replayJobStatus,
        aggregateFundedAmount: job.fundedAmount,
        projectedFundedAmount: replayFundedAmount,
        mismatchedMilestones: mismatchedMilestones.slice(0, 5),
      },
      issues: sortedIssues,
    };
  }
}
