import { Test, type TestingModule } from '@nestjs/testing';
import { utils } from 'ethers';
import { ESCROW_REPOSITORY } from '../src/persistence/persistence.tokens';
import type { EscrowRepository } from '../src/persistence/persistence.types';
import type { EscrowJobRecord } from '../src/modules/escrow/escrow.types';
import { EscrowService } from '../src/modules/escrow/escrow.service';
import { OperationsModule } from '../src/modules/operations/operations.module';
import {
  ESCROW_CHAIN_LOG_PROVIDER,
  type EscrowChainLogProvider,
} from '../src/modules/operations/escrow-chain-log.provider';
import { EscrowChainSyncService } from '../src/modules/operations/escrow-chain-sync.service';
import { EscrowModule } from '../src/modules/escrow/escrow.module';
import { UsersService } from '../src/modules/users/users.service';
import { configureFilePersistence } from './support/test-persistence';

const clientAddress = '0x1111111111111111111111111111111111111111';
const clientSmartAccountAddress = '0x5555555555555555555555555555555555555555';
const workerAddress = '0x3333333333333333333333333333333333333333';
const arbitratorAddress = '0x2222222222222222222222222222222222222222';
const currencyAddress = '0x4444444444444444444444444444444444444444';
const contractorEmail = 'worker@example.com';
const contractInterface = new utils.Interface([
  'event JobCreated(uint256 indexed escrowId, address indexed client, bytes32 jobHash)',
  'event EscrowFunded(uint256 indexed escrowId, uint256 amount, address currency)',
  'event MilestonesSet(uint256 indexed escrowId, uint256 count)',
  'event MilestoneDelivered(uint256 indexed escrowId, uint256 indexed mid, bytes32 deliverableHash)',
  'event DisputeOpened(uint256 indexed escrowId, uint256 indexed mid, bytes32 reasonHash)',
  'event DisputeResolved(uint256 indexed escrowId, uint256 indexed mid, uint16 splitBpsClient)',
]);

