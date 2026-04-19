import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ESCROW_REPOSITORY } from '../../persistence/persistence.tokens';
import type { EscrowRepository } from '../../persistence/persistence.types';
import { UserCapabilitiesService } from '../users/user-capabilities.service';
import type {
  EscrowFailureRemediationStatus,
  EscrowExecutionRecord,
  EscrowJobRecord,
} from '../escrow/escrow.types';
import { buildExecutionTraceSummary } from '../escrow/escrow-execution-traces';
import { EscrowOnchainAuthorityService } from './escrow-onchain-authority.service';
import type {
  EscrowAttentionReason,
  EscrowFailureGuidance,
  EscrowExecutionFailureWorkflowMutationResponse,
  EscrowFailedExecutionSummary,
  EscrowHealthJob,
  EscrowHealthReport,
  EscrowStaleWorkflowMutationResponse,
} from './escrow-health.types';
import { OperationsConfigService } from './operations.config';
import { EscrowReconciliationService } from './escrow-reconciliation.service';

type EscrowHealthReportOptions = {
  reason?: EscrowAttentionReason;
  limit?: number;
};

function latestActivityAt(job: EscrowJobRecord) {
  const auditTimes = job.audit.map((event) => event.at);
  const executionTimes = job.executions.map(
    (execution) => execution.confirmedAt ?? execution.submittedAt,
  );
  const milestoneTimes = job.milestones.flatMap((milestone) =>
    [
      milestone.dueAt,
      milestone.deliveredAt,
      milestone.disputedAt,
      milestone.releasedAt,
      milestone.resolvedAt,
    ].filter((value): value is number => typeof value === 'number'),
  );
  const times = [
    job.updatedAt,
    job.createdAt,
    ...auditTimes,
    ...executionTimes,
    ...milestoneTimes,
  ];

  return Math.max(...times);
}

function failureTimestamp(execution: EscrowExecutionRecord) {
  return execution.confirmedAt ?? execution.submittedAt;
}

function compareFailuresDescending(
  left: EscrowExecutionRecord,
  right: EscrowExecutionRecord,
) {
  return failureTimestamp(right) - failureTimestamp(left);
}

function summarizeFailedExecution(
  execution: EscrowExecutionRecord,
): EscrowFailedExecutionSummary {
  return {
    action: execution.action,
    submittedAt: execution.submittedAt,
    txHash: execution.txHash ?? null,
    requestId: execution.requestId ?? null,
    correlationId: execution.correlationId ?? null,
    idempotencyKey: execution.idempotencyKey ?? null,
    operationKey: execution.operationKey ?? null,
    failureCode: execution.failureCode ?? null,
    failureMessage: execution.failureMessage ?? null,
    milestoneIndex: execution.milestoneIndex ?? null,
  };
}

