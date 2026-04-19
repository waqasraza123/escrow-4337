import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { BigNumber, utils } from 'ethers';
import { normalizeEvmAddress } from '../../common/evm-address';
import { ESCROW_REPOSITORY } from '../../persistence/persistence.tokens';
import type { EscrowRepository } from '../../persistence/persistence.types';
import type {
  EscrowAuditEvent,
  EscrowChainCursorRecord,
  EscrowChainEventPayload,
  EscrowChainEventRecord,
  EscrowChainSyncRecord,
  EscrowJobRecord,
  EscrowOnchainProjectedMilestoneRecord,
  EscrowOnchainProjectionRecord,
  JobStatus,
  MilestoneStatus,
} from '../escrow/escrow.types';
import { EscrowContractConfigService } from '../escrow/onchain/escrow-contract.config';
import { UserCapabilitiesService } from '../users/user-capabilities.service';
import {
  ESCROW_CHAIN_LOG_PROVIDER,
  type EscrowChainLog,
  type EscrowChainLogProvider,
} from './escrow-chain-log.provider';
import { EscrowChainIngestionStatusService } from './escrow-chain-ingestion-status.service';
import { EscrowChainSyncDaemonMonitoringService } from './escrow-chain-sync-daemon-monitoring.service';
import { EscrowChainSyncDaemonStatusService } from './escrow-chain-sync-daemon-status.service';
import type {
  EscrowAttentionReason,
  EscrowChainSyncBatchItem,
  EscrowChainSyncBatchReport,
  EscrowChainSyncDaemonHealthReport,
  EscrowChainSyncDaemonStatus,
  EscrowChainSyncIssue,
  EscrowChainSyncReport,
} from './escrow-health.types';
import { EscrowHealthService } from './escrow-health.service';
import { OperationsConfigService } from './operations.config';
import { EscrowReconciliationService } from './escrow-reconciliation.service';

const MINOR_UNIT_SCALE = 1_000_000n;
const streamName = 'workstream_escrow' as const;
const contractInterface = new utils.Interface([
  'event JobCreated(uint256 indexed escrowId, address indexed client, bytes32 jobHash)',
  'event EscrowFunded(uint256 indexed escrowId, uint256 amount, address currency)',
  'event MilestonesSet(uint256 indexed escrowId, uint256 count)',
  'event MilestoneDelivered(uint256 indexed escrowId, uint256 indexed mid, bytes32 deliverableHash)',
  'event MilestoneReleased(uint256 indexed escrowId, uint256 indexed mid, uint256 amount)',
  'event DisputeOpened(uint256 indexed escrowId, uint256 indexed mid, bytes32 reasonHash)',
  'event DisputeResolved(uint256 indexed escrowId, uint256 indexed mid, uint16 splitBpsClient)',
]);
const chainEventTopics = [
  contractInterface.getEventTopic('JobCreated'),
  contractInterface.getEventTopic('EscrowFunded'),
  contractInterface.getEventTopic('MilestonesSet'),
  contractInterface.getEventTopic('MilestoneDelivered'),
  contractInterface.getEventTopic('MilestoneReleased'),
  contractInterface.getEventTopic('DisputeOpened'),
  contractInterface.getEventTopic('DisputeResolved'),
];

type ParsedChainAuditEvent = {
  event: Extract<
    EscrowAuditEvent,
    {
      type:
        | 'job.created'
        | 'job.funded'
        | 'job.milestones_set'
        | 'milestone.delivered'
        | 'milestone.released'
        | 'milestone.disputed'
        | 'milestone.resolved';
    }
  >;
  fallbackAt: number;
  blockNumber: number;
  txHash: string;
};

type ProjectionBuildResult = {
  projection: EscrowOnchainProjectionRecord;
  mergedJob: EscrowJobRecord;
  issues: EscrowChainSyncIssue[];
  chainReconciliation: EscrowChainSyncReport['chainReconciliation'];
  localComparison: EscrowChainSyncReport['localComparison'];
};

type ChainStreamContext = {
  chainId: number;
  contractAddress: string;
  source: EscrowChainEventRecord['source'];
  ingestionKind: EscrowChainEventRecord['ingestionKind'];
  ingestedAt: number | null;
  correlationId: string | null;
  mirrorStatus: EscrowChainEventRecord['mirrorStatus'];
  persistedVia: EscrowChainEventRecord['persistedVia'];
};

type BuildSyncReportContext = {
  fetchedLogs: number;
  duplicateLogs: number;
  latestBlock: number;
  fromBlock: number;
  toBlock: number;
  persistProjection: boolean;
  replaySource: 'fresh_fetch' | 'persisted_mirror';
  correlationId: string | null;
  now: number;
};

type EscrowChainSyncBatchSelection = {
  totalJobs: number;
  matchedJobs: number;
  jobs: EscrowJobRecord[];
};

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

function digest(value: unknown) {
  return createHash('sha256').update(stableSerialize(value)).digest('hex');
}

function buildMirrorCorrelationId(scope: string, value: unknown) {
  return `${scope}_${digest(value).slice(0, 16)}`;
}

function buildMirrorSummary(
  chainEvents: EscrowChainEventRecord[],
  replaySource: 'fresh_fetch' | 'persisted_mirror',
  correlationId: string | null,
): EscrowChainSyncReport['mirror'] {
  const latestEvent = [...chainEvents].sort(sortChainEvents).at(-1) ?? null;

  return {
    eventCount: chainEvents.length,
    replaySource,
    correlationId: correlationId ?? latestEvent?.correlationId ?? null,
    latestEvent: latestEvent
      ? {
          eventName: latestEvent.payload.eventName,
          blockNumber: latestEvent.blockNumber,
          logIndex: latestEvent.logIndex,
          txHash: latestEvent.transactionHash,
          blockTimeMs: latestEvent.blockTimeMs,
          source: latestEvent.source,
          ingestionKind: latestEvent.ingestionKind,
          ingestedAt: latestEvent.ingestedAt,
          mirrorStatus: latestEvent.mirrorStatus,
          persistedVia: latestEvent.persistedVia,
          correlationId: latestEvent.correlationId,
        }
      : null,
  };
}

function buildReplaySummary(
  chainEvents: EscrowChainEventRecord[],
  issues: EscrowChainSyncIssue[],
  localComparison: EscrowChainSyncReport['localComparison'],
): EscrowChainSyncReport['replay'] {
  const criticalIssue = issues.find((issue) => issue.severity === 'critical');

  if (chainEvents.length === 0) {
    return {
      status: 'blocked',
      driftSource: 'missing_chain_events',
      failedCause:
        criticalIssue?.summary ??
        'No mirrored chain events were available for replay.',
      retryPosture: 'expand_range_or_reingest',
    };
  }

  if (criticalIssue) {
    return {
      status: 'blocked',
      driftSource:
        criticalIssue.code === 'unsupported_partial_resolution'
          ? 'unsupported_event_shape'
          : 'ingestion_gap',
      failedCause: criticalIssue.summary,
      retryPosture:
        criticalIssue.code === 'unsupported_partial_resolution'
          ? 'hold_for_model_support'
          : 'expand_range_or_reingest',
    };
  }

  if (!localComparison.aggregateMatches) {
    return {
      status: 'drifted',
      driftSource: 'aggregate_mismatch',
      failedCause:
        'The replayed chain projection still diverges from persisted aggregate state.',
      retryPosture: 'safe_to_retry',
    };
  }

  if (!localComparison.auditDigestMatches) {
    return {
      status: 'drifted',
      driftSource: 'audit_digest_mismatch',
      failedCause:
        'The replayed chain audit digest differs from persisted audit history.',
      retryPosture: 'safe_to_retry',
    };
  }

  return {
    status: 'clean',
    driftSource: 'none',
    failedCause: null,
    retryPosture: 'safe_to_retry',
  };
}

