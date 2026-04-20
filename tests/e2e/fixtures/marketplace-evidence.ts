import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

type MarketplaceEvidenceMode = 'seeded' | 'exact';

type MarketplaceLaneProof = {
  expectedLane: 'client' | 'freelancer';
  currentLaneConfirmed?: boolean;
  switchedViaWorkspaceSwitcher?: boolean;
  emptyStateConfirmed?: boolean;
  laneSurfaceConfirmed?: boolean;
};

type MarketplaceExportDocument = {
  authority?: {
    source?: string | null;
  };
  job?: {
    id?: string;
    title?: string;
    status?: string;
    termsJSON?: {
      marketplace?: {
        opportunityId?: string;
        applicationId?: string;
        visibility?: string;
        fitScore?: number;
        riskFlags?: string[];
      };
      hiringSpec?: {
        mustHaveSkills?: string[];
        acceptanceCriteria?: string[];
        outcomes?: string[];
        engagementType?: string;
        cryptoReadinessRequired?: string;
      };
      proposal?: {
        screeningAnswers?: unknown[];
        deliveryApproach?: string;
        milestonePlanSummary?: string;
        estimatedStartAt?: number | null;
      };
    };
    milestones?: Array<{
      status?: string;
    }>;
  };
  summary?: {
    failedExecutions?: number;
    executionTraces?: {
      executionCount?: number;
      traceCount?: number;
      correlationTaggedExecutions?: number;
      requestTaggedExecutions?: number;
      operationTaggedExecutions?: number;
      confirmedWithoutCorrelation?: number;
    };
  };
  disputes?: Array<{
    resolutionAction?: string | null;
  }>;
};

function readEvidencePath(mode: MarketplaceEvidenceMode) {
  const key =
    mode === 'seeded'
      ? 'PLAYWRIGHT_MARKETPLACE_SEEDED_EVIDENCE_PATH'
      : 'PLAYWRIGHT_MARKETPLACE_EXACT_EVIDENCE_PATH';
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : null;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)),
  );
}

