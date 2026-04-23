import { screen, waitFor } from '@testing-library/react';
import {
  renderApp,
  seedJsonStorage,
} from '@escrow4334/frontend-core/testing';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminI18nProvider } from '../../lib/i18n';

const sessionStorageKey = 'escrow4337.admin.session';

const { mockedAdminApi } = vi.hoisted(() => ({
  mockedAdminApi: {
    me: vi.fn(),
    logout: vi.fn(),
    getMarketplaceModerationDashboard: vi.fn(),
    getMarketplaceModerationIntelligence: vi.fn(),
    listMarketplaceModerationProfiles: vi.fn(),
    listMarketplaceModerationOpportunities: vi.fn(),
    listMarketplaceModerationReports: vi.fn(),
    listMarketplaceModerationReviews: vi.fn(),
    moderateMarketplaceProfile: vi.fn(),
    moderateMarketplaceOpportunity: vi.fn(),
    updateMarketplaceModerationReport: vi.fn(),
    updateMarketplaceReviewModeration: vi.fn(),
    updateMarketplaceIdentityRiskReview: vi.fn(),
  },
}));

vi.mock('../../lib/api', () => ({
  adminApi: mockedAdminApi,
}));

import MarketplaceModerationPage from '../operator/marketplace/page';

function renderModerationPage() {
  return renderApp(
    <AdminI18nProvider initialLocale="en">
      <MarketplaceModerationPage />
    </AdminI18nProvider>,
  );
}