function formatMinorUnits(amountMinorUnits: string) {
  const value = BigInt(amountMinorUnits);
  const wholeUnits = value / MINOR_UNIT_SCALE;
  const fractionalUnits = (value % MINOR_UNIT_SCALE)
    .toString()
    .padStart(6, '0')
    .replace(/0+$/, '');

  return fractionalUnits.length > 0
    ? `${wholeUnits.toString()}.${fractionalUnits}`
    : wholeUnits.toString();
}

function cloneJob(job: EscrowJobRecord): EscrowJobRecord {
  return structuredClone(job);
}

function readParsedStringArg(args: utils.Result, key: string) {
  const value: unknown = args[key];
  if (typeof value !== 'string') {
    throw new Error(`Expected chain event argument ${key} to be a string.`);
  }
  return value;
}

function readParsedIntegerArg(args: utils.Result, key: string) {
  const value: unknown = args[key];
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return Number.parseInt(value, 10);
  }
  if (BigNumber.isBigNumber(value)) {
    return value.toNumber();
  }
  throw new Error(`Expected chain event argument ${key} to be an integer.`);
}

function readParsedNumberishStringArg(args: utils.Result, key: string) {
  const value: unknown = args[key];
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return value.toString();
  }
  if (BigNumber.isBigNumber(value)) {
    return value.toString();
  }
  throw new Error(`Expected chain event argument ${key} to be numeric.`);
}

function summarizeChainSyncRecord(
  report: EscrowChainSyncReport,
): EscrowChainSyncRecord {
  const criticalIssueCount =
    report.issues.filter((issue) => issue.severity === 'critical').length +
    (report.chainReconciliation?.issues.filter(
      (issue) => issue.severity === 'critical',
    ).length ?? 0);
  const issueCount =
    report.issues.length + (report.chainReconciliation?.issueCount ?? 0);
  const syncedAtMs = Date.parse(report.syncedAt);
  const blocked =
    report.persistence.requested && report.persistence.blocked === true;

  return {
    lastAttemptedAt: syncedAtMs,
    lastOutcome: blocked ? 'blocked' : 'succeeded',
    lastMode: report.mode,
    lastSuccessfulAt: syncedAtMs,
    lastPersistedAt: report.persistence.applied ? syncedAtMs : undefined,
    lastSyncedBlock: report.range.toBlock,
    lastIssueCount: issueCount,
    lastCriticalIssueCount: criticalIssueCount,
    lastReconciliationIssueCount: report.chainReconciliation?.issueCount ?? 0,
    lastErrorMessage: undefined,
  };
}

function summarizeChainSyncFailure(
  attemptedAtMs: number,
  error: unknown,
): EscrowChainSyncRecord {
  return {
    lastAttemptedAt: attemptedAtMs,
    lastOutcome: 'failed',
    lastMode: 'preview',
    lastIssueCount: 0,
    lastCriticalIssueCount: 0,
    lastReconciliationIssueCount: 0,
    lastErrorMessage:
      error instanceof Error ? error.message : 'Batch chain sync failed',
  };
}

function compareLogs(left: EscrowChainLog, right: EscrowChainLog) {
  return (
    left.blockNumber - right.blockNumber ||
    left.logIndex - right.logIndex ||
    left.transactionHash.localeCompare(right.transactionHash)
  );
}

function dedupeLogs(logs: EscrowChainLog[]) {
  const unique: EscrowChainLog[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;

  for (const log of [...logs].sort(compareLogs)) {
    const key = `${log.transactionHash}:${log.logIndex}`;
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);
    unique.push(log);
  }

  return {
    unique,
    duplicateCount,
  };
}

function sortChainEvents(
  left: EscrowChainEventRecord,
  right: EscrowChainEventRecord,
) {
  return (
    left.blockNumber - right.blockNumber ||
    left.logIndex - right.logIndex ||
    left.transactionHash.localeCompare(right.transactionHash)
  );
}

function eventMatchKey(event: EscrowAuditEvent) {
  return `${event.type}:${stableSerialize(event.payload)}`;
}

function applyStableAuditTimestamps(
  events: ParsedChainAuditEvent[],
  localAudit: EscrowAuditEvent[],
) {
  const localByKey = new Map<string, number[]>();

  for (const [index, event] of localAudit.entries()) {
    const key = eventMatchKey(event);
    const indices = localByKey.get(key) ?? [];
    indices.push(index);
    localByKey.set(key, indices);
  }

  return events.map(({ event, fallbackAt }) => {
    const key = eventMatchKey(event);
    const indices = localByKey.get(key);
    const localIndex = indices?.shift();

    return {
      ...event,
      at:
        typeof localIndex === 'number'
          ? (localAudit[localIndex]?.at ?? fallbackAt)
          : fallbackAt,
    };
  });
}

function toAuditDigest(audit: EscrowAuditEvent[]) {
  return digest(audit);
}

function toAggregateMismatchSummary(
  localJob: EscrowJobRecord,
  chainDerivedJob: EscrowJobRecord,
) {
  const mismatchedMilestones: Array<{
    index: number;
    localStatus: MilestoneStatus | null;
    chainDerivedStatus: MilestoneStatus | null;
  }> = [];

  for (
    let index = 0;
    index <
    Math.max(localJob.milestones.length, chainDerivedJob.milestones.length);
    index += 1
  ) {
    const localStatus = localJob.milestones[index]?.status ?? null;
    const chainDerivedStatus =
      chainDerivedJob.milestones[index]?.status ?? null;
    if (localStatus === chainDerivedStatus) {
      continue;
    }

    mismatchedMilestones.push({
      index,
      localStatus,
      chainDerivedStatus,
    });
  }

  return {
    aggregateMatches:
      localJob.status === chainDerivedJob.status &&
      localJob.fundedAmount === chainDerivedJob.fundedAmount &&
      mismatchedMilestones.length === 0,
    auditDigestMatches:
      toAuditDigest(localJob.audit) === toAuditDigest(chainDerivedJob.audit),
    localStatus: localJob.status,
    chainDerivedStatus: chainDerivedJob.status,
    localFundedAmount: localJob.fundedAmount,
    chainDerivedFundedAmount: chainDerivedJob.fundedAmount,
    localAuditEvents: localJob.audit.length,
    chainAuditEvents: chainDerivedJob.audit.length,
    mismatchedMilestones,
  };
}

