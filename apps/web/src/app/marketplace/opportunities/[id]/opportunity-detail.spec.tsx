import { screen, waitFor } from '@testing-library/react';
import { renderApp } from '@escrow4334/frontend-core/testing';
import { describe, expect, it, vi } from 'vitest';
import { WebI18nProvider } from '../../../../lib/i18n';
import type { MarketplaceOpportunityDetail as MarketplaceOpportunityDetailView } from '../../../../lib/api';

const { mockedWebApi } = vi.hoisted(() => ({
  mockedWebApi: {
    getMarketplaceOpportunity: vi.fn(),
    reportMarketplaceOpportunity: vi.fn(),
    recordMarketplaceInteraction: vi.fn(),
  },
}));

vi.mock('../../../../lib/api', () => ({
  webApi: mockedWebApi,
}));

import { MarketplaceOpportunityDetail } from './opportunity-detail';

describe('marketplace opportunity detail', () => {
  it('renders Arabic brief detail copy, locale-aware date formatting, and LTR-safe technical values', async () => {
    const desiredStartAt = Date.UTC(2026, 3, 14, 8, 30);

    mockedWebApi.getMarketplaceOpportunity.mockResolvedValue({
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
        desiredStartAt,
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
            publicReviewCount: 3,
            averageRating: 4.7,
            ratingBreakdown: {
              oneStar: 0,
              twoStar: 0,
              threeStar: 0,
              fourStar: 1,
              fiveStar: 2,
            },
            totalContracts: 3,
            completionRate: 100,
            disputeRate: 0,
            onTimeDeliveryRate: 100,
            responseRate: 92,
            inviteAcceptanceRate: 80,
            revisionRate: 10,
            averageContractValueBand: 'medium',
          },
        },
        escrowReadiness: 'ready',
        applicationCount: 2,
      },
    } satisfies { opportunity: MarketplaceOpportunityDetailView });

    renderApp(
      <WebI18nProvider initialLocale="ar">
        <MarketplaceOpportunityDetail id="opp-1" />
      </WebI18nProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Founding product engineer' }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('النطاق والنتائج')).toBeInTheDocument();
    expect(screen.getByText('السمة')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'افتح مساحة العمل' })).toHaveAttribute(
      'href',
      '/app/marketplace',
    );
    expect(screen.getByRole('link', { name: 'قدّم من مساحة العمل' })).toHaveAttribute(
      'href',
      '/app/marketplace',
    );
    expect(screen.getByTestId('opportunity-detail-scene')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(
      screen.getByText(
        new Intl.DateTimeFormat('ar', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(desiredStartAt)),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('0x4444444444444444444444444444444444444444'),
    ).toHaveAttribute('data-ltr', 'true');
  });
});
