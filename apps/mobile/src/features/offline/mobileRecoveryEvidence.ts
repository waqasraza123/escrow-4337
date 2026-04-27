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
    checks: MobileRecoveryEvidenceCheck[];
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
  checkCounts: Record<MobileRecoveryEvidenceCheckStatus, number>;
  offline: boolean;
  outcome: MobileRecoveryEvidenceOutcome;
  restoredFromProfileSnapshot: boolean;
  scenario: MobileRecoveryEvidenceScenario;
  snapshotCount: number | null;
};

export type MobileRecoveryEvidenceScenarioCoverage = {
  reportCount: number;
  latestCapturedAt: string | null;
  latestOutcome: MobileRecoveryEvidenceOutcome | null;
  latestCheckCounts: Record<MobileRecoveryEvidenceCheckStatus, number>;
  hasPassedReport: boolean;
  hasFailedReport: boolean;
};

export type MobileRecoveryEvidenceCoverage = {
  allScenariosObserved: boolean;
  completeScenarioCount: number;
  failingScenarioCount: number;
  passingScenarioCount: number;
  scenarios: Record<MobileRecoveryEvidenceScenario, MobileRecoveryEvidenceScenarioCoverage>;
  totalScenarioCount: number;
};

export type MobileRecoveryEvidenceCapturePlan = {
  completeScenarios: MobileRecoveryEvidenceScenario[];
  guidesByScenario: Record<MobileRecoveryEvidenceScenario, MobileRecoveryEvidenceScenarioGuide>;
  generatedFromReportCount: number;
  missingScenarios: MobileRecoveryEvidenceScenario[];
  nextGuide: MobileRecoveryEvidenceScenarioGuide | null;
  nextScenario: MobileRecoveryEvidenceScenario | null;
  ready: boolean;
  recommendedOutcome: MobileRecoveryEvidenceOutcome;
  requiredScenarioCount: number;
};

export type MobileRecoveryEvidenceScenarioGuide = {
  scenario: MobileRecoveryEvidenceScenario;
  title: string;
  expectedPosture: string;
  captureGoal: string;
  reviewFocus: string[];
};

export type MobileRecoveryEvidenceBundle = {
  version: 1;
  generatedAt: string;
  coverage: MobileRecoveryEvidenceCoverage;
  capturePlan: MobileRecoveryEvidenceCapturePlan;
  readiness: MobileRecoveryEvidenceBundleReadiness;
  reportIdsByScenario: Partial<Record<MobileRecoveryEvidenceScenario, string>>;
  reportsByScenario: Partial<Record<MobileRecoveryEvidenceScenario, MobileRecoveryEvidenceReport>>;
};

export type MobileRecoveryEvidenceBundleReadiness = {
  ready: boolean;
  generatedFromReportCount: number;
  includedScenarioCount: number;
  missingScenarios: MobileRecoveryEvidenceScenario[];
  requiredScenarioCount: number;
  unreadableScenarios: MobileRecoveryEvidenceScenario[];
};

export type MobileRecoveryEvidenceScenario =
  | 'offline_start'
  | 'api_recovery'
  | 'wallet_return'
  | 'project_room';

export type MobileRecoveryEvidenceOutcome = 'observed' | 'passed' | 'failed';
export type MobileRecoveryEvidenceCheckStatus = 'pass' | 'warn' | 'fail';
export type MobileRecoveryEvidenceCheck = {
  id: string;
  label: string;
  status: MobileRecoveryEvidenceCheckStatus;
  detail: string;
};

const evidencePrefix = 'escrow4337.mobileRecoveryEvidence.v1';
export const mobileRecoveryEvidenceMaxEntries = 12;
export const mobileRecoveryEvidenceMaxAgeMs = 1000 * 60 * 60 * 24 * 30;
export const mobileRecoveryEvidenceScenarios: MobileRecoveryEvidenceScenario[] = [
  'offline_start',
  'api_recovery',
  'wallet_return',
  'project_room',
];

export const mobileRecoveryEvidenceScenarioGuides: Record<
  MobileRecoveryEvidenceScenario,
  MobileRecoveryEvidenceScenarioGuide
