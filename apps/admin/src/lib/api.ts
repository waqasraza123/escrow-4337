import {
  requestDocument,
  requestJson,
  resolveApiBaseUrl,
  resolveLocalApiBaseUrl,
  type DownloadedDocument,
} from '@escrow4334/frontend-core';

export type UserWallet =
  | {
      address: string;
      label?: string;
      createdAt: number;
      updatedAt: number;
      walletKind: 'eoa';
      verificationMethod: 'siwe' | 'legacy_link';
      verificationChainId?: number;
      verifiedAt: number;
    }
  | {
      address: string;
      label?: string;
      createdAt: number;
      updatedAt: number;
      walletKind: 'smart_account';
      ownerAddress: string;
      recoveryAddress: string;
      chainId: number;
      providerKind: 'mock' | 'relay';
      entryPointAddress: string;
      factoryAddress: string;
      sponsorshipPolicy: 'disabled' | 'sponsored';
      provisionedAt: number;
    };

export type UserProfile = {
  id: string;
  email: string;
  shariahMode: boolean;
  defaultExecutionWalletAddress: string | null;
  wallets: UserWallet[];
};

export type WalletState = {
  defaultExecutionWalletAddress: string | null;
  wallets: UserWallet[];
};

export type WalletLinkChallenge = {
  challengeId: string;
  message: string;
  issuedAt: number;
  expiresAt: number;
};

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

export type VerifyResponse = SessionTokens & {
  user: UserProfile;
};

export type RuntimeProfile = {
  generatedAt: string;
  profile: 'local-mock' | 'mixed' | 'deployment-like';
  summary: string;
  environment: {
    nodeEnv: string;
    persistenceDriver: 'postgres' | 'file';
    trustProxyRaw: string | null;
    corsOrigins: string[];
  };
  providers: {
    emailMode: 'mock' | 'relay';
    smartAccountMode: 'mock' | 'relay';
    escrowMode: 'mock' | 'relay';
  };
  operator: {
    arbitratorAddress: string | null;
    resolutionAuthority: 'linked_arbitrator_wallet';
    exportSupport: boolean;
  };
  operations: {
    chainSyncDaemon: {
      status: 'ok' | 'warning' | 'failed';
      summary: string;
      required: boolean;
      rpcConfigured: boolean;
      persistDefault: boolean;
      intervalSeconds: number;
      runOnStart: boolean;
      lockProvider: 'local' | 'postgres_advisory';
      alertingConfigured: boolean;
      alertMinSeverity: 'warning' | 'critical';
      alertSendRecovery: boolean;
      alertResendIntervalSeconds: number;
      thresholds: {
        maxHeartbeatAgeSeconds: number;
        maxCurrentRunAgeSeconds: number;
        maxConsecutiveFailures: number;
        maxConsecutiveSkips: number;
      };
      issues: string[];
      warnings: string[];
    };
  };
  warnings: string[];
};

export type MarketplaceModerationStatus = 'visible' | 'hidden' | 'suspended';

export type MarketplaceAdminProfile = {
  userId: string;
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  skills: string[];
  rateMin: string | null;
  rateMax: string | null;
  timezone: string;
  availability: 'open' | 'limited' | 'unavailable';
  portfolioUrls: string[];
  verifiedWalletAddress: string | null;
  completedEscrowCount: number;
  isComplete: boolean;
  moderationStatus: MarketplaceModerationStatus;
};

export type MarketplaceAdminOpportunity = {
  id: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  currencyAddress: string;
  requiredSkills: string[];
  visibility: 'public' | 'private';
  status: 'draft' | 'published' | 'paused' | 'closed' | 'hired' | 'archived';
  budgetMin: string | null;
  budgetMax: string | null;
  timeline: string;
  publishedAt: number | null;
  hiredApplicationId: string | null;
  hiredJobId: string | null;
  createdAt: number;
  updatedAt: number;
  owner: {
    userId: string;
    displayName: string;
    profileSlug: string | null;
  };
  escrowReadiness: 'ready' | 'wallet_required' | 'smart_account_required';
  applicationCount: number;
  moderationStatus: MarketplaceModerationStatus;
};

