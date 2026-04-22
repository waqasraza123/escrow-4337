import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { normalizeEvmAddress } from '../../common/evm-address';
import {
  ESCROW_REPOSITORY,
  MARKETPLACE_REPOSITORY,
} from '../../persistence/persistence.tokens';
import type {
  EscrowRepository,
  MarketplaceRepository,
} from '../../persistence/persistence.types';
import type {
  EscrowJobRecord,
  EscrowMilestoneRecord,
} from '../escrow/escrow.types';
import { EscrowService } from '../escrow/escrow.service';
import { OrganizationsService } from '../organizations/organizations.service';
import type { WorkspaceSummary } from '../organizations/organizations.types';
import { EscrowOnchainAuthorityService } from '../operations/escrow-onchain-authority.service';
import { UserCapabilitiesService } from '../users/user-capabilities.service';
import { UsersService } from '../users/users.service';
import {
  isEoaWallet,
  isSmartAccountWallet,
  type UserRecord,
} from '../users/users.types';
import type {
  AddMarketplaceTalentPoolMemberDto,
  ApplicationDecisionNoteDto,
  ApplyToOpportunityDto,
  CreateMarketplaceAutomationRuleDto,
  CreateMarketplaceInterviewMessageDto,
  CreateMarketplaceOfferDto,
  CreateMarketplaceOpportunityInviteDto,
  CreateMarketplaceRehireOpportunityDto,
  CreateMarketplaceReviewDto,
  CreateMarketplaceSavedSearchDto,
  CreateMarketplaceTalentPoolDto,
  CreateMarketplaceAbuseReportDto,
  CreateMarketplaceOpportunityDto,
  DispatchMarketplaceAutomationRunsDto,
  MarketplaceModerationReportsQueryDto,
  RecordMarketplaceInteractionDto,
  MarketplaceOpportunitiesQueryDto,
  MarketplaceProfilesQueryDto,
  MarketplaceSavedSearchesQueryDto,
  ApproveMarketplaceContractDraftDto,
  ConvertMarketplaceContractDraftDto,
  RespondToMarketplaceOfferDto,
  RunMarketplaceAutomationRuleDto,
  ReviseMarketplaceContractDraftDto,
  ReviseMarketplaceApplicationDto,
  UpdateMarketplaceNotificationDto,
  UpdateMarketplaceAbuseReportDto,
  UpdateMarketplaceAutomationRuleDto,
  UpdateMarketplaceIdentityRiskReviewDto,
  UpdateMarketplaceOpportunityDto,
  UpdateMarketplaceProofsDto,
  UpdateMarketplaceReviewModerationDto,
  UpdateMarketplaceScreeningDto,
  UpdateMarketplaceTalentPoolMemberDto,
  UpdateModerationDto,
  UpsertMarketplaceProfileDto,
} from './marketplace.dto';
import type {
  EscrowReadinessStatus,
  HireApplicationResponse,
  MarketplaceAbuseReportRecord,
  MarketplaceAbuseReportQueuePriority,
  MarketplaceAbuseReportResponse,
  MarketplaceAbuseReportsListResponse,
  MarketplaceAbuseReportSortBy,
  MarketplaceAbuseReportStatus,
  MarketplaceAbuseReportSubjectSummary,
  MarketplaceAbuseReportView,
  MarketplaceApplicationComparisonResponse,
  MarketplaceApplicationComparisonView,
  MarketplaceApplicationDecisionRecord,
  MarketplaceApplicationDecisionView,
  MarketplaceApplicationDossier,
  MarketplaceApplicationDossierResponse,
  MarketplaceApplicationRecord,
  MarketplaceApplicationRevisionRecord,
  MarketplaceApplicationRevisionResponse,
  MarketplaceApplicationRevisionView,
  MarketplaceApplicationTimelineResponse,
  MarketplaceApplicationTimelineView,
  MarketplaceApplicationView,
  MarketplaceAutomationRunRecord,
  MarketplaceAutomationRunResponse,
  MarketplaceAutomationRunsResponse,
  MarketplaceAutomationRunView,
  MarketplaceApplicationsListResponse,
  MarketplaceAutomationRuleRecord,
  MarketplaceAutomationRunItem,
  MarketplaceAutomationRuleResponse,
  MarketplaceAutomationRulesResponse,
  MarketplaceAutomationRuleView,
  MarketplaceAutomationRunTrigger,
  MarketplaceClientSummary,
  MarketplaceContractDraftRecord,
  MarketplaceContractDraftResponse,
  MarketplaceContractDraftRevisionRecord,
  MarketplaceContractDraftStatus,
  MarketplaceContractDraftView,
  MarketplaceContractMetadataSnapshot,
  MarketplaceCryptoReadiness,
  MarketplaceEscrowStats,
  MarketplaceFitBreakdownEntry,
  MarketplaceIdentityRiskReviewRecord,
  MarketplaceIdentityRiskReviewResponse,
  MarketplaceIdentityRiskReviewView,
  MarketplaceIntelligenceReport,
  MarketplaceIntelligenceReportResponse,
  MarketplaceInteractionEventRecord,
  MarketplaceInterviewMessageRecord,
  MarketplaceInterviewMessageView,
  MarketplaceInterviewThreadRecord,
  MarketplaceJobReviewsResponse,
  MarketplaceInterviewThreadResponse,
  MarketplaceInterviewThreadView,
  MarketplaceLifecycleDigest,
  MarketplaceLifecycleDigestResponse,
  MarketplaceLifecycleTask,
  MarketplaceMatchesResponse,
  MarketplaceMatchSummary,
  MarketplaceModerationDashboard,
  MarketplaceModerationReviewsListResponse,
  MarketplaceAnalyticsOverview,
  MarketplaceAnalyticsOverviewResponse,
  MarketplaceAnalyticsFunnelStage,
  MarketplaceLiquiditySlice,
  MarketplaceNoHireReason,
  MarketplaceNotificationRecord,
  MarketplaceNotificationResponse,
  MarketplaceNotificationsResponse,
  MarketplaceNotificationStatus,
  MarketplaceNotificationView,
  MarketplaceNoHireReasonStat,
  MarketplaceOfferMilestoneDraft,
  MarketplaceOfferRecord,
  MarketplaceOfferResponse,
  MarketplaceOpportunityInviteRecord,
  MarketplaceOpportunityInviteResponse,
  MarketplaceOpportunityInvitesResponse,
  MarketplaceOpportunityInviteView,
  MarketplaceOpportunitySearchDocument,
  MarketplaceOpportunitySearchResponse,
  MarketplaceOpportunityDetailView,
  MarketplaceOpportunityRecord,
  MarketplaceOpportunityResponse,
  MarketplaceOpportunitySearchResult,
  MarketplaceOpportunityView,
  MarketplaceOpportunitiesListResponse,
  MarketplaceProfileRecord,
  MarketplaceProfileResponse,
  MarketplaceProfilesListResponse,
  MarketplaceProfileView,
  MarketplaceReputationSnapshot,
  MarketplaceRankingFeatureSnapshot,
  MarketplaceReviewRecord,
  MarketplaceReviewResponse,
  MarketplaceReviewView,
  MarketplaceRiskSignalCode,
  MarketplaceRiskSignalView,
  MarketplaceRehireCandidateView,
  MarketplaceSavedSearchResponse,
  MarketplaceSavedSearchesResponse,
  MarketplaceSavedSearchRecord,
  MarketplaceSavedSearchView,
  MarketplaceSearchReason,
  MarketplaceSearchKind,
  MarketplaceTalentPoolMemberRecord,
  MarketplaceTalentPoolResponse,
  MarketplaceTalentPoolsResponse,
  MarketplaceTalentPoolRecord,
  MarketplaceTalentPoolView,
  MarketplaceTalentSearchDocument,
  MarketplaceTalentSearchResponse,
  MarketplaceTalentSearchResult,
  MarketplaceScreeningAnswer,
  MarketplaceScreeningQuestion,
  MarketplaceTalentProofArtifact,
  MarketplaceTopSearchStat,
  MarketplaceRankingAuditEntry,
  MarketplaceStalledItem,
  MarketplaceTalentSummary,
  MarketplaceVerificationLevel,
  ModerationStatus,
} from './marketplace.types';

const abuseReportAgingHours = 48;
const abuseReportStaleHours = 24;
const hourMs = 60 * 60 * 1000;

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

function normalizeOfferMilestones(
  values: Array<
    MarketplaceOfferMilestoneDraft | (Omit<MarketplaceOfferMilestoneDraft, 'dueAt'> & {
      dueAt?: number | null;
    })
  >,
): MarketplaceOfferMilestoneDraft[] {
  return values.map((milestone) => ({
    ...milestone,
    title: milestone.title.trim(),
    deliverable: milestone.deliverable.trim(),
    dueAt: milestone.dueAt ?? null,
  }));
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function createMetadataHash(value: unknown) {
  return createHash('sha256').update(stableSerialize(value)).digest('hex');
}

function containsQuery(haystack: string, query?: string) {
  if (!query) {
    return true;
  }

  return haystack.toLowerCase().includes(query.trim().toLowerCase());
}

function parseQueryList(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function asOptionalString(value: string | number | boolean | null | undefined) {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asOptionalEnum<T extends readonly string[]>(
  value: string | number | boolean | null | undefined,
  allowed: T,
): T[number] | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  return allowed.includes(value as T[number]) ? (value as T[number]) : undefined;
}

function asPositiveInt(value: string | number | boolean | null | undefined) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

function daysSince(timestamp: number | null | undefined, now: number) {
  if (!timestamp) {
    return 365;
  }

  return Math.max(0, Math.floor((now - timestamp) / (24 * hourMs)));
}

function pickFundedVolumeBand(totalContracts: number, averageBand: MarketplaceEscrowStats['averageContractValueBand']) {
  if (totalContracts === 0) {
    return 'none' as const;
  }

  if (averageBand === 'large') {
    return 'large' as const;
  }
  if (averageBand === 'medium') {
    return 'medium' as const;
  }
  return 'small' as const;
}

function normalizeMaybeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeSkillTags(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)),
  );
}

function summarizeSearchQuery(
  kind: MarketplaceSearchKind,
  input: Record<string, unknown>,
) {
  const query =
    asOptionalString(input.q as string | undefined) ??
    asOptionalString(input.skill as string | undefined) ??
    asOptionalString(input.skills as string | undefined) ??
    asOptionalString(input.category as string | undefined) ??
    null;
  return query ? `${kind}:${query.toLowerCase()}` : `${kind}:browse`;
}

function countDecisionActions(
  decisions: MarketplaceApplicationDecisionRecord[],
  action: MarketplaceApplicationDecisionRecord['action'],
) {
  return decisions.filter((decision) => decision.action === action).length;
}

