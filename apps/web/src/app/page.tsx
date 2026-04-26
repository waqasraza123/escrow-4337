'use client';

import Link from 'next/link';
import {
  Button,
  Eyebrow,
  PageContainer,
  SectionHeading,
} from '@escrow4334/frontend-core';
import { RevealSection } from '@escrow4334/frontend-core/spatial';
import styles from './marketing.styles';
import { LanguageSwitcher } from './language-switcher';
import {
  EscrowFlowScene,
  MarketplaceHeroScene,
  PublicSceneFrame,
  TalentCategoryGlyph,
} from './public-visuals';
import { ThemeToggle } from './theme-toggle';
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
          <div className={styles.controlCluster}>
            <ThemeToggle className={styles.languageSwitcher} />
            <LanguageSwitcher className={styles.languageSwitcher} theme="web" />
          </div>
        </nav>

        <RevealSection className={styles.hero}>
          <div className={`${styles.heroContent} fx-fade-up`}>
            <Eyebrow className={styles.eyebrow}>
              {messages.marketing.heroEyebrow}
            </Eyebrow>
            <h1 className={styles.heroTitle}>{messages.marketing.heroTitle}</h1>
            <p className={styles.lead}>{messages.marketing.heroLead}</p>
            <div className={styles.ctaRow}>
              <Button
                asChild
                className={`${styles.ctaLink} ${styles.ctaPrimary}`}
                data-testid="marketing-primary-cta"
              >
                <Link href="/marketplace">
                  {messages.common.marketplace}
                </Link>
              </Button>
              <Button
                asChild
                className={`${styles.ctaLink} ${styles.ctaSecondary}`}
                data-testid="marketing-secondary-cta"
                variant="secondary"
              >
                <Link href="/app/new-contract">
                  {messages.common.startEscrow}
                </Link>
              </Button>
              <Button
                asChild
                className={`${styles.ctaLink} ${styles.ctaTertiary}`}
                variant="secondary"
              >
                <Link href="/trust">
                  {messages.marketing.trustCta}
                </Link>
              </Button>
            </div>
            <div className={styles.heroBadgeRow}>
              {messages.marketing.heroBadges.map((badge) => (
                <span key={badge} className={styles.heroBadge}>
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <div className={`${styles.heroIllustrationShell} fx-fade-up fx-fade-up-delay-1`}>
            <PublicSceneFrame accent="market">
              <MarketplaceHeroScene />
            </PublicSceneFrame>
            <div className={styles.heroIllustrationMeta}>
              {messages.marketing.heroSignals.map((item) => (
                <div key={item.label} className={styles.heroIllustrationCard}>
                  <span className={styles.heroIllustrationLabel}>{item.label}</span>
                  <div>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection className={`${styles.section} fx-fade-up fx-fade-up-delay-1`} delay={0.08}>
          <SectionHeading title={messages.marketing.lanesTitle} />
          <div className={styles.laneGrid}>
            {messages.marketing.lanes.map((lane) => (
              <article key={lane.title} className={styles.laneCard}>
                <div className={styles.laneHeader}>
                  <TalentCategoryGlyph
                    kind={lane.glyph as 'engineering' | 'design' | 'growth'}
                  />
                  <div className={styles.laneMeta}>
                    <strong className={styles.laneTitle}>{lane.title}</strong>
                    <p className={styles.laneBody}>{lane.body}</p>
                  </div>
                </div>
                <Link className={styles.secondaryLink} href="/marketplace">
                  {messages.marketing.laneCta}
                </Link>
              </article>
            ))}
          </div>
        </RevealSection>

        <RevealSection className={`${styles.section} fx-fade-up fx-fade-up-delay-2`} delay={0.12}>
          <div className={styles.flowSection}>
            <div className={styles.sectionBody}>
              <SectionHeading title={messages.marketing.howItWorksTitle} />
              <div className={styles.steps}>
                {messages.marketing.steps.map((step, index) => (
                  <article key={step.title} className={styles.stepCard}>
                    <span>{`0${index + 1}`}</span>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className={styles.flowVisualCard}>
              <PublicSceneFrame accent="trust">
                <EscrowFlowScene />
              </PublicSceneFrame>
              <div className={styles.flowProofStrip}>
                {messages.marketing.proofItems.map((item) => (
                  <div key={item.title} className={styles.proofPill}>
                    <span className={styles.proofPillTitle}>{item.title}</span>
                    <div className={styles.proofPillBody}>{item.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection className={`${styles.section} fx-fade-up fx-fade-up-delay-3`} delay={0.16}>
          <SectionHeading title={messages.marketing.proofTitle} />
          <div className={styles.proofStrip}>
            {messages.marketing.proofStrip.map((item) => (
              <div key={item.title} className={styles.proofPill}>
                <span className={styles.proofPillTitle}>{item.title}</span>
                <div className={styles.proofPillBody}>{item.body}</div>
              </div>
            ))}
          </div>
        </RevealSection>
      </PageContainer>
    </main>
  );
}