function isOnchainAuditEventType(type: EscrowAuditEvent['type']) {
  return (
    type === 'job.created' ||
    type === 'job.funded' ||
    type === 'job.milestones_set' ||
    type === 'milestone.delivered' ||
    type === 'milestone.released' ||
    type === 'milestone.disputed' ||
    type === 'milestone.resolved'
  );
}

function compareAuditEvents(left: EscrowAuditEvent, right: EscrowAuditEvent) {
  return left.at - right.at || left.type.localeCompare(right.type);
}

function mergeLocalAndChainAudit(
  localAudit: EscrowAuditEvent[],
  chainAudit: EscrowOnchainProjectionRecord['chainAudit'],
) {
  return [
    ...localAudit.filter((event) => !isOnchainAuditEventType(event.type)),
    ...chainAudit,
  ].sort(compareAuditEvents);
}

function createProjectedMilestone(): EscrowOnchainProjectedMilestoneRecord {
  return {
    status: 'pending',
    deliveredAt: null,
    disputedAt: null,
    releasedAt: null,
    resolvedAt: null,
    resolutionAction: null,
  };
}

function ensureProjectedMilestone(
  milestones: EscrowOnchainProjectedMilestoneRecord[],
  index: number,
) {
  while (milestones.length <= index) {
    milestones.push(createProjectedMilestone());
  }

  return milestones[index];
}

function deriveExpectedJobStatus(
  milestones: Array<Pick<EscrowOnchainProjectedMilestoneRecord, 'status'>>,
  fundedAmount: string | null,
): JobStatus {
  const milestoneStatuses = milestones.map((milestone) => milestone.status);

  if (milestoneStatuses.includes('disputed')) {
    return 'disputed';
  }

  const allFinal =
    milestoneStatuses.length > 0 &&
    milestoneStatuses.every(
      (status) => status === 'released' || status === 'refunded',
    );

  if (allFinal) {
    return milestoneStatuses.includes('refunded') ? 'resolved' : 'completed';
  }

  if (
    milestoneStatuses.some(
      (status) =>
        status === 'delivered' ||
        status === 'released' ||
        status === 'refunded',
    )
  ) {
    return 'in_progress';
  }

  if (fundedAmount !== null) {
    return 'funded';
  }

  return 'draft';
}

function mergeProjectedMilestones(
  localJob: EscrowJobRecord,
  projection: EscrowOnchainProjectionRecord,
) {
  return Array.from(
    {
      length: Math.max(
        localJob.milestones.length,
        projection.milestones.length,
      ),
    },
    (_, index) => {
      const local =
        localJob.milestones[index] ??
        ({
          title: `Milestone ${index + 1}`,
          deliverable: '',
          amount: '0',
          status: 'pending',
        } satisfies EscrowJobRecord['milestones'][number]);
      const projected = projection.milestones[index];

      if (!projected) {
        return structuredClone(local);
      }

      return {
        ...structuredClone(local),
        status: projected.status,
        deliveredAt: projected.deliveredAt ?? undefined,
        disputedAt: projected.disputedAt ?? undefined,
        releasedAt: projected.releasedAt ?? undefined,
        resolvedAt: projected.resolvedAt ?? undefined,
        resolutionAction: projected.resolutionAction ?? undefined,
      };
    },
  );
}

function mergeProjectionIntoJob(
  localJob: EscrowJobRecord,
  projection: EscrowOnchainProjectionRecord,
): EscrowJobRecord {
  const mergedJob = cloneJob(localJob);
  mergedJob.fundedAmount = projection.fundedAmount;
  mergedJob.status = projection.status;
  mergedJob.updatedAt = Math.max(localJob.updatedAt, projection.projectedAt);
  mergedJob.audit = mergeLocalAndChainAudit(
    localJob.audit,
    projection.chainAudit,
  );
  mergedJob.milestones = mergeProjectedMilestones(localJob, projection);
  return mergedJob;
}

function projectionShape(projection: EscrowOnchainProjectionRecord) {
  return {
    chainId: projection.chainId,
    contractAddress: projection.contractAddress,
    escrowId: projection.escrowId,
    lastProjectedBlock: projection.lastProjectedBlock,
    lastEventBlock: projection.lastEventBlock,
    lastEventCount: projection.lastEventCount,
    digest: projection.digest,
    health: projection.health,
    degradedReason: projection.degradedReason,
    fundedAmount: projection.fundedAmount,
    status: projection.status,
    milestones: projection.milestones,
    chainAudit: projection.chainAudit,
    driftSummary: projection.driftSummary,
  };
}

@Injectable()
export class EscrowChainSyncService {
  constructor(
    @Inject(ESCROW_REPOSITORY)
    private readonly escrowRepository: EscrowRepository,
    @Inject(ESCROW_CHAIN_LOG_PROVIDER)
    private readonly chainLogProvider: EscrowChainLogProvider,
    private readonly userCapabilities: UserCapabilitiesService,
    private readonly operationsConfig: OperationsConfigService,
    private readonly escrowContractConfig: EscrowContractConfigService,
    private readonly escrowHealthService: EscrowHealthService,
    private readonly reconciliationService: EscrowReconciliationService,
    private readonly daemonStatusService: EscrowChainSyncDaemonStatusService,
    private readonly daemonMonitoringService: EscrowChainSyncDaemonMonitoringService,
    private readonly ingestionStatusService: EscrowChainIngestionStatusService,
  ) {}

  async syncJobAudit(
    userId: string,
    input: {
      jobId: string;
      fromBlock?: number;
      toBlock?: number;
      persist?: boolean;
    },
    now = Date.now(),
  ): Promise<EscrowChainSyncReport> {
    await this.requireOperatorAccess(userId);

    const localJob = await this.escrowRepository.getById(input.jobId);
    if (!localJob) {
      throw new NotFoundException('Job not found');
    }
    if (!localJob.onchain.escrowId) {
      throw new ConflictException('Job does not have an onchain escrow id');
    }

    const latestBlock = await this.readLatestBlockNumber();
    const fromBlock = this.resolveFromBlock(localJob, input.fromBlock);
    const toBlock = input.toBlock ?? latestBlock;
    if (toBlock < fromBlock) {
      throw new BadRequestException(
        'toBlock must be greater than or equal to fromBlock',
      );
    }
    if (toBlock - fromBlock > this.operationsConfig.escrowSyncMaxRangeBlocks) {
      throw new BadRequestException(
        `Requested block range exceeds the configured max of ${this.operationsConfig.escrowSyncMaxRangeBlocks} blocks`,
      );
    }

    const fetchedLogs = await this.readLogs(localJob, fromBlock, toBlock);
    const { unique, duplicateCount } = dedupeLogs(fetchedLogs);
    const correlationId = buildMirrorCorrelationId('manual_sync', {
      jobId: input.jobId,
      fromBlock,
      toBlock,
      persist: input.persist === true,
      latestBlock,
      now,
    });
    const fetchedEvents = await this.toChainEventRecords(
      {
        chainId: localJob.onchain.chainId,
        contractAddress: localJob.onchain.contractAddress,
        source: 'rpc_log',
        ingestionKind: 'manual_sync',
        ingestedAt: now,
        correlationId,
        mirrorStatus: input.persist === true ? 'persisted' : 'preview_only',
        persistedVia: input.persist === true ? 'upsert' : null,
      },
      unique,
    );

    if (input.persist === true) {
      await this.escrowRepository.upsertChainEvents(fetchedEvents);
    }

    const chainEvents =
      input.persist === true
        ? await this.escrowRepository.listChainEvents({
            chainId: localJob.onchain.chainId,
            contractAddress: localJob.onchain.contractAddress,
            escrowId: localJob.onchain.escrowId,
          })
        : fetchedEvents;

    return this.buildSyncReport(localJob, chainEvents, {
      fetchedLogs: fetchedLogs.length,
      duplicateLogs: duplicateCount,
      latestBlock,
      fromBlock,
      toBlock,
      persistProjection: input.persist === true,
      replaySource: input.persist === true ? 'persisted_mirror' : 'fresh_fetch',
      correlationId,
      now,
    });
  }