function eventStageLabel(
  key: MarketplaceAnalyticsFunnelStage['key'],
): MarketplaceAnalyticsFunnelStage['label'] {
  const labels: Record<MarketplaceAnalyticsFunnelStage['key'], string> = {
    search_impressions: 'Search impressions',
    result_clicks: 'Result clicks',
    saved_searches: 'Saved searches',
    applications: 'Applications',
    shortlists: 'Shortlists',
    interviews: 'Interviews',
    offers: 'Offers',
    hires: 'Hires',
    funded_jobs: 'Funded jobs',
    released_milestones: 'Released milestones',
    disputed_milestones: 'Disputed milestones',
  };
  return labels[key];
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
    private readonly organizationsService: OrganizationsService,
    private readonly usersService: UsersService,
    private readonly escrowService: EscrowService,
    private readonly escrowOnchainAuthority: EscrowOnchainAuthorityService,
    private readonly userCapabilities: UserCapabilitiesService,
  ) {}

  async getMyProfile(userId: string): Promise<MarketplaceProfileResponse> {
    const workspace = await this.organizationsService.requireWorkspace(
      userId,
      'freelancer',
      'manageProfile',
    );
    const profile = await this.requireProfileByUserId(userId, workspace);
    return {
      profile: await this.toProfileView(profile),
    };
  }

  async upsertProfile(
    userId: string,
    dto: UpsertMarketplaceProfileDto,
  ): Promise<MarketplaceProfileResponse> {
    const workspace = await this.organizationsService.requireWorkspace(
      userId,
      'freelancer',
      'manageProfile',
    );
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
      organizationId: workspace.organizationId,
      workspaceId: workspace.workspaceId,
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
    const workspace = await this.organizationsService.requireWorkspace(
      userId,
      'freelancer',
      'manageProfile',
    );
    const profile = await this.requireProfileByUserId(userId, workspace);
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
    const search = await this.searchTalent(query);
    return {
      profiles: search.results.map((entry) => entry.profile),
    };
  }

  async searchTalent(
    query: MarketplaceProfilesQueryDto,
  ): Promise<MarketplaceTalentSearchResponse> {
    await this.refreshSearchReadModels();
    const skills = new Set([
      ...(query.skill ? [query.skill.trim().toLowerCase()] : []),
      ...parseQueryList(query.skills),
    ]);
    const documents = await this.marketplaceRepository.listTalentSearchDocuments();
    const inviteIndex = await this.getOpportunityInviteIndex();
    const results = await Promise.all(
      documents
        .filter((document) => {
          if (query.availability && document.availability !== query.availability) {
            return false;
          }
          if (
            query.cryptoReadiness &&
            document.cryptoReadiness !== query.cryptoReadiness
          ) {
            return false;
          }
          if (
            query.engagementType &&
            !document.preferredEngagements.includes(query.engagementType)
          ) {
            return false;
          }
          if (query.timezone && document.timezone !== query.timezone.trim()) {
            return false;
          }
          if (
            query.verificationLevel &&
            document.verificationLevel !== query.verificationLevel
          ) {
            return false;
          }
          if (skills.size > 0) {
            const haystack = new Set(
              [...document.skills, ...document.specialties].map((skill) =>
                skill.toLowerCase(),
              ),
            );
            for (const skill of skills) {
              if (!haystack.has(skill)) {
                return false;
              }
            }
          }

          return containsQuery(document.searchableText, query.q);
        })
        .sort((left, right) => {
          if (query.sort === 'recent') {
            return right.updatedAt - left.updatedAt;
          }
          return (
            right.ranking.score - left.ranking.score ||
            left.profileSlug.localeCompare(right.profileSlug)
          );
        })
        .slice(0, query.limit)
        .map(async (document): Promise<MarketplaceTalentSearchResult | null> => {
          const profile = await this.marketplaceRepository.getProfileByUserId(
            document.profileUserId,
          );
          if (!profile) {
            return null;
          }

          return {
            profile: await this.toProfileView(profile),
            reasons: document.reasons,
            ranking: document.ranking,
            inviteStatus: inviteIndex.get(document.profileUserId) ?? null,
          };
        }),
    );

    return {
      results: results.filter((result): result is MarketplaceTalentSearchResult =>
        result !== null,
      ),
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
    const workspace = await this.organizationsService.requireWorkspace(
      userId,
      'client',
      'createOpportunity',
    );
    const now = Date.now();
    this.validateBudgetRange(dto.budgetMin ?? null, dto.budgetMax ?? null);

    const opportunity: MarketplaceOpportunityRecord = {
      id: randomUUID(),
      ownerUserId: userId,
      ownerOrganizationId: workspace.organizationId,
      ownerWorkspaceId: workspace.workspaceId,
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
    await this.assertOpportunityOwner(userId, opportunity, 'createOpportunity');

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
    await this.assertOpportunityOwner(userId, opportunity, 'createOpportunity');
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
    await this.assertOpportunityOwner(userId, opportunity, 'createOpportunity');
    if (opportunity.moderationStatus === 'suspended') {
      throw new ForbiddenException(
        'Suspended marketplace opportunities cannot be published',
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
    await this.assertOpportunityOwner(userId, opportunity, 'createOpportunity');
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
    const workspace = await this.organizationsService.requireWorkspace(
      userId,
      'client',
    );
    const opportunities = (
      await Promise.all(
        (await this.marketplaceRepository.listOpportunities()).map(
          (opportunity) => this.ensureOpportunityWorkspace(opportunity),
        ),
      )
    )
      .filter(
        (opportunity) => opportunity.ownerWorkspaceId === workspace.workspaceId,
      )
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
    const search = await this.searchOpportunities(query);
    return {
      opportunities: search.results.map((entry) => entry.opportunity),
    };
  }

  async searchOpportunities(
    query: MarketplaceOpportunitiesQueryDto,
  ): Promise<MarketplaceOpportunitySearchResponse> {
    await this.refreshSearchReadModels();
    const skills = new Set([
      ...(query.skill ? [query.skill.trim().toLowerCase()] : []),
      ...parseQueryList(query.skills),
    ]);
    const documents =
      await this.marketplaceRepository.listOpportunitySearchDocuments();
    const results = await Promise.all(
      documents
        .filter(
          (document) =>
            document.status === 'published' && document.visibility === 'public',
        )
        .filter((document) => {
          if (
            query.category &&
            document.category !== query.category.trim().toLowerCase()
          ) {
            return false;
          }
          if (
            query.engagementType &&
            document.engagementType !== query.engagementType
          ) {
            return false;
          }
          if (
            query.cryptoReadinessRequired &&
            document.cryptoReadinessRequired !==
              query.cryptoReadinessRequired
          ) {
            return false;
          }
          if (
            query.timezoneOverlapHours !== undefined &&
            (document.timezoneOverlapHours ?? 0) < query.timezoneOverlapHours
          ) {
            return false;
          }
          if (query.minBudget) {
            const maxBudget = toNumberAmount(document.budgetMax);
            if (maxBudget !== null && maxBudget < Number(query.minBudget)) {
              return false;
            }
          }
          if (query.maxBudget) {
            const minBudget = toNumberAmount(document.budgetMin);
            if (minBudget !== null && minBudget > Number(query.maxBudget)) {
              return false;
            }
          }
          if (skills.size > 0) {
            const haystack = new Set(
              [...document.requiredSkills, ...document.mustHaveSkills].map(
                (skill) => skill.toLowerCase(),
              ),
            );
            for (const skill of skills) {
              if (!haystack.has(skill)) {
                return false;
              }
            }
          }

          return containsQuery(document.searchableText, query.q);
        })
        .sort((left, right) => {
          if (query.sort === 'recent') {
            return (right.publishedAt ?? 0) - (left.publishedAt ?? 0);
          }
          return (
            right.ranking.score - left.ranking.score ||
            (right.publishedAt ?? 0) - (left.publishedAt ?? 0)
          );
        })
        .slice(0, query.limit)
        .map(
          async (
            document,
          ): Promise<MarketplaceOpportunitySearchResult | null> => {
            const opportunity =
              await this.marketplaceRepository.getOpportunityById(
                document.opportunityId,
              );
            if (!opportunity) {
              return null;
            }

            return {
              opportunity: await this.toOpportunityView(opportunity),
              reasons: document.reasons,
              ranking: document.ranking,
              inviteStatus: null,
            };
          },
        ),
    );

    return {
      results: results.filter(
        (result): result is MarketplaceOpportunitySearchResult =>
          result !== null,
      ),
    };
  }

  async recordInteraction(
    actorUserId: string | null,
    dto: RecordMarketplaceInteractionDto,
  ) {
    await this.trackMarketplaceEvent({
      actorUserId,
      actorWorkspaceId: actorUserId
        ? (await this.organizationsService.buildWorkspaceContext(actorUserId))
            .activeWorkspace?.workspaceId ?? null
        : null,
      surface: dto.surface,
      entityType: dto.entityType,
      eventType: dto.eventType,
      entityId: dto.entityId ?? null,
      searchKind: dto.searchKind ?? null,
      queryLabel: dto.queryLabel ?? null,
      category: dto.category ?? null,
      timezone: dto.timezone ?? null,
      skillTags: dto.skillTags,
      resultCount: dto.resultCount,
      relatedOpportunityId: dto.relatedOpportunityId ?? null,
      relatedProfileUserId: dto.relatedProfileUserId ?? null,
      relatedApplicationId: dto.relatedApplicationId ?? null,
      relatedJobId: dto.relatedJobId ?? null,
    });
    return { ok: true as const };
  }

  async getAnalyticsOverview(
    userId: string,
  ): Promise<MarketplaceAnalyticsOverviewResponse> {
    const context = await this.organizationsService.buildWorkspaceContext(userId);
    await this.refreshSearchReadModels();
    return {
      overview: await this.buildAnalyticsOverview(userId, context.activeWorkspace),
    };
  }

  async getModerationIntelligence(
    userId: string,
  ): Promise<MarketplaceIntelligenceReportResponse> {
    await this.requireModerationAccess(userId);
    await this.refreshSearchReadModels();
    return {
      report: await this.buildMarketplaceIntelligenceReport(),
    };
  }

  async getTalentRecommendations(
    userId: string,
    query: MarketplaceOpportunitiesQueryDto,
  ): Promise<MarketplaceTalentSearchResponse> {
    const workspace = await this.organizationsService.requireWorkspace(
      userId,
      'client',
    );
    const opportunities = (
      await Promise.all(
        (await this.marketplaceRepository.listOpportunities()).map((opportunity) =>
          this.ensureOpportunityWorkspace(opportunity),
        ),
      )
    )
      .filter((opportunity) => opportunity.ownerWorkspaceId === workspace.workspaceId)
      .sort(
        (left, right) =>
          (right.publishedAt ?? right.updatedAt) - (left.publishedAt ?? left.updatedAt),
      );
    const anchorOpportunity = opportunities[0] ?? null;

    return this.searchTalent({
      q: query.q,
      skill: query.skill,
      skills:
        query.skills ??
        (anchorOpportunity?.requiredSkills.length
          ? anchorOpportunity.requiredSkills.slice(0, 5).join(', ')
          : undefined),
      timezone:
        query.timezoneOverlapHours !== undefined
          ? undefined
          : undefined,
      availability: undefined,
      cryptoReadiness:
        query.cryptoReadinessRequired ?? anchorOpportunity?.cryptoReadinessRequired,
      engagementType:
        query.engagementType ?? anchorOpportunity?.engagementType,
      verificationLevel: undefined,
      sort: 'relevance',
      limit: query.limit,
    });
  }

  async getOpportunityRecommendations(
    userId: string,
    query: MarketplaceProfilesQueryDto,
  ): Promise<MarketplaceOpportunitySearchResponse> {
    const workspace = await this.organizationsService.requireWorkspace(
      userId,
      'freelancer',
    );
    const profile = await this.requireProfileByUserId(userId, workspace).catch(
      () => null,
    );
    const myInvites = await this.listMyOpportunityInvites(userId);
    const inviteStatusByOpportunityId = new Map(
      myInvites.invites.map((invite) => [invite.opportunity.id, invite.status]),
    );
    const search = await this.searchOpportunities({
      q: query.q,
      skill: query.skill,
      skills:
        query.skills ??
        (profile?.skills.length ? profile.skills.slice(0, 5).join(', ') : undefined),
      category: undefined,
      engagementType:
        query.engagementType ?? profile?.preferredEngagements[0],
      cryptoReadinessRequired:
        query.cryptoReadiness ?? profile?.cryptoReadiness,
      minBudget: undefined,
      maxBudget: undefined,
      timezoneOverlapHours: undefined,
      sort: query.sort,
      limit: query.limit,
    });

    return {
      results: search.results.map((result) => ({
        ...result,
        inviteStatus:
          inviteStatusByOpportunityId.get(result.opportunity.id) ?? result.inviteStatus,
      })),
    };
  }

  async listSavedSearches(
    userId: string,
    query: MarketplaceSavedSearchesQueryDto,
  ): Promise<MarketplaceSavedSearchesResponse> {
    const context = await this.organizationsService.buildWorkspaceContext(userId);
    const searches = (await this.marketplaceRepository.listSavedSearches())
      .filter(
        (search) =>
          search.userId === userId &&
          (!query.kind || search.kind === query.kind),
      )
      .sort((left, right) => right.updatedAt - left.updatedAt);

    return {
      searches: searches.map((search) =>
        this.toSavedSearchView(search, context.activeWorkspace?.workspaceId ?? null),
      ),
    };
  }

  async createSavedSearch(
    userId: string,
    dto: CreateMarketplaceSavedSearchDto,
  ): Promise<MarketplaceSavedSearchResponse> {
    const context = await this.organizationsService.buildWorkspaceContext(userId);
    const normalizedQuery = this.normalizeSavedSearchQuery(dto.kind, dto.query);
    const resultCount = await this.getSavedSearchResultCount(dto.kind, normalizedQuery);
    const now = Date.now();
    const record: MarketplaceSavedSearchRecord = {
      id: randomUUID(),
      userId,
      workspaceId: context.activeWorkspace?.workspaceId ?? null,
      kind: dto.kind,
      label: dto.label.trim(),
      query: normalizedQuery,
      alertFrequency: dto.alertFrequency,
      lastResultCount: resultCount,
      createdAt: now,
      updatedAt: now,
    };
    await this.marketplaceRepository.saveSavedSearch(record);
    await this.trackMarketplaceEvent({
      actorUserId: userId,
      actorWorkspaceId: context.activeWorkspace?.workspaceId ?? null,
      surface: 'workspace',
      entityType: 'saved_search',
      eventType: 'saved_search_created',
      entityId: record.id,
      searchKind: dto.kind,
      queryLabel: summarizeSearchQuery(dto.kind, normalizedQuery),
      category: asOptionalString(normalizedQuery.category) ?? null,
      timezone: asOptionalString(normalizedQuery.timezone) ?? null,
      skillTags: normalizeSkillTags(
        [
          asOptionalString(normalizedQuery.skill) ?? '',
          asOptionalString(normalizedQuery.skills) ?? '',
        ]
          .join(',')
          .split(','),
      ),
      resultCount,
      relatedOpportunityId: null,
      relatedProfileUserId: null,
      relatedApplicationId: null,
      relatedJobId: null,
    });
    return {
      search: this.toSavedSearchView(
        record,
        context.activeWorkspace?.workspaceId ?? null,
      ),
    };
  }

  async deleteSavedSearch(userId: string, searchId: string) {
    const search = await this.marketplaceRepository.getSavedSearchById(searchId);
    if (!search || search.userId !== userId) {
      throw new NotFoundException('Marketplace saved search not found');
    }
    await this.marketplaceRepository.deleteSavedSearch(searchId);
    return { ok: true as const };
  }

  async listTalentPools(userId: string): Promise<MarketplaceTalentPoolsResponse> {
    const workspace = await this.requireClientRetentionWorkspace(userId);
    const pools = (await this.marketplaceRepository.listTalentPools()).filter(
      (pool) => pool.workspaceId === workspace.workspaceId,
    );

    return {
      pools: await Promise.all(
        pools.map((pool) => this.toTalentPoolView(pool, workspace.workspaceId)),
      ),
    };
  }

  async createTalentPool(
    userId: string,
    dto: CreateMarketplaceTalentPoolDto,
  ): Promise<MarketplaceTalentPoolResponse> {
    const workspace = await this.requireClientRetentionWorkspace(userId);
    const now = Date.now();
    const pool: MarketplaceTalentPoolRecord = {
      id: randomUUID(),
      ownerUserId: userId,
      workspaceId: workspace.workspaceId,
      label: dto.label.trim(),
      focusSkills: normalizeTextArray(dto.focusSkills),
      note: normalizeMaybeText(dto.note),
      createdAt: now,
      updatedAt: now,
    };

    await this.marketplaceRepository.saveTalentPool(pool);
    return {
      pool: await this.toTalentPoolView(pool, workspace.workspaceId),
    };
  }

  async addTalentPoolMember(
    userId: string,
    poolId: string,
    dto: AddMarketplaceTalentPoolMemberDto,
  ): Promise<MarketplaceTalentPoolResponse> {
    const workspace = await this.requireClientRetentionWorkspace(userId);
    const pool = await this.requireTalentPoolInWorkspace(poolId, workspace.workspaceId);
    const profile = await this.marketplaceRepository.getProfileBySlug(
      dto.profileSlug.trim().toLowerCase(),
    );
    if (!profile || !this.isProfileComplete(profile)) {
      throw new NotFoundException('Marketplace profile not found');
    }
    await this.validateTalentPoolMemberSources(workspace.workspaceId, dto);
    const members = await this.marketplaceRepository.listTalentPoolMembers();
    const existing = members.find(
      (member) =>
        member.poolId === pool.id && member.profileUserId === profile.userId,
    );
    const now = Date.now();
    const member: MarketplaceTalentPoolMemberRecord = {
      id: existing?.id ?? randomUUID(),
      poolId: pool.id,
      profileUserId: profile.userId,
      profileSlug: profile.slug,
      addedByUserId: userId,
      stage: dto.stage,
      note: normalizeMaybeText(dto.note),
      sourceOpportunityId: normalizeMaybeText(dto.sourceOpportunityId),
      sourceApplicationId: normalizeMaybeText(dto.sourceApplicationId),
      sourceJobId: normalizeMaybeText(dto.sourceJobId),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await this.marketplaceRepository.saveTalentPoolMember(member);
    await this.marketplaceRepository.saveTalentPool({
      ...pool,
      updatedAt: now,
    });
    return {
      pool: await this.toTalentPoolView(
        { ...pool, updatedAt: now },
        workspace.workspaceId,
      ),
    };
  }

  async updateTalentPoolMember(
    userId: string,
    poolId: string,
    memberId: string,
    dto: UpdateMarketplaceTalentPoolMemberDto,
  ): Promise<MarketplaceTalentPoolResponse> {
    const workspace = await this.requireClientRetentionWorkspace(userId);
    const pool = await this.requireTalentPoolInWorkspace(poolId, workspace.workspaceId);
    const member = await this.marketplaceRepository.getTalentPoolMemberById(memberId);
    if (!member || member.poolId !== pool.id) {
      throw new NotFoundException('Marketplace talent pool member not found');
    }
    const now = Date.now();
    const next: MarketplaceTalentPoolMemberRecord = {
      ...member,
      stage: dto.stage ?? member.stage,
      note:
        dto.note !== undefined ? normalizeMaybeText(dto.note) : member.note,
      updatedAt: now,
    };
    await this.marketplaceRepository.saveTalentPoolMember(next);
    await this.marketplaceRepository.saveTalentPool({
      ...pool,
      updatedAt: now,
    });
    return {
      pool: await this.toTalentPoolView(
        { ...pool, updatedAt: now },
        workspace.workspaceId,
      ),
    };
  }

  async listAutomationRules(
    userId: string,
  ): Promise<MarketplaceAutomationRulesResponse> {
    const workspace = await this.requireClientRetentionWorkspace(userId);
    const rules = (await this.marketplaceRepository.listAutomationRules()).filter(
      (rule) => rule.workspaceId === workspace.workspaceId,
    );
    const digest = await this.buildLifecycleDigestForWorkspace(workspace);
    const runs = (await this.marketplaceRepository.listAutomationRuns()).filter(
      (run) => run.workspaceId === workspace.workspaceId,
    );

    return {
      rules: await Promise.all(
        rules.map((rule) => this.toAutomationRuleView(rule, workspace, digest, runs)),
      ),
    };
  }

  async createAutomationRule(
    userId: string,
    dto: CreateMarketplaceAutomationRuleDto,
  ): Promise<MarketplaceAutomationRuleResponse> {
    const workspace = await this.requireClientRetentionWorkspace(userId);
    const targetId = normalizeMaybeText(dto.targetId);
    await this.validateAutomationRuleTarget(workspace.workspaceId, dto.kind, targetId);
    const now = Date.now();
    const rule: MarketplaceAutomationRuleRecord = {
      id: randomUUID(),
      ownerUserId: userId,
      workspaceId: workspace.workspaceId,
      kind: dto.kind,
      label: dto.label.trim(),
      targetId,
      schedule: dto.schedule,
      enabled: dto.enabled,
      createdAt: now,
      updatedAt: now,
    };

    await this.marketplaceRepository.saveAutomationRule(rule);
    const digest = await this.buildLifecycleDigestForWorkspace(workspace);
    return {
      rule: await this.toAutomationRuleView(rule, workspace, digest),
    };
  }

  async updateAutomationRule(
    userId: string,
    ruleId: string,
    dto: UpdateMarketplaceAutomationRuleDto,
  ): Promise<MarketplaceAutomationRuleResponse> {
    const workspace = await this.requireClientRetentionWorkspace(userId);
    const rule = await this.marketplaceRepository.getAutomationRuleById(ruleId);
    if (!rule || rule.workspaceId !== workspace.workspaceId) {
      throw new NotFoundException('Marketplace automation rule not found');
    }
    const targetId =
      dto.targetId !== undefined ? normalizeMaybeText(dto.targetId) : rule.targetId;
    await this.validateAutomationRuleTarget(workspace.workspaceId, rule.kind, targetId);
    const next: MarketplaceAutomationRuleRecord = {
      ...rule,
      label: dto.label?.trim() ?? rule.label,
      targetId,
      schedule: dto.schedule ?? rule.schedule,
      enabled: dto.enabled ?? rule.enabled,
      updatedAt: Date.now(),
    };
    await this.marketplaceRepository.saveAutomationRule(next);
    const digest = await this.buildLifecycleDigestForWorkspace(workspace);
    return {
      rule: await this.toAutomationRuleView(next, workspace, digest),
    };
  }

  async listAutomationRuns(
    userId: string,
  ): Promise<MarketplaceAutomationRunsResponse> {
    const workspace = await this.requireClientRetentionWorkspace(userId);
    const rules = (await this.marketplaceRepository.listAutomationRules()).filter(
      (rule) => rule.workspaceId === workspace.workspaceId,
    );
    const ruleById = new Map(rules.map((rule) => [rule.id, rule]));
    const runs = (await this.marketplaceRepository.listAutomationRuns()).filter(
      (run) => run.workspaceId === workspace.workspaceId,
    );
    return {
      runs: runs.map((run) => this.toAutomationRunView(run, ruleById.get(run.ruleId))),
    };
  }

  async listNotifications(
    userId: string,
  ): Promise<MarketplaceNotificationsResponse> {
    const context = await this.organizationsService.buildWorkspaceContext(userId);
    return {
      notifications: this.filterNotificationsForWorkspace(
        await this.marketplaceRepository.listNotifications(),
        userId,
        context.activeWorkspace?.workspaceId ?? null,
      ).map((notification) => this.toNotificationView(notification)),
    };
  }

  async markAllNotificationsRead(
    userId: string,
  ): Promise<MarketplaceNotificationsResponse> {
    const context = await this.organizationsService.buildWorkspaceContext(userId);
    const workspaceId = context.activeWorkspace?.workspaceId ?? null;
    const notifications = this.filterNotificationsForWorkspace(
      await this.marketplaceRepository.listNotifications(),
      userId,
      workspaceId,
    );
    await Promise.all(
      notifications.map(async (notification) => {
        if (notification.status !== 'unread') {
          return;
        }
        await this.marketplaceRepository.saveNotification({
          ...notification,
          status: 'read',
          updatedAt: Date.now(),
        });
      }),
    );
    return this.listNotifications(userId);
  }

  async updateNotification(
    userId: string,
    notificationId: string,
    dto: UpdateMarketplaceNotificationDto,
  ): Promise<MarketplaceNotificationResponse> {
    const context = await this.organizationsService.buildWorkspaceContext(userId);
    const workspaceId = context.activeWorkspace?.workspaceId ?? null;
    const notification =
      await this.marketplaceRepository.getNotificationById(notificationId);
    if (
      !notification ||
      !this.filterNotificationsForWorkspace(
        [notification],
        userId,
        workspaceId,
      ).length
    ) {
      throw new NotFoundException('Marketplace notification not found');
    }
    const next: MarketplaceNotificationRecord = {
      ...notification,
      status: dto.status,
      updatedAt: Date.now(),
    };
    await this.marketplaceRepository.saveNotification(next);
    return {
      notification: this.toNotificationView(next),
    };
  }

  async runAutomationRule(
    userId: string,
    ruleId: string,
    dto: RunMarketplaceAutomationRuleDto,
  ): Promise<MarketplaceAutomationRunResponse> {
    const workspace = await this.requireClientRetentionWorkspace(userId);
    const rule = await this.marketplaceRepository.getAutomationRuleById(ruleId);
    if (!rule || rule.workspaceId !== workspace.workspaceId) {
      throw new NotFoundException('Marketplace automation rule not found');
    }
    const run = await this.executeAutomationRule(rule, workspace, dto.trigger);
    return {
      run: this.toAutomationRunView(run, rule),
    };
  }

  async dispatchAutomationRuns(
    userId: string,
    dto: DispatchMarketplaceAutomationRunsDto,
  ): Promise<MarketplaceAutomationRunsResponse> {
    const workspace = await this.requireClientRetentionWorkspace(userId);
    const rules = (await this.marketplaceRepository.listAutomationRules()).filter(
      (rule) => rule.workspaceId === workspace.workspaceId && rule.enabled,
    );
    const existingRuns = (await this.marketplaceRepository.listAutomationRuns()).filter(
      (run) => run.workspaceId === workspace.workspaceId,
    );
    const runs: MarketplaceAutomationRunRecord[] = [];
    for (const rule of rules) {
      if (
        dto.mode === 'due' &&
        !this.isAutomationRuleDue(
          rule,
          existingRuns.filter((run) => run.ruleId === rule.id),
        )
      ) {
        continue;
      }
      const run = await this.executeAutomationRule(
        rule,
        workspace,
        dto.mode === 'due' ? 'scheduled' : 'manual',
      );
      runs.push(run);
      existingRuns.unshift(run);
    }
    return {
      runs: runs.map((run) => this.toAutomationRunView(run)),
    };
  }

  async getLifecycleDigest(
    userId: string,
  ): Promise<MarketplaceLifecycleDigestResponse> {
    const workspace = await this.requireClientRetentionWorkspace(userId);
    return {
      digest: await this.buildLifecycleDigestForWorkspace(workspace),
    };
  }

  async listMyOpportunityInvites(
    userId: string,
  ): Promise<MarketplaceOpportunityInvitesResponse> {
    const invites = (await this.marketplaceRepository.listOpportunityInvites())
      .filter((invite) => invite.invitedProfileUserId === userId)
      .sort((left, right) => right.updatedAt - left.updatedAt);

    return {
      invites: await Promise.all(
        invites.map((invite) => this.toOpportunityInviteView(invite)),
      ),
    };
  }

  async inviteTalentToOpportunity(
    userId: string,
    opportunityId: string,
    dto: CreateMarketplaceOpportunityInviteDto,
  ): Promise<MarketplaceOpportunityInviteResponse> {
    const opportunity = await this.requireOpportunity(opportunityId);
    await this.assertOpportunityOwner(userId, opportunity, 'reviewApplications');
    const profile = await this.marketplaceRepository.getProfileBySlug(
      dto.profileSlug.trim().toLowerCase(),
    );
    if (!profile || !this.isProfileComplete(profile)) {
      throw new NotFoundException('Marketplace profile not found');
    }
    if (profile.userId === userId) {
      throw new ForbiddenException(
        'You cannot invite your own marketplace profile to apply',
      );
    }

    const existing = (await this.marketplaceRepository.listOpportunityInvites()).find(
      (invite) =>
        invite.opportunityId === opportunityId &&
        invite.invitedProfileUserId === profile.userId,
    );
    const now = Date.now();
    const invite: MarketplaceOpportunityInviteRecord = {
      id: existing?.id ?? randomUUID(),
      opportunityId,
      invitedProfileUserId: profile.userId,
      invitedProfileSlug: profile.slug,
      invitedByUserId: userId,
      invitedWorkspaceId: opportunity.ownerWorkspaceId,
      message: dto.message?.trim() || null,
      status: existing?.status === 'applied' ? 'applied' : 'pending',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.marketplaceRepository.saveOpportunityInvite(invite);
    await this.trackMarketplaceEvent({
      actorUserId: userId,
      actorWorkspaceId: opportunity.ownerWorkspaceId ?? null,
      surface: 'workspace',
      entityType: 'opportunity',
      eventType: 'invite_sent',
      entityId: opportunity.id,
      searchKind: 'talent',
      queryLabel: null,
      category: opportunity.category,
      timezone: null,
      skillTags: normalizeSkillTags(opportunity.requiredSkills),
      resultCount: 1,
      relatedOpportunityId: opportunity.id,
      relatedProfileUserId: profile.userId,
      relatedApplicationId: null,
      relatedJobId: null,
    });
    await this.emitNotification({
      userId: profile.userId,
      workspaceId: profile.workspaceId,
      kind: 'talent_invite_received',
      title: `Invitation to apply: ${opportunity.title}`,
      detail:
        invite.message ??
        'A client invited you to apply from the marketplace workspace.',
      actorUserId: userId,
      relatedOpportunityId: opportunity.id,
    });
    return {
      invite: await this.toOpportunityInviteView(invite),
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

  async getJobReviews(
    userId: string,
    jobId: string,
  ): Promise<MarketplaceJobReviewsResponse> {
    const job = await this.requireReviewableJob(jobId);
    const roles = await this.resolveEscrowParticipantRoles(
      await this.usersService.getRequiredById(userId),
      job,
    );
    if (roles.length === 0) {
      throw new ForbiddenException(
        'Only marketplace participants can access job reviews',
      );
    }
    const reviews = (await this.marketplaceRepository.listReviews())
      .filter((review) => review.jobId === jobId)
      .sort((left, right) => right.createdAt - left.createdAt);
    return {
      reviews: await Promise.all(
        reviews.map((review) => this.toReviewView(review)),
      ),
    };
  }

  async createJobReview(
    userId: string,
    jobId: string,
    dto: CreateMarketplaceReviewDto,
  ): Promise<MarketplaceReviewResponse> {
    const reviewer = await this.usersService.getRequiredById(userId);
    const job = await this.requireReviewableJob(jobId);
    const participantRoles = await this.resolveEscrowParticipantRoles(
      reviewer,
      job,
    );
    if (participantRoles.length === 0) {
      throw new ForbiddenException(
        'Only marketplace participants can submit job reviews',
      );
    }
    const reviewerRole = participantRoles.includes('client') ? 'client' : 'worker';
    const revieweeRole = reviewerRole === 'client' ? 'worker' : 'client';
    const revieweeUserId = await this.resolveEscrowParticipantUserId(
      job,
      revieweeRole,
    );
    if (!revieweeUserId) {
      throw new ConflictException(
        'The opposite marketplace participant could not be resolved for review capture',
      );
    }
    if (revieweeUserId === userId) {
      throw new ConflictException('A marketplace participant cannot review themself');
    }
    const existing = (await this.marketplaceRepository.listReviews()).find(
      (review) => review.jobId === jobId && review.reviewerUserId === userId,
    );
    if (existing) {
      throw new ConflictException('A marketplace review already exists for this job');
    }
    const now = Date.now();
    const review: MarketplaceReviewRecord = {
      id: randomUUID(),
      jobId,
      reviewerUserId: userId,
      revieweeUserId,
      reviewerRole,
      revieweeRole,
      rating: dto.rating,
      scores: dto.scores,
      headline: dto.headline?.trim() || null,
      body: dto.body.trim(),
      visibilityStatus: 'visible',
      moderationNote: null,
      moderatedByUserId: null,
      moderatedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.marketplaceRepository.saveReview(review);
    await this.trackMarketplaceEvent({
      actorUserId: userId,
      actorWorkspaceId: null,
      surface: 'workspace',
      entityType: 'job',
      eventType: 'review_submitted',
      entityId: jobId,
      searchKind: null,
      queryLabel: null,
      category: job.category,
      timezone: null,
      skillTags: [],
      resultCount: 1,
      relatedOpportunityId: null,
      relatedProfileUserId: revieweeUserId,
      relatedApplicationId: null,
      relatedJobId: jobId,
    });
    await this.emitNotification({
      userId: revieweeUserId,
      workspaceId: null,
      kind: 'review_received',
      title: `New review on ${job.title}`,
      detail: dto.headline?.trim() || `You received a ${dto.rating}/5 marketplace review.`,
      actorUserId: userId,
      relatedJobId: jobId,
    });
    return {
      review: await this.toReviewView(review),
    };
  }

  async createRehireOpportunity(
    userId: string,
    jobId: string,
    dto: CreateMarketplaceRehireOpportunityDto,
  ): Promise<MarketplaceOpportunityResponse> {
    const workspace = await this.organizationsService.requireWorkspace(
      userId,
      'client',
      'createOpportunity',
    );
    const user = await this.usersService.getRequiredById(userId);
    const job = await this.requireReviewableJob(jobId);
    const roles = await this.resolveEscrowParticipantRoles(user, job);
    if (!roles.includes('client')) {
      throw new ForbiddenException(
        'Only the client-side marketplace participant can create a rehire opportunity',
      );
    }
    const workerUserId = await this.resolveEscrowParticipantUserId(job, 'worker');
    if (!workerUserId) {
      throw new ConflictException(
        'The previous worker could not be resolved into a marketplace account',
      );
    }
    const workerUser = await this.usersService.getRequiredById(workerUserId);
    const workerSummary = await this.toTalentSummary(workerUser);
    if (!workerSummary.profileSlug) {
      throw new ConflictException(
        'The previous worker does not have a reusable marketplace profile',
      );
    }
    const totalAmount = this.sumMilestoneAmounts(job.milestones);
    const createResponse = await this.createOpportunity(userId, {
      title: dto.title?.trim() || `Rehire ${workerSummary.displayName}`,
      summary:
        dto.summary?.trim() ||
        `Repeat engagement with ${workerSummary.displayName} using the same escrow-backed workflow.`,
      description:
        dto.description?.trim() ||
        [
          `Previous escrow job: ${job.title}`,
          `Rehire candidate: ${workerSummary.displayName}`,
          dto.message?.trim() || 'Resume delivery under a new milestone-backed brief.',
        ].join('\n\n'),
      category: job.category,
      currencyAddress: job.onchain.currencyAddress,
      requiredSkills: workerSummary.specialties,
      mustHaveSkills: workerSummary.specialties.slice(0, 3),
      outcomes: job.milestones.map((milestone) => milestone.title),
      acceptanceCriteria: job.milestones.map(
        (milestone) => milestone.deliverable,
      ),
      screeningQuestions: [],
      visibility: 'private',
      budgetMin: dto.budgetMin ?? totalAmount,
      budgetMax: dto.budgetMax ?? totalAmount,
      timeline:
        dto.timeline?.trim() ||
        `Repeat execution path for ${job.milestones.length} milestone${job.milestones.length === 1 ? '' : 's'}.`,
      desiredStartAt: null,
      timezoneOverlapHours: null,
      engagementType: 'fixed_scope',
      cryptoReadinessRequired: workerSummary.cryptoReadiness,
    });

    let opportunity = createResponse.opportunity;
    if ((await this.getEscrowReadiness(userId)) === 'ready') {
      opportunity = (
        await this.publishOpportunity(userId, createResponse.opportunity.id)
      ).opportunity;
      await this.inviteTalentToOpportunity(userId, opportunity.id, {
        profileSlug: workerSummary.profileSlug,
        message: dto.message?.trim() || null,
      });
    }

    const pools = await this.marketplaceRepository.listTalentPools();
    const defaultPool = pools.find(
      (pool) =>
        pool.workspaceId === workspace.workspaceId &&
        pool.label.trim().toLowerCase() === 'rehire bench',
    );
    const now = Date.now();
    const rehirePool =
      defaultPool ??
      ({
        id: randomUUID(),
        ownerUserId: userId,
        workspaceId: workspace.workspaceId,
        label: 'Rehire bench',
        focusSkills: workerSummary.specialties,
        note: 'Repeat-ready talent sourced from completed escrow delivery.',
        createdAt: now,
        updatedAt: now,
      } satisfies MarketplaceTalentPoolRecord);
    await this.marketplaceRepository.saveTalentPool({
      ...rehirePool,
      updatedAt: now,
    });
    const members = await this.marketplaceRepository.listTalentPoolMembers();
    const existingMember = members.find(
      (member) =>
        member.poolId === rehirePool.id &&
        member.profileUserId === workerSummary.userId,
    );
    await this.marketplaceRepository.saveTalentPoolMember({
      id: existingMember?.id ?? randomUUID(),
      poolId: rehirePool.id,
      profileUserId: workerSummary.userId,
      profileSlug: workerSummary.profileSlug,
      addedByUserId: userId,
      stage: 'rehire_ready',
      note: dto.message?.trim() || 'Seeded automatically from a completed escrow contract.',
      sourceOpportunityId: opportunity.id,
      sourceApplicationId: null,
      sourceJobId: job.id,
      createdAt: existingMember?.createdAt ?? now,
      updatedAt: now,
    });

    return {
      opportunity,
    };
  }

  async getOpportunityApplications(
    userId: string,
    opportunityId: string,
  ): Promise<MarketplaceApplicationsListResponse> {
    const opportunity = await this.requireOpportunity(opportunityId);
    await this.assertOpportunityOwner(userId, opportunity, 'reviewApplications');

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
    await this.assertOpportunityOwner(userId, opportunity, 'reviewApplications');
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
    const applicantWorkspace = await this.ensureApplicationWorkspace(application);
    const opportunityWorkspace = await this.ensureOpportunityWorkspace(opportunity);
    const canAccessAsApplicant =
      applicantWorkspace.applicantWorkspaceId !== null &&
      (await this.organizationsService.findAccessibleWorkspace(
        userId,
        applicantWorkspace.applicantWorkspaceId,
      )) !== null;
    const canAccessAsOwner =
      opportunityWorkspace.ownerWorkspaceId !== null &&
      (
        await this.organizationsService.findAccessibleWorkspace(
          userId,
          opportunityWorkspace.ownerWorkspaceId,
        )
      )?.capabilities.reviewApplications === true;
    if (!canAccessAsApplicant && !canAccessAsOwner) {
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
    const freelancerWorkspace = await this.organizationsService.requireWorkspace(
      userId,
      'freelancer',
      'applyToOpportunity',
    );
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

    const profile = await this.requireProfileByUserId(userId, freelancerWorkspace);
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
      applicantOrganizationId: freelancerWorkspace.organizationId,
      applicantWorkspaceId: freelancerWorkspace.workspaceId,
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
    await this.marketplaceRepository.saveApplicationRevision(
      this.toApplicationRevisionRecord(
        application,
        await this.getNextApplicationRevisionNumber(application.id),
        null,
        now,
      ),
    );
    await this.recordApplicationDecision(application, {
      actorUserId: userId,
      action: 'applied',
      reason: existing ? 'Resubmitted application' : null,
      createdAt: now,
    });
    const matchingInvite = (await this.marketplaceRepository.listOpportunityInvites()).find(
      (invite) =>
        invite.opportunityId === opportunityId &&
        invite.invitedProfileUserId === userId &&
        invite.status === 'pending',
    );
    if (matchingInvite) {
      await this.marketplaceRepository.saveOpportunityInvite({
        ...matchingInvite,
        status: 'applied',
        updatedAt: now,
      });
    }
    await this.trackMarketplaceEvent({
      actorUserId: userId,
      actorWorkspaceId: freelancerWorkspace.workspaceId,
      surface: 'workspace',
      entityType: 'application',
      eventType: 'application_submitted',
      entityId: application.id,
      searchKind: 'opportunity',
      queryLabel: null,
      category: opportunity.category,
      timezone: profile.timezone,
      skillTags: normalizeSkillTags(profile.skills),
      resultCount: 1,
      relatedOpportunityId: opportunity.id,
      relatedProfileUserId: userId,
      relatedApplicationId: application.id,
      relatedJobId: null,
    });
    await this.emitNotification({
      userId: opportunity.ownerUserId,
      workspaceId: opportunity.ownerWorkspaceId,
      kind: 'application_received',
      title: `New application for ${opportunity.title}`,
      detail: `${profile.displayName} submitted a proposal that is ready for dossier review.`,
      actorUserId: userId,
      relatedOpportunityId: opportunity.id,
      relatedApplicationId: application.id,
    });

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
    const workspace = await this.organizationsService.requireWorkspace(
      userId,
      'freelancer',
    );
    const applications = (
      await Promise.all(
        (await this.marketplaceRepository.listApplications()).map(
          (application) => this.ensureApplicationWorkspace(application),
        ),
      )
    )
      .filter(
        (application) => application.applicantWorkspaceId === workspace.workspaceId,
      )
      .sort((left, right) => right.updatedAt - left.updatedAt);

    return {
      applications: await Promise.all(
        applications.map((application) =>
          this.toApplicationView(application, userId),
        ),
      ),
    };
  }

  async reviseApplication(
    userId: string,
    applicationId: string,
    dto: ReviseMarketplaceApplicationDto,
  ): Promise<MarketplaceApplicationRevisionResponse> {
    const application = await this.requireApplication(applicationId);
    await this.assertApplicationApplicant(userId, application);
    if (
      application.status === 'withdrawn' ||
      application.status === 'rejected' ||
      application.status === 'declined' ||
      application.status === 'hired'
    ) {
      throw new ConflictException(
        'This marketplace application can no longer be revised',
      );
    }

    const applicant = await this.usersService.getRequiredById(userId);
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

    const opportunity = await this.requireOpportunity(application.opportunityId);
    const profile = await this.requireProfileByUserId(userId);
    this.validateScreeningAnswers(
      opportunity.screeningQuestions,
      dto.screeningAnswers,
    );

    const now = Date.now();
    application.coverNote = dto.coverNote;
    application.proposedRate = dto.proposedRate ?? null;
    application.selectedWalletAddress = selectedWallet.address;
    application.screeningAnswers = normalizeScreeningAnswers(dto.screeningAnswers);
    application.deliveryApproach = dto.deliveryApproach;
    application.milestonePlanSummary = dto.milestonePlanSummary;
    application.estimatedStartAt = dto.estimatedStartAt ?? null;
    application.relevantProofArtifacts = normalizeProofArtifacts(
      dto.relevantProofArtifacts,
    );
    application.portfolioUrls =
      dto.portfolioUrls.length > 0
        ? normalizeTextArray(dto.portfolioUrls)
        : profile.proofArtifacts
            .filter((artifact) => artifact.kind === 'portfolio')
            .map((artifact) => artifact.url);
    application.updatedAt = now;
    await this.marketplaceRepository.saveApplication(application);

    const revision = this.toApplicationRevisionRecord(
      application,
      await this.getNextApplicationRevisionNumber(application.id),
      dto.revisionReason ?? null,
      now,
    );
    await this.marketplaceRepository.saveApplicationRevision(revision);
    await this.recordApplicationDecision(application, {
      actorUserId: userId,
      action: 'revised',
      reason: dto.revisionReason ?? null,
      createdAt: now,
    });
    await this.trackMarketplaceEvent({
      actorUserId: userId,
      actorWorkspaceId: application.applicantWorkspaceId ?? null,
      surface: 'workspace',
      entityType: 'application',
      eventType: 'application_revised',
      entityId: application.id,
      searchKind: 'opportunity',
      queryLabel: null,
      category: opportunity.category,
      timezone: profile.timezone,
      skillTags: normalizeSkillTags(profile.skills),
      resultCount: 1,
      relatedOpportunityId: opportunity.id,
      relatedProfileUserId: userId,
      relatedApplicationId: application.id,
      relatedJobId: null,
    });

    return {
      revision: revision,
    };
  }

  async getApplicationTimeline(
    userId: string,
    applicationId: string,
  ): Promise<MarketplaceApplicationTimelineResponse> {
    const application = await this.requireApplication(applicationId);
    await this.assertApplicationTimelineAccess(userId, application);
    return {
      timeline: await this.buildApplicationTimeline(application, userId),
    };
  }

  async getApplicationInterviewThread(
    userId: string,
    applicationId: string,
  ): Promise<MarketplaceInterviewThreadResponse> {
    const application = await this.requireApplication(applicationId);
    await this.assertApplicationTimelineAccess(userId, application);
    const opportunity = await this.requireOpportunity(application.opportunityId);
    const thread = await this.getOrCreateInterviewThread(application, opportunity);
    return {
      thread: await this.toInterviewThreadView(thread),
    };
  }

  async postApplicationInterviewMessage(
    userId: string,
    applicationId: string,
    dto: CreateMarketplaceInterviewMessageDto,
  ): Promise<MarketplaceInterviewThreadResponse> {
    const application = await this.requireApplication(applicationId);
    const opportunity = await this.requireOpportunity(application.opportunityId);
    const access = await this.getApplicationAccess(userId, application, opportunity);
    if (!access.asApplicant && !access.asOwner) {
      throw new ForbiddenException(
        'You do not have access to this marketplace interview thread',
      );
    }

    const thread = await this.getOrCreateInterviewThread(application, opportunity);
    const senderWorkspaceId = access.asOwner
      ? opportunity.ownerWorkspaceId
      : application.applicantWorkspaceId;
    const now = Date.now();
    const message: MarketplaceInterviewMessageRecord = {
      id: randomUUID(),
      threadId: thread.id,
      applicationId: application.id,
      opportunityId: opportunity.id,
      senderUserId: userId,
      senderWorkspaceId: senderWorkspaceId ?? null,
      kind: dto.kind,
      body: dto.body.trim(),
      createdAt: now,
    };
    await this.marketplaceRepository.saveInterviewMessage(message);
    thread.status = 'open';
    thread.updatedAt = now;
    await this.marketplaceRepository.saveInterviewThread(thread);
    if (application.status === 'submitted' || application.status === 'shortlisted') {
      application.status = 'interviewing';
      application.updatedAt = now;
      await this.marketplaceRepository.saveApplication(application);
      await this.recordApplicationDecision(application, {
        actorUserId: userId,
        action: 'interview_started',
        reason: dto.kind === 'clarification' ? 'Clarification thread opened' : null,
        createdAt: now,
      });
    }
    await this.trackMarketplaceEvent({
      actorUserId: userId,
      actorWorkspaceId: senderWorkspaceId ?? null,
      surface: 'workspace',
      entityType: 'application',
      eventType:
        application.status === 'interviewing'
          ? 'interview_started'
          : 'interview_message_posted',
      entityId: application.id,
      searchKind: null,
      queryLabel: null,
      category: opportunity.category,
      timezone: null,
      skillTags: normalizeSkillTags(opportunity.requiredSkills),
      resultCount: 1,
      relatedOpportunityId: opportunity.id,
      relatedProfileUserId: application.applicantUserId,
      relatedApplicationId: application.id,
      relatedJobId: null,
    });
    await this.emitNotification({
      userId: access.asOwner ? application.applicantUserId : opportunity.ownerUserId,
      workspaceId: access.asOwner
        ? application.applicantWorkspaceId
        : opportunity.ownerWorkspaceId,
      kind: 'interview_message_received',
      title: `Interview update for ${opportunity.title}`,
      detail: dto.body.trim(),
      actorUserId: userId,
      relatedOpportunityId: opportunity.id,
      relatedApplicationId: application.id,
    });

    return {
      thread: await this.toInterviewThreadView(thread),
    };
  }

  async createApplicationOffer(
    userId: string,
    applicationId: string,
    dto: CreateMarketplaceOfferDto,
  ): Promise<MarketplaceOfferResponse> {
    const application = await this.requireApplication(applicationId);
    const opportunity = await this.requireOpportunity(application.opportunityId);
    await this.assertOpportunityOwner(userId, opportunity, 'reviewApplications');
    this.assertOpportunityOpenForDecision(opportunity);
    if (
      application.status === 'rejected' ||
      application.status === 'withdrawn' ||
      application.status === 'declined' ||
      application.status === 'hired'
    ) {
      throw new ConflictException(
        'This marketplace application is no longer eligible for offers',
      );
    }

    const now = Date.now();
    const offer: MarketplaceOfferRecord = {
      id: randomUUID(),
      applicationId: application.id,
      opportunityId: opportunity.id,
      clientUserId: userId,
      applicantUserId: application.applicantUserId,
      status: 'sent',
      message: dto.message?.trim() ?? null,
      counterMessage: null,
      declineReason: null,
      proposedRate: dto.proposedRate ?? application.proposedRate,
      milestones: normalizeOfferMilestones(dto.milestones),
      revisionNumber: await this.getNextOfferRevisionNumber(application.id),
      createdAt: now,
      updatedAt: now,
    };
    await this.marketplaceRepository.saveOffer(offer);
    application.status = 'offer_sent';
    application.updatedAt = now;
    await this.marketplaceRepository.saveApplication(application);
    await this.recordApplicationDecision(application, {
      actorUserId: userId,
      action: 'offer_sent',
      reason: dto.message ?? null,
      createdAt: now,
    });
    await this.trackMarketplaceEvent({
      actorUserId: userId,
      actorWorkspaceId: opportunity.ownerWorkspaceId ?? null,
      surface: 'workspace',
      entityType: 'application',
      eventType: 'offer_created',
      entityId: application.id,
      searchKind: null,
      queryLabel: null,
      category: opportunity.category,
      timezone: null,
      skillTags: normalizeSkillTags(opportunity.requiredSkills),
      resultCount: 1,
      relatedOpportunityId: opportunity.id,
      relatedProfileUserId: application.applicantUserId,
      relatedApplicationId: application.id,
      relatedJobId: null,
    });
    await this.emitNotification({
      userId: application.applicantUserId,
      workspaceId: application.applicantWorkspaceId,
      kind: 'offer_received',
      title: `Offer received for ${opportunity.title}`,
      detail:
        offer.message ??
        'A client sent a milestone-backed offer for this opportunity.',
      actorUserId: userId,
      relatedOpportunityId: opportunity.id,
      relatedApplicationId: application.id,
      relatedOfferId: offer.id,
    });

    return {
      offer,
    };
  }

  async respondToMarketplaceOffer(
    userId: string,
    offerId: string,
    dto: RespondToMarketplaceOfferDto,
  ): Promise<MarketplaceOfferResponse> {
    const offer = await this.requireOffer(offerId);
    const application = await this.requireApplication(offer.applicationId);
    await this.assertApplicationApplicant(userId, application);
    const now = Date.now();

    if (dto.action === 'accept') {
      offer.status = 'accepted';
      offer.counterMessage = dto.message?.trim() ?? offer.counterMessage;
      offer.updatedAt = now;
      await this.marketplaceRepository.saveOffer(offer);
      application.status = 'accepted';
      application.updatedAt = now;
      await this.marketplaceRepository.saveApplication(application);
      await this.recordApplicationDecision(application, {
        actorUserId: userId,
        action: 'offer_accepted',
        reason: dto.message ?? null,
        createdAt: now,
      });
      await this.trackMarketplaceEvent({
        actorUserId: userId,
        actorWorkspaceId: application.applicantWorkspaceId ?? null,
        surface: 'workspace',
        entityType: 'application',
        eventType: 'offer_accepted',
        entityId: application.id,
        searchKind: null,
        queryLabel: null,
        category: null,
        timezone: null,
        skillTags: [],
        resultCount: 1,
        relatedOpportunityId: application.opportunityId,
        relatedProfileUserId: application.applicantUserId,
        relatedApplicationId: application.id,
        relatedJobId: null,
      });
      await this.emitNotification({
        userId: offer.clientUserId,
        workspaceId: (await this.requireOpportunity(application.opportunityId))
          .ownerWorkspaceId,
        kind: 'offer_response',
        title: 'Offer accepted',
        detail: dto.message?.trim() || 'The applicant accepted the marketplace offer.',
        actorUserId: userId,
        relatedOpportunityId: application.opportunityId,
        relatedApplicationId: application.id,
        relatedOfferId: offer.id,
      });
      await this.ensureContractDraftFromAcceptedOffer(application, offer);
      return { offer };
    }

    if (dto.action === 'decline') {
      offer.status = 'declined';
      offer.declineReason =
        dto.declineReason?.trim() ?? dto.message?.trim() ?? offer.declineReason;
      offer.updatedAt = now;
      await this.marketplaceRepository.saveOffer(offer);
      application.status = 'declined';
      application.updatedAt = now;
      await this.marketplaceRepository.saveApplication(application);
      await this.recordApplicationDecision(application, {
        actorUserId: userId,
        action: 'offer_declined',
        reason: offer.declineReason,
        createdAt: now,
      });
      await this.trackMarketplaceEvent({
        actorUserId: userId,
        actorWorkspaceId: application.applicantWorkspaceId ?? null,
        surface: 'workspace',
        entityType: 'application',
        eventType: 'offer_declined',
        entityId: application.id,
        searchKind: null,
        queryLabel: null,
        category: null,
        timezone: null,
        skillTags: [],
        resultCount: 1,
        relatedOpportunityId: application.opportunityId,
        relatedProfileUserId: application.applicantUserId,
        relatedApplicationId: application.id,
        relatedJobId: null,
      });
      await this.emitNotification({
        userId: offer.clientUserId,
        workspaceId: (await this.requireOpportunity(application.opportunityId))
          .ownerWorkspaceId,
        kind: 'offer_response',
        title: 'Offer declined',
        detail:
          offer.declineReason ??
          'The applicant declined the marketplace offer.',
        actorUserId: userId,
        relatedOpportunityId: application.opportunityId,
        relatedApplicationId: application.id,
        relatedOfferId: offer.id,
      });
      return { offer };
    }

    const counter: MarketplaceOfferRecord = {
      id: randomUUID(),
      applicationId: application.id,
      opportunityId: offer.opportunityId,
      clientUserId: offer.clientUserId,
      applicantUserId: userId,
      status: 'countered',
      message: offer.message,
      counterMessage: dto.message?.trim() ?? null,
      declineReason: null,
      proposedRate: dto.proposedRate ?? offer.proposedRate,
      milestones: normalizeOfferMilestones(dto.milestones ?? offer.milestones),
      revisionNumber: await this.getNextOfferRevisionNumber(application.id),
      createdAt: now,
      updatedAt: now,
    };
    offer.status = 'countered';
    offer.updatedAt = now;
    await this.marketplaceRepository.saveOffer(offer);
    await this.marketplaceRepository.saveOffer(counter);
    application.status = 'countered';
    application.updatedAt = now;
    await this.marketplaceRepository.saveApplication(application);
    await this.recordApplicationDecision(application, {
      actorUserId: userId,
      action: 'offer_countered',
      reason: dto.message ?? null,
      createdAt: now,
    });
    await this.trackMarketplaceEvent({
      actorUserId: userId,
      actorWorkspaceId: application.applicantWorkspaceId ?? null,
      surface: 'workspace',
      entityType: 'application',
      eventType: 'offer_created',
      entityId: application.id,
      searchKind: null,
      queryLabel: null,
      category: null,
      timezone: null,
      skillTags: [],
      resultCount: 1,
      relatedOpportunityId: application.opportunityId,
      relatedProfileUserId: application.applicantUserId,
      relatedApplicationId: application.id,
      relatedJobId: null,
    });
    await this.emitNotification({
      userId: offer.clientUserId,
      workspaceId: (await this.requireOpportunity(application.opportunityId))
        .ownerWorkspaceId,
      kind: 'offer_response',
      title: 'Offer countered',
      detail:
        counter.counterMessage ??
        'The applicant proposed a counter offer with updated terms.',
      actorUserId: userId,
      relatedOpportunityId: application.opportunityId,
      relatedApplicationId: application.id,
      relatedOfferId: counter.id,
    });
    return { offer: counter };
  }

  async getMarketplaceContractDraft(
    userId: string,
    draftId: string,
  ): Promise<MarketplaceContractDraftResponse> {
    const draft = await this.requireContractDraft(draftId);
    await this.assertContractDraftAccess(userId, draft);
    return {
      draft: draft,
    };
  }

  async reviseMarketplaceContractDraft(
    userId: string,
    draftId: string,
    dto: ReviseMarketplaceContractDraftDto,
  ): Promise<MarketplaceContractDraftResponse> {
    const draft = await this.requireContractDraft(draftId);
    await this.assertContractDraftAccess(userId, draft);
    if (draft.status === 'converted' || draft.status === 'cancelled') {
      throw new ConflictException(
        'This marketplace contract draft can no longer be revised',
      );
    }

    const nextSnapshot: MarketplaceContractMetadataSnapshot = {
      ...draft.latestSnapshot,
      title: dto.title,
      description: dto.description,
      scopeSummary: dto.scopeSummary,
      acceptanceCriteria: normalizeTextArray(dto.acceptanceCriteria),
      outcomes: normalizeTextArray(dto.outcomes),
      timeline: dto.timeline,
      milestones: normalizeOfferMilestones(dto.milestones),
      reviewWindowDays: dto.reviewWindowDays,
      disputeModel: dto.disputeModel.trim(),
      evidenceExpectation: dto.evidenceExpectation.trim(),
      kickoffNote: dto.kickoffNote.trim(),
    };
    const now = Date.now();
    const revision = this.buildContractDraftRevision(
      draft,
      nextSnapshot,
      userId,
      dto.reason ?? null,
      now,
    );
    draft.latestSnapshot = nextSnapshot;
    draft.metadataHash = revision.metadataHash;
    draft.revisions = [...draft.revisions, revision];
    draft.clientApprovedAt = null;
    draft.applicantApprovedAt = null;
    draft.finalizedAt = null;
    draft.status = 'draft';
    draft.updatedAt = now;
    await this.marketplaceRepository.saveContractDraft(draft);
    return {
      draft,
    };
  }

  async approveMarketplaceContractDraft(
    userId: string,
    draftId: string,
    dto: ApproveMarketplaceContractDraftDto,
  ): Promise<MarketplaceContractDraftResponse> {
    void dto;
    const draft = await this.requireContractDraft(draftId);
    const access = await this.getContractDraftAccess(userId, draft);
    if (!access.asApplicant && !access.asOwner) {
      throw new ForbiddenException(
        'You do not have access to this marketplace contract draft',
      );
    }
    if (draft.status === 'converted' || draft.status === 'cancelled') {
      throw new ConflictException(
        'This marketplace contract draft can no longer be approved',
      );
    }
    const now = Date.now();
    if (access.asOwner) {
      draft.clientApprovedAt = now;
    }
    if (access.asApplicant) {
      draft.applicantApprovedAt = now;
    }
    if (draft.clientApprovedAt && draft.applicantApprovedAt) {
      draft.status = 'finalized';
      draft.finalizedAt = now;
    }
    draft.updatedAt = now;
    await this.marketplaceRepository.saveContractDraft(draft);
    return {
      draft,
    };
  }

  async convertMarketplaceContractDraft(
    userId: string,
    draftId: string,
    dto: ConvertMarketplaceContractDraftDto,
  ): Promise<HireApplicationResponse> {
    void dto;
    const draft = await this.requireContractDraft(draftId);
    if (draft.status !== 'finalized') {
      throw new ConflictException(
        'Marketplace contract draft must be finalized before escrow conversion',
      );
    }
    if (!draft.clientApprovedAt || !draft.applicantApprovedAt) {
      throw new ConflictException(
        'Both participants must approve the marketplace contract draft first',
      );
    }
    const application = await this.requireApplication(draft.applicationId);
    const opportunity = await this.requireOpportunity(draft.opportunityId);
    await this.assertOpportunityOwner(userId, opportunity, 'reviewApplications');
    if (draft.convertedJobId) {
      return {
        applicationId: application.id,
        opportunityId: opportunity.id,
        jobId: draft.convertedJobId,
      };
    }
    return this.convertDraftToEscrow(userId, draft, application, opportunity);
  }

  async getOpportunityApplicationComparison(
    userId: string,
    opportunityId: string,
  ): Promise<MarketplaceApplicationComparisonResponse> {
    const opportunity = await this.requireOpportunity(opportunityId);
    await this.assertOpportunityOwner(userId, opportunity, 'reviewApplications');
    const applications = (await this.marketplaceRepository.listApplications()).filter(
      (application) => application.opportunityId === opportunityId,
    );
    const revisions = await this.marketplaceRepository.listApplicationRevisions();
    const messages = await this.marketplaceRepository.listInterviewMessages();
    const offers = await this.marketplaceRepository.listOffers();
    const decisions = await this.marketplaceRepository.listApplicationDecisions();

    const candidates = await Promise.all(
      applications.map(async (application) => {
        const latestRevision = revisions
          .filter((revision) => revision.applicationId === application.id)
          .sort((left, right) => right.revisionNumber - left.revisionNumber)[0] ?? null;
        const latestOffer = offers
          .filter((entry) => entry.applicationId === application.id)
          .sort((left, right) => right.revisionNumber - left.revisionNumber)[0] ?? null;
        const latestMessageAt = messages
          .filter((entry) => entry.applicationId === application.id)
          .sort((left, right) => right.createdAt - left.createdAt)[0]?.createdAt ?? null;
        const decisionCount = decisions.filter(
          (decision) => decision.applicationId === application.id,
        ).length;
        const contractDraftStatus =
          (await this.marketplaceRepository.getContractDraftByApplicationId(
            application.id,
          ))?.status ?? null;
        return {
          application: await this.toApplicationView(application, userId),
          latestRevision,
          latestOffer,
          latestMessageAt,
          decisionCount,
          contractDraftStatus,
        } satisfies MarketplaceApplicationComparisonView;
      }),
    );

    return {
      candidates: candidates.sort(
        (left, right) =>
          right.application.fitScore - left.application.fitScore ||
          right.application.updatedAt - left.application.updatedAt,
      ),
    };
  }

  async withdrawApplication(
    userId: string,
    applicationId: string,
    dto: ApplicationDecisionNoteDto,
  ): Promise<MarketplaceApplicationsListResponse> {
    const application = await this.requireApplication(applicationId);
    await this.assertApplicationApplicant(userId, application);
    if (application.status === 'hired') {
      throw new ConflictException(
        'Hired marketplace applications cannot be withdrawn',
      );
    }

    const now = Date.now();
    application.status = 'withdrawn';
    application.updatedAt = now;
    await this.marketplaceRepository.saveApplication(application);
    await this.recordApplicationDecision(application, {
      actorUserId: userId,
      action: 'withdrawn',
      reason: dto.reason ?? null,
      noHireReason: dto.noHireReason ?? 'candidate_withdrew',
      createdAt: now,
    });
    await this.trackMarketplaceEvent({
      actorUserId: userId,
      actorWorkspaceId: application.applicantWorkspaceId ?? null,
      surface: 'workspace',
      entityType: 'application',
      eventType: 'application_withdrawn',
      entityId: application.id,
      searchKind: null,
      queryLabel: null,
      category: null,
      timezone: null,
      skillTags: [],
      resultCount: 1,
      relatedOpportunityId: application.opportunityId,
      relatedProfileUserId: application.applicantUserId,
      relatedApplicationId: application.id,
      relatedJobId: application.hiredJobId,
    });
    return this.listMyApplications(userId);
  }

  async shortlistApplication(
    userId: string,
    applicationId: string,
    dto: ApplicationDecisionNoteDto = {},
  ): Promise<MarketplaceApplicationsListResponse> {
    const application = await this.requireApplication(applicationId);
    const opportunity = await this.requireOpportunity(
      application.opportunityId,
    );
    await this.assertOpportunityOwner(userId, opportunity, 'reviewApplications');
    this.assertOpportunityOpenForDecision(opportunity);

    const now = Date.now();
    application.status = 'shortlisted';
    application.updatedAt = now;
    await this.marketplaceRepository.saveApplication(application);
    await this.recordApplicationDecision(application, {
      actorUserId: userId,
      action: 'shortlisted',
      reason: dto.reason ?? null,
      createdAt: now,
    });
    await this.trackMarketplaceEvent({
      actorUserId: userId,
      actorWorkspaceId: opportunity.ownerWorkspaceId ?? null,
      surface: 'workspace',
      entityType: 'application',
      eventType: 'application_shortlisted',
      entityId: application.id,
      searchKind: null,
      queryLabel: null,
      category: opportunity.category,
      timezone: null,
      skillTags: normalizeSkillTags(opportunity.requiredSkills),
      resultCount: 1,
      relatedOpportunityId: opportunity.id,
      relatedProfileUserId: application.applicantUserId,
      relatedApplicationId: application.id,
      relatedJobId: application.hiredJobId,
    });
    await this.emitNotification({
      userId: application.applicantUserId,
      workspaceId: application.applicantWorkspaceId,
      kind: 'application_status_changed',
      title: `Shortlisted for ${opportunity.title}`,
      detail: 'The client moved your proposal into the shortlist and may continue with interviews or offers.',
      actorUserId: userId,
      relatedOpportunityId: opportunity.id,
      relatedApplicationId: application.id,
    });
    return this.getOpportunityApplications(userId, opportunity.id);
  }

  async rejectApplication(
    userId: string,
    applicationId: string,
    dto: ApplicationDecisionNoteDto,
  ): Promise<MarketplaceApplicationsListResponse> {
    const application = await this.requireApplication(applicationId);
    const opportunity = await this.requireOpportunity(
      application.opportunityId,
    );
    await this.assertOpportunityOwner(userId, opportunity, 'reviewApplications');
    this.assertOpportunityOpenForDecision(opportunity);

    const now = Date.now();
    application.status = 'rejected';
    application.updatedAt = now;
    await this.marketplaceRepository.saveApplication(application);
    await this.recordApplicationDecision(application, {
      actorUserId: userId,
      action: 'rejected',
      reason: dto.reason ?? null,
      noHireReason: dto.noHireReason ?? null,
      createdAt: now,
    });
    await this.trackMarketplaceEvent({
      actorUserId: userId,
      actorWorkspaceId: opportunity.ownerWorkspaceId ?? null,
      surface: 'workspace',
      entityType: 'application',
      eventType: 'application_rejected',
      entityId: application.id,
      searchKind: null,
      queryLabel: null,
      category: opportunity.category,
      timezone: null,
      skillTags: normalizeSkillTags(opportunity.requiredSkills),
      resultCount: 1,
      relatedOpportunityId: opportunity.id,
      relatedProfileUserId: application.applicantUserId,
      relatedApplicationId: application.id,
      relatedJobId: application.hiredJobId,
    });
    await this.emitNotification({
      userId: application.applicantUserId,
      workspaceId: application.applicantWorkspaceId,
      kind: 'application_status_changed',
      title: `Application closed for ${opportunity.title}`,
      detail:
        dto.reason?.trim() ||
        'The client closed this application and did not move it forward.',
      actorUserId: userId,
      relatedOpportunityId: opportunity.id,
      relatedApplicationId: application.id,
    });
    return this.getOpportunityApplications(userId, opportunity.id);
  }

  async hireApplication(
    userId: string,
    applicationId: string,
    dto: ApplicationDecisionNoteDto = {},
  ): Promise<HireApplicationResponse> {
    const application = await this.requireApplication(applicationId);
    const opportunity = await this.requireOpportunity(
      application.opportunityId,
    );
    await this.assertOpportunityOwner(userId, opportunity, 'reviewApplications');
    this.assertOpportunityOpenForDecision(opportunity);
    const contractDraft =
      await this.marketplaceRepository.getContractDraftByApplicationId(
        application.id,
      );
    if (contractDraft) {
      if (contractDraft.status !== 'finalized') {
        throw new ConflictException(
          'Finalize the marketplace contract draft before converting this application into escrow',
        );
      }
      return this.convertDraftToEscrow(
        userId,
        contractDraft,
        application,
        opportunity,
      );
    }
    const offers = (await this.marketplaceRepository.listOffers()).filter(
      (offer) => offer.applicationId === application.id,
    );
    const hasAcceptedOffer = offers.some((offer) => offer.status === 'accepted');
    if (offers.length > 0 && !hasAcceptedOffer) {
      throw new ConflictException(
        'An accepted marketplace offer is required before creating the escrow contract',
      );
    }

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
        await this.recordApplicationDecision(sibling, {
          actorUserId: userId,
          action: 'no_hire',
          reason: 'Another candidate moved forward to escrow creation',
          noHireReason: 'fit_not_strong_enough',
          createdAt: now,
        });
        await this.emitNotification({
          userId: sibling.applicantUserId,
          workspaceId: sibling.applicantWorkspaceId,
          kind: 'application_status_changed',
          title: `Application closed for ${opportunity.title}`,
          detail:
            'Another candidate moved forward into escrow for this opportunity.',
          actorUserId: userId,
          relatedOpportunityId: opportunity.id,
          relatedApplicationId: sibling.id,
          relatedJobId: createResponse.jobId,
        });
      }
    }

    await this.marketplaceRepository.saveApplication(application);
    await this.marketplaceRepository.saveOpportunity(opportunity);
    await this.recordApplicationDecision(application, {
      actorUserId: userId,
      action: 'hired',
      reason: dto.reason ?? null,
      createdAt: now,
    });
    await this.emitNotification({
      userId: application.applicantUserId,
      workspaceId: application.applicantWorkspaceId,
      kind: 'application_status_changed',
      title: `Hired into escrow: ${opportunity.title}`,
      detail: 'The client converted your accepted marketplace proposal into an escrow contract.',
      actorUserId: userId,
      relatedOpportunityId: opportunity.id,
      relatedApplicationId: application.id,
      relatedJobId: createResponse.jobId,
    });

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
    const reviews = await this.marketplaceRepository.listReviews();
    const identityReviews =
      await this.marketplaceRepository.listIdentityRiskReviews();
    const profileMap = new Map(
      profiles.map((profile) => [profile.userId, profile]),
    );
    const agingNow = Date.now();
    const activeReports = reports.filter((report) =>
      this.isActiveAbuseReport(report),
    );
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
        claimedAbuseReports: activeReports.filter(
          (report) => report.claimedByUserId !== null,
        ).length,
        unclaimedAbuseReports: activeReports.filter(
          (report) => report.claimedByUserId === null,
        ).length,
        escalatedAbuseReports: activeReports.filter(
          (report) => report.escalationReason !== null,
        ).length,
        agingAbuseReports: activeReports.filter((report) =>
          this.isAgingAbuseReport(report, agingNow),
        ).length,
        staleAbuseReports: activeReports.filter((report) =>
          this.isStaleAbuseReport(report, agingNow),
        ).length,
        oldestActiveAbuseReportHours:
          activeReports.length === 0
            ? null
            : Math.max(
                ...activeReports.map((report) =>
                  this.getAbuseReportAgeHours(report, agingNow),
                ),
              ),
        totalReviews: reviews.length,
        visibleReviews: reviews.filter(
          (review) => review.visibilityStatus === 'visible',
        ).length,
        hiddenReviews: reviews.filter(
          (review) => review.visibilityStatus === 'hidden',
        ).length,
        highRiskIdentityReviews: identityReviews.filter(
          (review) => review.riskLevel === 'high',
        ).length,
        operatorReviewedIdentities: identityReviews.length,
      },
      thresholds: {
        abuseReportAgingHours,
        abuseReportStaleHours,
      },
      agingOpportunities,
      recentAbuseReports: await Promise.all(
        reports
          .sort((left, right) =>
            this.compareAbuseReportQueue(left, right, 'priority', agingNow),
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
            identityReview: await this.getIdentityRiskReviewView(profile.userId),
            riskSignals: await this.buildRiskSignalsForUser(
              await this.usersService.getRequiredById(profile.userId),
              'worker',
            ),
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
            if (
              query.claimState === 'claimed' &&
              report.claimedByUserId === null
            ) {
              return false;
            }
            if (
              query.claimState === 'unclaimed' &&
              report.claimedByUserId !== null
            ) {
              return false;
            }
            if (
              query.escalated !== undefined &&
              query.escalated !== (report.escalationReason !== null)
            ) {
              return false;
            }
            if (
              query.evidenceReviewStatus &&
              report.evidenceReviewStatus !== query.evidenceReviewStatus
            ) {
              return false;
            }
            return true;
          })
          .sort((left, right) =>
            this.compareAbuseReportQueue(
              left,
              right,
              query.sortBy ?? 'priority',
              Date.now(),
            ),
          )
          .slice(0, query.limit)
          .map((report) => this.toAbuseReportView(report)),
      ),
    };
  }

  async listModerationReviews(
    userId: string,
  ): Promise<MarketplaceModerationReviewsListResponse> {
    await this.requireModerationAccess(userId);
    const reviews = await this.marketplaceRepository.listReviews();
    return {
      reviews: await Promise.all(
        reviews
          .sort((left, right) => right.updatedAt - left.updatedAt)
          .map((review) => this.toReviewView(review)),
      ),
    };
  }

  async updateModerationReview(
    userId: string,
    reviewId: string,
    dto: UpdateMarketplaceReviewModerationDto,
  ): Promise<MarketplaceReviewResponse> {
    await this.requireModerationAccess(userId);
    const review = await this.marketplaceRepository.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundException('Marketplace review not found');
    }
    const now = Date.now();
    review.visibilityStatus = dto.visibilityStatus;
    review.moderationNote = dto.moderationNote?.trim() || null;
    review.moderatedByUserId = userId;
    review.moderatedAt = now;
    review.updatedAt = now;
    await this.marketplaceRepository.saveReview(review);
    return {
      review: await this.toReviewView(review),
    };
  }

  async updateIdentityRiskReview(
    userId: string,
    targetUserId: string,
    dto: UpdateMarketplaceIdentityRiskReviewDto,
  ): Promise<MarketplaceIdentityRiskReviewResponse> {
    await this.requireModerationAccess(userId);
    await this.usersService.getRequiredById(targetUserId);
    const now = Date.now();
    const existing =
      await this.marketplaceRepository.getIdentityRiskReviewByUserId(targetUserId);
    const review: MarketplaceIdentityRiskReviewRecord = {
      id: existing?.id ?? randomUUID(),
      subjectUserId: targetUserId,
      confidenceLabel: dto.confidenceLabel,
      riskLevel: dto.riskLevel,
      flags: Array.from(new Set(dto.flags)),
      operatorSummary: dto.operatorSummary?.trim() || null,
      reviewedByUserId: userId,
      reviewedAt: now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.marketplaceRepository.saveIdentityRiskReview(review);
    return {
      review: await this.toIdentityRiskReviewView(review),
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
    const hasWorkflowMutation =
      dto.status !== report.status ||
      dto.escalationReason !== undefined ||
      dto.evidenceReviewStatus !== undefined ||
      dto.investigationSummary !== undefined ||
      dto.resolutionNote !== undefined ||
      dto.subjectModerationStatus !== undefined;
    const nextEvidenceReviewStatus =
      dto.evidenceReviewStatus ?? report.evidenceReviewStatus;
    const nextEscalationReason =
      dto.escalationReason === undefined
        ? report.escalationReason
        : (dto.escalationReason?.trim() ?? null);
    const nextInvestigationSummary =
      dto.investigationSummary === undefined
        ? report.investigationSummary
        : (dto.investigationSummary?.trim() ?? null);

    if (dto.claimAction === 'release' && hasWorkflowMutation) {
      throw new BadRequestException(
        'Claim release must be performed without other report workflow updates',
      );
    }

    if (dto.claimAction) {
      this.applyReportClaim(report, dto.claimAction, userId, now);
    }

    if (hasWorkflowMutation) {
      this.assertReportClaimedByOperator(report, userId);
    }

    if (
      (dto.status === 'resolved' || dto.status === 'dismissed') &&
      !dto.resolutionNote?.trim()
    ) {
      throw new BadRequestException(
        'Resolution note is required when closing an abuse report',
      );
    }

    if (
      (dto.status === 'resolved' || dto.status === 'dismissed') &&
      nextEvidenceReviewStatus === 'pending'
    ) {
      throw new BadRequestException(
        'Evidence review status is required when closing an abuse report',
      );
    }

    if (
      (dto.status === 'resolved' || dto.status === 'dismissed') &&
      !nextInvestigationSummary
    ) {
      throw new BadRequestException(
        'Investigation summary is required when closing an abuse report',
      );
    }

    if (
      (dto.status === 'resolved' || dto.status === 'dismissed') &&
      nextEscalationReason
    ) {
      throw new BadRequestException(
        'Clear escalation before closing an abuse report',
      );
    }

    if (
      dto.status === 'resolved' &&
      nextEvidenceReviewStatus !== 'supports_report'
    ) {
      throw new BadRequestException(
        'Resolved abuse reports must use an evidence review that supports the report',
      );
    }

    if (
      dto.status === 'dismissed' &&
      nextEvidenceReviewStatus === 'supports_report'
    ) {
      throw new BadRequestException(
        'Dismissed abuse reports cannot use an evidence review that supports the report',
      );
    }

    if (
      dto.evidenceReviewStatus !== undefined ||
      dto.investigationSummary !== undefined
    ) {
      this.applyReportEvidenceReview(report, {
        evidenceReviewStatus: nextEvidenceReviewStatus,
        investigationSummary: nextInvestigationSummary,
        userId,
        reviewedAt: now,
      });
    }

    if (dto.escalationReason !== undefined) {
      this.applyReportEscalation(report, {
        escalationReason: nextEscalationReason,
        userId,
        escalatedAt: now,
      });
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

  private async requireProfileByUserId(
    userId: string,
    workspace?: WorkspaceSummary,
  ) {
    const profile = await this.marketplaceRepository.getProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Marketplace profile not found');
    }
    return this.ensureProfileWorkspace(profile, workspace);
  }

  private async requireOpportunity(opportunityId: string) {
    const opportunity =
      await this.marketplaceRepository.getOpportunityById(opportunityId);
    if (!opportunity) {
      throw new NotFoundException('Marketplace opportunity not found');
    }
    return this.ensureOpportunityWorkspace(opportunity);
  }

  private async requireApplication(applicationId: string) {
    const application =
      await this.marketplaceRepository.getApplicationById(applicationId);
    if (!application) {
      throw new NotFoundException('Marketplace application not found');
    }
    return this.ensureApplicationWorkspace(application);
  }

  private async requireOffer(offerId: string) {
    const offer = await this.marketplaceRepository.getOfferById(offerId);
    if (!offer) {
      throw new NotFoundException('Marketplace offer not found');
    }
    return offer;
  }

  private async requireContractDraft(draftId: string) {
    const draft = await this.marketplaceRepository.getContractDraftById(draftId);
    if (!draft) {
      throw new NotFoundException('Marketplace contract draft not found');
    }
    return draft;
  }

  private async requireAbuseReport(reportId: string) {
    const report =
      await this.marketplaceRepository.getAbuseReportById(reportId);
    if (!report) {
      throw new NotFoundException('Marketplace abuse report not found');
    }
    return report;
  }

  private async getApplicationAccess(
    userId: string,
    application: MarketplaceApplicationRecord,
    opportunity?: MarketplaceOpportunityRecord,
  ) {
    const hydratedApplication = await this.ensureApplicationWorkspace(application);
    const hydratedOpportunity =
      opportunity ?? (await this.requireOpportunity(hydratedApplication.opportunityId));
    const asApplicant =
      hydratedApplication.applicantWorkspaceId !== null &&
      (
        await this.organizationsService.findAccessibleWorkspace(
          userId,
          hydratedApplication.applicantWorkspaceId,
        )
      ) !== null;
    const asOwner = await this.canAccessOpportunityAsOwner(
      userId,
      hydratedOpportunity,
      'reviewApplications',
    );
    return {
      asApplicant,
      asOwner,
      application: hydratedApplication,
      opportunity: hydratedOpportunity,
    };
  }

  private async getContractDraftAccess(
    userId: string,
    draft: MarketplaceContractDraftRecord,
  ) {
    const application = await this.requireApplication(draft.applicationId);
    const opportunity = await this.requireOpportunity(draft.opportunityId);
    return this.getApplicationAccess(userId, application, opportunity);
  }

  private async assertApplicationApplicant(
    userId: string,
    application: MarketplaceApplicationRecord,
  ) {
    const access = await this.getApplicationAccess(userId, application);
    if (!access.asApplicant) {
      throw new ForbiddenException(
        'Only the applicant can manage this marketplace application',
      );
    }
  }

  private async assertApplicationTimelineAccess(
    userId: string,
    application: MarketplaceApplicationRecord,
  ) {
    const access = await this.getApplicationAccess(userId, application);
    if (!access.asApplicant && !access.asOwner) {
      throw new ForbiddenException(
        'You do not have access to this marketplace application timeline',
      );
    }
  }

  private async assertContractDraftAccess(
    userId: string,
    draft: MarketplaceContractDraftRecord,
  ) {
    const access = await this.getContractDraftAccess(userId, draft);
    if (!access.asApplicant && !access.asOwner) {
      throw new ForbiddenException(
        'You do not have access to this marketplace contract draft',
      );
    }
  }

  private toApplicationRevisionRecord(
    application: MarketplaceApplicationRecord,
    revisionNumber: number,
    revisionReason: string | null,
    createdAt: number,
  ): MarketplaceApplicationRevisionRecord {
    return {
      id: randomUUID(),
      applicationId: application.id,
      opportunityId: application.opportunityId,
      applicantUserId: application.applicantUserId,
      revisionNumber,
      coverNote: application.coverNote,
      proposedRate: application.proposedRate,
      screeningAnswers: normalizeScreeningAnswers(application.screeningAnswers),
      deliveryApproach: application.deliveryApproach,
      milestonePlanSummary: application.milestonePlanSummary,
      estimatedStartAt: application.estimatedStartAt,
      relevantProofArtifacts: normalizeProofArtifacts(
        application.relevantProofArtifacts,
      ),
      portfolioUrls: normalizeTextArray(application.portfolioUrls),
      revisionReason: revisionReason?.trim() || null,
      createdAt,
    };
  }

  private async getNextApplicationRevisionNumber(applicationId: string) {
    const revisions = (await this.marketplaceRepository.listApplicationRevisions())
      .filter((revision) => revision.applicationId === applicationId)
      .sort((left, right) => right.revisionNumber - left.revisionNumber);
    return (revisions[0]?.revisionNumber ?? 0) + 1;
  }

  private async getNextOfferRevisionNumber(applicationId: string) {
    const offers = (await this.marketplaceRepository.listOffers())
      .filter((offer) => offer.applicationId === applicationId)
      .sort((left, right) => right.revisionNumber - left.revisionNumber);
    return (offers[0]?.revisionNumber ?? 0) + 1;
  }

  private buildContractDraftRevision(
    draft: MarketplaceContractDraftRecord,
    snapshot: MarketplaceContractMetadataSnapshot,
    revisedByUserId: string,
    reason: string | null,
    createdAt: number,
  ): MarketplaceContractDraftRevisionRecord {
    return {
      revisionNumber: (draft.revisions.at(-1)?.revisionNumber ?? 0) + 1,
      snapshot,
      metadataHash: createMetadataHash(snapshot),
      revisedByUserId,
      reason: reason?.trim() || null,
      createdAt,
    };
  }

  private async createInitialContractDraft(
    application: MarketplaceApplicationRecord,
    opportunity: MarketplaceOpportunityRecord,
    offer: MarketplaceOfferRecord,
  ) {
    const applicant = await this.usersService.getRequiredById(
      application.applicantUserId,
    );
    const snapshot: MarketplaceContractMetadataSnapshot = {
      title: opportunity.title,
      description: opportunity.description,
      category: opportunity.category,
      contractorEmail: applicant.email.toLowerCase(),
      workerAddress: application.selectedWalletAddress,
      currencyAddress: opportunity.currencyAddress,
      scopeSummary: application.deliveryApproach,
      acceptanceCriteria: normalizeTextArray(opportunity.acceptanceCriteria),
      outcomes: normalizeTextArray(opportunity.outcomes),
      timeline: opportunity.timeline,
      milestones: normalizeOfferMilestones(offer.milestones),
      reviewWindowDays: 3,
      disputeModel: 'operator-mediation',
      evidenceExpectation: 'delivery note plus linked evidence URLs',
      kickoffNote: application.milestonePlanSummary,
      platformFeeBps: 250,
      platformFeeLabel:
        '2.5% client platform fee realized only on released milestone value.',
      offerId: offer.id,
      offerRevisionNumber: offer.revisionNumber,
      opportunityId: opportunity.id,
      applicationId: application.id,
    };
    const now = Date.now();
    const seedDraft: MarketplaceContractDraftRecord = {
      id: randomUUID(),
      applicationId: application.id,
      opportunityId: opportunity.id,
      offerId: offer.id,
      clientUserId: opportunity.ownerUserId,
      applicantUserId: application.applicantUserId,
      status: 'draft',
      latestSnapshot: snapshot,
      metadataHash: createMetadataHash(snapshot),
      revisions: [],
      clientApprovedAt: null,
      applicantApprovedAt: null,
      finalizedAt: null,
      convertedJobId: null,
      createdAt: now,
      updatedAt: now,
    };
    seedDraft.revisions = [
      this.buildContractDraftRevision(
        seedDraft,
        snapshot,
        opportunity.ownerUserId,
        'Created from accepted offer',
        now,
      ),
    ];
    seedDraft.metadataHash = seedDraft.revisions[0].metadataHash;
    await this.marketplaceRepository.saveContractDraft(seedDraft);
    return seedDraft;
  }

  private async ensureContractDraftFromAcceptedOffer(
    application: MarketplaceApplicationRecord,
    offer: MarketplaceOfferRecord,
  ) {
    const existing =
      await this.marketplaceRepository.getContractDraftByApplicationId(
        application.id,
      );
    if (existing) {
      return existing;
    }
    const opportunity = await this.requireOpportunity(application.opportunityId);
    return this.createInitialContractDraft(application, opportunity, offer);
  }

  private async recordApplicationDecision(
    application: MarketplaceApplicationRecord,
    input: {
      actorUserId: string;
      action: MarketplaceApplicationDecisionRecord['action'];
      reason?: string | null;
      noHireReason?: MarketplaceNoHireReason | null;
      createdAt?: number;
    },
  ) {
    const decision: MarketplaceApplicationDecisionRecord = {
      id: randomUUID(),
      applicationId: application.id,
      opportunityId: application.opportunityId,
      actorUserId: input.actorUserId,
      action: input.action,
      reason: input.reason?.trim() || null,
      noHireReason: input.noHireReason ?? null,
      createdAt: input.createdAt ?? Date.now(),
    };
    await this.marketplaceRepository.saveApplicationDecision(decision);
    return decision;
  }

  private async getOrCreateInterviewThread(
    application: MarketplaceApplicationRecord,
    opportunity: MarketplaceOpportunityRecord,
  ) {
    const existing = (await this.marketplaceRepository.listInterviewThreads())
      .filter((thread) => thread.applicationId === application.id)
      .sort((left, right) => right.updatedAt - left.updatedAt)[0];
    if (existing) {
      return existing;
    }
    const now = Date.now();
    const thread: MarketplaceInterviewThreadRecord = {
      id: randomUUID(),
      applicationId: application.id,
      opportunityId: opportunity.id,
      clientUserId: opportunity.ownerUserId,
      applicantUserId: application.applicantUserId,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    await this.marketplaceRepository.saveInterviewThread(thread);
    return thread;
  }

  private async toInterviewThreadView(
    thread: MarketplaceInterviewThreadRecord,
  ): Promise<MarketplaceInterviewThreadView> {
    const messages = (await this.marketplaceRepository.listInterviewMessages())
      .filter((message) => message.threadId === thread.id)
      .sort((left, right) => left.createdAt - right.createdAt);
    const messageViews = await Promise.all(
      messages.map(async (message) => {
        const sender = await this.usersService.getRequiredById(message.senderUserId);
        return {
          ...message,
          senderEmail: sender.email,
        } satisfies MarketplaceInterviewMessageView;
      }),
    );
    return {
      ...thread,
      messages: messageViews,
    };
  }

  private async buildApplicationTimeline(
    application: MarketplaceApplicationRecord,
    viewerUserId?: string,
  ): Promise<MarketplaceApplicationTimelineView> {
    const revisions = (await this.marketplaceRepository.listApplicationRevisions())
      .filter((revision) => revision.applicationId === application.id)
      .sort((left, right) => left.revisionNumber - right.revisionNumber);
    const thread = (await this.marketplaceRepository.listInterviewThreads())
      .filter((entry) => entry.applicationId === application.id)
      .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null;
    const offers = (await this.marketplaceRepository.listOffers())
      .filter((offer) => offer.applicationId === application.id)
      .sort(
        (left, right) =>
          left.revisionNumber - right.revisionNumber ||
          left.createdAt - right.createdAt,
      );
    const decisions = (await this.marketplaceRepository.listApplicationDecisions())
      .filter((decision) => decision.applicationId === application.id)
      .sort((left, right) => left.createdAt - right.createdAt);
    const contractDraft =
      await this.marketplaceRepository.getContractDraftByApplicationId(
        application.id,
      );
    return {
      application: await this.toApplicationView(application, viewerUserId),
      revisions,
      interviewThread: thread ? await this.toInterviewThreadView(thread) : null,
      offers,
      decisions,
      contractDraft,
    };
  }

  private async convertDraftToEscrow(
    userId: string,
    draft: MarketplaceContractDraftRecord,
    application: MarketplaceApplicationRecord,
    opportunity: MarketplaceOpportunityRecord,
  ): Promise<HireApplicationResponse> {
    const snapshot = draft.latestSnapshot;
    const createResponse = await this.escrowService.createJob(userId, {
      contractorEmail: snapshot.contractorEmail,
      workerAddress: snapshot.workerAddress,
      currencyAddress: snapshot.currencyAddress,
      title: snapshot.title,
      description: snapshot.description,
      category: snapshot.category,
      termsJSON: {
        marketplace: {
          opportunityId: opportunity.id,
          applicationId: application.id,
          offerId: draft.offerId,
          contractDraftId: draft.id,
          metadataHash: draft.metadataHash,
          sourceSnapshot: snapshot,
          visibility: opportunity.visibility,
        },
        hiringSpec: {
          outcomes: snapshot.outcomes,
          acceptanceCriteria: snapshot.acceptanceCriteria,
          timeline: snapshot.timeline,
        },
        commercialPlan: {
          reviewWindowDays: snapshot.reviewWindowDays,
          disputeModel: snapshot.disputeModel,
          evidenceExpectation: snapshot.evidenceExpectation,
          kickoffNote: snapshot.kickoffNote,
          platformFeeBps: snapshot.platformFeeBps,
          platformFeeLabel: snapshot.platformFeeLabel,
          milestones: snapshot.milestones,
        },
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
    draft.status = 'converted';
    draft.convertedJobId = createResponse.jobId;
    draft.updatedAt = now;

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
        await this.recordApplicationDecision(sibling, {
          actorUserId: userId,
          action: 'no_hire',
          reason: 'Another candidate moved into escrow contract formation',
          noHireReason: 'fit_not_strong_enough',
          createdAt: now,
        });
      }
    }

    await this.marketplaceRepository.saveApplication(application);
    await this.marketplaceRepository.saveOpportunity(opportunity);
    await this.marketplaceRepository.saveContractDraft(draft);
    await this.trackMarketplaceEvent({
      actorUserId: userId,
      actorWorkspaceId: opportunity.ownerWorkspaceId ?? null,
      surface: 'workspace',
      entityType: 'application',
      eventType: 'contract_converted',
      entityId: application.id,
      searchKind: null,
      queryLabel: null,
      category: opportunity.category,
      timezone: null,
      skillTags: normalizeSkillTags(opportunity.requiredSkills),
      resultCount: 1,
      relatedOpportunityId: opportunity.id,
      relatedProfileUserId: application.applicantUserId,
      relatedApplicationId: application.id,
      relatedJobId: createResponse.jobId,
    });
    await this.recordApplicationDecision(application, {
      actorUserId: userId,
      action: 'hired',
      reason: 'Escrow contract created from finalized marketplace draft',
      createdAt: now,
    });
    await this.trackMarketplaceEvent({
      actorUserId: userId,
      actorWorkspaceId: opportunity.ownerWorkspaceId ?? null,
      surface: 'workspace',
      entityType: 'application',
      eventType: 'hire_recorded',
      entityId: application.id,
      searchKind: null,
      queryLabel: null,
      category: opportunity.category,
      timezone: null,
      skillTags: normalizeSkillTags(opportunity.requiredSkills),
      resultCount: 1,
      relatedOpportunityId: opportunity.id,
      relatedProfileUserId: application.applicantUserId,
      relatedApplicationId: application.id,
      relatedJobId: createResponse.jobId,
    });

    return {
      applicationId: application.id,
      opportunityId: opportunity.id,
      jobId: createResponse.jobId,
    };
  }

  private async trackMarketplaceEvent(
    input: Omit<MarketplaceInteractionEventRecord, 'id' | 'createdAt'> & {
      createdAt?: number;
    },
  ) {
    const event: MarketplaceInteractionEventRecord = {
      id: randomUUID(),
      actorUserId: input.actorUserId,
      actorWorkspaceId: input.actorWorkspaceId,
      surface: input.surface,
      entityType: input.entityType,
      eventType: input.eventType,
      entityId: normalizeMaybeText(input.entityId),
      searchKind: input.searchKind ?? null,
      queryLabel: normalizeMaybeText(input.queryLabel),
      category: normalizeMaybeText(input.category)?.toLowerCase() ?? null,
      timezone: normalizeMaybeText(input.timezone),
      skillTags: normalizeSkillTags(input.skillTags),
      resultCount: Math.max(1, Math.trunc(input.resultCount || 1)),
      relatedOpportunityId: normalizeMaybeText(input.relatedOpportunityId),
      relatedProfileUserId: normalizeMaybeText(input.relatedProfileUserId),
      relatedApplicationId: normalizeMaybeText(input.relatedApplicationId),
      relatedJobId: normalizeMaybeText(input.relatedJobId),
      createdAt: input.createdAt ?? Date.now(),
    };
    await this.marketplaceRepository.saveInteractionEvent(event);
  }

  private async refreshSearchReadModels() {
    const [profiles, opportunities] = await Promise.all([
      this.marketplaceRepository.listProfiles(),
      this.marketplaceRepository.listOpportunities(),
    ]);

    await Promise.all(
      profiles.map(async (profile) => {
        await this.marketplaceRepository.saveTalentSearchDocument(
          await this.buildTalentSearchDocument(profile),
        );
      }),
    );

    await Promise.all(
      opportunities.map(async (opportunity) => {
        await this.marketplaceRepository.saveOpportunitySearchDocument(
          await this.buildOpportunitySearchDocument(opportunity),
        );
      }),
    );
  }

  private async buildTalentSearchDocument(
    profile: MarketplaceProfileRecord,
  ): Promise<MarketplaceTalentSearchDocument> {
    const hydratedProfile = await this.ensureProfileWorkspace(profile);
    const user = await this.usersService.getRequiredById(hydratedProfile.userId);
    const escrowStats = await this.getEscrowStats(user, 'worker');
    const reputation = await this.buildReputationSnapshot(user, 'worker');
    const verifiedWalletAddress = this.getVerifiedWalletAddress(user);
    const verificationLevel = verifiedWalletAddress
      ? this.computeVerificationLevel(verifiedWalletAddress, escrowStats)
      : 'unverified';
    const completeness = this.isProfileComplete(hydratedProfile) ? 100 : 55;
    const fitDensity = Math.min(
      100,
      (hydratedProfile.skills.length + hydratedProfile.specialties.length) * 10,
    );
    const recencyDays = daysSince(hydratedProfile.updatedAt, Date.now());
    const reviewBoost =
      reputation.averageRating === null ? 0 : reputation.averageRating * 6;
    const hireBoost = Math.min(
      22,
      Math.round((reputation.publicReviewCount + escrowStats.completionCount) / 2),
    );
    const score = Math.max(
      5,
      Math.round(
        completeness * 0.22 +
          fitDensity * 0.14 +
          escrowStats.completionRate * 0.2 +
          Math.max(0, 100 - escrowStats.disputeRate) * 0.12 +
          (reputation.inviteAcceptanceRate ?? 55) * 0.08 +
          (reputation.responseRate ?? 60) * 0.08 +
          Math.max(0, 100 - recencyDays * 4) * 0.08 +
          reviewBoost +
          hireBoost,
      ),
    );

    const reasons: MarketplaceSearchReason[] = [
      {
        code: 'strong_skill_match',
        label: 'Skill density is high and profile coverage is broad.',
      },
    ];
    if (verifiedWalletAddress) {
      reasons.push({
        code: 'verified_wallet',
        label: 'Wallet verification is present.',
      });
    }
    if (hydratedProfile.cryptoReadiness !== 'wallet_only') {
      reasons.push({
        code: 'smart_account_ready',
        label: 'Execution setup is beyond wallet-only posture.',
      });
    }
    if (escrowStats.completionCount > 0) {
      reasons.push({
        code: 'escrow_backed_delivery_history',
        label: 'Escrow completion history improves confidence.',
      });
    }
    if ((reputation.responseRate ?? 0) >= 60) {
      reasons.push({
        code: 'response_ready_profile',
        label: 'Response posture is healthy.',
      });
    }

    return {
      profileUserId: hydratedProfile.userId,
      profileSlug: hydratedProfile.slug,
      workspaceId: hydratedProfile.workspaceId,
      organizationId: hydratedProfile.organizationId,
      displayName: hydratedProfile.displayName,
      headline: hydratedProfile.headline,
      searchableText: [
        hydratedProfile.displayName,
        hydratedProfile.headline,
        hydratedProfile.bio,
        ...hydratedProfile.skills,
        ...hydratedProfile.specialties,
      ]
        .join(' ')
        .trim(),
      skills: hydratedProfile.skills,
      specialties: hydratedProfile.specialties,
      timezone: hydratedProfile.timezone,
      availability: hydratedProfile.availability,
      preferredEngagements: hydratedProfile.preferredEngagements,
      cryptoReadiness: hydratedProfile.cryptoReadiness,
      verificationLevel,
      ranking: {
        score,
        profileCompleteness: completeness,
        skillMatchPercent: fitDensity,
        completionRate: escrowStats.completionRate,
        disputeRate: escrowStats.disputeRate,
        inviteAcceptanceRate: reputation.inviteAcceptanceRate ?? 0,
        responseRate: reputation.responseRate ?? 0,
        recencyDays,
        timezoneOverlapHours: null,
        budgetClarity: 0,
        fitDensity,
        fundedVolumeBand: pickFundedVolumeBand(
          escrowStats.totalContracts,
          escrowStats.averageContractValueBand,
        ),
        verificationLevel,
      },
      reasons: reasons.slice(0, 4),
      updatedAt: hydratedProfile.updatedAt,
    };
  }

  private async buildOpportunitySearchDocument(
    opportunity: MarketplaceOpportunityRecord,
  ): Promise<MarketplaceOpportunitySearchDocument> {
    const hydratedOpportunity = await this.ensureOpportunityWorkspace(opportunity);
    const owner = await this.usersService.getRequiredById(
      hydratedOpportunity.ownerUserId,
    );
    const ownerReputation = await this.buildReputationSnapshot(owner, 'client');
    const completeness = [
      hydratedOpportunity.title,
      hydratedOpportunity.summary,
      hydratedOpportunity.description,
      hydratedOpportunity.timeline,
    ].every((value) => value.trim().length > 0)
      ? 100
      : 60;
    const budgetClarity =
      hydratedOpportunity.budgetMin && hydratedOpportunity.budgetMax
        ? 100
        : hydratedOpportunity.budgetMin || hydratedOpportunity.budgetMax
          ? 70
          : 25;
    const fitDensity = Math.min(
      100,
      hydratedOpportunity.requiredSkills.length * 12 +
        hydratedOpportunity.mustHaveSkills.length * 10 +
        hydratedOpportunity.screeningQuestions.length * 4 +
        hydratedOpportunity.outcomes.length * 3,
    );
    const recencyDays = daysSince(
      hydratedOpportunity.publishedAt ?? hydratedOpportunity.updatedAt,
      Date.now(),
    );
    const score = Math.max(
      5,
      Math.round(
        completeness * 0.22 +
          budgetClarity * 0.16 +
          fitDensity * 0.18 +
          (ownerReputation.responseRate ?? 55) * 0.1 +
          (ownerReputation.inviteAcceptanceRate ?? 55) * 0.08 +
          Math.max(0, 100 - recencyDays * 4) * 0.1 +
          (ownerReputation.averageRating ?? 3.8) * 8,
      ),
    );

    const reasons: MarketplaceSearchReason[] = [];
    if (completeness >= 90) {
      reasons.push({
        code: 'complete_brief',
        label: 'The brief is structurally complete.',
      });
    }
    if (budgetClarity >= 70) {
      reasons.push({
        code: 'budget_clear',
        label: 'Budget guidance is clear enough to qualify demand.',
      });
    }
    if (recencyDays <= 7) {
      reasons.push({
        code: 'recent_brief',
        label: 'The brief is recent and likely still active.',
      });
    }
    if (hydratedOpportunity.mustHaveSkills.length > 0) {
      reasons.push({
        code: 'must_have_coverage',
        label: 'The brief names must-have requirements clearly.',
      });
    }
    reasons.push({
      code: 'category_match',
      label: 'The category is explicit enough for directory discovery.',
    });

    return {
      opportunityId: hydratedOpportunity.id,
      ownerUserId: hydratedOpportunity.ownerUserId,
      ownerWorkspaceId: hydratedOpportunity.ownerWorkspaceId,
      ownerOrganizationId: hydratedOpportunity.ownerOrganizationId,
      title: hydratedOpportunity.title,
      summary: hydratedOpportunity.summary,
      category: hydratedOpportunity.category,
      searchableText: [
        hydratedOpportunity.title,
        hydratedOpportunity.summary,
        hydratedOpportunity.description,
        hydratedOpportunity.category,
        ...hydratedOpportunity.requiredSkills,
        ...hydratedOpportunity.mustHaveSkills,
        ...hydratedOpportunity.outcomes,
      ]
        .join(' ')
        .trim(),
      requiredSkills: hydratedOpportunity.requiredSkills,
      mustHaveSkills: hydratedOpportunity.mustHaveSkills,
      engagementType: hydratedOpportunity.engagementType,
      cryptoReadinessRequired: hydratedOpportunity.cryptoReadinessRequired,
      timezoneOverlapHours: hydratedOpportunity.timezoneOverlapHours,
      budgetMin: hydratedOpportunity.budgetMin,
      budgetMax: hydratedOpportunity.budgetMax,
      visibility: hydratedOpportunity.visibility,
      status: hydratedOpportunity.status,
      ranking: {
        score,
        profileCompleteness: completeness,
        skillMatchPercent: fitDensity,
        completionRate: ownerReputation.completionRate,
        disputeRate: ownerReputation.disputeRate,
        inviteAcceptanceRate: ownerReputation.inviteAcceptanceRate ?? 0,
        responseRate: ownerReputation.responseRate ?? 0,
        recencyDays,
        timezoneOverlapHours: hydratedOpportunity.timezoneOverlapHours,
        budgetClarity,
        fitDensity,
        fundedVolumeBand: pickFundedVolumeBand(
          ownerReputation.totalContracts,
          ownerReputation.averageContractValueBand,
        ),
        verificationLevel:
          ownerReputation.identityConfidence === 'wallet_verified'
            ? 'wallet_verified'
            : ownerReputation.identityConfidence === 'smart_account_ready'
              ? 'wallet_and_escrow_history'
              : 'wallet_escrow_and_delivery',
      },
      reasons: reasons.slice(0, 4),
      publishedAt: hydratedOpportunity.publishedAt,
      updatedAt: hydratedOpportunity.updatedAt,
    };
  }

  private buildFunnelStages(input: {
    searchImpressions: number;
    resultClicks: number;
    savedSearches: number;
    applications: number;
    shortlists: number;
    interviews: number;
    offers: number;
    hires: number;
    fundedJobs: number;
    releasedMilestones: number;
    disputedMilestones: number;
  }): MarketplaceAnalyticsFunnelStage[] {
    const entries: Array<[MarketplaceAnalyticsFunnelStage['key'], number]> = [
      ['search_impressions', input.searchImpressions],
      ['result_clicks', input.resultClicks],
      ['saved_searches', input.savedSearches],
      ['applications', input.applications],
      ['shortlists', input.shortlists],
      ['interviews', input.interviews],
      ['offers', input.offers],
      ['hires', input.hires],
      ['funded_jobs', input.fundedJobs],
      ['released_milestones', input.releasedMilestones],
      ['disputed_milestones', input.disputedMilestones],
    ];
    return entries.map(([key, count]) => ({
      key,
      label: eventStageLabel(key),
      count,
    }));
  }

  private buildNoHireReasonStats(
    decisions: MarketplaceApplicationDecisionRecord[],
  ): MarketplaceNoHireReasonStat[] {
    const counts = new Map<MarketplaceNoHireReason, number>();
    for (const decision of decisions) {
      if (decision.noHireReason) {
        counts.set(
          decision.noHireReason,
          (counts.get(decision.noHireReason) ?? 0) + 1,
        );
      }
    }
    return Array.from(counts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((left, right) => right.count - left.count);
  }

  private buildTopSearchStats(
    events: MarketplaceInteractionEventRecord[],
  ): MarketplaceTopSearchStat[] {
    const grouped = new Map<string, MarketplaceTopSearchStat>();
    for (const event of events) {
      if (!event.searchKind || !event.queryLabel) {
        continue;
      }
      const key = `${event.searchKind}:${event.queryLabel}`;
      const current =
        grouped.get(key) ??
        {
          searchKind: event.searchKind,
          queryLabel: event.queryLabel,
          impressions: 0,
          resultClicks: 0,
          saveCount: 0,
        };
      if (event.eventType === 'search_impression') {
        current.impressions += event.resultCount;
      }
      if (event.eventType === 'result_click') {
        current.resultClicks += event.resultCount;
      }
      if (event.eventType === 'saved_search_created') {
        current.saveCount += event.resultCount;
      }
      grouped.set(key, current);
    }
    return Array.from(grouped.values())
      .sort(
        (left, right) =>
          right.impressions - left.impressions ||
          right.resultClicks - left.resultClicks,
      )
      .slice(0, 8);
  }

  private async buildLiquidityByCategory(
    profiles: MarketplaceProfileRecord[],
    opportunities: MarketplaceOpportunityRecord[],
  ): Promise<MarketplaceLiquiditySlice[]> {
    const demand = new Map<string, number>();
    const supply = new Map<string, number>();
    for (const opportunity of opportunities) {
      if (
        opportunity.status === 'published' &&
        opportunity.visibility === 'public' &&
        opportunity.moderationStatus === 'visible'
      ) {
        demand.set(
          opportunity.category,
          (demand.get(opportunity.category) ?? 0) + 1,
        );
      }
    }
    for (const profile of profiles) {
      if (
        profile.moderationStatus !== 'visible' ||
        !this.isProfileComplete(profile)
      ) {
        continue;
      }
      const labels = new Set(
        [...profile.skills, ...profile.specialties]
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean),
      );
      for (const category of labels) {
        supply.set(category, (supply.get(category) ?? 0) + 1);
      }
    }

    return Array.from(new Set([...demand.keys(), ...supply.keys()]))
      .map((label) => {
        const demandCount = demand.get(label) ?? 0;
        const supplyCount = supply.get(label) ?? 0;
        const gap = demandCount - supplyCount;
        return {
          label,
          demandCount,
          supplyCount,
          gap,
          posture:
            Math.abs(gap) <= 1
              ? 'balanced'
              : gap > 0
                ? 'demand_heavy'
                : 'supply_heavy',
        } satisfies MarketplaceLiquiditySlice;
      })
      .sort((left, right) => Math.abs(right.gap) - Math.abs(left.gap))
      .slice(0, 8);
  }

  private async buildLiquidityByTimezone(
    profiles: MarketplaceProfileRecord[],
    opportunities: MarketplaceOpportunityRecord[],
  ): Promise<MarketplaceLiquiditySlice[]> {
    const supply = new Map<string, number>();
    const demand = new Map<string, number>();
    const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
    for (const profile of profiles) {
      if (
        profile.moderationStatus === 'visible' &&
        this.isProfileComplete(profile) &&
        profile.timezone.trim().length > 0
      ) {
        supply.set(profile.timezone, (supply.get(profile.timezone) ?? 0) + 1);
      }
    }
    for (const opportunity of opportunities) {
      if (
        opportunity.status !== 'published' ||
        opportunity.visibility !== 'public' ||
        opportunity.moderationStatus !== 'visible'
      ) {
        continue;
      }
      const ownerTimezone =
        profileByUserId.get(opportunity.ownerUserId)?.timezone ?? 'unattributed';
      demand.set(ownerTimezone, (demand.get(ownerTimezone) ?? 0) + 1);
    }
    return Array.from(new Set([...demand.keys(), ...supply.keys()]))
      .map((label) => {
        const demandCount = demand.get(label) ?? 0;
        const supplyCount = supply.get(label) ?? 0;
        const gap = demandCount - supplyCount;
        return {
          label,
          demandCount,
          supplyCount,
          gap,
          posture:
            Math.abs(gap) <= 1
              ? 'balanced'
              : gap > 0
                ? 'demand_heavy'
                : 'supply_heavy',
        } satisfies MarketplaceLiquiditySlice;
      })
      .sort((left, right) => Math.abs(right.gap) - Math.abs(left.gap))
      .slice(0, 8);
  }

  private buildStalledOpportunityViews(
    opportunities: MarketplaceOpportunityRecord[],
    applications: MarketplaceApplicationRecord[],
    decisions: MarketplaceApplicationDecisionRecord[],
  ): MarketplaceStalledItem[] {
    const now = Date.now();
    return opportunities
      .filter(
        (opportunity) =>
          opportunity.status === 'published' &&
          opportunity.visibility === 'public' &&
          opportunity.moderationStatus === 'visible' &&
          opportunity.hiredJobId === null &&
          now - (opportunity.publishedAt ?? opportunity.updatedAt) >=
            7 * 24 * hourMs,
      )
      .map((opportunity) => {
        const opportunityApplications = applications.filter(
          (application) => application.opportunityId === opportunity.id,
        );
        const opportunityDecisions = decisions.filter(
          (decision) => decision.opportunityId === opportunity.id,
        );
        const lastDecisionAt =
          opportunityDecisions.sort(
            (left, right) => right.createdAt - left.createdAt,
          )[0]?.createdAt ?? null;
        return {
          opportunityId: opportunity.id,
          title: opportunity.title,
          category: opportunity.category,
          publishedAt: opportunity.publishedAt,
          daysOpen: Math.floor(
            (now - (opportunity.publishedAt ?? opportunity.updatedAt)) /
              (24 * hourMs),
          ),
          applicationCount: opportunityApplications.length,
          shortlistCount: countDecisionActions(opportunityDecisions, 'shortlisted'),
          offerCount:
            countDecisionActions(opportunityDecisions, 'offer_sent') +
            countDecisionActions(opportunityDecisions, 'offer_countered'),
          lastDecisionAt,
        } satisfies MarketplaceStalledItem;
      })
      .sort(
        (left, right) =>
          right.daysOpen - left.daysOpen ||
          left.applicationCount - right.applicationCount,
      )
      .slice(0, 8);
  }

  private async buildAnalyticsOverview(
    userId: string,
    workspace: Awaited<
      ReturnType<OrganizationsService['buildWorkspaceContext']>
    >['activeWorkspace'],
  ): Promise<MarketplaceAnalyticsOverview> {
    const user = await this.usersService.getRequiredById(userId);
    const [
      profiles,
      opportunities,
      applications,
      decisions,
      offers,
      savedSearches,
      events,
      talentPools,
      talentPoolMembers,
      automationRules,
      automationRuns,
    ] = await Promise.all([
      this.marketplaceRepository.listProfiles(),
      this.marketplaceRepository.listOpportunities(),
      this.marketplaceRepository.listApplications(),
      this.marketplaceRepository.listApplicationDecisions(),
      this.marketplaceRepository.listOffers(),
      this.marketplaceRepository.listSavedSearches(),
      this.marketplaceRepository.listInteractionEvents(),
      this.marketplaceRepository.listTalentPools(),
      this.marketplaceRepository.listTalentPoolMembers(),
      this.marketplaceRepository.listAutomationRules(),
      this.marketplaceRepository.listAutomationRuns(),
    ]);

    const scopedOpportunities =
      workspace?.kind === 'client'
        ? opportunities.filter(
            (opportunity) => opportunity.ownerWorkspaceId === workspace.workspaceId,
          )
        : opportunities.filter((opportunity) =>
            applications.some(
              (application) =>
                application.applicantWorkspaceId === workspace?.workspaceId &&
                application.opportunityId === opportunity.id,
            ),
          );
    const scopedApplications =
      workspace?.kind === 'client'
        ? applications.filter((application) =>
            scopedOpportunities.some(
              (opportunity) => opportunity.id === application.opportunityId,
            ),
          )
        : applications.filter(
            (application) => application.applicantWorkspaceId === workspace?.workspaceId,
          );
    const scopedApplicationIds = new Set(scopedApplications.map((item) => item.id));
    const scopedOpportunityIds = new Set(scopedOpportunities.map((item) => item.id));
    const scopedDecisions = decisions.filter(
      (decision) =>
        scopedApplicationIds.has(decision.applicationId) ||
        scopedOpportunityIds.has(decision.opportunityId),
    );
    const scopedOffers = offers.filter((offer) =>
      scopedApplicationIds.has(offer.applicationId),
    );
    const scopedSearches = savedSearches.filter(
      (search) =>
        search.userId === userId &&
        (workspace ? search.workspaceId === workspace.workspaceId : true),
    );
    const scopedEvents = events.filter(
      (event) =>
        event.actorUserId === userId ||
        (workspace && event.actorWorkspaceId === workspace.workspaceId) ||
        (event.relatedOpportunityId
          ? scopedOpportunityIds.has(event.relatedOpportunityId)
          : false) ||
        (event.relatedApplicationId
          ? scopedApplicationIds.has(event.relatedApplicationId)
          : false),
    );
    const roleJobs = await this.getRoleJobs(
      user,
      workspace?.kind === 'client' ? 'client' : 'worker',
    );
    const lifecycleDigest =
      workspace?.kind === 'client'
        ? await this.buildLifecycleDigestForWorkspace(workspace)
        : null;
    const searchImpressions = scopedEvents
      .filter((event) => event.eventType === 'search_impression')
      .reduce((sum, event) => sum + event.resultCount, 0);
    const resultClicks = scopedEvents
      .filter((event) => event.eventType === 'result_click')
      .reduce((sum, event) => sum + event.resultCount, 0);
    const interviews = new Set(
      scopedEvents
        .filter(
          (event) =>
            event.eventType === 'interview_started' ||
            event.eventType === 'interview_message_posted',
        )
        .map((event) => event.relatedApplicationId ?? event.entityId)
        .filter(Boolean),
    ).size;
    const summary = {
      searchImpressions,
      resultClicks,
      savedSearches: scopedSearches.length,
      applications: countDecisionActions(scopedDecisions, 'applied'),
      shortlists: countDecisionActions(scopedDecisions, 'shortlisted'),
      interviews,
      offers: scopedOffers.length,
      hires: countDecisionActions(scopedDecisions, 'hired'),
      activeContracts: roleJobs.filter(
        (job) => job.status !== 'completed' && job.status !== 'resolved',
      ).length,
    };

    return {
      generatedAt: new Date().toISOString(),
      workspace: workspace
        ? {
            workspaceId: workspace.workspaceId,
            kind: workspace.kind,
            organizationId: workspace.organizationId,
            organizationKind: workspace.organizationKind,
          }
        : null,
      summary,
      funnel: this.buildFunnelStages({
        ...summary,
        fundedJobs: roleJobs.filter((job) => job.fundedAmount !== null).length,
        releasedMilestones: roleJobs.reduce(
          (sum, job) =>
            sum +
            job.milestones.filter((milestone) => milestone.status === 'released')
              .length,
          0,
        ),
        disputedMilestones: roleJobs.reduce(
          (sum, job) =>
            sum +
            job.milestones.filter(
              (milestone) =>
                milestone.status === 'disputed' || milestone.disputedAt !== undefined,
            ).length,
          0,
        ),
      }),
      liquidity: await this.buildLiquidityByCategory(profiles, opportunities),
      noHireReasons: this.buildNoHireReasonStats(scopedDecisions),
      topSearches: this.buildTopSearchStats(scopedEvents),
      stalledItems:
        workspace?.kind === 'client'
          ? this.buildStalledOpportunityViews(
              scopedOpportunities,
              applications,
              decisions,
            )
          : this.buildStalledOpportunityViews(opportunities, scopedApplications, scopedDecisions),
      retention: {
        talentPools:
          workspace?.kind === 'client'
            ? talentPools.filter((pool) => pool.workspaceId === workspace.workspaceId)
                .length
            : 0,
        trackedTalent:
          workspace?.kind === 'client'
            ? talentPoolMembers.filter((member) =>
                talentPools.some(
                  (pool) =>
                    pool.workspaceId === workspace.workspaceId &&
                    pool.id === member.poolId,
                ),
              ).length
            : 0,
        automationRules:
          workspace?.kind === 'client'
            ? automationRules.filter(
                (rule) => rule.workspaceId === workspace.workspaceId,
              ).length
            : 0,
        automationRuns:
          workspace?.kind === 'client'
            ? automationRuns.filter(
                (run) => run.workspaceId === workspace.workspaceId,
              ).length
            : 0,
        automatedTaskDeliveries:
          workspace?.kind === 'client'
            ? automationRuns
                .filter((run) => run.workspaceId === workspace.workspaceId)
                .reduce((sum, run) => sum + run.items.length, 0)
            : 0,
        pendingLifecycleTasks: lifecycleDigest?.tasks.length ?? 0,
        rehireCandidates: lifecycleDigest?.rehireCandidates.length ?? 0,
      },
    };
  }

  private async buildMarketplaceIntelligenceReport(): Promise<MarketplaceIntelligenceReport> {
    const [
      profiles,
      opportunities,
      applications,
      decisions,
      offers,
      reviews,
      events,
      talentDocuments,
      opportunityDocuments,
      savedSearches,
      talentPools,
      talentPoolMembers,
      automationRules,
      automationRuns,
    ] = await Promise.all([
      this.marketplaceRepository.listProfiles(),
      this.marketplaceRepository.listOpportunities(),
      this.marketplaceRepository.listApplications(),
      this.marketplaceRepository.listApplicationDecisions(),
      this.marketplaceRepository.listOffers(),
      this.marketplaceRepository.listReviews(),
      this.marketplaceRepository.listInteractionEvents(),
      this.marketplaceRepository.listTalentSearchDocuments(),
      this.marketplaceRepository.listOpportunitySearchDocuments(),
      this.marketplaceRepository.listSavedSearches(),
      this.marketplaceRepository.listTalentPools(),
      this.marketplaceRepository.listTalentPoolMembers(),
      this.marketplaceRepository.listAutomationRules(),
      this.marketplaceRepository.listAutomationRuns(),
    ]);

    const jobs = await this.escrowRepository.listAll();
    const hiredJobs = jobs.filter((job) =>
      opportunities.some((opportunity) => opportunity.hiredJobId === job.id),
    );
    const rehireCandidates = await this.buildRehireCandidates(hiredJobs, reviews);
    const pendingLifecycleTasks =
      savedSearches.filter(
        (search) =>
          search.kind === 'talent' && Date.now() - search.updatedAt >= 7 * 24 * hourMs,
      ).length +
      (await this.marketplaceRepository.listOpportunityInvites()).filter(
        (invite) =>
          invite.status === 'pending' &&
          Date.now() - invite.updatedAt >= 3 * 24 * hourMs,
      ).length +
      talentPoolMembers.filter(
        (member) =>
          ['saved', 'contacted'].includes(member.stage) &&
          Date.now() - member.updatedAt >= 5 * 24 * hourMs,
      ).length +
      rehireCandidates.length;
    const retentionWorkspaceIds = new Set(
      talentPools.map((pool) => pool.workspaceId).concat(
        automationRules.map((rule) => rule.workspaceId),
      ),
    );
    const funnel = this.buildFunnelStages({
      searchImpressions: events
        .filter((event) => event.eventType === 'search_impression')
        .reduce((sum, event) => sum + event.resultCount, 0),
      resultClicks: events
        .filter((event) => event.eventType === 'result_click')
        .reduce((sum, event) => sum + event.resultCount, 0),
      savedSearches: events.filter(
        (event) => event.eventType === 'saved_search_created',
      ).length,
      applications: countDecisionActions(decisions, 'applied'),
      shortlists: countDecisionActions(decisions, 'shortlisted'),
      interviews: new Set(
        events
          .filter(
            (event) =>
              event.eventType === 'interview_started' ||
              event.eventType === 'interview_message_posted',
          )
          .map((event) => event.relatedApplicationId ?? event.entityId)
          .filter(Boolean),
      ).size,
      offers: offers.length,
      hires: countDecisionActions(decisions, 'hired'),
      fundedJobs: jobs.filter((job) => job.fundedAmount !== null).length,
      releasedMilestones: jobs.reduce(
        (sum, job) =>
          sum +
          job.milestones.filter((milestone) => milestone.status === 'released')
            .length,
        0,
      ),
      disputedMilestones: jobs.reduce(
        (sum, job) =>
          sum +
          job.milestones.filter(
            (milestone) =>
              milestone.status === 'disputed' || milestone.disputedAt !== undefined,
          ).length,
        0,
      ),
    });
    const reviewBuckets = new Map<string, number[]>();
    for (const review of reviews) {
      const bucket = reviewBuckets.get(review.revieweeUserId) ?? [];
      bucket.push(review.rating);
      reviewBuckets.set(review.revieweeUserId, bucket);
    }
    const reviewAverageByUser = new Map<string, number>(
      Array.from(reviewBuckets.entries()).map(([userId, ratings]) => [
        userId,
        Number(
          (
            ratings.reduce((sum, rating) => sum + rating, 0) /
            Math.max(1, ratings.length)
          ).toFixed(2),
        ),
      ]),
    );
    const clickCounts = new Map<string, number>();
    for (const event of events) {
      if (event.eventType !== 'result_click' || !event.entityId) {
        continue;
      }
      clickCounts.set(event.entityId, (clickCounts.get(event.entityId) ?? 0) + 1);
    }
    const profileMap = new Map(profiles.map((profile) => [profile.userId, profile]));
    const opportunityMap = new Map(
      opportunities.map((opportunity) => [opportunity.id, opportunity]),
    );
    const profileRankingAudit = talentDocuments
      .map((document) => {
          const profile = profileMap.get(document.profileUserId);
          if (!profile) {
            return null;
          }
          const hireCount = decisions.filter(
            (decision) =>
              decision.action === 'hired' &&
              applications.find(
                (application) =>
                  application.id === decision.applicationId &&
                  application.applicantUserId === document.profileUserId,
              ),
          ).length;
          const noHireCount = decisions.filter(
            (decision) =>
              decision.action === 'no_hire' &&
              applications.find(
                (application) =>
                  application.id === decision.applicationId &&
                  application.applicantUserId === document.profileUserId,
              ),
          ).length;
          const outcomeScore =
            hireCount * 18 +
            (reviewAverageByUser.get(document.profileUserId) ?? 0) * 8 -
            noHireCount * 4;
          return {
            entityType: 'profile',
            entityId: document.profileUserId,
            label: document.displayName,
            score: document.ranking.score,
            outcomeScore,
            momentumScore:
              Math.max(0, 100 - document.ranking.recencyDays * 4) +
              (clickCounts.get(document.profileUserId) ?? 0) * 3,
            moderationStatus: profile.moderationStatus,
            reasons: document.reasons,
            signals: {
              completionRate: document.ranking.completionRate,
              disputeRate: document.ranking.disputeRate,
              inviteAcceptanceRate: document.ranking.inviteAcceptanceRate,
              responseRate: document.ranking.responseRate,
              reviewAverage: reviewAverageByUser.get(document.profileUserId) ?? null,
              hireCount,
              noHireCount,
              recencyDays: document.ranking.recencyDays,
            },
          } satisfies MarketplaceRankingAuditEntry;
        })
        .filter(Boolean) as MarketplaceRankingAuditEntry[];
    const opportunityRankingAudit = opportunityDocuments
      .map((document) => {
          const opportunity = opportunityMap.get(document.opportunityId);
          if (!opportunity) {
            return null;
          }
          const hireCount = decisions.filter(
            (decision) =>
              decision.opportunityId === document.opportunityId &&
              decision.action === 'hired',
          ).length;
          const noHireCount = decisions.filter(
            (decision) =>
              decision.opportunityId === document.opportunityId &&
              decision.action === 'no_hire',
          ).length;
          return {
            entityType: 'opportunity',
            entityId: document.opportunityId,
            label: document.title,
            score: document.ranking.score,
            outcomeScore: hireCount * 18 - noHireCount * 5,
            momentumScore:
              Math.max(0, 100 - document.ranking.recencyDays * 4) +
              (clickCounts.get(document.opportunityId) ?? 0) * 3,
            moderationStatus: opportunity.moderationStatus,
            reasons: document.reasons,
            signals: {
              completionRate: document.ranking.completionRate,
              disputeRate: document.ranking.disputeRate,
              inviteAcceptanceRate: document.ranking.inviteAcceptanceRate,
              responseRate: document.ranking.responseRate,
              reviewAverage: null,
              hireCount,
              noHireCount,
              recencyDays: document.ranking.recencyDays,
            },
          } satisfies MarketplaceRankingAuditEntry;
        })
        .filter(Boolean) as MarketplaceRankingAuditEntry[];
    const rankingAudit: MarketplaceRankingAuditEntry[] = [
      ...profileRankingAudit,
      ...opportunityRankingAudit,
    ]
      .sort(
        (left, right) =>
          right.score +
            right.outcomeScore +
            right.momentumScore -
            (left.score + left.outcomeScore + left.momentumScore),
      )
      .slice(0, 12);

    return {
      generatedAt: new Date().toISOString(),
      funnel,
      liquidityByCategory: await this.buildLiquidityByCategory(
        profiles,
        opportunities,
      ),
      liquidityByTimezone: await this.buildLiquidityByTimezone(
        profiles,
        opportunities,
      ),
      noHireReasons: this.buildNoHireReasonStats(decisions),
      topSearches: this.buildTopSearchStats(events),
      stalledOpportunities: this.buildStalledOpportunityViews(
        opportunities,
        applications,
        decisions,
      ),
      rankingAudit,
      retention: {
        talentPools: talentPools.length,
        trackedTalent: talentPoolMembers.length,
        automationRules: automationRules.length,
        automationRuns: automationRuns.length,
        automatedTaskDeliveries: automationRuns.reduce(
          (sum, run) => sum + run.items.length,
          0,
        ),
        pendingLifecycleTasks,
        rehireCandidates: rehireCandidates.length,
        clientWorkspacesWithRetentionSetup: retentionWorkspaceIds.size,
      },
    };
  }

  private async toProfileView(
    profile: MarketplaceProfileRecord,
  ): Promise<MarketplaceProfileView> {
    const hydratedProfile = await this.ensureProfileWorkspace(profile);
    const user = await this.usersService.getRequiredById(hydratedProfile.userId);
    const escrowStats = await this.getEscrowStats(user, 'worker');
    const verifiedWalletAddress = this.getVerifiedWalletAddress(user);
    return {
      ...hydratedProfile,
      verifiedWalletAddress,
      verificationLevel: this.computeVerificationLevel(
        verifiedWalletAddress,
        escrowStats,
      ),
      escrowStats,
      reputation: await this.buildReputationSnapshot(user, 'worker'),
      publicReviews: await this.listPublicReviewsForUser(user.id, 'worker'),
      completedEscrowCount: escrowStats.completionCount,
      isComplete: this.isProfileComplete(hydratedProfile),
    };
  }

  private async toOpportunityView(
    opportunity: MarketplaceOpportunityRecord,
  ): Promise<MarketplaceOpportunityView> {
    const hydratedOpportunity = await this.ensureOpportunityWorkspace(opportunity);
    const owner = await this.usersService.getRequiredById(
      hydratedOpportunity.ownerUserId,
    );
    const applications = await this.marketplaceRepository.listApplications();

    return {
      ...hydratedOpportunity,
      owner: await this.toClientSummary(owner, hydratedOpportunity),
      escrowReadiness: await this.getEscrowReadiness(owner.id),
      applicationCount: applications.filter(
        (application) =>
          application.opportunityId === hydratedOpportunity.id &&
          application.status !== 'withdrawn',
      ).length,
    };
  }

  private async toOpportunityDetailView(
    opportunity: MarketplaceOpportunityRecord,
    viewerUserId?: string,
    prefetchedApplications?: MarketplaceApplicationRecord[],
  ): Promise<MarketplaceOpportunityDetailView> {
    const hydratedOpportunity = await this.ensureOpportunityWorkspace(opportunity);
    const base = await this.toOpportunityView(hydratedOpportunity);
    const applications =
      prefetchedApplications ??
      (await this.marketplaceRepository.listApplications()).filter(
        (application) => application.opportunityId === hydratedOpportunity.id,
      );

    if (
      viewerUserId &&
      (await this.canAccessOpportunityAsOwner(viewerUserId, hydratedOpportunity))
    ) {
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
    viewerUserId?: string,
  ): Promise<MarketplaceApplicationView> {
    const hydratedApplication = await this.ensureApplicationWorkspace(application);
    const applicantUser = await this.usersService.getRequiredById(
      hydratedApplication.applicantUserId,
    );
    const opportunity = await this.requireOpportunity(
      hydratedApplication.opportunityId,
    );
    const owner = await this.usersService.getRequiredById(
      opportunity.ownerUserId,
    );
    const applicantSummary = await this.toTalentSummary(applicantUser);
    const dossier = await this.buildApplicationDossier(
      hydratedApplication,
      opportunity,
      applicantSummary,
    );

    return {
      ...hydratedApplication,
      contractPath: await this.resolveApplicationContractPath(
        hydratedApplication,
        applicantUser,
        viewerUserId,
      ),
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
        ownerWorkspaceId: opportunity.ownerWorkspaceId,
      },
      fitScore: dossier.matchSummary.fitScore,
      fitBreakdown: dossier.matchSummary.fitBreakdown,
      riskFlags: dossier.matchSummary.riskFlags,
      dossier,
    };
  }

  private async resolveApplicationContractPath(
    application: MarketplaceApplicationRecord,
    applicantUser: UserRecord,
    viewerUserId?: string,
  ): Promise<string | null> {
    if (!application.hiredJobId) {
      return null;
    }

    const defaultPath = `/app/contracts/${application.hiredJobId}`;
    if (viewerUserId !== application.applicantUserId) {
      return defaultPath;
    }

    const job = await this.escrowRepository.getById(application.hiredJobId);
    const participation = job?.contractorParticipation;
    const inviteToken = participation?.invite.token;

    if (
      !job ||
      !participation ||
      participation.status === 'joined' ||
      !inviteToken ||
      participation.contractorEmail !== applicantUser.email
    ) {
      return defaultPath;
    }

    return `${defaultPath}?invite=${encodeURIComponent(inviteToken)}`;
  }

  private toSavedSearchView(
    search: MarketplaceSavedSearchRecord,
    activeWorkspaceId: string | null,
  ): MarketplaceSavedSearchView {
    return {
      ...search,
      activeWorkspaceId,
    };
  }

  private async toOpportunityInviteView(
    invite: MarketplaceOpportunityInviteRecord,
  ): Promise<MarketplaceOpportunityInviteView> {
    const opportunity = await this.requireOpportunity(invite.opportunityId);
    const invitedUser = await this.usersService.getRequiredById(
      invite.invitedProfileUserId,
    );
    const ownerUser = await this.usersService.getRequiredById(opportunity.ownerUserId);
    const talent = await this.toTalentSummary(invitedUser);
    return {
      id: invite.id,
      status: invite.status,
      message: invite.message,
      createdAt: invite.createdAt,
      updatedAt: invite.updatedAt,
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        visibility: opportunity.visibility,
        status: opportunity.status,
        ownerDisplayName:
          (await this.marketplaceRepository.getProfileByUserId(ownerUser.id))
            ?.displayName ??
          ownerUser.email.split('@')[0] ??
          ownerUser.id,
        ownerWorkspaceId: opportunity.ownerWorkspaceId,
      },
      talent,
    };
  }

  private async getOpportunityInviteIndex() {
    const invites = await this.marketplaceRepository.listOpportunityInvites();
    const latestByProfile = new Map<string, MarketplaceOpportunityInviteRecord>();
    for (const invite of invites) {
      const existing = latestByProfile.get(invite.invitedProfileUserId);
      if (!existing || invite.updatedAt > existing.updatedAt) {
        latestByProfile.set(invite.invitedProfileUserId, invite);
      }
    }
    return new Map(
      Array.from(latestByProfile.entries()).map(([profileUserId, invite]) => [
        profileUserId,
        invite.status,
      ]),
    );
  }

  private async requireClientRetentionWorkspace(userId: string) {
    return this.organizationsService.requireWorkspace(
      userId,
      'client',
      'reviewApplications',
    );
  }

  private async requireTalentPoolInWorkspace(poolId: string, workspaceId: string) {
    const pool = await this.marketplaceRepository.getTalentPoolById(poolId);
    if (!pool || pool.workspaceId !== workspaceId) {
      throw new NotFoundException('Marketplace talent pool not found');
    }
    return pool;
  }

  private async validateTalentPoolMemberSources(
    workspaceId: string,
    dto: Pick<
      AddMarketplaceTalentPoolMemberDto,
      'sourceApplicationId' | 'sourceJobId' | 'sourceOpportunityId'
    >,
  ) {
    if (dto.sourceOpportunityId) {
      const opportunity = await this.requireOpportunity(dto.sourceOpportunityId);
      const hydrated = await this.ensureOpportunityWorkspace(opportunity);
      if (hydrated.ownerWorkspaceId !== workspaceId) {
        throw new ForbiddenException(
          'Talent pool sources must belong to the active client workspace',
        );
      }
    }
    if (dto.sourceApplicationId) {
      const application = await this.requireApplication(dto.sourceApplicationId);
      const opportunity = await this.requireOpportunity(application.opportunityId);
      const hydrated = await this.ensureOpportunityWorkspace(opportunity);
      if (hydrated.ownerWorkspaceId !== workspaceId) {
        throw new ForbiddenException(
          'Talent pool sources must belong to the active client workspace',
        );
      }
    }
    if (dto.sourceJobId && !(await this.escrowRepository.getById(dto.sourceJobId))) {
      throw new NotFoundException('Escrow job not found');
    }
  }

  private async validateAutomationRuleTarget(
    workspaceId: string,
    kind: MarketplaceAutomationRuleRecord['kind'],
    targetId: string | null,
  ) {
    if (!targetId) {
      return;
    }
    if (kind === 'saved_search_digest') {
      const search = await this.marketplaceRepository.getSavedSearchById(targetId);
      if (!search || search.workspaceId !== workspaceId) {
        throw new NotFoundException('Marketplace saved search not found');
      }
      return;
    }
    if (kind === 'talent_pool_digest') {
      await this.requireTalentPoolInWorkspace(targetId, workspaceId);
      return;
    }
    if (kind === 'invite_followup') {
      const opportunity = await this.requireOpportunity(targetId);
      const hydrated = await this.ensureOpportunityWorkspace(opportunity);
      if (hydrated.ownerWorkspaceId !== workspaceId) {
        throw new NotFoundException('Marketplace opportunity not found');
      }
      return;
    }
    if (kind === 'rehire_digest' && !(await this.escrowRepository.getById(targetId))) {
      throw new NotFoundException('Escrow job not found');
    }
  }

  private async toTalentPoolView(
    pool: MarketplaceTalentPoolRecord,
    workspaceId: string,
  ): Promise<MarketplaceTalentPoolView> {
    const [members, invites, opportunities] = await Promise.all([
      this.marketplaceRepository.listTalentPoolMembers(),
      this.marketplaceRepository.listOpportunityInvites(),
      this.marketplaceRepository.listOpportunities(),
    ]);
    const workspaceOpportunityIds = new Set(
      opportunities
        .filter((opportunity) => opportunity.ownerWorkspaceId === workspaceId)
        .map((opportunity) => opportunity.id),
    );

    return {
      ...pool,
      members: await Promise.all(
        members
          .filter((member) => member.poolId === pool.id)
          .sort((left, right) => right.updatedAt - left.updatedAt)
          .map(async (member) => {
            const user = await this.usersService.getRequiredById(member.profileUserId);
            const profile = await this.toTalentSummary(user);
            const invite = invites
              .filter(
                (candidate) =>
                  candidate.invitedProfileUserId === member.profileUserId &&
                  workspaceOpportunityIds.has(candidate.opportunityId),
              )
              .sort((left, right) => right.updatedAt - left.updatedAt)[0];
            return {
              ...member,
              profile,
              reviewAverage: profile.reputation.averageRating,
              activeInviteStatus: invite?.status ?? null,
            };
          }),
      ),
    };
  }

  private async buildLifecycleDigestForWorkspace(
    workspace: WorkspaceSummary,
  ): Promise<MarketplaceLifecycleDigest> {
    const [
      savedSearches,
      pools,
      members,
      invites,
      opportunities,
      reviews,
    ] = await Promise.all([
      this.marketplaceRepository.listSavedSearches(),
      this.marketplaceRepository.listTalentPools(),
      this.marketplaceRepository.listTalentPoolMembers(),
      this.marketplaceRepository.listOpportunityInvites(),
      this.marketplaceRepository.listOpportunities(),
      this.marketplaceRepository.listReviews(),
    ]);
    const scopedPools = pools.filter((pool) => pool.workspaceId === workspace.workspaceId);
    const poolIds = new Set(scopedPools.map((pool) => pool.id));
    const scopedMembers = members.filter((member) => poolIds.has(member.poolId));
    const scopedSearches = savedSearches.filter(
      (search) =>
        search.workspaceId === workspace.workspaceId && search.kind === 'talent',
    );
    const scopedOpportunities = opportunities.filter(
      (opportunity) => opportunity.ownerWorkspaceId === workspace.workspaceId,
    );
    const opportunityIds = new Set(scopedOpportunities.map((item) => item.id));
    const scopedInvites = invites.filter((invite) =>
      opportunityIds.has(invite.opportunityId),
    );
    const scopedJobs = (
      await Promise.all(
        scopedOpportunities
          .filter((opportunity) => opportunity.hiredJobId)
          .map(async (opportunity) => {
            const job = await this.escrowRepository.getById(opportunity.hiredJobId!);
            if (!job) {
              return null;
            }
            return (await this.escrowOnchainAuthority.mergeJob(job)).job;
          }),
      )
    ).filter((job): job is EscrowJobRecord => job !== null);
    const rehireCandidates = await this.buildRehireCandidates(scopedJobs, reviews);
    const tasks = this.buildLifecycleTasks({
      searches: scopedSearches,
      pools: scopedPools,
      members: scopedMembers,
      invites: scopedInvites,
      opportunities: scopedOpportunities,
      rehireCandidates,
    });

    return {
      generatedAt: new Date().toISOString(),
      workspace: {
        workspaceId: workspace.workspaceId,
        kind: workspace.kind,
        organizationId: workspace.organizationId,
        organizationKind: workspace.organizationKind,
      },
      poolSummary: {
        poolCount: scopedPools.length,
        trackedTalentCount: scopedMembers.length,
        contactedCount: scopedMembers.filter((member) => member.stage === 'contacted')
          .length,
        interviewingCount: scopedMembers.filter(
          (member) => member.stage === 'interviewing',
        ).length,
        offeredCount: scopedMembers.filter((member) => member.stage === 'offered')
          .length,
        rehireReadyCount: scopedMembers.filter(
          (member) => member.stage === 'rehire_ready',
        ).length,
      },
      rehireCandidates,
      tasks,
    };
  }

  private buildLifecycleTasks(input: {
    searches: MarketplaceSavedSearchRecord[];
    pools: MarketplaceTalentPoolRecord[];
    members: MarketplaceTalentPoolMemberRecord[];
    invites: MarketplaceOpportunityInviteRecord[];
    opportunities: MarketplaceOpportunityRecord[];
    rehireCandidates: MarketplaceRehireCandidateView[];
  }): MarketplaceLifecycleTask[] {
    const now = Date.now();
    const poolById = new Map(input.pools.map((pool) => [pool.id, pool]));
    const opportunityById = new Map(
      input.opportunities.map((opportunity) => [opportunity.id, opportunity]),
    );
    const tasks: MarketplaceLifecycleTask[] = [];

    for (const search of input.searches) {
      if (now - search.updatedAt < 7 * 24 * hourMs) {
        continue;
      }
      tasks.push({
        id: `saved-search-${search.id}`,
        kind: 'saved_search_refresh',
        priority: search.lastResultCount > 0 ? 'medium' : 'low',
        title: `Refresh saved search: ${search.label}`,
        detail: `Last refreshed ${Math.max(
          1,
          Math.floor((now - search.updatedAt) / (24 * hourMs)),
        )} day(s) ago with ${search.lastResultCount} result(s).`,
        relatedEntityId: search.id,
      });
    }

    for (const invite of input.invites) {
      if (invite.status !== 'pending' || now - invite.updatedAt < 3 * 24 * hourMs) {
        continue;
      }
      const opportunity = opportunityById.get(invite.opportunityId);
      tasks.push({
        id: `invite-${invite.id}`,
        kind: 'invite_followup',
        priority: 'high',
        title: `Follow up invite: ${opportunity?.title ?? invite.opportunityId}`,
        detail: `Pending for ${Math.max(
          1,
          Math.floor((now - invite.updatedAt) / (24 * hourMs)),
        )} day(s) without an application.`,
        relatedEntityId: opportunity?.id ?? invite.opportunityId,
      });
    }

    for (const member of input.members) {
      if (
        !['saved', 'contacted'].includes(member.stage) ||
        now - member.updatedAt < 5 * 24 * hourMs
      ) {
        continue;
      }
      const pool = poolById.get(member.poolId);
      tasks.push({
        id: `pool-${member.id}`,
        kind: 'pool_followup',
        priority: member.stage === 'contacted' ? 'high' : 'medium',
        title: `Advance talent pool candidate: ${member.profileSlug}`,
        detail: `${pool?.label ?? 'Talent pool'} has not progressed this candidate since ${Math.max(
          1,
          Math.floor((now - member.updatedAt) / (24 * hourMs)),
        )} day(s).`,
        relatedEntityId: pool?.id ?? member.poolId,
      });
    }

    for (const candidate of input.rehireCandidates.slice(0, 4)) {
      tasks.push({
        id: `rehire-${candidate.jobId}`,
        kind: 'rehire_prompt',
        priority:
          candidate.relationshipStrength === 'repeat_ready'
            ? 'high'
            : candidate.relationshipStrength === 'trusted'
              ? 'medium'
              : 'low',
        title: `Rehire prompt: ${candidate.profile.displayName}`,
        detail: `Previous escrow contract "${candidate.title}" is ready for a repeat brief.`,
        relatedEntityId: candidate.jobId,
      });
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return tasks
      .sort(
        (left, right) =>
          priorityOrder[left.priority] - priorityOrder[right.priority] ||
          left.title.localeCompare(right.title),
      )
      .slice(0, 12);
  }

  private async buildRehireCandidates(
    jobs: EscrowJobRecord[],
    reviews: MarketplaceReviewRecord[],
  ): Promise<MarketplaceRehireCandidateView[]> {
    const candidates = await Promise.all(
      jobs
        .filter((job) => job.status === 'completed' || job.status === 'resolved')
        .map(async (job) => {
          const workerUserId = await this.resolveEscrowParticipantUserId(job, 'worker');
          if (!workerUserId) {
            return null;
          }
          const workerUser = await this.usersService.getRequiredById(workerUserId);
          const profile = await this.toTalentSummary(workerUser);
          if (!profile.profileSlug) {
            return null;
          }
          const visibleReviews = reviews.filter(
            (review) =>
              review.jobId === job.id &&
              review.revieweeUserId === workerUserId &&
              review.revieweeRole === 'worker' &&
              review.visibilityStatus === 'visible',
          );
          const reviewAverage =
            visibleReviews.length === 0
              ? profile.reputation.averageRating
              : Number(
                  (
                    visibleReviews.reduce((sum, review) => sum + review.rating, 0) /
                    visibleReviews.length
                  ).toFixed(1),
                );
          const disputedCount = job.milestones.filter(
            (milestone) =>
              milestone.status === 'disputed' || milestone.disputedAt !== undefined,
          ).length;
          const relationshipStrength =
            reviewAverage !== null && reviewAverage >= 4.8 && disputedCount === 0
              ? ('repeat_ready' as const)
              : reviewAverage !== null && reviewAverage >= 4
                ? ('trusted' as const)
                : ('watch' as const);
          const completedAt =
            Math.max(
              job.updatedAt,
              ...job.milestones.map((milestone) =>
                Math.max(milestone.releasedAt ?? 0, milestone.resolvedAt ?? 0),
              ),
            ) || null;
          return {
            jobId: job.id,
            completedAt,
            title: job.title,
            profile,
            reviewAverage,
            relationshipStrength,
          } satisfies MarketplaceRehireCandidateView;
        }),
    );

    return candidates
      .filter((candidate): candidate is MarketplaceRehireCandidateView => candidate !== null)
      .sort(
        (left, right) =>
          (right.completedAt ?? 0) - (left.completedAt ?? 0) ||
          right.profile.completedEscrowCount - left.profile.completedEscrowCount,
      )
      .slice(0, 8);
  }

  private async toAutomationRuleView(
    rule: MarketplaceAutomationRuleRecord,
    workspace: WorkspaceSummary,
    digest?: MarketplaceLifecycleDigest,
    runs?: MarketplaceAutomationRunRecord[],
  ): Promise<MarketplaceAutomationRuleView> {
    const lifecycleDigest =
      digest ?? (await this.buildLifecycleDigestForWorkspace(workspace));
    const automationRuns =
      runs ??
      (await this.marketplaceRepository.listAutomationRuns()).filter(
        (run) => run.workspaceId === workspace.workspaceId,
      );
    const latestRun =
      automationRuns
        .filter((run) => run.ruleId === rule.id)
        .sort((left, right) => right.createdAt - left.createdAt)[0] ?? null;
    const pendingTaskCount = lifecycleDigest.tasks.filter((task) =>
      this.matchesAutomationRule(rule, task),
    ).length;
    return {
      ...rule,
      pendingTaskCount,
      summary: this.describeAutomationRule(rule, pendingTaskCount),
      lastRunAt: latestRun?.createdAt ?? null,
      lastRunTaskCount: latestRun?.items.length ?? 0,
      latestRunSummary: latestRun?.summary ?? null,
      dueNow: this.isAutomationRuleDue(
        rule,
        automationRuns.filter((run) => run.ruleId === rule.id),
      ),
    };
  }

  private toAutomationRunView(
    run: MarketplaceAutomationRunRecord,
    rule?: MarketplaceAutomationRuleRecord,
  ): MarketplaceAutomationRunView {
    const title = rule?.label ?? run.ruleLabel;
    return {
      ...run,
      taskCount: run.items.length,
      preview:
        run.items[0]?.recommendation ??
        `${title} produced ${run.items.length} automation item${run.items.length === 1 ? '' : 's'}.`,
    };
  }

  private toNotificationView(
    notification: MarketplaceNotificationRecord,
  ): MarketplaceNotificationView {
    return notification;
  }

  private filterNotificationsForWorkspace(
    notifications: MarketplaceNotificationRecord[],
    userId: string,
    workspaceId: string | null,
  ) {
    return notifications
      .filter((notification) => {
        if (notification.userId !== userId) {
          return false;
        }
        if (notification.workspaceId === null) {
          return true;
        }
        return workspaceId === notification.workspaceId;
      })
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }

  private isAutomationRuleDue(
    rule: MarketplaceAutomationRuleRecord,
    runs: MarketplaceAutomationRunRecord[],
    now = Date.now(),
  ) {
    if (!rule.enabled || rule.schedule === 'manual') {
      return false;
    }
    const latestRun =
      runs
        .filter((run) => run.ruleId === rule.id)
        .sort((left, right) => right.createdAt - left.createdAt)[0] ?? null;
    if (!latestRun) {
      return true;
    }
    const cadenceMs = rule.schedule === 'daily' ? 24 * hourMs : 7 * 24 * hourMs;
    return now - latestRun.createdAt >= cadenceMs;
  }

  private async executeAutomationRule(
    rule: MarketplaceAutomationRuleRecord,
    workspace: WorkspaceSummary,
    trigger: MarketplaceAutomationRunTrigger,
  ): Promise<MarketplaceAutomationRunRecord> {
    const digest = await this.buildLifecycleDigestForWorkspace(workspace);
    const matchedTasks = digest.tasks.filter((task) =>
      this.matchesAutomationRule(rule, task),
    );
    const run: MarketplaceAutomationRunRecord = {
      id: randomUUID(),
      ruleId: rule.id,
      ownerUserId: rule.ownerUserId,
      workspaceId: workspace.workspaceId,
      kind: rule.kind,
      schedule: rule.schedule,
      trigger,
      ruleLabel: rule.label,
      matchedTaskIds: matchedTasks.map((task) => task.id),
      items: matchedTasks.map((task, index) =>
        this.createAutomationRunItem(rule, task, index),
      ),
      summary: this.describeAutomationRun(rule, matchedTasks.length),
      createdAt: Date.now(),
    };
    await this.marketplaceRepository.saveAutomationRun(run);
    await this.emitNotification({
      userId: rule.ownerUserId,
      workspaceId: workspace.workspaceId,
      kind: 'automation_digest',
      title: `${rule.label} automation run`,
      detail:
        run.items.length === 0
          ? 'No lifecycle items matched this run.'
          : run.items
              .slice(0, 3)
              .map((item) => item.title)
              .join(' • '),
      actorUserId: rule.ownerUserId,
      relatedAutomationRunId: run.id,
    });
    return run;
  }

  private createAutomationRunItem(
    rule: MarketplaceAutomationRuleRecord,
    task: MarketplaceLifecycleTask,
    index: number,
  ): MarketplaceAutomationRunItem {
    return {
      id: `${rule.id}-${task.id}-${index + 1}`,
      kind: task.kind,
      priority: task.priority,
      title: task.title,
      detail: task.detail,
      relatedEntityId: task.relatedEntityId,
      recommendation: this.describeAutomationRunRecommendation(task),
    };
  }

  private describeAutomationRunRecommendation(task: MarketplaceLifecycleTask) {
    switch (task.kind) {
      case 'saved_search_refresh':
        return 'Refresh the saved search and review net-new talent before the brief goes stale.';
      case 'invite_followup':
        return 'Follow up on the pending invite and either convert it into an application or close it out.';
      case 'pool_followup':
        return 'Move this talent-pool candidate into outreach, interview, or archive so the bench stays current.';
      case 'rehire_prompt':
        return 'Open a repeat brief or private invite while the completed delivery context is still fresh.';
      default:
        return 'Review this lifecycle task and clear the next client-side action.';
    }
  }

  private describeAutomationRun(
    rule: MarketplaceAutomationRuleRecord,
    taskCount: number,
  ) {
    if (taskCount === 0) {
      return `${rule.label} ran with no pending lifecycle items.`;
    }
    return `${rule.label} generated ${taskCount} automation follow-up item${taskCount === 1 ? '' : 's'}.`;
  }

  private async emitNotification(input: {
    userId: string;
    workspaceId: string | null;
    kind: MarketplaceNotificationRecord['kind'];
    title: string;
    detail: string;
    actorUserId?: string | null;
    relatedOpportunityId?: string | null;
    relatedApplicationId?: string | null;
    relatedOfferId?: string | null;
    relatedJobId?: string | null;
    relatedAutomationRunId?: string | null;
  }) {
    const now = Date.now();
    const notification: MarketplaceNotificationRecord = {
      id: randomUUID(),
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      kind: input.kind,
      status: 'unread',
      title: input.title.trim(),
      detail: input.detail.trim(),
      actorUserId: input.actorUserId ?? null,
      relatedOpportunityId: input.relatedOpportunityId ?? null,
      relatedApplicationId: input.relatedApplicationId ?? null,
      relatedOfferId: input.relatedOfferId ?? null,
      relatedJobId: input.relatedJobId ?? null,
      relatedAutomationRunId: input.relatedAutomationRunId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await this.marketplaceRepository.saveNotification(notification);
    return notification;
  }

  private matchesAutomationRule(
    rule: MarketplaceAutomationRuleRecord,
    task: MarketplaceLifecycleTask,
  ) {
    if (
      rule.kind === 'saved_search_digest' &&
      task.kind === 'saved_search_refresh'
    ) {
      return !rule.targetId || task.relatedEntityId === rule.targetId;
    }
    if (
      rule.kind === 'talent_pool_digest' &&
      task.kind === 'pool_followup'
    ) {
      return !rule.targetId || task.relatedEntityId === rule.targetId;
    }
    if (rule.kind === 'invite_followup' && task.kind === 'invite_followup') {
      return !rule.targetId || task.relatedEntityId === rule.targetId;
    }
    if (rule.kind === 'rehire_digest' && task.kind === 'rehire_prompt') {
      return !rule.targetId || task.relatedEntityId === rule.targetId;
    }
    return false;
  }

  private describeAutomationRule(
    rule: MarketplaceAutomationRuleRecord,
    pendingTaskCount: number,
  ) {
    const kindLabel: Record<MarketplaceAutomationRuleRecord['kind'], string> = {
      saved_search_digest: 'Saved-search refresh',
      talent_pool_digest: 'Talent-pool follow-up',
      invite_followup: 'Invite follow-up',
      rehire_digest: 'Rehire prompts',
    };
    return `${kindLabel[rule.kind]} on ${rule.schedule} cadence with ${pendingTaskCount} pending task${pendingTaskCount === 1 ? '' : 's'}.`;
  }

  private sumMilestoneAmounts(milestones: EscrowMilestoneRecord[]) {
    const total = milestones.reduce((sum, milestone) => {
      const parsed = Number(milestone.amount);
      return Number.isFinite(parsed) ? sum + parsed : sum;
    }, 0);
    return total > 0 ? String(total) : null;
  }

  private normalizeSavedSearchQuery(
    kind: MarketplaceSavedSearchRecord['kind'],
    query: Record<string, string | number | boolean | null>,
  ) {
    const normalized = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== null && value !== ''),
    );
    if (kind === 'talent') {
      return this.compactSavedSearchQuery({
        q: asOptionalString(normalized.q),
        skill: asOptionalString(normalized.skill),
        skills: asOptionalString(normalized.skills),
        timezone: asOptionalString(normalized.timezone),
        availability: asOptionalEnum(normalized.availability, [
          'open',
          'limited',
          'unavailable',
        ]),
        cryptoReadiness: asOptionalEnum(normalized.cryptoReadiness, [
          'wallet_only',
          'smart_account_ready',
          'escrow_power_user',
        ]),
        engagementType: asOptionalEnum(normalized.engagementType, [
          'fixed_scope',
          'milestone_retainer',
          'advisory',
        ]),
        verificationLevel: asOptionalEnum(normalized.verificationLevel, [
          'wallet_verified',
          'wallet_and_escrow_history',
          'wallet_escrow_and_delivery',
        ]),
        sort: asOptionalEnum(normalized.sort, ['relevance', 'recent']) ?? 'relevance',
        limit: asPositiveInt(normalized.limit) ?? 24,
      });
    }
    return this.compactSavedSearchQuery({
      q: asOptionalString(normalized.q),
      skill: asOptionalString(normalized.skill),
      skills: asOptionalString(normalized.skills),
      category: asOptionalString(normalized.category),
      engagementType: asOptionalEnum(normalized.engagementType, [
        'fixed_scope',
        'milestone_retainer',
        'advisory',
      ]),
      cryptoReadinessRequired: asOptionalEnum(
        normalized.cryptoReadinessRequired,
        ['wallet_only', 'smart_account_ready', 'escrow_power_user'],
      ),
      minBudget: asOptionalString(normalized.minBudget),
      maxBudget: asOptionalString(normalized.maxBudget),
      timezoneOverlapHours: asPositiveInt(normalized.timezoneOverlapHours),
      sort: asOptionalEnum(normalized.sort, ['relevance', 'recent']) ?? 'relevance',
      limit: asPositiveInt(normalized.limit) ?? 24,
    });
  }

  private async getSavedSearchResultCount(
    kind: MarketplaceSavedSearchRecord['kind'],
    query: Record<string, string | number | boolean | null>,
  ) {
    if (kind === 'talent') {
      const results = await this.searchTalent(
        this.toTalentSearchQuery(query),
      );
      return results.results.length;
    }
    const results = await this.searchOpportunities(
      this.toOpportunitySearchQuery(query),
    );
    return results.results.length;
  }

  private toTalentSearchQuery(
    query: Record<string, string | number | boolean | null>,
  ): MarketplaceProfilesQueryDto {
    return {
      q: asOptionalString(query.q),
      skill: asOptionalString(query.skill),
      skills: asOptionalString(query.skills),
      timezone: asOptionalString(query.timezone),
      availability: asOptionalEnum(query.availability, [
        'open',
        'limited',
        'unavailable',
      ] as const),
      cryptoReadiness: asOptionalEnum(query.cryptoReadiness, [
        'wallet_only',
        'smart_account_ready',
        'escrow_power_user',
      ] as const),
      engagementType: asOptionalEnum(query.engagementType, [
        'fixed_scope',
        'milestone_retainer',
        'advisory',
      ] as const),
      verificationLevel: asOptionalEnum(query.verificationLevel, [
        'wallet_verified',
        'wallet_and_escrow_history',
        'wallet_escrow_and_delivery',
      ] as const),
      sort:
        asOptionalEnum(query.sort, ['relevance', 'recent'] as const) ??
        'relevance',
      limit: asPositiveInt(query.limit) ?? 24,
    };
  }

  private toOpportunitySearchQuery(
    query: Record<string, string | number | boolean | null>,
  ): MarketplaceOpportunitiesQueryDto {
    return {
      q: asOptionalString(query.q),
      skill: asOptionalString(query.skill),
      skills: asOptionalString(query.skills),
      category: asOptionalString(query.category),
      engagementType: asOptionalEnum(query.engagementType, [
        'fixed_scope',
        'milestone_retainer',
        'advisory',
      ] as const),
      cryptoReadinessRequired: asOptionalEnum(query.cryptoReadinessRequired, [
        'wallet_only',
        'smart_account_ready',
        'escrow_power_user',
      ] as const),
      minBudget: asOptionalString(query.minBudget),
      maxBudget: asOptionalString(query.maxBudget),
      timezoneOverlapHours: asPositiveInt(query.timezoneOverlapHours),
      sort:
        asOptionalEnum(query.sort, ['relevance', 'recent'] as const) ??
        'relevance',
      limit: asPositiveInt(query.limit) ?? 24,
    };
  }

  private compactSavedSearchQuery(
    query: Record<string, string | number | boolean | null | undefined>,
  ): Record<string, string | number | boolean | null> {
    return Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== undefined),
    ) as Record<string, string | number | boolean | null>;
  }

  private async requireReviewableJob(jobId: string) {
    const job = await this.escrowRepository.getById(jobId);
    if (!job) {
      throw new NotFoundException('Escrow job not found');
    }
    const merged = (await this.escrowOnchainAuthority.mergeJob(job)).job;
    if (merged.status !== 'completed' && merged.status !== 'resolved') {
      throw new ConflictException(
        'Marketplace reviews are available only after contract completion or resolution',
      );
    }
    return merged;
  }

  private async toReviewView(
    review: MarketplaceReviewRecord,
  ): Promise<MarketplaceReviewView> {
    const reviewerUser = await this.usersService.getRequiredById(review.reviewerUserId);
    const reviewerProfile =
      await this.marketplaceRepository.getProfileByUserId(review.reviewerUserId);
    const moderatedBy = review.moderatedByUserId
      ? await this.usersService.getRequiredById(review.moderatedByUserId)
      : null;
    return {
      ...review,
      reviewer: {
        userId: reviewerUser.id,
        displayName:
          reviewerProfile?.displayName ?? reviewerUser.email.split('@')[0] ?? reviewerUser.id,
        role: review.reviewerRole,
      },
      reviewee: {
        userId: review.revieweeUserId,
        role: review.revieweeRole,
      },
      moderatedBy: moderatedBy
        ? {
            userId: moderatedBy.id,
            email: moderatedBy.email,
          }
        : null,
    };
  }

  private async toIdentityRiskReviewView(
    review: MarketplaceIdentityRiskReviewRecord,
  ): Promise<MarketplaceIdentityRiskReviewView> {
    const operator = await this.usersService.getRequiredById(review.reviewedByUserId);
    return {
      ...review,
      reviewedBy: {
        userId: operator.id,
        email: operator.email,
      },
    };
  }

  private async getIdentityRiskReviewView(userId: string) {
    const review =
      await this.marketplaceRepository.getIdentityRiskReviewByUserId(userId);
    return review ? this.toIdentityRiskReviewView(review) : null;
  }

  private getIdentityConfidence(
    user: UserRecord,
    identityReview?: MarketplaceIdentityRiskReviewRecord | null,
  ) {
    if (identityReview) {
      return identityReview.confidenceLabel;
    }
    if (user.defaultExecutionWalletAddress) {
      const wallet = this.usersService.findWallet(
        user,
        user.defaultExecutionWalletAddress,
      );
      if (wallet && isSmartAccountWallet(wallet)) {
        return 'smart_account_ready' as const;
      }
    }
    return this.getVerifiedWalletAddress(user)
      ? ('wallet_verified' as const)
      : ('email_verified' as const);
  }

  private async resolveEscrowParticipantUserId(
    job: EscrowJobRecord,
    role: 'client' | 'worker',
  ) {
    if (role === 'client') {
      return (
        (
          await this.usersService.getByWalletAddress(job.onchain.clientAddress)
        )?.id ?? null
      );
    }
    if (job.contractorParticipation?.joinedUserId) {
      return job.contractorParticipation.joinedUserId;
    }
    return (
      (await this.usersService.getByWalletAddress(job.onchain.workerAddress))?.id ??
      null
    );
  }

  private async resolveEscrowParticipantRoles(
    user: UserRecord,
    job: EscrowJobRecord,
  ): Promise<Array<'client' | 'worker'>> {
    const roles = new Set<'client' | 'worker'>();
    const normalizedWallets = new Set(
      user.wallets.map((wallet) => normalizeEvmAddress(wallet.address)),
    );
    const clientUserId = await this.resolveEscrowParticipantUserId(job, 'client');
    const workerUserId = await this.resolveEscrowParticipantUserId(job, 'worker');
    if (
      clientUserId === user.id ||
      normalizedWallets.has(normalizeEvmAddress(job.onchain.clientAddress))
    ) {
      roles.add('client');
    }
    if (
      workerUserId === user.id ||
      normalizedWallets.has(normalizeEvmAddress(job.onchain.workerAddress))
    ) {
      roles.add('worker');
    }
    return Array.from(roles);
  }

  private async getRoleJobs(
    user: UserRecord,
    role: 'client' | 'worker',
  ): Promise<EscrowJobRecord[]> {
    const addresses = user.wallets.map((wallet) =>
      normalizeEvmAddress(wallet.address),
    );
    if (addresses.length === 0) {
      return [];
    }
    const jobs = await Promise.all(
      (await this.escrowRepository.listByParticipantAddresses(addresses)).map(
        async (job) => (await this.escrowOnchainAuthority.mergeJob(job)).job,
      ),
    );
    const seen = new Set<string>();
    const matching: EscrowJobRecord[] = [];
    for (const job of jobs) {
      if (seen.has(job.id)) {
        continue;
      }
      const roles = await this.resolveEscrowParticipantRoles(user, job);
      if (roles.includes(role)) {
        seen.add(job.id);
        matching.push(job);
      }
    }
    return matching;
  }

  private async buildReputationSnapshot(
    user: UserRecord,
    role: 'client' | 'worker',
  ): Promise<MarketplaceReputationSnapshot> {
    const escrowStats = await this.getEscrowStats(user, role);
    const visibleReviews = (await this.marketplaceRepository.listReviews()).filter(
      (review) =>
        review.revieweeUserId === user.id &&
        review.revieweeRole === role &&
        review.visibilityStatus === 'visible',
    );
    const ratingBreakdown = {
      oneStar: visibleReviews.filter((review) => review.rating === 1).length,
      twoStar: visibleReviews.filter((review) => review.rating === 2).length,
      threeStar: visibleReviews.filter((review) => review.rating === 3).length,
      fourStar: visibleReviews.filter((review) => review.rating === 4).length,
      fiveStar: visibleReviews.filter((review) => review.rating === 5).length,
    };
    const averageRating =
      visibleReviews.length === 0
        ? null
        : Number(
            (
              visibleReviews.reduce((sum, review) => sum + review.rating, 0) /
              visibleReviews.length
            ).toFixed(1),
          );
    const identityReview =
      await this.marketplaceRepository.getIdentityRiskReviewByUserId(user.id);
    const invites = await this.marketplaceRepository.listOpportunityInvites();
    const applications = await this.marketplaceRepository.listApplications();
    let responseRate: number | null = null;
    let inviteAcceptanceRate: number | null = null;
    if (role === 'worker') {
      const myInvites = invites.filter(
        (invite) => invite.invitedProfileUserId === user.id,
      );
      if (myInvites.length > 0) {
        responseRate = roundPercent(
          myInvites.filter((invite) => invite.status !== 'pending').length,
          myInvites.length,
        );
        inviteAcceptanceRate = roundPercent(
          myInvites.filter((invite) => invite.status === 'applied').length,
          myInvites.length,
        );
      }
    } else {
      const myOpportunityIds = new Set(
        (await this.marketplaceRepository.listOpportunities())
          .filter((opportunity) => opportunity.ownerUserId === user.id)
          .map((opportunity) => opportunity.id),
      );
      const incomingApplications = applications.filter((application) =>
        myOpportunityIds.has(application.opportunityId),
      );
      if (incomingApplications.length > 0) {
        responseRate = roundPercent(
          incomingApplications.filter(
            (application) => application.status !== 'submitted',
          ).length,
          incomingApplications.length,
        );
      }
      const sentInvites = invites.filter((invite) =>
        myOpportunityIds.has(invite.opportunityId),
      );
      if (sentInvites.length > 0) {
        inviteAcceptanceRate = roundPercent(
          sentInvites.filter((invite) => invite.status === 'applied').length,
          sentInvites.length,
        );
      }
    }
    const jobs = await this.getRoleJobs(user, role);
    const totalSubmissions = jobs.reduce(
      (sum, job) => sum + (job.projectRoom?.submissions.length ?? 0),
      0,
    );
    const revisionRequested = jobs.reduce(
      (sum, job) =>
        sum +
        (job.projectRoom?.submissions.filter(
          (submission) => submission.revisionRequest !== null,
        ).length ?? 0),
      0,
    );
    return {
      subjectUserId: user.id,
      role,
      identityConfidence: this.getIdentityConfidence(user, identityReview),
      publicReviewCount: visibleReviews.length,
      averageRating,
      ratingBreakdown,
      totalContracts: escrowStats.totalContracts,
      completionRate: escrowStats.completionRate,
      disputeRate: escrowStats.disputeRate,
      onTimeDeliveryRate: escrowStats.onTimeDeliveryRate,
      responseRate,
      inviteAcceptanceRate,
      revisionRate:
        totalSubmissions > 0
          ? roundPercent(revisionRequested, totalSubmissions)
          : null,
      averageContractValueBand: escrowStats.averageContractValueBand,
    };
  }

  private async listPublicReviewsForUser(
    userId: string,
    revieweeRole: 'client' | 'worker',
    limit = 5,
  ): Promise<MarketplaceReviewView[]> {
    const reviews = (await this.marketplaceRepository.listReviews())
      .filter(
        (review) =>
          review.revieweeUserId === userId &&
          review.revieweeRole === revieweeRole &&
          review.visibilityStatus === 'visible',
      )
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, limit);
    return Promise.all(reviews.map((review) => this.toReviewView(review)));
  }

  private async buildRiskSignalsForUser(
    user: UserRecord,
    role: 'client' | 'worker',
  ): Promise<MarketplaceRiskSignalView[]> {
    const reputation = await this.buildReputationSnapshot(user, role);
    const identityReview =
      await this.marketplaceRepository.getIdentityRiskReviewByUserId(user.id);
    const reviews = await this.marketplaceRepository.listReviews();
    const hiddenReviews = reviews.filter(
      (review) =>
        review.revieweeUserId === user.id &&
        review.revieweeRole === role &&
        review.visibilityStatus === 'hidden',
    ).length;
    const allReports = await this.marketplaceRepository.listAbuseReports();
    const ownedOpportunityIds =
      role === 'client'
        ? new Set(
            (await this.marketplaceRepository.listOpportunities())
              .filter((opportunity) => opportunity.ownerUserId === user.id)
              .map((opportunity) => opportunity.id),
          )
        : new Set<string>();
    const activeReports = allReports.filter((report) => {
      if (!this.isActiveAbuseReport(report)) {
        return false;
      }
      if (role === 'worker') {
        return report.subjectType === 'profile' && report.subjectId === user.id;
      }
      return (
        report.subjectType === 'opportunity' &&
        ownedOpportunityIds.has(report.subjectId)
      );
    });
    const signals: MarketplaceRiskSignalView[] = [];
    const pushSignal = (
      code: MarketplaceRiskSignalCode,
      severity: MarketplaceRiskSignalView['severity'],
      summary: string,
    ) => {
      if (signals.some((signal) => signal.code === code)) {
        return;
      }
      signals.push({ code, severity, summary });
    };
    if (reputation.totalContracts >= 4 && reputation.disputeRate >= 25) {
      pushSignal(
        'high_dispute_rate',
        reputation.disputeRate >= 40 ? 'high' : 'medium',
        `Dispute rate is ${reputation.disputeRate}% across ${reputation.totalContracts} escrow contracts.`,
      );
    }
    if (activeReports.length >= 2) {
      pushSignal(
        'repeat_abuse_reports',
        activeReports.length >= 4 ? 'high' : 'medium',
        `${activeReports.length} active trust-and-safety reports are open for this subject.`,
      );
    }
    if (hiddenReviews > 0) {
      pushSignal(
        'review_hidden_by_operator',
        hiddenReviews >= 2 ? 'medium' : 'low',
        `${hiddenReviews} marketplace review${hiddenReviews === 1 ? ' was' : 's were'} hidden by an operator.`,
      );
    }
    if (identityReview && identityReview.riskLevel !== 'low') {
      pushSignal(
        'identity_mismatch',
        identityReview.riskLevel,
        identityReview.operatorSummary ??
          `Identity review marked this subject as ${identityReview.riskLevel} risk.`,
      );
    }
    if (
      activeReports.some((report) => report.reason === 'off_platform_payment')
    ) {
      pushSignal(
        'off_platform_payment_report',
        'high',
        'An active off-platform payment report is open for this subject.',
      );
    }
    if (
      reputation.revisionRate !== null &&
      reputation.revisionRate >= 35
    ) {
      pushSignal(
        'revision_heavy_delivery',
        reputation.revisionRate >= 60 ? 'high' : 'medium',
        `Revision requests touched ${reputation.revisionRate}% of submitted milestone deliveries.`,
      );
    }
    return signals.sort((left, right) => {
      const order = { low: 0, medium: 1, high: 2 } as const;
      return order[right.severity] - order[left.severity];
    });
  }

  private async toAbuseReportView(
    report: MarketplaceAbuseReportRecord,
  ): Promise<MarketplaceAbuseReportView> {
    const now = Date.now();
    const reporter = await this.usersService.getRequiredById(
      report.reporterUserId,
    );
    const resolvedBy = report.resolvedByUserId
      ? await this.usersService.getRequiredById(report.resolvedByUserId)
      : null;
    const claimedBy = report.claimedByUserId
      ? await this.usersService.getRequiredById(report.claimedByUserId)
      : null;
    const escalatedBy = report.escalatedByUserId
      ? await this.usersService.getRequiredById(report.escalatedByUserId)
      : null;
    const evidenceReviewedBy = report.evidenceReviewedByUserId
      ? await this.usersService.getRequiredById(report.evidenceReviewedByUserId)
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
      claimedBy: claimedBy
        ? {
            userId: claimedBy.id,
            email: claimedBy.email,
          }
        : null,
      claimedAt: report.claimedAt,
      escalationReason: report.escalationReason,
      escalatedBy: escalatedBy
        ? {
            userId: escalatedBy.id,
            email: escalatedBy.email,
          }
        : null,
      escalatedAt: report.escalatedAt,
      evidenceReviewStatus: report.evidenceReviewStatus,
      investigationSummary: report.investigationSummary,
      evidenceReviewedBy: evidenceReviewedBy
        ? {
            userId: evidenceReviewedBy.id,
            email: evidenceReviewedBy.email,
          }
        : null,
      evidenceReviewedAt: report.evidenceReviewedAt,
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
      queuePriority: this.computeAbuseReportQueuePriority(report, now),
      ageHours: this.getAbuseReportAgeHours(report, now),
      hoursSinceUpdate: this.getAbuseReportHoursSinceUpdate(report, now),
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
    opportunity?: MarketplaceOpportunityRecord,
  ): Promise<MarketplaceClientSummary> {
    const profile = await this.marketplaceRepository.getProfileByUserId(
      user.id,
    );

    return {
      userId: user.id,
      organizationId: opportunity?.ownerOrganizationId ?? null,
      workspaceId: opportunity?.ownerWorkspaceId ?? null,
      workspaceKind: 'client',
      displayName: profile?.displayName ?? user.email.split('@')[0] ?? user.id,
      profileSlug: profile?.slug ?? null,
      reputation: await this.buildReputationSnapshot(user, 'client'),
    };
  }

  private async toTalentSummary(
    user: UserRecord,
  ): Promise<MarketplaceTalentSummary> {
    const rawProfile = await this.marketplaceRepository.getProfileByUserId(user.id);
    const profile = rawProfile
      ? await this.ensureProfileWorkspace(rawProfile)
      : null;
    const escrowStats = await this.getEscrowStats(user, 'worker');
    const verifiedWalletAddress = this.getVerifiedWalletAddress(user);

    return {
      userId: user.id,
      organizationId: profile?.organizationId ?? null,
      workspaceId: profile?.workspaceId ?? null,
      workspaceKind: 'freelancer',
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
      reputation: await this.buildReputationSnapshot(user, 'worker'),
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

    const hydratedProfile = await this.ensureProfileWorkspace(profile);
    return [...hydratedProfile.skills, ...hydratedProfile.specialties];
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
    role: 'client' | 'worker' = 'worker',
  ): Promise<MarketplaceEscrowStats> {
    const jobs = await this.getRoleJobs(user, role);
    if (jobs.length === 0) {
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

  private async assertOpportunityOwner(
    userId: string,
    opportunity: MarketplaceOpportunityRecord,
    capability?: keyof WorkspaceSummary['capabilities'],
  ) {
    if (!(await this.canAccessOpportunityAsOwner(userId, opportunity, capability))) {
      const message =
        capability === 'reviewApplications'
          ? 'Only a client workspace with review access can do that'
          : capability === 'createOpportunity'
            ? 'Only a client workspace with authoring access can do that'
            : 'Only the client who owns the opportunity can do that';
      throw new ForbiddenException(
        message,
      );
    }
  }

  private async canAccessOpportunityAsOwner(
    userId: string,
    opportunity: MarketplaceOpportunityRecord,
    capability?: keyof WorkspaceSummary['capabilities'],
  ) {
    const hydratedOpportunity = await this.ensureOpportunityWorkspace(opportunity);
    if (hydratedOpportunity.ownerWorkspaceId) {
      const workspace = await this.organizationsService.findAccessibleWorkspace(
        userId,
        hydratedOpportunity.ownerWorkspaceId,
      );
      if (workspace) {
        return capability ? workspace.capabilities[capability] : true;
      }
      return false;
    }

    return hydratedOpportunity.ownerUserId === userId;
  }

  private async ensureProfileWorkspace(
    profile: MarketplaceProfileRecord,
    workspace?: WorkspaceSummary,
  ) {
    if (profile.organizationId && profile.workspaceId) {
      return profile;
    }

    const nextWorkspace =
      workspace ??
      (await this.requireUserWorkspaceByKind(profile.userId, 'freelancer'));
    const next: MarketplaceProfileRecord = {
      ...profile,
      organizationId: nextWorkspace.organizationId,
      workspaceId: nextWorkspace.workspaceId,
      updatedAt: Date.now(),
    };
    await this.marketplaceRepository.saveProfile(next);
    return next;
  }

  private async ensureOpportunityWorkspace(
    opportunity: MarketplaceOpportunityRecord,
  ) {
    if (opportunity.ownerOrganizationId && opportunity.ownerWorkspaceId) {
      return opportunity;
    }

    const workspace = await this.requireUserWorkspaceByKind(
      opportunity.ownerUserId,
      'client',
    );
    const next: MarketplaceOpportunityRecord = {
      ...opportunity,
      ownerOrganizationId: workspace.organizationId,
      ownerWorkspaceId: workspace.workspaceId,
      updatedAt: Date.now(),
    };
    await this.marketplaceRepository.saveOpportunity(next);
    return next;
  }

  private async ensureApplicationWorkspace(
    application: MarketplaceApplicationRecord,
  ) {
    if (application.applicantOrganizationId && application.applicantWorkspaceId) {
      return application;
    }

    const workspace = await this.requireUserWorkspaceByKind(
      application.applicantUserId,
      'freelancer',
    );
    const next: MarketplaceApplicationRecord = {
      ...application,
      applicantOrganizationId: workspace.organizationId,
      applicantWorkspaceId: workspace.workspaceId,
      updatedAt: Date.now(),
    };
    await this.marketplaceRepository.saveApplication(next);
    return next;
  }

  private async requireUserWorkspaceByKind(
    userId: string,
    workspaceKind: WorkspaceSummary['kind'],
  ) {
    const context = await this.organizationsService.buildWorkspaceContext(userId);
    const workspace =
      context.workspaces.find(
        (candidate) =>
          candidate.kind === workspaceKind &&
          candidate.isDefault,
      ) ??
      context.workspaces.find((candidate) => candidate.kind === workspaceKind) ??
      null;
    if (!workspace) {
      throw new NotFoundException(
        `Workspace ${workspaceKind} not found for marketplace user`,
      );
    }
    return workspace;
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
      claimedByUserId: null,
      claimedAt: null,
      escalationReason: null,
      escalatedByUserId: null,
      escalatedAt: null,
      evidenceReviewStatus: 'pending',
      investigationSummary: null,
      evidenceReviewedByUserId: null,
      evidenceReviewedAt: null,
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
    await this.userCapabilities.requireCapability(
      userId,
      'marketplaceModeration',
    );
  }

  private assertReportClaimedByOperator(
    report: MarketplaceAbuseReportRecord,
    userId: string,
  ) {
    if (report.claimedByUserId === userId) {
      return;
    }

    if (report.claimedByUserId === null) {
      throw new ForbiddenException(
        'Claim the abuse report before updating investigation state',
      );
    }

    throw new ForbiddenException(
      'This abuse report is already claimed by another operator',
    );
  }

  private applyReportClaim(
    report: MarketplaceAbuseReportRecord,
    claimAction: 'claim' | 'release',
    userId: string,
    now: number,
  ) {
    if (claimAction === 'claim') {
      if (report.claimedByUserId && report.claimedByUserId !== userId) {
        throw new ConflictException(
          'This abuse report is already claimed by another operator',
        );
      }

      report.claimedByUserId = userId;
      report.claimedAt = now;
      return;
    }

    if (report.claimedByUserId === null) {
      return;
    }

    if (report.claimedByUserId !== userId) {
      throw new ForbiddenException(
        'Only the operator who claimed this abuse report can release it',
      );
    }

    report.claimedByUserId = null;
    report.claimedAt = null;
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

  private applyReportEscalation(
    report: MarketplaceAbuseReportRecord,
    input: {
      escalationReason: string | null;
      userId: string;
      escalatedAt: number;
    },
  ) {
    report.escalationReason = input.escalationReason;

    if (input.escalationReason === null) {
      report.escalatedByUserId = null;
      report.escalatedAt = null;
      return;
    }

    report.escalatedByUserId = input.userId;
    report.escalatedAt = input.escalatedAt;
  }

  private applyReportEvidenceReview(
    report: MarketplaceAbuseReportRecord,
    input: {
      evidenceReviewStatus: MarketplaceAbuseReportRecord['evidenceReviewStatus'];
      investigationSummary: string | null;
      userId: string;
      reviewedAt: number;
    },
  ) {
    report.evidenceReviewStatus = input.evidenceReviewStatus;
    report.investigationSummary = input.investigationSummary;

    if (
      input.evidenceReviewStatus === 'pending' &&
      input.investigationSummary === null
    ) {
      report.evidenceReviewedByUserId = null;
      report.evidenceReviewedAt = null;
      return;
    }

    report.evidenceReviewedByUserId = input.userId;
    report.evidenceReviewedAt = input.reviewedAt;
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

  private isActiveAbuseReport(report: MarketplaceAbuseReportRecord) {
    return report.status === 'open' || report.status === 'reviewing';
  }

  private getAbuseReportAgeHours(
    report: MarketplaceAbuseReportRecord,
    now: number,
  ) {
    return Math.floor(Math.max(0, now - report.createdAt) / hourMs);
  }

  private getAbuseReportHoursSinceUpdate(
    report: MarketplaceAbuseReportRecord,
    now: number,
  ) {
    return Math.floor(Math.max(0, now - report.updatedAt) / hourMs);
  }

  private isAgingAbuseReport(
    report: MarketplaceAbuseReportRecord,
    now: number,
  ) {
    return (
      this.isActiveAbuseReport(report) &&
      this.getAbuseReportAgeHours(report, now) >= abuseReportAgingHours
    );
  }

  private isStaleAbuseReport(
    report: MarketplaceAbuseReportRecord,
    now: number,
  ) {
    return (
      this.isActiveAbuseReport(report) &&
      this.getAbuseReportHoursSinceUpdate(report, now) >= abuseReportStaleHours
    );
  }

  private computeAbuseReportQueuePriority(
    report: MarketplaceAbuseReportRecord,
    now: number,
  ): MarketplaceAbuseReportQueuePriority {
    if (!this.isActiveAbuseReport(report)) {
      return 'closed';
    }

    if (
      report.escalationReason !== null ||
      (report.claimedByUserId === null && this.isStaleAbuseReport(report, now))
    ) {
      return 'critical';
    }

    if (
      report.claimedByUserId === null ||
      this.isAgingAbuseReport(report, now) ||
      this.isStaleAbuseReport(report, now)
    ) {
      return 'high';
    }

    return 'normal';
  }

  private compareAbuseReportQueue(
    left: MarketplaceAbuseReportRecord,
    right: MarketplaceAbuseReportRecord,
    sortBy: MarketplaceAbuseReportSortBy,
    now: number,
  ) {
    if (sortBy === 'recent_activity') {
      return right.updatedAt - left.updatedAt;
    }

    const activeDiff =
      Number(this.isActiveAbuseReport(right)) -
      Number(this.isActiveAbuseReport(left));

    if (sortBy === 'oldest_open') {
      if (activeDiff !== 0) {
        return activeDiff;
      }

      return (
        left.createdAt - right.createdAt || left.updatedAt - right.updatedAt
      );
    }

    if (sortBy === 'stale_activity') {
      if (activeDiff !== 0) {
        return activeDiff;
      }

      return (
        left.updatedAt - right.updatedAt || left.createdAt - right.createdAt
      );
    }

    const priorityOrder: Record<MarketplaceAbuseReportQueuePriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      closed: 3,
    };
    const leftPriority = this.computeAbuseReportQueuePriority(left, now);
    const rightPriority = this.computeAbuseReportQueuePriority(right, now);
    const priorityDiff =
      priorityOrder[leftPriority] - priorityOrder[rightPriority];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const statusDiff = this.compareAbuseReportPriority(
      left.status,
      right.status,
    );
    if (statusDiff !== 0) {
      return statusDiff;
    }

    const claimDiff =
      Number(left.claimedByUserId !== null) -
      Number(right.claimedByUserId !== null);
    if (claimDiff !== 0) {
      return claimDiff;
    }

    const staleDiff =
      this.getAbuseReportHoursSinceUpdate(right, now) -
      this.getAbuseReportHoursSinceUpdate(left, now);
    if (staleDiff !== 0) {
      return staleDiff;
    }

    return (
      this.getAbuseReportAgeHours(right, now) -
      this.getAbuseReportAgeHours(left, now)
    );
  }
}
