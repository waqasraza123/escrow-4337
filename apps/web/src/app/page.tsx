import Link from 'next/link';
import styles from './marketing.module.css';

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <strong className={styles.brand}>Milestone Escrow</strong>
          <div className={styles.navLinks}>
            <Link href="/trust">Trust</Link>
            <Link href="/app/sign-in">Sign in</Link>
            <Link href="/app/new-contract">Start a milestone escrow</Link>
          </div>
        </nav>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Agency and client service work on Base</p>
            <h1>Milestone escrow for crypto service work</h1>
            <p className={styles.lead}>
              Lock client funds upfront, release by milestone, and resolve disputes
              with a clear audit trail on Base. This launch candidate is built for
              one flow: client funds, contractor delivers, client releases or
              disputes, operator resolves.
            </p>
            <div className={styles.ctaRow}>
              <Link href="/app/new-contract">Start a milestone escrow</Link>
              <Link className={styles.secondaryLink} href="/trust">
                See the trust model
              </Link>
            </div>
          </div>
          <div className={styles.cardStack}>
            <article className={styles.statCard}>
              <strong>Email-first onboarding</strong>
              <p>OTP sign-in plus wallet linking keeps setup lighter than raw wallet-only flows.</p>
            </article>
            <article className={styles.statCard}>
              <strong>Milestone release and dispute flow</strong>
              <p>Funding, delivery, release, dispute, and operator resolution are already implemented in the repo.</p>
            </article>
            <article className={styles.statCard}>
              <strong>Operator-visible case history</strong>
              <p>Each contract exposes an audit bundle, execution receipts, and exportable case artifacts.</p>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <h2>How it works</h2>
          <div className={styles.steps}>
            <article className={styles.stepCard}>
              <span>01</span>
              <strong>Create and fund</strong>
              <p>The client creates a milestone contract, binds the contractor wallet, and funds the escrow.</p>
            </article>
            <article className={styles.stepCard}>
              <span>02</span>
              <strong>Deliver and review</strong>
              <p>The contractor joins through the shared link, signs in, links the exact wallet, and submits delivery evidence.</p>
            </article>
            <article className={styles.stepCard}>
              <span>03</span>
              <strong>Release or dispute</strong>
              <p>The client releases the milestone or opens a dispute. The operator resolves from the visible case history.</p>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <h2>What this launch candidate is and is not</h2>
          <div className={styles.objectionGrid}>
            <article className={styles.objectionCard}>
              <strong>It is a focused agency or client escrow flow.</strong>
              <p>One client, one contractor, one operator, one chain, one milestone-based service contract model.</p>
            </article>
            <article className={styles.objectionCard}>
              <strong>It is not a marketplace or embedded platform.</strong>
              <p>No talent discovery, no white-label API layer, no multi-chain sprawl, and no generalized escrow platform pitch.</p>
            </article>
            <article className={styles.objectionCard}>
              <strong>Trust claims stay narrow.</strong>
              <p>The product shows what is implemented now and what still needs live staged proof before it should be called production-proven.</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
