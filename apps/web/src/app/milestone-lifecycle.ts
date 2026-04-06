import type { AuditBundle, JobView } from '../lib/api';

export type LifecycleAction = AuditBundle['bundle']['executions'][number]['action'];

export type LifecyclePhase =
  | 'ready'
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'blocked';

export type PendingLifecycleAction = {
  action: LifecycleAction;
  milestoneIndex?: number;
  startedAt: number;
  summary: string;
};

export type LifecycleCard = {
  action: LifecycleAction;
  title: string;
  phase: LifecyclePhase;
  summary: string;
  detail: string;
  canTrigger: boolean;
  timestamp?: number;
  txHash?: string;
  failureMessage?: string;
};

export type MilestoneTimelineEntry = {
  label: string;
  detail: string;
  at: number;
  tone: 'neutral' | 'success' | 'warning';
};

type ExecutionRecord = AuditBundle['bundle']['executions'][number];
type AuditEvent = AuditBundle['bundle']['audit'][number];
type MilestoneView = JobView['milestones'][number];

function sortByMostRecent<T extends { confirmedAt?: number; submittedAt?: number; at?: number }>(
  entries: T[],
) {
  return [...entries].sort((left, right) => {
    const leftTime = left.confirmedAt ?? left.submittedAt ?? left.at ?? 0;
    const rightTime = right.confirmedAt ?? right.submittedAt ?? right.at ?? 0;
    return rightTime - leftTime;
  });
}

function matchesPendingAction(
  pendingAction: PendingLifecycleAction | null,
  action: LifecycleAction,
  milestoneIndex?: number,
) {
  return Boolean(
    pendingAction &&
      pendingAction.action === action &&
      pendingAction.milestoneIndex === milestoneIndex,
  );
}

function getLatestExecution(
  executions: ExecutionRecord[],
  action: LifecycleAction,
  milestoneIndex?: number,
) {
  return sortByMostRecent(
    executions.filter(
      (execution) =>
        execution.action === action &&
        execution.milestoneIndex === milestoneIndex,
    ),
  )[0];
}

function buildLifecycleCard(input: {
  action: LifecycleAction;
  title: string;
  pendingAction: PendingLifecycleAction | null;
  milestoneIndex?: number;
  latestExecution?: ExecutionRecord;
  isConfirmed: boolean;
  confirmedSummary: string;
  confirmedDetail: string;
  blockedDetail?: string;
  readySummary: string;
  readyDetail: string;
}): LifecycleCard {
  const {
    action,
    blockedDetail,
    confirmedDetail,
    confirmedSummary,
    isConfirmed,
    latestExecution,
    milestoneIndex,
    pendingAction,
    readyDetail,
    readySummary,
    title,
  } = input;

  if (matchesPendingAction(pendingAction, action, milestoneIndex)) {
    return {
      action,
      title,
      phase: 'pending',
      summary: 'Submitting',
      detail: pendingAction?.summary || 'Waiting for the API to confirm the latest request.',
      canTrigger: false,
      timestamp: pendingAction?.startedAt,
    };
  }

  if (isConfirmed) {
    return {
      action,
      title,
      phase: 'confirmed',
      summary: confirmedSummary,
      detail: confirmedDetail,
      canTrigger: false,
      timestamp:
        latestExecution?.confirmedAt ??
        latestExecution?.submittedAt,
      txHash: latestExecution?.txHash,
    };
  }

  if (blockedDetail) {
    return {
      action,
      title,
      phase: 'blocked',
      summary: 'Blocked',
      detail: blockedDetail,
      canTrigger: false,
    };
  }

  if (latestExecution?.status === 'failed') {
    return {
      action,
      title,
      phase: 'failed',
      summary: 'Retry needed',
      detail: latestExecution.failureMessage || readyDetail,
      failureMessage: latestExecution.failureMessage,
      canTrigger: true,
      timestamp: latestExecution.confirmedAt ?? latestExecution.submittedAt,
      txHash: latestExecution.txHash,
    };
  }

  return {
    action,
    title,
    phase: 'ready',
    summary: readySummary,
    detail: readyDetail,
    canTrigger: true,
  };
}

function getMilestoneBlockedReason(
  milestone: MilestoneView | undefined,
  emptyDetail: string,
) {
  if (!milestone) {
    return emptyDetail;
  }

  return null;
}