describe('EscrowChainSyncService', () => {
  const originalEnv = { ...process.env };
  let moduleRef: TestingModule;
  let escrowService: EscrowService;
  let escrowChainSyncService: EscrowChainSyncService;
  let usersService: UsersService;
  let escrowRepository: EscrowRepository;
  let cleanupPersistence: (() => void) | undefined;
  let clientUserId: string;
  let workerUserId: string;
  let arbitratorUserId: string;
  let mockChainProvider: jest.Mocked<EscrowChainLogProvider>;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      ESCROW_ARBITRATOR_ADDRESS: arbitratorAddress,
      OPERATIONS_ESCROW_SYNC_LOOKBACK_BLOCKS: '20',
      OPERATIONS_ESCROW_SYNC_MAX_RANGE_BLOCKS: '100',
      OPERATIONS_ESCROW_INGESTION_ENABLED: 'false',
    };

    const persistence = configureFilePersistence();
    cleanupPersistence = persistence.cleanup;

    mockChainProvider = {
      getLatestBlockNumber: jest.fn().mockResolvedValue(80),
      getLogs: jest.fn(),
      getBlockTimestamp: jest.fn().mockResolvedValue(1_700_000_000_000),
    };

    moduleRef = await Test.createTestingModule({
      imports: [EscrowModule, OperationsModule],
    })
      .overrideProvider(ESCROW_CHAIN_LOG_PROVIDER)
      .useValue(mockChainProvider)
      .compile();

    escrowService = moduleRef.get(EscrowService);
    escrowChainSyncService = moduleRef.get(EscrowChainSyncService);
    usersService = moduleRef.get(UsersService);
    escrowRepository = moduleRef.get<EscrowRepository>(ESCROW_REPOSITORY);

    clientUserId = await createLinkedUserId(
      usersService,
      'client@example.com',
      clientAddress,
      clientSmartAccountAddress,
    );
    workerUserId = await createLinkedUserId(
      usersService,
      'worker@example.com',
      workerAddress,
    );
    arbitratorUserId = await createLinkedUserId(
      usersService,
      'arbitrator@example.com',
      arbitratorAddress,
    );
  });

  afterEach(async () => {
    await moduleRef.close();
    cleanupPersistence?.();
    cleanupPersistence = undefined;
    process.env = { ...originalEnv };
  });

  it('normalizes duplicate and out-of-order chain logs into a stable preview', async () => {
    const createdJob = await createDeliveredJob();
    const job = await requireJob(createdJob.jobId);

    const logs = [
      createChainLog(
        'MilestoneDelivered',
        [job.onchain.escrowId, 0, createBytes32('aa')],
        {
          logIndex: 3,
          txHash:
            '0x0000000000000000000000000000000000000000000000000000000000000004',
        },
      ),
      createChainLog(
        'EscrowFunded',
        [job.onchain.escrowId, '100000000', currencyAddress],
        {
          logIndex: 1,
          txHash:
            '0x0000000000000000000000000000000000000000000000000000000000000002',
        },
      ),
      createChainLog('MilestonesSet', [job.onchain.escrowId, 1], {
        logIndex: 2,
        txHash:
          '0x0000000000000000000000000000000000000000000000000000000000000003',
      }),
      createChainLog(
        'EscrowFunded',
        [job.onchain.escrowId, '100000000', currencyAddress],
        {
          logIndex: 1,
          txHash:
            '0x0000000000000000000000000000000000000000000000000000000000000002',
        },
      ),
      createChainLog(
        'JobCreated',
        [job.onchain.escrowId, clientSmartAccountAddress, job.jobHash],
        {
          logIndex: 0,
          txHash:
            '0x0000000000000000000000000000000000000000000000000000000000000001',
        },
      ),
    ];
    mockChainProvider.getLogs.mockResolvedValue(logs);

    const report = await escrowChainSyncService.syncJobAudit(
      arbitratorUserId,
      {
        jobId: createdJob.jobId,
      },
      2_000_000_000_000,
    );
    const getLogsCall = mockChainProvider.getLogs.mock.calls[0]?.[0];

    expect(getLogsCall).toMatchObject({
      contractAddress: job.onchain.contractAddress,
      escrowId: job.onchain.escrowId,
      fromBlock: 0,
      toBlock: 80,
    });
    expect(Array.isArray(getLogsCall?.eventTopics)).toBe(true);
    expect(report.mode).toBe('preview');
    expect(report.range).toMatchObject({
      fromBlock: 0,
      toBlock: 80,
      latestBlock: 80,
      lookbackBlocks: 20,
    });
    expect(report.normalization).toEqual({
      fetchedLogs: 5,
      duplicateLogs: 1,
      uniqueLogs: 4,
      auditEvents: 4,
      auditChanged: true,
    });
    expect(report.mirror).toMatchObject({
      eventCount: 4,
      replaySource: 'fresh_fetch',
    });
    expect(report.mirror.correlationId).toMatch(/^manual_sync_/);
    expect(report.mirror.latestEvent).toMatchObject({
      eventName: 'MilestoneDelivered',
      blockNumber: 1,
      mirrorStatus: 'preview_only',
      ingestionKind: 'manual_sync',
      persistedVia: null,
    });
    expect(report.replay).toEqual({
      status: 'drifted',
      driftSource: 'audit_digest_mismatch',
      failedCause:
        'The replayed chain audit digest differs from persisted audit history.',
      retryPosture: 'safe_to_retry',
    });
    expect(report.issues).toEqual([]);
    expect(report.localComparison).toMatchObject({
      aggregateMatches: true,
      auditDigestMatches: false,
      localAuditEvents: 7,
      chainAuditEvents: 7,
      localStatus: 'in_progress',
      chainDerivedStatus: 'in_progress',
    });
    const persisted = await requireJob(createdJob.jobId);
    expect(persisted.operations.chainSync).toMatchObject({
      lastOutcome: 'succeeded',
      lastMode: 'preview',
      lastSyncedBlock: 80,
      lastIssueCount: 0,
      lastCriticalIssueCount: 0,
      lastReconciliationIssueCount: 0,
    });
  });

  it('persists chain-derived audit state when the local audit is missing events', async () => {
    const createdJob = await createDeliveredJob();
    const job = await requireJob(createdJob.jobId);
    job.audit = job.audit.filter(
      (event) => event.type !== 'milestone.delivered',
    );
    await escrowRepository.save(job);

    mockChainProvider.getLogs.mockResolvedValue([
      createChainLog(
        'JobCreated',
        [job.onchain.escrowId, clientSmartAccountAddress, job.jobHash],
        {
          logIndex: 0,
          txHash:
            '0x0000000000000000000000000000000000000000000000000000000000000011',
        },
      ),
      createChainLog(
        'EscrowFunded',
        [job.onchain.escrowId, '100000000', currencyAddress],
        {
          logIndex: 1,
          txHash:
            '0x0000000000000000000000000000000000000000000000000000000000000012',
        },
      ),
      createChainLog('MilestonesSet', [job.onchain.escrowId, 1], {
        logIndex: 2,
        txHash:
          '0x0000000000000000000000000000000000000000000000000000000000000013',
      }),
      createChainLog(
        'MilestoneDelivered',
        [job.onchain.escrowId, 0, createBytes32('bb')],
        {
          logIndex: 3,
          txHash:
            '0x0000000000000000000000000000000000000000000000000000000000000014',
        },
      ),
    ]);

    const report = await escrowChainSyncService.syncJobAudit(
      arbitratorUserId,
      {
        jobId: createdJob.jobId,
        persist: true,
      },
      2_000_000_000_000,
    );

    const persisted = await requireJob(createdJob.jobId);

    expect(report.mode).toBe('persisted');
    expect(report.normalization.auditChanged).toBe(true);
    expect(report.mirror).toMatchObject({
      eventCount: 4,
      replaySource: 'persisted_mirror',
    });
    expect(report.mirror.correlationId).toMatch(/^manual_sync_/);
    expect(report.mirror.latestEvent).toMatchObject({
      eventName: 'MilestoneDelivered',
      mirrorStatus: 'persisted',
      ingestionKind: 'manual_sync',
      persistedVia: 'upsert',
    });
    expect(report.replay).toEqual({
      status: 'drifted',
      driftSource: 'audit_digest_mismatch',
      failedCause:
        'The replayed chain audit digest differs from persisted audit history.',
      retryPosture: 'safe_to_retry',
    });
    expect(report.persistence).toEqual({
      requested: true,
      applied: true,
      blocked: false,
      blockedReason: null,
    });
    expect(report.localComparison.auditDigestMatches).toBe(false);
    expect(persisted.audit.map((event) => event.type)).toEqual([
      'milestone.delivered',
      'job.contractor_participation_requested',
      'job.created',
      'job.funded',
      'job.milestones_set',
      'job.contractor_invite_sent',
      'job.contractor_joined',
    ]);
    expect(persisted.operations.chainSync).toMatchObject({
      lastOutcome: 'succeeded',
      lastMode: 'persisted',
      lastPersistedAt: 2_000_000_000_000,
      lastSyncedBlock: 80,
    });
  });

  it('blocks persistence when chain events contain an unsupported partial dispute resolution', async () => {
    const createdJob = await createDisputedJob();
    const job = await requireJob(createdJob.jobId);

    mockChainProvider.getLogs.mockResolvedValue([
      createChainLog(
        'JobCreated',
        [job.onchain.escrowId, clientSmartAccountAddress, job.jobHash],
        {
          logIndex: 0,
          txHash:
            '0x0000000000000000000000000000000000000000000000000000000000000021',
        },
      ),
      createChainLog(
        'EscrowFunded',
        [job.onchain.escrowId, '100000000', currencyAddress],
        {
          logIndex: 1,
          txHash:
            '0x0000000000000000000000000000000000000000000000000000000000000022',
        },
      ),
      createChainLog('MilestonesSet', [job.onchain.escrowId, 1], {
        logIndex: 2,
        txHash:
          '0x0000000000000000000000000000000000000000000000000000000000000023',
      }),
      createChainLog(
        'MilestoneDelivered',
        [job.onchain.escrowId, 0, createBytes32('cc')],
        {
          logIndex: 3,
          txHash:
            '0x0000000000000000000000000000000000000000000000000000000000000024',
        },
      ),
      createChainLog(
        'DisputeOpened',
        [job.onchain.escrowId, 0, createBytes32('dd')],
        {
          logIndex: 4,
          txHash:
            '0x0000000000000000000000000000000000000000000000000000000000000025',
        },
      ),
      createChainLog('DisputeResolved', [job.onchain.escrowId, 0, 5000], {
        logIndex: 5,
        txHash:
          '0x0000000000000000000000000000000000000000000000000000000000000026',
      }),
    ]);

    const report = await escrowChainSyncService.syncJobAudit(
      arbitratorUserId,
      {
        jobId: createdJob.jobId,
        persist: true,
      },
      2_000_000_000_000,
    );
    const persisted = await requireJob(createdJob.jobId);

    expect(report.mode).toBe('preview');
    expect(report.mirror).toMatchObject({
      eventCount: 6,
      replaySource: 'persisted_mirror',
    });
    expect(report.mirror.correlationId).toMatch(/^manual_sync_/);
    expect(report.mirror.latestEvent).toMatchObject({
      eventName: 'DisputeResolved',
      mirrorStatus: 'persisted',
      ingestionKind: 'manual_sync',
      persistedVia: 'upsert',
    });
    expect(report.replay).toEqual({
      status: 'blocked',
      driftSource: 'unsupported_event_shape',
      failedCause:
        'The onchain dispute resolution uses a partial client split that the persisted audit model cannot represent.',
      retryPosture: 'hold_for_model_support',
    });
    expect(report.persistence).toEqual({
      requested: true,
      applied: false,
      blocked: true,
      blockedReason:
        'Critical ingestion issues must be resolved before persisting chain-derived audit state.',
    });
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unsupported_partial_resolution',
          severity: 'critical',
        }),
      ]),
    );
    expect(persisted.audit.map((event) => event.type)).toEqual([
      'job.created',
      'job.contractor_participation_requested',
      'job.funded',
      'job.milestones_set',
      'job.contractor_invite_sent',
      'job.contractor_joined',
      'milestone.delivered',
      'milestone.disputed',
    ]);
  });

  it('selects only attention jobs when batch sync is scoped by reason', async () => {
    const disputedJob = await createDisputedJob();
    const quietJob = await createDeliveredJob();
    const disputedRecord = await requireJob(disputedJob.jobId);

    mockChainProvider.getLogs.mockImplementation(({ escrowId }) => {
      if (escrowId === disputedRecord.onchain.escrowId) {
        return Promise.resolve(
          buildDeliveredChainLogs(disputedRecord).concat(
            createChainLog(
              'DisputeOpened',
              [disputedRecord.onchain.escrowId, 0, createBytes32('ee')],
              {
                logIndex: 4,
                txHash:
                  '0x0000000000000000000000000000000000000000000000000000000000000035',
              },
            ),
          ),
        );
      }

      throw new Error(
        `Unexpected escrow id ${escrowId} in attention-scoped sync`,
      );
    });

    const report = await escrowChainSyncService.syncBatch(
      arbitratorUserId,
      {
        scope: 'attention',
        reason: 'open_dispute',
        limit: 10,
      },
      2_000_000_000_000,
    );

    expect(report.filters).toEqual({
      scope: 'attention',
      reason: 'open_dispute',
      limit: 10,
    });
    expect(report.selection).toEqual({
      totalJobs: 2,
      matchedJobs: 1,
      selectedJobs: 1,
    });
    expect(report.summary).toMatchObject({
      processedJobs: 1,
      failedJobs: 0,
    });
    expect(report.jobs).toHaveLength(1);
    expect(report.jobs[0]).toMatchObject({
      jobId: disputedJob.jobId,
      outcome: 'changed',
      errorMessage: null,
    });
    expect(quietJob.jobId).not.toBe(disputedJob.jobId);
  });

  it('continues batch sync when one job fails and persists other clean results', async () => {
    const firstJob = await createDeliveredJob();
    const secondJob = await createDeliveredJob();
    const firstRecord = await requireJob(firstJob.jobId);
    const secondRecord = await requireJob(secondJob.jobId);

    firstRecord.audit = firstRecord.audit.filter(
      (event) => event.type !== 'milestone.delivered',
    );
    await escrowRepository.save(firstRecord);

    mockChainProvider.getLogs.mockImplementation(({ escrowId }) => {
      if (escrowId === firstRecord.onchain.escrowId) {
        return Promise.resolve(buildDeliveredChainLogs(firstRecord));
      }
      if (escrowId === secondRecord.onchain.escrowId) {
        throw new Error('RPC request timed out');
      }

      throw new Error(`Unexpected escrow id ${escrowId} in batch sync`);
    });

    const report = await escrowChainSyncService.syncBatch(
      arbitratorUserId,
      {
        scope: 'all',
        limit: 10,
        persist: true,
      },
      2_000_000_000_000,
    );
    const persistedFirst = await requireJob(firstJob.jobId);
    const persistedSecond = await requireJob(secondJob.jobId);

    expect(report.selection).toEqual({
      totalJobs: 2,
      matchedJobs: 2,
      selectedJobs: 2,
    });
    expect(report.summary).toEqual({
      processedJobs: 1,
      cleanJobs: 0,
      changedJobs: 1,
      persistedJobs: 1,
      blockedJobs: 0,
      failedJobs: 1,
      criticalIssueJobs: 0,
    });
    expect(report.jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          jobId: firstJob.jobId,
          outcome: 'persisted',
          persisted: true,
          errorMessage: null,
        }),
        expect.objectContaining({
          jobId: secondJob.jobId,
          outcome: 'failed',
          persisted: false,
          errorMessage: 'RPC request timed out',
        }),
      ]),
    );
    expect(persistedFirst.audit.map((event) => event.type)).toEqual([
      'milestone.delivered',
      'job.contractor_participation_requested',
      'job.created',
      'job.funded',
      'job.milestones_set',
      'job.contractor_invite_sent',
      'job.contractor_joined',
    ]);
    expect(persistedSecond.audit.map((event) => event.type)).toEqual([
      'job.created',
      'job.contractor_participation_requested',
      'job.funded',
      'job.milestones_set',
      'job.contractor_invite_sent',
      'job.contractor_joined',
      'milestone.delivered',
    ]);
    expect(persistedFirst.operations.chainSync).toMatchObject({
      lastOutcome: 'succeeded',
      lastMode: 'persisted',
    });
    expect(persistedSecond.operations.chainSync).toMatchObject({
      lastOutcome: 'failed',
      lastMode: 'preview',
      lastErrorMessage: 'RPC request timed out',
    });
  });

  it('persists finalized-ingestion mirror metadata before batch replay', async () => {
    process.env.OPERATIONS_ESCROW_INGESTION_ENABLED = 'true';
    process.env.OPERATIONS_ESCROW_INGESTION_CONFIRMATIONS = '6';
    process.env.OPERATIONS_ESCROW_INGESTION_BATCH_BLOCKS = '1000';
    process.env.OPERATIONS_ESCROW_INGESTION_RESYNC_BLOCKS = '20';

    const createdJob = await createDeliveredJob();
    const job = await requireJob(createdJob.jobId);
    mockChainProvider.getLatestBlockNumber.mockResolvedValue(80);
    mockChainProvider.getLogs.mockResolvedValue(buildDeliveredChainLogs(job));

    const report = await escrowChainSyncService.syncBatch(
      arbitratorUserId,
      {
        scope: 'all',
        limit: 1,
        persist: true,
      },
      2_000_000_000_000,
    );
    const persistedEvents = await escrowRepository.listChainEvents({
      chainId: job.onchain.chainId,
      contractAddress: job.onchain.contractAddress,
      escrowId: job.onchain.escrowId ?? undefined,
    });

    expect(report.summary).toMatchObject({
      processedJobs: 1,
      failedJobs: 0,
    });
    expect(persistedEvents).toHaveLength(4);
    expect(persistedEvents[0]).toMatchObject({
      source: 'rpc_log',
      ingestionKind: 'finalized_ingestion',
      mirrorStatus: 'persisted',
      persistedVia: 'replace_range',
    });
    expect(persistedEvents[0]?.correlationId).toMatch(
      /^finalized_ingestion_/,
    );
    expect(
      new Set(persistedEvents.map((event) => event.correlationId)).size,
    ).toBe(1);
    expect(
      persistedEvents.every((event) => event.ingestedAt === 2_000_000_000_000),
    ).toBe(true);
    await expect(
      escrowRepository.getChainCursor({
        chainId: job.onchain.chainId,
        contractAddress: job.onchain.contractAddress,
        streamName: 'workstream_escrow',
      }),
    ).resolves.toMatchObject({
      nextFromBlock: 75,
      lastFinalizedBlock: 74,
      lastScannedBlock: 74,
      lastError: null,
    });
  });

  it('runs config-driven batch backfill over the newest persisted jobs without operator auth', async () => {
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_LIMIT = '2';
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_PERSIST = 'true';

    const oldestJob = await createDeliveredJob();
    const middleJob = await createDeliveredJob();
    const newestJob = await createDeliveredJob();
    const oldestRecord = await requireJob(oldestJob.jobId);
    const middleRecord = await requireJob(middleJob.jobId);
    const newestRecord = await requireJob(newestJob.jobId);

    oldestRecord.updatedAt = 1_000;
    middleRecord.updatedAt = 2_000;
    newestRecord.updatedAt = 3_000;
    newestRecord.audit = newestRecord.audit.filter(
      (event) => event.type !== 'milestone.delivered',
    );
    await escrowRepository.save(oldestRecord);
    await escrowRepository.save(middleRecord);
    await escrowRepository.save(newestRecord);

    mockChainProvider.getLogs.mockImplementation(({ escrowId }) => {
      if (escrowId === newestRecord.onchain.escrowId) {
        return Promise.resolve(buildDeliveredChainLogs(newestRecord));
      }
      if (escrowId === middleRecord.onchain.escrowId) {
        return Promise.resolve(buildDeliveredChainLogs(middleRecord));
      }

      throw new Error(`Unexpected escrow id ${escrowId} in runner batch sync`);
    });

    const report = await escrowChainSyncService.runBatchBackfill(
      undefined,
      2_000_000_000_000,
    );
    const persistedNewest = await requireJob(newestJob.jobId);
    const untouchedOldest = await requireJob(oldestJob.jobId);

    expect(report.filters).toEqual({
      scope: 'all',
      reason: null,
      limit: 2,
    });
    expect(report.selection).toEqual({
      totalJobs: 3,
      matchedJobs: 3,
      selectedJobs: 2,
    });
    expect(report.summary).toEqual({
      processedJobs: 2,
      cleanJobs: 0,
      changedJobs: 2,
      persistedJobs: 2,
      blockedJobs: 0,
      failedJobs: 0,
      criticalIssueJobs: 0,
    });
    expect(report.jobs.map((job) => job.jobId)).toEqual([
      newestJob.jobId,
      middleJob.jobId,
    ]);
    expect(mockChainProvider.getLogs.mock.calls).toHaveLength(2);
    expect(persistedNewest.audit.map((event) => event.type)).toEqual([
      'milestone.delivered',
      'job.contractor_participation_requested',
      'job.created',
      'job.funded',
      'job.milestones_set',
      'job.contractor_invite_sent',
      'job.contractor_joined',
    ]);
    expect(untouchedOldest.updatedAt).toBe(1_000);
  });

  async function createDeliveredJob() {
    const createdJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
      workerAddress,
      currencyAddress,
      title: 'Chain sync delivered job',
      description: 'Tests preview sync coverage.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });
    await escrowService.fundJob(clientUserId, createdJob.jobId, {
      amount: '100',
    });
    await escrowService.setMilestones(clientUserId, createdJob.jobId, {
      milestones: [
        {
          title: 'Milestone 1',
          deliverable: 'Delivery',
          amount: '100',
        },
      ],
    });
    await joinAsContractor(
      escrowService,
      clientUserId,
      workerUserId,
      createdJob.jobId,
    );
    await escrowService.deliverMilestone(workerUserId, createdJob.jobId, 0, {
      note: 'Submitted for chain sync.',
      evidenceUrls: ['https://example.com/evidence'],
    });

    return createdJob;
  }

  async function createDisputedJob() {
    const createdJob = await createDeliveredJob();
    await escrowService.disputeMilestone(clientUserId, createdJob.jobId, 0, {
      reason: 'Needs review',
      evidenceUrls: ['https://example.com/review'],
    });

    return createdJob;
  }

  async function requireJob(jobId: string) {
    const job = await escrowRepository.getById(jobId);
    if (!job) {
      throw new Error(`Expected job ${jobId} to exist`);
    }

    return job;
  }
});

