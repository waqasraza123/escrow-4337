'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '../page.module.css';
import {
  webApi,
  type JobView,
  type MarketplaceApplication,
  type MarketplaceOpportunity,
  type MarketplaceProfile,
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
  rateMin: string;
  rateMax: string;
  timezone: string;
  availability: 'open' | 'limited' | 'unavailable';
  portfolioUrls: string;
};

type OpportunityDraft = {
  title: string;
  summary: string;
  description: string;
  category: string;
  currencyAddress: string;
  requiredSkills: string;
  visibility: 'public' | 'private';
  budgetMin: string;
  budgetMax: string;
  timeline: string;
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

function createEmptyProfileDraft(): ProfileDraft {
  return {
    slug: '',
    displayName: '',
    headline: '',
    bio: '',
    skills: '',
    rateMin: '',
    rateMax: '',
    timezone: 'UTC',
    availability: 'open',
    portfolioUrls: '',
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
    visibility: 'public',
    budgetMin: '',
    budgetMax: '',
    timeline: '',
  };
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
  const [applyNotes, setApplyNotes] = useState<Record<string, string>>({});
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
        setProfileDraft({
          slug: myProfileResult.profile.slug,
          displayName: myProfileResult.profile.displayName,
          headline: myProfileResult.profile.headline,
          bio: myProfileResult.profile.bio,
          skills: myProfileResult.profile.skills.join(', '),
          rateMin: myProfileResult.profile.rateMin ?? '',
          rateMax: myProfileResult.profile.rateMax ?? '',
          timezone: myProfileResult.profile.timezone,
          availability: myProfileResult.profile.availability,
          portfolioUrls: myProfileResult.profile.portfolioUrls.join('\n'),
        });
      }
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
        rateMin: profileDraft.rateMin || null,
        rateMax: profileDraft.rateMax || null,
        timezone: profileDraft.timezone,
        availability: profileDraft.availability,
        portfolioUrls: splitList(profileDraft.portfolioUrls),
      },
      tokens.accessToken,
    );
    setProfile(response.profile);
    setMessage('Marketplace profile saved.');
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
        visibility: opportunityDraft.visibility,
        budgetMin: opportunityDraft.budgetMin || null,
        budgetMax: opportunityDraft.budgetMax || null,
        timeline: opportunityDraft.timeline,
      },
      tokens.accessToken,
    );
    setOpportunityDraft(createEmptyOpportunityDraft());
    setMessage('Marketplace brief created as draft.');
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

    const response = await webApi.listOpportunityApplications(id, tokens.accessToken);
    setApplicationsByOpportunity((current) => ({
      ...current,
      [id]: response.applications,
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

  async function handleApplyToOpportunity(opportunityId: string) {
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

    await webApi.applyToMarketplaceOpportunity(
      opportunityId,
      {
        coverNote:
          applyNotes[opportunityId] ??
          'Interested in this brief and ready to convert into escrow.',
        proposedRate: null,
        selectedWalletAddress,
        portfolioUrls: profile?.portfolioUrls ?? [],
      },
      tokens.accessToken,
    );
    setMessage('Application submitted.');
    setApplyNotes((current) => ({ ...current, [opportunityId]: '' }));
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
            Publish curated briefs, manage applications, and convert hires into escrow.
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
            The public marketplace is open to browse, but profile editing, brief publishing,
            applications, and hiring still use the authenticated product session.
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
              <h2>Marketplace profile</h2>
            </div>
          </div>
          <div className={styles.stack}>
            <label className={styles.field}>
              <span>Slug</span>
              <input
                value={profileDraft.slug}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
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
                  setProfileDraft((current) => ({
                    ...current,
                    bio: event.target.value,
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span>Skills</span>
              <input
                placeholder="typescript, react, design-systems"
                value={profileDraft.skills}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    skills: event.target.value,
                  }))
                }
              />
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
            <div className={styles.inlineActions}>
              <button type="button" onClick={() => void handleSaveProfile()}>
                Save profile
              </button>
              {profile ? <Link href={`/marketplace/profiles/${profile.slug}`}>View public profile</Link> : null}
            </div>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>Client</span>
              <h2>Create brief</h2>
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
              <span className={styles.panelEyebrow}>Pipeline</span>
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
                    <div className={styles.inlineActions}>
                      <Link href={`/marketplace/opportunities/${opportunity.id}`}>View public brief</Link>
                      {opportunity.hiredJobId ? (
                        <Link href={`/app/contracts/${opportunity.hiredJobId}`}>View contract</Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleLoadApplications(opportunity.id)}
                      >
                        Load applications
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
                        <strong>{application.applicant.displayName}</strong>
                        <p className={styles.stateText}>{application.applicant.headline}</p>
                        <p className={styles.stateText}>Status: {application.status}</p>
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
                            onClick={() =>
                              void handleApplicationDecision(
                                'hire',
                                application.id,
                                opportunity.id,
                              )
                            }
                          >
                            Hire to escrow
                          </button>
                        </div>
                      </div>
                    ))}
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
              <p className={styles.stateText}>No marketplace applications yet.</p>
            ) : (
              myApplications.map((application) => (
                <article key={application.id} className={styles.walletCard}>
                  <strong>{application.opportunity.title}</strong>
                  <p className={styles.stateText}>
                    {application.opportunity.ownerDisplayName} • {application.status}
                  </p>
                  <div className={styles.inlineActions}>
                    <Link href={`/marketplace/opportunities/${application.opportunity.id}`}>
                      View brief
                    </Link>
                    {application.hiredJobId ? (
                      <Link href={`/app/contracts/${application.hiredJobId}`}>View contract</Link>
                    ) : null}
                    {application.status !== 'withdrawn' && application.status !== 'hired' ? (
                      <button
                        type="button"
                        onClick={() => void handleWithdrawApplication(application.id)}
                      >
                        Withdraw
                      </button>
                    ) : null}
                  </div>
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
              <span className={styles.panelEyebrow}>Browse</span>
              <h2>Open opportunities</h2>
            </div>
          </div>
          <div className={styles.stack}>
            {publicOpportunities.length === 0 ? (
              <p className={styles.stateText}>No public opportunities live right now.</p>
            ) : (
              publicOpportunities.map((opportunity) => (
                <article key={opportunity.id} className={styles.walletCard}>
                  <strong>{opportunity.title}</strong>
                  <p className={styles.stateText}>{opportunity.summary}</p>
                  <div className={styles.inlineActions}>
                    <Link href={`/marketplace/opportunities/${opportunity.id}`}>Details</Link>
                    {tokens ? (
                      <>
                        <input
                          value={applyNotes[opportunity.id] ?? ''}
                          onChange={(event) =>
                            setApplyNotes((current) => ({
                              ...current,
                              [opportunity.id]: event.target.value,
                            }))
                          }
                          placeholder="Add a short application note"
                        />
                        <button
                          type="button"
                          onClick={() => void handleApplyToOpportunity(opportunity.id)}
                        >
                          Apply
                        </button>
                      </>
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
              <span className={styles.panelEyebrow}>Escrow</span>
              <h2>Active contracts</h2>
            </div>
          </div>
          <div className={styles.stack}>
            {contracts.length === 0 ? (
              <p className={styles.stateText}>No escrow contracts loaded for this session.</p>
            ) : (
              contracts.map((job) => (
                <article key={job.id} className={styles.walletCard}>
                  <strong>{job.title}</strong>
                  <p className={styles.stateText}>
                    {job.status} • {job.category} • funded {job.fundedAmount ?? '—'}
                  </p>
                </article>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