export function pickInitialMilestoneIndex(job: JobView | null) {
  if (!job || job.milestones.length === 0) {
    return 0;
  }

  const preferredIndex = job.milestones.findIndex((milestone) =>
    ['pending', 'delivered', 'disputed'].includes(milestone.status),
  );

  return preferredIndex >= 0 ? preferredIndex : 0;
}

export function buildJobLifecycleCards(input: {
  job: JobView;
  executions: ExecutionRecord[];
  pendingAction: PendingLifecycleAction | null;
}) {
  const { job, executions, pendingAction } = input;
  const latestFundingExecution = getLatestExecution(executions, 'fund_job');
  const latestMilestoneSetupExecution = getLatestExecution(
    executions,
    'set_milestones',
  );

  return [
    buildLifecycleCard({
      action: 'fund_job',
      title: 'Fund escrow',
      pendingAction,
      latestExecution: latestFundingExecution,
      isConfirmed: job.fundedAmount !== null,
      confirmedSummary: 'Funding confirmed',
      confirmedDetail: `The escrow is funded with ${job.fundedAmount ?? 'the required amount'} and is ready for milestone setup.`,
      readySummary: 'Ready to fund',
      readyDetail:
        'Submit escrow funding before milestones can be committed onchain.',
    }),
    buildLifecycleCard({
      action: 'set_milestones',
      title: 'Commit milestones',
      pendingAction,
      latestExecution: latestMilestoneSetupExecution,
      isConfirmed: job.milestones.length > 0,
      confirmedSummary: 'Milestones committed',
      confirmedDetail: `${job.milestones.length} milestone${job.milestones.length === 1 ? '' : 's'} recorded for this job.`,
      blockedDetail:
        job.fundedAmount === null
          ? 'Funding must be confirmed before milestones can be committed.'
          : undefined,
      readySummary: 'Ready to commit',
      readyDetail:
        'Commit the drafted milestones so the worker can start delivering against named checkpoints.',
    }),
  ];
}

export function buildMilestoneLifecycleCards(input: {
  job: JobView;
  milestoneIndex: number;
  executions: ExecutionRecord[];
  pendingAction: PendingLifecycleAction | null;
}) {
  const { job, milestoneIndex, executions, pendingAction } = input;
  const milestone = job.milestones[milestoneIndex];
  const latestDeliveryExecution = getLatestExecution(
    executions,
    'deliver_milestone',
    milestoneIndex,
  );
  const latestReleaseExecution = getLatestExecution(
    executions,
    'release_milestone',
    milestoneIndex,
  );
  const latestDisputeExecution = getLatestExecution(
    executions,
    'open_dispute',
    milestoneIndex,
  );
  const latestResolutionExecution = getLatestExecution(
    executions,
    'resolve_dispute',
    milestoneIndex,
  );

  const missingMilestoneReason = getMilestoneBlockedReason(
    milestone,
    job.milestones.length === 0
      ? 'Commit milestones first. There is no active milestone to manage yet.'
      : 'Select a valid milestone to continue.',
  );

  return [
    buildLifecycleCard({
      action: 'deliver_milestone',
      title: 'Worker delivery',
      pendingAction,
      milestoneIndex,
      latestExecution: latestDeliveryExecution,
      isConfirmed: Boolean(milestone && milestone.deliveredAt),
      confirmedSummary: 'Delivery recorded',
      confirmedDetail:
        milestone?.deliveryNote?.trim()
          ? milestone.deliveryNote
          : 'The worker has submitted the deliverable and evidence for review.',
      blockedDetail:
        missingMilestoneReason ||
        (milestone?.status !== 'pending'
          ? 'Only pending milestones can be delivered.'
          : undefined),
      readySummary: 'Ready for delivery',
      readyDetail:
        'Submit the delivery note and evidence URLs for the selected milestone.',
    }),
    buildLifecycleCard({
      action: 'release_milestone',
      title: 'Client release',
      pendingAction,
      milestoneIndex,
      latestExecution: latestReleaseExecution,
      isConfirmed: milestone?.status === 'released' && !milestone?.resolutionAction,
      confirmedSummary: 'Released',
      confirmedDetail:
        'The client accepted the milestone and released the payout.',
      blockedDetail:
        missingMilestoneReason ||
        (milestone?.status === 'disputed'
          ? 'This milestone is disputed. Resolve the dispute instead of releasing directly.'
          : milestone?.status === 'refunded'
            ? 'This milestone has already been refunded.'
            : milestone?.status !== 'delivered'
              ? 'Only delivered milestones can be released.'
              : undefined),
      readySummary: 'Ready for release',
      readyDetail:
        'Release payment once the delivery note and evidence are accepted.',
    }),
    buildLifecycleCard({
      action: 'open_dispute',
      title: 'Open dispute',
      pendingAction,
      milestoneIndex,
      latestExecution: latestDisputeExecution,
      isConfirmed: Boolean(milestone?.disputedAt),
      confirmedSummary: 'Dispute opened',
      confirmedDetail:
        milestone?.disputeReason?.trim()
          ? milestone.disputeReason
          : 'The milestone has been escalated for resolution.',
      blockedDetail:
        missingMilestoneReason ||
        (milestone?.status === 'released'
          ? 'This milestone has already been released.'
          : milestone?.status === 'refunded'
            ? 'This milestone has already been refunded.'
            : milestone?.status !== 'delivered'
              ? 'Only delivered milestones can be disputed.'
              : undefined),
      readySummary: 'Ready to dispute',
      readyDetail:
        'Escalate the selected delivered milestone if the submission is contested.',
    }),
    buildLifecycleCard({
      action: 'resolve_dispute',
      title: 'Resolve dispute',
      pendingAction,
      milestoneIndex,
      latestExecution: latestResolutionExecution,
      isConfirmed: Boolean(milestone?.resolutionAction),
      confirmedSummary: 'Resolution recorded',
      confirmedDetail: milestone?.resolutionAction
        ? `Resolved with ${milestone.resolutionAction}.`
        : 'The dispute has been resolved.',
      blockedDetail:
        missingMilestoneReason ||
        (milestone?.status !== 'disputed'
          ? 'Only disputed milestones can be resolved.'
          : undefined),
      readySummary: 'Ready to resolve',
      readyDetail:
        'Operator resolution should only be used when the acting wallet controls the configured arbitrator account.',
    }),
  ];
}

