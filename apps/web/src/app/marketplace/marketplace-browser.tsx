'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '../marketing.module.css';
import { LanguageSwitcher } from '../language-switcher';
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
          <LanguageSwitcher
            className={styles.languageSwitcher}
            labelClassName={styles.languageSwitcherLabel}
            optionClassName={styles.languageSwitcherOption}
            optionActiveClassName={styles.languageSwitcherOptionActive}
          />
        </nav>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>{marketplaceMessages.heroEyebrow}</p>
            <h1>{marketplaceMessages.heroTitle}</h1>
            <p className={styles.lead}>{marketplaceMessages.heroLead}</p>
            <div className={styles.ctaRow}>
              <Link
                className={`${styles.ctaLink} ${styles.ctaPrimary}`}
                href="/app/marketplace"
              >
                {marketplaceMessages.openWorkspace}
              </Link>
              <Link
                className={`${styles.ctaLink} ${styles.ctaSecondary}`}
                href="/app/new-contract"
              >
                {marketplaceMessages.directContractPath}
              </Link>
            </div>
          </div>
          <div className={styles.cardStack}>
            <article className={styles.statCard}>
              <strong>
                {marketplaceMessages.stats.visibleTalentTitle(profiles.length)}
              </strong>
              <p>{marketplaceMessages.stats.visibleTalentBody}</p>
            </article>
            <article className={styles.statCard}>
              <strong>
                {marketplaceMessages.stats.openBriefsTitle(opportunities.length)}
              </strong>
              <p>{marketplaceMessages.stats.openBriefsBody}</p>
            </article>
            <article className={styles.statCard}>
              <strong>{marketplaceMessages.stats.escrowCloseTitle}</strong>
              <p>{marketplaceMessages.stats.escrowCloseBody}</p>
            </article>
          </div>
        </section>

        {error ? (
          <section className={styles.section}>
            <h2>{marketplaceMessages.loadFailure}</h2>
            <p>{error}</p>
          </section>
        ) : null}

        <section className={styles.section}>
          <h2>{marketplaceMessages.featuredTalentTitle}</h2>
          <div className={styles.steps}>
            {profiles.length === 0 ? (
              <article className={styles.stepCard}>
                <strong>{marketplaceMessages.noProfilesTitle}</strong>
                <p>{marketplaceMessages.noProfilesBody}</p>
              </article>
            ) : (
              profiles.map((profile) => (
                <article key={profile.userId} className={styles.stepCard}>
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
                </article>
              ))
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h2>{marketplaceMessages.openOpportunitiesTitle}</h2>
          <div className={styles.steps}>
            {opportunities.length === 0 ? (
              <article className={styles.stepCard}>
                <strong>{marketplaceMessages.noOpportunitiesTitle}</strong>
                <p>{marketplaceMessages.noOpportunitiesBody}</p>
              </article>
            ) : (
              opportunities.map((opportunity) => (
                <article key={opportunity.id} className={styles.stepCard}>
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
                </article>
              ))
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h2>{marketplaceMessages.expansionTitle}</h2>
          <div className={styles.objectionGrid}>
            {marketplaceMessages.expansionCards.map((card) => (
              <article key={card.title} className={styles.objectionCard}>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
