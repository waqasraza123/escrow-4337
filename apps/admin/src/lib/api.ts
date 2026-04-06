import {
  requestJson,
  resolveApiBaseUrl,
} from '@escrow4334/frontend-core';

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
  async getAudit(jobId: string) {
    return requestJson<AuditBundle>(apiBaseUrl, `/jobs/${jobId}/audit`, {
      method: 'GET',
    });
  },
};
