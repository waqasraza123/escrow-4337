import { screen, waitFor } from '@testing-library/react';
import { renderApp } from '@escrow4334/frontend-core/testing';
import { describe, expect, it, vi } from 'vitest';
import { WebI18nProvider } from '../../lib/i18n';

const { mockedWebApi } = vi.hoisted(() => ({
  mockedWebApi: {
    listMarketplaceProfiles: vi.fn(),
    listMarketplaceOpportunities: vi.fn(),
  },
}));

vi.mock('../../lib/api', () => ({
  webApi: mockedWebApi,
}));

import MarketplacePage from './page';

describe('marketplace page', () => {
  it('renders visible talent and opportunity cards from the marketplace feed', async () => {
    mockedWebApi.listMarketplaceProfiles.mockResolvedValue({
      profiles: [
        {
          userId: 'user-1',
          slug: 'builder-one',
          displayName: 'Builder One',
          headline: 'Full-stack contractor',
          bio: 'Ships product work.',
          skills: ['typescript', 'react'],
          rateMin: '90',
          rateMax: '140',
          timezone: 'UTC',
          availability: 'open',
          portfolioUrls: ['https://example.com/work'],
          verifiedWalletAddress: '0x1111111111111111111111111111111111111111',
          completedEscrowCount: 3,
          isComplete: true,
        },
      ],
    });
    mockedWebApi.listMarketplaceOpportunities.mockResolvedValue({
      opportunities: [
        {
          id: 'opp-1',
          title: 'Founding product engineer',
          summary: 'Ship the first client portal',
          description: 'Build the portal',
          category: 'software-development',
          currencyAddress: '0x4444444444444444444444444444444444444444',
          requiredSkills: ['typescript', 'react'],
          visibility: 'public',
          status: 'published',
          budgetMin: '1000',
          budgetMax: '2500',
          timeline: '2 weeks',
          publishedAt: 10,
          hiredApplicationId: null,
          hiredJobId: null,
          createdAt: 10,
          updatedAt: 10,
          owner: {
            userId: 'client-1',
            displayName: 'Startup Client',
            profileSlug: 'startup-client',
          },
          escrowReadiness: 'ready',
          applicationCount: 2,
        },
      ],
    });

    renderApp(
      <WebI18nProvider initialLocale="en">
        <MarketplacePage />
      </WebI18nProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: 'Hire through curated briefs and convert the winner into escrow.',
        }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Builder One')).toBeInTheDocument();
    expect(screen.getByText('Founding product engineer')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open workspace' }),
    ).toHaveAttribute('href', '/app/marketplace');
  });
});