> = {
  api_recovery: {
    captureGoal: 'Prove the app converges back to live API/session posture after connectivity returns.',
    expectedPosture: 'Device online, runtime-profile reachable',
    reviewFocus: ['API reachability', 'Live session posture', 'Snapshot-to-live convergence'],
    scenario: 'api_recovery',
    title: 'API recovery',
  },
  offline_start: {
    captureGoal: 'Prove account and read snapshots remain inspectable while offline or API-unreachable.',
    expectedPosture: 'Device offline or API unreachable',
    reviewFocus: ['Offline/API posture', 'Cached profile availability', 'Read snapshot inventory'],
    scenario: 'offline_start',
    title: 'Offline start',
  },
  project_room: {
    captureGoal: 'Prove project-room recovery has either a live API source or saved project-room snapshot.',
    expectedPosture: 'Project-room context visible',
    reviewFocus: ['Signed-in state', 'Project-room snapshot presence', 'Live API or snapshot source'],
    scenario: 'project_room',
    title: 'Project room',
  },
  wallet_return: {
    captureGoal: 'Prove wallet-linked account posture survives return to the mobile flow.',
    expectedPosture: 'Signed in with wallet posture visible',
    reviewFocus: ['Signed-in state', 'Linked wallet count', 'Execution or smart-account posture'],
    scenario: 'wallet_return',
    title: 'Wallet return',
  },
};

const emptyCheckCounts: Record<MobileRecoveryEvidenceCheckStatus, number> = {
  fail: 0,
  pass: 0,
  warn: 0,
};

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

function buildCheck(
  id: string,
  label: string,
  status: MobileRecoveryEvidenceCheckStatus,
  detail: string,
): MobileRecoveryEvidenceCheck {
  return {
    detail,
    id,
    label,
    status,
  };
}

function countChecks(checks: MobileRecoveryEvidenceCheck[]) {
  return checks.reduce<Record<MobileRecoveryEvidenceCheckStatus, number>>(
    (counts, check) => {
      counts[check.status] += 1;
      return counts;
    },
    { ...emptyCheckCounts },
  );
}

function createEmptyScenarioCoverage(): MobileRecoveryEvidenceScenarioCoverage {
  return {
    hasFailedReport: false,
    hasPassedReport: false,
    latestCapturedAt: null,
    latestCheckCounts: { ...emptyCheckCounts },
    latestOutcome: null,
    reportCount: 0,
  };
}

function getSnapshotResourceCount(
  snapshotSummary: OfflineSnapshotSummary | null,
  resource: string,
) {
  return snapshotSummary?.resourceCounts[resource] ?? 0;
}

