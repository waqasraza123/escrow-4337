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
  it('renders Arabic marketplace copy through the shared public marketplace messages', async () => {
    mockedWebApi.listMarketplaceProfiles.mockResolvedValue({
      profiles: [],
    });
    mockedWebApi.listMarketplaceOpportunities.mockResolvedValue({
      opportunities: [],
    });

    renderApp(
      <WebI18nProvider initialLocale="ar">
        <MarketplacePage />
      </WebI18nProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: 'وظّف عبر عروض موجزة منسقة ثم حوّل الاختيار الفائز إلى الضمان.',
        }),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'افتح مساحة العمل' })).toHaveAttribute(
      'href',
      '/app/marketplace',
    );
    expect(screen.getByText('السمة')).toBeInTheDocument();
    expect(screen.getByText('مواهب مميزة')).toBeInTheDocument();
    expect(screen.getByText('لا توجد ملفات مواهب عامة بعد')).toBeInTheDocument();
    expect(screen.getByText('الفرص المفتوحة')).toBeInTheDocument();
  });

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
        specialties: ['marketplaces'],
        rateMin: '90',
        rateMax: '140',
        timezone: 'UTC',
        availability: 'open',
        preferredEngagements: ['fixed_scope'],
        portfolioUrls: ['https://example.com/work'],
        proofArtifacts: [
          {
            id: 'portfolio-1',
            label: 'Portfolio 1',
            url: 'https://example.com/work',
            kind: 'portfolio',
            jobId: null,
          },
        ],
        cryptoReadiness: 'wallet_only',
        verifiedWalletAddress: '0x1111111111111111111111111111111111111111',
        verificationLevel: 'wallet_verified',
        escrowStats: {
          totalContracts: 3,
          completionCount: 3,
          disputeCount: 0,
          completionRate: 100,
          disputeRate: 0,
          onTimeDeliveryRate: 100,
          averageContractValueBand: 'medium',
          completedByCategory: [{ category: 'software-development', count: 3 }],
        },
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
          mustHaveSkills: ['typescript'],
          outcomes: ['Ship the portal'],
          acceptanceCriteria: ['Responsive UI'],
          screeningQuestions: [],
          visibility: 'public',
          status: 'published',
          budgetMin: '1000',
          budgetMax: '2500',
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
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View profile' })).toHaveAttribute(
      'href',
      '/marketplace/profiles/builder-one',
    );
    expect(screen.getByRole('link', { name: 'View brief' })).toHaveAttribute(
      'href',
      '/marketplace/opportunities/opp-1',
    );
  });
});
