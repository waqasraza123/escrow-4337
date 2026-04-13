import { Inject, Injectable } from '@nestjs/common';
import { ESCROW_REPOSITORY } from '../../persistence/persistence.tokens';
import type { EscrowRepository } from '../../persistence/persistence.types';
import type {
  EscrowAuditEvent,
  EscrowAuthorityStatus,
  EscrowJobRecord,
  EscrowMilestoneRecord,
  EscrowOnchainProjectedMilestoneRecord,
  EscrowOnchainProjectionRecord,
} from '../escrow/escrow.types';
import { OperationsConfigService } from './operations.config';

const onchainAuditEventTypes = new Set<EscrowAuditEvent['type']>([
  'job.created',
  'job.funded',
  'job.milestones_set',
  'milestone.delivered',
  'milestone.released',
  'milestone.disputed',
  'milestone.resolved',
]);

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function compareAuditEvents(left: EscrowAuditEvent, right: EscrowAuditEvent) {
  if (left.at !== right.at) {
    return left.at - right.at;
  }

  return left.type.localeCompare(right.type);
}

function mergeAuditEvents(
  localAudit: EscrowAuditEvent[],
  chainAudit: EscrowOnchainProjectionRecord['chainAudit'],
) {
  return [
    ...localAudit.filter((event) => !onchainAuditEventTypes.has(event.type)),
    ...chainAudit,
  ].sort(compareAuditEvents);
}

function mergeMilestones(
  localMilestones: EscrowMilestoneRecord[],
  projectedMilestones: EscrowOnchainProjectedMilestoneRecord[],
) {
  return Array.from(
    { length: Math.max(localMilestones.length, projectedMilestones.length) },
    (_, index) => {
      const local =
        localMilestones[index] ??
        ({
          title: `Milestone ${index + 1}`,
          deliverable: '',
          amount: '0',
          status: 'pending',
        } satisfies EscrowMilestoneRecord);
      const projected = projectedMilestones[index];

      if (!projected) {
        return cloneValue(local);
      }

      return {
        ...cloneValue(local),
        status: projected.status,
        deliveredAt: projected.deliveredAt ?? undefined,
        disputedAt: projected.disputedAt ?? undefined,
        releasedAt: projected.releasedAt ?? undefined,
        resolvedAt: projected.resolvedAt ?? undefined,
        resolutionAction: projected.resolutionAction ?? undefined,
      } satisfies EscrowMilestoneRecord;
    },
  );
}

function latestLocalOnchainActivityAt(job: EscrowJobRecord) {
  const onchainAuditTimes = job.audit
    .filter((event) => onchainAuditEventTypes.has(event.type))
    .map((event) => event.at);
  const milestoneTimes = job.milestones.flatMap((milestone) =>
    [
      milestone.deliveredAt,
      milestone.disputedAt,
      milestone.releasedAt,
      milestone.resolvedAt,
    ].filter((value): value is number => typeof value === 'number'),
  );
  const executionTimes = job.executions
    .filter((execution) => execution.status === 'confirmed')
    .map((execution) => execution.confirmedAt ?? execution.submittedAt);
  const fundedAt =
    job.fundedAmount !== null
      ? job.audit
          .filter((event) => event.type === 'job.funded')
          .map((event) => event.at)
      : [];
  const times = [
    ...onchainAuditTimes,
    ...milestoneTimes,
    ...executionTimes,
    ...fundedAt,
  ];

  return times.length > 0 ? Math.max(...times) : job.updatedAt;
}

@Injectable()
export class EscrowOnchainAuthorityService {
  constructor(
    @Inject(ESCROW_REPOSITORY)
    private readonly escrowRepository: EscrowRepository,
    private readonly operationsConfig: OperationsConfigService,
  ) {}

  async getProjection(jobId: string) {
    return this.escrowRepository.getOnchainProjection(jobId);
  }

  getAuthorityStatus(
    projection: EscrowOnchainProjectionRecord | null,
    now = Date.now(),
  ): EscrowAuthorityStatus {
    const authorityReadsEnabled =
      this.operationsConfig.escrowAuthorityReadsEnabled;
    const projectionFresh =
      !!projection &&
      now - projection.projectedAt <=
        this.operationsConfig.escrowChainSyncBacklogMs;
    const projectionHealthy = projection?.health === 'healthy';

    if (
      authorityReadsEnabled &&
      projection &&
      projectionFresh &&
      projectionHealthy
    ) {
      return {
        source: 'chain_projection',
        authorityReadsEnabled,
        projectionAvailable: true,
        projectionFresh: true,
        projectionHealthy: true,
        projectedAt: projection.projectedAt,
        lastProjectedBlock: projection.lastProjectedBlock,
        lastEventCount: projection.lastEventCount,
        reason: null,
      };
    }

    return {
      source: 'local_fallback',
      authorityReadsEnabled,
      projectionAvailable: projection !== null,
      projectionFresh,
      projectionHealthy,
      projectedAt: projection?.projectedAt ?? null,
      lastProjectedBlock: projection?.lastProjectedBlock ?? null,
      lastEventCount: projection?.lastEventCount ?? null,
      reason: !authorityReadsEnabled
        ? 'authority_reads_disabled'
        : !projection
          ? 'projection_missing'
          : !projectionHealthy
            ? (projection.degradedReason ?? 'projection_degraded')
            : 'projection_stale',
    };
  }

  async mergeJob(
    localJob: EscrowJobRecord,
    now = Date.now(),
  ): Promise<{
    job: EscrowJobRecord;
    authority: EscrowAuthorityStatus;
    projection: EscrowOnchainProjectionRecord | null;
  }> {
    const projection = await this.escrowRepository.getOnchainProjection(
      localJob.id,
    );
    const authority = this.getAuthorityStatus(projection, now);
    const projectionBehindLocal =
      !!projection &&
      projection.projectedAt < latestLocalOnchainActivityAt(localJob);

    if (
      !projection ||
      authority.source === 'local_fallback' ||
      projectionBehindLocal
    ) {
      return {
        job: cloneValue(localJob),
        authority: projectionBehindLocal
          ? {
              ...authority,
              source: 'local_fallback',
              reason: 'projection_older_than_local_state',
            }
          : authority,
        projection,
      };
    }

    return {
      job: {
        ...cloneValue(localJob),
        fundedAmount: projection.fundedAmount,
        status: projection.status,
        updatedAt: Math.max(localJob.updatedAt, projection.projectedAt),
        milestones: mergeMilestones(localJob.milestones, projection.milestones),
        audit: mergeAuditEvents(localJob.audit, projection.chainAudit),
      },
      authority,
      projection,
    };
  }
}
