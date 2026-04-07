import {
  requestDocument,
  requestJson,
  resolveApiBaseUrl,
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
  warnings: string[];
};

export type CaseExportArtifact = 'job-history' | 'dispute-case';

export type CaseExportFormat = 'json' | 'csv';

export type EscrowHealthReport = {
  generatedAt: string;
  filters: {
    reason:
      | 'failed_execution'
      | 'open_dispute'
      | 'reconciliation_drift'
      | 'stale_job'
      | null;
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
  jobs: Array<{
    jobId: string;
    title: string;
    status: string;
    updatedAt: number;
    latestActivityAt: number;
    staleForMs: number | null;
    reasons: Array<
      'failed_execution' | 'open_dispute' | 'reconciliation_drift' | 'stale_job'
    >;
    counts: {
      openDisputes: number;
      failedExecutions: number;
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
      retryPosture:
        | 'safe_after_review'
        | 'wait_for_external_fix'
        | 'hold_for_configuration_change';
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

const apiBaseUrl = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

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
};