  async syncBatch(
    userId: string,
    input: {
      scope?: 'all' | 'attention';
      reason?: EscrowAttentionReason;
      limit?: number;
      persist?: boolean;
    },
    now = Date.now(),
  ): Promise<EscrowChainSyncBatchReport> {
    await this.requireOperatorAccess(userId);

    if (
      input.persist === true &&
      this.operationsConfig.escrowIngestionEnabled
    ) {
      await this.ingestFinalizedRange(now);
    }

    const scope = input.scope ?? 'attention';
    const limit = this.resolveBatchLimit(
      input.limit,
      this.operationsConfig.escrowHealthDefaultLimit,
    );
    const reason = scope === 'attention' ? (input.reason ?? null) : null;
    const selection = await this.selectBatchJobs(
      userId,
      {
        scope,
        reason,
        limit,
      },
      now,
    );

    return this.runBatchSelection(
      {
        scope,
        reason,
        limit,
        persist: input.persist,
      },
      selection,
      now,
    );
  }

  async runBatchBackfill(
    input: {
      limit?: number;
      persist?: boolean;
    } = {},
    now = Date.now(),
  ): Promise<EscrowChainSyncBatchReport> {
    const limit = this.resolveBatchLimit(
      input.limit,
      this.operationsConfig.escrowBatchSyncLimit,
    );
    if (this.operationsConfig.escrowIngestionEnabled) {
      await this.ingestFinalizedRange(now);
    }
    const selection = await this.selectAllBatchJobs(limit);

    return this.runBatchSelection(
      {
        scope: 'all',
        reason: null,
        limit,
        persist: input.persist ?? this.operationsConfig.escrowBatchSyncPersist,
      },
      selection,
      now,
    );
  }

  async getDaemonStatus(
    userId: string,
  ): Promise<EscrowChainSyncDaemonStatus | null> {
    await this.requireOperatorAccess(userId);
    return this.daemonStatusService.getStatus();
  }

  async getDaemonHealthReport(
    userId: string,
  ): Promise<EscrowChainSyncDaemonHealthReport> {
    await this.requireOperatorAccess(userId);
    return this.daemonMonitoringService.getReport();
  }

  async getIngestionStatus(userId: string) {
    await this.requireOperatorAccess(userId);
    return this.ingestionStatusService.getStatus();
  }

  private async runBatchSelection(
    input: {
      scope: 'all' | 'attention';
      reason: EscrowAttentionReason | null;
      limit: number;
      persist?: boolean;
    },
    selection: EscrowChainSyncBatchSelection,
    now: number,
  ): Promise<EscrowChainSyncBatchReport> {
    const startedAt = new Date(now).toISOString();
    const jobs: EscrowChainSyncBatchItem[] = [];
    const latestBlock =
      selection.jobs.length > 0 ? await this.readLatestBlockNumber() : null;

    for (const job of selection.jobs) {
      try {
        const sync = await this.syncPersistedJobAudit(
          job,
          {
            persist: input.persist === true,
          },
          {
            latestBlock: latestBlock ?? 0,
            now,
          },
        );
        const criticalIssueCount =
          sync.issues.filter((issue) => issue.severity === 'critical').length +
          (sync.chainReconciliation?.issues.filter(
            (issue) => issue.severity === 'critical',
          ).length ?? 0);
        const issueCount =
          sync.issues.length + (sync.chainReconciliation?.issueCount ?? 0);
        const changed = sync.normalization.auditChanged;
        const persisted = sync.persistence.applied;
        const blocked = sync.persistence.blocked || criticalIssueCount > 0;

        jobs.push({
          jobId: sync.job.jobId,
          title: sync.job.title,
          outcome: persisted
            ? 'persisted'
            : blocked
              ? 'blocked'
              : changed
                ? 'changed'
                : 'clean',
          changed,
          persisted,
          blocked,
          issueCount,
          criticalIssueCount,
          reconciliationIssueCount: sync.chainReconciliation?.issueCount ?? 0,
          errorMessage: null,
          sync,
        });
      } catch (error) {
        const failedJob = cloneJob(job);
        failedJob.operations.chainSync = summarizeChainSyncFailure(now, error);
        await this.escrowRepository.save(failedJob);
        jobs.push({
          jobId: job.id,
          title: job.title,
          outcome: 'failed',
          changed: false,
          persisted: false,
          blocked: false,
          issueCount: 0,
          criticalIssueCount: 0,
          reconciliationIssueCount: 0,
          errorMessage:
            error instanceof Error ? error.message : 'Batch chain sync failed',
          sync: null,
        });
      }
    }

    return {
      startedAt,
      completedAt: new Date(Date.now()).toISOString(),
      mode: input.persist === true ? 'persisted' : 'preview',
      filters: {
        scope: input.scope,
        reason: input.reason,
        limit: input.limit,
      },
      selection: {
        totalJobs: selection.totalJobs,
        matchedJobs: selection.matchedJobs,
        selectedJobs: jobs.length,
      },
      summary: {
        processedJobs: jobs.filter((job) => job.outcome !== 'failed').length,
        cleanJobs: jobs.filter((job) => job.outcome === 'clean').length,
        changedJobs: jobs.filter(
          (job) => job.outcome === 'changed' || job.outcome === 'persisted',
        ).length,
        persistedJobs: jobs.filter((job) => job.outcome === 'persisted').length,
        blockedJobs: jobs.filter((job) => job.outcome === 'blocked').length,
        failedJobs: jobs.filter((job) => job.outcome === 'failed').length,
        criticalIssueJobs: jobs.filter((job) => job.criticalIssueCount > 0)
          .length,
      },
      jobs,
    };
  }

