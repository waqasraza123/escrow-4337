import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { isCorsOriginAllowed, readCorsOrigins } from '../../common/http/cors';
import {
  createRequestId,
  type RequestExecutionContext,
} from '../../common/http/request-context';
import { normalizeEvmAddress } from '../../common/evm-address';
import { ESCROW_REPOSITORY } from '../../persistence/persistence.tokens';
import type { EscrowRepository } from '../../persistence/persistence.types';
import type {
  ApproveProjectSubmissionDto,
  ContractorInviteDto,
  CreateSupportCaseDto,
  CreateJobDto,
  JoinContractorDto,
  DeliverMilestoneDto,
  DisputeMilestoneDto,
  FundJobDto,
  PostSupportCaseMessageDto,
  PostProjectRoomMessageDto,
  RequestProjectRevisionDto,
  ResolveMilestoneDto,
  SetMilestonesDto,
  UpdateSupportCaseDto,
  SubmitProjectMilestoneDto,
  UpdateContractorEmailDto,
} from './escrow.dto';
import { EscrowContractGatewayError } from './onchain/escrow-contract.errors';
import { ESCROW_CONTRACT_GATEWAY } from './onchain/escrow-contract.tokens';
import type {
  EscrowContractGateway,
  EscrowContractRequestContext,
  EscrowContractReceipt,
} from './onchain/escrow-contract.types';
import { EscrowActorService } from './escrow-actor.service';
import type {
  ContractorInviteResponse,
  ContractorJoinReadinessResponse,
  CreateJobResponse,
  EscrowAuditBundle,
  EscrowAuditEvent,
  EscrowContractorParticipationPublicView,
  EscrowContractorParticipationView,
  EscrowCommercialRecord,
  EscrowCommercialIssueRecord,
  EscrowExecutionRecord,
  EscrowParticipantRole,
  EscrowProjectActivityView,
  EscrowProjectDeliverSubmissionResponse,
  EscrowProjectMessageResponse,
  EscrowProjectMessageView,
  EscrowProjectRoomActivityView,
  EscrowProjectRoomRecord,
  EscrowProjectRoomResponse,
  EscrowProjectSubmissionRecord,
  EscrowProjectSubmissionResponse,
  EscrowProjectSubmissionView,
  EscrowSupportCaseResponse,
  EscrowSupportCaseSeverity,
  EscrowSupportCaseStatus,
  EscrowSupportCaseView,
  EscrowSupportOperationsDashboardResponse,
  FundJobResponse,
  EscrowJobRecord,
  EscrowJobSupportOperationsResponse,
  EscrowJobsListResponse,
  EscrowJobView,
  EscrowPublicJobView,
  JoinContractorResponse,
  MilestoneMutationResponse,
  SetMilestonesResponse,
  UpdateContractorEmailResponse,
} from './escrow.types';
import { EmailService } from '../auth/email.service';
import { EscrowOnchainAuthorityService } from '../operations/escrow-onchain-authority.service';
import { UserCapabilitiesService } from '../users/user-capabilities.service';
import { UsersService } from '../users/users.service';
import { buildEscrowExportDocument } from './escrow-export';

const MINOR_UNIT_SCALE = 1_000_000n;
const amountPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/;

function parseAmountToMinorUnits(amount: string): bigint {
  if (!amountPattern.test(amount)) {
    throw new BadRequestException('Invalid amount format');
  }

  const [wholePart, fractionalPart = ''] = amount.split('.');
  const normalizedFraction = fractionalPart.padEnd(6, '0').slice(0, 6);
  const minorUnits =
    BigInt(wholePart) * MINOR_UNIT_SCALE + BigInt(normalizedFraction);

  if (minorUnits <= 0n) {
    throw new BadRequestException('Amount must be greater than zero');
  }

  return minorUnits;
}

