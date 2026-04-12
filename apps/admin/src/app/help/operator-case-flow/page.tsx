'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from '../../page.module.css';
import { startOperatorWalkthrough } from '../../operator-walkthrough';

export default function OperatorCaseFlowHelpPage() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.panelEyebrow}>Manual</p>
          <h1>Operator case-flow manual</h1>
          <p className={styles.heroCopy}>
            This guide explains the real dispute-resolution path the operator console supports
            today. Use it when you want quick instructions without the walkthrough overlay.
          </p>
        </div>
        <div className={styles.heroCard}>
          <div>
            <span className={styles.metaLabel}>Best starting point</span>
            <strong>/cases/&lt;job-id&gt;</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Required authority</span>
            <strong>Authenticated session plus configured arbitrator wallet</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Restart the overlay</span>
            <strong>Use Walkthrough in the top bar</strong>
          </div>
        </div>
      </section>

      {notice ? (
        <article className={styles.panel}>
          <strong>Walkthrough ready</strong>
          <p className={styles.stateText}>{notice}</p>
        </article>
      ) : null}

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>Operator</p>
            <h2>Resolve a disputed milestone safely</h2>
          </div>
        </header>
        <div className={styles.stack}>
          <article className={styles.panel}>
            <strong>1. Load the disputed case</strong>
            <p className={styles.stateText}>
              Open the specific `/cases/&lt;job-id&gt;` route so the console can load the public
              bundle, dispute state, and receipts for that escrow job.
            </p>
          </article>
          <article className={styles.panel}>
            <strong>2. Authenticate the operator session</strong>
            <p className={styles.stateText}>
              Use OTP sign-in in the Operator session and wallet authority panel. Protected actions
              do not unlock until the session is authenticated.
            </p>
          </article>
          <article className={styles.panel}>
            <strong>3. Link the configured arbitrator wallet</strong>
            <p className={styles.stateText}>
              Create the SIWE challenge, sign it with the configured arbitrator wallet, and verify
              the signature. Resolution stays blocked until this succeeds.
            </p>
          </article>
          <article className={styles.panel}>
            <strong>4. Resolve with a clear note</strong>
            <p className={styles.stateText}>
              Review the disputed milestone, choose release or refund, add the operator note, and
              submit the decision. You are on track when the disputed milestone disappears from the
              case and the resolution state confirms submission.
            </p>
          </article>
          <div className={styles.inlineActions}>
            <button
              type="button"
              onClick={() => {
                startOperatorWalkthrough();
                setNotice(
                  'Operator walkthrough armed. Open a disputed case route to start it automatically.',
                );
              }}
            >
              Start operator walkthrough
            </button>
            <Link href="/" className={styles.secondaryButton}>
              Go to dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
