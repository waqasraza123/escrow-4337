'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '../page.module.css';
import {
  adminApi,
  type MarketplaceAdminOpportunity,
  type MarketplaceAdminProfile,
  type MarketplaceModerationDashboard,
  type MarketplaceModerationStatus,
  type SessionTokens,
  type UserProfile,
} from '../../lib/api';

const sessionStorageKey = 'escrow4337.admin.session';

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

export function MarketplaceModerationConsole() {
  const [tokens, setTokens] = useState<SessionTokens | null>(null);
  const [operator, setOperator] = useState<UserProfile | null>(null);
  const [dashboard, setDashboard] = useState<MarketplaceModerationDashboard | null>(
    null,
  );
  const [profiles, setProfiles] = useState<MarketplaceAdminProfile[]>([]);
  const [opportunities, setOpportunities] = useState<MarketplaceAdminOpportunity[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load(nextTokens: SessionTokens | null = tokens) {
    setError(null);

    if (!nextTokens) {
      setOperator(null);
      setDashboard(null);
      setProfiles([]);
      setOpportunities([]);
      return;
    }

    try {
      const [me, dashboardResponse, profilesResponse, opportunitiesResponse] =
        await Promise.all([
          adminApi.me(nextTokens.accessToken),
          adminApi.getMarketplaceModerationDashboard(nextTokens.accessToken),
          adminApi.listMarketplaceModerationProfiles(nextTokens.accessToken),
          adminApi.listMarketplaceModerationOpportunities(nextTokens.accessToken),
        ]);

      setOperator(me);
      setDashboard(dashboardResponse);
      setProfiles(profilesResponse.profiles);
      setOpportunities(opportunitiesResponse.opportunities);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load moderation');
    }
  }

  useEffect(() => {
    const stored = readSession();
    setTokens(stored);
    void load(stored);
  }, []);

  async function handleSignOut() {
    if (tokens) {
      await adminApi.logout(tokens.refreshToken);
    }
    writeSession(null);
    setTokens(null);
    setMessage('Operator session cleared.');
    await load(null);
  }

  async function handleModerateProfile(
    userId: string,
    moderationStatus: MarketplaceModerationStatus,
  ) {
    if (!tokens) {
      return;
    }

    await adminApi.moderateMarketplaceProfile(
      userId,
      moderationStatus,
      tokens.accessToken,
    );
    setMessage(`Profile moderation updated to ${moderationStatus}.`);
    await load(tokens);
  }

  async function handleModerateOpportunity(
    opportunityId: string,
    moderationStatus: MarketplaceModerationStatus,
  ) {
    if (!tokens) {
      return;
    }

    await adminApi.moderateMarketplaceOpportunity(
      opportunityId,
      moderationStatus,
      tokens.accessToken,
    );
    setMessage(`Opportunity moderation updated to ${moderationStatus}.`);
    await load(tokens);
  }

  return (
    <div className={styles.console}>
      <div className={styles.topBar}>
        <div className={styles.topBarContent}>
          <span className={styles.topBarLabel}>Marketplace moderation</span>
          <p className={styles.topBarMeta}>
            Hide, unhide, or suspend marketplace actors and briefs from the operator surface.
          </p>
        </div>
        <div className={styles.inlineActions}>
          <Link href="/">Operator home</Link>
          {tokens ? (
            <button type="button" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          ) : (
            <Link href="/">Restore session</Link>
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

      {!tokens ? (
        <section className={styles.panel}>
          <h2>Operator session required</h2>
          <p className={styles.stateText}>
            This page uses the existing operator session from the admin console.
          </p>
        </section>
      ) : null}

      {operator && dashboard ? (
        <>
          <section className={styles.summaryGrid}>
            <article>
              <span className={styles.metaLabel}>Operator</span>
              <strong>{operator.email}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Profiles</span>
              <strong>{dashboard.summary.totalProfiles}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Visible profiles</span>
              <strong>{dashboard.summary.visibleProfiles}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Suspended profiles</span>
              <strong>{dashboard.summary.suspendedProfiles}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Published briefs</span>
              <strong>{dashboard.summary.publishedOpportunities}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Hired briefs</span>
              <strong>{dashboard.summary.hiredOpportunities}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Applications</span>
              <strong>{dashboard.summary.totalApplications}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Hire conversion</span>
              <strong>{dashboard.summary.hireConversionPercent}%</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Aging no-hire briefs</span>
              <strong>{dashboard.summary.agingOpportunityCount}</strong>
            </article>
          </section>

          <section className={styles.grid}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Profiles</span>
                  <h2>Talent moderation</h2>
                </div>
              </div>
              <div className={styles.stack}>
                {profiles.map((profile) => (
                  <article key={profile.userId} className={styles.walletCard}>
                    <strong>{profile.displayName}</strong>
                    <p className={styles.stateText}>
                      {profile.slug} • {profile.moderationStatus} • {profile.completedEscrowCount} completed escrows
                    </p>
                    <div className={styles.inlineActions}>
                      <button
                        type="button"
                        onClick={() => void handleModerateProfile(profile.userId, 'visible')}
                      >
                        Visible
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleModerateProfile(profile.userId, 'hidden')}
                      >
                        Hidden
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleModerateProfile(profile.userId, 'suspended')
                        }
                      >
                        Suspend
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Briefs</span>
                  <h2>Opportunity moderation</h2>
                </div>
              </div>
              <div className={styles.stack}>
                {opportunities.map((opportunity) => (
                  <article key={opportunity.id} className={styles.walletCard}>
                    <strong>{opportunity.title}</strong>
                    <p className={styles.stateText}>
                      {opportunity.owner.displayName} • {opportunity.visibility} • {opportunity.status} • {opportunity.moderationStatus}
                    </p>
                    <div className={styles.inlineActions}>
                      <button
                        type="button"
                        onClick={() =>
                          void handleModerateOpportunity(opportunity.id, 'visible')
                        }
                      >
                        Visible
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleModerateOpportunity(opportunity.id, 'hidden')
                        }
                      >
                        Hidden
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleModerateOpportunity(opportunity.id, 'suspended')
                        }
                      >
                        Suspend
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