function normalizeAmount(amount: string): string {
  const minorUnits = parseAmountToMinorUnits(amount);
  const wholeUnits = minorUnits / MINOR_UNIT_SCALE;
  const fractionalUnits = (minorUnits % MINOR_UNIT_SCALE)
    .toString()
    .padStart(6, '0')
    .replace(/0+$/, '');

  return fractionalUnits.length > 0
    ? `${wholeUnits.toString()}.${fractionalUnits}`
    : wholeUnits.toString();
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return `{${entries
      .map(
        ([key, nestedValue]) =>
          `${JSON.stringify(key)}:${stableSerialize(nestedValue)}`,
      )
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function createEmptyProjectRoom(): EscrowProjectRoomRecord {
  return {
    submissions: [],
    messages: [],
    activity: [],
    supportCases: [],
  };
}

function readPlatformFeeConfig(
  termsJSON: Record<string, unknown>,
): Pick<
  EscrowCommercialRecord['feePolicy'],
  'defaultPlatformFeeBps' | 'effectivePlatformFeeBps' | 'platformFeeLabel'
> {
  const commercialPlan =
    termsJSON.commercialPlan &&
    typeof termsJSON.commercialPlan === 'object' &&
    !Array.isArray(termsJSON.commercialPlan)
      ? (termsJSON.commercialPlan as Record<string, unknown>)
      : null;
  const platformFeeBps =
    typeof commercialPlan?.platformFeeBps === 'number' &&
    Number.isFinite(commercialPlan.platformFeeBps)
      ? Math.max(0, Math.trunc(commercialPlan.platformFeeBps))
      : 250;
  const platformFeeLabel =
    typeof commercialPlan?.platformFeeLabel === 'string' &&
    commercialPlan.platformFeeLabel.trim().length > 0
      ? commercialPlan.platformFeeLabel.trim()
      : `${(platformFeeBps / 100).toFixed(platformFeeBps % 100 === 0 ? 0 : 2)}% client platform fee realized on released milestone amounts.`;

  return {
    defaultPlatformFeeBps: platformFeeBps,
    effectivePlatformFeeBps: platformFeeBps,
    platformFeeLabel,
  };
}

function createInitialCommercial(
  job: Pick<EscrowJobRecord, 'termsJSON' | 'onchain'>,
  now: number,
): EscrowCommercialRecord {
  const feeConfig = readPlatformFeeConfig(job.termsJSON);
  const settlementAsset =
    typeof job.termsJSON.currency === 'string' && job.termsJSON.currency.trim()
      ? job.termsJSON.currency.trim()
      : 'USDC';

  return {
    feePolicy: {
      scheduleId: 'marketplace-phase7-v1',
      feeMode: 'client_platform_fee',
      realizationTrigger: 'milestone_release_or_resolution',
      refundTreatment: 'no_fee_on_refund',
      defaultPlatformFeeBps: feeConfig.defaultPlatformFeeBps,
      effectivePlatformFeeBps: feeConfig.effectivePlatformFeeBps,
      platformFeeLabel: feeConfig.platformFeeLabel,
      treasuryAccountRef: 'ops.base.usdc.primary',
      feeDisclosure:
        'Platform fees are accounted for off-chain and realized only when milestone value is released to the worker.',
      feeDecision: 'default',
      feeDecisionNote: null,
      approvedByUserId: null,
      approvedAt: null,
      updatedAt: now,
    },
    treasuryAccount: {
      accountRef: 'ops.base.usdc.primary',
      label: 'Primary Base USDC treasury',
      settlementAsset,
      network: 'base',
      destinationAddress: job.onchain.clientAddress,
      reconciliationMode: 'offchain_ledger',
      lastReviewedAt: null,
    },
    feeLedger: [],
    payoutLedger: [],
    reconciliation: null,
  };
}

function hashToBytes32(value: unknown) {
  return `0x${createHash('sha256').update(stableSerialize(value)).digest('hex')}`;
}

function createInviteToken() {
  return randomBytes(24).toString('hex');
}

function buildExecutionOperationKey(action: string, payload: unknown) {
  return `${action}_${createHash('sha256')
    .update(stableSerialize(payload))
    .digest('hex')
    .slice(0, 24)}`;
}

function buildExecutionCorrelationId(input: {
  requestId: string;
  action: string;
  operationKey: string;
  idempotencyKey: string | null;
}) {
  return `exec_${createHash('sha256')
    .update(
      stableSerialize({
        requestId: input.requestId,
        action: input.action,
        operationKey: input.operationKey,
        idempotencyKey: input.idempotencyKey,
      }),
    )
    .digest('hex')
    .slice(0, 24)}`;
}

function formatMinorUnits(minorUnits: bigint): string {
  const normalized = minorUnits < 0n ? 0n : minorUnits;
  const wholeUnits = normalized / MINOR_UNIT_SCALE;
  const fractionalUnits = (normalized % MINOR_UNIT_SCALE)
    .toString()
    .padStart(6, '0')
    .replace(/0+$/, '');

  return fractionalUnits.length > 0
    ? `${wholeUnits.toString()}.${fractionalUnits}`
    : wholeUnits.toString();
}

function addAmounts(left: string, right: string): string {
  return formatMinorUnits(
    parseAmountToMinorUnits(left) + parseAmountToMinorUnits(right),
  );
}

function subtractAmounts(left: string, right: string): string {
  const value =
    parseAmountToMinorUnits(left) - parseAmountToMinorUnits(right);
  return formatMinorUnits(value > 0n ? value : 0n);
}

function sumAmounts(values: Array<string | null | undefined>): string {
  return formatMinorUnits(
    values.reduce((total, value) => {
      if (!value) {
        return total;
      }
      return total + parseAmountToMinorUnits(value);
    }, 0n),
  );
}

function amountsEqual(left: string, right: string) {
  return parseAmountToMinorUnits(left) === parseAmountToMinorUnits(right);
}

function calculatePlatformFeeAmount(amount: string, feeBps: number): string {
  if (feeBps <= 0) {
    return '0';
  }
  const amountMinorUnits = parseAmountToMinorUnits(amount);
  const feeMinorUnits = (amountMinorUnits * BigInt(feeBps)) / 10_000n;
  return formatMinorUnits(feeMinorUnits);
}

@Injectable()
export class EscrowService {
  constructor(
    @Inject(ESCROW_REPOSITORY)
    private readonly escrowRepository: EscrowRepository,
    @Inject(ESCROW_CONTRACT_GATEWAY)
    private readonly escrowContractGateway: EscrowContractGateway,
    private readonly escrowActorService: EscrowActorService,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
    private readonly escrowOnchainAuthority: EscrowOnchainAuthorityService,
    private readonly userCapabilities: UserCapabilitiesService,
  ) {}

  async listJobsForUser(userId: string): Promise<EscrowJobsListResponse> {
    const user = await this.usersService.getRequiredById(userId);
    const addresses = Array.from(
      new Set(
        user.wallets.map((wallet) => normalizeEvmAddress(wallet.address)),
      ),
    );

    if (addresses.length === 0) {
      return { jobs: [] };
    }

    const jobs =
      await this.escrowRepository.listByParticipantAddresses(addresses);

    const mergedJobs = await Promise.all(
      jobs.map(async (job) => ({
        job,
        merged: await this.escrowOnchainAuthority.mergeJob(job),
      })),
    );

    return {
      jobs: mergedJobs
        .map(({ job, merged }) => {
          const participantRoles = this.resolveParticipantRoles(job, user);

          if (participantRoles.length === 0) {
            return null;
          }

          return {
            job: this.toJobView(merged.job),
            participantRoles,
          };
        })
        .filter((job): job is EscrowJobsListResponse['jobs'][number] =>
          Boolean(job),
        )
        .sort((left, right) => right.job.updatedAt - left.job.updatedAt),
    };
  }

  async createJob(
    userId: string,
    dto: CreateJobDto,
    requestContext?: RequestExecutionContext,
  ): Promise<CreateJobResponse> {
    const now = Date.now();
    const jobId = randomUUID();
    const jobHash = this.createJobHash(dto);
    const actorAddress =
      await this.escrowActorService.resolveClientForCreate(userId);
    const workerAddress = normalizeEvmAddress(dto.workerAddress);
    const currencyAddress = normalizeEvmAddress(dto.currencyAddress);
    const executionContext = this.createExecutionContext(
      'create_job',
      {
        actorAddress,
        workerAddress,
        currencyAddress,
        jobHash,
        contractorEmail: dto.contractorEmail,
        category: dto.category.trim().toLowerCase(),
      },
      requestContext,
    );
    const replayedCreate = executionContext.idempotencyKey
      ? await this.escrowRepository.findExecutionByIdempotencyKey({
          idempotencyKey: executionContext.idempotencyKey,
        })
      : null;

    if (replayedCreate) {
      this.assertIdempotentExecutionMatches(
        replayedCreate.execution,
        'create_job',
        executionContext.operationKey,
      );
      if (replayedCreate.execution.status === 'confirmed') {
        return {
          jobId: replayedCreate.job.id,
          jobHash: replayedCreate.job.jobHash,
          status: replayedCreate.job.status,
          escrowId: this.requireEscrowId(replayedCreate.job),
          txHash: this.requireExecutionTxHash(replayedCreate.execution),
        };
      }

      throw this.mapPersistedExecutionError(replayedCreate.execution);
    }

    const createdJob = await this.escrowContractGateway.createJob({
      actorAddress,
      workerAddress,
      currencyAddress,
      jobHash,
      requestContext: executionContext,
    });

    const job: EscrowJobRecord = {
      id: jobId,
      title: dto.title,
      description: dto.description,
      category: dto.category.trim().toLowerCase(),
      termsJSON: cloneValue(dto.termsJSON),
      jobHash,
      fundedAmount: null,
      status: 'draft',
      createdAt: now,
      updatedAt: createdJob.confirmedAt,
      contractorParticipation: {
        contractorEmail: dto.contractorEmail,
        status: 'pending',
        joinedUserId: null,
        joinedAt: null,
        invite: {
          token: createInviteToken(),
          tokenIssuedAt: now,
          lastSentAt: null,
          lastSentMode: null,
        },
      },
      milestones: [],
      audit: [],
      operations: {
        chainSync: null,
        executionFailureWorkflow: null,
        staleWorkflow: null,
        commercial: null,
      },
      projectRoom: createEmptyProjectRoom(),
      onchain: {
        chainId: createdJob.chainId,
        contractAddress: createdJob.contractAddress,
        escrowId: createdJob.escrowId,
        clientAddress: actorAddress,
        workerAddress,
        currencyAddress,
      },
      executions: [],
    };
    job.operations.commercial = createInitialCommercial(job, now);
    this.refreshCommercialReconciliation(job, now);

    this.appendAudit(job, {
      type: 'job.created',
      at: createdJob.confirmedAt,
      payload: {
        jobId,
        category: job.category,
        escrowId: createdJob.escrowId,
      },
    });
    this.appendAudit(job, {
      type: 'job.contractor_participation_requested',
      at: createdJob.confirmedAt,
      payload: {
        jobId,
        workerAddress,
      },
    });
    this.appendExecution(
      job,
      this.createConfirmedExecution(
        'create_job',
        actorAddress,
        createdJob,
        executionContext,
        {
          escrowId: createdJob.escrowId,
        },
      ),
    );

    await this.escrowRepository.create(job);

    return {
      jobId,
      jobHash,
      status: job.status,
      escrowId: createdJob.escrowId,
      txHash: createdJob.txHash,
    };
  }

  async inviteContractor(
    userId: string,
    jobId: string,
    dto: ContractorInviteDto,
  ): Promise<ContractorInviteResponse> {
    const job = await this.getJobOrThrow(jobId);
    await this.escrowActorService.resolveClientForJob(userId, job);
    const participation = this.requirePendingContractorParticipation(job);
    const user = await this.usersService.getRequiredById(userId);
    const regenerated = dto.regenerate === true || !participation.invite.token;
    const token = regenerated
      ? this.rotateInviteToken(participation, Date.now())
      : (participation.invite.token ??
        this.rotateInviteToken(participation, Date.now()));
    const joinUrl = this.buildContractorJoinUrl(
      job.id,
      token,
      dto.frontendOrigin,
    );
    const sentAt = Date.now();

    participation.invite.lastSentAt = sentAt;
    participation.invite.lastSentMode = dto.delivery;
    job.updatedAt = sentAt;

    if (dto.delivery === 'email') {
      await this.emailService.sendContractorInvite({
        email: participation.contractorEmail,
        joinUrl,
        clientEmail: user.email,
        jobTitle: job.title,
        workerAddress: job.onchain.workerAddress,
      });
    }

    this.appendAudit(job, {
      type: 'job.contractor_invite_sent',
      at: sentAt,
      payload: {
        jobId: job.id,
        delivery: dto.delivery,
        regenerated,
      },
    });
    await this.escrowRepository.save(job);

    return {
      jobId: job.id,
      contractorParticipation:
        this.toContractorParticipationView(participation)!,
      invite: {
        contractorEmail: participation.contractorEmail,
        delivery: dto.delivery,
        joinUrl,
        regenerated,
        sentAt,
      },
    };
  }

  async updateContractorEmail(
    userId: string,
    jobId: string,
    dto: UpdateContractorEmailDto,
  ): Promise<UpdateContractorEmailResponse> {
    const job = await this.getJobOrThrow(jobId);
    await this.escrowActorService.resolveClientForJob(userId, job);
    const participation = this.requirePendingContractorParticipation(job);

    if (participation.contractorEmail === dto.contractorEmail) {
      return {
        jobId: job.id,
        contractorParticipation:
          this.toContractorParticipationView(participation)!,
      };
    }

    const now = Date.now();
    participation.contractorEmail = dto.contractorEmail;
    participation.invite.lastSentAt = null;
    participation.invite.lastSentMode = null;
    this.rotateInviteToken(participation, now);
    job.updatedAt = now;
    this.appendAudit(job, {
      type: 'job.contractor_email_updated',
      at: now,
      payload: {
        jobId: job.id,
      },
    });
    await this.escrowRepository.save(job);

    return {
      jobId: job.id,
      contractorParticipation:
        this.toContractorParticipationView(participation)!,
    };
  }

  async getContractorJoinReadiness(
    userId: string,
    jobId: string,
    inviteToken?: string,
  ): Promise<ContractorJoinReadinessResponse> {
    const job = await this.getJobOrThrow(jobId);
    const participation = this.requireContractorParticipation(job);
    const user = await this.usersService.getRequiredById(userId);
    const linkedWalletAddresses = user.wallets.map((wallet) =>
      normalizeEvmAddress(wallet.address),
    );

    if (participation.status === 'joined') {
      return {
        jobId: job.id,
        status:
          participation.joinedUserId === user.id
            ? 'joined'
            : 'claimed_by_other',
        contractorEmailHint: this.maskEmail(participation.contractorEmail),
        workerAddress: job.onchain.workerAddress,
        linkedWalletAddresses,
        contractorParticipation:
          this.toPublicContractorParticipationView(participation)!,
      };
    }

    if (!inviteToken) {
      return {
        jobId: job.id,
        status: 'invite_required',
        contractorEmailHint: this.maskEmail(participation.contractorEmail),
        workerAddress: job.onchain.workerAddress,
        linkedWalletAddresses,
        contractorParticipation:
          this.toPublicContractorParticipationView(participation)!,
      };
    }

    if (!this.matchesInviteToken(participation, inviteToken)) {
      return {
        jobId: job.id,
        status: 'invite_invalid',
        contractorEmailHint: this.maskEmail(participation.contractorEmail),
        workerAddress: job.onchain.workerAddress,
        linkedWalletAddresses,
        contractorParticipation:
          this.toPublicContractorParticipationView(participation)!,
      };
    }

    if (user.email !== participation.contractorEmail) {
      return {
        jobId: job.id,
        status: 'wrong_email',
        contractorEmailHint: this.maskEmail(participation.contractorEmail),
        workerAddress: job.onchain.workerAddress,
        linkedWalletAddresses,
        contractorParticipation:
          this.toPublicContractorParticipationView(participation)!,
      };
    }

    if (linkedWalletAddresses.length === 0) {
      return {
        jobId: job.id,
        status: 'wallet_not_linked',
        contractorEmailHint: this.maskEmail(participation.contractorEmail),
        workerAddress: job.onchain.workerAddress,
        linkedWalletAddresses,
        contractorParticipation:
          this.toPublicContractorParticipationView(participation)!,
      };
    }

    if (!linkedWalletAddresses.includes(job.onchain.workerAddress)) {
      return {
        jobId: job.id,
        status: 'wrong_wallet',
        contractorEmailHint: this.maskEmail(participation.contractorEmail),
        workerAddress: job.onchain.workerAddress,
        linkedWalletAddresses,
        contractorParticipation:
          this.toPublicContractorParticipationView(participation)!,
      };
    }

    return {
      jobId: job.id,
      status: 'ready',
      contractorEmailHint: this.maskEmail(participation.contractorEmail),
      workerAddress: job.onchain.workerAddress,
      linkedWalletAddresses,
      contractorParticipation:
        this.toPublicContractorParticipationView(participation)!,
    };
  }

  async fundJob(
    userId: string,
    jobId: string,
    dto: FundJobDto,
    requestContext?: RequestExecutionContext,
  ): Promise<FundJobResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolveClientForJob(
      userId,
      job,
    );
    const fundedAmount = normalizeAmount(dto.amount);
    const replayed = await this.maybeReplayJobMutation({
      job,
      action: 'fund_job',
      requestContext,
      operationKeyPayload: {
        jobId: job.id,
        amount: fundedAmount,
      },
      buildResponse: (execution) => ({
        jobId: job.id,
        fundedAmount: job.fundedAmount,
        status: job.status,
        txHash: this.requireExecutionTxHash(execution),
      }),
    });
    if (replayed) {
      return replayed;
    }

    if (job.fundedAmount !== null) {
      throw new ConflictException('Job has already been funded');
    }

    const fundedAmountMinorUnits = parseAmountToMinorUnits(
      dto.amount,
    ).toString();
    const receipt = await this.executeMutation({
      job,
      action: 'fund_job',
      actorAddress,
      requestContext,
      operationKeyPayload: {
        jobId: job.id,
        amount: fundedAmount,
      },
      operation: (gatewayRequestContext) =>
        this.escrowContractGateway.fundJob({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          amountMinorUnits: fundedAmountMinorUnits,
          requestContext: gatewayRequestContext,
        }),
      onConfirmed: () => {
        const now = Date.now();
        job.fundedAmount = fundedAmount;
        job.updatedAt = now;
        this.syncJobStatus(job);
        this.appendAudit(job, {
          type: 'job.funded',
          at: now,
          payload: {
            jobId,
            amount: fundedAmount,
          },
        });
        this.refreshCommercialReconciliation(job, now);
      },
    });

    return {
      jobId: job.id,
      fundedAmount: job.fundedAmount,
      status: job.status,
      txHash: receipt.txHash,
    };
  }

  async joinContractor(
    userId: string,
    jobId: string,
    dto: JoinContractorDto,
  ): Promise<JoinContractorResponse> {
    const job = await this.getJobOrThrow(jobId);
    const participation = this.requireContractorParticipation(job);
    const user = await this.usersService.getRequiredById(userId);

    if (participation.status === 'joined') {
      if (participation.joinedUserId === user.id) {
        return {
          jobId: job.id,
          contractorParticipation:
            this.toPublicContractorParticipationView(participation)!,
        };
      }

      throw new ConflictException(
        'Contractor participation has already been claimed',
      );
    }

    if (!this.matchesInviteToken(participation, dto.inviteToken)) {
      throw new ForbiddenException(
        'Contractor invite link is missing or no longer valid',
      );
    }

    if (user.email !== participation.contractorEmail) {
      throw new ForbiddenException(
        'Authenticated email must match the pending contractor email',
      );
    }

    if (
      !this.usersService.userHasWalletAddress(user, job.onchain.workerAddress)
    ) {
      throw new ForbiddenException(
        `Link ${job.onchain.workerAddress} before joining this contract`,
      );
    }

    const now = Date.now();
    participation.status = 'joined';
    participation.joinedUserId = user.id;
    participation.joinedAt = now;
    participation.invite.token = null;
    participation.invite.tokenIssuedAt = null;
    job.updatedAt = now;
    this.appendAudit(job, {
      type: 'job.contractor_joined',
      at: now,
      payload: {
        jobId: job.id,
        workerAddress: job.onchain.workerAddress,
      },
    });
    await this.escrowRepository.save(job);

    return {
      jobId: job.id,
      contractorParticipation:
        this.toPublicContractorParticipationView(participation)!,
    };
  }

  async getProjectRoom(
    userId: string,
    jobId: string,
  ): Promise<EscrowProjectRoomResponse> {
    const job = await this.getJobOrThrow(jobId);
    const { roles } = await this.requireProjectRoomAccess(job, userId);
    const merged = await this.escrowOnchainAuthority.mergeJob(job);
    return {
      room: await this.toProjectRoomView(job, merged.job, roles),
    };
  }

  async getJobSupportOperations(
    userId: string,
    jobId: string,
  ): Promise<EscrowJobSupportOperationsResponse> {
    const job = await this.getJobOrThrow(jobId);
    const access = await this.requireJobSupportAccess(job, userId);
    return {
      commercial: cloneValue(this.requireCommercial(job)),
      supportCases: await this.toSupportCaseViews(job, access.operatorAccess),
    };
  }

  async listSupportOperations(
    userId: string,
  ): Promise<EscrowSupportOperationsDashboardResponse> {
    await this.userCapabilities.requireCapability(userId, 'escrowOperations');
    const jobs = await this.escrowRepository.listAll();
    const cases = await Promise.all(
      jobs.flatMap((job) =>
        this.ensureProjectRoom(job).supportCases.map(async (supportCase) => ({
          ...(await this.toSupportCaseView(job, supportCase, true)),
          jobTitle: job.title,
          jobStatus: job.status,
        })),
      ),
    );
    const jobViews = jobs
      .map((job) => {
        const room = this.ensureProjectRoom(job);
        const commercial = this.requireCommercial(job);
        const openCases = room.supportCases.filter(
          (supportCase) => supportCase.status !== 'resolved',
        );
        return {
          jobId: job.id,
          title: job.title,
          status: job.status,
          updatedAt: job.updatedAt,
          fundedAmount: job.fundedAmount,
          supportSummary: {
            openCaseCount: openCases.length,
            criticalCaseCount: openCases.filter(
              (supportCase) => supportCase.severity === 'critical',
            ).length,
            latestCaseAt: room.supportCases.reduce<number | null>(
              (latest, supportCase) =>
                latest === null || supportCase.updatedAt > latest
                  ? supportCase.updatedAt
                  : latest,
              null,
            ),
            unresolvedFeeDecisions: openCases.filter(
              (supportCase) => supportCase.reason === 'fee_exception',
            ).length,
          },
          commercial: cloneValue(commercial),
        };
      })
      .sort((left, right) => right.updatedAt - left.updatedAt);

    return {
      summary: {
        openCaseCount: cases.filter((supportCase) => supportCase.status !== 'resolved')
          .length,
        criticalCaseCount: cases.filter(
          (supportCase) =>
            supportCase.status !== 'resolved' &&
            supportCase.severity === 'critical',
        ).length,
        reconciliationAttentionCount: jobViews.filter(
          (job) => job.commercial.reconciliation?.status === 'attention',
        ).length,
        totalRealizedFees: sumAmounts(
          jobViews.map(
            (job) =>
              job.commercial.reconciliation?.recordedRealizedFees ?? '0',
          ),
        ),
        totalWorkerPayouts: sumAmounts(
          jobViews.map((job) =>
            sumAmounts(
              job.commercial.payoutLedger
                .filter((entry) => entry.kind === 'worker_payout')
                .map((entry) => entry.amount),
            ),
          ),
        ),
        totalClientRefunds: sumAmounts(
          jobViews.map((job) =>
            sumAmounts(
              job.commercial.payoutLedger
                .filter((entry) => entry.kind === 'client_refund')
                .map((entry) => entry.amount),
            ),
          ),
        ),
      },
      jobs: jobViews,
      cases: cases.sort((left, right) => right.updatedAt - left.updatedAt),
    };
  }

  async createSupportCase(
    userId: string,
    jobId: string,
    dto: CreateSupportCaseDto,
  ): Promise<EscrowSupportCaseResponse> {
    const job = await this.getJobOrThrow(jobId);
    const { user, role } = await this.requireJobSupportAccess(job, userId);
    const room = this.ensureProjectRoom(job);
    const now = Date.now();
    const supportCase = {
      id: randomUUID(),
      jobId: job.id,
      milestoneIndex: dto.milestoneIndex ?? null,
      reason: dto.reason,
      status: 'open',
      severity:
        dto.severity ?? this.defaultSupportSeverity(dto.reason, job.fundedAmount),
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      createdByUserId: user.id,
      createdByRole: role,
      ownerUserId: null,
      ownerEmail: null,
      feeDecision: null,
      feeDecisionNote: null,
      feeImpactAmount: this.estimateSupportFeeImpact(job, dto.milestoneIndex ?? null),
      openedAt: now,
      updatedAt: now,
      resolvedAt: null,
      messages: [
        {
          id: randomUUID(),
          authorUserId: user.id,
          authorRole: role,
          visibility: 'external',
          body: dto.description.trim(),
          createdAt: now,
        },
      ],
    } satisfies EscrowJobRecord['projectRoom']['supportCases'][number];
    room.supportCases.push(supportCase);
    room.activity.push({
      id: randomUUID(),
      jobId: job.id,
      type: 'support_case_opened',
      actorUserId: user.id,
      actorRole: role === 'operator' ? 'client' : role,
      milestoneIndex: supportCase.milestoneIndex,
      relatedSubmissionId: null,
      summary: `Support case opened: ${supportCase.subject}`,
      detail: supportCase.reason,
      createdAt: now,
    });
    job.updatedAt = now;
    this.refreshCommercialReconciliation(job, now);
    await this.escrowRepository.save(job);
    return {
      supportCase: await this.toSupportCaseView(job, supportCase, false),
    };
  }

  async postSupportCaseMessage(
    userId: string,
    jobId: string,
    caseId: string,
    dto: PostSupportCaseMessageDto,
  ): Promise<EscrowSupportCaseResponse> {
    const job = await this.getJobOrThrow(jobId);
    const { user, role, operatorAccess } = await this.requireJobSupportAccess(
      job,
      userId,
    );
    const supportCase = this.requireSupportCase(job, caseId);
    const visibility =
      dto.visibility === 'internal'
        ? operatorAccess
          ? 'internal'
          : null
        : 'external';
    if (!visibility) {
      throw new ForbiddenException('Only operators can post internal support notes');
    }
    const now = Date.now();
    supportCase.messages.push({
      id: randomUUID(),
      authorUserId: user.id,
      authorRole: role,
      visibility,
      body: dto.body.trim(),
      createdAt: now,
    });
    supportCase.updatedAt = now;
    const room = this.ensureProjectRoom(job);
    room.activity.push({
      id: randomUUID(),
      jobId: job.id,
      type: 'support_case_message_posted',
      actorUserId: user.id,
      actorRole: role === 'operator' ? 'client' : role,
      milestoneIndex: supportCase.milestoneIndex,
      relatedSubmissionId: null,
      summary: `Support case updated: ${supportCase.subject}`,
      detail: visibility === 'internal' ? 'internal note' : dto.body.trim(),
      createdAt: now,
    });
    job.updatedAt = now;
    this.refreshCommercialReconciliation(job, now);
    await this.escrowRepository.save(job);
    return {
      supportCase: await this.toSupportCaseView(job, supportCase, operatorAccess),
    };
  }

  async updateSupportCase(
    userId: string,
    jobId: string,
    caseId: string,
    dto: UpdateSupportCaseDto,
  ): Promise<EscrowSupportCaseResponse> {
    const job = await this.getJobOrThrow(jobId);
    const operator = await this.usersService.getRequiredById(userId);
    await this.userCapabilities.requireCapability(userId, 'escrowOperations');
    const supportCase = this.requireSupportCase(job, caseId);
    const now = Date.now();

    if (dto.status) {
      supportCase.status = dto.status;
      supportCase.resolvedAt = dto.status === 'resolved' ? now : null;
    }
    if (dto.severity) {
      supportCase.severity = dto.severity;
    }
    if (dto.assignToSelf) {
      supportCase.ownerUserId = operator.id;
      supportCase.ownerEmail = operator.email;
    }
    if (dto.feeDecision) {
      supportCase.feeDecision = dto.feeDecision;
      supportCase.feeDecisionNote = dto.feeDecisionNote?.trim() || null;
      this.applyFeeDecision(job, supportCase, operator.id, now);
    } else if (dto.feeDecisionNote !== undefined) {
      supportCase.feeDecisionNote = dto.feeDecisionNote?.trim() || null;
    }
    if (dto.internalNote?.trim()) {
      supportCase.messages.push({
        id: randomUUID(),
        authorUserId: operator.id,
        authorRole: 'operator',
        visibility: 'internal',
        body: dto.internalNote.trim(),
        createdAt: now,
      });
    }
    supportCase.updatedAt = now;
    const room = this.ensureProjectRoom(job);
    room.activity.push({
      id: randomUUID(),
      jobId: job.id,
      type: 'support_case_status_updated',
      actorUserId: operator.id,
      actorRole: 'client',
      milestoneIndex: supportCase.milestoneIndex,
      relatedSubmissionId: null,
      summary: `Support case triaged: ${supportCase.subject}`,
      detail: supportCase.status,
      createdAt: now,
    });
    job.updatedAt = now;
    this.refreshCommercialReconciliation(job, now);
    await this.escrowRepository.save(job);
    return {
      supportCase: await this.toSupportCaseView(job, supportCase, true),
    };
  }

  async postProjectRoomMessage(
    userId: string,
    jobId: string,
    dto: PostProjectRoomMessageDto,
  ): Promise<EscrowProjectMessageResponse> {
    const job = await this.getJobOrThrow(jobId);
    const { user, roles } = await this.requireProjectRoomAccess(job, userId);
    const room = this.ensureProjectRoom(job);
    const senderRole = roles.includes('client') ? 'client' : 'worker';
    const now = Date.now();
    const message = {
      id: randomUUID(),
      jobId: job.id,
      senderUserId: user.id,
      senderRole,
      body: dto.body.trim(),
      createdAt: now,
    } satisfies EscrowProjectRoomRecord['messages'][number];
    room.messages.push(message);
    room.activity.push({
      id: randomUUID(),
      jobId: job.id,
      type: 'message_posted',
      actorUserId: user.id,
      actorRole: senderRole,
      milestoneIndex: null,
      relatedSubmissionId: null,
      summary:
        senderRole === 'client'
          ? 'Client posted a project-room message'
          : 'Worker posted a project-room message',
      detail: message.body,
      createdAt: now,
    });
    job.updatedAt = now;
    await this.escrowRepository.save(job);
    const emailMap = await this.buildProjectRoomEmailMap(job.projectRoom);
    return {
      message: this.toProjectMessageView(message, emailMap),
    };
  }

  async submitProjectMilestone(
    userId: string,
    jobId: string,
    milestoneIndex: number,
    dto: SubmitProjectMilestoneDto,
  ): Promise<EscrowProjectSubmissionResponse> {
    const job = await this.getJobOrThrow(jobId);
    const { user } = await this.requireProjectRoomAccess(job, userId, 'worker');
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);
    if (milestone.status !== 'pending') {
      throw new ConflictException(
        'Only pending milestones can accept off-chain submissions',
      );
    }

    const room = this.ensureProjectRoom(job);
    const now = Date.now();
    const submission: EscrowProjectSubmissionRecord = {
      id: randomUUID(),
      jobId: job.id,
      milestoneIndex,
      submittedByUserId: user.id,
      note: dto.note.trim(),
      artifacts: dto.artifacts.map((artifact) => ({
        id: randomUUID(),
        label: artifact.label.trim(),
        url: artifact.url.trim(),
        sha256: artifact.sha256.trim().toLowerCase(),
        mimeType: artifact.mimeType?.trim() || null,
        byteSize: artifact.byteSize ?? null,
        storageKind: 'external_url',
        uploadedByUserId: user.id,
        createdAt: now,
      })),
      status: 'submitted',
      revisionRequest: null,
      approval: null,
      deliveredAt: null,
      createdAt: now,
      updatedAt: now,
    };
    room.submissions.push(submission);
    room.activity.push({
      id: randomUUID(),
      jobId: job.id,
      type: 'submission_posted',
      actorUserId: user.id,
      actorRole: 'worker',
      milestoneIndex,
      relatedSubmissionId: submission.id,
      summary: `Submitted milestone ${milestoneIndex + 1} for review`,
      detail: submission.note,
      createdAt: now,
    });
    job.updatedAt = now;
    await this.escrowRepository.save(job);
    const emailMap = await this.buildProjectRoomEmailMap(job.projectRoom);
    return {
      submission: this.toProjectSubmissionView(submission, emailMap),
    };
  }

  async requestProjectRevision(
    userId: string,
    jobId: string,
    submissionId: string,
    dto: RequestProjectRevisionDto,
  ): Promise<EscrowProjectSubmissionResponse> {
    const job = await this.getJobOrThrow(jobId);
    const { user } = await this.requireProjectRoomAccess(job, userId, 'client');
    const submission = this.requireProjectSubmission(job, submissionId);
    this.assertLatestSubmissionForMilestone(job, submission);
    if (submission.status === 'delivered') {
      throw new ConflictException(
        'Delivered submissions cannot be moved back into revision',
      );
    }
    const now = Date.now();
    submission.status = 'revision_requested';
    submission.revisionRequest = {
      note: dto.note.trim(),
      requestedByUserId: user.id,
      requestedAt: now,
    };
    submission.updatedAt = now;
    const room = this.ensureProjectRoom(job);
    room.activity.push({
      id: randomUUID(),
      jobId: job.id,
      type: 'revision_requested',
      actorUserId: user.id,
      actorRole: 'client',
      milestoneIndex: submission.milestoneIndex,
      relatedSubmissionId: submission.id,
      summary: `Requested revision for milestone ${submission.milestoneIndex + 1}`,
      detail: submission.revisionRequest.note,
      createdAt: now,
    });
    job.updatedAt = now;
    await this.escrowRepository.save(job);
    const emailMap = await this.buildProjectRoomEmailMap(job.projectRoom);
    return {
      submission: this.toProjectSubmissionView(submission, emailMap),
    };
  }

  async approveProjectSubmission(
    userId: string,
    jobId: string,
    submissionId: string,
    dto: ApproveProjectSubmissionDto,
  ): Promise<EscrowProjectSubmissionResponse> {
    const job = await this.getJobOrThrow(jobId);
    const { user } = await this.requireProjectRoomAccess(job, userId, 'client');
    const submission = this.requireProjectSubmission(job, submissionId);
    this.assertLatestSubmissionForMilestone(job, submission);
    if (submission.status === 'delivered') {
      throw new ConflictException(
        'Delivered submissions cannot be re-approved',
      );
    }
    const now = Date.now();
    submission.status = 'approved';
    submission.approval = {
      note: dto.note?.trim() || null,
      approvedByUserId: user.id,
      approvedAt: now,
    };
    submission.updatedAt = now;
    const room = this.ensureProjectRoom(job);
    room.activity.push({
      id: randomUUID(),
      jobId: job.id,
      type: 'submission_approved',
      actorUserId: user.id,
      actorRole: 'client',
      milestoneIndex: submission.milestoneIndex,
      relatedSubmissionId: submission.id,
      summary: `Approved milestone ${submission.milestoneIndex + 1} submission`,
      detail: submission.approval.note,
      createdAt: now,
    });
    job.updatedAt = now;
    await this.escrowRepository.save(job);
    const emailMap = await this.buildProjectRoomEmailMap(job.projectRoom);
    return {
      submission: this.toProjectSubmissionView(submission, emailMap),
    };
  }

  async deliverProjectSubmission(
    userId: string,
    jobId: string,
    submissionId: string,
    requestContext?: RequestExecutionContext,
  ): Promise<EscrowProjectDeliverSubmissionResponse> {
    const job = await this.getJobOrThrow(jobId);
    await this.requireProjectRoomAccess(job, userId, 'worker');
    const submission = this.requireProjectSubmission(job, submissionId);
    this.assertLatestSubmissionForMilestone(job, submission);
    if (submission.status !== 'approved') {
      throw new ConflictException(
        'Only approved project-room submissions can be delivered onchain',
      );
    }

    const mutation = await this.deliverMilestone(
      userId,
      jobId,
      submission.milestoneIndex,
      {
        note: submission.note,
        evidenceUrls: submission.artifacts.map((artifact) => artifact.url),
      },
      requestContext,
    );
    const updatedJob = await this.getJobOrThrow(jobId);
    const updatedSubmission = this.requireProjectSubmission(
      updatedJob,
      submissionId,
    );
    const room = this.ensureProjectRoom(updatedJob);
    const now = Date.now();
    updatedSubmission.status = 'delivered';
    updatedSubmission.deliveredAt = now;
    updatedSubmission.updatedAt = now;
    room.activity.push({
      id: randomUUID(),
      jobId: updatedJob.id,
      type: 'submission_delivered',
      actorUserId: userId,
      actorRole: 'worker',
      milestoneIndex: updatedSubmission.milestoneIndex,
      relatedSubmissionId: updatedSubmission.id,
      summary: `Delivered milestone ${updatedSubmission.milestoneIndex + 1} onchain`,
      detail: updatedSubmission.note,
      createdAt: now,
    });
    updatedJob.updatedAt = now;
    await this.escrowRepository.save(updatedJob);
    const emailMap = await this.buildProjectRoomEmailMap(updatedJob.projectRoom);
    return {
      submission: this.toProjectSubmissionView(updatedSubmission, emailMap),
      mutation,
    };
  }

  async setMilestones(
    userId: string,
    jobId: string,
    dto: SetMilestonesDto,
    requestContext?: RequestExecutionContext,
  ): Promise<SetMilestonesResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolveClientForJob(
      userId,
      job,
    );
    const replayed = await this.maybeReplayJobMutation({
      job,
      action: 'set_milestones',
      requestContext,
      operationKeyPayload: {
        jobId: job.id,
        milestones: dto.milestones,
      },
      buildResponse: (execution) => ({
        jobId: job.id,
        milestoneCount: job.milestones.length,
        status: job.status,
        txHash: this.requireExecutionTxHash(execution),
      }),
    });
    if (replayed) {
      return replayed;
    }

    if (job.fundedAmount === null) {
      throw new ConflictException(
        'Job must be funded before setting milestones',
      );
    }

    if (job.milestones.length > 0) {
      throw new ConflictException('Milestones have already been set');
    }

    const fundedAmountMinorUnits = parseAmountToMinorUnits(job.fundedAmount);
    const milestoneTotalMinorUnits = dto.milestones.reduce(
      (total, milestone) => total + parseAmountToMinorUnits(milestone.amount),
      0n,
    );

    if (milestoneTotalMinorUnits !== fundedAmountMinorUnits) {
      throw new ConflictException('Milestone total must match funded amount');
    }

    const receipt = await this.executeMutation({
      job,
      action: 'set_milestones',
      actorAddress,
      requestContext,
      operationKeyPayload: {
        jobId: job.id,
        milestones: dto.milestones,
      },
      operation: (gatewayRequestContext) =>
        this.escrowContractGateway.setMilestones({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          amountsMinorUnits: dto.milestones.map((milestone) =>
            parseAmountToMinorUnits(milestone.amount).toString(),
          ),
          requestContext: gatewayRequestContext,
        }),
      onConfirmed: () => {
        job.milestones = dto.milestones.map((milestone) => ({
          title: milestone.title,
          deliverable: milestone.deliverable,
          amount: normalizeAmount(milestone.amount),
          dueAt: milestone.dueAt,
          status: 'pending',
        }));
        job.updatedAt = Date.now();
        this.syncJobStatus(job);
        this.appendAudit(job, {
          type: 'job.milestones_set',
          at: Date.now(),
          payload: {
            jobId,
            count: job.milestones.length,
          },
        });
      },
    });

    return {
      jobId: job.id,
      milestoneCount: job.milestones.length,
      status: job.status,
      txHash: receipt.txHash,
    };
  }

  async deliverMilestone(
    userId: string,
    jobId: string,
    milestoneIndex: number,
    dto: DeliverMilestoneDto,
    requestContext?: RequestExecutionContext,
  ): Promise<MilestoneMutationResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolveWorkerForJob(
      userId,
      job,
    );
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);
    const replayed = await this.maybeReplayJobMutation({
      job,
      action: 'deliver_milestone',
      requestContext,
      operationKeyPayload: {
        jobId: job.id,
        milestoneIndex,
        note: dto.note,
        evidenceUrls: dto.evidenceUrls,
      },
      buildResponse: (execution) => ({
        jobId: job.id,
        milestoneIndex,
        milestoneStatus: milestone.status,
        jobStatus: job.status,
        txHash: this.requireExecutionTxHash(execution),
      }),
    });
    if (replayed) {
      return replayed;
    }

    if (milestone.status !== 'pending') {
      throw new ConflictException('Only pending milestones can be delivered');
    }

    const receipt = await this.executeMutation({
      job,
      action: 'deliver_milestone',
      actorAddress,
      milestoneIndex,
      requestContext,
      operationKeyPayload: {
        jobId: job.id,
        milestoneIndex,
        note: dto.note,
        evidenceUrls: dto.evidenceUrls,
      },
      operation: (gatewayRequestContext) =>
        this.escrowContractGateway.deliverMilestone({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          milestoneIndex,
          deliverableHash: hashToBytes32({
            note: dto.note,
            evidenceUrls: dto.evidenceUrls,
          }),
          requestContext: gatewayRequestContext,
        }),
      onConfirmed: () => {
        const now = Date.now();
        milestone.status = 'delivered';
        milestone.deliveredAt = now;
        milestone.deliveryNote = dto.note;
        milestone.deliveryEvidenceUrls = cloneValue(dto.evidenceUrls);
        job.updatedAt = now;
        this.syncJobStatus(job);
        this.appendAudit(job, {
          type: 'milestone.delivered',
          at: now,
          payload: {
            jobId,
            milestoneIndex,
          },
        });
      },
    });

    return {
      jobId: job.id,
      milestoneIndex,
      milestoneStatus: milestone.status,
      jobStatus: job.status,
      txHash: receipt.txHash,
    };
  }

  async releaseMilestone(
    userId: string,
    jobId: string,
    milestoneIndex: number,
    requestContext?: RequestExecutionContext,
  ): Promise<MilestoneMutationResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolveClientForJob(
      userId,
      job,
    );
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);
    const replayed = await this.maybeReplayJobMutation({
      job,
      action: 'release_milestone',
      requestContext,
      operationKeyPayload: {
        jobId: job.id,
        milestoneIndex,
      },
      buildResponse: (execution) => ({
        jobId: job.id,
        milestoneIndex,
        milestoneStatus: milestone.status,
        jobStatus: job.status,
        txHash: this.requireExecutionTxHash(execution),
      }),
    });
    if (replayed) {
      return replayed;
    }

    if (milestone.status !== 'delivered') {
      throw new ConflictException('Only delivered milestones can be released');
    }

    const receipt = await this.executeMutation({
      job,
      action: 'release_milestone',
      actorAddress,
      milestoneIndex,
      requestContext,
      operationKeyPayload: {
        jobId: job.id,
        milestoneIndex,
      },
      operation: (gatewayRequestContext) =>
        this.escrowContractGateway.releaseMilestone({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          milestoneIndex,
          requestContext: gatewayRequestContext,
        }),
      onConfirmed: () => {
        const now = Date.now();
        milestone.status = 'released';
        milestone.releasedAt = now;
        job.updatedAt = now;
        this.recordCommercialMilestoneOutcome(
          job,
          milestoneIndex,
          'milestone_release',
          'release',
          now,
        );
        this.syncJobStatus(job);
        this.appendAudit(job, {
          type: 'milestone.released',
          at: now,
          payload: {
            jobId,
            milestoneIndex,
          },
        });
      },
    });

    return {
      jobId: job.id,
      milestoneIndex,
      milestoneStatus: milestone.status,
      jobStatus: job.status,
      txHash: receipt.txHash,
    };
  }

  async disputeMilestone(
    userId: string,
    jobId: string,
    milestoneIndex: number,
    dto: DisputeMilestoneDto,
    requestContext?: RequestExecutionContext,
  ): Promise<MilestoneMutationResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolveClientForJob(
      userId,
      job,
    );
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);
    const replayed = await this.maybeReplayJobMutation({
      job,
      action: 'open_dispute',
      requestContext,
      operationKeyPayload: {
        jobId: job.id,
        milestoneIndex,
        reason: dto.reason,
        evidenceUrls: dto.evidenceUrls,
      },
      buildResponse: (execution) => ({
        jobId: job.id,
        milestoneIndex,
        milestoneStatus: milestone.status,
        jobStatus: job.status,
        txHash: this.requireExecutionTxHash(execution),
      }),
    });
    if (replayed) {
      return replayed;
    }

    if (milestone.status !== 'delivered') {
      throw new ConflictException('Only delivered milestones can be disputed');
    }

    const receipt = await this.executeMutation({
      job,
      action: 'open_dispute',
      actorAddress,
      milestoneIndex,
      requestContext,
      operationKeyPayload: {
        jobId: job.id,
        milestoneIndex,
        reason: dto.reason,
        evidenceUrls: dto.evidenceUrls,
      },
      operation: (gatewayRequestContext) =>
        this.escrowContractGateway.openDispute({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          milestoneIndex,
          reasonHash: hashToBytes32(dto.reason),
          requestContext: gatewayRequestContext,
        }),
      onConfirmed: () => {
        const now = Date.now();
        milestone.status = 'disputed';
        milestone.disputedAt = now;
        milestone.disputeReason = dto.reason;
        milestone.disputeEvidenceUrls = cloneValue(dto.evidenceUrls);
        job.updatedAt = now;
        this.syncJobStatus(job);
        this.appendAudit(job, {
          type: 'milestone.disputed',
          at: now,
          payload: {
            jobId,
            milestoneIndex,
          },
        });
      },
    });

    return {
      jobId: job.id,
      milestoneIndex,
      milestoneStatus: milestone.status,
      jobStatus: job.status,
      txHash: receipt.txHash,
    };
  }

  async resolveMilestone(
    userId: string,
    jobId: string,
    milestoneIndex: number,
    dto: ResolveMilestoneDto,
    requestContext?: RequestExecutionContext,
  ): Promise<MilestoneMutationResponse> {
    const job = await this.getJobOrThrow(jobId);
    await this.userCapabilities.requireCapability(userId, 'escrowResolution');
    const actorAddress = await this.escrowActorService.resolveArbitrator(userId);
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);
    const replayed = await this.maybeReplayJobMutation({
      job,
      action: 'resolve_dispute',
      requestContext,
      operationKeyPayload: {
        jobId: job.id,
        milestoneIndex,
        action: dto.action,
        note: dto.note,
      },
      buildResponse: (execution) => ({
        jobId: job.id,
        milestoneIndex,
        milestoneStatus: milestone.status,
        jobStatus: job.status,
        txHash: this.requireExecutionTxHash(execution),
      }),
    });
    if (replayed) {
      return replayed;
    }

    if (milestone.status !== 'disputed') {
      throw new ConflictException('Only disputed milestones can be resolved');
    }

    const splitBpsClient = dto.action === 'refund' ? 10_000 : 0;
    const receipt = await this.executeMutation({
      job,
      action: 'resolve_dispute',
      actorAddress,
      milestoneIndex,
      requestContext,
      operationKeyPayload: {
        jobId: job.id,
        milestoneIndex,
        action: dto.action,
        note: dto.note,
      },
      operation: (gatewayRequestContext) =>
        this.escrowContractGateway.resolveDispute({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          milestoneIndex,
          splitBpsClient,
          requestContext: gatewayRequestContext,
        }),
      onConfirmed: () => {
        const now = Date.now();
        milestone.status = dto.action === 'release' ? 'released' : 'refunded';
        milestone.resolvedAt = now;
        milestone.resolutionAction = dto.action;
        milestone.resolutionNote = dto.note;
        if (dto.action === 'release') {
          milestone.releasedAt = now;
        }
        job.updatedAt = now;
        this.recordCommercialMilestoneOutcome(
          job,
          milestoneIndex,
          dto.action === 'release'
            ? 'dispute_resolution_release'
            : 'dispute_refund',
          dto.action,
          now,
        );
        this.syncJobStatus(job);
        this.appendAudit(job, {
          type: 'milestone.resolved',
          at: now,
          payload: {
            jobId,
            milestoneIndex,
            action: dto.action,
          },
        });
      },
    });

    return {
      jobId: job.id,
      milestoneIndex,
      milestoneStatus: milestone.status,
      jobStatus: job.status,
      txHash: receipt.txHash,
    };
  }

  async getAuditBundle(jobId: string): Promise<EscrowAuditBundle> {
    const job = await this.getJobOrThrow(jobId);
    const merged = await this.escrowOnchainAuthority.mergeJob(job);
    const { audit, executions, ...jobView } = cloneValue(merged.job);

    return {
      bundle: {
        job: this.toPublicJobViewFromRecord({
          ...jobView,
          contractorParticipation: merged.job.contractorParticipation,
        }),
        audit,
        executions,
        authority: merged.authority,
      },
    };
  }

  async getExportDocument(
    jobId: string,
    artifact: 'job-history' | 'dispute-case',
    format: 'json' | 'csv',
  ) {
    const bundle = (await this.getAuditBundle(jobId)).bundle;
    return buildEscrowExportDocument(bundle, artifact, format);
  }

  private toJobView(job: EscrowJobRecord): EscrowJobView {
    const { audit, executions, contractorParticipation, projectRoom, ...jobView } =
      cloneValue(job);
    void audit;
    void executions;
    void projectRoom;
    return {
      ...jobView,
      contractorParticipation: this.toContractorParticipationView(
        contractorParticipation,
      ),
    };
  }

  private toPublicJobViewFromRecord(
    job: Omit<EscrowJobRecord, 'audit' | 'executions'>,
  ): EscrowPublicJobView {
    const { contractorParticipation, projectRoom, ...jobView } = cloneValue(job);
    void projectRoom;

    return {
      ...jobView,
      contractorParticipation: this.toPublicContractorParticipationView(
        contractorParticipation,
      ),
    };
  }

  private toContractorParticipationView(
    participation: EscrowJobRecord['contractorParticipation'],
  ): EscrowContractorParticipationView | null {
    if (!participation) {
      return null;
    }

    return {
      contractorEmail: participation.contractorEmail,
      status: participation.status,
      joinedAt: participation.joinedAt,
      inviteLastSentAt: participation.invite.lastSentAt,
      inviteLastSentMode: participation.invite.lastSentMode,
    };
  }

  private toPublicContractorParticipationView(
    participation: EscrowJobRecord['contractorParticipation'],
  ): EscrowContractorParticipationPublicView | null {
    if (!participation) {
      return null;
    }

    return {
      status: participation.status,
      joinedAt: participation.joinedAt,
    };
  }

  private ensureProjectRoom(job: EscrowJobRecord) {
    if (!job.projectRoom) {
      job.projectRoom = createEmptyProjectRoom();
    }
    if (!job.projectRoom.supportCases) {
      job.projectRoom.supportCases = [];
    }
    return job.projectRoom;
  }

  private requireCommercial(job: EscrowJobRecord) {
    if (!job.operations.commercial) {
      job.operations.commercial = createInitialCommercial(job, Date.now());
      this.refreshCommercialReconciliation(job, Date.now());
    }
    return job.operations.commercial;
  }

  private async requireProjectRoomAccess(
    job: EscrowJobRecord,
    userId: string,
    requiredRole?: EscrowParticipantRole,
  ) {
    const user = await this.usersService.getRequiredById(userId);
    const roles = this.resolveParticipantRoles(job, user);
    if (roles.length === 0) {
      throw new ForbiddenException(
        'You do not have access to this project room',
      );
    }
    if (requiredRole && !roles.includes(requiredRole)) {
      throw new ForbiddenException(
        `You do not have ${requiredRole} access for this project room`,
      );
    }
    return { user, roles };
  }

  private async requireJobSupportAccess(job: EscrowJobRecord, userId: string) {
    const user = await this.usersService.getRequiredById(userId);
    const roles = this.resolveParticipantRoles(job, user);
    const operatorAccess =
      (
        await this.userCapabilities.getCapabilitiesForUser(userId)
      ).escrowOperations.allowed;
    if (roles.length === 0 && !operatorAccess) {
      throw new ForbiddenException('You do not have access to this support queue');
    }
    return {
      user,
      role:
        operatorAccess && roles.length === 0
          ? ('operator' as const)
          : (roles[0] ?? 'client'),
      roles,
      operatorAccess,
    };
  }

  private requireProjectSubmission(
    job: EscrowJobRecord,
    submissionId: string,
  ): EscrowProjectSubmissionRecord {
    const submission = this.ensureProjectRoom(job).submissions.find(
      (entry) => entry.id === submissionId,
    );
    if (!submission) {
      throw new NotFoundException('Project-room submission not found');
    }
    return submission;
  }

  private assertLatestSubmissionForMilestone(
    job: EscrowJobRecord,
    submission: EscrowProjectSubmissionRecord,
  ) {
    const latest = this.ensureProjectRoom(job).submissions
      .filter((entry) => entry.milestoneIndex === submission.milestoneIndex)
      .sort((left, right) => right.createdAt - left.createdAt)[0];
    if (!latest || latest.id !== submission.id) {
      throw new ConflictException(
        'Only the latest milestone submission can be updated',
      );
    }
  }

  private async buildProjectRoomEmailMap(
    projectRoom: EscrowProjectRoomRecord,
  ) {
    const userIds = new Set<string>();
    for (const submission of projectRoom.submissions) {
      userIds.add(submission.submittedByUserId);
      if (submission.revisionRequest) {
        userIds.add(submission.revisionRequest.requestedByUserId);
      }
      if (submission.approval) {
        userIds.add(submission.approval.approvedByUserId);
      }
    }
    for (const message of projectRoom.messages) {
      userIds.add(message.senderUserId);
    }
    for (const activity of projectRoom.activity) {
      userIds.add(activity.actorUserId);
    }
    for (const supportCase of projectRoom.supportCases) {
      userIds.add(supportCase.createdByUserId);
      if (supportCase.ownerUserId) {
        userIds.add(supportCase.ownerUserId);
      }
      for (const message of supportCase.messages) {
        userIds.add(message.authorUserId);
      }
    }

    const emailMap = new Map<string, string>();
    await Promise.all(
      Array.from(userIds).map(async (id) => {
        const user = await this.usersService.getRequiredById(id);
        emailMap.set(id, user.email);
      }),
    );
    return emailMap;
  }

  private toProjectSubmissionView(
    submission: EscrowProjectSubmissionRecord,
    emailMap: Map<string, string>,
  ): EscrowProjectSubmissionView {
    return {
      id: submission.id,
      jobId: submission.jobId,
      milestoneIndex: submission.milestoneIndex,
      note: submission.note,
      artifacts: cloneValue(submission.artifacts),
      status: submission.status,
      deliveredAt: submission.deliveredAt,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      submittedBy: {
        userId: submission.submittedByUserId,
        email:
          emailMap.get(submission.submittedByUserId) ?? submission.submittedByUserId,
      },
      revisionRequest: submission.revisionRequest
        ? {
            ...submission.revisionRequest,
            requestedByEmail:
              emailMap.get(submission.revisionRequest.requestedByUserId) ??
              submission.revisionRequest.requestedByUserId,
          }
        : null,
      approval: submission.approval
        ? {
            ...submission.approval,
            approvedByEmail:
              emailMap.get(submission.approval.approvedByUserId) ??
              submission.approval.approvedByUserId,
          }
        : null,
    };
  }

  private toProjectMessageView(
    message: EscrowProjectRoomRecord['messages'][number],
    emailMap: Map<string, string>,
  ): EscrowProjectMessageView {
    return {
      id: message.id,
      jobId: message.jobId,
      senderRole: message.senderRole,
      body: message.body,
      createdAt: message.createdAt,
      sender: {
        userId: message.senderUserId,
        email: emailMap.get(message.senderUserId) ?? message.senderUserId,
      },
    };
  }

  private toProjectRoomActivityView(
    activity: EscrowProjectRoomRecord['activity'][number],
    emailMap: Map<string, string>,
  ): EscrowProjectActivityView {
    return {
      source: 'room',
      id: activity.id,
      type: activity.type,
      actorRole: activity.actorRole,
      milestoneIndex: activity.milestoneIndex,
      relatedSubmissionId: activity.relatedSubmissionId,
      summary: activity.summary,
      detail: activity.detail,
      createdAt: activity.createdAt,
      actor: {
        userId: activity.actorUserId,
        email: emailMap.get(activity.actorUserId) ?? activity.actorUserId,
      },
    };
  }

  private requireSupportCase(job: EscrowJobRecord, caseId: string) {
    const supportCase = this.ensureProjectRoom(job).supportCases.find(
      (entry) => entry.id === caseId,
    );
    if (!supportCase) {
      throw new NotFoundException('Support case not found');
    }
    return supportCase;
  }

  private async toSupportCaseView(
    job: EscrowJobRecord,
    supportCase: EscrowJobRecord['projectRoom']['supportCases'][number],
    includeInternal: boolean,
  ): Promise<EscrowSupportCaseView> {
    const emailMap = await this.buildProjectRoomEmailMap(this.ensureProjectRoom(job));
    return {
      id: supportCase.id,
      jobId: supportCase.jobId,
      milestoneIndex: supportCase.milestoneIndex,
      reason: supportCase.reason,
      status: supportCase.status,
      severity: supportCase.severity,
      subject: supportCase.subject,
      description: supportCase.description,
      ownerUserId: supportCase.ownerUserId,
      ownerEmail: supportCase.ownerEmail,
      feeDecision: supportCase.feeDecision,
      feeDecisionNote: supportCase.feeDecisionNote,
      feeImpactAmount: supportCase.feeImpactAmount,
      openedAt: supportCase.openedAt,
      updatedAt: supportCase.updatedAt,
      resolvedAt: supportCase.resolvedAt,
      createdBy: {
        userId: supportCase.createdByUserId,
        email:
          emailMap.get(supportCase.createdByUserId) ??
          supportCase.createdByUserId,
      },
      messages: supportCase.messages
        .slice()
        .filter((message) => includeInternal || message.visibility === 'external')
        .sort((left, right) => left.createdAt - right.createdAt)
        .map((message) => ({
          id: message.id,
          authorRole: message.authorRole,
          visibility: message.visibility,
          body: message.body,
          createdAt: message.createdAt,
          author: {
            userId: message.authorUserId,
            email: emailMap.get(message.authorUserId) ?? message.authorUserId,
          },
        })),
    };
  }

  private async toSupportCaseViews(
    job: EscrowJobRecord,
    includeInternal: boolean,
  ) {
    return Promise.all(
      this.ensureProjectRoom(job).supportCases
        .slice()
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .map((supportCase) =>
          this.toSupportCaseView(job, supportCase, includeInternal),
        ),
    );
  }

  private mapAuditToProjectActivity(
    event: EscrowAuditEvent,
  ): EscrowProjectRoomActivityView {
    switch (event.type) {
      case 'job.created':
        return {
          source: 'audit',
          id: `audit-${event.at}-job-created`,
          type: event.type,
          actorRole: 'system',
          milestoneIndex: null,
          summary: 'Contract created',
          detail: `Escrow id ${event.payload.escrowId}`,
          createdAt: event.at,
        };
      case 'job.contractor_participation_requested':
        return {
          source: 'audit',
          id: `audit-${event.at}-worker-requested`,
          type: event.type,
          actorRole: 'system',
          milestoneIndex: null,
          summary: 'Worker participation requested',
          detail: event.payload.workerAddress,
          createdAt: event.at,
        };
      case 'job.contractor_email_updated':
        return {
          source: 'audit',
          id: `audit-${event.at}-contractor-email-updated`,
          type: event.type,
          actorRole: 'client',
          milestoneIndex: null,
          summary: 'Pending contractor email updated',
          detail: null,
          createdAt: event.at,
        };
      case 'job.contractor_invite_sent':
        return {
          source: 'audit',
          id: `audit-${event.at}-contractor-invite-sent`,
          type: event.type,
          actorRole: 'client',
          milestoneIndex: null,
          summary: 'Contractor invite sent',
          detail: `${event.payload.delivery}${event.payload.regenerated ? ' (regenerated)' : ''}`,
          createdAt: event.at,
        };
      case 'job.contractor_joined':
        return {
          source: 'audit',
          id: `audit-${event.at}-contractor-joined`,
          type: event.type,
          actorRole: 'worker',
          milestoneIndex: null,
          summary: 'Worker joined contract',
          detail: event.payload.workerAddress,
          createdAt: event.at,
        };
      case 'job.funded':
        return {
          source: 'audit',
          id: `audit-${event.at}-job-funded`,
          type: event.type,
          actorRole: 'client',
          milestoneIndex: null,
          summary: 'Contract funded',
          detail: event.payload.amount,
          createdAt: event.at,
        };
      case 'job.milestones_set':
        return {
          source: 'audit',
          id: `audit-${event.at}-milestones-set`,
          type: event.type,
          actorRole: 'client',
          milestoneIndex: null,
          summary: 'Milestones committed onchain',
          detail: `${event.payload.count} milestones`,
          createdAt: event.at,
        };
      case 'milestone.delivered':
        return {
          source: 'audit',
          id: `audit-${event.at}-milestone-delivered-${event.payload.milestoneIndex}`,
          type: event.type,
          actorRole: 'worker',
          milestoneIndex: event.payload.milestoneIndex,
          summary: `Milestone ${event.payload.milestoneIndex + 1} delivered onchain`,
          detail: null,
          createdAt: event.at,
        };
      case 'milestone.released':
        return {
          source: 'audit',
          id: `audit-${event.at}-milestone-released-${event.payload.milestoneIndex}`,
          type: event.type,
          actorRole: 'client',
          milestoneIndex: event.payload.milestoneIndex,
          summary: `Milestone ${event.payload.milestoneIndex + 1} released`,
          detail: null,
          createdAt: event.at,
        };
      case 'milestone.disputed':
        return {
          source: 'audit',
          id: `audit-${event.at}-milestone-disputed-${event.payload.milestoneIndex}`,
          type: event.type,
          actorRole: 'client',
          milestoneIndex: event.payload.milestoneIndex,
          summary: `Milestone ${event.payload.milestoneIndex + 1} disputed`,
          detail: null,
          createdAt: event.at,
        };
      case 'milestone.resolved':
        return {
          source: 'audit',
          id: `audit-${event.at}-milestone-resolved-${event.payload.milestoneIndex}`,
          type: event.type,
          actorRole: 'system',
          milestoneIndex: event.payload.milestoneIndex,
          summary: `Milestone ${event.payload.milestoneIndex + 1} dispute resolved`,
          detail: event.payload.action,
          createdAt: event.at,
        };
    }
  }

  private async toProjectRoomView(
    sourceJob: EscrowJobRecord,
    job: EscrowJobRecord,
    participantRoles: EscrowParticipantRole[],
  ) {
    const room = this.ensureProjectRoom(sourceJob);
    const emailMap = await this.buildProjectRoomEmailMap(room);
    return {
      job: this.toJobView(job),
      participantRoles,
      submissions: room.submissions
        .slice()
        .sort((left, right) => right.createdAt - left.createdAt)
        .map((submission) => this.toProjectSubmissionView(submission, emailMap)),
      messages: room.messages
        .slice()
        .sort((left, right) => right.createdAt - left.createdAt)
        .map((message) => this.toProjectMessageView(message, emailMap)),
      activity: room.activity
        .map((activity) => this.toProjectRoomActivityView(activity, emailMap))
        .concat(sourceJob.audit.map((event) => this.mapAuditToProjectActivity(event)))
        .sort((left, right) => right.createdAt - left.createdAt),
      supportCases: await this.toSupportCaseViews(sourceJob, false),
    };
  }

  private defaultSupportSeverity(
    reason: CreateSupportCaseDto['reason'],
    fundedAmount: string | null,
  ): EscrowSupportCaseSeverity {
    switch (reason) {
      case 'stuck_funding':
        return fundedAmount ? 'critical' : 'elevated';
      case 'fee_exception':
      case 'release_delay':
        return 'elevated';
      case 'dispute_followup':
        return 'critical';
      case 'fee_question':
      case 'general_help':
      default:
        return 'routine';
    }
  }

  private estimateSupportFeeImpact(
    job: EscrowJobRecord,
    milestoneIndex: number | null,
  ): string | null {
    const commercial = this.requireCommercial(job);
    if (milestoneIndex === null) {
      return commercial.reconciliation?.recordedRealizedFees ?? '0';
    }
    const milestone = job.milestones[milestoneIndex];
    if (!milestone) {
      return null;
    }
    return calculatePlatformFeeAmount(
      milestone.amount,
      commercial.feePolicy.effectivePlatformFeeBps,
    );
  }

  private recordCommercialMilestoneOutcome(
    job: EscrowJobRecord,
    milestoneIndex: number,
    source:
      | 'milestone_release'
      | 'dispute_resolution_release'
      | 'dispute_refund',
    action: 'release' | 'refund',
    at: number,
  ) {
    const commercial = this.requireCommercial(job);
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);
    if (
      commercial.payoutLedger.some(
        (entry) => entry.milestoneIndex === milestoneIndex,
      )
    ) {
      this.refreshCommercialReconciliation(job, at);
      return;
    }

    commercial.payoutLedger.push({
      id: randomUUID(),
      jobId: job.id,
      milestoneIndex,
      kind: action === 'release' ? 'worker_payout' : 'client_refund',
      source,
      amount: milestone.amount,
      currencyAddress: job.onchain.currencyAddress,
      note: null,
      createdAt: at,
    });

    if (action === 'release') {
      const feeAmount = calculatePlatformFeeAmount(
        milestone.amount,
        this.getPlatformFeeBpsForMilestone(commercial, milestone, at),
      );
      if (!amountsEqual(feeAmount, '0')) {
        commercial.feeLedger.push({
          id: randomUUID(),
          jobId: job.id,
          milestoneIndex,
          kind: 'platform_fee_accrued',
          source,
          amount: feeAmount,
          currencyAddress: job.onchain.currencyAddress,
          treasuryAccountRef: commercial.treasuryAccount.accountRef,
          note: commercial.feePolicy.platformFeeLabel,
          createdAt: at,
        });
      }
    }

    this.refreshCommercialReconciliation(job, at);
  }

  private applyFeeDecision(
    job: EscrowJobRecord,
    supportCase: EscrowJobRecord['projectRoom']['supportCases'][number],
    operatorUserId: string,
    at: number,
  ) {
    const commercial = this.requireCommercial(job);
    const decision = supportCase.feeDecision;
    if (!decision) {
      return;
    }

    commercial.feePolicy.feeDecision = decision;
    commercial.feePolicy.feeDecisionNote = supportCase.feeDecisionNote;
    commercial.feePolicy.approvedByUserId = operatorUserId;
    commercial.feePolicy.approvedAt = at;
    commercial.feePolicy.updatedAt = at;

    if (decision === 'default' || decision === 'manual_review') {
      commercial.feePolicy.effectivePlatformFeeBps =
        commercial.feePolicy.defaultPlatformFeeBps;
      this.refreshCommercialReconciliation(job, at);
      return;
    }

    commercial.feePolicy.effectivePlatformFeeBps = 0;

    if (decision === 'refund_realized_and_waive') {
      const realizedFees = subtractAmounts(
        sumAmounts(
          commercial.feeLedger
            .filter((entry) => entry.kind === 'platform_fee_accrued')
            .map((entry) => entry.amount),
        ),
        sumAmounts(
          commercial.feeLedger
            .filter((entry) => entry.kind === 'platform_fee_reversed')
            .map((entry) => entry.amount),
        ),
      );
      if (!amountsEqual(realizedFees, '0')) {
        commercial.feeLedger.push({
          id: randomUUID(),
          jobId: job.id,
          milestoneIndex: supportCase.milestoneIndex,
          kind: 'platform_fee_reversed',
          source: 'support_fee_refund',
          amount: realizedFees,
          currencyAddress: job.onchain.currencyAddress,
          treasuryAccountRef: commercial.treasuryAccount.accountRef,
          note: supportCase.feeDecisionNote,
          createdAt: at,
        });
      }
    }

    this.refreshCommercialReconciliation(job, at);
  }

  private refreshCommercialReconciliation(job: EscrowJobRecord, at: number) {
    const commercial = this.requireCommercial(job);
    const expectedReleasedAmount = sumAmounts(
      job.milestones
        .filter((milestone) => milestone.status === 'released')
        .map((milestone) => milestone.amount),
    );
    const expectedRefundedAmount = sumAmounts(
      job.milestones
        .filter((milestone) => milestone.status === 'refunded')
        .map((milestone) => milestone.amount),
    );
    const expectedRealizedFees = sumAmounts(
      job.milestones
        .filter((milestone) => milestone.status === 'released')
        .map((milestone) =>
          calculatePlatformFeeAmount(
            milestone.amount,
            this.getPlatformFeeBpsForMilestone(
              commercial,
              milestone,
              milestone.releasedAt ?? milestone.resolvedAt ?? at,
            ),
          ),
        ),
    );
    const recordedReleasedAmount = sumAmounts(
      commercial.payoutLedger
        .filter((entry) => entry.kind === 'worker_payout')
        .map((entry) => entry.amount),
    );
    const recordedRefundedAmount = sumAmounts(
      commercial.payoutLedger
        .filter((entry) => entry.kind === 'client_refund')
        .map((entry) => entry.amount),
    );
    const recordedRealizedFees = subtractAmounts(
      sumAmounts(
        commercial.feeLedger
          .filter((entry) => entry.kind === 'platform_fee_accrued')
          .map((entry) => entry.amount),
      ),
      sumAmounts(
        commercial.feeLedger
          .filter((entry) => entry.kind === 'platform_fee_reversed')
          .map((entry) => entry.amount),
      ),
    );
    const room = this.ensureProjectRoom(job);
    const openCases = room.supportCases.filter(
      (supportCase) => supportCase.status !== 'resolved',
    );
    const issues: EscrowCommercialIssueRecord[] = [];

    if (!amountsEqual(expectedReleasedAmount, recordedReleasedAmount)) {
      issues.push({
        code: 'payout_mismatch',
        severity: 'critical',
        summary: 'Worker payout ledger does not match released milestone value.',
        detail: `${recordedReleasedAmount} recorded vs ${expectedReleasedAmount} expected.`,
      });
    }
    if (!amountsEqual(expectedRefundedAmount, recordedRefundedAmount)) {
      issues.push({
        code: 'payout_mismatch',
        severity: 'critical',
        summary: 'Client refund ledger does not match refunded milestone value.',
        detail: `${recordedRefundedAmount} recorded vs ${expectedRefundedAmount} expected.`,
      });
    }
    if (!amountsEqual(expectedRealizedFees, recordedRealizedFees)) {
      issues.push({
        code: 'fee_mismatch',
        severity: 'warning',
        summary: 'Fee ledger diverges from the currently effective fee policy.',
        detail: `${recordedRealizedFees} recorded vs ${expectedRealizedFees} expected.`,
      });
    }
    if (job.status === 'draft' && job.fundedAmount === null) {
      issues.push({
        code: 'stuck_funding',
        severity: 'warning',
        summary: 'Contract has not been funded yet.',
        detail: 'Use support workflows for funding blockers or wallet friction.',
      });
    }
    if (
      openCases.some((supportCase) => supportCase.reason === 'fee_exception')
    ) {
      issues.push({
        code: 'support_followup',
        severity: 'warning',
        summary: 'An unresolved fee exception request still needs operator review.',
        detail: null,
      });
    }
    if (openCases.some((supportCase) => !supportCase.ownerUserId)) {
      issues.push({
        code: 'unowned_support_case',
        severity: 'warning',
        summary: 'One or more open support cases are unassigned.',
        detail: null,
      });
    }

    commercial.reconciliation = {
      status: issues.length > 0 ? 'attention' : 'balanced',
      expectedReleasedAmount,
      expectedRefundedAmount,
      expectedRealizedFees,
      recordedReleasedAmount,
      recordedRefundedAmount,
      recordedRealizedFees,
      openSupportCaseCount: openCases.length,
      activeFeeException:
        commercial.feePolicy.feeDecision !== 'default' &&
        commercial.feePolicy.feeDecision !== 'manual_review',
      issueCount: issues.length,
      issues,
      lastComputedAt: at,
    };
  }

  private getPlatformFeeBpsForMilestone(
    commercial: EscrowCommercialRecord,
    milestone: EscrowJobRecord['milestones'][number],
    at: number,
  ) {
    if (
      commercial.feePolicy.feeDecision === 'default' ||
      commercial.feePolicy.feeDecision === 'manual_review'
    ) {
      return commercial.feePolicy.defaultPlatformFeeBps;
    }

    if (
      commercial.feePolicy.feeDecision === 'waive_open_and_future' ||
      commercial.feePolicy.feeDecision === 'refund_realized_and_waive'
    ) {
      const approvedAt = commercial.feePolicy.approvedAt;
      const releasedAt = milestone.releasedAt ?? milestone.resolvedAt ?? at;
      if (approvedAt !== null && releasedAt < approvedAt) {
        return commercial.feePolicy.defaultPlatformFeeBps;
      }
      return 0;
    }

    return commercial.feePolicy.effectivePlatformFeeBps;
  }

  private resolveParticipantRoles(
    job: EscrowJobRecord,
    user: Awaited<ReturnType<UsersService['getRequiredById']>>,
  ) {
    const normalizedAddresses = new Set(
      user.wallets.map((wallet) => normalizeEvmAddress(wallet.address)),
    );
    const roles: Array<'client' | 'worker'> = [];

    if (
      normalizedAddresses.has(normalizeEvmAddress(job.onchain.clientAddress))
    ) {
      roles.push('client');
    }

    if (
      normalizedAddresses.has(normalizeEvmAddress(job.onchain.workerAddress)) &&
      this.userCanActAsWorker(job, user)
    ) {
      roles.push('worker');
    }

    return roles;
  }

  private userCanActAsWorker(
    job: EscrowJobRecord,
    user: Awaited<ReturnType<UsersService['getRequiredById']>>,
  ) {
    if (!job.contractorParticipation) {
      return true;
    }

    return (
      job.contractorParticipation.status === 'joined' &&
      job.contractorParticipation.joinedUserId === user.id
    );
  }

  private async executeMutation(input: {
    job: EscrowJobRecord;
    action: EscrowExecutionRecord['action'];
    actorAddress: string;
    milestoneIndex?: number;
    requestContext?: RequestExecutionContext;
    operationKeyPayload: unknown;
    operation: (
      requestContext: EscrowContractRequestContext,
    ) => Promise<EscrowContractReceipt>;
    onConfirmed: () => void;
  }) {
    const executionContext = this.createExecutionContext(
      input.action,
      input.operationKeyPayload,
      input.requestContext,
    );
    const replayedExecution = executionContext.idempotencyKey
      ? await this.escrowRepository.findExecutionByIdempotencyKey({
          jobId: input.job.id,
          idempotencyKey: executionContext.idempotencyKey,
        })
      : null;

    if (replayedExecution) {
      this.assertIdempotentExecutionMatches(
        replayedExecution.execution,
        input.action,
        executionContext.operationKey,
      );
      if (replayedExecution.execution.status === 'confirmed') {
        return this.toExecutionReceipt(replayedExecution.execution);
      }

      throw this.mapPersistedExecutionError(replayedExecution.execution);
    }

    try {
      const receipt = await input.operation(executionContext);
      input.onConfirmed();
      input.job.updatedAt = receipt.confirmedAt;
      this.appendExecution(
        input.job,
        this.createConfirmedExecution(
          input.action,
          input.actorAddress,
          receipt,
          executionContext,
          {
            milestoneIndex: input.milestoneIndex,
            escrowId: input.job.onchain.escrowId ?? undefined,
          },
        ),
      );
      await this.escrowRepository.save(input.job);
      return receipt;
    } catch (error) {
      input.job.updatedAt = Date.now();
      this.appendExecution(
        input.job,
        this.createFailedExecution(
          input.action,
          input.actorAddress,
          input.job,
          error,
          executionContext,
          input.milestoneIndex,
        ),
      );
      await this.escrowRepository.save(input.job);
      throw this.mapGatewayError(error);
    }
  }

  private createExecutionContext(
    action: EscrowExecutionRecord['action'],
    operationKeyPayload: unknown,
    requestContext?: RequestExecutionContext,
  ): EscrowContractRequestContext {
    const requestId = requestContext?.requestId ?? createRequestId('svc');
    const idempotencyKey = requestContext?.idempotencyKey ?? null;
    const operationKey = buildExecutionOperationKey(
      action,
      operationKeyPayload,
    );

    return {
      requestId,
      idempotencyKey,
      operationKey,
      correlationId: buildExecutionCorrelationId({
        requestId,
        action,
        operationKey,
        idempotencyKey,
      }),
    };
  }

  private async maybeReplayJobMutation<T>(input: {
    job: EscrowJobRecord;
    action: EscrowExecutionRecord['action'];
    operationKeyPayload: unknown;
    requestContext?: RequestExecutionContext;
    buildResponse: (execution: EscrowExecutionRecord) => T;
  }): Promise<T | null> {
    const idempotencyKey = input.requestContext?.idempotencyKey ?? null;
    if (!idempotencyKey) {
      return null;
    }

    const operationKey = buildExecutionOperationKey(
      input.action,
      input.operationKeyPayload,
    );
    const replayedExecution =
      await this.escrowRepository.findExecutionByIdempotencyKey({
        jobId: input.job.id,
        idempotencyKey,
      });

    if (!replayedExecution) {
      return null;
    }

    this.assertIdempotentExecutionMatches(
      replayedExecution.execution,
      input.action,
      operationKey,
    );
    if (replayedExecution.execution.status === 'confirmed') {
      return input.buildResponse(replayedExecution.execution);
    }

    throw this.mapPersistedExecutionError(replayedExecution.execution);
  }

  private assertIdempotentExecutionMatches(
    execution: EscrowExecutionRecord,
    action: EscrowExecutionRecord['action'],
    operationKey: string,
  ) {
    if (
      execution.action !== action ||
      (execution.operationKey ?? null) !== operationKey
    ) {
      throw new ConflictException(
        'Idempotency key has already been used for a different escrow mutation',
      );
    }
  }

  private toExecutionReceipt(
    execution: EscrowExecutionRecord,
  ): EscrowContractReceipt {
    if (
      !execution.txHash ||
      execution.blockNumber === undefined ||
      execution.confirmedAt === undefined
    ) {
      throw new ConflictException(
        'Persisted confirmed execution is missing receipt metadata',
      );
    }

    return {
      chainId: execution.chainId,
      contractAddress: execution.contractAddress,
      txHash: execution.txHash,
      blockNumber: execution.blockNumber,
      submittedAt: execution.submittedAt,
      confirmedAt: execution.confirmedAt,
    };
  }

  private requireExecutionTxHash(execution: EscrowExecutionRecord) {
    if (!execution.txHash) {
      throw new ConflictException('Persisted execution is missing tx hash');
    }

    return execution.txHash;
  }

  private mapPersistedExecutionError(execution: EscrowExecutionRecord) {
    const message =
      execution.failureMessage ?? 'Escrow execution failed previously';
    if (execution.failureCode === 'relay_unavailable') {
      return new ServiceUnavailableException(message);
    }

    return new BadGatewayException(message);
  }

  private async getJobOrThrow(jobId: string) {
    const job = await this.escrowRepository.getById(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  private getMilestoneOrThrow(job: EscrowJobRecord, milestoneIndex: number) {
    if (!Number.isInteger(milestoneIndex) || milestoneIndex < 0) {
      throw new BadRequestException(
        'Milestone index must be a non-negative integer',
      );
    }

    const milestone = job.milestones[milestoneIndex];

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    return milestone;
  }

  private createJobHash(dto: CreateJobDto) {
    return `0x${createHash('sha256')
      .update(
        stableSerialize({
          title: dto.title,
          description: dto.description,
          category: dto.category.trim().toLowerCase(),
          termsJSON: dto.termsJSON,
        }),
      )
      .digest('hex')}`;
  }

  private requireContractorParticipation(job: EscrowJobRecord) {
    if (!job.contractorParticipation) {
      throw new ConflictException(
        'This contract does not support contractor join state',
      );
    }

    return job.contractorParticipation;
  }

  private requirePendingContractorParticipation(job: EscrowJobRecord) {
    const participation = this.requireContractorParticipation(job);

    if (participation.status === 'joined') {
      throw new ConflictException(
        'Contractor identity has already been locked',
      );
    }

    return participation;
  }

  private rotateInviteToken(
    participation: EscrowJobRecord['contractorParticipation'],
    now: number,
  ) {
    if (!participation) {
      throw new ConflictException(
        'This contract does not support contractor join state',
      );
    }

    const token = createInviteToken();
    participation.invite.token = token;
    participation.invite.tokenIssuedAt = now;
    return token;
  }

  private matchesInviteToken(
    participation: EscrowJobRecord['contractorParticipation'],
    inviteToken: string,
  ) {
    if (!participation) {
      return false;
    }

    const token = participation.invite.token;
    if (!token) {
      return false;
    }

    return token === inviteToken.trim();
  }

  private buildContractorJoinUrl(
    jobId: string,
    inviteToken: string,
    frontendOrigin: string,
  ) {
    const origin = this.resolveFrontendOrigin(frontendOrigin);
    return `${origin}/app/contracts/${jobId}?invite=${encodeURIComponent(
      inviteToken,
    )}`;
  }

  private resolveFrontendOrigin(frontendOrigin: string) {
    let origin: string;

    try {
      origin = new URL(frontendOrigin).origin;
    } catch {
      throw new BadRequestException(
        'frontendOrigin must be an absolute origin',
      );
    }

    const configuredOrigins = readCorsOrigins(
      process.env.NEST_API_CORS_ORIGINS,
    );

    if (
      configuredOrigins.length > 0 &&
      !isCorsOriginAllowed(origin, configuredOrigins)
    ) {
      throw new ForbiddenException(
        'frontendOrigin is not allowed by NEST_API_CORS_ORIGINS',
      );
    }

    return origin;
  }

  private maskEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    const [localPart, domainPart] = normalized.split('@');

    if (!localPart || !domainPart) {
      return normalized;
    }

    const localPreview =
      localPart.length <= 2
        ? `${localPart[0] ?? ''}*`
        : `${localPart[0] ?? ''}${'*'.repeat(
            Math.max(localPart.length - 2, 1),
          )}${localPart[localPart.length - 1] ?? ''}`;
    const [domainName, ...domainRest] = domainPart.split('.');
    const maskedDomainName =
      domainName.length <= 2
        ? `${domainName[0] ?? ''}*`
        : `${domainName[0] ?? ''}${'*'.repeat(
            Math.max(domainName.length - 2, 1),
          )}${domainName[domainName.length - 1] ?? ''}`;

    return `${localPreview}@${[maskedDomainName, ...domainRest].join('.')}`;
  }

  private appendAudit(job: EscrowJobRecord, event: EscrowAuditEvent) {
    job.audit.push(event);
  }

  private appendExecution(
    job: EscrowJobRecord,
    execution: EscrowExecutionRecord,
  ) {
    job.executions.push(execution);
  }

  private requireEscrowId(job: EscrowJobRecord) {
    if (!job.onchain.escrowId) {
      throw new ConflictException('Job has not been created onchain');
    }
    return job.onchain.escrowId;
  }

  private createConfirmedExecution(
    action: EscrowExecutionRecord['action'],
    actorAddress: string,
    receipt: EscrowContractReceipt,
    requestContext: EscrowContractRequestContext,
    extra: {
      milestoneIndex?: number;
      escrowId?: string;
    } = {},
  ): EscrowExecutionRecord {
    return {
      id: randomUUID(),
      action,
      actorAddress,
      chainId: receipt.chainId,
      contractAddress: receipt.contractAddress,
      requestId: requestContext.requestId,
      correlationId: requestContext.correlationId,
      idempotencyKey: requestContext.idempotencyKey ?? undefined,
      operationKey: requestContext.operationKey,
      txHash: receipt.txHash,
      status: 'confirmed',
      blockNumber: receipt.blockNumber,
      submittedAt: receipt.submittedAt,
      confirmedAt: receipt.confirmedAt,
      milestoneIndex: extra.milestoneIndex,
      escrowId: extra.escrowId,
    };
  }

  private createFailedExecution(
    action: EscrowExecutionRecord['action'],
    actorAddress: string,
    job: EscrowJobRecord,
    error: unknown,
    requestContext: EscrowContractRequestContext,
    milestoneIndex?: number,
  ): EscrowExecutionRecord {
    if (error instanceof EscrowContractGatewayError) {
      return {
        id: randomUUID(),
        action,
        actorAddress,
        chainId: error.chainId,
        contractAddress: error.contractAddress,
        requestId: requestContext.requestId,
        correlationId: requestContext.correlationId,
        idempotencyKey: requestContext.idempotencyKey ?? undefined,
        operationKey: requestContext.operationKey,
        txHash: error.txHash,
        status: 'failed',
        submittedAt: error.submittedAt ?? Date.now(),
        milestoneIndex,
        escrowId: job.onchain.escrowId ?? undefined,
        failureCode: error.code,
        failureMessage: error.message,
      };
    }

    return {
      id: randomUUID(),
      action,
      actorAddress,
      chainId: job.onchain.chainId,
      contractAddress: job.onchain.contractAddress,
      requestId: requestContext.requestId,
      correlationId: requestContext.correlationId,
      idempotencyKey: requestContext.idempotencyKey ?? undefined,
      operationKey: requestContext.operationKey,
      status: 'failed',
      submittedAt: Date.now(),
      milestoneIndex,
      escrowId: job.onchain.escrowId ?? undefined,
      failureCode: 'unexpected_error',
      failureMessage:
        error instanceof Error ? error.message : 'Unexpected escrow error',
    };
  }

  private mapGatewayError(error: unknown) {
    if (error instanceof EscrowContractGatewayError) {
      if (error.code === 'relay_unavailable') {
        return new ServiceUnavailableException(error.message);
      }
      return new BadGatewayException(error.message);
    }

    if (error instanceof Error) {
      return error;
    }

    return new BadGatewayException('Escrow execution failed');
  }

  private syncJobStatus(job: EscrowJobRecord) {
    const milestoneStatuses = job.milestones.map(
      (milestone) => milestone.status,
    );

    if (milestoneStatuses.includes('disputed')) {
      job.status = 'disputed';
      return;
    }

    const hasFinalMilestones =
      milestoneStatuses.length > 0 &&
      milestoneStatuses.every(
        (status) => status === 'released' || status === 'refunded',
      );

    if (hasFinalMilestones) {
      job.status = milestoneStatuses.includes('refunded')
        ? 'resolved'
        : 'completed';
      return;
    }

    if (
      milestoneStatuses.some(
        (status) =>
          status === 'delivered' ||
          status === 'released' ||
          status === 'refunded',
      )
    ) {
      job.status = 'in_progress';
      return;
    }

    if (job.fundedAmount !== null) {
      job.status = 'funded';
      return;
    }

    job.status = 'draft';
  }
}
