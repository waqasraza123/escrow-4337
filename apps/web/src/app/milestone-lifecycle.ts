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

export type WebLifecycleMessages = {
  submitting: string;
  waitingForApiConfirmation: string;
  blocked: string;
  retryNeeded: string;
  fundingConfirmedSummary: string;
  fundingConfirmedDetail: (fundedAmount: string | null) => string;
  readyToFundSummary: string;
  readyToFundDetail: string;
  commitMilestonesTitle: string;
  fundEscrowTitle: string;
  milestonesCommittedSummary: string;
  milestonesCommittedDetail: (count: number) => string;
  fundingRequiredBeforeMilestones: string;
  readyToCommitSummary: string;
  readyToCommitDetail: string;
  commitMilestonesFirst: string;
  selectValidMilestone: string;
  workerDeliveryTitle: string;
  deliveryRecordedSummary: string;
  deliveryRecordedDetail: string;
  pendingMilestonesOnly: string;
  readyForDeliverySummary: string;
  readyForDeliveryDetail: string;
  clientReleaseTitle: string;
  releasedSummary: string;
  releasedDetail: string;
  resolveInsteadOfRelease: string;
  alreadyRefunded: string;
  deliveredOnlyForRelease: string;
  readyForReleaseSummary: string;
  readyForReleaseDetail: string;
  openDisputeTitle: string;
  disputeOpenedSummary: string;
  disputeOpenedDetail: string;
  alreadyReleased: string;
  deliveredOnlyForDispute: string;
  readyToDisputeSummary: string;
  readyToDisputeDetail: string;
  resolveDisputeTitle: string;
  resolutionRecordedSummary: string;
  resolutionRecordedDetail: (action: string) => string;
  resolutionRecordedFallback: string;
  disputedOnlyForResolution: string;
  readyToResolveSummary: string;
  readyToResolveDetail: string;
  timelineDue: string;
  timelineDueDetail: string;
  timelineDelivered: string;
  timelineDeliveredDetail: string;
  timelineDisputed: string;
  timelineDisputedDetail: string;
  timelineResolved: string;
  timelineResolvedDetail: (action: string) => string;
  timelineReleased: string;
  timelineReleasedDetail: string;
};

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
  copy: WebLifecycleMessages;
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
    copy,
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
      summary: copy.submitting,
      detail: pendingAction?.summary || copy.waitingForApiConfirmation,
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
      summary: copy.blocked,
      detail: blockedDetail,
      canTrigger: false,
    };
  }

  if (latestExecution?.status === 'failed') {
    return {
      action,
      title,
      phase: 'failed',
      summary: copy.retryNeeded,
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
  copy: WebLifecycleMessages;
}) {
  const { copy, job, executions, pendingAction } = input;
  const latestFundingExecution = getLatestExecution(executions, 'fund_job');
  const latestMilestoneSetupExecution = getLatestExecution(
    executions,
    'set_milestones',
  );

  return [
    buildLifecycleCard({
      action: 'fund_job',
      title: copy.fundEscrowTitle,
      copy,
      pendingAction,
      latestExecution: latestFundingExecution,
      isConfirmed: job.fundedAmount !== null,
      confirmedSummary: copy.fundingConfirmedSummary,
      confirmedDetail: copy.fundingConfirmedDetail(job.fundedAmount),
      readySummary: copy.readyToFundSummary,
      readyDetail: copy.readyToFundDetail,
    }),
    buildLifecycleCard({
      action: 'set_milestones',
      title: copy.commitMilestonesTitle,
      copy,
      pendingAction,
      latestExecution: latestMilestoneSetupExecution,
      isConfirmed: job.milestones.length > 0,
      confirmedSummary: copy.milestonesCommittedSummary,
      confirmedDetail: copy.milestonesCommittedDetail(job.milestones.length),
      blockedDetail:
        job.fundedAmount === null
          ? copy.fundingRequiredBeforeMilestones
          : undefined,
      readySummary: copy.readyToCommitSummary,
      readyDetail: copy.readyToCommitDetail,
    }),
  ];
}

