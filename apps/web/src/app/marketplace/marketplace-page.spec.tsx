import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderApp } from '@escrow4334/frontend-core/testing';
import { describe, expect, it, vi } from 'vitest';
import { WebI18nProvider } from '../../lib/i18n';
import type {
  MarketplaceOpportunitySearchResult,
  MarketplaceTalentSearchResult,
} from '../../lib/api';

const { mockedWebApi } = vi.hoisted(() => ({
  mockedWebApi: {
    searchMarketplaceTalent: vi.fn(),
    searchMarketplaceOpportunities: vi.fn(),
    recordMarketplaceInteraction: vi.fn(),
  },
}));

vi.mock('../../lib/api', () => ({
  webApi: mockedWebApi,
}));

import MarketplacePage from './page';

describe('marketplace page', () => {
  it('renders Arabic marketplace copy through the shared public marketplace messages', async () => {
    mockedWebApi.searchMarketplaceTalent.mockResolvedValue({
      results: [],
    });
    mockedWebApi.searchMarketplaceOpportunities.mockResolvedValue({
      results: [],
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
    expect(screen.getAllByText('0 ملف موهبة ظاهر').length).toBeGreaterThan(0);
    expect(screen.getByText('لا توجد ملفات مواهب عامة بعد')).toBeInTheDocument();
    expect(screen.getAllByText('0 عرض موجز مفتوح').length).toBeGreaterThan(0);
  });

  it('renders visible talent and opportunity cards from the marketplace feed', async () => {
    mockedWebApi.searchMarketplaceTalent.mockResolvedValue({
      results: [
        {
          profile: {
            userId: 'user-1',
            organizationId: null,
            workspaceId: null,
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
            reputation: {
              subjectUserId: 'user-1',
              role: 'worker',
              identityConfidence: 'wallet_verified',
              publicReviewCount: 2,
              averageRating: 4.8,
              ratingBreakdown: {
                oneStar: 0,
                twoStar: 0,
                threeStar: 0,
                fourStar: 1,
                fiveStar: 1,
              },
              totalContracts: 3,
              completionRate: 100,
              disputeRate: 0,
              onTimeDeliveryRate: 100,
              responseRate: 100,
              inviteAcceptanceRate: 100,
              revisionRate: 0,
              averageContractValueBand: 'medium',
            },
            publicReviews: [],
            completedEscrowCount: 3,
            isComplete: true,
          },
          reasons: [
            {
              code: 'verified_wallet',
              label: 'Verified wallet',
            },
          ],
          ranking: {
            score: 94,
            profileCompleteness: 100,
            skillMatchPercent: 100,
            completionRate: 100,
            disputeRate: 0,
            inviteAcceptanceRate: 100,
            responseRate: 100,
            recencyDays: 2,
            timezoneOverlapHours: 4,
            budgetClarity: 100,
            fitDensity: 85,
            fundedVolumeBand: 'medium',
            verificationLevel: 'wallet_verified',
          },
          inviteStatus: null,
        },
      ],
    } satisfies { results: MarketplaceTalentSearchResult[] });
    mockedWebApi.searchMarketplaceOpportunities.mockResolvedValue({
      results: [
        {
          opportunity: {
            id: 'opp-1',
            ownerOrganizationId: null,
            ownerWorkspaceId: null,
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
              organizationId: null,
              workspaceId: null,
              workspaceKind: 'client',
              displayName: 'Startup Client',
              profileSlug: 'startup-client',
              reputation: {
                subjectUserId: 'client-1',
                role: 'client',
                identityConfidence: 'email_verified',
                publicReviewCount: 1,
                averageRating: 5,
                ratingBreakdown: {
                  oneStar: 0,
                  twoStar: 0,
                  threeStar: 0,
                  fourStar: 0,
                  fiveStar: 1,
                },
                totalContracts: 1,
                completionRate: 100,
                disputeRate: 0,
                onTimeDeliveryRate: 100,
                responseRate: 100,
                inviteAcceptanceRate: 100,
                revisionRate: 0,
                averageContractValueBand: 'medium',
              },
            },
            escrowReadiness: 'ready',
            applicationCount: 2,
          },
          reasons: [
            {
              code: 'recent_brief',
              label: 'Recent brief',
            },
          ],
          ranking: {
            score: 91,
            profileCompleteness: 100,
            skillMatchPercent: 100,
            completionRate: 100,
            disputeRate: 0,
            inviteAcceptanceRate: 100,
            responseRate: 100,
            recencyDays: 1,
            timezoneOverlapHours: 4,
            budgetClarity: 100,
            fitDensity: 80,
            fundedVolumeBand: 'medium',
            verificationLevel: 'wallet_verified',
          },
          inviteStatus: null,
        },
      ],
    } satisfies { results: MarketplaceOpportunitySearchResult[] });

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
    expect(
      screen.getByRole('link', { name: 'Open workspace' }),
    ).toHaveAttribute('href', '/app/marketplace');
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View profile' })).toHaveAttribute(
      'href',
      '/marketplace/profiles/builder-one',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Opportunity directory' }));

    await waitFor(() => {
      expect(screen.getByText('Founding product engineer')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'View brief' })).toHaveAttribute(
      'href',
      '/marketplace/opportunities/opp-1',
    );
  });
});