function buildScenarioChecks({
  apiReachability,
  offline,
  profileSnapshotCachedAt,
  restoredFromProfileSnapshot,
  scenario,
  snapshotSummary,
  user,
}: {
  apiReachability: { status: string };
  offline: boolean;
  profileSnapshotCachedAt: number | null;
  restoredFromProfileSnapshot: boolean;
  scenario: MobileRecoveryEvidenceScenario;
  snapshotSummary: OfflineSnapshotSummary | null;
  user: UserProfile | null;
}) {
  const walletCount = user?.wallets.length ?? 0;
  const smartAccountCount =
    user?.wallets.filter((wallet) => wallet.walletKind === 'smart_account').length ?? 0;
  const projectRoomSnapshotCount = getSnapshotResourceCount(snapshotSummary, 'project-room');

  if (scenario === 'offline_start') {
    return [
      buildCheck(
        'offline-posture',
        'Offline posture',
        offline || apiReachability.status === 'skipped' || apiReachability.status === 'unreachable'
          ? 'pass'
          : 'warn',
        offline || apiReachability.status === 'skipped' || apiReachability.status === 'unreachable'
          ? 'Device or API posture reflects an offline/outage capture.'
          : 'Device and API both appear reachable during an offline-start capture.',
      ),
      buildCheck(
        'cached-profile',
        'Cached profile available',
        profileSnapshotCachedAt || restoredFromProfileSnapshot ? 'pass' : 'warn',
        profileSnapshotCachedAt || restoredFromProfileSnapshot
          ? 'A secure profile snapshot is available for account-scoped recovery.'
          : 'No secure profile snapshot was visible for this capture.',
      ),
      buildCheck(
        'snapshot-inventory',
        'Read snapshot inventory',
        (snapshotSummary?.totalCount ?? 0) > 0 ? 'pass' : 'warn',
        (snapshotSummary?.totalCount ?? 0) > 0
          ? 'Read-only snapshot inventory exists on this device.'
          : 'No read-only snapshots were visible on this device.',
      ),
    ];
  }

  if (scenario === 'api_recovery') {
    return [
      buildCheck(
        'device-online',
        'Device online',
        offline ? 'fail' : 'pass',
        offline ? 'Device is still reporting offline.' : 'Device connectivity is available.',
      ),
      buildCheck(
        'api-reachable',
        'API reachable',
        apiReachability.status === 'reachable' ? 'pass' : 'fail',
        apiReachability.status === 'reachable'
          ? 'Runtime-profile probe is reachable.'
          : `Runtime-profile probe status is ${apiReachability.status}.`,
      ),
      buildCheck(
        'session-refresh',
        'Session recovery posture',
        user ? (restoredFromProfileSnapshot ? 'warn' : 'pass') : 'warn',
        user
          ? restoredFromProfileSnapshot
            ? 'Account is still using cached profile context.'
            : 'Account context is live.'
          : 'No signed-in account context is available.',
      ),
    ];
  }

  if (scenario === 'wallet_return') {
    return [
      buildCheck(
        'signed-in',
        'Signed in',
        user ? 'pass' : 'fail',
        user ? 'Account context is available.' : 'No signed-in account context is available.',
      ),
      buildCheck(
        'linked-wallet',
        'Linked wallet',
        walletCount > 0 ? 'pass' : 'fail',
        walletCount > 0 ? 'At least one wallet is linked.' : 'No linked wallet is visible.',
      ),
      buildCheck(
        'execution-wallet',
        'Execution wallet',
        user?.defaultExecutionWalletAddress || smartAccountCount > 0 ? 'pass' : 'warn',
        user?.defaultExecutionWalletAddress || smartAccountCount > 0
          ? 'Default execution or smart-account posture is available.'
          : 'No default execution wallet or smart-account posture is visible.',
      ),
    ];
  }

  return [
    buildCheck(
      'signed-in',
      'Signed in',
      user ? 'pass' : 'fail',
      user ? 'Account context is available.' : 'No signed-in account context is available.',
    ),
    buildCheck(
      'project-room-snapshot',
      'Project-room snapshot',
      projectRoomSnapshotCount > 0 ? 'pass' : 'warn',
      projectRoomSnapshotCount > 0
        ? 'At least one project-room snapshot is available.'
        : 'No project-room snapshot is visible on this device.',
    ),
    buildCheck(
      'project-room-recovery-source',
      'Recovery source',
      apiReachability.status === 'reachable' || projectRoomSnapshotCount > 0 ? 'pass' : 'fail',
      apiReachability.status === 'reachable' || projectRoomSnapshotCount > 0
        ? 'Project-room recovery has a live API or saved snapshot source.'
        : 'No live API or project-room snapshot source is available.',
    ),
  ];
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
    checkCounts: countChecks(report.evidenceContext?.checks ?? []),
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
  const checks = buildScenarioChecks({
    apiReachability,
    offline,
    profileSnapshotCachedAt,
    restoredFromProfileSnapshot,
    scenario,
    snapshotSummary,
    user,
  });

  return {
    version: 1,
    capturedAt: new Date().toISOString(),
    evidenceContext: {
      checks,
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

export function summarizeMobileRecoveryEvidenceCoverage(
  history: MobileRecoveryEvidenceSummary[],
): MobileRecoveryEvidenceCoverage {
  const scenarios = mobileRecoveryEvidenceScenarios.reduce<
    Record<MobileRecoveryEvidenceScenario, MobileRecoveryEvidenceScenarioCoverage>
  >((coverage, scenario) => {
    coverage[scenario] = createEmptyScenarioCoverage();
    return coverage;
  }, {} as Record<MobileRecoveryEvidenceScenario, MobileRecoveryEvidenceScenarioCoverage>);

  for (const summary of history) {
    const scenarioCoverage = scenarios[summary.scenario];
    scenarioCoverage.reportCount += 1;
    scenarioCoverage.hasPassedReport =
      scenarioCoverage.hasPassedReport || summary.outcome === 'passed';
    scenarioCoverage.hasFailedReport =
      scenarioCoverage.hasFailedReport || summary.outcome === 'failed';

    const latestMs = scenarioCoverage.latestCapturedAt
      ? Date.parse(scenarioCoverage.latestCapturedAt)
      : Number.NEGATIVE_INFINITY;
    const summaryMs = Date.parse(summary.capturedAt);

    if (Number.isFinite(summaryMs) && summaryMs >= latestMs) {
      scenarioCoverage.latestCapturedAt = summary.capturedAt;
      scenarioCoverage.latestCheckCounts = summary.checkCounts;
      scenarioCoverage.latestOutcome = summary.outcome;
    }
  }

  const scenarioValues = Object.values(scenarios);
  const completeScenarioCount = scenarioValues.filter((coverage) => coverage.reportCount > 0).length;
  const passingScenarioCount = scenarioValues.filter((coverage) => coverage.hasPassedReport).length;
  const failingScenarioCount = scenarioValues.filter((coverage) => coverage.hasFailedReport).length;

  return {
    allScenariosObserved: completeScenarioCount === mobileRecoveryEvidenceScenarios.length,
    completeScenarioCount,
    failingScenarioCount,
    passingScenarioCount,
    scenarios,
    totalScenarioCount: mobileRecoveryEvidenceScenarios.length,
  };
}

export function buildMobileRecoveryEvidenceCapturePlan(
  history: MobileRecoveryEvidenceSummary[],
): MobileRecoveryEvidenceCapturePlan {
  const coverage = summarizeMobileRecoveryEvidenceCoverage(history);
  const missingScenarios = mobileRecoveryEvidenceScenarios.filter(
    (scenario) => coverage.scenarios[scenario].reportCount === 0,
  );
  const completeScenarios = mobileRecoveryEvidenceScenarios.filter(
    (scenario) => coverage.scenarios[scenario].reportCount > 0,
  );

  return {
    completeScenarios,
    guidesByScenario: mobileRecoveryEvidenceScenarioGuides,
    generatedFromReportCount: history.length,
    missingScenarios,
    nextGuide: missingScenarios[0]
      ? mobileRecoveryEvidenceScenarioGuides[missingScenarios[0]]
      : null,
    nextScenario: missingScenarios[0] ?? null,
    ready: missingScenarios.length === 0,
    recommendedOutcome: 'observed',
    requiredScenarioCount: mobileRecoveryEvidenceScenarios.length,
  };
}

export async function readMobileRecoveryEvidenceReport(id: string) {
  return parseEvidenceReport(await AsyncStorage.getItem(toEvidenceStorageKey(id)));
}

export async function buildMobileRecoveryEvidenceBundle(
  history: MobileRecoveryEvidenceSummary[],
): Promise<MobileRecoveryEvidenceBundle> {
  const coverage = summarizeMobileRecoveryEvidenceCoverage(history);
  const capturePlan = buildMobileRecoveryEvidenceCapturePlan(history);
  const missingScenarios: MobileRecoveryEvidenceScenario[] = [];
  const reportIdsByScenario: Partial<Record<MobileRecoveryEvidenceScenario, string>> = {};
  const reportsByScenario: Partial<Record<MobileRecoveryEvidenceScenario, MobileRecoveryEvidenceReport>> =
    {};
  const unreadableScenarios: MobileRecoveryEvidenceScenario[] = [];

  for (const scenario of mobileRecoveryEvidenceScenarios) {
    const scenarioHistory = history
      .filter((summary) => summary.scenario === scenario)
      .sort((left, right) => Date.parse(right.capturedAt) - Date.parse(left.capturedAt));

    if (!scenarioHistory.length) {
      missingScenarios.push(scenario);
      continue;
    }

    let selectedReportId: string | null = null;
    let selectedReport: MobileRecoveryEvidenceReport | null = null;
    let skippedUnreadableReport = false;

    for (const summary of scenarioHistory) {
      const report = await readMobileRecoveryEvidenceReport(summary.id);

      if (report) {
        selectedReportId = summary.id;
        selectedReport = report;
        break;
      }

      skippedUnreadableReport = true;
    }

    if (!selectedReportId || !selectedReport) {
      unreadableScenarios.push(scenario);
      continue;
    }

    if (skippedUnreadableReport) {
      unreadableScenarios.push(scenario);
    }

    reportIdsByScenario[scenario] = selectedReportId;
    reportsByScenario[scenario] = selectedReport;
  }

  const includedScenarioCount = Object.keys(reportsByScenario).length;
  const requiredScenarioCount = mobileRecoveryEvidenceScenarios.length;

  return {
    version: 1,
    capturePlan,
    coverage,
    generatedAt: new Date().toISOString(),
    readiness: {
      generatedFromReportCount: history.length,
      includedScenarioCount,
      missingScenarios,
      ready:
        includedScenarioCount === requiredScenarioCount &&
        missingScenarios.length === 0 &&
        unreadableScenarios.length === 0,
      requiredScenarioCount,
      unreadableScenarios,
    },
    reportIdsByScenario,
    reportsByScenario,
  };
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