export type MarketplaceModerationDashboard = {
  generatedAt: string;
  summary: {
    totalProfiles: number;
    visibleProfiles: number;
    hiddenProfiles: number;
    suspendedProfiles: number;
    totalOpportunities: number;
    publishedOpportunities: number;
    hiredOpportunities: number;
    visibleOpportunities: number;
    hiddenOpportunities: number;
    suspendedOpportunities: number;
    totalApplications: number;
    submittedApplications: number;
    shortlistedApplications: number;
    hiredApplications: number;
    hireConversionPercent: number;
    agingOpportunityCount: number;
  };
  agingOpportunities: Array<{
    opportunityId: string;
    title: string;
    ownerDisplayName: string;
    ageDays: number;
    status: MarketplaceAdminOpportunity['status'];
    visibility: MarketplaceAdminOpportunity['visibility'];
  }>;
};

export type CaseExportArtifact = 'job-history' | 'dispute-case';

export type CaseExportFormat = 'json' | 'csv';

export type EscrowHealthReport = {
  generatedAt: string;
  filters: {
    reason:
      | 'chain_sync_backlog'
      | 'failed_execution'
      | 'open_dispute'
      | 'reconciliation_drift'
      | 'stale_job'
      | null;
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
  jobs: Array<{
    jobId: string;
    title: string;
    status: string;
    updatedAt: number;
    latestActivityAt: number;
    staleForMs: number | null;
    reasons: Array<
      'chain_sync_backlog' | 'failed_execution' | 'open_dispute' | 'reconciliation_drift' | 'stale_job'
    >;
    counts: {
      chainSyncBacklog: boolean;
      openDisputes: number;
      failedExecutions: number;
    };
    chainSync: null | {
      status: 'pending_initial_sync' | 'healthy' | 'stale' | 'failing';
      staleForMs: number | null;
      lastAttemptedAt: number | null;
      lastSuccessfulAt: number | null;
      lastPersistedAt: number | null;
      lastMode: 'preview' | 'persisted' | null;
      lastOutcome: 'succeeded' | 'failed' | 'blocked' | null;
      lastSyncedBlock: number | null;
      lastIssueCount: number;
      lastCriticalIssueCount: number;
      lastReconciliationIssueCount: number;
      lastErrorMessage: string | null;
    };
    executionFailureWorkflow: null | {
      claimedByUserId: string;
      claimedByEmail: string;
      claimedAt: number;
      status: 'investigating' | 'blocked_external' | 'ready_to_retry' | 'monitoring';
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
    latestFailedExecution: null | {
      action: string;
      submittedAt: number;
      txHash: string | null;
      failureCode: string | null;
      failureMessage: string | null;
      milestoneIndex: number | null;
    };
    failedExecutionDiagnostics: null | {
      firstFailureAt: number;
      latestFailureAt: number;
      actionBreakdown: Array<{
        action: string;
        count: number;
      }>;
      failureCodeBreakdown: Array<{
        failureCode: string | null;
        count: number;
        latestMessage: string | null;
      }>;
      recentFailures: Array<{
        action: string;
        submittedAt: number;
        txHash: string | null;
        failureCode: string | null;
        failureMessage: string | null;
        milestoneIndex: number | null;
      }>;
    };
    failureGuidance: null | {
      severity: 'warning' | 'critical';
      responsibleSurface:
        | 'wallet_relay'
        | 'bundler'
        | 'paymaster_or_sponsor'
        | 'rpc_or_provider'
        | 'operator_input'
        | 'unknown';
      retryPosture: 'safe_after_review' | 'wait_for_external_fix' | 'hold_for_configuration_change';
      summary: string;
      recommendedActions: string[];
    };
    reconciliation: null | {
      issueCount: number;
      highestSeverity: 'warning' | 'critical';
      sourceCounts: {
        auditEvents: number;
        confirmedExecutions: number;
        failedExecutions: number;
      };
      projection: {
        aggregateStatus: string;
        projectedStatus: string;
        aggregateFundedAmount: string | null;
        projectedFundedAmount: string | null;
        mismatchedMilestones: Array<{
          index: number;
          aggregateStatus: string | null;
          projectedStatus: string | null;
          lastAuditType:
            | 'job.created'
            | 'job.funded'
            | 'job.milestones_set'
            | 'milestone.delivered'
            | 'milestone.released'
            | 'milestone.disputed'
            | 'milestone.resolved'
            | null;
          lastAuditAt: number | null;
        }>;
      };
      issues: Array<{
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
      }>;
    };
    onchain: {
      chainId: number;
      contractAddress: string;
      escrowId: string | null;
    };
  }>;
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
  importedReconciliation: EscrowHealthReport['jobs'][number]['reconciliation'];
  localComparison: {
    localJobFound: boolean;
    aggregateMatches: boolean;
    timelineDigestMatches: boolean | null;
    localStatus: string | null;
    importedStatus: string;
    localFundedAmount: string | null;
    importedFundedAmount: string | null;
    localMilestoneCount: number | null;
    importedMilestoneCount: number;
    mismatchedMilestones: Array<{
      index: number;
      localStatus: string | null;
      importedStatus: string | null;
    }>;
  };
};

export type EscrowChainSyncDaemonStatus = {
  updatedAt: string;
  worker: {
    workerId: string;
    hostname: string;
    pid: number;
    state: 'idle' | 'running' | 'stopped';
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
    lastRunOutcome: 'completed' | 'failed' | 'skipped' | null;
    consecutiveFailures: number;
    consecutiveSkips: number;
    lastErrorMessage: string | null;
  };
  currentRun: {
    startedAt: string;
    lockProvider: 'local' | 'postgres_advisory' | null;
  } | null;
  lastRun: null | {
    startedAt: string;
    completedAt: string;
    durationMs: number;
    outcome: 'completed' | 'failed' | 'skipped';
    workerId: string;
    lockProvider: 'local' | 'postgres_advisory' | null;
    mode: 'preview' | 'persisted' | null;
    filters: EscrowChainSyncBatchReport['filters'] | null;
    selection: EscrowChainSyncBatchReport['selection'] | null;
    summary: EscrowChainSyncBatchReport['summary'] | null;
    errorMessage: string | null;
    skipReason: 'lock_unavailable' | null;
  };
  recentRuns: Array<NonNullable<EscrowChainSyncDaemonStatus['lastRun']>>;
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
  issues: Array<{
    code:
      | 'daemon_missing'
      | 'worker_stopped'
      | 'heartbeat_stale'
      | 'run_stalled'
      | 'consecutive_failures'
      | 'consecutive_skips'
      | 'last_run_failed';
    severity: 'warning' | 'critical';
    summary: string;
    detail: string | null;
  }>;
  daemon: EscrowChainSyncDaemonStatus | null;
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
  issues: Array<{
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
  }>;
  chainReconciliation: EscrowHealthReport['jobs'][number]['reconciliation'];
  localComparison: {
    aggregateMatches: boolean;
    auditDigestMatches: boolean;
    localStatus: string;
    chainDerivedStatus: string;
    localFundedAmount: string | null;
    chainDerivedFundedAmount: string | null;
    localAuditEvents: number;
    chainAuditEvents: number;
    mismatchedMilestones: Array<{
      index: number;
      localStatus: string | null;
      chainDerivedStatus: string | null;
    }>;
  };
  persistence: {
    requested: boolean;
    applied: boolean;
    blocked: boolean;
    blockedReason: string | null;
  };
};

export type EscrowChainSyncBatchReport = {
  startedAt: string;
  completedAt: string;
  mode: 'preview' | 'persisted';
  filters: {
    scope: 'all' | 'attention';
    reason: 'failed_execution' | 'open_dispute' | 'reconciliation_drift' | 'stale_job' | null;
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
  jobs: Array<{
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
  }>;
};

export type AuditBundle = {
  bundle: {
    job: {
      id: string;
      title: string;
      description: string;
      category: string;
      fundedAmount: string | null;
      status: string;
      createdAt: number;
      updatedAt: number;
      milestones: Array<{
        title: string;
        deliverable: string;
        amount: string;
        status: string;
        dueAt?: number;
        deliveredAt?: number;
        releasedAt?: number;
        disputedAt?: number;
        resolvedAt?: number;
        deliveryNote?: string;
        deliveryEvidenceUrls?: string[];
        disputeReason?: string;
        disputeEvidenceUrls?: string[];
        resolutionAction?: 'release' | 'refund';
        resolutionNote?: string;
      }>;
      onchain: {
        chainId: number;
        contractAddress: string;
        escrowId: string | null;
        clientAddress: string;
        workerAddress: string;
        currencyAddress: string;
      };
    };
    audit: Array<{
      type: string;
      at: number;
      payload: Record<string, unknown>;
    }>;
    executions: Array<{
      id: string;
      action: string;
      actorAddress: string;
      status: 'confirmed' | 'failed';
      txHash?: string;
      submittedAt: number;
      confirmedAt?: number;
      failureCode?: string;
      failureMessage?: string;
      milestoneIndex?: number;
    }>;
  };
};

const apiBaseUrl = resolveApiBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL,
  resolveLocalApiBaseUrl(process.env.NEXT_PUBLIC_API_PORT),
);

export const adminApi = {
  baseUrl: apiBaseUrl,
  getRuntimeProfile() {
    return requestJson<RuntimeProfile>(apiBaseUrl, '/operations/runtime-profile', {
      method: 'GET',
    });
  },
  startAuth(email: string) {
    return requestJson<{ ok: true }>(apiBaseUrl, '/auth/start', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  verifyAuth(email: string, code: string) {
    return requestJson<VerifyResponse>(apiBaseUrl, '/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },
  refresh(refreshToken: string) {
    return requestJson<SessionTokens>(apiBaseUrl, '/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
  logout(refreshToken: string | null) {
    return requestJson<{ ok: true }>(apiBaseUrl, '/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
  me(accessToken: string) {
    return requestJson<UserProfile>(apiBaseUrl, '/auth/me', { method: 'GET' }, accessToken);
  },
  getEscrowHealth(
    accessToken: string,
    options?: {
      reason?:
        | 'chain_sync_backlog'
        | 'failed_execution'
        | 'open_dispute'
        | 'reconciliation_drift'
        | 'stale_job';
      limit?: number;
    },
  ) {
    const query = new URLSearchParams();
    if (options?.reason) {
      query.set('reason', options.reason);
    }
    if (typeof options?.limit === 'number') {
      query.set('limit', String(options.limit));
    }
    const queryString = query.toString();

    return requestJson<EscrowHealthReport>(
      apiBaseUrl,
      `/operations/escrow-health${queryString ? `?${queryString}` : ''}`,
      { method: 'GET' },
      accessToken,
    );
  },
  importJobHistoryReconciliation(documentJson: string, accessToken: string) {
    return requestJson<EscrowJobHistoryImportReport>(
      apiBaseUrl,
      '/operations/reconciliation/job-history-import',
      {
        method: 'POST',
        body: JSON.stringify({ documentJson }),
      },
      accessToken,
    );
  },
  syncEscrowChainAudit(
    input: {
      jobId: string;
      fromBlock?: number;
      toBlock?: number;
      persist?: boolean;
    },
    accessToken: string,
  ) {
    return requestJson<EscrowChainSyncReport>(
      apiBaseUrl,
      '/operations/reconciliation/chain-audit-sync',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  getEscrowChainSyncDaemonStatus(accessToken: string) {
    return requestJson<EscrowChainSyncDaemonStatus | null>(
      apiBaseUrl,
      '/operations/reconciliation/chain-audit-sync/daemon-status',
      { method: 'GET' },
      accessToken,
    );
  },
  getEscrowChainSyncDaemonHealth(accessToken: string) {
    return requestJson<EscrowChainSyncDaemonHealthReport>(
      apiBaseUrl,
      '/operations/reconciliation/chain-audit-sync/daemon-health',
      { method: 'GET' },
      accessToken,
    );
  },
  syncEscrowChainAuditBatch(
    input: {
      scope?: 'all' | 'attention';
      reason?:
        | 'chain_sync_backlog'
        | 'failed_execution'
        | 'open_dispute'
        | 'reconciliation_drift'
        | 'stale_job';
      limit?: number;
      persist?: boolean;
    },
    accessToken: string,
  ) {
    return requestJson<EscrowChainSyncBatchReport>(
      apiBaseUrl,
      '/operations/reconciliation/chain-audit-sync/batch',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  claimStaleJob(
    jobId: string,
    input: {
      note?: string;
    },
    accessToken: string,
  ) {
    return requestJson<{
      job: EscrowHealthReport['jobs'][number];
    }>(
      apiBaseUrl,
      `/operations/escrow-health/${encodeURIComponent(jobId)}/stale-claim`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  claimExecutionFailureWorkflow(
    jobId: string,
    input: {
      note?: string;
      status?: 'investigating' | 'blocked_external' | 'ready_to_retry' | 'monitoring';
    },
    accessToken: string,
  ) {
    return requestJson<{
      job: EscrowHealthReport['jobs'][number];
    }>(
      apiBaseUrl,
      `/operations/escrow-health/${encodeURIComponent(jobId)}/failure-claim`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  acknowledgeExecutionFailures(
    jobId: string,
    input: {
      note?: string;
      status?: 'investigating' | 'blocked_external' | 'ready_to_retry' | 'monitoring';
    },
    accessToken: string,
  ) {
    return requestJson<{
      job: EscrowHealthReport['jobs'][number];
    }>(
      apiBaseUrl,
      `/operations/escrow-health/${encodeURIComponent(jobId)}/failure-acknowledge`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  updateExecutionFailureWorkflow(
    jobId: string,
    input: {
      note?: string;
      status?: 'investigating' | 'blocked_external' | 'ready_to_retry' | 'monitoring';
    },
    accessToken: string,
  ) {
    return requestJson<{
      job: EscrowHealthReport['jobs'][number];
    }>(
      apiBaseUrl,
      `/operations/escrow-health/${encodeURIComponent(jobId)}/failure-update`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  releaseStaleJob(jobId: string, accessToken: string) {
    return requestJson<{
      job: EscrowHealthReport['jobs'][number];
    }>(
      apiBaseUrl,
      `/operations/escrow-health/${encodeURIComponent(jobId)}/stale-release`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      accessToken,
    );
  },
  releaseExecutionFailureWorkflow(jobId: string, accessToken: string) {
    return requestJson<{
      job: EscrowHealthReport['jobs'][number];
    }>(
      apiBaseUrl,
      `/operations/escrow-health/${encodeURIComponent(jobId)}/failure-release`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      accessToken,
    );
  },
  createWalletChallenge(
    input: {
      address: string;
      walletKind: 'eoa';
      chainId: number;
      label?: string;
    },
    accessToken: string,
  ) {
    return requestJson<WalletLinkChallenge>(
      apiBaseUrl,
      '/wallet/link/challenge',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  verifyWalletChallenge(
    input: {
      challengeId: string;
      message: string;
      signature: string;
    },
    accessToken: string,
  ) {
    return requestJson<WalletState>(
      apiBaseUrl,
      '/wallet/link/verify',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  async getAudit(jobId: string) {
    return requestJson<AuditBundle>(apiBaseUrl, `/jobs/${jobId}/audit`, {
      method: 'GET',
    });
  },
  downloadCaseExport(
    jobId: string,
    artifact: CaseExportArtifact,
    format: CaseExportFormat,
  ): Promise<DownloadedDocument> {
    const query = new URLSearchParams({
      artifact,
      format,
    });
    return requestDocument(
      apiBaseUrl,
      `/jobs/${encodeURIComponent(jobId)}/export?${query.toString()}`,
      {
        method: 'GET',
      },
    );
  },
  resolveMilestone(
    jobId: string,
    milestoneIndex: number,
    input: {
      action: 'release' | 'refund';
      note?: string;
    },
    accessToken: string,
  ) {
    return requestJson<{
      jobId: string;
      milestoneIndex: number;
      milestoneStatus: string;
      jobStatus: string;
      txHash?: string;
    }>(
      apiBaseUrl,
      `/jobs/${jobId}/milestones/${milestoneIndex}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  getMarketplaceModerationDashboard(accessToken: string) {
    return requestJson<MarketplaceModerationDashboard>(
      apiBaseUrl,
      '/marketplace/moderation/dashboard',
      { method: 'GET' },
      accessToken,
    );
  },
  listMarketplaceModerationProfiles(accessToken: string) {
    return requestJson<{ profiles: MarketplaceAdminProfile[] }>(
      apiBaseUrl,
      '/marketplace/moderation/profiles',
      { method: 'GET' },
      accessToken,
    );
  },
  listMarketplaceModerationOpportunities(accessToken: string) {
    return requestJson<{ opportunities: MarketplaceAdminOpportunity[] }>(
      apiBaseUrl,
      '/marketplace/moderation/opportunities',
      { method: 'GET' },
      accessToken,
    );
  },
  moderateMarketplaceProfile(
    userId: string,
    moderationStatus: MarketplaceModerationStatus,
    accessToken: string,
  ) {
    return requestJson<{ profile: MarketplaceAdminProfile }>(
      apiBaseUrl,
      `/marketplace/moderation/profiles/${encodeURIComponent(userId)}`,
      {
        method: 'POST',
        body: JSON.stringify({ moderationStatus }),
      },
      accessToken,
    );
  },
  moderateMarketplaceOpportunity(
    opportunityId: string,
    moderationStatus: MarketplaceModerationStatus,
    accessToken: string,
  ) {
    return requestJson<{ opportunity: MarketplaceAdminOpportunity }>(
      apiBaseUrl,
      `/marketplace/moderation/opportunities/${encodeURIComponent(opportunityId)}`,
      {
        method: 'POST',
        body: JSON.stringify({ moderationStatus }),
      },
      accessToken,
    );
  },
};
