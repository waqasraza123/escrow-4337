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

export type JobsListResponse = {
  jobs: Array<{
    job: JobView;
    participantRoles: Array<'client' | 'worker'>;
  }>;
};

export type AuditBundle = {
  bundle: {
    job: JobView;
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

const defaultApiBaseUrl = 'http://localhost:4000';

function resolveApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '') ||
    defaultApiBaseUrl
  );
}

async function readError(response: Response) {
  const text = await response.text();
  if (!text) {
    return `Request failed with ${response.status}`;
  }

  try {
    const body = JSON.parse(text) as {
      message?: string | string[];
      error?: string;
    };
    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }
    return body.message || body.error || text;
  } catch {
    return text;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const webApi = {
  baseUrl: resolveApiBaseUrl(),
  startAuth(email: string) {
    return request<{ ok: true }>('/auth/start', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  verifyAuth(email: string, code: string) {
    return request<VerifyResponse>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },
  refresh(refreshToken: string) {
    return request<SessionTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
  logout(refreshToken: string | null) {
    return request<{ ok: true }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
  me(accessToken: string) {
    return request<UserProfile>('/auth/me', { method: 'GET' }, accessToken);
  },
  setShariah(shariah: boolean, accessToken: string) {
    return request<UserProfile>(
      '/auth/shariah',
      {
        method: 'PATCH',
        body: JSON.stringify({ shariah }),
      },
      accessToken,
    );
  },
  getWalletState(accessToken: string) {
    return request<WalletState>('/wallet', { method: 'GET' }, accessToken);
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
    return request<WalletLinkChallenge>(
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
    return request<WalletState>(
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
    return request<SmartAccountProvisionResponse>(
      '/wallet/smart-account/provision',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  setDefaultWallet(address: string, accessToken: string) {
    return request<WalletState>(
      '/wallet/default',
      {
        method: 'PATCH',
        body: JSON.stringify({ address }),
      },
      accessToken,
    );
  },
  listJobs(accessToken: string) {
    return request<JobsListResponse>('/jobs', { method: 'GET' }, accessToken);
  },
  createJob(
    input: {
      workerAddress: string;
      currencyAddress: string;
      title: string;
      description: string;
      category: string;
      termsJSON: Record<string, unknown>;
    },
    accessToken: string,
  ) {
    return request<{
      jobId: string;
      jobHash: string;
      status: JobStatus;
      escrowId: string;
      txHash: string;
    }>(
      '/jobs',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  fundJob(jobId: string, amount: string, accessToken: string) {
    return request<{ txHash: string }>(
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
    return request<{ txHash: string }>(
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
    return request<{ txHash: string }>(
      `/jobs/${jobId}/milestones/${milestoneIndex}/deliver`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  releaseMilestone(jobId: string, milestoneIndex: number, accessToken: string) {
    return request<{ txHash: string }>(
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
    reason: string,
    accessToken: string,
  ) {
    return request<{ txHash: string }>(
      `/jobs/${jobId}/milestones/${milestoneIndex}/dispute`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
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
    return request<{ txHash: string }>(
      `/jobs/${jobId}/milestones/${milestoneIndex}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  getAudit(jobId: string) {
    return request<AuditBundle>(`/jobs/${jobId}/audit`, { method: 'GET' });
  },
};
