import type { AuditBundle } from '../lib/api';

type Milestone = AuditBundle['bundle']['job']['milestones'][number];
type Execution = AuditBundle['bundle']['executions'][number];
type AuditEvent = AuditBundle['bundle']['audit'][number];

export type CasePressure = 'stable' | 'attention' | 'critical';

export type CaseBrief = {
  disputedMilestones: number;
  failedExecutions: number;
  openMilestones: number;
  settledMilestones: number;
  latestActivityAt: number | null;
  pressure: CasePressure;
  pressureSummary: string;
};

export type MilestoneReviewCard = {
  milestoneIndex: number;
  title: string;
  status: string;
  amount: string;
  posture: 'stable' | 'review' | 'resolved';
  operatorSummary: string;
  supportingDetail: string;
};

export type ExecutionIssueCard = {
  id: string;
  action: string;
  status: Execution['status'];
  milestoneIndex?: number;
  actorAddress: string;
  at: number;
  summary: string;
  detail: string;
  txHash?: string;
};

export type OperatorTimelineEntry = {
  kind: 'audit' | 'execution';
  label: string;
  at: number;
  summary: string;
  detail: string;
  tone: 'neutral' | 'warning' | 'critical' | 'success';
};

function sortDescending<T extends { at: number }>(entries: T[]) {
  return [...entries].sort((left, right) => right.at - left.at);
}

function latestActivityAt(bundle: AuditBundle['bundle']) {
  const auditTimes = bundle.audit.map((event) => event.at);
  const executionTimes = bundle.executions.map(
    (execution) => execution.confirmedAt ?? execution.submittedAt,
  );
  const milestoneTimes = bundle.job.milestones.flatMap((milestone) =>
    [
      milestone.dueAt,
      milestone.deliveredAt,
      milestone.disputedAt,
      milestone.releasedAt,
      milestone.resolvedAt,
    ].filter((value): value is number => Boolean(value)),
  );
  const times = [...auditTimes, ...executionTimes, ...milestoneTimes];

  return times.length > 0 ? Math.max(...times) : null;
}

function summarizePressure(input: {
  disputedMilestones: number;
  failedExecutions: number;
  openMilestones: number;
}): Pick<CaseBrief, 'pressure' | 'pressureSummary'> {
  const { disputedMilestones, failedExecutions, openMilestones } = input;

  if (disputedMilestones > 0 && failedExecutions > 0) {
    return {
      pressure: 'critical',
      pressureSummary:
        'Disputes and failed executions are both present. This case needs operator attention first.',
    };
  }

  if (disputedMilestones > 0) {
    return {
      pressure: 'attention',
      pressureSummary:
        'At least one milestone is disputed. Review evidence, timeline, and the acting wallet posture.',
    };
  }

  if (failedExecutions > 0) {
    return {
      pressure: 'attention',
      pressureSummary:
        'Execution failures are present. Inspect receipts before assuming the case is blocked by participants.',
    };
  }

  if (openMilestones > 0) {
    return {
      pressure: 'stable',
      pressureSummary:
        'The case is active but not escalated. Watch delivery and release posture for the next change.',
    };
  }

  return {
    pressure: 'stable',
    pressureSummary:
      'No disputes or failed executions are visible in the public audit trail.',
  };
}

export function buildCaseBrief(bundle: AuditBundle['bundle']): CaseBrief {
  const disputedMilestones = bundle.job.milestones.filter(
    (milestone) => milestone.status === 'disputed',
  ).length;
  const failedExecutions = bundle.executions.filter(
    (execution) => execution.status === 'failed',
  ).length;
  const openMilestones = bundle.job.milestones.filter((milestone) =>
    ['pending', 'delivered', 'disputed'].includes(milestone.status),
  ).length;
  const settledMilestones = bundle.job.milestones.filter((milestone) =>
    ['released', 'refunded'].includes(milestone.status),
  ).length;

  return {
    disputedMilestones,
    failedExecutions,
    openMilestones,
    settledMilestones,
    latestActivityAt: latestActivityAt(bundle),
    ...summarizePressure({
      disputedMilestones,
      failedExecutions,
      openMilestones,
    }),
  };
}