function createChainLog(
  eventName:
    | 'JobCreated'
    | 'EscrowFunded'
    | 'MilestonesSet'
    | 'MilestoneDelivered'
    | 'DisputeOpened'
    | 'DisputeResolved',
  args: unknown[],
  input: {
    logIndex: number;
    txHash: string;
  },
) {
  const event = contractInterface.getEvent(eventName);
  const encoded = contractInterface.encodeEventLog(event, args);

  return {
    blockNumber: 1,
    blockHash:
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    transactionHash: input.txHash,
    logIndex: input.logIndex,
    topics: encoded.topics,
    data: encoded.data,
  };
}

function buildDeliveredChainLogs(job: EscrowJobRecord) {
  return [
    createChainLog(
      'JobCreated',
      [job.onchain.escrowId, clientSmartAccountAddress, job.jobHash],
      {
        logIndex: 0,
        txHash:
          '0x0000000000000000000000000000000000000000000000000000000000000101',
      },
    ),
    createChainLog(
      'EscrowFunded',
      [job.onchain.escrowId, '100000000', currencyAddress],
      {
        logIndex: 1,
        txHash:
          '0x0000000000000000000000000000000000000000000000000000000000000102',
      },
    ),
    createChainLog('MilestonesSet', [job.onchain.escrowId, 1], {
      logIndex: 2,
      txHash:
        '0x0000000000000000000000000000000000000000000000000000000000000103',
    }),
    createChainLog(
      'MilestoneDelivered',
      [job.onchain.escrowId, 0, createBytes32('ff')],
      {
        logIndex: 3,
        txHash:
          '0x0000000000000000000000000000000000000000000000000000000000000104',
      },
    ),
  ];
}