  private async syncPersistedJobAudit(
    localJob: EscrowJobRecord,
    input: {
      fromBlock?: number;
      toBlock?: number;
      persist?: boolean;
    },
    context: {
      latestBlock: number;
      now: number;
    },
  ): Promise<EscrowChainSyncReport> {
    if (!localJob.onchain.escrowId) {
      throw new ConflictException('Job does not have an onchain escrow id');
    }

    const requestedRange =
      typeof input.fromBlock === 'number' || typeof input.toBlock === 'number';
    if (!requestedRange) {
      const storedEvents = await this.escrowRepository.listChainEvents({
        chainId: localJob.onchain.chainId,
        contractAddress: localJob.onchain.contractAddress,
        escrowId: localJob.onchain.escrowId,
      });

      if (storedEvents.length > 0) {
        const sortedEvents = [...storedEvents].sort(sortChainEvents);
        const fromBlock = sortedEvents[0]?.blockNumber ?? 0;
        const toBlock =
          sortedEvents[sortedEvents.length - 1]?.blockNumber ?? fromBlock;

        return this.buildSyncReport(localJob, sortedEvents, {
          fetchedLogs: sortedEvents.length,
          duplicateLogs: 0,
          latestBlock: context.latestBlock,
          fromBlock,
          toBlock,
          persistProjection: input.persist === true,
          replaySource: 'persisted_mirror',
          correlationId: null,
          now: context.now,
        });
      }
    }

    const fromBlock = this.resolveFromBlock(localJob, input.fromBlock);
    const toBlock = input.toBlock ?? context.latestBlock;
    if (toBlock < fromBlock) {
      throw new BadRequestException(
        'toBlock must be greater than or equal to fromBlock',
      );
    }
    if (toBlock - fromBlock > this.operationsConfig.escrowSyncMaxRangeBlocks) {
      throw new BadRequestException(
        `Requested block range exceeds the configured max of ${this.operationsConfig.escrowSyncMaxRangeBlocks} blocks`,
      );
    }

    const logs = await this.readLogs(localJob, fromBlock, toBlock);
    const dedupedLogs = dedupeLogs(logs);
    const correlationId = buildMirrorCorrelationId('manual_sync', {
      jobId: localJob.id,
      fromBlock,
      toBlock,
      persist: input.persist === true,
      latestBlock: context.latestBlock,
      now: context.now,
    });
    const chainEvents = await this.toChainEventRecords(
      {
        chainId: localJob.onchain.chainId,
        contractAddress: localJob.onchain.contractAddress,
        source: 'rpc_log',
        ingestionKind: 'manual_sync',
        ingestedAt: context.now,
        correlationId,
        mirrorStatus: input.persist === true ? 'persisted' : 'preview_only',
        persistedVia: input.persist === true ? 'upsert' : null,
      },
      dedupedLogs.unique,
    );

    if (input.persist === true) {
      await this.escrowRepository.upsertChainEvents(chainEvents);
    }

    return this.buildSyncReport(localJob, chainEvents, {
      fetchedLogs: logs.length,
      duplicateLogs: dedupedLogs.duplicateCount,
      latestBlock: context.latestBlock,
      fromBlock,
      toBlock,
      persistProjection: input.persist === true,
      replaySource: input.persist === true ? 'persisted_mirror' : 'fresh_fetch',
      correlationId,
      now: context.now,
    });
  }

  private async buildSyncReport(
    localJob: EscrowJobRecord,
    chainEvents: EscrowChainEventRecord[],
    context: BuildSyncReportContext,
  ): Promise<EscrowChainSyncReport> {
    const result = this.buildProjectionFromChainEvents(
      localJob,
      chainEvents,
      context.now,
    );
    const existingProjection = context.persistProjection
      ? await this.escrowRepository.getOnchainProjection(localJob.id)
      : null;
    const projectionChanged =
      existingProjection === null ||
      stableSerialize(projectionShape(existingProjection)) !==
        stableSerialize(projectionShape(result.projection));
    const localAggregateChanged =
      !result.localComparison.aggregateMatches ||
      !result.localComparison.auditDigestMatches;
    const blocked =
      result.issues.some((issue) => issue.severity === 'critical') ||
      chainEvents.length === 0;
    const applied =
      context.persistProjection &&
      !blocked &&
      (projectionChanged || localAggregateChanged);
    const mirror = buildMirrorSummary(
      chainEvents,
      context.replaySource,
      context.correlationId,
    );
    const replay = buildReplaySummary(
      chainEvents,
      result.issues,
      result.localComparison,
    );

    const report: EscrowChainSyncReport = {
      syncedAt: new Date(context.now).toISOString(),
      mode: applied ? 'persisted' : 'preview',
      job: {
        jobId: localJob.id,
        title: localJob.title,
        chainId: localJob.onchain.chainId,
        contractAddress: localJob.onchain.contractAddress,
        escrowId: localJob.onchain.escrowId ?? '',
      },
      range: {
        fromBlock: context.fromBlock,
        toBlock: context.toBlock,
        latestBlock: context.latestBlock,
        lookbackBlocks: this.operationsConfig.escrowSyncLookbackBlocks,
      },
      normalization: {
        fetchedLogs: context.fetchedLogs,
        duplicateLogs: context.duplicateLogs,
        uniqueLogs: chainEvents.length,
        auditEvents: result.projection.chainAudit.length,
        auditChanged:
          !result.localComparison.auditDigestMatches ||
          !result.localComparison.aggregateMatches,
      },
      mirror,
      replay,
      issues: result.issues,
      chainReconciliation: result.chainReconciliation,
      localComparison: result.localComparison,
      persistence: {
        requested: context.persistProjection,
        applied,
        blocked: context.persistProjection && blocked,
        blockedReason:
          context.persistProjection && blocked
            ? 'Critical ingestion issues must be resolved before persisting chain-derived audit state.'
            : null,
      },
    };

    if (context.persistProjection && !blocked) {
      await this.escrowRepository.saveOnchainProjection(result.projection);
    }

    const jobForMetadata =
      context.persistProjection && !blocked && localAggregateChanged
        ? result.mergedJob
        : cloneJob(localJob);
    jobForMetadata.operations.chainSync = summarizeChainSyncRecord(report);
    await this.escrowRepository.save(jobForMetadata);

    return report;
  }

