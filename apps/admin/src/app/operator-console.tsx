'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import {
  createErrorState,
  createIdleState,
  createSuccessState,
  createWorkingState,
  EmptyStateCard,
  formatTimestamp,
  previewHash,
  pushStoredStringList,
  readStoredStringList,
  StatusNotice,
  type AsyncState,
  writeStoredStringList,
} from '@escrow4334/frontend-core';
import { adminApi, type AuditBundle } from '../lib/api';
import {
  buildCaseBrief,
  buildExecutionIssueCards,
  buildMilestoneReviewCards,
  buildOperatorTimeline,
  getDisputedMilestoneCards,
  getExecutionFailures,
  getRecentLookupSuggestions,
} from './operator-case';

const historyKey = 'escrow4337.admin.recent-lookups';

function getPressureClassName(pressure: 'stable' | 'attention' | 'critical') {
  switch (pressure) {
    case 'stable':
      return styles.pressureStable;
    case 'attention':
      return styles.pressureAttention;
    case 'critical':
      return styles.pressureCritical;
  }
}

function getMilestonePostureClassName(posture: 'stable' | 'review' | 'resolved') {
  switch (posture) {
    case 'stable':
      return styles.postureStable;
    case 'review':
      return styles.postureReview;
    case 'resolved':
      return styles.postureResolved;
  }
}

function getTimelineToneClassName(
  tone: 'neutral' | 'warning' | 'critical' | 'success',
) {
  switch (tone) {
    case 'neutral':
      return styles.timelineNeutral;
    case 'warning':
      return styles.timelineWarning;
    case 'critical':
      return styles.timelineCritical;
    case 'success':
      return styles.timelineSuccess;
  }
}

