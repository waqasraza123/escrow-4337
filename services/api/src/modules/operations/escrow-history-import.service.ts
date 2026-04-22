import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { z } from 'zod';
import { ESCROW_REPOSITORY } from '../../persistence/persistence.tokens';
import type { EscrowRepository } from '../../persistence/persistence.types';
import type {
  EscrowAuditEvent,
  EscrowExecutionRecord,
  EscrowJobRecord,
} from '../escrow/escrow.types';
import { UserCapabilitiesService } from '../users/user-capabilities.service';
import type { EscrowJobHistoryImportReport } from './escrow-health.types';
import { EscrowReconciliationService } from './escrow-reconciliation.service';

const milestoneStatusSchema = z.enum([
  'pending',
  'delivered',
  'released',
  'disputed',
  'refunded',
]);
const jobStatusSchema = z.enum([
  'draft',
  'funded',
  'in_progress',
  'completed',
  'disputed',
  'resolved',
]);
const auditEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('job.created'),
    at: z.number().int().nonnegative(),
    payload: z.object({
      jobId: z.string().min(1),
      category: z.string().min(1),
      escrowId: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal('job.contractor_participation_requested'),
    at: z.number().int().nonnegative(),
    payload: z.object({
      jobId: z.string().min(1),
      workerAddress: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal('job.contractor_email_updated'),
    at: z.number().int().nonnegative(),
    payload: z.object({
      jobId: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal('job.contractor_invite_sent'),
    at: z.number().int().nonnegative(),
    payload: z.object({
      jobId: z.string().min(1),
      delivery: z.enum(['email', 'manual']),
      regenerated: z.boolean(),
    }),
  }),
  z.object({
    type: z.literal('job.contractor_joined'),
    at: z.number().int().nonnegative(),
    payload: z.object({
      jobId: z.string().min(1),
      workerAddress: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal('job.funded'),
    at: z.number().int().nonnegative(),
    payload: z.object({
      jobId: z.string().min(1),
      amount: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal('job.milestones_set'),
    at: z.number().int().nonnegative(),
    payload: z.object({
      jobId: z.string().min(1),
      count: z.number().int().nonnegative(),
    }),
  }),
  z.object({
    type: z.literal('milestone.delivered'),
    at: z.number().int().nonnegative(),
    payload: z.object({
      jobId: z.string().min(1),
      milestoneIndex: z.number().int().nonnegative(),
    }),
  }),
  z.object({
    type: z.literal('milestone.released'),
    at: z.number().int().nonnegative(),
    payload: z.object({
      jobId: z.string().min(1),
      milestoneIndex: z.number().int().nonnegative(),
    }),
  }),
  z.object({
    type: z.literal('milestone.disputed'),
    at: z.number().int().nonnegative(),
    payload: z.object({
      jobId: z.string().min(1),
      milestoneIndex: z.number().int().nonnegative(),
    }),
  }),
  z.object({
    type: z.literal('milestone.resolved'),
    at: z.number().int().nonnegative(),
    payload: z.object({
      jobId: z.string().min(1),
      milestoneIndex: z.number().int().nonnegative(),
      action: z.enum(['release', 'refund']),
    }),
  }),
]);
const executionSchema = z.object({
  id: z.string().min(1),
  action: z.enum([
    'create_job',
    'fund_job',
    'set_milestones',
    'deliver_milestone',
    'release_milestone',
    'open_dispute',
    'resolve_dispute',
  ]),
  actorAddress: z.string().min(1),
  chainId: z.number().int().positive(),
  contractAddress: z.string().min(1),
  requestId: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
  idempotencyKey: z.string().min(1).optional(),
  operationKey: z.string().min(1).optional(),
  txHash: z.string().min(1).optional(),
  status: z.enum(['confirmed', 'failed']),
  blockNumber: z.number().int().nonnegative().optional(),
  submittedAt: z.number().int().nonnegative(),
  confirmedAt: z.number().int().nonnegative().optional(),
  milestoneIndex: z.number().int().nonnegative().optional(),
  escrowId: z.string().min(1).optional(),
  failureCode: z.string().min(1).optional(),
  failureMessage: z.string().min(1).optional(),
});
const milestoneSchema = z.object({
  title: z.string().min(1),
  deliverable: z.string().min(1),
  amount: z.string().min(1),
  dueAt: z.number().int().nonnegative().optional(),
  status: milestoneStatusSchema,
  deliveredAt: z.number().int().nonnegative().optional(),
  releasedAt: z.number().int().nonnegative().optional(),
  disputedAt: z.number().int().nonnegative().optional(),
  resolvedAt: z.number().int().nonnegative().optional(),
  deliveryNote: z.string().optional(),
  deliveryEvidenceUrls: z.array(z.string()).optional(),
  disputeReason: z.string().optional(),
  disputeEvidenceUrls: z.array(z.string()).optional(),
  resolutionAction: z.enum(['release', 'refund']).optional(),
  resolutionNote: z.string().optional(),
});
const timelineEntrySchema = z.object({
  source: z.enum(['audit', 'execution']),
  at: z.number().int().nonnegative(),
  label: z.string().min(1),
  milestoneIndex: z.number().int().nonnegative().nullable(),
  status: z.string().nullable(),
  actorAddress: z.string().nullable(),
  txHash: z.string().nullable(),
  detail: z.record(z.string(), z.unknown()),
});
const jobHistoryImportSchema = z
  .object({
    schemaVersion: z.literal(1),
    artifact: z.literal('job-history'),
    exportedAt: z.string().min(1),
    job: z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      description: z.string(),
      category: z.string().min(1),
      termsJSON: z.record(z.string(), z.unknown()),
      jobHash: z.string().min(1),
      fundedAmount: z.string().nullable(),
      status: jobStatusSchema,
      createdAt: z.number().int().nonnegative(),
      updatedAt: z.number().int().nonnegative(),
      contractorParticipation: z
        .object({
          status: z.enum(['pending', 'joined']),
          joinedAt: z.number().int().nonnegative().nullable(),
        })
        .nullable()
        .optional(),
      milestones: z.array(milestoneSchema),
      operations: z
        .object({
          chainSync: z.unknown().nullable().optional(),
          executionFailureWorkflow: z.unknown().nullable(),
          staleWorkflow: z.unknown().nullable(),
        })
        .optional(),
      onchain: z.object({
        chainId: z.number().int().positive(),
        contractAddress: z.string().min(1),
        escrowId: z.string().nullable(),
        clientAddress: z.string().min(1),
        workerAddress: z.string().min(1),
        currencyAddress: z.string().min(1),
      }),
    }),
    summary: z
      .object({
        milestoneCount: z.number().int().nonnegative(),
        disputedMilestones: z.number().int().nonnegative(),
        failedExecutions: z.number().int().nonnegative(),
        latestActivityAt: z.number().int().nonnegative().nullable(),
      })
      .passthrough(),
    audit: z.array(auditEventSchema),
    executions: z.array(executionSchema),
    timeline: z.array(timelineEntrySchema),
  })
  .passthrough();

type JobHistoryImportDocument = z.infer<typeof jobHistoryImportSchema>;

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, nestedValue]) => nestedValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(
        ([key, nestedValue]) =>
          `${JSON.stringify(key)}:${stableSerialize(nestedValue)}`,
      )
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function digest(value: unknown) {
  return createHash('sha256').update(stableSerialize(value)).digest('hex');
}

function auditOrderKey(event: EscrowAuditEvent) {
  const milestoneIndex =
    'milestoneIndex' in event.payload ? event.payload.milestoneIndex : -1;
  const resolutionAction =
    event.type === 'milestone.resolved' ? event.payload.action : '';

  return [
    event.at.toString().padStart(16, '0'),
    event.type,
    String(milestoneIndex).padStart(6, '0'),
    resolutionAction,
    stableSerialize(event.payload),
  ].join(':');
}

function executionTimestamp(execution: EscrowExecutionRecord) {
  return execution.confirmedAt ?? execution.submittedAt;
}

function executionOrderKey(execution: EscrowExecutionRecord) {
  return [
    executionTimestamp(execution).toString().padStart(16, '0'),
    execution.status,
    execution.action,
    String(execution.milestoneIndex ?? -1).padStart(6, '0'),
    execution.txHash ?? '',
    execution.id,
  ].join(':');
}

function normalizeAuditOrder(audit: EscrowAuditEvent[]) {
  const keyed = audit.map((event, index) => ({
    event,
    sortKey: auditOrderKey(event),
    stableId: `${index}:${auditOrderKey(event)}`,
  }));
  const sorted = [...keyed].sort(
    (left, right) =>
      left.sortKey.localeCompare(right.sortKey) ||
      left.stableId.localeCompare(right.stableId),
  );

  return {
    reordered: keyed.some(
      (entry, index) => sorted[index]?.stableId !== entry.stableId,
    ),
    items: sorted.map((entry) => entry.event),
  };
}

function normalizeExecutionOrder(executions: EscrowExecutionRecord[]) {
  const keyed = executions.map((execution, index) => ({
    execution,
    sortKey: executionOrderKey(execution),
    stableId: `${index}:${executionOrderKey(execution)}`,
  }));
  const sorted = [...keyed].sort(
    (left, right) =>
      left.sortKey.localeCompare(right.sortKey) ||
      left.stableId.localeCompare(right.stableId),
  );

  return {
    reordered: keyed.some(
      (entry, index) => sorted[index]?.stableId !== entry.stableId,
    ),
    items: sorted.map((entry) => entry.execution),
  };
}

function toSyntheticJobRecord(
  document: JobHistoryImportDocument,
  audit: EscrowAuditEvent[],
  executions: EscrowExecutionRecord[],
): EscrowJobRecord {
  return {
    ...structuredClone(document.job),
    contractorParticipation: null,
    operations: {
      chainSync: null,
      executionFailureWorkflow: null,
      staleWorkflow: null,
      commercial: null,
    },
    projectRoom: {
      submissions: [],
      messages: [],
      activity: [],
      supportCases: [],
    },
    audit: structuredClone(audit),
    executions: structuredClone(executions),
  };
}

function toTimelineDigest(job: EscrowJobRecord) {
  const normalizedAudit = normalizeAuditOrder(job.audit);
  const normalizedExecutions = normalizeExecutionOrder(job.executions);

  return digest({
    audit: normalizedAudit.items,
    executions: normalizedExecutions.items,
  });
}

function toAggregateMismatchSummary(
  localJob: EscrowJobRecord | null,
  importedJob: EscrowJobRecord,
  timelineDigestMatches: boolean | null,
): EscrowJobHistoryImportReport['localComparison'] {
  if (!localJob) {
    return {
      localJobFound: false,
      aggregateMatches: false,
      timelineDigestMatches: null,
      localStatus: null,
      importedStatus: importedJob.status,
      localFundedAmount: null,
      importedFundedAmount: importedJob.fundedAmount,
      localMilestoneCount: null,
      importedMilestoneCount: importedJob.milestones.length,
      mismatchedMilestones: importedJob.milestones.map((milestone, index) => ({
        index,
        localStatus: null,
        importedStatus: milestone.status,
      })),
    };
  }

  const mismatchedMilestones: EscrowJobHistoryImportReport['localComparison']['mismatchedMilestones'] =
    [];
  for (
    let index = 0;
    index < Math.max(localJob.milestones.length, importedJob.milestones.length);
    index += 1
  ) {
    const localStatus = localJob.milestones[index]?.status ?? null;
    const importedStatus = importedJob.milestones[index]?.status ?? null;
    if (localStatus === importedStatus) {
      continue;
    }

    mismatchedMilestones.push({
      index,
      localStatus,
      importedStatus,
    });
  }

  const aggregateMatches =
    localJob.status === importedJob.status &&
    localJob.fundedAmount === importedJob.fundedAmount &&
    mismatchedMilestones.length === 0;

  return {
    localJobFound: true,
    aggregateMatches,
    timelineDigestMatches,
    localStatus: localJob.status,
    importedStatus: importedJob.status,
    localFundedAmount: localJob.fundedAmount,
    importedFundedAmount: importedJob.fundedAmount,
    localMilestoneCount: localJob.milestones.length,
    importedMilestoneCount: importedJob.milestones.length,
    mismatchedMilestones,
  };
}

@Injectable()
export class EscrowHistoryImportService {
  constructor(
    @Inject(ESCROW_REPOSITORY)
    private readonly escrowRepository: EscrowRepository,
    private readonly userCapabilities: UserCapabilitiesService,
    private readonly reconciliationService: EscrowReconciliationService,
  ) {}

  async importJobHistory(
    userId: string,
    input: {
      documentJson: string;
    },
    now = Date.now(),
  ): Promise<EscrowJobHistoryImportReport> {
    await this.requireOperatorAccess(userId);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(input.documentJson);
    } catch {
      throw new BadRequestException('documentJson must contain valid JSON');
    }

    const parsedDocument = jobHistoryImportSchema.safeParse(parsedJson);
    if (!parsedDocument.success) {
      throw new BadRequestException(
        'documentJson must be a job-history export JSON document',
      );
    }

    const document = parsedDocument.data;
    const normalizedAudit = normalizeAuditOrder(document.audit);
    const normalizedExecutions = normalizeExecutionOrder(document.executions);
    const importedJob = toSyntheticJobRecord(
      document,
      normalizedAudit.items,
      normalizedExecutions.items,
    );
    const importedReconciliation =
      this.reconciliationService.buildReport(importedJob);
    const localJob = await this.escrowRepository.getById(importedJob.id);
    const timelineDigestMatches = localJob
      ? toTimelineDigest(localJob) === toTimelineDigest(importedJob)
      : null;

    return {
      importedAt: new Date(now).toISOString(),
      document: {
        schemaVersion: 1,
        artifact: 'job-history',
        exportedAt: document.exportedAt,
        jobId: importedJob.id,
        title: importedJob.title,
      },
      normalization: {
        auditEvents: normalizedAudit.items.length,
        confirmedExecutions: normalizedExecutions.items.filter(
          (execution) => execution.status === 'confirmed',
        ).length,
        failedExecutions: normalizedExecutions.items.filter(
          (execution) => execution.status === 'failed',
        ).length,
        auditWasReordered: normalizedAudit.reordered,
        executionWasReordered: normalizedExecutions.reordered,
      },
      importedReconciliation,
      localComparison: toAggregateMismatchSummary(
        localJob,
        importedJob,
        timelineDigestMatches,
      ),
    };
  }

  private async requireOperatorAccess(userId: string) {
    await this.userCapabilities.requireCapability(userId, 'jobHistoryImport');
  }
}
