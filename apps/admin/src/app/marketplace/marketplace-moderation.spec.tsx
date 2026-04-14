import { screen, waitFor } from '@testing-library/react';
import {
  renderApp,
  seedJsonStorage,
} from '@escrow4334/frontend-core/testing';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const sessionStorageKey = 'escrow4337.admin.session';

const { mockedAdminApi } = vi.hoisted(() => ({
  mockedAdminApi: {
    me: vi.fn(),
    logout: vi.fn(),
    getMarketplaceModerationDashboard: vi.fn(),
    listMarketplaceModerationProfiles: vi.fn(),
    listMarketplaceModerationOpportunities: vi.fn(),
    listMarketplaceModerationReports: vi.fn(),
    moderateMarketplaceProfile: vi.fn(),
    moderateMarketplaceOpportunity: vi.fn(),
    updateMarketplaceModerationReport: vi.fn(),
  },
}));

vi.mock('../../lib/api', () => ({
  adminApi: mockedAdminApi,
}));

import MarketplaceModerationPage from './page';

describe('marketplace moderation page', () => {
  it('renders moderation summaries and rows from the operator session', async () => {
    const user = userEvent.setup();
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
        totalAbuseReports: 2,
        openAbuseReports: 1,
        reviewingAbuseReports: 1,
        claimedAbuseReports: 1,
        unclaimedAbuseReports: 1,
        escalatedAbuseReports: 1,
        agingAbuseReports: 1,
        staleAbuseReports: 1,
        oldestActiveAbuseReportHours: 72,
      },
      thresholds: {
        abuseReportAgingHours: 48,
        abuseReportStaleHours: 24,
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
      recentAbuseReports: [
        {
          id: 'report-1',
          subject: {
            type: 'profile',
            id: 'user-1',
            label: 'Builder One',
            slug: 'builder-one',
            moderationStatus: 'visible',
          },
          reporter: {
            userId: 'client-1',
            email: 'client@example.com',
          },
          reason: 'spam',
          details: 'Suspicious copied portfolio.',
          evidenceUrls: ['https://example.com/evidence'],
          status: 'open',
          claimedBy: {
            userId: 'operator-1',
            email: 'operator@example.com',
          },
          claimedAt: 1,
          escalationReason: null,
          escalatedBy: null,
          escalatedAt: null,
          evidenceReviewStatus: 'pending',
          investigationSummary: null,
          evidenceReviewedBy: null,
          evidenceReviewedAt: null,
          resolutionNote: null,
          resolvedBy: null,
          subjectModerationStatus: null,
          subjectModeratedBy: null,
          subjectModeratedAt: null,
          queuePriority: 'high',
          ageHours: 72,
          hoursSinceUpdate: 30,
          createdAt: 1,
          updatedAt: 1,
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
    mockedAdminApi.listMarketplaceModerationReports.mockResolvedValue({
      reports: [
        {
          id: 'report-1',
          subject: {
            type: 'profile',
            id: 'user-1',
            label: 'Builder One',
            slug: 'builder-one',
            moderationStatus: 'visible',
          },
          reporter: {
            userId: 'client-1',
            email: 'client@example.com',
          },
          reason: 'spam',
          details: 'Suspicious copied portfolio.',
          evidenceUrls: ['https://example.com/evidence'],
          status: 'open',
          claimedBy: {
            userId: 'operator-1',
            email: 'operator@example.com',
          },
          claimedAt: 1,
          escalationReason: null,
          escalatedBy: null,
          escalatedAt: null,
          evidenceReviewStatus: 'pending',
          investigationSummary: null,
          evidenceReviewedBy: null,
          evidenceReviewedAt: null,
          resolutionNote: null,
          resolvedBy: null,
          subjectModerationStatus: null,
          subjectModeratedBy: null,
          subjectModeratedAt: null,
          queuePriority: 'high',
          ageHours: 72,
          hoursSinceUpdate: 30,
          createdAt: 1,
          updatedAt: 1,
        },
        {
          id: 'report-2',
          subject: {
            type: 'opportunity',
            id: 'opp-1',
            label: 'Old brief',
            visibility: 'public',
            moderationStatus: 'visible',
            status: 'published',
          },
          reporter: {
            userId: 'client-2',
            email: 'another@example.com',
          },
          reason: 'policy_violation',
          details: 'Needs operator assignment.',
          evidenceUrls: [],
          status: 'reviewing',
          claimedBy: null,
          claimedAt: null,
          escalationReason: 'Needs contract-policy confirmation.',
          escalatedBy: {
            userId: 'operator-1',
            email: 'operator@example.com',
          },
          escalatedAt: 2,
          evidenceReviewStatus: 'insufficient_evidence',
          investigationSummary: 'Waiting for policy review.',
          evidenceReviewedBy: {
            userId: 'operator-1',
            email: 'operator@example.com',
          },
          evidenceReviewedAt: 2,
          resolutionNote: null,
          resolvedBy: null,
          subjectModerationStatus: null,
          subjectModeratedBy: null,
          subjectModeratedAt: null,
          queuePriority: 'critical',
          ageHours: 12,
          hoursSinceUpdate: 26,
          createdAt: 2,
          updatedAt: 2,
        },
      ],
    });
    mockedAdminApi.updateMarketplaceModerationReport.mockResolvedValue({
      report: {
        id: 'report-1',
        status: 'resolved',
      },
    });

    renderApp(<MarketplaceModerationPage />);

    await waitFor(() => {
      expect(screen.getByText('operator@example.com')).toBeInTheDocument();
    });

    expect(screen.getByText('Talent moderation')).toBeInTheDocument();
    expect(screen.getAllByText('Builder One').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Old brief').length).toBeGreaterThan(0);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Abuse queue')).toBeInTheDocument();
    expect(screen.getByText('Suspicious copied portfolio.')).toBeInTheDocument();
    expect(screen.getByText('Claimed by operator@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Priority High/)).toBeInTheDocument();
    expect(mockedAdminApi.listMarketplaceModerationReports).toHaveBeenCalledWith(
      { limit: 50, sortBy: 'priority' },
      'access-token-123',
    );

    await user.click(screen.getByRole('button', { name: 'Claim report' }));

    await waitFor(() => {
      expect(mockedAdminApi.updateMarketplaceModerationReport).toHaveBeenCalledWith(
        'report-2',
        {
          status: 'reviewing',
          claimAction: 'claim',
        },
        'access-token-123',
      );
    });

    await user.type(
      screen.getAllByRole('textbox', { name: 'Investigation summary' })[0]!,
      'Matched prior complaint artifacts.',
    );
    await user.selectOptions(
      screen.getAllByRole('combobox', { name: 'Evidence review' })[0]!,
      'supports_report',
    );
    await user.type(
      screen.getAllByRole('textbox', { name: 'Resolution note' })[0]!,
      'Hidden after review.',
    );
    await user.click(
      screen.getAllByRole('button', { name: 'Resolve + Suspend' })[0]!,
    );

    await waitFor(() => {
      expect(mockedAdminApi.updateMarketplaceModerationReport).toHaveBeenCalledWith(
        'report-1',
        {
          status: 'resolved',
          escalationReason: null,
          evidenceReviewStatus: 'supports_report',
          investigationSummary: 'Matched prior complaint artifacts.',
          resolutionNote: 'Hidden after review.',
          subjectModerationStatus: 'suspended',
        },
        'access-token-123',
      );
    });

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Subject filter' }),
      'opportunity',
    );

    await waitFor(() => {
      expect(mockedAdminApi.listMarketplaceModerationReports).toHaveBeenCalledWith(
        { limit: 50, sortBy: 'priority', subjectType: 'opportunity' },
        'access-token-123',
      );
    });

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Claim filter' }),
      'claimed',
    );

    await waitFor(() => {
      expect(mockedAdminApi.listMarketplaceModerationReports).toHaveBeenCalledWith(
        {
          limit: 50,
          sortBy: 'priority',
          subjectType: 'opportunity',
          claimState: 'claimed',
        },
        'access-token-123',
      );
    });

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Escalation filter' }),
      'true',
    );

    await waitFor(() => {
      expect(mockedAdminApi.listMarketplaceModerationReports).toHaveBeenCalledWith(
        {
          limit: 50,
          sortBy: 'priority',
          subjectType: 'opportunity',
          claimState: 'claimed',
          escalated: true,
        },
        'access-token-123',
      );
    });

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Evidence review filter' }),
      'supports_report',
    );

    await waitFor(() => {
      expect(mockedAdminApi.listMarketplaceModerationReports).toHaveBeenCalledWith(
        {
          limit: 50,
          sortBy: 'priority',
          subjectType: 'opportunity',
          claimState: 'claimed',
          escalated: true,
          evidenceReviewStatus: 'supports_report',
        },
        'access-token-123',
      );
    });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), 'stale_activity');

    await waitFor(() => {
      expect(mockedAdminApi.listMarketplaceModerationReports).toHaveBeenCalledWith(
        {
          limit: 50,
          sortBy: 'stale_activity',
          subjectType: 'opportunity',
          claimState: 'claimed',
          escalated: true,
          evidenceReviewStatus: 'supports_report',
        },
        'access-token-123',
      );
    });
  });
});
