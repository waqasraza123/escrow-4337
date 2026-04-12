import { screen, waitFor } from '@testing-library/react';
import {
  renderApp,
  seedJsonStorage,
} from '@escrow4334/frontend-core/testing';
import { describe, expect, it, vi } from 'vitest';

const sessionStorageKey = 'escrow4337.admin.session';

const { mockedAdminApi } = vi.hoisted(() => ({
  mockedAdminApi: {
    me: vi.fn(),
    logout: vi.fn(),
    getMarketplaceModerationDashboard: vi.fn(),
    listMarketplaceModerationProfiles: vi.fn(),
    listMarketplaceModerationOpportunities: vi.fn(),
    moderateMarketplaceProfile: vi.fn(),
    moderateMarketplaceOpportunity: vi.fn(),
  },
}));

vi.mock('../../lib/api', () => ({
  adminApi: mockedAdminApi,
}));

import MarketplaceModerationPage from './page';

describe('marketplace moderation page', () => {
  it('renders moderation summaries and rows from the operator session', async () => {
    seedJsonStorage(sessionStorageKey, {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
    });
    mockedAdminApi.me.mockResolvedValue({
      id: 'operator-1',
      email: 'operator@example.com',
      shariahMode: false,
      defaultExecutionWalletAddress: null,
      wallets: [],
    });
    mockedAdminApi.getMarketplaceModerationDashboard.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      summary: {
        totalProfiles: 2,
        visibleProfiles: 1,
        hiddenProfiles: 0,
        suspendedProfiles: 1,
        totalOpportunities: 2,
        publishedOpportunities: 1,
        hiredOpportunities: 1,
        visibleOpportunities: 2,
        hiddenOpportunities: 0,
        suspendedOpportunities: 0,
        totalApplications: 3,
        submittedApplications: 1,
        shortlistedApplications: 1,
        hiredApplications: 1,
        hireConversionPercent: 50,
        agingOpportunityCount: 1,
      },
      agingOpportunities: [
        {
          opportunityId: 'opp-1',
          title: 'Old brief',
          ownerDisplayName: 'Client One',
          ageDays: 9,
          status: 'published',
          visibility: 'public',
        },
      ],
    });
    mockedAdminApi.listMarketplaceModerationProfiles.mockResolvedValue({
      profiles: [
        {
          userId: 'user-1',
          slug: 'builder-one',
          displayName: 'Builder One',
          headline: 'Full-stack contractor',
          bio: 'Ships product work.',
          skills: ['typescript'],
          rateMin: '90',
          rateMax: '140',
          timezone: 'UTC',
          availability: 'open',
          portfolioUrls: ['https://example.com/work'],
          verifiedWalletAddress: '0x1111111111111111111111111111111111111111',
          completedEscrowCount: 2,
          isComplete: true,
          moderationStatus: 'visible',
        },
      ],
    });
    mockedAdminApi.listMarketplaceModerationOpportunities.mockResolvedValue({
      opportunities: [
        {
          id: 'opp-1',
          title: 'Old brief',
          summary: 'Summary',
          description: 'Description',
          category: 'software-development',
          currencyAddress: '0x4444444444444444444444444444444444444444',
          requiredSkills: ['typescript'],
          visibility: 'public',
          status: 'published',
          budgetMin: '1000',
          budgetMax: '1500',
          timeline: '2 weeks',
          publishedAt: 1,
          hiredApplicationId: null,
          hiredJobId: null,
          createdAt: 1,
          updatedAt: 1,
          owner: {
            userId: 'client-1',
            displayName: 'Client One',
            profileSlug: null,
          },
          escrowReadiness: 'ready',
          applicationCount: 0,
          moderationStatus: 'visible',
        },
      ],
    });

    renderApp(<MarketplaceModerationPage />);

    await waitFor(() => {
      expect(screen.getByText('operator@example.com')).toBeInTheDocument();
    });

    expect(screen.getByText('Talent moderation')).toBeInTheDocument();
    expect(screen.getByText('Builder One')).toBeInTheDocument();
    expect(screen.getByText('Old brief')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
