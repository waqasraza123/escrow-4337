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
const currencyAddress = '0x4444444444444444444444444444444444444444';

describe('MarketplaceController integration', () => {
  let controller: MarketplaceController;
  let usersService: UsersService;
  let moduleRef: TestingModule;
  let cleanupPersistence: (() => void) | undefined;
  let clientUser: ReqUser;
  let applicantUser: ReqUser;

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
        timezone: 'UTC',
        availability: 'open',
        portfolioUrls: [],
      }),
    ).toThrow(BadRequestException);
  });

  it('supports creating, publishing, applying to, and hiring an opportunity through the controller', async () => {
    await controller.upsertProfile(clientUser, {
      slug: 'client-one',
      displayName: 'Client One',
      headline: 'Hiring through escrow',
      bio: 'Client brief owner',
      skills: ['product'],
      rateMin: null,
      rateMax: null,
      timezone: 'UTC',
      availability: 'open',
      portfolioUrls: ['https://example.com/client-one'],
    });

    await controller.upsertProfile(applicantUser, {
      slug: 'builder-one',
      displayName: 'Builder One',
      headline: 'Contractor profile',
      bio: 'Applicant bio',
      skills: ['react', 'typescript'],
      rateMin: '90',
      rateMax: '150',
      timezone: 'UTC+1',
      availability: 'open',
      portfolioUrls: ['https://example.com/builder-one'],
    });

    const created = await controller.createOpportunity(clientUser, {
      title: 'Marketplace portal',
      summary: 'Ship the first portal',
      description: 'Need a contractor who can build the first portal quickly.',
      category: 'software-development',
      currencyAddress,
      requiredSkills: ['react', 'typescript'],
      visibility: 'public',
      budgetMin: '1200',
      budgetMax: '2400',
      timeline: '2 weeks',
    });
    expect(created.opportunity.status).toBe('draft');

    const published = await controller.publishOpportunity(
      clientUser,
      created.opportunity.id,
    );
    expect(published.opportunity.status).toBe('published');

    await controller.applyToOpportunity(applicantUser, created.opportunity.id, {
      coverNote: 'I can deliver this in two milestones.',
      proposedRate: '130',
      selectedWalletAddress: applicantAddress,
      portfolioUrls: ['https://example.com/case-study'],
    });

    const applications = await controller.getOpportunityApplications(
      clientUser,
      created.opportunity.id,
    );
    expect(applications.applications).toHaveLength(1);

    const hired = await controller.hireApplication(
      clientUser,
      applications.applications[0]!.id,
    );
    expect(hired.opportunityId).toBe(created.opportunity.id);
    expect(hired.jobId).toBeTruthy();
  });

  it('keeps private briefs out of the public feed while allowing direct detail access', async () => {
    await controller.upsertProfile(clientUser, {
      slug: 'private-client',
      displayName: 'Private Client',
      headline: 'Runs private searches',
      bio: 'Uses direct brief links for curated outreach.',
      skills: ['product'],
      rateMin: null,
      rateMax: null,
      timezone: 'UTC',
      availability: 'open',
      portfolioUrls: ['https://example.com/private-client'],
    });

    const created = await controller.createOpportunity(clientUser, {
      title: 'Private brief',
      summary: 'Invite-only brief',
      description: 'Should not appear in the public browse feed.',
      category: 'software-development',
      currencyAddress,
      requiredSkills: ['react'],
      visibility: 'private',
      budgetMin: '900',
      budgetMax: '1800',
      timeline: '10 days',
    });

    await controller.publishOpportunity(clientUser, created.opportunity.id);

    const publicFeed = await controller.listOpportunities({ limit: 24 });
    expect(publicFeed.opportunities).toHaveLength(0);

    const detail = await controller.getOpportunity(created.opportunity.id);
    expect(detail.opportunity.id).toBe(created.opportunity.id);
    expect(detail.opportunity.visibility).toBe('private');
  });
});

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
