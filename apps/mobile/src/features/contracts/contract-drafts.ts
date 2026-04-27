import { parseDateMs, type JobView } from '@escrow4334/product-core';

export type MobileMilestoneDraft = {
  title: string;
  deliverable: string;
  amount: string;
  dueAt: string;
};

export type MobileContractDraft = {
  title: string;
  description: string;
  category: string;
  contractorEmail: string;
  workerAddress: string;
  currencyAddress: string;
  settlementAsset: string;
  settlementChain: string;
  reviewWindowDays: string;
  disputeModel: 'operator-mediation' | 'mutual-resolution';
  evidenceExpectation: string;
  kickoffNote: string;
};

export function createInitialContractDraft(
  currencyAddress = '',
): MobileContractDraft {
  return {
    title: '',
    description: '',
    category: 'software-development',
    contractorEmail: '',
    workerAddress: '',
    currencyAddress,
    settlementAsset: 'USDC',
    settlementChain: 'base-sepolia',
    reviewWindowDays: '3',
    disputeModel: 'operator-mediation',
    evidenceExpectation: 'delivery note plus linked evidence URLs',
    kickoffNote:
      'Milestones should be accepted or disputed explicitly at each delivery checkpoint.',
  };
}

export function createInitialMilestones(): MobileMilestoneDraft[] {
  return [
    {
      title: 'Kickoff and scope confirmation',
      deliverable: 'Confirmed implementation plan and first delivery checkpoint',
      amount: '',
      dueAt: '',
    },
    {
      title: 'Final delivery',
      deliverable: 'Accepted production-ready deliverable with evidence links',
      amount: '',
      dueAt: '',
    },
  ];
}

export function isMilestoneDraftReady(milestone: MobileMilestoneDraft) {
  return Boolean(
    milestone.title.trim() &&
      milestone.deliverable.trim() &&
      milestone.amount.trim(),
  );
}

export function normalizeMilestones(milestones: MobileMilestoneDraft[]) {
  return milestones.filter(isMilestoneDraftReady).map((milestone) => ({
    title: milestone.title.trim(),
    deliverable: milestone.deliverable.trim(),
    amount: milestone.amount.trim(),
    dueAt: parseDateMs(milestone.dueAt) ?? undefined,
  }));
}

export function sumMilestoneAmounts(milestones: MobileMilestoneDraft[]) {
  return milestones.reduce((total, milestone) => {
    const parsed = Number(milestone.amount);
    return Number.isFinite(parsed) ? total + parsed : total;
  }, 0);
}

export function buildMobileContractTerms(
  draft: MobileContractDraft,
  milestones: MobileMilestoneDraft[],
): Record<string, unknown> {
  return {
    currency: draft.settlementAsset.trim() || 'USDC',
    chain: draft.settlementChain.trim() || 'base-sepolia',
    payoutStyle: 'milestone-based',
    reviewWindowDays: Number(draft.reviewWindowDays) || 0,
    disputeModel: draft.disputeModel,
    evidenceExpectation: draft.evidenceExpectation.trim(),
    kickoffNote: draft.kickoffNote.trim(),
    milestones: normalizeMilestones(milestones).map((milestone, index) => ({
      order: index + 1,
      ...milestone,
      dueAt: milestone.dueAt ?? null,
    })),
  };
}

export function createMilestoneDraftsFromJob(job: JobView): MobileMilestoneDraft[] {
  if (job.milestones.length) {
    return job.milestones.map((milestone) => ({
      title: milestone.title,
      deliverable: milestone.deliverable,
      amount: milestone.amount,
      dueAt: milestone.dueAt ? new Date(milestone.dueAt).toISOString().slice(0, 10) : '',
    }));
  }

  const termsMilestones = Array.isArray(job.termsJSON.milestones)
    ? job.termsJSON.milestones
    : [];

  if (termsMilestones.length) {
    return termsMilestones.map((milestone) => {
      const candidate = milestone as Record<string, unknown>;
      return {
        title: String(candidate.title ?? ''),
        deliverable: String(candidate.deliverable ?? ''),
        amount: String(candidate.amount ?? ''),
        dueAt:
          typeof candidate.dueAt === 'number'
            ? new Date(candidate.dueAt).toISOString().slice(0, 10)
            : '',
      };
    });
  }

  return createInitialMilestones();
}

export function getContractSetupReadiness(
  draft: MobileContractDraft,
  milestones: MobileMilestoneDraft[],
  hasSmartAccountDefault: boolean,
) {
  return [
    {
      label: 'Scope, category, and description',
      ready: Boolean(
        draft.title.trim() && draft.description.trim() && draft.category.trim(),
      ),
    },
    {
      label: 'Contractor email',
      ready: Boolean(draft.contractorEmail.trim()),
    },
    {
      label: 'Worker wallet address',
      ready: Boolean(draft.workerAddress.trim()),
    },
    {
      label: 'Settlement token address',
      ready: Boolean(draft.currencyAddress.trim()),
    },
    {
      label: 'Client smart-account default wallet',
      ready: hasSmartAccountDefault,
    },
    {
      label: 'At least one milestone',
      ready: normalizeMilestones(milestones).length > 0,
    },
  ];
}
