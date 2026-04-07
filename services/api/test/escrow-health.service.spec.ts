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
    await escrowService.deliverMilestone(workerUserId, disputedJob.jobId, 0, {
      note: 'Submitted for review',
      evidenceUrls: ['https://example.com/evidence'],
    });
    await escrowService.disputeMilestone(clientUserId, disputedJob.jobId, 0, {
      reason: 'Review failed',
    });

    const failedJob = await escrowService.createJob(clientUserId, {
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
      txHash: '0xfail',
      status: 'failed',
      submittedAt: 900_000,
      milestoneIndex: undefined,
      escrowId: failedRecord.onchain.escrowId ?? undefined,
      failureCode: 'relay_rejected',
      failureMessage: 'Bundler rejected the request',
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
    expect(report.thresholds.staleJobHours).toBe(24);
    expect(report.thresholds.defaultLimit).toBe(25);
    expect(report.thresholds.maxLimit).toBe(100);
    expect(report.summary).toEqual({
      totalJobs: 3,
      jobsNeedingAttention: 3,
      matchedJobs: 3,
      openDisputeJobs: 1,
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
        openDisputes: 1,
        failedExecutions: 0,
      },
    });
    expect(report.jobs[1]).toMatchObject({
      title: 'Relay-failed funding',
      reasons: ['failed_execution'],
      counts: {
        openDisputes: 0,
        failedExecutions: 1,
      },
      latestFailedExecution: {
        action: 'fund_job',
        failureCode: 'relay_rejected',
      },
    });
    expect(report.jobs[2]).toMatchObject({
      title: 'Stale draft job',
      reasons: ['stale_job'],
      counts: {
        openDisputes: 0,
        failedExecutions: 0,
      },
    });
    expect(report.jobs[2]?.staleForMs).toBe(99_989_900);
  });

  it('filters and limits matched jobs while preserving overall attention counts', async () => {
    process.env.OPERATIONS_ESCROW_HEALTH_DEFAULT_LIMIT = '2';

    const reportNow = 100_000_000;

    for (const title of [
      'Dispute A',
      'Dispute B',
      'Dispute C',
      'Failure A',
    ]) {
      const createdJob = await escrowService.createJob(clientUserId, {
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
      openDisputeJobs: 3,
      failedExecutionJobs: 0,
      staleJobs: 0,
    });
    expect(filtered.jobs).toHaveLength(2);
    expect(filtered.jobs.every((job) => job.reasons.includes('open_dispute'))).toBe(
      true,
    );
  });

  it('rejects users that do not control the configured arbitrator wallet', async () => {
    await expect(
      escrowHealthService.getReport(nonOperatorUserId, {}, 100_000_000),
    ).rejects.toThrow(ForbiddenException);
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
