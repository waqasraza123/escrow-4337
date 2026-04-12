import { screen, waitFor } from '@testing-library/react';
import {
  renderApp,
  seedJsonStorage,
} from '@escrow4334/frontend-core/testing';
import { describe, expect, it, vi } from 'vitest';

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
  it('renders pipeline metrics and hired contract links for an authenticated session', async () => {
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
          visibility: 'public',
          status: 'published',
          budgetMin: '1000',
          budgetMax: '2000',
          timeline: '2 weeks',
          publishedAt: 10,
          hiredApplicationId: null,
          hiredJobId: null,
          createdAt: 10,
          updatedAt: 10,
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
        rateMin: null,
        rateMax: null,
        timezone: 'UTC',
        availability: 'open',
        portfolioUrls: ['https://example.com/client'],
        verifiedWalletAddress: '0x1111111111111111111111111111111111111111',
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
          visibility: 'private',
          status: 'hired',
          budgetMin: '1200',
          budgetMax: '2400',
          timeline: '2 weeks',
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
            verifiedWalletAddress: '0x3333333333333333333333333333333333333333',
            completedEscrowCount: 2,
          },
          opportunity: {
            id: 'opp-1',
            title: 'Hired brief',
            visibility: 'private',
            status: 'hired',
            ownerDisplayName: 'Client One',
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

    renderApp(<MarketplaceWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText('Marketplace pipeline')).toBeInTheDocument();
    });

    expect(screen.getByText('Hires to escrow')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Active contracts' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'View contract' })[0],
    ).toHaveAttribute('href', '/app/contracts/job-123');
    expect(screen.getByLabelText('Visibility')).toBeInTheDocument();
    expect(screen.getByLabelText('Budget minimum')).toBeInTheDocument();
  });
});
