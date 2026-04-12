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
      type: 'job.contractor_participation_requested';
      at: number;
      payload: {
        jobId: string;
        workerAddress: string;
      };
    }
  | {
      type: 'job.contractor_email_updated';
      at: number;
      payload: {
        jobId: string;
      };
    }
  | {
      type: 'job.contractor_invite_sent';
      at: number;
      payload: {
        jobId: string;
        delivery: EscrowContractorInviteDeliveryMode;
        regenerated: boolean;
      };
    }
  | {
      type: 'job.contractor_joined';
      at: number;
      payload: {
        jobId: string;
        workerAddress: string;
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
  disputeEvidenceUrls?: string[];
  resolutionAction?: 'release' | 'refund';
  resolutionNote?: string;
};

export type EscrowContractorParticipationStatus = 'pending' | 'joined';
export type EscrowContractorInviteDeliveryMode = 'email' | 'manual';

export type EscrowContractorInviteRecord = {
  token: string | null;
  tokenIssuedAt: number | null;
  lastSentAt: number | null;
  lastSentMode: EscrowContractorInviteDeliveryMode | null;
};

export type EscrowContractorParticipationRecord = {
  contractorEmail: string;
  status: EscrowContractorParticipationStatus;
  joinedUserId: string | null;
  joinedAt: number | null;
  invite: EscrowContractorInviteRecord;
};

export type EscrowContractorParticipationView = {
  contractorEmail: string;
  status: EscrowContractorParticipationStatus;
  joinedAt: number | null;
  inviteLastSentAt: number | null;
  inviteLastSentMode: EscrowContractorInviteDeliveryMode | null;
};

export type EscrowContractorParticipationPublicView = {
  status: EscrowContractorParticipationStatus;
  joinedAt: number | null;
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

export type EscrowStaleWorkflowRecord = {
  claimedByUserId: string;
  claimedByEmail: string;
  claimedAt: number;
  note?: string;
  updatedAt: number;
};

export type EscrowFailureRemediationStatus =
  | 'investigating'
  | 'blocked_external'
  | 'ready_to_retry'
  | 'monitoring';

export type EscrowExecutionFailureWorkflowRecord = {
  claimedByUserId: string;
  claimedByEmail: string;
  claimedAt: number;
  status: EscrowFailureRemediationStatus;
  acknowledgedFailureAt?: number;
  note?: string;
  updatedAt: number;
};

export type EscrowChainSyncOutcome = 'succeeded' | 'failed' | 'blocked';

export type EscrowChainSyncRecord = {
  lastAttemptedAt: number;
  lastOutcome: EscrowChainSyncOutcome;
  lastMode: 'preview' | 'persisted';
  lastSuccessfulAt?: number;
  lastPersistedAt?: number;
  lastSyncedBlock?: number;
  lastIssueCount: number;
  lastCriticalIssueCount: number;
  lastReconciliationIssueCount: number;
  lastErrorMessage?: string;
};

export type EscrowChainStreamName = 'workstream_escrow';

export type EscrowOnchainEventName =
  | 'JobCreated'
  | 'EscrowFunded'
  | 'MilestonesSet'
  | 'MilestoneDelivered'
  | 'MilestoneReleased'
  | 'DisputeOpened'
  | 'DisputeResolved';

export type EscrowChainCursorRecord = {
  chainId: number;
  contractAddress: string;
  streamName: EscrowChainStreamName;
  nextFromBlock: number;
  lastFinalizedBlock: number | null;
  lastScannedBlock: number | null;
  lastError: string | null;
  updatedAt: number;
};

export type EscrowChainEventPayload =
  | {
      eventName: 'JobCreated';
      clientAddress: string;
      jobHash: string;
    }
  | {
      eventName: 'EscrowFunded';
      amount: string;
      currencyAddress: string;
    }
  | {
      eventName: 'MilestonesSet';
      count: number;
    }
  | {
      eventName: 'MilestoneDelivered';
      milestoneIndex: number;
      deliverableHash: string;
    }
  | {
      eventName: 'MilestoneReleased';
      milestoneIndex: number;
      amount: string;
    }
  | {
      eventName: 'DisputeOpened';
      milestoneIndex: number;
      reasonHash: string;
    }
  | {
      eventName: 'DisputeResolved';
      milestoneIndex: number;
      splitBpsClient: number;
    };

export type EscrowChainEventRecord = {
  chainId: number;
  contractAddress: string;
  escrowId: string;
  transactionHash: string;
  logIndex: number;
  blockNumber: number;
  blockHash: string;
  blockTimeMs: number;
  payload: EscrowChainEventPayload;
};

export type EscrowOnchainProjectedMilestoneRecord = {
  status: MilestoneStatus;
  deliveredAt: number | null;
  disputedAt: number | null;
  releasedAt: number | null;
  resolvedAt: number | null;
  resolutionAction: 'release' | 'refund' | null;
};

export type EscrowProjectionDriftSummary = {
  aggregateMatches: boolean;
  auditDigestMatches: boolean;
  localStatus: JobStatus;
  projectedStatus: JobStatus;
  localFundedAmount: string | null;
  projectedFundedAmount: string | null;
  localAuditEvents: number;
  projectedAuditEvents: number;
  mismatchedMilestones: Array<{
    index: number;
    localStatus: MilestoneStatus | null;
    projectedStatus: MilestoneStatus | null;
  }>;
};

export type EscrowAuthoritySource = 'chain_projection' | 'local_fallback';

export type EscrowAuthorityStatus = {
  source: EscrowAuthoritySource;
  authorityReadsEnabled: boolean;
  projectionAvailable: boolean;
  projectionFresh: boolean;
  projectionHealthy: boolean;
  projectedAt: number | null;
  lastProjectedBlock: number | null;
  lastEventCount: number | null;
  reason: string | null;
};

export type EscrowOnchainProjectionRecord = {
  jobId: string;
  chainId: number;
  contractAddress: string;
  escrowId: string;
  projectedAt: number;
  lastProjectedBlock: number | null;
  lastEventBlock: number | null;
  lastEventCount: number;
  digest: string;
  health: 'healthy' | 'degraded';
  degradedReason: string | null;
  fundedAmount: string | null;
  status: JobStatus;
  milestones: EscrowOnchainProjectedMilestoneRecord[];
  chainAudit: Array<
    Extract<
      EscrowAuditEvent,
      {
        type:
          | 'job.created'
          | 'job.funded'
          | 'job.milestones_set'
          | 'milestone.delivered'
          | 'milestone.released'
          | 'milestone.disputed'
          | 'milestone.resolved';
      }
    >
  >;
  driftSummary: EscrowProjectionDriftSummary;
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
  contractorParticipation: EscrowContractorParticipationRecord | null;
  milestones: EscrowMilestoneRecord[];
  audit: EscrowAuditEvent[];
  operations: {
    chainSync: EscrowChainSyncRecord | null;
    executionFailureWorkflow: EscrowExecutionFailureWorkflowRecord | null;
    staleWorkflow: EscrowStaleWorkflowRecord | null;
  };
  onchain: EscrowOnchainState;
  executions: EscrowExecutionRecord[];
};

export type EscrowJobView = Omit<
  EscrowJobRecord,
  'audit' | 'executions' | 'contractorParticipation'
> & {
  contractorParticipation: EscrowContractorParticipationView | null;
};

export type EscrowPublicJobView = Omit<
  EscrowJobView,
  'contractorParticipation'
> & {
  contractorParticipation: EscrowContractorParticipationPublicView | null;
};

export type EscrowParticipantRole = 'client' | 'worker';

export type EscrowContractorJoinReadinessStatus =
  | 'invite_required'
  | 'invite_invalid'
  | 'joined'
  | 'claimed_by_other'
  | 'wrong_email'
  | 'wallet_not_linked'
  | 'wrong_wallet'
  | 'ready';

export type EscrowJobListItem = {
  job: EscrowJobView;
  participantRoles: EscrowParticipantRole[];
};

export type EscrowJobsListResponse = {
  jobs: EscrowJobListItem[];
};

export type EscrowAuditBundle = {
  bundle: {
    job: EscrowPublicJobView;
    audit: EscrowAuditEvent[];
    executions: EscrowExecutionRecord[];
    authority: EscrowAuthorityStatus;
  };
};

export type EscrowExportArtifactKind = 'job-history' | 'dispute-case';

export type EscrowExportFormat = 'json' | 'csv';

export type EscrowExportTimelineEntry = {
  source: 'audit' | 'execution';
  at: number;
  label: string;
  milestoneIndex: number | null;
  status: string | null;
  actorAddress: string | null;
  txHash: string | null;
  detail: Record<string, unknown>;
};

export type EscrowJobHistoryExport = {
  schemaVersion: 1;
  artifact: 'job-history';
  exportedAt: string;
  authority: EscrowAuthorityStatus;
  job: EscrowPublicJobView;
  summary: {
    milestoneCount: number;
    disputedMilestones: number;
    failedExecutions: number;
    latestActivityAt: number | null;
  };
  audit: EscrowAuditEvent[];
  executions: EscrowExecutionRecord[];
  timeline: EscrowExportTimelineEntry[];
};

export type EscrowDisputeCaseExport = {
  schemaVersion: 1;
  artifact: 'dispute-case';
  exportedAt: string;
  authority: EscrowAuthorityStatus;
  job: EscrowPublicJobView;
  summary: {
    disputeCount: number;
    openDisputes: number;
    resolvedDisputes: number;
    failedExecutions: number;
    latestActivityAt: number | null;
  };
  disputes: Array<{
    milestoneIndex: number;
    title: string;
    status: MilestoneStatus;
    amount: string;
    disputedAt: number | null;
    resolvedAt: number | null;
    disputeReason: string | null;
    disputeEvidenceUrls: string[];
    resolutionAction: 'release' | 'refund' | null;
    resolutionNote: string | null;
    relatedAudit: EscrowAuditEvent[];
    relatedExecutions: EscrowExecutionRecord[];
  }>;
  failedExecutions: EscrowExecutionRecord[];
};

export type EscrowExportDocument = {
  artifact: EscrowExportArtifactKind;
  format: EscrowExportFormat;
  contentType: string;
  fileName: string;
  body: string | EscrowJobHistoryExport | EscrowDisputeCaseExport;
};

export type CreateJobResponse = {
  jobId: string;
  jobHash: string;
  status: JobStatus;
  escrowId: string;
  txHash: string;
};

export type JoinContractorResponse = {
  jobId: string;
  contractorParticipation: EscrowContractorParticipationPublicView;
};

export type ContractorInviteResponse = {
  jobId: string;
  contractorParticipation: EscrowContractorParticipationView;
  invite: {
    contractorEmail: string;
    delivery: EscrowContractorInviteDeliveryMode;
    joinUrl: string;
    regenerated: boolean;
    sentAt: number;
  };
};

export type UpdateContractorEmailResponse = {
  jobId: string;
  contractorParticipation: EscrowContractorParticipationView;
};

export type ContractorJoinReadinessResponse = {
  jobId: string;
  status: EscrowContractorJoinReadinessStatus;
  contractorEmailHint: string | null;
  workerAddress: string;
  linkedWalletAddresses: string[];
  contractorParticipation: EscrowContractorParticipationPublicView;
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