export function buildMarketplaceJourneyEvidence(input: {
  mode: MarketplaceEvidenceMode;
  opportunityId: string;
  jobId: string;
  contractPath: string;
  opportunityTitle: string;
  laneProof?: {
    client?: MarketplaceLaneProof | null;
    freelancer?: MarketplaceLaneProof | null;
  } | null;
  jobHistoryExport: MarketplaceExportDocument;
  disputeCaseExport: MarketplaceExportDocument;
}) {
  const marketplaceTerms = input.jobHistoryExport.job?.termsJSON?.marketplace ?? {};
  const hiringSpec = input.jobHistoryExport.job?.termsJSON?.hiringSpec ?? {};
  const proposal = input.jobHistoryExport.job?.termsJSON?.proposal ?? {};
  const executionTraces = input.jobHistoryExport.summary?.executionTraces ?? null;
  const resolutionActions = uniqueStrings(
    (input.disputeCaseExport.disputes ?? []).map((dispute) => dispute.resolutionAction ?? null),
  );
  const milestoneStatuses = (input.jobHistoryExport.job?.milestones ?? []).map(
    (milestone) => milestone.status ?? 'unknown',
  );
  const issues = [];

  if (input.jobHistoryExport.job?.id !== input.jobId) {
    issues.push(
      `job-history export job id ${input.jobHistoryExport.job?.id ?? '<missing>'} does not match expected job id ${input.jobId}.`,
    );
  }
  if (marketplaceTerms.opportunityId !== input.opportunityId) {
    issues.push(
      `marketplace terms opportunity id ${marketplaceTerms.opportunityId ?? '<missing>'} does not match expected opportunity id ${input.opportunityId}.`,
    );
  }
  if (!marketplaceTerms.applicationId) {
    issues.push('marketplace terms are missing application id.');
  }
  if (input.jobHistoryExport.authority?.source !== 'chain_projection') {
    issues.push(
      `job-history authority source must be chain_projection but was ${input.jobHistoryExport.authority?.source ?? '<missing>'}.`,
    );
  }
  if (input.disputeCaseExport.authority?.source !== 'chain_projection') {
    issues.push(
      `dispute-case authority source must be chain_projection but was ${input.disputeCaseExport.authority?.source ?? '<missing>'}.`,
    );
  }
  if (!executionTraces) {
    issues.push('job-history export is missing execution trace coverage.');
  }
  const clientLaneProof = input.laneProof?.client ?? null;
  const freelancerLaneProof = input.laneProof?.freelancer ?? null;
  if (input.mode === 'exact') {
    if (!clientLaneProof) {
      issues.push('exact marketplace evidence is missing client lane proof.');
    } else {
      if (clientLaneProof.expectedLane !== 'client') {
        issues.push('exact marketplace client lane proof must target the client lane.');
      }
      if (clientLaneProof.currentLaneConfirmed !== true) {
        issues.push('exact marketplace client lane proof did not confirm the current lane.');
      }
      if (clientLaneProof.emptyStateConfirmed !== true) {
        issues.push('exact marketplace client lane proof did not confirm the client empty state.');
      }
      if (clientLaneProof.laneSurfaceConfirmed !== true) {
        issues.push('exact marketplace client lane proof did not confirm the client surface.');
      }
    }

    if (!freelancerLaneProof) {
      issues.push('exact marketplace evidence is missing freelancer lane proof.');
    } else {
      if (freelancerLaneProof.expectedLane !== 'freelancer') {
        issues.push('exact marketplace freelancer lane proof must target the freelancer lane.');
      }
      if (freelancerLaneProof.currentLaneConfirmed !== true) {
        issues.push('exact marketplace freelancer lane proof did not confirm the current lane.');
      }
      if (freelancerLaneProof.emptyStateConfirmed !== true) {
        issues.push('exact marketplace freelancer lane proof did not confirm the freelancer empty state.');
      }
      if (freelancerLaneProof.laneSurfaceConfirmed !== true) {
        issues.push('exact marketplace freelancer lane proof did not confirm the freelancer surface.');
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: input.mode,
    opportunityId: input.opportunityId,
    jobId: input.jobId,
    contractPath: input.contractPath,
    opportunityTitle: input.opportunityTitle,
    originConfirmed: issues.length === 0,
    issues,
    marketplaceTerms: {
      opportunityId: marketplaceTerms.opportunityId ?? null,
      applicationId: marketplaceTerms.applicationId ?? null,
      visibility: marketplaceTerms.visibility ?? null,
      fitScore: marketplaceTerms.fitScore ?? null,
      riskFlags: Array.isArray(marketplaceTerms.riskFlags) ? marketplaceTerms.riskFlags : [],
    },
    authority: {
      jobHistory: input.jobHistoryExport.authority?.source ?? null,
      disputeCase: input.disputeCaseExport.authority?.source ?? null,
    },
    executionTraces: executionTraces
      ? {
          executionCount: executionTraces.executionCount ?? null,
          traceCount: executionTraces.traceCount ?? null,
          correlationTaggedExecutions: executionTraces.correlationTaggedExecutions ?? null,
          requestTaggedExecutions: executionTraces.requestTaggedExecutions ?? null,
          operationTaggedExecutions: executionTraces.operationTaggedExecutions ?? null,
          confirmedWithoutCorrelation: executionTraces.confirmedWithoutCorrelation ?? null,
        }
      : null,
    hiringSpec: {
      engagementType: hiringSpec.engagementType ?? null,
      cryptoReadinessRequired: hiringSpec.cryptoReadinessRequired ?? null,
      mustHaveSkillCount: Array.isArray(hiringSpec.mustHaveSkills)
        ? hiringSpec.mustHaveSkills.length
        : 0,
      acceptanceCriteriaCount: Array.isArray(hiringSpec.acceptanceCriteria)
        ? hiringSpec.acceptanceCriteria.length
        : 0,
      outcomeCount: Array.isArray(hiringSpec.outcomes) ? hiringSpec.outcomes.length : 0,
    },
    proposal: {
      screeningAnswerCount: Array.isArray(proposal.screeningAnswers)
        ? proposal.screeningAnswers.length
        : 0,
      hasDeliveryApproach:
        typeof proposal.deliveryApproach === 'string' && proposal.deliveryApproach.length > 0,
      hasMilestonePlanSummary:
        typeof proposal.milestonePlanSummary === 'string' &&
        proposal.milestonePlanSummary.length > 0,
      estimatedStartAt: proposal.estimatedStartAt ?? null,
    },
    laneProof:
      input.mode === 'exact'
        ? {
            client: clientLaneProof
              ? {
                  expectedLane: clientLaneProof.expectedLane,
                  currentLaneConfirmed: clientLaneProof.currentLaneConfirmed === true,
                  switchedViaWorkspaceSwitcher:
                    clientLaneProof.switchedViaWorkspaceSwitcher === true,
                  emptyStateConfirmed: clientLaneProof.emptyStateConfirmed === true,
                  laneSurfaceConfirmed: clientLaneProof.laneSurfaceConfirmed === true,
                }
              : null,
            freelancer: freelancerLaneProof
              ? {
                  expectedLane: freelancerLaneProof.expectedLane,
                  currentLaneConfirmed: freelancerLaneProof.currentLaneConfirmed === true,
                  switchedViaWorkspaceSwitcher:
                    freelancerLaneProof.switchedViaWorkspaceSwitcher === true,
                  emptyStateConfirmed: freelancerLaneProof.emptyStateConfirmed === true,
                  laneSurfaceConfirmed: freelancerLaneProof.laneSurfaceConfirmed === true,
                }
              : null,
          }
        : null,
    resolution: {
      jobStatus: input.jobHistoryExport.job?.status ?? null,
      milestoneStatuses,
      resolutionActions,
      failedExecutions: input.jobHistoryExport.summary?.failedExecutions ?? null,
    },
  };
}

export async function writeMarketplaceJourneyEvidence(input: {
  mode: MarketplaceEvidenceMode;
  opportunityId: string;
  jobId: string;
  contractPath: string;
  opportunityTitle: string;
  laneProof?: {
    client?: MarketplaceLaneProof | null;
    freelancer?: MarketplaceLaneProof | null;
  } | null;
  jobHistoryExport: MarketplaceExportDocument;
  disputeCaseExport: MarketplaceExportDocument;
}) {
  const outputPath = readEvidencePath(input.mode);
  if (!outputPath) {
    return null;
  }

  const evidence = buildMarketplaceJourneyEvidence(input);
  await mkdir(dirname(outputPath), {
    recursive: true,
  });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  return evidence;
}
