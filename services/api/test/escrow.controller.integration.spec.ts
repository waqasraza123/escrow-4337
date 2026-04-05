import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { ReqUser } from '../src/common/decorators/user.decorator';
import { ZodValidationPipe } from '../src/common/zod.pipe';
import { EscrowController } from '../src/modules/escrow/escrow.controller';
import * as escrowDto from '../src/modules/escrow/escrow.dto';
import { EscrowModule } from '../src/modules/escrow/escrow.module';
import { UsersService } from '../src/modules/users/users.service';
import { configureFilePersistence } from './support/test-persistence';

const clientAddress = '0x1111111111111111111111111111111111111111';
const clientSmartAccountAddress = '0x5555555555555555555555555555555555555555';
const workerAddress = '0x3333333333333333333333333333333333333333';
const currencyAddress = '0x4444444444444444444444444444444444444444';
const arbitratorAddress = '0x2222222222222222222222222222222222222222';

describe('EscrowController integration', () => {
  let controller: EscrowController;
  let usersService: UsersService;
  let moduleRef: TestingModule;
  let cleanupPersistence: (() => void) | undefined;
  let clientUser: ReqUser;
  let workerUser: ReqUser;
  let arbitratorUser: ReqUser;

  beforeEach(async () => {
    const persistence = configureFilePersistence();
    cleanupPersistence = persistence.cleanup;

    moduleRef = await Test.createTestingModule({
      imports: [EscrowModule],
    }).compile();

    controller = moduleRef.get(EscrowController);
    usersService = moduleRef.get(UsersService);
    clientUser = await createLinkedUser(
      usersService,
      'client@example.com',
      clientAddress,
      clientSmartAccountAddress,
    );
    workerUser = await createLinkedUser(
      usersService,
      'worker@example.com',
      workerAddress,
    );
    arbitratorUser = await createLinkedUser(
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

  it('rejects invalid create-job payloads', () => {
    const pipe = new ZodValidationPipe(escrowDto.createJobSchema);

    expect(() =>
      pipe.transform({
        title: '',
        description: 'Missing required fields should fail',
        termsJSON: [],
      }),
    ).toThrow(BadRequestException);
  });

  it('supports the escrow lifecycle through dispute resolution and audit retrieval', async () => {
    const createResponse = await controller.create(clientUser, {
      workerAddress,
      currencyAddress,
      title: 'Escrow orchestration',
      description: 'Implement lifecycle validation in the API layer.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
        chain: 'base-sepolia',
      },
    });

    expect(createResponse.jobHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(createResponse.status).toBe('draft');
    expect(createResponse.escrowId).toBe('1');
    expect(createResponse.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const jobId = createResponse.jobId;

    const fundedResponse = await controller.fund(clientUser, jobId, {
      amount: '150',
    });
    expect(fundedResponse.jobId).toBe(jobId);
    expect(fundedResponse.fundedAmount).toBe('150');
    expect(fundedResponse.status).toBe('funded');
    expect(fundedResponse.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const milestonesResponse = await controller.setMilestones(
      clientUser,
      jobId,
      {
        milestones: [
          {
            title: 'Implementation',
            deliverable: 'First implementation drop',
            amount: '75',
          },
          {
            title: 'Revision',
            deliverable: 'Final revised delivery',
            amount: '75',
          },
        ],
      },
    );
    expect(milestonesResponse.jobId).toBe(jobId);
    expect(milestonesResponse.milestoneCount).toBe(2);
    expect(milestonesResponse.status).toBe('funded');
    expect(milestonesResponse.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const firstDeliveryResponse = await controller.deliver(
      workerUser,
      jobId,
      0,
      {
        note: 'First delivery submitted',
        evidenceUrls: ['https://example.com/implementation'],
      },
    );
    expect(firstDeliveryResponse.jobId).toBe(jobId);
    expect(firstDeliveryResponse.milestoneIndex).toBe(0);
    expect(firstDeliveryResponse.milestoneStatus).toBe('delivered');
    expect(firstDeliveryResponse.jobStatus).toBe('in_progress');
    expect(firstDeliveryResponse.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const disputeResponse = await controller.dispute(clientUser, jobId, 0, {
      reason: 'The delivery is incomplete',
    });
    expect(disputeResponse.jobId).toBe(jobId);
    expect(disputeResponse.milestoneIndex).toBe(0);
    expect(disputeResponse.milestoneStatus).toBe('disputed');
    expect(disputeResponse.jobStatus).toBe('disputed');
    expect(disputeResponse.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const resolutionResponse = await controller.resolve(
      arbitratorUser,
      jobId,
      0,
      {
        action: 'refund',
        note: 'Refunding after dispute review',
      },
    );
    expect(resolutionResponse.jobId).toBe(jobId);
    expect(resolutionResponse.milestoneIndex).toBe(0);
    expect(resolutionResponse.milestoneStatus).toBe('refunded');
    expect(resolutionResponse.jobStatus).toBe('in_progress');
    expect(resolutionResponse.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const secondDeliveryResponse = await controller.deliver(
      workerUser,
      jobId,
      1,
      {
        note: 'Second delivery submitted',
        evidenceUrls: [],
      },
    );
    expect(secondDeliveryResponse.jobId).toBe(jobId);
    expect(secondDeliveryResponse.milestoneIndex).toBe(1);
    expect(secondDeliveryResponse.milestoneStatus).toBe('delivered');
    expect(secondDeliveryResponse.jobStatus).toBe('in_progress');
    expect(secondDeliveryResponse.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const releaseResponse = await controller.release(clientUser, jobId, 1, {});
    expect(releaseResponse.jobId).toBe(jobId);
    expect(releaseResponse.milestoneIndex).toBe(1);
    expect(releaseResponse.milestoneStatus).toBe('released');
    expect(releaseResponse.jobStatus).toBe('resolved');
    expect(releaseResponse.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const auditResponse = await controller.audit(jobId);

    expect(auditResponse.bundle.job.status).toBe('resolved');
    expect(auditResponse.bundle.job.onchain.escrowId).toBe('1');
    expect(auditResponse.bundle.job.milestones).toHaveLength(2);
    expect(auditResponse.bundle.audit.map((event) => event.type)).toEqual([
      'job.created',
      'job.funded',
      'job.milestones_set',
      'milestone.delivered',
      'milestone.disputed',
      'milestone.resolved',
      'milestone.delivered',
      'milestone.released',
    ]);
    expect(auditResponse.bundle.executions).toHaveLength(8);
    expect(
      auditResponse.bundle.executions.map((execution) => execution.action),
    ).toEqual([
      'create_job',
      'fund_job',
      'set_milestones',
      'deliver_milestone',
      'open_dispute',
      'resolve_dispute',
      'deliver_milestone',
      'release_milestone',
    ]);
  });

  it('retains persisted jobs after the escrow module is recreated', async () => {
    const created = await controller.create(clientUser, {
      workerAddress,
      currencyAddress,
      title: 'Persist escrow state',
      description: 'Ensure jobs survive restarts.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });

    await controller.fund(clientUser, created.jobId, {
      amount: '10',
    });

    await moduleRef.close();

    moduleRef = await Test.createTestingModule({
      imports: [EscrowModule],
    }).compile();
    controller = moduleRef.get(EscrowController);
    usersService = moduleRef.get(UsersService);
    clientUser = await createLinkedUser(
      usersService,
      'client@example.com',
      clientAddress,
      clientSmartAccountAddress,
    );

    const auditResponse = await controller.audit(created.jobId);
    expect(auditResponse.bundle.job.fundedAmount).toBe('10');
    expect(auditResponse.bundle.job.onchain.escrowId).toBe('1');
    expect(auditResponse.bundle.audit.map((event) => event.type)).toEqual([
      'job.created',
      'job.funded',
    ]);
    expect(
      auditResponse.bundle.executions.map((execution) => execution.action),
    ).toEqual(['create_job', 'fund_job']);
  });

  it('lists authenticated jobs for the current participant only', async () => {
    const clientCreated = await controller.create(clientUser, {
      workerAddress,
      currencyAddress,
      title: 'Client-viewable job',
      description: 'The client should see this in their list.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });

    const otherClient = await createLinkedUser(
      usersService,
      'other-client@example.com',
      '0x6666666666666666666666666666666666666666',
      '0x7777777777777777777777777777777777777777',
    );

    await controller.create(otherClient, {
      workerAddress,
      currencyAddress,
      title: 'Worker-viewable job',
      description: 'The worker should see the second job.',
      category: 'design',
      termsJSON: {
        currency: 'USDC',
      },
    });

    const clientList = await controller.list(clientUser);
    expect(clientList.jobs).toHaveLength(1);
    expect(clientList.jobs[0]?.participantRoles).toEqual(['client']);
    expect(clientList.jobs[0]?.job.id).toBe(clientCreated.jobId);
    expect(clientList.jobs[0]?.job.title).toBe('Client-viewable job');

    const workerList = await controller.list(workerUser);
    expect(workerList.jobs).toHaveLength(2);
    expect(
      workerList.jobs.every(
        (entry) =>
          entry.participantRoles.length === 1 &&
          entry.participantRoles[0] === 'worker',
      ),
    ).toBe(true);
  });
});

async function createLinkedUser(
  usersService: UsersService,
  email: string,
  address: string,
  smartAccountAddress?: string,
): Promise<ReqUser> {
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

  return {
    id: user.id,
    email: user.email,
    sid: `${user.id}-session`,
  };
}
