import { screen, waitFor } from '@testing-library/react';
import {
  renderApp,
  seedJsonStorage,
} from '@escrow4334/frontend-core/testing';
import { describe, expect, it, vi } from 'vitest';
import { WebI18nProvider } from '../../lib/i18n';

const sessionStorageKey = 'escrow4337.web.session';

const { mockedWebApi } = vi.hoisted(() => ({
  mockedWebApi: {
    listMarketplaceOpportunities: vi.fn(),
    me: vi.fn(),
    getMyMarketplaceProfile: vi.fn(),
    listMyMarketplaceOpportunities: vi.fn(),
    listMyMarketplaceApplications: vi.fn(),
    listJobs: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../../lib/api', () => ({
  webApi: mockedWebApi,
}));

import MarketplaceWorkspacePage from '../app/marketplace/page';

describe('marketplace workspace', () => {
  it('renders dossier-oriented pipeline metrics and hiring quality fields for an authenticated session', async () => {
    seedJsonStorage(sessionStorageKey, {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
    });
    mockedWebApi.listMarketplaceOpportunities.mockResolvedValue({
      opportunities: [
        {
          id: 'public-1',
          title: 'Public brief',
          summary: 'A public brief',
          description: 'A public brief description',
          category: 'software-development',
          currencyAddress: '0x4444444444444444444444444444444444444444',
          requiredSkills: ['typescript'],
          mustHaveSkills: ['typescript'],
          outcomes: ['Launch dashboard'],
          acceptanceCriteria: ['Responsive UI'],
          screeningQuestions: [
            { id: 'q1', prompt: 'How do you handle milestone reviews?', required: true },
          ],
          visibility: 'public',
          status: 'published',
          budgetMin: '1000',
          budgetMax: '2000',
          timeline: '2 weeks',
          desiredStartAt: null,
          timezoneOverlapHours: 4,
          engagementType: 'fixed_scope',
          cryptoReadinessRequired: 'wallet_only',
          publishedAt: 10,
          hiredApplicationId: null,
          hiredJobId: null,
          createdAt: 10,
          updatedAt: 10,
          owner: {
            userId: 'client-2',
            displayName: 'Client Two',
            profileSlug: 'client-two',
          },
          escrowReadiness: 'ready',
          applicationCount: 1,
        },
      ],
    });
    mockedWebApi.me.mockResolvedValue({
      id: 'client-1',
      email: 'client@example.com',
      shariahMode: false,
      defaultExecutionWalletAddress: '0x5555555555555555555555555555555555555555',
      wallets: [],
    });
    mockedWebApi.getMyMarketplaceProfile.mockResolvedValue({
      profile: {
        userId: 'client-1',
        slug: 'client-one',
        displayName: 'Client One',
        headline: 'Hiring through escrow',
        bio: 'Client bio',
        skills: ['product'],
        specialties: ['marketplace'],
        rateMin: null,
        rateMax: null,
        timezone: 'UTC',
        availability: 'open',
        preferredEngagements: ['fixed_scope'],
        portfolioUrls: ['https://example.com/client'],
        proofArtifacts: [
          {
            id: 'portfolio-1',
            label: 'Portfolio 1',
            url: 'https://example.com/client',
            kind: 'portfolio',
            jobId: null,
          },
        ],
        cryptoReadiness: 'escrow_power_user',
        verifiedWalletAddress: '0x1111111111111111111111111111111111111111',
        verificationLevel: 'wallet_verified',
        escrowStats: {
          totalContracts: 0,
          completionCount: 0,
          disputeCount: 0,
          completionRate: 0,
          disputeRate: 0,
          onTimeDeliveryRate: 0,
          averageContractValueBand: 'unknown',
          completedByCategory: [],
        },
        completedEscrowCount: 0,
        isComplete: true,
      },
    });
    mockedWebApi.listMyMarketplaceOpportunities.mockResolvedValue({
      opportunities: [
        {
          id: 'opp-1',
          title: 'Hired brief',
          summary: 'A hired brief',
          description: 'A hired brief description',
          category: 'software-development',
          currencyAddress: '0x4444444444444444444444444444444444444444',
          requiredSkills: ['typescript'],
          mustHaveSkills: ['typescript'],
          outcomes: ['Launch workspace'],
          acceptanceCriteria: ['Client acceptance'],
          screeningQuestions: [],
          visibility: 'private',
          status: 'hired',
          budgetMin: '1200',
          budgetMax: '2400',
          timeline: '2 weeks',
          desiredStartAt: null,
          timezoneOverlapHours: 3,
          engagementType: 'fixed_scope',
          cryptoReadinessRequired: 'wallet_only',
          publishedAt: 20,
          hiredApplicationId: 'app-1',
          hiredJobId: 'job-123',
          createdAt: 20,
          updatedAt: 20,
          owner: {
            userId: 'client-1',
            displayName: 'Client One',
            profileSlug: 'client-one',
          },
          escrowReadiness: 'ready',
          applicationCount: 1,
        },
      ],
    });
    mockedWebApi.listMyMarketplaceApplications.mockResolvedValue({
      applications: [
        {
          id: 'app-1',
          opportunityId: 'opp-1',
          coverNote: 'Ready to build',
          proposedRate: '120',
          selectedWalletAddress: '0x3333333333333333333333333333333333333333',
          screeningAnswers: [],
          deliveryApproach: 'Plan and execute.',
          milestonePlanSummary: 'Two milestones.',
          estimatedStartAt: null,
          relevantProofArtifacts: [],
          portfolioUrls: ['https://example.com/work'],
          status: 'hired',
          hiredJobId: 'job-123',
          createdAt: 20,
          updatedAt: 20,
          applicant: {
            userId: 'talent-1',
            displayName: 'Builder One',
            profileSlug: 'builder-one',
            headline: 'Full-stack contractor',
            specialties: ['marketplaces'],
            verifiedWalletAddress: '0x3333333333333333333333333333333333333333',
            verificationLevel: 'wallet_verified',
            cryptoReadiness: 'wallet_only',
            escrowStats: {
              totalContracts: 2,
              completionCount: 2,
              disputeCount: 0,
              completionRate: 100,
              disputeRate: 0,
              onTimeDeliveryRate: 100,
              averageContractValueBand: 'medium',
              completedByCategory: [{ category: 'software-development', count: 2 }],
            },
            completedEscrowCount: 2,
          },
          opportunity: {
            id: 'opp-1',
            title: 'Hired brief',
            visibility: 'private',
            status: 'hired',
            ownerDisplayName: 'Client One',
          },
          fitScore: 88,
          fitBreakdown: [],
          riskFlags: [],
          dossier: {
            applicationId: 'app-1',
            opportunityId: 'opp-1',
            recommendation: 'strong_match',
            matchSummary: {
              fitScore: 88,
              requirementCoverage: 100,
              skillOverlap: ['typescript'],
              mustHaveSkillGaps: [],
              riskFlags: [],
              missingRequirements: [],
              fitBreakdown: [],
            },
            whyShortlisted: ['Strong overlap'],
          },
        },
      ],
    });
    mockedWebApi.listJobs.mockResolvedValue({
      jobs: [
        {
          participantRoles: ['client'],
          job: {
            id: 'job-123',
            title: 'Hired brief',
            description: 'Escrow contract',
            category: 'software-development',
            termsJSON: {},
            jobHash: 'hash-1',
            fundedAmount: '1000',
            status: 'funded',
            createdAt: 30,
            updatedAt: 30,
            contractorParticipation: {
              contractorEmail: 'builder@example.com',
              status: 'pending',
              joinedAt: null,
              inviteLastSentAt: null,
              inviteLastSentMode: null,
            },
            milestones: [],
            onchain: {
              chainId: 84532,
              contractAddress: '0x1111111111111111111111111111111111111111',
              escrowId: null,
              clientAddress: '0x1111111111111111111111111111111111111111',
              workerAddress: '0x3333333333333333333333333333333333333333',
              currencyAddress: '0x4444444444444444444444444444444444444444',
            },
          },
        },
      ],
    });

    renderApp(
      <WebI18nProvider initialLocale="en">
        <MarketplaceWorkspacePage />
      </WebI18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Marketplace pipeline')).toBeInTheDocument();
    });

    expect(screen.getByText('Strong matches loaded')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Credibility profile' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Create hiring spec' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Must-have skills')).toBeInTheDocument();
    expect(screen.getByLabelText('Screening questions')).toBeInTheDocument();
    expect(screen.getByLabelText('External proof URLs')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'View contract' })[0],
    ).toHaveAttribute('href', '/app/contracts/job-123');
  });

  it('renders Arabic workspace headings and action labels through the shared marketplace messages', async () => {
    mockedWebApi.listMarketplaceOpportunities.mockResolvedValue({
      opportunities: [],
    });
    mockedWebApi.me.mockResolvedValue({
      id: 'client-1',
      email: 'client@example.com',
      shariahMode: false,
      defaultExecutionWalletAddress: null,
      wallets: [],
    });
    mockedWebApi.getMyMarketplaceProfile.mockRejectedValue(new Error('missing'));
    mockedWebApi.listMyMarketplaceOpportunities.mockResolvedValue({
      opportunities: [],
    });
    mockedWebApi.listMyMarketplaceApplications.mockResolvedValue({
      applications: [],
    });
    mockedWebApi.listJobs.mockResolvedValue({
      jobs: [],
    });
    seedJsonStorage(sessionStorageKey, {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
    });

    renderApp(
      <WebI18nProvider initialLocale="ar">
        <MarketplaceWorkspacePage />
      </WebI18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('مسار السوق')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'ملف الموثوقية' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'إنشاء مواصفات التوظيف' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'السوق العام' })).toHaveAttribute(
      'href',
      '/marketplace',
    );
    expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toBeInTheDocument();
    expect(screen.getByLabelText('المهارات الأساسية')).toBeInTheDocument();
    expect(screen.getByLabelText('روابط الإثبات الخارجية')).toBeInTheDocument();
  });
});
