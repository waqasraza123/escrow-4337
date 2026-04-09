import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  EscrowChainSyncRecord,
  EscrowJobRecord,
  MilestoneStatus,
} from '../escrow/escrow.types';
import { EscrowContractConfigService } from '../escrow/onchain/escrow-contract.config';
import { UsersService } from '../users/users.service';
import {
  ESCROW_CHAIN_LOG_PROVIDER,
  type EscrowChainLog,
  type EscrowChainLogProvider,
} from './escrow-chain-log.provider';
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
  event: EscrowAuditEvent;
  fallbackAt: number;
  blockNumber: number;
  txHash: string;
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

@Injectable()
export class EscrowChainSyncService {
  constructor(
    @Inject(ESCROW_REPOSITORY)
    private readonly escrowRepository: EscrowRepository,
    @Inject(ESCROW_CHAIN_LOG_PROVIDER)
    private readonly chainLogProvider: EscrowChainLogProvider,
    private readonly usersService: UsersService,
    private readonly operationsConfig: OperationsConfigService,
    private readonly escrowContractConfig: EscrowContractConfigService,
    private readonly escrowHealthService: EscrowHealthService,
    private readonly reconciliationService: EscrowReconciliationService,
    private readonly daemonStatusService: EscrowChainSyncDaemonStatusService,
    private readonly daemonMonitoringService: EscrowChainSyncDaemonMonitoringService,
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

    return this.syncPersistedJobAudit(
      localJob,
      {
        fromBlock: input.fromBlock,
        toBlock: input.toBlock,
        persist: input.persist,
      },
      {
        latestBlock,
        now,
      },
    );
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
    const issues: EscrowChainSyncIssue[] = [];
    const blockTimestampCache = new Map<number, number>();
    const parsedAuditEvents: ParsedChainAuditEvent[] = [];

    for (const log of dedupedLogs.unique) {
      const parsed = contractInterface.parseLog({
        topics: log.topics,
        data: log.data,
      });
      const fallbackAt = await this.getBlockTimestamp(
        log.blockNumber,
        blockTimestampCache,
      );

      switch (parsed.name) {
        case 'JobCreated': {
          const clientAddress = normalizeEvmAddress(
            readParsedStringArg(parsed.args, 'client'),
          );
          const jobHash = readParsedStringArg(
            parsed.args,
            'jobHash',
          ).toLowerCase();
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
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
            });
          }
          if (jobHash !== localJob.jobHash.toLowerCase()) {
            issues.push({
              code: 'job_created_hash_mismatch',
              severity: 'critical',
              summary:
                'The onchain JobCreated hash does not match the persisted local job hash.',
              detail: `Expected ${localJob.jobHash.toLowerCase()} but received ${jobHash}.`,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
            });
          }

          parsedAuditEvents.push({
            event: {
              type: 'job.created',
              at: fallbackAt,
              payload: {
                jobId: localJob.id,
                category: localJob.category,
                escrowId: localJob.onchain.escrowId,
              },
            },
            fallbackAt,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
          });
          break;
        }
        case 'EscrowFunded': {
          const currencyAddress = normalizeEvmAddress(
            readParsedStringArg(parsed.args, 'currency'),
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
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
            });
          }

          parsedAuditEvents.push({
            event: {
              type: 'job.funded',
              at: fallbackAt,
              payload: {
                jobId: localJob.id,
                amount: formatMinorUnits(
                  readParsedNumberishStringArg(parsed.args, 'amount'),
                ),
              },
            },
            fallbackAt,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
          });
          break;
        }
        case 'MilestonesSet':
          parsedAuditEvents.push({
            event: {
              type: 'job.milestones_set',
              at: fallbackAt,
              payload: {
                jobId: localJob.id,
                count: readParsedIntegerArg(parsed.args, 'count'),
              },
            },
            fallbackAt,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
          });
          break;
        case 'MilestoneDelivered':
          parsedAuditEvents.push({
            event: {
              type: 'milestone.delivered',
              at: fallbackAt,
              payload: {
                jobId: localJob.id,
                milestoneIndex: readParsedIntegerArg(parsed.args, 'mid'),
              },
            },
            fallbackAt,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
          });
          break;
        case 'MilestoneReleased':
          parsedAuditEvents.push({
            event: {
              type: 'milestone.released',
              at: fallbackAt,
              payload: {
                jobId: localJob.id,
                milestoneIndex: readParsedIntegerArg(parsed.args, 'mid'),
              },
            },
            fallbackAt,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
          });
          break;
        case 'DisputeOpened':
          parsedAuditEvents.push({
            event: {
              type: 'milestone.disputed',
              at: fallbackAt,
              payload: {
                jobId: localJob.id,
                milestoneIndex: readParsedIntegerArg(parsed.args, 'mid'),
              },
            },
            fallbackAt,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
          });
          break;
        case 'DisputeResolved': {
          const splitBpsClient = readParsedIntegerArg(
            parsed.args,
            'splitBpsClient',
          );
          let action: 'release' | 'refund' | null = null;
          if (splitBpsClient === 0) {
            action = 'release';
          } else if (splitBpsClient === 10_000) {
            action = 'refund';
          } else {
            issues.push({
              code: 'unsupported_partial_resolution',
              severity: 'critical',
              summary:
                'The onchain dispute resolution uses a partial client split that the persisted audit model cannot represent.',
              detail: `splitBpsClient=${splitBpsClient}. Only 0 (release) and 10000 (refund) are currently representable.`,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
            });
          }

          if (action) {
            parsedAuditEvents.push({
              event: {
                type: 'milestone.resolved',
                at: fallbackAt,
                payload: {
                  jobId: localJob.id,
                  milestoneIndex: readParsedIntegerArg(parsed.args, 'mid'),
                  action,
                },
              },
              fallbackAt,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
            });
          }
          break;
        }
      }
    }

    if (parsedAuditEvents.length === 0) {
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
    } else if (parsedAuditEvents[0]?.event.type !== 'job.created') {
      issues.push({
        code: 'job_created_log_missing',
        severity: 'critical',
        summary:
          'The scanned contract events do not include the expected JobCreated log for this escrow.',
        detail:
          'The block range may begin too late, or the persisted escrow id does not match the deployed contract history.',
        blockNumber: parsedAuditEvents[0]?.blockNumber ?? null,
        txHash: parsedAuditEvents[0]?.txHash ?? null,
      });
    }

    const chainAudit = applyStableAuditTimestamps(
      parsedAuditEvents,
      localJob.audit,
    );
    const chainDerivedJob = cloneJob(localJob);
    chainDerivedJob.audit = chainAudit;
    if (chainAudit.length > 0) {
      chainDerivedJob.updatedAt = Math.max(
        localJob.updatedAt,
        chainAudit[chainAudit.length - 1]?.at ?? localJob.updatedAt,
      );
    }

    const chainReconciliation =
      this.reconciliationService.buildReport(chainDerivedJob);
    const localComparison = toAggregateMismatchSummary(
      localJob,
      chainDerivedJob,
    );
    const auditChanged = !localComparison.auditDigestMatches;
    const blocked =
      issues.some((issue) => issue.severity === 'critical') ||
      chainAudit.length === 0;

    let applied = false;
    applied = input.persist === true && !blocked && auditChanged;
    const report: EscrowChainSyncReport = {
      syncedAt: new Date(context.now).toISOString(),
      mode: applied ? 'persisted' : 'preview',
      job: {
        jobId: localJob.id,
        title: localJob.title,
        chainId: localJob.onchain.chainId,
        contractAddress: localJob.onchain.contractAddress,
        escrowId: localJob.onchain.escrowId,
      },
      range: {
        fromBlock,
        toBlock,
        latestBlock: context.latestBlock,
        lookbackBlocks: this.operationsConfig.escrowSyncLookbackBlocks,
      },
      normalization: {
        fetchedLogs: logs.length,
        duplicateLogs: dedupedLogs.duplicateCount,
        uniqueLogs: dedupedLogs.unique.length,
        auditEvents: chainAudit.length,
        auditChanged,
      },
      issues,
      chainReconciliation,
      localComparison,
      persistence: {
        requested: input.persist === true,
        applied,
        blocked: input.persist === true && blocked,
        blockedReason:
          input.persist === true && blocked
            ? 'Critical ingestion issues must be resolved before persisting chain-derived audit state.'
            : null,
      },
    };

    const jobForMetadata = applied ? chainDerivedJob : cloneJob(localJob);
    jobForMetadata.operations.chainSync = summarizeChainSyncRecord(report);
    await this.escrowRepository.save(jobForMetadata);

    return report;
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
}
