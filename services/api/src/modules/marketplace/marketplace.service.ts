import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { normalizeEvmAddress } from '../../common/evm-address';
import {
  ESCROW_REPOSITORY,
  MARKETPLACE_REPOSITORY,
} from '../../persistence/persistence.tokens';
import type {
  EscrowRepository,
  MarketplaceRepository,
} from '../../persistence/persistence.types';
import type { EscrowMilestoneRecord } from '../escrow/escrow.types';
import { EscrowActorService } from '../escrow/escrow-actor.service';
import { EscrowService } from '../escrow/escrow.service';
import { EscrowOnchainAuthorityService } from '../operations/escrow-onchain-authority.service';
import { UsersService } from '../users/users.service';
import {
  isEoaWallet,
  isSmartAccountWallet,
  type UserRecord,
} from '../users/users.types';
import type {
  ApplyToOpportunityDto,
  CreateMarketplaceAbuseReportDto,
  CreateMarketplaceOpportunityDto,
  MarketplaceModerationReportsQueryDto,
  MarketplaceOpportunitiesQueryDto,
  MarketplaceProfilesQueryDto,
  UpdateMarketplaceAbuseReportDto,
  UpdateMarketplaceOpportunityDto,
  UpdateMarketplaceProofsDto,
  UpdateMarketplaceScreeningDto,
  UpdateModerationDto,
  UpsertMarketplaceProfileDto,
} from './marketplace.dto';
import type {
  EscrowReadinessStatus,
  HireApplicationResponse,
  MarketplaceAbuseReportRecord,
  MarketplaceAbuseReportResponse,
  MarketplaceAbuseReportsListResponse,
  MarketplaceAbuseReportStatus,
  MarketplaceAbuseReportSubjectSummary,
  MarketplaceAbuseReportView,
  MarketplaceApplicationDossier,
  MarketplaceApplicationDossierResponse,
  MarketplaceApplicationRecord,
  MarketplaceApplicationView,
  MarketplaceApplicationsListResponse,
  MarketplaceClientSummary,
  MarketplaceCryptoReadiness,
  MarketplaceEscrowStats,
  MarketplaceFitBreakdownEntry,
  MarketplaceMatchesResponse,
  MarketplaceMatchSummary,
  MarketplaceModerationDashboard,
  MarketplaceOpportunityDetailView,
  MarketplaceOpportunityRecord,
  MarketplaceOpportunityResponse,
  MarketplaceOpportunityView,
  MarketplaceOpportunitiesListResponse,
  MarketplaceProfileRecord,
  MarketplaceProfileResponse,
  MarketplaceProfilesListResponse,
  MarketplaceProfileView,
  MarketplaceScreeningAnswer,
  MarketplaceScreeningQuestion,
  MarketplaceTalentProofArtifact,
  MarketplaceTalentSummary,
  MarketplaceVerificationLevel,
  ModerationStatus,
} from './marketplace.types';

