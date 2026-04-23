'use client';

import Link from 'next/link';
import {
  Button,
  ConsolePage,
  FactGrid,
  FactItem,
  FeatureCard,
  HeroPanel,
  PageTopBar,
  SectionCard,
  SectionHeading,
  SurfaceCard,
} from '@escrow4334/frontend-core';
import { RevealSection } from '@escrow4334/frontend-core/spatial';
import { useAdminI18n } from '../lib/i18n';
import { resolvePublicAppHref } from '../lib/public-app-url';
import styles from './page.styles';
import { LanguageSwitcher } from './language-switcher';
import { ThemeToggle } from './theme-toggle';

export function AdminLandingPage() {
  const { messages } = useAdminI18n();
  const marketplaceHref = resolvePublicAppHref('/marketplace');
  const signInHref = resolvePublicAppHref('/app/sign-in');
  const startEscrowHref = resolvePublicAppHref('/app/new-contract');

  return (
    <ConsolePage theme="web">
      <RevealSection>
        <PageTopBar
          eyebrow={messages.landing.topBar.label}
          description={messages.landing.topBar.meta}
          className={styles.topBar}
          contentClassName={styles.topBarContent}
          actions={
            <>
              <Link href="/operator" className={styles.secondaryButton}>
                {messages.landing.operatorAccess}
              </Link>
              <LanguageSwitcher
                className={styles.languageSwitcher}
                labelClassName={styles.languageSwitcherLabel}
                optionClassName={styles.languageSwitcherOption}
                optionActiveClassName={styles.languageSwitcherOptionActive}
                theme="web"
              />
              <ThemeToggle
                className={styles.languageSwitcher}
                labelClassName={styles.languageSwitcherLabel}
                optionClassName={styles.languageSwitcherOption}
                optionActiveClassName={styles.languageSwitcherOptionActive}
              />
            </>
          }
        />
      </RevealSection>

      <RevealSection delay={0.08}>
        <HeroPanel
          theme="web"
          eyebrow={messages.landing.hero.eyebrow}
          title={messages.landing.hero.title}
          description={messages.landing.hero.copy}
          summary={
            <FactGrid className="md:grid-cols-2 xl:grid-cols-4">
              {messages.landing.hero.stats.map((item) => (
                <FactItem key={item.label} label={item.label} value={item.value} />
              ))}
            </FactGrid>
          }
        />
      </RevealSection>

      <RevealSection delay={0.12}>
        <SectionCard
          className={styles.panel}
          eyebrow={messages.landing.value.eyebrow}
          headerClassName={styles.panelHeader}
          title={messages.landing.value.title}
        >
          <div className={styles.summaryGrid}>
            {messages.landing.value.cards.map((card) => (
              <FeatureCard
                key={card.title}
                className={styles.panel}
                title={card.title}
                body={card.body}
              />
            ))}
          </div>
        </SectionCard>
      </RevealSection>

      <div className={styles.grid}>
        <RevealSection delay={0.16}>
          <SectionCard
            className={styles.panel}
            eyebrow={messages.landing.workflow.eyebrow}
            headerClassName={styles.panelHeader}
            title={messages.landing.workflow.title}
          >
            <div className={styles.stack}>
              {messages.landing.workflow.steps.map((step) => (
                <SurfaceCard key={step.title} className={styles.panel}>
                  <strong>{step.title}</strong>
                  <p className={styles.stateText}>{step.body}</p>
                </SurfaceCard>
              ))}
            </div>
          </SectionCard>
        </RevealSection>

        <RevealSection delay={0.2}>
          <SectionCard
            className={styles.panel}
            eyebrow={messages.landing.trust.eyebrow}
            headerClassName={styles.panelHeader}
            title={messages.landing.trust.title}
          >
            <div className={styles.stack}>
              <p className={styles.stateText}>{messages.landing.trust.copy}</p>
              <div className={styles.stack}>
                {messages.landing.trust.points.map((point) => (
                  <SurfaceCard key={point.title} className={styles.panel}>
                    <strong>{point.title}</strong>
                    <p className={styles.stateText}>{point.body}</p>
                  </SurfaceCard>
                ))}
              </div>
            </div>
          </SectionCard>
        </RevealSection>
      </div>

      <RevealSection delay={0.24}>
        <section className={styles.panel}>
          <SectionHeading
            eyebrow={messages.landing.cta.eyebrow}
            title={messages.landing.cta.title}
            description={messages.landing.cta.copy}
            className={styles.panelHeader}
          />
          <div className={styles.summaryGrid}>
            <Button asChild>
              <Link href={marketplaceHref}>{messages.landing.cta.marketplace}</Link>
            </Button>
            <Button asChild variant="secondary" className={styles.secondaryButton}>
              <Link href={signInHref}>{messages.landing.cta.signIn}</Link>
            </Button>
            <Button asChild variant="secondary" className={styles.secondaryButton}>
              <Link href={startEscrowHref}>{messages.landing.cta.startEscrow}</Link>
            </Button>
          </div>
        </section>
      </RevealSection>
    </ConsolePage>
  );
}
