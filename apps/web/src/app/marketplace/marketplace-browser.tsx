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

        setError(loadError instanceof Error ? loadError.message : 'Failed to load marketplace');
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <strong className={styles.brand}>{messages.common.brand}</strong>
          <div className={styles.navLinks}>
            <Link href="/">{messages.common.home}</Link>
            <Link href="/trust">{messages.common.trust}</Link>
            <Link href="/app/marketplace">Marketplace workspace</Link>
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
            <p className={styles.eyebrow}>Escrow-first marketplace</p>
            <h1>Hire through curated briefs and convert the winner into escrow.</h1>
            <p className={styles.lead}>
              Browse verified talent, publish private or public briefs, and move the
              selected application straight into the existing milestone escrow flow.
            </p>
            <div className={styles.ctaRow}>
              <Link href="/app/marketplace">Open workspace</Link>
              <Link className={styles.secondaryLink} href="/app/new-contract">
                Direct contract path
              </Link>
            </div>
          </div>
          <div className={styles.cardStack}>
            <article className={styles.statCard}>
              <strong>{profiles.length} visible talent profiles</strong>
              <p>Profiles only appear after they are complete and moderation-visible.</p>
            </article>
            <article className={styles.statCard}>
              <strong>{opportunities.length} open briefs</strong>
              <p>Public briefs are browseable; private briefs are still direct-linkable.</p>
            </article>
            <article className={styles.statCard}>
              <strong>One hire closes into one escrow contract</strong>
              <p>The marketplace is a sourcing layer, not a separate settlement path.</p>
            </article>
          </div>
        </section>

        {error ? (
          <section className={styles.section}>
            <h2>Marketplace feed unavailable</h2>
            <p>{error}</p>
          </section>
        ) : null}

        <section className={styles.section}>
          <h2>Featured talent</h2>
          <div className={styles.steps}>
            {profiles.length === 0 ? (
              <article className={styles.stepCard}>
                <strong>No public talent profiles yet</strong>
                <p>Profiles appear here after contractors complete them in the marketplace workspace.</p>
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
                    {profile.verifiedWalletAddress ? ' • verified wallet' : ''}
                  </p>
                  <Link className={styles.cardLink} href={`/marketplace/profiles/${profile.slug}`}>
                    View profile
                  </Link>
                </article>
              ))
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Open opportunities</h2>
          <div className={styles.steps}>
            {opportunities.length === 0 ? (
              <article className={styles.stepCard}>
                <strong>No public briefs yet</strong>
                <p>Clients can publish briefs from the authenticated marketplace workspace.</p>
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
                    View brief
                  </Link>
                </article>
              ))
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h2>How this expands the product</h2>
          <div className={styles.objectionGrid}>
            <article className={styles.objectionCard}>
              <strong>Discovery before contract creation</strong>
              <p>Clients can now source talent through profiles, public briefs, and applications before they create escrow.</p>
            </article>
            <article className={styles.objectionCard}>
              <strong>Still escrow-first</strong>
              <p>The selected application closes into the same milestone escrow workflow, dispute flow, and operator review path.</p>
            </article>
            <article className={styles.objectionCard}>
              <strong>Useful without becoming spammy</strong>
              <p>This is curated-brief matching, not an open bid wall, so it stays closer to startup hiring and closer to the current trust model.</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