export function OperatorConsole() {
  const [jobId, setJobId] = useState('');
  const [audit, setAudit] = useState<AuditBundle | null>(null);
  const [lookupHistory, setLookupHistory] = useState<string[]>([]);
  const [state, setState] = useState<AsyncState>(createIdleState());

  useEffect(() => {
    setLookupHistory(readStoredStringList(historyKey));
  }, []);

  async function handleLookup(nextJobId = jobId) {
    const normalizedJobId = nextJobId.trim();
    if (!normalizedJobId) {
      setState(
        createErrorState(
          null,
          'Provide a job id before loading the public audit bundle.',
        ),
      );
      return;
    }

    setJobId(normalizedJobId);
    setState(createWorkingState('Loading operator case review...'));

    try {
      const nextAudit = await adminApi.getAudit(normalizedJobId);
      setAudit(nextAudit);
      const nextHistory = pushStoredStringList(lookupHistory, normalizedJobId);
      setLookupHistory(nextHistory);
      writeStoredStringList(historyKey, nextHistory);
      setState(
        createSuccessState(
          'Operator case loaded. Review dispute pressure, execution receipts, and blocked privileged actions below.',
        ),
      );
    } catch (error) {
      setAudit(null);
      setState(createErrorState(error, 'Failed to load operator case'));
    }
  }

  const caseBrief = useMemo(
    () => (audit ? buildCaseBrief(audit.bundle) : null),
    [audit],
  );
  const milestoneReviewCards = useMemo(
    () => (audit ? buildMilestoneReviewCards(audit.bundle.job) : []),
    [audit],
  );
  const disputedMilestoneCards = useMemo(
    () => getDisputedMilestoneCards(milestoneReviewCards),
    [milestoneReviewCards],
  );
  const executionIssueCards = useMemo(
    () => (audit ? buildExecutionIssueCards(audit.bundle.executions) : []),
    [audit],
  );
  const failedExecutionCards = useMemo(
    () => getExecutionFailures(executionIssueCards),
    [executionIssueCards],
  );
  const operatorTimeline = useMemo(
    () => (audit ? buildOperatorTimeline(audit.bundle) : []),
    [audit],
  );
  const lookupSuggestions = useMemo(
    () => getRecentLookupSuggestions(lookupHistory, jobId),
    [jobId, lookupHistory],
  );

  return (
    <div className={styles.console}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Operator Console</p>
          <h1>Review disputes and execution issues from the public audit trail.</h1>
          <p className={styles.heroCopy}>
            This surface stays within the existing public audit endpoint. It is
            organized around operator tasks: dispute triage, receipt inspection,
            milestone posture review, and explicit visibility into what still
            requires backend authorization work.
          </p>
        </div>
        <div className={styles.heroCard}>
          <div>
            <span className={styles.metaLabel}>API base URL</span>
            <strong>{adminApi.baseUrl}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Loaded case</span>
            <strong>{audit?.bundle.job.id || 'None selected'}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Pressure</span>
            <strong>{caseBrief?.pressure || 'Waiting for lookup'}</strong>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>Audit Lookup</p>
            <h2>Open an operator case review</h2>
          </div>
          {audit ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void handleLookup(jobId)}
            >
              Reload case
            </button>
          ) : null}
        </header>
        <div className={styles.lookupRow}>
          <input
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
            placeholder="Paste a job UUID"
          />
          <button type="button" onClick={() => void handleLookup()}>
            Load public bundle
          </button>
        </div>
        {lookupSuggestions.length > 0 ? (
          <div className={styles.suggestionRow}>
            {lookupSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={styles.suggestionChip}
                onClick={() => void handleLookup(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
        <StatusNotice message={state.message} messageClassName={styles.stateText} />
      </section>

      {audit && caseBrief ? (
        <>
          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Case Brief</p>
                <h2>{audit.bundle.job.title}</h2>
              </div>
              <span
                className={`${styles.pressureBadge} ${getPressureClassName(caseBrief.pressure)}`}
              >
                {caseBrief.pressure}
              </span>
            </header>
            <div className={styles.summaryGrid}>
              <article>
                <span className={styles.metaLabel}>Job status</span>
                <strong>{audit.bundle.job.status}</strong>
              </article>
              <article>
                <span className={styles.metaLabel}>Funded amount</span>
                <strong>{audit.bundle.job.fundedAmount || 'Not funded'}</strong>
              </article>
              <article>
                <span className={styles.metaLabel}>Escrow id</span>
                <strong>{audit.bundle.job.onchain.escrowId || 'Pending'}</strong>
              </article>
              <article>
                <span className={styles.metaLabel}>Disputed milestones</span>
                <strong>{caseBrief.disputedMilestones}</strong>
              </article>
              <article>
                <span className={styles.metaLabel}>Execution failures</span>
                <strong>{caseBrief.failedExecutions}</strong>
              </article>
              <article>
                <span className={styles.metaLabel}>Latest activity</span>
                <strong>{formatTimestamp(caseBrief.latestActivityAt)}</strong>
              </article>
            </div>
            <StatusNotice
              message={caseBrief.pressureSummary}
              messageClassName={styles.stateText}
            />
          </section>

          <div className={styles.grid}>
            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Dispute Review</p>
                  <h2>Milestones needing operator attention</h2>
                </div>
              </header>
              <div className={styles.stack}>
                {disputedMilestoneCards.length > 0 ? (
                  disputedMilestoneCards.map((card) => (
                    <article
                      key={`${audit.bundle.job.id}-dispute-${card.milestoneIndex}`}
                      className={`${styles.timelineCard} ${getMilestonePostureClassName(
                        card.posture,
                      )}`}
                    >
                      <div className={styles.timelineHead}>
                        <strong>{`${card.milestoneIndex + 1}. ${card.title}`}</strong>
                        <span>{card.status}</span>
                      </div>
                      <p>{card.operatorSummary}</p>
                      <small>{card.supportingDetail}</small>
                      <small>{card.amount} USDC</small>
                    </article>
                  ))
                ) : (
                  <EmptyStateCard
                    title="No active disputes"
                    message="This public bundle does not currently show any disputed milestones."
                    className={styles.emptyCard}
                    messageClassName={styles.stateText}
                  />
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Execution Triage</p>
                  <h2>Failures and receipt posture</h2>
                </div>
              </header>
              <div className={styles.stack}>
                {failedExecutionCards.length > 0 ? (
                  failedExecutionCards.map((card) => (
                    <article key={card.id} className={`${styles.timelineCard} ${styles.executionFailure}`}>
                      <div className={styles.timelineHead}>
                        <strong>{card.action}</strong>
                        <span>{card.status}</span>
                      </div>
                      <p>{card.summary}</p>
                      <small>{card.detail}</small>
                      <small>{card.milestoneIndex === undefined ? 'Job-level receipt' : `Milestone ${card.milestoneIndex + 1}`}</small>
                      <small>{card.actorAddress}</small>
                      <small>{previewHash(card.txHash)}</small>
                      <small>{formatTimestamp(card.at)}</small>
                    </article>
                  ))
                ) : (
                  <EmptyStateCard
                    title="No failed executions"
                    message="The current receipt stream does not show failed public executions."
                    className={styles.emptyCard}
                    messageClassName={styles.stateText}
                  />
                )}
              </div>
            </section>
          </div>

          <div className={styles.grid}>
            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Milestone Posture</p>
                  <h2>Operator-readable milestone board</h2>
                </div>
              </header>
              <div className={styles.stack}>
                {milestoneReviewCards.map((card) => (
                  <article
                    key={`${audit.bundle.job.id}-milestone-${card.milestoneIndex}`}
                    className={`${styles.timelineCard} ${getMilestonePostureClassName(
                      card.posture,
                    )}`}
                  >
                    <div className={styles.timelineHead}>
                      <strong>{`${card.milestoneIndex + 1}. ${card.title}`}</strong>
                      <span>{card.status}</span>
                    </div>
                    <p>{card.operatorSummary}</p>
                    <small>{card.supportingDetail}</small>
                    <small>{card.amount} USDC</small>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Operator Boundaries</p>
                  <h2>Public visibility vs blocked privileges</h2>
                </div>
              </header>
              <div className={styles.stack}>
                <article className={styles.boundaryCard}>
                  <strong>Visible now</strong>
                  <p className={styles.stateText}>
                    Public audit events, milestone posture, dispute reasons, and execution receipts.
                  </p>
                </article>
                <article className={styles.boundaryCard}>
                  <strong>Blocked by backend auth</strong>
                  <p className={styles.stateText}>
                    Privileged operator resolution flows remain unavailable until real operator or arbitrator authorization exists.
                  </p>
                </article>
                <article className={styles.boundaryCard}>
                  <strong>Blocked by export support</strong>
                  <p className={styles.stateText}>
                    Evidence bundles and case exports should not appear as fake actions before backend export support lands.
                  </p>
                </article>
              </div>
            </section>
          </div>

          <div className={styles.grid}>
            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Receipt Stream</p>
                  <h2>All public execution receipts</h2>
                </div>
              </header>
              <div className={styles.stack}>
                {executionIssueCards.length > 0 ? (
                  executionIssueCards.map((card) => (
                    <article key={card.id} className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <strong>{card.action}</strong>
                        <span>{card.status}</span>
                      </div>
                      <p>{card.summary}</p>
                      <small>{card.detail}</small>
                      <small>{card.milestoneIndex === undefined ? 'Job-level receipt' : `Milestone ${card.milestoneIndex + 1}`}</small>
                      <small>{card.actorAddress}</small>
                      <small>{previewHash(card.txHash)}</small>
                      <small>{formatTimestamp(card.at)}</small>
                    </article>
                  ))
                ) : (
                  <EmptyStateCard
                    title="No receipts available"
                    message="This public bundle did not return any execution receipts."
                    className={styles.emptyCard}
                    messageClassName={styles.stateText}
                  />
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Onchain Posture</p>
                  <h2>Case addresses and settlement context</h2>
                </div>
              </header>
              <div className={styles.stack}>
                <article className={styles.timelineCard}>
                  <span className={styles.metaLabel}>Client address</span>
                  <code>{audit.bundle.job.onchain.clientAddress}</code>
                </article>
                <article className={styles.timelineCard}>
                  <span className={styles.metaLabel}>Worker address</span>
                  <code>{audit.bundle.job.onchain.workerAddress}</code>
                </article>
                <article className={styles.timelineCard}>
                  <span className={styles.metaLabel}>Currency address</span>
                  <code>{audit.bundle.job.onchain.currencyAddress}</code>
                </article>
                <article className={styles.timelineCard}>
                  <span className={styles.metaLabel}>Contract address</span>
                  <code>{audit.bundle.job.onchain.contractAddress}</code>
                </article>
              </div>
            </section>
          </div>

          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Timeline</p>
                <h2>Operator-readable combined event stream</h2>
              </div>
            </header>
            <div className={styles.stack}>
              {operatorTimeline.map((entry, index) => (
                <article
                  key={`${entry.kind}-${entry.label}-${entry.at}-${index}`}
                  className={`${styles.timelineCard} ${getTimelineToneClassName(entry.tone)}`}
                >
                  <div className={styles.timelineHead}>
                    <strong>{entry.label}</strong>
                    <span>{formatTimestamp(entry.at)}</span>
                  </div>
                  <p>{entry.summary}</p>
                  <pre>{entry.detail}</pre>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Operator Scope</p>
              <h2>What this surface can review today</h2>
            </div>
          </header>
          <div className={styles.grid}>
            <EmptyStateCard
              title="Dispute review"
              message="Load a public job bundle to review milestone disputes, reasons, and current settlement posture."
              className={styles.emptyCard}
              messageClassName={styles.stateText}
            />
            <EmptyStateCard
              title="Receipt triage"
              message="Inspect confirmed and failed execution receipts without endpoint spelunking."
              className={styles.emptyCard}
              messageClassName={styles.stateText}
            />
            <EmptyStateCard
              title="Blocked privileged actions"
              message="Operator resolution and exports remain blocked until backend authorization and export support exist."
              className={styles.emptyCard}
              messageClassName={styles.stateText}
            />
            <EmptyStateCard
              title="Public-only posture"
              message="The console only reflects public audit data. It does not invent privileged actions that the backend cannot enforce."
              className={styles.emptyCard}
              messageClassName={styles.stateText}
            />
          </div>
        </section>
      )}
    </div>
  );
}