function buildFailedExecutionDiagnostics(executions: EscrowExecutionRecord[]) {
  const failures = executions
    .filter((execution) => execution.status === 'failed')
    .sort(compareFailuresDescending);
  if (failures.length === 0) {
    return null;
  }
  const traceSummary = buildExecutionTraceSummary(failures);

  const actionCounts = new Map<
    EscrowExecutionRecord['action'],
    {
      count: number;
      latestAt: number;
    }
  >();
  const failureCodeCounts = new Map<
    string,
    {
      failureCode: string | null;
      count: number;
      latestAt: number;
      latestMessage: string | null;
    }
  >();

  for (const failure of failures) {
    const at = failureTimestamp(failure);
    const existingAction = actionCounts.get(failure.action);
    actionCounts.set(failure.action, {
      count: (existingAction?.count ?? 0) + 1,
      latestAt: existingAction?.latestAt ?? at,
    });

    const failureCode = failure.failureCode ?? null;
    const failureKey = failureCode ?? '__unknown__';
    const existingFailureCode = failureCodeCounts.get(failureKey);
    failureCodeCounts.set(failureKey, {
      failureCode,
      count: (existingFailureCode?.count ?? 0) + 1,
      latestAt: existingFailureCode?.latestAt ?? at,
      latestMessage:
        existingFailureCode?.latestMessage ?? failure.failureMessage ?? null,
    });
  }

  return {
    firstFailureAt: failureTimestamp(failures[failures.length - 1]),
    latestFailureAt: failureTimestamp(failures[0]),
    traceCoverage: {
      totalFailures: failures.length,
      correlationTaggedFailures: traceSummary.correlationTaggedExecutions,
      requestTaggedFailures: traceSummary.requestTaggedExecutions,
      idempotentFailures: traceSummary.idempotentExecutions,
      operationTaggedFailures: traceSummary.operationTaggedExecutions,
      uncorrelatedFailures: traceSummary.failedWithoutCorrelation,
    },
    actionBreakdown: Array.from(actionCounts.entries())
      .map(([action, value]) => ({
        action,
        count: value.count,
        latestAt: value.latestAt,
      }))
      .sort(
        (left, right) =>
          right.count - left.count ||
          right.latestAt - left.latestAt ||
          left.action.localeCompare(right.action),
      )
      .slice(0, 3)
      .map(({ action, count }) => ({
        action,
        count,
      })),
    failureCodeBreakdown: Array.from(failureCodeCounts.values())
      .sort(
        (left, right) =>
          right.count - left.count ||
          right.latestAt - left.latestAt ||
          (left.failureCode ?? '').localeCompare(right.failureCode ?? ''),
      )
      .slice(0, 3)
      .map(({ failureCode, count, latestMessage }) => ({
        failureCode,
        count,
        latestMessage,
      })),
    traceBreakdown: traceSummary.traces.slice(0, 3).map((trace) => ({
      traceId: trace.traceId,
      correlationId: trace.correlationId,
      count: trace.statusCounts.failed,
      latestAt: trace.latestSubmittedAt,
      actions: trace.actions,
      requestIds: trace.requestIds,
      idempotencyKeys: trace.idempotencyKeys,
      operationKeys: trace.operationKeys,
    })),
    recentFailures: failures.slice(0, 3).map(summarizeFailedExecution),
  };
}

function normalizeFailureWorkflowStatus(
  status?: EscrowFailureRemediationStatus,
): EscrowFailureRemediationStatus {
  switch (status) {
    case 'blocked_external':
    case 'monitoring':
    case 'ready_to_retry':
      return status;
    case 'investigating':
    default:
      return 'investigating';
  }
}

function defaultFailureWorkflowStatus(
  guidance: EscrowFailureGuidance,
): EscrowFailureRemediationStatus {
  return guidance.retryPosture === 'wait_for_external_fix'
    ? 'blocked_external'
    : 'investigating';
}

function inferFailureGuidance(
  failedExecutions: number,
  diagnostics: NonNullable<ReturnType<typeof buildFailedExecutionDiagnostics>>,
): EscrowFailureGuidance {
  const latestFailure = diagnostics.recentFailures[0];
  const latestSignal = `${latestFailure?.failureCode ?? ''} ${
    latestFailure?.failureMessage ?? ''
  }`.toLowerCase();

  const severity: EscrowFailureGuidance['severity'] =
    failedExecutions >= 3 ? 'critical' : 'warning';

  if (latestSignal.includes('paymaster') || latestSignal.includes('sponsor')) {
    return {
      severity,
      responsibleSurface: 'paymaster_or_sponsor',
      retryPosture: 'wait_for_external_fix',
      summary: 'Sponsorship or paymaster infrastructure is blocking execution.',
      recommendedActions: [
        'Verify sponsor or paymaster health, quota, and account balance.',
        'Retry only after sponsorship capacity or policy is restored.',
        'Check provider logs for the rejected sponsorship decision.',
      ],
    };
  }

  if (
    latestSignal.includes('relay') ||
    latestSignal.includes('bundler rejected')
  ) {
    return {
      severity,
      responsibleSurface: 'wallet_relay',
      retryPosture: 'wait_for_external_fix',
      summary: 'The relay path is rejecting or dropping the execution request.',
      recommendedActions: [
        'Inspect relay request logs and provider-side rejection details.',
        'Confirm the payload still matches current on-chain job state.',
        'Retry only after the relay issue or rejection reason is understood.',
      ],
    };
  }

  if (
    latestSignal.includes('bundler') ||
    latestSignal.includes('simulation') ||
    latestSignal.includes('validation') ||
    latestSignal.includes('entrypoint')
  ) {
    return {
      severity,
      responsibleSurface: 'bundler',
      retryPosture: 'hold_for_configuration_change',
      summary:
        'Bundler or simulation validation is rejecting the execution payload.',
      recommendedActions: [
        'Review bundler validation output for failing calldata or gas assumptions.',
        'Confirm smart-account, entry-point, and chain configuration are correct.',
        'Only retry after the failing validation condition is resolved.',
      ],
    };
  }

  if (
    latestSignal.includes('timeout') ||
    latestSignal.includes('network') ||
    latestSignal.includes('rpc') ||
    latestSignal.includes('unavailable')
  ) {
    return {
      severity,
      responsibleSurface: 'rpc_or_provider',
      retryPosture: 'safe_after_review',
      summary: 'Network or provider instability interrupted execution.',
      recommendedActions: [
        'Check RPC and upstream provider health before retrying.',
        'Confirm the last known job state is unchanged.',
        'Retry after provider health stabilizes and monitoring is in place.',
      ],
    };
  }

  if (
    latestSignal.includes('allowance') ||
    latestSignal.includes('insufficient') ||
    latestSignal.includes('missing') ||
    latestSignal.includes('invalid')
  ) {
    return {
      severity,
      responsibleSurface: 'operator_input',
      retryPosture: 'hold_for_configuration_change',
      summary:
        'The failure pattern suggests missing prerequisites or invalid execution input.',
      recommendedActions: [
        'Validate wallet funding, approvals, and job preconditions.',
        'Check whether the requested action still matches the persisted job state.',
        'Retry only after the missing prerequisite or invalid input is corrected.',
      ],
    };
  }

  return {
    severity,
    responsibleSurface: 'unknown',
    retryPosture: 'hold_for_configuration_change',
    summary:
      'The failure pattern is not yet classified; operator investigation is required before retry.',
    recommendedActions: [
      'Review provider logs and the recent failed attempts for a shared signal.',
      'Verify current escrow state before attempting another mutation.',
      'Document the likely cause in the workflow note before retrying.',
    ],
  };
}

