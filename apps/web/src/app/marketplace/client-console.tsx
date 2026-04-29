'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ConsolePage,
  EmptyStateCard,
  FactGrid,
  FactItem,
  PageTopBar,
  SectionCard,
  StatusNotice,
} from '@escrow4334/frontend-core';
import { RevealSection, SharedCard } from '@escrow4334/frontend-core/spatial';
import styles from '../page.styles';
import { ThemeToggle } from '../theme-toggle';
import { useWebI18n } from '../../lib/i18n';
import {
  webApi,
  type JobView,
  type MarketplaceAnalyticsOverview,
  type MarketplaceContractDraft,
  type MarketplaceApplication,
  type MarketplaceApplicationComparison,
  type MarketplaceApplicationTimeline,
  type MarketplaceHiringCommunicationThread,
  type MarketplaceOffer,
  type MarketplaceOfferMilestoneDraft,
  type MarketplaceCryptoReadiness,
  type MarketplaceDigest,
  type MarketplaceDigestDispatchRun,
  type MarketplaceEngagementType,
  type MarketplaceNotification,
  type MarketplaceOpportunity,
  type SessionTokens,
  type UserProfile,
} from '../../lib/api';
import {
  buildProjectRoomHref,
  fromDateInput,
  getWorkspaceLane,
  readMarketplaceSession,
  splitList,
  workspaceMatchesLane,
  writeMarketplaceSession,
} from './shared';

export type ClientConsoleSection =
  | 'dashboard'
  | 'opportunities'
  | 'applicants'
  | 'interviews'
  | 'offers'
  | 'contracts'
  | 'funding'
  | 'disputes';

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

type ClientDashboardActionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
  tone: 'warning' | 'info' | 'danger';
};

type ClientContractRow = {
  job: JobView;
  href: string;
  roomHref: string | null;
  deliveredCount: number;
  disputedCount: number;
  releasedCount: number;
};

type OfferDraft = {
  message: string;
  proposedRate: string;
  milestones: string;
  declineReason: string;
};

type ClientOfferRow = {
  timeline: MarketplaceApplicationTimeline;
  latestOffer: MarketplaceOffer;
  draft: MarketplaceContractDraft | null;
  hasActiveNegotiation: boolean;
};

const navSections: ClientConsoleSection[] = [
  'dashboard',
  'opportunities',
  'applicants',
  'interviews',
  'offers',
  'contracts',
  'funding',
  'disputes',
];

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

function formatOfferMessage(offer: MarketplaceOffer) {
  return offer.message ?? offer.counterMessage ?? '';
}

async function loadApplicationData(
  accessToken: string,
  opportunities: MarketplaceOpportunity[],
  options: {
    includeComparisons?: boolean;
    includeTimelines?: boolean;
    includeHiringThreads?: boolean;
  },
) {
  const applicationsByOpportunity: Record<string, MarketplaceApplication[]> = {};
  const comparisonsByOpportunity: Record<string, MarketplaceApplicationComparison[]> =
    {};
  const timelinesByApplication: Record<string, MarketplaceApplicationTimeline> = {};
  const hiringThreadsByApplication: Record<string, MarketplaceHiringCommunicationThread> = {};

  await Promise.all(
    opportunities.map(async (opportunity) => {
      const applicationsResponse = await webApi.listOpportunityApplications(
        opportunity.id,
        accessToken,
      );
      applicationsByOpportunity[opportunity.id] = applicationsResponse.applications;

      if (options.includeComparisons) {
        const comparisonResponse =
          await webApi.getMarketplaceOpportunityApplicationComparison(
            opportunity.id,
            accessToken,
          );
        comparisonsByOpportunity[opportunity.id] = comparisonResponse.candidates;
      }

      if (options.includeTimelines) {
        const timelineEntries = await Promise.all(
          applicationsResponse.applications.map(async (application) => {
            const threadResponse = options.includeHiringThreads
              ? await webApi
                  .getMarketplaceApplicationHiringThread(application.id, accessToken)
                  .catch(() => null)
              : null;

            const timelineResponse = await webApi.getMarketplaceApplicationTimeline(
              application.id,
              accessToken,
            );
            await webApi
              .markMarketplaceApplicationInterviewThreadRead(application.id, accessToken)
              .catch(() => {});

            return {
              applicationId: application.id,
              timeline: timelineResponse.timeline,
              thread: threadResponse?.thread ?? null,
            };
          }),
        );

        timelineEntries.forEach((entry) => {
          timelinesByApplication[entry.applicationId] = entry.timeline;
          if (entry.thread) {
            hiringThreadsByApplication[entry.applicationId] = entry.thread;
          }
        });
      }
    }),
  );

  return {
    applicationsByOpportunity,
    comparisonsByOpportunity,
    timelinesByApplication,
    hiringThreadsByApplication,
  };
}

function formatHiringCommunicationSource(source: MarketplaceHiringCommunicationThread['events'][number]['source']) {
  if (source === 'interview_message') {
    return 'Interview Message';
  }
  if (source === 'application_decision') {
    return 'Decision';
  }
  if (source === 'offer') {
    return 'Offer';
  }
  return 'Project Room';
}

function formatHiringActorLabel(
  event: MarketplaceHiringCommunicationThread['events'][number],
  viewerUserId: string | null,
) {
  if (event.actor.userId && viewerUserId && event.actor.userId === viewerUserId) {
    return 'You';
  }
  return event.actor.email ?? event.actor.role;
}

