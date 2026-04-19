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
const clientSmartAccountAddress = '0x5555555555555555555555555555555555555555';
const workerAddress = '0x3333333333333333333333333333333333333333';
const currencyAddress = '0x4444444444444444444444444444444444444444';
const arbitratorAddress = '0x2222222222222222222222222222222222222222';
const contractorEmail = 'worker@example.com';

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
  });

  it('supports the funded milestone lifecycle through release and completion', async () => {
    const createdJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
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

    const joinResult = await joinAsContractor(
      escrowService,
      clientUserId,
      workerUserId,
      createdJob.jobId,
    );
    expect(joinResult.contractorParticipation.status).toBe('joined');
    expect(joinResult.contractorParticipation.joinedAt).not.toBeNull();

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
      'job.contractor_participation_requested',
      'job.funded',
      'job.milestones_set',
      'job.contractor_invite_sent',
      'job.contractor_joined',
      'milestone.delivered',
      'milestone.released',
      'milestone.delivered',
      'milestone.released',
    ]);
  });

  it('resolves disputed milestones and marks refunded jobs as resolved', async () => {
    const createdJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
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
    await joinAsContractor(
      escrowService,
      clientUserId,
      workerUserId,
      createdJob.jobId,
    );
    await escrowService.deliverMilestone(workerUserId, createdJob.jobId, 0, {
      note: 'Implementation delivered for review',
      evidenceUrls: [],
    });
    await escrowService.disputeMilestone(clientUserId, createdJob.jobId, 0, {
      reason: 'Funding terms were not met',
      evidenceUrls: ['https://example.com/dispute-proof'],
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
    expect(auditBundle.bundle.job.milestones[0]?.disputeEvidenceUrls).toEqual([
      'https://example.com/dispute-proof',
    ]);
  });

  it('supports contractor invite resend, email correction, and token-based join recovery', async () => {
    const createdJob = await escrowService.createJob(clientUserId, {
      contractorEmail: 'wrong-worker@example.com',
      workerAddress,
      currencyAddress,
      title: 'Invite recovery',
      description: 'Recover the pending contractor handshake safely.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });

    const initialInvite = await escrowService.inviteContractor(
      clientUserId,
      createdJob.jobId,
      {
        delivery: 'manual',
        frontendOrigin: 'http://localhost:3000',
      },
    );
    const staleInviteToken =
      new URL(initialInvite.invite.joinUrl).searchParams.get('invite') ?? '';

    const wrongEmailReadiness = await escrowService.getContractorJoinReadiness(
      workerUserId,
      createdJob.jobId,
      staleInviteToken,
    );
    expect(wrongEmailReadiness.status).toBe('wrong_email');

    await escrowService.updateContractorEmail(clientUserId, createdJob.jobId, {
      contractorEmail,
    });

    const staleReadiness = await escrowService.getContractorJoinReadiness(
      workerUserId,
      createdJob.jobId,
      staleInviteToken,
    );
    expect(staleReadiness.status).toBe('invite_invalid');

    const updatedInvite = await escrowService.inviteContractor(
      clientUserId,
      createdJob.jobId,
      {
        delivery: 'email',
        frontendOrigin: 'http://localhost:3000',
        regenerate: true,
      },
    );
    const freshInviteToken =
      new URL(updatedInvite.invite.joinUrl).searchParams.get('invite') ?? '';

    const readyReadiness = await escrowService.getContractorJoinReadiness(
      workerUserId,
      createdJob.jobId,
      freshInviteToken,
    );
    expect(readyReadiness.status).toBe('ready');

    await expect(
      escrowService.joinContractor(workerUserId, createdJob.jobId, {
        inviteToken: staleInviteToken,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const joinResult = await escrowService.joinContractor(
      workerUserId,
      createdJob.jobId,
      {
        inviteToken: freshInviteToken,
      },
    );
    expect(joinResult.contractorParticipation.status).toBe('joined');

    await expect(
      escrowService.updateContractorEmail(clientUserId, createdJob.jobId, {
        contractorEmail: 'another@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reports wallet-linked recovery states before contractor join', async () => {
    const unlinkedEmail = 'unlinked-worker@example.com';
    const unlinkedJob = await escrowService.createJob(clientUserId, {
      contractorEmail: unlinkedEmail,
      workerAddress,
      currencyAddress,
      title: 'Join readiness without wallet',
      description: 'Show the missing-wallet recovery state before join.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });
    const unlinkedInvite = await escrowService.inviteContractor(
      clientUserId,
      unlinkedJob.jobId,
      {
        delivery: 'manual',
        frontendOrigin: 'http://localhost:3000',
      },
    );
    const unlinkedInviteToken =
      new URL(unlinkedInvite.invite.joinUrl).searchParams.get('invite') ?? '';
    const unlinkedUser = await usersService.getOrCreateByEmail(unlinkedEmail);
    const walletMissing = await escrowService.getContractorJoinReadiness(
      unlinkedUser.id,
      unlinkedJob.jobId,
      unlinkedInviteToken,
    );
    expect(walletMissing.status).toBe('wallet_not_linked');

    const wrongWalletEmail = 'wrong-wallet-worker@example.com';
    const wrongWalletJob = await escrowService.createJob(clientUserId, {
      contractorEmail: wrongWalletEmail,
      workerAddress,
      currencyAddress,
      title: 'Join readiness with wrong wallet',
      description: 'Show the wrong-wallet recovery state before join.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });
    const wrongWalletInvite = await escrowService.inviteContractor(
      clientUserId,
      wrongWalletJob.jobId,
      {
        delivery: 'manual',
        frontendOrigin: 'http://localhost:3000',
      },
    );
    const wrongWalletInviteToken =
      new URL(wrongWalletInvite.invite.joinUrl).searchParams.get('invite') ??
      '';
    const wrongWalletUser =
      await usersService.getOrCreateByEmail(wrongWalletEmail);
    await usersService.linkWallet(wrongWalletUser.id, {
      address: '0x9999999999999999999999999999999999999999',
      walletKind: 'eoa',
      verificationMethod: 'siwe',
      verificationChainId: 84532,
      verifiedAt: Date.now(),
    });
    const wrongWallet = await escrowService.getContractorJoinReadiness(
      wrongWalletUser.id,
      wrongWalletJob.jobId,
      wrongWalletInviteToken,
    );
    expect(wrongWallet.status).toBe('wrong_wallet');
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
      clientSmartAccountAddress,
    );

    const createdJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
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
      }, {
        requestId: 'req_failed_fund',
        idempotencyKey: 'fund-failure-1',
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    await expect(
      escrowService.fundJob(clientUserId, createdJob.jobId, {
        amount: '20',
      }, {
        requestId: 'req_failed_fund_retry',
        idempotencyKey: 'fund-failure-1',
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    const auditBundle = await escrowService.getAuditBundle(createdJob.jobId);
    expect(auditBundle.bundle.job.fundedAmount).toBeNull();
    expect(auditBundle.bundle.executions).toHaveLength(2);
    expect(auditBundle.bundle.executions[1]).toEqual(
      expect.objectContaining({
        action: 'fund_job',
        status: 'failed',
        requestId: 'req_failed_fund',
        idempotencyKey: 'fund-failure-1',
        operationKey: expect.stringMatching(/^fund_job_/),
        correlationId: expect.stringMatching(/^exec_/),
        failureCode: 'relay_rejected',
      }),
    );
  });

  it('replays create-job success for the same idempotency key without creating duplicates', async () => {
    const requestContext = {
      requestId: 'req_create_job',
      idempotencyKey: 'create-job-1',
    };

    const first = await escrowService.createJob(
      clientUserId,
      {
        contractorEmail,
        workerAddress,
        currencyAddress,
        title: 'Idempotent create',
        description: 'Create should not duplicate on retries.',
        category: 'design',
        termsJSON: {
          currency: 'USDC',
        },
      },
      requestContext,
    );
    const replayed = await escrowService.createJob(
      clientUserId,
      {
        contractorEmail,
        workerAddress,
        currencyAddress,
        title: 'Idempotent create',
        description: 'Create should not duplicate on retries.',
        category: 'design',
        termsJSON: {
          currency: 'USDC',
        },
      },
      {
        requestId: 'req_create_job_retry',
        idempotencyKey: 'create-job-1',
      },
    );

    expect(replayed).toEqual(first);

    const jobs = await escrowService.listJobsForUser(clientUserId);
    expect(jobs.jobs).toHaveLength(1);
    const auditBundle = await escrowService.getAuditBundle(first.jobId);
    expect(auditBundle.bundle.executions).toHaveLength(1);
    expect(auditBundle.bundle.executions[0]).toEqual(
      expect.objectContaining({
        action: 'create_job',
        requestId: 'req_create_job',
        idempotencyKey: 'create-job-1',
        operationKey: expect.stringMatching(/^create_job_/),
        correlationId: expect.stringMatching(/^exec_/),
      }),
    );
  });

  it('replays confirmed funding for the same idempotency key without duplicating execution history', async () => {
    const createdJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
      workerAddress,
      currencyAddress,
      title: 'Idempotent funding',
      description: 'Funding retries should reuse the first confirmed result.',
      category: 'design',
      termsJSON: {
        currency: 'USDC',
      },
    });

    const firstFunding = await escrowService.fundJob(
      clientUserId,
      createdJob.jobId,
      {
        amount: '25',
      },
      {
        requestId: 'req_fund_job',
        idempotencyKey: 'fund-job-1',
      },
    );
    const replayedFunding = await escrowService.fundJob(
      clientUserId,
      createdJob.jobId,
      {
        amount: '25',
      },
      {
        requestId: 'req_fund_job_retry',
        idempotencyKey: 'fund-job-1',
      },
    );

    expect(replayedFunding).toEqual(firstFunding);

    const auditBundle = await escrowService.getAuditBundle(createdJob.jobId);
    const fundExecutions = auditBundle.bundle.executions.filter(
      (execution) => execution.action === 'fund_job',
    );
    expect(fundExecutions).toHaveLength(1);
    expect(fundExecutions[0]).toEqual(
      expect.objectContaining({
        requestId: 'req_fund_job',
        idempotencyKey: 'fund-job-1',
        operationKey: expect.stringMatching(/^fund_job_/),
        correlationId: expect.stringMatching(/^exec_/),
      }),
    );
  });

  it('lists jobs for the current participant with derived roles', async () => {
    const firstJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
      workerAddress,
      currencyAddress,
      title: 'Client-visible job',
      description: 'The client should see this job in their console.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });

    await escrowService.fundJob(clientUserId, firstJob.jobId, {
      amount: '35',
    });
    await joinAsContractor(
      escrowService,
      clientUserId,
      workerUserId,
      firstJob.jobId,
    );

    const otherClient = await usersService.getOrCreateByEmail(
      'other-client@example.com',
    );
    const otherClientAddress = '0x6666666666666666666666666666666666666666';
    const otherExecutionAddress = '0x7777777777777777777777777777777777777777';
    const linkedAt = Date.now();
    await usersService.linkWallet(otherClient.id, {
      address: otherClientAddress,
      walletKind: 'eoa',
      verificationMethod: 'siwe',
      verificationChainId: 84532,
      verifiedAt: linkedAt,
    });
    await usersService.linkWallet(otherClient.id, {
      address: otherExecutionAddress,
      walletKind: 'smart_account',
      ownerAddress: otherClientAddress,
      recoveryAddress: otherClientAddress,
      chainId: 84532,
      providerKind: 'mock',
      entryPointAddress: '0x00000061fefce24a79343c27127435286bb7a4e1',
      factoryAddress: '0x3333333333333333333333333333333333333333',
      sponsorshipPolicy: 'sponsored',
      provisionedAt: linkedAt,
      label: 'Other execution wallet',
    });
    await usersService.setDefaultExecutionWallet(
      otherClient.id,
      otherExecutionAddress,
    );

    const secondJob = await escrowService.createJob(otherClient.id, {
      contractorEmail,
      workerAddress,
      currencyAddress,
      title: 'Worker-visible job',
      description: 'The worker should see this job too.',
      category: 'design',
      termsJSON: {
        currency: 'USDC',
      },
    });
    await joinAsContractor(
      escrowService,
      otherClient.id,
      workerUserId,
      secondJob.jobId,
    );

    const clientJobs = await escrowService.listJobsForUser(clientUserId);
    expect(clientJobs.jobs).toHaveLength(1);
    expect(clientJobs.jobs[0]?.participantRoles).toEqual(['client']);
    expect(clientJobs.jobs[0]?.job.id).toBe(firstJob.jobId);
    expect(clientJobs.jobs[0]?.job.fundedAmount).toBe('35');

    const workerJobs = await escrowService.listJobsForUser(workerUserId);
    expect(workerJobs.jobs).toHaveLength(2);
    expect(
      workerJobs.jobs.map((job) => job.participantRoles.join(',')),
    ).toEqual(['worker', 'worker']);
  });

  it('keeps pending contractor jobs hidden until the matching contractor joins', async () => {
    const createdJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
      workerAddress,
      currencyAddress,
      title: 'Join-gated delivery',
      description: 'Worker access must stay pending until join succeeds.',
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
          title: 'Delivery',
          deliverable: 'Joined contractor milestone',
          amount: '50',
        },
      ],
    });

    const pendingWorkerJobs = await escrowService.listJobsForUser(workerUserId);
    expect(
      pendingWorkerJobs.jobs.find((entry) => entry.job.id === createdJob.jobId),
    ).toBeUndefined();

    await expect(
      escrowService.deliverMilestone(workerUserId, createdJob.jobId, 0, {
        note: 'Premature delivery',
        evidenceUrls: [],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const joinResult = await joinAsContractor(
      escrowService,
      clientUserId,
      workerUserId,
      createdJob.jobId,
    );
    expect(joinResult.contractorParticipation.status).toBe('joined');

    const joinedWorkerJobs = await escrowService.listJobsForUser(workerUserId);
    expect(
      joinedWorkerJobs.jobs.find((entry) => entry.job.id === createdJob.jobId)
        ?.participantRoles,
    ).toEqual(['worker']);

    const auditBundle = await escrowService.getAuditBundle(createdJob.jobId);
    expect(auditBundle.bundle.job.contractorParticipation).toMatchObject({
      status: 'joined',
    });
    expect(
      Object.prototype.hasOwnProperty.call(
        auditBundle.bundle.job.contractorParticipation ?? {},
        'contractorEmail',
      ),
    ).toBe(false);
  });

  it('rejects milestone totals that do not match the funded amount', async () => {
    const createdJob = await escrowService.createJob(clientUserId, {
      contractorEmail,
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
      contractorEmail,
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
        contractorEmail,
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

  it('rejects create-job calls when the default execution wallet is not a smart account', async () => {
    const linkedAt = Date.now();
    const eoaOnlyUser = await usersService.getOrCreateByEmail(
      'eoa-only@example.com',
    );
    await usersService.linkWallet(eoaOnlyUser.id, {
      address: '0x7777777777777777777777777777777777777777',
      walletKind: 'eoa',
      verificationMethod: 'siwe',
      verificationChainId: 84532,
      verifiedAt: linkedAt,
    });

    await expect(
      escrowService.createJob(eoaOnlyUser.id, {
        contractorEmail,
        workerAddress,
        currencyAddress,
        title: 'EOA execution',
        description: 'Smart-account execution is required.',
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
