'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
import { ThemeToggle } from '../theme-toggle';
import styles from '../page.styles';
import { useWebI18n } from '../../lib/i18n';
import {
  webApi,
  type JobView,
  type MarketplaceApplication,
  type MarketplaceApplicationTimeline,
  type MarketplaceContractDraft,
  type MarketplaceContractDraftStatus,
  type MarketplaceOffer,
  type MarketplaceOfferMilestoneDraft,
  type MarketplaceInterviewMessageKind,
  type SessionTokens,
  type UserProfile,
  type WorkspaceSummary,
} from '../../lib/api';
import {
  buildProjectRoomHref,
  fromDateInput,
  getWorkspaceLane,
  readMarketplaceSession,
  splitList,
  writeMarketplaceSession,
} from './shared';

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

type FreelancerOfferRow = {
  application: MarketplaceApplication;
  timeline: MarketplaceApplicationTimeline;
  latestOffer: MarketplaceOffer;
  hasActiveNegotiation: boolean;
};

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

function isActiveOfferStatus(status: MarketplaceOffer['status']) {
  return status === 'sent' || status === 'countered';
}

function formatContractDraftStatus(
  status: MarketplaceContractDraftStatus,
  workspaceMessages: ReturnType<typeof useWebI18n>['messages']['publicMarketplace']['workspace'],
) {
  return workspaceMessages.contractDraft.statusValue[status];
}

