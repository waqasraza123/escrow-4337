'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
} from '@escrow4334/frontend-core/spatial';
import styles from './page.styles';
import { LanguageSwitcher } from './language-switcher';
import { ThemeToggle } from './theme-toggle';
import { useWebI18n } from '../lib/i18n';
import {
  webApi,
  type JobView,
  type ProjectActivity,
  type ProjectRoom as ProjectRoomView,
  type ProjectSubmission,
  type SessionTokens,
} from '../lib/api';

const sessionStorageKey = 'escrow4337.web.session';

type ProjectRoomProps = {
  initialJobId: string;
};

type SubmissionDraft = {
  note: string;
  artifacts: string;
};

type ExecutionDraft = {
  revisionNote: string;
  approvalNote: string;
  disputeReason: string;
  disputeEvidence: string;
};

function readSession(): SessionTokens | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(sessionStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionTokens;
  } catch {
    return null;
  }
}

function createSubmissionDraft(): SubmissionDraft {
  return {
    note: '',
    artifacts: '',
  };
}

function createExecutionDraft(): ExecutionDraft {
  return {
    revisionNote: '',
    approvalNote: '',
    disputeReason: '',
    disputeEvidence: '',
  };
}

function formatDateTime(value: number | null | undefined) {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleString();
}

