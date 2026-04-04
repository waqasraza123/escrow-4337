import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { EscrowModule } from '../src/modules/escrow/escrow.module';
import { EscrowContractGatewayError } from '../src/modules/escrow/onchain/escrow-contract.errors';
import { ESCROW_CONTRACT_GATEWAY } from '../src/modules/escrow/onchain/escrow-contract.tokens';
import type { EscrowContractGateway } from '../src/modules/escrow/onchain/escrow-contract.types';
import { EscrowService } from '../src/modules/escrow/escrow.service';
import { UsersService } from '../src/modules/users/users.service';
import { configureFilePersistence } from './support/test-persistence';

const clientAddress = '0x1111111111111111111111111111111111111111';
const workerAddress = '0x3333333333333333333333333333333333333333';
const currencyAddress = '0x4444444444444444444444444444444444444444';
const arbitratorAddress = '0x2222222222222222222222222222222222222222';

describe('EscrowService', () => {
  let escrowService: EscrowService;
  let usersService: UsersService;
  let moduleRef: TestingModule;
  let cleanupPersistence: (() => void) | undefined;
  let clientUserId: string;
  let workerUserId: string;
  let arbitratorUserId: string;

  beforeEach(async () => {
    const persistence = configureFilePersistence();
    cleanupPersistence = persistence.cleanup;
    moduleRef = await Test.createTestingModule({
      imports: [EscrowModule],
    }).compile();
    escrowService = moduleRef.get(EscrowService);
    usersService = moduleRef.get(UsersService);
    clientUserId = await createLinkedUserId(
      usersService,
      'client@example.com',
      clientAddress,
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
  });

  it('supports the funded milestone lifecycle through release and completion', async () => {
    const createdJob = await escrowService.createJob(clientUserId, {
      workerAddress,
      currencyAddress,
      title: 'Landing page build',
      description: 'Create and ship the first marketing site version.',
      category: 'design',
      termsJSON: {
        currency: 'USDC',
        chain: 'base-sepolia',
      },
    });

    expect(createdJob.jobHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(createdJob.status).toBe('draft');
    expect(createdJob.escrowId).toBe('1');
    expect(createdJob.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const fundedJob = await escrowService.fundJob(
      clientUserId,
      createdJob.jobId,
      {
        amount: '150',
      },
    );
    expect(fundedJob.jobId).toBe(createdJob.jobId);
    expect(fundedJob.fundedAmount).toBe('150');
    expect(fundedJob.status).toBe('funded');
    expect(fundedJob.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const milestoneResult = await escrowService.setMilestones(
      clientUserId,
      createdJob.jobId,
      {
        milestones: [
          {
            title: 'Initial concept',
            deliverable: 'First approved concept deck',
            amount: '50',
          },
          {
            title: 'Final delivery',
            deliverable: 'Final responsive landing page',
            amount: '100',
          },
        ],
      },
    );
    expect(milestoneResult.jobId).toBe(createdJob.jobId);
    expect(milestoneResult.milestoneCount).toBe(2);
    expect(milestoneResult.status).toBe('funded');
    expect(milestoneResult.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const firstDeliveryResult = await escrowService.deliverMilestone(
      workerUserId,
      createdJob.jobId,
      0,
      {
        note: 'Concept deck delivered',
        evidenceUrls: ['https://example.com/concept'],
      },
    );
    expect(firstDeliveryResult.jobId).toBe(createdJob.jobId);
    expect(firstDeliveryResult.milestoneIndex).toBe(0);
    expect(firstDeliveryResult.milestoneStatus).toBe('delivered');
    expect(firstDeliveryResult.jobStatus).toBe('in_progress');
    expect(firstDeliveryResult.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const firstReleaseResult = await escrowService.releaseMilestone(
      clientUserId,
      createdJob.jobId,
      0,
    );
    expect(firstReleaseResult.jobId).toBe(createdJob.jobId);
    expect(firstReleaseResult.milestoneIndex).toBe(0);
    expect(firstReleaseResult.milestoneStatus).toBe('released');
    expect(firstReleaseResult.jobStatus).toBe('in_progress');
    expect(firstReleaseResult.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    await escrowService.deliverMilestone(workerUserId, createdJob.jobId, 1, {
      note: 'Final page delivered',
      evidenceUrls: ['https://example.com/final'],
    });

    const secondReleaseResult = await escrowService.releaseMilestone(
      clientUserId,
      createdJob.jobId,
      1,
    );
    expect(secondReleaseResult.jobId).toBe(createdJob.jobId);
    expect(secondReleaseResult.milestoneIndex).toBe(1);
    expect(secondReleaseResult.milestoneStatus).toBe('released');
    expect(secondReleaseResult.jobStatus).toBe('completed');
    expect(secondReleaseResult.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const auditBundle = await escrowService.getAuditBundle(createdJob.jobId);
    expect(auditBundle.bundle.job.status).toBe('completed');
    expect(auditBundle.bundle.job.onchain.escrowId).toBe('1');
    expect(auditBundle.bundle.job.milestones).toHaveLength(2);
    expect(auditBundle.bundle.executions).toHaveLength(7);
    expect(auditBundle.bundle.audit.map((event) => event.type)).toEqual([
      'job.created',
      'job.funded',
      'job.milestones_set',
      'milestone.delivered',
      'milestone.released',
      'milestone.delivered',
      'milestone.released',
    ]);
  });

  it('resolves disputed milestones and marks refunded jobs as resolved', async () => {
    const createdJob = await escrowService.createJob(clientUserId, {
      workerAddress,
      currencyAddress,
      title: 'Backend milestone contract',
      description: 'Implement the contract-facing API orchestration layer.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });

    await escrowService.fundJob(clientUserId, createdJob.jobId, {
      amount: '200',
    });
    await escrowService.setMilestones(clientUserId, createdJob.jobId, {
      milestones: [
        {
          title: 'Escrow API',
          deliverable: 'Validated orchestration endpoints',
          amount: '200',
        },
      ],
    });
    await escrowService.deliverMilestone(workerUserId, createdJob.jobId, 0, {
      note: 'Implementation delivered for review',
      evidenceUrls: [],
    });
    await escrowService.disputeMilestone(clientUserId, createdJob.jobId, 0, {
      reason: 'Funding terms were not met',
    });

    const resolutionResult = await escrowService.resolveMilestone(
      arbitratorUserId,
      createdJob.jobId,
      0,
      {
        action: 'refund',
        note: 'Refund approved after dispute review',
      },
    );
    expect(resolutionResult.jobId).toBe(createdJob.jobId);
    expect(resolutionResult.milestoneIndex).toBe(0);
    expect(resolutionResult.milestoneStatus).toBe('refunded');
    expect(resolutionResult.jobStatus).toBe('resolved');
    expect(resolutionResult.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const auditBundle = await escrowService.getAuditBundle(createdJob.jobId);
    expect(auditBundle.bundle.job.status).toBe('resolved');
    expect(auditBundle.bundle.job.milestones[0]?.resolutionAction).toBe(
      'refund',
    );
  });

  it('records failed onchain execution attempts without mutating local job state', async () => {
    await moduleRef.close();

    cleanupPersistence?.();
    const persistence = configureFilePersistence();
    cleanupPersistence = persistence.cleanup;

    const failingGateway: EscrowContractGateway = {
      createJob: () =>
        Promise.resolve({
          chainId: 84532,
          contractAddress: currencyAddress,
          escrowId: '1',
          txHash:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          blockNumber: 1,
          submittedAt: 1,
          confirmedAt: 2,
        }),
      fundJob: () =>
        Promise.reject(
          new EscrowContractGatewayError('Escrow relay rejected funding', {
            code: 'relay_rejected',
            action: 'fund_job',
            chainId: 84532,
            contractAddress: currencyAddress,
            txHash:
              '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            submittedAt: 10,
          }),
        ),
      setMilestones: () => Promise.reject(new Error('not implemented')),
      deliverMilestone: () => Promise.reject(new Error('not implemented')),
      releaseMilestone: () => Promise.reject(new Error('not implemented')),
      openDispute: () => Promise.reject(new Error('not implemented')),
      resolveDispute: () => Promise.reject(new Error('not implemented')),
    };

    moduleRef = await Test.createTestingModule({
      imports: [EscrowModule],
    })
      .overrideProvider(ESCROW_CONTRACT_GATEWAY)
      .useValue(failingGateway)
      .compile();
    escrowService = moduleRef.get(EscrowService);
    usersService = moduleRef.get(UsersService);
    clientUserId = await createLinkedUserId(
      usersService,
      'client@example.com',
      clientAddress,
    );

    const createdJob = await escrowService.createJob(clientUserId, {
      workerAddress,
      currencyAddress,
      title: 'Funding failure',
      description: 'Capture failed execution attempts.',
      category: 'design',
      termsJSON: {
        currency: 'USDC',
      },
    });

    await expect(
      escrowService.fundJob(clientUserId, createdJob.jobId, {
        amount: '20',
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    const auditBundle = await escrowService.getAuditBundle(createdJob.jobId);
    expect(auditBundle.bundle.job.fundedAmount).toBeNull();
    expect(auditBundle.bundle.executions).toHaveLength(2);
    expect(auditBundle.bundle.executions[1]).toEqual(
      expect.objectContaining({
        action: 'fund_job',
        status: 'failed',
        failureCode: 'relay_rejected',
      }),
    );
  });

  it('rejects milestone totals that do not match the funded amount', async () => {
    const createdJob = await escrowService.createJob(clientUserId, {
      workerAddress,
      currencyAddress,
      title: 'Mismatch example',
      description: 'Ensure funded and milestone totals stay aligned.',
      category: 'design',
      termsJSON: {
        currency: 'USDC',
      },
    });

    await escrowService.fundJob(clientUserId, createdJob.jobId, {
      amount: '100',
    });

    await expect(
      escrowService.setMilestones(clientUserId, createdJob.jobId, {
        milestones: [
          {
            title: 'First milestone',
            deliverable: 'One deliverable',
            amount: '40',
          },
          {
            title: 'Second milestone',
            deliverable: 'Another deliverable',
            amount: '40',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects invalid state transitions and missing resources', async () => {
    await expect(
      escrowService.fundJob(clientUserId, 'missing-job', {
        amount: '10',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const createdJob = await escrowService.createJob(clientUserId, {
      workerAddress,
      currencyAddress,
      title: 'Invalid transitions',
      description: 'Guard against duplicate or out-of-order actions.',
      category: 'design',
      termsJSON: {
        currency: 'USDC',
      },
    });

    await expect(
      escrowService.releaseMilestone(clientUserId, createdJob.jobId, 0),
    ).rejects.toBeInstanceOf(NotFoundException);

    await escrowService.fundJob(clientUserId, createdJob.jobId, {
      amount: '50',
    });

    await expect(
      escrowService.fundJob(clientUserId, createdJob.jobId, {
        amount: '50',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects create-job calls when the user has no default execution wallet', async () => {
    const userWithoutWallet = await usersService.getOrCreateByEmail(
      'unlinked@example.com',
    );

    await expect(
      escrowService.createJob(userWithoutWallet.id, {
        workerAddress,
        currencyAddress,
        title: 'Unlinked user',
        description: 'Wallet-backed execution is required.',
        category: 'design',
        termsJSON: {
          currency: 'USDC',
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

async function createLinkedUserId(
  usersService: UsersService,
  email: string,
  address: string,
) {
  const user = await usersService.getOrCreateByEmail(email);
  await usersService.linkWallet(user.id, {
    address,
    walletKind: 'eoa',
  });
  return user.id;
}
