import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { ReqUser } from '../src/common/decorators/user.decorator';
import { ZodValidationPipe } from '../src/common/zod.pipe';
import { MarketplaceController } from '../src/modules/marketplace/marketplace.controller';
import { MarketplaceModule } from '../src/modules/marketplace/marketplace.module';
import * as marketplaceDto from '../src/modules/marketplace/marketplace.dto';
import { UsersService } from '../src/modules/users/users.service';
import { configureFilePersistence } from './support/test-persistence';

const clientAddress = '0x1111111111111111111111111111111111111111';
const clientSmartAccountAddress = '0x5555555555555555555555555555555555555555';
const applicantAddress = '0x3333333333333333333333333333333333333333';
const arbitratorAddress = '0x2222222222222222222222222222222222222222';
const currencyAddress = '0x4444444444444444444444444444444444444444';

describe('MarketplaceController integration', () => {
  let controller: MarketplaceController;
  let usersService: UsersService;
  let moduleRef: TestingModule;
  let cleanupPersistence: (() => void) | undefined;
  let clientUser: ReqUser;
  let applicantUser: ReqUser;
  let arbitratorUser: ReqUser;

  beforeEach(async () => {
    const persistence = configureFilePersistence();
    cleanupPersistence = persistence.cleanup;

    moduleRef = await Test.createTestingModule({
      imports: [MarketplaceModule],
    }).compile();

    controller = moduleRef.get(MarketplaceController);
    usersService = moduleRef.get(UsersService);
    clientUser = await createLinkedUser(
      usersService,
      'client@example.com',
      clientAddress,
      clientSmartAccountAddress,
    );
    applicantUser = await createLinkedUser(
      usersService,
      'applicant@example.com',
      applicantAddress,
    );
    arbitratorUser = await createLinkedUser(
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

  it('rejects invalid marketplace profile payloads', () => {
    const pipe = new ZodValidationPipe(
      marketplaceDto.upsertMarketplaceProfileSchema,
    );

    expect(() =>
      pipe.transform({
        slug: 'bad slug',
        displayName: '',
        headline: 'x',
        bio: 'y',
        skills: [],
        specialties: [],
        timezone: 'UTC',
        availability: 'open',
        preferredEngagements: [],
        cryptoReadiness: 'wallet_only',
        portfolioUrls: [],
      }),
    ).toThrow(BadRequestException);
  });

  it('supports creating, publishing, applying to, reviewing, and hiring an opportunity through the controller', async () => {
    await controller.upsertProfile(
      clientUser,
      buildProfileInput({
        slug: 'client-one',
        displayName: 'Client One',
        headline: 'Hiring through escrow',
        bio: 'Client brief owner',
        skills: ['product'],
        specialties: ['marketplace'],
        preferredEngagements: ['fixed_scope'],
        cryptoReadiness: 'escrow_power_user',
        portfolioUrls: ['https://example.com/client-one'],
      }),
    );

    await controller.upsertProfile(
      applicantUser,
      buildProfileInput({
        slug: 'builder-one',
        displayName: 'Builder One',
        headline: 'Contractor profile',
        bio: 'Applicant bio',
        skills: ['react', 'typescript'],
        specialties: ['software-development'],
        rateMin: '90',
        rateMax: '150',
        timezone: 'UTC+1',
        preferredEngagements: ['fixed_scope'],
        cryptoReadiness: 'wallet_only',
        portfolioUrls: ['https://example.com/builder-one'],
      }),
    );

    const created = await controller.createOpportunity(
      clientUser,
      buildOpportunityInput({
        title: 'Marketplace portal',
        summary: 'Ship the first portal',
        description:
          'Need a contractor who can build the first portal quickly.',
        requiredSkills: ['react', 'typescript'],
        mustHaveSkills: ['react'],
        outcomes: ['Deliver the portal'],
        acceptanceCriteria: ['Responsive views'],
        screeningQuestions: [
          {
            id: 'q1',
            prompt: 'How would you structure milestone delivery?',
            required: true,
          },
        ],
      }),
    );
    expect(created.opportunity.status).toBe('draft');

    const published = await controller.publishOpportunity(
      clientUser,
      created.opportunity.id,
    );
    expect(published.opportunity.status).toBe('published');

    await controller.applyToOpportunity(
      applicantUser,
      created.opportunity.id,
      buildApplicationInput({
        selectedWalletAddress: applicantAddress,
        screeningAnswers: [
          {
            questionId: 'q1',
            answer:
              'I align acceptance criteria up front and deliver milestone evidence.',
          },
        ],
      }),
    );

    const applications = await controller.getOpportunityApplications(
      clientUser,
      created.opportunity.id,
    );
    expect(applications.applications).toHaveLength(1);
    expect(applications.applications[0]?.fitScore).toBeGreaterThan(0);

    const matches = await controller.getOpportunityMatches(
      clientUser,
      created.opportunity.id,
    );
    expect(matches.matches).toHaveLength(1);
    expect(matches.matches[0]?.matchSummary.fitScore).toBeGreaterThan(0);

    const dossier = await controller.getApplicationDossier(
      clientUser,
      applications.applications[0].id,
    );
    expect(dossier.dossier.matchSummary.missingRequirements).toHaveLength(0);

    const hired = await controller.hireApplication(
      clientUser,
      applications.applications[0].id,
    );
    expect(hired.opportunityId).toBe(created.opportunity.id);
    expect(hired.jobId).toBeTruthy();

    const myApplications = await controller.listMyApplications(applicantUser);
    expect(myApplications.applications[0]?.contractPath).toMatch(
      new RegExp(`^/app/contracts/${hired.jobId}\\?invite=`),
    );
  });

  it('keeps private briefs out of the public feed while allowing direct detail access', async () => {
    await controller.upsertProfile(
      clientUser,
      buildProfileInput({
        slug: 'private-client',
        displayName: 'Private Client',
        headline: 'Runs private searches',
        bio: 'Uses direct brief links for curated outreach.',
        skills: ['product'],
        specialties: ['hiring'],
        preferredEngagements: ['fixed_scope'],
        cryptoReadiness: 'escrow_power_user',
        portfolioUrls: ['https://example.com/private-client'],
      }),
    );

    const created = await controller.createOpportunity(
      clientUser,
      buildOpportunityInput({
        title: 'Private brief',
        summary: 'Invite-only brief',
        description: 'Should not appear in the public browse feed.',
        requiredSkills: ['react'],
        mustHaveSkills: ['react'],
        visibility: 'private',
      }),
    );

    await controller.publishOpportunity(clientUser, created.opportunity.id);

    const publicFeed = await controller.listOpportunities({ limit: 24 });
    expect(publicFeed.opportunities).toHaveLength(0);

    const detail = await controller.getOpportunity(created.opportunity.id);
    expect(detail.opportunity.id).toBe(created.opportunity.id);
    expect(detail.opportunity.visibility).toBe('private');
  });

  it('accepts abuse reports through the controller and exposes claim plus escalation-aware moderation updates', async () => {
    await controller.upsertProfile(
      clientUser,
      buildProfileInput({
        slug: 'client-report-subject',
        displayName: 'Client Report Subject',
        headline: 'Owns the brief',
        bio: 'Used for abuse reporting integration.',
        skills: ['product'],
        specialties: ['hiring'],
        preferredEngagements: ['fixed_scope'],
        cryptoReadiness: 'escrow_power_user',
        portfolioUrls: ['https://example.com/client-report-subject'],
      }),
    );
    await controller.upsertProfile(
      applicantUser,
      buildProfileInput({
        slug: 'builder-report-subject',
        displayName: 'Builder Report Subject',
        headline: 'Visible contractor profile',
        bio: 'Public profile for reporting.',
        skills: ['react', 'typescript'],
        specialties: ['marketplaces'],
        preferredEngagements: ['fixed_scope'],
        cryptoReadiness: 'wallet_only',
        portfolioUrls: ['https://example.com/builder-report-subject'],
      }),
    );

    const created = await controller.createOpportunity(
      clientUser,
      buildOpportunityInput({
        title: 'Moderated brief',
        summary: 'Used for operator queue validation',
        description: 'Exercises abuse report intake.',
      }),
    );
    await controller.publishOpportunity(clientUser, created.opportunity.id);

    const profileReport = await controller.reportProfile(
      clientUser,
      'builder-report-subject',
      {
        reason: 'spam',
        details: 'This profile is spamming copied replies.',
        evidenceUrls: ['https://example.com/evidence/profile'],
      },
    );
    expect(profileReport.report.subject.type).toBe('profile');

    const opportunityReport = await controller.reportOpportunity(
      applicantUser,
      created.opportunity.id,
      {
        reason: 'policy_violation',
        details: 'The brief requests an unsupported workflow.',
        evidenceUrls: [],
      },
    );
    expect(opportunityReport.report.subject.type).toBe('opportunity');

    const reports = await controller.listModerationReports(arbitratorUser, {
      limit: 50,
    });
    expect(reports.reports).toHaveLength(2);

    const oldestOpenReports = await controller.listModerationReports(
      arbitratorUser,
      {
        limit: 50,
        sortBy: 'oldest_open',
      },
    );
    expect(oldestOpenReports.reports[0]?.id).toBe(profileReport.report.id);

    const claimed = await controller.updateModerationReport(
      arbitratorUser,
      profileReport.report.id,
      {
        status: 'open',
        claimAction: 'claim',
      },
    );
    expect(claimed.report.claimedBy?.email).toBe('arbitrator@example.com');

    const escalated = await controller.updateModerationReport(
      arbitratorUser,
      profileReport.report.id,
      {
        status: 'reviewing',
        escalationReason: 'Needs policy confirmation.',
      },
    );
    expect(escalated.report.escalationReason).toContain('policy confirmation');

    const escalatedOnly = await controller.listModerationReports(
      arbitratorUser,
      {
        limit: 50,
        escalated: true,
      },
    );
    expect(escalatedOnly.reports).toHaveLength(1);
    expect(escalatedOnly.reports[0]?.id).toBe(profileReport.report.id);

    const updated = await controller.updateModerationReport(
      arbitratorUser,
      profileReport.report.id,
      {
        status: 'dismissed',
        escalationReason: null,
        evidenceReviewStatus: 'insufficient_evidence',
        investigationSummary:
          'The report includes screenshots, but they do not tie the account to the alleged behavior.',
        resolutionNote: 'Insufficient evidence after review.',
        subjectModerationStatus: 'visible',
      },
    );
    expect(updated.report.status).toBe('dismissed');
    expect(updated.report.evidenceReviewStatus).toBe('insufficient_evidence');
    expect(updated.report.investigationSummary).toContain(
      'do not tie the account',
    );
    expect(updated.report.resolutionNote).toContain('Insufficient evidence');
    expect(updated.report.subjectModerationStatus).toBe('visible');
    expect(updated.report.claimedBy?.email).toBe('arbitrator@example.com');
    expect(updated.report.escalationReason).toBeNull();

    const filtered = await controller.listModerationReports(arbitratorUser, {
      limit: 50,
      claimState: 'claimed',
      evidenceReviewStatus: 'insufficient_evidence',
    });
    expect(filtered.reports).toHaveLength(1);
    expect(filtered.reports[0]?.id).toBe(profileReport.report.id);
    expect(opportunityReport.report.id).not.toBe(profileReport.report.id);
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
    bio: 'Default bio',
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
    title: 'Marketplace portal',
    summary: 'Ship the first portal',
    description: 'Need a contractor who can build the first portal quickly.',
    category: 'software-development',
    currencyAddress,
    requiredSkills: ['react', 'typescript'],
    mustHaveSkills: ['react'],
    outcomes: ['Deliver the portal'],
    acceptanceCriteria: ['Responsive views'],
    screeningQuestions: [],
    visibility: 'public' as const,
    budgetMin: '1200',
    budgetMax: '2400',
    timeline: '2 weeks',
    desiredStartAt: null,
    timezoneOverlapHours: 4,
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
    coverNote: 'I can deliver this in two milestones.',
    proposedRate: '130',
    selectedWalletAddress: applicantAddress,
    screeningAnswers: [],
    deliveryApproach:
      'I start with acceptance criteria and convert them into milestone checkpoints.',
    milestonePlanSummary:
      'Milestone 1 covers setup and first delivery. Milestone 2 covers refinement and handoff.',
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
    portfolioUrls: ['https://example.com/case-study'],
    ...overrides,
  };
}

async function createLinkedUser(
  usersService: UsersService,
  email: string,
  walletAddress: string,
  smartAccountAddress?: string,
): Promise<ReqUser> {
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

  return {
    id: user.id,
    email,
    sid: `sid-${user.id}`,
  };
}
