import { describe, expect, it } from 'vitest';
import type { AuditBundle, JobView } from '../lib/api';
import { getWebMessages } from '../lib/i18n';
import {
  buildJobLifecycleCards,
  buildMilestoneLifecycleCards,
  buildMilestoneTimelineEntries,
  getJobAuditEvents,
  getJobExecutions,
  getMilestoneAuditEvents,
  getMilestoneExecutions,
  pickInitialMilestoneIndex,
  type PendingLifecycleAction,
} from './milestone-lifecycle';

function createJob(
  milestoneOverrides: Partial<JobView['milestones'][number]>[] = [],
): JobView {
  return {
    id: 'job-1',
    title: 'Escrowed implementation',
    description: 'Build the requested product slice.',
    category: 'software-development',
    termsJSON: {},
    jobHash: '0xjobhash',
    fundedAmount: null,
    status: 'draft',
    createdAt: 100,
    updatedAt: 100,
    contractorParticipation: null,
    milestones: milestoneOverrides.map((override, index) => ({
      title: `Milestone ${index + 1}`,
      deliverable: `Deliverable ${index + 1}`,
      amount: '50',
      status: 'pending',
      ...override,
    })),
    operations: {
      chainSync: null,
      executionFailureWorkflow: null,
      staleWorkflow: null,
      commercial: null,
    },
    onchain: {
      chainId: 84532,
      contractAddress: '0xcontract',
      escrowId: 'escrow-1',
      clientAddress: '0xclient',
      workerAddress: '0xworker',
      currencyAddress: '0xusdc',
    },
  };
}

const lifecycleCopy = getWebMessages('en').console.lifecycle;

function createExecution(
  override: Partial<AuditBundle['bundle']['executions'][number]>,
): AuditBundle['bundle']['executions'][number] {
  return {
    id: override.id ?? `execution-${override.action ?? 'unknown'}`,
    action: override.action ?? 'fund_job',
    actorAddress: override.actorAddress ?? '0xactor',
    chainId: override.chainId ?? 84532,
    contractAddress: override.contractAddress ?? '0xcontract',
    txHash: override.txHash,
    status: override.status ?? 'confirmed',
    blockNumber: override.blockNumber,
    submittedAt: override.submittedAt ?? 100,
    confirmedAt: override.confirmedAt,
    milestoneIndex: override.milestoneIndex,
    escrowId: override.escrowId ?? 'escrow-1',
    failureCode: override.failureCode,
    failureMessage: override.failureMessage,
  };
}

function createAuditEvent(
  override: Partial<AuditBundle['bundle']['audit'][number]>,
): AuditBundle['bundle']['audit'][number] {
  return {
    type: override.type ?? 'job.funded',
    at: override.at ?? 100,
    payload: override.payload ?? { jobId: 'job-1' },
  };
}

