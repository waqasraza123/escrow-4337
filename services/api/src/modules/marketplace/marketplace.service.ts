import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ESCROW_REPOSITORY, MARKETPLACE_REPOSITORY } from '../../persistence/persistence.tokens';
import type {
  EscrowRepository,
  MarketplaceRepository,
} from '../../persistence/persistence.types';
import { EscrowActorService } from '../escrow/escrow-actor.service';
import { EscrowService } from '../escrow/escrow.service';
import { UsersService } from '../users/users.service';
import { isEoaWallet, isSmartAccountWallet, type UserRecord } from '../users/users.types';
import type {
  ApplyToOpportunityDto,
  CreateMarketplaceOpportunityDto,
  MarketplaceOpportunitiesQueryDto,
  MarketplaceProfilesQueryDto,
  UpdateModerationDto,
  UpdateMarketplaceOpportunityDto,
  UpsertMarketplaceProfileDto,
} from './marketplace.dto';
import type {
  ApplicationStatus,
  EscrowReadinessStatus,
  HireApplicationResponse,
  MarketplaceApplicationRecord,
  MarketplaceApplicationView,
  MarketplaceApplicationsListResponse,
  MarketplaceClientSummary,
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
  MarketplaceTalentSummary,
  ModerationStatus,
} from './marketplace.types';

