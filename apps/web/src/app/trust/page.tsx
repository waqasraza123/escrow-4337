'use client';

import Link from 'next/link';
import {
  FeatureCard,
  PageContainer,
  SectionHeading,
} from '@escrow4334/frontend-core';
import { GlassPanel, RevealSection, SharedCard } from '@escrow4334/frontend-core/spatial';
import styles from '../marketing.styles';
import { LanguageSwitcher } from '../language-switcher';
import { ThemeToggle } from '../theme-toggle';
import { useWebI18n } from '../../lib/i18n';

export default function TrustPage() {
  const { messages } = useWebI18n();
  const trustMessages = messages.marketing.trustPage;

  return (
    <main className={styles.page}>
      <PageContainer className={styles.shell}>
        <nav className={styles.nav}>
          <strong className={styles.brand}>{messages.common.brand}</strong>
          <div className={styles.navLinks}>
            <Link href="/">{messages.common.home}</Link>
            <Link href="/app/sign-in">{messages.common.signIn}</Link>
            <Link href="/app/new-contract">{messages.common.startContract}</Link>
          </div>
          <div className={styles.controlCluster}>
            <ThemeToggle className={styles.languageSwitcher} />
            <LanguageSwitcher className={styles.languageSwitcher} theme="web" />
          </div>
        </nav>

        <RevealSection className={styles.section}>
          <div className={styles.splitSection}>
            <div className={styles.sectionBody}>
              <SectionHeading title={trustMessages.escrowTitle} />
              <p>{trustMessages.escrowIntro}</p>
              <ul className={styles.list}>
                {trustMessages.escrowList.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <GlassPanel as="aside" className={styles.railCard} tone="quiet">
              <SectionHeading
                title={trustMessages.implementedTitle}
                titleClassName="text-[1.2rem]"
              />
              <div className={styles.railList}>
                {trustMessages.proofCards.slice(0, 2).map((card) => (
                  <div key={card.title} className={styles.railItem}>
                    <strong className="mb-1 block text-[var(--foreground)]">
                      {card.title}
                    </strong>
                    {card.body}
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>
        </RevealSection>

        <RevealSection className={styles.section} delay={0.08}>
          <SectionHeading title={trustMessages.disputesTitle} />
          <div className={styles.sectionBody}>
            <p>{trustMessages.disputesIntro}</p>
            <ul className={styles.list}>
              {trustMessages.disputesList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </RevealSection>

        <RevealSection className={styles.section} delay={0.12}>
          <SectionHeading title={trustMessages.implementedTitle} />
          <div className={styles.proofGrid}>
            {trustMessages.proofCards.map((card) => (
              <SharedCard key={card.title} className={styles.proofCard} interactive>
                <FeatureCard
                  body={card.body}
                  className="rounded-none border-0 bg-transparent p-0 shadow-none before:hidden"
                  title={card.title}
                />
              </SharedCard>
            ))}
          </div>
        </RevealSection>
      </PageContainer>
    </main>
  );
}
