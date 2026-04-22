import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  renderApp,
  seedJsonStorage,
} from '@escrow4334/frontend-core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebI18nProvider } from '../../lib/i18n';
import { ClientConsole, type ClientConsoleSection } from './client-console';

const sessionStorageKey = 'escrow4337.web.session';

const { mockedWebApi } = vi.hoisted(() => ({
  mockedWebApi: {
    me: vi.fn(),
    listJobs: vi.fn(),
    listMyMarketplaceOpportunities: vi.fn(),
    listOpportunityApplications: vi.fn(),
    getMarketplaceOpportunityApplicationComparison: vi.fn(),
    getMarketplaceApplicationTimeline: vi.fn(),
    listMarketplaceNotifications: vi.fn(),
    listMarketplaceDigests: vi.fn(),
    listMarketplaceDigestDispatchRuns: vi.fn(),
    getMarketplaceAnalyticsOverview: vi.fn(),
    createMarketplaceOpportunity: vi.fn(),
    publishMarketplaceOpportunity: vi.fn(),
    pauseMarketplaceOpportunity: vi.fn(),
    shortlistMarketplaceApplication: vi.fn(),
    rejectMarketplaceApplication: vi.fn(),
    hireMarketplaceApplication: vi.fn(),
    postMarketplaceApplicationInterviewMessage: vi.fn(),
    selectWorkspace: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../../lib/api', () => ({
  webApi: mockedWebApi,
}));

function createReputation(subjectUserId: string, role: 'client' | 'worker') {
  return {
    subjectUserId,
    role,
    identityConfidence: 'wallet_verified',
    publicReviewCount: 0,
    averageRating: null,
    ratingBreakdown: {
      oneStar: 0,
      twoStar: 0,
      threeStar: 0,
      fourStar: 0,
      fiveStar: 0,
    },
    totalContracts: 0,
    completionRate: 0,
    disputeRate: 0,
    onTimeDeliveryRate: 0,
    responseRate: null,
    inviteAcceptanceRate: null,
    revisionRate: null,
    averageContractValueBand: 'unknown',
  } as const;
}

function createClientWorkspace(overrides: Record<string, unknown> = {}) {
  return {
    workspaceId: 'workspace-client-1',
    kind: 'client',
    label: 'Atlas Labs hiring',
    slug: 'atlas-labs-hiring',
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
    isDefault: true,
    ...overrides,
  };
}

function createFreelancerWorkspace(overrides: Record<string, unknown> = {}) {
  return {
    workspaceId: 'workspace-freelancer-1',
    kind: 'freelancer',
    label: 'Atlas Labs talent',
    slug: 'atlas-labs-talent',
    organizationId: 'org-client-1',
    organizationName: 'Atlas Labs',
    organizationSlug: 'atlas-labs',
    organizationKind: 'personal',
    roles: ['freelancer'],
    capabilities: {
      manageProfile: true,
      applyToOpportunity: true,
      createOpportunity: false,
      reviewApplications: false,
      manageWorkspace: false,
    },
    isDefault: false,
    ...overrides,
  };
}

function createUser(overrides: Record<string, unknown> = {}) {
  const clientWorkspace = createClientWorkspace();
  return {
    id: 'client-1',
    email: 'client@example.com',
    shariahMode: false,
    defaultExecutionWalletAddress: '0x1111111111111111111111111111111111111111',
    wallets: [],
    capabilities: {},
    workspaces: [clientWorkspace],
    activeWorkspace: clientWorkspace,
    ...overrides,
  };
}

function createOpportunity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'opp-1',
    ownerOrganizationId: 'org-client-1',
    ownerWorkspaceId: 'workspace-client-1',
    title: 'Escrow redesign brief',
    summary: 'Need a strong client console build.',
    description: 'Build the client-facing dashboard.',
    category: 'software-development',
    currencyAddress: '0x4444444444444444444444444444444444444444',
    requiredSkills: ['typescript'],
    mustHaveSkills: ['typescript'],
    outcomes: ['Launch client console'],
    acceptanceCriteria: ['Responsive console'],
    screeningQuestions: [],
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
      userId: 'client-1',
      organizationId: 'org-client-1',
      workspaceId: 'workspace-client-1',
      workspaceKind: 'client',
      displayName: 'Atlas Labs',
      profileSlug: 'atlas-labs',
      reputation: createReputation('client-1', 'client'),
    },
    escrowReadiness: 'ready',
    applicationCount: 1,
    ...overrides,
  };
}

function createApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: 'app-1',
    opportunityId: 'opp-1',
    applicantOrganizationId: null,
    applicantWorkspaceId: 'workspace-talent-1',
    coverNote: 'I can ship this.',
    proposedRate: '120',
    selectedWalletAddress: '0x3333333333333333333333333333333333333333',
    screeningAnswers: [],
    deliveryApproach: 'Plan, ship, verify.',
    milestonePlanSummary: 'Two milestones.',
    estimatedStartAt: null,
    relevantProofArtifacts: [],
    portfolioUrls: ['https://example.com/work'],
    status: 'submitted',
    hiredJobId: null,
    contractPath: null,
    createdAt: 11,
    updatedAt: 11,
    applicant: {
      userId: 'talent-1',
      organizationId: null,
      workspaceId: 'workspace-talent-1',
      workspaceKind: 'freelancer',
      displayName: 'Builder One',
      profileSlug: 'builder-one',
      headline: 'Escrow-focused builder',
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
      reputation: createReputation('talent-1', 'worker'),
      completedEscrowCount: 2,
    },
    opportunity: {
      id: 'opp-1',
      title: 'Escrow redesign brief',
      visibility: 'public',
      status: 'published',
      ownerDisplayName: 'Atlas Labs',
      ownerWorkspaceId: 'workspace-client-1',
    },
    fitScore: 92,
    fitBreakdown: [],
    riskFlags: [],
    dossier: {
      applicationId: 'app-1',
      opportunityId: 'opp-1',
      recommendation: 'strong_match',
      matchSummary: {
        fitScore: 92,
        requirementCoverage: 100,
        skillOverlap: ['typescript'],
        mustHaveSkillGaps: [],
        riskFlags: [],
        missingRequirements: [],
        fitBreakdown: [],
      },
      whyShortlisted: ['Strong overlap'],
    },
    ...overrides,
  };
}

function createTimeline(application: ReturnType<typeof createApplication>, overrides: Record<string, unknown> = {}) {
  return {
    application,
    revisions: [],
    interviewThread: null,
    offers: [],
    decisions: [],
    contractDraft: null,
    ...overrides,
  };
}

function createJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    title: 'Escrow redesign contract',
    description: 'Client console implementation',
    category: 'software-development',
    termsJSON: {},
    jobHash: 'hash-1',
    fundedAmount: '1500',
    status: 'funded',
    createdAt: 20,
    updatedAt: 20,
    contractorParticipation: {
      contractorEmail: 'builder@example.com',
      status: 'joined',
      joinedAt: 21,
      inviteLastSentAt: 20,
      inviteLastSentMode: 'email',
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
    operations: {
      chainSync: null,
      executionFailureWorkflow: null,
      staleWorkflow: null,
      commercial: null,
    },
    ...overrides,
  };
}

function renderClientConsole(section: ClientConsoleSection) {
  return renderApp(
    <WebI18nProvider initialLocale="en">
      <ClientConsole section={section} />
    </WebI18nProvider>,
  );
}

