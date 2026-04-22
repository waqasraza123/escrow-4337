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
  formatTimestamp,
} from '@escrow4334/frontend-core';
import { RevealSection } from '@escrow4334/frontend-core/spatial';
import { AbuseReportPanel } from '../../abuse-report-panel';
import styles from '../../../marketing.styles';
import {
  OpportunityDetailScene,
  PublicSceneFrame,
  TalentCategoryGlyph,
} from '../../../public-visuals';
import { PublicMarketplaceNav } from '../../public-marketplace-nav';
import { webApi, type MarketplaceOpportunityDetail } from '../../../../lib/api';
import { useWebI18n } from '../../../../lib/i18n';

type OpportunityDetailProps = {
  id: string;
};

function formatRating(value: number | null) {
  return value === null ? '—' : `${value.toFixed(1)} / 5`;
}

function resolveOpportunityGlyph(opportunity: MarketplaceOpportunityDetail) {
  const haystack = [
    opportunity.category,
    opportunity.title,
    ...opportunity.requiredSkills,
  ]
    .join(' ')
    .toLowerCase();

  if (haystack.includes('design')) {
    return 'design';
  }
  if (
    haystack.includes('growth') ||
    haystack.includes('marketing') ||
    haystack.includes('content')
  ) {
    return 'growth';
  }
  return 'engineering';
}