function createBytes32(fill: string) {
  return `0x${fill.repeat(64).slice(0, 64)}`;
}

async function createLinkedUserId(
  usersService: UsersService,
  email: string,
  address: string,
  smartAccountAddress?: string,
) {
  const linkedAt = Date.now();
  const user = await usersService.getOrCreateByEmail(email);
  await usersService.linkWallet(user.id, {
    address,
    walletKind: 'eoa',
    verificationMethod: 'siwe',
    verifiedAt: linkedAt,
    verificationChainId: 84532,
  });

  if (smartAccountAddress) {
    await usersService.linkWallet(user.id, {
      address: smartAccountAddress,
      walletKind: 'smart_account',
      ownerAddress: address,
      recoveryAddress: address,
      chainId: 84532,
      providerKind: 'mock',
      entryPointAddress: '0x00000061fefce24a79343c27127435286bb7a4e1',
      factoryAddress: '0x3333333333333333333333333333333333333333',
      sponsorshipPolicy: 'sponsored',
      provisionedAt: linkedAt,
      label: 'Client execution wallet',
    });
    await usersService.setDefaultExecutionWallet(user.id, smartAccountAddress);
  }

  return user.id;
}

async function joinAsContractor(
  escrowService: EscrowService,
  clientUserId: string,
  workerUserId: string,
  jobId: string,
) {
  const invite = await escrowService.inviteContractor(clientUserId, jobId, {
    delivery: 'manual',
    frontendOrigin: 'http://localhost:3000',
  });
  const inviteToken =
    new URL(invite.invite.joinUrl).searchParams.get('invite') ?? '';

  return escrowService.joinContractor(workerUserId, jobId, {
    inviteToken,
  });
}
