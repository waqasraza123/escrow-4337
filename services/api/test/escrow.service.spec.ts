import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EscrowService } from '../src/modules/escrow/escrow.service';

describe('EscrowService', () => {
  let escrowService: EscrowService;

  beforeEach(() => {
    escrowService = new EscrowService();
  });

  it('supports the funded milestone lifecycle through release and completion', () => {
    const createdJob = escrowService.createJob({
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

    const fundedJob = escrowService.fundJob(createdJob.jobId, {
      amount: '150',
    });
    expect(fundedJob).toEqual({
      jobId: createdJob.jobId,
      fundedAmount: '150',
      status: 'funded',
    });

    const milestoneResult = escrowService.setMilestones(createdJob.jobId, [
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
    ]);
    expect(milestoneResult).toEqual({
      jobId: createdJob.jobId,
      milestoneCount: 2,
      status: 'funded',
    });

    expect(
      escrowService.deliverMilestone(createdJob.jobId, 0, {
        note: 'Concept deck delivered',
        evidenceUrls: ['https://example.com/concept'],
      }),
    ).toEqual({
      jobId: createdJob.jobId,
      milestoneIndex: 0,
      milestoneStatus: 'delivered',
      jobStatus: 'in_progress',
    });

    expect(escrowService.releaseMilestone(createdJob.jobId, 0)).toEqual({
      jobId: createdJob.jobId,
      milestoneIndex: 0,
      milestoneStatus: 'released',
      jobStatus: 'in_progress',
    });

    escrowService.deliverMilestone(createdJob.jobId, 1, {
      note: 'Final page delivered',
      evidenceUrls: ['https://example.com/final'],
    });

    expect(escrowService.releaseMilestone(createdJob.jobId, 1)).toEqual({
      jobId: createdJob.jobId,
      milestoneIndex: 1,
      milestoneStatus: 'released',
      jobStatus: 'completed',
    });

    const auditBundle = escrowService.getAuditBundle(createdJob.jobId);
    expect(auditBundle.bundle.job.status).toBe('completed');
    expect(auditBundle.bundle.job.milestones).toHaveLength(2);
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

  it('resolves disputed milestones and marks refunded jobs as resolved', () => {
    const createdJob = escrowService.createJob({
      title: 'Backend milestone contract',
      description: 'Implement the contract-facing API orchestration layer.',
      category: 'software-development',
      termsJSON: {
        currency: 'USDC',
      },
    });

    escrowService.fundJob(createdJob.jobId, { amount: '200' });
    escrowService.setMilestones(createdJob.jobId, [
      {
        title: 'Escrow API',
        deliverable: 'Validated orchestration endpoints',
        amount: '200',
      },
    ]);
    escrowService.deliverMilestone(createdJob.jobId, 0, {
      note: 'Implementation delivered for review',
      evidenceUrls: [],
    });
    escrowService.disputeMilestone(createdJob.jobId, 0, {
      reason: 'Funding terms were not met',
    });

    expect(
      escrowService.resolveMilestone(createdJob.jobId, 0, {
        action: 'refund',
        note: 'Refund approved after dispute review',
      }),
    ).toEqual({
      jobId: createdJob.jobId,
      milestoneIndex: 0,
      milestoneStatus: 'refunded',
      jobStatus: 'resolved',
    });

    const auditBundle = escrowService.getAuditBundle(createdJob.jobId);
    expect(auditBundle.bundle.job.status).toBe('resolved');
    expect(auditBundle.bundle.job.milestones[0]?.resolutionAction).toBe(
      'refund',
    );
  });

  it('rejects milestone totals that do not match the funded amount', () => {
    const createdJob = escrowService.createJob({
      title: 'Mismatch example',
      description: 'Ensure funded and milestone totals stay aligned.',
      category: 'design',
      termsJSON: {
        currency: 'USDC',
      },
    });

    escrowService.fundJob(createdJob.jobId, { amount: '100' });

    expect(() =>
      escrowService.setMilestones(createdJob.jobId, [
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
      ]),
    ).toThrow(ConflictException);
  });

  it('rejects invalid state transitions and missing resources', () => {
    expect(() =>
      escrowService.fundJob('missing-job', { amount: '10' }),
    ).toThrow(NotFoundException);

    const createdJob = escrowService.createJob({
      title: 'Invalid transitions',
      description: 'Guard against duplicate or out-of-order actions.',
      category: 'design',
      termsJSON: {
        currency: 'USDC',
      },
    });

    expect(() =>
      escrowService.setMilestones(createdJob.jobId, [
        {
          title: 'Blocked milestone',
          deliverable: 'Cannot be set before funding',
          amount: '10',
        },
      ]),
    ).toThrow(ConflictException);

    escrowService.fundJob(createdJob.jobId, { amount: '10' });
    expect(() =>
      escrowService.fundJob(createdJob.jobId, { amount: '10' }),
    ).toThrow(ConflictException);

    escrowService.setMilestones(createdJob.jobId, [
      {
        title: 'Only milestone',
        deliverable: 'Single deliverable',
        amount: '10',
      },
    ]);

    expect(() => escrowService.releaseMilestone(createdJob.jobId, 0)).toThrow(
      ConflictException,
    );
    expect(() =>
      escrowService.resolveMilestone(createdJob.jobId, 0, {
        action: 'refund',
        note: 'Cannot resolve before dispute',
      }),
    ).toThrow(ConflictException);
    expect(() =>
      escrowService.deliverMilestone(createdJob.jobId, -1, {
        note: 'Invalid milestone index',
        evidenceUrls: [],
      }),
    ).toThrow(BadRequestException);
  });
});