function sortReasons(reasons: Set<EscrowAttentionReason>) {
  const order: EscrowAttentionReason[] = [
    'open_dispute',
    'failed_execution',
    'reconciliation_drift',
    'chain_sync_backlog',
    'stale_job',
  ];

  return order.filter((reason) => reasons.has(reason));
}

function attentionPriority(reasons: EscrowAttentionReason[]) {
  if (reasons.includes('open_dispute')) {
    return 0;
  }

  if (reasons.includes('failed_execution')) {
    return 1;
  }

  if (reasons.includes('reconciliation_drift')) {
    return 2;
  }

  if (reasons.includes('chain_sync_backlog')) {
    return 3;
  }

  if (reasons.includes('stale_job')) {
    return 4;
  }

  return 5;
}

function isJobCurrentlyStale(job: EscrowJobRecord, staleCutoff: number) {
  if (job.status === 'completed' || job.status === 'resolved') {
    return false;
  }

  return latestActivityAt(job) <= staleCutoff;
}

function buildChainSyncStatus(
  job: EscrowJobRecord,
  now: number,
  backlogCutoff: number,
): EscrowHealthJob['chainSync'] {
  if (!job.onchain.escrowId) {
    return null;
  }

  const chainSync = job.operations.chainSync;
  if (!chainSync) {
    const activityAt = latestActivityAt(job);
    return {
      status: activityAt <= backlogCutoff ? 'stale' : 'pending_initial_sync',
      staleForMs: activityAt <= backlogCutoff ? now - activityAt : null,
      lastAttemptedAt: null,
      lastSuccessfulAt: null,
      lastPersistedAt: null,
      lastMode: null,
      lastOutcome: null,
      lastSyncedBlock: null,
      lastIssueCount: 0,
      lastCriticalIssueCount: 0,
      lastReconciliationIssueCount: 0,
      lastErrorMessage: null,
    };
  }

  const lastSuccessfulAt = chainSync.lastSuccessfulAt ?? null;
  const staleAnchor = lastSuccessfulAt ?? chainSync.lastAttemptedAt;
  const isFailing =
    chainSync.lastOutcome === 'failed' &&
    chainSync.lastAttemptedAt >= (lastSuccessfulAt ?? 0);
  const isStale =
    !isFailing &&
    ((lastSuccessfulAt === null && latestActivityAt(job) <= backlogCutoff) ||
      (lastSuccessfulAt !== null && lastSuccessfulAt <= backlogCutoff));

  return {
    status: isFailing
      ? 'failing'
      : isStale
        ? 'stale'
        : lastSuccessfulAt === null
          ? 'pending_initial_sync'
          : 'healthy',
    staleForMs:
      (isFailing || isStale) && staleAnchor < now ? now - staleAnchor : null,
    lastAttemptedAt: chainSync.lastAttemptedAt,
    lastSuccessfulAt,
    lastPersistedAt: chainSync.lastPersistedAt ?? null,
    lastMode: chainSync.lastMode,
    lastOutcome: chainSync.lastOutcome,
    lastSyncedBlock: chainSync.lastSyncedBlock ?? null,
    lastIssueCount: chainSync.lastIssueCount,
    lastCriticalIssueCount: chainSync.lastCriticalIssueCount,
    lastReconciliationIssueCount: chainSync.lastReconciliationIssueCount,
    lastErrorMessage: chainSync.lastErrorMessage ?? null,
  };
}