  private buildProjectionFromChainEvents(
    localJob: EscrowJobRecord,
    chainEvents: EscrowChainEventRecord[],
    now: number,
  ): ProjectionBuildResult {
    const issues: EscrowChainSyncIssue[] = [];
    const sortedEvents = [...chainEvents].sort(sortChainEvents);
    const projectedMilestones: EscrowOnchainProjectedMilestoneRecord[] = [];
    const parsedAuditEvents: ParsedChainAuditEvent[] = [];
    let fundedAmount: string | null = null;

    for (const event of sortedEvents) {
      switch (event.payload.eventName) {
        case 'JobCreated': {
          const clientAddress = normalizeEvmAddress(
            event.payload.clientAddress,
          );
          const jobHash = event.payload.jobHash.toLowerCase();
          if (
            clientAddress !==
            normalizeEvmAddress(localJob.onchain.clientAddress)
          ) {
            issues.push({
              code: 'job_created_client_mismatch',
              severity: 'critical',
              summary:
                'The onchain JobCreated client does not match the persisted local client.',
              detail: `Expected ${normalizeEvmAddress(
                localJob.onchain.clientAddress,
              )} but received ${clientAddress}.`,
              blockNumber: event.blockNumber,
              txHash: event.transactionHash,
            });
          }
          if (jobHash !== localJob.jobHash.toLowerCase()) {
            issues.push({
              code: 'job_created_hash_mismatch',
              severity: 'critical',
              summary:
                'The onchain JobCreated hash does not match the persisted local job hash.',
              detail: `Expected ${localJob.jobHash.toLowerCase()} but received ${jobHash}.`,
              blockNumber: event.blockNumber,
              txHash: event.transactionHash,
            });
          }

          parsedAuditEvents.push({
            event: {
              type: 'job.created',
              at: event.blockTimeMs,
              payload: {
                jobId: localJob.id,
                category: localJob.category,
                escrowId: localJob.onchain.escrowId ?? '',
              },
            },
            fallbackAt: event.blockTimeMs,
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
          });
          break;
        }
        case 'EscrowFunded': {
          const currencyAddress = normalizeEvmAddress(
            event.payload.currencyAddress,
          );
          if (
            currencyAddress !==
            normalizeEvmAddress(localJob.onchain.currencyAddress)
          ) {
            issues.push({
              code: 'funding_currency_mismatch',
              severity: 'critical',
              summary:
                'The onchain funding event uses a currency address that does not match the persisted job.',
              detail: `Expected ${normalizeEvmAddress(
                localJob.onchain.currencyAddress,
              )} but received ${currencyAddress}.`,
              blockNumber: event.blockNumber,
              txHash: event.transactionHash,
            });
          }

          fundedAmount = formatMinorUnits(event.payload.amount);
          parsedAuditEvents.push({
            event: {
              type: 'job.funded',
              at: event.blockTimeMs,
              payload: {
                jobId: localJob.id,
                amount: fundedAmount,
              },
            },
            fallbackAt: event.blockTimeMs,
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
          });
          break;
        }
        case 'MilestonesSet': {
          for (let index = 0; index < event.payload.count; index += 1) {
            ensureProjectedMilestone(projectedMilestones, index);
          }
          parsedAuditEvents.push({
            event: {
              type: 'job.milestones_set',
              at: event.blockTimeMs,
              payload: {
                jobId: localJob.id,
                count: event.payload.count,
              },
            },
            fallbackAt: event.blockTimeMs,
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
          });
          break;
        }
        case 'MilestoneDelivered': {
          const milestone = ensureProjectedMilestone(
            projectedMilestones,
            event.payload.milestoneIndex,
          );
          milestone.status = 'delivered';
          milestone.deliveredAt = event.blockTimeMs;
          parsedAuditEvents.push({
            event: {
              type: 'milestone.delivered',
              at: event.blockTimeMs,
              payload: {
                jobId: localJob.id,
                milestoneIndex: event.payload.milestoneIndex,
              },
            },
            fallbackAt: event.blockTimeMs,
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
          });
          break;
        }
        case 'MilestoneReleased': {
          const milestone = ensureProjectedMilestone(
            projectedMilestones,
            event.payload.milestoneIndex,
          );
          milestone.status = 'released';
          milestone.releasedAt = event.blockTimeMs;
          parsedAuditEvents.push({
            event: {
              type: 'milestone.released',
              at: event.blockTimeMs,
              payload: {
                jobId: localJob.id,
                milestoneIndex: event.payload.milestoneIndex,
              },
            },
            fallbackAt: event.blockTimeMs,
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
          });
          break;
        }
        case 'DisputeOpened': {
          const milestone = ensureProjectedMilestone(
            projectedMilestones,
            event.payload.milestoneIndex,
          );
          milestone.status = 'disputed';
          milestone.disputedAt = event.blockTimeMs;
          parsedAuditEvents.push({
            event: {
              type: 'milestone.disputed',
              at: event.blockTimeMs,
              payload: {
                jobId: localJob.id,
                milestoneIndex: event.payload.milestoneIndex,
              },
            },
            fallbackAt: event.blockTimeMs,
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
          });
          break;
        }
        case 'DisputeResolved': {
          const milestone = ensureProjectedMilestone(
            projectedMilestones,
            event.payload.milestoneIndex,
          );
          let action: 'release' | 'refund' | null = null;
          if (event.payload.splitBpsClient === 0) {
            action = 'release';
          } else if (event.payload.splitBpsClient === 10_000) {
            action = 'refund';
          } else {
            issues.push({
              code: 'unsupported_partial_resolution',
              severity: 'critical',
              summary:
                'The onchain dispute resolution uses a partial client split that the persisted audit model cannot represent.',
              detail: `splitBpsClient=${event.payload.splitBpsClient}. Only 0 (release) and 10000 (refund) are currently representable.`,
              blockNumber: event.blockNumber,
              txHash: event.transactionHash,
            });
          }

          if (action) {
            milestone.status = action === 'release' ? 'released' : 'refunded';
            milestone.resolvedAt = event.blockTimeMs;
            milestone.resolutionAction = action;
            if (action === 'release') {
              milestone.releasedAt = event.blockTimeMs;
            }
            parsedAuditEvents.push({
              event: {
                type: 'milestone.resolved',
                at: event.blockTimeMs,
                payload: {
                  jobId: localJob.id,
                  milestoneIndex: event.payload.milestoneIndex,
                  action,
                },
              },
              fallbackAt: event.blockTimeMs,
              blockNumber: event.blockNumber,
              txHash: event.transactionHash,
            });
          }
          break;
        }
      }
    }

    if (sortedEvents.length === 0) {
      issues.push({
        code: 'no_chain_events_found',
        severity: 'critical',
        summary:
          'No escrow contract events were found for the requested job and block range.',
        detail:
          'Adjust the block range or confirm the RPC, contract address, and escrow id are correct.',
        blockNumber: null,
        txHash: null,
      });
    } else if (sortedEvents[0]?.payload.eventName !== 'JobCreated') {
      issues.push({
        code: 'job_created_log_missing',
        severity: 'critical',
        summary:
          'The scanned contract events do not include the expected JobCreated log for this escrow.',
        detail:
          'The block range may begin too late, or the persisted escrow id does not match the deployed contract history.',
        blockNumber: sortedEvents[0]?.blockNumber ?? null,
        txHash: sortedEvents[0]?.transactionHash ?? null,
      });
    }

    const chainAudit = applyStableAuditTimestamps(
      parsedAuditEvents,
      localJob.audit,
    );
    const projectedStatus = deriveExpectedJobStatus(
      projectedMilestones,
      fundedAmount,
    );
    const lastProjectedBlock =
      sortedEvents[sortedEvents.length - 1]?.blockNumber ?? null;
    const lastEventBlock = lastProjectedBlock;
    const projection: EscrowOnchainProjectionRecord = {
      jobId: localJob.id,
      chainId: localJob.onchain.chainId,
      contractAddress: localJob.onchain.contractAddress,
      escrowId: localJob.onchain.escrowId ?? '',
      projectedAt: now,
      lastProjectedBlock,
      lastEventBlock,
      lastEventCount: sortedEvents.length,
      digest: digest({
        fundedAmount,
        projectedStatus,
        projectedMilestones,
        chainAudit,
      }),
      health: issues.some((issue) => issue.severity === 'critical')
        ? 'degraded'
        : 'healthy',
      degradedReason:
        issues.find((issue) => issue.severity === 'critical')?.code ?? null,
      fundedAmount,
      status: projectedStatus,
      milestones: projectedMilestones,
      chainAudit,
      driftSummary: {
        aggregateMatches: true,
        auditDigestMatches: true,
        localStatus: localJob.status,
        projectedStatus,
        localFundedAmount: localJob.fundedAmount,
        projectedFundedAmount: fundedAmount,
        localAuditEvents: localJob.audit.length,
        projectedAuditEvents: chainAudit.length,
        mismatchedMilestones: [],
      },
    };
    const mergedJob = mergeProjectionIntoJob(localJob, projection);
    const localComparison = toAggregateMismatchSummary(localJob, mergedJob);
    projection.driftSummary = {
      aggregateMatches: localComparison.aggregateMatches,
      auditDigestMatches: localComparison.auditDigestMatches,
      localStatus: localComparison.localStatus,
      projectedStatus: projection.status,
      localFundedAmount: localComparison.localFundedAmount,
      projectedFundedAmount: localComparison.chainDerivedFundedAmount,
      localAuditEvents: localComparison.localAuditEvents,
      projectedAuditEvents: localComparison.chainAuditEvents,
      mismatchedMilestones: localComparison.mismatchedMilestones.map(
        (milestone) => ({
          index: milestone.index,
          localStatus: milestone.localStatus,
          projectedStatus: milestone.chainDerivedStatus,
        }),
      ),
    };

    return {
      projection,
      mergedJob,
      issues,
      chainReconciliation: this.reconciliationService.buildReport(mergedJob),
      localComparison,
    };
  }

