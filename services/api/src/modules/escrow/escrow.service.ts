import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import type {
  CreateJobDto,
  DeliverMilestoneDto,
  DisputeMilestoneDto,
  FundJobDto,
  ResolveMilestoneDto,
  SetMilestonesDto,
} from './escrow.dto';

type JobStatus =
  | 'draft'
  | 'funded'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'resolved';

type MilestoneStatus =
  | 'pending'
  | 'delivered'
  | 'released'
  | 'disputed'
  | 'refunded';

type EscrowAuditEvent =
  | {
      type: 'job.created';
      at: number;
      payload: {
        jobId: string;
        category: string;
      };
    }
  | {
      type: 'job.funded';
      at: number;
      payload: {
        jobId: string;
        amount: string;
      };
    }
  | {
      type: 'job.milestones_set';
      at: number;
      payload: {
        jobId: string;
        count: number;
      };
    }
  | {
      type: 'milestone.delivered';
      at: number;
      payload: {
        jobId: string;
        milestoneIndex: number;
      };
    }
  | {
      type: 'milestone.released';
      at: number;
      payload: {
        jobId: string;
        milestoneIndex: number;
      };
    }
  | {
      type: 'milestone.disputed';
      at: number;
      payload: {
        jobId: string;
        milestoneIndex: number;
      };
    }
  | {
      type: 'milestone.resolved';
      at: number;
      payload: {
        jobId: string;
        milestoneIndex: number;
        action: 'release' | 'refund';
      };
    };

type EscrowMilestoneRecord = {
  title: string;
  deliverable: string;
  amount: string;
  dueAt?: number;
  status: MilestoneStatus;
  deliveredAt?: number;
  releasedAt?: number;
  disputedAt?: number;
  resolvedAt?: number;
  deliveryNote?: string;
  deliveryEvidenceUrls?: string[];
  disputeReason?: string;
  resolutionAction?: 'release' | 'refund';
  resolutionNote?: string;
};

type EscrowJobRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  termsJSON: Record<string, unknown>;
  jobHash: string;
  fundedAmount: string | null;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  milestones: EscrowMilestoneRecord[];
  audit: EscrowAuditEvent[];
};

type EscrowJobView = Omit<EscrowJobRecord, 'audit'>;

type EscrowAuditBundle = {
  bundle: {
    job: EscrowJobView;
    audit: EscrowAuditEvent[];
  };
};

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

@Injectable()
export class EscrowService {
  private readonly jobs = new Map<string, EscrowJobRecord>();

  createJob(dto: CreateJobDto) {
    const now = Date.now();
    const jobId = randomUUID();
    const jobHash = this.createJobHash(dto);
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
      updatedAt: now,
      milestones: [],
      audit: [],
    };

    this.appendAudit(job, {
      type: 'job.created',
      at: now,
      payload: {
        jobId,
        category: job.category,
      },
    });
    this.jobs.set(jobId, job);

    return {
      jobId,
      jobHash,
      status: job.status,
    };
  }

  fundJob(jobId: string, dto: FundJobDto) {
    const job = this.getJobOrThrow(jobId);

    if (job.fundedAmount !== null) {
      throw new ConflictException('Job has already been funded');
    }

    const fundedAmount = normalizeAmount(dto.amount);
    job.fundedAmount = fundedAmount;
    job.updatedAt = Date.now();
    this.syncJobStatus(job);
    this.appendAudit(job, {
      type: 'job.funded',
      at: job.updatedAt,
      payload: {
        jobId,
        amount: fundedAmount,
      },
    });

    return {
      jobId: job.id,
      fundedAmount: job.fundedAmount,
      status: job.status,
    };
  }

  setMilestones(jobId: string, milestones: SetMilestonesDto) {
    const job = this.getJobOrThrow(jobId);

    if (job.fundedAmount === null) {
      throw new ConflictException(
        'Job must be funded before setting milestones',
      );
    }

    if (job.milestones.length > 0) {
      throw new ConflictException('Milestones have already been set');
    }

    const fundedAmountMinorUnits = parseAmountToMinorUnits(job.fundedAmount);
    const milestoneTotalMinorUnits = milestones.reduce(
      (total, milestone) => total + parseAmountToMinorUnits(milestone.amount),
      0n,
    );

    if (milestoneTotalMinorUnits !== fundedAmountMinorUnits) {
      throw new ConflictException('Milestone total must match funded amount');
    }

    job.milestones = milestones.map((milestone) => ({
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
      at: job.updatedAt,
      payload: {
        jobId,
        count: job.milestones.length,
      },
    });

    return {
      jobId: job.id,
      milestoneCount: job.milestones.length,
      status: job.status,
    };
  }

  deliverMilestone(
    jobId: string,
    milestoneIndex: number,
    dto: DeliverMilestoneDto,
  ) {
    const job = this.getJobOrThrow(jobId);
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);

    if (milestone.status !== 'pending') {
      throw new ConflictException('Only pending milestones can be delivered');
    }

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

    return {
      jobId: job.id,
      milestoneIndex,
      milestoneStatus: milestone.status,
      jobStatus: job.status,
    };
  }

  releaseMilestone(jobId: string, milestoneIndex: number) {
    const job = this.getJobOrThrow(jobId);
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);

    if (milestone.status !== 'delivered') {
      throw new ConflictException('Only delivered milestones can be released');
    }

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

    return {
      jobId: job.id,
      milestoneIndex,
      milestoneStatus: milestone.status,
      jobStatus: job.status,
    };
  }

  disputeMilestone(
    jobId: string,
    milestoneIndex: number,
    dto: DisputeMilestoneDto,
  ) {
    const job = this.getJobOrThrow(jobId);
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);

    if (milestone.status !== 'delivered') {
      throw new ConflictException('Only delivered milestones can be disputed');
    }

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

    return {
      jobId: job.id,
      milestoneIndex,
      milestoneStatus: milestone.status,
      jobStatus: job.status,
    };
  }

  resolveMilestone(
    jobId: string,
    milestoneIndex: number,
    dto: ResolveMilestoneDto,
  ) {
    const job = this.getJobOrThrow(jobId);
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);

    if (milestone.status !== 'disputed') {
      throw new ConflictException('Only disputed milestones can be resolved');
    }

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

    return {
      jobId: job.id,
      milestoneIndex,
      milestoneStatus: milestone.status,
      jobStatus: job.status,
    };
  }

  getAuditBundle(jobId: string): EscrowAuditBundle {
    const job = this.getJobOrThrow(jobId);
    const { audit, ...jobView } = cloneValue(job);

    return {
      bundle: {
        job: jobView,
        audit,
      },
    };
  }

  private getJobOrThrow(jobId: string) {
    const job = this.jobs.get(jobId);

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