@Injectable()
export class EscrowHealthService {
  constructor(
    @Inject(ESCROW_REPOSITORY)
    private readonly escrowRepository: EscrowRepository,
    private readonly userCapabilities: UserCapabilitiesService,
    private readonly operationsConfig: OperationsConfigService,
    private readonly reconciliationService: EscrowReconciliationService,
    private readonly escrowOnchainAuthority: EscrowOnchainAuthorityService,
  ) {}

  async getReport(
    userId: string,
    options: EscrowHealthReportOptions = {},
    now = Date.now(),
  ): Promise<EscrowHealthReport> {
    await this.requireOperatorAccess(userId);

    const jobs = await this.escrowRepository.listAll();
    const staleCutoff = now - this.operationsConfig.escrowStaleJobMs;
    const chainSyncBacklogCutoff =
      now - this.operationsConfig.escrowChainSyncBacklogMs;
    const normalizedReason = options.reason ?? null;
    const normalizedLimit = Math.min(
      options.limit ?? this.operationsConfig.escrowHealthDefaultLimit,
      this.operationsConfig.escrowHealthMaxLimit,
    );

    const allAttentionJobs = (
      await Promise.all(
        jobs.map((job) =>
          this.buildJobSummary(job, staleCutoff, chainSyncBacklogCutoff, now),
        ),
      )
    )
      .filter((job) => job.reasons.length > 0)
      .sort((left, right) => {
        const leftPriority = attentionPriority(left.reasons);
        const rightPriority = attentionPriority(right.reasons);
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        if (left.reasons.length !== right.reasons.length) {
          return right.reasons.length - left.reasons.length;
        }

        return left.latestActivityAt - right.latestActivityAt;
      });
    const matchedJobs = normalizedReason
      ? allAttentionJobs.filter((job) => job.reasons.includes(normalizedReason))
      : allAttentionJobs;
    const limitedJobs = matchedJobs.slice(0, normalizedLimit);

    return {
      generatedAt: new Date(now).toISOString(),
      filters: {
        reason: normalizedReason,
        limit: normalizedLimit,
      },
      thresholds: {
        chainSyncBacklogHours:
          this.operationsConfig.escrowChainSyncBacklogHours,
        chainSyncBacklogMs: this.operationsConfig.escrowChainSyncBacklogMs,
        staleJobHours: this.operationsConfig.escrowStaleJobHours,
        staleJobMs: this.operationsConfig.escrowStaleJobMs,
        defaultLimit: this.operationsConfig.escrowHealthDefaultLimit,
        maxLimit: this.operationsConfig.escrowHealthMaxLimit,
      },
      summary: {
        totalJobs: jobs.length,
        jobsNeedingAttention: allAttentionJobs.length,
        matchedJobs: matchedJobs.length,
        chainSyncBacklogJobs: matchedJobs.filter((job) =>
          job.reasons.includes('chain_sync_backlog'),
        ).length,
        openDisputeJobs: matchedJobs.filter((job) =>
          job.reasons.includes('open_dispute'),
        ).length,
        reconciliationDriftJobs: matchedJobs.filter((job) =>
          job.reasons.includes('reconciliation_drift'),
        ).length,
        failedExecutionJobs: matchedJobs.filter((job) =>
          job.reasons.includes('failed_execution'),
        ).length,
        staleJobs: matchedJobs.filter((job) =>
          job.reasons.includes('stale_job'),
        ).length,
      },
      jobs: limitedJobs,
    };
  }

