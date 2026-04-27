'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Button,
  ConsolePage,
  EmptyStateCard,
  FactGrid,
  FactItem,
  PageTopBar,
  SectionCard,
  StatusNotice,
  SurfaceCard,
} from '@escrow4334/frontend-core';
import {
  MotionEmptyState,
  RevealSection,
  SharedCard,
  SpotlightButton,
} from '@escrow4334/frontend-core/spatial';
import { ThemeToggle } from '../theme-toggle';
import styles from '../page.styles';
import { useWebI18n } from '../../lib/i18n';
import {
  webApi,
  type JobView,
  type MarketplaceApplication,
  type MarketplaceApplicationComparison,
  type MarketplaceContractDraft,
  type MarketplaceContractDraftStatus,
  type MarketplaceApplicationDossier,
  type MarketplaceApplicationTimeline,
  type MarketplaceAnalyticsOverview,
  type MarketplaceAutomationRun,
  type MarketplaceAutomationRule,
  type MarketplaceAutomationRuleKind,
  type MarketplaceAutomationRuleSchedule,
  type MarketplaceCryptoReadiness,
  type MarketplaceDigest,
  type MarketplaceDigestCadence,
  type MarketplaceDigestDispatchRun,
  type MarketplaceEngagementType,
  type MarketplaceLifecycleDigest,
  type MarketplaceNotification,
  type MarketplaceNotificationPreferences,
  type MarketplaceOfferMilestoneDraft,
  type MarketplaceOpportunityInvite,
  type MarketplaceOpportunitySearchResult,
  type MarketplaceOpportunity,
  type MarketplaceProfile,
  type MarketplaceProofArtifact,
  type MarketplaceSavedSearch,
  type MarketplaceTalentPool,
  type MarketplaceTalentPoolMemberStage,
  type MarketplaceTalentSearchResult,
  type OrganizationInvitation,
  type OrganizationMembership,
  type OrganizationSummary,
  type SessionTokens,
  type UserProfile,
  type WorkspaceSummary,
} from '../../lib/api';
import {
  buildProjectRoomHref,
  createDefaultNotificationPreferences,
  getLaneFromInvitation,
  getWorkspaceLane,
  readMarketplaceSession,
  splitList,
  workspaceMatchesLane,
  writeMarketplaceSession,
  fromDateInput,
} from './shared';

type ProfileDraft = {
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  skills: string;
  specialties: string;
  rateMin: string;
  rateMax: string;
  timezone: string;
  availability: 'open' | 'limited' | 'unavailable';
  preferredEngagements: string;
  cryptoReadiness: MarketplaceCryptoReadiness;
  portfolioUrls: string;
  externalProofUrls: string;
};

type OpportunityDraft = {
  title: string;
  summary: string;
  description: string;
  category: string;
  currencyAddress: string;
  requiredSkills: string;
  mustHaveSkills: string;
  outcomes: string;
  acceptanceCriteria: string;
  screeningQuestions: string;
  visibility: 'public' | 'private';
  budgetMin: string;
  budgetMax: string;
  timeline: string;
  desiredStartAt: string;
  timezoneOverlapHours: string;
  engagementType: MarketplaceEngagementType;
  cryptoReadinessRequired: MarketplaceCryptoReadiness;
};

type ApplicationDraft = {
  coverNote: string;
  proposedRate: string;
  deliveryApproach: string;
  milestonePlanSummary: string;
  estimatedStartAt: string;
  relevantProofUrls: string;
  screeningAnswers: Record<string, string>;
  revisionReason: string;
};

type OfferDraft = {
  message: string;
  proposedRate: string;
  milestones: string;
  declineReason: string;
};

type ContractDraftEdit = {
  title: string;
  description: string;
  scopeSummary: string;
  acceptanceCriteria: string;
  outcomes: string;
  timeline: string;
  milestones: string;
  reviewWindowDays: string;
  disputeModel: string;
  evidenceExpectation: string;
  kickoffNote: string;
  reason: string;
};

type OrganizationDraft = {
  name: string;
  slug: string;
  kind: 'client' | 'agency';
};

type InvitationDraft = {
  email: string;
  role: OrganizationInvitation['role'];
};

type LaneKind = 'client' | 'freelancer' | 'agency';

type TalentDiscoveryDraft = {
  q: string;
  skill: string;
  skills: string;
  selectedOpportunityId: string;
  inviteMessage: string;
  savedSearchLabel: string;
};

type OpportunityDiscoveryDraft = {
  q: string;
  skill: string;
  skills: string;
  category: string;
  savedSearchLabel: string;
};

type TalentPoolDraft = {
  label: string;
  focusSkills: string;
  note: string;
};

type AutomationRuleDraft = {
  kind: MarketplaceAutomationRuleKind;
  label: string;
  targetId: string;
  schedule: MarketplaceAutomationRuleSchedule;
  enabled: boolean;
};

function toDateInput(value: number | null) {
  if (!value) {
    return '';
  }

  const iso = new Date(value).toISOString();
  return iso.slice(0, 16);
}

function createEmptyProfileDraft(): ProfileDraft {
  return {
    slug: '',
    displayName: '',
    headline: '',
    bio: '',
    skills: '',
    specialties: '',
    rateMin: '',
    rateMax: '',
    timezone: 'UTC',
    availability: 'open',
    preferredEngagements: 'fixed_scope',
    cryptoReadiness: 'wallet_only',
    portfolioUrls: '',
    externalProofUrls: '',
  };
}

function createEmptyOpportunityDraft(): OpportunityDraft {
  return {
    title: '',
    summary: '',
    description: '',
    category: 'software-development',
    currencyAddress: '',
    requiredSkills: '',
    mustHaveSkills: '',
    outcomes: '',
    acceptanceCriteria: '',
    screeningQuestions: '',
    visibility: 'public',
    budgetMin: '',
    budgetMax: '',
    timeline: '',
    desiredStartAt: '',
    timezoneOverlapHours: '',
    engagementType: 'fixed_scope',
    cryptoReadinessRequired: 'wallet_only',
  };
}

function createApplicationDraft(
  opportunity: MarketplaceOpportunity,
  profile: MarketplaceProfile | null,
): ApplicationDraft {
  const screeningAnswers = Object.fromEntries(
    opportunity.screeningQuestions.map((question) => [question.id, '']),
  );

  return {
    coverNote:
      'I meet the brief requirements and I am ready to move this into escrow.',
    proposedRate: '',
    deliveryApproach:
      'I will align on acceptance criteria first, then deliver against milestone checkpoints.',
    milestonePlanSummary:
      'Milestone 1 covers scope alignment and first delivery. Milestone 2 covers validation and handoff.',
    estimatedStartAt: '',
    relevantProofUrls:
      profile?.proofArtifacts
        .filter((artifact) => artifact.kind !== 'portfolio')
        .map((artifact) => artifact.url)
        .join('\n') ?? '',
    screeningAnswers,
    revisionReason: '',
  };
}

function createApplicationRevisionDraft(
  application: MarketplaceApplication,
): ApplicationDraft {
  return {
    coverNote: application.coverNote,
    proposedRate: application.proposedRate ?? '',
    deliveryApproach: application.deliveryApproach,
    milestonePlanSummary: application.milestonePlanSummary,
    estimatedStartAt: toDateInput(application.estimatedStartAt),
    relevantProofUrls: application.relevantProofArtifacts
      .map((artifact) => artifact.url)
      .join('\n'),
    screeningAnswers: Object.fromEntries(
      application.screeningAnswers.map((answer) => [answer.questionId, answer.answer]),
    ),
    revisionReason: '',
  };
}

function createEmptyOrganizationDraft(): OrganizationDraft {
  return {
    name: '',
    slug: '',
    kind: 'client',
  };
}

function createEmptyInvitationDraft(): InvitationDraft {
  return {
    email: '',
    role: 'client_recruiter',
  };
}

function createEmptyTalentPoolDraft(): TalentPoolDraft {
  return {
    label: '',
    focusSkills: '',
    note: '',
  };
}

function createEmptyAutomationRuleDraft(): AutomationRuleDraft {
  return {
    kind: 'saved_search_digest',
    label: '',
    targetId: '',
    schedule: 'weekly',
    enabled: true,
  };
}

function slugifyWorkspaceName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function createEmptyTalentDiscoveryDraft(): TalentDiscoveryDraft {
  return {
    q: '',
    skill: '',
    skills: '',
    selectedOpportunityId: '',
    inviteMessage: '',
    savedSearchLabel: '',
  };
}

function createEmptyOpportunityDiscoveryDraft(): OpportunityDiscoveryDraft {
  return {
    q: '',
    skill: '',
    skills: '',
    category: '',
    savedSearchLabel: '',
  };
}

function parseProofUrls(input: string, kind: MarketplaceProofArtifact['kind']) {
  return splitList(input).map((url, index) => ({
    id: `${kind}-${index + 1}`,
    label:
      kind === 'external_case_study'
        ? `Case study ${index + 1}`
        : `Proof ${index + 1}`,
    url,
    kind,
    jobId: null,
  }));
}

function parseScreeningQuestions(input: string) {
  return splitList(input).map((prompt, index) => ({
    id: `screening-${index + 1}`,
    prompt,
    required: true,
  }));
}

function formatPercent(value: number) {
  return `${value}%`;
}

function serializeOfferMilestones(milestones: MarketplaceOfferMilestoneDraft[]) {
  return milestones
    .map((milestone) =>
      [
        milestone.title,
        milestone.deliverable,
        milestone.amount,
        milestone.dueAt ? new Date(milestone.dueAt).toISOString().slice(0, 10) : '',
      ].join(' | '),
    )
    .join('\n');
}

function parseOfferMilestones(input: string) {
  return splitList(input).map((line) => {
    const [title = '', deliverable = '', amount = '', dueAtRaw = ''] = line
      .split('|')
      .map((value) => value.trim());
    return {
      title,
      deliverable,
      amount,
      dueAt: dueAtRaw ? Date.parse(dueAtRaw) || null : null,
    } satisfies MarketplaceOfferMilestoneDraft;
  });
}

function createEmptyOfferDraft(): OfferDraft {
  return {
    message: '',
    proposedRate: '',
    milestones: '',
    declineReason: '',
  };
}

function createContractDraftEdit(draft: MarketplaceContractDraft): ContractDraftEdit {
  return {
    title: draft.latestSnapshot.title,
    description: draft.latestSnapshot.description,
    scopeSummary: draft.latestSnapshot.scopeSummary,
    acceptanceCriteria: draft.latestSnapshot.acceptanceCriteria.join('\n'),
    outcomes: draft.latestSnapshot.outcomes.join('\n'),
    timeline: draft.latestSnapshot.timeline,
    milestones: serializeOfferMilestones(draft.latestSnapshot.milestones),
    reviewWindowDays: String(draft.latestSnapshot.reviewWindowDays),
    disputeModel: draft.latestSnapshot.disputeModel,
    evidenceExpectation: draft.latestSnapshot.evidenceExpectation,
    kickoffNote: draft.latestSnapshot.kickoffNote,
    reason: '',
  };
}

