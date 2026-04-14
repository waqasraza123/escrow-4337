'use client';

import { useState } from 'react';
import styles from '../page.module.css';
import type { MarketplaceAbuseReportReason, SessionTokens } from '../../lib/api';
import { useWebI18n } from '../../lib/i18n';

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
  const { messages } = useWebI18n();
  const reportingMessages = messages.publicMarketplace.reporting;
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
      setError(reportingMessages.signInRequired);
      return;
    }

    if (reason === 'other' && details.trim().length === 0) {
      setError(reportingMessages.otherReasonRequired);
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
      setMessage(reportingMessages.submitted(subjectLabel));
      setReason('spam');
      setDetails('');
      setEvidenceInput('');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : reportingMessages.failedSubmit,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.panelEyebrow}>{reportingMessages.eyebrow}</span>
          <h2>{reportingMessages.title}</h2>
        </div>
      </div>
      <p className={styles.stateText}>{reportingMessages.intro}</p>
      <form className={styles.stack} onSubmit={(event) => void handleSubmit(event)}>
        <label className={styles.field}>
          <span>{reportingMessages.reason}</span>
          <select value={reason} onChange={(event) => setReason(event.target.value as MarketplaceAbuseReportReason)}>
            <option value="spam">{reportingMessages.reasons.spam}</option>
            <option value="scam">{reportingMessages.reasons.scam}</option>
            <option value="impersonation">{reportingMessages.reasons.impersonation}</option>
            <option value="harassment">{reportingMessages.reasons.harassment}</option>
            <option value="off_platform_payment">
              {reportingMessages.reasons.off_platform_payment}
            </option>
            <option value="policy_violation">
              {reportingMessages.reasons.policy_violation}
            </option>
            <option value="other">{reportingMessages.reasons.other}</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>{reportingMessages.details}</span>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder={reportingMessages.detailsPlaceholder}
          />
        </label>

        <label className={styles.field}>
          <span>{reportingMessages.evidenceUrls}</span>
          <textarea
            value={evidenceInput}
            onChange={(event) => setEvidenceInput(event.target.value)}
            placeholder={reportingMessages.evidencePlaceholder}
          />
        </label>

        <div className={styles.inlineActions}>
          <button type="submit" disabled={submitting}>
            {submitting ? reportingMessages.submitting : reportingMessages.submit}
          </button>
        </div>
      </form>

      {message ? <p className={styles.stateText}>{message}</p> : null}
      {error ? <p className={styles.stateText}>{error}</p> : null}
    </article>
  );
}