describe('milestone lifecycle helpers', () => {
  it('marks funding ready and milestone commit blocked until funding exists', () => {
    const job = createJob();
    const cards = buildJobLifecycleCards({
      copy: lifecycleCopy,
      job,
      executions: [],
      pendingAction: null,
    });

    expect(cards.find((card) => card.action === 'fund_job')).toMatchObject({
      phase: 'ready',
      canTrigger: true,
    });
    expect(cards.find((card) => card.action === 'set_milestones')).toMatchObject({
      phase: 'blocked',
      canTrigger: false,
    });
  });

  it('surfaces failed funding attempts as retryable failure state', () => {
    const job = createJob();
    const cards = buildJobLifecycleCards({
      copy: lifecycleCopy,
      job,
      executions: [
        createExecution({
          action: 'fund_job',
          status: 'failed',
          submittedAt: 200,
          failureMessage: 'Bundler rejected the transaction',
        }),
      ],
      pendingAction: null,
    });

    expect(cards.find((card) => card.action === 'fund_job')).toMatchObject({
      phase: 'failed',
      canTrigger: true,
      detail: 'Bundler rejected the transaction',
    });
  });

  it('treats pending local actions as pending even before receipts arrive', () => {
    const pendingAction: PendingLifecycleAction = {
      action: 'deliver_milestone',
      milestoneIndex: 0,
      startedAt: 500,
      summary: 'Submitting delivery',
    };

    const cards = buildMilestoneLifecycleCards({
      copy: lifecycleCopy,
      job: createJob([{ status: 'pending' }]),
      milestoneIndex: 0,
      executions: [],
      pendingAction,
    });

    expect(cards.find((card) => card.action === 'deliver_milestone')).toMatchObject({
      phase: 'pending',
      canTrigger: false,
      detail: 'Submitting delivery',
    });
  });

  it('derives delivery confirmation plus release and dispute readiness from milestone state', () => {
    const job = createJob([
      {
        status: 'delivered',
        deliveredAt: 200,
        deliveryNote: 'Preview shared for review.',
      },
    ]);
    const cards = buildMilestoneLifecycleCards({
      copy: lifecycleCopy,
      job,
      milestoneIndex: 0,
      executions: [
        createExecution({
          action: 'deliver_milestone',
          milestoneIndex: 0,
          submittedAt: 180,
          confirmedAt: 200,
          txHash: '0xdelivery',
        }),
      ],
      pendingAction: null,
    });

    expect(cards.find((card) => card.action === 'deliver_milestone')).toMatchObject({
      phase: 'confirmed',
      txHash: '0xdelivery',
    });
    expect(cards.find((card) => card.action === 'release_milestone')).toMatchObject({
      phase: 'ready',
      canTrigger: true,
    });
    expect(cards.find((card) => card.action === 'open_dispute')).toMatchObject({
      phase: 'ready',
      canTrigger: true,
    });
  });

  it('builds milestone timeline entries in chronological order with resolution context', () => {
    const entries = buildMilestoneTimelineEntries({
      title: 'Milestone 1',
      deliverable: 'Ship the feature',
      amount: '50',
      status: 'refunded',
      dueAt: 100,
      deliveredAt: 200,
      disputedAt: 300,
      resolvedAt: 400,
      deliveryNote: 'Delivered for review',
      disputeReason: 'Acceptance criteria not met',
      resolutionAction: 'refund',
      resolutionNote: 'Refund approved',
    }, lifecycleCopy);

    expect(entries.map((entry) => entry.label)).toEqual([
      'Due',
      'Delivered',
      'Disputed',
      'Resolved',
    ]);
    expect(entries[3]).toMatchObject({
      detail: 'refund: Refund approved',
      tone: 'warning',
    });
  });

  it('filters milestone-specific and job-level audit or execution history separately', () => {
    const auditEvents = [
      createAuditEvent({
        type: 'job.funded',
        at: 100,
        payload: { jobId: 'job-1' },
      }),
      createAuditEvent({
        type: 'milestone.delivered',
        at: 300,
        payload: { jobId: 'job-1', milestoneIndex: 0 },
      }),
      createAuditEvent({
        type: 'milestone.released',
        at: 400,
        payload: { jobId: 'job-1', milestoneIndex: 0 },
      }),
    ];
    const executions = [
      createExecution({
        id: 'job-fund',
        action: 'fund_job',
        submittedAt: 100,
      }),
      createExecution({
        id: 'deliver-0',
        action: 'deliver_milestone',
        milestoneIndex: 0,
        submittedAt: 300,
      }),
    ];

    expect(getJobAuditEvents(auditEvents)).toHaveLength(1);
    expect(getMilestoneAuditEvents(auditEvents, 0)).toHaveLength(2);
    expect(getJobExecutions(executions).map((entry) => entry.id)).toEqual(['job-fund']);
    expect(getMilestoneExecutions(executions, 0).map((entry) => entry.id)).toEqual([
      'deliver-0',
    ]);
  });

  it('picks the first active milestone instead of a settled one', () => {
    const job = createJob([
      { status: 'released', releasedAt: 150 },
      { status: 'disputed', disputedAt: 250 },
    ]);

    expect(pickInitialMilestoneIndex(job)).toBe(1);
  });
});
