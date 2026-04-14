'use client';

import { useState } from 'react';
import styles from '../page.module.css';
import type { MarketplaceAbuseReportReason, SessionTokens } from '../../lib/api';

const sessionStorageKey = 'escrow4337.web.session';

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

function parseEvidenceUrls(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

type AbuseReportPanelProps = {
  subjectLabel: string;
  onSubmit: (
    input: {
      reason: MarketplaceAbuseReportReason;
      details?: string | null;
      evidenceUrls: string[];
    },
    accessToken: string,
  ) => Promise<void>;
};

export function AbuseReportPanel({
  subjectLabel,
  onSubmit,
}: AbuseReportPanelProps) {
  const [reason, setReason] = useState<MarketplaceAbuseReportReason>('spam');
  const [details, setDetails] = useState('');
  const [evidenceInput, setEvidenceInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const session = readSession();
    if (!session?.accessToken) {
      setError('Sign in from the app workspace before submitting a report.');
      return;
    }

    if (reason === 'other' && details.trim().length === 0) {
      setError('Additional details are required for the "other" report reason.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(
        {
          reason,
          details: details.trim() || null,
          evidenceUrls: parseEvidenceUrls(evidenceInput),
        },
        session.accessToken,
      );
      setMessage(`Report submitted for ${subjectLabel}.`);
      setReason('spam');
      setDetails('');
      setEvidenceInput('');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to submit report',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.panelEyebrow}>Trust and safety</span>
          <h2>Report this listing</h2>
        </div>
      </div>
      <p className={styles.stateText}>
        Flag spam, scams, impersonation, or policy abuse for operator review.
      </p>
      <form className={styles.stack} onSubmit={(event) => void handleSubmit(event)}>
        <label className={styles.field}>
          <span>Reason</span>
          <select value={reason} onChange={(event) => setReason(event.target.value as MarketplaceAbuseReportReason)}>
            <option value="spam">Spam</option>
            <option value="scam">Scam</option>
            <option value="impersonation">Impersonation</option>
            <option value="harassment">Harassment</option>
            <option value="off_platform_payment">Off-platform payment</option>
            <option value="policy_violation">Policy violation</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Details</span>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Describe what happened and why it should be reviewed."
          />
        </label>

        <label className={styles.field}>
          <span>Evidence URLs</span>
          <textarea
            value={evidenceInput}
            onChange={(event) => setEvidenceInput(event.target.value)}
            placeholder="Paste supporting URLs, one per line."
          />
        </label>

        <div className={styles.inlineActions}>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </form>

      {message ? <p className={styles.stateText}>{message}</p> : null}
      {error ? <p className={styles.stateText}>{error}</p> : null}
    </article>
  );
}
