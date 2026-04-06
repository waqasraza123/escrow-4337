import type { AuditBundle } from '../lib/api';

export const lookupHistoryStorageKey = 'escrow4337.admin.recent-lookups';

export function createAuditBundle(): AuditBundle {
  return {
    bundle: {
      job: {
        id: 'job-123',
        title: 'Disputed implementation',
        description: 'Operator review case',
        category: 'software-development',
        fundedAmount: '100',
        status: 'disputed',
        createdAt: 100,
        updatedAt: 500,
        milestones: [
          {
            title: 'Discovery',
            deliverable: 'Accepted plan',
            amount: '50',
            status: 'released',
            releasedAt: 200,
          },
          {
            title: 'Delivery',
            deliverable: 'Final feature shipment',
            amount: '50',
            status: 'disputed',
            deliveredAt: 300,
            disputedAt: 400,
            disputeReason: 'Acceptance criteria not met',
          },
        ],
        onchain: {
          chainId: 84532,
          contractAddress: '0xcontract',
          escrowId: 'escrow-1',
          clientAddress: '0xclient',
          workerAddress: '0xworker',
          currencyAddress: '0xusdc',
        },
      },
      audit: [
        {
          type: 'job.funded',
          at: 150,
          payload: { jobId: 'job-123' },
        },
        {
          type: 'milestone.disputed',
          at: 400,
          payload: { jobId: 'job-123', milestoneIndex: 1 },
        },
      ],
      executions: [
        {
          id: 'exec-1',
          action: 'open_dispute',
          actorAddress: '0xclient',
          status: 'confirmed',
          txHash: '0xconfirm',
          submittedAt: 395,
          confirmedAt: 400,
          milestoneIndex: 1,
        },
        {
          id: 'exec-2',
          action: 'resolve_dispute',
          actorAddress: '0xoperator',
          status: 'failed',
          txHash: '0xfail',
          submittedAt: 450,
          failureCode: 'relay_rejected',
          failureMessage: 'Bundler rejected the request',
          milestoneIndex: 1,
        },
      ],
    },
  };
}
