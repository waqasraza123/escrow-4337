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
import { normalizeEvmAddress } from '../../common/evm-address';
import { ESCROW_REPOSITORY } from '../../persistence/persistence.tokens';
import type { EscrowRepository } from '../../persistence/persistence.types';
import type {
  ContractorInviteDto,
  CreateJobDto,
  JoinContractorDto,
  UpdateContractorEmailDto,
  DeliverMilestoneDto,
  DisputeMilestoneDto,
  FundJobDto,
  ResolveMilestoneDto,
  SetMilestonesDto,
} from './escrow.dto';
import { EscrowContractGatewayError } from './onchain/escrow-contract.errors';
import { ESCROW_CONTRACT_GATEWAY } from './onchain/escrow-contract.tokens';
import type {
  EscrowContractGateway,
  EscrowContractReceipt,
} from './onchain/escrow-contract.types';
import { EscrowActorService } from './escrow-actor.service';
import type {
  ContractorInviteResponse,
  ContractorJoinReadinessResponse,
  CreateJobResponse,
  EscrowAuditBundle,
  EscrowAuditEvent,
  EscrowContractorInviteDeliveryMode,
  EscrowContractorParticipationPublicView,
  EscrowContractorParticipationView,
  EscrowExecutionRecord,
  FundJobResponse,
  EscrowJobRecord,
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

function hashToBytes32(value: unknown) {
  return `0x${createHash('sha256').update(stableSerialize(value)).digest('hex')}`;
}

function createInviteToken() {
  return randomBytes(24).toString('hex');
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
  ): Promise<CreateJobResponse> {
    const now = Date.now();
    const jobId = randomUUID();
    const jobHash = this.createJobHash(dto);
    const actorAddress =
      await this.escrowActorService.resolveClientForCreate(userId);
    const workerAddress = normalizeEvmAddress(dto.workerAddress);
    const currencyAddress = normalizeEvmAddress(dto.currencyAddress);
    const createdJob = await this.escrowContractGateway.createJob({
      actorAddress,
      workerAddress,
      currencyAddress,
      jobHash,
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
      },
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
      this.createConfirmedExecution('create_job', actorAddress, createdJob, {
        escrowId: createdJob.escrowId,
      }),
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
    const regenerated =
      dto.regenerate === true || !participation.invite.token;
    const token = regenerated
      ? this.rotateInviteToken(participation, Date.now())
      : participation.invite.token ?? this.rotateInviteToken(participation, Date.now());
    const joinUrl = this.buildContractorJoinUrl(job.id, token, dto.frontendOrigin);
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
          participation.joinedUserId === user.id ? 'joined' : 'claimed_by_other',
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
  ): Promise<FundJobResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolveClientForJob(
      userId,
      job,
    );

    if (job.fundedAmount !== null) {
      throw new ConflictException('Job has already been funded');
    }

    const fundedAmount = normalizeAmount(dto.amount);
    const fundedAmountMinorUnits = parseAmountToMinorUnits(
      dto.amount,
    ).toString();
    const receipt = await this.executeMutation({
      job,
      action: 'fund_job',
      actorAddress,
      operation: () =>
        this.escrowContractGateway.fundJob({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          amountMinorUnits: fundedAmountMinorUnits,
        }),
      onConfirmed: () => {
        job.fundedAmount = fundedAmount;
        job.updatedAt = Date.now();
        this.syncJobStatus(job);
        this.appendAudit(job, {
          type: 'job.funded',
          at: Date.now(),
          payload: {
            jobId,
            amount: fundedAmount,
          },
        });
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

  async setMilestones(
    userId: string,
    jobId: string,
    dto: SetMilestonesDto,
  ): Promise<SetMilestonesResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolveClientForJob(
      userId,
      job,
    );

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
      operation: () =>
        this.escrowContractGateway.setMilestones({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          amountsMinorUnits: dto.milestones.map((milestone) =>
            parseAmountToMinorUnits(milestone.amount).toString(),
          ),
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
  ): Promise<MilestoneMutationResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolveWorkerForJob(
      userId,
      job,
    );
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);

    if (milestone.status !== 'pending') {
      throw new ConflictException('Only pending milestones can be delivered');
    }

    const receipt = await this.executeMutation({
      job,
      action: 'deliver_milestone',
      actorAddress,
      milestoneIndex,
      operation: () =>
        this.escrowContractGateway.deliverMilestone({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          milestoneIndex,
          deliverableHash: hashToBytes32({
            note: dto.note,
            evidenceUrls: dto.evidenceUrls,
          }),
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
  ): Promise<MilestoneMutationResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolveClientForJob(
      userId,
      job,
    );
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);

    if (milestone.status !== 'delivered') {
      throw new ConflictException('Only delivered milestones can be released');
    }

    const receipt = await this.executeMutation({
      job,
      action: 'release_milestone',
      actorAddress,
      milestoneIndex,
      operation: () =>
        this.escrowContractGateway.releaseMilestone({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          milestoneIndex,
        }),
      onConfirmed: () => {
        const now = Date.now();
        milestone.status = 'released';
        milestone.releasedAt = now;
        job.updatedAt = now;
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
  ): Promise<MilestoneMutationResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress = await this.escrowActorService.resolveClientForJob(
      userId,
      job,
    );
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);

    if (milestone.status !== 'delivered') {
      throw new ConflictException('Only delivered milestones can be disputed');
    }

    const receipt = await this.executeMutation({
      job,
      action: 'open_dispute',
      actorAddress,
      milestoneIndex,
      operation: () =>
        this.escrowContractGateway.openDispute({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          milestoneIndex,
          reasonHash: hashToBytes32(dto.reason),
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
  ): Promise<MilestoneMutationResponse> {
    const job = await this.getJobOrThrow(jobId);
    const actorAddress =
      await this.escrowActorService.resolveArbitrator(userId);
    const milestone = this.getMilestoneOrThrow(job, milestoneIndex);

    if (milestone.status !== 'disputed') {
      throw new ConflictException('Only disputed milestones can be resolved');
    }

    const splitBpsClient = dto.action === 'refund' ? 10_000 : 0;
    const receipt = await this.executeMutation({
      job,
      action: 'resolve_dispute',
      actorAddress,
      milestoneIndex,
      operation: () =>
        this.escrowContractGateway.resolveDispute({
          actorAddress,
          escrowId: this.requireEscrowId(job),
          milestoneIndex,
          splitBpsClient,
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
    const { audit, executions, contractorParticipation, ...jobView } =
      cloneValue(job);
    void audit;
    void executions;
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
    const { contractorParticipation, ...jobView } = cloneValue(job);

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
    operation: () => Promise<EscrowContractReceipt>;
    onConfirmed: () => void;
  }) {
    try {
      const receipt = await input.operation();
      input.onConfirmed();
      input.job.updatedAt = receipt.confirmedAt;
      this.appendExecution(
        input.job,
        this.createConfirmedExecution(
          input.action,
          input.actorAddress,
          receipt,
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
          input.milestoneIndex,
        ),
      );
      await this.escrowRepository.save(input.job);
      throw this.mapGatewayError(error);
    }
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
      throw new ConflictException('Contractor identity has already been locked');
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
      throw new BadRequestException('frontendOrigin must be an absolute origin');
    }

    const configuredOrigins = readCorsOrigins(process.env.NEST_API_CORS_ORIGINS);

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
    milestoneIndex?: number,
  ): EscrowExecutionRecord {
    if (error instanceof EscrowContractGatewayError) {
      return {
        id: randomUUID(),
        action,
        actorAddress,
        chainId: error.chainId,
        contractAddress: error.contractAddress,
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