export function FreelancerConsole() {
  const { messages } = useWebI18n();
  const marketplaceMessages = messages.publicMarketplace;
  const workspaceMessages = marketplaceMessages.workspace;

  const [tokens, setTokens] = useState<SessionTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [myApplications, setMyApplications] = useState<MarketplaceApplication[]>([]);
  const [applicationTimelines, setApplicationTimelines] = useState<
    Record<string, MarketplaceApplicationTimeline>
  >({});
  const [offerDrafts, setOfferDrafts] = useState<Record<string, OfferDraft>>({});
  const [contractDraftEdits, setContractDraftEdits] = useState<
    Record<string, ContractDraftEdit>
  >({});
  const [interviewMessageDrafts, setInterviewMessageDrafts] = useState<
    Record<string, string>
  >({});
  const [contracts, setContracts] = useState<JobView[]>([]);

  const activeWorkspace = user?.activeWorkspace ?? null;
  const activeLane = activeWorkspace ? getWorkspaceLane(activeWorkspace) : null;

  const freelancerWorkspace =
    user?.workspaces.find(
      (workspace) =>
        getWorkspaceLane(workspace) === 'freelancer' &&
        workspace.capabilities.applyToOpportunity,
    ) ?? null;

  const offerRows: FreelancerOfferRow[] = Object.values(applicationTimelines)
    .map((timeline) => {
      const latestOffer = timeline.offers[timeline.offers.length - 1] ?? null;
      if (!latestOffer) {
        return null;
      }

      return {
        application: timeline.application,
        timeline,
        latestOffer,
        hasActiveNegotiation: isActiveOfferStatus(latestOffer.status),
      } satisfies FreelancerOfferRow;
    })
    .filter(Boolean);

  function syncContractDraftIntoTimeline(applicationId: string, draft: MarketplaceContractDraft) {
    setApplicationTimelines((current) => {
      const timeline = current[applicationId];
      if (!timeline) {
        return current;
      }

      return {
        ...current,
        [applicationId]: {
          ...timeline,
          contractDraft: draft,
        },
      };
    });
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

  function getOfferDraft(applicationId: string, offer: MarketplaceOffer) {
    const draft = offerDrafts[applicationId];
    if (draft) {
      return draft;
    }
    return {
      ...createEmptyOfferDraft(),
      message: offer.message ?? offer.counterMessage ?? '',
      proposedRate: offer.proposedRate ?? '',
      milestones: serializeOfferMilestones(offer.milestones),
      declineReason: offer.declineReason ?? '',
    };
  }

  function getInterviewMessageDraft(applicationId: string) {
    return interviewMessageDrafts[applicationId] ?? '';
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
  }

  async function handlePostInterviewMessage(
    applicationId: string,
    kind: MarketplaceInterviewMessageKind = 'interview',
  ) {
    if (!tokens) {
      return;
    }

    const messageBody = getInterviewMessageDraft(applicationId).trim();
    if (!messageBody) {
      return;
    }

    await webApi.postMarketplaceApplicationInterviewMessage(
      applicationId,
      {
        kind,
        body: messageBody,
      },
      tokens.accessToken,
    );
    setInterviewMessageDrafts((current) => ({
      ...current,
      [applicationId]: '',
    }));
    setMessage(workspaceMessages.interviewMessageSent);
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
    await handleLoadApplicationTimeline(applicationId);
  }

  async function handleApproveContractDraft(
    application: MarketplaceApplication,
    draft: MarketplaceContractDraft,
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
    syncContractDraftIntoTimeline(application.id, response.draft);
    setMessage(workspaceMessages.messages.contractDraftApproved);
    await handleLoadApplicationTimeline(application.id);
  }

  async function handleReviseContractDraft(
    application: MarketplaceApplication,
    draft: MarketplaceContractDraft,
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
    syncContractDraftIntoTimeline(application.id, response.draft);
    setMessage(workspaceMessages.messages.contractDraftUpdated);
    await handleLoadApplicationTimeline(application.id);
  }

  async function handleLoadConsole(nextTokens: SessionTokens | null = tokens) {
    setLoading(true);
    setError('');

    try {
      const jobsResponse = await webApi.listJobs();
      setContracts(jobsResponse.jobs.map((entry) => entry.job));

      if (!nextTokens) {
        setUser(null);
        setMyApplications([]);
        setApplicationTimelines({});
        setOfferDrafts({});
        setContractDraftEdits({});
        setInterviewMessageDrafts({});
        return;
      }

      const me = await webApi.me(nextTokens.accessToken);
      setUser(me);
      const nextWorkspace = me.activeWorkspace;

      if (!nextWorkspace || getWorkspaceLane(nextWorkspace) !== 'freelancer') {
        setMyApplications([]);
        setApplicationTimelines({});
        setOfferDrafts({});
        setContractDraftEdits({});
        setInterviewMessageDrafts({});
        return;
      }

      const applicationsResponse = await webApi.listMyMarketplaceApplications(
        nextTokens.accessToken,
      );
      setMyApplications(applicationsResponse.applications);

      const timelineEntries = await Promise.all(
        applicationsResponse.applications.map(async (application) => {
          try {
            const timelineResponse = await webApi.getMarketplaceApplicationTimeline(
              application.id,
              nextTokens.accessToken,
            );
            await webApi
              .markMarketplaceApplicationInterviewThreadRead(
                application.id,
                nextTokens.accessToken,
              )
              .catch(() => {});
            return [application.id, timelineResponse.timeline] as const;
          } catch {
            return null;
          }
        }),
      );

      const timelines: Record<string, MarketplaceApplicationTimeline> = {};
      timelineEntries.forEach((entry) => {
        if (entry) {
          const [applicationId, timeline] = entry;
          timelines[applicationId] = timeline;
        }
      });
      setApplicationTimelines(timelines);
    } catch (loadError) {
      setError(
        loadError instanceof Error && loadError.message.trim()
          ? loadError.message
          : workspaceMessages.messages.loadFailed,
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadContracts() {
    if (!tokens) {
      return;
    }

    const jobsResponse = await webApi.listJobs(tokens.accessToken);
    setContracts(jobsResponse.jobs.map((entry) => entry.job));
  }

  async function handleSignOut() {
    if (tokens) {
      await webApi.logout(tokens.refreshToken);
    }
    writeMarketplaceSession(null);
    setTokens(null);
    setMessage(workspaceMessages.messages.signedOut);
    await handleLoadConsole(null);
  }

  async function handleSelectWorkspace(workspaceId: string) {
    if (!tokens || activeWorkspace?.workspaceId === workspaceId) {
      return;
    }

    await webApi.selectWorkspace(workspaceId, tokens.accessToken);
    setMessage(workspaceMessages.messages.workspaceSwitched);
    await handleLoadConsole(tokens);
  }

  function renderContractDraftPanel(application: MarketplaceApplication, draft: MarketplaceContractDraft) {
    const edit = contractDraftEdits[draft.id] ?? createContractDraftEdit(draft);
    const clientApproved = draft.clientApprovedAt !== null;
    const applicantApproved = draft.applicantApprovedAt !== null;

    const actorApproved = applicantApproved;

    return (
      <div className={styles.stack}>
        <span className={styles.metaLabel}>{workspaceMessages.contractDraft.title}</span>
        <div className={styles.walletCard}>
          <strong>
            {workspaceMessages.contractDraft.statusLabel}:{' '}
            {formatContractDraftStatus(draft.status, workspaceMessages)}
          </strong>
          <p className={styles.stateText}>
            {workspaceMessages.contractDraft.metadataHash}:{' '}
            {draft.metadataHash}
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
                href={
                  application.contractPath ?? `/app/contracts/${draft.convertedJobId}`
                }
              >
                {workspaceMessages.viewContract}
              </Link>
              {buildProjectRoomHref(application.contractPath, draft.convertedJobId) ? (
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
              updateContractDraftEdit(draft, (current) => ({ ...current, title: event.target.value }))
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
            disabled={
              draft.status === 'converted' || draft.status === 'cancelled'
            }
            onClick={() => void handleReviseContractDraft(application, draft)}
          >
            {workspaceMessages.contractDraft.revise}
          </button>
          <button
            type="button"
            disabled={
              actorApproved || draft.status === 'converted' || draft.status === 'cancelled'
            }
            onClick={() => void handleApproveContractDraft(application, draft)}
          >
            {actorApproved
              ? workspaceMessages.contractDraft.approved
              : workspaceMessages.contractDraft.approve}
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const storedTokens = readMarketplaceSession();
    setTokens(storedTokens);
    void handleLoadConsole(storedTokens);
    void loadContracts();
  }, []);

  const activeWorkspaceSummary = activeWorkspace
    ? `${activeWorkspace.label} • ${workspaceMessages.activeWorkspace.modeLabel[
        activeLane ?? 'client'
      ]}`
    : workspaceMessages.topBarLabel;

  const activeOfferRows = offerRows.filter((entry) => entry.hasActiveNegotiation);

  const applicationWithTimelineCount = Object.values(applicationTimelines).length;

  return (
    <ConsolePage theme="web">
      <div className={styles.console}>
        <PageTopBar
          eyebrow={workspaceMessages.profileEyebrow}
          title={workspaceMessages.freelancerConsole}
          description={workspaceMessages.topBarMeta}
          actions={
            <>
              <Link
                className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                href="/app/marketplace"
              >
                {workspaceMessages.publicMarketplace}
              </Link>
              <Link
                className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                href="/app/new-contract"
              >
                {marketplaceMessages.directContractPath}
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
            title={workspaceMessages.loadingTitle}
            message={workspaceMessages.loadingBody}
            messageClassName={styles.stateText}
          />
        ) : null}

        {!loading && !tokens ? (
          <EmptyStateCard
            className={styles.panel}
            title={workspaceMessages.sessionRequiredTitle}
            message={workspaceMessages.sessionRequiredBody}
            messageClassName={styles.stateText}
          />
        ) : null}

        {!loading && tokens && activeLane !== 'freelancer' ? (
          <EmptyStateCard
            className={styles.panel}
            title={
              freelancerWorkspace
                ? workspaceMessages.workspace.switchRequiredTitle
                : workspaceMessages.workspace.unavailableTitle
            }
            message={
              freelancerWorkspace
                ? workspaceMessages.workspace.switchRequiredBody
                : workspaceMessages.workspace.unavailableBody
            }
            messageClassName={styles.stateText}
          >
            <div className={styles.inlineActions}>
              {freelancerWorkspace ? (
                <button
                  type="button"
                  onClick={() => void handleSelectWorkspace(freelancerWorkspace.workspaceId)}
                >
                  {workspaceMessages.activeWorkspace.switchWorkspace(
                    freelancerWorkspace.label,
                    workspaceMessages.activeWorkspace.modeLabel.freelancer,
                  )}
                </button>
              ) : (
                <Link
                  className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                  href="/app/marketplace"
                >
                  {workspaceMessages.freelancerConsole}
                </Link>
              )}
            </div>
          </EmptyStateCard>
        ) : null}

        {!loading && tokens && activeLane === 'freelancer' ? (
          <>
            <RevealSection className={styles.grid} delay={0.04}>
              <SectionCard
                className={styles.panel}
                eyebrow={workspaceMessages.workspace.workspaceSummary}
                title={activeWorkspaceSummary}
                description={workspaceMessages.workspace.switchWorkspace(
                  workspaceMessages.emptyStates.freelancerApplicationsReady,
                  'freelancer',
                )}
              >
                <FactGrid className={styles.summaryGrid}>
                  <FactItem
                    label={workspaceMessages.activeWorkspace.modeLabel.freelancer}
                    value={activeOfferRows.length}
                  />
                  <FactItem
                    label={workspaceMessages.latestOffer}
                    value={Object.values(applicationTimelines).filter(
                      (timeline) => timeline.offers.length > 0,
                    ).length}
                  />
                  <FactItem
                    label={workspaceMessages.pipelineStats.myActiveApplications}
                    value={myApplications.length}
                  />
                  <FactItem label="Contracts" value={contracts.length} />
                </FactGrid>
              </SectionCard>
            </RevealSection>

            <RevealSection className={styles.grid} delay={0.06}>
              <SectionCard
                className={styles.panel}
                eyebrow={workspaceMessages.profileEyebrow}
                title={workspaceMessages.activeNegotiations}
              >
                {activeOfferRows.length === 0 ? (
                  <p className={styles.stateText}>{workspaceMessages.noActiveOffers}</p>
                ) : (
                  activeOfferRows.map((entry) => {
                    const offerDraft = getOfferDraft(
                      entry.application.id,
                      entry.latestOffer,
                    );
                    const interviewMessages = entry.timeline.interviewThread?.messages ?? [];
                    return (
                      <SharedCard
                        key={entry.latestOffer.id}
                        className={styles.actionPanel}
                        interactive
                      >
                        <div className={styles.stack}>
                          <strong>{entry.application.opportunity.title}</strong>
                          <p className={styles.stateText}>
                            {workspaceMessages.status}:{' '}
                            {entry.latestOffer.status}
                          </p>
                          <p className={styles.stateText}>
                            {workspaceMessages.offerRate}:{' '}
                            {entry.latestOffer.proposedRate ?? workspaceMessages.none}
                          </p>
                          <p className={styles.stateText}>
                            {workspaceMessages.offerMilestones}:{' '}
                            {entry.latestOffer.milestones
                              .map((milestone) => milestone.title || 'Untitled milestone')
                              .join(' • ') || workspaceMessages.none}
                          </p>
                          <p className={styles.stateText}>
                            {workspaceMessages.offerMessage}:{' '}
                            {offerDraft.message || workspaceMessages.none}
                          </p>
                          <label className={styles.field}>
                            <span>{workspaceMessages.offerMessage}</span>
                            <textarea
                              rows={2}
                              value={offerDraft.message}
                              onChange={(event) =>
                                updateOfferDraft(entry.application.id, (current) => ({
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
                                updateOfferDraft(entry.application.id, (current) => ({
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
                              value={offerDraft.milestones}
                              onChange={(event) =>
                                updateOfferDraft(entry.application.id, (current) => ({
                                  ...current,
                                  milestones: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className={styles.field}>
                            <span>{workspaceMessages.declineReason}</span>
                            <input
                              value={offerDraft.declineReason}
                              onChange={(event) =>
                                updateOfferDraft(entry.application.id, (current) => ({
                                  ...current,
                                  declineReason: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <div className={styles.inlineActions}>
                            <button
                              type="button"
                              disabled={!entry.hasActiveNegotiation}
                              onClick={() =>
                                void handleRespondToOffer(
                                  entry.application.id,
                                  entry.latestOffer.id,
                                  'accept',
                                )
                              }
                            >
                              {workspaceMessages.respondAccept}
                            </button>
                            <button
                              type="button"
                              disabled={!entry.hasActiveNegotiation}
                              onClick={() =>
                                void handleRespondToOffer(
                                  entry.application.id,
                                  entry.latestOffer.id,
                                  'counter',
                                )
                              }
                            >
                              {workspaceMessages.respondCounter}
                            </button>
                            <button
                              type="button"
                              disabled={!entry.hasActiveNegotiation}
                              onClick={() =>
                                void handleRespondToOffer(
                                  entry.application.id,
                                  entry.latestOffer.id,
                                  'decline',
                                )
                              }
                            >
                              {workspaceMessages.respondDecline}
                            </button>
                          </div>
                          <span className={styles.metaLabel}>
                            {workspaceMessages.interviewTitle}
                          </span>
                          {interviewMessages.length === 0 ? (
                            <p className={styles.stateText}>
                              {workspaceMessages.noInterviewMessages}
                            </p>
                          ) : (
                            interviewMessages.map((message) => (
                              <div key={message.id} className={styles.walletCard}>
                                <strong>
                                  {message.senderUserId === user?.id
                                    ? 'You'
                                    : message.senderEmail || workspaceMessages.none}
                                </strong>
                                <p className={styles.stateText}>
                                  {message.kind} •{' '}
                                  {new Date(message.createdAt).toLocaleString()}
                                </p>
                                <p className={styles.stateText}>{message.body}</p>
                                {message.attachments.length > 0 ? (
                                  <div className={styles.stateText}>
                                    {message.attachments.map((attachment, attachmentIndex) => (
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
                              </div>
                            ))
                          )}
                          <label className={styles.field}>
                            <span>{workspaceMessages.messageBody}</span>
                            <textarea
                              rows={3}
                              value={getInterviewMessageDraft(entry.application.id)}
                              onChange={(event) =>
                                setInterviewMessageDrafts((current) => ({
                                  ...current,
                                  [entry.application.id]: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <div className={styles.inlineActions}>
                            <button
                              type="button"
                              disabled={!getInterviewMessageDraft(entry.application.id).trim()}
                              onClick={() =>
                                void handlePostInterviewMessage(entry.application.id, 'interview')
                              }
                            >
                              {workspaceMessages.sendClarification}
                            </button>
                          </div>
                          {entry.timeline.contractDraft ? (
                            renderContractDraftPanel(
                              entry.application,
                              entry.timeline.contractDraft,
                            )
                          ) : null}
                        </div>
                      </SharedCard>
                    );
                  })
                )}
              </SectionCard>
            </RevealSection>

            <RevealSection className={styles.grid} delay={0.08}>
              <SectionCard
                className={styles.panel}
                eyebrow={workspaceMessages.myApplicationsTitle}
                title={workspaceMessages.myApplicationsTitle}
              >
                {myApplications.length === 0 ? (
                  <p className={styles.stateText}>
                    {workspaceMessages.emptyStates.freelancerApplicationsReady}
                  </p>
                ) : (
                  myApplications.map((application) => {
                    const timeline = applicationTimelines[application.id];
                    const hasTimeline = Boolean(timeline);
                    return (
                      <SharedCard key={application.id} className={styles.actionPanel}>
                        <div className={styles.stack}>
                          <strong>{application.opportunity.title}</strong>
                          <p className={styles.stateText}>
                            {application.status} • {fromDateInput('') as unknown as string}
                          </p>
                          <p className={styles.stateText}>
                            {timeline ? (
                              <>
                                {timeline.offers.length} offer
                                {timeline.offers.length === 1 ? '' : 's'}
                              </>
                            ) : null}
                          </p>
                          {application.contractPath ? (
                            <div className={styles.inlineActions}>
                              <Link
                                className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                                href={application.contractPath}
                              >
                                {workspaceMessages.viewContract}
                              </Link>
                              {buildProjectRoomHref(application.contractPath, null) ? null : null}
                            </div>
                          ) : null}
                          {!hasTimeline ? (
                            <button
                              type="button"
                              onClick={() => void handleLoadApplicationTimeline(application.id)}
                            >
                              {workspaceMessages.loadTimeline}
                            </button>
                          ) : null}
                        </div>
                      </SharedCard>
                    );
                  })
                )}
                <p className={styles.stateText}>
                  {workspaceMessages.noApplications}
                </p>
              </SectionCard>
            </RevealSection>
          </>
        ) : null}
      </div>
    </ConsolePage>
  );
}
