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

export type OperatorCaseMessages = {
  disputesAndFailures: string;
  disputesOnly: string;
  failuresOnly: string;
  activeNoEscalation: string;
  noPressure: string;
  disputeReviewRequired: string;
  deliveredAwaitingClient: string;
  noEscalationVisible: string;
  settledRelease: string;
  settledRefund: string;
  resolvedWith: (action: string) => string;
  settledFallback: string;
  deliveryAwaitingFallback: string;
  disputeReasonFallback: string;
  pendingFallback: string;
  executionFailed: string;
  executionConfirmed: string;
  executionFailureFallback: string;
  auditFallback: string;
  executionFallback: string;
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
  messages: OperatorCaseMessages;
}): Pick<CaseBrief, 'pressure' | 'pressureSummary'> {
  const { disputedMilestones, failedExecutions, messages, openMilestones } = input;

  if (disputedMilestones > 0 && failedExecutions > 0) {
    return {
      pressure: 'critical',
      pressureSummary: messages.disputesAndFailures,
    };
  }

  if (disputedMilestones > 0) {
    return {
      pressure: 'attention',
      pressureSummary: messages.disputesOnly,
    };
  }

  if (failedExecutions > 0) {
    return {
      pressure: 'attention',
      pressureSummary: messages.failuresOnly,
    };
  }

  if (openMilestones > 0) {
    return {
      pressure: 'stable',
      pressureSummary: messages.activeNoEscalation,
    };
  }

  return {
    pressure: 'stable',
    pressureSummary: messages.noPressure,
  };
}

export function buildCaseBrief(
  bundle: AuditBundle['bundle'],
  messages: OperatorCaseMessages,
): CaseBrief {
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
      messages,
      openMilestones,
    }),
  };
}

export function buildMilestoneReviewCards(
  job: AuditBundle['bundle']['job'],
  messages: OperatorCaseMessages,
) {
  return job.milestones.map((milestone, milestoneIndex): MilestoneReviewCard => {
    if (milestone.status === 'disputed') {
      return {
        milestoneIndex,
        title: milestone.title,
        status: milestone.status,
        amount: milestone.amount,
        posture: 'review',
        operatorSummary: messages.disputeReviewRequired,
        supportingDetail:
          milestone.disputeReason?.trim() ||
          messages.disputeReasonFallback,
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
            ? messages.settledRelease
            : messages.settledRefund,
        supportingDetail: milestone.resolutionNote?.trim()
          ? milestone.resolutionNote
          : milestone.resolutionAction
            ? messages.resolvedWith(milestone.resolutionAction)
            : messages.settledFallback,
      };
    }

    if (milestone.status === 'delivered') {
      return {
        milestoneIndex,
        title: milestone.title,
        status: milestone.status,
        amount: milestone.amount,
        posture: 'review',
        operatorSummary: messages.deliveredAwaitingClient,
        supportingDetail:
          milestone.deliveryNote?.trim() ||
          messages.deliveryAwaitingFallback,
      };
    }

    return {
      milestoneIndex,
      title: milestone.title,
      status: milestone.status,
      amount: milestone.amount,
      posture: 'stable',
      operatorSummary: messages.noEscalationVisible,
      supportingDetail:
        milestone.deliverable ||
        messages.pendingFallback,
    };
  });
}

export function buildExecutionIssueCards(
  executions: Execution[],
  messages: OperatorCaseMessages,
) {
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
          summary: messages.executionFailed,
          detail:
            execution.failureMessage ||
            execution.failureCode ||
            messages.executionFailureFallback,
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
        summary: messages.executionConfirmed,
        detail:
          execution.txHash
            ? messages.executionFallback
            : messages.executionFallback,
        txHash: execution.txHash,
      };
    }),
  );
}

function buildAuditTimelineEntry(
  event: AuditEvent,
  messages: OperatorCaseMessages,
): OperatorTimelineEntry {
  const label = event.type;
  const summary =
    event.payload.milestoneIndex === undefined
      ? messages.auditFallback
      : `${messages.auditFallback} ${Number(event.payload.milestoneIndex) + 1}`;
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

function buildExecutionTimelineEntry(
  execution: Execution,
  messages: OperatorCaseMessages,
): OperatorTimelineEntry {
  const at = execution.confirmedAt ?? execution.submittedAt;
  const milestoneLabel =
    execution.milestoneIndex === undefined
      ? 'job-level'
      : `milestone ${execution.milestoneIndex + 1}`;

  return {
    kind: 'execution',
    label: execution.action,
    at,
    summary: `${execution.status} ${messages.executionConfirmed} ${milestoneLabel}`,
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

export function buildOperatorTimeline(
  bundle: AuditBundle['bundle'],
  messages: OperatorCaseMessages,
) {
  return sortDescending(
    [
      ...bundle.audit.map((event) => buildAuditTimelineEntry(event, messages)),
      ...bundle.executions.map((execution) =>
        buildExecutionTimelineEntry(execution, messages),
      ),
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
