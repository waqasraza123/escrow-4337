'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from '../../../page.module.css';
import {
  startClientWalkthrough,
  startContractorWalkthrough,
} from '../../../launch-walkthrough';

export default function LaunchFlowHelpPage() {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.panelEyebrow}>Manual</p>
          <h1>Launch flow manual</h1>
          <p className={styles.heroCopy}>
            Use this guide when you want the plain-language version of the launch-candidate flow
            without the overlay. Every section below follows the real supported escrow journey.
          </p>
        </div>
        <div className={styles.heroCard}>
          <div>
            <span className={styles.metaLabel}>Best starting point</span>
            <strong>/app/sign-in</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Primary outcome</span>
            <strong>Funded job plus contractor join link</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Restart the overlay</span>
            <strong>Use Walkthrough in the top bar</strong>
          </div>
        </div>
      </section>

      {notice ? (
        <article className={styles.statusBanner}>
          <strong>Walkthrough ready</strong>
          <p className={styles.muted}>{notice}</p>
        </article>
      ) : null}

      <div className={styles.grid}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Client</p>
              <h2>Create and launch the first escrow job</h2>
            </div>
          </header>
          <div className={styles.stack}>
            <article className={styles.statusBanner}>
              <strong>1. Start with OTP sign-in</strong>
              <p className={styles.muted}>
                Use the client email that should own the job. After verification, confirm your
                email appears in Profile.
              </p>
            </article>
            <article className={styles.statusBanner}>
              <strong>2. Clear setup blockers</strong>
              <p className={styles.muted}>
                In Setup readiness, follow the next blocker only. First link the browser wallet,
                then provision the smart account that will execute client actions.
              </p>
            </article>
            <article className={styles.statusBanner}>
              <strong>3. Create the guided job</strong>
              <p className={styles.muted}>
                Complete Scope, Counterparty, and Plan. The contractor email and worker wallet must
                match later during join.
              </p>
            </article>
            <article className={styles.statusBanner}>
              <strong>4. Finish launch on the contract page</strong>
              <p className={styles.muted}>
                Commit milestones, fund the job, then send or copy the contractor join link. You
                are on track when the selected job shows funding confirmation and the join access
                card shows a shareable link.
              </p>
            </article>
            <div className={styles.inlineActions}>
              <button
                type="button"
                onClick={() => {
                  startClientWalkthrough('/app/sign-in');
                  router.push('/app/sign-in');
                }}
              >
                Start client walkthrough
              </button>
              <Link href="/app/sign-in" className={styles.secondaryButton}>
                Go to sign-in
              </Link>
              <Link href="/app/new-contract" className={styles.secondaryButton}>
                Go to guided composer
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Contractor</p>
              <h2>Join and deliver from the invite link</h2>
            </div>
          </header>
          <div className={styles.stack}>
            <article className={styles.statusBanner}>
              <strong>1. Open the exact invite-linked contract route</strong>
              <p className={styles.muted}>
                Stay on the provided contract link. That is where the product verifies that the
                invite token, email, and worker wallet match.
              </p>
            </article>
            <article className={styles.statusBanner}>
              <strong>2. Join only when blockers are gone</strong>
              <p className={styles.muted}>
                The Contractor join access card tells you why join is blocked. You are ready when
                the Join button becomes available.
              </p>
            </article>
            <article className={styles.statusBanner}>
              <strong>3. Deliver with evidence</strong>
              <p className={styles.muted}>
                Use the delivery route for the selected milestone, add a clear delivery note, and
                attach evidence links so the client can review confidently.
              </p>
            </article>
            <div className={styles.inlineActions}>
              <button
                type="button"
                onClick={() => {
                  startContractorWalkthrough();
                  setNotice(
                    'Contractor walkthrough armed. Open the invite-linked contract route to start it.',
                  );
                }}
              >
                Start contractor walkthrough
              </button>
              <Link href="/app/sign-in" className={styles.secondaryButton}>
                Go to sign-in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
