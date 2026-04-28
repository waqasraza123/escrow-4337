'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ScreenSectionHeader,
  SectionHeading,
  TrustSignalStrip,
} from '@escrow4334/frontend-core';
import { RevealSection } from '@escrow4334/frontend-core/spatial';
import styles from '../marketing.styles';
import { LanguageSwitcher } from '../language-switcher';
import {
  MarketplaceDirectoryScene,
  PublicSceneFrame,
  TalentCategoryGlyph,
} from '../public-visuals';
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

  function resolveTalentGlyph(result: MarketplaceTalentSearchResult) {
    const haystack = [
      result.profile.headline,
      ...result.profile.specialties,
      ...result.profile.skills,
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

  function resolveOpportunityGlyph(result: MarketplaceOpportunitySearchResult) {
    const haystack = [
      result.opportunity.category,
      result.opportunity.title,
      ...result.opportunity.requiredSkills,
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
          <div className={`${styles.heroContent} fx-fade-up`}>
            <p className={styles.eyebrow}>{marketplaceMessages.heroEyebrow}</p>
            <h1 className={styles.heroTitle}>{marketplaceMessages.heroTitle}</h1>
            <p className={styles.lead}>{marketplaceMessages.heroLead}</p>
            <div className={styles.ctaRow}>
              <Link
                className={`${styles.ctaLink} ${styles.ctaPrimary}`}
                data-testid="marketplace-primary-cta"
                href="/app/marketplace"
              >
                {marketplaceMessages.openWorkspace}
              </Link>
              <Link
                className={`${styles.ctaLink} ${styles.ctaSecondary}`}
                data-testid="marketplace-secondary-cta"
                href="/app/new-contract"
              >
                {marketplaceMessages.directContractPath}
              </Link>
              <Link
                className={`${styles.ctaLink} ${styles.ctaTertiary}`}
                href="/trust"
              >
                {messages.common.trust}
              </Link>
            </div>
            <div className={styles.searchHeroBadges}>
              {marketplaceMessages.heroBadges.map((badge) => (
                <span key={badge} className={styles.searchHeroBadge}>
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <div className={`${styles.searchHeroShell} fx-fade-up fx-fade-up-delay-1`}>
            <PublicSceneFrame accent="market">
              <MarketplaceDirectoryScene />
            </PublicSceneFrame>
            <div className={styles.statStrip}>
              <div className={styles.statPill}>
                <span className={styles.statPillLabel}>
                  {marketplaceMessages.stats.visibleTalentTitle(talentResults.length)}
                </span>
                <span className={styles.statPillValue}>
                  {marketplaceMessages.stats.visibleTalentBody}
                </span>
              </div>
              <div className={styles.statPill}>
                <span className={styles.statPillLabel}>
                  {marketplaceMessages.stats.openBriefsTitle(opportunityResults.length)}
                </span>
                <span className={styles.statPillValue}>
                  {marketplaceMessages.stats.openBriefsBody}
                </span>
              </div>
              <div className={styles.statPill}>
                <span className={styles.statPillLabel}>
                  {marketplaceMessages.stats.escrowCloseTitle}
                </span>
                <span className={styles.statPillValue}>
                  {marketplaceMessages.stats.escrowCloseBody}
                </span>
              </div>
            </div>
          </div>
        </RevealSection>

        {error ? (
          <section className={styles.section}>
            <h2>{marketplaceMessages.loadFailure}</h2>
            <p>{error}</p>
          </section>
        ) : null}

        <RevealSection className={`${styles.section} fx-fade-up fx-fade-up-delay-1`} delay={0.08}>
          <div className={styles.directoryShell}>
            <aside className={styles.directoryRail}>
              <SectionHeading
                eyebrow={marketplaceMessages.directory.eyebrow}
                title={marketplaceMessages.directory.title}
                description={marketplaceMessages.directory.body}
              />
              <div className={styles.directoryTabs}>
                <button
                  className={`${styles.tabPill} ${
                    activeTab === 'talent' ? styles.tabPillActive : ''
                  }`}
                  type="button"
                  onClick={() => setActiveTab('talent')}
                >
                  {marketplaceMessages.directory.talentTab}
                </button>
                <button
                  className={`${styles.tabPill} ${
                    activeTab === 'opportunity' ? styles.tabPillActive : ''
                  }`}
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
                        <option value="">{marketplaceMessages.directory.all}</option>
                        <option value="open">
                          {marketplaceMessages.directory.availabilityOpen}
                        </option>
                        <option value="limited">
                          {marketplaceMessages.directory.availabilityLimited}
                        </option>
                        <option value="unavailable">
                          {marketplaceMessages.directory.availabilityUnavailable}
                        </option>
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
                        <option value="">{marketplaceMessages.directory.all}</option>
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
                        <option value="">{marketplaceMessages.directory.all}</option>
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
                    <button
                      className={styles.tabPill}
                      type="button"
                      onClick={() => void loadDirectories()}
                    >
                      {marketplaceMessages.directory.search}
                    </button>
                    <button
                      className={styles.tabPill}
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
                        <option value="">{marketplaceMessages.directory.all}</option>
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
                        <option value="">{marketplaceMessages.directory.all}</option>
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
                    <button
                      className={styles.tabPill}
                      type="button"
                      onClick={() => void loadDirectories()}
                    >
                      {marketplaceMessages.directory.search}
                    </button>
                    <button
                      className={styles.tabPill}
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
            </aside>

            <div className={styles.directoryMain}>
              <ScreenSectionHeader
                eyebrow={activeTab === 'talent' ? 'Trusted talent' : 'Scoped briefs'}
                title={
                  activeTab === 'talent'
                    ? marketplaceMessages.directory.talentTab
                    : marketplaceMessages.directory.opportunityTab
                }
                description={
                  activeTab === 'talent'
                    ? 'Scan credibility, escrow fit, and proof signals before opening a profile.'
                    : 'Review budget, readiness, and acceptance shape before applying.'
                }
              />
              <TrustSignalStrip
                className="xl:grid-cols-3"
                items={[
                  {
                    label: 'Visible results',
                    value:
                      activeTab === 'talent'
                        ? talentResults.length
                        : opportunityResults.length,
                    detail: 'Loaded from the public marketplace index.',
                    tone: 'success',
                  },
                  {
                    label: 'Escrow posture',
                    value: 'Milestone first',
                    detail: 'Discovery leads into fixed-scope escrow workflows.',
                  },
                  {
                    label: 'Proof density',
                    value: activeTab === 'talent' ? 'Profile signals' : 'Brief criteria',
                    detail: 'Cards prioritize trust signals over long text blocks.',
                  },
                ]}
              />
              <div className={styles.directoryTopBar}>
                <div className={styles.sectionBody}>
                  <strong className={styles.resultTitle}>
                    {activeTab === 'talent'
                      ? marketplaceMessages.results.talentTitle(talentResults.length)
                      : marketplaceMessages.results.opportunityTitle(
                          opportunityResults.length,
                        )}
                  </strong>
                  <p className={styles.mutedNote}>
                    {activeTab === 'talent'
                      ? marketplaceMessages.results.talentBody
                      : marketplaceMessages.results.opportunityBody}
                  </p>
                </div>
              </div>

              <div className={styles.resultGrid}>
                {activeTab === 'talent' ? (
                  talentResults.length === 0 ? (
                    <article className={styles.resultCard}>
                      <strong className={styles.resultTitle}>
                        {marketplaceMessages.noProfilesTitle}
                      </strong>
                      <p className={styles.resultSummary}>
                        {marketplaceMessages.noProfilesBody}
                      </p>
                    </article>
                  ) : (
                    talentResults.map((result) => (
                      <article
                        key={result.profile.userId}
                        className={styles.resultCard}
                        data-testid={`marketplace-profile-card-${result.profile.slug}`}
                      >
                        <div className={styles.resultHeader}>
                          <div className={styles.resultGlyphWrap}>
                            <TalentCategoryGlyph kind={resolveTalentGlyph(result)} />
                          </div>
                          <div className={styles.resultHeaderCopy}>
                            <span className={styles.resultKicker}>
                              {marketplaceMessages.results.kickerTalent}
                            </span>
                            <strong className={styles.resultTitle}>
                              {result.profile.displayName}
                            </strong>
                            <p className={styles.resultSummary}>
                              {result.profile.headline}
                            </p>
                          </div>
                        </div>
                        <div className={styles.resultFactRow}>
                          <span className={styles.resultMetaChip}>
                            {marketplaceMessages.results.score(result.ranking.score)}
                          </span>
                          <span className={styles.resultMetaChip}>
                            {marketplaceMessages.results.escrowJobs(
                              result.profile.completedEscrowCount,
                            )}
                          </span>
                          {result.profile.verifiedWalletAddress ? (
                            <span className={styles.resultMetaChip}>
                              {marketplaceMessages.labels.verifiedWallet}
                            </span>
                          ) : null}
                        </div>
                        <div className={styles.chipRow}>
                          {result.profile.skills.slice(0, 3).map((skill) => (
                            <span key={skill} className={styles.chip}>
                              {skill}
                            </span>
                          ))}
                        </div>
                        {renderReasons(result.reasons)}
                        <Link
                          className={styles.cardLink}
                          href={`/marketplace/profiles/${result.profile.slug}`}
                          onClick={() =>
                            trackResultClick({
                              entityType: 'profile',
                              entityId: result.profile.userId,
                              searchKind: 'talent',
                              queryLabel: summarizeDirectoryQuery(
                                'talent',
                                talentFilters,
                              ),
                            })
                          }
                        >
                          {marketplaceMessages.actions.viewProfile}
                        </Link>
                      </article>
                    ))
                  )
                ) : opportunityResults.length === 0 ? (
                  <article className={styles.resultCard}>
                    <strong className={styles.resultTitle}>
                      {marketplaceMessages.noOpportunitiesTitle}
                    </strong>
                    <p className={styles.resultSummary}>
                      {marketplaceMessages.noOpportunitiesBody}
                    </p>
                  </article>
                ) : (
                  opportunityResults.map((result) => (
                    <article
                      key={result.opportunity.id}
                      className={styles.resultCard}
                      data-testid={`marketplace-opportunity-card-${result.opportunity.id}`}
                    >
                      <div className={styles.resultHeader}>
                        <div className={styles.resultGlyphWrap}>
                          <TalentCategoryGlyph kind={resolveOpportunityGlyph(result)} />
                        </div>
                        <div className={styles.resultHeaderCopy}>
                          <span className={styles.resultKicker}>
                            {marketplaceMessages.results.kickerBrief}
                          </span>
                          <strong className={styles.resultTitle}>
                            {result.opportunity.title}
                          </strong>
                          <p className={styles.resultSummary}>
                            {result.opportunity.summary}
                          </p>
                        </div>
                      </div>
                      <div className={styles.resultFactRow}>
                        <span className={styles.resultMetaChip}>
                          {marketplaceMessages.results.score(result.ranking.score)}
                        </span>
                        <span className={styles.resultMetaChip}>
                          {result.opportunity.owner.displayName}
                        </span>
                        <span className={styles.resultMetaChip}>
                          {marketplaceMessages.results.applications(
                            result.opportunity.applicationCount,
                          )}
                        </span>
                      </div>
                      <div className={styles.chipRow}>
                        <span className={styles.chip}>{result.opportunity.category}</span>
                        {result.opportunity.requiredSkills
                          .slice(0, 2)
                          .map((skill) => (
                            <span key={skill} className={styles.chip}>
                              {skill}
                            </span>
                          ))}
                      </div>
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
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </RevealSection>
      </div>
    </main>
  );
}
