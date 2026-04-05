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
    const body = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }
    return body.message || text;
  } catch {
    return text;
  }
}

export const adminApi = {
  baseUrl: resolveApiBaseUrl(),
  async getAudit(jobId: string) {
    const response = await fetch(`${resolveApiBaseUrl()}/jobs/${jobId}/audit`);
    if (!response.ok) {
      throw new Error(await readError(response));
    }
    return (await response.json()) as AuditBundle;
  },
};
