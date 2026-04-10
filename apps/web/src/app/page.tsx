'use client';

import Link from 'next/link';
import styles from './marketing.module.css';
import { LanguageSwitcher } from './language-switcher';
import { useWebI18n } from '../lib/i18n';

export default function Home() {
  const { messages } = useWebI18n();

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <strong className={styles.brand}>{messages.common.brand}</strong>
          <div className={styles.navLinks}>
            <Link href="/trust">{messages.common.trust}</Link>
            <Link href="/app/sign-in">{messages.common.signIn}</Link>
            <Link href="/app/new-contract">{messages.common.startEscrow}</Link>
          </div>
          <LanguageSwitcher
            className={styles.languageSwitcher}
            labelClassName={styles.languageSwitcherLabel}
            optionClassName={styles.languageSwitcherOption}
            optionActiveClassName={styles.languageSwitcherOptionActive}
          />
        </nav>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>{messages.marketing.heroEyebrow}</p>
            <h1>{messages.marketing.heroTitle}</h1>
            <p className={styles.lead}>{messages.marketing.heroLead}</p>
            <div className={styles.ctaRow}>
              <Link href="/app/new-contract">{messages.common.startEscrow}</Link>
              <Link className={styles.secondaryLink} href="/trust">
                {messages.marketing.trustCta}
              </Link>
            </div>
          </div>
          <div className={styles.cardStack}>
            {messages.marketing.stats.map((card) => (
              <article key={card.title} className={styles.statCard}>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>{messages.marketing.howItWorksTitle}</h2>
          <div className={styles.steps}>
            {messages.marketing.steps.map((step, index) => (
              <article key={step.title} className={styles.stepCard}>
                <span>{`0${index + 1}`}</span>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>{messages.marketing.productBoundsTitle}</h2>
          <div className={styles.objectionGrid}>
            {messages.marketing.bounds.map((entry) => (
              <article key={entry.title} className={styles.objectionCard}>
                <strong>{entry.title}</strong>
                <p>{entry.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
