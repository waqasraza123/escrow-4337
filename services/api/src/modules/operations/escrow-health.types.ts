import type { EscrowContractAction } from '../escrow/onchain/escrow-contract.types';
import type {
  EscrowAuditEvent,
  EscrowAuthorityStatus,
  EscrowChainCursorRecord,
  EscrowChainSyncOutcome,
  EscrowFailureRemediationStatus,
  JobStatus,
  MilestoneStatus,
} from '../escrow/escrow.types';

export type EscrowAttentionReason =
  | 'chain_sync_backlog'
  | 'failed_execution'
  | 'open_dispute'
  | 'reconciliation_drift'
  | 'stale_job';

export type EscrowFailedExecutionSummary = {
  action: EscrowContractAction;
  submittedAt: number;
  txHash: string | null;
  requestId: string | null;
  correlationId: string | null;
  idempotencyKey: string | null;
  operationKey: string | null;
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
    chainSyncBacklog: boolean;
    openDisputes: number;
    failedExecutions: number;
  };
  chainSync: {
    status: 'pending_initial_sync' | 'healthy' | 'stale' | 'failing';
    staleForMs: number | null;
    lastAttemptedAt: number | null;
    lastSuccessfulAt: number | null;
    lastPersistedAt: number | null;
    lastMode: 'preview' | 'persisted' | null;
    lastOutcome: EscrowChainSyncOutcome | null;
    lastSyncedBlock: number | null;
    lastIssueCount: number;
    lastCriticalIssueCount: number;
    lastReconciliationIssueCount: number;
    lastErrorMessage: string | null;
  } | null;
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
  authority: EscrowAuthorityStatus;
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

export type EscrowChainSyncIssue = {
  code:
    | 'funding_currency_mismatch'
    | 'job_created_client_mismatch'
    | 'job_created_hash_mismatch'
    | 'job_created_log_missing'
    | 'no_chain_events_found'
    | 'unsupported_partial_resolution';
  severity: 'warning' | 'critical';
  summary: string;
  detail: string | null;
  blockNumber: number | null;
  txHash: string | null;
};

export type EscrowChainSyncMirrorSummary = {
  eventCount: number;
  replaySource: 'fresh_fetch' | 'persisted_mirror';
  correlationId: string | null;
  latestEvent: {
    eventName: string;
    blockNumber: number;
    logIndex: number;
    txHash: string;
    blockTimeMs: number;
    source: 'rpc_log';
    ingestionKind: 'manual_sync' | 'finalized_ingestion' | 'legacy_backfill';
    ingestedAt: number | null;
    mirrorStatus: 'preview_only' | 'persisted';
    persistedVia: 'upsert' | 'replace_range' | null;
    correlationId: string | null;
  } | null;
};

export type EscrowChainSyncReplaySummary = {
  status: 'clean' | 'drifted' | 'blocked';
  driftSource:
    | 'none'
    | 'aggregate_mismatch'
    | 'audit_digest_mismatch'
    | 'missing_chain_events'
    | 'ingestion_gap'
    | 'unsupported_event_shape';
  failedCause: string | null;
  retryPosture:
    | 'safe_to_retry'
    | 'expand_range_or_reingest'
    | 'hold_for_model_support';
};

export type EscrowChainSyncReport = {
  syncedAt: string;
  mode: 'preview' | 'persisted';
  job: {
    jobId: string;
    title: string;
    chainId: number;
    contractAddress: string;
    escrowId: string;
  };
  range: {
    fromBlock: number;
    toBlock: number;
    latestBlock: number;
    lookbackBlocks: number;
  };
  normalization: {
    fetchedLogs: number;
    duplicateLogs: number;
    uniqueLogs: number;
    auditEvents: number;
    auditChanged: boolean;
  };
  mirror: EscrowChainSyncMirrorSummary;
  replay: EscrowChainSyncReplaySummary;
  issues: EscrowChainSyncIssue[];
  chainReconciliation: EscrowReconciliationReport | null;
  localComparison: {
    aggregateMatches: boolean;
    auditDigestMatches: boolean;
    localStatus: JobStatus;
    chainDerivedStatus: JobStatus;
    localFundedAmount: string | null;
    chainDerivedFundedAmount: string | null;
    localAuditEvents: number;
    chainAuditEvents: number;
    mismatchedMilestones: Array<{
      index: number;
      localStatus: MilestoneStatus | null;
      chainDerivedStatus: MilestoneStatus | null;
    }>;
  };
  persistence: {
    requested: boolean;
    applied: boolean;
    blocked: boolean;
    blockedReason: string | null;
  };
};

export type EscrowChainSyncBatchItem = {
  jobId: string;
  title: string;
  outcome: 'clean' | 'changed' | 'persisted' | 'blocked' | 'failed';
  changed: boolean;
  persisted: boolean;
  blocked: boolean;
  issueCount: number;
  criticalIssueCount: number;
  reconciliationIssueCount: number;
  errorMessage: string | null;
  sync: EscrowChainSyncReport | null;
};

