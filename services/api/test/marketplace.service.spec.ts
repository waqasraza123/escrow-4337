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

  it('supports publish, apply, shortlist, and hire into a normal escrow job', async () => {
    await marketplaceService.upsertProfile(clientUserId, {
      slug: 'startup-client',
      displayName: 'Startup Client',
      headline: 'We hire builders',
      bio: 'Funding product work through escrow.',
      skills: ['product', 'design'],
      rateMin: null,
      rateMax: null,
      timezone: 'UTC',
      availability: 'open',
      portfolioUrls: ['https://example.com/client'],
    });
    await marketplaceService.upsertProfile(applicantUserId, {
      slug: 'great-builder',
      displayName: 'Great Builder',
      headline: 'Full-stack contractor',
      bio: 'I ship MVPs quickly.',
      skills: ['typescript', 'design-systems'],
      rateMin: '90',
      rateMax: '140',
      timezone: 'UTC+1',
      availability: 'open',
      portfolioUrls: ['https://example.com/builder'],
    });

    const created = await marketplaceService.createOpportunity(clientUserId, {
      title: 'Founding product engineer',
      summary: 'Ship the first client portal.',
      description: 'We need a contractor to build the first milestone-based portal.',
      category: 'software-development',
      currencyAddress,
      requiredSkills: ['typescript', 'react'],
      visibility: 'public',
      budgetMin: '1000',
      budgetMax: '2500',
      timeline: '2 weeks',
    });

    const published = await marketplaceService.publishOpportunity(
      clientUserId,
      created.opportunity.id,
    );
    expect(published.opportunity.status).toBe('published');
    expect(published.opportunity.escrowReadiness).toBe('ready');

    await marketplaceService.applyToOpportunity(
      applicantUserId,
      created.opportunity.id,
      {
        coverNote: 'I can deliver this in two milestones.',
        proposedRate: '125',
        selectedWalletAddress: applicantAddress,
        portfolioUrls: ['https://example.com/portal-work'],
      },
    );

    const applications = await marketplaceService.getOpportunityApplications(
      clientUserId,
      created.opportunity.id,
    );
    expect(applications.applications).toHaveLength(1);
    expect(applications.applications[0]?.status).toBe('submitted');
    expect(applications.applications[0]?.applicant.profileSlug).toBe('great-builder');

    const shortlisted = await marketplaceService.shortlistApplication(
      clientUserId,
      applications.applications[0]!.id,
    );
    expect(shortlisted.applications[0]?.status).toBe('shortlisted');

    const hired = await marketplaceService.hireApplication(
      clientUserId,
      applications.applications[0]!.id,
    );
    expect(hired.opportunityId).toBe(created.opportunity.id);
    expect(hired.jobId).toBeTruthy();

    const auditBundle = await escrowService.getAuditBundle(hired.jobId);
    expect(auditBundle.bundle.job.title).toBe('Founding product engineer');
    expect(auditBundle.bundle.job.onchain.workerAddress).toBe(applicantAddress);
    expect(auditBundle.bundle.job.contractorParticipation?.status).toBe('pending');

    const myApplications = await marketplaceService.listMyApplications(applicantUserId);
    expect(myApplications.applications[0]?.status).toBe('hired');
    expect(myApplications.applications[0]?.opportunity.title).toBe(
      'Founding product engineer',
    );
  });

  it('requires arbitrator control for moderation actions', async () => {
    await marketplaceService.upsertProfile(applicantUserId, {
      slug: 'moderated-builder',
      displayName: 'Moderated Builder',
      headline: 'Freelancer profile',
      bio: 'Visible until moderation changes it.',
      skills: ['typescript'],
      rateMin: '80',
      rateMax: '120',
      timezone: 'UTC',
      availability: 'open',
      portfolioUrls: ['https://example.com/moderated'],
    });

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

  it('reports moderation dashboard metrics for aging briefs and hire conversion', async () => {
    await marketplaceService.upsertProfile(clientUserId, {
      slug: 'metrics-client',
      displayName: 'Metrics Client',
      headline: 'Publishing briefs',
      bio: 'Tracks marketplace funnel activity.',
      skills: ['product'],
      rateMin: null,
      rateMax: null,
      timezone: 'UTC',
      availability: 'open',
      portfolioUrls: ['https://example.com/metrics-client'],
    });
    await marketplaceService.upsertProfile(applicantUserId, {
      slug: 'metrics-builder',
      displayName: 'Metrics Builder',
      headline: 'Applies to marketplace briefs',
      bio: 'Delivers work through escrow.',
      skills: ['typescript'],
      rateMin: '100',
      rateMax: '160',
      timezone: 'UTC',
      availability: 'open',
      portfolioUrls: ['https://example.com/metrics-builder'],
    });

    const agedOpportunity = await marketplaceService.createOpportunity(clientUserId, {
      title: 'Aged brief',
      summary: 'Needs attention',
      description: 'Published long enough to show in aging.',
      category: 'software-development',
      currencyAddress,
      requiredSkills: ['typescript'],
      visibility: 'public',
      budgetMin: '1000',
      budgetMax: '2000',
      timeline: '2 weeks',
    });
    await marketplaceService.publishOpportunity(clientUserId, agedOpportunity.opportunity.id);

    const storedAgedOpportunity = await marketplaceRepository.getOpportunityById(
      agedOpportunity.opportunity.id,
    );
    expect(storedAgedOpportunity).not.toBeNull();
    await marketplaceRepository.saveOpportunity({
      ...storedAgedOpportunity!,
      publishedAt: Date.now() - 9 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
    });

    const hiredOpportunity = await marketplaceService.createOpportunity(clientUserId, {
      title: 'Hired brief',
      summary: 'Converts into escrow',
      description: 'This brief should count toward hire conversion.',
      category: 'software-development',
      currencyAddress,
      requiredSkills: ['typescript'],
      visibility: 'public',
      budgetMin: '1200',
      budgetMax: '2400',
      timeline: '2 weeks',
    });
    await marketplaceService.publishOpportunity(clientUserId, hiredOpportunity.opportunity.id);
    await marketplaceService.applyToOpportunity(applicantUserId, hiredOpportunity.opportunity.id, {
      coverNote: 'Ready to build this.',
      proposedRate: '125',
      selectedWalletAddress: applicantAddress,
      portfolioUrls: ['https://example.com/hired-brief'],
    });
    const hiredApplications = await marketplaceService.getOpportunityApplications(
      clientUserId,
      hiredOpportunity.opportunity.id,
    );
    await marketplaceService.hireApplication(clientUserId, hiredApplications.applications[0]!.id);

    const dashboard = await marketplaceService.getModerationDashboard(
      arbitratorUserId,
    );
    expect(dashboard.summary.totalProfiles).toBe(2);
    expect(dashboard.summary.totalOpportunities).toBe(2);
    expect(dashboard.summary.publishedOpportunities).toBe(1);
    expect(dashboard.summary.hiredOpportunities).toBe(1);
    expect(dashboard.summary.totalApplications).toBe(1);
    expect(dashboard.summary.hiredApplications).toBe(1);
    expect(dashboard.summary.hireConversionPercent).toBe(50);
    expect(dashboard.summary.agingOpportunityCount).toBe(1);
    expect(dashboard.agingOpportunities[0]?.title).toBe('Aged brief');
  });
});

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
