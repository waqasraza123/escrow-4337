import { Test, type TestingModule } from '@nestjs/testing';
import { EscrowService } from '../src/modules/escrow/escrow.service';
import type { EscrowJobHistoryExport } from '../src/modules/escrow/escrow.types';
import { OperationsModule } from '../src/modules/operations/operations.module';
import { EscrowHistoryImportService } from '../src/modules/operations/escrow-history-import.service';
import { EscrowModule } from '../src/modules/escrow/escrow.module';
import { UsersService } from '../src/modules/users/users.service';
import { configureFilePersistence } from './support/test-persistence';

const clientAddress = '0x1111111111111111111111111111111111111111';
const clientSmartAccountAddress = '0x5555555555555555555555555555555555555555';
const workerAddress = '0x3333333333333333333333333333333333333333';
const arbitratorAddress = '0x2222222222222222222222222222222222222222';
const currencyAddress = '0x4444444444444444444444444444444444444444';

describe('EscrowHistoryImportService', () => {
  const originalEnv = { ...process.env };
  let moduleRef: TestingModule;
  let escrowService: EscrowService;
  let historyImportService: EscrowHistoryImportService;
  let usersService: UsersService;
  let cleanupPersistence: (() => void) | undefined;
  let clientUserId: string;
  let workerUserId: string;
  let arbitratorUserId: string;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      ESCROW_ARBITRATOR_ADDRESS: arbitratorAddress,
    };

    const persistence = configureFilePersistence();
    cleanupPersistence = persistence.cleanup;

    moduleRef = await Test.createTestingModule({
      imports: [EscrowModule, OperationsModule],
    }).compile();

    escrowService = moduleRef.get(EscrowService);
    historyImportService = moduleRef.get(EscrowHistoryImportService);
    usersService = moduleRef.get(UsersService);

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

  it('normalizes out-of-order job-history imports and matches them to the local persisted timeline', async () => {
    const createdJob = await createDeliveredJob();
    const exported = await readJobHistoryExport(createdJob.jobId);

    exported.audit = [...exported.audit].reverse();
    exported.executions = [...exported.executions].reverse();

    const report = await historyImportService.importJobHistory(
      arbitratorUserId,
      {
        documentJson: JSON.stringify(exported),
      },
      100_000,
    );

    expect(report.document).toMatchObject({
      jobId: createdJob.jobId,
      artifact: 'job-history',
    });
    expect(report.normalization).toEqual({
      auditEvents: exported.audit.length,
      confirmedExecutions: exported.executions.length,
      failedExecutions: 0,
      auditWasReordered: true,
      executionWasReordered: true,
    });
    expect(report.importedReconciliation).toBeNull();
    expect(report.localComparison).toMatchObject({
      localJobFound: true,
      aggregateMatches: true,
      timelineDigestMatches: true,
      importedStatus: 'in_progress',
      localStatus: 'in_progress',
      importedFundedAmount: '100',
      localFundedAmount: '100',
      importedMilestoneCount: 1,
      localMilestoneCount: 1,
    });
  });

  it('surfaces imported replay drift when the job-history document contains a timeline mutation', async () => {
    const createdJob = await createDeliveredJob();
    const exported = await readJobHistoryExport(createdJob.jobId);

    exported.audit.push({
      type: 'milestone.released',
      at: exported.job.updatedAt + 50,
      payload: {
        jobId: createdJob.jobId,
        milestoneIndex: 0,
      },
    });

    const report = await historyImportService.importJobHistory(
      arbitratorUserId,
      {
        documentJson: JSON.stringify(exported),
      },
      100_000,
    );

    expect(report.normalization.auditWasReordered).toBe(false);
    expect(report.localComparison).toMatchObject({
      localJobFound: true,
      aggregateMatches: true,
      timelineDigestMatches: false,
    });
    expect(report.importedReconciliation).toMatchObject({
      highestSeverity: 'critical',
    });
    expect(report.importedReconciliation?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'job_status_mismatch',
          severity: 'critical',
        }),
        expect.objectContaining({
          code: 'milestone_state_mismatch',
          severity: 'critical',
        }),
      ]),
    );
  });

  async function createDeliveredJob() {
    const createdJob = await escrowService.createJob(clientUserId, {
      workerAddress,
      currencyAddress,
      title: 'Imported timeline target',
      description: 'Operator replay import coverage',
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
    await escrowService.deliverMilestone(workerUserId, createdJob.jobId, 0, {
      note: 'Submitted for replay import.',
      evidenceUrls: ['https://example.com/evidence'],
    });

    return createdJob;
  }

  async function readJobHistoryExport(jobId: string) {
    const exported = await escrowService.getExportDocument(
      jobId,
      'job-history',
      'json',
    );

    if (typeof exported.body === 'string') {
      throw new Error('Expected JSON job-history export document');
    }

    return structuredClone(exported.body) as EscrowJobHistoryExport;
  }
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