export function MarketplaceWorkspace() {
  const { messages } = useWebI18n();
  const marketplaceMessages = messages.publicMarketplace;
  const workspaceMessages = marketplaceMessages.workspace;
  const clientConsoleMessages = marketplaceMessages.clientConsole;
  const [tokens, setTokens] = useState<SessionTokens | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contracts, setContracts] = useState<JobView[]>([]);
  const [publicOpportunities, setPublicOpportunities] = useState<
    MarketplaceOpportunity[]
  >([]);
  const [myOpportunities, setMyOpportunities] = useState<MarketplaceOpportunity[]>(
    [],
  );
  const [myApplications, setMyApplications] = useState<MarketplaceApplication[]>(
    [],
  );
  const [profile, setProfile] = useState<MarketplaceProfile | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [organizationMemberships, setOrganizationMemberships] = useState<
    OrganizationMembership[]
  >([]);
  const [organizationInvitations, setOrganizationInvitations] = useState<
    OrganizationInvitation[]
  >([]);
  const [savedSearches, setSavedSearches] = useState<MarketplaceSavedSearch[]>([]);
  const [talentPools, setTalentPools] = useState<MarketplaceTalentPool[]>([]);
  const [automationRules, setAutomationRules] = useState<MarketplaceAutomationRule[]>(
    [],
  );
  const [automationRuns, setAutomationRuns] = useState<MarketplaceAutomationRun[]>(
    [],
  );
  const [notifications, setNotifications] = useState<MarketplaceNotification[]>([]);
  const [notificationPreferences, setNotificationPreferences] =
    useState<MarketplaceNotificationPreferences>(
      createDefaultNotificationPreferences(),
    );
  const [marketplaceDigests, setMarketplaceDigests] = useState<MarketplaceDigest[]>(
    [],
  );
  const [digestDispatchRuns, setDigestDispatchRuns] = useState<
    MarketplaceDigestDispatchRun[]
  >([]);
  const [marketplaceInvites, setMarketplaceInvites] = useState<
    MarketplaceOpportunityInvite[]
  >([]);
  const [analyticsOverview, setAnalyticsOverview] =
    useState<MarketplaceAnalyticsOverview | null>(null);
  const [lifecycleDigest, setLifecycleDigest] =
    useState<MarketplaceLifecycleDigest | null>(null);
  const [talentSearchResults, setTalentSearchResults] = useState<
    MarketplaceTalentSearchResult[]
  >([]);
  const [opportunitySearchResults, setOpportunitySearchResults] = useState<
    MarketplaceOpportunitySearchResult[]
  >([]);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(
    createEmptyProfileDraft(),
  );
  const [opportunityDraft, setOpportunityDraft] = useState<OpportunityDraft>(
    createEmptyOpportunityDraft(),
  );
  const [applicationsByOpportunity, setApplicationsByOpportunity] = useState<
    Record<string, MarketplaceApplication[]>
  >({});
  const [matchesByOpportunity, setMatchesByOpportunity] = useState<
    Record<string, MarketplaceApplicationDossier[]>
  >({});
  const [applicationTimelines, setApplicationTimelines] = useState<
    Record<string, MarketplaceApplicationTimeline>
  >({});
  const [comparisonsByOpportunity, setComparisonsByOpportunity] = useState<
    Record<string, MarketplaceApplicationComparison[]>
  >({});
  const [applicationDrafts, setApplicationDrafts] = useState<
    Record<string, ApplicationDraft>
  >({});
  const [interviewDrafts, setInterviewDrafts] = useState<Record<string, string>>({});
  const [offerDrafts, setOfferDrafts] = useState<Record<string, OfferDraft>>({});
  const [contractDraftEdits, setContractDraftEdits] = useState<
    Record<string, ContractDraftEdit>
  >({});
  const [organizationDraft, setOrganizationDraft] = useState<OrganizationDraft>(
    createEmptyOrganizationDraft(),
  );
  const [invitationDraft, setInvitationDraft] = useState<InvitationDraft>(
    createEmptyInvitationDraft(),
  );
  const [talentDiscoveryDraft, setTalentDiscoveryDraft] =
    useState<TalentDiscoveryDraft>(createEmptyTalentDiscoveryDraft());
  const [opportunityDiscoveryDraft, setOpportunityDiscoveryDraft] =
    useState<OpportunityDiscoveryDraft>(createEmptyOpportunityDiscoveryDraft());
  const [talentPoolDraft, setTalentPoolDraft] = useState<TalentPoolDraft>(
    createEmptyTalentPoolDraft(),
  );
  const [selectedTalentPoolId, setSelectedTalentPoolId] = useState('');
  const [automationRuleDraft, setAutomationRuleDraft] =
    useState<AutomationRuleDraft>(createEmptyAutomationRuleDraft());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeContracts = contracts.filter(
    (job) => job.status !== 'completed' && job.status !== 'resolved',
  );
  const hiredOpportunities = myOpportunities.filter(
    (opportunity) => opportunity.hiredJobId,
  );
  const reviewableApplications = myOpportunities.reduce(
    (count, opportunity) => count + opportunity.applicationCount,
    0,
  );
  const activeApplications = myApplications.filter(
    (application) =>
      application.status !== 'withdrawn' && application.status !== 'rejected',
  );
  const unreadNotifications = notifications.filter(
    (notification) => notification.status === 'unread',
  );
  const latestMarketplaceDigest = marketplaceDigests[0] ?? null;
  const latestDigestDispatchRun = digestDispatchRuns[0] ?? null;
  const strongMatches = Object.values(matchesByOpportunity)
    .flat()
    .filter((match) => match.recommendation === 'strong_match').length;
  const activeWorkspace = user?.activeWorkspace ?? null;
  const availableWorkspaces = user?.workspaces ?? [];
  const activeLane = activeWorkspace ? getWorkspaceLane(activeWorkspace) : null;
  const isClientWorkspace = activeLane === 'client';
  const isFreelancerWorkspace = activeLane === 'freelancer';
  const isAgencyWorkspace = activeLane === 'agency';
  const isTalentWorkspace = activeWorkspace?.kind === 'freelancer';
  const activeOrganization =
    organizations.find(
      (organization) => organization.id === activeWorkspace?.organizationId,
    ) ?? null;
  const workspaceCapabilities = activeWorkspace?.capabilities ?? {
    manageProfile: false,
    applyToOpportunity: false,
    createOpportunity: false,
    reviewApplications: false,
    manageWorkspace: false,
  };
  const canManageWorkspace = workspaceCapabilities.manageWorkspace;
  const canManageProfile = workspaceCapabilities.manageProfile;
  const canApplyToOpportunity = workspaceCapabilities.applyToOpportunity;
  const canCreateOpportunity = workspaceCapabilities.createOpportunity;
  const canReviewApplications = workspaceCapabilities.reviewApplications;
  const findWorkspaceWithCapability = (
    lane: LaneKind,
    capability: keyof typeof workspaceCapabilities,
  ) =>
    availableWorkspaces.find(
      (workspace) =>
        workspaceMatchesLane(workspace, lane) && workspace.capabilities[capability],
    ) ?? null;
  const clientAuthoringWorkspace = findWorkspaceWithCapability(
    'client',
    'createOpportunity',
  );
  const clientReviewWorkspace = findWorkspaceWithCapability(
    'client',
    'reviewApplications',
  );
  const freelancerProfileWorkspace = findWorkspaceWithCapability(
    'freelancer',
    'manageProfile',
  );
  const freelancerApplicationWorkspace = findWorkspaceWithCapability(
    'freelancer',
    'applyToOpportunity',
  );
  const agencyProfileWorkspace = findWorkspaceWithCapability(
    'agency',
    'manageProfile',
  );
  const agencyApplicationWorkspace = findWorkspaceWithCapability(
    'agency',
    'applyToOpportunity',
  );
  const talentSavedSearches = savedSearches.filter((search) => search.kind === 'talent');
  const opportunitySavedSearches = savedSearches.filter(
    (search) => search.kind === 'opportunity',
  );
  const automationRuleTargetOptions =
    automationRuleDraft.kind === 'saved_search_digest'
      ? talentSavedSearches.map((search) => ({
          id: search.id,
          label: search.label,
        }))
      : automationRuleDraft.kind === 'talent_pool_digest'
        ? talentPools.map((pool) => ({
            id: pool.id,
            label: pool.label,
          }))
        : automationRuleDraft.kind === 'invite_followup'
          ? myOpportunities.map((opportunity) => ({
              id: opportunity.id,
              label: opportunity.title,
            }))
          : (lifecycleDigest?.rehireCandidates ?? []).map((candidate) => ({
              id: candidate.jobId,
              label: candidate.profile.displayName,
            }));
  const activeOrganizationInvitable = activeOrganization?.kind === 'client' || activeOrganization?.kind === 'agency';
  const invitationRoleOptions = activeOrganization?.kind === 'agency'
    ? ([
        'agency_member',
        'agency_owner',
      ] satisfies OrganizationInvitation['role'][])
    : activeOrganization?.kind === 'client'
      ? ([
          'client_recruiter',
          'client_owner',
        ] satisfies OrganizationInvitation['role'][])
      : [];

  const formatOpportunityStatus = (status: MarketplaceOpportunity['status']) =>
    marketplaceMessages.labels.opportunityStatus[status];
  const formatApplicationStatus = (status: MarketplaceApplication['status']) =>
    marketplaceMessages.labels.applicationStatus[status];
  const formatRecommendation = (
    recommendation: MarketplaceApplicationDossier['recommendation'],
  ) => marketplaceMessages.labels.recommendation[recommendation];
  const formatWorkspaceMode = (workspace: WorkspaceSummary) =>
    workspaceMessages.activeWorkspace.modeLabel[getWorkspaceLane(workspace)];
  const formatOrganizationRole = (role: OrganizationSummary['roles'][number]) =>
    workspaceMessages.invitationRoles[role as keyof typeof workspaceMessages.invitationRoles] ??
    role;
  const formatSearchReason = (code: string) =>
    marketplaceMessages.labels.searchReason[
      code as keyof typeof marketplaceMessages.labels.searchReason
    ] ?? code;
  const formatContractDraftStatus = (status: MarketplaceContractDraftStatus) =>
    workspaceMessages.contractDraft.statusValue[status];
  const activeWorkspaceSummary = activeWorkspace
    ? `${activeWorkspace.label} • ${
        workspaceMessages.activeWorkspace.modeLabel[activeLane ?? 'client']
      }`
    : workspaceMessages.topBarLabel;
  const activeLaneGuide = activeLane ? workspaceMessages.modeGuide[activeLane] : null;
  const activeWorkspaceRoles = activeWorkspace?.roles.map(formatOrganizationRole).join(', ');
  const renderWorkspaceAction = (
    workspace: WorkspaceSummary | null,
  ) => {
    if (!workspace) {
      return null;
    }

    if (workspace.workspaceId === activeWorkspace?.workspaceId) {
      return (
        <button type="button" disabled>
          {workspaceMessages.modeGuide.currentWorkspace}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => void handleSelectWorkspace(workspace.workspaceId)}
      >
        {workspaceMessages.activeWorkspace.switchWorkspace(
          workspace.label,
          formatWorkspaceMode(workspace),
        )}
      </button>
    );
  };

  async function loadWorkspace(nextTokens: SessionTokens | null = tokens) {
    setLoading(true);
    setError(null);

    try {
      const publicFeed = await webApi.listMarketplaceOpportunities({ limit: 12 });
      setPublicOpportunities(publicFeed.opportunities);

      if (!nextTokens) {
        setUser(null);
        setProfile(null);
        setOrganizations([]);
        setInvitations([]);
        setOrganizationMemberships([]);
        setOrganizationInvitations([]);
        setSavedSearches([]);
        setTalentPools([]);
        setAutomationRules([]);
        setAutomationRuns([]);
        setNotifications([]);
        setNotificationPreferences(createDefaultNotificationPreferences());
        setMarketplaceDigests([]);
        setDigestDispatchRuns([]);
        setMarketplaceInvites([]);
        setAnalyticsOverview(null);
        setLifecycleDigest(null);
        setTalentSearchResults([]);
        setOpportunitySearchResults([]);
        setMyOpportunities([]);
        setMyApplications([]);
        setContracts([]);
        setApplicationsByOpportunity({});
        setMatchesByOpportunity({});
        return;
      }

      const [me, jobs, organizationResponse, invitationResponse] = await Promise.all([
        webApi.me(nextTokens.accessToken),
        webApi.listJobs(nextTokens.accessToken),
        webApi.listOrganizations(nextTokens.accessToken),
        webApi.listInvitations(nextTokens.accessToken),
      ]);
      const nextWorkspace = me.activeWorkspace;
      const [
        myProfileResult,
        myOpportunityResult,
        myApplicationResult,
        orgInvitationResponse,
        orgMembershipResponse,
        savedSearchResponse,
        talentPoolsResponse,
        automationRulesResponse,
        automationRunsResponse,
        notificationsResponse,
        notificationPreferencesResponse,
        digestsResponse,
        digestDispatchRunsResponse,
        myMarketplaceInvitesResponse,
        analyticsResponse,
        lifecycleDigestResponse,
        talentRecommendationResponse,
        opportunityRecommendationResponse,
      ] =
        await Promise.all([
          nextWorkspace?.kind === 'freelancer'
            ? webApi
                .getMyMarketplaceProfile(nextTokens.accessToken)
                .catch(() => null)
            : Promise.resolve(null),
          nextWorkspace?.kind === 'client'
            ? webApi.listMyMarketplaceOpportunities(nextTokens.accessToken)
            : Promise.resolve({ opportunities: [] }),
          nextWorkspace?.kind === 'freelancer'
            ? webApi.listMyMarketplaceApplications(nextTokens.accessToken)
            : Promise.resolve({ applications: [] }),
          nextWorkspace &&
          nextWorkspace.organizationKind !== 'personal'
            ? webApi.listOrganizationInvitations(
                nextWorkspace.organizationId,
                nextTokens.accessToken,
              )
            : Promise.resolve({ invitations: [] }),
          nextWorkspace &&
          nextWorkspace.organizationKind !== 'personal'
            ? webApi.listOrganizationMemberships(
                nextWorkspace.organizationId,
                nextTokens.accessToken,
              )
            : Promise.resolve({ memberships: [] }),
          webApi.listMarketplaceSavedSearches(undefined, nextTokens.accessToken).catch(
            () => ({ searches: [] }),
          ),
          nextWorkspace?.kind === 'client'
            ? webApi.listMarketplaceTalentPools(nextTokens.accessToken).catch(() => ({
                pools: [],
              }))
            : Promise.resolve({ pools: [] }),
          nextWorkspace?.kind === 'client'
            ? webApi.listMarketplaceAutomationRules(nextTokens.accessToken).catch(
                () => ({ rules: [] }),
              )
            : Promise.resolve({ rules: [] }),
          nextWorkspace?.kind === 'client'
            ? webApi.listMarketplaceAutomationRuns(nextTokens.accessToken).catch(
                () => ({ runs: [] }),
              )
            : Promise.resolve({ runs: [] }),
          webApi.listMarketplaceNotifications(nextTokens.accessToken).catch(() => ({
            notifications: [],
          })),
          webApi
            .getMarketplaceNotificationPreferences(nextTokens.accessToken)
            .catch(() => ({
              preferences: createDefaultNotificationPreferences(me.id),
            })),
          webApi.listMarketplaceDigests(nextTokens.accessToken).catch(() => ({
            digests: [],
          })),
          nextWorkspace?.kind === 'client'
            ? webApi
                .listMarketplaceDigestDispatchRuns(nextTokens.accessToken)
                .catch(() => ({ runs: [] }))
            : Promise.resolve({ runs: [] }),
          nextWorkspace?.kind === 'freelancer'
            ? webApi.listMyMarketplaceInvites(nextTokens.accessToken).catch(() => ({
                invites: [],
              }))
            : Promise.resolve({ invites: [] }),
          webApi
            .getMarketplaceAnalyticsOverview(nextTokens.accessToken)
            .catch(() => ({ overview: null })),
          nextWorkspace?.kind === 'client'
            ? webApi.getMarketplaceLifecycleDigest(nextTokens.accessToken).catch(
                () => ({ digest: null }),
              )
            : Promise.resolve({ digest: null }),
          nextWorkspace?.kind === 'client'
            ? webApi
                .getTalentRecommendations({ limit: 6 }, nextTokens.accessToken)
                .catch(() => ({ results: [] }))
            : Promise.resolve({ results: [] }),
          nextWorkspace?.kind === 'freelancer'
            ? webApi
                .getOpportunityRecommendations(
                  { limit: 6 },
                  nextTokens.accessToken,
                )
                .catch(() => ({ results: [] }))
            : Promise.resolve({ results: [] }),
        ]);

      setUser(me);
      setProfile(myProfileResult?.profile ?? null);
      setOrganizations(organizationResponse.organizations);
      setInvitations(invitationResponse.invitations);
      setOrganizationMemberships(orgMembershipResponse.memberships);
      setOrganizationInvitations(orgInvitationResponse.invitations);
      setSavedSearches(savedSearchResponse.searches);
      setTalentPools(talentPoolsResponse.pools);
      setAutomationRules(automationRulesResponse.rules);
      setAutomationRuns(automationRunsResponse.runs);
      setNotifications(notificationsResponse.notifications);
      setNotificationPreferences(notificationPreferencesResponse.preferences);
      setMarketplaceDigests(digestsResponse.digests);
      setDigestDispatchRuns(digestDispatchRunsResponse.runs);
      setMarketplaceInvites(myMarketplaceInvitesResponse.invites);
      setAnalyticsOverview(analyticsResponse.overview);
      setLifecycleDigest(lifecycleDigestResponse.digest);
      setTalentSearchResults(talentRecommendationResponse.results);
      setOpportunitySearchResults(opportunityRecommendationResponse.results);
      setMyOpportunities(myOpportunityResult.opportunities);
      setMyApplications(myApplicationResult.applications);
      setContracts(jobs.jobs.map((entry) => entry.job));
      setApplicationsByOpportunity({});
      setMatchesByOpportunity({});

      if (myProfileResult?.profile) {
        const externalProofs = myProfileResult.profile.proofArtifacts
          .filter((artifact) => artifact.kind === 'external_case_study')
          .map((artifact) => artifact.url)
          .join('\n');
        setProfileDraft({
          slug: myProfileResult.profile.slug,
          displayName: myProfileResult.profile.displayName,
          headline: myProfileResult.profile.headline,
          bio: myProfileResult.profile.bio,
          skills: myProfileResult.profile.skills.join(', '),
          specialties: myProfileResult.profile.specialties.join(', '),
          rateMin: myProfileResult.profile.rateMin ?? '',
          rateMax: myProfileResult.profile.rateMax ?? '',
          timezone: myProfileResult.profile.timezone,
          availability: myProfileResult.profile.availability,
          preferredEngagements:
            myProfileResult.profile.preferredEngagements.join(', '),
          cryptoReadiness: myProfileResult.profile.cryptoReadiness,
          portfolioUrls: myProfileResult.profile.portfolioUrls.join('\n'),
          externalProofUrls: externalProofs,
        });
      } else {
        setProfileDraft(createEmptyProfileDraft());
      }

      setApplicationDrafts((current) => {
        const nextDrafts = { ...current };
        for (const opportunity of publicFeed.opportunities) {
          if (!nextDrafts[opportunity.id]) {
            nextDrafts[opportunity.id] = createApplicationDraft(
              opportunity,
              myProfileResult?.profile ?? null,
            );
          }
        }
        return nextDrafts;
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error && loadError.message.trim().length > 0
          ? loadError.message
          : workspaceMessages.messages.loadFailed,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = readMarketplaceSession();
    setTokens(stored);
    void loadWorkspace(stored);
  }, []);

  useEffect(() => {
    setInvitationDraft((current) => {
      const nextRole =
        activeOrganization?.kind === 'agency'
          ? 'agency_member'
          : activeOrganization?.kind === 'client'
            ? 'client_recruiter'
            : current.role;
      return current.role === nextRole ? current : { ...current, role: nextRole };
    });
  }, [activeOrganization?.kind]);

  useEffect(() => {
    const preferredOpportunity =
      myOpportunities.find((opportunity) => opportunity.status === 'published') ??
      myOpportunities[0] ??
      null;
    setTalentDiscoveryDraft((current) =>
      current.selectedOpportunityId || !preferredOpportunity
        ? current
        : {
            ...current,
            selectedOpportunityId: preferredOpportunity.id,
          },
    );
  }, [myOpportunities]);

  useEffect(() => {
    if (talentPools.length === 0) {
      if (selectedTalentPoolId) {
        setSelectedTalentPoolId('');
      }
      return;
    }
    if (!talentPools.some((pool) => pool.id === selectedTalentPoolId)) {
      setSelectedTalentPoolId(talentPools[0]?.id ?? '');
    }
  }, [selectedTalentPoolId, talentPools]);

  async function handleSignOut() {
    if (tokens) {
      await webApi.logout(tokens.refreshToken);
    }
    writeMarketplaceSession(null);
    setTokens(null);
    setMessage(workspaceMessages.messages.sessionCleared);
    await loadWorkspace(null);
  }

  async function handleSelectWorkspace(workspaceId: string) {
    if (!tokens || user?.activeWorkspace?.workspaceId === workspaceId) {
      return;
    }

    setError(null);
    await webApi.selectWorkspace(workspaceId, tokens.accessToken);
    setMessage(workspaceMessages.messages.workspaceSwitched);
    await loadWorkspace(tokens);
  }

  async function handleEnterLane(kind: LaneKind) {
    const targetWorkspace =
      (kind === 'client'
        ? clientAuthoringWorkspace ?? clientReviewWorkspace
        : kind === 'agency'
          ? agencyProfileWorkspace ?? agencyApplicationWorkspace
          : freelancerProfileWorkspace ?? freelancerApplicationWorkspace) ?? null;
    if (!targetWorkspace) {
      setError(workspaceMessages.messages.laneUnavailable(kind));
      return;
    }
    await handleSelectWorkspace(targetWorkspace.workspaceId);
    setMessage(workspaceMessages.messages.laneReady(kind, targetWorkspace.label));
  }

  async function handleCreateOrganization() {
    if (!tokens) {
      setError(workspaceMessages.messages.signInBeforeCreateOrganization);
      return;
    }

    const name = organizationDraft.name.trim();
    const slug = organizationDraft.slug.trim() || slugifyWorkspaceName(name);
    if (!name || !slug) {
      setError(workspaceMessages.messages.organizationNameRequired);
      return;
    }

    setError(null);
    await webApi.createOrganization(
      {
        name,
        kind: organizationDraft.kind,
        slug,
        setActive: true,
      },
      tokens.accessToken,
    );
    setOrganizationDraft(createEmptyOrganizationDraft());
    setMessage(
      workspaceMessages.messages.organizationCreated(organizationDraft.kind, name),
    );
    await loadWorkspace(tokens);
  }

  async function handleCreateInvitation() {
    if (!tokens || !activeOrganization) {
      setError(workspaceMessages.messages.signInBeforeInvite);
      return;
    }

    const email = invitationDraft.email.trim().toLowerCase();
    if (!email) {
      setError(workspaceMessages.messages.invitationEmailRequired);
      return;
    }

    setError(null);
    await webApi.createOrganizationInvitation(
      activeOrganization.id,
      {
        email,
        role: invitationDraft.role,
      },
      tokens.accessToken,
    );
    setInvitationDraft(createEmptyInvitationDraft());
    setMessage(workspaceMessages.messages.invitationCreated(email));
    await loadWorkspace(tokens);
  }

  async function handleAcceptInvitation(invitation: OrganizationInvitation) {
    if (!tokens) {
      return;
    }

    setError(null);
    await webApi.acceptOrganizationInvitation(
      invitation.invitationId,
      { setActive: true },
      tokens.accessToken,
    );
    setMessage(
      workspaceMessages.messages.invitationAccepted(
        workspaceMessages.activeWorkspace.modeLabel[getLaneFromInvitation(invitation)],
      ),
    );
    await loadWorkspace(tokens);
  }

  async function handleRevokeInvitation(invitationId: string) {
    if (!tokens || !activeOrganization) {
      return;
    }

    setError(null);
    await webApi.revokeOrganizationInvitation(
      activeOrganization.id,
      invitationId,
      tokens.accessToken,
    );
    setMessage(workspaceMessages.messages.invitationRevoked);
    await loadWorkspace(tokens);
  }

  async function handleSearchTalentDirectory() {
    const response = await webApi.searchMarketplaceTalent({
      q: talentDiscoveryDraft.q || undefined,
      skill: talentDiscoveryDraft.skill || undefined,
      skills: talentDiscoveryDraft.skills || undefined,
      limit: 8,
    });
    setTalentSearchResults(response.results);
  }

  async function handleLoadTalentRecommendations() {
    if (!tokens) {
      return;
    }
    const response = await webApi.getTalentRecommendations(
      {
        q: talentDiscoveryDraft.q || undefined,
        skill: talentDiscoveryDraft.skill || undefined,
        skills: talentDiscoveryDraft.skills || undefined,
        limit: 8,
      },
      tokens.accessToken,
    );
    setTalentSearchResults(response.results);
  }

  async function handleSearchOpportunityDirectory() {
    const response = await webApi.searchMarketplaceOpportunities({
      q: opportunityDiscoveryDraft.q || undefined,
      skill: opportunityDiscoveryDraft.skill || undefined,
      skills: opportunityDiscoveryDraft.skills || undefined,
      category: opportunityDiscoveryDraft.category || undefined,
      limit: 8,
    });
    setOpportunitySearchResults(response.results);
  }

  async function handleLoadOpportunityRecommendations() {
    if (!tokens) {
      return;
    }
    const response = await webApi.getOpportunityRecommendations(
      {
        q: opportunityDiscoveryDraft.q || undefined,
        skill: opportunityDiscoveryDraft.skill || undefined,
        skills: opportunityDiscoveryDraft.skills || undefined,
        limit: 8,
      },
      tokens.accessToken,
    );
    setOpportunitySearchResults(response.results);
  }

  async function handleSaveSearch(kind: 'talent' | 'opportunity') {
    if (!tokens) {
      return;
    }
    const label =
      kind === 'talent'
        ? talentDiscoveryDraft.savedSearchLabel.trim() ||
          talentDiscoveryDraft.q.trim() ||
          talentDiscoveryDraft.skill.trim() ||
          'Talent search'
        : opportunityDiscoveryDraft.savedSearchLabel.trim() ||
          opportunityDiscoveryDraft.q.trim() ||
          opportunityDiscoveryDraft.skill.trim() ||
          'Opportunity search';
    const query: Record<string, string | number | boolean | null> =
      kind === 'talent'
        ? {
            q: talentDiscoveryDraft.q || null,
            skill: talentDiscoveryDraft.skill || null,
            skills: talentDiscoveryDraft.skills || null,
            category: null,
          }
        : {
            q: opportunityDiscoveryDraft.q || null,
            skill: opportunityDiscoveryDraft.skill || null,
            skills: opportunityDiscoveryDraft.skills || null,
            category: opportunityDiscoveryDraft.category || null,
          };
    await webApi.createMarketplaceSavedSearch(
      {
        kind,
        label,
        query,
        alertFrequency: 'manual',
      },
      tokens.accessToken,
    );
    setMessage(
      kind === 'talent'
        ? workspaceMessages.messages.talentSearchSaved
        : workspaceMessages.messages.opportunitySearchSaved,
    );
    await loadWorkspace(tokens);
  }

  async function handleDeleteSavedSearch(id: string) {
    if (!tokens) {
      return;
    }
    await webApi.deleteMarketplaceSavedSearch(id, tokens.accessToken);
    setMessage(workspaceMessages.messages.savedSearchDeleted);
    await loadWorkspace(tokens);
  }

  async function handleCreateTalentPool() {
    if (!tokens) {
      return;
    }
    const label = talentPoolDraft.label.trim();
    if (!label) {
      setError('Talent pool label is required.');
      return;
    }
    setError(null);
    const response = await webApi.createMarketplaceTalentPool(
      {
        label,
        focusSkills: splitList(talentPoolDraft.focusSkills),
        note: talentPoolDraft.note.trim() || null,
      },
      tokens.accessToken,
    );
    setTalentPoolDraft(createEmptyTalentPoolDraft());
    setSelectedTalentPoolId(response.pool.id);
    setMessage(`Talent pool created: ${response.pool.label}.`);
    await loadWorkspace(tokens);
  }

  async function handleAddTalentToPool(profileSlug: string) {
    if (!tokens || !selectedTalentPoolId) {
      setError('Select a talent pool before saving candidates.');
      return;
    }
    setError(null);
    await webApi.addMarketplaceTalentPoolMember(
      selectedTalentPoolId,
      {
        profileSlug,
        stage: 'saved',
        sourceOpportunityId: talentDiscoveryDraft.selectedOpportunityId || null,
      },
      tokens.accessToken,
    );
    setMessage('Candidate saved to the selected talent pool.');
    await loadWorkspace(tokens);
  }

  async function handleUpdateTalentPoolMember(
    poolId: string,
    memberId: string,
    stage: MarketplaceTalentPoolMemberStage,
    note: string | null,
  ) {
    if (!tokens) {
      return;
    }
    await webApi.updateMarketplaceTalentPoolMember(
      poolId,
      memberId,
      {
        stage,
        note,
      },
      tokens.accessToken,
    );
    setMessage('Talent pool member updated.');
    await loadWorkspace(tokens);
  }

  async function handleCreateAutomationRule() {
    if (!tokens) {
      return;
    }
    const label = automationRuleDraft.label.trim();
    if (!label) {
      setError('Automation rule label is required.');
      return;
    }
    setError(null);
    await webApi.createMarketplaceAutomationRule(
      {
        kind: automationRuleDraft.kind,
        label,
        targetId: automationRuleDraft.targetId || null,
        schedule: automationRuleDraft.schedule,
        enabled: automationRuleDraft.enabled,
      },
      tokens.accessToken,
    );
    setAutomationRuleDraft(createEmptyAutomationRuleDraft());
    setMessage(`Automation rule created: ${label}.`);
    await loadWorkspace(tokens);
  }

  async function handleUpdateAutomationRule(
    ruleId: string,
    input: {
      schedule?: MarketplaceAutomationRuleSchedule;
      enabled?: boolean;
    },
  ) {
    if (!tokens) {
      return;
    }
    await webApi.updateMarketplaceAutomationRule(ruleId, input, tokens.accessToken);
    setMessage('Automation rule updated.');
    await loadWorkspace(tokens);
  }

  async function handleRunAutomationRule(ruleId: string) {
    if (!tokens) {
      return;
    }
    const response = await webApi.runMarketplaceAutomationRule(
      ruleId,
      { trigger: 'manual' },
      tokens.accessToken,
    );
    setMessage(
      `Automation run completed with ${response.run.taskCount} item${response.run.taskCount === 1 ? '' : 's'}.`,
    );
    await loadWorkspace(tokens);
  }

  async function handleDispatchAutomationRuns(mode: 'due' | 'all_enabled') {
    if (!tokens) {
      return;
    }
    const response = await webApi.dispatchMarketplaceAutomationRuns(
      { mode },
      tokens.accessToken,
    );
    setMessage(
      mode === 'due'
        ? `Ran ${response.runs.length} due automation${response.runs.length === 1 ? '' : 's'}.`
        : `Ran ${response.runs.length} enabled automation${response.runs.length === 1 ? '' : 's'}.`,
    );
    await loadWorkspace(tokens);
  }

  async function handleUpdateNotification(
    notificationId: string,
    status: 'read' | 'dismissed',
  ) {
    if (!tokens) {
      return;
    }
    await webApi.updateMarketplaceNotification(
      notificationId,
      { status },
      tokens.accessToken,
    );
    setMessage(
      status === 'read'
        ? 'Notification marked as read.'
        : 'Notification dismissed.',
    );
    await loadWorkspace(tokens);
  }

  async function handleMarkAllNotificationsRead() {
    if (!tokens) {
      return;
    }
    await webApi.markAllMarketplaceNotificationsRead(tokens.accessToken);
    setMessage('Notifications marked as read.');
    await loadWorkspace(tokens);
  }

  async function handleSaveNotificationPreferences() {
    if (!tokens) {
      return;
    }
    const response = await webApi.updateMarketplaceNotificationPreferences(
      {
        digestCadence: notificationPreferences.digestCadence,
        talentInvitesEnabled: notificationPreferences.talentInvitesEnabled,
        applicationActivityEnabled:
          notificationPreferences.applicationActivityEnabled,
        interviewMessagesEnabled:
          notificationPreferences.interviewMessagesEnabled,
        offerActivityEnabled: notificationPreferences.offerActivityEnabled,
        reviewActivityEnabled: notificationPreferences.reviewActivityEnabled,
        automationActivityEnabled:
          notificationPreferences.automationActivityEnabled,
        lifecycleDigestEnabled:
          notificationPreferences.lifecycleDigestEnabled,
        analyticsDigestEnabled: notificationPreferences.analyticsDigestEnabled,
      },
      tokens.accessToken,
    );
    setNotificationPreferences(response.preferences);
    setMessage('Marketplace notification preferences saved.');
  }

  async function handleGenerateDigest(cadence?: MarketplaceDigestCadence) {
    if (!tokens) {
      return;
    }
    const response = await webApi.generateMarketplaceDigest(
      {
        cadence,
      },
      tokens.accessToken,
    );
    setMarketplaceDigests((current) => [
      response.digest,
      ...current.filter((digest) => digest.id !== response.digest.id),
    ]);
    setMessage('Marketplace digest generated.');
  }

  async function handleDispatchDigests(mode: 'due' | 'all_enabled') {
    if (!tokens) {
      return;
    }
    const response = await webApi.dispatchMarketplaceDigests(
      {
        mode,
        trigger: 'manual',
      },
      tokens.accessToken,
    );
    setDigestDispatchRuns((current) => [
      response.run,
      ...current.filter((run) => run.id !== response.run.id),
    ]);
    await loadWorkspace(tokens);
    setMessage(
      response.run.dispatchedCount === 0
        ? 'No marketplace digests were dispatched.'
        : `Dispatched ${response.run.dispatchedCount} marketplace digest${response.run.dispatchedCount === 1 ? '' : 's'}.`,
    );
  }

  async function handleUpdateDigestStatus(
    digestId: string,
    status: 'acknowledged' | 'archived',
  ) {
    if (!tokens) {
      return;
    }
    const response = await webApi.updateMarketplaceDigest(
      digestId,
      { status },
      tokens.accessToken,
    );
    setMarketplaceDigests((current) =>
      current.map((digest) =>
        digest.id === digestId ? response.digest : digest,
      ),
    );
    setMessage(
      status === 'acknowledged'
        ? 'Marketplace digest acknowledged.'
        : 'Marketplace digest archived.',
    );
  }

  async function handleInviteTalent(profileSlug: string) {
    if (!tokens || !talentDiscoveryDraft.selectedOpportunityId) {
      return;
    }
    await webApi.inviteTalentToMarketplaceOpportunity(
      talentDiscoveryDraft.selectedOpportunityId,
      {
        profileSlug,
        message: talentDiscoveryDraft.inviteMessage.trim() || null,
      },
      tokens.accessToken,
    );
    setMessage(workspaceMessages.messages.talentInvited);
    await loadWorkspace(tokens);
  }

  async function handleCreateRehireOpportunity(jobId: string) {
    if (!tokens) {
      return;
    }
    await webApi.createMarketplaceRehireOpportunity(jobId, {}, tokens.accessToken);
    setMessage('Rehire opportunity created from the completed escrow contract.');
    await loadWorkspace(tokens);
  }

  async function handleSaveProfile() {
    if (!tokens) {
      setError(workspaceMessages.messages.signInBeforeEdit);
      return;
    }

    setError(null);
    const response = await webApi.upsertMarketplaceProfile(
      {
        slug: profileDraft.slug,
        displayName: profileDraft.displayName,
        headline: profileDraft.headline,
        bio: profileDraft.bio,
        skills: splitList(profileDraft.skills),
        specialties: splitList(profileDraft.specialties),
        rateMin: profileDraft.rateMin || null,
        rateMax: profileDraft.rateMax || null,
        timezone: profileDraft.timezone,
        availability: profileDraft.availability,
        preferredEngagements: splitList(
          profileDraft.preferredEngagements,
        ) as MarketplaceEngagementType[],
        cryptoReadiness: profileDraft.cryptoReadiness,
        portfolioUrls: splitList(profileDraft.portfolioUrls),
      },
      tokens.accessToken,
    );
    if (splitList(profileDraft.externalProofUrls).length > 0) {
      await webApi.updateMarketplaceProofs(
        {
          proofArtifacts: parseProofUrls(
            profileDraft.externalProofUrls,
            'external_case_study',
          ),
        },
        tokens.accessToken,
      );
    }
    setProfile(response.profile);
    setMessage(workspaceMessages.messages.profileSaved);
    await loadWorkspace(tokens);
  }

  async function handleCreateOpportunity() {
    if (!tokens) {
      setError(workspaceMessages.messages.signInBeforeCreate);
      return;
    }

    setError(null);
    await webApi.createMarketplaceOpportunity(
      {
        title: opportunityDraft.title,
        summary: opportunityDraft.summary,
        description: opportunityDraft.description,
        category: opportunityDraft.category,
        currencyAddress: opportunityDraft.currencyAddress,
        requiredSkills: splitList(opportunityDraft.requiredSkills),
        mustHaveSkills: splitList(opportunityDraft.mustHaveSkills),
        outcomes: splitList(opportunityDraft.outcomes),
        acceptanceCriteria: splitList(opportunityDraft.acceptanceCriteria),
        screeningQuestions: parseScreeningQuestions(
          opportunityDraft.screeningQuestions,
        ),
        visibility: opportunityDraft.visibility,
        budgetMin: opportunityDraft.budgetMin || null,
        budgetMax: opportunityDraft.budgetMax || null,
        timeline: opportunityDraft.timeline,
        desiredStartAt: fromDateInput(opportunityDraft.desiredStartAt),
        timezoneOverlapHours: opportunityDraft.timezoneOverlapHours
          ? Number(opportunityDraft.timezoneOverlapHours)
          : null,
        engagementType: opportunityDraft.engagementType,
        cryptoReadinessRequired: opportunityDraft.cryptoReadinessRequired,
      },
      tokens.accessToken,
    );
    setOpportunityDraft(createEmptyOpportunityDraft());
    setMessage(workspaceMessages.messages.briefCreated);
    await loadWorkspace(tokens);
  }

  async function handlePublishOpportunity(id: string) {
    if (!tokens) {
      return;
    }

    await webApi.publishMarketplaceOpportunity(id, tokens.accessToken);
    setMessage(workspaceMessages.messages.briefPublished);
    await loadWorkspace(tokens);
  }

  async function handlePauseOpportunity(id: string) {
    if (!tokens) {
      return;
    }

    await webApi.pauseMarketplaceOpportunity(id, tokens.accessToken);
    setMessage(workspaceMessages.messages.briefPaused);
    await loadWorkspace(tokens);
  }

  async function handleLoadApplications(id: string) {
    if (!tokens) {
      return;
    }

    const [applicationsResponse, matchesResponse] = await Promise.all([
      webApi.listOpportunityApplications(id, tokens.accessToken),
      webApi.listOpportunityMatches(id, tokens.accessToken),
    ]);
    setApplicationsByOpportunity((current) => ({
      ...current,
      [id]: applicationsResponse.applications,
    }));
    setMatchesByOpportunity((current) => ({
      ...current,
      [id]: matchesResponse.matches,
    }));
  }

  async function handleLoadApplicationTimeline(applicationId: string) {
    if (!tokens) {
      return;
    }
    const response = await webApi.getMarketplaceApplicationTimeline(
      applicationId,
      tokens.accessToken,
    );
    await webApi
      .markMarketplaceApplicationInterviewThreadRead(applicationId, tokens.accessToken)
      .catch(() => {});
    setApplicationTimelines((current) => ({
      ...current,
      [applicationId]: response.timeline,
    }));
    if (response.timeline.contractDraft) {
      const contractDraft = response.timeline.contractDraft;
      setContractDraftEdits((current) => ({
        ...current,
        [contractDraft.id]:
          current[contractDraft.id] ?? createContractDraftEdit(contractDraft),
      }));
    }
    setMessage(workspaceMessages.messages.timelineLoaded);
  }

  function syncContractDraftIntoTimeline(
    applicationId: string,
    draft: MarketplaceContractDraft,
  ) {
    setApplicationTimelines((current) => {
      const existing = current[applicationId];
      if (!existing) {
        return current;
      }
      return {
        ...current,
        [applicationId]: {
          ...existing,
          contractDraft: draft,
        },
      };
    });
  }

  async function handleLoadComparison(opportunityId: string) {
    if (!tokens) {
      return;
    }
    const response = await webApi.getMarketplaceOpportunityApplicationComparison(
      opportunityId,
      tokens.accessToken,
    );
    setComparisonsByOpportunity((current) => ({
      ...current,
      [opportunityId]: response.candidates,
    }));
    setMessage(workspaceMessages.messages.comparisonLoaded);
  }

  async function handleApplicationDecision(
    action: 'shortlist' | 'reject' | 'hire',
    applicationId: string,
    opportunityId: string,
  ) {
    if (!tokens) {
      return;
    }

    if (action === 'shortlist') {
      await webApi.shortlistMarketplaceApplication(applicationId, tokens.accessToken);
      setMessage(workspaceMessages.messages.applicationShortlisted);
    } else if (action === 'reject') {
      await webApi.rejectMarketplaceApplication(applicationId, tokens.accessToken);
      setMessage(workspaceMessages.messages.applicationRejected);
    } else {
      const response = await webApi.hireMarketplaceApplication(
        applicationId,
        tokens.accessToken,
      );
      setMessage(workspaceMessages.messages.applicationHired(response.jobId));
    }

    await loadWorkspace(tokens);
    await handleLoadApplications(opportunityId);
    await handleLoadApplicationTimeline(applicationId);
  }

  function updateApplicationDraft(
    opportunityId: string,
    updater: (draft: ApplicationDraft) => ApplicationDraft,
  ) {
    setApplicationDrafts((current) => {
      const existing =
        current[opportunityId] ??
        createApplicationDraft(
          publicOpportunities.find((opportunity) => opportunity.id === opportunityId)!,
          profile,
        );
      return {
        ...current,
        [opportunityId]: updater(existing),
      };
    });
  }

  function updateRevisionDraft(
    application: MarketplaceApplication,
    updater: (draft: ApplicationDraft) => ApplicationDraft,
  ) {
    setApplicationDrafts((current) => {
      const existing =
        current[application.id] ?? createApplicationRevisionDraft(application);
      return {
        ...current,
        [application.id]: updater(existing),
      };
    });
  }

  function updateInterviewDraft(
    applicationId: string,
    updater: (draft: string) => string,
  ) {
    setInterviewDrafts((current) => ({
      ...current,
      [applicationId]: updater(current[applicationId] ?? ''),
    }));
  }

  function updateOfferDraft(
    applicationId: string,
    updater: (draft: OfferDraft) => OfferDraft,
  ) {
    setOfferDrafts((current) => ({
      ...current,
      [applicationId]: updater(current[applicationId] ?? createEmptyOfferDraft()),
    }));
  }

  function updateContractDraftEdit(
    draft: MarketplaceContractDraft,
    updater: (current: ContractDraftEdit) => ContractDraftEdit,
  ) {
    setContractDraftEdits((current) => ({
      ...current,
      [draft.id]: updater(current[draft.id] ?? createContractDraftEdit(draft)),
    }));
  }

  async function handleApplyToOpportunity(opportunity: MarketplaceOpportunity) {
    if (!tokens || !user) {
      setError(workspaceMessages.messages.signInBeforeApply);
      return;
    }

    const selectedWalletAddress =
      user.wallets.find(
        (wallet) =>
          wallet.walletKind === 'eoa' && wallet.verificationMethod === 'siwe',
      )?.address ?? '';
    if (!selectedWalletAddress) {
      setError(workspaceMessages.messages.walletRequired);
      return;
    }

    const draft =
      applicationDrafts[opportunity.id] ?? createApplicationDraft(opportunity, profile);
    await webApi.applyToMarketplaceOpportunity(
      opportunity.id,
      {
        coverNote: draft.coverNote,
        proposedRate: draft.proposedRate || null,
        selectedWalletAddress,
        screeningAnswers: opportunity.screeningQuestions.map((question) => ({
          questionId: question.id,
          answer: draft.screeningAnswers[question.id]?.trim() ?? '',
        })),
        deliveryApproach: draft.deliveryApproach,
        milestonePlanSummary: draft.milestonePlanSummary,
        estimatedStartAt: fromDateInput(draft.estimatedStartAt),
        relevantProofArtifacts: parseProofUrls(
          draft.relevantProofUrls,
          'external_case_study',
        ),
        portfolioUrls: profile?.portfolioUrls ?? [],
      },
      tokens.accessToken,
    );
    setMessage(workspaceMessages.messages.applicationSubmitted);
    setApplicationDrafts((current) => ({
      ...current,
      [opportunity.id]: createApplicationDraft(opportunity, profile),
    }));
    await loadWorkspace(tokens);
  }

  async function handleReviseApplication(application: MarketplaceApplication) {
    if (!tokens || !user) {
      setError(workspaceMessages.messages.signInBeforeApply);
      return;
    }

    const selectedWalletAddress =
      user.wallets.find(
        (wallet) =>
          wallet.walletKind === 'eoa' && wallet.verificationMethod === 'siwe',
      )?.address ?? '';
    if (!selectedWalletAddress) {
      setError(workspaceMessages.messages.walletRequired);
      return;
    }

    const draft =
      applicationDrafts[application.id] ??
      createApplicationRevisionDraft(application);
    await webApi.reviseMarketplaceApplication(
      application.id,
      {
        coverNote: draft.coverNote,
        proposedRate: draft.proposedRate || null,
        selectedWalletAddress,
        screeningAnswers: application.screeningAnswers.map((answer) => ({
          questionId: answer.questionId,
          answer: draft.screeningAnswers[answer.questionId]?.trim() ?? '',
        })),
        deliveryApproach: draft.deliveryApproach,
        milestonePlanSummary: draft.milestonePlanSummary,
        estimatedStartAt: fromDateInput(draft.estimatedStartAt),
        relevantProofArtifacts: parseProofUrls(
          draft.relevantProofUrls,
          'external_case_study',
        ),
        portfolioUrls: profile?.portfolioUrls ?? application.portfolioUrls,
        revisionReason: draft.revisionReason || null,
      },
      tokens.accessToken,
    );
    setMessage(workspaceMessages.messages.applicationRevised);
    setApplicationDrafts((current) => ({
      ...current,
      [application.id]: createApplicationRevisionDraft(application),
    }));
    await loadWorkspace(tokens);
    await handleLoadApplicationTimeline(application.id);
  }

  async function handleWithdrawApplication(applicationId: string) {
    if (!tokens) {
      return;
    }

    await webApi.withdrawMarketplaceApplication(applicationId, tokens.accessToken);
    setMessage(workspaceMessages.messages.applicationWithdrawn);
    await loadWorkspace(tokens);
  }

  async function handleSendInterviewMessage(applicationId: string) {
    if (!tokens) {
      return;
    }
    const body = interviewDrafts[applicationId]?.trim();
    if (!body) {
      return;
    }
    const response = await webApi.postMarketplaceApplicationInterviewMessage(
      applicationId,
      {
        kind: 'clarification',
        body,
      },
      tokens.accessToken,
    );
    setApplicationTimelines((current) => ({
      ...current,
      [applicationId]: {
        ...(current[applicationId] ?? {
          application:
            myApplications.find((entry) => entry.id === applicationId) ??
            Object.values(applicationsByOpportunity)
              .flat()
              .find((entry) => entry.id === applicationId)!,
          revisions: [],
          interviewThread: response.thread,
          offers: [],
          decisions: [],
          contractDraft: null,
        }),
        interviewThread: response.thread,
      },
    }));
    setInterviewDrafts((current) => ({
      ...current,
      [applicationId]: '',
    }));
    setMessage(workspaceMessages.messages.interviewMessageSent);
    await loadWorkspace(tokens);
    await handleLoadApplicationTimeline(applicationId);
  }

  async function handleCreateOffer(applicationId: string) {
    if (!tokens) {
      return;
    }
    const draft = offerDrafts[applicationId] ?? createEmptyOfferDraft();
    await webApi.createMarketplaceApplicationOffer(
      applicationId,
      {
        message: draft.message || null,
        proposedRate: draft.proposedRate || null,
        milestones: parseOfferMilestones(draft.milestones),
      },
      tokens.accessToken,
    );
    setOfferDrafts((current) => ({
      ...current,
      [applicationId]: createEmptyOfferDraft(),
    }));
    setMessage(workspaceMessages.messages.offerCreated);
    await loadWorkspace(tokens);
    await handleLoadApplicationTimeline(applicationId);
  }

  async function handleRespondToOffer(
    applicationId: string,
    offerId: string,
    action: 'accept' | 'counter' | 'decline',
  ) {
    if (!tokens) {
      return;
    }
    const draft = offerDrafts[applicationId] ?? createEmptyOfferDraft();
    await webApi.respondToMarketplaceOffer(
      offerId,
      {
        action,
        message: draft.message || null,
        proposedRate: draft.proposedRate || null,
        milestones:
          action === 'counter' && draft.milestones.trim()
            ? parseOfferMilestones(draft.milestones)
            : undefined,
        declineReason: draft.declineReason || null,
      },
      tokens.accessToken,
    );
    setOfferDrafts((current) => ({
      ...current,
      [applicationId]: createEmptyOfferDraft(),
    }));
    setMessage(
      action === 'accept'
        ? workspaceMessages.messages.offerAccepted
        : action === 'counter'
          ? workspaceMessages.messages.offerCountered
          : workspaceMessages.messages.offerDeclined,
    );
    await loadWorkspace(tokens);
    await handleLoadApplicationTimeline(applicationId);
  }

  async function handleReviseContractDraft(
    draft: MarketplaceContractDraft,
    applicationId: string,
  ) {
    if (!tokens) {
      return;
    }
    const edit = contractDraftEdits[draft.id] ?? createContractDraftEdit(draft);
    const response = await webApi.reviseMarketplaceContractDraft(
      draft.id,
      {
        title: edit.title,
        description: edit.description,
        scopeSummary: edit.scopeSummary,
        acceptanceCriteria: splitList(edit.acceptanceCriteria),
        outcomes: splitList(edit.outcomes),
        timeline: edit.timeline,
        milestones: parseOfferMilestones(edit.milestones),
        reviewWindowDays: Number(edit.reviewWindowDays) || 1,
        disputeModel: edit.disputeModel,
        evidenceExpectation: edit.evidenceExpectation,
        kickoffNote: edit.kickoffNote,
        reason: edit.reason.trim() || null,
      },
      tokens.accessToken,
    );
    setContractDraftEdits((current) => ({
      ...current,
      [draft.id]: createContractDraftEdit(response.draft),
    }));
    syncContractDraftIntoTimeline(applicationId, response.draft);
    setMessage(workspaceMessages.messages.contractDraftUpdated);
    await loadWorkspace(tokens);
    await handleLoadApplicationTimeline(applicationId);
  }

  async function handleApproveContractDraft(
    draft: MarketplaceContractDraft,
    applicationId: string,
  ) {
    if (!tokens) {
      return;
    }
    const response = await webApi.approveMarketplaceContractDraft(
      draft.id,
      tokens.accessToken,
    );
    setContractDraftEdits((current) => ({
      ...current,
      [draft.id]: createContractDraftEdit(response.draft),
    }));
    syncContractDraftIntoTimeline(applicationId, response.draft);
    setMessage(workspaceMessages.messages.contractDraftApproved);
    await loadWorkspace(tokens);
    await handleLoadApplicationTimeline(applicationId);
  }

  async function handleConvertContractDraft(
    draft: MarketplaceContractDraft,
    applicationId: string,
  ) {
    if (!tokens) {
      return;
    }
    const response = await webApi.convertMarketplaceContractDraft(
      draft.id,
      tokens.accessToken,
    );
    setMessage(workspaceMessages.messages.contractDraftConverted(response.jobId));
    await loadWorkspace(tokens);
    await handleLoadApplicationTimeline(applicationId);
  }

  function renderContractDraftPanel(
    application: MarketplaceApplication,
    draft: MarketplaceContractDraft,
    actor: 'client' | 'talent',
  ) {
    const edit = contractDraftEdits[draft.id] ?? createContractDraftEdit(draft);
    const clientApproved = draft.clientApprovedAt !== null;
    const applicantApproved = draft.applicantApprovedAt !== null;
    const actorApproved =
      actor === 'client' ? clientApproved : applicantApproved;
    const canConvert =
      actor === 'client' &&
      draft.status === 'finalized' &&
      draft.clientApprovedAt !== null &&
      draft.applicantApprovedAt !== null &&
      draft.convertedJobId === null;

    return (
      <div className={styles.stack}>
        <span className={styles.metaLabel}>{workspaceMessages.contractDraft.title}</span>
        <div className={styles.walletCard}>
          <strong>
            {workspaceMessages.contractDraft.statusLabel}:{' '}
            {formatContractDraftStatus(draft.status)}
          </strong>
          <p className={styles.stateText}>
            {workspaceMessages.contractDraft.metadataHash}: {draft.metadataHash}
          </p>
          <p className={styles.stateText}>
            {workspaceMessages.contractDraft.approvals(clientApproved, applicantApproved)}
          </p>
          <p className={styles.stateText}>
            {workspaceMessages.contractDraft.revisionCount(draft.revisions.length)}
          </p>
          <p className={styles.stateText}>
            {workspaceMessages.contractDraft.platformFee}:{' '}
            {draft.latestSnapshot.platformFeeLabel}
          </p>
          {draft.convertedJobId ? (
            <div className={styles.inlineActions}>
              <Link
                className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                href={application.contractPath ?? `/app/contracts/${draft.convertedJobId}`}
              >
                {workspaceMessages.viewContract}
              </Link>
              {buildProjectRoomHref(
                application.contractPath,
                draft.convertedJobId,
              ) ? (
                <Link
                  className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                  href={
                    buildProjectRoomHref(
                      application.contractPath,
                      draft.convertedJobId,
                    ) ?? `/app/contracts/${draft.convertedJobId}/room`
                  }
                >
                  {messages.common.projectRoom}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <label className={styles.field}>
          <span>{workspaceMessages.contractDraft.form.title}</span>
          <input
            value={edit.title}
            onChange={(event) =>
              updateContractDraftEdit(draft, (current) => ({
                ...current,
                title: event.target.value,
              }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>{workspaceMessages.contractDraft.form.description}</span>
          <textarea
            rows={4}
            value={edit.description}
            onChange={(event) =>
              updateContractDraftEdit(draft, (current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>{workspaceMessages.contractDraft.form.scopeSummary}</span>
          <textarea
            rows={3}
            value={edit.scopeSummary}
            onChange={(event) =>
              updateContractDraftEdit(draft, (current) => ({
                ...current,
                scopeSummary: event.target.value,
              }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>{workspaceMessages.contractDraft.form.acceptanceCriteria}</span>
          <textarea
            rows={3}
            value={edit.acceptanceCriteria}
            onChange={(event) =>
              updateContractDraftEdit(draft, (current) => ({
                ...current,
                acceptanceCriteria: event.target.value,
              }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>{workspaceMessages.contractDraft.form.outcomes}</span>
          <textarea
            rows={3}
            value={edit.outcomes}
            onChange={(event) =>
              updateContractDraftEdit(draft, (current) => ({
                ...current,
                outcomes: event.target.value,
              }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>{workspaceMessages.contractDraft.form.timeline}</span>
          <input
            value={edit.timeline}
            onChange={(event) =>
              updateContractDraftEdit(draft, (current) => ({
                ...current,
                timeline: event.target.value,
              }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>{workspaceMessages.contractDraft.form.milestones}</span>
          <textarea
            rows={4}
            placeholder={workspaceMessages.offerMilestonePlaceholder}
            value={edit.milestones}
            onChange={(event) =>
              updateContractDraftEdit(draft, (current) => ({
                ...current,
                milestones: event.target.value,
              }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>{workspaceMessages.contractDraft.form.reviewWindowDays}</span>
          <input
            value={edit.reviewWindowDays}
            onChange={(event) =>
              updateContractDraftEdit(draft, (current) => ({
                ...current,
                reviewWindowDays: event.target.value,
              }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>{workspaceMessages.contractDraft.form.disputeModel}</span>
          <input
            value={edit.disputeModel}
            onChange={(event) =>
              updateContractDraftEdit(draft, (current) => ({
                ...current,
                disputeModel: event.target.value,
              }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>{workspaceMessages.contractDraft.form.evidenceExpectation}</span>
          <textarea
            rows={2}
            value={edit.evidenceExpectation}
            onChange={(event) =>
              updateContractDraftEdit(draft, (current) => ({
                ...current,
                evidenceExpectation: event.target.value,
              }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>{workspaceMessages.contractDraft.form.kickoffNote}</span>
          <textarea
            rows={3}
            value={edit.kickoffNote}
            onChange={(event) =>
              updateContractDraftEdit(draft, (current) => ({
                ...current,
                kickoffNote: event.target.value,
              }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>{workspaceMessages.contractDraft.form.revisionReason}</span>
          <input
            value={edit.reason}
            onChange={(event) =>
              updateContractDraftEdit(draft, (current) => ({
                ...current,
                reason: event.target.value,
              }))
            }
          />
        </label>
        <div className={styles.inlineActions}>
          <button
            type="button"
            disabled={draft.status === 'converted' || draft.status === 'cancelled'}
            onClick={() => void handleReviseContractDraft(draft, application.id)}
          >
            {workspaceMessages.contractDraft.revise}
          </button>
          <button
            type="button"
            disabled={
              actorApproved ||
              draft.status === 'converted' ||
              draft.status === 'cancelled'
            }
            onClick={() => void handleApproveContractDraft(draft, application.id)}
          >
            {actorApproved
              ? workspaceMessages.contractDraft.approved
              : workspaceMessages.contractDraft.approve}
          </button>
          {canConvert ? (
            <button
              type="button"
              onClick={() => void handleConvertContractDraft(draft, application.id)}
            >
              {workspaceMessages.contractDraft.convert}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <ConsolePage theme="web">
      <RevealSection>
        <PageTopBar
          eyebrow={workspaceMessages.topBarLabel}
          title={activeWorkspaceSummary}
          description={workspaceMessages.topBarMeta}
          className={styles.topBar}
          contentClassName={styles.topBarContent}
          actions={
            <>
              <Button asChild variant="secondary">
                <Link href="/marketplace">{workspaceMessages.publicMarketplace}</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/app/new-contract">{marketplaceMessages.directContractPath}</Link>
              </Button>
              <ThemeToggle
                className={styles.languageSwitcher}
                labelClassName={styles.languageSwitcherLabel}
                optionClassName={styles.languageSwitcherOption}
                optionActiveClassName={styles.languageSwitcherOptionActive}
              />
              {tokens ? (
                <Button type="button" onClick={() => void handleSignOut()}>
                  {workspaceMessages.signOut}
                </Button>
              ) : (
                <SpotlightButton asChild>
                  <Link href="/app/sign-in">{messages.common.signIn}</Link>
                </SpotlightButton>
              )}
            </>
          }
        />
      </RevealSection>

      {message ? (
        <RevealSection as="div" delay={0.04}>
          <SurfaceCard className={styles.panel}>
            <StatusNotice message={message} messageClassName={styles.stateText} />
          </SurfaceCard>
        </RevealSection>
      ) : null}

      {error ? (
        <RevealSection as="div" delay={0.04}>
          <SurfaceCard className={styles.panel}>
            <StatusNotice message={error} messageClassName={styles.stateText} />
          </SurfaceCard>
        </RevealSection>
      ) : null}

      {loading ? (
        <MotionEmptyState>
          <EmptyStateCard
            className={styles.panel}
            title={workspaceMessages.loadingTitle}
            message=""
          />
        </MotionEmptyState>
      ) : null}

      {!loading && !tokens ? (
        <MotionEmptyState>
          <EmptyStateCard
            className={styles.panel}
            title={workspaceMessages.sessionRequiredTitle}
            message={workspaceMessages.sessionRequiredBody}
            messageClassName={styles.stateText}
          />
        </MotionEmptyState>
      ) : null}

      {!loading && tokens && activeWorkspace ? (
        <RevealSection as="div" delay={0.06}>
          <section className={`${styles.hero} grid gap-7`}>
            <div className={styles.stack}>
              <span className={styles.eyebrow}>
                {workspaceMessages.activeWorkspace.eyebrow}
              </span>
              <h1>{activeWorkspace.label}</h1>
              <p className={styles.heroCopy}>
                {activeLaneGuide?.body ?? workspaceMessages.topBarMeta}
              </p>
              <div className={styles.roleBar}>
                <span className={styles.roleBadge}>
                  {workspaceMessages.activeWorkspace.modeLabel[activeLane ?? 'client']}
                </span>
                {activeWorkspace.roles.map((role) => (
                  <span key={role} className={styles.roleBadgeMuted}>
                    {formatOrganizationRole(role)}
                  </span>
                ))}
              </div>
              <article className={styles.statusBanner}>
                <strong>
                  {workspaceMessages.activeWorkspace.organizationLabel}:{' '}
                  {activeWorkspace.organizationName}
                </strong>
                {activeWorkspaceRoles ? (
                  <p className={styles.stateText}>
                    {workspaceMessages.activeWorkspace.roleLabel}: {activeWorkspaceRoles}
                  </p>
                ) : null}
              </article>
              <div className={styles.inlineActions}>
                <Link
                  className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                  href="/marketplace"
                >
                  {workspaceMessages.publicMarketplace}
                </Link>
                <Link
                  className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                  href="/app/new-contract"
                >
                  {marketplaceMessages.directContractPath}
                </Link>
                {isClientWorkspace ? (
                  <Link
                    className={`${styles.actionLink} ${styles.actionLinkPrimary}`}
                    data-testid="workspace-client-console-link"
                    href="/app/marketplace/client"
                  >
                    {clientConsoleMessages.actions.openClientConsole}
                  </Link>
                ) : null}
                {isFreelancerWorkspace ? (
                  <Link
                    className={`${styles.actionLink} ${styles.actionLinkPrimary}`}
                    data-testid="workspace-freelancer-console-link"
                    href="/app/marketplace/freelancer"
                  >
                    {workspaceMessages.freelancerConsole}
                  </Link>
                ) : null}
              </div>
            </div>
            <div className={styles.heroCard}>
              <span className={styles.metaLabel}>
                {workspaceMessages.pipelineTitle}
              </span>
              <FactGrid className={styles.summaryGrid}>
                <FactItem
                  label={workspaceMessages.pipelineStats.publishedBriefs}
                  value={
                    myOpportunities.filter((opportunity) => opportunity.status === 'published')
                      .length
                  }
                />
                <FactItem
                  label={workspaceMessages.pipelineStats.applicationsToReview}
                  value={reviewableApplications}
                />
                <FactItem
                  label={workspaceMessages.pipelineStats.strongMatchesLoaded}
                  value={strongMatches}
                />
                <FactItem
                  label={workspaceMessages.pipelineStats.hiresToEscrow}
                  value={hiredOpportunities.length}
                />
                <FactItem
                  label={workspaceMessages.pipelineStats.activeContracts}
                  value={activeContracts.length}
                />
                <FactItem
                  label={workspaceMessages.pipelineStats.myActiveApplications}
                  value={activeApplications.length}
                />
              </FactGrid>
              {availableWorkspaces.length > 1 ? (
                <div className={styles.stack}>
                  <span className={styles.metaLabel}>
                    {workspaceMessages.modeGuide.title}
                  </span>
                  <div className={styles.inlineActions}>
                    {availableWorkspaces.map((workspace) => (
                      <button
                        key={workspace.workspaceId}
                        type="button"
                        disabled={workspace.workspaceId === activeWorkspace.workspaceId}
                        onClick={() => void handleSelectWorkspace(workspace.workspaceId)}
                      >
                        {workspaceMessages.activeWorkspace.switchWorkspace(
                          workspace.label,
                          formatWorkspaceMode(workspace),
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </RevealSection>
      ) : null}

      {!loading && tokens && availableWorkspaces.length > 0 ? (
        <RevealSection className={styles.grid} delay={0.07}>
          <SectionCard
            className={styles.panel}
            eyebrow={workspaceMessages.modeGuide.eyebrow}
            headerClassName={styles.panelHeader}
            title={workspaceMessages.modeGuide.title}
          >
            <div className={styles.summaryGrid}>
              <SharedCard
                className={styles.actionPanel}
                data-testid="marketplace-mode-card-client"
                interactive
              >
                <div className={styles.stack}>
                  <strong>{workspaceMessages.modeGuide.client.title}</strong>
                  <p className={styles.stateText}>
                    {workspaceMessages.modeGuide.client.body}
                  </p>
                  <p className={styles.stateText}>
                    {isClientWorkspace
                      ? workspaceMessages.modeGuide.currentMode
                      : clientAuthoringWorkspace
                        ? workspaceMessages.modeGuide.availableMode(
                            clientAuthoringWorkspace.label,
                          )
                        : clientReviewWorkspace
                          ? workspaceMessages.modeGuide.availableMode(
                              clientReviewWorkspace.label,
                            )
                          : workspaceMessages.modeGuide.unavailableMode}
                  </p>
                  <div className={styles.inlineActions}>
                    {renderWorkspaceAction(clientAuthoringWorkspace)}
                    {!clientAuthoringWorkspace
                      ? renderWorkspaceAction(clientReviewWorkspace)
                      : null}
                  </div>
                </div>
              </SharedCard>
              <SharedCard
                className={styles.actionPanel}
                data-testid="marketplace-mode-card-freelancer"
                interactive
              >
                <div className={styles.stack}>
                  <strong>{workspaceMessages.modeGuide.freelancer.title}</strong>
                  <p className={styles.stateText}>
                    {workspaceMessages.modeGuide.freelancer.body}
                  </p>
                  <p className={styles.stateText}>
                    {isFreelancerWorkspace
                      ? workspaceMessages.modeGuide.currentMode
                      : freelancerApplicationWorkspace
                        ? workspaceMessages.modeGuide.availableMode(
                            freelancerApplicationWorkspace.label,
                          )
                        : freelancerProfileWorkspace
                          ? workspaceMessages.modeGuide.availableMode(
                              freelancerProfileWorkspace.label,
                            )
                          : workspaceMessages.modeGuide.unavailableMode}
                  </p>
                  <div className={styles.inlineActions}>
                    {renderWorkspaceAction(freelancerApplicationWorkspace)}
                    {!freelancerApplicationWorkspace
                      ? renderWorkspaceAction(freelancerProfileWorkspace)
                      : null}
                  </div>
                </div>
              </SharedCard>
              <SharedCard
                className={styles.actionPanel}
                data-testid="marketplace-mode-card-agency"
                interactive
              >
                <div className={styles.stack}>
                  <strong>{workspaceMessages.modeGuide.agency.title}</strong>
                  <p className={styles.stateText}>
                    {workspaceMessages.modeGuide.agency.body}
                  </p>
                  <p className={styles.stateText}>
                    {isAgencyWorkspace
                      ? workspaceMessages.modeGuide.currentMode
                      : agencyApplicationWorkspace
                        ? workspaceMessages.modeGuide.availableMode(
                            agencyApplicationWorkspace.label,
                          )
                        : agencyProfileWorkspace
                          ? workspaceMessages.modeGuide.availableMode(
                              agencyProfileWorkspace.label,
                            )
                          : workspaceMessages.modeGuide.unavailableMode}
                  </p>
                  <div className={styles.inlineActions}>
                    {renderWorkspaceAction(agencyApplicationWorkspace)}
                    {!agencyApplicationWorkspace
                      ? renderWorkspaceAction(agencyProfileWorkspace)
                      : null}
                  </div>
                </div>
              </SharedCard>
            </div>
          </SectionCard>
        </RevealSection>
      ) : null}

      {!loading && tokens && activeWorkspace ? (
        <RevealSection className={styles.grid} delay={0.075}>
          <SectionCard
            className={styles.panel}
            eyebrow={workspaceMessages.onboarding.eyebrow}
            headerClassName={styles.panelHeader}
            title={workspaceMessages.onboarding.title}
          >
            <div className={styles.summaryGrid}>
              <SharedCard className={styles.actionPanel} interactive>
                <div className={styles.stack}>
                  <strong>{workspaceMessages.onboarding.client.title}</strong>
                  <p className={styles.stateText}>
                    {workspaceMessages.onboarding.client.body}
                  </p>
                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      onClick={() => void handleEnterLane('client')}
                    >
                      {workspaceMessages.onboarding.client.action}
                    </button>
                    {isClientWorkspace ? (
                      <Link
                        className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                        href="/app/marketplace/client"
                      >
                        {clientConsoleMessages.actions.openClientConsole}
                      </Link>
                    ) : null}
                    {isFreelancerWorkspace ? (
                      <Link
                        className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                        href="/app/marketplace/freelancer"
                      >
                        {workspaceMessages.freelancerConsole}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </SharedCard>
              <SharedCard className={styles.actionPanel} interactive>
                <div className={styles.stack}>
                  <strong>{workspaceMessages.onboarding.freelancer.title}</strong>
                  <p className={styles.stateText}>
                    {workspaceMessages.onboarding.freelancer.body}
                  </p>
                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      onClick={() => void handleEnterLane('freelancer')}
                    >
                      {workspaceMessages.onboarding.freelancer.action}
                    </button>
                  </div>
                </div>
              </SharedCard>
              <SharedCard className={styles.actionPanel} interactive>
                <div className={styles.stack}>
                  <strong>{workspaceMessages.onboarding.agency.title}</strong>
                  <p className={styles.stateText}>
                    {workspaceMessages.onboarding.agency.body}
                  </p>
                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      onClick={() => void handleEnterLane('agency')}
                    >
                      {workspaceMessages.onboarding.agency.action}
                    </button>
                  </div>
                </div>
              </SharedCard>
            </div>
          </SectionCard>
        </RevealSection>
      ) : null}

      {!loading && tokens && invitations.length > 0 ? (
        <RevealSection className={styles.grid} delay={0.077}>
          <SectionCard
            className={styles.panel}
            eyebrow={workspaceMessages.invitations.eyebrow}
            headerClassName={styles.panelHeader}
            title={workspaceMessages.invitations.title}
          >
            <div className={styles.stack}>
              <p className={styles.stateText}>
                {workspaceMessages.invitations.body}
              </p>
              {invitations.map((invitation) => (
                <SharedCard
                  key={invitation.invitationId}
                  className={styles.actionPanel}
                  data-testid={`marketplace-pending-invitation-${invitation.invitationId}`}
                  interactive
                >
                  <div className={styles.stack}>
                    <strong>{invitation.organizationName}</strong>
                    <p className={styles.stateText}>
                      {workspaceMessages.invitations.roleLabel}:{' '}
                      {workspaceMessages.invitationRoles[invitation.role]}
                    </p>
                    <div className={styles.inlineActions}>
                      <button
                        type="button"
                        onClick={() => void handleAcceptInvitation(invitation)}
                      >
                        {workspaceMessages.invitations.accept}
                      </button>
                    </div>
                  </div>
                </SharedCard>
              ))}
            </div>
          </SectionCard>
        </RevealSection>
      ) : null}

      {!loading && tokens ? (
        <RevealSection className={styles.grid} delay={0.082}>
          <SectionCard
            className={styles.panel}
            eyebrow="Inbox"
            headerClassName={styles.panelHeader}
            title="Marketplace notifications"
          >
            <div className={styles.stack}>
              <FactGrid className={styles.summaryGrid}>
                <FactItem label="Unread" value={unreadNotifications.length} />
                <FactItem label="Visible" value={notifications.length} />
              </FactGrid>
              {unreadNotifications.length > 0 ? (
                <div className={styles.inlineActions}>
                  <button
                    type="button"
                    onClick={() => void handleMarkAllNotificationsRead()}
                  >
                    Mark all read
                  </button>
                </div>
              ) : null}
              {notifications.length === 0 ? (
                <p className={styles.stateText}>
                  Notifications will appear here as clients and talent move through marketplace and retention flows.
                </p>
              ) : (
                notifications.slice(0, 8).map((notification) => (
                  <SharedCard
                    key={notification.id}
                    className={styles.actionPanel}
                    interactive
                  >
                    <div className={styles.stack}>
                      <strong>{notification.title}</strong>
                      <p className={styles.stateText}>
                        {notification.status} • {new Date(notification.updatedAt).toLocaleString()}
                      </p>
                      <p className={styles.stateText}>{notification.detail}</p>
                      <div className={styles.inlineActions}>
                        {notification.status === 'unread' ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleUpdateNotification(notification.id, 'read')
                            }
                          >
                            Mark read
                          </button>
                        ) : null}
                        {notification.status !== 'dismissed' ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleUpdateNotification(
                                notification.id,
                                'dismissed',
                              )
                            }
                          >
                            Dismiss
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </SharedCard>
                ))
              )}
            </div>
          </SectionCard>
        </RevealSection>
      ) : null}

      {!loading && tokens ? (
        <RevealSection className={styles.grid} delay={0.084}>
          <SectionCard
            className={styles.panel}
            eyebrow="Digest"
            headerClassName={styles.panelHeader}
            title="Marketplace digest controls"
          >
            <div className={styles.stack}>
              <FactGrid className={styles.summaryGrid}>
                <FactItem
                  label="Saved digests"
                  value={marketplaceDigests.length}
                />
                <FactItem
                  label="Dispatch runs"
                  value={digestDispatchRuns.length}
                />
                <FactItem
                  label="Latest status"
                  value={latestMarketplaceDigest?.status ?? 'none'}
                />
                <FactItem
                  label="Cadence"
                  value={notificationPreferences.digestCadence}
                />
                <FactItem
                  label="Last dispatch"
                  value={
                    latestDigestDispatchRun
                      ? `${latestDigestDispatchRun.dispatchedCount} sent`
                      : 'none'
                  }
                />
              </FactGrid>
              <label className={styles.field}>
                <span>Digest cadence</span>
                <select
                  value={notificationPreferences.digestCadence}
                  onChange={(event) =>
                    setNotificationPreferences((current) => ({
                      ...current,
                      digestCadence: event.target.value as MarketplaceDigestCadence,
                    }))
                  }
                >
                  <option value="manual">Manual</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
              <div className={styles.summaryGrid}>
                <label className={styles.field}>
                  <span>Talent invites</span>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.talentInvitesEnabled}
                    onChange={(event) =>
                      setNotificationPreferences((current) => ({
                        ...current,
                        talentInvitesEnabled: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Application activity</span>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.applicationActivityEnabled}
                    onChange={(event) =>
                      setNotificationPreferences((current) => ({
                        ...current,
                        applicationActivityEnabled: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Interview messages</span>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.interviewMessagesEnabled}
                    onChange={(event) =>
                      setNotificationPreferences((current) => ({
                        ...current,
                        interviewMessagesEnabled: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Offer activity</span>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.offerActivityEnabled}
                    onChange={(event) =>
                      setNotificationPreferences((current) => ({
                        ...current,
                        offerActivityEnabled: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Review activity</span>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.reviewActivityEnabled}
                    onChange={(event) =>
                      setNotificationPreferences((current) => ({
                        ...current,
                        reviewActivityEnabled: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Automation activity</span>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.automationActivityEnabled}
                    onChange={(event) =>
                      setNotificationPreferences((current) => ({
                        ...current,
                        automationActivityEnabled: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Lifecycle digest</span>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.lifecycleDigestEnabled}
                    onChange={(event) =>
                      setNotificationPreferences((current) => ({
                        ...current,
                        lifecycleDigestEnabled: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Analytics summary</span>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.analyticsDigestEnabled}
                    onChange={(event) =>
                      setNotificationPreferences((current) => ({
                        ...current,
                        analyticsDigestEnabled: event.target.checked,
                      }))
                    }
                  />
                </label>
              </div>
              <div className={styles.inlineActions}>
                <button
                  type="button"
                  onClick={() => void handleSaveNotificationPreferences()}
                >
                  Save digest settings
                </button>
                <button
                  type="button"
                  onClick={() => void handleDispatchDigests('due')}
                >
                  Dispatch due digests
                </button>
                <button
                  type="button"
                  onClick={() => void handleDispatchDigests('all_enabled')}
                >
                  Dispatch all enabled
                </button>
                <button
                  type="button"
                  onClick={() => void handleGenerateDigest('manual')}
                >
                  Generate digest now
                </button>
              </div>
              {digestDispatchRuns.length === 0 ? (
                <p className={styles.stateText}>
                  No digest dispatch runs yet. Dispatch due digests after saving cadence settings to materialize delivery history for this workspace.
                </p>
              ) : (
                digestDispatchRuns.slice(0, 3).map((run) => (
                  <SharedCard
                    key={run.id}
                    className={styles.actionPanel}
                    interactive
                  >
                    <div className={styles.stack}>
                      <strong>
                        {run.mode === 'due'
                          ? 'Due digest dispatch'
                          : 'Enabled digest dispatch'}
                      </strong>
                      <p className={styles.stateText}>
                        {run.dispatchedCount} delivered • {run.skippedCount} skipped •{' '}
                        {run.triggeredByEmail} •{' '}
                        {new Date(run.createdAt).toLocaleString()}
                      </p>
                      <p className={styles.stateText}>{run.summary}</p>
                      <p className={styles.stateText}>{run.preview}</p>
                    </div>
                  </SharedCard>
                ))
              )}
              {marketplaceDigests.length === 0 ? (
                <p className={styles.stateText}>
                  No digest snapshots yet. Generate one after updating preferences to capture the current marketplace inbox and workflow posture.
                </p>
              ) : (
                marketplaceDigests.slice(0, 5).map((digest) => (
                  <SharedCard
                    key={digest.id}
                    className={styles.actionPanel}
                    interactive
                  >
                    <div className={styles.stack}>
                      <strong>{digest.title}</strong>
                      <p className={styles.stateText}>
                        {digest.status} • {digest.cadence} •{' '}
                        {new Date(digest.updatedAt).toLocaleString()}
                      </p>
                      <p className={styles.stateText}>{digest.summary}</p>
                      <FactGrid className={styles.summaryGrid}>
                        <FactItem
                          label="Unread"
                          value={digest.stats.unreadNotifications}
                        />
                        <FactItem
                          label="Tasks"
                          value={digest.stats.taskCount}
                        />
                        <FactItem
                          label="Rehire"
                          value={digest.stats.rehireCandidateCount}
                        />
                        <FactItem
                          label="Hires"
                          value={digest.stats.hires ?? 0}
                        />
                      </FactGrid>
                      {digest.highlights.length > 0 ? (
                        <div className={styles.stack}>
                          {digest.highlights.slice(0, 4).map((highlight, index) => (
                            <p
                              key={`${digest.id}-${highlight.kind}-${index + 1}`}
                              className={styles.stateText}
                            >
                              {highlight.kind}: {highlight.title} • {highlight.detail}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      <div className={styles.inlineActions}>
                        {digest.status === 'fresh' ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleUpdateDigestStatus(
                                digest.id,
                                'acknowledged',
                              )
                            }
                          >
                            Acknowledge
                          </button>
                        ) : null}
                        {digest.status !== 'archived' ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleUpdateDigestStatus(digest.id, 'archived')
                            }
                          >
                            Archive
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </SharedCard>
                ))
              )}
            </div>
          </SectionCard>
        </RevealSection>
      ) : null}

      {!loading && tokens && analyticsOverview ? (
        <RevealSection className={styles.grid} delay={0.085}>
          <SectionCard
            className={styles.panel}
            eyebrow="Intelligence"
            headerClassName={styles.panelHeader}
            title="Marketplace conversion posture"
          >
            <div className={styles.stack}>
              <FactGrid className={styles.summaryGrid}>
                <FactItem label="Search impressions" value={analyticsOverview.summary.searchImpressions} />
                <FactItem label="Result clicks" value={analyticsOverview.summary.resultClicks} />
                <FactItem label="Saved searches" value={analyticsOverview.summary.savedSearches} />
                <FactItem label="Applications" value={analyticsOverview.summary.applications} />
                <FactItem label="Shortlists" value={analyticsOverview.summary.shortlists} />
                <FactItem label="Interviews" value={analyticsOverview.summary.interviews} />
                <FactItem label="Offers" value={analyticsOverview.summary.offers} />
                <FactItem label="Hires" value={analyticsOverview.summary.hires} />
                <FactItem label="Active contracts" value={analyticsOverview.summary.activeContracts} />
                <FactItem label="Talent pools" value={analyticsOverview.retention.talentPools} />
                <FactItem label="Tracked talent" value={analyticsOverview.retention.trackedTalent} />
                <FactItem label="Automation rules" value={analyticsOverview.retention.automationRules} />
                <FactItem label="Automation runs" value={analyticsOverview.retention.automationRuns} />
                <FactItem
                  label="Delivered tasks"
                  value={analyticsOverview.retention.automatedTaskDeliveries}
                />
                <FactItem
                  label="Lifecycle tasks"
                  value={analyticsOverview.retention.pendingLifecycleTasks}
                />
                <FactItem
                  label="Rehire prompts"
                  value={analyticsOverview.retention.rehireCandidates}
                />
              </FactGrid>
              <div className={styles.summaryGrid}>
                <SharedCard className={styles.actionPanel} interactive>
                  <div className={styles.stack}>
                    <strong>Liquidity imbalance</strong>
                    {analyticsOverview.liquidity.length === 0 ? (
                      <p className={styles.stateText}>No category imbalance yet.</p>
                    ) : (
                      analyticsOverview.liquidity.map((slice) => (
                        <p key={slice.label} className={styles.stateText}>
                          {slice.label}: demand {slice.demandCount} • supply {slice.supplyCount} • {slice.posture}
                        </p>
                      ))
                    )}
                  </div>
                </SharedCard>
                <SharedCard className={styles.actionPanel} interactive>
                  <div className={styles.stack}>
                    <strong>Top searches</strong>
                    {analyticsOverview.topSearches.length === 0 ? (
                      <p className={styles.stateText}>No search telemetry yet.</p>
                    ) : (
                      analyticsOverview.topSearches.map((entry) => (
                        <p
                          key={`${entry.searchKind}-${entry.queryLabel}`}
                          className={styles.stateText}
                        >
                          {entry.queryLabel}: {entry.impressions} impressions • {entry.resultClicks} clicks
                        </p>
                      ))
                    )}
                  </div>
                </SharedCard>
                <SharedCard className={styles.actionPanel} interactive>
                  <div className={styles.stack}>
                    <strong>No-hire reasons</strong>
                    {analyticsOverview.noHireReasons.length === 0 ? (
                      <p className={styles.stateText}>No no-hire reasons recorded yet.</p>
                    ) : (
                      analyticsOverview.noHireReasons.map((entry) => (
                        <p key={entry.reason} className={styles.stateText}>
                          {entry.reason}: {entry.count}
                        </p>
                      ))
                    )}
                  </div>
                </SharedCard>
              </div>
              {analyticsOverview.stalledItems.length > 0 ? (
                <div className={styles.stack}>
                  <span className={styles.metaLabel}>Stalled briefs</span>
                  {analyticsOverview.stalledItems.map((item) => (
                    <SharedCard
                      key={item.opportunityId}
                      className={styles.actionPanel}
                      interactive
                    >
                      <div className={styles.stack}>
                        <strong>{item.title}</strong>
                        <p className={styles.stateText}>
                          {item.category} • {item.daysOpen} days open • {item.applicationCount} applications
                        </p>
                      </div>
                    </SharedCard>
                  ))}
                </div>
              ) : null}
            </div>
          </SectionCard>
        </RevealSection>
      ) : null}

      {!loading && tokens && activeWorkspace ? (
        <RevealSection className={styles.grid} delay={0.1}>
          {isClientWorkspace ? (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Retention</span>
                  <h2>Talent pools and lifecycle prompts</h2>
                </div>
              </div>
              <div className={styles.stack}>
                <FactGrid className={styles.summaryGrid}>
                  <FactItem
                    label="Pools"
                    value={lifecycleDigest?.poolSummary.poolCount ?? talentPools.length}
                  />
                  <FactItem
                    label="Tracked talent"
                    value={lifecycleDigest?.poolSummary.trackedTalentCount ?? 0}
                  />
                  <FactItem
                    label="Contacted"
                    value={lifecycleDigest?.poolSummary.contactedCount ?? 0}
                  />
                  <FactItem
                    label="Interviewing"
                    value={lifecycleDigest?.poolSummary.interviewingCount ?? 0}
                  />
                  <FactItem
                    label="Offered"
                    value={lifecycleDigest?.poolSummary.offeredCount ?? 0}
                  />
                  <FactItem
                    label="Rehire ready"
                    value={lifecycleDigest?.poolSummary.rehireReadyCount ?? 0}
                  />
                </FactGrid>

                <label className={styles.field}>
                  <span>Pool label</span>
                  <input
                    value={talentPoolDraft.label}
                    onChange={(event) =>
                      setTalentPoolDraft((current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Focus skills</span>
                  <input
                    value={talentPoolDraft.focusSkills}
                    onChange={(event) =>
                      setTalentPoolDraft((current) => ({
                        ...current,
                        focusSkills: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Pool note</span>
                  <input
                    value={talentPoolDraft.note}
                    onChange={(event) =>
                      setTalentPoolDraft((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className={styles.inlineActions}>
                  <button type="button" onClick={() => void handleCreateTalentPool()}>
                    Create talent pool
                  </button>
                </div>

                {talentPools.length > 0 ? (
                  <>
                    <label className={styles.field}>
                      <span>Pool used for search saves</span>
                      <select
                        value={selectedTalentPoolId}
                        onChange={(event) => setSelectedTalentPoolId(event.target.value)}
                      >
                        <option value="">No pool selected</option>
                        {talentPools.map((pool) => (
                          <option key={pool.id} value={pool.id}>
                            {pool.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className={styles.stack}>
                      {talentPools.map((pool) => (
                        <SharedCard
                          key={pool.id}
                          className={styles.actionPanel}
                          interactive
                        >
                          <div className={styles.stack}>
                            <strong>{pool.label}</strong>
                            <p className={styles.stateText}>
                              {pool.focusSkills.join(', ') || 'No focus skills'} •{' '}
                              {pool.members.length} tracked candidate
                              {pool.members.length === 1 ? '' : 's'}
                            </p>
                            {pool.note ? (
                              <p className={styles.stateText}>{pool.note}</p>
                            ) : null}
                            {pool.members.length === 0 ? (
                              <p className={styles.stateText}>
                                Save talent search results into this pool to start tracking.
                              </p>
                            ) : (
                              pool.members.map((member) => (
                                <div key={member.id} className={styles.stack}>
                                  <strong>{member.profile.displayName}</strong>
                                  <p className={styles.stateText}>
                                    {member.stage} • reviews {member.reviewAverage ?? '—'} •
                                    invite {member.activeInviteStatus ?? 'none'}
                                  </p>
                                  <div className={styles.inlineActions}>
                                    {(
                                      [
                                        'saved',
                                        'contacted',
                                        'interviewing',
                                        'offered',
                                        'rehire_ready',
                                        'archived',
                                      ] satisfies MarketplaceTalentPoolMemberStage[]
                                    ).map((stage) => (
                                      <button
                                        key={stage}
                                        type="button"
                                        disabled={member.stage === stage}
                                        onClick={() =>
                                          void handleUpdateTalentPoolMember(
                                            pool.id,
                                            member.id,
                                            stage,
                                            member.note,
                                          )
                                        }
                                      >
                                        {stage}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </SharedCard>
                      ))}
                    </div>
                  </>
                ) : null}

                <label className={styles.field}>
                  <span>Automation kind</span>
                  <select
                    value={automationRuleDraft.kind}
                    onChange={(event) =>
                      setAutomationRuleDraft((current) => ({
                        ...current,
                        kind: event.target.value as MarketplaceAutomationRuleKind,
                        targetId: '',
                      }))
                    }
                  >
                    <option value="saved_search_digest">Saved search digest</option>
                    <option value="talent_pool_digest">Talent pool digest</option>
                    <option value="invite_followup">Invite follow-up</option>
                    <option value="rehire_digest">Rehire digest</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Automation label</span>
                  <input
                    value={automationRuleDraft.label}
                    onChange={(event) =>
                      setAutomationRuleDraft((current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Automation target</span>
                  <select
                    value={automationRuleDraft.targetId}
                    onChange={(event) =>
                      setAutomationRuleDraft((current) => ({
                        ...current,
                        targetId: event.target.value,
                      }))
                    }
                  >
                    <option value="">All matching items</option>
                    {automationRuleTargetOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Automation cadence</span>
                  <select
                    value={automationRuleDraft.schedule}
                    onChange={(event) =>
                      setAutomationRuleDraft((current) => ({
                        ...current,
                        schedule: event.target.value as MarketplaceAutomationRuleSchedule,
                      }))
                    }
                  >
                    <option value="manual">Manual</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </label>
                <div className={styles.inlineActions}>
                  <button type="button" onClick={() => void handleCreateAutomationRule()}>
                    Create automation
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDispatchAutomationRuns('due')}
                  >
                    Run due automations
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDispatchAutomationRuns('all_enabled')}
                  >
                    Run all enabled
                  </button>
                </div>

                {automationRules.length > 0 ? (
                  <div className={styles.stack}>
                    {automationRules.map((rule) => (
                      <SharedCard
                        key={rule.id}
                        className={styles.actionPanel}
                        interactive
                        >
                        <div className={styles.stack}>
                          <strong>{rule.label}</strong>
                          <p className={styles.stateText}>{rule.summary}</p>
                          <p className={styles.stateText}>
                            Last run{' '}
                            {rule.lastRunAt
                              ? new Date(rule.lastRunAt).toLocaleString()
                              : 'never'}{' '}
                            • {rule.lastRunTaskCount} delivered item
                            {rule.lastRunTaskCount === 1 ? '' : 's'} • due now{' '}
                            {rule.dueNow ? 'yes' : 'no'}
                          </p>
                          {rule.latestRunSummary ? (
                            <p className={styles.stateText}>{rule.latestRunSummary}</p>
                          ) : null}
                          <div className={styles.inlineActions}>
                            <button
                              type="button"
                              onClick={() =>
                                void handleUpdateAutomationRule(rule.id, {
                                  enabled: !rule.enabled,
                                })
                              }
                            >
                              {rule.enabled ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleUpdateAutomationRule(rule.id, {
                                  schedule:
                                    rule.schedule === 'weekly'
                                      ? 'daily'
                                      : rule.schedule === 'daily'
                                        ? 'manual'
                                        : 'weekly',
                                })
                              }
                            >
                              Cycle cadence
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRunAutomationRule(rule.id)}
                            >
                              Run now
                            </button>
                          </div>
                        </div>
                      </SharedCard>
                    ))}
                  </div>
                ) : null}

                {automationRuns.length > 0 ? (
                  <div className={styles.stack}>
                    <span className={styles.metaLabel}>Recent automation runs</span>
                    {automationRuns.slice(0, 6).map((run) => (
                      <SharedCard
                        key={run.id}
                        className={styles.actionPanel}
                        interactive
                      >
                        <div className={styles.stack}>
                          <strong>{run.ruleLabel}</strong>
                          <p className={styles.stateText}>
                            {run.trigger} trigger • {run.taskCount} item
                            {run.taskCount === 1 ? '' : 's'} •{' '}
                            {new Date(run.createdAt).toLocaleString()}
                          </p>
                          <p className={styles.stateText}>{run.summary}</p>
                          {run.items.length > 0 ? (
                            run.items.slice(0, 3).map((item) => (
                              <p key={item.id} className={styles.stateText}>
                                {item.priority} • {item.title} • {item.recommendation}
                              </p>
                            ))
                          ) : (
                            <p className={styles.stateText}>
                              No lifecycle work matched this run.
                            </p>
                          )}
                        </div>
                      </SharedCard>
                    ))}
                  </div>
                ) : null}

                {lifecycleDigest ? (
                  <div className={styles.stack}>
                    <span className={styles.metaLabel}>Lifecycle tasks</span>
                    {lifecycleDigest.tasks.length === 0 ? (
                      <p className={styles.stateText}>
                        No lifecycle tasks are pending for this workspace.
                      </p>
                    ) : (
                      lifecycleDigest.tasks.map((task) => (
                        <SharedCard
                          key={task.id}
                          className={styles.actionPanel}
                          interactive
                        >
                          <div className={styles.stack}>
                            <strong>{task.title}</strong>
                            <p className={styles.stateText}>
                              {task.priority} priority • {task.detail}
                            </p>
                          </div>
                        </SharedCard>
                      ))
                    )}
                    {(lifecycleDigest.rehireCandidates ?? []).map((candidate) => (
                      <SharedCard
                        key={candidate.jobId}
                        className={styles.actionPanel}
                        interactive
                      >
                        <div className={styles.stack}>
                          <strong>{candidate.profile.displayName}</strong>
                          <p className={styles.stateText}>
                            {candidate.relationshipStrength} • previous escrow{' '}
                            {candidate.title}
                          </p>
                          <div className={styles.inlineActions}>
                            <button
                              type="button"
                              onClick={() =>
                                void handleCreateRehireOpportunity(candidate.jobId)
                              }
                            >
                              Create rehire brief
                            </button>
                          </div>
                        </div>
                      </SharedCard>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ) : null}

          {isClientWorkspace ? (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>
                    {workspaceMessages.discovery.eyebrow}
                  </span>
                  <h2>{workspaceMessages.discovery.talentTitle}</h2>
                </div>
              </div>
              <div className={styles.stack}>
                <p className={styles.stateText}>
                  {workspaceMessages.discovery.talentBody}
                </p>
                <label className={styles.field}>
                  <span>{workspaceMessages.discovery.query}</span>
                  <input
                    value={talentDiscoveryDraft.q}
                    onChange={(event) =>
                      setTalentDiscoveryDraft((current) => ({
                        ...current,
                        q: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>{workspaceMessages.discovery.skill}</span>
                  <input
                    value={talentDiscoveryDraft.skill}
                    onChange={(event) =>
                      setTalentDiscoveryDraft((current) => ({
                        ...current,
                        skill: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>{workspaceMessages.discovery.skills}</span>
                  <input
                    value={talentDiscoveryDraft.skills}
                    onChange={(event) =>
                      setTalentDiscoveryDraft((current) => ({
                        ...current,
                        skills: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>{workspaceMessages.discovery.selectedOpportunity}</span>
                  <select
                    value={talentDiscoveryDraft.selectedOpportunityId}
                    onChange={(event) =>
                      setTalentDiscoveryDraft((current) => ({
                        ...current,
                        selectedOpportunityId: event.target.value,
                      }))
                    }
                  >
                    <option value="">{workspaceMessages.discovery.noneSelected}</option>
                    {myOpportunities.map((opportunity) => (
                      <option key={opportunity.id} value={opportunity.id}>
                        {opportunity.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>{workspaceMessages.discovery.inviteMessage}</span>
                  <input
                    value={talentDiscoveryDraft.inviteMessage}
                    onChange={(event) =>
                      setTalentDiscoveryDraft((current) => ({
                        ...current,
                        inviteMessage: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>{workspaceMessages.discovery.savedSearchLabel}</span>
                  <input
                    value={talentDiscoveryDraft.savedSearchLabel}
                    onChange={(event) =>
                      setTalentDiscoveryDraft((current) => ({
                        ...current,
                        savedSearchLabel: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className={styles.inlineActions}>
                  <button type="button" onClick={() => void handleSearchTalentDirectory()}>
                    {workspaceMessages.discovery.searchTalent}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLoadTalentRecommendations()}
                  >
                    {workspaceMessages.discovery.loadRecommendations}
                  </button>
                  <button type="button" onClick={() => void handleSaveSearch('talent')}>
                    {workspaceMessages.discovery.saveSearch}
                  </button>
                </div>
                {talentSavedSearches.length > 0 ? (
                  <div className={styles.stack}>
                    <span className={styles.metaLabel}>
                      {workspaceMessages.discovery.savedSearchesTitle}
                    </span>
                    {talentSavedSearches.map((search) => (
                      <SharedCard
                        key={search.id}
                        className={styles.actionPanel}
                        interactive
                      >
                        <div className={styles.stack}>
                          <strong>{search.label}</strong>
                          <p className={styles.stateText}>
                            {workspaceMessages.discovery.lastResultCount}:{' '}
                            {search.lastResultCount}
                          </p>
                          <div className={styles.inlineActions}>
                            <button
                              type="button"
                              onClick={() => void handleDeleteSavedSearch(search.id)}
                            >
                              {workspaceMessages.discovery.deleteSavedSearch}
                            </button>
                          </div>
                        </div>
                      </SharedCard>
                    ))}
                  </div>
                ) : null}
                {talentSearchResults.length === 0 ? (
                  <p className={styles.stateText}>
                    {workspaceMessages.discovery.noTalentResults}
                  </p>
                ) : (
                  talentSearchResults.map((result) => (
                    <SharedCard
                      key={result.profile.userId}
                      className={styles.actionPanel}
                      interactive
                    >
                      <div className={styles.stack}>
                        <strong>{result.profile.displayName}</strong>
                        <p className={styles.stateText}>{result.profile.headline}</p>
                        <p className={styles.stateText}>
                          {workspaceMessages.discovery.ranking}: {result.ranking.score}
                        </p>
                        <p className={styles.stateText}>
                          {workspaceMessages.discovery.reasons}:{' '}
                          {result.reasons
                            .map((reason) => formatSearchReason(reason.code))
                            .join(' • ')}
                        </p>
                        <div className={styles.inlineActions}>
                          <Link
                            className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                            href={`/marketplace/profiles/${result.profile.slug}`}
                          >
                            {marketplaceMessages.actions.viewProfile}
                          </Link>
                          <button
                            type="button"
                            disabled={!selectedTalentPoolId}
                            onClick={() =>
                              void handleAddTalentToPool(result.profile.slug)
                            }
                          >
                            Save to pool
                          </button>
                          <button
                            type="button"
                            disabled={!talentDiscoveryDraft.selectedOpportunityId}
                            onClick={() => void handleInviteTalent(result.profile.slug)}
                          >
                            {workspaceMessages.discovery.inviteToApply}
                          </button>
                        </div>
                      </div>
                    </SharedCard>
                  ))
                )}
              </div>
            </article>
          ) : null}

          {isTalentWorkspace ? (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>
                    {workspaceMessages.discovery.eyebrow}
                  </span>
                  <h2>{workspaceMessages.discovery.opportunityTitle}</h2>
                </div>
              </div>
              <div className={styles.stack}>
                <p className={styles.stateText}>
                  {workspaceMessages.discovery.opportunityBody}
                </p>
                {marketplaceInvites.length > 0 ? (
                  <div className={styles.stack}>
                    <span className={styles.metaLabel}>
                      {workspaceMessages.discovery.inboundInvitesTitle}
                    </span>
                    {marketplaceInvites.map((invite) => (
                      <SharedCard
                        key={invite.id}
                        className={styles.actionPanel}
                        interactive
                      >
                        <div className={styles.stack}>
                          <strong>{invite.opportunity.title}</strong>
                          <p className={styles.stateText}>
                            {invite.opportunity.ownerDisplayName} •{' '}
                            {workspaceMessages.discovery.inviteStatus}:{' '}
                            {marketplaceMessages.labels.inviteStatus[invite.status]}
                          </p>
                          {invite.message ? (
                            <p className={styles.stateText}>{invite.message}</p>
                          ) : null}
                          <Link
                            className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                            href={`/marketplace/opportunities/${invite.opportunity.id}`}
                          >
                            {marketplaceMessages.actions.viewBrief}
                          </Link>
                        </div>
                      </SharedCard>
                    ))}
                  </div>
                ) : null}
                <label className={styles.field}>
                  <span>{workspaceMessages.discovery.query}</span>
                  <input
                    value={opportunityDiscoveryDraft.q}
                    onChange={(event) =>
                      setOpportunityDiscoveryDraft((current) => ({
                        ...current,
                        q: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>{workspaceMessages.discovery.skill}</span>
                  <input
                    value={opportunityDiscoveryDraft.skill}
                    onChange={(event) =>
                      setOpportunityDiscoveryDraft((current) => ({
                        ...current,
                        skill: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>{workspaceMessages.discovery.skills}</span>
                  <input
                    value={opportunityDiscoveryDraft.skills}
                    onChange={(event) =>
                      setOpportunityDiscoveryDraft((current) => ({
                        ...current,
                        skills: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>{workspaceMessages.discovery.category}</span>
                  <input
                    value={opportunityDiscoveryDraft.category}
                    onChange={(event) =>
                      setOpportunityDiscoveryDraft((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>{workspaceMessages.discovery.savedSearchLabel}</span>
                  <input
                    value={opportunityDiscoveryDraft.savedSearchLabel}
                    onChange={(event) =>
                      setOpportunityDiscoveryDraft((current) => ({
                        ...current,
                        savedSearchLabel: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className={styles.inlineActions}>
                  <button
                    type="button"
                    onClick={() => void handleSearchOpportunityDirectory()}
                  >
                    {workspaceMessages.discovery.searchOpportunities}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLoadOpportunityRecommendations()}
                  >
                    {workspaceMessages.discovery.loadRecommendations}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveSearch('opportunity')}
                  >
                    {workspaceMessages.discovery.saveSearch}
                  </button>
                </div>
                {opportunitySavedSearches.length > 0 ? (
                  <div className={styles.stack}>
                    <span className={styles.metaLabel}>
                      {workspaceMessages.discovery.savedSearchesTitle}
                    </span>
                    {opportunitySavedSearches.map((search) => (
                      <SharedCard
                        key={search.id}
                        className={styles.actionPanel}
                        interactive
                      >
                        <div className={styles.stack}>
                          <strong>{search.label}</strong>
                          <p className={styles.stateText}>
                            {workspaceMessages.discovery.lastResultCount}:{' '}
                            {search.lastResultCount}
                          </p>
                          <div className={styles.inlineActions}>
                            <button
                              type="button"
                              onClick={() => void handleDeleteSavedSearch(search.id)}
                            >
                              {workspaceMessages.discovery.deleteSavedSearch}
                            </button>
                          </div>
                        </div>
                      </SharedCard>
                    ))}
                  </div>
                ) : null}
                {opportunitySearchResults.length === 0 ? (
                  <p className={styles.stateText}>
                    {workspaceMessages.discovery.noOpportunityResults}
                  </p>
                ) : (
                  opportunitySearchResults.map((result) => (
                    <SharedCard
                      key={result.opportunity.id}
                      className={styles.actionPanel}
                      interactive
                    >
                      <div className={styles.stack}>
                        <strong>{result.opportunity.title}</strong>
                        <p className={styles.stateText}>{result.opportunity.summary}</p>
                        <p className={styles.stateText}>
                          {workspaceMessages.discovery.ranking}: {result.ranking.score}
                        </p>
                        <p className={styles.stateText}>
                          {workspaceMessages.discovery.reasons}:{' '}
                          {result.reasons
                            .map((reason) => formatSearchReason(reason.code))
                            .join(' • ')}
                        </p>
                        <div className={styles.inlineActions}>
                          <Link
                            className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                            href={`/marketplace/opportunities/${result.opportunity.id}`}
                          >
                            {marketplaceMessages.actions.viewBrief}
                          </Link>
                        </div>
                      </div>
                    </SharedCard>
                  ))
                )}
              </div>
            </article>
          ) : null}
        </RevealSection>
      ) : null}

      <RevealSection className={styles.grid} delay={0.12}>
        {activeWorkspace ? (
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.panelEyebrow}>
                  {workspaceMessages.organizationEyebrow}
                </span>
                <h2>{workspaceMessages.organizationTitle}</h2>
              </div>
            </div>
            <div className={styles.stack}>
              <p className={styles.stateText}>
                {workspaceMessages.organizationBody}
              </p>
              {organizations.length === 0 ? (
                <p className={styles.stateText}>
                  {workspaceMessages.organizationEmptyState}
                </p>
              ) : (
                organizations.map((organization) => (
                  <SharedCard
                    key={organization.id}
                    className={styles.actionPanel}
                    data-testid={`marketplace-organization-${organization.id}`}
                    interactive
                  >
                    <div className={styles.stack}>
                      <strong>{organization.name}</strong>
                      <p className={styles.stateText}>
                        {workspaceMessages.organizationKindLabel}:{' '}
                        {workspaceMessages.organizationKind[organization.kind]}
                      </p>
                      <p className={styles.stateText}>
                        {workspaceMessages.organizationRoleLabel}:{' '}
                        {organization.roles.map(formatOrganizationRole).join(', ')}
                      </p>
                      <div className={styles.inlineActions}>
                        {organization.workspaces.map((workspace) => (
                          <button
                            key={workspace.workspaceId}
                            type="button"
                            disabled={
                              workspace.workspaceId === activeWorkspace.workspaceId
                            }
                            onClick={() =>
                              void handleSelectWorkspace(workspace.workspaceId)
                            }
                          >
                            {workspace.workspaceId === activeWorkspace.workspaceId
                              ? workspaceMessages.organizationCurrentWorkspace
                              : workspaceMessages.activeWorkspace.switchWorkspace(
                                  workspace.label,
                                  formatWorkspaceMode(workspace),
                                )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </SharedCard>
                ))
              )}
              <label className={styles.field}>
                <span>{workspaceMessages.organizationKindLabel}</span>
                <select
                  disabled={!canManageWorkspace}
                  value={organizationDraft.kind}
                  onChange={(event) =>
                    setOrganizationDraft((current) => ({
                      ...current,
                      kind: event.target.value as OrganizationDraft['kind'],
                    }))
                  }
                >
                  <option value="client">
                    {workspaceMessages.organizationKind.client}
                  </option>
                  <option value="agency">
                    {workspaceMessages.organizationKind.agency}
                  </option>
                </select>
              </label>
              <label className={styles.field}>
                <span>{workspaceMessages.organizationForm.name}</span>
                <input
                  disabled={!canManageWorkspace}
                  value={organizationDraft.name}
                  onChange={(event) =>
                    setOrganizationDraft((current) => ({
                      ...current,
                      name: event.target.value,
                      slug:
                        current.slug.trim().length > 0
                          ? current.slug
                          : slugifyWorkspaceName(event.target.value),
                    }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>{workspaceMessages.organizationForm.slug}</span>
                <input
                  disabled={!canManageWorkspace}
                  value={organizationDraft.slug}
                  onChange={(event) =>
                    setOrganizationDraft((current) => ({
                      ...current,
                      slug: slugifyWorkspaceName(event.target.value),
                    }))
                  }
                />
              </label>
              {!canManageWorkspace ? (
                <p className={styles.stateText}>
                  {workspaceMessages.capabilityNotices.manageWorkspace}
                </p>
              ) : null}
              <div className={styles.inlineActions}>
                <button
                  type="button"
                  disabled={!canManageWorkspace}
                  onClick={() => void handleCreateOrganization()}
                >
                  {workspaceMessages.organizationForm.create}
                </button>
              </div>
              {activeOrganization && activeOrganizationInvitable ? (
                <>
                  <p className={styles.stateText}>
                    {workspaceMessages.organizationMemberships.body(
                      activeOrganization.name,
                    )}
                  </p>
                  {organizationMemberships.length > 0 ? (
                    <div className={styles.stack}>
                      {organizationMemberships.map((membership) => (
                        <SharedCard
                          key={membership.membershipId}
                          className={styles.actionPanel}
                          data-testid={`marketplace-organization-membership-${membership.membershipId}`}
                          interactive
                        >
                          <div className={styles.stack}>
                            <strong>{membership.userEmail}</strong>
                            <p className={styles.stateText}>
                              {workspaceMessages.organizationMemberships.roleLabel}:{' '}
                              {formatOrganizationRole(membership.role)}
                            </p>
                            <p className={styles.stateText}>
                              {workspaceMessages.organizationMemberships.statusLabel}:{' '}
                              {workspaceMessages.organizationMemberships.statusValue(
                                membership.status,
                              )}
                            </p>
                          </div>
                        </SharedCard>
                      ))}
                    </div>
                  ) : null}
                  <p className={styles.stateText}>
                    {workspaceMessages.organizationInvitations.body(
                      activeOrganization.name,
                    )}
                  </p>
                  <label className={styles.field}>
                    <span>{workspaceMessages.organizationInvitations.email}</span>
                    <input
                      disabled={!canManageWorkspace}
                      type="email"
                      value={invitationDraft.email}
                      onChange={(event) =>
                        setInvitationDraft((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>{workspaceMessages.organizationInvitations.role}</span>
                    <select
                      disabled={!canManageWorkspace}
                      value={invitationDraft.role}
                      onChange={(event) =>
                        setInvitationDraft((current) => ({
                          ...current,
                          role: event.target.value as InvitationDraft['role'],
                        }))
                      }
                    >
                      {invitationRoleOptions.map((role) => (
                        <option key={role} value={role}>
                          {workspaceMessages.invitationRoles[role]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      disabled={!canManageWorkspace}
                      onClick={() => void handleCreateInvitation()}
                    >
                      {workspaceMessages.organizationInvitations.send}
                    </button>
                  </div>
                  {organizationInvitations.length > 0 ? (
                    <div className={styles.stack}>
                      {organizationInvitations.map((invitation) => (
                        <SharedCard
                          key={invitation.invitationId}
                          className={styles.actionPanel}
                          data-testid={`marketplace-organization-invitation-${invitation.invitationId}`}
                          interactive
                        >
                          <div className={styles.stack}>
                            <strong>{invitation.invitedEmail}</strong>
                            <p className={styles.stateText}>
                              {workspaceMessages.organizationInvitations.roleLabel}:{' '}
                              {workspaceMessages.invitationRoles[invitation.role]}
                            </p>
                            <p className={styles.stateText}>
                              {workspaceMessages.organizationInvitations.statusLabel}:{' '}
                              {workspaceMessages.invitationStatuses[invitation.status]}
                            </p>
                            {invitation.status === 'pending' && canManageWorkspace ? (
                              <div className={styles.inlineActions}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleRevokeInvitation(
                                      invitation.invitationId,
                                    )
                                  }
                                >
                                  {workspaceMessages.organizationInvitations.revoke}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </SharedCard>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </article>
        ) : null}

        {isTalentWorkspace ? (
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>{workspaceMessages.profileEyebrow}</span>
              <h2>{workspaceMessages.profileTitle}</h2>
            </div>
          </div>
          <div className={styles.stack}>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.slug}</span>
              <input
                disabled={!canManageProfile}
                value={profileDraft.slug}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, slug: event.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.displayName}</span>
              <input
                disabled={!canManageProfile}
                value={profileDraft.displayName}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.headline}</span>
              <input
                disabled={!canManageProfile}
                value={profileDraft.headline}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    headline: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.bio}</span>
              <textarea
                disabled={!canManageProfile}
                rows={4}
                value={profileDraft.bio}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, bio: event.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.skills}</span>
              <input
                disabled={!canManageProfile}
                placeholder={workspaceMessages.profileForm.skillsPlaceholder}
                value={profileDraft.skills}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, skills: event.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.specialties}</span>
              <input
                disabled={!canManageProfile}
                placeholder={workspaceMessages.profileForm.specialtiesPlaceholder}
                value={profileDraft.specialties}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    specialties: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.preferredEngagements}</span>
              <input
                disabled={!canManageProfile}
                placeholder={workspaceMessages.profileForm.preferredEngagementsPlaceholder}
                value={profileDraft.preferredEngagements}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    preferredEngagements: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.cryptoReadiness}</span>
              <select
                disabled={!canManageProfile}
                value={profileDraft.cryptoReadiness}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    cryptoReadiness: event.target.value as MarketplaceCryptoReadiness,
                  }))
                }
              >
                <option value="wallet_only">
                  {marketplaceMessages.labels.cryptoReadiness.wallet_only}
                </option>
                <option value="smart_account_ready">
                  {marketplaceMessages.labels.cryptoReadiness.smart_account_ready}
                </option>
                <option value="escrow_power_user">
                  {marketplaceMessages.labels.cryptoReadiness.escrow_power_user}
                </option>
              </select>
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.portfolioUrls}</span>
              <textarea
                disabled={!canManageProfile}
                rows={3}
                value={profileDraft.portfolioUrls}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    portfolioUrls: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.externalProofUrls}</span>
              <textarea
                disabled={!canManageProfile}
                rows={3}
                value={profileDraft.externalProofUrls}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    externalProofUrls: event.target.value,
                  }))
                }
              />
            </label>
            {profile ? (
              <section className={styles.summaryGrid}>
                <article>
                  <span className={styles.metaLabel}>
                    {workspaceMessages.profileForm.verificationLevel}
                  </span>
                  <strong>
                    {marketplaceMessages.labels.verificationLevel[profile.verificationLevel]}
                  </strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>
                    {workspaceMessages.profileForm.completionRate}
                  </span>
                  <strong>{formatPercent(profile.escrowStats.completionRate)}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>
                    {workspaceMessages.profileForm.disputeRate}
                  </span>
                  <strong>{formatPercent(profile.escrowStats.disputeRate)}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>
                    {workspaceMessages.profileForm.onTimeDelivery}
                  </span>
                  <strong>{formatPercent(profile.escrowStats.onTimeDeliveryRate)}</strong>
                </article>
              </section>
            ) : null}
            {!profile ? (
              <p className={styles.stateText}>
                {canManageProfile
                  ? workspaceMessages.emptyStates.profileReady
                  : workspaceMessages.emptyStates.profileBlocked}
              </p>
            ) : null}
            {!canManageProfile ? (
              <p className={styles.stateText}>
                {workspaceMessages.capabilityNotices.manageProfile}
              </p>
            ) : null}
            <div className={styles.inlineActions}>
              <button
                type="button"
                disabled={!canManageProfile}
                onClick={() => void handleSaveProfile()}
              >
                {workspaceMessages.profileForm.saveProfile}
              </button>
              {!canManageProfile
                ? renderWorkspaceAction(
                    activeLane === 'agency'
                      ? agencyProfileWorkspace
                      : freelancerProfileWorkspace,
                  )
                : null}
              {profile ? (
                <Link
                  className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                  href={`/marketplace/profiles/${profile.slug}`}
                >
                  {workspaceMessages.profileForm.viewPublicProfile}
                </Link>
              ) : null}
            </div>
          </div>
        </article>
        ) : null}

        {isClientWorkspace ? (
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>{workspaceMessages.clientEyebrow}</span>
              <h2>{workspaceMessages.hiringSpecTitle}</h2>
            </div>
          </div>
          <div className={styles.stack}>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.title}</span>
              <input
                disabled={!canCreateOpportunity}
                value={opportunityDraft.title}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.summary}</span>
              <input
                disabled={!canCreateOpportunity}
                value={opportunityDraft.summary}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.description}</span>
              <textarea
                disabled={!canCreateOpportunity}
                rows={4}
                value={opportunityDraft.description}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.visibility}</span>
              <select
                disabled={!canCreateOpportunity}
                value={opportunityDraft.visibility}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    visibility: event.target.value as OpportunityDraft['visibility'],
                  }))
                }
              >
                <option value="public">
                  {workspaceMessages.opportunityForm.publicVisibility}
                </option>
                <option value="private">
                  {workspaceMessages.opportunityForm.privateVisibility}
                </option>
              </select>
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.category}</span>
              <input
                disabled={!canCreateOpportunity}
                value={opportunityDraft.category}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.settlementTokenAddress}</span>
              <input
                disabled={!canCreateOpportunity}
                value={opportunityDraft.currencyAddress}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    currencyAddress: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.requiredSkills}</span>
              <input
                disabled={!canCreateOpportunity}
                value={opportunityDraft.requiredSkills}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    requiredSkills: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.mustHaveSkills}</span>
              <input
                disabled={!canCreateOpportunity}
                value={opportunityDraft.mustHaveSkills}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    mustHaveSkills: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.outcomes}</span>
              <textarea
                disabled={!canCreateOpportunity}
                rows={3}
                value={opportunityDraft.outcomes}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    outcomes: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.acceptanceCriteria}</span>
              <textarea
                disabled={!canCreateOpportunity}
                rows={3}
                value={opportunityDraft.acceptanceCriteria}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    acceptanceCriteria: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.screeningQuestions}</span>
              <textarea
                disabled={!canCreateOpportunity}
                rows={3}
                value={opportunityDraft.screeningQuestions}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    screeningQuestions: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.timeline}</span>
              <input
                disabled={!canCreateOpportunity}
                value={opportunityDraft.timeline}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    timeline: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.desiredStart}</span>
              <input
                disabled={!canCreateOpportunity}
                type="datetime-local"
                value={opportunityDraft.desiredStartAt}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    desiredStartAt: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.timezoneOverlapHours}</span>
              <input
                disabled={!canCreateOpportunity}
                value={opportunityDraft.timezoneOverlapHours}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    timezoneOverlapHours: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.engagementType}</span>
              <select
                disabled={!canCreateOpportunity}
                value={opportunityDraft.engagementType}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    engagementType: event.target.value as MarketplaceEngagementType,
                  }))
                }
              >
                <option value="fixed_scope">
                  {marketplaceMessages.labels.engagementType.fixed_scope}
                </option>
                <option value="milestone_retainer">
                  {marketplaceMessages.labels.engagementType.milestone_retainer}
                </option>
                <option value="advisory">
                  {marketplaceMessages.labels.engagementType.advisory}
                </option>
              </select>
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.requiredCryptoReadiness}</span>
              <select
                disabled={!canCreateOpportunity}
                value={opportunityDraft.cryptoReadinessRequired}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    cryptoReadinessRequired:
                      event.target.value as MarketplaceCryptoReadiness,
                  }))
                }
              >
                <option value="wallet_only">
                  {marketplaceMessages.labels.cryptoReadiness.wallet_only}
                </option>
                <option value="smart_account_ready">
                  {marketplaceMessages.labels.cryptoReadiness.smart_account_ready}
                </option>
                <option value="escrow_power_user">
                  {marketplaceMessages.labels.cryptoReadiness.escrow_power_user}
                </option>
              </select>
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.budgetMinimum}</span>
              <input
                disabled={!canCreateOpportunity}
                value={opportunityDraft.budgetMin}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    budgetMin: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.budgetMaximum}</span>
              <input
                disabled={!canCreateOpportunity}
                value={opportunityDraft.budgetMax}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    budgetMax: event.target.value,
                  }))
                }
              />
            </label>
            {!canCreateOpportunity ? (
              <p className={styles.stateText}>
                {workspaceMessages.capabilityNotices.createOpportunity}
              </p>
            ) : null}
            <div className={styles.inlineActions}>
              <button
                type="button"
                disabled={!canCreateOpportunity}
                onClick={() => void handleCreateOpportunity()}
              >
                {workspaceMessages.opportunityForm.createDraftBrief}
              </button>
            </div>
          </div>
        </article>
        ) : null}
      </RevealSection>

      <RevealSection className={styles.grid} delay={0.16}>
        {isClientWorkspace ? (
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>{workspaceMessages.clientEyebrow}</span>
              <h2>{workspaceMessages.myOpportunitiesTitle}</h2>
            </div>
          </div>
          <div className={styles.stack}>
            {!canReviewApplications ? (
              <p className={styles.stateText}>
                {workspaceMessages.capabilityNotices.reviewApplications}
              </p>
            ) : null}
            {myOpportunities.length === 0 ? (
              <div className={styles.stack}>
                <p className={styles.stateText}>
                  {canCreateOpportunity
                    ? workspaceMessages.emptyStates.clientOpportunitiesReady
                    : workspaceMessages.emptyStates.clientOpportunitiesBlocked}
                </p>
                {!canCreateOpportunity
                  ? renderWorkspaceAction(clientAuthoringWorkspace)
                  : null}
              </div>
            ) : (
              myOpportunities.map((opportunity) => (
                <SharedCard
                  key={opportunity.id}
                  className={styles.actionPanel}
                  data-testid={`marketplace-my-opportunity-${opportunity.id}`}
                  interactive
                  layoutId={`marketplace-opportunity-${opportunity.id}`}
                >
                  <div className={styles.stack}>
                    <strong>{opportunity.title}</strong>
                    <p className={styles.stateText}>
                      {marketplaceMessages.labels.visibility[opportunity.visibility]} •{' '}
                      {formatOpportunityStatus(opportunity.status)} •{' '}
                      {workspaceMessages.applicationsCount(opportunity.applicationCount)}
                    </p>
                    <p className={styles.stateText}>
                      {workspaceMessages.mustHaves}:{' '}
                      {opportunity.mustHaveSkills.join(' • ') || workspaceMessages.noneListed}
                    </p>
                    <p className={styles.stateText}>
                      {workspaceMessages.outcomes}:{' '}
                      {opportunity.outcomes.join(' • ') || workspaceMessages.noneListed}
                    </p>
                    <div className={styles.inlineActions}>
                      <Link
                        className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                        href={`/marketplace/opportunities/${opportunity.id}`}
                      >
                        {workspaceMessages.viewPublicBrief}
                      </Link>
                      {opportunity.hiredJobId ? (
                        <Link
                          className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                          href={`/app/contracts/${opportunity.hiredJobId}`}
                        >
                          {workspaceMessages.viewContract}
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        disabled={!canReviewApplications}
                        onClick={() => void handleLoadApplications(opportunity.id)}
                      >
                        {workspaceMessages.loadReviewBoard}
                      </button>
                      <button
                        type="button"
                        disabled={!canReviewApplications}
                        onClick={() => void handleLoadComparison(opportunity.id)}
                      >
                        {workspaceMessages.compareCandidates}
                      </button>
                      {opportunity.status === 'draft' || opportunity.status === 'paused' ? (
                        <button
                          type="button"
                          disabled={!canCreateOpportunity}
                          onClick={() => void handlePublishOpportunity(opportunity.id)}
                        >
                          {workspaceMessages.publish}
                        </button>
                      ) : null}
                      {opportunity.status === 'published' ? (
                        <button
                          type="button"
                          disabled={!canCreateOpportunity}
                          onClick={() => void handlePauseOpportunity(opportunity.id)}
                        >
                          {workspaceMessages.pause}
                        </button>
                      ) : null}
                    </div>
                    {(applicationsByOpportunity[opportunity.id] ?? []).map((application) => (
                      <div key={application.id} className={styles.walletCard}>
                        <strong>
                          {application.applicant.displayName} •{' '}
                          {workspaceMessages.fitScore(application.fitScore)}
                        </strong>
                        <p className={styles.stateText}>{application.applicant.headline}</p>
                        <p className={styles.stateText}>
                          {workspaceMessages.status}:{' '}
                          {formatApplicationStatus(application.status)} •{' '}
                          {formatRecommendation(application.dossier.recommendation)}
                        </p>
                        <p className={styles.stateText}>
                          {workspaceMessages.riskFlags}:{' '}
                          {application.riskFlags.join(', ') || workspaceMessages.none}
                        </p>
                        <p className={styles.stateText}>
                          {workspaceMessages.missingRequirements}:{' '}
                          {application.dossier.matchSummary.missingRequirements.join(' | ') ||
                            workspaceMessages.none}
                        </p>
                        <p className={styles.stateText}>
                          {workspaceMessages.whyShortlisted}:{' '}
                          {application.dossier.whyShortlisted.join(' | ')}
                        </p>
                        <div className={styles.inlineActions}>
                          <button
                            type="button"
                            disabled={!canReviewApplications}
                            onClick={() =>
                              void handleApplicationDecision(
                                'shortlist',
                                application.id,
                                opportunity.id,
                              )
                            }
                          >
                            {workspaceMessages.shortlist}
                          </button>
                          <button
                            type="button"
                            disabled={!canReviewApplications}
                            onClick={() =>
                              void handleApplicationDecision(
                                'reject',
                                application.id,
                                opportunity.id,
                              )
                            }
                          >
                            {workspaceMessages.reject}
                          </button>
                          <button
                            type="button"
                            disabled={
                              !canReviewApplications ||
                              application.dossier.matchSummary.missingRequirements.length > 0 ||
                              (applicationTimelines[application.id]?.contractDraft?.status !==
                                undefined &&
                                applicationTimelines[application.id]?.contractDraft
                                  ?.status !== 'finalized')
                            }
                            onClick={() =>
                              void handleApplicationDecision(
                                'hire',
                                application.id,
                                opportunity.id,
                              )
                            }
                          >
                            {workspaceMessages.hireIntoEscrow}
                          </button>
                          <button
                            type="button"
                            disabled={!canReviewApplications}
                            onClick={() => void handleLoadApplicationTimeline(application.id)}
                          >
                            {workspaceMessages.loadTimeline}
                          </button>
                        </div>
                        {applicationTimelines[application.id] ? (
                          <div className={styles.stack}>
                            <span className={styles.metaLabel}>
                              {workspaceMessages.proposalTimeline}
                            </span>
                            <p className={styles.stateText}>
                              {workspaceMessages.revisionsTitle}:{' '}
                              {applicationTimelines[application.id].revisions.length}
                            </p>
                            <p className={styles.stateText}>
                              {workspaceMessages.decisionCount}:{' '}
                              {applicationTimelines[application.id].decisions.length}
                            </p>
                            {applicationTimelines[application.id].offers.length > 0 ? (
                              <p className={styles.stateText}>
                                {workspaceMessages.latestOffer}:{' '}
                                {
                                  applicationTimelines[application.id].offers[
                                    applicationTimelines[application.id].offers.length - 1
                                  ].status
                                }
                              </p>
                            ) : null}
                            {applicationTimelines[application.id].contractDraft
                              ? renderContractDraftPanel(
                                  application,
                                  applicationTimelines[application.id].contractDraft!,
                                  'client',
                                )
                              : null}
                            <div className={styles.stack}>
                              <span className={styles.metaLabel}>
                                {workspaceMessages.interviewTitle}
                              </span>
                              {applicationTimelines[application.id].interviewThread?.messages.map(
                                (message) => (
                                  <div key={message.id}>
                                    <p className={styles.stateText}>
                                      <strong>{message.senderEmail}</strong>: {message.body}
                                    </p>
                                    {message.attachments.length > 0 ? (
                                      <div>
                                      {message.attachments.map((attachment, attachmentIndex) => (
                                        <p
                                          key={`${attachment.id}-${attachmentIndex}`}
                                          className={styles.stateText}
                                          style={{ margin: '0.25rem 0 0' }}
                                        >
                                            <a
                                              href={attachment.url}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              {attachment.label || attachment.url}
                                            </a>
                                          </p>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                ),
                              ) ?? null}
                              <label className={styles.field}>
                                <span>{workspaceMessages.messageBody}</span>
                                <textarea
                                  rows={2}
                                  value={interviewDrafts[application.id] ?? ''}
                                  onChange={(event) =>
                                    updateInterviewDraft(
                                      application.id,
                                      () => event.target.value,
                                    )
                                  }
                                />
                              </label>
                              <div className={styles.inlineActions}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleSendInterviewMessage(application.id)
                                  }
                                >
                                  {workspaceMessages.sendClarification}
                                </button>
                              </div>
                            </div>
                            <div className={styles.stack}>
                              <span className={styles.metaLabel}>
                                {workspaceMessages.createOffer}
                              </span>
                              <label className={styles.field}>
                                <span>{workspaceMessages.offerMessage}</span>
                                <textarea
                                  rows={2}
                                  value={offerDrafts[application.id]?.message ?? ''}
                                  onChange={(event) =>
                                    updateOfferDraft(application.id, (current) => ({
                                      ...current,
                                      message: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label className={styles.field}>
                                <span>{workspaceMessages.offerRate}</span>
                                <input
                                  value={offerDrafts[application.id]?.proposedRate ?? ''}
                                  onChange={(event) =>
                                    updateOfferDraft(application.id, (current) => ({
                                      ...current,
                                      proposedRate: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label className={styles.field}>
                                <span>{workspaceMessages.offerMilestones}</span>
                                <textarea
                                  rows={3}
                                  placeholder={workspaceMessages.offerMilestonePlaceholder}
                                  value={offerDrafts[application.id]?.milestones ?? ''}
                                  onChange={(event) =>
                                    updateOfferDraft(application.id, (current) => ({
                                      ...current,
                                      milestones: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <div className={styles.inlineActions}>
                                <button
                                  type="button"
                                  onClick={() => void handleCreateOffer(application.id)}
                                >
                                  {workspaceMessages.createOffer}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {(matchesByOpportunity[opportunity.id] ?? []).length > 0 ? (
                      <div className={styles.stack}>
                        <span className={styles.metaLabel}>{workspaceMessages.matchBoard}</span>
                        {(matchesByOpportunity[opportunity.id] ?? []).map((match) => (
                          <div key={match.applicationId} className={styles.walletCard}>
                            <strong>
                              {formatRecommendation(match.recommendation)} •{' '}
                              {workspaceMessages.fitScore(match.matchSummary.fitScore)}
                            </strong>
                            <p className={styles.stateText}>
                              {workspaceMessages.skillOverlap}:{' '}
                              {match.matchSummary.skillOverlap.join(' • ') ||
                                workspaceMessages.none}
                            </p>
                            <p className={styles.stateText}>
                              {workspaceMessages.requirementGaps}:{' '}
                              {match.matchSummary.mustHaveSkillGaps.join(' • ') ||
                                workspaceMessages.none}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {(comparisonsByOpportunity[opportunity.id] ?? []).length > 0 ? (
                      <div className={styles.stack}>
                        <span className={styles.metaLabel}>
                          {workspaceMessages.compareSummary}
                        </span>
                        {(comparisonsByOpportunity[opportunity.id] ?? []).map((candidate) => (
                          <div
                            key={candidate.application.id}
                            className={styles.walletCard}
                          >
                            <strong>
                              {candidate.application.applicant.displayName} •{' '}
                              {workspaceMessages.fitScore(candidate.application.fitScore)}
                            </strong>
                            <p className={styles.stateText}>
                              {workspaceMessages.revisionsTitle}:{' '}
                              {candidate.latestRevision?.revisionNumber ?? 0}
                            </p>
                            <p className={styles.stateText}>
                              {workspaceMessages.latestOffer}:{' '}
                              {candidate.latestOffer?.status ?? workspaceMessages.none}
                            </p>
                            <p className={styles.stateText}>
                              {workspaceMessages.contractDraft.statusLabel}:{' '}
                              {candidate.contractDraftStatus
                                ? formatContractDraftStatus(candidate.contractDraftStatus)
                                : workspaceMessages.none}
                            </p>
                            <p className={styles.stateText}>
                              {workspaceMessages.decisionCount}: {candidate.decisionCount}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </SharedCard>
              ))
            )}
          </div>
        </article>
        ) : null}

        {isTalentWorkspace ? (
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>{workspaceMessages.profileEyebrow}</span>
              <h2>{workspaceMessages.myApplicationsTitle}</h2>
            </div>
          </div>
          <div className={styles.stack}>
            {!canApplyToOpportunity ? (
              <p className={styles.stateText}>
                {workspaceMessages.capabilityNotices.applyToOpportunity}
              </p>
            ) : null}
            {myApplications.length === 0 ? (
              <div className={styles.stack}>
                <p className={styles.stateText}>
                  {canApplyToOpportunity
                    ? workspaceMessages.emptyStates.freelancerApplicationsReady
                    : workspaceMessages.emptyStates.freelancerApplicationsBlocked}
                </p>
                {!canApplyToOpportunity
                  ? renderWorkspaceAction(
                      activeLane === 'agency'
                        ? agencyApplicationWorkspace
                        : freelancerApplicationWorkspace,
                    )
                  : null}
              </div>
            ) : (
              myApplications.map((application) => (
                <article
                  key={application.id}
                  className={styles.actionPanel}
                  data-testid={`marketplace-my-application-${application.id}`}
                >
                  <strong>{application.opportunity.title}</strong>
                  <p className={styles.stateText}>
                    {formatApplicationStatus(application.status)} •{' '}
                    {workspaceMessages.fitScore(application.fitScore)} •{' '}
                    {formatRecommendation(application.dossier.recommendation)}
                  </p>
                  <p className={styles.stateText}>
                    {workspaceMessages.missingRequirements}:{' '}
                    {application.dossier.matchSummary.missingRequirements.join(' | ') ||
                      workspaceMessages.none}
                  </p>
                  {application.hiredJobId ? (
                    <div className={styles.inlineActions}>
                      <Link
                        className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                        href={
                          application.contractPath ??
                          `/app/contracts/${application.hiredJobId}`
                        }
                      >
                        {workspaceMessages.viewContract}
                      </Link>
                      {buildProjectRoomHref(
                        application.contractPath,
                        application.hiredJobId,
                      ) ? (
                        <Link
                          className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                          href={
                            buildProjectRoomHref(
                              application.contractPath,
                              application.hiredJobId,
                            ) ?? `/app/contracts/${application.hiredJobId}/room`
                          }
                        >
                          {messages.common.projectRoom}
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canApplyToOpportunity}
                      onClick={() => void handleWithdrawApplication(application.id)}
                    >
                      {workspaceMessages.withdraw}
                    </button>
                  )}
                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      disabled={!canApplyToOpportunity}
                      onClick={() => void handleLoadApplicationTimeline(application.id)}
                    >
                      {workspaceMessages.loadTimeline}
                    </button>
                    {application.status !== 'withdrawn' &&
                    application.status !== 'rejected' &&
                    application.status !== 'declined' &&
                    application.status !== 'hired' ? (
                      <button
                        type="button"
                        disabled={!canApplyToOpportunity}
                        onClick={() => void handleReviseApplication(application)}
                      >
                        {workspaceMessages.reviseApplication}
                      </button>
                    ) : null}
                  </div>
                  {applicationTimelines[application.id] ? (
                    <div className={styles.stack}>
                      <span className={styles.metaLabel}>
                        {workspaceMessages.proposalTimeline}
                      </span>
                      <p className={styles.stateText}>
                        {workspaceMessages.revisionsTitle}:{' '}
                        {applicationTimelines[application.id].revisions.length}
                      </p>
                      {applicationTimelines[application.id].contractDraft
                        ? renderContractDraftPanel(
                            application,
                            applicationTimelines[application.id].contractDraft!,
                            'talent',
                          )
                        : null}
                      {applicationTimelines[application.id].revisions.map((revision) => (
                        <p
                          key={revision.id}
                          className={styles.stateText}
                        >{`#${revision.revisionNumber} • ${revision.revisionReason ?? revision.coverNote.slice(0, 80)}`}</p>
                      ))}
                      <div className={styles.stack}>
                        <span className={styles.metaLabel}>
                          {workspaceMessages.reviseApplication}
                        </span>
                        <label className={styles.field}>
                          <span>{workspaceMessages.coverNote}</span>
                          <textarea
                            rows={3}
                            value={
                              (
                                applicationDrafts[application.id] ??
                                createApplicationRevisionDraft(application)
                              ).coverNote
                            }
                            onChange={(event) =>
                              updateRevisionDraft(application, (current) => ({
                                ...current,
                                coverNote: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className={styles.field}>
                          <span>{workspaceMessages.deliveryApproach}</span>
                          <textarea
                            rows={3}
                            value={
                              (
                                applicationDrafts[application.id] ??
                                createApplicationRevisionDraft(application)
                              ).deliveryApproach
                            }
                            onChange={(event) =>
                              updateRevisionDraft(application, (current) => ({
                                ...current,
                                deliveryApproach: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className={styles.field}>
                          <span>{workspaceMessages.milestonePlanSummary}</span>
                          <textarea
                            rows={3}
                            value={
                              (
                                applicationDrafts[application.id] ??
                                createApplicationRevisionDraft(application)
                              ).milestonePlanSummary
                            }
                            onChange={(event) =>
                              updateRevisionDraft(application, (current) => ({
                                ...current,
                                milestonePlanSummary: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className={styles.field}>
                          <span>{workspaceMessages.revisionReason}</span>
                          <input
                            value={
                              (
                                applicationDrafts[application.id] ??
                                createApplicationRevisionDraft(application)
                              ).revisionReason
                            }
                            onChange={(event) =>
                              updateRevisionDraft(application, (current) => ({
                                ...current,
                                revisionReason: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                      <div className={styles.stack}>
                        <span className={styles.metaLabel}>
                          {workspaceMessages.interviewTitle}
                        </span>
                        {applicationTimelines[application.id].interviewThread?.messages.map(
                          (message) => (
                            <div key={message.id}>
                              <p className={styles.stateText}>
                                <strong>{message.senderEmail}</strong>: {message.body}
                              </p>
                              {message.attachments.length > 0 ? (
                                <div>
                                  {message.attachments.map((attachment, attachmentIndex) => (
                                    <p
                                      key={`${attachment.id}-${attachmentIndex}`}
                                      className={styles.stateText}
                                      style={{ margin: '0.25rem 0 0' }}
                                    >
                                      <a
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {attachment.label || attachment.url}
                                      </a>
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ),
                        ) ?? null}
                        <label className={styles.field}>
                          <span>{workspaceMessages.messageBody}</span>
                          <textarea
                            rows={2}
                            value={interviewDrafts[application.id] ?? ''}
                            onChange={(event) =>
                              updateInterviewDraft(
                                application.id,
                                () => event.target.value,
                              )
                            }
                          />
                        </label>
                        <div className={styles.inlineActions}>
                          <button
                            type="button"
                            onClick={() => void handleSendInterviewMessage(application.id)}
                          >
                            {workspaceMessages.sendClarification}
                          </button>
                        </div>
                      </div>
                      {applicationTimelines[application.id].offers.length > 0 ? (
                        <div className={styles.stack}>
                          <span className={styles.metaLabel}>
                            {workspaceMessages.latestOffer}
                          </span>
                          {applicationTimelines[application.id].offers.map((offer) => (
                            <div key={offer.id} className={styles.walletCard}>
                              <strong>{offer.status}</strong>
                              <p className={styles.stateText}>
                                {offer.message ?? offer.counterMessage ?? workspaceMessages.none}
                              </p>
                              <p className={styles.stateText}>
                                {workspaceMessages.offerRate}:{' '}
                                {offer.proposedRate ?? workspaceMessages.none}
                              </p>
                              <p className={styles.stateText}>
                                {workspaceMessages.offerMilestones}:{' '}
                                {offer.milestones.map((entry) => entry.title).join(' • ') ||
                                  workspaceMessages.none}
                              </p>
                              <label className={styles.field}>
                                <span>{workspaceMessages.offerMessage}</span>
                                <textarea
                                  rows={2}
                                  value={offerDrafts[application.id]?.message ?? ''}
                                  onChange={(event) =>
                                    updateOfferDraft(application.id, (current) => ({
                                      ...current,
                                      message: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label className={styles.field}>
                                <span>{workspaceMessages.offerRate}</span>
                                <input
                                  value={offerDrafts[application.id]?.proposedRate ?? ''}
                                  onChange={(event) =>
                                    updateOfferDraft(application.id, (current) => ({
                                      ...current,
                                      proposedRate: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label className={styles.field}>
                                <span>{workspaceMessages.offerMilestones}</span>
                                <textarea
                                  rows={3}
                                  placeholder={workspaceMessages.offerMilestonePlaceholder}
                                  value={
                                    offerDrafts[application.id]?.milestones ??
                                    serializeOfferMilestones(offer.milestones)
                                  }
                                  onChange={(event) =>
                                    updateOfferDraft(application.id, (current) => ({
                                      ...current,
                                      milestones: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label className={styles.field}>
                                <span>{workspaceMessages.declineReason}</span>
                                <input
                                  value={offerDrafts[application.id]?.declineReason ?? ''}
                                  onChange={(event) =>
                                    updateOfferDraft(application.id, (current) => ({
                                      ...current,
                                      declineReason: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <div className={styles.inlineActions}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleRespondToOffer(
                                      application.id,
                                      offer.id,
                                      'accept',
                                    )
                                  }
                                >
                                  {workspaceMessages.respondAccept}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleRespondToOffer(
                                      application.id,
                                      offer.id,
                                      'counter',
                                    )
                                  }
                                >
                                  {workspaceMessages.respondCounter}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleRespondToOffer(
                                      application.id,
                                      offer.id,
                                      'decline',
                                    )
                                  }
                                >
                                  {workspaceMessages.respondDecline}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </article>
        ) : null}
      </RevealSection>

        {isTalentWorkspace ? (
      <RevealSection className={styles.grid} delay={0.2}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>{workspaceMessages.discoverEyebrow}</span>
              <h2>{workspaceMessages.openBriefsTitle}</h2>
            </div>
          </div>
          <div className={styles.stack}>
            {publicOpportunities.length === 0 ? (
              <p className={styles.stateText}>{workspaceMessages.noPublicBriefs}</p>
            ) : (
              publicOpportunities.map((opportunity) => {
                const draft =
                  applicationDrafts[opportunity.id] ??
                  createApplicationDraft(opportunity, profile);
                return (
                  <SharedCard
                    key={opportunity.id}
                    className={styles.actionPanel}
                    data-testid={`marketplace-open-brief-${opportunity.id}`}
                    interactive
                    layoutId={`marketplace-opportunity-${opportunity.id}`}
                  >
                    <div className={styles.stack}>
                      <strong>{opportunity.title}</strong>
                      <p className={styles.stateText}>{opportunity.summary}</p>
                      <p className={styles.stateText}>
                        {workspaceMessages.mustHaves}:{' '}
                        {opportunity.mustHaveSkills.join(' • ') || workspaceMessages.noneListed}
                      </p>
                      <p className={styles.stateText}>
                        {workspaceMessages.requiredCryptoReadiness}:{' '}
                        {
                          marketplaceMessages.labels.cryptoReadiness[
                            opportunity.cryptoReadinessRequired
                          ]
                        }
                      </p>
                      <div className={styles.inlineActions}>
                        <Link
                          className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                          href={`/marketplace/opportunities/${opportunity.id}`}
                        >
                          {workspaceMessages.viewPublicBrief}
                        </Link>
                      </div>
                      {tokens && user && user.id !== opportunity.owner.userId ? (
                        <div className={styles.stack}>
                          <label className={styles.field}>
                            <span>{workspaceMessages.coverNote}</span>
                            <textarea
                              disabled={!canApplyToOpportunity}
                              rows={3}
                              value={draft.coverNote}
                              onChange={(event) =>
                                updateApplicationDraft(opportunity.id, (current) => ({
                                  ...current,
                                  coverNote: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className={styles.field}>
                            <span>{workspaceMessages.deliveryApproach}</span>
                            <textarea
                              disabled={!canApplyToOpportunity}
                              rows={3}
                              value={draft.deliveryApproach}
                              onChange={(event) =>
                                updateApplicationDraft(opportunity.id, (current) => ({
                                  ...current,
                                  deliveryApproach: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className={styles.field}>
                            <span>{workspaceMessages.milestonePlanSummary}</span>
                            <textarea
                              disabled={!canApplyToOpportunity}
                              rows={3}
                              value={draft.milestonePlanSummary}
                              onChange={(event) =>
                                updateApplicationDraft(opportunity.id, (current) => ({
                                  ...current,
                                  milestonePlanSummary: event.target.value,
                                }))
                              }
                            />
                          </label>
                          {opportunity.screeningQuestions.map((question) => (
                            <label key={question.id} className={styles.field}>
                              <span>{question.prompt}</span>
                              <textarea
                                disabled={!canApplyToOpportunity}
                                rows={2}
                                value={draft.screeningAnswers[question.id] ?? ''}
                                onChange={(event) =>
                                  updateApplicationDraft(opportunity.id, (current) => ({
                                    ...current,
                                    screeningAnswers: {
                                      ...current.screeningAnswers,
                                      [question.id]: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </label>
                          ))}
                          <div className={styles.inlineActions}>
                            <button
                              type="button"
                              disabled={!canApplyToOpportunity}
                              onClick={() => void handleApplyToOpportunity(opportunity)}
                            >
                              {workspaceMessages.submitStructuredApplication}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </SharedCard>
                );
              })
            )}
          </div>
        </article>
      </RevealSection>
      ) : null}
    </ConsolePage>
  );
}
