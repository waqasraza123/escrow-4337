'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '../page.module.css';
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
      setError(loadError instanceof Error ? loadError.message : 'Failed to load workspace');
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
    setMessage('Marketplace session cleared.');
    await loadWorkspace(null);
  }

  async function handleSaveProfile() {
    if (!tokens) {
      setError('Sign in through the main app before editing your marketplace profile.');
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
    setMessage('Marketplace profile and proof artifacts saved.');
    await loadWorkspace(tokens);
  }

  async function handleCreateOpportunity() {
    if (!tokens) {
      setError('Sign in through the main app before creating a brief.');
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
    setMessage('Decision-ready marketplace brief created as draft.');
    await loadWorkspace(tokens);
  }

  async function handlePublishOpportunity(id: string) {
    if (!tokens) {
      return;
    }

    await webApi.publishMarketplaceOpportunity(id, tokens.accessToken);
    setMessage('Marketplace brief published.');
    await loadWorkspace(tokens);
  }

  async function handlePauseOpportunity(id: string) {
    if (!tokens) {
      return;
    }

    await webApi.pauseMarketplaceOpportunity(id, tokens.accessToken);
    setMessage('Marketplace brief paused.');
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
      setMessage('Application shortlisted.');
    } else if (action === 'reject') {
      await webApi.rejectMarketplaceApplication(applicationId, tokens.accessToken);
      setMessage('Application rejected.');
    } else {
      const response = await webApi.hireMarketplaceApplication(
        applicationId,
        tokens.accessToken,
      );
      setMessage(`Application hired and escrow contract ${response.jobId} created.`);
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
      setError('Sign in and restore a session before applying.');
      return;
    }

    const selectedWalletAddress =
      user.wallets.find(
        (wallet) =>
          wallet.walletKind === 'eoa' && wallet.verificationMethod === 'siwe',
      )?.address ?? '';
    if (!selectedWalletAddress) {
      setError('Link a SIWE-verified wallet before applying.');
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
    setMessage('Structured application submitted.');
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
    setMessage('Application withdrawn.');
    await loadWorkspace(tokens);
  }

  return (
    <div className={styles.console}>
      <div className={styles.topBar}>
        <div className={styles.topBarContent}>
          <span className={styles.topBarLabel}>Marketplace workspace</span>
          <p className={styles.topBarMeta}>
            Write decision-ready briefs, submit structured proposals, and review
            dossier-ranked applicants before escrow.
          </p>
        </div>
        <div className={styles.inlineActions}>
          <Link href="/marketplace">Public marketplace</Link>
          <Link href="/app/new-contract">Direct contract path</Link>
          {tokens ? (
            <button type="button" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          ) : (
            <Link href="/app/sign-in">Sign in</Link>
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
          <h2>Loading workspace…</h2>
        </section>
      ) : null}

      {!loading && !tokens ? (
        <section className={styles.panel}>
          <h2>Session required for hiring actions</h2>
          <p className={styles.stateText}>
            Public browse is open, but structured profiles, briefs, proposals, and
            hires still use the authenticated product session.
          </p>
        </section>
      ) : null}

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>Overview</span>
              <h2>Marketplace pipeline</h2>
            </div>
          </div>
          <section className={styles.summaryGrid}>
            <article>
              <span className={styles.metaLabel}>Published briefs</span>
              <strong>
                {myOpportunities.filter((opportunity) => opportunity.status === 'published').length}
              </strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Applications to review</span>
              <strong>{reviewableApplications}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Strong matches loaded</span>
              <strong>{strongMatches}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Hires to escrow</span>
              <strong>{hiredOpportunities.length}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Active contracts</span>
              <strong>{activeContracts.length}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>My active applications</span>
              <strong>{activeApplications.length}</strong>
            </article>
          </section>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>Talent</span>
              <h2>Credibility profile</h2>
            </div>
          </div>
          <div className={styles.stack}>
            <label className={styles.field}>
              <span>Slug</span>
              <input
                value={profileDraft.slug}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, slug: event.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>Display name</span>
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
              <span>Headline</span>
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
              <span>Bio</span>
              <textarea
                rows={4}
                value={profileDraft.bio}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, bio: event.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>Skills</span>
              <input
                placeholder="typescript, react, design systems"
                value={profileDraft.skills}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, skills: event.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>Specialties</span>
              <input
                placeholder="marketplaces, fintech, onboarding"
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
              <span>Preferred engagements</span>
              <input
                placeholder="fixed_scope, milestone_retainer"
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
              <span>Crypto readiness</span>
              <select
                value={profileDraft.cryptoReadiness}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    cryptoReadiness: event.target.value as MarketplaceCryptoReadiness,
                  }))
                }
              >
                <option value="wallet_only">Wallet only</option>
                <option value="smart_account_ready">Smart account ready</option>
                <option value="escrow_power_user">Escrow power user</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Portfolio URLs</span>
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
              <span>External proof URLs</span>
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
                  <span className={styles.metaLabel}>Verification level</span>
                  <strong>{profile.verificationLevel}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Completion rate</span>
                  <strong>{formatPercent(profile.escrowStats.completionRate)}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>Dispute rate</span>
                  <strong>{formatPercent(profile.escrowStats.disputeRate)}</strong>
                </article>
                <article>
                  <span className={styles.metaLabel}>On-time delivery</span>
                  <strong>{formatPercent(profile.escrowStats.onTimeDeliveryRate)}</strong>
                </article>
              </section>
            ) : null}
            <div className={styles.inlineActions}>
              <button type="button" onClick={() => void handleSaveProfile()}>
                Save profile
              </button>
              {profile ? (
                <Link href={`/marketplace/profiles/${profile.slug}`}>View public profile</Link>
              ) : null}
            </div>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>Client</span>
              <h2>Create hiring spec</h2>
            </div>
          </div>
          <div className={styles.stack}>
            <label className={styles.field}>
              <span>Title</span>
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
              <span>Summary</span>
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
              <span>Description</span>
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
              <span>Visibility</span>
              <select
                value={opportunityDraft.visibility}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    visibility: event.target.value as OpportunityDraft['visibility'],
                  }))
                }
              >
                <option value="public">Public marketplace brief</option>
                <option value="private">Private direct-link brief</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Category</span>
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
              <span>Settlement token address</span>
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
              <span>Required skills</span>
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
              <span>Must-have skills</span>
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
              <span>Outcomes</span>
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
              <span>Acceptance criteria</span>
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
              <span>Screening questions</span>
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
              <span>Timeline</span>
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
              <span>Desired start</span>
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
              <span>Timezone overlap hours</span>
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
              <span>Engagement type</span>
              <select
                value={opportunityDraft.engagementType}
                onChange={(event) =>
                  setOpportunityDraft((current) => ({
                    ...current,
                    engagementType: event.target.value as MarketplaceEngagementType,
                  }))
                }
              >
                <option value="fixed_scope">Fixed scope</option>
                <option value="milestone_retainer">Milestone retainer</option>
                <option value="advisory">Advisory</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Required crypto readiness</span>
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
                <option value="wallet_only">Wallet only</option>
                <option value="smart_account_ready">Smart account ready</option>
                <option value="escrow_power_user">Escrow power user</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Budget minimum</span>
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
              <span>Budget maximum</span>
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
                Create draft brief
              </button>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>Client</span>
              <h2>My opportunities</h2>
            </div>
          </div>
          <div className={styles.stack}>
            {myOpportunities.length === 0 ? (
              <p className={styles.stateText}>No marketplace briefs yet.</p>
            ) : (
              myOpportunities.map((opportunity) => (
                <article key={opportunity.id} className={styles.actionPanel}>
                  <div className={styles.stack}>
                    <strong>{opportunity.title}</strong>
                    <p className={styles.stateText}>
                      {opportunity.visibility} • {opportunity.status} • {opportunity.applicationCount} applications
                    </p>
                    <p className={styles.stateText}>
                      Must-haves: {opportunity.mustHaveSkills.join(' • ') || 'None listed'}
                    </p>
                    <p className={styles.stateText}>
                      Outcomes: {opportunity.outcomes.join(' • ') || 'None listed'}
                    </p>
                    <div className={styles.inlineActions}>
                      <Link href={`/marketplace/opportunities/${opportunity.id}`}>View public brief</Link>
                      {opportunity.hiredJobId ? (
                        <Link href={`/app/contracts/${opportunity.hiredJobId}`}>View contract</Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleLoadApplications(opportunity.id)}
                      >
                        Load review board
                      </button>
                      {opportunity.status === 'draft' || opportunity.status === 'paused' ? (
                        <button
                          type="button"
                          onClick={() => void handlePublishOpportunity(opportunity.id)}
                        >
                          Publish
                        </button>
                      ) : null}
                      {opportunity.status === 'published' ? (
                        <button
                          type="button"
                          onClick={() => void handlePauseOpportunity(opportunity.id)}
                        >
                          Pause
                        </button>
                      ) : null}
                    </div>
                    {(applicationsByOpportunity[opportunity.id] ?? []).map((application) => (
                      <div key={application.id} className={styles.walletCard}>
                        <strong>
                          {application.applicant.displayName} • fit {application.fitScore}
                        </strong>
                        <p className={styles.stateText}>{application.applicant.headline}</p>
                        <p className={styles.stateText}>
                          Status: {application.status} • {application.dossier.recommendation}
                        </p>
                        <p className={styles.stateText}>
                          Risk flags: {application.riskFlags.join(', ') || 'none'}
                        </p>
                        <p className={styles.stateText}>
                          Missing requirements:{' '}
                          {application.dossier.matchSummary.missingRequirements.join(' | ') ||
                            'none'}
                        </p>
                        <p className={styles.stateText}>
                          Why shortlisted: {application.dossier.whyShortlisted.join(' | ')}
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
                            Shortlist
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
                            Reject
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
                            Hire into escrow
                          </button>
                        </div>
                      </div>
                    ))}
                    {(matchesByOpportunity[opportunity.id] ?? []).length > 0 ? (
                      <div className={styles.stack}>
                        <span className={styles.metaLabel}>Match board</span>
                        {(matchesByOpportunity[opportunity.id] ?? []).map((match) => (
                          <div key={match.applicationId} className={styles.walletCard}>
                            <strong>
                              {match.recommendation} • fit {match.matchSummary.fitScore}
                            </strong>
                            <p className={styles.stateText}>
                              Skill overlap: {match.matchSummary.skillOverlap.join(' • ') || 'none'}
                            </p>
                            <p className={styles.stateText}>
                              Requirement gaps:{' '}
                              {match.matchSummary.mustHaveSkillGaps.join(' • ') || 'none'}
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
              <span className={styles.panelEyebrow}>Talent</span>
              <h2>My applications</h2>
            </div>
          </div>
          <div className={styles.stack}>
            {myApplications.length === 0 ? (
              <p className={styles.stateText}>No applications yet.</p>
            ) : (
              myApplications.map((application) => (
                <article key={application.id} className={styles.actionPanel}>
                  <strong>{application.opportunity.title}</strong>
                  <p className={styles.stateText}>
                    {application.status} • fit {application.fitScore} •{' '}
                    {application.dossier.recommendation}
                  </p>
                  <p className={styles.stateText}>
                    Missing requirements:{' '}
                    {application.dossier.matchSummary.missingRequirements.join(' | ') ||
                      'none'}
                  </p>
                  {application.hiredJobId ? (
                    <Link href={`/app/contracts/${application.hiredJobId}`}>View contract</Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleWithdrawApplication(application.id)}
                    >
                      Withdraw
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
              <span className={styles.panelEyebrow}>Discover</span>
              <h2>Open briefs</h2>
            </div>
          </div>
          <div className={styles.stack}>
            {publicOpportunities.length === 0 ? (
              <p className={styles.stateText}>No public briefs available.</p>
            ) : (
              publicOpportunities.map((opportunity) => {
                const draft =
                  applicationDrafts[opportunity.id] ??
                  createApplicationDraft(opportunity, profile);
                return (
                  <article key={opportunity.id} className={styles.actionPanel}>
                    <div className={styles.stack}>
                      <strong>{opportunity.title}</strong>
                      <p className={styles.stateText}>{opportunity.summary}</p>
                      <p className={styles.stateText}>
                        Must-haves: {opportunity.mustHaveSkills.join(' • ') || 'None listed'}
                      </p>
                      <p className={styles.stateText}>
                        Required crypto readiness: {opportunity.cryptoReadinessRequired}
                      </p>
                      <div className={styles.inlineActions}>
                        <Link href={`/marketplace/opportunities/${opportunity.id}`}>View public brief</Link>
                      </div>
                      {tokens && user?.id !== opportunity.owner.userId ? (
                        <div className={styles.stack}>
                          <label className={styles.field}>
                            <span>Cover note</span>
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
                            <span>Delivery approach</span>
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
                            <span>Milestone plan summary</span>
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
                              Submit structured application
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
