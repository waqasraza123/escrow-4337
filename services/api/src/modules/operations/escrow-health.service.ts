import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeEvmAddress } from '../../common/evm-address';
import { ESCROW_REPOSITORY } from '../../persistence/persistence.tokens';
import type { EscrowRepository } from '../../persistence/persistence.types';
import { UsersService } from '../users/users.service';
import type {
  EscrowExecutionRecord,
  EscrowJobRecord,
} from '../escrow/escrow.types';
import { EscrowContractConfigService } from '../escrow/onchain/escrow-contract.config';
import type {
  EscrowAttentionReason,
  EscrowExecutionFailureWorkflowMutationResponse,
  EscrowFailedExecutionSummary,
  EscrowHealthJob,
  EscrowHealthReport,
  EscrowStaleWorkflowMutationResponse,
} from './escrow-health.types';
import { OperationsConfigService } from './operations.config';

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
    recentFailures: failures.slice(0, 3).map(summarizeFailedExecution),
  };
}

function sortReasons(reasons: Set<EscrowAttentionReason>) {
  const order: EscrowAttentionReason[] = [
    'open_dispute',
    'failed_execution',
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

  if (reasons.includes('stale_job')) {
    return 2;
  }

  return 3;
}

function isJobCurrentlyStale(job: EscrowJobRecord, staleCutoff: number) {
  if (job.status === 'completed' || job.status === 'resolved') {
    return false;
  }

  return latestActivityAt(job) <= staleCutoff;
}

@Injectable()
export class EscrowHealthService {
  constructor(
    @Inject(ESCROW_REPOSITORY)
    private readonly escrowRepository: EscrowRepository,
    private readonly usersService: UsersService,
    private readonly escrowContractConfig: EscrowContractConfigService,
    private readonly operationsConfig: OperationsConfigService,
  ) {}

  async getReport(
    userId: string,
    options: EscrowHealthReportOptions = {},
    now = Date.now(),
  ): Promise<EscrowHealthReport> {
    await this.requireOperatorAccess(userId);

    const jobs = await this.escrowRepository.listAll();
    const staleCutoff = now - this.operationsConfig.escrowStaleJobMs;
    const normalizedReason = options.reason ?? null;
    const normalizedLimit = Math.min(
      options.limit ?? this.operationsConfig.escrowHealthDefaultLimit,
      this.operationsConfig.escrowHealthMaxLimit,
    );

    const allAttentionJobs = jobs
      .map((job) => this.buildJobSummary(job, staleCutoff, now))
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
        staleJobHours: this.operationsConfig.escrowStaleJobHours,
        staleJobMs: this.operationsConfig.escrowStaleJobMs,
        defaultLimit: this.operationsConfig.escrowHealthDefaultLimit,
        maxLimit: this.operationsConfig.escrowHealthMaxLimit,
      },
      summary: {
        totalJobs: jobs.length,
        jobsNeedingAttention: allAttentionJobs.length,
        matchedJobs: matchedJobs.length,
        openDisputeJobs: matchedJobs.filter((job) =>
          job.reasons.includes('open_dispute'),
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
      job: this.buildJobSummary(job, staleCutoff, now),
    };
  }

  async claimExecutionFailureWorkflow(
    userId: string,
    jobId: string,
    input: {
      note?: string;
    },
    now = Date.now(),
  ): Promise<EscrowExecutionFailureWorkflowMutationResponse> {
    const user = await this.requireOperatorAccess(userId);
    const job = await this.requireJob(jobId);
    const staleCutoff = now - this.operationsConfig.escrowStaleJobMs;
    const failedExecutionDiagnostics = this.requireFailedExecutionDiagnostics(job);
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
      acknowledgedFailureAt: existingWorkflow?.acknowledgedFailureAt,
      note: input.note?.trim() || existingWorkflow?.note,
      updatedAt: now,
    };
    await this.escrowRepository.save(job);

    return {
      job: this.buildJobSummary(
        job,
        staleCutoff,
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
    },
    now = Date.now(),
  ): Promise<EscrowExecutionFailureWorkflowMutationResponse> {
    const user = await this.requireOperatorAccess(userId);
    const job = await this.requireJob(jobId);
    const staleCutoff = now - this.operationsConfig.escrowStaleJobMs;
    const failedExecutionDiagnostics = this.requireFailedExecutionDiagnostics(job);
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
      acknowledgedFailureAt: failedExecutionDiagnostics.latestFailureAt,
      note: input.note?.trim() || existingWorkflow.note,
      updatedAt: now,
    };
    await this.escrowRepository.save(job);

    return {
      job: this.buildJobSummary(
        job,
        staleCutoff,
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
    const failedExecutionDiagnostics = this.requireFailedExecutionDiagnostics(job);
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
      job: this.buildJobSummary(
        job,
        staleCutoff,
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
      job: this.buildJobSummary(job, staleCutoff, now),
    };
  }

  private buildJobSummary(
    job: EscrowJobRecord,
    staleCutoff: number,
    now: number,
    failedExecutionDiagnostics = buildFailedExecutionDiagnostics(job.executions),
  ): EscrowHealthJob {
    const latestActivity = latestActivityAt(job);
    const openDisputes = job.milestones.filter(
      (milestone) => milestone.status === 'disputed',
    ).length;
    const failedExecutions = job.executions.filter(
      (execution) => execution.status === 'failed',
    ).length;
    const reasons = new Set<EscrowAttentionReason>();

    if (openDisputes > 0) {
      reasons.add('open_dispute');
    }

    if (failedExecutions > 0) {
      reasons.add('failed_execution');
    }

    if (
      job.status !== 'completed' &&
      job.status !== 'resolved' &&
      latestActivity <= staleCutoff
    ) {
      reasons.add('stale_job');
    }

    return {
      jobId: job.id,
      title: job.title,
      status: job.status,
      updatedAt: job.updatedAt,
      latestActivityAt: latestActivity,
      staleForMs:
        reasons.has('stale_job') && latestActivity < now
          ? now - latestActivity
          : null,
      reasons: sortReasons(reasons),
      counts: {
        openDisputes,
        failedExecutions,
      },
      executionFailureWorkflow:
        job.operations.executionFailureWorkflow && failedExecutionDiagnostics
          ? {
              claimedByUserId:
                job.operations.executionFailureWorkflow.claimedByUserId,
              claimedByEmail:
                job.operations.executionFailureWorkflow.claimedByEmail,
              claimedAt: job.operations.executionFailureWorkflow.claimedAt,
              acknowledgedFailureAt:
                job.operations.executionFailureWorkflow.acknowledgedFailureAt ??
                null,
              note: job.operations.executionFailureWorkflow.note ?? null,
              updatedAt: job.operations.executionFailureWorkflow.updatedAt,
              latestFailureNeedsAcknowledgement:
                (job.operations.executionFailureWorkflow.acknowledgedFailureAt ??
                  0) < failedExecutionDiagnostics.latestFailureAt,
            }
          : null,
      staleWorkflow: job.operations.staleWorkflow
        ? {
            claimedByUserId: job.operations.staleWorkflow.claimedByUserId,
            claimedByEmail: job.operations.staleWorkflow.claimedByEmail,
            claimedAt: job.operations.staleWorkflow.claimedAt,
            note: job.operations.staleWorkflow.note ?? null,
            updatedAt: job.operations.staleWorkflow.updatedAt,
          }
        : null,
      latestFailedExecution:
        failedExecutionDiagnostics?.recentFailures[0] ?? null,
      failedExecutionDiagnostics,
      onchain: {
        chainId: job.onchain.chainId,
        contractAddress: job.onchain.contractAddress,
        escrowId: job.onchain.escrowId,
      },
    };
  }

  private async requireOperatorAccess(userId: string) {
    const user = await this.usersService.getRequiredById(userId);
    const arbitratorAddress = normalizeEvmAddress(
      this.escrowContractConfig.arbitratorAddress,
    );

    if (!this.usersService.userHasWalletAddress(user, arbitratorAddress)) {
      throw new ForbiddenException(
        'Authenticated user must control the configured arbitrator wallet',
      );
    }

    return user;
  }

  private requireFailedExecutionDiagnostics(job: EscrowJobRecord) {
    const diagnostics = buildFailedExecutionDiagnostics(job.executions);
    if (!diagnostics) {
      throw new ConflictException('Job does not currently have failed executions');
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