function normalizeTextArray(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function containsQuery(haystack: string, query?: string) {
  if (!query) {
    return true;
  }

  return haystack.toLowerCase().includes(query.trim().toLowerCase());
}

function compareModerationStatus(left: ModerationStatus, right: ModerationStatus) {
  const order = {
    visible: 0,
    hidden: 1,
    suspended: 2,
  } as const;

  return order[left] - order[right];
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

    const existing = await this.marketplaceRepository.getProfileByUserId(userId);
    const profile: MarketplaceProfileRecord = {
      userId,
      slug: dto.slug,
      displayName: dto.displayName,
      headline: dto.headline,
      bio: dto.bio,
      skills: normalizeTextArray(dto.skills),
      rateMin: dto.rateMin ?? null,
      rateMax: dto.rateMax ?? null,
      timezone: dto.timezone,
      availability: dto.availability,
      portfolioUrls: normalizeTextArray(dto.portfolioUrls),
      moderationStatus: existing?.moderationStatus ?? 'visible',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (
      profile.rateMin &&
      profile.rateMax &&
      Number(profile.rateMin) > Number(profile.rateMax)
    ) {
      throw new BadRequestException('Profile minimum rate cannot exceed maximum rate');
    }

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
      .filter(({ profile, view }) => {
        if (
          query.availability &&
          profile.availability !== query.availability
        ) {
          return false;
        }

        if (
          query.skill &&
          !profile.skills.some(
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
        ].join(' ');

        return containsQuery(searchable, query.q);
      })
      .sort((left, right) => {
        if (right.view.completedEscrowCount !== left.view.completedEscrowCount) {
          return right.view.completedEscrowCount - left.view.completedEscrowCount;
        }
        if (right.profile.updatedAt !== left.profile.updatedAt) {
          return right.profile.updatedAt - left.profile.updatedAt;
        }
        return left.profile.slug.localeCompare(right.profile.slug);
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
      visibility: dto.visibility,
      status: 'draft',
      budgetMin: dto.budgetMin ?? null,
      budgetMax: dto.budgetMax ?? null,
      timeline: dto.timeline,
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
      throw new ConflictException('Closed marketplace opportunities cannot be edited');
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
      visibility: dto.visibility ?? opportunity.visibility,
      budgetMin:
        dto.budgetMin !== undefined ? dto.budgetMin ?? null : opportunity.budgetMin,
      budgetMax:
        dto.budgetMax !== undefined ? dto.budgetMax ?? null : opportunity.budgetMax,
      timeline: dto.timeline ?? opportunity.timeline,
      updatedAt: Date.now(),
    };

    this.validateBudgetRange(next.budgetMin, next.budgetMax);
    await this.marketplaceRepository.saveOpportunity(next);

    return {
      opportunity: await this.toOpportunityView(next),
    };
  }

  async publishOpportunity(
    userId: string,
    opportunityId: string,
  ): Promise<MarketplaceOpportunityResponse> {
    const opportunity = await this.requireOpportunity(opportunityId);
    this.assertOpportunityOwner(userId, opportunity);
    if (opportunity.moderationStatus === 'suspended') {
      throw new ForbiddenException('Suspended marketplace opportunities cannot be published');
    }

    const profile = await this.requireProfileByUserId(userId);
    if (!this.isProfileComplete(profile)) {
      throw new ForbiddenException('Complete your marketplace profile before publishing briefs');
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
          !opportunity.requiredSkills.some(
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

  async applyToOpportunity(
    userId: string,
    opportunityId: string,
    dto: ApplyToOpportunityDto,
  ): Promise<MarketplaceOpportunityResponse> {
    const opportunity = await this.requireOpportunity(opportunityId);
    const applicant = await this.usersService.getRequiredById(userId);

    if (opportunity.ownerUserId === userId) {
      throw new ForbiddenException('Clients cannot apply to their own marketplace opportunities');
    }
    if (opportunity.status !== 'published') {
      throw new ConflictException('Marketplace opportunity is not open for applications');
    }
    if (opportunity.moderationStatus !== 'visible') {
      throw new ForbiddenException('Marketplace opportunity is not available');
    }

    const profile = await this.requireProfileByUserId(userId);
    if (profile.moderationStatus === 'suspended') {
      throw new ForbiddenException('Suspended marketplace talent cannot apply');
    }
    if (!this.isProfileComplete(profile)) {
      throw new ForbiddenException('Complete your marketplace profile before applying');
    }

    const selectedWallet = this.usersService.findWallet(
      applicant,
      dto.selectedWalletAddress,
    );
    if (!selectedWallet || !isEoaWallet(selectedWallet) || selectedWallet.verificationMethod !== 'siwe') {
      throw new ForbiddenException('Applications require a linked SIWE-verified wallet');
    }

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
      throw new ConflictException('You already have an active application for this opportunity');
    }

    const now = Date.now();
    const application: MarketplaceApplicationRecord = {
      id: existing?.id ?? randomUUID(),
      opportunityId,
      applicantUserId: userId,
      coverNote: dto.coverNote,
      proposedRate: dto.proposedRate ?? null,
      selectedWalletAddress: selectedWallet.address,
      portfolioUrls:
        dto.portfolioUrls.length > 0
          ? normalizeTextArray(dto.portfolioUrls)
          : profile.portfolioUrls,
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
      throw new ForbiddenException('Only the applicant can withdraw this application');
    }
    if (application.status === 'hired') {
      throw new ConflictException('Hired marketplace applications cannot be withdrawn');
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
    const opportunity = await this.requireOpportunity(application.opportunityId);
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
    const opportunity = await this.requireOpportunity(application.opportunityId);
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
    const opportunity = await this.requireOpportunity(application.opportunityId);
    this.assertOpportunityOwner(userId, opportunity);
    this.assertOpportunityOpenForDecision(opportunity);

    const applicantUser = await this.usersService.getRequiredById(
      application.applicantUserId,
    );

    const selectedWallet = this.usersService.findWallet(
      applicantUser,
      application.selectedWalletAddress,
    );
    if (!selectedWallet || !isEoaWallet(selectedWallet) || selectedWallet.verificationMethod !== 'siwe') {
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
        candidate.opportunityId === opportunity.id && candidate.id !== application.id,
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
    await this.escrowActorService.resolveArbitrator(userId);
    const profiles = await this.marketplaceRepository.listProfiles();
    const opportunities = await this.marketplaceRepository.listOpportunities();
    const applications = await this.marketplaceRepository.listApplications();
    const profileMap = new Map(profiles.map((profile) => [profile.userId, profile]));
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
        visibleProfiles: profiles.filter((profile) => profile.moderationStatus === 'visible')
          .length,
        hiddenProfiles: profiles.filter((profile) => profile.moderationStatus === 'hidden')
          .length,
        suspendedProfiles: profiles.filter((profile) => profile.moderationStatus === 'suspended')
          .length,
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
      },
      agingOpportunities,
    };
  }

  async listModerationProfiles(userId: string) {
    await this.escrowActorService.resolveArbitrator(userId);
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
    await this.escrowActorService.resolveArbitrator(userId);
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

  async moderateProfile(
    userId: string,
    targetUserId: string,
    dto: UpdateModerationDto,
  ): Promise<MarketplaceProfileResponse> {
    await this.escrowActorService.resolveArbitrator(userId);
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
    await this.escrowActorService.resolveArbitrator(userId);
    const opportunity = await this.requireOpportunity(opportunityId);
    opportunity.moderationStatus = dto.moderationStatus;
    opportunity.updatedAt = Date.now();
    await this.marketplaceRepository.saveOpportunity(opportunity);
    return {
      opportunity: await this.toOpportunityView(opportunity),
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
    const opportunity = await this.marketplaceRepository.getOpportunityById(
      opportunityId,
    );
    if (!opportunity) {
      throw new NotFoundException('Marketplace opportunity not found');
    }
    return opportunity;
  }

  private async requireApplication(applicationId: string) {
    const application = await this.marketplaceRepository.getApplicationById(
      applicationId,
    );
    if (!application) {
      throw new NotFoundException('Marketplace application not found');
    }
    return application;
  }

  private async toProfileView(
    profile: MarketplaceProfileRecord,
  ): Promise<MarketplaceProfileView> {
    const user = await this.usersService.getRequiredById(profile.userId);
    const completedEscrowCount = await this.countCompletedWorkerEscrows(user);
    return {
      ...profile,
      verifiedWalletAddress: this.getVerifiedWalletAddress(user),
      completedEscrowCount,
      isComplete: this.isProfileComplete(profile),
    };
  }

  private async toOpportunityView(
    opportunity: MarketplaceOpportunityRecord,
  ): Promise<MarketplaceOpportunityView> {
    const owner = await this.usersService.getRequiredById(opportunity.ownerUserId);
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
      return {
        ...base,
        applications: await Promise.all(
          applications
            .sort((left, right) => right.updatedAt - left.updatedAt)
            .map((application) => this.toApplicationView(application)),
        ),
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
    const opportunity = await this.requireOpportunity(application.opportunityId);
    const owner = await this.usersService.getRequiredById(opportunity.ownerUserId);

    return {
      ...application,
      applicant: await this.toTalentSummary(applicantUser),
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
    };
  }

  private async toClientSummary(user: UserRecord): Promise<MarketplaceClientSummary> {
    const profile = await this.marketplaceRepository.getProfileByUserId(user.id);

    return {
      userId: user.id,
      displayName: profile?.displayName ?? user.email.split('@')[0] ?? user.id,
      profileSlug: profile?.slug ?? null,
    };
  }

  private async toTalentSummary(user: UserRecord): Promise<MarketplaceTalentSummary> {
    const profile = await this.marketplaceRepository.getProfileByUserId(user.id);

    return {
      userId: user.id,
      displayName: profile?.displayName ?? user.email.split('@')[0] ?? user.id,
      profileSlug: profile?.slug ?? null,
      headline: profile?.headline ?? 'Marketplace applicant',
      verifiedWalletAddress: this.getVerifiedWalletAddress(user),
      completedEscrowCount: await this.countCompletedWorkerEscrows(user),
    };
  }

  private isProfileComplete(profile: MarketplaceProfileRecord) {
    return (
      profile.slug.length >= 3 &&
      profile.displayName.length > 0 &&
      profile.headline.length > 0 &&
      profile.bio.length > 0 &&
      profile.skills.length > 0 &&
      profile.portfolioUrls.length > 0 &&
      profile.timezone.length > 0
    );
  }

  private getVerifiedWalletAddress(user: UserRecord) {
    return (
      user.wallets.find(
        (wallet) => isEoaWallet(wallet) && wallet.verificationMethod === 'siwe',
      )?.address ?? null
    );
  }

  private async countCompletedWorkerEscrows(user: UserRecord) {
    const addresses = user.wallets.map((wallet) => wallet.address);
    if (addresses.length === 0) {
      return 0;
    }

    const jobs = await this.escrowRepository.listByParticipantAddresses(addresses);
    return jobs.filter(
      (job) =>
        (job.status === 'completed' || job.status === 'resolved') &&
        addresses.includes(job.onchain.workerAddress),
    ).length;
  }

  private async getEscrowReadiness(userId: string): Promise<EscrowReadinessStatus> {
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
      throw new ForbiddenException('Only the client who owns the opportunity can do that');
    }
  }

  private assertOpportunityOpenForDecision(opportunity: MarketplaceOpportunityRecord) {
    if (opportunity.status !== 'published') {
      throw new ConflictException('Marketplace opportunity is not accepting hiring decisions');
    }
    if (opportunity.hiredJobId) {
      throw new ConflictException('Marketplace opportunity has already been hired');
    }
  }

  private validateBudgetRange(min: string | null, max: string | null) {
    if (min && max && Number(min) > Number(max)) {
      throw new BadRequestException('Budget minimum cannot exceed budget maximum');
    }
  }
}
