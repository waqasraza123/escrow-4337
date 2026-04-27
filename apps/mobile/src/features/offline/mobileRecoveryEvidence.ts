import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { UserProfile } from '@escrow4334/product-core';
import type { OfflineSnapshotSummary } from './offlineSnapshots';

export type MobileRecoveryEvidenceReport = {
  version: 1;
  capturedAt: string;
  evidenceContext: {
    scenario: MobileRecoveryEvidenceScenario;
    outcome: MobileRecoveryEvidenceOutcome;
  };
  platform: {
    os: string;
    version: string;
  };
  app: {
    applicationId: string;
    ownership: string;
    version: string;
  };
  api: {
    baseUrl: string;
    reachability: {
      status: string;
      checkedAt: string | null;
      latencyMs: number | null;
      error: string | null;
    };
  };
  network: {
    initialized: boolean;
    offline: boolean;
    connectionType: string;
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    lastChangedAt: string | null;
  };
  session: {
    signedIn: boolean;
    restoredFromProfileSnapshot: boolean;
    profileSnapshotCachedAt: string | null;
    shariahMode: boolean;
    capabilities: {
      chainAuditSync: boolean;
      escrowOperations: boolean;
      escrowResolution: boolean;
      jobHistoryImport: boolean;
      marketplaceModeration: boolean;
    };
    walletPosture: {
      total: number;
      eoa: number;
      smartAccount: number;
      hasDefaultExecutionWallet: boolean;
    };
    workspacePosture: {
      activeKind: string | null;
      activeOrganizationKind: string | null;
      activeRoles: string[];
      totalWorkspaces: number;
    };
  };
  offlineSnapshots: {
    accountScopedCount: number;
    estimatedBytes: number;
    expiredCount: number;
    latestCachedAt: string | null;
    maxAgeMs: number;
    maxEntriesPerScope: number;
    publicCount: number;
    resourceCounts: Record<string, number>;
    totalCount: number;
  } | null;
};

export type MobileRecoveryEvidenceSummary = {
  id: string;
  capturedAt: string;
  apiStatus: string;
  offline: boolean;
  outcome: MobileRecoveryEvidenceOutcome;
  restoredFromProfileSnapshot: boolean;
  scenario: MobileRecoveryEvidenceScenario;
  snapshotCount: number | null;
};

export type MobileRecoveryEvidenceScenario =
  | 'offline_start'
  | 'api_recovery'
  | 'wallet_return'
  | 'project_room';

export type MobileRecoveryEvidenceOutcome = 'observed' | 'passed' | 'failed';

const evidencePrefix = 'escrow4337.mobileRecoveryEvidence.v1';
export const mobileRecoveryEvidenceMaxEntries = 12;
export const mobileRecoveryEvidenceMaxAgeMs = 1000 * 60 * 60 * 24 * 30;

function buildAppVersionLabel() {
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? 'unknown';
}

function sanitizeUrlForEvidence(value: string) {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.split('?')[0]?.split('#')[0] ?? 'unknown';
  }
}

function buildWorkspacePosture(user: UserProfile | null) {
  return {
    activeKind: user?.activeWorkspace?.kind ?? null,
    activeOrganizationKind: user?.activeWorkspace?.organizationKind ?? null,
    activeRoles: user?.activeWorkspace?.roles ?? [],
    totalWorkspaces: user?.workspaces.length ?? 0,
  };
}

function buildWalletPosture(user: UserProfile | null) {
  const wallets = user?.wallets ?? [];

  return {
    total: wallets.length,
    eoa: wallets.filter((wallet) => wallet.walletKind === 'eoa').length,
    smartAccount: wallets.filter((wallet) => wallet.walletKind === 'smart_account').length,
    hasDefaultExecutionWallet: Boolean(user?.defaultExecutionWalletAddress),
  };
}

function buildCapabilityPosture(user: UserProfile | null) {
  if (!user) {
    return {
      chainAuditSync: false,
      escrowOperations: false,
      escrowResolution: false,
      jobHistoryImport: false,
      marketplaceModeration: false,
    };
  }

  return {
    chainAuditSync: user.capabilities.chainAuditSync.allowed,
    escrowOperations: user.capabilities.escrowOperations.allowed,
    escrowResolution: user.capabilities.escrowResolution.allowed,
    jobHistoryImport: user.capabilities.jobHistoryImport.allowed,
    marketplaceModeration: user.capabilities.marketplaceModeration.allowed,
  };
}

