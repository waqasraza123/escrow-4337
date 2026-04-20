import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  renderApp,
  seedJsonStorage,
} from '@escrow4334/frontend-core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebI18nProvider } from '../../lib/i18n';

const sessionStorageKey = 'escrow4337.web.session';

const { mockedWebApi } = vi.hoisted(() => ({
  mockedWebApi: {
    listMarketplaceOpportunities: vi.fn(),
    me: vi.fn(),
    listOrganizations: vi.fn(),
    getMyMarketplaceProfile: vi.fn(),
    listMyMarketplaceOpportunities: vi.fn(),
    listMyMarketplaceApplications: vi.fn(),
    createOrganization: vi.fn(),
    selectWorkspace: vi.fn(),
    listJobs: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../../lib/api', () => ({
  webApi: mockedWebApi,
}));

import MarketplaceWorkspacePage from '../app/marketplace/page';

describe('marketplace workspace', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedWebApi.listOrganizations.mockResolvedValue({
      organizations: [
        {
          id: 'org-personal-1',
          slug: 'personal-client-1',
          name: 'Personal workspace',
          kind: 'personal',
          roles: ['client_owner', 'freelancer'],
          workspaces: [
            {
              workspaceId: 'workspace-client-1',
              kind: 'client',
              label: 'Personal client workspace',
              slug: 'personal-client-client-1',
              organizationId: 'org-personal-1',
              organizationName: 'Personal workspace',
              organizationSlug: 'personal-client-1',
              organizationKind: 'personal',
              roles: ['client_owner'],
              capabilities: {
                manageProfile: false,
                applyToOpportunity: false,
                createOpportunity: true,
                reviewApplications: true,
                manageWorkspace: true,
              },
              isDefault: true,
            },
            {
              workspaceId: 'workspace-freelancer-1',
              kind: 'freelancer',
              label: 'Personal freelancer workspace',
              slug: 'personal-freelancer-client-1',
              organizationId: 'org-personal-1',
              organizationName: 'Personal workspace',
              organizationSlug: 'personal-client-1',
              organizationKind: 'personal',
              roles: ['freelancer'],
              capabilities: {
                manageProfile: true,
                applyToOpportunity: true,
                createOpportunity: false,
                reviewApplications: false,
                manageWorkspace: false,
              },
              isDefault: true,
            },
          ],
        },
      ],
    });
    mockedWebApi.createOrganization.mockResolvedValue({
      organization: {
        id: 'org-client-2',
        slug: 'atlas-labs',
        name: 'Atlas Labs',
        kind: 'client',
        roles: ['client_owner'],
        workspaces: [
          {
            workspaceId: 'workspace-client-2',
            kind: 'client',
            label: 'Atlas Labs hiring',
            slug: 'atlas-labs-hiring',
            organizationId: 'org-client-2',
            organizationName: 'Atlas Labs',
            organizationSlug: 'atlas-labs',
            organizationKind: 'client',
            roles: ['client_owner'],
            capabilities: {
              manageProfile: false,
              applyToOpportunity: false,
              createOpportunity: true,
              reviewApplications: true,
              manageWorkspace: true,
            },
            isDefault: false,
          },
        ],
      },
    });
    mockedWebApi.selectWorkspace.mockResolvedValue({
      activeWorkspace: {
        workspaceId: 'workspace-client-2',
        kind: 'client',
        label: 'Atlas Labs hiring',
        slug: 'atlas-labs-hiring',
        organizationId: 'org-client-2',
        organizationName: 'Atlas Labs',
        organizationSlug: 'atlas-labs',
        organizationKind: 'client',
        roles: ['client_owner'],
        capabilities: {
          manageProfile: false,
          applyToOpportunity: false,
          createOpportunity: true,
          reviewApplications: true,
          manageWorkspace: true,
        },
        isDefault: false,
      },
      workspaces: [],
    });
  });

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
            organizationId: 'org-client-2',
            workspaceId: 'workspace-client-2',
            workspaceKind: 'client',
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
      capabilities: {},
      workspaces: [
        {
          workspaceId: 'workspace-client-1',
          kind: 'client',
          label: 'Personal client workspace',
          slug: 'personal-client-client-1',
          organizationId: 'org-personal-1',
          organizationName: 'Personal workspace',
          organizationSlug: 'personal-client-1',
          organizationKind: 'personal',
          roles: ['client_owner'],
          capabilities: {
            manageProfile: false,
            applyToOpportunity: false,
            createOpportunity: true,
            reviewApplications: true,
            manageWorkspace: true,
          },
          isDefault: true,
        },
        {
          workspaceId: 'workspace-freelancer-1',
          kind: 'freelancer',
          label: 'Personal freelancer workspace',
          slug: 'personal-freelancer-client-1',
          organizationId: 'org-personal-1',
          organizationName: 'Personal workspace',
          organizationSlug: 'personal-client-1',
          organizationKind: 'personal',
          roles: ['freelancer'],
          capabilities: {
            manageProfile: true,
            applyToOpportunity: true,
            createOpportunity: false,
            reviewApplications: false,
            manageWorkspace: false,
          },
          isDefault: true,
        },
      ],
      activeWorkspace: {
        workspaceId: 'workspace-freelancer-1',
        kind: 'freelancer',
        label: 'Personal freelancer workspace',
        slug: 'personal-freelancer-client-1',
        organizationId: 'org-personal-1',
        organizationName: 'Personal workspace',
        organizationSlug: 'personal-client-1',
        organizationKind: 'personal',
        roles: ['freelancer'],
        capabilities: {
          manageProfile: true,
          applyToOpportunity: true,
          createOpportunity: false,
          reviewApplications: false,
          manageWorkspace: false,
        },
        isDefault: true,
      },
    });
    mockedWebApi.getMyMarketplaceProfile.mockResolvedValue({
      profile: {
        userId: 'client-1',
        organizationId: 'org-personal-1',
        workspaceId: 'workspace-freelancer-1',
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
            organizationId: 'org-personal-1',
            workspaceId: 'workspace-client-1',
            workspaceKind: 'client',
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
          contractPath: '/app/contracts/job-123?invite=invite-token-123',
          createdAt: 20,
          updatedAt: 20,
          applicant: {
            userId: 'talent-1',
            organizationId: 'org-talent-1',
            workspaceId: 'workspace-freelancer-talent-1',
            workspaceKind: 'freelancer',
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
            ownerWorkspaceId: 'workspace-client-1',
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
      screen.getByRole('heading', { name: 'My applications' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('External proof URLs')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('marketplace-my-application-app-1')).getByRole('link', {
        name: 'View contract',
      }),
    ).toHaveAttribute('href', '/app/contracts/job-123?invite=invite-token-123');
    expect(screen.getByText('Active workspace')).toBeInTheDocument();
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
      capabilities: {},
      workspaces: [
        {
          workspaceId: 'workspace-client-1',
          kind: 'client',
          label: 'مساحة العميل',
          slug: 'client-workspace',
          organizationId: 'org-personal-1',
          organizationName: 'مساحة شخصية',
          organizationSlug: 'personal-client-1',
          organizationKind: 'personal',
          roles: ['client_owner'],
          capabilities: {
            manageProfile: false,
            applyToOpportunity: false,
            createOpportunity: true,
            reviewApplications: true,
            manageWorkspace: true,
          },
          isDefault: true,
        },
      ],
      activeWorkspace: {
        workspaceId: 'workspace-client-1',
        kind: 'client',
        label: 'مساحة العميل',
        slug: 'client-workspace',
        organizationId: 'org-personal-1',
        organizationName: 'مساحة شخصية',
        organizationSlug: 'personal-client-1',
        organizationKind: 'personal',
        roles: ['client_owner'],
        capabilities: {
          manageProfile: false,
          applyToOpportunity: false,
          createOpportunity: true,
          reviewApplications: true,
          manageWorkspace: true,
        },
        isDefault: true,
      },
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

    expect(screen.getByRole('heading', { name: 'إنشاء مواصفات التوظيف' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'السوق العام' })).toHaveAttribute(
      'href',
      '/marketplace',
    );
    expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toBeInTheDocument();
    expect(screen.getByLabelText('المهارات الأساسية')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ملكية مساحة العمل' })).toBeInTheDocument();
  });

  it('creates a client organization from the client workspace and refreshes the workspace state', async () => {
    seedJsonStorage(sessionStorageKey, {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
    });
    mockedWebApi.listMarketplaceOpportunities.mockResolvedValue({
      opportunities: [],
    });
    mockedWebApi.me
      .mockResolvedValueOnce({
        id: 'client-1',
        email: 'client@example.com',
        shariahMode: false,
        defaultExecutionWalletAddress: null,
        wallets: [],
        capabilities: {},
        workspaces: [
          {
            workspaceId: 'workspace-client-1',
            kind: 'client',
            label: 'Personal client workspace',
            slug: 'personal-client-client-1',
            organizationId: 'org-personal-1',
            organizationName: 'Personal workspace',
            organizationSlug: 'personal-client-1',
            organizationKind: 'personal',
            roles: ['client_owner'],
            capabilities: {
              manageProfile: false,
              applyToOpportunity: false,
              createOpportunity: true,
              reviewApplications: true,
              manageWorkspace: true,
            },
            isDefault: true,
          },
        ],
        activeWorkspace: {
          workspaceId: 'workspace-client-1',
          kind: 'client',
          label: 'Personal client workspace',
          slug: 'personal-client-client-1',
          organizationId: 'org-personal-1',
          organizationName: 'Personal workspace',
          organizationSlug: 'personal-client-1',
          organizationKind: 'personal',
          roles: ['client_owner'],
          capabilities: {
            manageProfile: false,
            applyToOpportunity: false,
            createOpportunity: true,
            reviewApplications: true,
            manageWorkspace: true,
          },
          isDefault: true,
        },
      })
      .mockResolvedValueOnce({
        id: 'client-1',
        email: 'client@example.com',
        shariahMode: false,
        defaultExecutionWalletAddress: null,
        wallets: [],
        capabilities: {},
        workspaces: [
          {
            workspaceId: 'workspace-client-2',
            kind: 'client',
            label: 'Atlas Labs hiring',
            slug: 'atlas-labs-hiring',
            organizationId: 'org-client-2',
            organizationName: 'Atlas Labs',
            organizationSlug: 'atlas-labs',
            organizationKind: 'client',
            roles: ['client_owner'],
            capabilities: {
              manageProfile: false,
              applyToOpportunity: false,
              createOpportunity: true,
              reviewApplications: true,
              manageWorkspace: true,
            },
            isDefault: false,
          },
        ],
        activeWorkspace: {
          workspaceId: 'workspace-client-2',
          kind: 'client',
          label: 'Atlas Labs hiring',
          slug: 'atlas-labs-hiring',
          organizationId: 'org-client-2',
          organizationName: 'Atlas Labs',
          organizationSlug: 'atlas-labs',
          organizationKind: 'client',
          roles: ['client_owner'],
          capabilities: {
            manageProfile: false,
            applyToOpportunity: false,
            createOpportunity: true,
            reviewApplications: true,
            manageWorkspace: true,
          },
          isDefault: false,
        },
      });
    mockedWebApi.listMyMarketplaceOpportunities.mockResolvedValue({
      opportunities: [],
    });
    mockedWebApi.listMyMarketplaceApplications.mockResolvedValue({
      applications: [],
    });
    mockedWebApi.listJobs.mockResolvedValue({
      jobs: [],
    });
    mockedWebApi.getMyMarketplaceProfile.mockRejectedValue(new Error('missing'));
    mockedWebApi.listOrganizations
      .mockResolvedValueOnce({
        organizations: [
          {
            id: 'org-personal-1',
            slug: 'personal-client-1',
            name: 'Personal workspace',
            kind: 'personal',
            roles: ['client_owner'],
            workspaces: [
              {
                workspaceId: 'workspace-client-1',
                kind: 'client',
                label: 'Personal client workspace',
                slug: 'personal-client-client-1',
                organizationId: 'org-personal-1',
                organizationName: 'Personal workspace',
                organizationSlug: 'personal-client-1',
                organizationKind: 'personal',
                roles: ['client_owner'],
                capabilities: {
                  manageProfile: false,
                  applyToOpportunity: false,
                  createOpportunity: true,
                  reviewApplications: true,
                  manageWorkspace: true,
                },
                isDefault: true,
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        organizations: [
          {
            id: 'org-personal-1',
            slug: 'personal-client-1',
            name: 'Personal workspace',
            kind: 'personal',
            roles: ['client_owner'],
            workspaces: [
              {
                workspaceId: 'workspace-client-1',
                kind: 'client',
                label: 'Personal client workspace',
                slug: 'personal-client-client-1',
                organizationId: 'org-personal-1',
                organizationName: 'Personal workspace',
                organizationSlug: 'personal-client-1',
                organizationKind: 'personal',
                roles: ['client_owner'],
                capabilities: {
                  manageProfile: false,
                  applyToOpportunity: false,
                  createOpportunity: true,
                  reviewApplications: true,
                  manageWorkspace: true,
                },
                isDefault: true,
              },
            ],
          },
          {
            id: 'org-client-2',
            slug: 'atlas-labs',
            name: 'Atlas Labs',
            kind: 'client',
            roles: ['client_owner'],
            workspaces: [
              {
                workspaceId: 'workspace-client-2',
                kind: 'client',
                label: 'Atlas Labs hiring',
                slug: 'atlas-labs-hiring',
                organizationId: 'org-client-2',
                organizationName: 'Atlas Labs',
                organizationSlug: 'atlas-labs',
                organizationKind: 'client',
                roles: ['client_owner'],
                capabilities: {
                  manageProfile: false,
                  applyToOpportunity: false,
                  createOpportunity: true,
                  reviewApplications: true,
                  manageWorkspace: true,
                },
                isDefault: false,
              },
            ],
          },
        ],
      });

    renderApp(
      <WebI18nProvider initialLocale="en">
        <MarketplaceWorkspacePage />
      </WebI18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Workspace ownership' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Organization name'), {
      target: { value: 'Atlas Labs' },
    });
    fireEvent.change(screen.getByLabelText('Workspace slug'), {
      target: { value: 'atlas-labs' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create client organization' }));

    await waitFor(() => {
      expect(mockedWebApi.createOrganization).toHaveBeenCalledWith(
        {
          name: 'Atlas Labs',
          slug: 'atlas-labs',
          setActive: true,
        },
        'access-token-123',
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText('Client organization Atlas Labs created and activated.'),
      ).toBeInTheDocument();
    });
  });

  it('renders client workspace actions as disabled when the active workspace lacks client capabilities', async () => {
    seedJsonStorage(sessionStorageKey, {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
    });
    mockedWebApi.listMarketplaceOpportunities.mockResolvedValue({
      opportunities: [],
    });
    mockedWebApi.me.mockResolvedValue({
      id: 'client-1',
      email: 'client@example.com',
      shariahMode: false,
      defaultExecutionWalletAddress: null,
      wallets: [],
      capabilities: {},
      workspaces: [
        {
          workspaceId: 'workspace-client-1',
          kind: 'client',
          label: 'Recruiter workspace',
          slug: 'recruiter-workspace',
          organizationId: 'org-client-1',
          organizationName: 'Atlas Labs',
          organizationSlug: 'atlas-labs',
          organizationKind: 'client',
          roles: ['client_recruiter'],
          capabilities: {
            manageProfile: false,
            applyToOpportunity: false,
            createOpportunity: false,
            reviewApplications: false,
            manageWorkspace: false,
          },
          isDefault: false,
        },
      ],
      activeWorkspace: {
        workspaceId: 'workspace-client-1',
        kind: 'client',
        label: 'Recruiter workspace',
        slug: 'recruiter-workspace',
        organizationId: 'org-client-1',
        organizationName: 'Atlas Labs',
        organizationSlug: 'atlas-labs',
        organizationKind: 'client',
        roles: ['client_recruiter'],
        capabilities: {
          manageProfile: false,
          applyToOpportunity: false,
          createOpportunity: false,
          reviewApplications: false,
          manageWorkspace: false,
        },
        isDefault: false,
      },
    });
    mockedWebApi.listOrganizations.mockResolvedValue({
      organizations: [
        {
          id: 'org-client-1',
          slug: 'atlas-labs',
          name: 'Atlas Labs',
          kind: 'client',
          roles: ['client_recruiter'],
          workspaces: [
            {
              workspaceId: 'workspace-client-1',
              kind: 'client',
              label: 'Recruiter workspace',
              slug: 'recruiter-workspace',
              organizationId: 'org-client-1',
              organizationName: 'Atlas Labs',
              organizationSlug: 'atlas-labs',
              organizationKind: 'client',
              roles: ['client_recruiter'],
              capabilities: {
                manageProfile: false,
                applyToOpportunity: false,
                createOpportunity: false,
                reviewApplications: false,
                manageWorkspace: false,
              },
              isDefault: false,
            },
          ],
        },
      ],
    });
    mockedWebApi.getMyMarketplaceProfile.mockRejectedValue(new Error('missing'));
    mockedWebApi.listMyMarketplaceApplications.mockResolvedValue({
      applications: [],
    });
    mockedWebApi.listMyMarketplaceOpportunities.mockResolvedValue({
      opportunities: [
        {
          id: 'opp-locked-1',
          title: 'Locked brief',
          summary: 'Cannot be reviewed from this workspace',
          description: 'Read-only client workspace.',
          category: 'software-development',
          currencyAddress: '0x4444444444444444444444444444444444444444',
          requiredSkills: ['typescript'],
          mustHaveSkills: ['typescript'],
          outcomes: ['Ship UI'],
          acceptanceCriteria: ['Responsive'],
          screeningQuestions: [],
          visibility: 'public',
          status: 'draft',
          budgetMin: '1000',
          budgetMax: '2000',
          timeline: '2 weeks',
          desiredStartAt: null,
          timezoneOverlapHours: 2,
          engagementType: 'fixed_scope',
          cryptoReadinessRequired: 'wallet_only',
          publishedAt: null,
          hiredApplicationId: null,
          hiredJobId: null,
          createdAt: 10,
          updatedAt: 10,
          owner: {
            userId: 'client-1',
            organizationId: 'org-client-1',
            workspaceId: 'workspace-client-1',
            workspaceKind: 'client',
            displayName: 'Atlas Labs',
            profileSlug: 'atlas-labs',
          },
          escrowReadiness: 'wallet_required',
          applicationCount: 0,
        },
      ],
    });
    mockedWebApi.listJobs.mockResolvedValue({
      jobs: [],
    });

    renderApp(
      <WebI18nProvider initialLocale="en">
        <MarketplaceWorkspacePage />
      </WebI18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Workspace ownership' })).toBeInTheDocument();
    });

    expect(screen.getByText(/only a workspace with management access/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create client organization' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Create draft brief' }),
    ).toBeDisabled();
    expect(
      within(screen.getByTestId('marketplace-my-opportunity-opp-locked-1')).getByRole('button', {
        name: 'Load review board',
      }),
    ).toBeDisabled();
  });

  it('renders freelancer workspace actions as disabled when the active workspace lacks freelancer capabilities', async () => {
    seedJsonStorage(sessionStorageKey, {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
    });
    mockedWebApi.listMarketplaceOpportunities.mockResolvedValue({
      opportunities: [
        {
          id: 'public-locked-1',
          title: 'Public brief',
          summary: 'Visible but not actionable',
          description: 'Freelancer workspace is read-only.',
          category: 'software-development',
          currencyAddress: '0x4444444444444444444444444444444444444444',
          requiredSkills: ['typescript'],
          mustHaveSkills: ['typescript'],
          outcomes: ['Ship UI'],
          acceptanceCriteria: ['Responsive'],
          screeningQuestions: [
            { id: 'q1', prompt: 'How would you deliver?', required: true },
          ],
          visibility: 'public',
          status: 'published',
          budgetMin: '1000',
          budgetMax: '2000',
          timeline: '2 weeks',
          desiredStartAt: null,
          timezoneOverlapHours: 2,
          engagementType: 'fixed_scope',
          cryptoReadinessRequired: 'wallet_only',
          publishedAt: 10,
          hiredApplicationId: null,
          hiredJobId: null,
          createdAt: 10,
          updatedAt: 10,
          owner: {
            userId: 'client-2',
            organizationId: 'org-client-2',
            workspaceId: 'workspace-client-2',
            workspaceKind: 'client',
            displayName: 'Client Two',
            profileSlug: 'client-two',
          },
          escrowReadiness: 'ready',
          applicationCount: 1,
        },
      ],
    });
    mockedWebApi.me.mockResolvedValue({
      id: 'talent-1',
      email: 'talent@example.com',
      shariahMode: false,
      defaultExecutionWalletAddress: null,
      wallets: [],
      capabilities: {},
      workspaces: [
        {
          workspaceId: 'workspace-freelancer-1',
          kind: 'freelancer',
          label: 'Freelancer workspace',
          slug: 'freelancer-workspace',
          organizationId: 'org-personal-1',
          organizationName: 'Personal workspace',
          organizationSlug: 'personal-workspace',
          organizationKind: 'personal',
          roles: ['freelancer'],
          capabilities: {
            manageProfile: false,
            applyToOpportunity: false,
            createOpportunity: false,
            reviewApplications: false,
            manageWorkspace: false,
          },
          isDefault: true,
        },
      ],
      activeWorkspace: {
        workspaceId: 'workspace-freelancer-1',
        kind: 'freelancer',
        label: 'Freelancer workspace',
        slug: 'freelancer-workspace',
        organizationId: 'org-personal-1',
        organizationName: 'Personal workspace',
        organizationSlug: 'personal-workspace',
        organizationKind: 'personal',
        roles: ['freelancer'],
        capabilities: {
          manageProfile: false,
          applyToOpportunity: false,
          createOpportunity: false,
          reviewApplications: false,
          manageWorkspace: false,
        },
        isDefault: true,
      },
    });
    mockedWebApi.getMyMarketplaceProfile.mockResolvedValue({
      profile: {
        userId: 'talent-1',
        organizationId: 'org-personal-1',
        workspaceId: 'workspace-freelancer-1',
        slug: 'talent-one',
        displayName: 'Talent One',
        headline: 'Builder',
        bio: 'Read-only profile',
        skills: ['typescript'],
        specialties: ['marketplaces'],
        rateMin: null,
        rateMax: null,
        timezone: 'UTC',
        availability: 'open',
        preferredEngagements: ['fixed_scope'],
        portfolioUrls: ['https://example.com/talent'],
        proofArtifacts: [],
        cryptoReadiness: 'wallet_only',
        verifiedWalletAddress: '0x3333333333333333333333333333333333333333',
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
      opportunities: [],
    });
    mockedWebApi.listMyMarketplaceApplications.mockResolvedValue({
      applications: [
        {
          id: 'app-readonly-1',
          opportunityId: 'public-locked-1',
          coverNote: 'Read only',
          proposedRate: '100',
          selectedWalletAddress: '0x3333333333333333333333333333333333333333',
          screeningAnswers: [],
          deliveryApproach: 'Plan and execute.',
          milestonePlanSummary: 'Two milestones.',
          estimatedStartAt: null,
          relevantProofArtifacts: [],
          portfolioUrls: ['https://example.com/work'],
          status: 'submitted',
          hiredJobId: null,
          contractPath: null,
          createdAt: 20,
          updatedAt: 20,
          applicant: {
            userId: 'talent-1',
            organizationId: 'org-personal-1',
            workspaceId: 'workspace-freelancer-1',
            workspaceKind: 'freelancer',
            displayName: 'Talent One',
            profileSlug: 'talent-one',
            headline: 'Builder',
            specialties: ['marketplaces'],
            verifiedWalletAddress: '0x3333333333333333333333333333333333333333',
            verificationLevel: 'wallet_verified',
            cryptoReadiness: 'wallet_only',
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
          },
          opportunity: {
            id: 'public-locked-1',
            title: 'Public brief',
            visibility: 'public',
            status: 'published',
            ownerDisplayName: 'Client Two',
            ownerWorkspaceId: 'workspace-client-2',
          },
          fitScore: 50,
          fitBreakdown: [],
          riskFlags: [],
          dossier: {
            applicationId: 'app-readonly-1',
            opportunityId: 'public-locked-1',
            recommendation: 'review',
            matchSummary: {
              fitScore: 50,
              requirementCoverage: 50,
              skillOverlap: ['typescript'],
              mustHaveSkillGaps: [],
              riskFlags: [],
              missingRequirements: [],
              fitBreakdown: [],
            },
            whyShortlisted: ['Skill overlap'],
          },
        },
      ],
    });
    mockedWebApi.listJobs.mockResolvedValue({
      jobs: [],
    });

    renderApp(
      <WebI18nProvider initialLocale="en">
        <MarketplaceWorkspacePage />
      </WebI18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Credibility profile' })).toBeInTheDocument();
    });

    expect(screen.getByText(/read-only for freelancer profile edits/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeDisabled();
    expect(
      within(screen.getByTestId('marketplace-my-application-app-readonly-1')).getByRole('button', {
        name: 'Withdraw',
      }),
    ).toBeDisabled();
    expect(
      within(screen.getByTestId('marketplace-open-brief-public-locked-1')).getByRole('button', {
        name: 'Submit structured application',
      }),
    ).toBeDisabled();
  });

  it('renders explicit client and freelancer lane cards with workspace-switch entry points', async () => {
    seedJsonStorage(sessionStorageKey, {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
    });
    mockedWebApi.listMarketplaceOpportunities.mockResolvedValue({
      opportunities: [],
    });
    mockedWebApi.me.mockResolvedValue({
      id: 'client-1',
      email: 'client@example.com',
      shariahMode: false,
      defaultExecutionWalletAddress: null,
      wallets: [],
      capabilities: {},
      workspaces: [
        {
          workspaceId: 'workspace-client-1',
          kind: 'client',
          label: 'Personal client workspace',
          slug: 'personal-client-client-1',
          organizationId: 'org-personal-1',
          organizationName: 'Personal workspace',
          organizationSlug: 'personal-client-1',
          organizationKind: 'personal',
          roles: ['client_owner'],
          capabilities: {
            manageProfile: false,
            applyToOpportunity: false,
            createOpportunity: true,
            reviewApplications: true,
            manageWorkspace: true,
          },
          isDefault: true,
        },
        {
          workspaceId: 'workspace-freelancer-1',
          kind: 'freelancer',
          label: 'Personal freelancer workspace',
          slug: 'personal-freelancer-client-1',
          organizationId: 'org-personal-1',
          organizationName: 'Personal workspace',
          organizationSlug: 'personal-client-1',
          organizationKind: 'personal',
          roles: ['freelancer'],
          capabilities: {
            manageProfile: true,
            applyToOpportunity: true,
            createOpportunity: false,
            reviewApplications: false,
            manageWorkspace: false,
          },
          isDefault: true,
        },
      ],
      activeWorkspace: {
        workspaceId: 'workspace-freelancer-1',
        kind: 'freelancer',
        label: 'Personal freelancer workspace',
        slug: 'personal-freelancer-client-1',
        organizationId: 'org-personal-1',
        organizationName: 'Personal workspace',
        organizationSlug: 'personal-client-1',
        organizationKind: 'personal',
        roles: ['freelancer'],
        capabilities: {
          manageProfile: true,
          applyToOpportunity: true,
          createOpportunity: false,
          reviewApplications: false,
          manageWorkspace: false,
        },
        isDefault: true,
      },
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

    renderApp(
      <WebI18nProvider initialLocale="en">
        <MarketplaceWorkspacePage />
      </WebI18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Choose your marketplace lane' })).toBeInTheDocument();
    });

    expect(
      within(screen.getByTestId('marketplace-mode-card-client')).getByText('Client lane'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('marketplace-mode-card-client')).getByRole('button', {
        name: 'Hire: Personal client workspace',
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('marketplace-mode-card-freelancer')).getByText('Current lane'),
    ).toBeInTheDocument();
  });

  it('renders capability-aware client empty state guidance when no client brief can be authored from the active workspace', async () => {
    seedJsonStorage(sessionStorageKey, {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
    });
    mockedWebApi.listMarketplaceOpportunities.mockResolvedValue({
      opportunities: [],
    });
    mockedWebApi.me.mockResolvedValue({
      id: 'client-1',
      email: 'client@example.com',
      shariahMode: false,
      defaultExecutionWalletAddress: null,
      wallets: [],
      capabilities: {},
      workspaces: [
        {
          workspaceId: 'workspace-client-readonly',
          kind: 'client',
          label: 'Recruiter workspace',
          slug: 'recruiter-workspace',
          organizationId: 'org-client-1',
          organizationName: 'Atlas Labs',
          organizationSlug: 'atlas-labs',
          organizationKind: 'client',
          roles: ['client_recruiter'],
          capabilities: {
            manageProfile: false,
            applyToOpportunity: false,
            createOpportunity: false,
            reviewApplications: true,
            manageWorkspace: false,
          },
          isDefault: false,
        },
        {
          workspaceId: 'workspace-client-authoring',
          kind: 'client',
          label: 'Owner workspace',
          slug: 'owner-workspace',
          organizationId: 'org-client-1',
          organizationName: 'Atlas Labs',
          organizationSlug: 'atlas-labs',
          organizationKind: 'client',
          roles: ['client_owner'],
          capabilities: {
            manageProfile: false,
            applyToOpportunity: false,
            createOpportunity: true,
            reviewApplications: true,
            manageWorkspace: true,
          },
          isDefault: false,
        },
      ],
      activeWorkspace: {
        workspaceId: 'workspace-client-readonly',
        kind: 'client',
        label: 'Recruiter workspace',
        slug: 'recruiter-workspace',
        organizationId: 'org-client-1',
        organizationName: 'Atlas Labs',
        organizationSlug: 'atlas-labs',
        organizationKind: 'client',
        roles: ['client_recruiter'],
        capabilities: {
          manageProfile: false,
          applyToOpportunity: false,
          createOpportunity: false,
          reviewApplications: true,
          manageWorkspace: false,
        },
        isDefault: false,
      },
    });
    mockedWebApi.listOrganizations.mockResolvedValue({
      organizations: [
        {
          id: 'org-client-1',
          slug: 'atlas-labs',
          name: 'Atlas Labs',
          kind: 'client',
          roles: ['client_owner', 'client_recruiter'],
          workspaces: [
            {
              workspaceId: 'workspace-client-readonly',
              kind: 'client',
              label: 'Recruiter workspace',
              slug: 'recruiter-workspace',
              organizationId: 'org-client-1',
              organizationName: 'Atlas Labs',
              organizationSlug: 'atlas-labs',
              organizationKind: 'client',
              roles: ['client_recruiter'],
              capabilities: {
                manageProfile: false,
                applyToOpportunity: false,
                createOpportunity: false,
                reviewApplications: true,
                manageWorkspace: false,
              },
              isDefault: false,
            },
            {
              workspaceId: 'workspace-client-authoring',
              kind: 'client',
              label: 'Owner workspace',
              slug: 'owner-workspace',
              organizationId: 'org-client-1',
              organizationName: 'Atlas Labs',
              organizationSlug: 'atlas-labs',
              organizationKind: 'client',
              roles: ['client_owner'],
              capabilities: {
                manageProfile: false,
                applyToOpportunity: false,
                createOpportunity: true,
                reviewApplications: true,
                manageWorkspace: true,
              },
              isDefault: false,
            },
          ],
        },
      ],
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

    renderApp(
      <WebI18nProvider initialLocale="en">
        <MarketplaceWorkspacePage />
      </WebI18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'My opportunities' })).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'No briefs are shown for this workspace, and client authoring is blocked here. Switch to a client workspace with authoring access to open a hiring lane.',
      ),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('heading', { name: 'My opportunities' }).closest('article')!,
      ).getByRole('button', { name: 'Hire: Owner workspace' }),
    ).toBeInTheDocument();
  });
});