export type EscrowChainSyncBatchReport = {
  startedAt: string;
  completedAt: string;
  mode: 'preview' | 'persisted';
  filters: {
    scope: 'all' | 'attention';
    reason: EscrowAttentionReason | null;
    limit: number;
  };
  selection: {
    totalJobs: number;
    matchedJobs: number;
    selectedJobs: number;
  };
  summary: {
    processedJobs: number;
    cleanJobs: number;
    changedJobs: number;
    persistedJobs: number;
    blockedJobs: number;
    failedJobs: number;
    criticalIssueJobs: number;
  };
  jobs: EscrowChainSyncBatchItem[];
};

export type EscrowChainSyncDaemonWorkerState = 'idle' | 'running' | 'stopped';

export type EscrowChainSyncDaemonLockProvider = 'local' | 'postgres_advisory';

export type EscrowChainSyncDaemonRunOutcome =
  | 'completed'
  | 'failed'
  | 'skipped';

export type EscrowChainSyncDaemonStatusRun = {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  outcome: EscrowChainSyncDaemonRunOutcome;
  workerId: string;
  lockProvider: EscrowChainSyncDaemonLockProvider | null;
  mode: EscrowChainSyncBatchReport['mode'] | null;
  filters: EscrowChainSyncBatchReport['filters'] | null;
  selection: EscrowChainSyncBatchReport['selection'] | null;
  summary: EscrowChainSyncBatchReport['summary'] | null;
  errorMessage: string | null;
  skipReason: 'lock_unavailable' | null;
};

export type EscrowChainSyncDaemonStatus = {
  updatedAt: string;
  worker: {
    workerId: string;
    hostname: string;
    pid: number;
    state: EscrowChainSyncDaemonWorkerState;
    intervalMs: number;
    runOnStart: boolean;
    overrideLimit: number | null;
    overridePersist: boolean | null;
    startedAt: string;
    stoppedAt: string | null;
  };
  heartbeat: {
    lastHeartbeatAt: string;
    lastRunStartedAt: string | null;
    lastRunCompletedAt: string | null;
    lastRunOutcome: EscrowChainSyncDaemonRunOutcome | null;
    consecutiveFailures: number;
    consecutiveSkips: number;
    lastErrorMessage: string | null;
  };
  currentRun: {
    startedAt: string;
    lockProvider: EscrowChainSyncDaemonLockProvider | null;
  } | null;
  lastRun: EscrowChainSyncDaemonStatusRun | null;
  recentRuns: EscrowChainSyncDaemonStatusRun[];
};

export type EscrowChainSyncDaemonHealthIssue = {
  code:
    | 'daemon_missing'
    | 'worker_stopped'
    | 'heartbeat_stale'
    | 'run_stalled'
    | 'consecutive_failures'
    | 'consecutive_skips'
    | 'last_run_failed'
    | 'ingestion_missing'
    | 'ingestion_lagging'
    | 'projection_backlog';
  severity: 'warning' | 'critical';
  summary: string;
  detail: string | null;
};

export type EscrowChainIngestionStatus = {
  generatedAt: string;
  enabled: boolean;
  authorityReadsEnabled: boolean;
  chainId: number;
  contractAddress: string | null;
  confirmations: number;
  batchBlocks: number;
  resyncBlocks: number;
  latestBlock: number | null;
  finalizedBlock: number | null;
  lagBlocks: number | null;
  cursor: EscrowChainCursorRecord | null;
  projections: {
    totalJobs: number;
    projectedJobs: number;
    healthyJobs: number;
    degradedJobs: number;
    staleJobs: number;
  };
  status: 'ok' | 'warning' | 'failed';
  summary: string;
  issues: string[];
  warnings: string[];
};

export type EscrowChainSyncDaemonHealthReport = {
  generatedAt: string;
  ok: boolean;
  status: 'ok' | 'warning' | 'failed';
  required: boolean;
  summary: string;
  thresholds: {
    maxHeartbeatAgeMs: number;
    maxCurrentRunAgeMs: number;
    maxConsecutiveFailures: number;
    maxConsecutiveSkips: number;
  };
  issues: EscrowChainSyncDaemonHealthIssue[];
  daemon: EscrowChainSyncDaemonStatus | null;
  ingestion: EscrowChainIngestionStatus | null;
};

export type EscrowHealthReport = {
  generatedAt: string;
  filters: {
    reason: EscrowAttentionReason | null;
    limit: number;
  };
  thresholds: {
    chainSyncBacklogHours: number;
    chainSyncBacklogMs: number;
    staleJobHours: number;
    staleJobMs: number;
    defaultLimit: number;
    maxLimit: number;
  };
  summary: {
    totalJobs: number;
    jobsNeedingAttention: number;
    matchedJobs: number;
    chainSyncBacklogJobs: number;
    openDisputeJobs: number;
    reconciliationDriftJobs: number;
    failedExecutionJobs: number;
    staleJobs: number;
  };
  jobs: EscrowHealthJob[];
};
