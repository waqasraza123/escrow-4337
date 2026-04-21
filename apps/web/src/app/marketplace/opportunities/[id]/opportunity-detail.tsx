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
  formatTimestamp,
} from '@escrow4334/frontend-core';
import { RevealSection, SharedCard, SpotlightButton } from '@escrow4334/frontend-core/spatial';
import { AbuseReportPanel } from '../../abuse-report-panel';
import { ThemeToggle } from '../../../theme-toggle';
import {
  webApi,
  type MarketplaceOpportunityDetail,
} from '../../../../lib/api';
import { useWebI18n } from '../../../../lib/i18n';

type OpportunityDetailProps = {
  id: string;
};

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
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error && loadError.message.trim().length > 0
              ? marketplaceMessages.opportunityDetail.unavailableBody
              : marketplaceMessages.opportunityDetail.unavailableBody,
          );
        }
      });

    return () => {
      active = false;
    };
  }, [id, marketplaceMessages.opportunityDetail.unavailableBody]);

  return (
    <main className="min-h-screen">
      <PageContainer className="w-[min(1480px,calc(100vw-40px))]">
        <PageTopBar
          eyebrow={marketplaceMessages.opportunityDetail.topBarLabel}
          description={marketplaceMessages.opportunityDetail.topBarMeta}
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
          <SectionCard title={marketplaceMessages.opportunityDetail.unavailableTitle}>
            <p className="text-sm leading-6 text-[var(--foreground-soft)]">{error}</p>
          </SectionCard>
        ) : null}

        {!opportunity && !error ? (
          <SectionCard title={marketplaceMessages.opportunityDetail.loadingTitle} />
        ) : null}

        {opportunity ? (
          <>
            <RevealSection className="fx-fade-up grid items-start gap-7 overflow-hidden rounded-[2rem] border border-[var(--surface-border-strong)] bg-[image:var(--hero-bg)] p-8 shadow-[var(--surface-shadow-strong)] lg:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)]">
              <SectionHeading
                eyebrow={marketplaceMessages.opportunityDetail.briefEyebrow(
                  marketplaceMessages.labels.visibility[opportunity.visibility],
                )}
                title={opportunity.title}
                titleClassName="max-w-[9.8ch] text-[clamp(3rem,6vw,5.8rem)] leading-[0.9]"
                description={opportunity.summary}
                descriptionClassName="text-[1.04rem] leading-7 text-[var(--foreground-soft)]"
              />
              <SharedCard
                className="rounded-[1.9rem] bg-[image:var(--card-strong-bg)] p-6"
                layoutId={`marketplace-opportunity-${opportunity.id}`}
              >
                <FactGrid className="md:grid-cols-1">
                  <FactItem
                    label={marketplaceMessages.opportunityDetail.client}
                    value={opportunity.owner.displayName}
                  />
                  <FactItem
                    label={marketplaceMessages.opportunityDetail.applications}
                    value={opportunity.applicationCount}
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
              </SharedCard>
            </RevealSection>

            <RevealSection className="fx-fade-up fx-fade-up-delay-1 grid gap-5 xl:grid-cols-2" delay={0.08}>
              <SectionCard
                eyebrow={marketplaceMessages.opportunityDetail.scopeEyebrow}
                title={marketplaceMessages.opportunityDetail.scopeTitle}
                className="rounded-[1.9rem] bg-[var(--panel-bg)] p-7"
                headerClassName="mb-5"
              >
                <p className="text-sm leading-6 text-[var(--foreground-soft)]">
                  {opportunity.description}
                </p>
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
              </SectionCard>

              <SectionCard
                eyebrow={marketplaceMessages.opportunityDetail.hiringSpecEyebrow}
                title={marketplaceMessages.opportunityDetail.fitRequirementsTitle}
                className="rounded-[1.9rem] bg-[var(--panel-bg)] p-7"
                headerClassName="mb-5"
              >
                <div className="grid gap-4">
                  <p className="text-sm leading-6 text-[var(--foreground-soft)]">
                    {marketplaceMessages.opportunityDetail.requiredSkills}:{' '}
                    {opportunity.requiredSkills.join(' • ')}
                  </p>
                  <p className="text-sm leading-6 text-[var(--foreground-soft)]">
                    {marketplaceMessages.opportunityDetail.mustHaveSkills}:{' '}
                    {opportunity.mustHaveSkills.join(' • ') ||
                      messages.publicMarketplace.profileDetail.noneListed}
                  </p>
                  <p className="text-sm leading-6 text-[var(--foreground-soft)]">
                    {marketplaceMessages.opportunityDetail.engagementType}:{' '}
                    {
                      marketplaceMessages.labels.engagementType[
                        opportunity.engagementType
                      ]
                    }
                  </p>
                  <p className="text-sm leading-6 text-[var(--foreground-soft)]">
                    {marketplaceMessages.opportunityDetail.cryptoReadinessRequired}:{' '}
                    {
                      marketplaceMessages.labels.cryptoReadiness[
                        opportunity.cryptoReadinessRequired
                      ]
                    }
                  </p>
                  <div className="grid gap-2">
                    <span className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
                      {marketplaceMessages.opportunityDetail.outcomes}
                    </span>
                    {opportunity.outcomes.map((item) => (
                      <p
                        key={item}
                        className="text-sm leading-6 text-[var(--foreground-soft)]"
                      >
                        {item}
                      </p>
                    ))}
                  </div>
                  <div className="grid gap-2">
                    <span className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
                      {marketplaceMessages.opportunityDetail.acceptanceCriteria}
                    </span>
                    {opportunity.acceptanceCriteria.map((item) => (
                      <p
                        key={item}
                        className="text-sm leading-6 text-[var(--foreground-soft)]"
                      >
                        {item}
                      </p>
                    ))}
                  </div>
                  <div className="grid gap-2">
                    <span className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
                      {marketplaceMessages.opportunityDetail.screeningQuestions}
                    </span>
                    {opportunity.screeningQuestions.length === 0 ? (
                      <p className="text-sm leading-6 text-[var(--foreground-soft)]">
                        {marketplaceMessages.opportunityDetail.noScreeningQuestions}
                      </p>
                    ) : (
                      opportunity.screeningQuestions.map((question) => (
                        <p
                          key={question.id}
                          className="text-sm leading-6 text-[var(--foreground-soft)]"
                        >
                          {question.prompt}
                        </p>
                      ))
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <SpotlightButton asChild>
                      <Link href="/app/marketplace">
                        {marketplaceMessages.actions.applyFromWorkspace}
                      </Link>
                    </SpotlightButton>
                  </div>
                </div>
              </SectionCard>

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
