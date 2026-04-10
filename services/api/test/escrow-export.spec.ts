import { Test, type TestingModule } from '@nestjs/testing';
import type { ReqUser } from '../src/common/decorators/user.decorator';
import { EscrowController } from '../src/modules/escrow/escrow.controller';
import { EscrowModule } from '../src/modules/escrow/escrow.module';
import { EscrowService } from '../src/modules/escrow/escrow.service';
import type { EscrowJobHistoryExport } from '../src/modules/escrow/escrow.types';
import { UsersService } from '../src/modules/users/users.service';
import { configureFilePersistence } from './support/test-persistence';

const clientAddress = '0x1111111111111111111111111111111111111111';
const clientSmartAccountAddress = '0x5555555555555555555555555555555555555555';
const workerAddress = '0x3333333333333333333333333333333333333333';
const currencyAddress = '0x4444444444444444444444444444444444444444';
const arbitratorAddress = '0x2222222222222222222222222222222222222222';

describe('Escrow export support', () => {
  let controller: EscrowController;
  let escrowService: EscrowService;
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
    escrowService = moduleRef.get(EscrowService);
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

  it('builds deterministic job-history JSON and dispute-case CSV exports', async () => {
    const createResponse = await controller.create(clientUser, {
      workerAddress,
      currencyAddress,
      title: 'Escrow export coverage',
      description: 'Validate operator export artifacts.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
        chain: 'base-sepolia',
      },
    });

    await controller.fund(clientUser, createResponse.jobId, {
      amount: '100',
    });
    await controller.setMilestones(clientUser, createResponse.jobId, {
      milestones: [
        {
          title: 'Discovery',
          deliverable: 'Accepted plan',
          amount: '50',
        },
        {
          title: 'Delivery',
          deliverable: 'Final shipment',
          amount: '50',
        },
      ],
    });
    await controller.deliver(workerUser, createResponse.jobId, 0, {
      note: 'Delivery submitted',
      evidenceUrls: ['https://example.com/evidence'],
    });
    await controller.dispute(clientUser, createResponse.jobId, 0, {
      reason: 'Scope mismatch',
      evidenceUrls: ['https://example.com/dispute-proof'],
    });
    await controller.resolve(arbitratorUser, createResponse.jobId, 0, {
      action: 'refund',
      note: 'Refund after review',
    });

    const jobHistory = await escrowService.getExportDocument(
      createResponse.jobId,
      'job-history',
      'json',
    );

    expect(jobHistory.contentType).toBe('application/json; charset=utf-8');
    expect(jobHistory.fileName).toMatch(
      new RegExp(`^escrow-${createResponse.jobId}-job-history-.*\\.json$`),
    );
    expect(jobHistory.body).toMatchObject({
      schemaVersion: 1,
      artifact: 'job-history',
      job: {
        id: createResponse.jobId,
        title: 'Escrow export coverage',
      },
      summary: {
        milestoneCount: 2,
        disputedMilestones: 0,
        failedExecutions: 0,
      },
    });
    if (typeof jobHistory.body === 'string') {
      throw new Error('Expected JSON export body for job-history artifact');
    }
    const jobHistoryBody = jobHistory.body as EscrowJobHistoryExport;
    expect(jobHistoryBody.timeline).toHaveLength(12);
    expect(jobHistoryBody.timeline.map((entry) => entry.label)).toEqual(
      expect.arrayContaining([
        'job.created',
        'create_job',
        'job.funded',
        'fund_job',
        'job.milestones_set',
        'set_milestones',
        'milestone.delivered',
        'deliver_milestone',
        'milestone.disputed',
        'open_dispute',
        'milestone.resolved',
        'resolve_dispute',
      ]),
    );

    const disputeCase = await escrowService.getExportDocument(
      createResponse.jobId,
      'dispute-case',
      'csv',
    );

    expect(disputeCase.contentType).toBe('text/csv; charset=utf-8');
    expect(disputeCase.fileName).toMatch(
      new RegExp(`^escrow-${createResponse.jobId}-dispute-case-.*\\.csv$`),
    );
    expect(typeof disputeCase.body).toBe('string');
    expect(disputeCase.body).toContain(
      'job_id,job_title,artifact,milestone_index,milestone_title,status,amount,disputed_at,resolved_at,dispute_reason,dispute_evidence_urls,resolution_action,resolution_note,related_audit_count,related_execution_count,failed_execution_count',
    );
    expect(disputeCase.body).toContain('Escrow export coverage');
    expect(disputeCase.body).toContain('Scope mismatch');
    expect(disputeCase.body).toContain('https://example.com/dispute-proof');
    expect(disputeCase.body).toContain('refund');
    expect(disputeCase.body).toContain('Refund after review');
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