export function buildMilestoneLifecycleCards(input: {
  job: JobView;
  milestoneIndex: number;
  executions: ExecutionRecord[];
  pendingAction: PendingLifecycleAction | null;
  copy: WebLifecycleMessages;
}) {
  const { copy, job, milestoneIndex, executions, pendingAction } = input;
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
      ? copy.commitMilestonesFirst
      : copy.selectValidMilestone,
  );

  return [
    buildLifecycleCard({
      action: 'deliver_milestone',
      title: copy.workerDeliveryTitle,
      copy,
      pendingAction,
      milestoneIndex,
      latestExecution: latestDeliveryExecution,
      isConfirmed: Boolean(milestone && milestone.deliveredAt),
      confirmedSummary: copy.deliveryRecordedSummary,
      confirmedDetail:
        milestone?.deliveryNote?.trim()
          ? milestone.deliveryNote
          : copy.deliveryRecordedDetail,
      blockedDetail:
        missingMilestoneReason ||
        (milestone?.status !== 'pending'
          ? copy.pendingMilestonesOnly
          : undefined),
      readySummary: copy.readyForDeliverySummary,
      readyDetail: copy.readyForDeliveryDetail,
    }),
    buildLifecycleCard({
      action: 'release_milestone',
      title: copy.clientReleaseTitle,
      copy,
      pendingAction,
      milestoneIndex,
      latestExecution: latestReleaseExecution,
      isConfirmed: milestone?.status === 'released' && !milestone?.resolutionAction,
      confirmedSummary: copy.releasedSummary,
      confirmedDetail: copy.releasedDetail,
      blockedDetail:
        missingMilestoneReason ||
        (milestone?.status === 'disputed'
          ? copy.resolveInsteadOfRelease
          : milestone?.status === 'refunded'
            ? copy.alreadyRefunded
            : milestone?.status !== 'delivered'
              ? copy.deliveredOnlyForRelease
              : undefined),
      readySummary: copy.readyForReleaseSummary,
      readyDetail: copy.readyForReleaseDetail,
    }),
    buildLifecycleCard({
      action: 'open_dispute',
      title: copy.openDisputeTitle,
      copy,
      pendingAction,
      milestoneIndex,
      latestExecution: latestDisputeExecution,
      isConfirmed: Boolean(milestone?.disputedAt),
      confirmedSummary: copy.disputeOpenedSummary,
      confirmedDetail:
        milestone?.disputeReason?.trim()
          ? milestone.disputeReason
          : copy.disputeOpenedDetail,
      blockedDetail:
        missingMilestoneReason ||
        (milestone?.status === 'released'
          ? copy.alreadyReleased
          : milestone?.status === 'refunded'
            ? copy.alreadyRefunded
            : milestone?.status !== 'delivered'
              ? copy.deliveredOnlyForDispute
              : undefined),
      readySummary: copy.readyToDisputeSummary,
      readyDetail: copy.readyToDisputeDetail,
    }),
    buildLifecycleCard({
      action: 'resolve_dispute',
      title: copy.resolveDisputeTitle,
      copy,
      pendingAction,
      milestoneIndex,
      latestExecution: latestResolutionExecution,
      isConfirmed: Boolean(milestone?.resolutionAction),
      confirmedSummary: copy.resolutionRecordedSummary,
      confirmedDetail: milestone?.resolutionAction
        ? copy.resolutionRecordedDetail(milestone.resolutionAction)
        : copy.resolutionRecordedFallback,
      blockedDetail:
        missingMilestoneReason ||
        (milestone?.status !== 'disputed'
          ? copy.disputedOnlyForResolution
          : undefined),
      readySummary: copy.readyToResolveSummary,
      readyDetail: copy.readyToResolveDetail,
    }),
  ];
}

export function buildMilestoneTimelineEntries(
  milestone: MilestoneView | undefined,
  copy: WebLifecycleMessages,
) {
  if (!milestone) {
    return [];
  }

  const entries: MilestoneTimelineEntry[] = [];

  if (milestone.dueAt) {
    entries.push({
      label: copy.timelineDue,
      detail: copy.timelineDueDetail,
      at: milestone.dueAt,
      tone: 'neutral',
    });
  }

  if (milestone.deliveredAt) {
    entries.push({
      label: copy.timelineDelivered,
      detail:
        milestone.deliveryNote?.trim() ||
        copy.timelineDeliveredDetail,
      at: milestone.deliveredAt,
      tone: 'success',
    });
  }

  if (milestone.disputedAt) {
    entries.push({
      label: copy.timelineDisputed,
      detail:
        milestone.disputeReason?.trim() || copy.timelineDisputedDetail,
      at: milestone.disputedAt,
      tone: 'warning',
    });
  }

  if (milestone.resolvedAt && milestone.resolutionAction) {
    entries.push({
      label: copy.timelineResolved,
      detail: milestone.resolutionNote?.trim()
        ? `${milestone.resolutionAction}: ${milestone.resolutionNote}`
        : copy.timelineResolvedDetail(milestone.resolutionAction),
      at: milestone.resolvedAt,
      tone: milestone.resolutionAction === 'refund' ? 'warning' : 'success',
    });
  } else if (milestone.releasedAt) {
    entries.push({
      label: copy.timelineReleased,
      detail: copy.timelineReleasedDetail,
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
