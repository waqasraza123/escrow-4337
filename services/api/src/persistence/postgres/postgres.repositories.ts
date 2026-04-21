import type { PoolClient, QueryResultRow } from 'pg';
import type {
  OtpEntry,
  OtpRequestThrottleRecord,
  SessionRecord,
} from '../../modules/auth/auth.types';
import type {
  EscrowAuditEvent,
  EscrowChainCursorRecord,
  EscrowChainEventPayload,
  EscrowChainEventRecord,
  EscrowChainSyncRecord,
  EscrowContractorParticipationRecord,
  EscrowFailureRemediationStatus,
  EscrowExecutionFailureWorkflowRecord,
  EscrowExecutionRecord,
  EscrowJobRecord,
  EscrowMilestoneRecord,
  EscrowOnchainState,
  EscrowOnchainProjectedMilestoneRecord,
  EscrowOnchainProjectionRecord,
  EscrowProjectRoomRecord,
  EscrowProjectionDriftSummary,
  EscrowStaleWorkflowRecord,
} from '../../modules/escrow/escrow.types';
import type { UserRecord } from '../../modules/users/users.types';
import type {
  EscrowRepository,
  OtpRepository,
  OtpRequestThrottlesRepository,
  SessionsRepository,
  UsersRepository,
  WalletLinkChallengesRepository,
} from '../persistence.types';
import { PostgresDatabaseService } from './postgres-database.service';
import type { WalletLinkChallengeRecord } from '../../modules/wallet/wallet.types';

type UserRow = QueryResultRow & {
  id: string;
  email: string;
  shariah_mode: boolean;
  default_execution_wallet_address: string | null;
  active_workspace_id: string | null;
  created_at_ms: string;
  updated_at_ms: string;
};

type UserWalletRow = QueryResultRow & {
  user_id: string;
  address: string;
  wallet_kind: UserRecord['wallets'][number]['walletKind'];
  label: string | null;
  verification_method: 'siwe' | 'legacy_link' | null;
  verification_chain_id: number | null;
  verified_at_ms: string | null;
  owner_address: string | null;
  recovery_address: string | null;
  chain_id: number | null;
  provider_kind: 'mock' | 'relay' | null;
  entry_point_address: string | null;
  factory_address: string | null;
  sponsorship_policy: 'disabled' | 'sponsored' | null;
  provisioned_at_ms: string | null;
  created_at_ms: string;
  updated_at_ms: string;
};

type OtpRow = QueryResultRow & {
  email: string;
  hash: string;
  salt: string;
  expires_at_ms: string;
  attempts: number;
  locked_until_ms: string | null;
  last_sent_at_ms: string;
  send_window_start_ms: string;
  send_window_count: number;
};

type OtpRequestThrottleRow = QueryResultRow & {
  scope: OtpRequestThrottleRecord['scope'];
  throttle_key: string;
  window_start_ms: string;
  request_count: number;
  updated_at_ms: string;
};

type SessionRow = QueryResultRow & {
  sid: string;
  user_id: string;
  email: string;
  expires_at_ms: string;
  refresh_token_id: string;
  revoked_at_ms: string | null;
};

type WalletLinkChallengeRow = QueryResultRow & {
  id: string;
  user_id: string;
  address: string;
  wallet_kind: WalletLinkChallengeRecord['walletKind'];
  label: string | null;
  chain_id: number;
  nonce: string;
  message: string;
  issued_at_ms: string;
  expires_at_ms: string;
  failed_attempts: number;
  consumed_at_ms: string | null;
  last_failed_at_ms: string | null;
};

type JobRow = QueryResultRow & {
  id: string;
  title: string;
  description: string;
  category: string;
  terms_json: Record<string, unknown>;
  job_hash: string;
  funded_amount: string | null;
  status: EscrowJobRecord['status'];
  created_at_ms: string;
  updated_at_ms: string;
  chain_id: number;
  contract_address: string;
  onchain_escrow_id: string | null;
  client_address: string;
  worker_address: string;
  currency_address: string;
  contractor_participation_json: EscrowContractorParticipationRecord | null;
  operations_json: {
    chainSync?: EscrowChainSyncRecord | null;
    executionFailureWorkflow?: EscrowExecutionFailureWorkflowRecord | null;
    staleWorkflow?: EscrowStaleWorkflowRecord | null;
    commercial?: EscrowJobRecord['operations']['commercial'] | null;
  } | null;
  project_room_json: EscrowProjectRoomRecord | null;
};

type MilestoneRow = QueryResultRow & {
  milestone_index: number;
  title: string;
  deliverable: string;
  amount: string;
  due_at_ms: string | null;
  status: EscrowMilestoneRecord['status'];
  delivered_at_ms: string | null;
  released_at_ms: string | null;
  disputed_at_ms: string | null;
  resolved_at_ms: string | null;
  delivery_note: string | null;
  delivery_evidence_urls: string[] | null;
  dispute_reason: string | null;
  dispute_evidence_urls: string[] | null;
  resolution_action: 'release' | 'refund' | null;
  resolution_note: string | null;
};

type AuditRow = QueryResultRow & {
  event_index: number;
  type: EscrowAuditEvent['type'];
  at_ms: string;
  payload: EscrowAuditEvent['payload'];
};

type ExecutionRow = QueryResultRow & {
  execution_id: string;
  action: EscrowExecutionRecord['action'];
  actor_address: string;
  chain_id: number;
  contract_address: string;
  request_id: string | null;
  correlation_id: string | null;
  idempotency_key: string | null;
  operation_key: string | null;
  tx_hash: string | null;
  status: EscrowExecutionRecord['status'];
  block_number: string | null;
  submitted_at_ms: string;
  confirmed_at_ms: string | null;
  milestone_index: number | null;
  escrow_id: string | null;
  failure_code: string | null;
  failure_message: string | null;
};

type ChainCursorRow = QueryResultRow & {
  chain_id: number;
  contract_address: string;
  stream_name: EscrowChainCursorRecord['streamName'];
  next_from_block: string;
  last_finalized_block: string | null;
  last_scanned_block: string | null;
  last_error: string | null;
  updated_at_ms: string;
};

type ChainEventRow = QueryResultRow & {
  chain_id: number;
  contract_address: string;
  escrow_id: string;
  transaction_hash: string;
  log_index: number;
  block_number: string;
  block_hash: string;
  block_time_ms: string;
  source: EscrowChainEventRecord['source'];
  ingestion_kind: EscrowChainEventRecord['ingestionKind'];
  ingested_at_ms: string | null;
  correlation_id: string | null;
  mirror_status: EscrowChainEventRecord['mirrorStatus'];
  persisted_via: EscrowChainEventRecord['persistedVia'];
  event_name: EscrowChainEventPayload['eventName'];
  payload_json: EscrowChainEventPayload;
};

type OnchainProjectionRow = QueryResultRow & {
  job_id: string;
  chain_id: number;
  contract_address: string;
  escrow_id: string;
  projected_at_ms: string;
  last_projected_block: string | null;
  last_event_block: string | null;
  last_event_count: number;
  projection_digest: string;
  projection_health: EscrowOnchainProjectionRecord['health'];
  degraded_reason: string | null;
  funded_amount: string | null;
  status: EscrowJobRecord['status'];
  milestones_json: EscrowOnchainProjectedMilestoneRecord[];
  chain_audit_json: Array<
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
  drift_summary_json: EscrowProjectionDriftSummary;
};

