'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '../../page.module.css';
import {
  webApi,
  type MarketplaceOpportunityDetail,
} from '../../../../lib/api';

type OpportunityDetailProps = {
  id: string;
};

export function MarketplaceOpportunityDetail({ id }: OpportunityDetailProps) {
  const [opportunity, setOpportunity] = useState<MarketplaceOpportunityDetail | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void webApi
      .getMarketplaceOpportunity(id)
      .then((response: { opportunity: MarketplaceOpportunityDetail }) => {
        if (active) {
          setOpportunity(response.opportunity);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : 'Failed to load opportunity',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <main className={styles.page}>
      <div className={styles.console}>
        <div className={styles.topBar}>
          <div className={styles.topBarContent}>
            <span className={styles.topBarLabel}>Marketplace opportunity</span>
            <p className={styles.topBarMeta}>Public brief detail before escrow conversion.</p>
          </div>
          <div className={styles.inlineActions}>
            <Link href="/marketplace">Back to marketplace</Link>
            <Link href="/app/marketplace">Open workspace</Link>
          </div>
        </div>

        {error ? (
          <section className={styles.panel}>
            <h2>Opportunity unavailable</h2>
            <p className={styles.stateText}>{error}</p>
          </section>
        ) : null}

        {!opportunity && !error ? (
          <section className={styles.panel}>
            <h2>Loading brief…</h2>
          </section>
        ) : null}

        {opportunity ? (
          <>
            <section className={styles.hero}>
              <div>
                <p className={styles.eyebrow}>{opportunity.visibility} brief</p>
                <h1>{opportunity.title}</h1>
                <p className={styles.heroCopy}>{opportunity.summary}</p>
              </div>
              <div className={styles.heroCard}>
                <div>
                  <span className={styles.metaLabel}>Client</span>
                  <strong>{opportunity.owner.displayName}</strong>
                </div>
                <div>
                  <span className={styles.metaLabel}>Applications</span>
                  <strong>{opportunity.applicationCount}</strong>
                </div>
                <div>
                  <span className={styles.metaLabel}>Escrow readiness</span>
                  <strong>{opportunity.escrowReadiness}</strong>
                </div>
              </div>
            </section>

            <section className={styles.grid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>Brief</span>
                    <h2>Scope</h2>
                  </div>
                </div>
                <p className={styles.stateText}>{opportunity.description}</p>
                <div className={styles.summaryGrid}>
                  <article>
                    <span className={styles.metaLabel}>Category</span>
                    <strong>{opportunity.category}</strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>Timeline</span>
                    <strong>{opportunity.timeline}</strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>Budget</span>
                    <strong>
                      {opportunity.budgetMin || opportunity.budgetMax
                        ? `${opportunity.budgetMin ?? '—'} to ${opportunity.budgetMax ?? '—'}`
                        : 'Not specified'}
                    </strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>Settlement token</span>
                    <strong>{opportunity.currencyAddress}</strong>
                  </article>
                </div>
              </article>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>Fit</span>
                    <h2>Required skills</h2>
                  </div>
                </div>
                <div className={styles.stack}>
                  <p className={styles.stateText}>{opportunity.requiredSkills.join(' • ')}</p>
                  <Link href="/app/marketplace">Apply from workspace</Link>
                </div>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
