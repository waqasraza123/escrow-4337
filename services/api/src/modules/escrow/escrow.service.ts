import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { ESCROW_REPOSITORY } from '../../persistence/persistence.tokens';
import type { EscrowRepository } from '../../persistence/persistence.types';
import type {
  CreateJobDto,
  DeliverMilestoneDto,
  DisputeMilestoneDto,
  FundJobDto,
  ResolveMilestoneDto,
  SetMilestonesDto,
} from './escrow.dto';
import { EscrowContractGatewayError } from './onchain/escrow-contract.errors';
import { ESCROW_CONTRACT_GATEWAY } from './onchain/escrow-contract.tokens';
import type {
  EscrowContractGateway,
  EscrowContractReceipt,
} from './onchain/escrow-contract.types';
import { EscrowActorService } from './escrow-actor.service';
import type {
  CreateJobResponse,
  EscrowAuditBundle,
  EscrowAuditEvent,
  EscrowExecutionRecord,
  FundJobResponse,
  EscrowJobRecord,
  MilestoneMutationResponse,
  SetMilestonesResponse,
} from './escrow.types';
import { normalizeEvmAddress } from '../../common/evm-address';

const MINOR_UNIT_SCALE = 1_000_000n;
const amountPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/;

function parseAmountToMinorUnits(amount: string): bigint {
  if (!amountPattern.test(amount)) {
    throw new BadRequestException('Invalid amount format');
  }

  const [wholePart, fractionalPart = ''] = amount.split('.');
  const normalizedFraction = fractionalPart.padEnd(6, '0').slice(0, 6);
  const minorUnits =
    BigInt(wholePart) * MINOR_UNIT_SCALE + BigInt(normalizedFraction);

  if (minorUnits <= 0n) {
    throw new BadRequestException('Amount must be greater than zero');
  }

  return minorUnits;
}