  async claimStaleJob(
    userId: string,
    jobId: string,
    input: {
      note?: string;
    },
    now = Date.now(),
  ): Promise<EscrowStaleWorkflowMutationResponse> {
    const user = await this.requireOperatorAccess(userId);
    const job = await this.requireJob(jobId);
    const staleCutoff = now - this.operationsConfig.escrowStaleJobMs;
    const chainSyncBacklogCutoff =
      now - this.operationsConfig.escrowChainSyncBacklogMs;

    if (!isJobCurrentlyStale(job, staleCutoff)) {
      throw new ConflictException('Job is not currently stale');
    }

    const existingWorkflow = job.operations.staleWorkflow;
    if (existingWorkflow && existingWorkflow.claimedByUserId !== user.id) {
      throw new ConflictException(
        'Stale workflow is already claimed by another operator',
      );
    }

    job.operations.staleWorkflow = {
      claimedByUserId: user.id,
      claimedByEmail: user.email,
      claimedAt: existingWorkflow?.claimedAt ?? now,
      note: input.note?.trim() || existingWorkflow?.note,
      updatedAt: now,
    };
    await this.escrowRepository.save(job);

    return {
      job: await this.buildJobSummary(
        job,
        staleCutoff,
        chainSyncBacklogCutoff,
        now,
      ),
    };
  }

  async claimExecutionFailureWorkflow(
    userId: string,
    jobId: string,
    input: {
      note?: string;
      status?: EscrowFailureRemediationStatus;
    },
    now = Date.now(),
  ): Promise<EscrowExecutionFailureWorkflowMutationResponse> {
    const user = await this.requireOperatorAccess(userId);
    const job = await this.requireJob(jobId);
    const staleCutoff = now - this.operationsConfig.escrowStaleJobMs;
    const chainSyncBacklogCutoff =
      now - this.operationsConfig.escrowChainSyncBacklogMs;
    const failedExecutionDiagnostics =
      this.requireFailedExecutionDiagnostics(job);
    const guidance = inferFailureGuidance(
      job.executions.filter((execution) => execution.status === 'failed')
        .length,
      failedExecutionDiagnostics,
    );
    const existingWorkflow = job.operations.executionFailureWorkflow;

    if (existingWorkflow && existingWorkflow.claimedByUserId !== user.id) {
      throw new ConflictException(
        'Execution-failure workflow is already claimed by another operator',
      );
    }

    job.operations.executionFailureWorkflow = {
      claimedByUserId: user.id,
      claimedByEmail: user.email,
      claimedAt: existingWorkflow?.claimedAt ?? now,
      status: normalizeFailureWorkflowStatus(
        input.status ??
          existingWorkflow?.status ??
          defaultFailureWorkflowStatus(guidance),
      ),
      acknowledgedFailureAt: existingWorkflow?.acknowledgedFailureAt,
      note: input.note?.trim() || existingWorkflow?.note,
      updatedAt: now,
    };
    await this.escrowRepository.save(job);

    return {
      job: await this.buildJobSummary(
        job,
        staleCutoff,
        chainSyncBacklogCutoff,
        now,
        failedExecutionDiagnostics,
      ),
    };
  }

  async acknowledgeExecutionFailures(
    userId: string,
    jobId: string,
    input: {
      note?: string;
      status?: EscrowFailureRemediationStatus;
    },
    now = Date.now(),
  ): Promise<EscrowExecutionFailureWorkflowMutationResponse> {
    const user = await this.requireOperatorAccess(userId);
    const job = await this.requireJob(jobId);
    const staleCutoff = now - this.operationsConfig.escrowStaleJobMs;
    const chainSyncBacklogCutoff =
      now - this.operationsConfig.escrowChainSyncBacklogMs;
    const failedExecutionDiagnostics =
      this.requireFailedExecutionDiagnostics(job);
    const existingWorkflow = job.operations.executionFailureWorkflow;

    if (!existingWorkflow) {
      throw new ConflictException(
        'Execution-failure workflow must be claimed before acknowledgement',
      );
    }

    if (existingWorkflow.claimedByUserId !== user.id) {
      throw new ConflictException(
        'Only the current execution-failure owner can acknowledge failures',
      );
    }

    job.operations.executionFailureWorkflow = {
      ...existingWorkflow,
      status: normalizeFailureWorkflowStatus(
        input.status ?? existingWorkflow.status,
      ),
      acknowledgedFailureAt: failedExecutionDiagnostics.latestFailureAt,
      note: input.note?.trim() || existingWorkflow.note,
      updatedAt: now,
    };
    await this.escrowRepository.save(job);

    return {
      job: await this.buildJobSummary(
        job,
        staleCutoff,
        chainSyncBacklogCutoff,
        now,
        failedExecutionDiagnostics,
      ),
    };
  }