function normalizeTextArray(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function normalizeProofArtifacts(
  values: Array<
    | MarketplaceTalentProofArtifact
    | (Omit<MarketplaceTalentProofArtifact, 'jobId'> & {
        jobId?: string | null;
      })
  >,
): MarketplaceTalentProofArtifact[] {
  return values.map((artifact) => ({
    ...artifact,
    id: artifact.id.trim(),
    label: artifact.label.trim(),
    url: artifact.url.trim(),
    jobId: artifact.jobId?.trim() || null,
  }));
}

function normalizeScreeningQuestions(values: MarketplaceScreeningQuestion[]) {
  return values.map((question) => ({
    ...question,
    id: question.id.trim(),
    prompt: question.prompt.trim(),
  }));
}

function normalizeScreeningAnswers(values: MarketplaceScreeningAnswer[]) {
  return values.map((answer) => ({
    ...answer,
    questionId: answer.questionId.trim(),
    answer: answer.answer.trim(),
  }));
}

function containsQuery(haystack: string, query?: string) {
  if (!query) {
    return true;
  }

  return haystack.toLowerCase().includes(query.trim().toLowerCase());
}

function compareModerationStatus(
  left: ModerationStatus,
  right: ModerationStatus,
) {
  const order = {
    visible: 0,
    hidden: 1,
    suspended: 2,
  } as const;

  return order[left] - order[right];
}

function roundPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function pickAverageContractValueBand(values: number[]) {
  if (values.length === 0) {
    return 'unknown' as const;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (average < 1000) {
    return 'small' as const;
  }
  if (average < 5000) {
    return 'medium' as const;
  }
  return 'large' as const;
}

function toNumberAmount(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function milestoneDeliveredOnTime(milestone: EscrowMilestoneRecord) {
  if (!milestone.dueAt || !milestone.deliveredAt) {
    return null;
  }

  return milestone.deliveredAt <= milestone.dueAt;
}

@Injectable()
export class MarketplaceService {
  constructor(
    @Inject(MARKETPLACE_REPOSITORY)
    private readonly marketplaceRepository: MarketplaceRepository,
    @Inject(ESCROW_REPOSITORY)
    private readonly escrowRepository: EscrowRepository,
    private readonly usersService: UsersService,
    private readonly escrowService: EscrowService,
    private readonly escrowActorService: EscrowActorService,
    private readonly escrowOnchainAuthority: EscrowOnchainAuthorityService,
  ) {}

  async getMyProfile(userId: string): Promise<MarketplaceProfileResponse> {
    const profile = await this.requireProfileByUserId(userId);
    return {
      profile: await this.toProfileView(profile),
    };
  }

  async upsertProfile(
    userId: string,
    dto: UpsertMarketplaceProfileDto,
  ): Promise<MarketplaceProfileResponse> {
    const now = Date.now();
    const existingBySlug = await this.marketplaceRepository.getProfileBySlug(
      dto.slug,
    );

    if (existingBySlug && existingBySlug.userId !== userId) {
      throw new ConflictException('Marketplace slug is already in use');
    }

    const existing =
      await this.marketplaceRepository.getProfileByUserId(userId);
    const profile: MarketplaceProfileRecord = {
      userId,
      slug: dto.slug,
      displayName: dto.displayName,
      headline: dto.headline,
      bio: dto.bio,
      skills: normalizeTextArray(dto.skills),
      specialties: normalizeTextArray(dto.specialties),
      portfolioUrls: normalizeTextArray(dto.portfolioUrls),
      rateMin: dto.rateMin ?? null,
      rateMax: dto.rateMax ?? null,
      timezone: dto.timezone,
      availability: dto.availability,
      preferredEngagements: Array.from(new Set(dto.preferredEngagements)),
      proofArtifacts: existing?.proofArtifacts ?? [],
      cryptoReadiness: dto.cryptoReadiness,
      moderationStatus: existing?.moderationStatus ?? 'visible',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (
      profile.rateMin &&
      profile.rateMax &&
      Number(profile.rateMin) > Number(profile.rateMax)
    ) {
      throw new BadRequestException(
        'Profile minimum rate cannot exceed maximum rate',
      );
    }

    const nextPortfolioArtifacts = normalizeProofArtifacts(
      dto.portfolioUrls.map((url, index) => ({
        id: `portfolio-${index + 1}`,
        label: `Portfolio ${index + 1}`,
        url,
        kind: 'portfolio',
        jobId: null,
      })),
    );
    const nonPortfolioProofs =
      existing?.proofArtifacts.filter(
        (artifact) => artifact.kind !== 'portfolio',
      ) ?? [];
    profile.proofArtifacts = [...nextPortfolioArtifacts, ...nonPortfolioProofs];

    await this.marketplaceRepository.saveProfile(profile);

    return {
      profile: await this.toProfileView(profile),
    };
  }

  async updateProfileProofs(
    userId: string,
    dto: UpdateMarketplaceProofsDto,
  ): Promise<MarketplaceProfileResponse> {
    const profile = await this.requireProfileByUserId(userId);
    const portfolioProofs = profile.proofArtifacts.filter(
      (artifact) => artifact.kind === 'portfolio',
    );
    profile.proofArtifacts = [
      ...portfolioProofs,
      ...normalizeProofArtifacts(
        dto.proofArtifacts.filter((artifact) => artifact.kind !== 'portfolio'),
      ),
    ];
    profile.updatedAt = Date.now();
    await this.marketplaceRepository.saveProfile(profile);
    return {
      profile: await this.toProfileView(profile),
    };
  }

  async listProfiles(
    query: MarketplaceProfilesQueryDto,
  ): Promise<MarketplaceProfilesListResponse> {
    const profiles = await this.marketplaceRepository.listProfiles();
    const visibleProfiles = profiles.filter(
      (profile) =>
        profile.moderationStatus === 'visible' &&
        this.isProfileComplete(profile),
    );
    const rankedProfiles = await Promise.all(
      visibleProfiles.map(async (profile) => ({
        profile,
        view: await this.toProfileView(profile),
      })),
    );

    const filtered = rankedProfiles
      .filter(({ profile }) => {
        if (query.availability && profile.availability !== query.availability) {
          return false;
        }

        if (
          query.skill &&
          ![...profile.skills, ...profile.specialties].some(
            (skill) =>
              skill.toLowerCase() === query.skill?.trim().toLowerCase(),
          )
        ) {
          return false;
        }

        const searchable = [
          profile.displayName,
          profile.headline,
          profile.bio,
          ...profile.skills,
          ...profile.specialties,
        ].join(' ');

        return containsQuery(searchable, query.q);
      })
      .sort((left, right) => {
        if (
          right.view.escrowStats.completionCount !==
          left.view.escrowStats.completionCount
        ) {
          return (
            right.view.escrowStats.completionCount -
            left.view.escrowStats.completionCount
          );
        }
        if (
          right.view.completedEscrowCount !== left.view.completedEscrowCount
        ) {
          return (
            right.view.completedEscrowCount - left.view.completedEscrowCount
          );
        }
        return right.profile.updatedAt - left.profile.updatedAt;
      })
      .slice(0, query.limit)
      .map(({ view }) => view);

    return {
      profiles: filtered,
    };
  }

  async getPublicProfile(slug: string): Promise<MarketplaceProfileResponse> {
    const profile = await this.marketplaceRepository.getProfileBySlug(
      slug.trim().toLowerCase(),
    );

    if (
      !profile ||
      profile.moderationStatus !== 'visible' ||
      !this.isProfileComplete(profile)
    ) {
      throw new NotFoundException('Marketplace profile not found');
    }

    return {
      profile: await this.toProfileView(profile),
    };
  }

  async createOpportunity(
    userId: string,
    dto: CreateMarketplaceOpportunityDto,
  ): Promise<MarketplaceOpportunityResponse> {
    const now = Date.now();
    this.validateBudgetRange(dto.budgetMin ?? null, dto.budgetMax ?? null);

    const opportunity: MarketplaceOpportunityRecord = {
      id: randomUUID(),
      ownerUserId: userId,
      title: dto.title,
      summary: dto.summary,
      description: dto.description,
      category: dto.category.trim().toLowerCase(),
      currencyAddress: dto.currencyAddress,
      requiredSkills: normalizeTextArray(dto.requiredSkills),
      mustHaveSkills: normalizeTextArray(dto.mustHaveSkills),
      outcomes: normalizeTextArray(dto.outcomes),
      acceptanceCriteria: normalizeTextArray(dto.acceptanceCriteria),
      screeningQuestions: normalizeScreeningQuestions(dto.screeningQuestions),
      visibility: dto.visibility,
      status: 'draft',
      budgetMin: dto.budgetMin ?? null,
      budgetMax: dto.budgetMax ?? null,
      timeline: dto.timeline,
      desiredStartAt: dto.desiredStartAt ?? null,
      timezoneOverlapHours: dto.timezoneOverlapHours ?? null,
      engagementType: dto.engagementType,
      cryptoReadinessRequired: dto.cryptoReadinessRequired,
      moderationStatus: 'visible',
      publishedAt: null,
      hiredApplicationId: null,
      hiredJobId: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.marketplaceRepository.saveOpportunity(opportunity);

    return {
      opportunity: await this.toOpportunityView(opportunity),
    };
  }

  async updateOpportunity(
    userId: string,
    opportunityId: string,
    dto: UpdateMarketplaceOpportunityDto,
  ): Promise<MarketplaceOpportunityResponse> {
    const opportunity = await this.requireOpportunity(opportunityId);
    this.assertOpportunityOwner(userId, opportunity);

    if (opportunity.status === 'hired' || opportunity.status === 'archived') {
      throw new ConflictException(
        'Closed marketplace opportunities cannot be edited',
      );
    }

    const next: MarketplaceOpportunityRecord = {
      ...opportunity,
      title: dto.title ?? opportunity.title,
      summary: dto.summary ?? opportunity.summary,
      description: dto.description ?? opportunity.description,
      category: dto.category?.trim().toLowerCase() ?? opportunity.category,
      currencyAddress: dto.currencyAddress ?? opportunity.currencyAddress,
      requiredSkills: dto.requiredSkills
        ? normalizeTextArray(dto.requiredSkills)
        : opportunity.requiredSkills,
      mustHaveSkills: dto.mustHaveSkills
        ? normalizeTextArray(dto.mustHaveSkills)
        : opportunity.mustHaveSkills,
      outcomes: dto.outcomes
        ? normalizeTextArray(dto.outcomes)
        : opportunity.outcomes,
      acceptanceCriteria: dto.acceptanceCriteria
        ? normalizeTextArray(dto.acceptanceCriteria)
        : opportunity.acceptanceCriteria,
      screeningQuestions: dto.screeningQuestions
        ? normalizeScreeningQuestions(dto.screeningQuestions)
        : opportunity.screeningQuestions,
      visibility: dto.visibility ?? opportunity.visibility,
      budgetMin:
        dto.budgetMin !== undefined
          ? (dto.budgetMin ?? null)
          : opportunity.budgetMin,
      budgetMax:
        dto.budgetMax !== undefined
          ? (dto.budgetMax ?? null)
          : opportunity.budgetMax,
      timeline: dto.timeline ?? opportunity.timeline,
      desiredStartAt:
        dto.desiredStartAt !== undefined
          ? (dto.desiredStartAt ?? null)
          : opportunity.desiredStartAt,
      timezoneOverlapHours:
        dto.timezoneOverlapHours !== undefined
          ? (dto.timezoneOverlapHours ?? null)
          : opportunity.timezoneOverlapHours,
      engagementType: dto.engagementType ?? opportunity.engagementType,
      cryptoReadinessRequired:
        dto.cryptoReadinessRequired ?? opportunity.cryptoReadinessRequired,
      updatedAt: Date.now(),
    };

    this.validateBudgetRange(next.budgetMin, next.budgetMax);
    await this.marketplaceRepository.saveOpportunity(next);

    return {
      opportunity: await this.toOpportunityView(next),
    };
  }

  async updateOpportunityScreening(
    userId: string,
    opportunityId: string,
    dto: UpdateMarketplaceScreeningDto,
  ): Promise<MarketplaceOpportunityResponse> {
    const opportunity = await this.requireOpportunity(opportunityId);
    this.assertOpportunityOwner(userId, opportunity);
    opportunity.outcomes = normalizeTextArray(dto.outcomes);
    opportunity.acceptanceCriteria = normalizeTextArray(dto.acceptanceCriteria);
    opportunity.mustHaveSkills = normalizeTextArray(dto.mustHaveSkills);
    opportunity.screeningQuestions = normalizeScreeningQuestions(
      dto.screeningQuestions,
    );
    opportunity.desiredStartAt =
      dto.desiredStartAt !== undefined
        ? (dto.desiredStartAt ?? null)
        : opportunity.desiredStartAt;
    opportunity.timezoneOverlapHours =
      dto.timezoneOverlapHours !== undefined
        ? (dto.timezoneOverlapHours ?? null)
        : opportunity.timezoneOverlapHours;
    opportunity.engagementType =
      dto.engagementType ?? opportunity.engagementType;
    opportunity.cryptoReadinessRequired =
      dto.cryptoReadinessRequired ?? opportunity.cryptoReadinessRequired;
    opportunity.updatedAt = Date.now();
    await this.marketplaceRepository.saveOpportunity(opportunity);
    return {
      opportunity: await this.toOpportunityView(opportunity),
    };
  }

  async publishOpportunity(
    userId: string,
    opportunityId: string,
  ): Promise<MarketplaceOpportunityResponse> {
    const opportunity = await this.requireOpportunity(opportunityId);
    this.assertOpportunityOwner(userId, opportunity);
    if (opportunity.moderationStatus === 'suspended') {
      throw new ForbiddenException(
        'Suspended marketplace opportunities cannot be published',
      );
    }

    const profile = await this.requireProfileByUserId(userId);
    if (!this.isProfileComplete(profile)) {
      throw new ForbiddenException(
        'Complete your marketplace profile before publishing briefs',
      );
    }

    const readiness = await this.getEscrowReadiness(userId);
    if (readiness !== 'ready') {
      throw new ForbiddenException(
        readiness === 'wallet_required'
          ? 'Link a wallet before publishing marketplace briefs'
          : 'Provision and default a smart account before publishing marketplace briefs',
      );
    }

    const now = Date.now();
    opportunity.status = 'published';
    opportunity.publishedAt = opportunity.publishedAt ?? now;
    opportunity.updatedAt = now;
    await this.marketplaceRepository.saveOpportunity(opportunity);

    return {
      opportunity: await this.toOpportunityView(opportunity),
    };
  }

  async pauseOpportunity(
    userId: string,
    opportunityId: string,
  ): Promise<MarketplaceOpportunityResponse> {
    const opportunity = await this.requireOpportunity(opportunityId);
    this.assertOpportunityOwner(userId, opportunity);
    opportunity.status = 'paused';
    opportunity.updatedAt = Date.now();
    await this.marketplaceRepository.saveOpportunity(opportunity);

    return {
      opportunity: await this.toOpportunityView(opportunity),
    };
  }

  async listMyOpportunities(
    userId: string,
  ): Promise<MarketplaceOpportunitiesListResponse> {
    const opportunities = (await this.marketplaceRepository.listOpportunities())
      .filter((opportunity) => opportunity.ownerUserId === userId)
      .sort((left, right) => right.updatedAt - left.updatedAt);

    return {
      opportunities: await Promise.all(
        opportunities.map((opportunity) => this.toOpportunityView(opportunity)),
      ),
    };
  }

  async listOpportunities(
    query: MarketplaceOpportunitiesQueryDto,
  ): Promise<MarketplaceOpportunitiesListResponse> {
    const opportunities = await this.marketplaceRepository.listOpportunities();
    const filtered = opportunities
      .filter(
        (opportunity) =>
          opportunity.status === 'published' &&
          opportunity.moderationStatus === 'visible' &&
          opportunity.visibility === 'public',
      )
      .filter((opportunity) => {
        if (
          query.category &&
          opportunity.category !== query.category.trim().toLowerCase()
        ) {
          return false;
        }

        if (
          query.skill &&
          ![...opportunity.requiredSkills, ...opportunity.mustHaveSkills].some(
            (skill) =>
              skill.toLowerCase() === query.skill?.trim().toLowerCase(),
          )
        ) {
          return false;
        }

        const searchable = [
          opportunity.title,
          opportunity.summary,
          opportunity.description,
          opportunity.category,
          ...opportunity.requiredSkills,
          ...opportunity.mustHaveSkills,
          ...opportunity.outcomes,
        ].join(' ');

        return containsQuery(searchable, query.q);
      })
      .sort((left, right) => {
        if ((right.publishedAt ?? 0) !== (left.publishedAt ?? 0)) {
          return (right.publishedAt ?? 0) - (left.publishedAt ?? 0);
        }
        return right.createdAt - left.createdAt;
      })
      .slice(0, query.limit);

    return {
      opportunities: await Promise.all(
        filtered.map((opportunity) => this.toOpportunityView(opportunity)),
      ),
    };
  }

  async getPublicOpportunity(
    opportunityId: string,
  ): Promise<MarketplaceOpportunityResponse> {
    const opportunity = await this.requireOpportunity(opportunityId);

    if (
      opportunity.moderationStatus !== 'visible' ||
      opportunity.status !== 'published'
    ) {
      throw new NotFoundException('Marketplace opportunity not found');
    }

    return {
      opportunity: await this.toOpportunityDetailView(opportunity),
    };
  }

  async getOpportunityApplications(
    userId: string,
    opportunityId: string,
  ): Promise<MarketplaceApplicationsListResponse> {
    const opportunity = await this.requireOpportunity(opportunityId);
    this.assertOpportunityOwner(userId, opportunity);

    const applications = (await this.marketplaceRepository.listApplications())
      .filter((application) => application.opportunityId === opportunityId)
      .sort((left, right) => right.updatedAt - left.updatedAt);

    return {
      applications: await Promise.all(
        applications.map((application) => this.toApplicationView(application)),
      ),
    };
  }

  async getOpportunityMatches(
    userId: string,
    opportunityId: string,
  ): Promise<MarketplaceMatchesResponse> {
    const opportunity = await this.requireOpportunity(opportunityId);
    this.assertOpportunityOwner(userId, opportunity);
    const applications = (
      await this.marketplaceRepository.listApplications()
    ).filter((application) => application.opportunityId === opportunityId);
    const dossiers = await Promise.all(
      applications.map((application) =>
        this.buildApplicationDossier(application),
      ),
    );
    return {
      matches: dossiers.sort(
        (left, right) =>
          right.matchSummary.fitScore - left.matchSummary.fitScore ||
          left.applicationId.localeCompare(right.applicationId),
      ),
    };
  }

  async getApplicationDossier(
    userId: string,
    applicationId: string,
  ): Promise<MarketplaceApplicationDossierResponse> {
    const application = await this.requireApplication(applicationId);
    const opportunity = await this.requireOpportunity(
      application.opportunityId,
    );
    if (
      application.applicantUserId !== userId &&
      opportunity.ownerUserId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have access to this application dossier',
      );
    }
    return {
      dossier: await this.buildApplicationDossier(application),
    };
  }

  async applyToOpportunity(
    userId: string,
    opportunityId: string,
    dto: ApplyToOpportunityDto,
  ): Promise<MarketplaceOpportunityResponse> {
    const opportunity = await this.requireOpportunity(opportunityId);
    const applicant = await this.usersService.getRequiredById(userId);

    if (opportunity.ownerUserId === userId) {
      throw new ForbiddenException(
        'Clients cannot apply to their own marketplace opportunities',
      );
    }
    if (opportunity.status !== 'published') {
      throw new ConflictException(
        'Marketplace opportunity is not open for applications',
      );
    }
    if (opportunity.moderationStatus !== 'visible') {
      throw new ForbiddenException('Marketplace opportunity is not available');
    }

    const profile = await this.requireProfileByUserId(userId);
    if (profile.moderationStatus === 'suspended') {
      throw new ForbiddenException('Suspended marketplace talent cannot apply');
    }
    if (!this.isProfileComplete(profile)) {
      throw new ForbiddenException(
        'Complete your marketplace profile before applying',
      );
    }

    const selectedWallet = this.usersService.findWallet(
      applicant,
      dto.selectedWalletAddress,
    );
    if (
      !selectedWallet ||
      !isEoaWallet(selectedWallet) ||
      selectedWallet.verificationMethod !== 'siwe'
    ) {
      throw new ForbiddenException(
        'Applications require a linked SIWE-verified wallet',
      );
    }

    this.validateScreeningAnswers(
      opportunity.screeningQuestions,
      dto.screeningAnswers,
    );

    const applications = await this.marketplaceRepository.listApplications();
    const existing = applications.find(
      (application) =>
        application.opportunityId === opportunityId &&
        application.applicantUserId === userId,
    );

    if (
      existing &&
      existing.status !== 'withdrawn' &&
      existing.status !== 'rejected'
    ) {
      throw new ConflictException(
        'You already have an active application for this opportunity',
      );
    }

    const now = Date.now();
    const application: MarketplaceApplicationRecord = {
      id: existing?.id ?? randomUUID(),
      opportunityId,
      applicantUserId: userId,
      coverNote: dto.coverNote,
      proposedRate: dto.proposedRate ?? null,
      selectedWalletAddress: selectedWallet.address,
      screeningAnswers: normalizeScreeningAnswers(dto.screeningAnswers),
      deliveryApproach: dto.deliveryApproach,
      milestonePlanSummary: dto.milestonePlanSummary,
      estimatedStartAt: dto.estimatedStartAt ?? null,
      relevantProofArtifacts: normalizeProofArtifacts(
        dto.relevantProofArtifacts,
      ),
      portfolioUrls:
        dto.portfolioUrls.length > 0
          ? normalizeTextArray(dto.portfolioUrls)
          : profile.proofArtifacts
              .filter((artifact) => artifact.kind === 'portfolio')
              .map((artifact) => artifact.url),
      status: 'submitted',
      hiredJobId: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.marketplaceRepository.saveApplication(application);

    return {
      opportunity: await this.toOpportunityDetailView(
        opportunity,
        userId,
        applications
          .filter((candidate) => candidate.opportunityId === opportunityId)
          .concat(application)
          .filter(
            (candidate, index, all) =>
              all.findIndex((match) => match.id === candidate.id) === index,
          ),
      ),
    };
  }

  async reportProfile(
    userId: string,
    slug: string,
    dto: CreateMarketplaceAbuseReportDto,
  ): Promise<MarketplaceAbuseReportResponse> {
    const profile = await this.marketplaceRepository.getProfileBySlug(
      slug.trim().toLowerCase(),
    );

    if (
      !profile ||
      profile.moderationStatus !== 'visible' ||
      !this.isProfileComplete(profile)
    ) {
      throw new NotFoundException('Marketplace profile not found');
    }
    if (profile.userId === userId) {
      throw new ForbiddenException(
        'You cannot report your own marketplace profile',
      );
    }

    return this.createAbuseReport(userId, {
      subjectType: 'profile',
      subjectId: profile.userId,
      dto,
    });
  }

  async reportOpportunity(
    userId: string,
    opportunityId: string,
    dto: CreateMarketplaceAbuseReportDto,
  ): Promise<MarketplaceAbuseReportResponse> {
    const opportunity = await this.requireOpportunity(opportunityId);

    if (
      opportunity.moderationStatus !== 'visible' ||
      opportunity.status !== 'published'
    ) {
      throw new NotFoundException('Marketplace opportunity not found');
    }
    if (opportunity.ownerUserId === userId) {
      throw new ForbiddenException(
        'You cannot report your own marketplace opportunity',
      );
    }

    return this.createAbuseReport(userId, {
      subjectType: 'opportunity',
      subjectId: opportunity.id,
      dto,
    });
  }

  async listMyApplications(
    userId: string,
  ): Promise<MarketplaceApplicationsListResponse> {
    const applications = (await this.marketplaceRepository.listApplications())
      .filter((application) => application.applicantUserId === userId)
      .sort((left, right) => right.updatedAt - left.updatedAt);

    return {
      applications: await Promise.all(
        applications.map((application) => this.toApplicationView(application)),
      ),
    };
  }

  async withdrawApplication(
    userId: string,
    applicationId: string,
  ): Promise<MarketplaceApplicationsListResponse> {
    const application = await this.requireApplication(applicationId);

    if (application.applicantUserId !== userId) {
      throw new ForbiddenException(
        'Only the applicant can withdraw this application',
      );
    }
    if (application.status === 'hired') {
      throw new ConflictException(
        'Hired marketplace applications cannot be withdrawn',
      );
    }

    application.status = 'withdrawn';
    application.updatedAt = Date.now();
    await this.marketplaceRepository.saveApplication(application);
    return this.listMyApplications(userId);
  }

  async shortlistApplication(
    userId: string,
    applicationId: string,
  ): Promise<MarketplaceApplicationsListResponse> {
    const application = await this.requireApplication(applicationId);
    const opportunity = await this.requireOpportunity(
      application.opportunityId,
    );
    this.assertOpportunityOwner(userId, opportunity);
    this.assertOpportunityOpenForDecision(opportunity);

    application.status = 'shortlisted';
    application.updatedAt = Date.now();
    await this.marketplaceRepository.saveApplication(application);
    return this.getOpportunityApplications(userId, opportunity.id);
  }

  async rejectApplication(
    userId: string,
    applicationId: string,
  ): Promise<MarketplaceApplicationsListResponse> {
    const application = await this.requireApplication(applicationId);
    const opportunity = await this.requireOpportunity(
      application.opportunityId,
    );
    this.assertOpportunityOwner(userId, opportunity);
    this.assertOpportunityOpenForDecision(opportunity);

    application.status = 'rejected';
    application.updatedAt = Date.now();
    await this.marketplaceRepository.saveApplication(application);
    return this.getOpportunityApplications(userId, opportunity.id);
  }

  async hireApplication(
    userId: string,
    applicationId: string,
  ): Promise<HireApplicationResponse> {
    const application = await this.requireApplication(applicationId);
    const opportunity = await this.requireOpportunity(
      application.opportunityId,
    );
    this.assertOpportunityOwner(userId, opportunity);
    this.assertOpportunityOpenForDecision(opportunity);

    const dossier = await this.buildApplicationDossier(application);
    if (dossier.matchSummary.missingRequirements.length > 0) {
      throw new ConflictException(
        'This application still has unmet required hiring criteria',
      );
    }

    const applicantUser = await this.usersService.getRequiredById(
      application.applicantUserId,
    );

    const selectedWallet = this.usersService.findWallet(
      applicantUser,
      application.selectedWalletAddress,
    );
    if (
      !selectedWallet ||
      !isEoaWallet(selectedWallet) ||
      selectedWallet.verificationMethod !== 'siwe'
    ) {
      throw new ConflictException(
        'The hired application no longer has a valid SIWE-verified wallet',
      );
    }

    const createResponse = await this.escrowService.createJob(userId, {
      contractorEmail: applicantUser.email,
      workerAddress: selectedWallet.address,
      currencyAddress: opportunity.currencyAddress,
      title: opportunity.title,
      description: opportunity.description,
      category: opportunity.category,
      termsJSON: {
        marketplace: {
          opportunityId: opportunity.id,
          applicationId: application.id,
          visibility: opportunity.visibility,
          fitScore: dossier.matchSummary.fitScore,
          riskFlags: dossier.matchSummary.riskFlags,
        },
        hiringSpec: {
          outcomes: opportunity.outcomes,
          acceptanceCriteria: opportunity.acceptanceCriteria,
          mustHaveSkills: opportunity.mustHaveSkills,
          engagementType: opportunity.engagementType,
          cryptoReadinessRequired: opportunity.cryptoReadinessRequired,
        },
        proposal: {
          screeningAnswers: application.screeningAnswers,
          deliveryApproach: application.deliveryApproach,
          milestonePlanSummary: application.milestonePlanSummary,
          estimatedStartAt: application.estimatedStartAt,
        },
        budgetMin: opportunity.budgetMin,
        budgetMax: opportunity.budgetMax,
        timeline: opportunity.timeline,
      },
    });

    const now = Date.now();
    application.status = 'hired';
    application.hiredJobId = createResponse.jobId;
    application.updatedAt = now;
    opportunity.status = 'hired';
    opportunity.hiredApplicationId = application.id;
    opportunity.hiredJobId = createResponse.jobId;
    opportunity.updatedAt = now;

    const allApplications = await this.marketplaceRepository.listApplications();
    const siblingApplications = allApplications.filter(
      (candidate) =>
        candidate.opportunityId === opportunity.id &&
        candidate.id !== application.id,
    );

    for (const sibling of siblingApplications) {
      if (sibling.status === 'submitted' || sibling.status === 'shortlisted') {
        sibling.status = 'rejected';
        sibling.updatedAt = now;
        await this.marketplaceRepository.saveApplication(sibling);
      }
    }

    await this.marketplaceRepository.saveApplication(application);
    await this.marketplaceRepository.saveOpportunity(opportunity);

    return {
      applicationId: application.id,
      opportunityId: opportunity.id,
      jobId: createResponse.jobId,
    };
  }

  async getModerationDashboard(
    userId: string,
  ): Promise<MarketplaceModerationDashboard> {
    await this.requireModerationAccess(userId);
    const profiles = await this.marketplaceRepository.listProfiles();
    const opportunities = await this.marketplaceRepository.listOpportunities();
    const applications = await this.marketplaceRepository.listApplications();
    const reports = await this.marketplaceRepository.listAbuseReports();
    const profileMap = new Map(
      profiles.map((profile) => [profile.userId, profile]),
    );
    const agingNow = Date.now();
    const hiredApplications = applications.filter(
      (application) => application.status === 'hired',
    ).length;
    const activeOpportunities = opportunities.filter(
      (opportunity) =>
        opportunity.status === 'published' ||
        opportunity.status === 'hired' ||
        opportunity.status === 'paused',
    ).length;

    const agingOpportunities = opportunities
      .filter(
        (opportunity) =>
          opportunity.status === 'published' &&
          opportunity.moderationStatus === 'visible' &&
          opportunity.hiredJobId === null &&
          opportunity.publishedAt !== null &&
          agingNow - opportunity.publishedAt >= 7 * 24 * 60 * 60 * 1000,
      )
      .sort((left, right) => (left.publishedAt ?? 0) - (right.publishedAt ?? 0))
      .map((opportunity) => ({
        opportunityId: opportunity.id,
        title: opportunity.title,
        ownerDisplayName:
          profileMap.get(opportunity.ownerUserId)?.displayName ??
          opportunity.ownerUserId,
        ageDays: Math.floor(
          (agingNow - (opportunity.publishedAt ?? agingNow)) /
            (24 * 60 * 60 * 1000),
        ),
        status: opportunity.status,
        visibility: opportunity.visibility,
      }));

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalProfiles: profiles.length,
        visibleProfiles: profiles.filter(
          (profile) => profile.moderationStatus === 'visible',
        ).length,
        hiddenProfiles: profiles.filter(
          (profile) => profile.moderationStatus === 'hidden',
        ).length,
        suspendedProfiles: profiles.filter(
          (profile) => profile.moderationStatus === 'suspended',
        ).length,
        totalOpportunities: opportunities.length,
        publishedOpportunities: opportunities.filter(
          (opportunity) => opportunity.status === 'published',
        ).length,
        hiredOpportunities: opportunities.filter(
          (opportunity) => opportunity.status === 'hired',
        ).length,
        visibleOpportunities: opportunities.filter(
          (opportunity) => opportunity.moderationStatus === 'visible',
        ).length,
        hiddenOpportunities: opportunities.filter(
          (opportunity) => opportunity.moderationStatus === 'hidden',
        ).length,
        suspendedOpportunities: opportunities.filter(
          (opportunity) => opportunity.moderationStatus === 'suspended',
        ).length,
        totalApplications: applications.length,
        submittedApplications: applications.filter(
          (application) => application.status === 'submitted',
        ).length,
        shortlistedApplications: applications.filter(
          (application) => application.status === 'shortlisted',
        ).length,
        hiredApplications,
        hireConversionPercent:
          activeOpportunities === 0
            ? 0
            : Math.round((hiredApplications / activeOpportunities) * 100),
        agingOpportunityCount: agingOpportunities.length,
        totalAbuseReports: reports.length,
        openAbuseReports: reports.filter((report) => report.status === 'open')
          .length,
        reviewingAbuseReports: reports.filter(
          (report) => report.status === 'reviewing',
        ).length,
      },
      agingOpportunities,
      recentAbuseReports: await Promise.all(
        reports
          .sort(
            (left, right) =>
              this.compareAbuseReportPriority(left.status, right.status) ||
              right.updatedAt - left.updatedAt,
          )
          .slice(0, 5)
          .map((report) => this.toAbuseReportView(report)),
      ),
    };
  }

  async listModerationProfiles(userId: string) {
    await this.requireModerationAccess(userId);
    const profiles = await this.marketplaceRepository.listProfiles();
    return {
      profiles: await Promise.all(
        profiles
          .sort((left, right) => {
            const moderationDiff = compareModerationStatus(
              right.moderationStatus,
              left.moderationStatus,
            );
            if (moderationDiff !== 0) {
              return moderationDiff;
            }
            return right.updatedAt - left.updatedAt;
          })
          .map(async (profile) => ({
            ...(await this.toProfileView(profile)),
            moderationStatus: profile.moderationStatus,
          })),
      ),
    };
  }

  async listModerationOpportunities(userId: string) {
    await this.requireModerationAccess(userId);
    const opportunities = await this.marketplaceRepository.listOpportunities();
    return {
      opportunities: await Promise.all(
        opportunities
          .sort((left, right) => {
            const moderationDiff = compareModerationStatus(
              right.moderationStatus,
              left.moderationStatus,
            );
            if (moderationDiff !== 0) {
              return moderationDiff;
            }
            return right.updatedAt - left.updatedAt;
          })
          .map(async (opportunity) => ({
            ...(await this.toOpportunityView(opportunity)),
            moderationStatus: opportunity.moderationStatus,
          })),
      ),
    };
  }

  async listModerationReports(
    userId: string,
    query: MarketplaceModerationReportsQueryDto,
  ): Promise<MarketplaceAbuseReportsListResponse> {
    await this.requireModerationAccess(userId);
    const reports = await this.marketplaceRepository.listAbuseReports();

    return {
      reports: await Promise.all(
        reports
          .filter((report) => {
            if (query.status && report.status !== query.status) {
              return false;
            }
            if (query.subjectType && report.subjectType !== query.subjectType) {
              return false;
            }
            return true;
          })
          .sort(
            (left, right) =>
              this.compareAbuseReportPriority(left.status, right.status) ||
              right.updatedAt - left.updatedAt,
          )
          .slice(0, query.limit)
          .map((report) => this.toAbuseReportView(report)),
      ),
    };
  }

  async moderateProfile(
    userId: string,
    targetUserId: string,
    dto: UpdateModerationDto,
  ): Promise<MarketplaceProfileResponse> {
    await this.requireModerationAccess(userId);
    const profile = await this.requireProfileByUserId(targetUserId);
    profile.moderationStatus = dto.moderationStatus;
    profile.updatedAt = Date.now();
    await this.marketplaceRepository.saveProfile(profile);
    return {
      profile: await this.toProfileView(profile),
    };
  }

  async moderateOpportunity(
    userId: string,
    opportunityId: string,
    dto: UpdateModerationDto,
  ): Promise<MarketplaceOpportunityResponse> {
    await this.requireModerationAccess(userId);
    const opportunity = await this.requireOpportunity(opportunityId);
    opportunity.moderationStatus = dto.moderationStatus;
    opportunity.updatedAt = Date.now();
    await this.marketplaceRepository.saveOpportunity(opportunity);
    return {
      opportunity: await this.toOpportunityView(opportunity),
    };
  }

  async updateModerationReport(
    userId: string,
    reportId: string,
    dto: UpdateMarketplaceAbuseReportDto,
  ): Promise<MarketplaceAbuseReportResponse> {
    await this.requireModerationAccess(userId);
    const report = await this.requireAbuseReport(reportId);
    const now = Date.now();

    if (
      (dto.status === 'resolved' || dto.status === 'dismissed') &&
      !dto.resolutionNote?.trim()
    ) {
      throw new BadRequestException(
        'Resolution note is required when closing an abuse report',
      );
    }

    if (dto.subjectModerationStatus !== undefined) {
      await this.applyReportSubjectModeration(
        report,
        dto.subjectModerationStatus,
        userId,
        now,
      );
    }

    report.status = dto.status;
    report.updatedAt = now;

    if (dto.status === 'resolved' || dto.status === 'dismissed') {
      report.resolutionNote = dto.resolutionNote?.trim() ?? null;
      report.resolvedByUserId = userId;
    } else {
      report.resolutionNote = null;
      report.resolvedByUserId = null;
    }

    await this.marketplaceRepository.saveAbuseReport(report);

    return {
      report: await this.toAbuseReportView(report),
    };
  }

  private async requireProfileByUserId(userId: string) {
    const profile = await this.marketplaceRepository.getProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Marketplace profile not found');
    }
    return profile;
  }

  private async requireOpportunity(opportunityId: string) {
    const opportunity =
      await this.marketplaceRepository.getOpportunityById(opportunityId);
    if (!opportunity) {
      throw new NotFoundException('Marketplace opportunity not found');
    }
    return opportunity;
  }

  private async requireApplication(applicationId: string) {
    const application =
      await this.marketplaceRepository.getApplicationById(applicationId);
    if (!application) {
      throw new NotFoundException('Marketplace application not found');
    }
    return application;
  }

  private async requireAbuseReport(reportId: string) {
    const report =
      await this.marketplaceRepository.getAbuseReportById(reportId);
    if (!report) {
      throw new NotFoundException('Marketplace abuse report not found');
    }
    return report;
  }

  private async toProfileView(
    profile: MarketplaceProfileRecord,
  ): Promise<MarketplaceProfileView> {
    const user = await this.usersService.getRequiredById(profile.userId);
    const escrowStats = await this.getEscrowStats(user);
    const verifiedWalletAddress = this.getVerifiedWalletAddress(user);
    return {
      ...profile,
      verifiedWalletAddress,
      verificationLevel: this.computeVerificationLevel(
        verifiedWalletAddress,
        escrowStats,
      ),
      escrowStats,
      completedEscrowCount: escrowStats.completionCount,
      isComplete: this.isProfileComplete(profile),
    };
  }

  private async toOpportunityView(
    opportunity: MarketplaceOpportunityRecord,
  ): Promise<MarketplaceOpportunityView> {
    const owner = await this.usersService.getRequiredById(
      opportunity.ownerUserId,
    );
    const applications = await this.marketplaceRepository.listApplications();

    return {
      ...opportunity,
      owner: await this.toClientSummary(owner),
      escrowReadiness: await this.getEscrowReadiness(owner.id),
      applicationCount: applications.filter(
        (application) =>
          application.opportunityId === opportunity.id &&
          application.status !== 'withdrawn',
      ).length,
    };
  }

  private async toOpportunityDetailView(
    opportunity: MarketplaceOpportunityRecord,
    viewerUserId?: string,
    prefetchedApplications?: MarketplaceApplicationRecord[],
  ): Promise<MarketplaceOpportunityDetailView> {
    const base = await this.toOpportunityView(opportunity);
    const applications =
      prefetchedApplications ??
      (await this.marketplaceRepository.listApplications()).filter(
        (application) => application.opportunityId === opportunity.id,
      );

    if (viewerUserId && viewerUserId === opportunity.ownerUserId) {
      const sortedApplications = await Promise.all(
        applications.map(async (application) => ({
          application,
          view: await this.toApplicationView(application),
        })),
      );
      return {
        ...base,
        applications: sortedApplications
          .sort(
            (left, right) =>
              right.view.fitScore - left.view.fitScore ||
              right.application.updatedAt - left.application.updatedAt,
          )
          .map(({ view }) => view),
      };
    }

    return base;
  }

  private async toApplicationView(
    application: MarketplaceApplicationRecord,
  ): Promise<MarketplaceApplicationView> {
    const applicantUser = await this.usersService.getRequiredById(
      application.applicantUserId,
    );
    const opportunity = await this.requireOpportunity(
      application.opportunityId,
    );
    const owner = await this.usersService.getRequiredById(
      opportunity.ownerUserId,
    );
    const applicantSummary = await this.toTalentSummary(applicantUser);
    const dossier = await this.buildApplicationDossier(
      application,
      opportunity,
      applicantSummary,
    );

    return {
      ...application,
      applicant: applicantSummary,
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        visibility: opportunity.visibility,
        status: opportunity.status,
        ownerDisplayName:
          (await this.marketplaceRepository.getProfileByUserId(owner.id))
            ?.displayName ??
          owner.email.split('@')[0] ??
          owner.id,
      },
      fitScore: dossier.matchSummary.fitScore,
      fitBreakdown: dossier.matchSummary.fitBreakdown,
      riskFlags: dossier.matchSummary.riskFlags,
      dossier,
    };
  }

  private async toAbuseReportView(
    report: MarketplaceAbuseReportRecord,
  ): Promise<MarketplaceAbuseReportView> {
    const reporter = await this.usersService.getRequiredById(
      report.reporterUserId,
    );
    const resolvedBy = report.resolvedByUserId
      ? await this.usersService.getRequiredById(report.resolvedByUserId)
      : null;
    const subjectModeratedBy = report.subjectModeratedByUserId
      ? await this.usersService.getRequiredById(report.subjectModeratedByUserId)
      : null;

    return {
      id: report.id,
      subject: await this.buildAbuseReportSubjectSummary(report),
      reporter: {
        userId: reporter.id,
        email: reporter.email,
      },
      reason: report.reason,
      details: report.details,
      evidenceUrls: report.evidenceUrls,
      status: report.status,
      resolutionNote: report.resolutionNote,
      resolvedBy: resolvedBy
        ? {
            userId: resolvedBy.id,
            email: resolvedBy.email,
          }
        : null,
      subjectModerationStatus: report.subjectModerationStatus,
      subjectModeratedBy: subjectModeratedBy
        ? {
            userId: subjectModeratedBy.id,
            email: subjectModeratedBy.email,
          }
        : null,
      subjectModeratedAt: report.subjectModeratedAt,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  private async buildAbuseReportSubjectSummary(
    report: MarketplaceAbuseReportRecord,
  ): Promise<MarketplaceAbuseReportSubjectSummary> {
    if (report.subjectType === 'profile') {
      const profile = await this.marketplaceRepository.getProfileByUserId(
        report.subjectId,
      );

      return {
        type: 'profile',
        id: report.subjectId,
        label: profile?.displayName ?? 'Removed profile',
        slug: profile?.slug ?? report.subjectId,
        moderationStatus: profile?.moderationStatus ?? 'hidden',
      };
    }

    const opportunity = await this.marketplaceRepository.getOpportunityById(
      report.subjectId,
    );

    return {
      type: 'opportunity',
      id: report.subjectId,
      label: opportunity?.title ?? 'Removed opportunity',
      visibility: opportunity?.visibility ?? 'private',
      moderationStatus: opportunity?.moderationStatus ?? 'hidden',
      status: opportunity?.status ?? 'closed',
    };
  }

  private async toClientSummary(
    user: UserRecord,
  ): Promise<MarketplaceClientSummary> {
    const profile = await this.marketplaceRepository.getProfileByUserId(
      user.id,
    );

    return {
      userId: user.id,
      displayName: profile?.displayName ?? user.email.split('@')[0] ?? user.id,
      profileSlug: profile?.slug ?? null,
    };
  }

  private async toTalentSummary(
    user: UserRecord,
  ): Promise<MarketplaceTalentSummary> {
    const profile = await this.marketplaceRepository.getProfileByUserId(
      user.id,
    );
    const escrowStats = await this.getEscrowStats(user);
    const verifiedWalletAddress = this.getVerifiedWalletAddress(user);

    return {
      userId: user.id,
      displayName: profile?.displayName ?? user.email.split('@')[0] ?? user.id,
      profileSlug: profile?.slug ?? null,
      headline: profile?.headline ?? 'Marketplace applicant',
      specialties: profile?.specialties ?? [],
      verifiedWalletAddress,
      verificationLevel: this.computeVerificationLevel(
        verifiedWalletAddress,
        escrowStats,
      ),
      cryptoReadiness:
        profile?.cryptoReadiness ?? this.deriveCryptoReadiness(user),
      escrowStats,
      completedEscrowCount: escrowStats.completionCount,
    };
  }

  private async buildApplicationDossier(
    application: MarketplaceApplicationRecord,
    opportunityOverride?: MarketplaceOpportunityRecord,
    applicantSummaryOverride?: MarketplaceTalentSummary,
  ): Promise<MarketplaceApplicationDossier> {
    const opportunity =
      opportunityOverride ??
      (await this.requireOpportunity(application.opportunityId));
    const applicantUser = await this.usersService.getRequiredById(
      application.applicantUserId,
    );
    const applicantSummary =
      applicantSummaryOverride ?? (await this.toTalentSummary(applicantUser));
    const screeningMap = new Map(
      application.screeningAnswers.map((answer) => [
        answer.questionId,
        answer.answer,
      ]),
    );
    const applicantSkills = await this.getApplicantSkills(
      application.applicantUserId,
    );
    const normalizedApplicantSkills = applicantSkills.map((skill) =>
      skill.toLowerCase(),
    );
    const normalizedRequiredSkills = opportunity.requiredSkills.map((skill) =>
      skill.toLowerCase(),
    );
    const normalizedMustHaveSkills = opportunity.mustHaveSkills.map((skill) =>
      skill.toLowerCase(),
    );
    const overlap = opportunity.requiredSkills.filter((skill) =>
      normalizedApplicantSkills.includes(skill.toLowerCase()),
    );
    const mustHaveSkillGaps = opportunity.mustHaveSkills.filter(
      (skill) => !normalizedApplicantSkills.includes(skill.toLowerCase()),
    );
    const answeredRequiredCount = opportunity.screeningQuestions.filter(
      (question) => !question.required || screeningMap.get(question.id),
    ).length;
    const totalQuestions = opportunity.screeningQuestions.length;
    const requiredMissingQuestions = opportunity.screeningQuestions
      .filter((question) => question.required && !screeningMap.get(question.id))
      .map((question) => `Missing answer: ${question.prompt}`);
    const categoryExperience =
      applicantSummary.escrowStats.completedByCategory.find(
        (entry) => entry.category === opportunity.category,
      )?.count ?? 0;
    const readinessGap =
      this.cryptoReadinessRank(applicantSummary.cryptoReadiness) <
      this.cryptoReadinessRank(opportunity.cryptoReadinessRequired);

    const fitBreakdown: MarketplaceFitBreakdownEntry[] = [
      {
        factor: 'must_have_skills',
        score: roundPercent(
          normalizedMustHaveSkills.length - mustHaveSkillGaps.length,
          normalizedMustHaveSkills.length || 1,
        ),
        weight: 30,
        summary:
          mustHaveSkillGaps.length === 0
            ? 'Applicant covers every must-have skill.'
            : `Missing must-have skills: ${mustHaveSkillGaps.join(', ')}`,
      },
      {
        factor: 'category_overlap',
        score:
          categoryExperience > 0 ? Math.min(100, categoryExperience * 25) : 25,
        weight: 15,
        summary:
          categoryExperience > 0
            ? `${categoryExperience} completed escrow jobs in ${opportunity.category}.`
            : `No prior escrow history in ${opportunity.category}.`,
      },
      {
        factor: 'escrow_track_record',
        score: Math.max(
          0,
          applicantSummary.escrowStats.completionRate -
            applicantSummary.escrowStats.disputeRate,
        ),
        weight: 25,
        summary: `${applicantSummary.escrowStats.completionCount} completed, ${applicantSummary.escrowStats.disputeRate}% dispute rate, ${applicantSummary.escrowStats.onTimeDeliveryRate}% on-time delivery.`,
      },
      {
        factor: 'screening_quality',
        score: roundPercent(answeredRequiredCount, totalQuestions || 1),
        weight: 15,
        summary:
          totalQuestions === 0
            ? 'No screening questions required.'
            : `${answeredRequiredCount}/${totalQuestions} screening requirements covered.`,
      },
      {
        factor: 'crypto_readiness',
        score: readinessGap ? 20 : 100,
        weight: 10,
        summary: readinessGap
          ? `${applicantSummary.cryptoReadiness} does not meet required ${opportunity.cryptoReadinessRequired}.`
          : `${applicantSummary.cryptoReadiness} meets required ${opportunity.cryptoReadinessRequired}.`,
      },
      {
        factor: 'proposal_quality',
        score:
          application.deliveryApproach.length > 40 &&
          application.milestonePlanSummary.length > 40
            ? 100
            : 60,
        weight: 5,
        summary: 'Delivery approach and milestone summary are present.',
      },
    ];

    const fitScore = Math.round(
      fitBreakdown.reduce(
        (sum, entry) => sum + (entry.score * entry.weight) / 100,
        0,
      ),
    );
    const missingRequirements = [...requiredMissingQuestions];
    if (mustHaveSkillGaps.length > 0) {
      missingRequirements.push(
        `Missing skills: ${mustHaveSkillGaps.join(', ')}`,
      );
    }
    if (readinessGap) {
      missingRequirements.push(
        `Crypto readiness gap: requires ${opportunity.cryptoReadinessRequired}`,
      );
    }

    const riskFlags: string[] = [];
    if (mustHaveSkillGaps.length > 0) {
      riskFlags.push('must_have_skill_gap');
    }
    if (requiredMissingQuestions.length > 0) {
      riskFlags.push('missing_required_screening_answer');
    }
    if (applicantSummary.escrowStats.disputeRate >= 25) {
      riskFlags.push('high_dispute_rate');
    }
    if (applicantSummary.escrowStats.completionCount === 0) {
      riskFlags.push('no_completed_escrow_history');
    }
    if (readinessGap) {
      riskFlags.push('crypto_readiness_gap');
    }

    const matchSummary: MarketplaceMatchSummary = {
      fitScore,
      requirementCoverage: roundPercent(
        normalizedRequiredSkills.length - mustHaveSkillGaps.length,
        normalizedRequiredSkills.length || 1,
      ),
      skillOverlap: overlap,
      mustHaveSkillGaps,
      riskFlags,
      missingRequirements,
      fitBreakdown,
    };

    const recommendation: MarketplaceApplicationDossier['recommendation'] =
      missingRequirements.length > 0 || fitScore < 60
        ? 'risky'
        : fitScore >= 80
          ? 'strong_match'
          : 'review';

    const whyShortlisted = [
      overlap.length > 0
        ? `Skill overlap: ${overlap.join(', ')}`
        : 'Limited skill overlap with the brief.',
      `${applicantSummary.escrowStats.completionCount} completed escrow jobs.`,
      `${applicantSummary.verificationLevel} verification level.`,
    ];

    return {
      applicationId: application.id,
      opportunityId: opportunity.id,
      recommendation,
      matchSummary,
      whyShortlisted,
    };
  }

  private async getApplicantSkills(userId: string) {
    const profile = await this.marketplaceRepository.getProfileByUserId(userId);
    if (!profile) {
      return [];
    }

    return [...profile.skills, ...profile.specialties];
  }

  private validateScreeningAnswers(
    questions: MarketplaceScreeningQuestion[],
    answers: MarketplaceScreeningAnswer[],
  ) {
    const answerMap = new Map(
      answers.map((answer) => [answer.questionId, answer.answer]),
    );
    for (const question of questions) {
      if (question.required && !answerMap.get(question.id)?.trim()) {
        throw new BadRequestException(
          `Missing required screening answer for "${question.prompt}"`,
        );
      }
    }
  }

  private async getEscrowStats(
    user: UserRecord,
  ): Promise<MarketplaceEscrowStats> {
    const addresses = user.wallets.map((wallet) =>
      normalizeEvmAddress(wallet.address),
    );
    if (addresses.length === 0) {
      return {
        totalContracts: 0,
        completionCount: 0,
        disputeCount: 0,
        completionRate: 0,
        disputeRate: 0,
        onTimeDeliveryRate: 0,
        averageContractValueBand: 'unknown',
        completedByCategory: [],
      };
    }

    const jobs = await Promise.all(
      (await this.escrowRepository.listByParticipantAddresses(addresses))
        .filter((job) =>
          addresses.includes(normalizeEvmAddress(job.onchain.workerAddress)),
        )
        .map(
          async (job) => (await this.escrowOnchainAuthority.mergeJob(job)).job,
        ),
    );
    const completedJobs = jobs.filter(
      (job) => job.status === 'completed' || job.status === 'resolved',
    );
    const disputedJobs = jobs.filter((job) =>
      job.milestones.some(
        (milestone) =>
          milestone.status === 'disputed' ||
          milestone.resolutionAction === 'refund' ||
          milestone.disputedAt,
      ),
    );
    const milestoneDeliverySignals = jobs
      .flatMap((job) =>
        job.milestones.map((milestone) => milestoneDeliveredOnTime(milestone)),
      )
      .filter((value): value is boolean => value !== null);
    const categoryCounts = new Map<string, number>();
    for (const job of completedJobs) {
      categoryCounts.set(
        job.category,
        (categoryCounts.get(job.category) ?? 0) + 1,
      );
    }
    const fundedAmounts = jobs
      .map((job) => toNumberAmount(job.fundedAmount))
      .filter((value): value is number => value !== null);

    return {
      totalContracts: jobs.length,
      completionCount: completedJobs.length,
      disputeCount: disputedJobs.length,
      completionRate: roundPercent(completedJobs.length, jobs.length || 1),
      disputeRate: roundPercent(disputedJobs.length, jobs.length || 1),
      onTimeDeliveryRate: roundPercent(
        milestoneDeliverySignals.filter(Boolean).length,
        milestoneDeliverySignals.length || 1,
      ),
      averageContractValueBand: pickAverageContractValueBand(fundedAmounts),
      completedByCategory: Array.from(categoryCounts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((left, right) => right.count - left.count),
    };
  }

  private computeVerificationLevel(
    verifiedWalletAddress: string | null,
    escrowStats: MarketplaceEscrowStats,
  ): MarketplaceVerificationLevel {
    if (
      verifiedWalletAddress &&
      escrowStats.completionCount >= 2 &&
      escrowStats.onTimeDeliveryRate >= 70
    ) {
      return 'wallet_escrow_and_delivery';
    }
    if (verifiedWalletAddress && escrowStats.completionCount >= 1) {
      return 'wallet_and_escrow_history';
    }
    return 'wallet_verified';
  }

  private deriveCryptoReadiness(user: UserRecord): MarketplaceCryptoReadiness {
    if (user.defaultExecutionWalletAddress) {
      const executionWallet = this.usersService.findWallet(
        user,
        user.defaultExecutionWalletAddress,
      );
      if (executionWallet && isSmartAccountWallet(executionWallet)) {
        const eoaCount = user.wallets.filter((wallet) =>
          isEoaWallet(wallet),
        ).length;
        return eoaCount > 0 ? 'escrow_power_user' : 'smart_account_ready';
      }
    }

    return this.getVerifiedWalletAddress(user) ? 'wallet_only' : 'wallet_only';
  }

  private cryptoReadinessRank(value: MarketplaceCryptoReadiness) {
    const order: Record<MarketplaceCryptoReadiness, number> = {
      wallet_only: 0,
      smart_account_ready: 1,
      escrow_power_user: 2,
    };
    return order[value];
  }

  private isProfileComplete(profile: MarketplaceProfileRecord) {
    return (
      profile.slug.length >= 3 &&
      profile.displayName.length > 0 &&
      profile.headline.length > 0 &&
      profile.bio.length > 0 &&
      profile.skills.length > 0 &&
      profile.timezone.length > 0 &&
      profile.preferredEngagements.length > 0 &&
      profile.proofArtifacts.length > 0
    );
  }

  private getVerifiedWalletAddress(user: UserRecord) {
    return (
      user.wallets.find(
        (wallet) => isEoaWallet(wallet) && wallet.verificationMethod === 'siwe',
      )?.address ?? null
    );
  }

  private async getEscrowReadiness(
    userId: string,
  ): Promise<EscrowReadinessStatus> {
    const user = await this.usersService.getRequiredById(userId);

    if (user.wallets.length === 0) {
      return 'wallet_required';
    }

    if (!user.defaultExecutionWalletAddress) {
      return 'smart_account_required';
    }

    const executionWallet = this.usersService.findWallet(
      user,
      user.defaultExecutionWalletAddress,
    );
    return executionWallet && isSmartAccountWallet(executionWallet)
      ? 'ready'
      : 'smart_account_required';
  }

  private assertOpportunityOwner(
    userId: string,
    opportunity: MarketplaceOpportunityRecord,
  ) {
    if (opportunity.ownerUserId !== userId) {
      throw new ForbiddenException(
        'Only the client who owns the opportunity can do that',
      );
    }
  }

  private assertOpportunityOpenForDecision(
    opportunity: MarketplaceOpportunityRecord,
  ) {
    if (opportunity.status !== 'published') {
      throw new ConflictException(
        'Marketplace opportunity is not accepting hiring decisions',
      );
    }
    if (opportunity.hiredJobId) {
      throw new ConflictException(
        'Marketplace opportunity has already been hired',
      );
    }
  }

  private validateBudgetRange(min: string | null, max: string | null) {
    if (min && max && Number(min) > Number(max)) {
      throw new BadRequestException(
        'Budget minimum cannot exceed budget maximum',
      );
    }
  }

  private async createAbuseReport(
    reporterUserId: string,
    input: {
      subjectType: MarketplaceAbuseReportRecord['subjectType'];
      subjectId: string;
      dto: CreateMarketplaceAbuseReportDto;
    },
  ): Promise<MarketplaceAbuseReportResponse> {
    if (input.dto.reason === 'other' && !input.dto.details?.trim()) {
      throw new BadRequestException(
        'Additional details are required when using the "other" abuse reason',
      );
    }

    const existingReports = await this.marketplaceRepository.listAbuseReports();
    const duplicate = existingReports.find(
      (report) =>
        report.subjectType === input.subjectType &&
        report.subjectId === input.subjectId &&
        report.reporterUserId === reporterUserId &&
        (report.status === 'open' || report.status === 'reviewing'),
    );

    if (duplicate) {
      throw new ConflictException(
        'You already have an active abuse report for this marketplace item',
      );
    }

    const now = Date.now();
    const report: MarketplaceAbuseReportRecord = {
      id: randomUUID(),
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      reporterUserId,
      reason: input.dto.reason,
      details: input.dto.details?.trim() || null,
      evidenceUrls: normalizeTextArray(input.dto.evidenceUrls),
      status: 'open',
      resolutionNote: null,
      resolvedByUserId: null,
      subjectModerationStatus: null,
      subjectModeratedByUserId: null,
      subjectModeratedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.marketplaceRepository.saveAbuseReport(report);

    return {
      report: await this.toAbuseReportView(report),
    };
  }

  private async requireModerationAccess(userId: string) {
    await this.escrowActorService.resolveArbitrator(userId);
  }

  private async applyReportSubjectModeration(
    report: MarketplaceAbuseReportRecord,
    moderationStatus: ModerationStatus | null,
    userId: string,
    now: number,
  ) {
    if (moderationStatus === null) {
      report.subjectModerationStatus = null;
      report.subjectModeratedByUserId = null;
      report.subjectModeratedAt = null;
      return;
    }

    if (report.subjectType === 'profile') {
      const profile = await this.requireProfileByUserId(report.subjectId);
      profile.moderationStatus = moderationStatus;
      profile.updatedAt = now;
      await this.marketplaceRepository.saveProfile(profile);
    } else {
      const opportunity = await this.requireOpportunity(report.subjectId);
      opportunity.moderationStatus = moderationStatus;
      opportunity.updatedAt = now;
      await this.marketplaceRepository.saveOpportunity(opportunity);
    }

    report.subjectModerationStatus = moderationStatus;
    report.subjectModeratedByUserId = userId;
    report.subjectModeratedAt = now;
  }

  private compareAbuseReportPriority(
    left: MarketplaceAbuseReportStatus,
    right: MarketplaceAbuseReportStatus,
  ) {
    const order: Record<MarketplaceAbuseReportStatus, number> = {
      open: 0,
      reviewing: 1,
      resolved: 2,
      dismissed: 3,
    };

    return order[left] - order[right];
  }
}
