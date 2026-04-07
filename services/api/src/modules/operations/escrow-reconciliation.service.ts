import { Injectable } from '@nestjs/common';
import type {
  EscrowExecutionRecord,
  EscrowJobRecord,
  JobStatus,
  MilestoneStatus,
} from '../escrow/escrow.types';
import type { EscrowReconciliationIssue } from './escrow-health.types';

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
  type: EscrowJobRecord['audit'][number]['type'],
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

function deriveExpectedJobStatus(job: EscrowJobRecord): JobStatus {
  const milestoneStatuses = job.milestones.map((milestone) => milestone.status);

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

  if (job.fundedAmount !== null) {
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

@Injectable()
export class EscrowReconciliationService {
  reconcile(job: EscrowJobRecord): EscrowReconciliationIssue[] {
    const issues: EscrowReconciliationIssue[] = [];
    const pushIssue = (issue: EscrowReconciliationIssue) => {
      issues.push(issue);
    };

    if (confirmedExecutions(job, 'create_job').length === 0) {
      pushIssue({
        code: 'missing_create_confirmation',
        severity: 'critical',
        summary: 'Job aggregate is missing a confirmed create-job execution.',
        detail:
          'The persisted escrow job exists without a confirmed create_job receipt in its execution timeline.',
      });
    }

    const expectedStatus = deriveExpectedJobStatus(job);
    if (job.status !== expectedStatus) {
      pushIssue({
        code: 'job_status_mismatch',
        severity: 'critical',
        summary: `Job status is ${job.status} but the persisted milestone state implies ${expectedStatus}.`,
        detail:
          'The aggregate status no longer matches the state derived from milestone outcomes and funding posture.',
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

    return issues
      .sort(
        (left, right) =>
          Number(right.severity === 'critical') -
            Number(left.severity === 'critical') ||
          left.summary.localeCompare(right.summary),
      )
      .slice(0, 5);
  }
}
