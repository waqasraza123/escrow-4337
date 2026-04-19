import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ESCROW_REPOSITORY } from '../src/persistence/persistence.tokens';
import type { EscrowRepository } from '../src/persistence/persistence.types';
import { EscrowService } from '../src/modules/escrow/escrow.service';
import { OperationsModule } from '../src/modules/operations/operations.module';
import { EscrowHealthService } from '../src/modules/operations/escrow-health.service';
import { EscrowModule } from '../src/modules/escrow/escrow.module';
import { UsersService } from '../src/modules/users/users.service';
import { configureFilePersistence } from './support/test-persistence';

const clientAddress = '0x1111111111111111111111111111111111111111';
const clientSmartAccountAddress = '0x5555555555555555555555555555555555555555';
const workerAddress = '0x3333333333333333333333333333333333333333';
const arbitratorAddress = '0x2222222222222222222222222222222222222222';
const currencyAddress = '0x4444444444444444444444444444444444444444';
const contractorEmail = 'worker@example.com';

describe('EscrowHealthService', () => {
  const originalEnv = { ...process.env };
  let moduleRef: TestingModule;
  let escrowService: EscrowService;
  let escrowHealthService: EscrowHealthService;
  let usersService: UsersService;
  let escrowRepository: EscrowRepository;
  let cleanupPersistence: (() => void) | undefined;
  let clientUserId: string;
  let workerUserId: string;
  let arbitratorUserId: string;
  let nonOperatorUserId: string;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      ESCROW_ARBITRATOR_ADDRESS: arbitratorAddress,
      OPERATIONS_ESCROW_STALE_JOB_HOURS: '24',
    };

    const persistence = configureFilePersistence();
    cleanupPersistence = persistence.cleanup;

    moduleRef = await Test.createTestingModule({
      imports: [EscrowModule, OperationsModule],
    }).compile();

    escrowService = moduleRef.get(EscrowService);
    escrowHealthService = moduleRef.get(EscrowHealthService);
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
    nonOperatorUserId = await createLinkedUserId(
      usersService,
      'observer@example.com',
      '0x7777777777777777777777777777777777777777',
    );
  });

  afterEach(async () => {
    await moduleRef.close();
    cleanupPersistence?.();
    cleanupPersistence = undefined;
    process.env = { ...originalEnv };
  });

  it('builds an operator report for failed executions, open disputes, and stale jobs', async () => {
    const reportNow = 100_000_000;

    const staleJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
      workerAddress,
      currencyAddress,
      title: 'Stale draft job',
      description: 'Needs attention because activity stopped.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });
    const staleRecord = await escrowRepository.getById(staleJob.jobId);
    if (!staleRecord) {
      throw new Error('Expected stale job record to exist');
    }
    staleRecord.createdAt = 10_000;
    staleRecord.updatedAt = 10_000;
    staleRecord.audit = staleRecord.audit.map((event) => ({
      ...event,
      at: 10_000,
    }));
    staleRecord.executions = staleRecord.executions.map((execution) => ({
      ...execution,
      submittedAt: 10_000,
      confirmedAt: 10_100,
    }));
    await escrowRepository.save(staleRecord);

    const disputedJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
      workerAddress,
      currencyAddress,
      title: 'Disputed delivery',
      description: 'Needs operator review.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });
    await escrowService.fundJob(clientUserId, disputedJob.jobId, {
      amount: '100',
    });
    await escrowService.setMilestones(clientUserId, disputedJob.jobId, {
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
      disputedJob.jobId,
    );
    await escrowService.deliverMilestone(workerUserId, disputedJob.jobId, 0, {
      note: 'Submitted for review',
      evidenceUrls: ['https://example.com/evidence'],
    });
    await escrowService.disputeMilestone(clientUserId, disputedJob.jobId, 0, {
      reason: 'Review failed',
      evidenceUrls: ['https://example.com/review-failed'],
    });

    const failedJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
      workerAddress,
      currencyAddress,
      title: 'Relay-failed funding',
      description: 'Has a failed execution record.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });
    const failedRecord = await escrowRepository.getById(failedJob.jobId);
    if (!failedRecord) {
      throw new Error('Expected failed job record to exist');
    }
    failedRecord.executions.push({
      id: 'failed-execution-1',
      action: 'fund_job',
      actorAddress: clientSmartAccountAddress,
      chainId: 84532,
      contractAddress: currencyAddress,
      requestId: 'svc_failure_retry_1',
      correlationId: 'exec_failure_retry',
      operationKey: 'fund_job_retry_flow',
      txHash: '0xfail',
      status: 'failed',
      submittedAt: 900_000,
      milestoneIndex: undefined,
      escrowId: failedRecord.onchain.escrowId ?? undefined,
      failureCode: 'relay_rejected',
      failureMessage: 'Bundler rejected the request',
    });
    failedRecord.executions.push({
      id: 'failed-execution-2',
      action: 'fund_job',
      actorAddress: clientSmartAccountAddress,
      chainId: 84532,
      contractAddress: currencyAddress,
      requestId: 'svc_failure_retry_2',
      correlationId: 'exec_failure_retry',
      operationKey: 'fund_job_retry_flow',
      idempotencyKey: 'fund-job-retry',
      status: 'failed',
      submittedAt: 910_000,
      milestoneIndex: undefined,
      escrowId: failedRecord.onchain.escrowId ?? undefined,
      failureCode: 'relay_rejected',
      failureMessage: 'Relay rejected the retry',
    });
    failedRecord.executions.push({
      id: 'failed-execution-3',
      action: 'set_milestones',
      actorAddress: clientSmartAccountAddress,
      chainId: 84532,
      contractAddress: currencyAddress,
      requestId: 'svc_failure_retry_3',
      correlationId: 'exec_failure_milestones',
      operationKey: 'set_milestones_retry_flow',
      status: 'failed',
      submittedAt: 920_000,
      milestoneIndex: undefined,
      escrowId: failedRecord.onchain.escrowId ?? undefined,
      failureCode: undefined,
      failureMessage: 'Provider timeout',
    });
    failedRecord.updatedAt = 900_000;
    await escrowRepository.save(failedRecord);

    const report = await escrowHealthService.getReport(
      arbitratorUserId,
      {},
      reportNow,
    );

    expect(report.filters).toEqual({
      reason: null,
      limit: 25,
    });
    expect(report.thresholds.chainSyncBacklogHours).toBe(6);
    expect(report.thresholds.staleJobHours).toBe(24);
    expect(report.thresholds.defaultLimit).toBe(25);
    expect(report.thresholds.maxLimit).toBe(100);
    expect(report.summary).toEqual({
      totalJobs: 3,
      jobsNeedingAttention: 3,
      matchedJobs: 3,
      chainSyncBacklogJobs: 1,
      openDisputeJobs: 1,
      reconciliationDriftJobs: 0,
      failedExecutionJobs: 1,
      staleJobs: 1,
    });
    expect(report.jobs.map((job) => job.title)).toEqual([
      'Disputed delivery',
      'Relay-failed funding',
      'Stale draft job',
    ]);
    expect(report.jobs[0]).toMatchObject({
      title: 'Disputed delivery',
      reasons: ['open_dispute'],
      counts: {
        chainSyncBacklog: false,
        openDisputes: 1,
        failedExecutions: 0,
      },
    });
    expect(report.jobs[1]).toMatchObject({
      title: 'Relay-failed funding',
      reasons: ['failed_execution'],
      counts: {
        chainSyncBacklog: false,
        openDisputes: 0,
        failedExecutions: 3,
      },
      executionFailureWorkflow: null,
      latestFailedExecution: {
        action: 'set_milestones',
        failureCode: null,
      },
      failedExecutionDiagnostics: {
        firstFailureAt: 900_000,
        latestFailureAt: 920_000,
        traceCoverage: {
          totalFailures: 3,
          correlationTaggedFailures: 3,
          requestTaggedFailures: 3,
          idempotentFailures: 1,
          operationTaggedFailures: 3,
          uncorrelatedFailures: 0,
        },
        actionBreakdown: [
          {
            action: 'fund_job',
            count: 2,
          },
          {
            action: 'set_milestones',
            count: 1,
          },
        ],
        failureCodeBreakdown: [
          {
            failureCode: 'relay_rejected',
            count: 2,
            latestMessage: 'Relay rejected the retry',
          },
          {
            failureCode: null,
            count: 1,
            latestMessage: 'Provider timeout',
          },
        ],
        traceBreakdown: [
          {
            traceId: 'exec_failure_milestones',
            correlationId: 'exec_failure_milestones',
            count: 1,
            latestAt: 920_000,
            actions: ['set_milestones'],
            requestIds: ['svc_failure_retry_3'],
            idempotencyKeys: [],
            operationKeys: ['set_milestones_retry_flow'],
          },
          {
            traceId: 'exec_failure_retry',
            correlationId: 'exec_failure_retry',
            count: 2,
            latestAt: 910_000,
            actions: ['fund_job'],
            requestIds: ['svc_failure_retry_1', 'svc_failure_retry_2'],
            idempotencyKeys: ['fund-job-retry'],
            operationKeys: ['fund_job_retry_flow'],
          },
        ],
      },
      failureGuidance: {
        severity: 'critical',
        responsibleSurface: 'rpc_or_provider',
        retryPosture: 'safe_after_review',
      },
    });
    expect(report.jobs[1]?.failedExecutionDiagnostics?.recentFailures).toEqual([
      {
        action: 'set_milestones',
        submittedAt: 920_000,
        txHash: null,
        requestId: 'svc_failure_retry_3',
        correlationId: 'exec_failure_milestones',
        idempotencyKey: null,
        operationKey: 'set_milestones_retry_flow',
        failureCode: null,
        failureMessage: 'Provider timeout',
        milestoneIndex: null,
      },
      {
        action: 'fund_job',
        submittedAt: 910_000,
        txHash: null,
        requestId: 'svc_failure_retry_2',
        correlationId: 'exec_failure_retry',
        idempotencyKey: 'fund-job-retry',
        operationKey: 'fund_job_retry_flow',
        failureCode: 'relay_rejected',
        failureMessage: 'Relay rejected the retry',
        milestoneIndex: null,
      },
      {
        action: 'fund_job',
        submittedAt: 900_000,
        txHash: '0xfail',
        requestId: 'svc_failure_retry_1',
        correlationId: 'exec_failure_retry',
        idempotencyKey: null,
        operationKey: 'fund_job_retry_flow',
        failureCode: 'relay_rejected',
        failureMessage: 'Bundler rejected the request',
        milestoneIndex: null,
      },
    ]);
    expect(report.jobs[2]).toMatchObject({
      title: 'Stale draft job',
      reasons: ['chain_sync_backlog', 'stale_job'],
      counts: {
        chainSyncBacklog: true,
        openDisputes: 0,
        failedExecutions: 0,
      },
      staleWorkflow: null,
    });
    expect(report.jobs[2]?.staleForMs).toBe(99_989_900);
  });

  it('filters and limits matched jobs while preserving overall attention counts', async () => {
    process.env.OPERATIONS_ESCROW_HEALTH_DEFAULT_LIMIT = '2';

    const reportNow = 100_000_000;

    for (const title of ['Dispute A', 'Dispute B', 'Dispute C', 'Failure A']) {
      const createdJob = await escrowService.createJob(clientUserId, {
        contractorEmail,
        workerAddress,
        currencyAddress,
        title,
        description: 'Operations filter coverage',
        category: 'software-development',
        termsJSON: {
          currency: 'USDC',
        },
      });

      const record = await escrowRepository.getById(createdJob.jobId);
      if (!record) {
        throw new Error('Expected job record to exist');
      }

      if (title.startsWith('Dispute')) {
        record.milestones = [
          {
            title: 'Milestone',
            deliverable: 'Delivery',
            amount: '100',
            status: 'disputed',
            disputedAt: 50_000,
          },
        ];
        record.status = 'disputed';
      } else {
        record.executions.push({
          id: `failure-${title}`,
          action: 'fund_job',
          actorAddress: clientSmartAccountAddress,
          chainId: 84532,
          contractAddress: currencyAddress,
          status: 'failed',
          submittedAt: 60_000,
          failureCode: 'relay_rejected',
          failureMessage: 'Rejected',
        });
      }

      record.updatedAt = 60_000;
      await escrowRepository.save(record);
    }

    const filtered = await escrowHealthService.getReport(
      arbitratorUserId,
      {
        reason: 'open_dispute',
        limit: 2,
      },
      reportNow,
    );

    expect(filtered.filters).toEqual({
      reason: 'open_dispute',
      limit: 2,
    });
    expect(filtered.summary).toEqual({
      totalJobs: 4,
      jobsNeedingAttention: 4,
      matchedJobs: 3,
      chainSyncBacklogJobs: 0,
      openDisputeJobs: 3,
      reconciliationDriftJobs: 3,
      failedExecutionJobs: 0,
      staleJobs: 0,
    });
    expect(filtered.jobs).toHaveLength(2);
    expect(
      filtered.jobs.every((job) => job.reasons.includes('open_dispute')),
    ).toBe(true);
  });

  it('surfaces reconciliation drift when aggregate state diverges from the persisted timeline', async () => {
    const driftedJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
      workerAddress,
      currencyAddress,
      title: 'Timeline drift job',
      description: 'Should surface reconciliation findings.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });
    const driftedRecord = await escrowRepository.getById(driftedJob.jobId);
    if (!driftedRecord) {
      throw new Error('Expected drifted job record to exist');
    }

    driftedRecord.fundedAmount = '100';
    driftedRecord.status = 'funded';
    driftedRecord.updatedAt = 400_000;
    await escrowRepository.save(driftedRecord);

    const report = await escrowHealthService.getReport(
      arbitratorUserId,
      {
        reason: 'reconciliation_drift',
      },
      500_000,
    );

    expect(report.filters).toEqual({
      reason: 'reconciliation_drift',
      limit: 25,
    });
    expect(report.summary).toEqual({
      totalJobs: 1,
      jobsNeedingAttention: 1,
      matchedJobs: 1,
      chainSyncBacklogJobs: 0,
      openDisputeJobs: 0,
      reconciliationDriftJobs: 1,
      failedExecutionJobs: 0,
      staleJobs: 0,
    });
    expect(report.jobs[0]).toMatchObject({
      title: 'Timeline drift job',
      reasons: ['reconciliation_drift'],
      reconciliation: {
        issueCount: 3,
        highestSeverity: 'critical',
        sourceCounts: {
          auditEvents: 2,
          confirmedExecutions: 1,
          failedExecutions: 0,
        },
        projection: {
          aggregateStatus: 'funded',
          projectedStatus: 'draft',
          aggregateFundedAmount: '100',
          projectedFundedAmount: null,
        },
      },
    });
    expect(report.jobs[0]?.reconciliation?.issues[0]).toMatchObject({
      code: 'funding_state_mismatch',
      severity: 'critical',
    });
  });

  it('surfaces chain-sync backlog when the latest sync attempt is failing', async () => {
    const createdJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
      workerAddress,
      currencyAddress,
      title: 'Backlogged chain sync',
      description:
        'Recurring chain sync has not produced a healthy recent snapshot.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });
    const record = await escrowRepository.getById(createdJob.jobId);
    if (!record) {
      throw new Error('Expected backlogged job record to exist');
    }

    record.createdAt = 1_000;
    record.updatedAt = 1_000;
    record.audit = record.audit.map((event) => ({
      ...event,
      at: 1_000,
    }));
    record.executions = record.executions.map((execution) => ({
      ...execution,
      submittedAt: 1_000,
      confirmedAt: 1_001,
    }));
    record.operations.chainSync = {
      lastAttemptedAt: 2_000,
      lastOutcome: 'failed',
      lastMode: 'preview',
      lastIssueCount: 0,
      lastCriticalIssueCount: 0,
      lastReconciliationIssueCount: 0,
      lastErrorMessage: 'RPC request timed out',
    };
    await escrowRepository.save(record);

    const report = await escrowHealthService.getReport(
      arbitratorUserId,
      {
        reason: 'chain_sync_backlog',
      },
      100_000_000,
    );

    expect(report.summary).toEqual({
      totalJobs: 1,
      jobsNeedingAttention: 1,
      matchedJobs: 1,
      chainSyncBacklogJobs: 1,
      openDisputeJobs: 0,
      reconciliationDriftJobs: 0,
      failedExecutionJobs: 0,
      staleJobs: 1,
    });
    expect(report.jobs[0]).toMatchObject({
      title: 'Backlogged chain sync',
      reasons: ['chain_sync_backlog', 'stale_job'],
      counts: {
        chainSyncBacklog: true,
        openDisputes: 0,
        failedExecutions: 0,
      },
      chainSync: {
        status: 'failing',
        lastAttemptedAt: 2_000,
        lastSuccessfulAt: null,
        lastErrorMessage: 'RPC request timed out',
      },
    });
  });

  it('surfaces timeline transition drift when replay encounters an impossible audit sequence', async () => {
    const createdJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
      workerAddress,
      currencyAddress,
      title: 'Impossible audit ordering',
      description: 'Replay should flag invalid milestone transitions.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });

    await escrowService.fundJob(clientUserId, createdJob.jobId, {
      amount: '50',
    });
    await escrowService.setMilestones(clientUserId, createdJob.jobId, {
      milestones: [
        {
          title: 'Only milestone',
          deliverable: 'Work item',
          amount: '50',
        },
      ],
    });

    const record = await escrowRepository.getById(createdJob.jobId);
    if (!record) {
      throw new Error('Expected impossible-audit job record to exist');
    }

    record.audit.push({
      type: 'milestone.released',
      at: 70_000,
      payload: {
        jobId: createdJob.jobId,
        milestoneIndex: 0,
      },
    });
    record.updatedAt = 70_000;
    await escrowRepository.save(record);

    const report = await escrowHealthService.getReport(
      arbitratorUserId,
      {
        reason: 'reconciliation_drift',
      },
      100_000,
    );

    expect(report.summary).toMatchObject({
      chainSyncBacklogJobs: 0,
      reconciliationDriftJobs: 1,
      matchedJobs: 1,
    });
    expect(report.jobs[0]?.title).toBe('Impossible audit ordering');
    expect(report.jobs[0]?.reconciliation?.projection).toMatchObject({
      aggregateStatus: 'funded',
      projectedStatus: 'funded',
      aggregateFundedAmount: '50',
      projectedFundedAmount: '50',
    });
    expect(report.jobs[0]?.reconciliation?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'timeline_transition_mismatch',
          severity: 'critical',
        }),
      ]),
    );
  });

  it('rejects users that do not control the configured arbitrator wallet', async () => {
    await expect(
      escrowHealthService.getReport(nonOperatorUserId, {}, 100_000_000),
    ).rejects.toThrow(ForbiddenException);
  });

  it('claims and releases stale job workflows for the current operator', async () => {
    const reportNow = 100_000_000;

    const staleJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
      workerAddress,
      currencyAddress,
      title: 'Stale claim target',
      description: 'Needs explicit operator ownership.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });
    const staleRecord = await escrowRepository.getById(staleJob.jobId);
    if (!staleRecord) {
      throw new Error('Expected stale job record to exist');
    }
    staleRecord.createdAt = 10_000;
    staleRecord.updatedAt = 10_000;
    staleRecord.audit = staleRecord.audit.map((event) => ({
      ...event,
      at: 10_000,
    }));
    staleRecord.executions = staleRecord.executions.map((execution) => ({
      ...execution,
      submittedAt: 10_000,
      confirmedAt:
        typeof execution.confirmedAt === 'number'
          ? 10_100
          : execution.confirmedAt,
    }));
    await escrowRepository.save(staleRecord);

    const claimed = await escrowHealthService.claimStaleJob(
      arbitratorUserId,
      staleJob.jobId,
      {
        note: 'Waiting for client response.',
      },
      reportNow,
    );

    expect(claimed.job.staleWorkflow).toMatchObject({
      claimedByEmail: 'arbitrator@example.com',
      note: 'Waiting for client response.',
    });

    const persistedClaim = await escrowRepository.getById(staleJob.jobId);
    expect(persistedClaim?.operations.staleWorkflow).toMatchObject({
      claimedByUserId: arbitratorUserId,
      claimedByEmail: 'arbitrator@example.com',
      note: 'Waiting for client response.',
    });

    const released = await escrowHealthService.releaseStaleJob(
      arbitratorUserId,
      staleJob.jobId,
      reportNow,
    );

    expect(released.job.staleWorkflow).toBeNull();
    const persistedRelease = await escrowRepository.getById(staleJob.jobId);
    expect(persistedRelease?.operations.staleWorkflow).toBeNull();
  });

  it('claims, acknowledges, and releases execution-failure workflows for the current operator', async () => {
    const reportNow = 100_000_000;

    const failedJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
      workerAddress,
      currencyAddress,
      title: 'Retry-needed job',
      description: 'Needs an operator-managed failure workflow.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });
    const failedRecord = await escrowRepository.getById(failedJob.jobId);
    if (!failedRecord) {
      throw new Error('Expected failed job record to exist');
    }
    failedRecord.executions.push({
      id: 'failure-claim-1',
      action: 'fund_job',
      actorAddress: clientSmartAccountAddress,
      chainId: 84532,
      contractAddress: currencyAddress,
      status: 'failed',
      submittedAt: 800_000,
      failureCode: 'relay_rejected',
      failureMessage: 'Retry rejected',
    });
    failedRecord.executions.push({
      id: 'failure-claim-2',
      action: 'set_milestones',
      actorAddress: clientSmartAccountAddress,
      chainId: 84532,
      contractAddress: currencyAddress,
      status: 'failed',
      submittedAt: 850_000,
      failureCode: undefined,
      failureMessage: 'Provider timeout',
    });
    failedRecord.updatedAt = 850_000;
    await escrowRepository.save(failedRecord);

    const claimed = await escrowHealthService.claimExecutionFailureWorkflow(
      arbitratorUserId,
      failedJob.jobId,
      {
        note: 'Investigating relay posture.',
      },
      reportNow,
    );

    expect(claimed.job.executionFailureWorkflow).toMatchObject({
      claimedByUserId: arbitratorUserId,
      claimedByEmail: 'arbitrator@example.com',
      status: 'investigating',
      note: 'Investigating relay posture.',
      acknowledgedFailureAt: null,
      latestFailureNeedsAcknowledgement: true,
    });

    const updated = await escrowHealthService.updateExecutionFailureWorkflow(
      arbitratorUserId,
      failedJob.jobId,
      {
        note: 'Ready to retry after provider review.',
        status: 'ready_to_retry',
      },
      reportNow,
    );

    expect(updated.job.executionFailureWorkflow).toMatchObject({
      status: 'ready_to_retry',
      note: 'Ready to retry after provider review.',
    });

    const acknowledged = await escrowHealthService.acknowledgeExecutionFailures(
      arbitratorUserId,
      failedJob.jobId,
      {
        note: 'Acknowledged after checking provider health.',
        status: 'monitoring',
      },
      reportNow,
    );

    expect(acknowledged.job.executionFailureWorkflow).toMatchObject({
      status: 'monitoring',
      note: 'Acknowledged after checking provider health.',
      acknowledgedFailureAt: 850_000,
      latestFailureNeedsAcknowledgement: false,
    });

    const persistedAcknowledged = await escrowRepository.getById(
      failedJob.jobId,
    );
    expect(
      persistedAcknowledged?.operations.executionFailureWorkflow,
    ).toMatchObject({
      claimedByUserId: arbitratorUserId,
      status: 'monitoring',
      acknowledgedFailureAt: 850_000,
      note: 'Acknowledged after checking provider health.',
    });

    if (!persistedAcknowledged) {
      throw new Error('Expected acknowledged job record to exist');
    }
    persistedAcknowledged.executions.push({
      id: 'failure-claim-3',
      action: 'fund_job',
      actorAddress: clientSmartAccountAddress,
      chainId: 84532,
      contractAddress: currencyAddress,
      status: 'failed',
      submittedAt: 900_000,
      failureCode: 'relay_rejected',
      failureMessage: 'Retry rejected again',
    });
    persistedAcknowledged.updatedAt = 900_000;
    await escrowRepository.save(persistedAcknowledged);

    const report = await escrowHealthService.getReport(
      arbitratorUserId,
      {
        reason: 'failed_execution',
      },
      reportNow,
    );

    expect(report.jobs[0]?.executionFailureWorkflow).toMatchObject({
      status: 'monitoring',
      acknowledgedFailureAt: 850_000,
      latestFailureNeedsAcknowledgement: true,
    });
    expect(report.jobs[0]?.failureGuidance).toMatchObject({
      responsibleSurface: 'wallet_relay',
      retryPosture: 'wait_for_external_fix',
    });

    const released = await escrowHealthService.releaseExecutionFailureWorkflow(
      arbitratorUserId,
      failedJob.jobId,
      reportNow,
    );

    expect(released.job.executionFailureWorkflow).toBeNull();
    const persistedRelease = await escrowRepository.getById(failedJob.jobId);
    expect(persistedRelease?.operations.executionFailureWorkflow).toBeNull();
  });
});

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
