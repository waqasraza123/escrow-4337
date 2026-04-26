'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  FactGrid,
  FactItem,
  PageContainer,
  SectionHeading,
} from '@escrow4334/frontend-core';
import { RevealSection } from '@escrow4334/frontend-core/spatial';
import { AbuseReportPanel } from '../../abuse-report-panel';
import styles from '../../../marketing.styles';
import {
  ProfileDetailScene,
  PublicSceneFrame,
  TalentCategoryGlyph,
} from '../../../public-visuals';
import { PublicMarketplaceNav } from '../../public-marketplace-nav';
import { webApi, type MarketplaceProfile } from '../../../../lib/api';
import { useWebI18n } from '../../../../lib/i18n';

type ProfileDetailProps = {
  slug: string;
};

function formatPercent(value: number) {
  return `${value}%`;
}

function formatRating(value: number | null) {
  return value === null ? '—' : `${value.toFixed(1)} / 5`;
}

function resolveProfileGlyph(profile: MarketplaceProfile) {
  const haystack = [
    profile.headline,
    ...profile.specialties,
    ...profile.skills,
  ]
    .join(' ')
    .toLowerCase();

  if (haystack.includes('design')) {
    return 'design';
  }
  if (
    haystack.includes('growth') ||
    haystack.includes('seo') ||
    haystack.includes('marketing')
  ) {
    return 'growth';
  }
  return 'engineering';
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
          void webApi.recordMarketplaceInteraction({
            surface: 'public_marketplace',
            entityType: 'profile',
            eventType: 'detail_view',
            entityId: response.profile.userId,
            searchKind: 'talent',
            queryLabel: slug,
            timezone: response.profile.timezone,
            skillTags: response.profile.skills.slice(0, 6),
          });
        }
      })
      .catch(() => {
        if (active) {
          setError(marketplaceMessages.profileDetail.unavailableBody);
        }
      });

    return () => {
      active = false;
    };
  }, [slug, marketplaceMessages.profileDetail.unavailableBody]);

  return (
    <main className={styles.page}>
      <PageContainer className={styles.shell}>
        <PublicMarketplaceNav />

        {error ? (
          <section className={styles.section}>
            <SectionHeading
              eyebrow={marketplaceMessages.profileDetail.topBarLabel}
              title={marketplaceMessages.profileDetail.unavailableTitle}
              description={error}
            />
          </section>
        ) : null}

        {!profile && !error ? (
          <section className={styles.section}>
            <SectionHeading
              eyebrow={marketplaceMessages.profileDetail.topBarLabel}
              title={marketplaceMessages.profileDetail.loadingTitle}
            />
          </section>
        ) : null}

        {profile ? (
          <>
            <RevealSection className={styles.hero}>
              <div className={`${styles.heroContent} fx-fade-up`}>
                <SectionHeading
                  eyebrow={
                    <span className={styles.eyebrow}>
                      {marketplaceMessages.profileDetail.heroEyebrow}
                    </span>
                  }
                  title={profile.displayName}
                  titleClassName={`${styles.heroHeadingTitleTone} max-w-[10ch] text-[clamp(2.9rem,6vw,5.6rem)] leading-[0.92]`}
                  description={profile.headline}
                  descriptionClassName={styles.heroHeadingDescription}
                />
                <p className={styles.lead}>{profile.bio}</p>
                <div className={styles.ctaRow}>
                  <Button
                    asChild
                    className={`${styles.ctaLink} ${styles.ctaPrimary}`}
                  >
                    <Link href="/app/marketplace">
                      {marketplaceMessages.openWorkspace}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className={`${styles.ctaLink} ${styles.ctaSecondary}`}
                    variant="secondary"
                  >
                    <Link href="/marketplace">
                      {marketplaceMessages.actions.backToMarketplace}
                    </Link>
                  </Button>
                </div>
                <div className={styles.heroBadgeRow}>
                  <Badge tone="success">
                    {
                      marketplaceMessages.labels.verificationLevel[
                        profile.verificationLevel
                      ]
                    }
                  </Badge>
                  <Badge tone="neutral">
                    {
                      marketplaceMessages.labels.cryptoReadiness[
                        profile.cryptoReadiness
                      ]
                    }
                  </Badge>
                  <Badge tone="neutral">
                    {marketplaceMessages.results.escrowJobs(
                      profile.completedEscrowCount,
                    )}
                  </Badge>
                </div>
              </div>

              <div className={`${styles.heroIllustrationShell} fx-fade-up fx-fade-up-delay-1`}>
                <PublicSceneFrame accent="market">
                  <ProfileDetailScene />
                </PublicSceneFrame>
                <div className={styles.heroIllustrationMeta}>
                  <div className={styles.heroIllustrationCard}>
                    <span className={styles.heroIllustrationLabel}>
                      {marketplaceMessages.profileDetail.verification}
                    </span>
                    <div>
                      {
                        marketplaceMessages.labels.verificationLevel[
                          profile.verificationLevel
                        ]
                      }
                    </div>
                  </div>
                  <div className={styles.heroIllustrationCard}>
                    <span className={styles.heroIllustrationLabel}>
                      {marketplaceMessages.profileDetail.rateRange}
                    </span>
                    <div dir="ltr">
                      {profile.rateMin || profile.rateMax
                        ? `${profile.rateMin ?? '—'} to ${profile.rateMax ?? '—'}`
                        : marketplaceMessages.profileDetail.notListed}
                    </div>
                  </div>
                  <div className={styles.heroIllustrationCard}>
                    <span className={styles.heroIllustrationLabel}>
                      {marketplaceMessages.profileDetail.timezone}
                    </span>
                    <div>{profile.timezone || marketplaceMessages.profileDetail.notListed}</div>
                  </div>
                  <div className={styles.heroIllustrationCard}>
                    <span className={styles.heroIllustrationLabel}>
                      {marketplaceMessages.profileDetail.completedEscrowJobs}
                    </span>
                    <div>{profile.completedEscrowCount}</div>
                  </div>
                </div>
              </div>
            </RevealSection>

            <RevealSection className={`${styles.section} fx-fade-up fx-fade-up-delay-1`} delay={0.08}>
              <SectionHeading
                eyebrow={marketplaceMessages.profileDetail.aboutEyebrow}
                title={marketplaceMessages.profileDetail.credibilityTitle}
                description={profile.bio}
              />
              <div className={styles.resultHeader}>
                <div className={styles.resultGlyphWrap}>
                  <TalentCategoryGlyph kind={resolveProfileGlyph(profile)} />
                </div>
                <div className={styles.resultHeaderCopy}>
                  <span className={styles.resultKicker}>
                    {marketplaceMessages.results.kickerTalent}
                  </span>
                  <strong className={styles.resultTitle}>{profile.headline}</strong>
                  <p className={styles.resultSummary}>
                    {
                      marketplaceMessages.labels.availability[
                        profile.availability
                      ]
                    }{' '}
                    •{' '}
                    {
                      marketplaceMessages.labels.cryptoReadiness[
                        profile.cryptoReadiness
                      ]
                    }
                  </p>
                </div>
              </div>
              <div className={styles.chipRow}>
                {profile.skills.map((skill) => (
                  <span key={skill} className={styles.chip}>
                    {skill}
                  </span>
                ))}
                {profile.specialties.map((specialty) => (
                  <span key={specialty} className={styles.resultMetaChip}>
                    {specialty}
                  </span>
                ))}
              </div>
              <FactGrid>
                <FactItem
                  label={marketplaceMessages.profileDetail.preferredEngagements}
                  value={
                    profile.preferredEngagements.length > 0
                      ? profile.preferredEngagements
                          .map(
                            (engagement) =>
                              marketplaceMessages.labels.engagementType[engagement],
                          )
                          .join(' • ')
                      : marketplaceMessages.profileDetail.noneListed
                  }
                />
                <FactItem
                  label={marketplaceMessages.profileDetail.rateRange}
                  value={
                    profile.rateMin || profile.rateMax
                      ? `${profile.rateMin ?? '—'} to ${profile.rateMax ?? '—'}`
                      : marketplaceMessages.profileDetail.notListed
                  }
                  dir="ltr"
                />
                <FactItem
                  label={marketplaceMessages.profileDetail.availability}
                  value={
                    marketplaceMessages.labels.availability[profile.availability]
                  }
                />
                <FactItem
                  label={marketplaceMessages.profileDetail.timezone}
                  value={profile.timezone || marketplaceMessages.profileDetail.notListed}
                />
              </FactGrid>
            </RevealSection>

            <RevealSection className="fx-fade-up fx-fade-up-delay-2 grid gap-5 xl:grid-cols-2" delay={0.12}>
              <section className={styles.section}>
                <SectionHeading
                  eyebrow={marketplaceMessages.profileDetail.escrowSignalEyebrow}
                  title={marketplaceMessages.profileDetail.executionTitle}
                />
                <FactGrid>
                  <FactItem
                    label={marketplaceMessages.profileDetail.completionRate}
                    value={formatPercent(profile.escrowStats.completionRate)}
                  />
                  <FactItem
                    label={marketplaceMessages.profileDetail.disputeRate}
                    value={formatPercent(profile.escrowStats.disputeRate)}
                  />
                  <FactItem
                    label={marketplaceMessages.profileDetail.onTimeDelivery}
                    value={formatPercent(profile.escrowStats.onTimeDeliveryRate)}
                  />
                  <FactItem
                    label={marketplaceMessages.profileDetail.averageContractBand}
                    value={
                      marketplaceMessages.labels.averageContractValueBand[
                        profile.escrowStats.averageContractValueBand
                      ]
                    }
                  />
                </FactGrid>
                <div className={styles.chipRow}>
                  {profile.escrowStats.completedByCategory.length === 0 ? (
                    <span className={styles.resultMetaChip}>
                      {marketplaceMessages.profileDetail.noEscrowHistory}
                    </span>
                  ) : (
                    profile.escrowStats.completedByCategory.map((entry) => (
                      <span key={entry.category} className={styles.resultMetaChip}>
                        {entry.category}: {entry.count}
                      </span>
                    ))
                  )}
                </div>
              </section>

              <section className={styles.section}>
                <SectionHeading
                  eyebrow={marketplaceMessages.profileDetail.trustEyebrow}
                  title={marketplaceMessages.profileDetail.trustTitle}
                />
                <FactGrid>
                  <FactItem
                    label={marketplaceMessages.profileDetail.averageRating}
                    value={formatRating(profile.reputation.averageRating)}
                  />
                  <FactItem
                    label={marketplaceMessages.profileDetail.publicReviewCount}
                    value={profile.reputation.publicReviewCount}
                  />
                  <FactItem
                    label={marketplaceMessages.profileDetail.identityConfidence}
                    value={
                      marketplaceMessages.labels.identityConfidence[
                        profile.reputation.identityConfidence
                      ]
                    }
                  />
                  <FactItem
                    label={marketplaceMessages.profileDetail.responseRate}
                    value={
                      profile.reputation.responseRate === null
                        ? '—'
                        : formatPercent(profile.reputation.responseRate)
                    }
                  />
                  <FactItem
                    label={marketplaceMessages.profileDetail.inviteAcceptanceRate}
                    value={
                      profile.reputation.inviteAcceptanceRate === null
                        ? '—'
                        : formatPercent(profile.reputation.inviteAcceptanceRate)
                    }
                  />
                  <FactItem
                    label={marketplaceMessages.profileDetail.revisionRate}
                    value={
                      profile.reputation.revisionRate === null
                        ? '—'
                        : formatPercent(profile.reputation.revisionRate)
                    }
                  />
                </FactGrid>
              </section>
            </RevealSection>

            <RevealSection className="fx-fade-up fx-fade-up-delay-3 grid gap-5 xl:grid-cols-2" delay={0.16}>
              <section className={styles.section}>
                <SectionHeading
                  eyebrow={marketplaceMessages.profileDetail.trustEyebrow}
                  title={marketplaceMessages.profileDetail.recentReviews}
                />
                <div className={styles.cardStack}>
                  {profile.publicReviews.length === 0 ? (
                    <article className={styles.resultCard}>
                      <strong className={styles.resultTitle}>
                        {marketplaceMessages.profileDetail.noReviews}
                      </strong>
                    </article>
                  ) : (
                    profile.publicReviews.map((review) => (
                      <article key={review.id} className={styles.resultCard}>
                        <div className={styles.resultHeaderCopy}>
                          <span className={styles.resultKicker}>
                            {review.reviewer.displayName} • {formatRating(review.rating)}
                          </span>
                          <strong className={styles.resultTitle}>
                            {review.headline ??
                              marketplaceMessages.profileDetail.recentReviews}
                          </strong>
                          <p className={styles.resultSummary}>{review.body ?? ''}</p>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className={styles.section}>
                <SectionHeading
                  eyebrow={marketplaceMessages.profileDetail.proofEyebrow}
                  title={marketplaceMessages.profileDetail.walletAndProofTitle}
                />
                <FactGrid className="md:grid-cols-1">
                  <FactItem
                    label={marketplaceMessages.profileDetail.verifiedWallet}
                    value={
                      profile.verifiedWalletAddress ??
                      marketplaceMessages.profileDetail.noVerifiedWallet
                    }
                    dir="ltr"
                  />
                </FactGrid>
                <div className={styles.cardStack}>
                  {profile.proofArtifacts.length === 0 ? (
                    <article className={styles.resultCard}>
                      <strong className={styles.resultTitle}>
                        {marketplaceMessages.profileDetail.noneListed}
                      </strong>
                    </article>
                  ) : (
                    profile.proofArtifacts.map((artifact) => (
                      <article key={artifact.id} className={styles.resultCard}>
                        <div className={styles.resultHeaderCopy}>
                          <span className={styles.resultKicker}>
                            {
                              marketplaceMessages.labels.proofArtifactKind[
                                artifact.kind
                              ]
                            }
                          </span>
                          <strong className={styles.resultTitle}>{artifact.label}</strong>
                        </div>
                        <a
                          href={artifact.url}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.cardLink}
                        >
                          {artifact.url}
                        </a>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </RevealSection>

            <RevealSection className="fx-fade-up fx-fade-up-delay-3 grid gap-5 xl:grid-cols-2" delay={0.2}>
              <section className={styles.section}>
                <SectionHeading
                  eyebrow={marketplaceMessages.heroEyebrow}
                  title={marketplaceMessages.heroTitle}
                  description={marketplaceMessages.results.talentBody}
                />
                <div className={styles.heroBadgeRow}>
                  {marketplaceMessages.heroBadges.map((badge) => (
                    <span key={badge} className={styles.heroBadge}>
                      {badge}
                    </span>
                  ))}
                </div>
              </section>

              <AbuseReportPanel
                subjectLabel={profile.displayName}
                onSubmit={(input, accessToken) =>
                  webApi.reportMarketplaceProfile(slug, input, accessToken).then(
                    () => undefined,
                  )
                }
              />
            </RevealSection>
          </>
        ) : null}
      </PageContainer>
    </main>
  );
}
