import Link from 'next/link';
import styles from '../marketing.module.css';

export default function TrustPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <strong className={styles.brand}>Milestone Escrow</strong>
          <div className={styles.navLinks}>
            <Link href="/">Home</Link>
            <Link href="/app/sign-in">Sign in</Link>
            <Link href="/app/new-contract">Start a contract</Link>
          </div>
        </nav>

        <section className={styles.section}>
          <h2>How escrow works here</h2>
          <div className={styles.sectionBody}>
            <p>
              Funds are locked to one milestone-based service contract instead of sent as
              an informal upfront payment. The contractor wallet is bound at contract
              creation, and only that wallet can act as the contractor in the workflow.
            </p>
            <ul className={styles.list}>
              <li>The client funds the job before milestone delivery starts.</li>
              <li>The contractor delivers against the funded milestone with a delivery note and evidence URLs.</li>
              <li>The client releases the milestone or opens a dispute with a reason and evidence URLs.</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2>How disputes work</h2>
          <div className={styles.sectionBody}>
            <p>
              Disputes stay milestone-scoped. The operator does not act as a hidden admin;
              the current product model uses the configured arbitrator wallet as the
              designated dispute resolver.
            </p>
            <ul className={styles.list}>
              <li>The operator sees the milestone posture, delivery note, delivery evidence, dispute reason, dispute evidence, audit events, and receipts.</li>
              <li>The operator records a release or refund decision plus a resolution note.</li>
              <li>The case remains exportable as job-history and dispute-case artifacts.</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2>What is implemented today</h2>
          <div className={styles.proofGrid}>
            <article className={styles.proofCard}>
              <strong>Implemented in-repo</strong>
              <p>OTP auth, wallet linking, smart-account provisioning, client funding, contractor delivery, client dispute, operator resolution, audit bundle lookup, and export artifacts.</p>
            </article>
            <article className={styles.proofCard}>
              <strong>Visible in the product</strong>
              <p>The shared contract link, role-specific action states, milestone evidence, dispute evidence, operator case review, and runtime readiness posture.</p>
            </article>
            <article className={styles.proofCard}>
              <strong>Still being validated live</strong>
              <p>Real staged launch-candidate evidence, live relay exercise, live alert delivery, and other deployed-environment proof still need to be run outside the repo.</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
