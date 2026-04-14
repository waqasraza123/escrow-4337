'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '../page.module.css';
import {
  adminApi,
  type MarketplaceAbuseReport,
  type MarketplaceAbuseReportClaimState,
  type MarketplaceAbuseReportEvidenceReviewStatus,
  type MarketplaceAbuseReportQueuePriority,
  type MarketplaceAbuseReportSortBy,
  type MarketplaceAbuseReportStatus,
  type MarketplaceAdminOpportunity,
  type MarketplaceAdminProfile,
  type MarketplaceModerationDashboard,
  type MarketplaceModerationStatus,
  type SessionTokens,
  type UserProfile,
} from '../../lib/api';

const sessionStorageKey = 'escrow4337.admin.session';
const evidenceReviewLabels: Record<
  MarketplaceAbuseReportEvidenceReviewStatus,
  string
> = {
  pending: 'Pending review',
  supports_report: 'Supports report',
  insufficient_evidence: 'Insufficient evidence',
  contradicts_report: 'Contradicts report',
};
const queuePriorityLabels: Record<MarketplaceAbuseReportQueuePriority, string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
  closed: 'Closed',
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

function writeSession(tokens: SessionTokens | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!tokens) {
    window.localStorage.removeItem(sessionStorageKey);
    return;
  }

  window.localStorage.setItem(sessionStorageKey, JSON.stringify(tokens));
}

