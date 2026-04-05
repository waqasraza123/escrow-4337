'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { adminApi, type AuditBundle } from '../lib/api';

function formatTime(value?: number) {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
}

function preview(value?: string) {
  if (!value) {
    return 'Pending';
  }

  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

export function OperatorConsole() {
  const [jobId, setJobId] = useState('');
  const [audit, setAudit] = useState<AuditBundle | null>(null);
  const [state, setState] = useState<{
    kind: 'idle' | 'working' | 'error' | 'success';
    message?: string;
  }>({ kind: 'idle' });

  async function handleLookup() {
    setState({ kind: 'working', message: 'Loading audit bundle...' });

    try {
      const nextAudit = await adminApi.getAudit(jobId);
      setAudit(nextAudit);
      setState({
        kind: 'success',
        message: 'Audit bundle loaded. Review timeline and execution receipts below.',
      });
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to load audit bundle',
      });
    }
  }

  const executions = audit?.bundle.executions ?? [];
  const failedExecutions = executions.filter((execution) => execution.status === 'failed');
  const disputedMilestones =
    audit?.bundle.job.milestones.filter((milestone) => milestone.status === 'disputed') ?? [];

  return (
    <div className={styles.console}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Operator Console</p>
          <h1>Review public escrow audit trails without touching production data.</h1>
          <p className={styles.heroCopy}>
            This surface is wired to the current public audit endpoint. It is built
            for dispute review, execution triage, and operator-level inspection of
            job history and onchain receipts.
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
        </div>
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>Audit Lookup</p>
            <h2>Inspect a job id</h2>
          </div>
        </header>
        <div className={styles.lookupRow}>
          <input
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
            placeholder="Paste a job UUID"
          />
          <button type="button" onClick={handleLookup}>
            Load bundle
          </button>
        </div>
        <p className={styles.stateText}>{state.message}</p>
      </section>

      {audit ? (
        <>
          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Case Summary</p>
                <h2>{audit.bundle.job.title}</h2>
              </div>
            </header>
            <div className={styles.summaryGrid}>
              <article>
                <span className={styles.metaLabel}>Status</span>
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
                <span className={styles.metaLabel}>Failures</span>
                <strong>{failedExecutions.length}</strong>
              </article>
              <article>
                <span className={styles.metaLabel}>Disputed milestones</span>
                <strong>{disputedMilestones.length}</strong>
              </article>
              <article>
                <span className={styles.metaLabel}>Last update</span>
                <strong>{formatTime(audit.bundle.job.updatedAt)}</strong>
              </article>
            </div>
          </section>

          <div className={styles.grid}>
            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Milestones</p>
                  <h2>Delivery and dispute posture</h2>
                </div>
              </header>
              <div className={styles.stack}>
                {audit.bundle.job.milestones.map((milestone, index) => (
                  <article key={`${audit.bundle.job.id}-${index}`} className={styles.timelineCard}>
                    <div className={styles.timelineHead}>
                      <strong>
                        {index}. {milestone.title}
                      </strong>
                      <span>{milestone.status}</span>
                    </div>
                    <p>{milestone.deliverable}</p>
                    <small>{milestone.amount} USDC</small>
                    {milestone.disputeReason ? <small>{milestone.disputeReason}</small> : null}
                    {milestone.resolutionAction ? (
                      <small>
                        Resolution: {milestone.resolutionAction} | {milestone.resolutionNote}
                      </small>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Executions</p>
                  <h2>Relay and onchain receipts</h2>
                </div>
              </header>
              <div className={styles.stack}>
                {audit.bundle.executions.map((execution) => (
                  <article key={execution.id} className={styles.timelineCard}>
                    <div className={styles.timelineHead}>
                      <strong>{execution.action}</strong>
                      <span>{execution.status}</span>
                    </div>
                    <p>{execution.actorAddress}</p>
                    <small>{preview(execution.txHash)}</small>
                    <small>Submitted {formatTime(execution.submittedAt)}</small>
                    {execution.failureMessage ? <small>{execution.failureMessage}</small> : null}
                  </article>
                ))}
              </div>
            </section>
          </div>

          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Timeline</p>
                <h2>Operator-readable event stream</h2>
              </div>
            </header>
            <div className={styles.stack}>
              {audit.bundle.audit.map((event, index) => (
                <article key={`${event.type}-${event.at}-${index}`} className={styles.timelineCard}>
                  <div className={styles.timelineHead}>
                    <strong>{event.type}</strong>
                    <span>{formatTime(event.at)}</span>
                  </div>
                  <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