  async releaseExecutionFailureWorkflow(
    userId: string,
    jobId: string,
    now = Date.now(),
  ): Promise<EscrowExecutionFailureWorkflowMutationResponse> {
    const user = await this.requireOperatorAccess(userId);
    const job = await this.requireJob(jobId);
    const staleCutoff = now - this.operationsConfig.escrowStaleJobMs;
    const chainSyncBacklogCutoff =
      now - this.operationsConfig.escrowChainSyncBacklogMs;
    const failedExecutionDiagnostics =
      this.requireFailedExecutionDiagnostics(job);
    const existingWorkflow = job.operations.executionFailureWorkflow;

    if (!existingWorkflow) {
      throw new ConflictException(
        'Execution-failure workflow is not currently claimed',
      );
    }

    if (existingWorkflow.claimedByUserId !== user.id) {
      throw new ConflictException(
        'Only the current execution-failure owner can release the claim',
      );
    }

    job.operations.executionFailureWorkflow = null;
    await this.escrowRepository.save(job);

    return {
      job: await this.buildJobSummary(
        job,
        staleCutoff,
        chainSyncBacklogCutoff,
        now,
        failedExecutionDiagnostics,
      ),
    };
  }

  async updateExecutionFailureWorkflow(
    userId: string,
    jobId: string,
    input: {
      note?: string;
      status?: EscrowFailureRemediationStatus;
    },
    now = Date.now(),
  ): Promise<EscrowExecutionFailureWorkflowMutationResponse> {
    const user = await this.requireOperatorAccess(userId);
    const job = await this.requireJob(jobId);
    const staleCutoff = now - this.operationsConfig.escrowStaleJobMs;
    const chainSyncBacklogCutoff =
      now - this.operationsConfig.escrowChainSyncBacklogMs;
    const failedExecutionDiagnostics =
      this.requireFailedExecutionDiagnostics(job);
    const existingWorkflow = job.operations.executionFailureWorkflow;

    if (!existingWorkflow) {
      throw new ConflictException(
        'Execution-failure workflow must be claimed before it can be updated',
      );
    }

    if (existingWorkflow.claimedByUserId !== user.id) {
      throw new ConflictException(
        'Only the current execution-failure owner can update the workflow',
      );
    }

    job.operations.executionFailureWorkflow = {
      ...existingWorkflow,
      status: normalizeFailureWorkflowStatus(
        input.status ?? existingWorkflow.status,
      ),
      note: input.note?.trim() || existingWorkflow.note,
      updatedAt: now,
    };
    await this.escrowRepository.save(job);

    return {
      job: await this.buildJobSummary(
        job,
        staleCutoff,
        chainSyncBacklogCutoff,
        now,
        failedExecutionDiagnostics,
      ),
    };
  }

  async releaseStaleJob(
    userId: string,
    jobId: string,
    now = Date.now(),
  ): Promise<EscrowStaleWorkflowMutationResponse> {
    const user = await this.requireOperatorAccess(userId);
    const job = await this.requireJob(jobId);
    const staleCutoff = now - this.operationsConfig.escrowStaleJobMs;
    const chainSyncBacklogCutoff =
      now - this.operationsConfig.escrowChainSyncBacklogMs;
    const existingWorkflow = job.operations.staleWorkflow;

    if (!existingWorkflow) {
      throw new ConflictException('Stale workflow is not currently claimed');
    }

    if (existingWorkflow.claimedByUserId !== user.id) {
      throw new ConflictException(
        'Only the current stale-workflow owner can release the claim',
      );
    }

    job.operations.staleWorkflow = null;
    await this.escrowRepository.save(job);

    return {
      job: await this.buildJobSummary(
        job,
        staleCutoff,
        chainSyncBacklogCutoff,
        now,
      ),
    };
  }