  private async ingestFinalizedRange(now: number) {
    const contractAddress = this.readConfiguredContractAddress();
    const chainId = this.escrowContractConfig.chainId;
    const latestBlock = await this.readLatestBlockNumber();
    const finalizedBlock = Math.max(
      0,
      latestBlock - this.operationsConfig.escrowIngestionConfirmations,
    );
    const existingCursor = await this.escrowRepository.getChainCursor({
      chainId,
      contractAddress,
      streamName,
    });
    const cursor: EscrowChainCursorRecord = existingCursor ?? {
      chainId,
      contractAddress,
      streamName,
      nextFromBlock: 0,
      lastFinalizedBlock: null,
      lastScannedBlock: null,
      lastError: null,
      updatedAt: now,
    };

    if (finalizedBlock < cursor.nextFromBlock) {
      await this.escrowRepository.saveChainCursor({
        ...cursor,
        lastFinalizedBlock: finalizedBlock,
        updatedAt: now,
      });
      return;
    }

    const toBlock = Math.min(
      finalizedBlock,
      cursor.nextFromBlock +
        this.operationsConfig.escrowIngestionBatchBlocks -
        1,
    );
    const fromBlock = Math.max(
      0,
      cursor.nextFromBlock - this.operationsConfig.escrowIngestionResyncBlocks,
    );

    try {
      const logs = await this.readContractLogs(
        contractAddress,
        fromBlock,
        toBlock,
      );
      const deduped = dedupeLogs(logs);
      const correlationId = buildMirrorCorrelationId('finalized_ingestion', {
        chainId,
        contractAddress,
        fromBlock,
        toBlock,
        finalizedBlock,
        now,
      });
      const events = await this.toChainEventRecords(
        {
          chainId,
          contractAddress,
          source: 'rpc_log',
          ingestionKind: 'finalized_ingestion',
          ingestedAt: now,
          correlationId,
          mirrorStatus: 'persisted',
          persistedVia: 'replace_range',
        },
        deduped.unique,
      );

      await this.escrowRepository.replaceChainEventsInRange({
        chainId,
        contractAddress,
        fromBlock,
        toBlock,
        events,
      });
      await this.escrowRepository.saveChainCursor({
        chainId,
        contractAddress,
        streamName,
        nextFromBlock: toBlock + 1,
        lastFinalizedBlock: finalizedBlock,
        lastScannedBlock: toBlock,
        lastError: null,
        updatedAt: now,
      });

      const jobs = await this.escrowRepository.listAll();
      const jobsByEscrowId = new Map<string, EscrowJobRecord>();
      for (const job of jobs) {
        if (
          job.onchain.chainId === chainId &&
          normalizeEvmAddress(job.onchain.contractAddress) ===
            normalizeEvmAddress(contractAddress) &&
          job.onchain.escrowId
        ) {
          jobsByEscrowId.set(job.onchain.escrowId, job);
        }
      }

      const affectedEscrowIds = Array.from(
        new Set(events.map((event) => event.escrowId)),
      );
      for (const escrowId of affectedEscrowIds) {
        const job = jobsByEscrowId.get(escrowId);
        if (!job) {
          continue;
        }

        const persistedEvents = await this.escrowRepository.listChainEvents({
          chainId,
          contractAddress,
          escrowId,
        });
        if (persistedEvents.length === 0) {
          continue;
        }

        const sortedEvents = [...persistedEvents].sort(sortChainEvents);
        await this.buildSyncReport(job, sortedEvents, {
          fetchedLogs: sortedEvents.length,
          duplicateLogs: 0,
          latestBlock,
          fromBlock: sortedEvents[0]?.blockNumber ?? fromBlock,
          toBlock:
            sortedEvents[sortedEvents.length - 1]?.blockNumber ?? toBlock,
          persistProjection: true,
          replaySource: 'persisted_mirror',
          correlationId:
            sortedEvents[sortedEvents.length - 1]?.correlationId ??
            correlationId,
          now,
        });
      }
    } catch (error) {
      await this.escrowRepository.saveChainCursor({
        ...cursor,
        lastFinalizedBlock: finalizedBlock,
        lastScannedBlock: cursor.lastScannedBlock,
        lastError:
          error instanceof Error ? error.message : 'Chain ingestion failed',
        updatedAt: now,
      });
      throw error;
    }
  }

  private async toChainEventRecords(
    context: ChainStreamContext,
    logs: EscrowChainLog[],
  ): Promise<EscrowChainEventRecord[]> {
    const blockTimestampCache = new Map<number, number>();
    const records = await Promise.all(
      logs.map((log) =>
        this.toChainEventRecord(context, log, blockTimestampCache),
      ),
    );
    return records.sort(sortChainEvents);
  }

