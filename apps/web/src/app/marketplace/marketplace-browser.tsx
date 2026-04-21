'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SectionHeading } from '@escrow4334/frontend-core';
import { GlassPanel, RevealSection, SharedCard, SpotlightButton } from '@escrow4334/frontend-core/spatial';
import styles from '../marketing.styles';
import { LanguageSwitcher } from '../language-switcher';
import { ThemeToggle } from '../theme-toggle';
import {
  webApi,
  type MarketplaceOpportunitySearchResult,
  type MarketplaceTalentSearchResult,
} from '../../lib/api';
import { useWebI18n } from '../../lib/i18n';

export function MarketplaceBrowser() {
  const { messages } = useWebI18n();
  const marketplaceMessages = messages.publicMarketplace;
  const [activeTab, setActiveTab] = useState<'talent' | 'opportunity'>('talent');
  const [talentResults, setTalentResults] = useState<MarketplaceTalentSearchResult[]>(
    [],
  );
  const [opportunityResults, setOpportunityResults] = useState<
    MarketplaceOpportunitySearchResult[]
  >([]);
  const [talentFilters, setTalentFilters] = useState({
    q: '',
    skill: '',
    availability: '',
    verificationLevel: '',
    engagementType: '',
  });
  const [opportunityFilters, setOpportunityFilters] = useState({
    q: '',
    skill: '',
    category: '',
    engagementType: '',
    cryptoReadinessRequired: '',
  });
  const [error, setError] = useState<string | null>(null);

  function summarizeDirectoryQuery(
    kind: 'talent' | 'opportunity',
    filters: Record<string, string>,
  ) {
    return (
      Object.values(filters)
        .map((value) => value.trim())
        .find(Boolean)
        ?.toLowerCase() ?? `${kind}:browse`
    );
  }

  function trackDirectoryImpression(
    kind: 'talent' | 'opportunity',
    filters: Record<string, string>,
    resultCount: number,
    category?: string | null,
  ) {
    void webApi.recordMarketplaceInteraction({
      surface: 'public_marketplace',
      entityType: 'search',
      eventType: 'search_impression',
      searchKind: kind,
      queryLabel: summarizeDirectoryQuery(kind, filters),
      category: category ?? null,
      skillTags: [filters.skill ?? '', filters.q ?? ''].filter(Boolean),
      resultCount,
    });
  }

  function trackResultClick(input: {
    entityType: 'profile' | 'opportunity';
    entityId: string;
    searchKind: 'talent' | 'opportunity';
    queryLabel: string;
    category?: string | null;
  }) {
    void webApi.recordMarketplaceInteraction({
      surface: 'public_marketplace',
      entityType: input.entityType,
      eventType: 'result_click',
      entityId: input.entityId,
      searchKind: input.searchKind,
      queryLabel: input.queryLabel,
      category: input.category ?? null,
      resultCount: 1,
    });
  }

  async function loadDirectories() {
    setError(null);
    try {
      const [talentResponse, opportunityResponse] = await Promise.all([
        webApi.searchMarketplaceTalent({
          q: talentFilters.q || undefined,
          skill: talentFilters.skill || undefined,
          availability:
            (talentFilters.availability as
              | 'open'
              | 'limited'
              | 'unavailable'
              | '') || undefined,
          verificationLevel:
            (talentFilters.verificationLevel as
              | 'wallet_verified'
              | 'wallet_and_escrow_history'
              | 'wallet_escrow_and_delivery'
              | '') || undefined,
          engagementType:
            (talentFilters.engagementType as
              | 'fixed_scope'
              | 'milestone_retainer'
              | 'advisory'
              | '') || undefined,
          limit: 9,
        }),
        webApi.searchMarketplaceOpportunities({
          q: opportunityFilters.q || undefined,
          skill: opportunityFilters.skill || undefined,
          category: opportunityFilters.category || undefined,
          engagementType:
            (opportunityFilters.engagementType as
              | 'fixed_scope'
              | 'milestone_retainer'
              | 'advisory'
              | '') || undefined,
          cryptoReadinessRequired:
            (opportunityFilters.cryptoReadinessRequired as
              | 'wallet_only'
              | 'smart_account_ready'
              | 'escrow_power_user'
              | '') || undefined,
          limit: 9,
        }),
      ]);
      setTalentResults(talentResponse.results);
      setOpportunityResults(opportunityResponse.results);
      trackDirectoryImpression(
        'talent',
        talentFilters,
        talentResponse.results.length,
      );
      trackDirectoryImpression(
        'opportunity',
        opportunityFilters,
        opportunityResponse.results.length,
        opportunityFilters.category || null,
      );
    } catch {
      setError(marketplaceMessages.loadFailure);
    }
  }

  useEffect(() => {
    void loadDirectories();
  }, [marketplaceMessages.loadFailure]);

  const renderReasons = (reasons: Array<{ code: string; label: string }>) => (
    <div className={styles.chipRow}>
      {reasons.map((reason) => (
        <span key={reason.code} className={styles.chip}>
          {marketplaceMessages.labels.searchReason[
            reason.code as keyof typeof marketplaceMessages.labels.searchReason
          ] ?? reason.label}
        </span>
      ))}
    </div>
  );

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
          <div className={styles.controlCluster}>
            <ThemeToggle
              className={styles.languageSwitcher}
              labelClassName={styles.languageSwitcherLabel}
              optionClassName={styles.languageSwitcherOption}
              optionActiveClassName={styles.languageSwitcherOptionActive}
            />
            <LanguageSwitcher
              className={styles.languageSwitcher}
              labelClassName={styles.languageSwitcherLabel}
              optionClassName={styles.languageSwitcherOption}
              optionActiveClassName={styles.languageSwitcherOptionActive}
            />
          </div>
        </nav>

        <RevealSection className={styles.hero}>
          <div className="fx-fade-up">
            <p className={styles.eyebrow}>{marketplaceMessages.heroEyebrow}</p>
            <h1>{marketplaceMessages.heroTitle}</h1>
            <p className={styles.lead}>{marketplaceMessages.heroLead}</p>
            <div className={styles.ctaRow}>
              <SpotlightButton
                className={`${styles.ctaLink} ${styles.ctaPrimary}`}
                asChild
              >
                <Link href="/app/marketplace">{marketplaceMessages.openWorkspace}</Link>
              </SpotlightButton>
              <Link
                className={`${styles.ctaLink} ${styles.ctaSecondary}`}
                href="/app/new-contract"
              >
                {marketplaceMessages.directContractPath}
              </Link>
            </div>
            <div className={styles.heroSignalGrid}>
              <GlassPanel className={styles.heroSignal} tone="quiet">
                <span className={styles.heroSignalLabel}>
                  {marketplaceMessages.stats.visibleTalentTitle(talentResults.length)}
                </span>
                <span className={styles.heroSignalValue}>
                  {marketplaceMessages.stats.visibleTalentBody}
                </span>
              </GlassPanel>
              <GlassPanel className={styles.heroSignal} tone="quiet">
                <span className={styles.heroSignalLabel}>
                  {marketplaceMessages.stats.openBriefsTitle(opportunityResults.length)}
                </span>
                <span className={styles.heroSignalValue}>
                  {marketplaceMessages.stats.openBriefsBody}
                </span>
              </GlassPanel>
              <GlassPanel className={styles.heroSignal} tone="quiet">
                <span className={styles.heroSignalLabel}>
                  {marketplaceMessages.stats.escrowCloseTitle}
                </span>
                <span className={styles.heroSignalValue}>
                  {marketplaceMessages.stats.escrowCloseBody}
                </span>
              </GlassPanel>
            </div>
          </div>
          <div className={`${styles.cardStack} fx-fade-up fx-fade-up-delay-1`}>
            <SharedCard className={styles.statCard} interactive>
              <strong>
                {marketplaceMessages.stats.visibleTalentTitle(talentResults.length)}
              </strong>
              <p>{marketplaceMessages.stats.visibleTalentBody}</p>
            </SharedCard>
            <SharedCard className={styles.statCard} interactive>
              <strong>
                {marketplaceMessages.stats.openBriefsTitle(opportunityResults.length)}
              </strong>
              <p>{marketplaceMessages.stats.openBriefsBody}</p>
            </SharedCard>
            <SharedCard className={styles.statCard} interactive>
              <strong>{marketplaceMessages.stats.escrowCloseTitle}</strong>
              <p>{marketplaceMessages.stats.escrowCloseBody}</p>
            </SharedCard>
          </div>
        </RevealSection>

        {error ? (
          <section className={styles.section}>
            <h2>{marketplaceMessages.loadFailure}</h2>
            <p>{error}</p>
          </section>
        ) : null}

        <RevealSection className={`${styles.section} fx-fade-up fx-fade-up-delay-1`} delay={0.08}>
          <div className={styles.sectionBody}>
            <SectionHeading
              eyebrow={marketplaceMessages.directory.eyebrow}
              title={marketplaceMessages.directory.title}
              description={marketplaceMessages.directory.body}
            />
            <div className={styles.inlineActions}>
              <button
                className={styles.cardLink}
                type="button"
                onClick={() => setActiveTab('talent')}
              >
                {marketplaceMessages.directory.talentTab}
              </button>
              <button
                className={styles.cardLink}
                type="button"
                onClick={() => setActiveTab('opportunity')}
              >
                {marketplaceMessages.directory.opportunityTab}
              </button>
            </div>
            {activeTab === 'talent' ? (
              <>
                <div className={styles.filterGrid}>
                  <label className={styles.field}>
                    <span>{marketplaceMessages.directory.query}</span>
                    <input
                      value={talentFilters.q}
                      onChange={(event) =>
                        setTalentFilters((current) => ({
                          ...current,
                          q: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>{marketplaceMessages.directory.skill}</span>
                    <input
                      value={talentFilters.skill}
                      onChange={(event) =>
                        setTalentFilters((current) => ({
                          ...current,
                          skill: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>{marketplaceMessages.directory.availability}</span>
                    <select
                      value={talentFilters.availability}
                      onChange={(event) =>
                        setTalentFilters((current) => ({
                          ...current,
                          availability: event.target.value,
                        }))
                      }
                    >
                      <option value="">All</option>
                      <option value="open">Open</option>
                      <option value="limited">Limited</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>{marketplaceMessages.directory.verificationLevel}</span>
                    <select
                      value={talentFilters.verificationLevel}
                      onChange={(event) =>
                        setTalentFilters((current) => ({
                          ...current,
                          verificationLevel: event.target.value,
                        }))
                      }
                    >
                      <option value="">All</option>
                      <option value="wallet_verified">
                        {marketplaceMessages.labels.verificationLevel.wallet_verified}
                      </option>
                      <option value="wallet_and_escrow_history">
                        {
                          marketplaceMessages.labels.verificationLevel
                            .wallet_and_escrow_history
                        }
                      </option>
                      <option value="wallet_escrow_and_delivery">
                        {
                          marketplaceMessages.labels.verificationLevel
                            .wallet_escrow_and_delivery
                        }
                      </option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>{marketplaceMessages.directory.engagementType}</span>
                    <select
                      value={talentFilters.engagementType}
                      onChange={(event) =>
                        setTalentFilters((current) => ({
                          ...current,
                          engagementType: event.target.value,
                        }))
                      }
                    >
                      <option value="">All</option>
                      <option value="fixed_scope">
                        {marketplaceMessages.labels.engagementType.fixed_scope}
                      </option>
                      <option value="milestone_retainer">
                        {marketplaceMessages.labels.engagementType.milestone_retainer}
                      </option>
                      <option value="advisory">
                        {marketplaceMessages.labels.engagementType.advisory}
                      </option>
                    </select>
                  </label>
                </div>
                <div className={styles.inlineActions}>
                  <button className={styles.cardLink} type="button" onClick={() => void loadDirectories()}>
                    {marketplaceMessages.directory.search}
                  </button>
                  <button
                    className={styles.cardLink}
                    type="button"
                    onClick={() => {
                      setTalentFilters({
                        q: '',
                        skill: '',
                        availability: '',
                        verificationLevel: '',
                        engagementType: '',
                      });
                    }}
                  >
                    {marketplaceMessages.directory.clear}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.filterGrid}>
                  <label className={styles.field}>
                    <span>{marketplaceMessages.directory.query}</span>
                    <input
                      value={opportunityFilters.q}
                      onChange={(event) =>
                        setOpportunityFilters((current) => ({
                          ...current,
                          q: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>{marketplaceMessages.directory.skill}</span>
                    <input
                      value={opportunityFilters.skill}
                      onChange={(event) =>
                        setOpportunityFilters((current) => ({
                          ...current,
                          skill: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>{marketplaceMessages.directory.category}</span>
                    <input
                      value={opportunityFilters.category}
                      onChange={(event) =>
                        setOpportunityFilters((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>{marketplaceMessages.directory.engagementType}</span>
                    <select
                      value={opportunityFilters.engagementType}
                      onChange={(event) =>
                        setOpportunityFilters((current) => ({
                          ...current,
                          engagementType: event.target.value,
                        }))
                      }
                    >
                      <option value="">All</option>
                      <option value="fixed_scope">
                        {marketplaceMessages.labels.engagementType.fixed_scope}
                      </option>
                      <option value="milestone_retainer">
                        {marketplaceMessages.labels.engagementType.milestone_retainer}
                      </option>
                      <option value="advisory">
                        {marketplaceMessages.labels.engagementType.advisory}
                      </option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>{marketplaceMessages.directory.cryptoReadiness}</span>
                    <select
                      value={opportunityFilters.cryptoReadinessRequired}
                      onChange={(event) =>
                        setOpportunityFilters((current) => ({
                          ...current,
                          cryptoReadinessRequired: event.target.value,
                        }))
                      }
                    >
                      <option value="">All</option>
                      <option value="wallet_only">
                        {marketplaceMessages.labels.cryptoReadiness.wallet_only}
                      </option>
                      <option value="smart_account_ready">
                        {marketplaceMessages.labels.cryptoReadiness.smart_account_ready}
                      </option>
                      <option value="escrow_power_user">
                        {marketplaceMessages.labels.cryptoReadiness.escrow_power_user}
                      </option>
                    </select>
                  </label>
                </div>
                <div className={styles.inlineActions}>
                  <button className={styles.cardLink} type="button" onClick={() => void loadDirectories()}>
                    {marketplaceMessages.directory.search}
                  </button>
                  <button
                    className={styles.cardLink}
                    type="button"
                    onClick={() => {
                      setOpportunityFilters({
                        q: '',
                        skill: '',
                        category: '',
                        engagementType: '',
                        cryptoReadinessRequired: '',
                      });
                    }}
                  >
                    {marketplaceMessages.directory.clear}
                  </button>
                </div>
              </>
            )}
          </div>
          <div className={styles.steps}>
            {activeTab === 'talent' ? (
              talentResults.length === 0 ? (
              <article className={styles.stepCard}>
                <strong>{marketplaceMessages.noProfilesTitle}</strong>
                <p>{marketplaceMessages.noProfilesBody}</p>
              </article>
            ) : (
              talentResults.map((result) => (
                <SharedCard
                  key={result.profile.userId}
                  className={styles.stepCard}
                  interactive
                  layoutId={`marketplace-profile-${result.profile.slug}`}
                >
                  <strong>{result.profile.displayName}</strong>
                  <p>{result.profile.headline}</p>
                  <p>
                    {result.profile.skills.slice(0, 3).join(' • ')}
                    {result.profile.skills.length > 3 ? ' • …' : ''}
                  </p>
                  <p>
                    Completed escrow jobs: {result.profile.completedEscrowCount}
                    {result.profile.verifiedWalletAddress
                      ? ` • ${marketplaceMessages.labels.verifiedWallet}`
                      : ''}
                  </p>
                  <p>
                    {marketplaceMessages.directory.ranking}: {result.ranking.score}
                    {result.inviteStatus
                      ? ` • ${marketplaceMessages.directory.inviteStatus}: ${marketplaceMessages.labels.inviteStatus[result.inviteStatus]}`
                      : ''}
                  </p>
                  {renderReasons(result.reasons)}
                  <Link
                    className={styles.cardLink}
                    href={`/marketplace/profiles/${result.profile.slug}`}
                    onClick={() =>
                      trackResultClick({
                        entityType: 'profile',
                        entityId: result.profile.userId,
                        searchKind: 'talent',
                        queryLabel: summarizeDirectoryQuery('talent', talentFilters),
                      })
                    }
                  >
                    {marketplaceMessages.actions.viewProfile}
                  </Link>
                </SharedCard>
              ))
            )
            ) : opportunityResults.length === 0 ? (
              <article className={styles.stepCard}>
                <strong>{marketplaceMessages.noOpportunitiesTitle}</strong>
                <p>{marketplaceMessages.noOpportunitiesBody}</p>
              </article>
            ) : (
              opportunityResults.map((result) => (
                <SharedCard
                  key={result.opportunity.id}
                  className={styles.stepCard}
                  interactive
                  layoutId={`marketplace-opportunity-${result.opportunity.id}`}
                >
                  <strong>{result.opportunity.title}</strong>
                  <p>{result.opportunity.summary}</p>
                  <p>
                    {result.opportunity.category} • {result.opportunity.requiredSkills.slice(0, 3).join(' • ')}
                  </p>
                  <p>
                    {result.opportunity.owner.displayName} • {result.opportunity.applicationCount} applications
                  </p>
                  <p>
                    {marketplaceMessages.directory.ranking}: {result.ranking.score}
                    {result.inviteStatus
                      ? ` • ${marketplaceMessages.directory.inviteStatus}: ${marketplaceMessages.labels.inviteStatus[result.inviteStatus]}`
                      : ''}
                  </p>
                  {renderReasons(result.reasons)}
                  <Link
                    className={styles.cardLink}
                    href={`/marketplace/opportunities/${result.opportunity.id}`}
                    onClick={() =>
                      trackResultClick({
                        entityType: 'opportunity',
                        entityId: result.opportunity.id,
                        searchKind: 'opportunity',
                        queryLabel: summarizeDirectoryQuery(
                          'opportunity',
                          opportunityFilters,
                        ),
                        category: result.opportunity.category,
                      })
                    }
                  >
                    {marketplaceMessages.actions.viewBrief}
                  </Link>
                </SharedCard>
              ))
            )}
          </div>
        </RevealSection>

        <RevealSection className={`${styles.section} fx-fade-up fx-fade-up-delay-3`} delay={0.16}>
          <SectionHeading title={marketplaceMessages.expansionTitle} />
          <div className={styles.objectionGrid}>
            {marketplaceMessages.expansionCards.map((card) => (
              <SharedCard key={card.title} className={styles.objectionCard} interactive>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </SharedCard>
            ))}
          </div>
        </RevealSection>
      </div>
    </main>
  );
}
