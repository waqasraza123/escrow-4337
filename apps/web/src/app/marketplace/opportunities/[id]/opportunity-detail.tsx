'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatTimestamp } from '@escrow4334/frontend-core';
import styles from '../../../page.styles';
import { AbuseReportPanel } from '../../abuse-report-panel';
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
    <main className={styles.page}>
      <div className={styles.console}>
        <div className={styles.topBar}>
          <div className={styles.topBarContent}>
            <span className={styles.topBarLabel}>
              {marketplaceMessages.opportunityDetail.topBarLabel}
            </span>
            <p className={styles.topBarMeta}>
              {marketplaceMessages.opportunityDetail.topBarMeta}
            </p>
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
            <h2>{marketplaceMessages.opportunityDetail.unavailableTitle}</h2>
            <p className={styles.stateText}>{error}</p>
          </section>
        ) : null}

        {!opportunity && !error ? (
          <section className={styles.panel}>
            <h2>{marketplaceMessages.opportunityDetail.loadingTitle}</h2>
          </section>
        ) : null}

        {opportunity ? (
          <>
            <section className={styles.hero}>
              <div>
                <p className={styles.eyebrow}>
                  {marketplaceMessages.opportunityDetail.briefEyebrow(
                    marketplaceMessages.labels.visibility[opportunity.visibility],
                  )}
                </p>
                <h1>{opportunity.title}</h1>
                <p className={styles.heroCopy}>{opportunity.summary}</p>
              </div>
              <div className={styles.heroCard}>
                <div>
                  <span className={styles.metaLabel}>
                    {marketplaceMessages.opportunityDetail.client}
                  </span>
                  <strong>{opportunity.owner.displayName}</strong>
                </div>
                <div>
                  <span className={styles.metaLabel}>
                    {marketplaceMessages.opportunityDetail.applications}
                  </span>
                  <strong>{opportunity.applicationCount}</strong>
                </div>
                <div>
                  <span className={styles.metaLabel}>
                    {marketplaceMessages.opportunityDetail.escrowReadiness}
                  </span>
                  <strong>
                    {marketplaceMessages.labels.escrowReadiness[
                      opportunity.escrowReadiness
                    ]}
                  </strong>
                </div>
              </div>
            </section>

            <section className={styles.grid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>
                      {marketplaceMessages.opportunityDetail.scopeEyebrow}
                    </span>
                    <h2>{marketplaceMessages.opportunityDetail.scopeTitle}</h2>
                  </div>
                </div>
                <p className={styles.stateText}>{opportunity.description}</p>
                <div className={styles.summaryGrid}>
                  <article>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.opportunityDetail.category}
                    </span>
                    <strong>{opportunity.category}</strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.opportunityDetail.timeline}
                    </span>
                    <strong>{opportunity.timeline}</strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.opportunityDetail.budget}
                    </span>
                    <strong className={styles.ltrValue} data-ltr="true">
                      {opportunity.budgetMin || opportunity.budgetMax
                        ? `${opportunity.budgetMin ?? '—'} to ${opportunity.budgetMax ?? '—'}`
                        : marketplaceMessages.opportunityDetail.notSpecified}
                    </strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.opportunityDetail.settlementToken}
                    </span>
                    <strong className={styles.ltrValue} data-ltr="true">
                      {opportunity.currencyAddress}
                    </strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.opportunityDetail.desiredStart}
                    </span>
                    <strong>{formatDateTime(opportunity.desiredStartAt)}</strong>
                  </article>
                  <article>
                    <span className={styles.metaLabel}>
                      {marketplaceMessages.opportunityDetail.timezoneOverlap}
                    </span>
                    <strong>
                      {opportunity.timezoneOverlapHours === null
                        ? marketplaceMessages.opportunityDetail.notSpecified
                        : marketplaceMessages.opportunityDetail.hours(
                            opportunity.timezoneOverlapHours,
                          )}
                    </strong>
                  </article>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>
                      {marketplaceMessages.opportunityDetail.hiringSpecEyebrow}
                    </span>
                    <h2>{marketplaceMessages.opportunityDetail.fitRequirementsTitle}</h2>
                  </div>
                </div>
                <div className={styles.stack}>
                  <p className={styles.stateText}>
                    {marketplaceMessages.opportunityDetail.requiredSkills}:{' '}
                    {opportunity.requiredSkills.join(' • ')}
                  </p>
                  <p className={styles.stateText}>
                    {marketplaceMessages.opportunityDetail.mustHaveSkills}:{' '}
                    {opportunity.mustHaveSkills.join(' • ') ||
                      messages.publicMarketplace.profileDetail.noneListed}
                  </p>
                  <p className={styles.stateText}>
                    {marketplaceMessages.opportunityDetail.engagementType}:{' '}
                    {
                      marketplaceMessages.labels.engagementType[
                        opportunity.engagementType
                      ]
                    }
                  </p>
                  <p className={styles.stateText}>
                    {marketplaceMessages.opportunityDetail.cryptoReadinessRequired}:{' '}
                    {
                      marketplaceMessages.labels.cryptoReadiness[
                        opportunity.cryptoReadinessRequired
                      ]
                    }
                  </p>
                  <span className={styles.metaLabel}>
                    {marketplaceMessages.opportunityDetail.outcomes}
                  </span>
                  {opportunity.outcomes.map((item) => (
                    <p key={item} className={styles.stateText}>
                      {item}
                    </p>
                  ))}
                  <span className={styles.metaLabel}>
                    {marketplaceMessages.opportunityDetail.acceptanceCriteria}
                  </span>
                  {opportunity.acceptanceCriteria.map((item) => (
                    <p key={item} className={styles.stateText}>
                      {item}
                    </p>
                  ))}
                  <span className={styles.metaLabel}>
                    {marketplaceMessages.opportunityDetail.screeningQuestions}
                  </span>
                  {opportunity.screeningQuestions.length === 0 ? (
                    <p className={styles.stateText}>
                      {marketplaceMessages.opportunityDetail.noScreeningQuestions}
                    </p>
                  ) : (
                    opportunity.screeningQuestions.map((question) => (
                      <p key={question.id} className={styles.stateText}>
                        {question.prompt}
                      </p>
                    ))
                  )}
                  <Link
                    className={`${styles.actionLink} ${styles.actionLinkPrimary}`}
                    href="/app/marketplace"
                  >
                    {marketplaceMessages.actions.applyFromWorkspace}
                  </Link>
                </div>
              </article>

              <AbuseReportPanel
                subjectLabel={opportunity.title}
                onSubmit={(input, accessToken) =>
                  webApi.reportMarketplaceOpportunity(id, input, accessToken).then(
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
