import type { EscrowContractAction } from '../escrow/onchain/escrow-contract.types';
import type {
  EscrowAuditEvent,
  EscrowFailureRemediationStatus,
  JobStatus,
  MilestoneStatus,
} from '../escrow/escrow.types';

export type EscrowAttentionReason =
  | 'failed_execution'
  | 'open_dispute'
  | 'reconciliation_drift'
  | 'stale_job';

export type EscrowFailedExecutionSummary = {
  action: EscrowContractAction;
  submittedAt: number;
  txHash: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  milestoneIndex: number | null;
};

export type EscrowFailureGuidance = {
  severity: 'warning' | 'critical';
  responsibleSurface:
    | 'wallet_relay'
    | 'bundler'
    | 'paymaster_or_sponsor'
    | 'rpc_or_provider'
    | 'operator_input'
    | 'unknown';
  retryPosture:
    | 'safe_after_review'
    | 'wait_for_external_fix'
    | 'hold_for_configuration_change';
  summary: string;
  recommendedActions: string[];
};

export type EscrowReconciliationIssue = {
  code:
    | 'duplicate_confirmed_execution'
    | 'funding_state_mismatch'
    | 'job_status_mismatch'
    | 'milestone_state_mismatch'
    | 'missing_create_confirmation'
    | 'timeline_reference_mismatch'
    | 'timeline_transition_mismatch';
  severity: 'warning' | 'critical';
  summary: string;
  detail: string | null;
};

export type EscrowReconciliationReport = {
  issueCount: number;
  highestSeverity: 'warning' | 'critical';
  sourceCounts: {
    auditEvents: number;
    confirmedExecutions: number;
    failedExecutions: number;
  };
  projection: {
    aggregateStatus: JobStatus;
    projectedStatus: JobStatus;
    aggregateFundedAmount: string | null;
    projectedFundedAmount: string | null;
    mismatchedMilestones: Array<{
      index: number;
      aggregateStatus: MilestoneStatus | null;
      projectedStatus: MilestoneStatus | null;
      lastAuditType: EscrowAuditEvent['type'] | null;
      lastAuditAt: number | null;
    }>;
  };
  issues: EscrowReconciliationIssue[];
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
    status: EscrowFailureRemediationStatus;
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
  failureGuidance: EscrowFailureGuidance | null;
  reconciliation: EscrowReconciliationReport | null;
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

export type EscrowJobHistoryImportReport = {
  importedAt: string;
  document: {
    schemaVersion: 1;
    artifact: 'job-history';
    exportedAt: string;
    jobId: string;
    title: string;
  };
  normalization: {
    auditEvents: number;
    confirmedExecutions: number;
    failedExecutions: number;
    auditWasReordered: boolean;
    executionWasReordered: boolean;
  };
  importedReconciliation: EscrowReconciliationReport | null;
  localComparison: {
    localJobFound: boolean;
    aggregateMatches: boolean;
    timelineDigestMatches: boolean | null;
    localStatus: JobStatus | null;
    importedStatus: JobStatus;
    localFundedAmount: string | null;
    importedFundedAmount: string | null;
    localMilestoneCount: number | null;
    importedMilestoneCount: number;
    mismatchedMilestones: Array<{
      index: number;
      localStatus: MilestoneStatus | null;
      importedStatus: MilestoneStatus | null;
    }>;
  };
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
    reconciliationDriftJobs: number;
    failedExecutionJobs: number;
    staleJobs: number;
  };
  jobs: EscrowHealthJob[];
};