function splitLines(input: string) {
  return input
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseArtifactLines(input: string) {
  return splitLines(input).map((line) => {
    const [label, url, sha256, mimeType, byteSize] = line
      .split('|')
      .map((value) => value.trim());

    if (!label || !url || !sha256) {
      throw new Error(
        'Each artifact line must include label | url | sha256.',
      );
    }

    const parsedByteSize =
      byteSize && byteSize.length > 0 ? Number(byteSize) : null;

    return {
      label,
      url,
      sha256,
      mimeType: mimeType || null,
      byteSize:
        parsedByteSize !== null && Number.isFinite(parsedByteSize)
          ? parsedByteSize
          : null,
    };
  });
}

function getMilestoneStatusClassName(status: JobView['milestones'][number]['status']) {
  switch (status) {
    case 'released':
      return styles.milestoneReleased;
    case 'delivered':
      return styles.milestoneDelivered;
    case 'disputed':
      return styles.milestoneDisputed;
    case 'refunded':
      return styles.milestoneRefunded;
    case 'pending':
    default:
      return styles.milestonePending;
  }
}

function getSubmissionStatusTone(status: ProjectSubmission['status']) {
  switch (status) {
    case 'approved':
    case 'delivered':
      return styles.roleBadge;
    case 'revision_requested':
      return styles.lifecyclePending;
    case 'submitted':
    default:
      return styles.roleBadgeMuted;
  }
}

function buildProjectRoomPath(jobId: string) {
  return `/app/contracts/${jobId}/room`;
}

export function ProjectRoom(props: ProjectRoomProps) {
  const { initialJobId } = props;
  const { messages } = useWebI18n();
  const roomMessages = messages.projectRoom;

  const [tokens, setTokens] = useState<SessionTokens | null>(null);
  const [room, setRoom] = useState<ProjectRoomView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState(0);
  const [submissionDrafts, setSubmissionDrafts] = useState<
    Record<number, SubmissionDraft>
  >({});
  const [executionDrafts, setExecutionDrafts] = useState<
    Record<number, ExecutionDraft>
  >({});

  useEffect(() => {
    const session = readSession();
    setTokens(session);

    if (!session) {
      setLoading(false);
      return;
    }

    void loadRoom(session);
  }, [initialJobId]);

  useEffect(() => {
    if (!room) {
      return;
    }

    setSelectedMilestoneIndex((current) =>
      current < room.job.milestones.length ? current : 0,
    );
  }, [room]);

  async function loadRoom(session: SessionTokens) {
    setLoading(true);
    setError(null);

    try {
      const response = await webApi.getProjectRoom(
        initialJobId,
        session.accessToken,
      );
      setRoom(response.room);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : roomMessages.messages.loadFailed,
      );
    } finally {
      setLoading(false);
    }
  }

  function getSubmissionDraft(index: number) {
    return submissionDrafts[index] ?? createSubmissionDraft();
  }

  function getExecutionDraft(index: number) {
    return executionDrafts[index] ?? createExecutionDraft();
  }

  function updateSubmissionDraft(
    index: number,
    updater: (current: SubmissionDraft) => SubmissionDraft,
  ) {
    setSubmissionDrafts((current) => ({
      ...current,
      [index]: updater(current[index] ?? createSubmissionDraft()),
    }));
  }

  function updateExecutionDraft(
    index: number,
    updater: (current: ExecutionDraft) => ExecutionDraft,
  ) {
    setExecutionDrafts((current) => ({
      ...current,
      [index]: updater(current[index] ?? createExecutionDraft()),
    }));
  }

  const participantRoles = room?.participantRoles ?? [];
  const isClient = participantRoles.includes('client');
  const isWorker = participantRoles.includes('worker');
  const selectedMilestone = room?.job.milestones[selectedMilestoneIndex] ?? null;
  const selectedMilestoneNumber = selectedMilestoneIndex + 1;

  const selectedMilestoneSubmissions = useMemo(() => {
    if (!room) {
      return [];
    }

    return room.submissions
      .filter((submission) => submission.milestoneIndex === selectedMilestoneIndex)
      .sort((left, right) => right.createdAt - left.createdAt);
  }, [room, selectedMilestoneIndex]);

  const latestSubmission = selectedMilestoneSubmissions[0] ?? null;
  const submissionDraft = getSubmissionDraft(selectedMilestoneIndex);
  const executionDraft = getExecutionDraft(selectedMilestoneIndex);
  const canSubmitRevision =
    isWorker &&
    selectedMilestone?.status === 'pending' &&
    (!latestSubmission || latestSubmission.status === 'revision_requested');
  const canReviewLatest =
    isClient &&
    selectedMilestone?.status === 'pending' &&
    latestSubmission !== null &&
    (latestSubmission.status === 'submitted' ||
      latestSubmission.status === 'revision_requested');
  const canDeliverApproved =
    isClient &&
    selectedMilestone?.status === 'pending' &&
    latestSubmission?.status === 'approved';
  const canReleaseMilestone =
    isClient && selectedMilestone?.status === 'delivered';
  const canDisputeMilestone =
    isClient && selectedMilestone?.status === 'delivered';

  async function refreshRoom() {
    if (!tokens) {
      return;
    }

    await loadRoom(tokens);
  }

  async function handleSubmitMilestone() {
    if (!tokens || !selectedMilestone) {
      return;
    }

    try {
      const artifacts = parseArtifactLines(submissionDraft.artifacts);
      await webApi.submitProjectMilestone(
        initialJobId,
        selectedMilestoneIndex,
        {
          note: submissionDraft.note,
          artifacts,
        },
        tokens.accessToken,
      );
      updateSubmissionDraft(selectedMilestoneIndex, () => createSubmissionDraft());
      setNotice(roomMessages.messages.submissionPosted(selectedMilestoneNumber));
      await refreshRoom();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : roomMessages.messages.actionFailed,
      );
    }
  }

  async function handleRequestRevision(submissionId: string) {
    if (!tokens) {
      return;
    }

    try {
      await webApi.requestProjectRevision(
        initialJobId,
        submissionId,
        {
          note: executionDraft.revisionNote,
        },
        tokens.accessToken,
      );
      updateExecutionDraft(selectedMilestoneIndex, (current) => ({
        ...current,
        revisionNote: '',
      }));
      setNotice(roomMessages.messages.revisionRequested(selectedMilestoneNumber));
      await refreshRoom();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : roomMessages.messages.actionFailed,
      );
    }
  }

  async function handleApproveSubmission(submissionId: string) {
    if (!tokens) {
      return;
    }

    try {
      await webApi.approveProjectSubmission(
        initialJobId,
        submissionId,
        {
          note: executionDraft.approvalNote || null,
        },
        tokens.accessToken,
      );
      updateExecutionDraft(selectedMilestoneIndex, (current) => ({
        ...current,
        approvalNote: '',
      }));
      setNotice(roomMessages.messages.submissionApproved(selectedMilestoneNumber));
      await refreshRoom();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : roomMessages.messages.actionFailed,
      );
    }
  }

  async function handleDeliverSubmission(submissionId: string) {
    if (!tokens) {
      return;
    }

    try {
      await webApi.deliverProjectSubmission(
        initialJobId,
        submissionId,
        tokens.accessToken,
      );
      setNotice(roomMessages.messages.submissionDelivered(selectedMilestoneNumber));
      await refreshRoom();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : roomMessages.messages.actionFailed,
      );
    }
  }

  async function handleReleaseMilestone() {
    if (!tokens) {
      return;
    }

    try {
      await webApi.releaseMilestone(
        initialJobId,
        selectedMilestoneIndex,
        tokens.accessToken,
      );
      setNotice(roomMessages.messages.milestoneReleased(selectedMilestoneNumber));
      await refreshRoom();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : roomMessages.messages.actionFailed,
      );
    }
  }

  async function handleDisputeMilestone() {
    if (!tokens) {
      return;
    }

    try {
      await webApi.disputeMilestone(
        initialJobId,
        selectedMilestoneIndex,
        {
          reason: executionDraft.disputeReason,
          evidenceUrls: splitLines(executionDraft.disputeEvidence),
        },
        tokens.accessToken,
      );
      updateExecutionDraft(selectedMilestoneIndex, (current) => ({
        ...current,
        disputeReason: '',
        disputeEvidence: '',
      }));
      setNotice(roomMessages.messages.milestoneDisputed(selectedMilestoneNumber));
      await refreshRoom();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : roomMessages.messages.actionFailed,
      );
    }
  }

  async function handlePostMessage() {
    if (!tokens || !messageBody.trim()) {
      return;
    }

    try {
      await webApi.postProjectRoomMessage(
        initialJobId,
        {
          body: messageBody,
        },
        tokens.accessToken,
      );
      setMessageBody('');
      setNotice(roomMessages.messages.messagePosted);
      await refreshRoom();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : roomMessages.messages.actionFailed,
      );
    }
  }

  function formatRole(role: 'client' | 'worker') {
    return role === 'client'
      ? roomMessages.labels.clientRole
      : roomMessages.labels.workerRole;
  }

  function formatMilestoneStatus(status: JobView['milestones'][number]['status']) {
    return roomMessages.labels.milestoneStatus[status];
  }

  function formatSubmissionStatus(status: ProjectSubmission['status']) {
    return roomMessages.labels.submissionStatus[status];
  }

  function renderActivity(activity: ProjectActivity) {
    return (
      <article key={activity.id} className={styles.timelineCard}>
        <div className={styles.timelineHead}>
          <strong>{activity.summary}</strong>
          <span className={styles.stateText}>{formatDateTime(activity.createdAt)}</span>
        </div>
        <p className={styles.stateText}>
          {activity.source === 'room'
            ? `${formatRole(activity.actorRole)} • ${activity.actor.email}`
            : roomMessages.labels.systemActivity}
        </p>
        {activity.milestoneIndex !== null ? (
          <p className={styles.stateText}>
            {roomMessages.labels.milestoneReference(activity.milestoneIndex + 1)}
          </p>
        ) : null}
        {activity.detail ? <p className={styles.stateText}>{activity.detail}</p> : null}
      </article>
    );
  }

  return (
    <ConsolePage theme="web">
      <RevealSection>
        <PageTopBar
          eyebrow={roomMessages.topBarLabel}
          description={roomMessages.topBarMeta}
          className={styles.topBar}
          contentClassName={styles.topBarContent}
          actions={
            <>
              <Button asChild variant="secondary">
                <Link href={`/app/contracts/${initialJobId}`}>
                  {roomMessages.backToContract}
                </Link>
              </Button>
              <ThemeToggle
                className={styles.languageSwitcher}
                labelClassName={styles.languageSwitcherLabel}
                optionClassName={styles.languageSwitcherOption}
                optionActiveClassName={styles.languageSwitcherOptionActive}
              />
              <LanguageSwitcher
                className={styles.languageSwitcher}
                labelClassName={styles.languageSwitcherLabel}
                optionClassName={styles.languageSwitcherOption}
                optionActiveClassName={styles.languageSwitcherOptionActive}
              />
            </>
          }
        />
      </RevealSection>

      {notice ? (
        <RevealSection as="div" delay={0.04}>
          <SharedCard className="p-4">
            <StatusNotice message={notice} messageClassName={styles.stateText} />
          </SharedCard>
        </RevealSection>
      ) : null}

      {error ? (
        <RevealSection as="div" delay={0.04}>
          <SharedCard className="p-4">
            <StatusNotice message={error} messageClassName={styles.stateText} />
          </SharedCard>
        </RevealSection>
      ) : null}

      {loading ? (
        <MotionEmptyState>
          <EmptyStateCard
            className={styles.panel}
            title={roomMessages.loadingTitle}
            message=""
          />
        </MotionEmptyState>
      ) : null}

      {!loading && !tokens ? (
        <MotionEmptyState>
          <EmptyStateCard
            className={styles.panel}
            title={roomMessages.sessionRequiredTitle}
            message={roomMessages.sessionRequiredBody}
          >
            <Button asChild>
              <Link href="/app/sign-in">{messages.common.signIn}</Link>
            </Button>
          </EmptyStateCard>
        </MotionEmptyState>
      ) : null}

      {!loading && tokens && !room ? (
        <MotionEmptyState>
          <EmptyStateCard
            className={styles.panel}
            title={roomMessages.unavailableTitle}
            message={roomMessages.unavailableBody}
          />
        </MotionEmptyState>
      ) : null}

      {!loading && room ? (
        <>
          <RevealSection delay={0.08}>
            <SectionCard
              eyebrow={roomMessages.summaryEyebrow}
              title={roomMessages.summaryTitle}
              className={styles.panel}
              headerClassName={styles.panelHeader}
            >
              <FactGrid className={styles.summaryGrid}>
                <FactItem label={roomMessages.labels.contractStatus} value={room.job.status} />
                <FactItem
                  label={roomMessages.labels.fundedAmount}
                  value={room.job.fundedAmount || messages.common.notFunded}
                />
                <FactItem
                  label={roomMessages.labels.participantRoles}
                  value={participantRoles.map(formatRole).join(' • ') || messages.common.noneConfigured}
                />
                <FactItem
                  label={roomMessages.labels.clientWallet}
                  value={room.job.onchain.clientAddress}
                  dir="ltr"
                />
                <FactItem
                  label={roomMessages.labels.workerWallet}
                  value={room.job.onchain.workerAddress}
                  dir="ltr"
                />
                <FactItem
                  label={roomMessages.labels.roomPath}
                  value={buildProjectRoomPath(initialJobId)}
                  dir="ltr"
                />
              </FactGrid>
            </SectionCard>
          </RevealSection>

          <div className={styles.detailGrid}>
            <RevealSection delay={0.12}>
              <SectionCard
                eyebrow={roomMessages.milestonesEyebrow}
                title={roomMessages.milestonesTitle}
                className={styles.panel}
                headerClassName={styles.panelHeader}
              >
                <div className={styles.milestoneRail}>
                  {room.job.milestones.map((milestone, index) => (
                    <button
                      type="button"
                      key={`${room.job.id}-project-room-${index}`}
                      className={`${styles.milestoneTile} ${
                        index === selectedMilestoneIndex ? styles.milestoneTileActive : ''
                      }`}
                      onClick={() => setSelectedMilestoneIndex(index)}
                    >
                      <div className={styles.selectedMilestoneHeader}>
                        <strong>
                          {messages.common.milestoneNumber(index + 1, milestone.title)}
                        </strong>
                        <span
                          className={`${styles.milestoneBadge} ${getMilestoneStatusClassName(
                            milestone.status,
                          )}`}
                        >
                          {formatMilestoneStatus(milestone.status)}
                        </span>
                      </div>
                      <p className={styles.stateText}>{milestone.deliverable}</p>
                      <div className={styles.milestoneMetaRow}>
                        <small>{milestone.amount}</small>
                        <small>{formatDateTime(milestone.dueAt)}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </SectionCard>
            </RevealSection>

            <RevealSection delay={0.16}>
              <SectionCard
                eyebrow={roomMessages.executionEyebrow}
                title={
                  selectedMilestone
                    ? roomMessages.executionTitle(
                        selectedMilestoneNumber,
                        selectedMilestone.title,
                      )
                    : roomMessages.executionEmptyTitle
                }
                className={styles.panel}
                headerClassName={styles.panelHeader}
              >
                {selectedMilestone ? (
                  <div className={styles.stack}>
                    <SurfaceCard className={styles.walletCard}>
                      <div className={styles.selectedMilestoneHeader}>
                        <strong>{selectedMilestone.deliverable}</strong>
                        <span
                          className={`${styles.milestoneBadge} ${getMilestoneStatusClassName(
                            selectedMilestone.status,
                          )}`}
                        >
                          {formatMilestoneStatus(selectedMilestone.status)}
                        </span>
                      </div>
                      <p className={styles.stateText}>
                        {roomMessages.labels.milestoneAmount}: {selectedMilestone.amount}
                      </p>
                      <p className={styles.stateText}>
                        {roomMessages.labels.milestoneDue}: {formatDateTime(selectedMilestone.dueAt)}
                      </p>
                    </SurfaceCard>

                    {canSubmitRevision ? (
                      <SurfaceCard className={styles.actionPanel}>
                        <strong>{roomMessages.submitTitle}</strong>
                        <label className={styles.field}>
                          <span>{roomMessages.fields.deliveryNote}</span>
                          <textarea
                            rows={5}
                            value={submissionDraft.note}
                            onChange={(event) =>
                              updateSubmissionDraft(selectedMilestoneIndex, (current) => ({
                                ...current,
                                note: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className={styles.field}>
                          <span>{roomMessages.fields.artifacts}</span>
                          <textarea
                            rows={5}
                            value={submissionDraft.artifacts}
                            placeholder={roomMessages.placeholders.artifacts}
                            onChange={(event) =>
                              updateSubmissionDraft(selectedMilestoneIndex, (current) => ({
                                ...current,
                                artifacts: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className={styles.inlineActions}>
                          <Button
                            type="button"
                            onClick={() => void handleSubmitMilestone()}
                            disabled={!submissionDraft.note.trim()}
                          >
                            {roomMessages.actions.submitMilestone}
                          </Button>
                        </div>
                      </SurfaceCard>
                    ) : null}

                    {latestSubmission ? (
                      <SurfaceCard className={styles.actionPanel}>
                        <div className={styles.selectedMilestoneHeader}>
                          <strong>{roomMessages.latestSubmissionTitle}</strong>
                          <span
                            className={`${styles.roleBadgeMuted} ${getSubmissionStatusTone(
                              latestSubmission.status,
                            )}`}
                          >
                            {formatSubmissionStatus(latestSubmission.status)}
                          </span>
                        </div>
                        <p className={styles.stateText}>
                          {roomMessages.labels.submittedBy}:{' '}
                          {latestSubmission.submittedBy.email}
                        </p>
                        <p className={styles.stateText}>
                          {roomMessages.labels.submittedAt}:{' '}
                          {formatDateTime(latestSubmission.createdAt)}
                        </p>
                        <p className={styles.stateText}>{latestSubmission.note}</p>
                        {latestSubmission.artifacts.length > 0 ? (
                          <div className={styles.linkList}>
                            {latestSubmission.artifacts.map((artifact) => (
                              <a
                                key={artifact.id}
                                className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                                href={artifact.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {`${artifact.label} • ${artifact.sha256.slice(0, 10)}...`}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className={styles.stateText}>{roomMessages.noArtifacts}</p>
                        )}
                        {latestSubmission.revisionRequest ? (
                          <article className={styles.statusBanner}>
                            <strong>{roomMessages.labels.revisionRequest}</strong>
                            <p className={styles.stateText}>
                              {latestSubmission.revisionRequest.note}
                            </p>
                            <p className={styles.stateText}>
                              {latestSubmission.revisionRequest.requestedByEmail} •{' '}
                              {formatDateTime(
                                latestSubmission.revisionRequest.requestedAt,
                              )}
                            </p>
                          </article>
                        ) : null}
                        {latestSubmission.approval ? (
                          <article className={styles.statusBanner}>
                            <strong>{roomMessages.labels.approval}</strong>
                            <p className={styles.stateText}>
                              {latestSubmission.approval.note || roomMessages.noApprovalNote}
                            </p>
                            <p className={styles.stateText}>
                              {latestSubmission.approval.approvedByEmail} •{' '}
                              {formatDateTime(latestSubmission.approval.approvedAt)}
                            </p>
                          </article>
                        ) : null}
                        {canReviewLatest ? (
                          <div className={styles.stack}>
                            <label className={styles.field}>
                              <span>{roomMessages.fields.revisionNote}</span>
                              <textarea
                                rows={3}
                                value={executionDraft.revisionNote}
                                onChange={(event) =>
                                  updateExecutionDraft(selectedMilestoneIndex, (current) => ({
                                    ...current,
                                    revisionNote: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label className={styles.field}>
                              <span>{roomMessages.fields.approvalNote}</span>
                              <textarea
                                rows={3}
                                value={executionDraft.approvalNote}
                                onChange={(event) =>
                                  updateExecutionDraft(selectedMilestoneIndex, (current) => ({
                                    ...current,
                                    approvalNote: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <div className={styles.inlineActions}>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => void handleRequestRevision(latestSubmission.id)}
                                disabled={!executionDraft.revisionNote.trim()}
                              >
                                {roomMessages.actions.requestRevision}
                              </Button>
                              <Button
                                type="button"
                                onClick={() => void handleApproveSubmission(latestSubmission.id)}
                              >
                                {roomMessages.actions.approveSubmission}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                        {canDeliverApproved ? (
                          <div className={styles.inlineActions}>
                            <Button
                              type="button"
                              onClick={() => void handleDeliverSubmission(latestSubmission.id)}
                            >
                              {roomMessages.actions.deliverApprovedSubmission}
                            </Button>
                          </div>
                        ) : null}
                      </SurfaceCard>
                    ) : (
                      <SurfaceCard className={styles.actionPanel}>
                        <p className={styles.stateText}>{roomMessages.noSubmissions}</p>
                      </SurfaceCard>
                    )}

                    {(canReleaseMilestone || canDisputeMilestone) && selectedMilestone ? (
                      <SurfaceCard className={styles.actionPanel}>
                        <strong>{roomMessages.executionActionsTitle}</strong>
                        {canReleaseMilestone ? (
                          <div className={styles.inlineActions}>
                            <Button type="button" onClick={() => void handleReleaseMilestone()}>
                              {roomMessages.actions.releaseMilestone}
                            </Button>
                          </div>
                        ) : null}
                        {canDisputeMilestone ? (
                          <div className={styles.stack}>
                            <label className={styles.field}>
                              <span>{roomMessages.fields.disputeReason}</span>
                              <textarea
                                rows={3}
                                value={executionDraft.disputeReason}
                                onChange={(event) =>
                                  updateExecutionDraft(selectedMilestoneIndex, (current) => ({
                                    ...current,
                                    disputeReason: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label className={styles.field}>
                              <span>{roomMessages.fields.disputeEvidence}</span>
                              <textarea
                                rows={3}
                                value={executionDraft.disputeEvidence}
                                placeholder={roomMessages.placeholders.disputeEvidence}
                                onChange={(event) =>
                                  updateExecutionDraft(selectedMilestoneIndex, (current) => ({
                                    ...current,
                                    disputeEvidence: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <div className={styles.inlineActions}>
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={!executionDraft.disputeReason.trim()}
                                onClick={() => void handleDisputeMilestone()}
                              >
                                {roomMessages.actions.openDispute}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </SurfaceCard>
                    ) : null}
                  </div>
                ) : (
                  <p className={styles.stateText}>{roomMessages.executionEmptyBody}</p>
                )}
              </SectionCard>
            </RevealSection>
          </div>

          <div className={styles.grid}>
            <RevealSection delay={0.2}>
              <SectionCard
                eyebrow={roomMessages.collaborationEyebrow}
                title={roomMessages.collaborationTitle}
                className={styles.panel}
                headerClassName={styles.panelHeader}
              >
                <div className={styles.stack}>
                  <label className={styles.field}>
                    <span>{roomMessages.fields.message}</span>
                    <textarea
                      rows={4}
                      value={messageBody}
                      placeholder={roomMessages.placeholders.message}
                      onChange={(event) => setMessageBody(event.target.value)}
                    />
                  </label>
                  <div className={styles.inlineActions}>
                    <Button
                      type="button"
                      onClick={() => void handlePostMessage()}
                      disabled={!messageBody.trim()}
                    >
                      {roomMessages.actions.sendMessage}
                    </Button>
                  </div>
                  {room.messages.length > 0 ? (
                    room.messages
                      .slice()
                      .sort((left, right) => right.createdAt - left.createdAt)
                      .map((message) => (
                        <article key={message.id} className={styles.timelineCard}>
                          <div className={styles.timelineHead}>
                            <strong>
                              {formatRole(message.senderRole)} • {message.sender.email}
                            </strong>
                            <span className={styles.stateText}>
                              {formatDateTime(message.createdAt)}
                            </span>
                          </div>
                          <p className={styles.stateText}>{message.body}</p>
                        </article>
                      ))
                  ) : (
                    <p className={styles.stateText}>{roomMessages.noMessages}</p>
                  )}
                </div>
              </SectionCard>
            </RevealSection>

            <RevealSection delay={0.24}>
              <SectionCard
                eyebrow={roomMessages.activityEyebrow}
                title={roomMessages.activityTitle}
                className={styles.panel}
                headerClassName={styles.panelHeader}
              >
                <div className={styles.stack}>
                  {room.activity.length > 0 ? (
                    room.activity
                      .slice()
                      .sort((left, right) => right.createdAt - left.createdAt)
                      .map(renderActivity)
                  ) : (
                    <p className={styles.stateText}>{roomMessages.noActivity}</p>
                  )}
                </div>
              </SectionCard>
            </RevealSection>
          </div>
        </>
      ) : null}
    </ConsolePage>
  );
}
