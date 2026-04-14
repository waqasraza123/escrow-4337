'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '../../../page.module.css';
import { AbuseReportPanel } from '../../abuse-report-panel';
import { webApi, type MarketplaceProfile } from '../../../../lib/api';
import { useWebI18n } from '../../../../lib/i18n';

type ProfileDetailProps = {
  slug: string;
};

function formatPercent(value: number) {
  return `${value}%`;
}

export function MarketplaceProfileDetail({ slug }: ProfileDetailProps) {
  const { messages } = useWebI18n();
  const marketplaceMessages = messages.publicMarketplace;
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
            loadError instanceof Error && loadError.message.trim().length > 0
              ? marketplaceMessages.profileDetail.unavailableBody
              : marketplaceMessages.profileDetail.unavailableBody,
          );
        }
      });

    return () => {
      active = false;
    };
  }, [slug, marketplaceMessages.profileDetail.unavailableBody]);

  return (
    <main className={styles.page}>
      <div className={styles.console}>
        <div className={styles.topBar}>
          <div className={styles.topBarContent}>
            <span className={styles.topBarLabel}>
              {marketplaceMessages.profileDetail.topBarLabel}
            </span>
            <p className={styles.topBarMeta}>{marketplaceMessages.profileDetail.topBarMeta}</p>
          </div>
          <div className={styles.inlineActions}>
            <Link
              className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
              href="/marketplace"
            >
              {marketplaceMessages.actions.backToMarketplace}
            </Link>
            <Link
              className={`${styles.actionLink} ${styles.actionLinkPrimary}`}
              href="/app/marketplace"
            >
              {marketplaceMessages.openWorkspace}
            </Link>
          </div>
        </div>

        {error ? (
          <section className={styles.panel}>
            <h2>{marketplaceMessages.profileDetail.unavailableTitle}</h2>
            <p className={styles.stateText}>{error}</p>
          </section>
        ) : null}

        {!profile && !error ? (
          <section className={styles.panel}>
            <h2>{marketplaceMessages.profileDetail.loadingTitle}</h2>
          </section>
        ) : null}

        {profile ? (
          <>
            <section className={styles.hero}>
              <div>
                <p className={styles.eyebrow}>
                  {marketplaceMessages.profileDetail.heroEyebrow}
                </p>
                <h1>{profile.displayName}</h1>
                <p className={styles.heroCopy}>{profile.headline}</p>
              </div>
              <div className={styles.heroCard}>
                <div>
                  <span className={styles.metaLabel}>
                    {marketplaceMessages.profileDetail.verification}
                  </span>
                  <strong>
                    {marketplaceMessages.labels.verificationLevel[
                      profile.verificationLevel
                    ]}
                  </strong>
                </div>
                <div>
                  <span className={styles.metaLabel}>
                    {marketplaceMessages.profileDetail.cryptoReadiness}
                  </span>
                  <strong>
                    {marketplaceMessages.labels.cryptoReadiness[profile.cryptoReadiness]}
                  </strong>
                </div>
                <div>
                  <span className={styles.metaLabel}>
                    {marketplaceMessages.profileDetail.completedEscrowJobs}
                  </span>
                  <strong>{profile.completedEscrowCount}</strong>
                </div>
              </div>
            </section>

            <section className={styles.grid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>
                      {marketplaceMessages.profileDetail.aboutEyebrow}
                    </span>
                    <h2>{marketplaceMessages.profileDetail.credibilityTitle}</h2>
                  </div>
                </div>
                <p className={styles.stateText}>{profile.bio}</p>
                <div className={styles.summaryGrid}>
                  <article>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.profileDetail.skills}
                    </span>
                    <strong>{profile.skills.join(' • ')}</strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.profileDetail.specialties}
                    </span>
                    <strong>
                      {profile.specialties.join(' • ') ||
                        marketplaceMessages.profileDetail.noneListed}
                    </strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.profileDetail.preferredEngagements}
                    </span>
                    <strong>
                      {profile.preferredEngagements.length > 0
                        ? profile.preferredEngagements
                            .map(
                              (engagement) =>
                                marketplaceMessages.labels.engagementType[engagement],
                            )
                            .join(' • ')
                        : marketplaceMessages.profileDetail.noneListed}
                    </strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.profileDetail.rateRange}
                    </span>
                    <strong className={styles.ltrValue} data-ltr="true">
                      {profile.rateMin || profile.rateMax
                        ? `${profile.rateMin ?? '—'} to ${profile.rateMax ?? '—'}`
                        : marketplaceMessages.profileDetail.notListed}
                    </strong>
                  </article>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>
                      {marketplaceMessages.profileDetail.escrowSignalEyebrow}
                    </span>
                    <h2>{marketplaceMessages.profileDetail.executionTitle}</h2>
                  </div>
                </div>
                <div className={styles.summaryGrid}>
                  <article>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.profileDetail.completionRate}
                    </span>
                    <strong>{formatPercent(profile.escrowStats.completionRate)}</strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.profileDetail.disputeRate}
                    </span>
                    <strong>{formatPercent(profile.escrowStats.disputeRate)}</strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.profileDetail.onTimeDelivery}
                    </span>
                    <strong>{formatPercent(profile.escrowStats.onTimeDeliveryRate)}</strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.profileDetail.averageContractBand}
                    </span>
                    <strong>
                      {
                        marketplaceMessages.labels.averageContractValueBand[
                          profile.escrowStats.averageContractValueBand
                        ]
                      }
                    </strong>
                  </article>
                </div>
                <div className={styles.stack}>
                  <span className={styles.metaLabel}>
                    {marketplaceMessages.profileDetail.completedByCategory}
                  </span>
                  {profile.escrowStats.completedByCategory.length === 0 ? (
                    <p className={styles.stateText}>
                      {marketplaceMessages.profileDetail.noEscrowHistory}
                    </p>
                  ) : (
                    profile.escrowStats.completedByCategory.map((entry) => (
                      <p key={entry.category} className={styles.stateText}>
                        {entry.category}: {entry.count}
                      </p>
                    ))
                  )}
                </div>
              </article>
            </section>

            <section className={styles.grid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>
                      {marketplaceMessages.profileDetail.proofEyebrow}
                    </span>
                    <h2>{marketplaceMessages.profileDetail.walletAndProofTitle}</h2>
                  </div>
                </div>
                <div className={styles.stack}>
                  <div>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.profileDetail.verifiedWallet}
                    </span>
                    <strong className={styles.ltrValue} data-ltr="true">
                      {profile.verifiedWalletAddress ??
                        marketplaceMessages.profileDetail.noVerifiedWallet}
                    </strong>
                  </div>
                  <div className={styles.linkList}>
                    {profile.proofArtifacts.map((artifact) => (
                      <a key={artifact.id} href={artifact.url} target="_blank" rel="noreferrer">
                        {artifact.label} •{' '}
                        {marketplaceMessages.labels.proofArtifactKind[artifact.kind]}
                      </a>
                    ))}
                  </div>
                </div>
              </article>

              <AbuseReportPanel
                subjectLabel={profile.displayName}
                onSubmit={(input, accessToken) =>
                  webApi.reportMarketplaceProfile(slug, input, accessToken).then(
                    () => undefined,
                  )
                }
              />
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