export function buildMilestoneReviewCards(job: AuditBundle['bundle']['job']) {
  return job.milestones.map((milestone, milestoneIndex): MilestoneReviewCard => {
    if (milestone.status === 'disputed') {
      return {
        milestoneIndex,
        title: milestone.title,
        status: milestone.status,
        amount: milestone.amount,
        posture: 'review',
        operatorSummary: 'Dispute review required',
        supportingDetail:
          milestone.disputeReason?.trim() ||
          'A dispute exists, but the public audit payload did not include a typed reason.',
      };
    }

    if (milestone.status === 'refunded' || milestone.status === 'released') {
      return {
        milestoneIndex,
        title: milestone.title,
        status: milestone.status,
        amount: milestone.amount,
        posture: 'resolved',
        operatorSummary:
          milestone.status === 'released'
            ? 'Settled in favor of release'
            : 'Settled in favor of refund',
        supportingDetail: milestone.resolutionNote?.trim()
          ? milestone.resolutionNote
          : milestone.resolutionAction
            ? `Resolution action recorded as ${milestone.resolutionAction}.`
            : 'This milestone is fully settled.',
      };
    }

    if (milestone.status === 'delivered') {
      return {
        milestoneIndex,
        title: milestone.title,
        status: milestone.status,
        amount: milestone.amount,
        posture: 'review',
        operatorSummary: 'Delivered and awaiting client action',
        supportingDetail:
          milestone.deliveryNote?.trim() ||
          'Delivery evidence is present, but release or dispute has not yet closed the milestone.',
      };
    }

    return {
      milestoneIndex,
      title: milestone.title,
      status: milestone.status,
      amount: milestone.amount,
      posture: 'stable',
      operatorSummary: 'No escalation visible',
      supportingDetail:
        milestone.deliverable ||
        'The milestone is still pending and has not entered the dispute path.',
    };
  });
}

export function buildExecutionIssueCards(executions: Execution[]) {
  return sortDescending(
    executions.map((execution): ExecutionIssueCard => {
      const at = execution.confirmedAt ?? execution.submittedAt;

      if (execution.status === 'failed') {
        return {
          id: execution.id,
          action: execution.action,
          status: execution.status,
          milestoneIndex: execution.milestoneIndex,
          actorAddress: execution.actorAddress,
          at,
          summary: 'Execution failed',
          detail:
            execution.failureMessage ||
            execution.failureCode ||
            'The public receipt marks this execution as failed without a richer message.',
          txHash: execution.txHash,
        };
      }

      return {
        id: execution.id,
        action: execution.action,
        status: execution.status,
        milestoneIndex: execution.milestoneIndex,
        actorAddress: execution.actorAddress,
        at,
        summary: 'Confirmed execution',
        detail:
          execution.txHash
            ? 'Receipt confirmed onchain or through the configured mock execution path.'
            : 'Confirmed execution without a surfaced transaction hash.',
        txHash: execution.txHash,
      };
    }),
  );
}

function buildAuditTimelineEntry(event: AuditEvent): OperatorTimelineEntry {
  const label = event.type;
  const summary =
    event.payload.milestoneIndex === undefined
      ? 'Job-level audit event'
      : `Milestone ${Number(event.payload.milestoneIndex) + 1} audit event`;
  const detail = JSON.stringify(event.payload, null, 2);

  return {
    kind: 'audit',
    label,
    at: event.at,
    summary,
    detail,
    tone: event.type.includes('disputed')
      ? 'warning'
      : event.type.includes('resolved') || event.type.includes('released')
        ? 'success'
        : 'neutral',
  };
}

function buildExecutionTimelineEntry(execution: Execution): OperatorTimelineEntry {
  const at = execution.confirmedAt ?? execution.submittedAt;
  const milestoneLabel =
    execution.milestoneIndex === undefined
      ? 'job-level'
      : `milestone ${execution.milestoneIndex + 1}`;

  return {
    kind: 'execution',
    label: execution.action,
    at,
    summary: `${execution.status} receipt for ${milestoneLabel}`,
    detail:
      execution.failureMessage ||
      execution.txHash ||
      execution.actorAddress,
    tone:
      execution.status === 'failed'
        ? 'critical'
        : execution.action.includes('resolve') || execution.action.includes('release')
          ? 'success'
          : 'neutral',
  };
}

export function buildOperatorTimeline(bundle: AuditBundle['bundle']) {
  return sortDescending(
    [
      ...bundle.audit.map(buildAuditTimelineEntry),
      ...bundle.executions.map(buildExecutionTimelineEntry),
    ].map((entry) => ({
      ...entry,
      at: entry.at,
    })),
  );
}

export function getDisputedMilestoneCards(cards: MilestoneReviewCard[]) {
  return cards.filter((card) => card.status === 'disputed');
}

export function getExecutionFailures(cards: ExecutionIssueCard[]) {
  return cards.filter((card) => card.status === 'failed');
}

export function getRecentLookupSuggestions(history: string[], currentJobId: string) {
  const current = currentJobId.trim();
  return history.filter((jobId) => jobId !== current).slice(0, 5);
}
