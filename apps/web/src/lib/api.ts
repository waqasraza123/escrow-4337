import {
  requestJson,
  resolveApiBaseUrl,
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

export type SmartAccountProvisionResponse = WalletState & {
  smartAccount: Extract<UserWallet, { walletKind: 'smart_account' }>;
  sponsorship: {
    eligible: boolean;
    policy: 'disabled' | 'sponsored';
    providerKind: 'mock' | 'relay';
    chainId: number;
    reason?: string;
  };
};

export type JobStatus =
  | 'draft'
  | 'funded'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'resolved';

export type MilestoneStatus =
  | 'pending'
  | 'delivered'
  | 'released'
  | 'disputed'
  | 'refunded';

export type JobView = {
  id: string;
  title: string;
  description: string;
  category: string;
  termsJSON: Record<string, unknown>;
  jobHash: string;
  fundedAmount: string | null;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  contractorParticipation: {
    contractorEmail?: string;
    status: 'pending' | 'joined';
    joinedAt: number | null;
    inviteLastSentAt: number | null;
    inviteLastSentMode: 'email' | 'manual' | null;
  } | null;
  milestones: Array<{
    title: string;
    deliverable: string;
    amount: string;
    dueAt?: number;
    status: MilestoneStatus;
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

export type PublicJobView = Omit<JobView, 'contractorParticipation'> & {
  contractorParticipation: {
    status: 'pending' | 'joined';
    joinedAt: number | null;
  } | null;
};

export type ContractorInviteResponse = {
  jobId: string;
  contractorParticipation: NonNullable<JobView['contractorParticipation']>;
  invite: {
    contractorEmail: string;
    delivery: 'email' | 'manual';
    joinUrl: string;
    regenerated: boolean;
    sentAt: number;
  };
};

export type ContractorJoinReadiness = {
  jobId: string;
  status:
    | 'invite_required'
    | 'invite_invalid'
    | 'joined'
    | 'claimed_by_other'
    | 'wrong_email'
    | 'wallet_not_linked'
    | 'wrong_wallet'
    | 'ready';
  contractorEmailHint: string | null;
  workerAddress: string;
  linkedWalletAddresses: string[];
  contractorParticipation: NonNullable<PublicJobView['contractorParticipation']>;
};

export type JobsListResponse = {
  jobs: Array<{
    job: JobView;
    participantRoles: Array<'client' | 'worker'>;
  }>;
};

export type AuditBundle = {
  bundle: {
    job: PublicJobView;
    audit: Array<{
      type: string;
      at: number;
      payload: Record<string, unknown>;
    }>;
    executions: Array<{
      id: string;
      action: string;
      actorAddress: string;
      chainId: number;
      contractAddress: string;
      txHash?: string;
      status: 'confirmed' | 'failed';
      blockNumber?: number;
      submittedAt: number;
      confirmedAt?: number;
      milestoneIndex?: number;
      escrowId?: string;
      failureCode?: string;
      failureMessage?: string;
    }>;
  };
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

const apiBaseUrl = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

export const webApi = {
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
  setShariah(shariah: boolean, accessToken: string) {
    return requestJson<UserProfile>(
      apiBaseUrl,
      '/auth/shariah',
      {
        method: 'PATCH',
        body: JSON.stringify({ shariah }),
      },
      accessToken,
    );
  },
  getWalletState(accessToken: string) {
    return requestJson<WalletState>(apiBaseUrl, '/wallet', { method: 'GET' }, accessToken);
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
  provisionSmartAccount(
    input: {
      ownerAddress: string;
      label?: string;
      setAsDefault?: boolean;
    },
    accessToken: string,
  ) {
    return requestJson<SmartAccountProvisionResponse>(
      apiBaseUrl,
      '/wallet/smart-account/provision',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  setDefaultWallet(address: string, accessToken: string) {
    return requestJson<WalletState>(
      apiBaseUrl,
      '/wallet/default',
      {
        method: 'PATCH',
        body: JSON.stringify({ address }),
      },
      accessToken,
    );
  },
  listJobs(accessToken: string) {
    return requestJson<JobsListResponse>(apiBaseUrl, '/jobs', { method: 'GET' }, accessToken);
  },
  createJob(
    input: {
      contractorEmail: string;
      workerAddress: string;
      currencyAddress: string;
      title: string;
      description: string;
      category: string;
      termsJSON: Record<string, unknown>;
    },
    accessToken: string,
  ) {
    return requestJson<{
      jobId: string;
      jobHash: string;
      status: JobStatus;
      escrowId: string;
      txHash: string;
    }>(
      apiBaseUrl,
      '/jobs',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  inviteContractor(
    jobId: string,
    input: {
      delivery: 'email' | 'manual';
      frontendOrigin: string;
      regenerate?: boolean;
    },
    accessToken: string,
  ) {
    return requestJson<ContractorInviteResponse>(
      apiBaseUrl,
      `/jobs/${jobId}/contractor/invite`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  updateContractorEmail(
    jobId: string,
    contractorEmail: string,
    accessToken: string,
  ) {
    return requestJson<{
      jobId: string;
      contractorParticipation: NonNullable<JobView['contractorParticipation']>;
    }>(
      apiBaseUrl,
      `/jobs/${jobId}/contractor/email`,
      {
        method: 'PATCH',
        body: JSON.stringify({ contractorEmail }),
      },
      accessToken,
    );
  },
  getContractorJoinReadiness(
    jobId: string,
    inviteToken: string | null,
    accessToken: string,
  ) {
    const search = inviteToken
      ? `?inviteToken=${encodeURIComponent(inviteToken)}`
      : '';
    return requestJson<ContractorJoinReadiness>(
      apiBaseUrl,
      `/jobs/${jobId}/contractor/join-readiness${search}`,
      {
        method: 'GET',
      },
      accessToken,
    );
  },
  joinContractor(jobId: string, inviteToken: string, accessToken: string) {
    return requestJson<{
      jobId: string;
      contractorParticipation: {
        status: 'pending' | 'joined';
        joinedAt: number | null;
      };
    }>(
      apiBaseUrl,
      `/jobs/${jobId}/contractor/join`,
      {
        method: 'POST',
        body: JSON.stringify({ inviteToken }),
      },
      accessToken,
    );
  },
  fundJob(jobId: string, amount: string, accessToken: string) {
    return requestJson<{ txHash: string }>(
      apiBaseUrl,
      `/jobs/${jobId}/fund`,
      {
        method: 'POST',
        body: JSON.stringify({ amount }),
      },
      accessToken,
    );
  },
  setMilestones(
    jobId: string,
    milestones: Array<{
      title: string;
      deliverable: string;
      amount: string;
      dueAt?: number;
    }>,
    accessToken: string,
  ) {
    return requestJson<{ txHash: string }>(
      apiBaseUrl,
      `/jobs/${jobId}/milestones`,
      {
        method: 'POST',
        body: JSON.stringify({ milestones }),
      },
      accessToken,
    );
  },
  deliverMilestone(
    jobId: string,
    milestoneIndex: number,
    input: {
      note: string;
      evidenceUrls: string[];
    },
    accessToken: string,
  ) {
    return requestJson<{ txHash: string }>(
      apiBaseUrl,
      `/jobs/${jobId}/milestones/${milestoneIndex}/deliver`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  releaseMilestone(jobId: string, milestoneIndex: number, accessToken: string) {
    return requestJson<{ txHash: string }>(
      apiBaseUrl,
      `/jobs/${jobId}/milestones/${milestoneIndex}/release`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      accessToken,
    );
  },
  disputeMilestone(
    jobId: string,
    milestoneIndex: number,
    input: {
      reason: string;
      evidenceUrls: string[];
    },
    accessToken: string,
  ) {
    return requestJson<{ txHash: string }>(
      apiBaseUrl,
      `/jobs/${jobId}/milestones/${milestoneIndex}/dispute`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  resolveMilestone(
    jobId: string,
    milestoneIndex: number,
    input: {
      action: 'release' | 'refund';
      note: string;
    },
    accessToken: string,
  ) {
    return requestJson<{ txHash: string }>(
      apiBaseUrl,
      `/jobs/${jobId}/milestones/${milestoneIndex}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  getAudit(jobId: string) {
    return requestJson<AuditBundle>(apiBaseUrl, `/jobs/${jobId}/audit`, {
      method: 'GET',
    });
  },
};