export function MarketplaceOpportunityDetail({ id }: OpportunityDetailProps) {
  const { definition, messages } = useWebI18n();
  const marketplaceMessages = messages.publicMarketplace;
  const [opportunity, setOpportunity] = useState<MarketplaceOpportunityDetail | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const formatDateTime = (value: number | null) =>
    formatTimestamp(value, {
      fallback: marketplaceMessages.opportunityDetail.notSpecified,
      locale: definition.langTag,
    });

  useEffect(() => {
    let active = true;

    void webApi
      .getMarketplaceOpportunity(id)
      .then((response: { opportunity: MarketplaceOpportunityDetail }) => {
        if (active) {
          setOpportunity(response.opportunity);
          void webApi.recordMarketplaceInteraction({
            surface: 'public_marketplace',
            entityType: 'opportunity',
            eventType: 'detail_view',
            entityId: response.opportunity.id,
            searchKind: 'opportunity',
            queryLabel: response.opportunity.title,
            category: response.opportunity.category,
            skillTags: response.opportunity.requiredSkills.slice(0, 6),
          });
        }
      })
      .catch(() => {
        if (active) {
          setError(marketplaceMessages.opportunityDetail.unavailableBody);
        }
      });

    return () => {
      active = false;
    };
  }, [id, marketplaceMessages.opportunityDetail.unavailableBody]);

  return (
    <main className={styles.page}>
      <PageContainer className={styles.shell}>
        <PublicMarketplaceNav />

        {error ? (
          <section className={styles.section}>
            <SectionHeading
              eyebrow={marketplaceMessages.opportunityDetail.topBarLabel}
              title={marketplaceMessages.opportunityDetail.unavailableTitle}
              description={error}
            />
          </section>
        ) : null}

        {!opportunity && !error ? (
          <section className={styles.section}>
            <SectionHeading
              eyebrow={marketplaceMessages.opportunityDetail.topBarLabel}
              title={marketplaceMessages.opportunityDetail.loadingTitle}
            />
          </section>
        ) : null}

        {opportunity ? (
          <>
            <RevealSection className={styles.hero}>
              <div className={`${styles.heroContent} fx-fade-up`}>
                <SectionHeading
                  eyebrow={marketplaceMessages.opportunityDetail.briefEyebrow(
                    marketplaceMessages.labels.visibility[opportunity.visibility],
                  )}
                  title={opportunity.title}
                  titleClassName="max-w-[11ch] text-[clamp(2.9rem,6vw,5.6rem)] leading-[0.92]"
                  description={opportunity.summary}
                  descriptionClassName="text-[1.04rem] leading-7 text-[var(--foreground-soft)]"
                />
                <p className={styles.lead}>{opportunity.description}</p>
                <div className={styles.ctaRow}>
                  <Button
                    asChild
                    className={`${styles.ctaLink} ${styles.ctaPrimary}`}
                  >
                    <Link href="/app/marketplace">
                      {marketplaceMessages.actions.applyFromWorkspace}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className={`${styles.ctaLink} ${styles.ctaSecondary}`}
                    variant="secondary"
                  >
                    <Link href="/app/marketplace">
                      {marketplaceMessages.openWorkspace}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className={`${styles.ctaLink} ${styles.ctaTertiary}`}
                    variant="secondary"
                  >
                    <Link href="/marketplace">
                      {marketplaceMessages.actions.backToMarketplace}
                    </Link>
                  </Button>
                </div>
                <div className={styles.heroBadgeRow}>
                  <Badge tone="neutral">
                    {marketplaceMessages.labels.visibility[opportunity.visibility]}
                  </Badge>
                  <Badge tone="success">
                    {
                      marketplaceMessages.labels.escrowReadiness[
                        opportunity.escrowReadiness
                      ]
                    }
                  </Badge>
                  <Badge tone="neutral">
                    {marketplaceMessages.results.applications(
                      opportunity.applicationCount,
                    )}
                  </Badge>
                </div>
              </div>

              <div className={`${styles.heroIllustrationShell} fx-fade-up fx-fade-up-delay-1`}>
                <PublicSceneFrame accent="market">
                  <OpportunityDetailScene />
                </PublicSceneFrame>
                <div className={styles.heroIllustrationMeta}>
                  <div className={styles.heroIllustrationCard}>
                    <span className={styles.heroIllustrationLabel}>
                      {marketplaceMessages.opportunityDetail.client}
                    </span>
                    <div>{opportunity.owner.displayName}</div>
                  </div>
                  <div className={styles.heroIllustrationCard}>
                    <span className={styles.heroIllustrationLabel}>
                      {marketplaceMessages.opportunityDetail.applications}
                    </span>
                    <div>{opportunity.applicationCount}</div>
                  </div>
                  <div className={styles.heroIllustrationCard}>
                    <span className={styles.heroIllustrationLabel}>
                      {marketplaceMessages.opportunityDetail.timeline}
                    </span>
                    <div>{opportunity.timeline}</div>
                  </div>
                  <div className={styles.heroIllustrationCard}>
                    <span className={styles.heroIllustrationLabel}>
                      {marketplaceMessages.opportunityDetail.budget}
                    </span>
                    <div dir="ltr">
                      {opportunity.budgetMin || opportunity.budgetMax
                        ? `${opportunity.budgetMin ?? '—'} to ${opportunity.budgetMax ?? '—'}`
                        : marketplaceMessages.opportunityDetail.notSpecified}
                    </div>
                  </div>
                </div>
              </div>
            </RevealSection>

            <RevealSection className={`${styles.section} fx-fade-up fx-fade-up-delay-1`} delay={0.08}>
              <SectionHeading
                eyebrow={marketplaceMessages.opportunityDetail.scopeEyebrow}
                title={marketplaceMessages.opportunityDetail.scopeTitle}
                description={opportunity.description}
              />
              <div className={styles.resultHeader}>
                <div className={styles.resultGlyphWrap}>
                  <TalentCategoryGlyph kind={resolveOpportunityGlyph(opportunity)} />
                </div>
                <div className={styles.resultHeaderCopy}>
                  <span className={styles.resultKicker}>
                    {marketplaceMessages.results.kickerBrief}
                  </span>
                  <strong className={styles.resultTitle}>{opportunity.owner.displayName}</strong>
                  <p className={styles.resultSummary}>
                    {
                      marketplaceMessages.labels.escrowReadiness[
                        opportunity.escrowReadiness
                      ]
                    }{' '}
                    • {opportunity.category}
                  </p>
                </div>
              </div>
              <div className={styles.chipRow}>
                {opportunity.requiredSkills.map((skill) => (
                  <span key={skill} className={styles.chip}>
                    {skill}
                  </span>
                ))}
                {opportunity.mustHaveSkills
                  .filter((skill) => !opportunity.requiredSkills.includes(skill))
                  .map((skill) => (
                    <span key={skill} className={styles.resultMetaChip}>
                      {skill}
                    </span>
                  ))}
              </div>
              <FactGrid className="md:grid-cols-3">
                <FactItem
                  label={marketplaceMessages.opportunityDetail.category}
                  value={opportunity.category}
                />
                <FactItem
                  label={marketplaceMessages.opportunityDetail.timeline}
                  value={opportunity.timeline}
                />
                <FactItem
                  label={marketplaceMessages.opportunityDetail.budget}
                  value={
                    opportunity.budgetMin || opportunity.budgetMax
                      ? `${opportunity.budgetMin ?? '—'} to ${opportunity.budgetMax ?? '—'}`
                      : marketplaceMessages.opportunityDetail.notSpecified
                  }
                  dir="ltr"
                />
                <FactItem
                  label={marketplaceMessages.opportunityDetail.settlementToken}
                  value={opportunity.currencyAddress}
                  dir="ltr"
                />
                <FactItem
                  label={marketplaceMessages.opportunityDetail.desiredStart}
                  value={formatDateTime(opportunity.desiredStartAt)}
                />
                <FactItem
                  label={marketplaceMessages.opportunityDetail.timezoneOverlap}
                  value={
                    opportunity.timezoneOverlapHours === null
                      ? marketplaceMessages.opportunityDetail.notSpecified
                      : marketplaceMessages.opportunityDetail.hours(
                          opportunity.timezoneOverlapHours,
                        )
                  }
                />
              </FactGrid>
            </RevealSection>

            <RevealSection className="fx-fade-up fx-fade-up-delay-2 grid gap-5 xl:grid-cols-2" delay={0.12}>
              <section className={styles.section}>
                <SectionHeading
                  eyebrow={marketplaceMessages.opportunityDetail.hiringSpecEyebrow}
                  title={marketplaceMessages.opportunityDetail.fitRequirementsTitle}
                />
                <FactGrid>
                  <FactItem
                    label={marketplaceMessages.opportunityDetail.engagementType}
                    value={
                      marketplaceMessages.labels.engagementType[
                        opportunity.engagementType
                      ]
                    }
                  />
                  <FactItem
                    label={marketplaceMessages.opportunityDetail.cryptoReadinessRequired}
                    value={
                      marketplaceMessages.labels.cryptoReadiness[
                        opportunity.cryptoReadinessRequired
                      ]
                    }
                  />
                </FactGrid>
                <div className={styles.cardStack}>
                  <article className={styles.resultCard}>
                    <span className={styles.resultKicker}>
                      {marketplaceMessages.opportunityDetail.requiredSkills}
                    </span>
                    <div className={styles.chipRow}>
                      {opportunity.requiredSkills.map((skill) => (
                        <span key={skill} className={styles.chip}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </article>
                  <article className={styles.resultCard}>
                    <span className={styles.resultKicker}>
                      {marketplaceMessages.opportunityDetail.mustHaveSkills}
                    </span>
                    <div className={styles.chipRow}>
                      {opportunity.mustHaveSkills.length === 0 ? (
                        <span className={styles.resultMetaChip}>
                          {messages.publicMarketplace.profileDetail.noneListed}
                        </span>
                      ) : (
                        opportunity.mustHaveSkills.map((skill) => (
                          <span key={skill} className={styles.resultMetaChip}>
                            {skill}
                          </span>
                        ))
                      )}
                    </div>
                  </article>
                  <article className={styles.resultCard}>
                    <span className={styles.resultKicker}>
                      {marketplaceMessages.opportunityDetail.outcomes}
                    </span>
                    <div className={styles.cardStack}>
                      {opportunity.outcomes.map((item) => (
                        <p key={item} className={styles.resultSummary}>
                          {item}
                        </p>
                      ))}
                    </div>
                  </article>
                  <article className={styles.resultCard}>
                    <span className={styles.resultKicker}>
                      {marketplaceMessages.opportunityDetail.acceptanceCriteria}
                    </span>
                    <div className={styles.cardStack}>
                      {opportunity.acceptanceCriteria.map((item) => (
                        <p key={item} className={styles.resultSummary}>
                          {item}
                        </p>
                      ))}
                    </div>
                  </article>
                  <article className={styles.resultCard}>
                    <span className={styles.resultKicker}>
                      {marketplaceMessages.opportunityDetail.screeningQuestions}
                    </span>
                    <div className={styles.cardStack}>
                      {opportunity.screeningQuestions.length === 0 ? (
                        <p className={styles.resultSummary}>
                          {marketplaceMessages.opportunityDetail.noScreeningQuestions}
                        </p>
                      ) : (
                        opportunity.screeningQuestions.map((question) => (
                          <p key={question.id} className={styles.resultSummary}>
                            {question.prompt}
                          </p>
                        ))
                      )}
                    </div>
                  </article>
                </div>
              </section>

              <section className={styles.section}>
                <SectionHeading
                  eyebrow={marketplaceMessages.opportunityDetail.clientTrustEyebrow}
                  title={marketplaceMessages.opportunityDetail.clientTrustTitle}
                />
                <FactGrid>
                  <FactItem
                    label={marketplaceMessages.opportunityDetail.averageRating}
                    value={formatRating(opportunity.owner.reputation.averageRating)}
                  />
                  <FactItem
                    label={marketplaceMessages.opportunityDetail.publicReviewCount}
                    value={opportunity.owner.reputation.publicReviewCount}
                  />
                  <FactItem
                    label={marketplaceMessages.opportunityDetail.identityConfidence}
                    value={
                      marketplaceMessages.labels.identityConfidence[
                        opportunity.owner.reputation.identityConfidence
                      ]
                    }
                  />
                  <FactItem
                    label={marketplaceMessages.opportunityDetail.responseRate}
                    value={
                      opportunity.owner.reputation.responseRate === null
                        ? '—'
                        : `${opportunity.owner.reputation.responseRate}%`
                    }
                  />
                  <FactItem
                    label={marketplaceMessages.opportunityDetail.inviteAcceptanceRate}
                    value={
                      opportunity.owner.reputation.inviteAcceptanceRate === null
                        ? '—'
                        : `${opportunity.owner.reputation.inviteAcceptanceRate}%`
                    }
                  />
                  <FactItem
                    label={marketplaceMessages.opportunityDetail.escrowReadiness}
                    value={
                      marketplaceMessages.labels.escrowReadiness[
                        opportunity.escrowReadiness
                      ]
                    }
                  />
                </FactGrid>
              </section>
            </RevealSection>

            <RevealSection className="fx-fade-up fx-fade-up-delay-3 grid gap-5 xl:grid-cols-2" delay={0.16}>
              <section className={styles.section}>
                <SectionHeading
                  eyebrow={marketplaceMessages.heroEyebrow}
                  title={marketplaceMessages.directory.title}
                  description={marketplaceMessages.results.opportunityBody}
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
                subjectLabel={opportunity.title}
                onSubmit={(input, accessToken) =>
                  webApi.reportMarketplaceOpportunity(id, input, accessToken).then(
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
