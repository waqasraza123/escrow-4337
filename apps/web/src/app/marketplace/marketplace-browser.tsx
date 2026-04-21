'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SectionHeading } from '@escrow4334/frontend-core';
import { GlassPanel, RevealSection, SharedCard, SpotlightButton } from '@escrow4334/frontend-core/spatial';
import styles from '../marketing.styles';
import { LanguageSwitcher } from '../language-switcher';
import { ThemeToggle } from '../theme-toggle';
import {
  webApi,
  type MarketplaceOpportunity,
  type MarketplaceProfile,
} from '../../lib/api';
import { useWebI18n } from '../../lib/i18n';

export function MarketplaceBrowser() {
  const { messages } = useWebI18n();
  const marketplaceMessages = messages.publicMarketplace;
  const [profiles, setProfiles] = useState<MarketplaceProfile[]>([]);
  const [opportunities, setOpportunities] = useState<MarketplaceOpportunity[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([
      webApi.listMarketplaceProfiles({ limit: 6 }),
      webApi.listMarketplaceOpportunities({ limit: 6 }),
    ])
      .then(([profileResponse, opportunityResponse]) => {
        if (!active) {
          return;
        }

        setProfiles(profileResponse.profiles);
        setOpportunities(opportunityResponse.opportunities);
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error && loadError.message.trim().length > 0
            ? marketplaceMessages.loadFailure
            : marketplaceMessages.loadFailure,
        );
      });

    return () => {
      active = false;
    };
  }, [marketplaceMessages.loadFailure]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <strong className={styles.brand}>{messages.common.brand}</strong>
          <div className={styles.navLinks}>
            <Link href="/">{messages.common.home}</Link>
            <Link href="/trust">{messages.common.trust}</Link>
            <Link href="/app/marketplace">{marketplaceMessages.navWorkspace}</Link>
          </div>
          <div className={styles.controlCluster}>
            <ThemeToggle
              className={styles.languageSwitcher}
              labelClassName={styles.languageSwitcherLabel}
              optionClassName={styles.languageSwitcherOption}
              optionActiveClassName={styles.languageSwitcherOptionActive}
            />
            <LanguageSwitcher
              className={styles.languageSwitcher}
              labelClassName={styles.languageSwitcherLabel}
              optionClassName={styles.languageSwitcherOption}
              optionActiveClassName={styles.languageSwitcherOptionActive}
            />
          </div>
        </nav>

        <RevealSection className={styles.hero}>
          <div className="fx-fade-up">
            <p className={styles.eyebrow}>{marketplaceMessages.heroEyebrow}</p>
            <h1>{marketplaceMessages.heroTitle}</h1>
            <p className={styles.lead}>{marketplaceMessages.heroLead}</p>
            <div className={styles.ctaRow}>
              <SpotlightButton
                className={`${styles.ctaLink} ${styles.ctaPrimary}`}
                asChild
              >
                <Link href="/app/marketplace">{marketplaceMessages.openWorkspace}</Link>
              </SpotlightButton>
              <Link
                className={`${styles.ctaLink} ${styles.ctaSecondary}`}
                href="/app/new-contract"
              >
                {marketplaceMessages.directContractPath}
              </Link>
            </div>
            <div className={styles.heroSignalGrid}>
              <GlassPanel className={styles.heroSignal} tone="quiet">
                <span className={styles.heroSignalLabel}>
                  {marketplaceMessages.stats.visibleTalentTitle(profiles.length)}
                </span>
                <span className={styles.heroSignalValue}>
                  {marketplaceMessages.stats.visibleTalentBody}
                </span>
              </GlassPanel>
              <GlassPanel className={styles.heroSignal} tone="quiet">
                <span className={styles.heroSignalLabel}>
                  {marketplaceMessages.stats.openBriefsTitle(opportunities.length)}
                </span>
                <span className={styles.heroSignalValue}>
                  {marketplaceMessages.stats.openBriefsBody}
                </span>
              </GlassPanel>
              <GlassPanel className={styles.heroSignal} tone="quiet">
                <span className={styles.heroSignalLabel}>
                  {marketplaceMessages.stats.escrowCloseTitle}
                </span>
                <span className={styles.heroSignalValue}>
                  {marketplaceMessages.stats.escrowCloseBody}
                </span>
              </GlassPanel>
            </div>
          </div>
          <div className={`${styles.cardStack} fx-fade-up fx-fade-up-delay-1`}>
            <SharedCard className={styles.statCard} interactive>
              <strong>
                {marketplaceMessages.stats.visibleTalentTitle(profiles.length)}
              </strong>
              <p>{marketplaceMessages.stats.visibleTalentBody}</p>
            </SharedCard>
            <SharedCard className={styles.statCard} interactive>
              <strong>
                {marketplaceMessages.stats.openBriefsTitle(opportunities.length)}
              </strong>
              <p>{marketplaceMessages.stats.openBriefsBody}</p>
            </SharedCard>
            <SharedCard className={styles.statCard} interactive>
              <strong>{marketplaceMessages.stats.escrowCloseTitle}</strong>
              <p>{marketplaceMessages.stats.escrowCloseBody}</p>
            </SharedCard>
          </div>
        </RevealSection>

        {error ? (
          <section className={styles.section}>
            <h2>{marketplaceMessages.loadFailure}</h2>
            <p>{error}</p>
          </section>
        ) : null}

        <RevealSection className={`${styles.section} fx-fade-up fx-fade-up-delay-1`} delay={0.08}>
          <div className={styles.sectionBody}>
            <SectionHeading
              title={marketplaceMessages.featuredTalentTitle}
              description={marketplaceMessages.stats.visibleTalentBody}
            />
          </div>
          <div className={styles.steps}>
            {profiles.length === 0 ? (
              <article className={styles.stepCard}>
                <strong>{marketplaceMessages.noProfilesTitle}</strong>
                <p>{marketplaceMessages.noProfilesBody}</p>
              </article>
            ) : (
              profiles.map((profile) => (
                <SharedCard
                  key={profile.userId}
                  className={styles.stepCard}
                  interactive
                  layoutId={`marketplace-profile-${profile.slug}`}
                >
                  <strong>{profile.displayName}</strong>
                  <p>{profile.headline}</p>
                  <p>
                    {profile.skills.slice(0, 3).join(' • ')}
                    {profile.skills.length > 3 ? ' • …' : ''}
                  </p>
                  <p>
                    Completed escrow jobs: {profile.completedEscrowCount}
                    {profile.verifiedWalletAddress
                      ? ` • ${marketplaceMessages.labels.verifiedWallet}`
                      : ''}
                  </p>
                  <Link className={styles.cardLink} href={`/marketplace/profiles/${profile.slug}`}>
                    {marketplaceMessages.actions.viewProfile}
                  </Link>
                </SharedCard>
              ))
            )}
          </div>
        </RevealSection>

        <RevealSection className={`${styles.section} fx-fade-up fx-fade-up-delay-2`} delay={0.12}>
          <div className={styles.sectionBody}>
            <SectionHeading
              title={marketplaceMessages.openOpportunitiesTitle}
              description={marketplaceMessages.stats.openBriefsBody}
            />
          </div>
          <div className={styles.steps}>
            {opportunities.length === 0 ? (
              <article className={styles.stepCard}>
                <strong>{marketplaceMessages.noOpportunitiesTitle}</strong>
                <p>{marketplaceMessages.noOpportunitiesBody}</p>
              </article>
            ) : (
              opportunities.map((opportunity) => (
                <SharedCard
                  key={opportunity.id}
                  className={styles.stepCard}
                  interactive
                  layoutId={`marketplace-opportunity-${opportunity.id}`}
                >
                  <strong>{opportunity.title}</strong>
                  <p>{opportunity.summary}</p>
                  <p>
                    {opportunity.category} • {opportunity.requiredSkills.slice(0, 3).join(' • ')}
                  </p>
                  <p>
                    {opportunity.owner.displayName} • {opportunity.applicationCount} applications
                  </p>
                  <Link
                    className={styles.cardLink}
                    href={`/marketplace/opportunities/${opportunity.id}`}
                  >
                    {marketplaceMessages.actions.viewBrief}
                  </Link>
                </SharedCard>
              ))
            )}
          </div>
        </RevealSection>

        <RevealSection className={`${styles.section} fx-fade-up fx-fade-up-delay-3`} delay={0.16}>
          <SectionHeading title={marketplaceMessages.expansionTitle} />
          <div className={styles.objectionGrid}>
            {marketplaceMessages.expansionCards.map((card) => (
              <SharedCard key={card.title} className={styles.objectionCard} interactive>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </SharedCard>
            ))}
          </div>
        </RevealSection>
      </div>
    </main>
  );
}
