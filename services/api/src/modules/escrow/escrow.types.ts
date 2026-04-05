import type { EscrowContractAction } from './onchain/escrow-contract.types';

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

export type EscrowExecutionStatus = 'confirmed' | 'failed';

export type EscrowAuditEvent =
  | {
      type: 'job.created';
      at: number;
      payload: {
        jobId: string;
        category: string;
        escrowId: string;
      };
    }
  | {
      type: 'job.funded';
      at: number;
      payload: {
        jobId: string;
        amount: string;
      };
    }
  | {
      type: 'job.milestones_set';
      at: number;
      payload: {
        jobId: string;
        count: number;
      };
    }
  | {
      type: 'milestone.delivered';
      at: number;
      payload: {
        jobId: string;
        milestoneIndex: number;
      };
    }
  | {
      type: 'milestone.released';
      at: number;
      payload: {
        jobId: string;
        milestoneIndex: number;
      };
    }
  | {
      type: 'milestone.disputed';
      at: number;
      payload: {
        jobId: string;
        milestoneIndex: number;
      };
    }
  | {
      type: 'milestone.resolved';
      at: number;
      payload: {
        jobId: string;
        milestoneIndex: number;
        action: 'release' | 'refund';
      };
    };

export type EscrowMilestoneRecord = {
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
};

export type EscrowOnchainState = {
  chainId: number;
  contractAddress: string;
  escrowId: string | null;
  clientAddress: string;
  workerAddress: string;
  currencyAddress: string;
};

export type EscrowExecutionRecord = {
  id: string;
  action: EscrowContractAction;
  actorAddress: string;
  chainId: number;
  contractAddress: string;
  txHash?: string;
  status: EscrowExecutionStatus;
  blockNumber?: number;
  submittedAt: number;
  confirmedAt?: number;
  milestoneIndex?: number;
  escrowId?: string;
  failureCode?: string;
  failureMessage?: string;
};

export type EscrowJobRecord = {
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
  milestones: EscrowMilestoneRecord[];
  audit: EscrowAuditEvent[];
  onchain: EscrowOnchainState;
  executions: EscrowExecutionRecord[];
};

export type EscrowJobView = Omit<EscrowJobRecord, 'audit' | 'executions'>;

export type EscrowParticipantRole = 'client' | 'worker';

export type EscrowJobListItem = {
  job: EscrowJobView;
  participantRoles: EscrowParticipantRole[];
};

export type EscrowJobsListResponse = {
  jobs: EscrowJobListItem[];
};

export type EscrowAuditBundle = {
  bundle: {
    job: EscrowJobView;
    audit: EscrowAuditEvent[];
    executions: EscrowExecutionRecord[];
  };
};

export type CreateJobResponse = {
  jobId: string;
  jobHash: string;
  status: JobStatus;
  escrowId: string;
  txHash: string;
};

export type FundJobResponse = {
  jobId: string;
  fundedAmount: string | null;
  status: JobStatus;
  txHash: string;
};

export type SetMilestonesResponse = {
  jobId: string;
  milestoneCount: number;
  status: JobStatus;
  txHash: string;
};

export type MilestoneMutationResponse = {
  jobId: string;
  milestoneIndex: number;
  milestoneStatus: MilestoneStatus;
  jobStatus: JobStatus;
  txHash: string;
};
