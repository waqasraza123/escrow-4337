'use client';

import Link from 'next/link';
import {
  Button,
  Eyebrow,
  FeatureCard,
  PageContainer,
  SectionHeading,
} from '@escrow4334/frontend-core';
import styles from './marketing.styles';
import { LanguageSwitcher } from './language-switcher';
import { useWebI18n } from '../lib/i18n';

export default function Home() {
  const { messages } = useWebI18n();

  return (
    <main className={styles.page}>
      <PageContainer className={styles.shell}>
        <nav className={styles.nav}>
          <strong className={styles.brand}>{messages.common.brand}</strong>
          <div className={styles.navLinks}>
            <Link href="/marketplace">{messages.common.marketplace}</Link>
            <Link href="/trust">{messages.common.trust}</Link>
            <Link href="/app/sign-in">{messages.common.signIn}</Link>
            <Link href="/app/new-contract">{messages.common.startEscrow}</Link>
          </div>
          <LanguageSwitcher className={styles.languageSwitcher} theme="web" />
        </nav>

        <section className={styles.hero}>
          <div>
            <Eyebrow className={styles.eyebrow}>
              {messages.marketing.heroEyebrow}
            </Eyebrow>
            <h1>{messages.marketing.heroTitle}</h1>
            <p className={styles.lead}>{messages.marketing.heroLead}</p>
            <div className={styles.ctaRow}>
              <Button asChild className={`${styles.ctaLink} ${styles.ctaSecondary}`} variant="secondary">
                <Link href="/marketplace">
                  {messages.common.marketplace}
                </Link>
              </Button>
              <Button asChild className={`${styles.ctaLink} ${styles.ctaPrimary}`}>
                <Link href="/app/new-contract">
                  {messages.common.startEscrow}
                </Link>
              </Button>
              <Button asChild className={`${styles.ctaLink} ${styles.ctaTertiary}`} variant="secondary">
                <Link href="/trust">
                  {messages.marketing.trustCta}
                </Link>
              </Button>
            </div>
          </div>
          <div className={styles.cardStack}>
            {messages.marketing.stats.map((card) => (
              <FeatureCard
                key={card.title}
                body={card.body}
                className={styles.statCard}
                title={card.title}
              />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading title={messages.marketing.howItWorksTitle} />
          <div className={styles.steps}>
            {messages.marketing.steps.map((step, index) => (
              <FeatureCard
                key={step.title}
                body={step.body}
                className={styles.stepCard}
                leading={<span>{`0${index + 1}`}</span>}
                title={step.title}
              />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading title={messages.marketing.productBoundsTitle} />
          <div className={styles.objectionGrid}>
            {messages.marketing.bounds.map((entry) => (
              <FeatureCard
                key={entry.title}
                body={entry.body}
                className={styles.objectionCard}
                title={entry.title}
              />
            ))}
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