function renderHiringCommunicationThread(
  thread: MarketplaceHiringCommunicationThread | null,
  viewerUserId: string | null,
  emptyLabel: string,
) {
  const events = thread?.events ?? [];

  if (events.length === 0) {
    return <p className={styles.stateText}>{emptyLabel}</p>;
  }

  return (
    <div className={styles.stack}>
      {events.map((event) => {
        const actorLabel = formatHiringActorLabel(event, viewerUserId);

        return (
          <div key={event.id} className={styles.walletCard}>
            <strong>
              {actorLabel} • {formatHiringCommunicationSource(event.source)}
            </strong>
            <p className={styles.stateText}>
              {new Date(event.createdAt).toLocaleString()}
            </p>
            <p className={styles.stateText}>{event.title}</p>
            <p className={styles.stateText}>
              {event.body ?? emptyLabel}
            </p>
            {event.offerId ? (
              <p className={styles.stateText}>
                Offer #{event.offerRevisionNumber ?? 'n/a'} • {event.offerStatus}
              </p>
            ) : null}
            {event.messageKind ? (
              <p className={styles.stateText}>Message kind: {event.messageKind}</p>
            ) : null}
            {event.attachments.length > 0 ? (
              <div>
                {event.attachments.map((attachment, attachmentIndex) => (
                  <p
                    key={`${attachment.id}-${attachmentIndex}`}
                    className={styles.stateText}
                    style={{ margin: '0.25rem 0' }}
                  >
                    <a href={attachment.url} target="_blank" rel="noreferrer">
                      {attachment.label || attachment.url}
                    </a>
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function countMilestones(job: JobView, status: JobView['milestones'][number]['status']) {
  return job.milestones.filter((milestone) => milestone.status === status).length;
}

function deriveContractRows(jobs: JobView[]) {
  return jobs.map((job) => ({
    job,
    href: `/app/contracts/${job.id}`,
    roomHref: buildProjectRoomHref(null, job.id),
    deliveredCount: countMilestones(job, 'delivered'),
    disputedCount: countMilestones(job, 'disputed'),
    releasedCount: countMilestones(job, 'released'),
  }));
}

function getLatestInterviewSummary(timeline: MarketplaceApplicationTimeline) {
  const messages = timeline.interviewThread?.messages ?? [];
  const latest = messages[messages.length - 1] ?? null;
  if (!latest) {
    return null;
  }

  const awaitingClientReply =
    latest.senderUserId === timeline.application.applicant.userId;
  const hasUnreadForClient =
    timeline.interviewThread?.hasUnreadForClient ?? false;

  return {
    latest,
    hasUnreadForClient,
    awaitingClientReply,
  };
}

function formatBudget(opportunity: MarketplaceOpportunity) {
  const min = opportunity.budgetMin ?? 'open';
  const max = opportunity.budgetMax ?? 'open';
  return `${min} - ${max}`;
}

function formatContractStatus(job: JobView) {
  if (job.status === 'disputed') {
    return 'disputed';
  }
  if (job.status === 'resolved') {
    return 'resolved';
  }
  if (job.status === 'completed') {
    return 'completed';
  }
  if (!job.fundedAmount) {
    return 'awaiting funding';
  }
  if (job.contractorParticipation?.status === 'pending') {
    return 'awaiting contractor join';
  }
  if (countMilestones(job, 'disputed') > 0) {
    return 'disputed milestone';
  }
  if (countMilestones(job, 'delivered') > 0) {
    return 'awaiting milestone review';
  }
  return job.status;
}

export function ClientConsole(props: { section: ClientConsoleSection }) {
  const { section } = props;
  const { messages } = useWebI18n();
  const clientMessages = messages.publicMarketplace.clientConsole;
  const marketplaceMessages = messages.publicMarketplace;
  const workspaceMessages = marketplaceMessages.workspace;

  const [tokens, setTokens] = useState<SessionTokens | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contracts, setContracts] = useState<JobView[]>([]);
  const [myOpportunities, setMyOpportunities] = useState<MarketplaceOpportunity[]>(
    [],
  );
  const [applicationsByOpportunity, setApplicationsByOpportunity] = useState<
    Record<string, MarketplaceApplication[]>
  >({});
  const [comparisonsByOpportunity, setComparisonsByOpportunity] = useState<
    Record<string, MarketplaceApplicationComparison[]>
  >({});
  const [applicationTimelines, setApplicationTimelines] = useState<
    Record<string, MarketplaceApplicationTimeline>
  >({});
  const [applicationHiringThreads, setApplicationHiringThreads] = useState<
    Record<string, MarketplaceHiringCommunicationThread>
  >({});
  const [notifications, setNotifications] = useState<MarketplaceNotification[]>([]);
  const [digests, setDigests] = useState<MarketplaceDigest[]>([]);
  const [digestRuns, setDigestRuns] = useState<MarketplaceDigestDispatchRun[]>([]);
  const [analyticsOverview, setAnalyticsOverview] =
    useState<MarketplaceAnalyticsOverview | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [offerDrafts, setOfferDrafts] = useState<Record<string, OfferDraft>>({});
  const [opportunityDraft, setOpportunityDraft] = useState<OpportunityDraft>(
    createEmptyOpportunityDraft(),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeWorkspace = user?.activeWorkspace ?? null;
  const availableWorkspaces = user?.workspaces ?? [];
  const activeLane = activeWorkspace ? getWorkspaceLane(activeWorkspace) : null;
  const clientWorkspace =
    availableWorkspaces.find((workspace) => workspaceMatchesLane(workspace, 'client')) ??
    null;
  const canCreateOpportunity = activeWorkspace?.capabilities.createOpportunity ?? false;
  const canReviewApplications =
    activeWorkspace?.capabilities.reviewApplications ?? false;
  const unreadNotifications = notifications.filter(
    (notification) => notification.status === 'unread',
  );
  const publishedBriefCount = myOpportunities.filter(
    (opportunity) => opportunity.status === 'published',
  ).length;
  const activeContracts = contracts.filter(
    (job) => job.status !== 'completed' && job.status !== 'resolved',
  );
  const applicantBacklog = myOpportunities.reduce(
    (count, opportunity) => count + opportunity.applicationCount,
    0,
  );
  const contractRows = deriveContractRows(contracts);
  const fundingRows = contractRows.filter(
    (row) =>
      !row.job.fundedAmount ||
      row.job.status === 'draft' ||
      row.job.contractorParticipation?.status === 'pending',
  );
  const disputeRows = contractRows.filter(
    (row) => row.job.status === 'disputed' || row.disputedCount > 0,
  );
  const reviewRows = contractRows.filter((row) => row.deliveredCount > 0);
  const applicantRows = Object.values(applicationsByOpportunity).flat();
  const interviewRows = Object.values(applicationTimelines)
    .map((timeline) => {
      const summary = getLatestInterviewSummary(timeline);
      return summary ? { timeline, summary } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const offerRows: ClientOfferRow[] = Object.values(applicationTimelines)
    .map((timeline) => {
      const latestOffer = timeline.offers[timeline.offers.length - 1] ?? null;
      return latestOffer
        ? {
            timeline,
            latestOffer,
            draft: timeline.contractDraft,
            hasActiveNegotiation: ['sent', 'countered'].includes(latestOffer.status),
          }
        : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const activeOfferRows = offerRows.filter((entry) => entry.hasActiveNegotiation);
  const dashboardActions = useMemo<ClientDashboardActionItem[]>(() => {
    const items: ClientDashboardActionItem[] = [];

    const draftsToPublish = myOpportunities.filter(
      (opportunity) => opportunity.status === 'draft' || opportunity.status === 'paused',
    );
    if (draftsToPublish.length > 0) {
      items.push({
        id: 'publish-briefs',
        title: clientMessages.dashboard.actions.publishBriefs,
        detail: clientMessages.dashboard.actions.publishBriefsDetail(
          draftsToPublish.length,
        ),
        href: '/app/marketplace/client/opportunities',
        cta: clientMessages.dashboard.actions.openOpportunities,
        tone: 'warning',
      });
    }

    if (applicantBacklog > 0) {
      items.push({
        id: 'review-applicants',
        title: clientMessages.dashboard.actions.reviewApplicants,
        detail: clientMessages.dashboard.actions.reviewApplicantsDetail(
          applicantBacklog,
        ),
        href: '/app/marketplace/client/applicants',
        cta: clientMessages.dashboard.actions.openApplicants,
        tone: 'info',
      });
    }

    const pendingReplies = interviewRows.filter(
      (entry) => entry.summary.hasUnreadForClient,
    ).length;
    if (pendingReplies > 0) {
      items.push({
        id: 'reply-interviews',
        title: clientMessages.dashboard.actions.replyInterviews,
        detail: clientMessages.dashboard.actions.replyInterviewsDetail(
          pendingReplies,
        ),
        href: '/app/marketplace/client/interviews',
        cta: clientMessages.dashboard.actions.openInterviews,
        tone: 'warning',
      });
    }

    if (activeOfferRows.length > 0) {
      items.push({
        id: 'offers',
        title: clientMessages.dashboard.actions.trackOffers,
        detail: clientMessages.dashboard.actions.trackOffersDetail(activeOfferRows.length),
        href: '/app/marketplace/client/offers',
        cta: clientMessages.dashboard.actions.openOffers,
        tone: 'info',
      });
    }

    if (fundingRows.length > 0) {
      items.push({
        id: 'funding',
        title: clientMessages.dashboard.actions.fundContracts,
        detail: clientMessages.dashboard.actions.fundContractsDetail(
          fundingRows.length,
        ),
        href: '/app/marketplace/client/funding',
        cta: clientMessages.dashboard.actions.openFunding,
        tone: 'warning',
      });
    }

    if (reviewRows.length > 0) {
      items.push({
        id: 'milestone-review',
        title: clientMessages.dashboard.actions.reviewMilestones,
        detail: clientMessages.dashboard.actions.reviewMilestonesDetail(
          reviewRows.length,
        ),
        href: '/app/marketplace/client/contracts',
        cta: clientMessages.dashboard.actions.openContracts,
        tone: 'info',
      });
    }

    if (disputeRows.length > 0) {
      items.push({
        id: 'disputes',
        title: clientMessages.dashboard.actions.resolveDisputes,
        detail: clientMessages.dashboard.actions.resolveDisputesDetail(
          disputeRows.length,
        ),
        href: '/app/marketplace/client/disputes',
        cta: clientMessages.dashboard.actions.openDisputes,
        tone: 'danger',
      });
    }

    return items;
  }, [
    applicantBacklog,
    clientMessages.dashboard.actions,
    disputeRows.length,
    fundingRows.length,
    interviewRows,
    myOpportunities,
    activeOfferRows.length,
    reviewRows.length,
  ]);

  async function loadConsole(nextTokens: SessionTokens | null = tokens) {
    setLoading(true);
    setError(null);

    try {
      if (!nextTokens) {
        setUser(null);
        setContracts([]);
        setMyOpportunities([]);
        setApplicationsByOpportunity({});
        setComparisonsByOpportunity({});
        setApplicationTimelines({});
        setApplicationHiringThreads({});
        setNotifications([]);
        setDigests([]);
        setDigestRuns([]);
        setAnalyticsOverview(null);
        setOfferDrafts({});
        return;
      }

      const [me, jobsResponse] = await Promise.all([
        webApi.me(nextTokens.accessToken),
        webApi.listJobs(nextTokens.accessToken),
      ]);
      setUser(me);
      setContracts(jobsResponse.jobs.map((entry) => entry.job));

      if (!me.activeWorkspace || getWorkspaceLane(me.activeWorkspace) !== 'client') {
        setMyOpportunities([]);
        setApplicationsByOpportunity({});
        setComparisonsByOpportunity({});
        setApplicationTimelines({});
        setApplicationHiringThreads({});
        setNotifications([]);
        setDigests([]);
        setDigestRuns([]);
        setAnalyticsOverview(null);
        setOfferDrafts({});
        return;
      }

      const opportunitiesResponse = await webApi.listMyMarketplaceOpportunities(
        nextTokens.accessToken,
      );
      setMyOpportunities(opportunitiesResponse.opportunities);

      const shouldLoadApplications =
        section === 'dashboard' ||
        section === 'applicants' ||
        section === 'interviews' ||
        section === 'offers';
      const shouldLoadTimelines =
        section === 'dashboard' ||
        section === 'interviews' ||
        section === 'offers';

      const [
        applicationBundle,
        dashboardNotifications,
        dashboardDigests,
        dashboardDigestRuns,
        dashboardAnalytics,
      ] = await Promise.all([
        shouldLoadApplications
          ? loadApplicationData(nextTokens.accessToken, opportunitiesResponse.opportunities, {
              includeComparisons: section === 'applicants',
              includeTimelines: shouldLoadTimelines || section === 'applicants',
              includeHiringThreads: section === 'interviews' || section === 'offers',
            })
          : Promise.resolve({
              applicationsByOpportunity: {},
              comparisonsByOpportunity: {},
              timelinesByApplication: {},
              hiringThreadsByApplication: {},
            }),
        section === 'dashboard'
          ? webApi
              .listMarketplaceNotifications(nextTokens.accessToken)
              .catch(() => ({ notifications: [] }))
          : Promise.resolve({ notifications: [] }),
        section === 'dashboard'
          ? webApi
              .listMarketplaceDigests(nextTokens.accessToken)
              .catch(() => ({ digests: [] }))
          : Promise.resolve({ digests: [] }),
        section === 'dashboard'
          ? webApi
              .listMarketplaceDigestDispatchRuns(nextTokens.accessToken)
              .catch(() => ({ runs: [] }))
          : Promise.resolve({ runs: [] }),
        section === 'dashboard'
          ? webApi
              .getMarketplaceAnalyticsOverview(nextTokens.accessToken)
              .catch(() => ({ overview: null }))
          : Promise.resolve({ overview: null }),
      ]);

      setApplicationsByOpportunity(applicationBundle.applicationsByOpportunity);
      setComparisonsByOpportunity(applicationBundle.comparisonsByOpportunity);
      setApplicationTimelines(applicationBundle.timelinesByApplication);
      setApplicationHiringThreads(applicationBundle.hiringThreadsByApplication);
      setNotifications(dashboardNotifications.notifications);
      setDigests(dashboardDigests.digests);
      setDigestRuns(dashboardDigestRuns.runs);
      setAnalyticsOverview(dashboardAnalytics.overview);
    } catch (loadError) {
      setError(
        loadError instanceof Error && loadError.message.trim()
          ? loadError.message
          : clientMessages.messages.loadFailed,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = readMarketplaceSession();
    setTokens(stored);
    void loadConsole(stored);
  }, [section]);

  async function handleSignOut() {
    if (tokens) {
      await webApi.logout(tokens.refreshToken);
    }
    writeMarketplaceSession(null);
    setTokens(null);
    setMessage(clientMessages.messages.signedOut);
    await loadConsole(null);
  }

  async function handleSelectWorkspace(workspaceId: string) {
    if (!tokens || user?.activeWorkspace?.workspaceId === workspaceId) {
      return;
    }

    await webApi.selectWorkspace(workspaceId, tokens.accessToken);
    setMessage(clientMessages.messages.workspaceSwitched);
    await loadConsole(tokens);
  }

  async function handleCreateOpportunity() {
    if (!tokens || !canCreateOpportunity) {
      setError(workspaceMessages.capabilityNotices.createOpportunity);
      return;
    }

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
        screeningQuestions: splitList(opportunityDraft.screeningQuestions).map(
          (prompt, index) => ({
            id: `screening-${index + 1}`,
            prompt,
            required: true,
          }),
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
    setMessage(clientMessages.messages.briefCreated);
    await loadConsole(tokens);
  }

  async function handlePublishOpportunity(opportunityId: string) {
    if (!tokens || !canCreateOpportunity) {
      return;
    }
    await webApi.publishMarketplaceOpportunity(opportunityId, tokens.accessToken);
    setMessage(clientMessages.messages.briefPublished);
    await loadConsole(tokens);
  }

  async function handlePauseOpportunity(opportunityId: string) {
    if (!tokens || !canCreateOpportunity) {
      return;
    }
    await webApi.pauseMarketplaceOpportunity(opportunityId, tokens.accessToken);
    setMessage(clientMessages.messages.briefPaused);
    await loadConsole(tokens);
  }

  async function handleApplicationDecision(
    action: 'shortlist' | 'reject' | 'hire',
    applicationId: string,
  ) {
    if (!tokens || !canReviewApplications) {
      setError(workspaceMessages.capabilityNotices.reviewApplications);
      return;
    }

    if (action === 'shortlist') {
      await webApi.shortlistMarketplaceApplication(
        applicationId,
        tokens.accessToken,
      );
      setMessage(clientMessages.messages.applicantShortlisted);
    } else if (action === 'reject') {
      await webApi.rejectMarketplaceApplication(applicationId, tokens.accessToken);
      setMessage(clientMessages.messages.applicantRejected);
    } else {
      await webApi.hireMarketplaceApplication(applicationId, tokens.accessToken);
      setMessage(clientMessages.messages.applicantHired);
    }

    await loadConsole(tokens);
  }

  async function handleSendInterviewReply(applicationId: string) {
    if (!tokens || !canReviewApplications) {
      return;
    }

    const body = replyDrafts[applicationId]?.trim() ?? '';
    if (!body) {
      setError(clientMessages.messages.replyRequired);
      return;
    }

    await webApi.postMarketplaceApplicationInterviewMessage(
      applicationId,
      {
        kind: 'clarification',
        body,
      },
      tokens.accessToken,
    );
    setReplyDrafts((current) => ({ ...current, [applicationId]: '' }));
    setMessage(clientMessages.messages.replySent);
    await loadConsole(tokens);
  }

  function getOfferDraft(applicationId: string, offer: MarketplaceOffer) {
    const draft = offerDrafts[applicationId];
    if (draft) {
      return draft;
    }
    return {
      ...createEmptyOfferDraft(),
      message: formatOfferMessage(offer),
      proposedRate: offer.proposedRate ?? '',
      milestones: serializeOfferMilestones(offer.milestones),
      declineReason: offer.declineReason ?? '',
    };
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
    await loadConsole(tokens);
  }

  const sectionTitle = clientMessages.nav[section];
  const activeWorkspaceSummary = activeWorkspace ? (
    `${activeWorkspace.label} • ${workspaceMessages.activeWorkspace.modeLabel[
      activeLane ?? 'client'
    ]}`
  ) : clientMessages.workspace.none;

  return (
    <ConsolePage theme="web">
      <div className={styles.console}>
        <PageTopBar
          eyebrow={clientMessages.eyebrow}
          title={sectionTitle}
          description={clientMessages.description}
          actions={
            <>
              <Link
                className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                href="/app/marketplace"
              >
                {clientMessages.actions.backToWorkspace}
              </Link>
              <button type="button" onClick={() => void handleSignOut()}>
                {workspaceMessages.signOut}
              </button>
              <ThemeToggle />
            </>
          }
        />

        {message ? (
          <StatusNotice
            className={styles.statusBanner}
            message={message}
            messageClassName={styles.stateText}
          />
        ) : null}
        {error ? (
          <StatusNotice
            className={styles.statusBanner}
            message={error}
            messageClassName={styles.stateText}
          />
        ) : null}

        {loading ? (
          <EmptyStateCard
            className={styles.panel}
            title={clientMessages.loadingTitle}
            message={clientMessages.loadingBody}
            messageClassName={styles.stateText}
          />
        ) : null}

        {!loading && !tokens ? (
          <EmptyStateCard
            className={styles.panel}
            title={clientMessages.sessionRequiredTitle}
            message={clientMessages.sessionRequiredBody}
            messageClassName={styles.stateText}
          />
        ) : null}

        {!loading && tokens && (!activeWorkspace || activeLane !== 'client') ? (
          <EmptyStateCard
            className={styles.panel}
            title={
              clientWorkspace
                ? clientMessages.workspace.switchRequiredTitle
                : clientMessages.workspace.unavailableTitle
            }
            message={
              clientWorkspace
                ? clientMessages.workspace.switchRequiredBody
                : clientMessages.workspace.unavailableBody
            }
            messageClassName={styles.stateText}
          >
            <div className={styles.inlineActions}>
              {clientWorkspace ? (
                <button
                  type="button"
                  onClick={() => void handleSelectWorkspace(clientWorkspace.workspaceId)}
                >
                  {clientMessages.workspace.switchTo(clientWorkspace.label)}
                </button>
              ) : (
                <Link
                  className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                  href="/app/marketplace"
                >
                  {clientMessages.actions.backToWorkspace}
                </Link>
              )}
            </div>
          </EmptyStateCard>
        ) : null}

        {!loading && tokens && activeWorkspace && activeLane === 'client' ? (
          <>
            <RevealSection className={styles.grid} delay={0.04}>
              <SectionCard
                className={styles.panel}
                eyebrow={clientMessages.workspace.eyebrow}
                title={activeWorkspaceSummary}
                description={`${workspaceMessages.activeWorkspace.organizationLabel}: ${activeWorkspace.organizationName}`}
              >
                <FactGrid className={styles.summaryGrid}>
                  <FactItem
                    label={clientMessages.summary.unreadInbox}
                    value={unreadNotifications.length}
                  />
                  <FactItem
                    label={clientMessages.summary.publishedBriefs}
                    value={publishedBriefCount}
                  />
                  <FactItem
                    label={clientMessages.summary.applicants}
                    value={applicantBacklog}
                  />
                  <FactItem
                    label={clientMessages.summary.activeContracts}
                    value={activeContracts.length}
                  />
                </FactGrid>
                {availableWorkspaces.length > 1 ? (
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
                          workspaceMessages.activeWorkspace.modeLabel[
                            getWorkspaceLane(workspace)
                          ],
                        )}
                      </button>
                    ))}
                  </div>
                ) : null}
              </SectionCard>
              <SectionCard
                className={styles.panel}
                eyebrow={clientMessages.nav.eyebrow}
                title={clientMessages.nav.title}
              >
                <div className="flex flex-wrap gap-3">
                  {navSections.map((navSection) => {
                    const isActive = navSection === section;
                    const href =
                      navSection === 'dashboard'
                        ? '/app/marketplace/client'
                        : `/app/marketplace/client/${navSection}`;
                    return (
                      <Link
                        key={navSection}
                        className={`${styles.actionLink} ${
                          isActive
                            ? styles.actionLinkPrimary
                            : styles.actionLinkSecondary
                        }`}
                        data-testid={`client-console-nav-${navSection}`}
                        href={href}
                      >
                        {clientMessages.nav[navSection]}
                      </Link>
                    );
                  })}
                </div>
              </SectionCard>
            </RevealSection>

            {section === 'dashboard' ? (
              <>
                <RevealSection className={styles.grid} delay={0.06}>
                  <SectionCard
                    className={styles.panel}
                    eyebrow={clientMessages.dashboard.eyebrow}
                    title={clientMessages.dashboard.needsActionTitle}
                  >
                    {dashboardActions.length === 0 ? (
                      <p className={styles.stateText}>
                        {clientMessages.dashboard.noActions}
                      </p>
                    ) : (
                      dashboardActions.map((item) => (
                        <SharedCard
                          key={item.id}
                          className={styles.actionPanel}
                          data-testid={`client-console-action-${item.id}`}
                          interactive
                        >
                          <div className={styles.stack}>
                            <strong>{item.title}</strong>
                            <p className={styles.stateText}>{item.detail}</p>
                            <div className={styles.inlineActions}>
                              <Link
                                className={`${styles.actionLink} ${
                                  item.tone === 'danger'
                                    ? styles.actionLinkPrimary
                                    : styles.actionLinkSecondary
                                }`}
                                href={item.href}
                              >
                                {item.cta}
                              </Link>
                            </div>
                          </div>
                        </SharedCard>
                      ))
                    )}
                  </SectionCard>

                  <SectionCard
                    className={styles.panel}
                    eyebrow={clientMessages.dashboard.eyebrow}
                    title={clientMessages.dashboard.pipelineTitle}
                  >
                    <FactGrid className={styles.summaryGrid}>
                      <FactItem
                        label={workspaceMessages.pipelineStats.publishedBriefs}
                        value={publishedBriefCount}
                      />
                      <FactItem
                        label={workspaceMessages.pipelineStats.applicationsToReview}
                        value={applicantBacklog}
                      />
                      <FactItem
                        label={clientMessages.summary.interviews}
                        value={interviewRows.length}
                      />
                      <FactItem
                        label={clientMessages.summary.offers}
                        value={activeOfferRows.length}
                      />
                      <FactItem
                        label={workspaceMessages.pipelineStats.activeContracts}
                        value={activeContracts.length}
                      />
                      <FactItem
                        label={clientMessages.summary.disputes}
                        value={disputeRows.length}
                      />
                    </FactGrid>
                    {analyticsOverview ? (
                      <FactGrid className={styles.summaryGrid}>
                        <FactItem
                          label="Search impressions"
                          value={analyticsOverview.summary.searchImpressions}
                        />
                        <FactItem
                          label="Result clicks"
                          value={analyticsOverview.summary.resultClicks}
                        />
                        <FactItem
                          label="Shortlists"
                          value={analyticsOverview.summary.shortlists}
                        />
                        <FactItem
                          label="Hires"
                          value={analyticsOverview.summary.hires}
                        />
                      </FactGrid>
                    ) : null}
                  </SectionCard>
                </RevealSection>

                <RevealSection className={styles.grid} delay={0.07}>
                  <SectionCard
                    className={styles.panel}
                    eyebrow={clientMessages.dashboard.eyebrow}
                    title={clientMessages.dashboard.contractsTitle}
                  >
                    {contractRows.length === 0 ? (
                      <p className={styles.stateText}>
                        {clientMessages.dashboard.noContracts}
                      </p>
                    ) : (
                      contractRows.slice(0, 5).map((row) => (
                        <SharedCard
                          key={row.job.id}
                          className={styles.actionPanel}
                          interactive
                        >
                          <div className={styles.stack}>
                            <strong>{row.job.title}</strong>
                            <p className={styles.stateText}>
                              {formatContractStatus(row.job)} •{' '}
                              {row.job.fundedAmount ?? 'unfunded'}
                            </p>
                            <p className={styles.stateText}>
                              {clientMessages.contracts.deliveredCount(
                                row.deliveredCount,
                              )}{' '}
                              •{' '}
                              {clientMessages.contracts.disputedCount(row.disputedCount)}
                            </p>
                            <div className={styles.inlineActions}>
                              <Link
                                className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                                href={row.href}
                              >
                                {clientMessages.actions.openContract}
                              </Link>
                              {row.roomHref ? (
                                <Link
                                  className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                                  href={row.roomHref}
                                >
                                  {clientMessages.actions.openRoom}
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </SharedCard>
                      ))
                    )}
                  </SectionCard>

                  <SectionCard
                    className={styles.panel}
                    eyebrow={clientMessages.dashboard.eyebrow}
                    title={clientMessages.dashboard.inboxTitle}
                  >
                    {notifications.length === 0 && digests.length === 0 ? (
                      <p className={styles.stateText}>
                        {clientMessages.dashboard.noInbox}
                      </p>
                    ) : (
                      <div className={styles.stack}>
                        {notifications.slice(0, 4).map((notification) => (
                          <SharedCard
                            key={notification.id}
                            className={styles.actionPanel}
                            interactive
                          >
                            <div className={styles.stack}>
                              <strong>{notification.title}</strong>
                              <p className={styles.stateText}>
                                {notification.status} •{' '}
                                {new Date(notification.updatedAt).toLocaleString()}
                              </p>
                              <p className={styles.stateText}>
                                {notification.detail}
                              </p>
                              {notification.messageActionPrompt ? (
                                <p className={styles.stateText}>
                                  {notification.messageActionPrompt}
                                </p>
                              ) : null}
                              {notification.messageThreadHref ? (
                                <div className={styles.inlineActions}>
                                  <Link
                                    className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                                    href={notification.messageThreadHref}
                                  >
                                    {notification.messageActionLabel ?? 'Open message thread'}
                                  </Link>
                                </div>
                              ) : null}
                            </div>
                          </SharedCard>
                        ))}
                        {digests.slice(0, 2).map((digest) => (
                          <SharedCard
                            key={digest.id}
                            className={styles.actionPanel}
                            interactive
                          >
                            <div className={styles.stack}>
                              <strong>{digest.title}</strong>
                              <p className={styles.stateText}>
                                {digest.status} • {digest.cadence}
                              </p>
                              <p className={styles.stateText}>{digest.summary}</p>
                            </div>
                          </SharedCard>
                        ))}
                        {digestRuns[0] ? (
                          <p className={styles.stateText}>
                            {clientMessages.dashboard.latestDigestRun(
                              digestRuns[0].dispatchedCount,
                            )}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </SectionCard>
                </RevealSection>
              </>
            ) : null}

            {section === 'opportunities' ? (
              <RevealSection className={styles.grid} delay={0.06}>
                <SectionCard
                  className={styles.panel}
                  eyebrow={clientMessages.opportunities.eyebrow}
                  title={clientMessages.opportunities.createTitle}
                >
                  <div className={styles.stack}>
                    <label className={styles.field}>
                      <span>{clientMessages.opportunities.form.title}</span>
                      <input
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
                      <span>{clientMessages.opportunities.form.summary}</span>
                      <textarea
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
                      <span>{clientMessages.opportunities.form.description}</span>
                      <textarea
                        value={opportunityDraft.description}
                        onChange={(event) =>
                          setOpportunityDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className={styles.summaryGrid}>
                      <label className={styles.field}>
                        <span>{clientMessages.opportunities.form.category}</span>
                        <input
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
                        <span>{clientMessages.opportunities.form.currencyAddress}</span>
                        <input
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
                        <span>{clientMessages.opportunities.form.visibility}</span>
                        <select
                          value={opportunityDraft.visibility}
                          onChange={(event) =>
                            setOpportunityDraft((current) => ({
                              ...current,
                              visibility: event.target.value as 'public' | 'private',
                            }))
                          }
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </select>
                      </label>
                    </div>
                    <div className={styles.summaryGrid}>
                      <label className={styles.field}>
                        <span>{clientMessages.opportunities.form.requiredSkills}</span>
                        <textarea
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
                        <span>{clientMessages.opportunities.form.mustHaveSkills}</span>
                        <textarea
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
                        <span>{clientMessages.opportunities.form.outcomes}</span>
                        <textarea
                          value={opportunityDraft.outcomes}
                          onChange={(event) =>
                            setOpportunityDraft((current) => ({
                              ...current,
                              outcomes: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <div className={styles.summaryGrid}>
                      <label className={styles.field}>
                        <span>
                          {clientMessages.opportunities.form.acceptanceCriteria}
                        </span>
                        <textarea
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
                        <span>
                          {clientMessages.opportunities.form.screeningQuestions}
                        </span>
                        <textarea
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
                        <span>{clientMessages.opportunities.form.timeline}</span>
                        <input
                          value={opportunityDraft.timeline}
                          onChange={(event) =>
                            setOpportunityDraft((current) => ({
                              ...current,
                              timeline: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <div className={styles.summaryGrid}>
                      <label className={styles.field}>
                        <span>{clientMessages.opportunities.form.budgetMin}</span>
                        <input
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
                        <span>{clientMessages.opportunities.form.budgetMax}</span>
                        <input
                          value={opportunityDraft.budgetMax}
                          onChange={(event) =>
                            setOpportunityDraft((current) => ({
                              ...current,
                              budgetMax: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>
                          {clientMessages.opportunities.form.desiredStartAt}
                        </span>
                        <input
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
                    </div>
                    <div className={styles.inlineActions}>
                      <button
                        type="button"
                        disabled={!canCreateOpportunity}
                        onClick={() => void handleCreateOpportunity()}
                      >
                        {clientMessages.opportunities.form.create}
                      </button>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  className={styles.panel}
                  eyebrow={clientMessages.opportunities.eyebrow}
                  title={clientMessages.opportunities.listTitle}
                >
                  {myOpportunities.length === 0 ? (
                    <p className={styles.stateText}>
                      {clientMessages.opportunities.empty}
                    </p>
                  ) : (
                    myOpportunities.map((opportunity) => (
                      <SharedCard
                        key={opportunity.id}
                        className={styles.actionPanel}
                        data-testid={`client-console-opportunity-${opportunity.id}`}
                        interactive
                      >
                        <div className={styles.stack}>
                          <strong>{opportunity.title}</strong>
                          <p className={styles.stateText}>
                            {marketplaceMessages.labels.opportunityStatus[
                              opportunity.status
                            ]}{' '}
                            • {formatBudget(opportunity)} •{' '}
                            {workspaceMessages.applicationsCount(
                              opportunity.applicationCount,
                            )}
                          </p>
                          <p className={styles.stateText}>{opportunity.summary}</p>
                          <div className={styles.inlineActions}>
                            <Link
                              className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                              href={`/marketplace/opportunities/${opportunity.id}`}
                            >
                              {clientMessages.actions.viewBrief}
                            </Link>
                            <Link
                              className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                              href="/app/marketplace/client/applicants"
                            >
                              {clientMessages.actions.openApplicants}
                            </Link>
                            {opportunity.hiredJobId ? (
                              <Link
                                className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                                href={`/app/contracts/${opportunity.hiredJobId}`}
                              >
                                {clientMessages.actions.openContract}
                              </Link>
                            ) : null}
                            {opportunity.status === 'draft' ||
                            opportunity.status === 'paused' ? (
                              <button
                                type="button"
                                disabled={!canCreateOpportunity}
                                onClick={() =>
                                  void handlePublishOpportunity(opportunity.id)
                                }
                              >
                                {clientMessages.actions.publish}
                              </button>
                            ) : null}
                            {opportunity.status === 'published' ? (
                              <button
                                type="button"
                                disabled={!canCreateOpportunity}
                                onClick={() =>
                                  void handlePauseOpportunity(opportunity.id)
                                }
                              >
                                {clientMessages.actions.pause}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </SharedCard>
                    ))
                  )}
                </SectionCard>
              </RevealSection>
            ) : null}

            {section === 'applicants' ? (
              <RevealSection className={styles.grid} delay={0.06}>
                <SectionCard
                  className={styles.panel}
                  eyebrow={clientMessages.applicants.eyebrow}
                  title={clientMessages.applicants.title}
                >
                  {applicantRows.length === 0 ? (
                    <p className={styles.stateText}>
                      {clientMessages.applicants.empty}
                    </p>
                  ) : (
                    myOpportunities.map((opportunity) => {
                      const applications =
                        applicationsByOpportunity[opportunity.id] ?? [];
                      const comparisons =
                        comparisonsByOpportunity[opportunity.id] ?? [];
                      if (applications.length === 0) {
                        return null;
                      }

                      return (
                        <div key={opportunity.id} className={styles.stack}>
                          <strong>{opportunity.title}</strong>
                          {comparisons.length > 0 ? (
                            <p className={styles.stateText}>
                              {clientMessages.applicants.comparisonLoaded(
                                comparisons.length,
                              )}
                            </p>
                          ) : null}
                          {applications.map((application) => {
                            const timeline = applicationTimelines[application.id] ?? null;
                            const readyToHire =
                              application.dossier.matchSummary.missingRequirements
                                .length === 0 &&
                              (!timeline?.contractDraft ||
                                timeline.contractDraft.status === 'finalized');

                          return (
                            <SharedCard
                              key={application.id}
                              className={styles.actionPanel}
                              data-testid={`client-console-applicant-${application.id}`}
                              id={`application-${application.id}`}
                              interactive
                            >
                                <div className={styles.stack}>
                                  <strong>{application.applicant.displayName}</strong>
                                  <p className={styles.stateText}>
                                    {application.applicant.headline} •{' '}
                                    {workspaceMessages.fitScore(application.fitScore)}
                                  </p>
                                  <p className={styles.stateText}>
                                    {marketplaceMessages.labels.applicationStatus[
                                      application.status
                                    ]}{' '}
                                    •{' '}
                                    {
                                      marketplaceMessages.labels.recommendation[
                                        application.dossier.recommendation
                                      ]
                                    }
                                  </p>
                                  <p className={styles.stateText}>
                                    {clientMessages.applicants.missingRequirements}:{' '}
                                    {application.dossier.matchSummary.missingRequirements.join(
                                      ' • ',
                                    ) || workspaceMessages.none}
                                  </p>
                                  <p className={styles.stateText}>
                                    {clientMessages.applicants.whyShortlisted}:{' '}
                                    {application.dossier.whyShortlisted.join(' • ')}
                                  </p>
                                  <div className={styles.inlineActions}>
                                    <Link
                                      className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                                      href={`/marketplace/profiles/${application.applicant.profileSlug ?? ''}`}
                                    >
                                      {clientMessages.actions.viewProfile}
                                    </Link>
                                    {application.hiredJobId ? (
                                      <Link
                                        className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                                        href={`/app/contracts/${application.hiredJobId}`}
                                      >
                                        {clientMessages.actions.openContract}
                                      </Link>
                                    ) : null}
                                    <button
                                      type="button"
                                      disabled={!canReviewApplications}
                                      onClick={() =>
                                        void handleApplicationDecision(
                                          'shortlist',
                                          application.id,
                                        )
                                      }
                                    >
                                      {clientMessages.actions.shortlist}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!canReviewApplications}
                                      onClick={() =>
                                        void handleApplicationDecision(
                                          'reject',
                                          application.id,
                                        )
                                      }
                                    >
                                      {clientMessages.actions.reject}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!canReviewApplications || !readyToHire}
                                      onClick={() =>
                                        void handleApplicationDecision(
                                          'hire',
                                          application.id,
                                        )
                                      }
                                    >
                                      {clientMessages.actions.hire}
                                    </button>
                                  </div>
                                </div>
                              </SharedCard>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </SectionCard>
              </RevealSection>
            ) : null}

            {section === 'interviews' ? (
              <RevealSection className={styles.grid} delay={0.06}>
                <SectionCard
                  className={styles.panel}
                  eyebrow={clientMessages.interviews.eyebrow}
                  title={clientMessages.interviews.title}
                >
                  {interviewRows.length === 0 ? (
                    <p className={styles.stateText}>
                      {clientMessages.interviews.empty}
                    </p>
                  ) : (
                    interviewRows.map(({ timeline, summary }) => {
                      const hiringThread =
                        applicationHiringThreads[timeline.application.id] ?? null;

                      return (
                      <SharedCard
                        key={timeline.application.id}
                        className={styles.actionPanel}
                        id={`application-${timeline.application.id}`}
                        interactive
                      >
                        <div className={styles.stack}>
                          <strong>{timeline.application.applicant.displayName}</strong>
                          <p className={styles.stateText}>
                            {timeline.application.opportunity.title} •{' '}
                            {summary.hasUnreadForClient
                              ? clientMessages.interviews.awaitingReply
                              : clientMessages.interviews.active}
                          </p>
                          <p className={styles.stateText}>{summary.latest.body}</p>
                          {summary.latest.attachments.length > 0 ? (
                            <div>
                              {summary.latest.attachments.map((attachment, attachmentIndex) => (
                                <p
                                  key={`${attachment.id}-${attachmentIndex}`}
                                  className={styles.stateText}
                                  style={{ margin: '0.25rem 0' }}
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
                          <p className={styles.stateText}>
                            {new Date(summary.latest.createdAt).toLocaleString()}
                          </p>
                          <label className={styles.field}>
                            <span>{clientMessages.interviews.reply}</span>
                            <textarea
                              value={replyDrafts[timeline.application.id] ?? ''}
                              onChange={(event) =>
                                setReplyDrafts((current) => ({
                                  ...current,
                                  [timeline.application.id]: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <div className={styles.inlineActions}>
                            <button
                              type="button"
                              disabled={!canReviewApplications}
                              onClick={() =>
                                void handleSendInterviewReply(
                                  timeline.application.id,
                                )
                              }
                            >
                              {clientMessages.actions.sendReply}
                            </button>
                            <Link
                              className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                              href="/app/marketplace/client/applicants"
                            >
                              {clientMessages.actions.openApplicants}
                            </Link>
                          </div>
                          <span className={styles.metaLabel}>
                            {workspaceMessages.interviewTitle}
                          </span>
                          {renderHiringCommunicationThread(
                            hiringThread,
                            user?.id ?? null,
                            workspaceMessages.noInterviewMessages,
                          )}
                        </div>
                      </SharedCard>
                    )
                  })
                  )}
                </SectionCard>
              </RevealSection>
            ) : null}

            {section === 'offers' ? (
              <RevealSection className={styles.grid} delay={0.06}>
                <SectionCard
                  className={styles.panel}
                  eyebrow={clientMessages.offers.eyebrow}
                  title={clientMessages.offers.title}
                >
                  {offerRows.length === 0 ? (
                    <p className={styles.stateText}>{clientMessages.offers.empty}</p>
                  ) : (
                    offerRows.map(({ timeline, latestOffer, draft, hasActiveNegotiation }) => {
                      const offerDraft = getOfferDraft(timeline.application.id, latestOffer);
                      const hiringThread =
                        applicationHiringThreads[timeline.application.id] ?? null;

                      return (
                        <SharedCard
                          key={latestOffer.id}
                          className={styles.actionPanel}
                          id={`application-${timeline.application.id}`}
                          interactive
                        >
                          <div className={styles.stack}>
                            <strong>{timeline.application.applicant.displayName}</strong>
                            <p className={styles.stateText}>
                              {timeline.application.opportunity.title} •{' '}
                              {latestOffer.status}
                            </p>
                            <p className={styles.stateText}>
                              {clientMessages.offers.milestones(latestOffer.milestones.length)}
                            </p>
                            <p className={styles.stateText}>
                              {workspaceMessages.proposalTimeline}:{' '}
                              {timeline.offers.length}
                            </p>
                            <p className={styles.stateText}>
                              {clientMessages.offers.contractDraftStatus}:{' '}
                              {draft ? draft.status : clientMessages.offers.noDraft}
                            </p>
                            <div className={styles.stack}>
                              <span className={styles.metaLabel}>
                                {workspaceMessages.latestOffer}
                              </span>
                              {timeline.offers.map((offer) => {
                                const offerIsActive = hasActiveNegotiation
                                  && offer.id === latestOffer.id;
                                return (
                                  <div key={offer.id} className={styles.walletCard}>
                                    <p className={styles.stateText}>
                                      #{offer.revisionNumber} • {offer.status} •{' '}
                                      {new Date(offer.updatedAt).toLocaleString()}
                                    </p>
                                    <p className={styles.stateText}>
                                      {offer.message ?? offer.counterMessage ?? workspaceMessages.none}
                                    </p>
                                    <p className={styles.stateText}>
                                      {workspaceMessages.offerRate}:{' '}
                                      {offer.proposedRate || workspaceMessages.none}
                                    </p>
                                    <p className={styles.stateText}>
                                      {workspaceMessages.offerMilestones}:{' '}
                                      {offer.milestones
                                        .map((entry) => entry.title || 'Untitled milestone')
                                        .join(' • ') || workspaceMessages.none}
                                    </p>
                                    {offer.declineReason ? (
                                      <p className={styles.stateText}>
                                        {workspaceMessages.declineReason}:{' '}
                                        {offer.declineReason}
                                      </p>
                                    ) : null}
                                    {offerIsActive ? (
                                      <div className={styles.stack}>
                                        <label className={styles.field}>
                                          <span>{workspaceMessages.offerMessage}</span>
                                          <textarea
                                            rows={2}
                                            value={offerDraft.message}
                                            onChange={(event) =>
                                              updateOfferDraft(timeline.application.id, (current) => ({
                                                ...current,
                                                message: event.target.value,
                                              }))
                                            }
                                          />
                                        </label>
                                        <label className={styles.field}>
                                          <span>{workspaceMessages.offerRate}</span>
                                          <input
                                            value={offerDraft.proposedRate}
                                            onChange={(event) =>
                                              updateOfferDraft(
                                                timeline.application.id,
                                                (current) => ({
                                                  ...current,
                                                  proposedRate: event.target.value,
                                                }),
                                              )
                                            }
                                          />
                                        </label>
                                        <label className={styles.field}>
                                          <span>{workspaceMessages.offerMilestones}</span>
                                          <textarea
                                            rows={3}
                                            placeholder={workspaceMessages.offerMilestonePlaceholder}
                                            value={offerDraft.milestones}
                                            onChange={(event) =>
                                              updateOfferDraft(
                                                timeline.application.id,
                                                (current) => ({
                                                  ...current,
                                                  milestones: event.target.value,
                                                }),
                                              )
                                            }
                                          />
                                        </label>
                                        <label className={styles.field}>
                                          <span>{workspaceMessages.declineReason}</span>
                                          <input
                                            value={offerDraft.declineReason}
                                            onChange={(event) =>
                                              updateOfferDraft(
                                                timeline.application.id,
                                                (current) => ({
                                                  ...current,
                                                  declineReason: event.target.value,
                                                }),
                                              )
                                            }
                                          />
                                        </label>
                                        <div className={styles.inlineActions}>
                                          <button
                                            type="button"
                                            disabled={!canReviewApplications}
                                            onClick={() =>
                                              void handleRespondToOffer(
                                                timeline.application.id,
                                                offer.id,
                                                'accept',
                                              )
                                            }
                                          >
                                            {workspaceMessages.respondAccept}
                                          </button>
                                          <button
                                            type="button"
                                            disabled={!canReviewApplications}
                                            onClick={() =>
                                              void handleRespondToOffer(
                                                timeline.application.id,
                                                offer.id,
                                                'counter',
                                              )
                                            }
                                          >
                                            {workspaceMessages.respondCounter}
                                          </button>
                                          <button
                                            type="button"
                                            disabled={!canReviewApplications}
                                            onClick={() =>
                                              void handleRespondToOffer(
                                                timeline.application.id,
                                                offer.id,
                                                'decline',
                                              )
                                            }
                                          >
                                            {workspaceMessages.respondDecline}
                                          </button>
                                        </div>
                                      </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                        <span className={styles.metaLabel}>
                          {workspaceMessages.interviewTitle}
                        </span>
                        {renderHiringCommunicationThread(
                          hiringThread,
                          user?.id ?? null,
                          workspaceMessages.noInterviewMessages,
                        )}
                        <div className={styles.inlineActions}>
                          <Link
                            className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                            href="/app/marketplace/client/applicants"
                              >
                                {clientMessages.actions.openApplicants}
                              </Link>
                              {draft?.convertedJobId ? (
                                <Link
                                  className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                                  href={`/app/contracts/${draft.convertedJobId}`}
                                >
                                  {clientMessages.actions.openContract}
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </SharedCard>
                      );
                    })
                  )}
                </SectionCard>
              </RevealSection>
            ) : null}

            {section === 'contracts' ? (
              <RevealSection className={styles.grid} delay={0.06}>
                <SectionCard
                  className={styles.panel}
                  eyebrow={clientMessages.contracts.eyebrow}
                  title={clientMessages.contracts.title}
                >
                  {contractRows.length === 0 ? (
                    <p className={styles.stateText}>{clientMessages.contracts.empty}</p>
                  ) : (
                    contractRows.map((row) => (
                      <SharedCard key={row.job.id} className={styles.actionPanel} interactive>
                        <div className={styles.stack}>
                          <strong>{row.job.title}</strong>
                          <p className={styles.stateText}>
                            {formatContractStatus(row.job)} •{' '}
                            {row.job.contractorParticipation?.status ?? 'n/a'}
                          </p>
                          <p className={styles.stateText}>
                            {clientMessages.contracts.deliveredCount(
                              row.deliveredCount,
                            )}{' '}
                            • {clientMessages.contracts.releasedCount(row.releasedCount)}
                          </p>
                          <div className={styles.inlineActions}>
                            <Link
                              className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                              href={row.href}
                            >
                              {clientMessages.actions.openContract}
                            </Link>
                            {row.roomHref ? (
                              <Link
                                className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                                href={row.roomHref}
                              >
                                {clientMessages.actions.openRoom}
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </SharedCard>
                    ))
                  )}
                </SectionCard>
              </RevealSection>
            ) : null}

            {section === 'funding' ? (
              <RevealSection className={styles.grid} delay={0.06}>
                <SectionCard
                  className={styles.panel}
                  eyebrow={clientMessages.funding.eyebrow}
                  title={clientMessages.funding.title}
                >
                  {fundingRows.length === 0 ? (
                    <p className={styles.stateText}>{clientMessages.funding.empty}</p>
                  ) : (
                    fundingRows.map((row) => (
                      <SharedCard key={row.job.id} className={styles.actionPanel} interactive>
                        <div className={styles.stack}>
                          <strong>{row.job.title}</strong>
                          <p className={styles.stateText}>
                            {row.job.fundedAmount
                              ? clientMessages.funding.waitingJoin
                              : clientMessages.funding.waitingFunding}
                          </p>
                          <p className={styles.stateText}>
                            {row.job.contractorParticipation?.status === 'pending'
                              ? clientMessages.funding.pendingContractor
                              : clientMessages.funding.unfunded}
                          </p>
                          <div className={styles.inlineActions}>
                            <Link
                              className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                              href={row.href}
                            >
                              {clientMessages.actions.openContract}
                            </Link>
                          </div>
                        </div>
                      </SharedCard>
                    ))
                  )}
                </SectionCard>
              </RevealSection>
            ) : null}

            {section === 'disputes' ? (
              <RevealSection className={styles.grid} delay={0.06}>
                <SectionCard
                  className={styles.panel}
                  eyebrow={clientMessages.disputes.eyebrow}
                  title={clientMessages.disputes.title}
                >
                  {disputeRows.length === 0 ? (
                    <p className={styles.stateText}>{clientMessages.disputes.empty}</p>
                  ) : (
                    disputeRows.map((row) => (
                      <SharedCard key={row.job.id} className={styles.actionPanel} interactive>
                        <div className={styles.stack}>
                          <strong>{row.job.title}</strong>
                          <p className={styles.stateText}>
                            {clientMessages.contracts.disputedCount(row.disputedCount)}
                          </p>
                          <p className={styles.stateText}>
                            {clientMessages.disputes.evidenceCount(
                              row.job.milestones.reduce(
                                (count, milestone) =>
                                  count + (milestone.disputeEvidenceUrls?.length ?? 0),
                                0,
                              ),
                            )}
                          </p>
                          <div className={styles.inlineActions}>
                            <Link
                              className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                              href={row.href}
                            >
                              {clientMessages.actions.openContract}
                            </Link>
                          </div>
                        </div>
                      </SharedCard>
                    ))
                  )}
                </SectionCard>
              </RevealSection>
            ) : null}
          </>
        ) : null}
      </div>
    </ConsolePage>
  );
}