  private async toChainEventRecord(
    context: ChainStreamContext,
    log: EscrowChainLog,
    blockTimestampCache: Map<number, number>,
  ): Promise<EscrowChainEventRecord> {
    const parsed = contractInterface.parseLog({
      topics: log.topics,
      data: log.data,
    });
    const escrowId = readParsedNumberishStringArg(parsed.args, 'escrowId');
    const blockTimeMs = await this.getBlockTimestamp(
      log.blockNumber,
      blockTimestampCache,
    );

    let payload: EscrowChainEventPayload;
    switch (parsed.name) {
      case 'JobCreated':
        payload = {
          eventName: 'JobCreated',
          clientAddress: normalizeEvmAddress(
            readParsedStringArg(parsed.args, 'client'),
          ),
          jobHash: readParsedStringArg(parsed.args, 'jobHash').toLowerCase(),
        };
        break;
      case 'EscrowFunded':
        payload = {
          eventName: 'EscrowFunded',
          amount: readParsedNumberishStringArg(parsed.args, 'amount'),
          currencyAddress: normalizeEvmAddress(
            readParsedStringArg(parsed.args, 'currency'),
          ),
        };
        break;
      case 'MilestonesSet':
        payload = {
          eventName: 'MilestonesSet',
          count: readParsedIntegerArg(parsed.args, 'count'),
        };
        break;
      case 'MilestoneDelivered':
        payload = {
          eventName: 'MilestoneDelivered',
          milestoneIndex: readParsedIntegerArg(parsed.args, 'mid'),
          deliverableHash: readParsedStringArg(parsed.args, 'deliverableHash'),
        };
        break;
      case 'MilestoneReleased':
        payload = {
          eventName: 'MilestoneReleased',
          milestoneIndex: readParsedIntegerArg(parsed.args, 'mid'),
          amount: readParsedNumberishStringArg(parsed.args, 'amount'),
        };
        break;
      case 'DisputeOpened':
        payload = {
          eventName: 'DisputeOpened',
          milestoneIndex: readParsedIntegerArg(parsed.args, 'mid'),
          reasonHash: readParsedStringArg(parsed.args, 'reasonHash'),
        };
        break;
      case 'DisputeResolved':
        payload = {
          eventName: 'DisputeResolved',
          milestoneIndex: readParsedIntegerArg(parsed.args, 'mid'),
          splitBpsClient: readParsedIntegerArg(parsed.args, 'splitBpsClient'),
        };
        break;
      default:
        throw new Error(`Unsupported escrow event ${parsed.name}`);
    }

    return {
      chainId: context.chainId,
      contractAddress: context.contractAddress,
      escrowId,
      transactionHash: log.transactionHash,
      logIndex: log.logIndex,
      blockNumber: log.blockNumber,
      blockHash: log.blockHash,
      blockTimeMs,
      source: context.source,
      ingestionKind: context.ingestionKind,
      ingestedAt: context.ingestedAt,
      correlationId: context.correlationId,
      mirrorStatus: context.mirrorStatus,
      persistedVia: context.persistedVia,
      payload,
    };
  }

  private async selectBatchJobs(
    userId: string,
    input: {
      scope: 'all' | 'attention';
      reason: EscrowAttentionReason | null;
      limit: number;
    },
    now: number,
  ) {
    if (input.scope === 'all') {
      return this.selectAllBatchJobs(input.limit);
    }

    const healthReport = await this.escrowHealthService.getReport(
      userId,
      {
        reason: input.reason ?? undefined,
        limit: input.limit,
      },
      now,
    );
    const selectedJobs = await Promise.all(
      healthReport.jobs.map(async (job) => {
        const persistedJob = await this.escrowRepository.getById(job.jobId);
        if (!persistedJob) {
          throw new NotFoundException(`Job ${job.jobId} not found`);
        }

        return persistedJob;
      }),
    );

    return {
      totalJobs: healthReport.summary.totalJobs,
      matchedJobs: healthReport.summary.matchedJobs,
      jobs: selectedJobs,
    };
  }

  private async selectAllBatchJobs(
    limit: number,
  ): Promise<EscrowChainSyncBatchSelection> {
    const jobs = await this.escrowRepository.listAll();
    const matchedJobs = [...jobs].sort(
      (left, right) => right.updatedAt - left.updatedAt,
    );

    return {
      totalJobs: jobs.length,
      matchedJobs: matchedJobs.length,
      jobs: matchedJobs.slice(0, limit),
    };
  }

  private resolveBatchLimit(
    requestedLimit: number | undefined,
    fallback: number,
  ) {
    return Math.min(
      requestedLimit ?? fallback,
      this.operationsConfig.escrowHealthMaxLimit,
    );
  }

  private resolveFromBlock(job: EscrowJobRecord, requestedFromBlock?: number) {
    if (typeof requestedFromBlock === 'number') {
      return requestedFromBlock;
    }

    const confirmedBlocks = job.executions
      .map((execution) => execution.blockNumber)
      .filter((blockNumber): blockNumber is number =>
        Number.isInteger(blockNumber),
      );

    if (confirmedBlocks.length === 0) {
      throw new BadRequestException(
        'fromBlock is required when the local job does not yet have confirmed execution block numbers',
      );
    }

    return Math.max(
      0,
      Math.min(...confirmedBlocks) -
        this.operationsConfig.escrowSyncLookbackBlocks,
    );
  }

  private async readLatestBlockNumber() {
    try {
      return await this.chainLogProvider.getLatestBlockNumber();
    } catch (error) {
      throw this.mapProviderError(error);
    }
  }

  private async readLogs(
    job: EscrowJobRecord,
    fromBlock: number,
    toBlock: number,
  ) {
    try {
      return await this.chainLogProvider.getLogs({
        contractAddress: job.onchain.contractAddress,
        escrowId: job.onchain.escrowId ?? '',
        fromBlock,
        toBlock,
        eventTopics: chainEventTopics,
      });
    } catch (error) {
      throw this.mapProviderError(error);
    }
  }

  private async readContractLogs(
    contractAddress: string,
    fromBlock: number,
    toBlock: number,
  ) {
    try {
      return await this.chainLogProvider.getLogs({
        contractAddress,
        fromBlock,
        toBlock,
        eventTopics: chainEventTopics,
      });
    } catch (error) {
      throw this.mapProviderError(error);
    }
  }

  private async getBlockTimestamp(
    blockNumber: number,
    cache: Map<number, number>,
  ) {
    const cached = cache.get(blockNumber);
    if (typeof cached === 'number') {
      return cached;
    }

    try {
      const timestamp =
        await this.chainLogProvider.getBlockTimestamp(blockNumber);
      cache.set(blockNumber, timestamp);
      return timestamp;
    } catch (error) {
      throw this.mapProviderError(error);
    }
  }

  private mapProviderError(error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to query escrow chain logs';
    return new ServiceUnavailableException(message);
  }

  private readConfiguredContractAddress() {
    try {
      return this.escrowContractConfig.contractAddress;
    } catch {
      throw new ServiceUnavailableException(
        'Escrow chain ingestion requires a configured contract address',
      );
    }
  }

  private async requireOperatorAccess(userId: string) {
    await this.userCapabilities.requireCapability(userId, 'chainAuditSync');
  }
}
