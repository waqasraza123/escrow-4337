import { screen, waitFor } from '@testing-library/react';
import { renderApp } from '@escrow4334/frontend-core/testing';
import { describe, expect, it, vi } from 'vitest';
import { WebI18nProvider } from '../../../../lib/i18n';

const { mockedWebApi } = vi.hoisted(() => ({
  mockedWebApi: {
    getMarketplaceProfile: vi.fn(),
    reportMarketplaceProfile: vi.fn(),
  },
}));

vi.mock('../../../../lib/api', () => ({
  webApi: mockedWebApi,
}));

import { MarketplaceProfileDetail } from './profile-detail';

describe('marketplace profile detail', () => {
  it('renders Arabic profile detail copy and keeps technical wallet values isolated in LTR', async () => {
    mockedWebApi.getMarketplaceProfile.mockResolvedValue({
      profile: {
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
    });

    renderApp(
      <WebI18nProvider initialLocale="ar">
        <MarketplaceProfileDetail slug="builder-one" />
      </WebI18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Builder One' })).toBeInTheDocument();
    });

    expect(screen.getByText('ملف السوق')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'العودة إلى السوق' })).toHaveAttribute(
      'href',
      '/marketplace',
    );
    expect(screen.getByText('السمة')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'افتح مساحة العمل' })).toHaveAttribute(
      'href',
      '/app/marketplace',
    );
    expect(screen.getByText('محفظة موثقة')).toBeInTheDocument();
    expect(
      screen.getByText('0x1111111111111111111111111111111111111111'),
    ).toHaveAttribute('data-ltr', 'true');
  });
});