function asNumber(value: string | null) {
  return value === null ? undefined : Number(value);
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    shariahMode: row.shariah_mode,
    defaultExecutionWalletAddress: row.default_execution_wallet_address,
    activeWorkspaceId: row.active_workspace_id,
    wallets: [],
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapUserWallet(row: UserWalletRow): UserRecord['wallets'][number] {
  if (row.wallet_kind === 'smart_account') {
    return {
      address: row.address,
      walletKind: row.wallet_kind,
      ownerAddress: row.owner_address ?? row.address,
      recoveryAddress: row.recovery_address ?? row.owner_address ?? row.address,
      chainId: row.chain_id ?? 0,
      providerKind: row.provider_kind ?? 'relay',
      entryPointAddress: row.entry_point_address ?? row.address,
      factoryAddress: row.factory_address ?? row.address,
      sponsorshipPolicy: row.sponsorship_policy ?? 'disabled',
      provisionedAt:
        asNumber(row.provisioned_at_ms) ?? Number(row.created_at_ms),
      label: row.label ?? undefined,
      createdAt: Number(row.created_at_ms),
      updatedAt: Number(row.updated_at_ms),
    };
  }

  return {
    address: row.address,
    walletKind: row.wallet_kind,
    verificationMethod: row.verification_method ?? 'legacy_link',
    verificationChainId: row.verification_chain_id ?? undefined,
    verifiedAt: asNumber(row.verified_at_ms) ?? Number(row.updated_at_ms),
    label: row.label ?? undefined,
    createdAt: Number(row.created_at_ms),
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapOtp(row: OtpRow): OtpEntry {
  return {
    email: row.email,
    hash: row.hash,
    salt: row.salt,
    exp: Number(row.expires_at_ms),
    attempts: row.attempts,
    lockedUntil: asNumber(row.locked_until_ms),
    lastSentAt: Number(row.last_sent_at_ms),
    sentCountWindow: {
      windowStart: Number(row.send_window_start_ms),
      count: row.send_window_count,
    },
  };
}

function mapOtpRequestThrottle(
  row: OtpRequestThrottleRow,
): OtpRequestThrottleRecord {
  return {
    scope: row.scope,
    key: row.throttle_key,
    windowStart: Number(row.window_start_ms),
    count: row.request_count,
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapSession(row: SessionRow): SessionRecord {
  return {
    sid: row.sid,
    userId: row.user_id,
    email: row.email,
    exp: Number(row.expires_at_ms),
    revoked: row.revoked_at_ms !== null,
    refreshTokenId: row.refresh_token_id,
  };
}

function mapWalletLinkChallenge(
  row: WalletLinkChallengeRow,
): WalletLinkChallengeRecord {
  return {
    id: row.id,
    userId: row.user_id,
    address: row.address,
    walletKind: row.wallet_kind,
    label: row.label ?? undefined,
    chainId: row.chain_id,
    nonce: row.nonce,
    message: row.message,
    issuedAt: Number(row.issued_at_ms),
    expiresAt: Number(row.expires_at_ms),
    failedAttempts: row.failed_attempts,
    consumedAt: asNumber(row.consumed_at_ms),
    lastFailedAt: asNumber(row.last_failed_at_ms),
  };
}

function mapOnchain(row: JobRow): EscrowOnchainState {
  return {
    chainId: row.chain_id,
    contractAddress: row.contract_address,
    escrowId: row.onchain_escrow_id,
    clientAddress: row.client_address,
    workerAddress: row.worker_address,
    currencyAddress: row.currency_address,
  };
}

function normalizeFailureWorkflowStatus(
  status?: EscrowFailureRemediationStatus,
): EscrowFailureRemediationStatus {
  switch (status) {
    case 'blocked_external':
    case 'monitoring':
    case 'ready_to_retry':
      return status;
    case 'investigating':
    default:
      return 'investigating';
  }
}

function mapOperations(row: JobRow): EscrowJobRecord['operations'] {
  return {
    chainSync: row.operations_json?.chainSync
      ? ({
          ...row.operations_json.chainSync,
        } as EscrowChainSyncRecord)
      : null,
    executionFailureWorkflow: row.operations_json?.executionFailureWorkflow
      ? {
          ...row.operations_json.executionFailureWorkflow,
          status: normalizeFailureWorkflowStatus(
            row.operations_json.executionFailureWorkflow.status,
          ),
        }
      : null,
    staleWorkflow: row.operations_json?.staleWorkflow ?? null,
    commercial: row.operations_json?.commercial ?? null,
  };
}

function mapContractorParticipation(
  row: JobRow,
): EscrowContractorParticipationRecord | null {
  if (!row.contractor_participation_json) {
    return null;
  }

  return {
    contractorEmail: row.contractor_participation_json.contractorEmail
      .trim()
      .toLowerCase(),
    status:
      row.contractor_participation_json.status === 'joined'
        ? 'joined'
        : 'pending',
    joinedUserId: row.contractor_participation_json.joinedUserId ?? null,
    joinedAt: row.contractor_participation_json.joinedAt ?? null,
    invite: {
      token: row.contractor_participation_json.invite?.token ?? null,
      tokenIssuedAt:
        row.contractor_participation_json.invite?.tokenIssuedAt ?? null,
      lastSentAt: row.contractor_participation_json.invite?.lastSentAt ?? null,
      lastSentMode:
        row.contractor_participation_json.invite?.lastSentMode === 'email'
          ? 'email'
          : row.contractor_participation_json.invite?.lastSentMode === 'manual'
            ? 'manual'
            : null,
    },
  };
}

function mapProjectRoom(row: JobRow): EscrowProjectRoomRecord {
  return {
    submissions: (row.project_room_json?.submissions ?? []).map((submission) => ({
      ...submission,
      artifacts: (submission.artifacts ?? []).map((artifact) => ({
        ...artifact,
        mimeType: artifact.mimeType ?? null,
        byteSize: artifact.byteSize ?? null,
        storageKind: 'external_url',
      })),
      revisionRequest: submission.revisionRequest
        ? {
            ...submission.revisionRequest,
          }
        : null,
      approval: submission.approval
        ? {
            ...submission.approval,
            note: submission.approval.note ?? null,
          }
        : null,
      deliveredAt: submission.deliveredAt ?? null,
    })),
    messages: (row.project_room_json?.messages ?? []).map((message) => ({
      ...message,
      senderRole: message.senderRole === 'client' ? 'client' : 'worker',
    })),
    activity: (row.project_room_json?.activity ?? []).map((entry) => ({
      ...entry,
      actorRole: entry.actorRole === 'client' ? 'client' : 'worker',
      milestoneIndex: entry.milestoneIndex ?? null,
      relatedSubmissionId: entry.relatedSubmissionId ?? null,
      detail: entry.detail ?? null,
    })),
    supportCases: (row.project_room_json?.supportCases ?? []).map((supportCase) => ({
      ...supportCase,
      milestoneIndex: supportCase.milestoneIndex ?? null,
      ownerUserId: supportCase.ownerUserId ?? null,
      ownerEmail: supportCase.ownerEmail ?? null,
      feeDecision: supportCase.feeDecision ?? null,
      feeDecisionNote: supportCase.feeDecisionNote ?? null,
      feeImpactAmount: supportCase.feeImpactAmount ?? null,
      resolvedAt: supportCase.resolvedAt ?? null,
      messages: (supportCase.messages ?? []).map((message) => ({
        ...message,
        authorRole:
          message.authorRole === 'operator'
            ? 'operator'
            : message.authorRole === 'client'
              ? 'client'
              : 'worker',
        visibility: message.visibility === 'internal' ? 'internal' : 'external',
      })),
    })),
  };
}

function mapMilestone(row: MilestoneRow): EscrowMilestoneRecord {
  return {
    title: row.title,
    deliverable: row.deliverable,
    amount: row.amount,
    dueAt: asNumber(row.due_at_ms),
    status: row.status,
    deliveredAt: asNumber(row.delivered_at_ms),
    releasedAt: asNumber(row.released_at_ms),
    disputedAt: asNumber(row.disputed_at_ms),
    resolvedAt: asNumber(row.resolved_at_ms),
    deliveryNote: row.delivery_note ?? undefined,
    deliveryEvidenceUrls: row.delivery_evidence_urls ?? undefined,
    disputeReason: row.dispute_reason ?? undefined,
    disputeEvidenceUrls: row.dispute_evidence_urls ?? undefined,
    resolutionAction: row.resolution_action ?? undefined,
    resolutionNote: row.resolution_note ?? undefined,
  };
}

function mapAudit(row: AuditRow): EscrowAuditEvent {
  return {
    type: row.type,
    at: Number(row.at_ms),
    payload: row.payload,
  } as EscrowAuditEvent;
}

function mapExecution(row: ExecutionRow): EscrowExecutionRecord {
  return {
    id: row.execution_id,
    action: row.action,
    actorAddress: row.actor_address,
    chainId: row.chain_id,
    contractAddress: row.contract_address,
    requestId: row.request_id ?? undefined,
    correlationId: row.correlation_id ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    operationKey: row.operation_key ?? undefined,
    txHash: row.tx_hash ?? undefined,
    status: row.status,
    blockNumber: asNumber(row.block_number),
    submittedAt: Number(row.submitted_at_ms),
    confirmedAt: asNumber(row.confirmed_at_ms),
    milestoneIndex: row.milestone_index ?? undefined,
    escrowId: row.escrow_id ?? undefined,
    failureCode: row.failure_code ?? undefined,
    failureMessage: row.failure_message ?? undefined,
  };
}

function mapChainCursor(row: ChainCursorRow): EscrowChainCursorRecord {
  return {
    chainId: row.chain_id,
    contractAddress: row.contract_address,
    streamName: row.stream_name,
    nextFromBlock: Number(row.next_from_block),
    lastFinalizedBlock: asNumber(row.last_finalized_block) ?? null,
    lastScannedBlock: asNumber(row.last_scanned_block) ?? null,
    lastError: row.last_error ?? null,
    updatedAt: Number(row.updated_at_ms),
  };
}

function mapChainEvent(row: ChainEventRow): EscrowChainEventRecord {
  return {
    chainId: row.chain_id,
    contractAddress: row.contract_address,
    escrowId: row.escrow_id,
    transactionHash: row.transaction_hash,
    logIndex: row.log_index,
    blockNumber: Number(row.block_number),
    blockHash: row.block_hash,
    blockTimeMs: Number(row.block_time_ms),
    source: row.source,
    ingestionKind: row.ingestion_kind,
    ingestedAt: row.ingested_at_ms === null ? null : Number(row.ingested_at_ms),
    correlationId: row.correlation_id ?? null,
    mirrorStatus: row.mirror_status,
    persistedVia: row.persisted_via ?? null,
    payload: row.payload_json,
  };
}

function mapOnchainProjection(
  row: OnchainProjectionRow,
): EscrowOnchainProjectionRecord {
  return {
    jobId: row.job_id,
    chainId: row.chain_id,
    contractAddress: row.contract_address,
    escrowId: row.escrow_id,
    projectedAt: Number(row.projected_at_ms),
    lastProjectedBlock: asNumber(row.last_projected_block) ?? null,
    lastEventBlock: asNumber(row.last_event_block) ?? null,
    lastEventCount: row.last_event_count,
    digest: row.projection_digest,
    health: row.projection_health,
    degradedReason: row.degraded_reason ?? null,
    fundedAmount: row.funded_amount,
    status: row.status,
    milestones: row.milestones_json,
    chainAudit: row.chain_audit_json,
    driftSummary: row.drift_summary_json,
  };
}

async function replaceEscrowAggregate(
  client: PoolClient,
  job: EscrowJobRecord,
) {
  await client.query(
    `
      INSERT INTO escrow_jobs (
        id,
        title,
        description,
        category,
        terms_json,
        job_hash,
        funded_amount,
        status,
        created_at_ms,
        updated_at_ms,
        chain_id,
        contract_address,
        onchain_escrow_id,
        client_address,
        worker_address,
        currency_address,
        contractor_participation_json,
        operations_json,
        project_room_json
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5::jsonb,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17::jsonb,
        $18::jsonb,
        $19::jsonb
      )
      ON CONFLICT (id) DO UPDATE
      SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        terms_json = EXCLUDED.terms_json,
        job_hash = EXCLUDED.job_hash,
        funded_amount = EXCLUDED.funded_amount,
        status = EXCLUDED.status,
        updated_at_ms = EXCLUDED.updated_at_ms,
        chain_id = EXCLUDED.chain_id,
        contract_address = EXCLUDED.contract_address,
        onchain_escrow_id = EXCLUDED.onchain_escrow_id,
        client_address = EXCLUDED.client_address,
        worker_address = EXCLUDED.worker_address,
        currency_address = EXCLUDED.currency_address,
        contractor_participation_json = EXCLUDED.contractor_participation_json,
        operations_json = EXCLUDED.operations_json,
        project_room_json = EXCLUDED.project_room_json
    `,
    [
      job.id,
      job.title,
      job.description,
      job.category,
      JSON.stringify(job.termsJSON),
      job.jobHash,
      job.fundedAmount,
      job.status,
      String(job.createdAt),
      String(job.updatedAt),
      job.onchain.chainId,
      job.onchain.contractAddress,
      job.onchain.escrowId,
      job.onchain.clientAddress,
      job.onchain.workerAddress,
      job.onchain.currencyAddress,
      JSON.stringify(job.contractorParticipation),
      JSON.stringify(job.operations),
      JSON.stringify(job.projectRoom),
    ],
  );

  await client.query('DELETE FROM escrow_milestones WHERE job_id = $1', [
    job.id,
  ]);
  for (const [index, milestone] of job.milestones.entries()) {
    await client.query(
      `
        INSERT INTO escrow_milestones (
          job_id,
          milestone_index,
          title,
          deliverable,
          amount,
          due_at_ms,
          status,
          delivered_at_ms,
          released_at_ms,
          disputed_at_ms,
          resolved_at_ms,
          delivery_note,
          delivery_evidence_urls,
          dispute_reason,
          dispute_evidence_urls,
          resolution_action,
          resolution_note
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13::jsonb,
          $14,
          $15::jsonb,
          $16,
          $17
        )
      `,
      [
        job.id,
        index,
        milestone.title,
        milestone.deliverable,
        milestone.amount,
        milestone.dueAt === undefined ? null : String(milestone.dueAt),
        milestone.status,
        milestone.deliveredAt === undefined
          ? null
          : String(milestone.deliveredAt),
        milestone.releasedAt === undefined
          ? null
          : String(milestone.releasedAt),
        milestone.disputedAt === undefined
          ? null
          : String(milestone.disputedAt),
        milestone.resolvedAt === undefined
          ? null
          : String(milestone.resolvedAt),
        milestone.deliveryNote ?? null,
        JSON.stringify(milestone.deliveryEvidenceUrls ?? []),
        milestone.disputeReason ?? null,
        JSON.stringify(milestone.disputeEvidenceUrls ?? []),
        milestone.resolutionAction ?? null,
        milestone.resolutionNote ?? null,
      ],
    );
  }

  await client.query('DELETE FROM escrow_audit_events WHERE job_id = $1', [
    job.id,
  ]);
  for (const [index, event] of job.audit.entries()) {
    await client.query(
      `
        INSERT INTO escrow_audit_events (job_id, event_index, type, at_ms, payload)
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        job.id,
        index,
        event.type,
        String(event.at),
        JSON.stringify(event.payload),
      ],
    );
  }

  await client.query('DELETE FROM escrow_executions WHERE job_id = $1', [
    job.id,
  ]);
  for (const execution of job.executions) {
    await client.query(
      `
        INSERT INTO escrow_executions (
          job_id,
          execution_id,
          action,
          actor_address,
          chain_id,
          contract_address,
          request_id,
          correlation_id,
          idempotency_key,
          operation_key,
          tx_hash,
          status,
          block_number,
          submitted_at_ms,
          confirmed_at_ms,
          milestone_index,
          escrow_id,
          failure_code,
          failure_message
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          $17,
          $18,
          $19
        )
      `,
      [
        job.id,
        execution.id,
        execution.action,
        execution.actorAddress,
        execution.chainId,
        execution.contractAddress,
        execution.requestId ?? null,
        execution.correlationId ?? null,
        execution.idempotencyKey ?? null,
        execution.operationKey ?? null,
        execution.txHash ?? null,
        execution.status,
        execution.blockNumber === undefined
          ? null
          : String(execution.blockNumber),
        String(execution.submittedAt),
        execution.confirmedAt === undefined
          ? null
          : String(execution.confirmedAt),
        execution.milestoneIndex ?? null,
        execution.escrowId ?? null,
        execution.failureCode ?? null,
        execution.failureMessage ?? null,
      ],
    );
  }
}

export class PostgresUsersRepository implements UsersRepository {
  constructor(private readonly db: PostgresDatabaseService) {}

  async getByEmail(email: string) {
    return this.getUser(
      `
        SELECT
          id,
          email,
          shariah_mode,
          default_execution_wallet_address,
          active_workspace_id,
          created_at_ms,
          updated_at_ms
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email.trim().toLowerCase()],
    );
  }

  async getById(id: string) {
    return this.getUser(
      `
        SELECT
          id,
          email,
          shariah_mode,
          default_execution_wallet_address,
          active_workspace_id,
          created_at_ms,
          updated_at_ms
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
  }

  async getByWalletAddress(address: string) {
    return this.getUser(
      `
        SELECT
          u.id,
          u.email,
          u.shariah_mode,
          u.default_execution_wallet_address,
          u.active_workspace_id,
          u.created_at_ms,
          u.updated_at_ms
        FROM users u
        INNER JOIN user_wallets w ON w.user_id = u.id
        WHERE w.address = $1
        LIMIT 1
      `,
      [address],
    );
  }

  async create(user: UserRecord) {
    return this.db.transaction(async (client) => {
      const result = await client.query<UserRow>(
        `
          INSERT INTO users (
            id,
            email,
            shariah_mode,
            default_execution_wallet_address,
            active_workspace_id,
            created_at_ms,
            updated_at_ms
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING
            id,
            email,
            shariah_mode,
            default_execution_wallet_address,
            active_workspace_id,
            created_at_ms,
            updated_at_ms
        `,
        [
          user.id,
          user.email,
          user.shariahMode,
          user.defaultExecutionWalletAddress,
          user.activeWorkspaceId,
          String(user.createdAt),
          String(user.updatedAt),
        ],
      );
      await replaceUserWallets(client, user);
      return this.composeUser(result.rows[0], user.wallets);
    });
  }

  async update(user: UserRecord) {
    return this.db.transaction(async (client) => {
      const result = await client.query<UserRow>(
        `
          UPDATE users
          SET
            email = $2,
            shariah_mode = $3,
            default_execution_wallet_address = $4,
            active_workspace_id = $5,
            updated_at_ms = $6
          WHERE id = $1
          RETURNING
            id,
            email,
            shariah_mode,
            default_execution_wallet_address,
            active_workspace_id,
            created_at_ms,
            updated_at_ms
        `,
        [
          user.id,
          user.email,
          user.shariahMode,
          user.defaultExecutionWalletAddress,
          user.activeWorkspaceId,
          String(user.updatedAt),
        ],
      );
      await replaceUserWallets(client, user);
      return this.composeUser(result.rows[0], user.wallets);
    });
  }

  private async getUser(text: string, values: unknown[]) {
    const result = await this.db.query<UserRow>(text, values);
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const wallets = await this.listWallets(row.id);
    return this.composeUser(row, wallets);
  }

  private async listWallets(userId: string) {
    const result = await this.db.query<UserWalletRow>(
      `
        SELECT
          user_id,
          address,
          wallet_kind,
          label,
          verification_method,
          verification_chain_id,
          verified_at_ms,
          owner_address,
          recovery_address,
          chain_id,
          provider_kind,
          entry_point_address,
          factory_address,
          sponsorship_policy,
          provisioned_at_ms,
          created_at_ms,
          updated_at_ms
        FROM user_wallets
        WHERE user_id = $1
        ORDER BY created_at_ms ASC, address ASC
      `,
      [userId],
    );
    return result.rows.map(mapUserWallet);
  }

  private composeUser(row: UserRow, wallets: UserRecord['wallets']) {
    return {
      ...mapUser(row),
      wallets: wallets.map((wallet) => ({ ...wallet })),
    };
  }
}

async function replaceUserWallets(client: PoolClient, user: UserRecord) {
  await client.query('DELETE FROM user_wallets WHERE user_id = $1', [user.id]);

  for (const wallet of user.wallets) {
    await client.query(
      `
        INSERT INTO user_wallets (
          user_id,
          address,
          wallet_kind,
          label,
          verification_method,
          verification_chain_id,
          verified_at_ms,
          owner_address,
          recovery_address,
          chain_id,
          provider_kind,
          entry_point_address,
          factory_address,
          sponsorship_policy,
          provisioned_at_ms,
          created_at_ms,
          updated_at_ms
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          $17
        )
      `,
      [
        user.id,
        wallet.address,
        wallet.walletKind,
        wallet.label ?? null,
        wallet.walletKind === 'eoa' ? wallet.verificationMethod : null,
        wallet.walletKind === 'eoa'
          ? (wallet.verificationChainId ?? null)
          : null,
        wallet.walletKind === 'eoa' ? String(wallet.verifiedAt) : null,
        wallet.walletKind === 'smart_account' ? wallet.ownerAddress : null,
        wallet.walletKind === 'smart_account' ? wallet.recoveryAddress : null,
        wallet.walletKind === 'smart_account' ? wallet.chainId : null,
        wallet.walletKind === 'smart_account' ? wallet.providerKind : null,
        wallet.walletKind === 'smart_account' ? wallet.entryPointAddress : null,
        wallet.walletKind === 'smart_account' ? wallet.factoryAddress : null,
        wallet.walletKind === 'smart_account' ? wallet.sponsorshipPolicy : null,
        wallet.walletKind === 'smart_account'
          ? String(wallet.provisionedAt)
          : null,
        String(wallet.createdAt),
        String(wallet.updatedAt),
      ],
    );
  }
}

export class PostgresOtpRepository implements OtpRepository {
  constructor(private readonly db: PostgresDatabaseService) {}

  async getByEmail(email: string) {
    const result = await this.db.query<OtpRow>(
      `
        SELECT
          email,
          hash,
          salt,
          expires_at_ms,
          attempts,
          locked_until_ms,
          last_sent_at_ms,
          send_window_start_ms,
          send_window_count
        FROM auth_otp_entries
        WHERE email = $1
        LIMIT 1
      `,
      [email.trim().toLowerCase()],
    );
    return result.rows[0] ? mapOtp(result.rows[0]) : null;
  }

  async set(entry: OtpEntry) {
    await this.db.query(
      `
        INSERT INTO auth_otp_entries (
          email,
          hash,
          salt,
          expires_at_ms,
          attempts,
          locked_until_ms,
          last_sent_at_ms,
          send_window_start_ms,
          send_window_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (email) DO UPDATE
        SET
          hash = EXCLUDED.hash,
          salt = EXCLUDED.salt,
          expires_at_ms = EXCLUDED.expires_at_ms,
          attempts = EXCLUDED.attempts,
          locked_until_ms = EXCLUDED.locked_until_ms,
          last_sent_at_ms = EXCLUDED.last_sent_at_ms,
          send_window_start_ms = EXCLUDED.send_window_start_ms,
          send_window_count = EXCLUDED.send_window_count
      `,
      [
        entry.email.trim().toLowerCase(),
        entry.hash,
        entry.salt,
        String(entry.exp),
        entry.attempts,
        entry.lockedUntil === undefined ? null : String(entry.lockedUntil),
        String(entry.lastSentAt),
        String(entry.sentCountWindow.windowStart),
        entry.sentCountWindow.count,
      ],
    );
  }

  async delete(email: string) {
    await this.db.query('DELETE FROM auth_otp_entries WHERE email = $1', [
      email.trim().toLowerCase(),
    ]);
  }
}

export class PostgresOtpRequestThrottlesRepository
  implements OtpRequestThrottlesRepository
{
  constructor(private readonly db: PostgresDatabaseService) {}

  async get(scope: OtpRequestThrottleRecord['scope'], key: string) {
    const result = await this.db.query<OtpRequestThrottleRow>(
      `
        SELECT
          scope,
          throttle_key,
          window_start_ms,
          request_count,
          updated_at_ms
        FROM auth_otp_request_throttles
        WHERE scope = $1
          AND throttle_key = $2
        LIMIT 1
      `,
      [scope, key.trim().toLowerCase()],
    );
    return result.rows[0] ? mapOtpRequestThrottle(result.rows[0]) : null;
  }

  async set(record: OtpRequestThrottleRecord) {
    await this.db.query(
      `
        INSERT INTO auth_otp_request_throttles (
          scope,
          throttle_key,
          window_start_ms,
          request_count,
          updated_at_ms
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (scope, throttle_key) DO UPDATE
        SET
          window_start_ms = EXCLUDED.window_start_ms,
          request_count = EXCLUDED.request_count,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        record.scope,
        record.key.trim().toLowerCase(),
        String(record.windowStart),
        record.count,
        String(record.updatedAt),
      ],
    );
  }
}

export class PostgresSessionsRepository implements SessionsRepository {
  constructor(private readonly db: PostgresDatabaseService) {}

  async create(session: SessionRecord) {
    const result = await this.db.query<SessionRow>(
      `
        INSERT INTO auth_sessions (
          sid,
          user_id,
          email,
          expires_at_ms,
          refresh_token_id,
          revoked_at_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING sid, user_id, email, expires_at_ms, refresh_token_id, revoked_at_ms
      `,
      [
        session.sid,
        session.userId,
        session.email,
        String(session.exp),
        session.refreshTokenId,
        session.revoked ? String(Date.now()) : null,
      ],
    );
    return mapSession(result.rows[0]);
  }

  async getBySid(sid: string) {
    const result = await this.db.query<SessionRow>(
      `
        SELECT sid, user_id, email, expires_at_ms, refresh_token_id, revoked_at_ms
        FROM auth_sessions
        WHERE sid = $1
        LIMIT 1
      `,
      [sid],
    );
    return result.rows[0] ? mapSession(result.rows[0]) : null;
  }

  async revoke(sid: string) {
    await this.db.query(
      `
        UPDATE auth_sessions
        SET revoked_at_ms = COALESCE(revoked_at_ms, $2)
        WHERE sid = $1
      `,
      [sid, String(Date.now())],
    );
  }

  async rotate(
    sid: string,
    currentRefreshTokenId: string,
    nextRefreshTokenId: string,
  ) {
    const result = await this.db.query<SessionRow>(
      `
        UPDATE auth_sessions
        SET refresh_token_id = $3
        WHERE sid = $1
          AND refresh_token_id = $2
          AND revoked_at_ms IS NULL
          AND expires_at_ms >= $4
        RETURNING sid, user_id, email, expires_at_ms, refresh_token_id, revoked_at_ms
      `,
      [sid, currentRefreshTokenId, nextRefreshTokenId, String(Date.now())],
    );
    return result.rows[0] ? mapSession(result.rows[0]) : null;
  }
}

export class PostgresWalletLinkChallengesRepository
  implements WalletLinkChallengesRepository
{
  constructor(private readonly db: PostgresDatabaseService) {}

  async create(challenge: WalletLinkChallengeRecord) {
    await this.db.query(
      `
        INSERT INTO wallet_link_challenges (
          id,
          user_id,
          address,
          wallet_kind,
          label,
          chain_id,
          nonce,
          message,
          issued_at_ms,
          expires_at_ms,
          failed_attempts,
          consumed_at_ms,
          last_failed_at_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
        challenge.id,
        challenge.userId,
        challenge.address,
        challenge.walletKind,
        challenge.label ?? null,
        challenge.chainId,
        challenge.nonce,
        challenge.message,
        String(challenge.issuedAt),
        String(challenge.expiresAt),
        challenge.failedAttempts,
        challenge.consumedAt === undefined
          ? null
          : String(challenge.consumedAt),
        challenge.lastFailedAt === undefined
          ? null
          : String(challenge.lastFailedAt),
      ],
    );
  }

  async getById(challengeId: string) {
    const result = await this.db.query<WalletLinkChallengeRow>(
      `
        SELECT
          id,
          user_id,
          address,
          wallet_kind,
          label,
          chain_id,
          nonce,
          message,
          issued_at_ms,
          expires_at_ms,
          failed_attempts,
          consumed_at_ms,
          last_failed_at_ms
        FROM wallet_link_challenges
        WHERE id = $1
        LIMIT 1
      `,
      [challengeId],
    );
    return result.rows[0] ? mapWalletLinkChallenge(result.rows[0]) : null;
  }

  async recordFailedAttempt(challengeId: string, failedAt: number) {
    await this.db.query(
      `
        UPDATE wallet_link_challenges
        SET
          failed_attempts = failed_attempts + 1,
          last_failed_at_ms = $2
        WHERE id = $1 AND consumed_at_ms IS NULL
      `,
      [challengeId, String(failedAt)],
    );
  }

  async markConsumed(challengeId: string, consumedAt: number) {
    await this.db.query(
      `
        UPDATE wallet_link_challenges
        SET consumed_at_ms = COALESCE(consumed_at_ms, $2)
        WHERE id = $1
      `,
      [challengeId, String(consumedAt)],
    );
  }
}

export class PostgresEscrowRepository implements EscrowRepository {
  constructor(private readonly db: PostgresDatabaseService) {}

  async create(job: EscrowJobRecord) {
    await this.db.transaction((client) => replaceEscrowAggregate(client, job));
  }

  async getById(jobId: string) {
    return this.db.transaction(async (client) => {
      const jobResult = await client.query<JobRow>(
        `
          SELECT
            id,
            title,
            description,
            category,
            terms_json,
            job_hash,
            funded_amount,
            status,
            created_at_ms,
            updated_at_ms,
            chain_id,
            contract_address,
            onchain_escrow_id,
            client_address,
            worker_address,
            currency_address,
            contractor_participation_json,
            operations_json,
            project_room_json
          FROM escrow_jobs
          WHERE id = $1
          LIMIT 1
        `,
        [jobId],
      );
      const jobRow = jobResult.rows[0];
      if (!jobRow) {
        return null;
      }

      const milestoneResult = await client.query<MilestoneRow>(
        `
          SELECT
            milestone_index,
            title,
            deliverable,
            amount,
            due_at_ms,
            status,
            delivered_at_ms,
            released_at_ms,
            disputed_at_ms,
            resolved_at_ms,
            delivery_note,
            delivery_evidence_urls,
            dispute_reason,
            dispute_evidence_urls,
            resolution_action,
            resolution_note
          FROM escrow_milestones
          WHERE job_id = $1
          ORDER BY milestone_index ASC
        `,
        [jobId],
      );

      const auditResult = await client.query<AuditRow>(
        `
          SELECT event_index, type, at_ms, payload
          FROM escrow_audit_events
          WHERE job_id = $1
          ORDER BY event_index ASC
        `,
        [jobId],
      );

      const executionResult = await client.query<ExecutionRow>(
        `
          SELECT
            execution_id,
            action,
            actor_address,
            chain_id,
            contract_address,
            request_id,
            correlation_id,
            idempotency_key,
            operation_key,
            tx_hash,
            status,
            block_number,
            submitted_at_ms,
            confirmed_at_ms,
            milestone_index,
            escrow_id,
            failure_code,
            failure_message
          FROM escrow_executions
          WHERE job_id = $1
          ORDER BY submitted_at_ms ASC, execution_id ASC
        `,
        [jobId],
      );

      return {
        id: jobRow.id,
        title: jobRow.title,
        description: jobRow.description,
        category: jobRow.category,
        termsJSON: jobRow.terms_json,
        jobHash: jobRow.job_hash,
        fundedAmount: jobRow.funded_amount,
        status: jobRow.status,
        createdAt: Number(jobRow.created_at_ms),
        updatedAt: Number(jobRow.updated_at_ms),
        milestones: milestoneResult.rows.map(mapMilestone),
        audit: auditResult.rows.map(mapAudit),
        onchain: mapOnchain(jobRow),
        contractorParticipation: mapContractorParticipation(jobRow),
        operations: mapOperations(jobRow),
        projectRoom: mapProjectRoom(jobRow),
        executions: executionResult.rows.map(mapExecution),
      } satisfies EscrowJobRecord;
    });
  }

  async findExecutionByIdempotencyKey(input: {
    idempotencyKey: string;
    jobId?: string;
  }) {
    const result = await this.db.query<{
      job_id: string;
      execution_id: string;
    }>(
      `
        SELECT job_id, execution_id
        FROM escrow_executions
        WHERE idempotency_key = $1
          AND ($2::uuid IS NULL OR job_id = $2::uuid)
        ORDER BY submitted_at_ms DESC, execution_id DESC
        LIMIT 1
      `,
      [input.idempotencyKey, input.jobId ?? null],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const job = await this.getById(row.job_id);
    if (!job) {
      return null;
    }
    const execution = job.executions.find(
      (candidate) => candidate.id === row.execution_id,
    );
    if (!execution) {
      return null;
    }

    return {
      job,
      execution,
    };
  }

  async listAll() {
    return this.db.transaction(async (client) => {
      const result = await client.query<JobRow>(
        `
          SELECT
            id,
            title,
            description,
            category,
            terms_json,
            job_hash,
            funded_amount,
            status,
            created_at_ms,
            updated_at_ms,
            chain_id,
            contract_address,
            onchain_escrow_id,
            client_address,
            worker_address,
            currency_address,
            contractor_participation_json,
            operations_json,
            project_room_json
          FROM escrow_jobs
          ORDER BY updated_at_ms DESC, created_at_ms DESC, id ASC
        `,
      );

      const jobs = await Promise.all(
        result.rows.map(async (jobRow) => {
          const [milestones, audit, executions] = await Promise.all([
            client.query<MilestoneRow>(
              `
                SELECT
                  milestone_index,
                  title,
                  deliverable,
                  amount,
                  due_at_ms,
                  status,
                  delivered_at_ms,
                  released_at_ms,
                  disputed_at_ms,
                  resolved_at_ms,
                  delivery_note,
                  delivery_evidence_urls,
                  dispute_reason,
                  dispute_evidence_urls,
                  resolution_action,
                  resolution_note
                FROM escrow_milestones
                WHERE job_id = $1
                ORDER BY milestone_index ASC
              `,
              [jobRow.id],
            ),
            client.query<AuditRow>(
              `
                SELECT event_index, type, at_ms, payload
                FROM escrow_audit_events
                WHERE job_id = $1
                ORDER BY event_index ASC
              `,
              [jobRow.id],
            ),
            client.query<ExecutionRow>(
              `
                SELECT
                  execution_id,
                  action,
                  actor_address,
                  chain_id,
                  contract_address,
                  request_id,
                  correlation_id,
                  idempotency_key,
                  operation_key,
                  tx_hash,
                  status,
                  block_number,
                  submitted_at_ms,
                  confirmed_at_ms,
                  milestone_index,
                  escrow_id,
                  failure_code,
                  failure_message
                FROM escrow_executions
                WHERE job_id = $1
                ORDER BY submitted_at_ms ASC, execution_id ASC
              `,
              [jobRow.id],
            ),
          ]);

          return {
            id: jobRow.id,
            title: jobRow.title,
            description: jobRow.description,
            category: jobRow.category,
            termsJSON: jobRow.terms_json,
            jobHash: jobRow.job_hash,
            fundedAmount: jobRow.funded_amount,
            status: jobRow.status,
            createdAt: Number(jobRow.created_at_ms),
            updatedAt: Number(jobRow.updated_at_ms),
            milestones: milestones.rows.map(mapMilestone),
            audit: audit.rows.map(mapAudit),
            contractorParticipation: mapContractorParticipation(jobRow),
            operations: mapOperations(jobRow),
            projectRoom: mapProjectRoom(jobRow),
            onchain: mapOnchain(jobRow),
            executions: executions.rows.map(mapExecution),
          } satisfies EscrowJobRecord;
        }),
      );

      return jobs;
    });
  }

  async listByParticipantAddresses(addresses: string[]) {
    if (addresses.length === 0) {
      return [];
    }

    return this.db.transaction(async (client) => {
      const result = await client.query<JobRow>(
        `
          SELECT
            id,
            title,
            description,
            category,
            terms_json,
            job_hash,
            funded_amount,
            status,
            created_at_ms,
            updated_at_ms,
            chain_id,
            contract_address,
            onchain_escrow_id,
            client_address,
            worker_address,
            currency_address,
            contractor_participation_json,
            operations_json,
            project_room_json
          FROM escrow_jobs
          WHERE client_address = ANY($1::text[]) OR worker_address = ANY($1::text[])
          ORDER BY updated_at_ms DESC, created_at_ms DESC, id ASC
        `,
        [addresses],
      );

      const jobs = await Promise.all(
        result.rows.map(async (jobRow) => {
          const [milestones, audit, executions] = await Promise.all([
            client.query<MilestoneRow>(
              `
                SELECT
                  milestone_index,
                  title,
                  deliverable,
                  amount,
                  due_at_ms,
                  status,
                  delivered_at_ms,
                  released_at_ms,
                  disputed_at_ms,
                  resolved_at_ms,
                  delivery_note,
                  delivery_evidence_urls,
                  dispute_reason,
                  dispute_evidence_urls,
                  resolution_action,
                  resolution_note
                FROM escrow_milestones
                WHERE job_id = $1
                ORDER BY milestone_index ASC
              `,
              [jobRow.id],
            ),
            client.query<AuditRow>(
              `
                SELECT event_index, type, at_ms, payload
                FROM escrow_audit_events
                WHERE job_id = $1
                ORDER BY event_index ASC
              `,
              [jobRow.id],
            ),
            client.query<ExecutionRow>(
              `
                SELECT
                  execution_id,
                  action,
                  actor_address,
                  chain_id,
                  contract_address,
                  request_id,
                  correlation_id,
                  idempotency_key,
                  operation_key,
                  tx_hash,
                  status,
                  block_number,
                  submitted_at_ms,
                  confirmed_at_ms,
                  milestone_index,
                  escrow_id,
                  failure_code,
                  failure_message
                FROM escrow_executions
                WHERE job_id = $1
                ORDER BY submitted_at_ms ASC, execution_id ASC
              `,
              [jobRow.id],
            ),
          ]);

          return {
            id: jobRow.id,
            title: jobRow.title,
            description: jobRow.description,
            category: jobRow.category,
            termsJSON: jobRow.terms_json,
            jobHash: jobRow.job_hash,
            fundedAmount: jobRow.funded_amount,
            status: jobRow.status,
            createdAt: Number(jobRow.created_at_ms),
            updatedAt: Number(jobRow.updated_at_ms),
            milestones: milestones.rows.map(mapMilestone),
            audit: audit.rows.map(mapAudit),
            contractorParticipation: mapContractorParticipation(jobRow),
            operations: mapOperations(jobRow),
            projectRoom: mapProjectRoom(jobRow),
            onchain: mapOnchain(jobRow),
            executions: executions.rows.map(mapExecution),
          } satisfies EscrowJobRecord;
        }),
      );

      return jobs;
    });
  }

  async getChainCursor(input: {
    chainId: number;
    contractAddress: string;
    streamName: EscrowChainCursorRecord['streamName'];
  }) {
    return this.db.transaction(async (client) => {
      const result = await client.query<ChainCursorRow>(
        `
          SELECT
            chain_id,
            contract_address,
            stream_name,
            next_from_block,
            last_finalized_block,
            last_scanned_block,
            last_error,
            updated_at_ms
          FROM escrow_chain_cursors
          WHERE chain_id = $1 AND contract_address = $2 AND stream_name = $3
          LIMIT 1
        `,
        [input.chainId, input.contractAddress, input.streamName],
      );

      return result.rows[0] ? mapChainCursor(result.rows[0]) : null;
    });
  }

  async saveChainCursor(cursor: EscrowChainCursorRecord) {
    await this.db.query(
      `
        INSERT INTO escrow_chain_cursors (
          chain_id,
          contract_address,
          stream_name,
          next_from_block,
          last_finalized_block,
          last_scanned_block,
          last_error,
          updated_at_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (chain_id, contract_address, stream_name) DO UPDATE
        SET
          next_from_block = EXCLUDED.next_from_block,
          last_finalized_block = EXCLUDED.last_finalized_block,
          last_scanned_block = EXCLUDED.last_scanned_block,
          last_error = EXCLUDED.last_error,
          updated_at_ms = EXCLUDED.updated_at_ms
      `,
      [
        cursor.chainId,
        cursor.contractAddress,
        cursor.streamName,
        String(cursor.nextFromBlock),
        cursor.lastFinalizedBlock === null
          ? null
          : String(cursor.lastFinalizedBlock),
        cursor.lastScannedBlock === null
          ? null
          : String(cursor.lastScannedBlock),
        cursor.lastError,
        String(cursor.updatedAt),
      ],
    );
  }

  async upsertChainEvents(events: EscrowChainEventRecord[]) {
    if (events.length === 0) {
      return;
    }

    await this.db.transaction(async (client) => {
      for (const event of events) {
        await client.query(
          `
            INSERT INTO escrow_chain_events (
              chain_id,
              contract_address,
              escrow_id,
              transaction_hash,
              log_index,
              block_number,
              block_hash,
              block_time_ms,
              source,
              ingestion_kind,
              ingested_at_ms,
              correlation_id,
              mirror_status,
              persisted_via,
              event_name,
              payload_json
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb)
            ON CONFLICT (chain_id, contract_address, transaction_hash, log_index) DO UPDATE
            SET
              escrow_id = EXCLUDED.escrow_id,
              block_number = EXCLUDED.block_number,
              block_hash = EXCLUDED.block_hash,
              block_time_ms = EXCLUDED.block_time_ms,
              source = EXCLUDED.source,
              ingestion_kind = EXCLUDED.ingestion_kind,
              ingested_at_ms = EXCLUDED.ingested_at_ms,
              correlation_id = EXCLUDED.correlation_id,
              mirror_status = EXCLUDED.mirror_status,
              persisted_via = EXCLUDED.persisted_via,
              event_name = EXCLUDED.event_name,
              payload_json = EXCLUDED.payload_json
          `,
          [
            event.chainId,
            event.contractAddress,
            event.escrowId,
            event.transactionHash,
            event.logIndex,
            String(event.blockNumber),
            event.blockHash,
            String(event.blockTimeMs),
            event.source,
            event.ingestionKind,
            event.ingestedAt === null ? null : String(event.ingestedAt),
            event.correlationId,
            event.mirrorStatus,
            event.persistedVia,
            event.payload.eventName,
            JSON.stringify(event.payload),
          ],
        );
      }
    });
  }

  async replaceChainEventsInRange(input: {
    chainId: number;
    contractAddress: string;
    fromBlock: number;
    toBlock: number;
    events: EscrowChainEventRecord[];
  }) {
    await this.db.transaction(async (client) => {
      await client.query(
        `
          DELETE FROM escrow_chain_events
          WHERE chain_id = $1
            AND contract_address = $2
            AND block_number >= $3
            AND block_number <= $4
        `,
        [
          input.chainId,
          input.contractAddress,
          String(input.fromBlock),
          String(input.toBlock),
        ],
      );

      for (const event of input.events) {
        await client.query(
          `
            INSERT INTO escrow_chain_events (
              chain_id,
              contract_address,
              escrow_id,
              transaction_hash,
              log_index,
              block_number,
              block_hash,
              block_time_ms,
              source,
              ingestion_kind,
              ingested_at_ms,
              correlation_id,
              mirror_status,
              persisted_via,
              event_name,
              payload_json
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb)
          `,
          [
            event.chainId,
            event.contractAddress,
            event.escrowId,
            event.transactionHash,
            event.logIndex,
            String(event.blockNumber),
            event.blockHash,
            String(event.blockTimeMs),
            event.source,
            event.ingestionKind,
            event.ingestedAt === null ? null : String(event.ingestedAt),
            event.correlationId,
            event.mirrorStatus,
            event.persistedVia,
            event.payload.eventName,
            JSON.stringify(event.payload),
          ],
        );
      }
    });
  }

  async listChainEvents(input: {
    chainId: number;
    contractAddress: string;
    escrowId?: string;
    fromBlock?: number;
    toBlock?: number;
  }) {
    return this.db.transaction(async (client) => {
      const result = await client.query<ChainEventRow>(
        `
          SELECT
            chain_id,
            contract_address,
            escrow_id,
            transaction_hash,
            log_index,
            block_number,
            block_hash,
            block_time_ms,
            source,
            ingestion_kind,
            ingested_at_ms,
            correlation_id,
            mirror_status,
            persisted_via,
            event_name,
            payload_json
          FROM escrow_chain_events
          WHERE chain_id = $1
            AND contract_address = $2
            AND ($3::text IS NULL OR escrow_id = $3)
            AND ($4::bigint IS NULL OR block_number >= $4)
            AND ($5::bigint IS NULL OR block_number <= $5)
          ORDER BY block_number ASC, log_index ASC, transaction_hash ASC
        `,
        [
          input.chainId,
          input.contractAddress,
          input.escrowId ?? null,
          input.fromBlock === undefined ? null : String(input.fromBlock),
          input.toBlock === undefined ? null : String(input.toBlock),
        ],
      );

      return result.rows.map(mapChainEvent);
    });
  }

  async getOnchainProjection(jobId: string) {
    return this.db.transaction(async (client) => {
      const result = await client.query<OnchainProjectionRow>(
        `
          SELECT
            job_id,
            chain_id,
            contract_address,
            escrow_id,
            projected_at_ms,
            last_projected_block,
            last_event_block,
            last_event_count,
            projection_digest,
            projection_health,
            degraded_reason,
            funded_amount,
            status,
            milestones_json,
            chain_audit_json,
            drift_summary_json
          FROM escrow_onchain_projections
          WHERE job_id = $1
          LIMIT 1
        `,
        [jobId],
      );

      return result.rows[0] ? mapOnchainProjection(result.rows[0]) : null;
    });
  }

  async listOnchainProjections(jobIds?: string[]) {
    return this.db.transaction(async (client) => {
      const result = await client.query<OnchainProjectionRow>(
        `
          SELECT
            job_id,
            chain_id,
            contract_address,
            escrow_id,
            projected_at_ms,
            last_projected_block,
            last_event_block,
            last_event_count,
            projection_digest,
            projection_health,
            degraded_reason,
            funded_amount,
            status,
            milestones_json,
            chain_audit_json,
            drift_summary_json
          FROM escrow_onchain_projections
          WHERE ($1::uuid[] IS NULL OR job_id = ANY($1::uuid[]))
          ORDER BY projected_at_ms DESC, job_id ASC
        `,
        [jobIds && jobIds.length > 0 ? jobIds : null],
      );

      return result.rows.map(mapOnchainProjection);
    });
  }

  async saveOnchainProjection(projection: EscrowOnchainProjectionRecord) {
    await this.db.query(
      `
        INSERT INTO escrow_onchain_projections (
          job_id,
          chain_id,
          contract_address,
          escrow_id,
          projected_at_ms,
          last_projected_block,
          last_event_block,
          last_event_count,
          projection_digest,
          projection_health,
          degraded_reason,
          funded_amount,
          status,
          milestones_json,
          chain_audit_json,
          drift_summary_json
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16::jsonb
        )
        ON CONFLICT (job_id) DO UPDATE
        SET
          chain_id = EXCLUDED.chain_id,
          contract_address = EXCLUDED.contract_address,
          escrow_id = EXCLUDED.escrow_id,
          projected_at_ms = EXCLUDED.projected_at_ms,
          last_projected_block = EXCLUDED.last_projected_block,
          last_event_block = EXCLUDED.last_event_block,
          last_event_count = EXCLUDED.last_event_count,
          projection_digest = EXCLUDED.projection_digest,
          projection_health = EXCLUDED.projection_health,
          degraded_reason = EXCLUDED.degraded_reason,
          funded_amount = EXCLUDED.funded_amount,
          status = EXCLUDED.status,
          milestones_json = EXCLUDED.milestones_json,
          chain_audit_json = EXCLUDED.chain_audit_json,
          drift_summary_json = EXCLUDED.drift_summary_json
      `,
      [
        projection.jobId,
        projection.chainId,
        projection.contractAddress,
        projection.escrowId,
        String(projection.projectedAt),
        projection.lastProjectedBlock === null
          ? null
          : String(projection.lastProjectedBlock),
        projection.lastEventBlock === null
          ? null
          : String(projection.lastEventBlock),
        projection.lastEventCount,
        projection.digest,
        projection.health,
        projection.degradedReason,
        projection.fundedAmount,
        projection.status,
        JSON.stringify(projection.milestones),
        JSON.stringify(projection.chainAudit),
        JSON.stringify(projection.driftSummary),
      ],
    );
  }

  async save(job: EscrowJobRecord) {
    await this.db.transaction((client) => replaceEscrowAggregate(client, job));
  }
}