function parseEvidenceReport(raw: string | null): MobileRecoveryEvidenceReport | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MobileRecoveryEvidenceReport>;
    return parsed.version === 1 && typeof parsed.capturedAt === 'string'
      ? (parsed as MobileRecoveryEvidenceReport)
      : null;
  } catch {
    return null;
  }
}

function toEvidenceStorageKey(id: string) {
  return `${evidencePrefix}:${id}`;
}

function parseEvidenceStorageKey(key: string) {
  return key.startsWith(`${evidencePrefix}:`) ? key.slice(evidencePrefix.length + 1) : null;
}

function createEvidenceId(report: MobileRecoveryEvidenceReport) {
  const capturedAt = Date.parse(report.capturedAt);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${Number.isFinite(capturedAt) ? capturedAt : Date.now()}-${suffix}`;
}

function summarizeEvidenceReport(
  id: string,
  report: MobileRecoveryEvidenceReport,
): MobileRecoveryEvidenceSummary {
  return {
    id,
    capturedAt: report.capturedAt,
    apiStatus: report.api.reachability.status,
    offline: report.network.offline,
    outcome: report.evidenceContext?.outcome ?? 'observed',
    restoredFromProfileSnapshot: report.session.restoredFromProfileSnapshot,
    scenario: report.evidenceContext?.scenario ?? 'api_recovery',
    snapshotCount: report.offlineSnapshots?.totalCount ?? null,
  };
}

export function buildMobileRecoveryEvidenceReport({
  apiBaseUrl,
  apiReachability,
  connectionType,
  initialized,
  isConnected,
  isInternetReachable,
  lastChangedAt,
  offline,
  outcome,
  profileSnapshotCachedAt,
  restoredFromProfileSnapshot,
  scenario,
  snapshotSummary,
  user,
}: {
  apiBaseUrl: string;
  apiReachability: {
    status: string;
    checkedAt: number | null;
    latencyMs: number | null;
    error: string | null;
  };
  connectionType: string;
  initialized: boolean;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  lastChangedAt: number | null;
  offline: boolean;
  outcome: MobileRecoveryEvidenceOutcome;
  profileSnapshotCachedAt: number | null;
  restoredFromProfileSnapshot: boolean;
  scenario: MobileRecoveryEvidenceScenario;
  snapshotSummary: OfflineSnapshotSummary | null;
  user: UserProfile | null;
}): MobileRecoveryEvidenceReport {
  return {
    version: 1,
    capturedAt: new Date().toISOString(),
    evidenceContext: {
      outcome,
      scenario,
    },
    platform: {
      os: Platform.OS,
      version: String(Platform.Version),
    },
    app: {
      applicationId: Application.applicationId ?? Constants.expoConfig?.slug ?? 'unknown',
      ownership: Constants.appOwnership ?? 'unknown',
      version: buildAppVersionLabel(),
    },
    api: {
      baseUrl: sanitizeUrlForEvidence(apiBaseUrl),
      reachability: {
        status: apiReachability.status,
        checkedAt: apiReachability.checkedAt
          ? new Date(apiReachability.checkedAt).toISOString()
          : null,
        latencyMs: apiReachability.latencyMs,
        error: apiReachability.error,
      },
    },
    network: {
      initialized,
      offline,
      connectionType,
      isConnected,
      isInternetReachable,
      lastChangedAt: lastChangedAt ? new Date(lastChangedAt).toISOString() : null,
    },
    session: {
      signedIn: Boolean(user),
      restoredFromProfileSnapshot,
      profileSnapshotCachedAt: profileSnapshotCachedAt
        ? new Date(profileSnapshotCachedAt).toISOString()
        : null,
      shariahMode: Boolean(user?.shariahMode),
      capabilities: buildCapabilityPosture(user),
      walletPosture: buildWalletPosture(user),
      workspacePosture: buildWorkspacePosture(user),
    },
    offlineSnapshots: snapshotSummary
      ? {
          accountScopedCount: snapshotSummary.accountScopedCount,
          estimatedBytes: snapshotSummary.estimatedBytes,
          expiredCount: snapshotSummary.expiredCount,
          latestCachedAt: snapshotSummary.latestCachedAt
            ? new Date(snapshotSummary.latestCachedAt).toISOString()
            : null,
          maxAgeMs: snapshotSummary.maxAgeMs,
          maxEntriesPerScope: snapshotSummary.maxEntriesPerScope,
          publicCount: snapshotSummary.publicCount,
          resourceCounts: snapshotSummary.resourceCounts,
          totalCount: snapshotSummary.totalCount,
        }
      : null,
  };
}

export async function listMobileRecoveryEvidence(): Promise<MobileRecoveryEvidenceSummary[]> {
  const keys = await AsyncStorage.getAllKeys();
  const evidenceKeys = keys.filter((key) => parseEvidenceStorageKey(key) !== null);

  if (!evidenceKeys.length) {
    return [];
  }

  const values = await AsyncStorage.multiGet(evidenceKeys);

  return values
    .map(([key, raw]) => {
      const id = parseEvidenceStorageKey(key);
      const report = parseEvidenceReport(raw);
      return id && report ? summarizeEvidenceReport(id, report) : null;
    })
    .filter((summary): summary is MobileRecoveryEvidenceSummary => Boolean(summary))
    .sort((left, right) => Date.parse(right.capturedAt) - Date.parse(left.capturedAt));
}

export async function readMobileRecoveryEvidenceReport(id: string) {
  return parseEvidenceReport(await AsyncStorage.getItem(toEvidenceStorageKey(id)));
}

export async function enforceMobileRecoveryEvidenceRetention({
  maxAgeMs = mobileRecoveryEvidenceMaxAgeMs,
  maxEntries = mobileRecoveryEvidenceMaxEntries,
}: {
  maxAgeMs?: number;
  maxEntries?: number;
} = {}) {
  const keys = await AsyncStorage.getAllKeys();
  const evidenceKeys = keys.filter((key) => parseEvidenceStorageKey(key) !== null);

  if (!evidenceKeys.length) {
    return 0;
  }

  const now = Date.now();
  const values = await AsyncStorage.multiGet(evidenceKeys);
  const retained = values
    .map(([key, raw]) => {
      const report = parseEvidenceReport(raw);
      const capturedAt = report ? Date.parse(report.capturedAt) : Number.NaN;
      return {
        capturedAt,
        key,
        valid: report !== null && Number.isFinite(capturedAt),
      };
    })
    .filter((entry) => entry.valid)
    .sort((left, right) => right.capturedAt - left.capturedAt);
  const validKeySet = new Set(retained.map((entry) => entry.key));
  const invalidKeys = evidenceKeys.filter((key) => !validKeySet.has(key));
  const expiredKeys = retained
    .filter((entry) => now - entry.capturedAt > Math.max(0, maxAgeMs))
    .map((entry) => entry.key);
  const expiredKeySet = new Set(expiredKeys);
  const overflowKeys = retained
    .filter((entry) => !expiredKeySet.has(entry.key))
    .slice(Math.max(0, maxEntries))
    .map((entry) => entry.key);
  const removalKeys = [...new Set([...invalidKeys, ...expiredKeys, ...overflowKeys])];

  if (removalKeys.length) {
    await AsyncStorage.multiRemove(removalKeys);
  }

  return removalKeys.length;
}

export async function saveMobileRecoveryEvidenceReport(report: MobileRecoveryEvidenceReport) {
  const id = createEvidenceId(report);
  await AsyncStorage.setItem(toEvidenceStorageKey(id), JSON.stringify(report));
  await enforceMobileRecoveryEvidenceRetention();
  return id;
}

export async function clearMobileRecoveryEvidence() {
  const keys = await AsyncStorage.getAllKeys();
  const evidenceKeys = keys.filter((key) => parseEvidenceStorageKey(key) !== null);

  if (evidenceKeys.length) {
    await AsyncStorage.multiRemove(evidenceKeys);
  }

  return evidenceKeys.length;
}