describe('marketplace moderation page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      capabilities: {
        escrowResolution: {
          allowed: true,
          reason: 'Authenticated user controls the configured arbitrator wallet',
          grantedBy: 'linked_arbitrator_wallet',
          requiredWalletAddress: '0x2222222222222222222222222222222222222222',
        },
        escrowOperations: {
          allowed: true,
          reason: 'Authenticated user controls the configured arbitrator wallet',
          grantedBy: 'linked_arbitrator_wallet',
          requiredWalletAddress: '0x2222222222222222222222222222222222222222',
        },
        chainAuditSync: {
          allowed: true,
          reason: 'Authenticated user controls the configured arbitrator wallet',
          grantedBy: 'linked_arbitrator_wallet',
          requiredWalletAddress: '0x2222222222222222222222222222222222222222',
        },
        jobHistoryImport: {
          allowed: true,
          reason: 'Authenticated user controls the configured arbitrator wallet',
          grantedBy: 'linked_arbitrator_wallet',
          requiredWalletAddress: '0x2222222222222222222222222222222222222222',
        },
        marketplaceModeration: {
          allowed: true,
          reason: 'Authenticated user controls the configured arbitrator wallet',
          grantedBy: 'linked_arbitrator_wallet',
          requiredWalletAddress: '0x2222222222222222222222222222222222222222',
        },
      },
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
    mockedAdminApi.getMarketplaceModerationIntelligence.mockResolvedValue({
      report: {
        generatedAt: new Date().toISOString(),
        funnel: [
          { key: 'applications', label: 'Applications', count: 3 },
          { key: 'hires', label: 'Hires', count: 1 },
        ],
        liquidityByCategory: [
          {
            label: 'software-development',
            demandCount: 3,
            supplyCount: 2,
            gap: 1,
            posture: 'demand_heavy',
          },
        ],
        liquidityByTimezone: [
          {
            label: 'UTC',
            demandCount: 2,
            supplyCount: 1,
            gap: 1,
            posture: 'demand_heavy',
          },
        ],
        noHireReasons: [
          {
            reason: 'fit_not_strong_enough',
            count: 1,
          },
        ],
        topSearches: [
          {
            searchKind: 'talent',
            queryLabel: 'typescript',
            impressions: 10,
            resultClicks: 4,
            saveCount: 1,
          },
        ],
        stalledOpportunities: [
          {
            opportunityId: 'opp-1',
            title: 'Old brief',
            category: 'software-development',
            publishedAt: 1,
            daysOpen: 9,
            applicationCount: 0,
            shortlistCount: 0,
            offerCount: 0,
            lastDecisionAt: null,
          },
        ],
        rankingAudit: [
          {
            entityType: 'profile',
            entityId: 'user-1',
            label: 'Builder One',
            score: 88,
            outcomeScore: 20,
            momentumScore: 12,
            moderationStatus: 'visible',
            reasons: [{ code: 'strong_skill_match', label: 'Strong skill match' }],
            signals: {
              completionRate: 100,
              disputeRate: 0,
              inviteAcceptanceRate: 50,
              responseRate: 80,
              reviewAverage: 4.9,
              hireCount: 1,
              noHireCount: 0,
              recencyDays: 2,
            },
          },
        ],
        retention: {
          talentPools: 2,
          trackedTalent: 3,
          automationRules: 1,
          automationRuns: 2,
          automatedTaskDeliveries: 4,
          pendingLifecycleTasks: 3,
          rehireCandidates: 1,
          clientWorkspacesWithRetentionSetup: 1,
        },
        digestOps: {
          totalPreferences: 2,
          digestUsers: 1,
          manualCadenceUsers: 1,
          dailyCadenceUsers: 1,
          weeklyCadenceUsers: 0,
          usersWithSuppressedNotifications: 1,
          lifecycleDigestEnabledUsers: 2,
          analyticsDigestEnabledUsers: 1,
          totalDigests: 2,
          freshDigests: 1,
          acknowledgedDigests: 1,
          archivedDigests: 0,
          digestsLast7Days: 2,
          usersWithRecentDigests: 1,
          suppression: {
            talentInvitesDisabled: 0,
            applicationActivityDisabled: 1,
            interviewMessagesDisabled: 0,
            offerActivityDisabled: 0,
            reviewActivityDisabled: 0,
            automationActivityDisabled: 0,
            lifecycleDigestDisabled: 0,
            analyticsDigestDisabled: 1,
          },
          recentDigests: [
            {
              digestId: 'digest-1',
              userId: 'client-1',
              userEmail: 'client@example.com',
              workspaceId: 'workspace-client-1',
              cadence: 'daily',
              status: 'fresh',
              title: 'Atlas Labs marketplace digest',
              summary: '2 unread updates • 1 pending lifecycle task',
              unreadNotifications: 2,
              taskCount: 1,
              rehireCandidateCount: 0,
              hires: 1,
              updatedAt: 10,
            },
          ],
        },
      },
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
          identityReview: null,
          riskSignals: [],
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
    mockedAdminApi.listMarketplaceModerationReviews.mockResolvedValue({
      reviews: [],
    });

    renderModerationPage();

    await waitFor(() => {
      expect(screen.getByText('operator@example.com')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Operator home' })).toHaveAttribute(
      'href',
      '/operator',
    );
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByText('Talent moderation')).toBeInTheDocument();
    expect(screen.getAllByText('Builder One').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Old brief').length).toBeGreaterThan(0);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Abuse queue')).toBeInTheDocument();
    expect(screen.getByText('Digest adoption and suppression')).toBeInTheDocument();
    expect(screen.getByText('Atlas Labs marketplace digest')).toBeInTheDocument();
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

  it('explains when the operator session is authenticated but lacks moderation capability', async () => {
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
      capabilities: {
        escrowResolution: {
          allowed: false,
          reason: 'Authenticated user must control the configured arbitrator wallet',
          grantedBy: 'none',
          requiredWalletAddress: '0x2222222222222222222222222222222222222222',
        },
        escrowOperations: {
          allowed: false,
          reason: 'Authenticated user must control the configured arbitrator wallet',
          grantedBy: 'none',
          requiredWalletAddress: '0x2222222222222222222222222222222222222222',
        },
        chainAuditSync: {
          allowed: false,
          reason: 'Authenticated user must control the configured arbitrator wallet',
          grantedBy: 'none',
          requiredWalletAddress: '0x2222222222222222222222222222222222222222',
        },
        jobHistoryImport: {
          allowed: false,
          reason: 'Authenticated user must control the configured arbitrator wallet',
          grantedBy: 'none',
          requiredWalletAddress: '0x2222222222222222222222222222222222222222',
        },
        marketplaceModeration: {
          allowed: false,
          reason: 'Authenticated user must control the configured arbitrator wallet',
          grantedBy: 'none',
          requiredWalletAddress: '0x2222222222222222222222222222222222222222',
        },
      },
    });

    renderModerationPage();

    await waitFor(() => {
      expect(
        screen.getByText('Marketplace moderation capability required'),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'Authenticated user must control the configured arbitrator wallet',
      ),
    ).toBeInTheDocument();
    expect(
      mockedAdminApi.getMarketplaceModerationDashboard,
    ).not.toHaveBeenCalled();
    expect(mockedAdminApi.listMarketplaceModerationProfiles).not.toHaveBeenCalled();
    expect(
      mockedAdminApi.listMarketplaceModerationOpportunities,
    ).not.toHaveBeenCalled();
    expect(mockedAdminApi.listMarketplaceModerationReports).not.toHaveBeenCalled();
  });

  it('points restore-session traffic back to operator home', () => {
    renderModerationPage();

    expect(screen.getByRole('link', { name: 'Restore session' })).toHaveAttribute(
      'href',
      '/operator',
    );
  });
});
