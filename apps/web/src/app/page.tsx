'use client';

import Link from 'next/link';
import {
  Button,
  Eyebrow,
  FeatureCard,
  PageContainer,
  SectionHeading,
} from '@escrow4334/frontend-core';
import { GlassPanel, RevealSection, SharedCard, SpotlightButton } from '@escrow4334/frontend-core/spatial';
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

        <RevealSection className={styles.hero}>
          <div className="fx-fade-up">
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
              <SpotlightButton asChild className={`${styles.ctaLink} ${styles.ctaPrimary}`}>
                <Link href="/app/new-contract">
                  {messages.common.startEscrow}
                </Link>
              </SpotlightButton>
              <Button asChild className={`${styles.ctaLink} ${styles.ctaTertiary}`} variant="secondary">
                <Link href="/trust">
                  {messages.marketing.trustCta}
                </Link>
              </Button>
            </div>
            <div className={styles.heroSignalGrid}>
              {messages.marketing.stats.map((card) => (
                <GlassPanel key={card.title} className={styles.heroSignal} tone="quiet">
                  <span className={styles.heroSignalLabel}>{card.title}</span>
                  <span className={styles.heroSignalValue}>{card.body}</span>
                </GlassPanel>
              ))}
            </div>
          </div>
          <div className={`${styles.cardStack} fx-fade-up fx-fade-up-delay-1`}>
            {messages.marketing.stats.map((card) => (
              <SharedCard key={card.title} className={styles.statCard} interactive>
                <FeatureCard
                  body={card.body}
                  className="rounded-none border-0 bg-transparent p-0 shadow-none before:hidden"
                  title={card.title}
                />
              </SharedCard>
            ))}
          </div>
        </RevealSection>

        <RevealSection className={`${styles.section} fx-fade-up fx-fade-up-delay-1`} delay={0.08}>
          <div className={styles.splitSection}>
            <div className={styles.sectionBody}>
              <SectionHeading title={messages.marketing.howItWorksTitle} />
            </div>
            <GlassPanel as="aside" className={styles.railCard} tone="quiet">
              <div className={styles.railList}>
                {messages.marketing.bounds.map((entry) => (
                  <div key={entry.title} className={styles.railItem}>
                    <span className="text-[var(--foreground)]">
                      {`${entry.title} ${entry.body}`}
                    </span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>
          <div className={styles.steps}>
            {messages.marketing.steps.map((step, index) => (
              <SharedCard key={step.title} className={styles.stepCard} interactive>
                <FeatureCard
                  body={step.body}
                  className="rounded-none border-0 bg-transparent p-0 shadow-none before:hidden"
                  leading={<span>{`0${index + 1}`}</span>}
                  title={step.title}
                />
              </SharedCard>
            ))}
          </div>
        </RevealSection>

        <RevealSection className={`${styles.section} fx-fade-up fx-fade-up-delay-2`} delay={0.12}>
          <SectionHeading title={messages.marketing.productBoundsTitle} />
          <div className={styles.objectionGrid}>
            {messages.marketing.bounds.map((entry) => (
              <SharedCard key={entry.title} className={styles.objectionCard} interactive>
                <FeatureCard
                  body={entry.body}
                  className="rounded-none border-0 bg-transparent p-0 shadow-none before:hidden"
                  title={entry.title}
                />
              </SharedCard>
            ))}
          </div>
        </RevealSection>
      </PageContainer>
    </main>
  );
}
