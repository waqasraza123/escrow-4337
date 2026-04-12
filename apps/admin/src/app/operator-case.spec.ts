import { describe, expect, it } from 'vitest';
import type { AuditBundle } from '../lib/api';
import { getAdminMessages } from '../lib/i18n';
import {
  buildCaseBrief,
  buildExecutionIssueCards,
  buildMilestoneReviewCards,
  buildOperatorTimeline,
  getDisputedMilestoneCards,
  getExecutionFailures,
  getRecentLookupSuggestions,
} from './operator-case';

function createBundle(
  override: Partial<AuditBundle['bundle']> = {},
): AuditBundle['bundle'] {
  return {
    job: {
      id: 'job-1',
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
      ...override.job,
    },
    audit: [
      {
        type: 'job.funded',
        at: 150,
        payload: { jobId: 'job-1' },
      },
      {
        type: 'milestone.disputed',
        at: 400,
        payload: { jobId: 'job-1', milestoneIndex: 1 },
      },
      ...(override.audit ?? []),
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
      ...(override.executions ?? []),
    ],
    authority: {
      source: 'local_fallback',
      authorityReadsEnabled: false,
      projectionAvailable: false,
      projectionFresh: false,
      projectionHealthy: false,
      projectedAt: null,
      lastProjectedBlock: null,
      lastEventCount: null,
      reason: 'authority_reads_disabled',
      ...override.authority,
    },
  };
}

const helperCopy = getAdminMessages('en').helperCopy;

describe('operator case helpers', () => {
  it('marks cases with disputes and failed executions as critical', () => {
    const brief = buildCaseBrief(createBundle(), helperCopy);

    expect(brief).toMatchObject({
      disputedMilestones: 1,
      failedExecutions: 1,
      pressure: 'critical',
    });
    expect(brief.pressureSummary).toContain('needs operator attention first');
  });

  it('derives review posture for disputed milestones and resolved posture for settled milestones', () => {
    const cards = buildMilestoneReviewCards(createBundle().job, helperCopy);

    expect(cards[0]).toMatchObject({
      posture: 'resolved',
      operatorSummary: 'Settled in favor of release',
    });
    expect(cards[1]).toMatchObject({
      posture: 'review',
      operatorSummary: 'Dispute review required',
      supportingDetail: 'Acceptance criteria not met',
    });
  });

  it('sorts execution issues newest first and exposes failures for triage', () => {
    const cards = buildExecutionIssueCards(createBundle().executions, helperCopy);

    expect(cards[0]).toMatchObject({
      id: 'exec-2',
      status: 'failed',
      summary: 'Execution failed',
    });
    expect(getExecutionFailures(cards).map((card) => card.id)).toEqual(['exec-2']);
  });

  it('extracts disputed milestone cards for the dedicated review panel', () => {
    const disputed = getDisputedMilestoneCards(
      buildMilestoneReviewCards(createBundle().job, helperCopy),
    );

    expect(disputed).toHaveLength(1);
    expect(disputed[0]).toMatchObject({
      milestoneIndex: 1,
      status: 'disputed',
    });
  });

  it('combines audit and execution streams into one operator timeline ordered by recency', () => {
    const timeline = buildOperatorTimeline(createBundle(), helperCopy);

    expect(timeline[0]).toMatchObject({
      kind: 'execution',
      label: 'resolve_dispute',
      tone: 'critical',
    });
    expect(timeline[1]).toMatchObject({
      kind: 'audit',
      label: 'milestone.disputed',
      tone: 'warning',
    });
  });

  it('removes the active job id from recent lookup suggestions', () => {
    expect(
      getRecentLookupSuggestions(['job-3', 'job-2', 'job-1'], 'job-2'),
    ).toEqual(['job-3', 'job-1']);
  });
});
