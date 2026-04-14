import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { MARKETPLACE_REPOSITORY } from '../src/persistence/persistence.tokens';
import type { MarketplaceRepository } from '../src/persistence/persistence.types';
import { EscrowService } from '../src/modules/escrow/escrow.service';
import { MarketplaceModule } from '../src/modules/marketplace/marketplace.module';
import { MarketplaceService } from '../src/modules/marketplace/marketplace.service';
import { UsersService } from '../src/modules/users/users.service';
import { configureFilePersistence } from './support/test-persistence';

const clientAddress = '0x1111111111111111111111111111111111111111';
const clientSmartAccountAddress = '0x5555555555555555555555555555555555555555';
const applicantAddress = '0x3333333333333333333333333333333333333333';
const weakerApplicantAddress = '0x7777777777777777777777777777777777777777';
const arbitratorAddress = '0x2222222222222222222222222222222222222222';
const currencyAddress = '0x4444444444444444444444444444444444444444';

describe('MarketplaceService', () => {
  let marketplaceService: MarketplaceService;
  let escrowService: EscrowService;
  let usersService: UsersService;
  let marketplaceRepository: MarketplaceRepository;
  let moduleRef: TestingModule;
  let cleanupPersistence: (() => void) | undefined;
  let clientUserId: string;
  let applicantUserId: string;
  let weakerApplicantUserId: string;
  let arbitratorUserId: string;

  beforeEach(async () => {
    const persistence = configureFilePersistence();
    cleanupPersistence = persistence.cleanup;
    moduleRef = await Test.createTestingModule({
      imports: [MarketplaceModule],
    }).compile();

    marketplaceService = moduleRef.get(MarketplaceService);
    escrowService = moduleRef.get(EscrowService);
    usersService = moduleRef.get(UsersService);
    marketplaceRepository = moduleRef.get(MARKETPLACE_REPOSITORY);

    clientUserId = await createLinkedUserId(
      usersService,
      'client@example.com',
      clientAddress,
      clientSmartAccountAddress,
    );
    applicantUserId = await createLinkedUserId(
      usersService,
      'applicant@example.com',
      applicantAddress,
    );
    weakerApplicantUserId = await createLinkedUserId(
      usersService,
      'weaker@example.com',
      weakerApplicantAddress,
    );
    arbitratorUserId = await createLinkedUserId(
      usersService,
      'arbitrator@example.com',
      arbitratorAddress,
    );
  });

  afterEach(async () => {
    await moduleRef.close();
    cleanupPersistence?.();
    cleanupPersistence = undefined;
  });

  it('supports publish, apply, shortlist, dossier review, and hire into a normal escrow job', async () => {
    await marketplaceService.upsertProfile(
      clientUserId,
      buildProfileInput({
        slug: 'startup-client',
        displayName: 'Startup Client',
        headline: 'We hire builders',
        bio: 'Funding product work through escrow.',
        skills: ['product', 'design'],
        specialties: ['hiring'],
        preferredEngagements: ['fixed_scope'],
        cryptoReadiness: 'escrow_power_user',
        portfolioUrls: ['https://example.com/client'],
      }),
    );
    await marketplaceService.upsertProfile(
      applicantUserId,
      buildProfileInput({
        slug: 'great-builder',
        displayName: 'Great Builder',
        headline: 'Full-stack contractor',
        bio: 'I ship MVPs quickly.',
        skills: ['typescript', 'design-systems', 'react'],
        specialties: ['marketplaces', 'escrow'],
        rateMin: '90',
        rateMax: '140',
        timezone: 'UTC+1',
        preferredEngagements: ['fixed_scope', 'milestone_retainer'],
        cryptoReadiness: 'wallet_only',
        portfolioUrls: ['https://example.com/builder'],
      }),
    );

    const created = await marketplaceService.createOpportunity(
      clientUserId,
      buildOpportunityInput({
        title: 'Founding product engineer',
        summary: 'Ship the first client portal.',
        description:
          'We need a contractor to build the first milestone-based portal.',
        mustHaveSkills: ['typescript', 'react'],
        outcomes: ['Ship a client portal', 'Integrate escrow dashboards'],
        acceptanceCriteria: ['Responsive UI', 'Wallet-aware onboarding'],
        screeningQuestions: [
          {
            id: 'q1',
            prompt: 'Describe a similar escrow-adjacent build.',
            required: true,
          },
        ],
        cryptoReadinessRequired: 'wallet_only',
      }),
    );

    const published = await marketplaceService.publishOpportunity(
      clientUserId,
      created.opportunity.id,
    );
    expect(published.opportunity.status).toBe('published');
    expect(published.opportunity.escrowReadiness).toBe('ready');

    await marketplaceService.applyToOpportunity(
      applicantUserId,
      created.opportunity.id,
      buildApplicationInput({
        selectedWalletAddress: applicantAddress,
        screeningAnswers: [
          {
            questionId: 'q1',
            answer:
              'Built milestone-based contractor onboarding with wallet verification.',
          },
        ],
      }),
    );

    const applications = await marketplaceService.getOpportunityApplications(
      clientUserId,
      created.opportunity.id,
    );
    expect(applications.applications).toHaveLength(1);
    expect(applications.applications[0]?.status).toBe('submitted');
    expect(applications.applications[0]?.applicant.profileSlug).toBe(
      'great-builder',
    );
    expect(applications.applications[0]?.fitScore).toBeGreaterThan(0);
    expect(applications.applications[0]?.riskFlags).toContain(
      'no_completed_escrow_history',
    );

    const dossier = await marketplaceService.getApplicationDossier(
      clientUserId,
      applications.applications[0].id,
    );
    expect(dossier.dossier.matchSummary.missingRequirements).toHaveLength(0);
    expect(dossier.dossier.recommendation).toBe('review');

    const shortlisted = await marketplaceService.shortlistApplication(
      clientUserId,
      applications.applications[0].id,
    );
    expect(shortlisted.applications[0]?.status).toBe('shortlisted');

    const hired = await marketplaceService.hireApplication(
      clientUserId,
      applications.applications[0].id,
    );
    expect(hired.opportunityId).toBe(created.opportunity.id);
    expect(hired.jobId).toBeTruthy();

    const auditBundle = await escrowService.getAuditBundle(hired.jobId);
    expect(auditBundle.bundle.job.title).toBe('Founding product engineer');
    expect(auditBundle.bundle.job.onchain.workerAddress).toBe(applicantAddress);
    expect(auditBundle.bundle.job.contractorParticipation?.status).toBe(
      'pending',
    );
    expect(auditBundle.bundle.job.termsJSON.marketplace).toMatchObject({
      opportunityId: created.opportunity.id,
      applicationId: applications.applications[0].id,
    });

    const myApplications =
      await marketplaceService.listMyApplications(applicantUserId);
    expect(myApplications.applications[0]?.status).toBe('hired');
    expect(myApplications.applications[0]?.opportunity.title).toBe(
      'Founding product engineer',
    );
  });

  it('ranks stronger applicants ahead of weaker ones using deterministic dossier scoring', async () => {
    await marketplaceService.upsertProfile(
      clientUserId,
      buildProfileInput({
        slug: 'ranking-client',
        displayName: 'Ranking Client',
        headline: 'Hiring for a specific build',
        bio: 'Needs strong fit signals.',
        skills: ['product'],
        specialties: ['marketplace'],
        preferredEngagements: ['fixed_scope'],
        cryptoReadiness: 'escrow_power_user',
        portfolioUrls: ['https://example.com/client'],
      }),
    );
    await marketplaceService.upsertProfile(
      applicantUserId,
      buildProfileInput({
        slug: 'strong-match',
        displayName: 'Strong Match',
        headline: 'Matches must-haves',
        bio: 'Experienced in escrow workflows.',
        skills: ['typescript', 'react', 'wallets'],
        specialties: ['software-development', 'marketplaces'],
        preferredEngagements: ['fixed_scope'],
        cryptoReadiness: 'smart_account_ready',
        portfolioUrls: ['https://example.com/strong'],
      }),
    );
    await marketplaceService.upsertProfile(
      weakerApplicantUserId,
      buildProfileInput({
        slug: 'weaker-match',
        displayName: 'Weaker Match',
        headline: 'Partial fit only',
        bio: 'Generalist without matching proof.',
        skills: ['design'],
        specialties: ['branding'],
        preferredEngagements: ['advisory'],
        cryptoReadiness: 'wallet_only',
        portfolioUrls: ['https://example.com/weaker'],
      }),
    );

    const created = await marketplaceService.createOpportunity(
      clientUserId,
      buildOpportunityInput({
        title: 'Escrow client dashboard',
        summary: 'Build a quality hiring board',
        description: 'Needs exact fit for a crypto-native workflow.',
        mustHaveSkills: ['typescript', 'react'],
        screeningQuestions: [
          {
            id: 'q1',
            prompt: 'How would you structure milestone delivery?',
            required: true,
          },
        ],
        cryptoReadinessRequired: 'smart_account_ready',
      }),
    );
    await marketplaceService.publishOpportunity(
      clientUserId,
      created.opportunity.id,
    );

    await marketplaceService.applyToOpportunity(
      applicantUserId,
      created.opportunity.id,
      buildApplicationInput({
        selectedWalletAddress: applicantAddress,
        screeningAnswers: [
          {
            questionId: 'q1',
            answer:
              'I define milestone acceptance upfront and validate against delivery artifacts.',
          },
        ],
      }),
    );
    await marketplaceService.applyToOpportunity(
      weakerApplicantUserId,
      created.opportunity.id,
      buildApplicationInput({
        selectedWalletAddress: weakerApplicantAddress,
        screeningAnswers: [
          { questionId: 'q1', answer: 'I usually figure it out later.' },
        ],
        deliveryApproach: 'I will adapt as I go.',
        milestonePlanSummary: 'One vague phase.',
      }),
    );

    const matches = await marketplaceService.getOpportunityMatches(
      clientUserId,
      created.opportunity.id,
    );
    expect(matches.matches).toHaveLength(2);
    expect(matches.matches[0]?.matchSummary.fitScore).toBeGreaterThan(
      matches.matches[1]?.matchSummary.fitScore ?? 0,
    );
    expect(matches.matches[0]?.recommendation).toMatch(/strong_match|review/);
    expect(matches.matches[1]?.matchSummary.riskFlags).toContain(
      'must_have_skill_gap',
    );
    expect(
      matches.matches[1]?.matchSummary.missingRequirements.length,
    ).toBeGreaterThan(0);
  });

  it('requires arbitrator control for moderation actions', async () => {
    await marketplaceService.upsertProfile(
      applicantUserId,
      buildProfileInput({
        slug: 'moderated-builder',
        displayName: 'Moderated Builder',
        headline: 'Freelancer profile',
        bio: 'Visible until moderation changes it.',
        skills: ['typescript'],
        specialties: ['frontend'],
        rateMin: '80',
        rateMax: '120',
        preferredEngagements: ['fixed_scope'],
        cryptoReadiness: 'wallet_only',
        portfolioUrls: ['https://example.com/moderated'],
      }),
    );

    await expect(
      marketplaceService.moderateProfile(clientUserId, applicantUserId, {
        moderationStatus: 'hidden',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const moderated = await marketplaceService.moderateProfile(
      arbitratorUserId,
      applicantUserId,
      {
        moderationStatus: 'hidden',
      },
    );
    expect(moderated.profile.slug).toBe('moderated-builder');

    const profiles = await marketplaceService.listProfiles({
      limit: 24,
    });
    expect(profiles.profiles).toHaveLength(0);
  });

  it('captures abuse reports, enforces claim ownership, and closes them with escalation-safe investigation workflow', async () => {
    await marketplaceService.upsertProfile(
      clientUserId,
      buildProfileInput({
        slug: 'reporting-client',
        displayName: 'Reporting Client',
        headline: 'Reviews marketplace trust signals',
        bio: 'Needs safe marketplace intake.',
        skills: ['product'],
        specialties: ['hiring'],
        preferredEngagements: ['fixed_scope'],
        cryptoReadiness: 'escrow_power_user',
        portfolioUrls: ['https://example.com/client-reporting'],
      }),
    );
    await marketplaceService.upsertProfile(
      applicantUserId,
      buildProfileInput({
        slug: 'reported-builder',
        displayName: 'Reported Builder',
        headline: 'Public builder profile',
        bio: 'Visible profile for trust-and-safety review.',
        skills: ['typescript'],
        specialties: ['marketplaces'],
        preferredEngagements: ['fixed_scope'],
        cryptoReadiness: 'wallet_only',
        portfolioUrls: ['https://example.com/reported-builder'],
      }),
    );

    const opportunity = await marketplaceService.createOpportunity(
      clientUserId,
      buildOpportunityInput({
        title: 'Reported brief',
        summary: 'Needs moderation visibility',
        description: 'This brief is used to verify abuse report intake.',
      }),
    );
    await marketplaceService.publishOpportunity(
      clientUserId,
      opportunity.opportunity.id,
    );

    const profileReport = await marketplaceService.reportProfile(
      clientUserId,
      'reported-builder',
      {
        reason: 'impersonation',
        details: 'This profile copied another contractor portfolio.',
        evidenceUrls: ['https://example.com/evidence/profile'],
      },
    );
    expect(profileReport.report.status).toBe('open');

    await expect(
      marketplaceService.reportProfile(clientUserId, 'reported-builder', {
        reason: 'spam',
        details: 'Duplicate active report should be blocked.',
        evidenceUrls: [],
      }),
    ).rejects.toThrow(
      'You already have an active abuse report for this marketplace item',
    );

    const opportunityReport = await marketplaceService.reportOpportunity(
      applicantUserId,
      opportunity.opportunity.id,
      {
        reason: 'off_platform_payment',
        details: 'The brief requested direct settlement outside escrow.',
        evidenceUrls: ['https://example.com/evidence/opportunity'],
      },
    );
    expect(opportunityReport.report.subject.type).toBe('opportunity');

    const agedOpportunityReport =
      await marketplaceRepository.getAbuseReportById(
        opportunityReport.report.id,
      );
    if (!agedOpportunityReport) {
      throw new Error('Expected opportunity report to exist');
    }
    agedOpportunityReport.createdAt -= 72 * 60 * 60 * 1000;
    agedOpportunityReport.updatedAt -= 30 * 60 * 60 * 1000;
    await marketplaceRepository.saveAbuseReport(agedOpportunityReport);

    const openReports = await marketplaceService.listModerationReports(
      arbitratorUserId,
      { limit: 50, status: 'open' },
    );
    expect(openReports.reports).toHaveLength(2);

    const oldestOpenReports = await marketplaceService.listModerationReports(
      arbitratorUserId,
      { limit: 50, sortBy: 'oldest_open' },
    );
    expect(oldestOpenReports.reports[0]?.id).toBe(opportunityReport.report.id);

    await expect(
      marketplaceService.updateModerationReport(
        arbitratorUserId,
        profileReport.report.id,
        {
          status: 'reviewing',
          escalationReason: 'Needs policy confirmation first.',
        },
      ),
    ).rejects.toThrow(
      'Claim the abuse report before updating investigation state',
    );

    const claimedReport = await marketplaceService.updateModerationReport(
      arbitratorUserId,
      profileReport.report.id,
      {
        status: 'open',
        claimAction: 'claim',
      },
    );
    expect(claimedReport.report.claimedBy?.email).toBe(
      'arbitrator@example.com',
    );

    const escalatedReport = await marketplaceService.updateModerationReport(
      arbitratorUserId,
      profileReport.report.id,
      {
        status: 'reviewing',
        escalationReason: 'Needs policy confirmation first.',
      },
    );
    expect(escalatedReport.report.status).toBe('reviewing');
    expect(escalatedReport.report.escalationReason).toContain(
      'policy confirmation',
    );
    expect(escalatedReport.report.escalatedBy?.email).toBe(
      'arbitrator@example.com',
    );

    await expect(
      marketplaceService.updateModerationReport(
        arbitratorUserId,
        profileReport.report.id,
        {
          status: 'resolved',
          escalationReason: 'Still blocked on policy input.',
          evidenceReviewStatus: 'supports_report',
          investigationSummary: 'Escalated review cannot be closed yet.',
          resolutionNote: 'Closing while escalated should fail.',
        },
      ),
    ).rejects.toThrow('Clear escalation before closing an abuse report');

    const clearedEscalation = await marketplaceService.updateModerationReport(
      arbitratorUserId,
      profileReport.report.id,
      {
        status: 'reviewing',
        escalationReason: null,
      },
    );
    expect(clearedEscalation.report.escalationReason).toBeNull();

    await expect(
      marketplaceService.updateModerationReport(
        arbitratorUserId,
        opportunityReport.report.id,
        {
          status: 'resolved',
          resolutionNote: 'Closing without evidence review should fail.',
        },
      ),
    ).rejects.toThrow(
      'Claim the abuse report before updating investigation state',
    );

    await expect(
      marketplaceService.updateModerationReport(
        arbitratorUserId,
        profileReport.report.id,
        {
          status: 'resolved',
          resolutionNote: 'Closing without evidence review should fail.',
        },
      ),
    ).rejects.toThrow(
      'Evidence review status is required when closing an abuse report',
    );

    const closedReport = await marketplaceService.updateModerationReport(
      arbitratorUserId,
      profileReport.report.id,
      {
        status: 'resolved',
        evidenceReviewStatus: 'supports_report',
        investigationSummary:
          'Evidence links match the existing impersonation complaint and profile claims.',
        resolutionNote: 'Profile hidden pending owner response.',
        subjectModerationStatus: 'hidden',
      },
    );
    expect(closedReport.report.status).toBe('resolved');
    expect(closedReport.report.evidenceReviewStatus).toBe('supports_report');
    expect(closedReport.report.investigationSummary).toContain(
      'impersonation complaint',
    );
    expect(closedReport.report.evidenceReviewedBy?.email).toBe(
      'arbitrator@example.com',
    );
    expect(closedReport.report.claimedBy?.email).toBe('arbitrator@example.com');
    expect(closedReport.report.resolvedBy?.email).toBe(
      'arbitrator@example.com',
    );
    expect(closedReport.report.subjectModerationStatus).toBe('hidden');
    expect(closedReport.report.subjectModeratedBy?.email).toBe(
      'arbitrator@example.com',
    );

    const moderatedProfile =
      await marketplaceRepository.getProfileByUserId(applicantUserId);
    expect(moderatedProfile?.moderationStatus).toBe('hidden');

    const supportsReports = await marketplaceService.listModerationReports(
      arbitratorUserId,
      {
        limit: 50,
        claimState: 'claimed',
        evidenceReviewStatus: 'supports_report',
      },
    );
    expect(supportsReports.reports).toHaveLength(1);
    expect(supportsReports.reports[0]?.id).toBe(profileReport.report.id);

    const escalatedReports = await marketplaceService.listModerationReports(
      arbitratorUserId,
      {
        limit: 50,
        escalated: true,
      },
    );
    expect(escalatedReports.reports).toHaveLength(0);

    const dashboard =
      await marketplaceService.getModerationDashboard(arbitratorUserId);
    expect(dashboard.summary.totalAbuseReports).toBe(2);
    expect(dashboard.summary.openAbuseReports).toBe(1);
    expect(dashboard.summary.reviewingAbuseReports).toBe(0);
    expect(dashboard.summary.claimedAbuseReports).toBe(0);
    expect(dashboard.summary.unclaimedAbuseReports).toBe(1);
    expect(dashboard.summary.escalatedAbuseReports).toBe(0);
    expect(dashboard.summary.agingAbuseReports).toBe(1);
    expect(dashboard.summary.staleAbuseReports).toBe(1);
    expect(
      dashboard.summary.oldestActiveAbuseReportHours,
    ).toBeGreaterThanOrEqual(72);
    expect(dashboard.thresholds.abuseReportAgingHours).toBe(48);
    expect(dashboard.thresholds.abuseReportStaleHours).toBe(24);
    expect(dashboard.recentAbuseReports).toHaveLength(2);
    expect(dashboard.recentAbuseReports[0]?.id).toBe(
      opportunityReport.report.id,
    );
  });

  it('reports moderation dashboard metrics for aging briefs and hire conversion', async () => {
    await marketplaceService.upsertProfile(
      clientUserId,
      buildProfileInput({
        slug: 'metrics-client',
        displayName: 'Metrics Client',
        headline: 'Publishing briefs',
        bio: 'Tracks marketplace funnel activity.',
        skills: ['product'],
        specialties: ['hiring'],
        preferredEngagements: ['fixed_scope'],
        cryptoReadiness: 'escrow_power_user',
        portfolioUrls: ['https://example.com/metrics-client'],
      }),
    );
    await marketplaceService.upsertProfile(
      applicantUserId,
      buildProfileInput({
        slug: 'metrics-builder',
        displayName: 'Metrics Builder',
        headline: 'Applies to marketplace briefs',
        bio: 'Delivers work through escrow.',
        skills: ['typescript'],
        specialties: ['software-development'],
        rateMin: '100',
        rateMax: '160',
        preferredEngagements: ['fixed_scope'],
        cryptoReadiness: 'wallet_only',
        portfolioUrls: ['https://example.com/metrics-builder'],
      }),
    );

    const agedOpportunity = await marketplaceService.createOpportunity(
      clientUserId,
      buildOpportunityInput({
        title: 'Aged brief',
        summary: 'Needs attention',
        description: 'Published long enough to show in aging.',
      }),
    );
    await marketplaceService.publishOpportunity(
      clientUserId,
      agedOpportunity.opportunity.id,
    );

    const storedAgedOpportunity =
      await marketplaceRepository.getOpportunityById(
        agedOpportunity.opportunity.id,
      );
    expect(storedAgedOpportunity).not.toBeNull();
    await marketplaceRepository.saveOpportunity({
      ...storedAgedOpportunity!,
      publishedAt: Date.now() - 9 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
    });

    const hiredOpportunity = await marketplaceService.createOpportunity(
      clientUserId,
      buildOpportunityInput({
        title: 'Hired brief',
        summary: 'Converts into escrow',
        description: 'This brief should count toward hire conversion.',
      }),
    );
    await marketplaceService.publishOpportunity(
      clientUserId,
      hiredOpportunity.opportunity.id,
    );
    await marketplaceService.applyToOpportunity(
      applicantUserId,
      hiredOpportunity.opportunity.id,
      buildApplicationInput({
        selectedWalletAddress: applicantAddress,
      }),
    );
    const hiredApplications =
      await marketplaceService.getOpportunityApplications(
        clientUserId,
        hiredOpportunity.opportunity.id,
      );
    await marketplaceService.hireApplication(
      clientUserId,
      hiredApplications.applications[0].id,
    );

    const dashboard =
      await marketplaceService.getModerationDashboard(arbitratorUserId);
    expect(dashboard.summary.totalProfiles).toBe(2);
    expect(dashboard.summary.totalOpportunities).toBe(2);
    expect(dashboard.summary.publishedOpportunities).toBe(1);
    expect(dashboard.summary.hiredOpportunities).toBe(1);
    expect(dashboard.summary.totalApplications).toBe(1);
    expect(dashboard.summary.hiredApplications).toBe(1);
    expect(dashboard.summary.hireConversionPercent).toBe(50);
    expect(dashboard.summary.agingOpportunityCount).toBe(1);
    expect(dashboard.summary.totalAbuseReports).toBe(0);
    expect(dashboard.summary.openAbuseReports).toBe(0);
    expect(dashboard.summary.reviewingAbuseReports).toBe(0);
    expect(dashboard.agingOpportunities[0]?.title).toBe('Aged brief');
    expect(dashboard.recentAbuseReports).toHaveLength(0);
  });
});

function buildProfileInput(
  overrides: Partial<{
    slug: string;
    displayName: string;
    headline: string;
    bio: string;
    skills: string[];
    specialties: string[];
    rateMin: string | null;
    rateMax: string | null;
    timezone: string;
    availability: 'open' | 'limited' | 'unavailable';
    preferredEngagements: Array<
      'fixed_scope' | 'milestone_retainer' | 'advisory'
    >;
    cryptoReadiness:
      | 'wallet_only'
      | 'smart_account_ready'
      | 'escrow_power_user';
    portfolioUrls: string[];
  }>,
) {
  return {
    slug: 'default-profile',
    displayName: 'Default Profile',
    headline: 'Default headline',
    bio: 'Default profile bio.',
    skills: ['typescript'],
    specialties: ['software-development'],
    rateMin: null,
    rateMax: null,
    timezone: 'UTC',
    availability: 'open' as const,
    preferredEngagements: ['fixed_scope'] as Array<
      'fixed_scope' | 'milestone_retainer' | 'advisory'
    >,
    cryptoReadiness: 'wallet_only' as const,
    portfolioUrls: ['https://example.com/default'],
    ...overrides,
  };
}

function buildOpportunityInput(
  overrides: Partial<{
    title: string;
    summary: string;
    description: string;
    category: string;
    currencyAddress: string;
    requiredSkills: string[];
    mustHaveSkills: string[];
    outcomes: string[];
    acceptanceCriteria: string[];
    screeningQuestions: Array<{
      id: string;
      prompt: string;
      required: boolean;
    }>;
    visibility: 'public' | 'private';
    budgetMin: string | null;
    budgetMax: string | null;
    timeline: string;
    desiredStartAt: number | null;
    timezoneOverlapHours: number | null;
    engagementType: 'fixed_scope' | 'milestone_retainer' | 'advisory';
    cryptoReadinessRequired:
      | 'wallet_only'
      | 'smart_account_ready'
      | 'escrow_power_user';
  }>,
) {
  return {
    title: 'Marketplace brief',
    summary: 'Structured hiring summary',
    description: 'Detailed hiring description.',
    category: 'software-development',
    currencyAddress,
    requiredSkills: ['typescript'],
    mustHaveSkills: ['typescript'],
    outcomes: ['Deliver a working milestone'],
    acceptanceCriteria: ['Pass client review'],
    screeningQuestions: [],
    visibility: 'public' as const,
    budgetMin: '1000',
    budgetMax: '2500',
    timeline: '2 weeks',
    desiredStartAt: null,
    timezoneOverlapHours: 3,
    engagementType: 'fixed_scope' as const,
    cryptoReadinessRequired: 'wallet_only' as const,
    ...overrides,
  };
}

function buildApplicationInput(
  overrides: Partial<{
    coverNote: string;
    proposedRate: string | null;
    selectedWalletAddress: string;
    screeningAnswers: Array<{ questionId: string; answer: string }>;
    deliveryApproach: string;
    milestonePlanSummary: string;
    estimatedStartAt: number | null;
    relevantProofArtifacts: Array<{
      id: string;
      label: string;
      url: string;
      kind:
        | 'portfolio'
        | 'escrow_delivery'
        | 'escrow_case'
        | 'external_case_study';
      jobId: string | null;
    }>;
    portfolioUrls: string[];
  }>,
) {
  return {
    coverNote:
      'I can deliver this in two milestones with clear acceptance criteria.',
    proposedRate: '125',
    selectedWalletAddress: applicantAddress,
    screeningAnswers: [],
    deliveryApproach:
      'I de-risk scope first, then deliver milestone checkpoints tied to acceptance criteria.',
    milestonePlanSummary:
      'Milestone 1 covers planning and foundation. Milestone 2 covers delivery and handoff.',
    estimatedStartAt: null,
    relevantProofArtifacts: [
      {
        id: 'proof-1',
        label: 'Case study',
        url: 'https://example.com/case-study',
        kind: 'external_case_study' as const,
        jobId: null,
      },
    ],
    portfolioUrls: ['https://example.com/portal-work'],
    ...overrides,
  };
}

async function createLinkedUserId(
  usersService: UsersService,
  email: string,
  walletAddress: string,
  smartAccountAddress?: string,
) {
  const user = await usersService.getOrCreateByEmail(email);
  const verifiedAt = Date.now();
  await usersService.linkWallet(user.id, {
    address: walletAddress,
    walletKind: 'eoa',
    verificationMethod: 'siwe',
    verificationChainId: 84532,
    verifiedAt,
  });

  if (smartAccountAddress) {
    await usersService.linkWallet(user.id, {
      address: smartAccountAddress,
      walletKind: 'smart_account',
      ownerAddress: walletAddress,
      recoveryAddress: walletAddress,
      chainId: 84532,
      providerKind: 'mock',
      entryPointAddress: '0x0000000000000000000000000000000000000007',
      factoryAddress: '0x0000000000000000000000000000000000000008',
      sponsorshipPolicy: 'sponsored',
      provisionedAt: verifiedAt,
    });
    await usersService.setDefaultExecutionWallet(user.id, smartAccountAddress);
  }

  return user.id;
}
