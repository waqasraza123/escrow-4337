'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '../../page.module.css';
import { webApi, type MarketplaceProfile } from '../../../../lib/api';

type ProfileDetailProps = {
  slug: string;
};

export function MarketplaceProfileDetail({ slug }: ProfileDetailProps) {
  const [profile, setProfile] = useState<MarketplaceProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void webApi
      .getMarketplaceProfile(slug)
      .then((response: { profile: MarketplaceProfile }) => {
        if (active) {
          setProfile(response.profile);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : 'Failed to load profile',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <main className={styles.page}>
      <div className={styles.console}>
        <div className={styles.topBar}>
          <div className={styles.topBarContent}>
            <span className={styles.topBarLabel}>Marketplace profile</span>
            <p className={styles.topBarMeta}>Public contractor detail and escrow signal.</p>
          </div>
          <div className={styles.inlineActions}>
            <Link href="/marketplace">Back to marketplace</Link>
            <Link href="/app/marketplace">Open workspace</Link>
          </div>
        </div>

        {error ? (
          <section className={styles.panel}>
            <h2>Profile unavailable</h2>
            <p className={styles.stateText}>{error}</p>
          </section>
        ) : null}

        {!profile && !error ? (
          <section className={styles.panel}>
            <h2>Loading profile…</h2>
          </section>
        ) : null}

        {profile ? (
          <>
            <section className={styles.hero}>
              <div>
                <p className={styles.eyebrow}>Talent profile</p>
                <h1>{profile.displayName}</h1>
                <p className={styles.heroCopy}>{profile.headline}</p>
              </div>
              <div className={styles.heroCard}>
                <div>
                  <span className={styles.metaLabel}>Availability</span>
                  <strong>{profile.availability}</strong>
                </div>
                <div>
                  <span className={styles.metaLabel}>Timezone</span>
                  <strong>{profile.timezone}</strong>
                </div>
                <div>
                  <span className={styles.metaLabel}>Completed escrow jobs</span>
                  <strong>{profile.completedEscrowCount}</strong>
                </div>
              </div>
            </section>

            <section className={styles.grid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>About</span>
                    <h2>Profile summary</h2>
                  </div>
                </div>
                <p className={styles.stateText}>{profile.bio}</p>
                <div className={styles.summaryGrid}>
                  <article>
                    <span className={styles.metaLabel}>Skills</span>
                    <strong>{profile.skills.join(' • ')}</strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>Rate range</span>
                    <strong>
                      {profile.rateMin || profile.rateMax
                        ? `${profile.rateMin ?? '—'} to ${profile.rateMax ?? '—'}`
                        : 'Not listed'}
                    </strong>
                  </article>
                </div>
              </article>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>Proof</span>
                    <h2>Public signal</h2>
                  </div>
                </div>
                <div className={styles.stack}>
                  <div>
                    <span className={styles.metaLabel}>Verified wallet</span>
                    <strong>{profile.verifiedWalletAddress ?? 'No verified wallet published'}</strong>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>Portfolio links</span>
                    <div className={styles.stack}>
                      {profile.portfolioUrls.map((url: string) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer">
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
