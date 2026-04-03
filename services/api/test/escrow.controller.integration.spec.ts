import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodValidationPipe } from '../src/common/zod.pipe';
import * as escrowDto from '../src/modules/escrow/escrow.dto';
import { EscrowController } from '../src/modules/escrow/escrow.controller';
import { EscrowModule } from '../src/modules/escrow/escrow.module';

describe('EscrowController integration', () => {
  let controller: EscrowController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [EscrowModule],
    }).compile();

    controller = moduleRef.get(EscrowController);
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

  it('supports the escrow lifecycle through dispute resolution and audit retrieval', () => {
    const createResponse = controller.create({
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

    const jobId = createResponse.jobId;

    expect(
      controller.fund(jobId, {
        amount: '150',
      }),
    ).toEqual({
      jobId,
      fundedAmount: '150',
      status: 'funded',
    });

    expect(
      controller.setMilestones(jobId, [
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
      ]),
    ).toEqual({
      jobId,
      milestoneCount: 2,
      status: 'funded',
    });

    expect(
      controller.deliver(jobId, 0, {
        note: 'First delivery submitted',
        evidenceUrls: ['https://example.com/implementation'],
      }),
    ).toEqual({
      jobId,
      milestoneIndex: 0,
      milestoneStatus: 'delivered',
      jobStatus: 'in_progress',
    });

    expect(
      controller.dispute(jobId, 0, {
        reason: 'The delivery is incomplete',
      }),
    ).toEqual({
      jobId,
      milestoneIndex: 0,
      milestoneStatus: 'disputed',
      jobStatus: 'disputed',
    });

    expect(
      controller.resolve(jobId, 0, {
        action: 'refund',
        note: 'Refunding after dispute review',
      }),
    ).toEqual({
      jobId,
      milestoneIndex: 0,
      milestoneStatus: 'refunded',
      jobStatus: 'in_progress',
    });

    expect(
      controller.deliver(jobId, 1, {
        note: 'Second delivery submitted',
        evidenceUrls: [],
      }),
    ).toEqual({
      jobId,
      milestoneIndex: 1,
      milestoneStatus: 'delivered',
      jobStatus: 'in_progress',
    });

    expect(controller.release(jobId, 1)).toEqual({
      jobId,
      milestoneIndex: 1,
      milestoneStatus: 'released',
      jobStatus: 'resolved',
    });

    const auditResponse = controller.audit(jobId);

    expect(auditResponse.bundle.job.status).toBe('resolved');
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
  });
});
