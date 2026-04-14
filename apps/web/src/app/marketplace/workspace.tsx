'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '../page.module.css';
import { useWebI18n } from '../../lib/i18n';
import {
  webApi,
  type JobView,
  type MarketplaceApplication,
  type MarketplaceApplicationDossier,
  type MarketplaceCryptoReadiness,
  type MarketplaceEngagementType,
  type MarketplaceOpportunity,
  type MarketplaceProfile,
  type MarketplaceProofArtifact,
  type SessionTokens,
  type UserProfile,
} from '../../lib/api';

const sessionStorageKey = 'escrow4337.web.session';

type ProfileDraft = {
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  skills: string;
  specialties: string;
  rateMin: string;
  rateMax: string;
  timezone: string;
  availability: 'open' | 'limited' | 'unavailable';
  preferredEngagements: string;
  cryptoReadiness: MarketplaceCryptoReadiness;
  portfolioUrls: string;
  externalProofUrls: string;
};

type OpportunityDraft = {
  title: string;
  summary: string;
  description: string;
  category: string;
  currencyAddress: string;
  requiredSkills: string;
  mustHaveSkills: string;
  outcomes: string;
  acceptanceCriteria: string;
  screeningQuestions: string;
  visibility: 'public' | 'private';
  budgetMin: string;
  budgetMax: string;
  timeline: string;
  desiredStartAt: string;
  timezoneOverlapHours: string;
  engagementType: MarketplaceEngagementType;
  cryptoReadinessRequired: MarketplaceCryptoReadiness;
};

type ApplicationDraft = {
  coverNote: string;
  proposedRate: string;
  deliveryApproach: string;
  milestonePlanSummary: string;
  estimatedStartAt: string;
  relevantProofUrls: string;
  screeningAnswers: Record<string, string>;
};

function readSession(): SessionTokens | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(sessionStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionTokens;
  } catch {
    return null;
  }
}

function writeSession(tokens: SessionTokens | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!tokens) {
    window.localStorage.removeItem(sessionStorageKey);
    return;
  }

  window.localStorage.setItem(sessionStorageKey, JSON.stringify(tokens));
}