function normalizeAmount(amount: string): string {
  const minorUnits = parseAmountToMinorUnits(amount);
  const wholeUnits = minorUnits / MINOR_UNIT_SCALE;
  const fractionalUnits = (minorUnits % MINOR_UNIT_SCALE)
    .toString()
    .padStart(6, '0')
    .replace(/0+$/, '');

  return fractionalUnits.length > 0
    ? `${wholeUnits.toString()}.${fractionalUnits}`
    : wholeUnits.toString();
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return `{${entries
      .map(
        ([key, nestedValue]) =>
          `${JSON.stringify(key)}:${stableSerialize(nestedValue)}`,
      )
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function hashToBytes32(value: unknown) {
  return `0x${createHash('sha256').update(stableSerialize(value)).digest('hex')}`;
}

@Injectable()
export class EscrowService {
  constructor(
    @Inject(ESCROW_REPOSITORY)
    private readonly escrowRepository: EscrowRepository,
    @Inject(ESCROW_CONTRACT_GATEWAY)
    private readonly escrowContractGateway: EscrowContractGateway,
    private readonly escrowActorService: EscrowActorService,
  ) {}

  async createJob(
    userId: string,
    dto: CreateJobDto,
  ): Promise<CreateJobResponse> {
    const now = Date.now();
    const jobId = randomUUID();
    const jobHash = this.createJobHash(dto);
    const actorAddress =
      await this.escrowActorService.resolveClientForCreate(userId);
    const workerAddress = normalizeEvmAddress(dto.workerAddress);
    const currencyAddress = normalizeEvmAddress(dto.currencyAddress);
    const createdJob = await this.escrowContractGateway.createJob({
      actorAddress,
      workerAddress,
      currencyAddress,
      jobHash,
    });

    const job: EscrowJobRecord = {
      id: jobId,
      title: dto.title,
      description: dto.description,
      category: dto.category.trim().toLowerCase(),
      termsJSON: cloneValue(dto.termsJSON),
      jobHash,
      fundedAmount: null,
      status: 'draft',
      createdAt: now,
      updatedAt: createdJob.confirmedAt,
      milestones: [],
      audit: [],
      onchain: {
        chainId: createdJob.chainId,
        contractAddress: createdJob.contractAddress,
        escrowId: createdJob.escrowId,
        clientAddress: actorAddress,
        workerAddress,
        currencyAddress,
      },
      executions: [],
    };

    this.appendAudit(job, {
      type: 'job.created',
      at: createdJob.confirmedAt,
      payload: {
        jobId,
        category: job.category,
        escrowId: createdJob.escrowId,
      },
    });
    this.appendExecution(
      job,
      this.createConfirmedExecution('create_job', actorAddress, createdJob, {
        escrowId: createdJob.escrowId,
      }),
    );

    await this.escrowRepository.create(job);

    return {
      jobId,
      jobHash,
      status: job.status,
      escrowId: createdJob.escrowId,
      txHash: createdJob.txHash,
    };
  }

  async fundJob(
    userId: string,
    jobId: string,
    dto: FundJobDto,
  ): Promise<FundJobResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolveClientForJob(
      userId,
      job,
    );

    if (job.fundedAmount !== null) {
      throw new ConflictException('Job has already been funded');
    }

    const fundedAmount = normalizeAmount(dto.amount);
    const fundedAmountMinorUnits = parseAmountToMinorUnits(
      dto.amount,
    ).toString();
    const receipt = await this.executeMutation({
      job,
      action: 'fund_job',
      actorAddress,
      operation: () =>
        this.escrowContractGateway.fundJob({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          amountMinorUnits: fundedAmountMinorUnits,
        }),
      onConfirmed: () => {
        job.fundedAmount = fundedAmount;
        job.updatedAt = Date.now();
        this.syncJobStatus(job);
        this.appendAudit(job, {
          type: 'job.funded',
          at: Date.now(),
          payload: {
            jobId,
            amount: fundedAmount,
          },
        });
      },
    });

    return {
      jobId: job.id,
      fundedAmount: job.fundedAmount,
      status: job.status,
      txHash: receipt.txHash,
    };
  }

  async setMilestones(
    userId: string,
    jobId: string,
    dto: SetMilestonesDto,
  ): Promise<SetMilestonesResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolveClientForJob(
      userId,
      job,
    );

    if (job.fundedAmount === null) {
      throw new ConflictException(
        'Job must be funded before setting milestones',
      );
    }

    if (job.milestones.length > 0) {
      throw new ConflictException('Milestones have already been set');
    }

    const fundedAmountMinorUnits = parseAmountToMinorUnits(job.fundedAmount);
    const milestoneTotalMinorUnits = dto.milestones.reduce(
      (total, milestone) => total + parseAmountToMinorUnits(milestone.amount),
      0n,
    );

    if (milestoneTotalMinorUnits !== fundedAmountMinorUnits) {
      throw new ConflictException('Milestone total must match funded amount');
    }

    const receipt = await this.executeMutation({
      job,
      action: 'set_milestones',
      actorAddress,
      operation: () =>
        this.escrowContractGateway.setMilestones({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          amountsMinorUnits: dto.milestones.map((milestone) =>
            parseAmountToMinorUnits(milestone.amount).toString(),
          ),
        }),
      onConfirmed: () => {
        job.milestones = dto.milestones.map((milestone) => ({
          title: milestone.title,
          deliverable: milestone.deliverable,
          amount: normalizeAmount(milestone.amount),
          dueAt: milestone.dueAt,
          status: 'pending',
        }));
        job.updatedAt = Date.now();
        this.syncJobStatus(job);
        this.appendAudit(job, {
          type: 'job.milestones_set',
          at: Date.now(),
          payload: {
            jobId,
            count: job.milestones.length,
          },
        });
      },
    });

    return {
      jobId: job.id,
      milestoneCount: job.milestones.length,
      status: job.status,
      txHash: receipt.txHash,
    };
  }

  async deliverMilestone(
    userId: string,
    jobId: string,
    milestoneIndex: number,
    dto: DeliverMilestoneDto,
  ): Promise<MilestoneMutationResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolveWorkerForJob(
      userId,
      job,
    );
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);

    if (milestone.status !== 'pending') {
      throw new ConflictException('Only pending milestones can be delivered');
    }

    const receipt = await this.executeMutation({
      job,
      action: 'deliver_milestone',
      actorAddress,
      milestoneIndex,
      operation: () =>
        this.escrowContractGateway.deliverMilestone({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          milestoneIndex,
          deliverableHash: hashToBytes32({
            note: dto.note,
            evidenceUrls: dto.evidenceUrls,
          }),
        }),
      onConfirmed: () => {
        const now = Date.now();
        milestone.status = 'delivered';
        milestone.deliveredAt = now;
        milestone.deliveryNote = dto.note;
        milestone.deliveryEvidenceUrls = cloneValue(dto.evidenceUrls);
        job.updatedAt = now;
        this.syncJobStatus(job);
        this.appendAudit(job, {
          type: 'milestone.delivered',
          at: now,
          payload: {
            jobId,
            milestoneIndex,
          },
        });
      },
    });

    return {
      jobId: job.id,
      milestoneIndex,
      milestoneStatus: milestone.status,
      jobStatus: job.status,
      txHash: receipt.txHash,
    };
  }

  async releaseMilestone(
    userId: string,
    jobId: string,
    milestoneIndex: number,
  ): Promise<MilestoneMutationResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolveClientForJob(
      userId,
      job,
    );
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);

    if (milestone.status !== 'delivered') {
      throw new ConflictException('Only delivered milestones can be released');
    }

    const receipt = await this.executeMutation({
      job,
      action: 'release_milestone',
      actorAddress,
      milestoneIndex,
      operation: () =>
        this.escrowContractGateway.releaseMilestone({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          milestoneIndex,
        }),
      onConfirmed: () => {
        const now = Date.now();
        milestone.status = 'released';
        milestone.releasedAt = now;
        job.updatedAt = now;
        this.syncJobStatus(job);
        this.appendAudit(job, {
          type: 'milestone.released',
          at: now,
          payload: {
            jobId,
            milestoneIndex,
          },
        });
      },
    });

    return {
      jobId: job.id,
      milestoneIndex,
      milestoneStatus: milestone.status,
      jobStatus: job.status,
      txHash: receipt.txHash,
    };
  }

  async disputeMilestone(
    userId: string,
    jobId: string,
    milestoneIndex: number,
    dto: DisputeMilestoneDto,
  ): Promise<MilestoneMutationResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolvePartyForJob(
      userId,
      job,
    );
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);

    if (milestone.status !== 'delivered') {
      throw new ConflictException('Only delivered milestones can be disputed');
    }

    const receipt = await this.executeMutation({
      job,
      action: 'open_dispute',
      actorAddress,
      milestoneIndex,
      operation: () =>
        this.escrowContractGateway.openDispute({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          milestoneIndex,
          reasonHash: hashToBytes32(dto.reason),
        }),
      onConfirmed: () => {
        const now = Date.now();
        milestone.status = 'disputed';
        milestone.disputedAt = now;
        milestone.disputeReason = dto.reason;
        job.updatedAt = now;
        this.syncJobStatus(job);
        this.appendAudit(job, {
          type: 'milestone.disputed',
          at: now,
          payload: {
            jobId,
            milestoneIndex,
          },
        });
      },
    });

    return {
      jobId: job.id,
      milestoneIndex,
      milestoneStatus: milestone.status,
      jobStatus: job.status,
      txHash: receipt.txHash,
    };
  }

  async resolveMilestone(
    userId: string,
    jobId: string,
    milestoneIndex: number,
    dto: ResolveMilestoneDto,
  ): Promise<MilestoneMutationResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress =
      await this.escrowActorService.resolveArbitrator(userId);
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);

    if (milestone.status !== 'disputed') {
      throw new ConflictException('Only disputed milestones can be resolved');
    }

    const splitBpsClient = dto.action === 'refund' ? 10_000 : 0;
    const receipt = await this.executeMutation({
      job,
      action: 'resolve_dispute',
      actorAddress,
      milestoneIndex,
      operation: () =>
        this.escrowContractGateway.resolveDispute({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          milestoneIndex,
          splitBpsClient,
        }),
      onConfirmed: () => {
        const now = Date.now();
        milestone.status = dto.action === 'release' ? 'released' : 'refunded';
        milestone.resolvedAt = now;
        milestone.resolutionAction = dto.action;
        milestone.resolutionNote = dto.note;
        if (dto.action === 'release') {
          milestone.releasedAt = now;
        }
        job.updatedAt = now;
        this.syncJobStatus(job);
        this.appendAudit(job, {
          type: 'milestone.resolved',
          at: now,
          payload: {
            jobId,
            milestoneIndex,
            action: dto.action,
          },
        });
      },
    });

    return {
      jobId: job.id,
      milestoneIndex,
      milestoneStatus: milestone.status,
      jobStatus: job.status,
      txHash: receipt.txHash,
    };
  }

  async getAuditBundle(jobId: string): Promise<EscrowAuditBundle> {
    const job = await this.getJobOrThrow(jobId);
    const { audit, executions, ...jobView } = cloneValue(job);

    return {
      bundle: {
        job: jobView,
        audit,
        executions,
      },
    };
  }

  private async executeMutation(input: {
    job: EscrowJobRecord;
    action: EscrowExecutionRecord['action'];
    actorAddress: string;
    milestoneIndex?: number;
    operation: () => Promise<EscrowContractReceipt>;
    onConfirmed: () => void;
  }) {
    try {
      const receipt = await input.operation();
      input.onConfirmed();
      input.job.updatedAt = receipt.confirmedAt;
      this.appendExecution(
        input.job,
        this.createConfirmedExecution(
          input.action,
          input.actorAddress,
          receipt,
          {
            milestoneIndex: input.milestoneIndex,
            escrowId: input.job.onchain.escrowId ?? undefined,
          },
        ),
      );
      await this.escrowRepository.save(input.job);
      return receipt;
    } catch (error) {
      input.job.updatedAt = Date.now();
      this.appendExecution(
        input.job,
        this.createFailedExecution(
          input.action,
          input.actorAddress,
          input.job,
          error,
          input.milestoneIndex,
        ),
      );
      await this.escrowRepository.save(input.job);
      throw this.mapGatewayError(error);
    }
  }

  private async getJobOrThrow(jobId: string) {
    const job = await this.escrowRepository.getById(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  private getMilestoneOrThrow(job: EscrowJobRecord, milestoneIndex: number) {
    if (!Number.isInteger(milestoneIndex) || milestoneIndex < 0) {
      throw new BadRequestException(
        'Milestone index must be a non-negative integer',
      );
    }

    const milestone = job.milestones[milestoneIndex];

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    return milestone;
  }

  private createJobHash(dto: CreateJobDto) {
    return `0x${createHash('sha256')
      .update(
        stableSerialize({
          title: dto.title,
          description: dto.description,
          category: dto.category.trim().toLowerCase(),
          termsJSON: dto.termsJSON,
        }),
      )
      .digest('hex')}`;
  }

  private appendAudit(job: EscrowJobRecord, event: EscrowAuditEvent) {
    job.audit.push(event);
  }

  private appendExecution(
    job: EscrowJobRecord,
    execution: EscrowExecutionRecord,
  ) {
    job.executions.push(execution);
  }

  private requireEscrowId(job: EscrowJobRecord) {
    if (!job.onchain.escrowId) {
      throw new ConflictException('Job has not been created onchain');
    }
    return job.onchain.escrowId;
  }

  private createConfirmedExecution(
    action: EscrowExecutionRecord['action'],
    actorAddress: string,
    receipt: EscrowContractReceipt,
    extra: {
      milestoneIndex?: number;
      escrowId?: string;
    } = {},
  ): EscrowExecutionRecord {
    return {
      id: randomUUID(),
      action,
      actorAddress,
      chainId: receipt.chainId,
      contractAddress: receipt.contractAddress,
      txHash: receipt.txHash,
      status: 'confirmed',
      blockNumber: receipt.blockNumber,
      submittedAt: receipt.submittedAt,
      confirmedAt: receipt.confirmedAt,
      milestoneIndex: extra.milestoneIndex,
      escrowId: extra.escrowId,
    };
  }

  private createFailedExecution(
    action: EscrowExecutionRecord['action'],
    actorAddress: string,
    job: EscrowJobRecord,
    error: unknown,
    milestoneIndex?: number,
  ): EscrowExecutionRecord {
    if (error instanceof EscrowContractGatewayError) {
      return {
        id: randomUUID(),
        action,
        actorAddress,
        chainId: error.chainId,
        contractAddress: error.contractAddress,
        txHash: error.txHash,
        status: 'failed',
        submittedAt: error.submittedAt ?? Date.now(),
        milestoneIndex,
        escrowId: job.onchain.escrowId ?? undefined,
        failureCode: error.code,
        failureMessage: error.message,
      };
    }

    return {
      id: randomUUID(),
      action,
      actorAddress,
      chainId: job.onchain.chainId,
      contractAddress: job.onchain.contractAddress,
      status: 'failed',
      submittedAt: Date.now(),
      milestoneIndex,
      escrowId: job.onchain.escrowId ?? undefined,
      failureCode: 'unexpected_error',
      failureMessage:
        error instanceof Error ? error.message : 'Unexpected escrow error',
    };
  }

  private mapGatewayError(error: unknown) {
    if (error instanceof EscrowContractGatewayError) {
      if (error.code === 'relay_unavailable') {
        return new ServiceUnavailableException(error.message);
      }
      return new BadGatewayException(error.message);
    }

    if (error instanceof Error) {
      return error;
    }

    return new BadGatewayException('Escrow execution failed');
  }

  private syncJobStatus(job: EscrowJobRecord) {
    const milestoneStatuses = job.milestones.map(
      (milestone) => milestone.status,
    );

    if (milestoneStatuses.includes('disputed')) {
      job.status = 'disputed';
      return;
    }

    const hasFinalMilestones =
      milestoneStatuses.length > 0 &&
      milestoneStatuses.every(
        (status) => status === 'released' || status === 'refunded',
      );

    if (hasFinalMilestones) {
      job.status = milestoneStatuses.includes('refunded')
        ? 'resolved'
        : 'completed';
      return;
    }

    if (
      milestoneStatuses.some(
        (status) =>
          status === 'delivered' ||
          status === 'released' ||
          status === 'refunded',
      )
    ) {
      job.status = 'in_progress';
      return;
    }

    if (job.fundedAmount !== null) {
      job.status = 'funded';
      return;
    }

    job.status = 'draft';
  }
}