describe('client console', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    seedJsonStorage(sessionStorageKey, {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
    });
    mockedWebApi.me.mockResolvedValue(createUser());
    mockedWebApi.listJobs.mockResolvedValue({ jobs: [] });
    mockedWebApi.listMyMarketplaceOpportunities.mockResolvedValue({
      opportunities: [],
    });
    mockedWebApi.listOpportunityApplications.mockResolvedValue({
      applications: [],
    });
    mockedWebApi.getMarketplaceOpportunityApplicationComparison.mockResolvedValue({
      candidates: [],
    });
    mockedWebApi.getMarketplaceApplicationTimeline.mockResolvedValue({
      timeline: createTimeline(createApplication()),
    });
    mockedWebApi.listMarketplaceNotifications.mockResolvedValue({
      notifications: [],
    });
    mockedWebApi.listMarketplaceDigests.mockResolvedValue({
      digests: [],
    });
    mockedWebApi.listMarketplaceDigestDispatchRuns.mockResolvedValue({
      runs: [],
    });
    mockedWebApi.getMarketplaceAnalyticsOverview.mockResolvedValue({
      overview: null,
    });
    mockedWebApi.createMarketplaceOpportunity.mockResolvedValue({
      opportunity: createOpportunity({ id: 'opp-new', status: 'draft' }),
    });
    mockedWebApi.publishMarketplaceOpportunity.mockResolvedValue({});
    mockedWebApi.pauseMarketplaceOpportunity.mockResolvedValue({});
    mockedWebApi.shortlistMarketplaceApplication.mockResolvedValue({});
    mockedWebApi.rejectMarketplaceApplication.mockResolvedValue({});
    mockedWebApi.hireMarketplaceApplication.mockResolvedValue({ jobId: 'job-1' });
    mockedWebApi.postMarketplaceApplicationInterviewMessage.mockResolvedValue({});
    mockedWebApi.selectWorkspace.mockResolvedValue({
      activeWorkspace: createClientWorkspace(),
      workspaces: [createClientWorkspace()],
    });
    mockedWebApi.logout.mockResolvedValue({});
  });

  it('renders the dashboard control tower with prioritized client action cards', async () => {
    const draftOpportunity = createOpportunity({
      id: 'opp-draft',
      title: 'Draft client brief',
      status: 'draft',
      applicationCount: 0,
    });
    const publishedOpportunity = createOpportunity({
      id: 'opp-live',
      title: 'Live client brief',
      status: 'published',
      applicationCount: 2,
    });
    const applicantOne = createApplication({
      id: 'app-interview',
      opportunityId: 'opp-live',
      opportunity: {
        id: 'opp-live',
        title: 'Live client brief',
        visibility: 'public',
        status: 'published',
        ownerDisplayName: 'Atlas Labs',
        ownerWorkspaceId: 'workspace-client-1',
      },
    });
    const applicantTwo = createApplication({
      id: 'app-offer',
      opportunityId: 'opp-live',
      status: 'shortlisted',
      opportunity: {
        id: 'opp-live',
        title: 'Live client brief',
        visibility: 'public',
        status: 'published',
        ownerDisplayName: 'Atlas Labs',
        ownerWorkspaceId: 'workspace-client-1',
      },
    });

    mockedWebApi.listMyMarketplaceOpportunities.mockResolvedValue({
      opportunities: [draftOpportunity, publishedOpportunity],
    });
    mockedWebApi.listOpportunityApplications.mockImplementation(async (opportunityId: string) => ({
      applications:
        opportunityId === 'opp-live' ? [applicantOne, applicantTwo] : [],
    }));
    mockedWebApi.getMarketplaceApplicationTimeline.mockImplementation(async (applicationId: string) => ({
      timeline:
        applicationId === 'app-interview'
          ? createTimeline(applicantOne, {
              interviewThread: {
                id: 'thread-1',
                applicationId: 'app-interview',
                opportunityId: 'opp-live',
                clientUserId: 'client-1',
                applicantUserId: 'talent-1',
                status: 'open',
                createdAt: 12,
                updatedAt: 13,
                messages: [
                  {
                    id: 'msg-1',
                    threadId: 'thread-1',
                    applicationId: 'app-interview',
                    opportunityId: 'opp-live',
                    senderUserId: 'talent-1',
                    senderWorkspaceId: 'workspace-talent-1',
                    senderEmail: 'builder@example.com',
                    kind: 'clarification',
                    body: 'Can you confirm the milestone review window?',
                    createdAt: 13,
                  },
                ],
              },
            })
          : createTimeline(applicantTwo, {
              offers: [
                {
                  id: 'offer-1',
                  applicationId: 'app-offer',
                  opportunityId: 'opp-live',
                  clientUserId: 'client-1',
                  applicantUserId: 'talent-1',
                  status: 'sent',
                  message: null,
                  counterMessage: null,
                  declineReason: null,
                  proposedRate: '150',
                  milestones: [
                    {
                      title: 'Ship dashboard',
                      deliverable: 'Client console',
                      amount: '1500',
                      dueAt: null,
                    },
                  ],
                  revisionNumber: 1,
                  createdAt: 14,
                  updatedAt: 14,
                },
              ],
            }),
    }));
    mockedWebApi.listJobs.mockResolvedValue({
      jobs: [
        {
          participantRoles: ['client'],
          job: createJob({
            id: 'job-funding',
            fundedAmount: null,
            status: 'draft',
            contractorParticipation: {
              contractorEmail: 'builder@example.com',
              status: 'pending',
              joinedAt: null,
              inviteLastSentAt: null,
              inviteLastSentMode: null,
            },
          }),
        },
        {
          participantRoles: ['client'],
          job: createJob({
            id: 'job-review',
            milestones: [
              {
                title: 'Deliver dashboard',
                deliverable: 'Responsive client console',
                amount: '1500',
                status: 'delivered',
                deliveredAt: 30,
                deliveryEvidenceUrls: ['https://example.com/delivery'],
              },
            ],
          }),
        },
        {
          participantRoles: ['client'],
          job: createJob({
            id: 'job-dispute',
            status: 'disputed',
            milestones: [
              {
                title: 'Resolve dispute',
                deliverable: 'Escrow resolution',
                amount: '900',
                status: 'disputed',
                disputedAt: 31,
                disputeEvidenceUrls: ['https://example.com/dispute'],
              },
            ],
          }),
        },
      ],
    });
    mockedWebApi.listMarketplaceNotifications.mockResolvedValue({
      notifications: [
        {
          id: 'notification-1',
          userId: 'client-1',
          workspaceId: 'workspace-client-1',
          kind: 'application_activity',
          status: 'unread',
          title: 'Applicant replied',
          detail: 'Builder One replied in the interview thread.',
          actorUserId: 'talent-1',
          relatedOpportunityId: 'opp-live',
          relatedApplicationId: 'app-interview',
          relatedOfferId: null,
          relatedJobId: null,
          relatedAutomationRunId: null,
          createdAt: 15,
          updatedAt: 15,
        },
      ],
    });
    mockedWebApi.listMarketplaceDigests.mockResolvedValue({
      digests: [
        {
          id: 'digest-1',
          userId: 'client-1',
          workspaceId: 'workspace-client-1',
          dispatchRunId: 'dispatch-1',
          cadence: 'daily',
          status: 'fresh',
          title: 'Atlas Labs digest',
          summary: 'Two client actions need follow-through.',
          highlights: [],
          stats: {
            unreadNotifications: 1,
            visibleNotifications: 1,
            taskCount: 2,
            rehireCandidateCount: 0,
            searchImpressions: 12,
            applications: 2,
            hires: 0,
          },
          createdAt: 15,
          updatedAt: 15,
        },
      ],
    });
    mockedWebApi.listMarketplaceDigestDispatchRuns.mockResolvedValue({
      runs: [
        {
          id: 'dispatch-1',
          workspaceId: 'workspace-client-1',
          triggeredByUserId: 'client-1',
          triggeredByEmail: 'client@example.com',
          trigger: 'manual',
          mode: 'due',
          summary: 'Daily digest sent.',
          recipients: [],
          createdAt: 15,
          dispatchedCount: 1,
          skippedCount: 0,
          preview: 'client@example.com',
        },
      ],
    });
    mockedWebApi.getMarketplaceAnalyticsOverview.mockResolvedValue({
      overview: {
        generatedAt: '2026-04-22T00:00:00.000Z',
        workspace: {
          workspaceId: 'workspace-client-1',
          kind: 'client',
          organizationId: 'org-client-1',
          organizationKind: 'client',
        },
        summary: {
          searchImpressions: 12,
          resultClicks: 6,
          savedSearches: 0,
          applications: 2,
          shortlists: 1,
          interviews: 1,
          offers: 1,
          hires: 0,
          activeContracts: 3,
        },
        funnel: [],
        liquidity: [],
        noHireReasons: [],
        topSearches: [],
        stalledItems: [],
        retention: {
          talentPools: 0,
          trackedTalent: 0,
          automationRules: 0,
          automationRuns: 0,
          automatedTaskDeliveries: 0,
          pendingLifecycleTasks: 0,
          rehireCandidates: 0,
        },
      },
    });

    renderClientConsole('dashboard');

    expect(
      await screen.findByRole('heading', { name: 'Needs action now' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('client-console-action-publish-briefs')).toBeInTheDocument();
    expect(screen.getByTestId('client-console-action-review-applicants')).toBeInTheDocument();
    expect(screen.getByTestId('client-console-action-reply-interviews')).toBeInTheDocument();
    expect(screen.getByTestId('client-console-action-offers')).toBeInTheDocument();
    expect(screen.getByTestId('client-console-action-funding')).toBeInTheDocument();
    expect(screen.getByTestId('client-console-action-milestone-review')).toBeInTheDocument();
    expect(screen.getByTestId('client-console-action-disputes')).toBeInTheDocument();
    expect(screen.getByText('Latest digest dispatch delivered 1 item.')).toBeInTheDocument();
    expect(screen.getByTestId('client-console-nav-contracts')).toHaveAttribute(
      'href',
      '/app/marketplace/client/contracts',
    );
  });

  it('blocks non-client workspaces with an explicit switch action', async () => {
    const clientWorkspace = createClientWorkspace({ label: 'Atlas Labs hiring' });
    mockedWebApi.me.mockResolvedValue(
      createUser({
        workspaces: [createFreelancerWorkspace(), clientWorkspace],
        activeWorkspace: createFreelancerWorkspace(),
      }),
    );

    renderClientConsole('dashboard');

    expect(await screen.findByText('Client workspace required')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Switch to Atlas Labs hiring' }),
    );

    await waitFor(() => {
      expect(mockedWebApi.selectWorkspace).toHaveBeenCalledWith(
        'workspace-client-1',
        'access-token-123',
      );
    });
  });

  it('supports brief creation plus publish and pause controls on the opportunities page', async () => {
    mockedWebApi.listMyMarketplaceOpportunities.mockResolvedValue({
      opportunities: [
        createOpportunity({
          id: 'opp-draft',
          title: 'Draft brief',
          status: 'draft',
          publishedAt: null,
          applicationCount: 0,
        }),
        createOpportunity({
          id: 'opp-published',
          title: 'Published brief',
          status: 'published',
          applicationCount: 2,
        }),
      ],
    });

    renderClientConsole('opportunities');

    expect(
      await screen.findByRole('heading', { name: 'Create brief' }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'New client brief' },
    });
    fireEvent.change(screen.getByLabelText('Summary'), {
      target: { value: 'Decision-ready summary' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Need a funded dashboard build.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create draft brief' }));

    await waitFor(() => {
      expect(mockedWebApi.createMarketplaceOpportunity).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New client brief',
          summary: 'Decision-ready summary',
          description: 'Need a funded dashboard build.',
          visibility: 'public',
          engagementType: 'fixed_scope',
        }),
        'access-token-123',
      );
    });

    fireEvent.click(
      within(screen.getByTestId('client-console-opportunity-opp-draft')).getByRole(
        'button',
        { name: 'Publish' },
      ),
    );
    fireEvent.click(
      within(screen.getByTestId('client-console-opportunity-opp-published')).getByRole(
        'button',
        { name: 'Pause' },
      ),
    );

    await waitFor(() => {
      expect(mockedWebApi.publishMarketplaceOpportunity).toHaveBeenCalledWith(
        'opp-draft',
        'access-token-123',
      );
      expect(mockedWebApi.pauseMarketplaceOpportunity).toHaveBeenCalledWith(
        'opp-published',
        'access-token-123',
      );
    });
  });

  it('renders the opportunities empty state when no client briefs exist', async () => {
    mockedWebApi.listMyMarketplaceOpportunities.mockResolvedValue({
      opportunities: [],
    });

    renderClientConsole('opportunities');

    expect(
      await screen.findByText(
        'No client briefs exist yet for this workspace. Start with a decision-ready brief.',
      ),
    ).toBeInTheDocument();
  });

  it('supports shortlist, reject, and hire actions from the applicant review queue', async () => {
    const opportunity = createOpportunity({
      id: 'opp-review',
      title: 'Review queue brief',
    });
    const application = createApplication({
      id: 'app-review',
      opportunityId: 'opp-review',
      opportunity: {
        id: 'opp-review',
        title: 'Review queue brief',
        visibility: 'public',
        status: 'published',
        ownerDisplayName: 'Atlas Labs',
        ownerWorkspaceId: 'workspace-client-1',
      },
    });

    mockedWebApi.listMyMarketplaceOpportunities.mockResolvedValue({
      opportunities: [opportunity],
    });
    mockedWebApi.listOpportunityApplications.mockResolvedValue({
      applications: [application],
    });
    mockedWebApi.getMarketplaceOpportunityApplicationComparison.mockResolvedValue({
      candidates: [
        {
          application,
          latestRevision: null,
          latestOffer: null,
          latestMessageAt: null,
          decisionCount: 0,
          contractDraftStatus: 'finalized',
        },
      ],
    });
    mockedWebApi.getMarketplaceApplicationTimeline.mockResolvedValue({
      timeline: createTimeline(application, {
        contractDraft: {
          id: 'draft-1',
          applicationId: 'app-review',
          opportunityId: 'opp-review',
          offerId: 'offer-1',
          clientUserId: 'client-1',
          applicantUserId: 'talent-1',
          status: 'finalized',
          latestSnapshot: {
            title: 'Review queue brief',
            description: 'Contract snapshot',
            category: 'software-development',
            contractorEmail: 'builder@example.com',
            workerAddress: '0x3333333333333333333333333333333333333333',
            currencyAddress: '0x4444444444444444444444444444444444444444',
            scopeSummary: 'Build client console',
            acceptanceCriteria: ['Launch dashboard'],
            outcomes: ['Responsive app'],
            timeline: '2 weeks',
            milestones: [],
            reviewWindowDays: 3,
            disputeModel: 'milestone',
            evidenceExpectation: 'Provide URLs',
            kickoffNote: 'Start immediately',
            platformFeeBps: 100,
            platformFeeLabel: '1%',
            offerId: 'offer-1',
            offerRevisionNumber: 1,
            opportunityId: 'opp-review',
            applicationId: 'app-review',
          },
          metadataHash: 'hash-1',
          revisions: [],
          clientApprovedAt: 15,
          applicantApprovedAt: 15,
          finalizedAt: 16,
          convertedJobId: null,
          createdAt: 14,
          updatedAt: 16,
        },
      }),
    });

    renderClientConsole('applicants');

    const applicantCard = await screen.findByTestId('client-console-applicant-app-review');
    expect(screen.getByText('1 candidate comparison row loaded.')).toBeInTheDocument();

    fireEvent.click(within(applicantCard).getByRole('button', { name: 'Shortlist' }));
    fireEvent.click(within(applicantCard).getByRole('button', { name: 'Reject' }));
    fireEvent.click(within(applicantCard).getByRole('button', { name: 'Hire into escrow' }));

    await waitFor(() => {
      expect(mockedWebApi.shortlistMarketplaceApplication).toHaveBeenCalledWith(
        'app-review',
        'access-token-123',
      );
      expect(mockedWebApi.rejectMarketplaceApplication).toHaveBeenCalledWith(
        'app-review',
        'access-token-123',
      );
      expect(mockedWebApi.hireMarketplaceApplication).toHaveBeenCalledWith(
        'app-review',
        'access-token-123',
      );
    });
  });

  it('renders interview threads and posts a client reply', async () => {
    const opportunity = createOpportunity({
      id: 'opp-interview',
      title: 'Interview brief',
    });
    const application = createApplication({
      id: 'app-interview',
      opportunityId: 'opp-interview',
      opportunity: {
        id: 'opp-interview',
        title: 'Interview brief',
        visibility: 'public',
        status: 'published',
        ownerDisplayName: 'Atlas Labs',
        ownerWorkspaceId: 'workspace-client-1',
      },
    });

    mockedWebApi.listMyMarketplaceOpportunities.mockResolvedValue({
      opportunities: [opportunity],
    });
    mockedWebApi.listOpportunityApplications.mockResolvedValue({
      applications: [application],
    });
    mockedWebApi.getMarketplaceApplicationTimeline.mockResolvedValue({
      timeline: createTimeline(application, {
        interviewThread: {
          id: 'thread-1',
          applicationId: 'app-interview',
          opportunityId: 'opp-interview',
          clientUserId: 'client-1',
          applicantUserId: 'talent-1',
          status: 'open',
          createdAt: 12,
          updatedAt: 13,
          messages: [
            {
              id: 'msg-1',
              threadId: 'thread-1',
              applicationId: 'app-interview',
              opportunityId: 'opp-interview',
              senderUserId: 'talent-1',
              senderWorkspaceId: 'workspace-talent-1',
              senderEmail: 'builder@example.com',
              kind: 'clarification',
              body: 'Can we confirm the funding sequence?',
              createdAt: 13,
            },
          ],
        },
      }),
    });

    renderClientConsole('interviews');

    expect(await screen.findByText(/Awaiting client reply/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Reply'), {
      target: { value: 'Fund after milestone 1 approval.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));

    await waitFor(() => {
      expect(mockedWebApi.postMarketplaceApplicationInterviewMessage).toHaveBeenCalledWith(
        'app-interview',
        {
          kind: 'clarification',
          body: 'Fund after milestone 1 approval.',
        },
        'access-token-123',
      );
    });
  });

  it('renders offers and converted contract links', async () => {
    const opportunity = createOpportunity({
      id: 'opp-offer',
      title: 'Offer brief',
    });
    const application = createApplication({
      id: 'app-offer',
      opportunityId: 'opp-offer',
      opportunity: {
        id: 'opp-offer',
        title: 'Offer brief',
        visibility: 'public',
        status: 'published',
        ownerDisplayName: 'Atlas Labs',
        ownerWorkspaceId: 'workspace-client-1',
      },
    });

    mockedWebApi.listMyMarketplaceOpportunities.mockResolvedValue({
      opportunities: [opportunity],
    });
    mockedWebApi.listOpportunityApplications.mockResolvedValue({
      applications: [application],
    });
    mockedWebApi.getMarketplaceApplicationTimeline.mockResolvedValue({
      timeline: createTimeline(application, {
        offers: [
          {
            id: 'offer-1',
            applicationId: 'app-offer',
            opportunityId: 'opp-offer',
            clientUserId: 'client-1',
            applicantUserId: 'talent-1',
            status: 'accepted',
            message: 'Final offer',
            counterMessage: null,
            declineReason: null,
            proposedRate: '200',
            milestones: [
              {
                title: 'Milestone 1',
                deliverable: 'Client console',
                amount: '2000',
                dueAt: null,
              },
            ],
            revisionNumber: 2,
            createdAt: 12,
            updatedAt: 13,
          },
        ],
        contractDraft: {
          id: 'draft-1',
          applicationId: 'app-offer',
          opportunityId: 'opp-offer',
          offerId: 'offer-1',
          clientUserId: 'client-1',
          applicantUserId: 'talent-1',
          status: 'converted',
          latestSnapshot: {
            title: 'Offer brief',
            description: 'Contract snapshot',
            category: 'software-development',
            contractorEmail: 'builder@example.com',
            workerAddress: '0x3333333333333333333333333333333333333333',
            currencyAddress: '0x4444444444444444444444444444444444444444',
            scopeSummary: 'Ship the client console',
            acceptanceCriteria: ['Responsive build'],
            outcomes: ['Client dashboard'],
            timeline: '2 weeks',
            milestones: [],
            reviewWindowDays: 3,
            disputeModel: 'milestone',
            evidenceExpectation: 'Provide links',
            kickoffNote: 'Start now',
            platformFeeBps: 100,
            platformFeeLabel: '1%',
            offerId: 'offer-1',
            offerRevisionNumber: 2,
            opportunityId: 'opp-offer',
            applicationId: 'app-offer',
          },
          metadataHash: 'hash-2',
          revisions: [],
          clientApprovedAt: 13,
          applicantApprovedAt: 13,
          finalizedAt: 13,
          convertedJobId: 'job-offer',
          createdAt: 12,
          updatedAt: 13,
        },
      }),
    });

    renderClientConsole('offers');

    expect(
      await screen.findByRole('heading', { name: 'Offers and contract drafts' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 milestone proposed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open contract' })).toHaveAttribute(
      'href',
      '/app/contracts/job-offer',
    );
  });

  it('renders contracts, funding, and disputes with canonical contract deep links', async () => {
    mockedWebApi.listJobs.mockResolvedValue({
      jobs: [
        {
          participantRoles: ['client'],
          job: createJob({
            id: 'job-contract',
            title: 'Contract ready for review',
            milestones: [
              {
                title: 'Milestone 1',
                deliverable: 'Client dashboard',
                amount: '1000',
                status: 'delivered',
                deliveredAt: 30,
                deliveryEvidenceUrls: ['https://example.com/delivery'],
              },
            ],
          }),
        },
        {
          participantRoles: ['client'],
          job: createJob({
            id: 'job-funding',
            title: 'Contract waiting on funding',
            fundedAmount: null,
            status: 'draft',
            contractorParticipation: {
              contractorEmail: 'builder@example.com',
              status: 'pending',
              joinedAt: null,
              inviteLastSentAt: null,
              inviteLastSentMode: null,
            },
          }),
        },
        {
          participantRoles: ['client'],
          job: createJob({
            id: 'job-dispute',
            title: 'Contract in dispute',
            status: 'disputed',
            milestones: [
              {
                title: 'Milestone 2',
                deliverable: 'Disputed milestone',
                amount: '900',
                status: 'disputed',
                disputedAt: 31,
                disputeEvidenceUrls: [
                  'https://example.com/evidence-1',
                  'https://example.com/evidence-2',
                ],
              },
            ],
          }),
        },
      ],
    });

    const { rerender } = render(
      <WebI18nProvider initialLocale="en">
        <ClientConsole section="contracts" />
      </WebI18nProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Escrow-backed client contracts' }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: 'Open room' })
        .some((link) => link.getAttribute('href') === '/app/contracts/job-contract/room'),
    ).toBe(true);

    expect(
      screen
        .getAllByRole('link', { name: 'Open contract' })
        .some((link) => link.getAttribute('href') === '/app/contracts/job-contract'),
    ).toBe(true);

    rerender(
      <WebI18nProvider initialLocale="en">
        <ClientConsole section="funding" />
      </WebI18nProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Funding and join readiness' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Awaiting funding')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open contract' })).toHaveAttribute(
      'href',
      '/app/contracts/job-funding',
    );

    rerender(
      <WebI18nProvider initialLocale="en">
        <ClientConsole section="disputes" />
      </WebI18nProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Dispute queue' })).toBeInTheDocument();
    expect(screen.getByText('2 dispute evidence links')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open contract' })).toHaveAttribute(
      'href',
      '/app/contracts/job-dispute',
    );
  });
});