function splitList(input: string) {
  return input
    .split(/\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function toDateInput(value: number | null) {
  if (!value) {
    return '';
  }

  const iso = new Date(value).toISOString();
  return iso.slice(0, 16);
}

function fromDateInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function createEmptyProfileDraft(): ProfileDraft {
  return {
    slug: '',
    displayName: '',
    headline: '',
    bio: '',
    skills: '',
    specialties: '',
    rateMin: '',
    rateMax: '',
    timezone: 'UTC',
    availability: 'open',
    preferredEngagements: 'fixed_scope',
    cryptoReadiness: 'wallet_only',
    portfolioUrls: '',
    externalProofUrls: '',
  };
}

function createEmptyOpportunityDraft(): OpportunityDraft {
  return {
    title: '',
    summary: '',
    description: '',
    category: 'software-development',
    currencyAddress: '',
    requiredSkills: '',
    mustHaveSkills: '',
    outcomes: '',
    acceptanceCriteria: '',
    screeningQuestions: '',
    visibility: 'public',
    budgetMin: '',
    budgetMax: '',
    timeline: '',
    desiredStartAt: '',
    timezoneOverlapHours: '',
    engagementType: 'fixed_scope',
    cryptoReadinessRequired: 'wallet_only',
  };
}

function createApplicationDraft(
  opportunity: MarketplaceOpportunity,
  profile: MarketplaceProfile | null,
): ApplicationDraft {
  const screeningAnswers = Object.fromEntries(
    opportunity.screeningQuestions.map((question) => [question.id, '']),
  );

  return {
    coverNote:
      'I meet the brief requirements and I am ready to move this into escrow.',
    proposedRate: '',
    deliveryApproach:
      'I will align on acceptance criteria first, then deliver against milestone checkpoints.',
    milestonePlanSummary:
      'Milestone 1 covers scope alignment and first delivery. Milestone 2 covers validation and handoff.',
    estimatedStartAt: '',
    relevantProofUrls:
      profile?.proofArtifacts
        .filter((artifact) => artifact.kind !== 'portfolio')
        .map((artifact) => artifact.url)
        .join('\n') ?? '',
    screeningAnswers,
  };
}

function parseProofUrls(input: string, kind: MarketplaceProofArtifact['kind']) {
  return splitList(input).map((url, index) => ({
    id: `${kind}-${index + 1}`,
    label:
      kind === 'external_case_study'
        ? `Case study ${index + 1}`
        : `Proof ${index + 1}`,
    url,
    kind,
    jobId: null,
  }));
}

function parseScreeningQuestions(input: string) {
  return splitList(input).map((prompt, index) => ({
    id: `screening-${index + 1}`,
    prompt,
    required: true,
  }));
}

function formatPercent(value: number) {
  return `${value}%`;
}

export function MarketplaceWorkspace() {
  const { messages } = useWebI18n();
  const marketplaceMessages = messages.publicMarketplace;
  const workspaceMessages = marketplaceMessages.workspace;
  const [tokens, setTokens] = useState<SessionTokens | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contracts, setContracts] = useState<JobView[]>([]);
  const [publicOpportunities, setPublicOpportunities] = useState<
    MarketplaceOpportunity[]
  >([]);
  const [myOpportunities, setMyOpportunities] = useState<MarketplaceOpportunity[]>(
    [],
  );
  const [myApplications, setMyApplications] = useState<MarketplaceApplication[]>(
    [],
  );
  const [profile, setProfile] = useState<MarketplaceProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(
    createEmptyProfileDraft(),
  );
  const [opportunityDraft, setOpportunityDraft] = useState<OpportunityDraft>(
    createEmptyOpportunityDraft(),
  );
  const [applicationsByOpportunity, setApplicationsByOpportunity] = useState<
    Record<string, MarketplaceApplication[]>
  >({});
  const [matchesByOpportunity, setMatchesByOpportunity] = useState<
    Record<string, MarketplaceApplicationDossier[]>
  >({});
  const [applicationDrafts, setApplicationDrafts] = useState<
    Record<string, ApplicationDraft>
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeContracts = contracts.filter(
    (job) => job.status !== 'completed' && job.status !== 'resolved',
  );
  const hiredOpportunities = myOpportunities.filter(
    (opportunity) => opportunity.hiredJobId,
  );
  const reviewableApplications = myOpportunities.reduce(
    (count, opportunity) => count + opportunity.applicationCount,
    0,
  );
  const activeApplications = myApplications.filter(
    (application) =>
      application.status !== 'withdrawn' && application.status !== 'rejected',
  );
  const strongMatches = Object.values(matchesByOpportunity)
    .flat()
    .filter((match) => match.recommendation === 'strong_match').length;

  const formatOpportunityStatus = (status: MarketplaceOpportunity['status']) =>
    marketplaceMessages.labels.opportunityStatus[status];
  const formatApplicationStatus = (status: MarketplaceApplication['status']) =>
    marketplaceMessages.labels.applicationStatus[status];
  const formatRecommendation = (
    recommendation: MarketplaceApplicationDossier['recommendation'],
  ) => marketplaceMessages.labels.recommendation[recommendation];

  async function loadWorkspace(nextTokens: SessionTokens | null = tokens) {
    setLoading(true);
    setError(null);

    try {
      const publicFeed = await webApi.listMarketplaceOpportunities({ limit: 12 });
      setPublicOpportunities(publicFeed.opportunities);

      if (!nextTokens) {
        setUser(null);
        setProfile(null);
        setMyOpportunities([]);
        setMyApplications([]);
        setContracts([]);
        setApplicationsByOpportunity({});
        setMatchesByOpportunity({});
        return;
      }

      const [me, myProfileResult, myOpportunityResult, myApplicationResult, jobs] =
        await Promise.all([
          webApi.me(nextTokens.accessToken),
          webApi
            .getMyMarketplaceProfile(nextTokens.accessToken)
            .catch(() => null),
          webApi.listMyMarketplaceOpportunities(nextTokens.accessToken),
          webApi.listMyMarketplaceApplications(nextTokens.accessToken),
          webApi.listJobs(nextTokens.accessToken),
        ]);

      setUser(me);
      setProfile(myProfileResult?.profile ?? null);
      setMyOpportunities(myOpportunityResult.opportunities);
      setMyApplications(myApplicationResult.applications);
      setContracts(jobs.jobs.map((entry) => entry.job));

      if (myProfileResult?.profile) {
        const externalProofs = myProfileResult.profile.proofArtifacts
          .filter((artifact) => artifact.kind === 'external_case_study')
          .map((artifact) => artifact.url)
          .join('\n');
        setProfileDraft({
          slug: myProfileResult.profile.slug,
          displayName: myProfileResult.profile.displayName,
          headline: myProfileResult.profile.headline,
          bio: myProfileResult.profile.bio,
          skills: myProfileResult.profile.skills.join(', '),
          specialties: myProfileResult.profile.specialties.join(', '),
          rateMin: myProfileResult.profile.rateMin ?? '',
          rateMax: myProfileResult.profile.rateMax ?? '',
          timezone: myProfileResult.profile.timezone,
          availability: myProfileResult.profile.availability,
          preferredEngagements:
            myProfileResult.profile.preferredEngagements.join(', '),
          cryptoReadiness: myProfileResult.profile.cryptoReadiness,
          portfolioUrls: myProfileResult.profile.portfolioUrls.join('\n'),
          externalProofUrls: externalProofs,
        });
      }

      setApplicationDrafts((current) => {
        const nextDrafts = { ...current };
        for (const opportunity of publicFeed.opportunities) {
          if (!nextDrafts[opportunity.id]) {
            nextDrafts[opportunity.id] = createApplicationDraft(
              opportunity,
              myProfileResult?.profile ?? null,
            );
          }
        }
        return nextDrafts;
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error && loadError.message.trim().length > 0
          ? loadError.message
          : workspaceMessages.messages.loadFailed,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = readSession();
    setTokens(stored);
    void loadWorkspace(stored);
  }, []);

  async function handleSignOut() {
    if (tokens) {
      await webApi.logout(tokens.refreshToken);
    }
    writeSession(null);
    setTokens(null);
    setMessage(workspaceMessages.messages.sessionCleared);
    await loadWorkspace(null);
  }

  async function handleSaveProfile() {
    if (!tokens) {
      setError(workspaceMessages.messages.signInBeforeEdit);
      return;
    }

    setError(null);
    const response = await webApi.upsertMarketplaceProfile(
      {
        slug: profileDraft.slug,
        displayName: profileDraft.displayName,
        headline: profileDraft.headline,
        bio: profileDraft.bio,
        skills: splitList(profileDraft.skills),
        specialties: splitList(profileDraft.specialties),
        rateMin: profileDraft.rateMin || null,
        rateMax: profileDraft.rateMax || null,
        timezone: profileDraft.timezone,
        availability: profileDraft.availability,
        preferredEngagements: splitList(
          profileDraft.preferredEngagements,
        ) as MarketplaceEngagementType[],
        cryptoReadiness: profileDraft.cryptoReadiness,
        portfolioUrls: splitList(profileDraft.portfolioUrls),
      },
      tokens.accessToken,
    );
    if (splitList(profileDraft.externalProofUrls).length > 0) {
      await webApi.updateMarketplaceProofs(
        {
          proofArtifacts: parseProofUrls(
            profileDraft.externalProofUrls,
            'external_case_study',
          ),
        },
        tokens.accessToken,
      );
    }
    setProfile(response.profile);
    setMessage(workspaceMessages.messages.profileSaved);
    await loadWorkspace(tokens);
  }

  async function handleCreateOpportunity() {
    if (!tokens) {
      setError(workspaceMessages.messages.signInBeforeCreate);
      return;
    }

    setError(null);
    await webApi.createMarketplaceOpportunity(
      {
        title: opportunityDraft.title,
        summary: opportunityDraft.summary,
        description: opportunityDraft.description,
        category: opportunityDraft.category,
        currencyAddress: opportunityDraft.currencyAddress,
        requiredSkills: splitList(opportunityDraft.requiredSkills),
        mustHaveSkills: splitList(opportunityDraft.mustHaveSkills),
        outcomes: splitList(opportunityDraft.outcomes),
        acceptanceCriteria: splitList(opportunityDraft.acceptanceCriteria),
        screeningQuestions: parseScreeningQuestions(
          opportunityDraft.screeningQuestions,
        ),
        visibility: opportunityDraft.visibility,
        budgetMin: opportunityDraft.budgetMin || null,
        budgetMax: opportunityDraft.budgetMax || null,
        timeline: opportunityDraft.timeline,
        desiredStartAt: fromDateInput(opportunityDraft.desiredStartAt),
        timezoneOverlapHours: opportunityDraft.timezoneOverlapHours
          ? Number(opportunityDraft.timezoneOverlapHours)
          : null,
        engagementType: opportunityDraft.engagementType,
        cryptoReadinessRequired: opportunityDraft.cryptoReadinessRequired,
      },
      tokens.accessToken,
    );
    setOpportunityDraft(createEmptyOpportunityDraft());
    setMessage(workspaceMessages.messages.briefCreated);
    await loadWorkspace(tokens);
  }

  async function handlePublishOpportunity(id: string) {
    if (!tokens) {
      return;
    }

    await webApi.publishMarketplaceOpportunity(id, tokens.accessToken);
    setMessage(workspaceMessages.messages.briefPublished);
    await loadWorkspace(tokens);
  }

  async function handlePauseOpportunity(id: string) {
    if (!tokens) {
      return;
    }

    await webApi.pauseMarketplaceOpportunity(id, tokens.accessToken);
    setMessage(workspaceMessages.messages.briefPaused);
    await loadWorkspace(tokens);
  }

  async function handleLoadApplications(id: string) {
    if (!tokens) {
      return;
    }

    const [applicationsResponse, matchesResponse] = await Promise.all([
      webApi.listOpportunityApplications(id, tokens.accessToken),
      webApi.listOpportunityMatches(id, tokens.accessToken),
    ]);
    setApplicationsByOpportunity((current) => ({
      ...current,
      [id]: applicationsResponse.applications,
    }));
    setMatchesByOpportunity((current) => ({
      ...current,
      [id]: matchesResponse.matches,
    }));
  }

  async function handleApplicationDecision(
    action: 'shortlist' | 'reject' | 'hire',
    applicationId: string,
    opportunityId: string,
  ) {
    if (!tokens) {
      return;
    }

    if (action === 'shortlist') {
      await webApi.shortlistMarketplaceApplication(applicationId, tokens.accessToken);
      setMessage(workspaceMessages.messages.applicationShortlisted);
    } else if (action === 'reject') {
      await webApi.rejectMarketplaceApplication(applicationId, tokens.accessToken);
      setMessage(workspaceMessages.messages.applicationRejected);
    } else {
      const response = await webApi.hireMarketplaceApplication(
        applicationId,
        tokens.accessToken,
      );
      setMessage(workspaceMessages.messages.applicationHired(response.jobId));
    }

    await handleLoadApplications(opportunityId);
    await loadWorkspace(tokens);
  }

  function updateApplicationDraft(
    opportunityId: string,
    updater: (draft: ApplicationDraft) => ApplicationDraft,
  ) {
    setApplicationDrafts((current) => {
      const existing =
        current[opportunityId] ??
        createApplicationDraft(
          publicOpportunities.find((opportunity) => opportunity.id === opportunityId)!,
          profile,
        );
      return {
        ...current,
        [opportunityId]: updater(existing),
      };
    });
  }

  async function handleApplyToOpportunity(opportunity: MarketplaceOpportunity) {
    if (!tokens || !user) {
      setError(workspaceMessages.messages.signInBeforeApply);
      return;
    }

    const selectedWalletAddress =
      user.wallets.find(
        (wallet) =>
          wallet.walletKind === 'eoa' && wallet.verificationMethod === 'siwe',
      )?.address ?? '';
    if (!selectedWalletAddress) {
      setError(workspaceMessages.messages.walletRequired);
      return;
    }

    const draft =
      applicationDrafts[opportunity.id] ?? createApplicationDraft(opportunity, profile);
    await webApi.applyToMarketplaceOpportunity(
      opportunity.id,
      {
        coverNote: draft.coverNote,
        proposedRate: draft.proposedRate || null,
        selectedWalletAddress,
        screeningAnswers: opportunity.screeningQuestions.map((question) => ({
          questionId: question.id,
          answer: draft.screeningAnswers[question.id]?.trim() ?? '',
        })),
        deliveryApproach: draft.deliveryApproach,
        milestonePlanSummary: draft.milestonePlanSummary,
        estimatedStartAt: fromDateInput(draft.estimatedStartAt),
        relevantProofArtifacts: parseProofUrls(
          draft.relevantProofUrls,
          'external_case_study',
        ),
        portfolioUrls: profile?.portfolioUrls ?? [],
      },
      tokens.accessToken,
    );
    setMessage(workspaceMessages.messages.applicationSubmitted);
    setApplicationDrafts((current) => ({
      ...current,
      [opportunity.id]: createApplicationDraft(opportunity, profile),
    }));
    await loadWorkspace(tokens);
  }

  async function handleWithdrawApplication(applicationId: string) {
    if (!tokens) {
      return;
    }

    await webApi.withdrawMarketplaceApplication(applicationId, tokens.accessToken);
    setMessage(workspaceMessages.messages.applicationWithdrawn);
    await loadWorkspace(tokens);
  }

  return (
    <div className={styles.console}>
        <div className={styles.topBar}>
        <div className={styles.topBarContent}>
          <span className={styles.topBarLabel}>{workspaceMessages.topBarLabel}</span>
          <p className={styles.topBarMeta}>{workspaceMessages.topBarMeta}</p>
        </div>
        <div className={styles.inlineActions}>
          <Link
            className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
            href="/marketplace"
          >
            {workspaceMessages.publicMarketplace}
          </Link>
          <Link
            className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
            href="/app/new-contract"
          >
            {marketplaceMessages.directContractPath}
          </Link>
          {tokens ? (
            <button type="button" onClick={() => void handleSignOut()}>
              {workspaceMessages.signOut}
            </button>
          ) : (
            <Link
              className={`${styles.actionLink} ${styles.actionLinkPrimary}`}
              href="/app/sign-in"
            >
              {messages.common.signIn}
            </Link>
          )}
        </div>
      </div>

      {message ? (
        <section className={styles.panel}>
          <p className={styles.stateText}>{message}</p>
        </section>
      ) : null}

      {error ? (
        <section className={styles.panel}>
          <p className={styles.stateText}>{error}</p>
        </section>
      ) : null}

      {loading ? (
        <section className={styles.panel}>
          <h2>{workspaceMessages.loadingTitle}</h2>
        </section>
      ) : null}

      {!loading && !tokens ? (
        <section className={styles.panel}>
          <h2>{workspaceMessages.sessionRequiredTitle}</h2>
          <p className={styles.stateText}>{workspaceMessages.sessionRequiredBody}</p>
        </section>
      ) : null}

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>{workspaceMessages.overviewEyebrow}</span>
              <h2>{workspaceMessages.pipelineTitle}</h2>
            </div>
          </div>
          <section className={styles.summaryGrid}>
            <article>
              <span className={styles.metaLabel}>
                {workspaceMessages.pipelineStats.publishedBriefs}
              </span>
              <strong>
                {myOpportunities.filter((opportunity) => opportunity.status === 'published').length}
              </strong>
            </article>
            <article>
              <span className={styles.metaLabel}>
                {workspaceMessages.pipelineStats.applicationsToReview}
              </span>
              <strong>{reviewableApplications}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>
                {workspaceMessages.pipelineStats.strongMatchesLoaded}
              </span>
              <strong>{strongMatches}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>
                {workspaceMessages.pipelineStats.hiresToEscrow}
              </span>
              <strong>{hiredOpportunities.length}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>
                {workspaceMessages.pipelineStats.activeContracts}
              </span>
              <strong>{activeContracts.length}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>
                {workspaceMessages.pipelineStats.myActiveApplications}
              </span>
              <strong>{activeApplications.length}</strong>
            </article>
          </section>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>{workspaceMessages.profileEyebrow}</span>
              <h2>{workspaceMessages.profileTitle}</h2>
            </div>
          </div>
          <div className={styles.stack}>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.slug}</span>
              <input
                value={profileDraft.slug}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, slug: event.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.displayName}</span>
              <input
                value={profileDraft.displayName}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.headline}</span>
              <input
                value={profileDraft.headline}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    headline: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.bio}</span>
              <textarea
                rows={4}
                value={profileDraft.bio}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, bio: event.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.skills}</span>
              <input
                placeholder={workspaceMessages.profileForm.skillsPlaceholder}
                value={profileDraft.skills}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, skills: event.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.specialties}</span>
              <input
                placeholder={workspaceMessages.profileForm.specialtiesPlaceholder}
                value={profileDraft.specialties}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    specialties: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.preferredEngagements}</span>
              <input
                placeholder={workspaceMessages.profileForm.preferredEngagementsPlaceholder}
                value={profileDraft.preferredEngagements}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    preferredEngagements: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.cryptoReadiness}</span>
              <select
                value={profileDraft.cryptoReadiness}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    cryptoReadiness: event.target.value as MarketplaceCryptoReadiness,
                  }))
                }
              >
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
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.portfolioUrls}</span>
              <textarea
                rows={3}
                value={profileDraft.portfolioUrls}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    portfolioUrls: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.profileForm.externalProofUrls}</span>
              <textarea
                rows={3}
                value={profileDraft.externalProofUrls}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    externalProofUrls: event.target.value,
                  }))
                }
              />
            </label>
            {profile ? (
              <section className={styles.summaryGrid}>
                <article>
                  <span className={styles.metaLabel}>
                    {workspaceMessages.profileForm.verificationLevel}
                  </span>
                  <strong>
                    {marketplaceMessages.labels.verificationLevel[profile.verificationLevel]}
                  </strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>
                    {workspaceMessages.profileForm.completionRate}
                  </span>
                  <strong>{formatPercent(profile.escrowStats.completionRate)}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>
                    {workspaceMessages.profileForm.disputeRate}
                  </span>
                  <strong>{formatPercent(profile.escrowStats.disputeRate)}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>
                    {workspaceMessages.profileForm.onTimeDelivery}
                  </span>
                  <strong>{formatPercent(profile.escrowStats.onTimeDeliveryRate)}</strong>
                </article>
              </section>
            ) : null}
            <div className={styles.inlineActions}>
              <button type="button" onClick={() => void handleSaveProfile()}>
                {workspaceMessages.profileForm.saveProfile}
              </button>
              {profile ? (
                <Link
                  className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                  href={`/marketplace/profiles/${profile.slug}`}
                >
                  {workspaceMessages.profileForm.viewPublicProfile}
                </Link>
              ) : null}
            </div>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>{workspaceMessages.clientEyebrow}</span>
              <h2>{workspaceMessages.hiringSpecTitle}</h2>
            </div>
          </div>
          <div className={styles.stack}>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.title}</span>
              <input
                value={opportunityDraft.title}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.summary}</span>
              <input
                value={opportunityDraft.summary}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.description}</span>
              <textarea
                rows={4}
                value={opportunityDraft.description}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.visibility}</span>
              <select
                value={opportunityDraft.visibility}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    visibility: event.target.value as OpportunityDraft['visibility'],
                  }))
                }
              >
                <option value="public">
                  {workspaceMessages.opportunityForm.publicVisibility}
                </option>
                <option value="private">
                  {workspaceMessages.opportunityForm.privateVisibility}
                </option>
              </select>
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.category}</span>
              <input
                value={opportunityDraft.category}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.settlementTokenAddress}</span>
              <input
                value={opportunityDraft.currencyAddress}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    currencyAddress: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.requiredSkills}</span>
              <input
                value={opportunityDraft.requiredSkills}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    requiredSkills: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.mustHaveSkills}</span>
              <input
                value={opportunityDraft.mustHaveSkills}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    mustHaveSkills: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.outcomes}</span>
              <textarea
                rows={3}
                value={opportunityDraft.outcomes}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    outcomes: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.acceptanceCriteria}</span>
              <textarea
                rows={3}
                value={opportunityDraft.acceptanceCriteria}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    acceptanceCriteria: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.screeningQuestions}</span>
              <textarea
                rows={3}
                value={opportunityDraft.screeningQuestions}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    screeningQuestions: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.timeline}</span>
              <input
                value={opportunityDraft.timeline}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    timeline: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.desiredStart}</span>
              <input
                type="datetime-local"
                value={opportunityDraft.desiredStartAt}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    desiredStartAt: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.timezoneOverlapHours}</span>
              <input
                value={opportunityDraft.timezoneOverlapHours}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    timezoneOverlapHours: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.engagementType}</span>
              <select
                value={opportunityDraft.engagementType}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    engagementType: event.target.value as MarketplaceEngagementType,
                  }))
                }
              >
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
              <span>{workspaceMessages.opportunityForm.requiredCryptoReadiness}</span>
              <select
                value={opportunityDraft.cryptoReadinessRequired}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    cryptoReadinessRequired:
                      event.target.value as MarketplaceCryptoReadiness,
                  }))
                }
              >
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
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.budgetMinimum}</span>
              <input
                value={opportunityDraft.budgetMin}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    budgetMin: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>{workspaceMessages.opportunityForm.budgetMaximum}</span>
              <input
                value={opportunityDraft.budgetMax}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    budgetMax: event.target.value,
                  }))
                }
              />
            </label>
            <div className={styles.inlineActions}>
              <button type="button" onClick={() => void handleCreateOpportunity()}>
                {workspaceMessages.opportunityForm.createDraftBrief}
              </button>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>{workspaceMessages.clientEyebrow}</span>
              <h2>{workspaceMessages.myOpportunitiesTitle}</h2>
            </div>
          </div>
          <div className={styles.stack}>
            {myOpportunities.length === 0 ? (
              <p className={styles.stateText}>{workspaceMessages.noOpportunities}</p>
            ) : (
              myOpportunities.map((opportunity) => (
                <article
                  key={opportunity.id}
                  className={styles.actionPanel}
                  data-testid={`marketplace-my-opportunity-${opportunity.id}`}
                >
                  <div className={styles.stack}>
                    <strong>{opportunity.title}</strong>
                    <p className={styles.stateText}>
                      {marketplaceMessages.labels.visibility[opportunity.visibility]} •{' '}
                      {formatOpportunityStatus(opportunity.status)} •{' '}
                      {workspaceMessages.applicationsCount(opportunity.applicationCount)}
                    </p>
                    <p className={styles.stateText}>
                      {workspaceMessages.mustHaves}:{' '}
                      {opportunity.mustHaveSkills.join(' • ') || workspaceMessages.noneListed}
                    </p>
                    <p className={styles.stateText}>
                      {workspaceMessages.outcomes}:{' '}
                      {opportunity.outcomes.join(' • ') || workspaceMessages.noneListed}
                    </p>
                    <div className={styles.inlineActions}>
                      <Link
                        className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                        href={`/marketplace/opportunities/${opportunity.id}`}
                      >
                        {workspaceMessages.viewPublicBrief}
                      </Link>
                      {opportunity.hiredJobId ? (
                        <Link
                          className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                          href={`/app/contracts/${opportunity.hiredJobId}`}
                        >
                          {workspaceMessages.viewContract}
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleLoadApplications(opportunity.id)}
                      >
                        {workspaceMessages.loadReviewBoard}
                      </button>
                      {opportunity.status === 'draft' || opportunity.status === 'paused' ? (
                        <button
                          type="button"
                          onClick={() => void handlePublishOpportunity(opportunity.id)}
                        >
                          {workspaceMessages.publish}
                        </button>
                      ) : null}
                      {opportunity.status === 'published' ? (
                        <button
                          type="button"
                          onClick={() => void handlePauseOpportunity(opportunity.id)}
                        >
                          {workspaceMessages.pause}
                        </button>
                      ) : null}
                    </div>
                    {(applicationsByOpportunity[opportunity.id] ?? []).map((application) => (
                      <div key={application.id} className={styles.walletCard}>
                        <strong>
                          {application.applicant.displayName} •{' '}
                          {workspaceMessages.fitScore(application.fitScore)}
                        </strong>
                        <p className={styles.stateText}>{application.applicant.headline}</p>
                        <p className={styles.stateText}>
                          {workspaceMessages.status}:{' '}
                          {formatApplicationStatus(application.status)} •{' '}
                          {formatRecommendation(application.dossier.recommendation)}
                        </p>
                        <p className={styles.stateText}>
                          {workspaceMessages.riskFlags}:{' '}
                          {application.riskFlags.join(', ') || workspaceMessages.none}
                        </p>
                        <p className={styles.stateText}>
                          {workspaceMessages.missingRequirements}:{' '}
                          {application.dossier.matchSummary.missingRequirements.join(' | ') ||
                            workspaceMessages.none}
                        </p>
                        <p className={styles.stateText}>
                          {workspaceMessages.whyShortlisted}:{' '}
                          {application.dossier.whyShortlisted.join(' | ')}
                        </p>
                        <div className={styles.inlineActions}>
                          <button
                            type="button"
                            onClick={() =>
                              void handleApplicationDecision(
                                'shortlist',
                                application.id,
                                opportunity.id,
                              )
                            }
                          >
                            {workspaceMessages.shortlist}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleApplicationDecision(
                                'reject',
                                application.id,
                                opportunity.id,
                              )
                            }
                          >
                            {workspaceMessages.reject}
                          </button>
                          <button
                            type="button"
                            disabled={
                              application.dossier.matchSummary.missingRequirements.length > 0
                            }
                            onClick={() =>
                              void handleApplicationDecision(
                                'hire',
                                application.id,
                                opportunity.id,
                              )
                            }
                          >
                            {workspaceMessages.hireIntoEscrow}
                          </button>
                        </div>
                      </div>
                    ))}
                    {(matchesByOpportunity[opportunity.id] ?? []).length > 0 ? (
                      <div className={styles.stack}>
                        <span className={styles.metaLabel}>{workspaceMessages.matchBoard}</span>
                        {(matchesByOpportunity[opportunity.id] ?? []).map((match) => (
                          <div key={match.applicationId} className={styles.walletCard}>
                            <strong>
                              {formatRecommendation(match.recommendation)} •{' '}
                              {workspaceMessages.fitScore(match.matchSummary.fitScore)}
                            </strong>
                            <p className={styles.stateText}>
                              {workspaceMessages.skillOverlap}:{' '}
                              {match.matchSummary.skillOverlap.join(' • ') ||
                                workspaceMessages.none}
                            </p>
                            <p className={styles.stateText}>
                              {workspaceMessages.requirementGaps}:{' '}
                              {match.matchSummary.mustHaveSkillGaps.join(' • ') ||
                                workspaceMessages.none}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>{workspaceMessages.profileEyebrow}</span>
              <h2>{workspaceMessages.myApplicationsTitle}</h2>
            </div>
          </div>
          <div className={styles.stack}>
            {myApplications.length === 0 ? (
              <p className={styles.stateText}>{workspaceMessages.noApplications}</p>
            ) : (
              myApplications.map((application) => (
                <article
                  key={application.id}
                  className={styles.actionPanel}
                  data-testid={`marketplace-my-application-${application.id}`}
                >
                  <strong>{application.opportunity.title}</strong>
                  <p className={styles.stateText}>
                    {formatApplicationStatus(application.status)} •{' '}
                    {workspaceMessages.fitScore(application.fitScore)} •{' '}
                    {formatRecommendation(application.dossier.recommendation)}
                  </p>
                  <p className={styles.stateText}>
                    {workspaceMessages.missingRequirements}:{' '}
                    {application.dossier.matchSummary.missingRequirements.join(' | ') ||
                      workspaceMessages.none}
                  </p>
                  {application.hiredJobId ? (
                    <Link
                      className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                      href={
                        application.contractPath ??
                        `/app/contracts/${application.hiredJobId}`
                      }
                    >
                      {workspaceMessages.viewContract}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleWithdrawApplication(application.id)}
                    >
                      {workspaceMessages.withdraw}
                    </button>
                  )}
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>{workspaceMessages.discoverEyebrow}</span>
              <h2>{workspaceMessages.openBriefsTitle}</h2>
            </div>
          </div>
          <div className={styles.stack}>
            {publicOpportunities.length === 0 ? (
              <p className={styles.stateText}>{workspaceMessages.noPublicBriefs}</p>
            ) : (
              publicOpportunities.map((opportunity) => {
                const draft =
                  applicationDrafts[opportunity.id] ??
                  createApplicationDraft(opportunity, profile);
                return (
                  <article
                    key={opportunity.id}
                    className={styles.actionPanel}
                    data-testid={`marketplace-open-brief-${opportunity.id}`}
                  >
                    <div className={styles.stack}>
                    <strong>{opportunity.title}</strong>
                    <p className={styles.stateText}>{opportunity.summary}</p>
                    <p className={styles.stateText}>
                      {workspaceMessages.mustHaves}:{' '}
                      {opportunity.mustHaveSkills.join(' • ') || workspaceMessages.noneListed}
                    </p>
                    <p className={styles.stateText}>
                      {workspaceMessages.requiredCryptoReadiness}:{' '}
                      {
                        marketplaceMessages.labels.cryptoReadiness[
                          opportunity.cryptoReadinessRequired
                        ]
                      }
                    </p>
                    <div className={styles.inlineActions}>
                      <Link
                        className={`${styles.actionLink} ${styles.actionLinkSecondary}`}
                        href={`/marketplace/opportunities/${opportunity.id}`}
                      >
                        {workspaceMessages.viewPublicBrief}
                      </Link>
                    </div>
                      {tokens && user && user.id !== opportunity.owner.userId ? (
                        <div className={styles.stack}>
                          <label className={styles.field}>
                            <span>{workspaceMessages.coverNote}</span>
                            <textarea
                              rows={3}
                              value={draft.coverNote}
                              onChange={(event) =>
                                updateApplicationDraft(opportunity.id, (current) => ({
                                  ...current,
                                  coverNote: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className={styles.field}>
                            <span>{workspaceMessages.deliveryApproach}</span>
                            <textarea
                              rows={3}
                              value={draft.deliveryApproach}
                              onChange={(event) =>
                                updateApplicationDraft(opportunity.id, (current) => ({
                                  ...current,
                                  deliveryApproach: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className={styles.field}>
                            <span>{workspaceMessages.milestonePlanSummary}</span>
                            <textarea
                              rows={3}
                              value={draft.milestonePlanSummary}
                              onChange={(event) =>
                                updateApplicationDraft(opportunity.id, (current) => ({
                                  ...current,
                                  milestonePlanSummary: event.target.value,
                                }))
                              }
                            />
                          </label>
                          {opportunity.screeningQuestions.map((question) => (
                            <label key={question.id} className={styles.field}>
                              <span>{question.prompt}</span>
                              <textarea
                                rows={2}
                                value={draft.screeningAnswers[question.id] ?? ''}
                                onChange={(event) =>
                                  updateApplicationDraft(opportunity.id, (current) => ({
                                    ...current,
                                    screeningAnswers: {
                                      ...current.screeningAnswers,
                                      [question.id]: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </label>
                          ))}
                          <div className={styles.inlineActions}>
                            <button
                              type="button"
                              onClick={() => void handleApplyToOpportunity(opportunity)}
                            >
                              {workspaceMessages.submitStructuredApplication}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
