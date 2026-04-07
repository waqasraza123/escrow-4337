import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { normalizeEvmAddress } from '../../common/evm-address';
import { ESCROW_REPOSITORY } from '../../persistence/persistence.tokens';
import type { EscrowRepository } from '../../persistence/persistence.types';
import { UsersService } from '../users/users.service';
import type {
  EscrowExecutionRecord,
  EscrowJobRecord,
} from '../escrow/escrow.types';
import { EscrowContractConfigService } from '../escrow/onchain/escrow-contract.config';
import type { EscrowAttentionReason, EscrowHealthJob, EscrowHealthReport } from './escrow-health.types';
import { OperationsConfigService } from './operations.config';

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
  const times = [job.updatedAt, job.createdAt, ...auditTimes, ...executionTimes, ...milestoneTimes];

  return Math.max(...times);
}

function latestFailedExecution(executions: EscrowExecutionRecord[]) {
  const failures = executions.filter((execution) => execution.status === 'failed');
  if (failures.length === 0) {
    return null;
  }

  const latestFailure = failures.sort(
    (left, right) =>
      (right.confirmedAt ?? right.submittedAt) - (left.confirmedAt ?? left.submittedAt),
  )[0]!;

  return {
    action: latestFailure.action,
    submittedAt: latestFailure.submittedAt,
    txHash: latestFailure.txHash ?? null,
    failureCode: latestFailure.failureCode ?? null,
    failureMessage: latestFailure.failureMessage ?? null,
    milestoneIndex: latestFailure.milestoneIndex ?? null,
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

@Injectable()
export class EscrowHealthService {
  constructor(
    @Inject(ESCROW_REPOSITORY)
    private readonly escrowRepository: EscrowRepository,
    private readonly usersService: UsersService,
    private readonly escrowContractConfig: EscrowContractConfigService,
    private readonly operationsConfig: OperationsConfigService,
  ) {}

  async getReport(userId: string, now = Date.now()): Promise<EscrowHealthReport> {
    await this.requireOperatorAccess(userId);

    const jobs = await this.escrowRepository.listAll();
    const staleCutoff = now - this.operationsConfig.escrowStaleJobMs;

    const jobSummaries = jobs
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

    return {
      generatedAt: new Date(now).toISOString(),
      thresholds: {
        staleJobHours: this.operationsConfig.escrowStaleJobHours,
        staleJobMs: this.operationsConfig.escrowStaleJobMs,
      },
      summary: {
        totalJobs: jobs.length,
        jobsNeedingAttention: jobSummaries.length,
        openDisputeJobs: jobSummaries.filter((job) =>
          job.reasons.includes('open_dispute'),
        ).length,
        failedExecutionJobs: jobSummaries.filter((job) =>
          job.reasons.includes('failed_execution'),
        ).length,
        staleJobs: jobSummaries.filter((job) => job.reasons.includes('stale_job'))
          .length,
      },
      jobs: jobSummaries,
    };
  }

  private buildJobSummary(
    job: EscrowJobRecord,
    staleCutoff: number,
    now: number,
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
        reasons.has('stale_job') && latestActivity < now ? now - latestActivity : null,
      reasons: sortReasons(reasons),
      counts: {
        openDisputes,
        failedExecutions,
      },
      latestFailedExecution: latestFailedExecution(job.executions),
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
  }
}
