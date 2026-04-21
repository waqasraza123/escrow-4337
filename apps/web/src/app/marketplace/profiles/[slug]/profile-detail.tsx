'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Button,
  FactGrid,
  FactItem,
  PageContainer,
  PageTopBar,
  SectionCard,
  SectionHeading,
} from '@escrow4334/frontend-core';
import { RevealSection, SharedCard } from '@escrow4334/frontend-core/spatial';
import { AbuseReportPanel } from '../../abuse-report-panel';
import { ThemeToggle } from '../../../theme-toggle';
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
    <main className="min-h-screen">
      <PageContainer className="w-[min(1480px,calc(100vw-40px))]">
        <PageTopBar
          eyebrow={marketplaceMessages.profileDetail.topBarLabel}
          description={marketplaceMessages.profileDetail.topBarMeta}
          actions={
            <>
              <Button asChild variant="secondary">
                <Link href="/marketplace">
                  {marketplaceMessages.actions.backToMarketplace}
                </Link>
              </Button>
              <ThemeToggle />
              <Button asChild>
                <Link href="/app/marketplace">{marketplaceMessages.openWorkspace}</Link>
              </Button>
            </>
          }
        />

        {error ? (
          <SectionCard title={marketplaceMessages.profileDetail.unavailableTitle}>
            <p className="text-sm leading-6 text-[var(--foreground-soft)]">{error}</p>
          </SectionCard>
        ) : null}

        {!profile && !error ? (
          <SectionCard title={marketplaceMessages.profileDetail.loadingTitle} />
        ) : null}

        {profile ? (
          <>
            <RevealSection className="fx-fade-up grid items-start gap-7 overflow-hidden rounded-[2rem] border border-[var(--surface-border-strong)] bg-[image:var(--hero-bg)] p-8 shadow-[var(--surface-shadow-strong)] lg:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)]">
              <SectionHeading
                eyebrow={marketplaceMessages.profileDetail.heroEyebrow}
                title={profile.displayName}
                titleClassName="max-w-[9.8ch] text-[clamp(3rem,6vw,5.8rem)] leading-[0.9]"
                description={profile.headline}
                descriptionClassName="text-[1.04rem] leading-7 text-[var(--foreground-soft)]"
              />
              <SharedCard
                className="rounded-[1.9rem] bg-[image:var(--card-strong-bg)] p-6"
                layoutId={`marketplace-profile-${profile.slug}`}
              >
                <FactGrid className="md:grid-cols-1">
                  <FactItem
                    label={marketplaceMessages.profileDetail.verification}
                    value={
                      marketplaceMessages.labels.verificationLevel[
                        profile.verificationLevel
                      ]
                    }
                  />
                  <FactItem
                    label={marketplaceMessages.profileDetail.cryptoReadiness}
                    value={
                      marketplaceMessages.labels.cryptoReadiness[
                        profile.cryptoReadiness
                      ]
                    }
                  />
                  <FactItem
                    label={marketplaceMessages.profileDetail.completedEscrowJobs}
                    value={profile.completedEscrowCount}
                  />
                </FactGrid>
              </SharedCard>
            </RevealSection>

            <RevealSection className="fx-fade-up fx-fade-up-delay-1 grid gap-5 xl:grid-cols-2" delay={0.08}>
              <SectionCard
                eyebrow={marketplaceMessages.profileDetail.aboutEyebrow}
                title={marketplaceMessages.profileDetail.credibilityTitle}
                className="rounded-[1.9rem] bg-[var(--panel-bg)] p-7"
                headerClassName="mb-5"
              >
                <p className="text-sm leading-6 text-[var(--foreground-soft)]">{profile.bio}</p>
                <FactGrid>
                  <FactItem
                    label={marketplaceMessages.profileDetail.skills}
                    value={profile.skills.join(' • ')}
                  />
                  <FactItem
                    label={marketplaceMessages.profileDetail.specialties}
                    value={
                      profile.specialties.join(' • ') ||
                      marketplaceMessages.profileDetail.noneListed
                    }
                  />
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
                </FactGrid>
              </SectionCard>

              <SectionCard
                eyebrow={marketplaceMessages.profileDetail.escrowSignalEyebrow}
                title={marketplaceMessages.profileDetail.executionTitle}
                className="rounded-[1.9rem] bg-[var(--panel-bg)] p-7"
                headerClassName="mb-5"
              >
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
                <div className="grid gap-3">
                  <span className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
                    {marketplaceMessages.profileDetail.completedByCategory}
                  </span>
                  {profile.escrowStats.completedByCategory.length === 0 ? (
                    <p className="text-sm leading-6 text-[var(--foreground-soft)]">
                      {marketplaceMessages.profileDetail.noEscrowHistory}
                    </p>
                  ) : (
                    profile.escrowStats.completedByCategory.map((entry) => (
                      <p
                        key={entry.category}
                        className="text-sm leading-6 text-[var(--foreground-soft)]"
                      >
                        {entry.category}: {entry.count}
                      </p>
                    ))
                  )}
                </div>
              </SectionCard>
            </RevealSection>

            <RevealSection className="fx-fade-up fx-fade-up-delay-2 grid gap-5 xl:grid-cols-2" delay={0.12}>
              <SectionCard
                eyebrow={marketplaceMessages.profileDetail.trustEyebrow}
                title={marketplaceMessages.profileDetail.trustTitle}
                className="rounded-[1.9rem] bg-[var(--panel-bg)] p-7"
                headerClassName="mb-5"
              >
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
              </SectionCard>

              <SectionCard
                eyebrow={marketplaceMessages.profileDetail.trustEyebrow}
                title={marketplaceMessages.profileDetail.recentReviews}
                className="rounded-[1.9rem] bg-[var(--panel-bg)] p-7"
                headerClassName="mb-5"
              >
                <div className="grid gap-4">
                  {profile.publicReviews.length === 0 ? (
                    <p className="text-sm leading-6 text-[var(--foreground-soft)]">
                      {marketplaceMessages.profileDetail.noReviews}
                    </p>
                  ) : (
                    profile.publicReviews.map((review) => (
                      <article
                        key={review.id}
                        className="rounded-[1.25rem] border border-[var(--surface-border)] bg-[var(--card-bg)] p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
                          {review.reviewer.displayName} • {formatRating(review.rating)}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                          {review.headline ?? marketplaceMessages.profileDetail.recentReviews}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">
                          {review.body ?? ''}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </SectionCard>
            </RevealSection>

            <RevealSection className="fx-fade-up fx-fade-up-delay-3 grid gap-5 xl:grid-cols-2" delay={0.16}>
              <SectionCard
                eyebrow={marketplaceMessages.profileDetail.proofEyebrow}
                title={marketplaceMessages.profileDetail.walletAndProofTitle}
                className="rounded-[1.9rem] bg-[var(--panel-bg)] p-7"
                headerClassName="mb-5"
              >
                <FactItem
                  label={marketplaceMessages.profileDetail.verifiedWallet}
                  value={
                    profile.verifiedWalletAddress ??
                    marketplaceMessages.profileDetail.noVerifiedWallet
                  }
                  dir="ltr"
                />
                <div className="grid gap-2">
                  {profile.proofArtifacts.map((artifact) => (
                    <a
                      key={artifact.id}
                      href={artifact.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm leading-6 text-[var(--foreground)] underline decoration-[var(--status-info-border)] underline-offset-4"
                    >
                      {artifact.label} •{' '}
                      {marketplaceMessages.labels.proofArtifactKind[artifact.kind]}
                    </a>
                  ))}
                </div>
              </SectionCard>

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