export function buildMilestoneTimelineEntries(milestone: MilestoneView | undefined) {
  if (!milestone) {
    return [];
  }

  const entries: MilestoneTimelineEntry[] = [];

  if (milestone.dueAt) {
    entries.push({
      label: 'Due',
      detail: 'Target delivery checkpoint',
      at: milestone.dueAt,
      tone: 'neutral',
    });
  }

  if (milestone.deliveredAt) {
    entries.push({
      label: 'Delivered',
      detail:
        milestone.deliveryNote?.trim() ||
        'Delivery note and evidence were submitted for review.',
      at: milestone.deliveredAt,
      tone: 'success',
    });
  }

  if (milestone.disputedAt) {
    entries.push({
      label: 'Disputed',
      detail:
        milestone.disputeReason?.trim() || 'Delivery was escalated for operator review.',
      at: milestone.disputedAt,
      tone: 'warning',
    });
  }

  if (milestone.resolvedAt && milestone.resolutionAction) {
    entries.push({
      label: 'Resolved',
      detail: milestone.resolutionNote?.trim()
        ? `${milestone.resolutionAction}: ${milestone.resolutionNote}`
        : `Resolved with ${milestone.resolutionAction}.`,
      at: milestone.resolvedAt,
      tone: milestone.resolutionAction === 'refund' ? 'warning' : 'success',
    });
  } else if (milestone.releasedAt) {
    entries.push({
      label: 'Released',
      detail: 'Payout released to the worker.',
      at: milestone.releasedAt,
      tone: 'success',
    });
  }

  return [...entries].sort((left, right) => left.at - right.at);
}

export function getMilestoneAuditEvents(
  auditEvents: AuditEvent[],
  milestoneIndex: number,
) {
  return sortByMostRecent(
    auditEvents.filter(
      (event) => event.payload.milestoneIndex === milestoneIndex,
    ),
  );
}

export function getJobAuditEvents(auditEvents: AuditEvent[]) {
  return sortByMostRecent(
    auditEvents.filter((event) => event.payload.milestoneIndex === undefined),
  );
}

export function getMilestoneExecutions(
  executions: ExecutionRecord[],
  milestoneIndex: number,
) {
  return sortByMostRecent(
    executions.filter((execution) => execution.milestoneIndex === milestoneIndex),
  );
}

export function getJobExecutions(executions: ExecutionRecord[]) {
  return sortByMostRecent(
    executions.filter((execution) => execution.milestoneIndex === undefined),
  );
}