  private async buildJobSummary(
    job: EscrowJobRecord,
    staleCutoff: number,
    chainSyncBacklogCutoff: number,
    now: number,
    failedExecutionDiagnostics = buildFailedExecutionDiagnostics(
      job.executions,
    ),
  ): Promise<EscrowHealthJob> {
    const merged = await this.escrowOnchainAuthority.mergeJob(job, now);
    const effectiveJob = merged.job;
    const latestActivity = latestActivityAt(effectiveJob);
    const openDisputes = effectiveJob.milestones.filter(
      (milestone) => milestone.status === 'disputed',
    ).length;
    const failedExecutions = effectiveJob.executions.filter(
      (execution) => execution.status === 'failed',
    ).length;
    const reconciliation = this.reconciliationService.buildReport(effectiveJob);
    const failureGuidance = failedExecutionDiagnostics
      ? inferFailureGuidance(failedExecutions, failedExecutionDiagnostics)
      : null;
    const chainSync = buildChainSyncStatus(job, now, chainSyncBacklogCutoff);
    const reasons = new Set<EscrowAttentionReason>();

    if (openDisputes > 0) {
      reasons.add('open_dispute');
    }

    if (failedExecutions > 0) {
      reasons.add('failed_execution');
    }

    if (reconciliation) {
      reasons.add('reconciliation_drift');
    }

    if (
      chainSync &&
      chainSync.status !== 'healthy' &&
      chainSync.status !== 'pending_initial_sync'
    ) {
      reasons.add('chain_sync_backlog');
    }

    if (
      effectiveJob.status !== 'completed' &&
      effectiveJob.status !== 'resolved' &&
      latestActivity <= staleCutoff
    ) {
      reasons.add('stale_job');
    }

    return {
      jobId: effectiveJob.id,
      title: effectiveJob.title,
      status: effectiveJob.status,
      updatedAt: effectiveJob.updatedAt,
      latestActivityAt: latestActivity,
      staleForMs:
        reasons.has('stale_job') && latestActivity < now
          ? now - latestActivity
          : null,
      reasons: sortReasons(reasons),
      counts: {
        chainSyncBacklog:
          chainSync?.status === 'stale' || chainSync?.status === 'failing',
        openDisputes,
        failedExecutions,
      },
      chainSync,
      executionFailureWorkflow:
        effectiveJob.operations.executionFailureWorkflow &&
        failedExecutionDiagnostics
          ? {
              claimedByUserId:
                effectiveJob.operations.executionFailureWorkflow
                  .claimedByUserId,
              claimedByEmail:
                effectiveJob.operations.executionFailureWorkflow.claimedByEmail,
              claimedAt:
                effectiveJob.operations.executionFailureWorkflow.claimedAt,
              status: normalizeFailureWorkflowStatus(
                effectiveJob.operations.executionFailureWorkflow.status,
              ),
              acknowledgedFailureAt:
                effectiveJob.operations.executionFailureWorkflow
                  .acknowledgedFailureAt ?? null,
              note:
                effectiveJob.operations.executionFailureWorkflow.note ?? null,
              updatedAt:
                effectiveJob.operations.executionFailureWorkflow.updatedAt,
              latestFailureNeedsAcknowledgement:
                (effectiveJob.operations.executionFailureWorkflow
                  .acknowledgedFailureAt ?? 0) <
                failedExecutionDiagnostics.latestFailureAt,
            }
          : null,
      staleWorkflow: effectiveJob.operations.staleWorkflow
        ? {
            claimedByUserId:
              effectiveJob.operations.staleWorkflow.claimedByUserId,
            claimedByEmail:
              effectiveJob.operations.staleWorkflow.claimedByEmail,
            claimedAt: effectiveJob.operations.staleWorkflow.claimedAt,
            note: effectiveJob.operations.staleWorkflow.note ?? null,
            updatedAt: effectiveJob.operations.staleWorkflow.updatedAt,
          }
        : null,
      latestFailedExecution:
        failedExecutionDiagnostics?.recentFailures[0] ?? null,
      failedExecutionDiagnostics,
      failureGuidance,
      reconciliation,
      onchain: {
        chainId: effectiveJob.onchain.chainId,
        contractAddress: effectiveJob.onchain.contractAddress,
        escrowId: effectiveJob.onchain.escrowId,
      },
      authority: merged.authority,
    };
  }

  private async requireOperatorAccess(userId: string) {
    return this.userCapabilities.requireCapability(
      userId,
      'escrowOperations',
    );
  }

  private requireFailedExecutionDiagnostics(job: EscrowJobRecord) {
    const diagnostics = buildFailedExecutionDiagnostics(job.executions);
    if (!diagnostics) {
      throw new ConflictException(
        'Job does not currently have failed executions',
      );
    }

    return diagnostics;
  }

  private async requireJob(jobId: string) {
    const job = await this.escrowRepository.getById(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }
}
