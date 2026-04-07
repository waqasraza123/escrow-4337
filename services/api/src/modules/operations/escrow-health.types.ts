import type { EscrowContractAction } from '../escrow/onchain/escrow-contract.types';
import type { JobStatus } from '../escrow/escrow.types';

export type EscrowAttentionReason =
  | 'failed_execution'
  | 'open_dispute'
  | 'stale_job';

export type EscrowFailedExecutionSummary = {
  action: EscrowContractAction;
  submittedAt: number;
  txHash: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  milestoneIndex: number | null;
};

export type EscrowHealthJob = {
  jobId: string;
  title: string;
  status: JobStatus;
  updatedAt: number;
  latestActivityAt: number;
  staleForMs: number | null;
  reasons: EscrowAttentionReason[];
  counts: {
    openDisputes: number;
    failedExecutions: number;
  };
  executionFailureWorkflow: null | {
    claimedByUserId: string;
    claimedByEmail: string;
    claimedAt: number;
    acknowledgedFailureAt: number | null;
    note: string | null;
    updatedAt: number;
    latestFailureNeedsAcknowledgement: boolean;
  };
  staleWorkflow: null | {
    claimedByUserId: string;
    claimedByEmail: string;
    claimedAt: number;
    note: string | null;
    updatedAt: number;
  };
  latestFailedExecution: EscrowFailedExecutionSummary | null;
  failedExecutionDiagnostics: null | {
    firstFailureAt: number;
    latestFailureAt: number;
    actionBreakdown: Array<{
      action: EscrowContractAction;
      count: number;
    }>;
    failureCodeBreakdown: Array<{
      failureCode: string | null;
      count: number;
      latestMessage: string | null;
    }>;
    recentFailures: EscrowFailedExecutionSummary[];
  };
  onchain: {
    chainId: number;
    contractAddress: string;
    escrowId: string | null;
  };
};

export type EscrowStaleWorkflowMutationResponse = {
  job: EscrowHealthJob;
};

export type EscrowExecutionFailureWorkflowMutationResponse = {
  job: EscrowHealthJob;
};

export type EscrowHealthReport = {
  generatedAt: string;
  filters: {
    reason: EscrowAttentionReason | null;
    limit: number;
  };
  thresholds: {
    staleJobHours: number;
    staleJobMs: number;
    defaultLimit: number;
    maxLimit: number;
  };
  summary: {
    totalJobs: number;
    jobsNeedingAttention: number;
    matchedJobs: number;
    openDisputeJobs: number;
    failedExecutionJobs: number;
    staleJobs: number;
  };
  jobs: EscrowHealthJob[];
};
