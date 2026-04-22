'use client';

import type {
  MarketplaceNotificationPreferences,
  OrganizationInvitation,
  SessionTokens,
  WorkspaceSummary,
} from '../../lib/api';

export const marketplaceSessionStorageKey = 'escrow4337.web.session';

export type LaneKind = 'client' | 'freelancer' | 'agency';

export function readMarketplaceSession(): SessionTokens | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(marketplaceSessionStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionTokens;
  } catch {
    return null;
  }
}

export function writeMarketplaceSession(tokens: SessionTokens | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!tokens) {
    window.localStorage.removeItem(marketplaceSessionStorageKey);
    return;
  }

  window.localStorage.setItem(
    marketplaceSessionStorageKey,
    JSON.stringify(tokens),
  );
}

export function splitList(input: string) {
  return input
    .split(/\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function fromDateInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createDefaultNotificationPreferences(
  userId = 'workspace-user',
): MarketplaceNotificationPreferences {
  const now = Date.now();
  return {
    userId,
    digestCadence: 'manual',
    talentInvitesEnabled: true,
    applicationActivityEnabled: true,
    interviewMessagesEnabled: true,
    offerActivityEnabled: true,
    reviewActivityEnabled: true,
    automationActivityEnabled: true,
    lifecycleDigestEnabled: true,
    analyticsDigestEnabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function getWorkspaceLane(workspace: WorkspaceSummary): LaneKind {
  if (workspace.kind === 'client') {
    return 'client';
  }

  return workspace.organizationKind === 'agency' ? 'agency' : 'freelancer';
}

export function getLaneFromInvitation(
  invitation: Pick<OrganizationInvitation, 'role'>,
): LaneKind {
  return invitation.role === 'client_owner' || invitation.role === 'client_recruiter'
    ? 'client'
    : 'agency';
}

export function workspaceMatchesLane(
  workspace: WorkspaceSummary,
  lane: LaneKind,
) {
  return lane === 'client'
    ? workspace.kind === 'client'
    : lane === 'agency'
      ? workspace.kind === 'freelancer' && workspace.organizationKind === 'agency'
      : workspace.kind === 'freelancer' &&
          workspace.organizationKind !== 'agency';
}

export function buildProjectRoomHref(
  contractPath: string | null,
  jobId: string | null,
) {
  const basePath = contractPath ?? (jobId ? `/app/contracts/${jobId}` : null);
  if (!basePath) {
    return null;
  }

  const [pathname, search = ''] = basePath.split('?');
  return `${pathname}/room${search ? `?${search}` : ''}`;
}