export function MarketplaceModerationConsole() {
  const [tokens, setTokens] = useState<SessionTokens | null>(null);
  const [operator, setOperator] = useState<UserProfile | null>(null);
  const [dashboard, setDashboard] = useState<MarketplaceModerationDashboard | null>(
    null,
  );
  const [profiles, setProfiles] = useState<MarketplaceAdminProfile[]>([]);
  const [opportunities, setOpportunities] = useState<MarketplaceAdminOpportunity[]>(
    [],
  );
  const [reports, setReports] = useState<MarketplaceAbuseReport[]>([]);
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});
  const [reportEscalationReasons, setReportEscalationReasons] = useState<
    Record<string, string>
  >({});
  const [reportInvestigationSummaries, setReportInvestigationSummaries] =
    useState<Record<string, string>>({});
  const [reportEvidenceReviews, setReportEvidenceReviews] = useState<
    Record<string, MarketplaceAbuseReportEvidenceReviewStatus>
  >({});
  const [reportFilters, setReportFilters] = useState<{
    status?: MarketplaceAbuseReportStatus;
    subjectType?: 'profile' | 'opportunity';
    claimState?: MarketplaceAbuseReportClaimState;
    sortBy?: MarketplaceAbuseReportSortBy;
    escalated?: boolean;
    evidenceReviewStatus?: MarketplaceAbuseReportEvidenceReviewStatus;
  }>({
    sortBy: 'priority',
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load(
    nextTokens: SessionTokens | null = tokens,
    nextReportFilters = reportFilters,
  ) {
    setError(null);

    if (!nextTokens) {
      setOperator(null);
      setDashboard(null);
      setProfiles([]);
      setOpportunities([]);
      setReports([]);
      return;
    }

    try {
      const [
        me,
        dashboardResponse,
        profilesResponse,
        opportunitiesResponse,
        reportsResponse,
      ] =
        await Promise.all([
          adminApi.me(nextTokens.accessToken),
          adminApi.getMarketplaceModerationDashboard(nextTokens.accessToken),
          adminApi.listMarketplaceModerationProfiles(nextTokens.accessToken),
          adminApi.listMarketplaceModerationOpportunities(nextTokens.accessToken),
          adminApi.listMarketplaceModerationReports(
            { ...nextReportFilters, limit: 50 },
            nextTokens.accessToken,
          ),
        ]);

      setOperator(me);
      setDashboard(dashboardResponse);
      setProfiles(profilesResponse.profiles);
      setOpportunities(opportunitiesResponse.opportunities);
      setReports(reportsResponse.reports);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load moderation');
    }
  }

  useEffect(() => {
    const stored = readSession();
    setTokens(stored);
  }, []);

  useEffect(() => {
    void load(tokens, reportFilters);
  }, [tokens, reportFilters]);

  async function handleSignOut() {
    if (tokens) {
      await adminApi.logout(tokens.refreshToken);
    }
    writeSession(null);
    setTokens(null);
    setMessage('Operator session cleared.');
    await load(null);
  }

  async function handleModerateProfile(
    userId: string,
    moderationStatus: MarketplaceModerationStatus,
  ) {
    if (!tokens) {
      return;
    }

    await adminApi.moderateMarketplaceProfile(
      userId,
      moderationStatus,
      tokens.accessToken,
    );
    setMessage(`Profile moderation updated to ${moderationStatus}.`);
    await load(tokens);
  }

  async function handleModerateOpportunity(
    opportunityId: string,
    moderationStatus: MarketplaceModerationStatus,
  ) {
    if (!tokens) {
      return;
    }

    await adminApi.moderateMarketplaceOpportunity(
      opportunityId,
      moderationStatus,
      tokens.accessToken,
    );
    setMessage(`Opportunity moderation updated to ${moderationStatus}.`);
    await load(tokens);
  }

  async function handleUpdateReport(
    report: MarketplaceAbuseReport,
    status: MarketplaceAbuseReportStatus,
    subjectModerationStatus?: MarketplaceModerationStatus | null,
  ) {
    if (!tokens) {
      return;
    }

    const resolutionNote = reportNotes[report.id]?.trim() || null;
    const investigationSummaryDraft = reportInvestigationSummaries[report.id];
    const investigationSummary =
      investigationSummaryDraft === undefined
        ? report.investigationSummary
        : investigationSummaryDraft.trim() || null;
    const escalationReasonDraft = reportEscalationReasons[report.id];
    const escalationReason =
      escalationReasonDraft === undefined
        ? report.escalationReason
        : escalationReasonDraft.trim() || null;
    const evidenceReviewStatus =
      reportEvidenceReviews[report.id] ?? report.evidenceReviewStatus;
    const isClaimedByOperator = report.claimedBy?.userId === operator?.id;

    if (
      !isClaimedByOperator &&
      (status !== report.status ||
        escalationReason !== report.escalationReason ||
        evidenceReviewStatus !== report.evidenceReviewStatus ||
        investigationSummary !== report.investigationSummary ||
        resolutionNote !== report.resolutionNote ||
        subjectModerationStatus !== undefined)
    ) {
      setError('Claim the abuse report before updating investigation state.');
      return;
    }

    if ((status === 'resolved' || status === 'dismissed') && !resolutionNote) {
      setError('Resolution note is required before closing a report.');
      return;
    }

    if (
      (status === 'resolved' || status === 'dismissed') &&
      evidenceReviewStatus === 'pending'
    ) {
      setError('Evidence review status is required before closing a report.');
      return;
    }

    if (
      (status === 'resolved' || status === 'dismissed') &&
      !investigationSummary
    ) {
      setError('Investigation summary is required before closing a report.');
      return;
    }

    if (
      (status === 'resolved' || status === 'dismissed') &&
      escalationReason
    ) {
      setError('Clear escalation before closing a report.');
      return;
    }

    setError(null);
    await adminApi.updateMarketplaceModerationReport(
      report.id,
      {
        status,
        escalationReason,
        evidenceReviewStatus,
        investigationSummary,
        resolutionNote,
        subjectModerationStatus,
      },
      tokens.accessToken,
    );
    setMessage(
      subjectModerationStatus
        ? `Abuse report updated to ${status} and subject set to ${subjectModerationStatus}.`
        : `Abuse report updated to ${status}.`,
    );
    await load(tokens);
  }

  async function handleClaimAction(
    report: MarketplaceAbuseReport,
    claimAction: 'claim' | 'release',
  ) {
    if (!tokens) {
      return;
    }

    setError(null);
    await adminApi.updateMarketplaceModerationReport(
      report.id,
      {
        status: report.status,
        claimAction,
      },
      tokens.accessToken,
    );
    setMessage(
      claimAction === 'claim'
        ? 'Abuse report claimed for investigation.'
        : 'Abuse report released back to the queue.',
    );
    await load(tokens);
  }

  async function handleEscalation(
    report: MarketplaceAbuseReport,
    escalationReason: string | null,
  ) {
    if (!tokens) {
      return;
    }

    if (report.claimedBy?.userId !== operator?.id) {
      setError('Claim the abuse report before changing escalation state.');
      return;
    }

    setError(null);
    await adminApi.updateMarketplaceModerationReport(
      report.id,
      {
        status: report.status,
        escalationReason,
      },
      tokens.accessToken,
    );
    setMessage(
      escalationReason
        ? 'Abuse report escalated for follow-up.'
        : 'Abuse report escalation cleared.',
    );
    await load(tokens);
  }

  return (
    <div className={styles.console}>
      <div className={styles.topBar}>
        <div className={styles.topBarContent}>
          <span className={styles.topBarLabel}>Marketplace moderation</span>
          <p className={styles.topBarMeta}>
            Hide, unhide, or suspend marketplace actors and briefs from the operator surface.
          </p>
        </div>
        <div className={styles.inlineActions}>
          <Link href="/">Operator home</Link>
          {tokens ? (
            <button type="button" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          ) : (
            <Link href="/">Restore session</Link>
          )}
        </div>
      </div>

      {message ? (
        <section className={styles.panel}>
          <p className={styles.stateText}>{message}</p>
        </section>
      ) : null}

      {error ? (
        <section className={styles.panel}>
          <p className={styles.stateText}>{error}</p>
        </section>
      ) : null}

      {!tokens ? (
        <section className={styles.panel}>
          <h2>Operator session required</h2>
          <p className={styles.stateText}>
            This page uses the existing operator session from the admin console.
          </p>
        </section>
      ) : null}

      {operator && dashboard ? (
        <>
          <section className={styles.summaryGrid}>
            <article>
              <span className={styles.metaLabel}>Operator</span>
              <strong>{operator.email}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Profiles</span>
              <strong>{dashboard.summary.totalProfiles}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Visible profiles</span>
              <strong>{dashboard.summary.visibleProfiles}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Suspended profiles</span>
              <strong>{dashboard.summary.suspendedProfiles}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Published briefs</span>
              <strong>{dashboard.summary.publishedOpportunities}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Hired briefs</span>
              <strong>{dashboard.summary.hiredOpportunities}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Applications</span>
              <strong>{dashboard.summary.totalApplications}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Hire conversion</span>
              <strong>{dashboard.summary.hireConversionPercent}%</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Aging no-hire briefs</span>
              <strong>{dashboard.summary.agingOpportunityCount}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Abuse reports</span>
              <strong>{dashboard.summary.totalAbuseReports}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Open reports</span>
              <strong>{dashboard.summary.openAbuseReports}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Reviewing reports</span>
              <strong>{dashboard.summary.reviewingAbuseReports}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Claimed reports</span>
              <strong>{dashboard.summary.claimedAbuseReports}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Unclaimed reports</span>
              <strong>{dashboard.summary.unclaimedAbuseReports}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Escalated reports</span>
              <strong>{dashboard.summary.escalatedAbuseReports}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Aging reports</span>
              <strong>{dashboard.summary.agingAbuseReports}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Stale reports</span>
              <strong>{dashboard.summary.staleAbuseReports}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Oldest active report</span>
              <strong>
                {dashboard.summary.oldestActiveAbuseReportHours === null
                  ? 'None'
                  : `${dashboard.summary.oldestActiveAbuseReportHours}h`}
              </strong>
            </article>
          </section>

          <section className={styles.grid}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Profiles</span>
                  <h2>Talent moderation</h2>
                </div>
              </div>
              <div className={styles.stack}>
                {profiles.map((profile) => (
                  <article key={profile.userId} className={styles.walletCard}>
                    <strong>{profile.displayName}</strong>
                    <p className={styles.stateText}>
                      {profile.slug} • {profile.moderationStatus} • {profile.completedEscrowCount} completed escrows
                    </p>
                    <div className={styles.inlineActions}>
                      <button
                        type="button"
                        onClick={() => void handleModerateProfile(profile.userId, 'visible')}
                      >
                        Visible
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleModerateProfile(profile.userId, 'hidden')}
                      >
                        Hidden
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleModerateProfile(profile.userId, 'suspended')
                        }
                      >
                        Suspend
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Briefs</span>
                  <h2>Opportunity moderation</h2>
                </div>
              </div>
              <div className={styles.stack}>
                {opportunities.map((opportunity) => (
                  <article key={opportunity.id} className={styles.walletCard}>
                    <strong>{opportunity.title}</strong>
                    <p className={styles.stateText}>
                      {opportunity.owner.displayName} • {opportunity.visibility} • {opportunity.status} • {opportunity.moderationStatus}
                    </p>
                    <div className={styles.inlineActions}>
                      <button
                        type="button"
                        onClick={() =>
                          void handleModerateOpportunity(opportunity.id, 'visible')
                        }
                      >
                        Visible
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleModerateOpportunity(opportunity.id, 'hidden')
                        }
                      >
                        Hidden
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleModerateOpportunity(opportunity.id, 'suspended')
                        }
                      >
                        Suspend
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </section>

          <section className={styles.grid}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Reports</span>
                  <h2>Abuse queue</h2>
                </div>
              </div>
              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  <span>Status filter</span>
                  <select
                    value={reportFilters.status ?? ''}
                    onChange={(event) =>
                      setReportFilters((current) => ({
                        ...current,
                        status:
                          event.target.value === ''
                            ? undefined
                            : (event.target.value as MarketplaceAbuseReportStatus),
                      }))
                    }
                  >
                    <option value="">All statuses</option>
                    <option value="open">Open</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Subject filter</span>
                  <select
                    value={reportFilters.subjectType ?? ''}
                    onChange={(event) =>
                      setReportFilters((current) => ({
                        ...current,
                        subjectType:
                          event.target.value === ''
                            ? undefined
                            : (event.target.value as 'profile' | 'opportunity'),
                      }))
                    }
                  >
                    <option value="">All subjects</option>
                    <option value="profile">Profiles</option>
                    <option value="opportunity">Opportunities</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Claim filter</span>
                  <select
                    value={reportFilters.claimState ?? ''}
                    onChange={(event) =>
                      setReportFilters((current) => ({
                        ...current,
                        claimState:
                          event.target.value === ''
                            ? undefined
                            : (event.target.value as MarketplaceAbuseReportClaimState),
                      }))
                    }
                  >
                    <option value="">All claims</option>
                    <option value="unclaimed">Unclaimed</option>
                    <option value="claimed">Claimed</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Escalation filter</span>
                  <select
                    value={
                      reportFilters.escalated === undefined
                        ? ''
                        : reportFilters.escalated
                          ? 'true'
                          : 'false'
                    }
                    onChange={(event) =>
                      setReportFilters((current) => ({
                        ...current,
                        escalated:
                          event.target.value === ''
                            ? undefined
                            : event.target.value === 'true',
                      }))
                    }
                  >
                    <option value="">All escalation states</option>
                    <option value="true">Escalated</option>
                    <option value="false">Not escalated</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Sort</span>
                  <select
                    value={reportFilters.sortBy ?? 'priority'}
                    onChange={(event) =>
                      setReportFilters((current) => ({
                        ...current,
                        sortBy: event.target.value as MarketplaceAbuseReportSortBy,
                      }))
                    }
                  >
                    <option value="priority">Priority</option>
                    <option value="oldest_open">Oldest open</option>
                    <option value="stale_activity">Stale activity</option>
                    <option value="recent_activity">Recent activity</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Evidence review filter</span>
                  <select
                    value={reportFilters.evidenceReviewStatus ?? ''}
                    onChange={(event) =>
                      setReportFilters((current) => ({
                        ...current,
                        evidenceReviewStatus:
                          event.target.value === ''
                            ? undefined
                            : (event.target
                                .value as MarketplaceAbuseReportEvidenceReviewStatus),
                      }))
                    }
                  >
                    <option value="">All evidence reviews</option>
                    <option value="pending">Pending review</option>
                    <option value="supports_report">Supports report</option>
                    <option value="insufficient_evidence">
                      Insufficient evidence
                    </option>
                    <option value="contradicts_report">Contradicts report</option>
                  </select>
                </label>
              </div>
              <div className={styles.stack}>
                {reports.length === 0 ? (
                  <p className={styles.stateText}>No abuse reports submitted yet.</p>
                ) : (
                  reports.map((report) => (
                    <article key={report.id} className={styles.timelineCard}>
                      <strong>{report.subject.label}</strong>
                      <p className={styles.stateText}>
                        {report.subject.type} • {report.reason} • {report.status} • reporter {report.reporter.email}
                      </p>
                      <p className={styles.stateText}>
                        {report.details ?? 'No details supplied.'}
                      </p>
                      <p className={styles.stateText}>
                        Priority {queuePriorityLabels[report.queuePriority]} • age{' '}
                        {report.ageHours}h • last update {report.hoursSinceUpdate}h ago
                      </p>
                      <p className={styles.stateText}>
                        {report.claimedBy
                          ? `Claimed by ${report.claimedBy.email}`
                          : 'Unclaimed'}
                      </p>
                      {report.escalationReason ? (
                        <p className={styles.stateText}>
                          Escalated: {report.escalationReason}
                          {report.escalatedBy
                            ? ` by ${report.escalatedBy.email}`
                            : ''}
                        </p>
                      ) : null}
                      <p className={styles.stateText}>
                        Evidence review: {evidenceReviewLabels[report.evidenceReviewStatus]}
                        {report.evidenceReviewedBy
                          ? ` by ${report.evidenceReviewedBy.email}`
                          : ''}
                      </p>
                      {report.investigationSummary ? (
                        <p className={styles.stateText}>
                          Investigation: {report.investigationSummary}
                        </p>
                      ) : null}
                      {report.subjectModerationStatus ? (
                        <p className={styles.stateText}>
                          Subject action: {report.subjectModerationStatus}
                          {report.subjectModeratedBy
                            ? ` by ${report.subjectModeratedBy.email}`
                            : ''}
                        </p>
                      ) : null}
                      {report.evidenceUrls.length > 0 ? (
                        <div className={styles.stack}>
                          {report.evidenceUrls.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer">
                              {url}
                            </a>
                          ))}
                        </div>
                      ) : null}
                      <div className={styles.inlineActions}>
                        {report.claimedBy?.userId === operator?.id ? (
                          <button
                            type="button"
                            onClick={() => void handleClaimAction(report, 'release')}
                          >
                            Release claim
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={Boolean(report.claimedBy)}
                            onClick={() => void handleClaimAction(report, 'claim')}
                          >
                            Claim report
                          </button>
                        )}
                      </div>
                      <label className={styles.field}>
                        <span>Escalation note</span>
                        <textarea
                          value={
                            reportEscalationReasons[report.id] ??
                            report.escalationReason ??
                            ''
                          }
                          onChange={(event) =>
                            setReportEscalationReasons((current) => ({
                              ...current,
                              [report.id]: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className={styles.inlineActions}>
                        <button
                          type="button"
                          disabled={report.claimedBy?.userId !== operator?.id}
                          onClick={() =>
                            void handleEscalation(
                              report,
                              (reportEscalationReasons[report.id]?.trim() ||
                                report.escalationReason ||
                                null),
                            )
                          }
                        >
                          Escalate
                        </button>
                        <button
                          type="button"
                          disabled={
                            report.claimedBy?.userId !== operator?.id ||
                            report.escalationReason === null
                          }
                          onClick={() => void handleEscalation(report, null)}
                        >
                          Clear escalation
                        </button>
                      </div>
                      <label className={styles.field}>
                        <span>Evidence review</span>
                        <select
                          value={
                            reportEvidenceReviews[report.id] ??
                            report.evidenceReviewStatus
                          }
                          onChange={(event) =>
                            setReportEvidenceReviews((current) => ({
                              ...current,
                              [report.id]:
                                event.target
                                  .value as MarketplaceAbuseReportEvidenceReviewStatus,
                            }))
                          }
                        >
                          <option value="pending">Pending review</option>
                          <option value="supports_report">Supports report</option>
                          <option value="insufficient_evidence">
                            Insufficient evidence
                          </option>
                          <option value="contradicts_report">
                            Contradicts report
                          </option>
                        </select>
                      </label>
                      <label className={styles.field}>
                        <span>Investigation summary</span>
                        <textarea
                          value={
                            reportInvestigationSummaries[report.id] ??
                            report.investigationSummary ??
                            ''
                          }
                          onChange={(event) =>
                            setReportInvestigationSummaries((current) => ({
                              ...current,
                              [report.id]: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Resolution note</span>
                        <textarea
                          value={reportNotes[report.id] ?? report.resolutionNote ?? ''}
                          onChange={(event) =>
                            setReportNotes((current) => ({
                              ...current,
                              [report.id]: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className={styles.inlineActions}>
                        <button
                          type="button"
                          onClick={() => void handleUpdateReport(report, 'open')}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleUpdateReport(report, 'reviewing')}
                        >
                          Reviewing
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleUpdateReport(report, 'resolved', 'hidden')
                          }
                        >
                          Resolve + Hide
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleUpdateReport(
                              report,
                              'resolved',
                              'suspended',
                            )
                          }
                        >
                          Resolve + Suspend
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleUpdateReport(
                              report,
                              'dismissed',
                              'visible',
                            )
                          }
                        >
                          Dismiss + Restore
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleUpdateReport(report, 'reviewing', 'hidden')
                          }
                        >
                          Reviewing + Hide
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Recent</span>
                  <h2>Latest signals</h2>
                </div>
              </div>
              <div className={styles.stack}>
                {dashboard.recentAbuseReports.length === 0 ? (
                  <p className={styles.stateText}>No recent trust-and-safety activity.</p>
                ) : (
                  dashboard.recentAbuseReports.map((report) => (
                    <article key={report.id} className={styles.timelineCard}>
                      <strong>{report.subject.label}</strong>
                      <p className={styles.stateText}>
                        {queuePriorityLabels[report.queuePriority]} • {report.reason} •{' '}
                        {report.status} • {report.reporter.email}
                      </p>
                    </article>
                  ))
                )}
                {dashboard.agingOpportunities.map((opportunity) => (
                  <article key={opportunity.opportunityId} className={styles.timelineCard}>
                    <strong>{opportunity.title}</strong>
                    <p className={styles.stateText}>
                      {opportunity.ownerDisplayName} • {opportunity.ageDays} days open
                    </p>
                  </article>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
