'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './page.module.css';
import {
  createErrorState,
  createIdleState,
  createSuccessState,
  createWorkingState,
  describeRuntimeAlignment,
  EmptyStateCard,
  formatTimestamp,
  previewHash,
  pushStoredStringList,
  readStoredStringList,
  saveDownloadedDocument,
  StatusNotice,
  type AsyncState,
  writeStoredStringList,
} from '@escrow4334/frontend-core';
import {
  adminApi,
  type AuditBundle,
  type CaseExportArtifact,
  type CaseExportFormat,
  type EscrowAuthorityStatus,
  type EscrowChainIngestionStatus,
  type EscrowChainSyncBatchReport,
  type EscrowChainSyncDaemonHealthReport,
  type EscrowChainSyncDaemonStatus,
  type EscrowChainSyncReport,
  type EscrowHealthReport,
  type EscrowJobHistoryImportReport,
  type RuntimeProfile,
  type SessionTokens,
  type UserProfile,
  type WalletLinkChallenge,
} from '../lib/api';
import {
  buildCaseBrief,
  buildExecutionIssueCards,
  buildMilestoneReviewCards,
  buildOperatorTimeline,
  getDisputedMilestoneCards,
  getExecutionFailures,
  getRecentLookupSuggestions,
} from './operator-case';
import { LanguageSwitcher } from './language-switcher';
import { useOperatorLaunchWalkthrough } from './operator-walkthrough';
import { useAdminI18n } from '../lib/i18n';

const historyKey = 'escrow4337.admin.recent-lookups';
const sessionStorageKey = 'escrow4337.admin.session';

export type OperatorConsoleView = 'dashboard' | 'case';

type OperatorConsoleProps = {
  view?: OperatorConsoleView;
  initialJobId?: string | null;
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

function getPressureClassName(pressure: 'stable' | 'attention' | 'critical') {
  switch (pressure) {
    case 'stable':
      return styles.pressureStable;
    case 'attention':
      return styles.pressureAttention;
    case 'critical':
      return styles.pressureCritical;
  }
}

function getMilestonePostureClassName(posture: 'stable' | 'review' | 'resolved') {
  switch (posture) {
    case 'stable':
      return styles.postureStable;
    case 'review':
      return styles.postureReview;
    case 'resolved':
      return styles.postureResolved;
  }
}

function getTimelineToneClassName(tone: 'neutral' | 'warning' | 'critical' | 'success') {
  switch (tone) {
    case 'neutral':
      return styles.timelineNeutral;
    case 'warning':
      return styles.timelineWarning;
    case 'critical':
      return styles.timelineCritical;
    case 'success':
      return styles.timelineSuccess;
  }
}

function getOperationsReasonLabel(reason: EscrowHealthReport['jobs'][number]['reasons'][number]) {
  switch (reason) {
    case 'chain_sync_backlog':
      return 'Chain sync backlog';
    case 'failed_execution':
      return 'Failed execution';
    case 'open_dispute':
      return 'Open dispute';
    case 'reconciliation_drift':
      return 'Reconciliation drift';
    case 'stale_job':
      return 'Stale job';
  }
}

type OperationsReasonFilter = 'all' | EscrowHealthReport['jobs'][number]['reasons'][number];

type FailureWorkflowStatus = NonNullable<
  EscrowHealthReport['jobs'][number]['executionFailureWorkflow']
>['status'];

function getOperationsReasonFilterLabel(reason: OperationsReasonFilter) {
  switch (reason) {
    case 'all':
      return 'All attention';
    case 'chain_sync_backlog':
      return 'Chain sync backlog';
    case 'failed_execution':
      return 'Failed executions';
    case 'open_dispute':
      return 'Open disputes';
    case 'reconciliation_drift':
      return 'Reconciliation drift';
    case 'stale_job':
      return 'Stale jobs';
  }
}

function getChainSyncCoverageLabel(
  status: NonNullable<EscrowHealthReport['jobs'][number]['chainSync']>['status'],
) {
  switch (status) {
    case 'pending_initial_sync':
      return 'Pending initial sync';
    case 'healthy':
      return 'Healthy';
    case 'stale':
      return 'Stale';
    case 'failing':
      return 'Failing';
  }
}

function getReconciliationSeverityLabel(severity: 'warning' | 'critical') {
  switch (severity) {
    case 'warning':
      return 'Warning';
    case 'critical':
      return 'Critical';
  }
}

function formatReconciliationValue(value: string | null) {
  return value ?? 'null';
}

function formatBooleanSummary(value: boolean) {
  return value ? 'Yes' : 'No';
}

function getChainSyncModeLabel(mode: EscrowChainSyncReport['mode']) {
  switch (mode) {
    case 'persisted':
      return 'Persisted';
    case 'preview':
      return 'Preview';
  }
}

function getChainSyncBatchOutcomeLabel(
  outcome: EscrowChainSyncBatchReport['jobs'][number]['outcome'],
) {
  switch (outcome) {
    case 'blocked':
      return 'Blocked';
    case 'changed':
      return 'Changed';
    case 'clean':
      return 'Clean';
    case 'failed':
      return 'Failed';
    case 'persisted':
      return 'Persisted';
  }
}

function getChainSyncDaemonStateLabel(state: EscrowChainSyncDaemonStatus['worker']['state']) {
  switch (state) {
    case 'idle':
      return 'Idle';
    case 'running':
      return 'Running';
    case 'stopped':
      return 'Stopped';
  }
}

function getChainSyncDaemonOutcomeLabel(
  outcome: NonNullable<EscrowChainSyncDaemonStatus['lastRun']>['outcome'],
) {
  switch (outcome) {
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
  }
}

function getChainSyncDaemonLockProviderLabel(
  provider: NonNullable<EscrowChainSyncDaemonStatus['lastRun']>['lockProvider'],
) {
  switch (provider) {
    case 'local':
      return 'Local';
    case 'postgres_advisory':
      return 'Postgres advisory lock';
    case null:
      return 'Unavailable';
  }
}

function getChainSyncDaemonHealthStatusLabel(
  status: EscrowChainSyncDaemonHealthReport['status'],
) {
  switch (status) {
    case 'ok':
      return 'Healthy';
    case 'warning':
      return 'Warning';
    case 'failed':
      return 'Critical';
  }
}

function getChainIngestionStatusLabel(
  status: RuntimeProfile['operations']['chainIngestion']['status'],
) {
  switch (status) {
    case 'ok':
      return 'Healthy';
    case 'warning':
      return 'Warning';
    case 'failed':
      return 'Critical';
  }
}

function getAuthoritySourceLabel(source: EscrowAuthorityStatus['source']) {
  switch (source) {
    case 'chain_projection':
      return 'Chain projection';
    case 'local_fallback':
      return 'Local fallback';
  }
}

function getAuthorityReasonLabel(reason: EscrowAuthorityStatus['reason']) {
  switch (reason) {
    case null:
      return 'Projection is fresh and healthy.';
    case 'authority_reads_disabled':
      return 'Authority reads are disabled for this environment.';
    case 'projection_missing':
      return 'No onchain projection is available yet.';
    case 'projection_stale':
      return 'The latest projection is stale.';
    case 'projection_degraded':
      return 'The latest projection is degraded.';
    case 'projection_older_than_local_state':
      return 'The local job contains newer onchain activity than the last projection.';
    default:
      return reason.replaceAll('_', ' ');
  }
}

function formatFailureBreakdown(
  items: Array<{
    count: number;
    label: string;
  }>,
) {
  return items.map((item) => `${item.label} x${item.count}`).join(', ');
}

function formatFailureCodeLabel(failureCode: string | null) {
  return failureCode ?? 'unknown';
}

function getFailureGuidanceSurfaceLabel(
  surface: NonNullable<EscrowHealthReport['jobs'][number]['failureGuidance']>['responsibleSurface'],
) {
  switch (surface) {
    case 'wallet_relay':
      return 'Wallet relay';
    case 'bundler':
      return 'Bundler';
    case 'paymaster_or_sponsor':
      return 'Paymaster or sponsor';
    case 'rpc_or_provider':
      return 'RPC or provider';
    case 'operator_input':
      return 'Operator input';
    case 'unknown':
      return 'Unknown surface';
  }
}

function getFailureRetryPostureLabel(
  posture: NonNullable<EscrowHealthReport['jobs'][number]['failureGuidance']>['retryPosture'],
) {
  switch (posture) {
    case 'safe_after_review':
      return 'Safe after review';
    case 'wait_for_external_fix':
      return 'Wait for external fix';
    case 'hold_for_configuration_change':
      return 'Hold for configuration change';
  }
}

function getFailureWorkflowStatusLabel(status: FailureWorkflowStatus) {
  switch (status) {
    case 'investigating':
      return 'Investigating';
    case 'blocked_external':
      return 'Blocked externally';
    case 'ready_to_retry':
      return 'Ready to retry';
    case 'monitoring':
      return 'Monitoring';
  }
}

function defaultFailureWorkflowStatus(
  guidance: EscrowHealthReport['jobs'][number]['failureGuidance'],
): FailureWorkflowStatus {
  return guidance?.retryPosture === 'wait_for_external_fix' ? 'blocked_external' : 'investigating';
}

function getFailureAcknowledgementMessage(
  workflow: NonNullable<EscrowHealthReport['jobs'][number]['executionFailureWorkflow']>,
) {
  if (workflow.acknowledgedFailureAt === null) {
    return 'Latest failures are not yet acknowledged.';
  }

  if (workflow.latestFailureNeedsAcknowledgement) {
    return `Acknowledged through ${formatTimestamp(
      workflow.acknowledgedFailureAt,
    )}. A newer failure now requires operator follow-up.`;
  }

  return `Acknowledged through the latest failure at ${formatTimestamp(
    workflow.acknowledgedFailureAt,
  )}.`;
}

function getOperatorFrame(
  view: OperatorConsoleView,
  messages: ReturnType<typeof useAdminI18n>['messages'],
) {
  if (view === 'case') {
    return messages.frame.case;
  }

  return messages.frame.dashboard;
}

export function OperatorConsole({
  view = 'dashboard',
  initialJobId = null,
}: OperatorConsoleProps) {
  const { definition, messages } = useAdminI18n();
  const frame = getOperatorFrame(view, messages);
  const [runtimeProfile, setRuntimeProfile] = useState<RuntimeProfile | null>(null);
  const [runtimeState, setRuntimeState] = useState<AsyncState>(createIdleState());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [jobId, setJobId] = useState(initialJobId ?? '');
  const [audit, setAudit] = useState<AuditBundle | null>(null);
  const [lookupHistory, setLookupHistory] = useState<string[]>([]);
  const [challenge, setChallenge] = useState<WalletLinkChallenge | null>(null);
  const [linkAddress, setLinkAddress] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkChainId, setLinkChainId] = useState('84532');
  const [walletSignature, setWalletSignature] = useState('');
  const [escrowHealth, setEscrowHealth] = useState<EscrowHealthReport | null>(null);
  const [healthReasonFilter, setHealthReasonFilter] = useState<OperationsReasonFilter>('all');
  const [failureWorkflowDrafts, setFailureWorkflowDrafts] = useState<Record<string, string>>({});
  const [failureWorkflowStatuses, setFailureWorkflowStatuses] = useState<
    Record<string, FailureWorkflowStatus>
  >({});
  const [failureWorkflowStates, setFailureWorkflowStates] = useState<Record<string, AsyncState>>(
    {},
  );
  const [reconciliationImportJson, setReconciliationImportJson] = useState('');
  const [reconciliationImportReport, setReconciliationImportReport] =
    useState<EscrowJobHistoryImportReport | null>(null);
  const [chainSyncJobId, setChainSyncJobId] = useState('');
  const [chainSyncFromBlock, setChainSyncFromBlock] = useState('');
  const [chainSyncToBlock, setChainSyncToBlock] = useState('');
  const [chainSyncReport, setChainSyncReport] = useState<EscrowChainSyncReport | null>(null);
  const [chainSyncBatchScope, setChainSyncBatchScope] = useState<'all' | 'attention'>('attention');
  const [chainSyncBatchReason, setChainSyncBatchReason] = useState<OperationsReasonFilter>('all');
  const [chainSyncBatchLimit, setChainSyncBatchLimit] = useState('10');
  const [chainSyncBatchReport, setChainSyncBatchReport] =
    useState<EscrowChainSyncBatchReport | null>(null);
  const [chainIngestionStatus, setChainIngestionStatus] =
    useState<EscrowChainIngestionStatus | null>(null);
  const [chainSyncDaemonHealth, setChainSyncDaemonHealth] =
    useState<EscrowChainSyncDaemonHealthReport | null>(null);
  const [staleWorkflowDrafts, setStaleWorkflowDrafts] = useState<Record<string, string>>({});
  const [staleWorkflowStates, setStaleWorkflowStates] = useState<Record<string, AsyncState>>({});
  const [startState, setStartState] = useState<AsyncState>(createIdleState());
  const [verifyState, setVerifyState] = useState<AsyncState>(createIdleState());
  const [sessionState, setSessionState] = useState<AsyncState>(createIdleState());
  const [healthState, setHealthState] = useState<AsyncState>(createIdleState());
  const [reconciliationImportState, setReconciliationImportState] =
    useState<AsyncState>(createIdleState());
  const [chainSyncState, setChainSyncState] = useState<AsyncState>(createIdleState());
  const [chainSyncBatchState, setChainSyncBatchState] = useState<AsyncState>(createIdleState());
  const [chainIngestionState, setChainIngestionState] = useState<AsyncState>(createIdleState());
  const [chainSyncDaemonState, setChainSyncDaemonState] = useState<AsyncState>(createIdleState());
  const [walletActionState, setWalletActionState] = useState<AsyncState>(createIdleState());
  const [resolutionState, setResolutionState] = useState<AsyncState>(createIdleState());
  const [exportState, setExportState] = useState<AsyncState>(createIdleState());
  const [resolutionMilestoneIndex, setResolutionMilestoneIndex] = useState<number | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'release' | 'refund'>('release');
  const [resolutionNote, setResolutionNote] = useState('');
  const [state, setState] = useState<AsyncState>(createIdleState());
  const nextSessionSuccessMessageRef = useRef<string | null>(null);
  const formatDate = (value?: number | null, fallback?: string) =>
    formatTimestamp(value, {
      fallback,
      locale: definition.langTag,
    });

  useEffect(() => {
    setLookupHistory(readStoredStringList(historyKey));
  }, []);

  useEffect(() => {
    setJobId(initialJobId ?? '');
  }, [initialJobId]);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      return;
    }

    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
  }, []);

  useEffect(() => {
    void loadRuntimeProfile();
  }, []);

  useEffect(() => {
    if (!initialJobId) {
      return;
    }

    void handleLookup(initialJobId);
  }, [initialJobId]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const successMessage =
      nextSessionSuccessMessageRef.current ?? 'Operator session is current.';
    nextSessionSuccessMessageRef.current = null;
    void refreshOperatorSession(accessToken, successMessage);
  }, [accessToken]);

  async function loadRuntimeProfile() {
    setRuntimeState(createWorkingState('Loading backend runtime profile...'));

    try {
      const nextProfile = await adminApi.getRuntimeProfile();
      setRuntimeProfile(nextProfile);
      setRuntimeState(createSuccessState(nextProfile.summary));
    } catch (error) {
      setRuntimeState(createErrorState(error, 'Failed to load backend runtime profile'));
    }
  }

  async function refreshOperatorSession(
    token = accessToken,
    successMessage = 'Operator session is current.',
  ) {
    if (!token) {
      return;
    }

    setSessionState(createWorkingState('Refreshing operator session...'));

    try {
      const nextProfile = await adminApi.me(token);
      setProfile(nextProfile);
      setLinkAddress(
        (current) =>
          current ||
          nextProfile.wallets.find((wallet) => wallet.walletKind === 'eoa')?.address ||
          '',
      );
      setSessionState(createSuccessState(successMessage));
    } catch (error) {
      setSessionState(createErrorState(error, 'Failed to load operator session'));
      clearSession();
    }
  }

  async function handleLookup(nextJobId = jobId) {
    const normalizedJobId = nextJobId.trim();
    if (!normalizedJobId) {
      setState(createErrorState(null, 'Provide a job id before loading the public audit bundle.'));
      return false;
    }

    setJobId(normalizedJobId);
    setState(createWorkingState('Loading operator case review...'));

    try {
      const nextAudit = await adminApi.getAudit(normalizedJobId);
      setAudit(nextAudit);
      setExportState(createIdleState());
      const nextHistory = pushStoredStringList(lookupHistory, normalizedJobId);
      setLookupHistory(nextHistory);
      writeStoredStringList(historyKey, nextHistory);
      setState(
        createSuccessState(
          'Operator case loaded. Review dispute pressure, execution receipts, and blocked privileged actions below.',
        ),
      );
      return true;
    } catch (error) {
      setAudit(null);
      setExportState(createIdleState());
      setState(createErrorState(error, 'Failed to load operator case'));
      return false;
    }
  }

  async function handleStartAuth() {
    setStartState(createWorkingState('Sending OTP...'));

    try {
      await adminApi.startAuth(authEmail);
      setStartState(
        createSuccessState('OTP issued. Check your configured mail inbox or relay logs.'),
      );
    } catch (error) {
      setStartState(createErrorState(error, 'Failed to start operator auth'));
    }
  }

  async function handleVerifyAuth() {
    setVerifyState(createWorkingState('Verifying operator session...'));

    try {
      const response = await adminApi.verifyAuth(authEmail, authCode);
      setAccessToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      setProfile(response.user);
      writeSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      setVerifyState(createSuccessState('Operator session established. Loading profile state...'));
    } catch (error) {
      setVerifyState(createErrorState(error, 'Failed to verify operator session'));
    }
  }

  async function handleRefreshSession() {
    if (!refreshToken) {
      return;
    }

    setSessionState(createWorkingState('Refreshing operator session...'));

    try {
      const tokens = await adminApi.refresh(refreshToken);
      nextSessionSuccessMessageRef.current = 'Operator session refreshed.';
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);
      writeSession(tokens);
    } catch (error) {
      setSessionState(createErrorState(error, 'Operator session refresh failed'));
      clearSession();
    }
  }

  async function handleLogout() {
    try {
      await adminApi.logout(refreshToken);
    } finally {
      clearSession();
    }
  }

  function clearSession() {
    setAccessToken(null);
    setRefreshToken(null);
    setProfile(null);
    setChallenge(null);
    setEscrowHealth(null);
    setHealthState(createIdleState());
    setChainSyncDaemonHealth(null);
    setChainSyncDaemonState(createIdleState());
    setReconciliationImportReport(null);
    setReconciliationImportState(createIdleState());
    setReconciliationImportJson('');
    setFailureWorkflowDrafts({});
    setFailureWorkflowStatuses({});
    setFailureWorkflowStates({});
    setStaleWorkflowDrafts({});
    setStaleWorkflowStates({});
    setWalletSignature('');
    writeSession(null);
  }

  async function handleCreateChallenge() {
    if (!accessToken) {
      return;
    }

    setWalletActionState(createWorkingState('Issuing operator wallet-link challenge...'));

    try {
      const nextChallenge = await adminApi.createWalletChallenge(
        {
          address: linkAddress,
          walletKind: 'eoa',
          chainId: Number(linkChainId),
          label: linkLabel || undefined,
        },
        accessToken,
      );
      setChallenge(nextChallenge);
      setWalletActionState(
        createSuccessState(
          'Challenge created. Sign the message with the arbitrator wallet, then paste the signature.',
        ),
      );
    } catch (error) {
      setWalletActionState(createErrorState(error, 'Failed to issue wallet challenge'));
    }
  }

  async function handleVerifyWallet() {
    if (!accessToken || !challenge) {
      return;
    }

    setWalletActionState(createWorkingState('Verifying arbitrator wallet signature...'));

    try {
      await adminApi.verifyWalletChallenge(
        {
          challengeId: challenge.challengeId,
          message: challenge.message,
          signature: walletSignature,
        },
        accessToken,
      );
      setChallenge(null);
      setWalletSignature('');
      await refreshOperatorSession(accessToken);
      setWalletActionState(
        createSuccessState(
          'Wallet linked. Arbitrator authority is now available for dispute resolution.',
        ),
      );
    } catch (error) {
      setWalletActionState(createErrorState(error, 'Failed to verify operator wallet'));
    }
  }

  const caseBrief = useMemo(
    () => (audit ? buildCaseBrief(audit.bundle, messages.helperCopy) : null),
    [audit, messages.helperCopy],
  );
  const milestoneReviewCards = useMemo(
    () => (audit ? buildMilestoneReviewCards(audit.bundle.job, messages.helperCopy) : []),
    [audit, messages.helperCopy],
  );
  const disputedMilestoneCards = useMemo(
    () => getDisputedMilestoneCards(milestoneReviewCards),
    [milestoneReviewCards],
  );
  const executionIssueCards = useMemo(
    () => (audit ? buildExecutionIssueCards(audit.bundle.executions, messages.helperCopy) : []),
    [audit, messages.helperCopy],
  );
  const failedExecutionCards = useMemo(
    () => getExecutionFailures(executionIssueCards),
    [executionIssueCards],
  );
  const operatorTimeline = useMemo(
    () => (audit ? buildOperatorTimeline(audit.bundle, messages.helperCopy) : []),
    [audit, messages.helperCopy],
  );
  const lookupSuggestions = useMemo(
    () => getRecentLookupSuggestions(lookupHistory, jobId),
    [jobId, lookupHistory],
  );
  const linkedWalletAddresses = useMemo(
    () => new Set(profile?.wallets.map((wallet) => wallet.address) ?? []),
    [profile],
  );
  const arbitratorAddress = runtimeProfile?.operator.arbitratorAddress ?? null;
  const controlsArbitratorWallet = Boolean(
    arbitratorAddress && linkedWalletAddresses.has(arbitratorAddress),
  );
  const runtimeAlignment = describeRuntimeAlignment(
    adminApi.baseUrl,
    runtimeProfile,
    typeof window === 'undefined' ? null : window.location.origin,
  );
  const runtimeChainIngestion = runtimeProfile?.operations.chainIngestion ?? null;
  const selectedResolutionCard = useMemo(
    () =>
      disputedMilestoneCards.find((card) => card.milestoneIndex === resolutionMilestoneIndex) ??
      disputedMilestoneCards[0] ??
      null,
    [disputedMilestoneCards, resolutionMilestoneIndex],
  );
  const walkthrough = useOperatorLaunchWalkthrough({
    view,
    accessToken,
    controlsArbitratorWallet,
    hasDisputedMilestone: disputedMilestoneCards.length > 0,
    caseLoaded: Boolean(audit),
    currentJobId: audit?.bundle.job.id ?? initialJobId ?? null,
  });

  useEffect(() => {
    if (!accessToken) {
      setEscrowHealth(null);
      setHealthState(createIdleState());
      setChainIngestionStatus(null);
      setChainIngestionState(createIdleState());
      setChainSyncDaemonHealth(null);
      setChainSyncDaemonState(createIdleState());
      setReconciliationImportReport(null);
      setReconciliationImportState(createIdleState());
      setFailureWorkflowDrafts({});
      setFailureWorkflowStatuses({});
      setFailureWorkflowStates({});
      setStaleWorkflowDrafts({});
      setStaleWorkflowStates({});
      return;
    }

    if (!controlsArbitratorWallet) {
      setEscrowHealth(null);
      setHealthState(createIdleState());
      setChainIngestionStatus(null);
      setChainIngestionState(createIdleState());
      setChainSyncDaemonHealth(null);
      setChainSyncDaemonState(createIdleState());
      setReconciliationImportReport(null);
      setReconciliationImportState(createIdleState());
      setFailureWorkflowDrafts({});
      setFailureWorkflowStatuses({});
      setFailureWorkflowStates({});
      setStaleWorkflowDrafts({});
      setStaleWorkflowStates({});
      return;
    }

    void loadEscrowHealth(accessToken, healthReasonFilter);
    void loadChainIngestionStatus(accessToken);
    void loadChainSyncDaemonStatus(accessToken);
  }, [accessToken, controlsArbitratorWallet, healthReasonFilter]);

  useEffect(() => {
    if (!escrowHealth) {
      return;
    }

    setFailureWorkflowDrafts((current) => {
      const next = { ...current };

      for (const job of escrowHealth.jobs) {
        if (!job.reasons.includes('failed_execution')) {
          continue;
        }

        next[job.jobId] = current[job.jobId] ?? job.executionFailureWorkflow?.note ?? '';
      }

      return next;
    });

    setFailureWorkflowStatuses((current) => {
      const next = { ...current };

      for (const job of escrowHealth.jobs) {
        if (!job.reasons.includes('failed_execution')) {
          continue;
        }

        next[job.jobId] =
          current[job.jobId] ??
          job.executionFailureWorkflow?.status ??
          defaultFailureWorkflowStatus(job.failureGuidance);
      }

      return next;
    });

    setStaleWorkflowDrafts((current) => {
      const next = { ...current };

      for (const job of escrowHealth.jobs) {
        if (!job.reasons.includes('stale_job')) {
          continue;
        }

        next[job.jobId] = current[job.jobId] ?? job.staleWorkflow?.note ?? '';
      }

      return next;
    });
  }, [escrowHealth]);

  useEffect(() => {
    setResolutionMilestoneIndex((current) => {
      if (
        current !== null &&
        disputedMilestoneCards.some((card) => card.milestoneIndex === current)
      ) {
        return current;
      }

      return disputedMilestoneCards[0]?.milestoneIndex ?? null;
    });
  }, [disputedMilestoneCards]);

  async function loadEscrowHealth(
    token = accessToken,
    reason: OperationsReasonFilter = healthReasonFilter,
  ) {
    if (!token) {
      return;
    }

    setHealthState(createWorkingState('Loading escrow operations health...'));

    try {
      const report = await adminApi.getEscrowHealth(token, {
        reason: reason === 'all' ? undefined : reason,
      });
      setEscrowHealth(report);
      setHealthState(
        createSuccessState(
          `Loaded ${report.summary.matchedJobs} jobs for ${getOperationsReasonFilterLabel(reason).toLowerCase()}.`,
        ),
      );
    } catch (error) {
      setEscrowHealth(null);
      setHealthState(createErrorState(error, 'Failed to load escrow operations health'));
    }
  }

  async function loadChainSyncDaemonStatus(token = accessToken) {
    if (!token) {
      return;
    }

    setChainSyncDaemonState(createWorkingState('Loading recurring chain-sync daemon status...'));

    try {
      const status = await adminApi.getEscrowChainSyncDaemonHealth(token);
      setChainSyncDaemonHealth(status);
      setChainSyncDaemonState(
        createSuccessState(
          `Loaded daemon health: ${getChainSyncDaemonHealthStatusLabel(
            status.status,
          ).toLowerCase()}.`,
        ),
      );
    } catch (error) {
      setChainSyncDaemonHealth(null);
      setChainSyncDaemonState(
        createErrorState(error, 'Failed to load recurring chain-sync daemon status'),
      );
    }
  }

  async function loadChainIngestionStatus(token = accessToken) {
    if (!token) {
      return;
    }

    setChainIngestionState(createWorkingState('Loading finalized chain ingestion status...'));

    try {
      const status = await adminApi.getEscrowChainIngestionStatus(token);
      setChainIngestionStatus(status);
      setChainIngestionState(
        createSuccessState(
          `Loaded finalized ingestion status: ${getChainIngestionStatusLabel(
            status.status,
          ).toLowerCase()}.`,
        ),
      );
    } catch (error) {
      setChainIngestionStatus(null);
      setChainIngestionState(
        createErrorState(error, 'Failed to load finalized chain ingestion status'),
      );
    }
  }

  async function handleImportJobHistoryReconciliation() {
    if (!accessToken) {
      return;
    }

    const documentJson = reconciliationImportJson.trim();
    if (!documentJson) {
      setReconciliationImportState(
        createErrorState(
          new Error('Missing job-history JSON'),
          'Paste a job-history JSON export before importing.',
        ),
      );
      return;
    }

    setReconciliationImportState(
      createWorkingState('Importing job-history reconciliation preview...'),
    );

    try {
      const report = await adminApi.importJobHistoryReconciliation(documentJson, accessToken);
      setReconciliationImportReport(report);
      setReconciliationImportState(
        createSuccessState(`Imported job-history preview for ${report.document.jobId}.`),
      );
    } catch (error) {
      setReconciliationImportReport(null);
      setReconciliationImportState(
        createErrorState(error, 'Failed to import job-history reconciliation'),
      );
    }
  }

  async function handleChainAuditSync(persist: boolean) {
    if (!accessToken) {
      return;
    }

    const nextJobId = chainSyncJobId.trim();
    if (!nextJobId) {
      setChainSyncState(
        createErrorState(
          new Error('Missing job id'),
          'Provide a job id before scanning chain audit history.',
        ),
      );
      return;
    }

    const parseOptionalBlock = (value: string, fieldLabel: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }
      const parsed = Number.parseInt(trimmed, 10);
      if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error(`${fieldLabel} must be a non-negative integer`);
      }
      return parsed;
    };

    let fromBlock: number | undefined;
    let toBlock: number | undefined;
    try {
      fromBlock = parseOptionalBlock(chainSyncFromBlock, 'From block');
      toBlock = parseOptionalBlock(chainSyncToBlock, 'To block');
    } catch (error) {
      setChainSyncState(createErrorState(error, 'Chain sync block bounds are invalid'));
      return;
    }

    setChainSyncState(
      createWorkingState(
        persist
          ? 'Scanning and persisting chain-derived audit history...'
          : 'Scanning chain-derived audit history...',
      ),
    );

    try {
      const report = await adminApi.syncEscrowChainAudit(
        {
          jobId: nextJobId,
          fromBlock,
          toBlock,
          persist,
        },
        accessToken,
      );
      setChainSyncReport(report);
      setChainSyncState(
        createSuccessState(
          report.persistence.requested && report.persistence.applied
            ? `Persisted chain audit sync for ${report.job.jobId}.`
            : report.persistence.requested && report.persistence.blocked
              ? `Chain audit sync for ${report.job.jobId} found blocking issues.`
              : `Previewed chain audit sync for ${report.job.jobId}.`,
        ),
      );

      if (report.persistence.applied) {
        void loadEscrowHealth(accessToken);
      }
    } catch (error) {
      setChainSyncReport(null);
      setChainSyncState(createErrorState(error, 'Failed to sync chain-derived audit history'));
    }
  }

  async function handleBatchChainAuditSync(persist: boolean) {
    if (!accessToken) {
      return;
    }

    const parsedLimit = Number.parseInt(chainSyncBatchLimit.trim(), 10);
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      setChainSyncBatchState(
        createErrorState(new Error('Invalid sync limit'), 'Provide a positive batch sync limit.'),
      );
      return;
    }

    setChainSyncBatchState(
      createWorkingState(
        persist
          ? 'Scanning and persisting chain-derived audit history for a job batch...'
          : 'Scanning chain-derived audit history for a job batch...',
      ),
    );

    try {
      const report = await adminApi.syncEscrowChainAuditBatch(
        {
          scope: chainSyncBatchScope,
          reason:
            chainSyncBatchScope === 'attention' && chainSyncBatchReason !== 'all'
              ? chainSyncBatchReason
              : undefined,
          limit: parsedLimit,
          persist,
        },
        accessToken,
      );
      setChainSyncBatchReport(report);
      setChainSyncBatchState(
        createSuccessState(
          report.summary.failedJobs > 0
            ? `Batch chain sync completed with ${report.summary.failedJobs} failed jobs.`
            : report.summary.persistedJobs > 0
              ? `Batch chain sync persisted ${report.summary.persistedJobs} jobs.`
              : `Batch chain sync processed ${report.summary.processedJobs} jobs.`,
        ),
      );

      if (report.summary.persistedJobs > 0) {
        void loadEscrowHealth(accessToken);
      }
    } catch (error) {
      setChainSyncBatchReport(null);
      setChainSyncBatchState(createErrorState(error, 'Failed to sync chain-derived audit batch'));
    }
  }

  function setStaleWorkflowState(jobId: string, nextState: AsyncState) {
    setStaleWorkflowStates((current) => ({
      ...current,
      [jobId]: nextState,
    }));
  }

  function setFailureWorkflowState(jobId: string, nextState: AsyncState) {
    setFailureWorkflowStates((current) => ({
      ...current,
      [jobId]: nextState,
    }));
  }

  async function handleClaimExecutionFailureWorkflow(jobId: string) {
    if (!accessToken) {
      return;
    }

    setFailureWorkflowState(jobId, createWorkingState('Claiming execution-failure workflow...'));

    try {
      await adminApi.claimExecutionFailureWorkflow(
        jobId,
        {
          note: failureWorkflowDrafts[jobId]?.trim() || undefined,
          status: failureWorkflowStatuses[jobId],
        },
        accessToken,
      );
      setFailureWorkflowState(jobId, createSuccessState('Execution-failure workflow claimed.'));
      await loadEscrowHealth(accessToken, healthReasonFilter);
    } catch (error) {
      setFailureWorkflowState(
        jobId,
        createErrorState(error, 'Failed to claim execution-failure workflow'),
      );
    }
  }

  async function handleAcknowledgeExecutionFailures(jobId: string) {
    if (!accessToken) {
      return;
    }

    setFailureWorkflowState(
      jobId,
      createWorkingState('Acknowledging latest execution failures...'),
    );

    try {
      await adminApi.acknowledgeExecutionFailures(
        jobId,
        {
          note: failureWorkflowDrafts[jobId]?.trim() || undefined,
          status: failureWorkflowStatuses[jobId],
        },
        accessToken,
      );
      setFailureWorkflowState(jobId, createSuccessState('Latest execution failures acknowledged.'));
      await loadEscrowHealth(accessToken, healthReasonFilter);
    } catch (error) {
      setFailureWorkflowState(
        jobId,
        createErrorState(error, 'Failed to acknowledge execution failures'),
      );
    }
  }

  async function handleReleaseExecutionFailureWorkflow(jobId: string) {
    if (!accessToken) {
      return;
    }

    setFailureWorkflowState(jobId, createWorkingState('Releasing execution-failure workflow...'));

    try {
      await adminApi.releaseExecutionFailureWorkflow(jobId, accessToken);
      setFailureWorkflowState(jobId, createSuccessState('Execution-failure workflow released.'));
      await loadEscrowHealth(accessToken, healthReasonFilter);
    } catch (error) {
      setFailureWorkflowState(
        jobId,
        createErrorState(error, 'Failed to release execution-failure workflow'),
      );
    }
  }

  async function handleUpdateExecutionFailureWorkflow(jobId: string) {
    if (!accessToken) {
      return;
    }

    setFailureWorkflowState(jobId, createWorkingState('Saving execution-failure workflow...'));

    try {
      await adminApi.updateExecutionFailureWorkflow(
        jobId,
        {
          note: failureWorkflowDrafts[jobId]?.trim() || undefined,
          status: failureWorkflowStatuses[jobId],
        },
        accessToken,
      );
      setFailureWorkflowState(jobId, createSuccessState('Execution-failure workflow saved.'));
      await loadEscrowHealth(accessToken, healthReasonFilter);
    } catch (error) {
      setFailureWorkflowState(
        jobId,
        createErrorState(error, 'Failed to save execution-failure workflow'),
      );
    }
  }

  async function handleClaimStaleJob(jobId: string) {
    if (!accessToken) {
      return;
    }

    setStaleWorkflowState(jobId, createWorkingState('Claiming stale job workflow...'));

    try {
      await adminApi.claimStaleJob(
        jobId,
        {
          note: staleWorkflowDrafts[jobId]?.trim() || undefined,
        },
        accessToken,
      );
      setStaleWorkflowState(jobId, createSuccessState('Stale job workflow claimed.'));
      await loadEscrowHealth(accessToken, healthReasonFilter);
    } catch (error) {
      setStaleWorkflowState(jobId, createErrorState(error, 'Failed to claim stale job workflow'));
    }
  }

  async function handleReleaseStaleJob(jobId: string) {
    if (!accessToken) {
      return;
    }

    setStaleWorkflowState(jobId, createWorkingState('Releasing stale job workflow...'));

    try {
      await adminApi.releaseStaleJob(jobId, accessToken);
      setStaleWorkflowState(jobId, createSuccessState('Stale job workflow released.'));
      await loadEscrowHealth(accessToken, healthReasonFilter);
    } catch (error) {
      setStaleWorkflowState(jobId, createErrorState(error, 'Failed to release stale job workflow'));
    }
  }

  async function handleResolveMilestone() {
    if (!accessToken || !audit || selectedResolutionCard === null) {
      return;
    }

    setResolutionState(createWorkingState('Submitting privileged resolution...'));

    try {
      const response = await adminApi.resolveMilestone(
        audit.bundle.job.id,
        selectedResolutionCard.milestoneIndex,
        {
          action: resolutionAction,
          note: resolutionNote.trim() || undefined,
        },
        accessToken,
      );
      const refreshed = await handleLookup(audit.bundle.job.id);
      setResolutionState(
        refreshed
          ? createSuccessState(`Resolution submitted via ${previewHash(response.txHash)}.`)
          : createErrorState(
              null,
              'Resolution submitted, but the case could not be refreshed automatically.',
            ),
      );
    } catch (error) {
      setResolutionState(createErrorState(error, 'Failed to resolve disputed milestone'));
    }
  }

  async function handleDownloadExport(artifact: CaseExportArtifact, format: CaseExportFormat) {
    if (!audit) {
      return;
    }

    setExportState(createWorkingState(`Preparing ${artifact} ${format.toUpperCase()} export...`));

    try {
      const documentToSave = await adminApi.downloadCaseExport(
        audit.bundle.job.id,
        artifact,
        format,
      );
      saveDownloadedDocument(documentToSave);
      setExportState(createSuccessState(`Downloaded ${artifact} ${format.toUpperCase()} export.`));
    } catch (error) {
      setExportState(createErrorState(error, 'Failed to download case export'));
    }
  }

  return (
    <div className={styles.console}>
      <div className={styles.topBar}>
        <div className={styles.topBarContent}>
          <span className={styles.topBarLabel}>{messages.topBar.label}</span>
          <p className={styles.topBarMeta}>{messages.topBar.meta}</p>
        </div>
        <div className={styles.inlineActions}>
          {walkthrough.launcher}
          <Link href="/help/operator-case-flow" className={styles.secondaryButton}>
            Read the manual
          </Link>
        </div>
        <LanguageSwitcher
          className={styles.languageSwitcher}
          labelClassName={styles.languageSwitcherLabel}
          optionClassName={styles.languageSwitcherOption}
          optionActiveClassName={styles.languageSwitcherOptionActive}
        />
      </div>
      {walkthrough.notice ? (
        <StatusNotice
          message={walkthrough.notice}
          messageClassName={styles.stateText}
        />
      ) : null}
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{frame.eyebrow}</p>
          <h1>{frame.title}</h1>
          <p className={styles.heroCopy}>{frame.copy}</p>
        </div>
        <div className={styles.heroCard}>
          <div>
            <span className={styles.metaLabel}>API base URL</span>
            <strong className={styles.ltrValue} data-ltr="true">{adminApi.baseUrl}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Backend profile</span>
            <strong>
              {runtimeProfile
                ? messages.labels.runtimeProfile[runtimeProfile.profile]
                : messages.common.loading}
            </strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Loaded case</span>
            <strong className={styles.ltrValue} data-ltr="true">
              {audit?.bundle.job.id || messages.common.unavailable}
            </strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Pressure</span>
            <strong>
              {caseBrief
                ? messages.labels.pressure[caseBrief.pressure]
                : messages.common.loading}
            </strong>
          </div>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel} data-walkthrough-id="operator-session-panel">
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Runtime</p>
              <h2>Backend profile validation</h2>
            </div>
          </header>
          <div className={styles.summaryGrid}>
            <article>
              <span className={styles.metaLabel}>Profile</span>
              <strong>
                {runtimeProfile
                  ? messages.labels.runtimeProfile[runtimeProfile.profile]
                  : messages.common.unavailable}
              </strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Providers</span>
              <strong>
                {runtimeProfile
                  ? `${runtimeProfile.providers.emailMode}/${runtimeProfile.providers.smartAccountMode}/${runtimeProfile.providers.escrowMode}`
                  : 'Unknown'}
              </strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Arbitrator wallet</span>
              <strong>{previewHash(arbitratorAddress ?? undefined)}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Frontend origin</span>
              <strong>{runtimeAlignment.currentOrigin}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>CORS readiness</span>
              <strong>{runtimeAlignment.corsLabel}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>API transport</span>
              <strong>{runtimeAlignment.transportLabel}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Persistence</span>
              <strong>{runtimeAlignment.persistenceLabel}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Trust proxy</span>
              <strong>{runtimeAlignment.trustProxyLabel}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Allowed origins</span>
              <strong>{runtimeAlignment.corsOriginsLabel}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Export support</span>
              <strong>
                {runtimeProfile?.operator.exportSupport ? 'Available' : 'Unavailable'}
              </strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Chain ingestion</span>
              <strong>
                {runtimeChainIngestion
                  ? getChainIngestionStatusLabel(runtimeChainIngestion.status)
                  : 'Unavailable'}
              </strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Authority reads</span>
              <strong>
                {runtimeChainIngestion
                  ? runtimeChainIngestion.authorityReadsEnabled
                    ? 'Enabled'
                    : 'Disabled'
                  : 'Unavailable'}
              </strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Ingestion lag</span>
              <strong>
                {runtimeChainIngestion?.lagBlocks !== null &&
                runtimeChainIngestion?.lagBlocks !== undefined
                  ? `${runtimeChainIngestion.lagBlocks} blocks`
                  : 'Unavailable'}
              </strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Healthy projections</span>
              <strong>
                {runtimeChainIngestion
                  ? `${runtimeChainIngestion.projections.healthyJobs}/${runtimeChainIngestion.projections.totalJobs}`
                  : 'Unavailable'}
              </strong>
            </article>
          </div>
          <div className={styles.stack}>
            <StatusNotice
              message={runtimeProfile?.summary || runtimeState.message}
              messageClassName={styles.stateText}
            />
            <article className={styles.boundaryCard}>
              <strong>{runtimeAlignment.corsLabel}</strong>
              <p className={styles.stateText}>{runtimeAlignment.corsMessage}</p>
            </article>
            <article className={styles.boundaryCard}>
              <strong>{runtimeAlignment.transportLabel}</strong>
              <p className={styles.stateText}>{runtimeAlignment.transportMessage}</p>
            </article>
            {runtimeChainIngestion ? (
              <article className={styles.boundaryCard}>
                <strong>{`Chain ingestion ${getChainIngestionStatusLabel(runtimeChainIngestion.status)}`}</strong>
                <p className={styles.stateText}>{runtimeChainIngestion.summary}</p>
                <small>
                  {`Authority reads ${formatBooleanSummary(
                    runtimeChainIngestion.authorityReadsEnabled,
                  )} · confirmation depth ${runtimeChainIngestion.confirmationDepth} · latest block ${runtimeChainIngestion.latestBlock ?? 'Unavailable'} · finalized block ${runtimeChainIngestion.finalizedBlock ?? 'Unavailable'} · lag ${runtimeChainIngestion.lagBlocks ?? 'Unavailable'} block(s).`}
                </small>
              </article>
            ) : null}
            {runtimeProfile?.warnings.map((warning) => (
              <article key={warning} className={styles.boundaryCard}>
                <strong>Validation warning</strong>
                <p className={styles.stateText}>{warning}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Access</p>
              <h2>Operator session and wallet authority</h2>
            </div>
            {refreshToken ? (
              <div className={styles.inlineActions}>
                <button type="button" onClick={handleRefreshSession}>
                  Refresh
                </button>
                <button type="button" className={styles.secondaryButton} onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : null}
          </header>
          <div className={styles.summaryGrid}>
            <article>
              <span className={styles.metaLabel}>Session</span>
              <strong>{accessToken ? 'Authenticated' : 'Signed out'}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>User</span>
              <strong>{profile?.email || 'No operator session'}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Arbitrator control</span>
              <strong>{controlsArbitratorWallet ? 'Ready' : 'Missing'}</strong>
            </article>
          </div>
          <div className={styles.stack}>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>Email</span>
                <input
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="operator@example.com"
                />
              </label>
              <label className={styles.field}>
                <span>Verification code</span>
                <input
                  value={authCode}
                  onChange={(event) => setAuthCode(event.target.value)}
                  placeholder="123456"
                />
              </label>
            </div>
            <div className={styles.inlineActions}>
              <button type="button" onClick={handleStartAuth}>
                Send OTP
              </button>
              <button type="button" onClick={handleVerifyAuth}>
                Verify session
              </button>
            </div>
            <StatusNotice message={startState.message} messageClassName={styles.stateText} />
            <StatusNotice message={verifyState.message} messageClassName={styles.stateText} />
            <StatusNotice message={sessionState.message} messageClassName={styles.stateText} />

            {accessToken ? (
              <>
                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span>EOA address</span>
                    <input
                      value={linkAddress}
                      onChange={(event) => setLinkAddress(event.target.value)}
                      placeholder="0x..."
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Label</span>
                    <input
                      value={linkLabel}
                      onChange={(event) => setLinkLabel(event.target.value)}
                      placeholder="Arbitrator wallet"
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Chain id</span>
                    <input
                      value={linkChainId}
                      onChange={(event) => setLinkChainId(event.target.value)}
                    />
                  </label>
                </div>
                <div className={styles.inlineActions}>
                  <button type="button" onClick={handleCreateChallenge}>
                    Create SIWE challenge
                  </button>
                </div>
                {challenge ? (
                  <div className={styles.fieldGrid}>
                    <label className={styles.field}>
                      <span>Issued message</span>
                      <textarea readOnly rows={4} value={challenge.message} />
                    </label>
                    <label className={styles.field}>
                      <span>Wallet signature</span>
                      <textarea
                        value={walletSignature}
                        onChange={(event) => setWalletSignature(event.target.value)}
                        rows={4}
                        placeholder="0x..."
                      />
                    </label>
                  </div>
                ) : null}
                {challenge ? (
                  <div className={styles.inlineActions}>
                    <button type="button" onClick={handleVerifyWallet}>
                      Verify linked wallet
                    </button>
                  </div>
                ) : null}
                <StatusNotice
                  message={walletActionState.message}
                  messageClassName={styles.stateText}
                />
                <article className={styles.boundaryCard}>
                  <strong>
                    {controlsArbitratorWallet
                      ? 'Authenticated operator controls the arbitrator wallet.'
                      : 'Operator resolution remains blocked until the configured arbitrator wallet is linked.'}
                  </strong>
                  <p className={styles.stateText}>
                    Required wallet:{' '}
                    {arbitratorAddress || 'Unavailable from backend runtime profile.'}
                  </p>
                </article>
              </>
            ) : (
              <article className={styles.boundaryCard}>
                <strong>Authenticate first</strong>
                <p className={styles.stateText}>
                  Operator resolution requires an authenticated session plus a linked arbitrator
                  wallet.
                </p>
              </article>
            )}
          </div>
        </section>

        {view === 'dashboard' ? (
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Operations</p>
              <h2>Escrow operations health</h2>
            </div>
            {controlsArbitratorWallet ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void loadEscrowHealth(accessToken, healthReasonFilter)}
              >
                Refresh operations
              </button>
            ) : null}
          </header>
          <div className={styles.summaryGrid}>
            <article>
              <span className={styles.metaLabel}>Matched jobs</span>
              <strong>{escrowHealth?.summary.matchedJobs ?? 'Unavailable'}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Open disputes</span>
              <strong>{escrowHealth?.summary.openDisputeJobs ?? 'Unavailable'}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Failed execution jobs</span>
              <strong>{escrowHealth?.summary.failedExecutionJobs ?? 'Unavailable'}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Chain sync backlog</span>
              <strong>{escrowHealth?.summary.chainSyncBacklogJobs ?? 'Unavailable'}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Stale jobs</span>
              <strong>{escrowHealth?.summary.staleJobs ?? 'Unavailable'}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>All attention jobs</span>
              <strong>{escrowHealth?.summary.jobsNeedingAttention ?? 'Unavailable'}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Tracked jobs</span>
              <strong>{escrowHealth?.summary.totalJobs ?? 'Unavailable'}</strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Active filter</span>
              <strong>
                {escrowHealth ? getOperationsReasonFilterLabel(healthReasonFilter) : 'Unavailable'}
              </strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Chain sync threshold</span>
              <strong>
                {escrowHealth
                  ? `${escrowHealth.thresholds.chainSyncBacklogHours} hours`
                  : 'Unavailable'}
              </strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Stale threshold</span>
              <strong>
                {escrowHealth ? `${escrowHealth.thresholds.staleJobHours} hours` : 'Unavailable'}
              </strong>
            </article>
          </div>
          <div className={styles.stack}>
            <StatusNotice message={healthState.message} messageClassName={styles.stateText} />
            {!accessToken ? (
              <article className={styles.boundaryCard}>
                <strong>Authenticate first</strong>
                <p className={styles.stateText}>
                  Operations visibility is only available to the authenticated operator path.
                </p>
              </article>
            ) : !arbitratorAddress ? (
              <article className={styles.boundaryCard}>
                <strong>Runtime profile missing arbitrator wallet</strong>
                <p className={styles.stateText}>
                  The backend did not expose the configured arbitrator wallet, so operator-wide
                  escrow health cannot be authorized yet.
                </p>
              </article>
            ) : !controlsArbitratorWallet ? (
              <article className={styles.boundaryCard}>
                <strong>Link the configured arbitrator wallet to unlock operations health</strong>
                <p className={styles.stateText}>
                  The current operator session must control {arbitratorAddress} before the backend
                  will expose cross-job attention items.
                </p>
              </article>
            ) : (
              <>
                <div className={styles.suggestionRow}>
                  {(
                    [
                      'all',
                      'chain_sync_backlog',
                      'open_dispute',
                      'reconciliation_drift',
                      'failed_execution',
                      'stale_job',
                    ] as const
                  ).map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      className={styles.suggestionChip}
                      onClick={() => setHealthReasonFilter(reason)}
                    >
                      {getOperationsReasonFilterLabel(reason)}
                    </button>
                  ))}
                </div>
                <article className={styles.boundaryCard}>
                  <strong>Import job-history reconciliation</strong>
                  <p className={styles.stateText}>
                    Paste a `job-history` JSON export to normalize its timeline, replay the imported
                    state, and compare it against the local persisted job.
                  </p>
                  <label className={styles.field}>
                    <span>Job-history JSON</span>
                    <textarea
                      rows={6}
                      value={reconciliationImportJson}
                      onChange={(event) => setReconciliationImportJson(event.target.value)}
                      placeholder="Paste a job-history JSON export to preview replay-backed reconciliation."
                    />
                  </label>
                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      onClick={() => void handleImportJobHistoryReconciliation()}
                    >
                      Preview job-history import
                    </button>
                  </div>
                  <StatusNotice
                    message={reconciliationImportState.message}
                    messageClassName={styles.stateText}
                  />
                  {reconciliationImportReport ? (
                    <div className={styles.stack}>
                      <small>
                        {`Imported ${reconciliationImportReport.document.title} (${reconciliationImportReport.document.jobId}) exported ${reconciliationImportReport.document.exportedAt}.`}
                      </small>
                      <small>
                        {`Normalization: ${reconciliationImportReport.normalization.auditEvents} audit events · ${reconciliationImportReport.normalization.confirmedExecutions} confirmed executions · ${reconciliationImportReport.normalization.failedExecutions} failed executions · audit reordered ${formatBooleanSummary(
                          reconciliationImportReport.normalization.auditWasReordered,
                        )} · executions reordered ${formatBooleanSummary(
                          reconciliationImportReport.normalization.executionWasReordered,
                        )}.`}
                      </small>
                      <small>
                        {reconciliationImportReport.localComparison.localJobFound
                          ? `Local comparison: status ${reconciliationImportReport.localComparison.localStatus} -> ${reconciliationImportReport.localComparison.importedStatus} · funded ${formatReconciliationValue(
                              reconciliationImportReport.localComparison.localFundedAmount,
                            )} -> ${formatReconciliationValue(
                              reconciliationImportReport.localComparison.importedFundedAmount,
                            )} · aggregate match ${formatBooleanSummary(
                              reconciliationImportReport.localComparison.aggregateMatches,
                            )} · timeline digest match ${formatBooleanSummary(
                              reconciliationImportReport.localComparison.timelineDigestMatches ===
                                true,
                            )}.`
                          : 'Local comparison: no persisted local job matched the imported job id.'}
                      </small>
                      {reconciliationImportReport.localComparison.mismatchedMilestones.length >
                      0 ? (
                        <div className={styles.stack}>
                          {reconciliationImportReport.localComparison.mismatchedMilestones.map(
                            (milestone) => (
                              <small key={`import-mismatch-${milestone.index}`}>
                                {`Imported milestone ${milestone.index + 1}: local ${formatReconciliationValue(
                                  milestone.localStatus,
                                )} -> imported ${formatReconciliationValue(
                                  milestone.importedStatus,
                                )}`}
                              </small>
                            ),
                          )}
                        </div>
                      ) : null}
                      {reconciliationImportReport.importedReconciliation ? (
                        <div className={styles.stack}>
                          <small>
                            {`Imported replay drift: ${reconciliationImportReport.importedReconciliation.issueCount} issue${
                              reconciliationImportReport.importedReconciliation.issueCount === 1
                                ? ''
                                : 's'
                            } · severity ${getReconciliationSeverityLabel(
                              reconciliationImportReport.importedReconciliation.highestSeverity,
                            )}.`}
                          </small>
                          {reconciliationImportReport.importedReconciliation.issues.map(
                            (issue, index) => (
                              <small key={`import-issue-${index}`}>
                                {`${getReconciliationSeverityLabel(
                                  issue.severity,
                                )}: ${issue.summary}`}
                              </small>
                            ),
                          )}
                        </div>
                      ) : (
                        <small>Imported replay produced no reconciliation issues.</small>
                      )}
                    </div>
                  ) : null}
                </article>
                <article className={styles.boundaryCard}>
                  <strong>Sync chain-derived audit</strong>
                  <p className={styles.stateText}>
                    Scan escrow contract events for a persisted job, derive the canonical audit
                    timeline, and optionally persist that timeline when the onchain history is
                    representable in the current model.
                  </p>
                  <div className={styles.fieldGrid}>
                    <label className={styles.field}>
                      <span>Job id</span>
                      <input
                        value={chainSyncJobId}
                        onChange={(event) => setChainSyncJobId(event.target.value)}
                        placeholder="Paste a persisted job UUID"
                      />
                    </label>
                    <label className={styles.field}>
                      <span>From block</span>
                      <input
                        value={chainSyncFromBlock}
                        onChange={(event) => setChainSyncFromBlock(event.target.value)}
                        placeholder="Optional lower bound"
                      />
                    </label>
                    <label className={styles.field}>
                      <span>To block</span>
                      <input
                        value={chainSyncToBlock}
                        onChange={(event) => setChainSyncToBlock(event.target.value)}
                        placeholder="Optional upper bound"
                      />
                    </label>
                  </div>
                  <div className={styles.inlineActions}>
                    <button type="button" onClick={() => void handleChainAuditSync(false)}>
                      Preview chain audit
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => void handleChainAuditSync(true)}
                    >
                      Persist chain audit
                    </button>
                  </div>
                  <StatusNotice
                    message={chainSyncState.message}
                    messageClassName={styles.stateText}
                  />
                  {chainSyncReport ? (
                    <div className={styles.stack}>
                      <small>
                        {`${getChainSyncModeLabel(chainSyncReport.mode)} scan for ${chainSyncReport.job.title} (${chainSyncReport.job.jobId}) on escrow ${chainSyncReport.job.escrowId}.`}
                      </small>
                      <small>
                        {`Block range: ${chainSyncReport.range.fromBlock} -> ${chainSyncReport.range.toBlock} · latest block ${chainSyncReport.range.latestBlock} · default lookback ${chainSyncReport.range.lookbackBlocks}.`}
                      </small>
                      <small>
                        {`Normalization: ${chainSyncReport.normalization.fetchedLogs} fetched logs · ${chainSyncReport.normalization.duplicateLogs} duplicates ignored · ${chainSyncReport.normalization.uniqueLogs} unique logs · ${chainSyncReport.normalization.auditEvents} derived audit events · audit changed ${formatBooleanSummary(
                          chainSyncReport.normalization.auditChanged,
                        )}.`}
                      </small>
                      <small>
                        {`Local comparison: status ${chainSyncReport.localComparison.localStatus} -> ${chainSyncReport.localComparison.chainDerivedStatus} · funded ${formatReconciliationValue(
                          chainSyncReport.localComparison.localFundedAmount,
                        )} -> ${formatReconciliationValue(
                          chainSyncReport.localComparison.chainDerivedFundedAmount,
                        )} · aggregate match ${formatBooleanSummary(
                          chainSyncReport.localComparison.aggregateMatches,
                        )} · audit digest match ${formatBooleanSummary(
                          chainSyncReport.localComparison.auditDigestMatches,
                        )}.`}
                      </small>
                      <small>
                        {chainSyncReport.persistence.requested
                          ? `Persistence requested: applied ${formatBooleanSummary(
                              chainSyncReport.persistence.applied,
                            )} · blocked ${formatBooleanSummary(
                              chainSyncReport.persistence.blocked,
                            )}${chainSyncReport.persistence.blockedReason ? ` · ${chainSyncReport.persistence.blockedReason}` : ''}.`
                          : 'Persistence requested: No.'}
                      </small>
                      {chainSyncReport.localComparison.mismatchedMilestones.length > 0 ? (
                        <div className={styles.stack}>
                          {chainSyncReport.localComparison.mismatchedMilestones.map((milestone) => (
                            <small key={`chain-sync-mismatch-${milestone.index}`}>
                              {`Chain milestone ${milestone.index + 1}: local ${formatReconciliationValue(
                                milestone.localStatus,
                              )} -> derived ${formatReconciliationValue(
                                milestone.chainDerivedStatus,
                              )}`}
                            </small>
                          ))}
                        </div>
                      ) : null}
                      {chainSyncReport.issues.length > 0 ? (
                        <div className={styles.stack}>
                          {chainSyncReport.issues.map((issue, index) => (
                            <small key={`chain-sync-issue-${index}`}>
                              {`${getReconciliationSeverityLabel(issue.severity)}: ${issue.summary}`}
                            </small>
                          ))}
                        </div>
                      ) : (
                        <small>Chain scan produced no ingestion issues.</small>
                      )}
                      {chainSyncReport.chainReconciliation ? (
                        <div className={styles.stack}>
                          <small>
                            {`Derived replay drift: ${chainSyncReport.chainReconciliation.issueCount} issue${
                              chainSyncReport.chainReconciliation.issueCount === 1 ? '' : 's'
                            } · severity ${getReconciliationSeverityLabel(
                              chainSyncReport.chainReconciliation.highestSeverity,
                            )}.`}
                          </small>
                          {chainSyncReport.chainReconciliation.issues.map((issue, index) => (
                            <small key={`chain-sync-reconciliation-${index}`}>
                              {`${getReconciliationSeverityLabel(
                                issue.severity,
                              )}: ${issue.summary}`}
                            </small>
                          ))}
                        </div>
                      ) : (
                        <small>Derived chain audit produced no reconciliation issues.</small>
                      )}
                    </div>
                  ) : null}
                </article>
                <article className={styles.boundaryCard}>
                  <strong>Finalized chain ingestion</strong>
                  <p className={styles.stateText}>
                    Inspect the finalized-log cursor and the freshness of per-job chain
                    projections before trusting operator reads.
                  </p>
                  <StatusNotice
                    message={chainIngestionState.message}
                    messageClassName={styles.stateText}
                  />
                  {chainIngestionStatus ? (
                    <div className={styles.stack}>
                      <small>
                        {`Status: ${getChainIngestionStatusLabel(
                          chainIngestionStatus.status,
                        )} · authority reads ${formatBooleanSummary(
                          chainIngestionStatus.authorityReadsEnabled,
                        )} · ${chainIngestionStatus.summary}`}
                      </small>
                      <small>
                        {`Chain ${chainIngestionStatus.chainId} · contract ${
                          chainIngestionStatus.contractAddress ?? 'Unavailable'
                        } · latest block ${chainIngestionStatus.latestBlock ?? 'Unavailable'} · finalized block ${chainIngestionStatus.finalizedBlock ?? 'Unavailable'} · lag ${chainIngestionStatus.lagBlocks ?? 'Unavailable'} block(s).`}
                      </small>
                      <small>
                        {`Cursor: next from ${
                          chainIngestionStatus.cursor?.nextFromBlock ?? 'Unavailable'
                        } · last finalized ${
                          chainIngestionStatus.cursor?.lastFinalizedBlock ?? 'Unavailable'
                        } · last scanned ${
                          chainIngestionStatus.cursor?.lastScannedBlock ?? 'Unavailable'
                        }.`}
                      </small>
                      <small>
                        {`Projections: ${chainIngestionStatus.projections.healthyJobs} healthy · ${chainIngestionStatus.projections.degradedJobs} degraded · ${chainIngestionStatus.projections.staleJobs} stale · ${chainIngestionStatus.projections.projectedJobs}/${chainIngestionStatus.projections.totalJobs} projected.`}
                      </small>
                      {chainIngestionStatus.cursor?.lastError ? (
                        <small>{`Cursor error: ${chainIngestionStatus.cursor.lastError}`}</small>
                      ) : null}
                      {chainIngestionStatus.issues.length > 0 ? (
                        <div className={styles.stack}>
                          {chainIngestionStatus.issues.map((issue, index) => (
                            <small key={`chain-ingestion-issue-${index}`}>{issue}</small>
                          ))}
                        </div>
                      ) : null}
                      {chainIngestionStatus.warnings.length > 0 ? (
                        <div className={styles.stack}>
                          {chainIngestionStatus.warnings.map((warning, index) => (
                            <small key={`chain-ingestion-warning-${index}`}>{warning}</small>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
                <article className={styles.boundaryCard}>
                  <strong>Recurring chain-sync daemon</strong>
                  <p className={styles.stateText}>
                    Inspect the latest shared status published by the bounded recurring chain-audit
                    worker.
                  </p>
                  <StatusNotice
                    message={chainSyncDaemonState.message}
                    messageClassName={styles.stateText}
                  />
                  {chainSyncDaemonHealth ? (
                    <div className={styles.stack}>
                      <small>
                        {`Health: ${getChainSyncDaemonHealthStatusLabel(
                          chainSyncDaemonHealth.status,
                        )} · required ${formatBooleanSummary(
                          chainSyncDaemonHealth.required,
                        )} · ${chainSyncDaemonHealth.summary}`}
                      </small>
                      {chainSyncDaemonHealth.issues.length > 0 ? (
                        <div className={styles.stack}>
                          {chainSyncDaemonHealth.issues.map((issue, index) => (
                            <small key={`chain-sync-daemon-issue-${index}`}>
                              {`${getReconciliationSeverityLabel(issue.severity)}: ${issue.summary}${issue.detail ? ` · ${issue.detail}` : ''}`}
                            </small>
                          ))}
                        </div>
                      ) : null}
                      {chainSyncDaemonHealth.daemon ? (
                        <>
                          <small>
                            {`Worker: ${chainSyncDaemonHealth.daemon.worker.workerId} · ${getChainSyncDaemonStateLabel(
                              chainSyncDaemonHealth.daemon.worker.state,
                            )} · interval ${Math.floor(
                              chainSyncDaemonHealth.daemon.worker.intervalMs / 1000,
                            )}s · run on start ${formatBooleanSummary(
                              chainSyncDaemonHealth.daemon.worker.runOnStart,
                            )}.`}
                          </small>
                          <small>
                            {`Heartbeat: ${formatTimestamp(
                              Date.parse(
                                chainSyncDaemonHealth.daemon.heartbeat.lastHeartbeatAt,
                              ),
                            )} · last outcome ${chainSyncDaemonHealth.daemon.heartbeat.lastRunOutcome ? getChainSyncDaemonOutcomeLabel(chainSyncDaemonHealth.daemon.heartbeat.lastRunOutcome) : 'None'} · consecutive failures ${chainSyncDaemonHealth.daemon.heartbeat.consecutiveFailures} · consecutive skips ${chainSyncDaemonHealth.daemon.heartbeat.consecutiveSkips}.`}
                          </small>
                          {chainSyncDaemonHealth.daemon.heartbeat.lastErrorMessage ? (
                            <small>
                              {`Latest error: ${chainSyncDaemonHealth.daemon.heartbeat.lastErrorMessage}`}
                            </small>
                          ) : null}
                          {chainSyncDaemonHealth.daemon.currentRun ? (
                            <small>
                              {`Current run started ${formatTimestamp(
                                Date.parse(
                                  chainSyncDaemonHealth.daemon.currentRun.startedAt,
                                ),
                              )} · lock ${getChainSyncDaemonLockProviderLabel(
                                chainSyncDaemonHealth.daemon.currentRun.lockProvider,
                              )}.`}
                            </small>
                          ) : (
                            <small>No run is currently in flight.</small>
                          )}
                          {chainSyncDaemonHealth.daemon.lastRun ? (
                            <small>
                              {`Last run: ${getChainSyncDaemonOutcomeLabel(
                                chainSyncDaemonHealth.daemon.lastRun.outcome,
                              )} · ${chainSyncDaemonHealth.daemon.lastRun.durationMs}ms · lock ${getChainSyncDaemonLockProviderLabel(
                                chainSyncDaemonHealth.daemon.lastRun.lockProvider,
                              )}${chainSyncDaemonHealth.daemon.lastRun.skipReason ? ` · ${chainSyncDaemonHealth.daemon.lastRun.skipReason}` : ''}${chainSyncDaemonHealth.daemon.lastRun.errorMessage ? ` · ${chainSyncDaemonHealth.daemon.lastRun.errorMessage}` : ''}.`}
                            </small>
                          ) : (
                            <small>No daemon run has been published yet.</small>
                          )}
                        </>
                      ) : (
                        <small>No daemon status snapshot is available.</small>
                      )}
                      {chainSyncDaemonHealth.daemon &&
                      chainSyncDaemonHealth.daemon.recentRuns.length > 0 ? (
                        <div className={styles.stack}>
                          {chainSyncDaemonHealth.daemon.recentRuns.map((run, index) => (
                            <small key={`chain-sync-daemon-run-${index}`}>
                              {`${getChainSyncDaemonOutcomeLabel(run.outcome)} · ${formatTimestamp(
                                Date.parse(run.completedAt),
                              )} · ${run.durationMs}ms · ${run.workerId}${run.summary ? ` · processed ${run.summary.processedJobs}` : ''}${run.errorMessage ? ` · ${run.errorMessage}` : ''}${run.skipReason ? ` · ${run.skipReason}` : ''}`}
                            </small>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
                <article className={styles.boundaryCard}>
                  <strong>Batch chain-audit backfill</strong>
                  <p className={styles.stateText}>
                    Scan many persisted jobs in one run, tolerate partial failures, and optionally
                    persist clean chain-derived audit repairs.
                  </p>
                  <div className={styles.fieldGrid}>
                    <label className={styles.field}>
                      <span>Scope</span>
                      <select
                        value={chainSyncBatchScope}
                        onChange={(event) =>
                          setChainSyncBatchScope(event.target.value === 'all' ? 'all' : 'attention')
                        }
                      >
                        <option value="attention">Attention backlog</option>
                        <option value="all">All persisted jobs</option>
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span>Reason filter</span>
                      <select
                        value={chainSyncBatchReason}
                        onChange={(event) =>
                          setChainSyncBatchReason(event.target.value as OperationsReasonFilter)
                        }
                        disabled={chainSyncBatchScope !== 'attention'}
                      >
                        {(
                          [
                            'all',
                            'chain_sync_backlog',
                            'open_dispute',
                            'reconciliation_drift',
                            'failed_execution',
                            'stale_job',
                          ] as const
                        ).map((reason) => (
                          <option key={reason} value={reason}>
                            {getOperationsReasonFilterLabel(reason)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span>Limit</span>
                      <input
                        value={chainSyncBatchLimit}
                        onChange={(event) => setChainSyncBatchLimit(event.target.value)}
                        placeholder="Number of jobs to scan"
                      />
                    </label>
                  </div>
                  <div className={styles.inlineActions}>
                    <button type="button" onClick={() => void handleBatchChainAuditSync(false)}>
                      Preview batch chain sync
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => void handleBatchChainAuditSync(true)}
                    >
                      Persist batch chain sync
                    </button>
                  </div>
                  <StatusNotice
                    message={chainSyncBatchState.message}
                    messageClassName={styles.stateText}
                  />
                  {chainSyncBatchReport ? (
                    <div className={styles.stack}>
                      <small>
                        {`${getChainSyncModeLabel(chainSyncBatchReport.mode)} batch for ${chainSyncBatchReport.filters.scope === 'attention' ? 'attention backlog' : 'all persisted jobs'}${chainSyncBatchReport.filters.reason ? ` · reason ${getOperationsReasonFilterLabel(chainSyncBatchReport.filters.reason)}` : ''} · limit ${chainSyncBatchReport.filters.limit}.`}
                      </small>
                      <small>
                        {`Selection: ${chainSyncBatchReport.selection.selectedJobs} selected / ${chainSyncBatchReport.selection.matchedJobs} matched / ${chainSyncBatchReport.selection.totalJobs} total.`}
                      </small>
                      <small>
                        {`Summary: ${chainSyncBatchReport.summary.processedJobs} processed · ${chainSyncBatchReport.summary.cleanJobs} clean · ${chainSyncBatchReport.summary.changedJobs} changed · ${chainSyncBatchReport.summary.persistedJobs} persisted · ${chainSyncBatchReport.summary.blockedJobs} blocked · ${chainSyncBatchReport.summary.failedJobs} failed · ${chainSyncBatchReport.summary.criticalIssueJobs} with critical issues.`}
                      </small>
                      {chainSyncBatchReport.jobs.length > 0 ? (
                        <div className={styles.stack}>
                          {chainSyncBatchReport.jobs.map((job) => (
                            <small key={`chain-sync-batch-${job.jobId}`}>
                              {`${job.title} (${job.jobId}): ${getChainSyncBatchOutcomeLabel(
                                job.outcome,
                              )} · issues ${job.issueCount} · critical ${job.criticalIssueCount}${job.errorMessage ? ` · ${job.errorMessage}` : ''}`}
                            </small>
                          ))}
                        </div>
                      ) : (
                        <small>No jobs matched the batch sync selection.</small>
                      )}
                    </div>
                  ) : null}
                </article>
              </>
            )}
            {controlsArbitratorWallet && escrowHealth && escrowHealth.jobs.length > 0 ? (
              escrowHealth.jobs.map((job) =>
                (() => {
                  const isStaleJob = job.reasons.includes('stale_job');
                  const isFailedJob = job.reasons.includes('failed_execution');
                  const chainSync = job.chainSync;
                  const executionFailureWorkflow = job.executionFailureWorkflow;
                  const staleWorkflow = job.staleWorkflow;
                  const failedExecutionDiagnostics = job.failedExecutionDiagnostics;
                  const failureGuidance = job.failureGuidance;
                  const reconciliation = job.reconciliation;
                  const failureClaimedByCurrentOperator =
                    executionFailureWorkflow?.claimedByUserId === profile?.id;
                  const claimedByCurrentOperator = staleWorkflow?.claimedByUserId === profile?.id;

                  return (
                    <article key={job.jobId} className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <strong>{job.title}</strong>
                        <span>{job.status}</span>
                      </div>
                      <p className={styles.stateText}>
                        {job.reasons.map(getOperationsReasonLabel).join(' · ')}
                      </p>
                      <small>{`Job ${job.jobId} · Updated ${formatTimestamp(job.updatedAt)}`}</small>
                      <small>{`Latest activity ${formatTimestamp(job.latestActivityAt)}`}</small>
                      <small>{`Open disputes ${job.counts.openDisputes} · Failed executions ${job.counts.failedExecutions} · Chain sync backlog ${formatBooleanSummary(job.counts.chainSyncBacklog)}`}</small>
                      <small>
                        {`Authority: ${getAuthoritySourceLabel(
                          job.authority.source,
                        )} · ${getAuthorityReasonLabel(job.authority.reason)}`}
                      </small>
                      {job.staleForMs !== null ? (
                        <small>{`Stale for ${Math.floor(job.staleForMs / 3_600_000)}h`}</small>
                      ) : null}
                      {chainSync ? (
                        <small>
                          {`Chain sync: ${getChainSyncCoverageLabel(chainSync.status)} · last attempt ${chainSync.lastAttemptedAt ? formatTimestamp(chainSync.lastAttemptedAt) : 'Never'} · last success ${chainSync.lastSuccessfulAt ? formatTimestamp(chainSync.lastSuccessfulAt) : 'Never'} · mode ${chainSync.lastMode ?? 'None'} · outcome ${chainSync.lastOutcome ?? 'None'}`}
                        </small>
                      ) : null}
                      {chainSync?.lastErrorMessage ? (
                        <small>{`Chain sync error: ${chainSync.lastErrorMessage}`}</small>
                      ) : null}
                      {chainSync &&
                      (chainSync.lastIssueCount > 0 ||
                        chainSync.lastCriticalIssueCount > 0 ||
                        chainSync.lastReconciliationIssueCount > 0) ? (
                        <small>
                          {`Chain sync findings: ${chainSync.lastIssueCount} total · ${chainSync.lastCriticalIssueCount} critical · ${chainSync.lastReconciliationIssueCount} reconciliation.`}
                        </small>
                      ) : null}
                      {job.latestFailedExecution ? (
                        <code>
                          {`${job.latestFailedExecution.action} failed${
                            job.latestFailedExecution.failureCode
                              ? ` (${job.latestFailedExecution.failureCode})`
                              : ''
                          }${
                            job.latestFailedExecution.failureMessage
                              ? `: ${job.latestFailedExecution.failureMessage}`
                              : ''
                          }`}
                        </code>
                      ) : null}
                      {reconciliation ? (
                        <article className={styles.boundaryCard}>
                          <strong>
                            {`Reconciliation drift: ${reconciliation.issueCount} issue${
                              reconciliation.issueCount === 1 ? '' : 's'
                            }`}
                          </strong>
                          <p className={styles.stateText}>
                            {`Highest severity: ${getReconciliationSeverityLabel(
                              reconciliation.highestSeverity,
                            )}. This signal is derived from persisted audit and execution history, not chain indexing.`}
                          </p>
                          <small>
                            {`Timeline sources: ${reconciliation.sourceCounts.auditEvents} audit event${
                              reconciliation.sourceCounts.auditEvents === 1 ? '' : 's'
                            } · ${reconciliation.sourceCounts.confirmedExecutions} confirmed execution${
                              reconciliation.sourceCounts.confirmedExecutions === 1 ? '' : 's'
                            } · ${reconciliation.sourceCounts.failedExecutions} failed execution${
                              reconciliation.sourceCounts.failedExecutions === 1 ? '' : 's'
                            }`}
                          </small>
                          <small>
                            {`Replay: status ${reconciliation.projection.aggregateStatus} -> ${reconciliation.projection.projectedStatus} · funded ${formatReconciliationValue(
                              reconciliation.projection.aggregateFundedAmount,
                            )} -> ${formatReconciliationValue(
                              reconciliation.projection.projectedFundedAmount,
                            )}`}
                          </small>
                          {reconciliation.projection.mismatchedMilestones.length > 0 ? (
                            <div className={styles.stack}>
                              {reconciliation.projection.mismatchedMilestones.map((milestone) => (
                                <small
                                  key={`${job.jobId}-reconciliation-milestone-${milestone.index}`}
                                >
                                  {`Milestone ${milestone.index + 1}: ${formatReconciliationValue(
                                    milestone.aggregateStatus,
                                  )} -> ${formatReconciliationValue(milestone.projectedStatus)}${
                                    milestone.lastAuditType
                                      ? ` after ${milestone.lastAuditType} at ${formatTimestamp(
                                          milestone.lastAuditAt ?? 0,
                                        )}`
                                      : ''
                                  }`}
                                </small>
                              ))}
                            </div>
                          ) : null}
                          <div className={styles.stack}>
                            {reconciliation.issues.map((issue, index) => (
                              <div key={`${job.jobId}-reconciliation-${index}`}>
                                <small>
                                  {`${getReconciliationSeverityLabel(
                                    issue.severity,
                                  )}: ${issue.summary}`}
                                </small>
                                {issue.detail ? <small>{issue.detail}</small> : null}
                              </div>
                            ))}
                          </div>
                        </article>
                      ) : null}
                      {failedExecutionDiagnostics ? (
                        <article className={`${styles.boundaryCard} ${styles.executionFailure}`}>
                          <strong>{`Failure pressure: ${job.counts.failedExecutions} failed attempt${
                            job.counts.failedExecutions === 1 ? '' : 's'
                          }`}</strong>
                          <p className={styles.stateText}>
                            {`First failure ${formatTimestamp(
                              failedExecutionDiagnostics.firstFailureAt,
                            )} · Latest failure ${formatTimestamp(
                              failedExecutionDiagnostics.latestFailureAt,
                            )}.`}
                          </p>
                          {failureGuidance ? (
                            <>
                              <small>{`Guidance: ${failureGuidance.summary}`}</small>
                              <small>
                                {`Surface: ${getFailureGuidanceSurfaceLabel(
                                  failureGuidance.responsibleSurface,
                                )} · Retry posture: ${getFailureRetryPostureLabel(
                                  failureGuidance.retryPosture,
                                )} · Severity: ${failureGuidance.severity}`}
                              </small>
                              <small>
                                {`Next steps: ${failureGuidance.recommendedActions.join(' · ')}`}
                              </small>
                            </>
                          ) : null}
                          <small>
                            {`Actions: ${formatFailureBreakdown(
                              failedExecutionDiagnostics.actionBreakdown.map((entry) => ({
                                label: entry.action,
                                count: entry.count,
                              })),
                            )}`}
                          </small>
                          <small>
                            {`Codes: ${formatFailureBreakdown(
                              failedExecutionDiagnostics.failureCodeBreakdown.map((entry) => ({
                                label: formatFailureCodeLabel(entry.failureCode),
                                count: entry.count,
                              })),
                            )}`}
                          </small>
                          {isFailedJob ? (
                            <>
                              <strong>
                                {executionFailureWorkflow
                                  ? `Claimed by ${executionFailureWorkflow.claimedByEmail}`
                                  : 'No operator currently owns this execution-failure workflow'}
                              </strong>
                              <p className={styles.stateText}>
                                {executionFailureWorkflow
                                  ? `Claimed ${formatTimestamp(
                                      executionFailureWorkflow.claimedAt,
                                    )} and updated ${formatTimestamp(
                                      executionFailureWorkflow.updatedAt,
                                    )}. Status: ${getFailureWorkflowStatusLabel(
                                      executionFailureWorkflow.status,
                                    )}. ${getFailureAcknowledgementMessage(
                                      executionFailureWorkflow,
                                    )}`
                                  : 'Claim this failure workflow to track remediation and acknowledge the latest known failure set.'}
                              </p>
                              <label className={styles.field}>
                                <span>Failure workflow status</span>
                                <select
                                  value={
                                    failureWorkflowStatuses[job.jobId] ??
                                    defaultFailureWorkflowStatus(failureGuidance)
                                  }
                                  onChange={(event) =>
                                    setFailureWorkflowStatuses((current) => ({
                                      ...current,
                                      [job.jobId]: event.target.value as FailureWorkflowStatus,
                                    }))
                                  }
                                  disabled={Boolean(
                                    executionFailureWorkflow && !failureClaimedByCurrentOperator,
                                  )}
                                >
                                  {(
                                    [
                                      'investigating',
                                      'blocked_external',
                                      'ready_to_retry',
                                      'monitoring',
                                    ] as const
                                  ).map((status) => (
                                    <option key={status} value={status}>
                                      {getFailureWorkflowStatusLabel(status)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className={styles.field}>
                                <span>Failure remediation note</span>
                                <textarea
                                  rows={3}
                                  value={failureWorkflowDrafts[job.jobId] ?? ''}
                                  onChange={(event) =>
                                    setFailureWorkflowDrafts((current) => ({
                                      ...current,
                                      [job.jobId]: event.target.value,
                                    }))
                                  }
                                  placeholder="Document the failure pattern, likely cause, next retry posture, or external dependency blocker."
                                  disabled={Boolean(
                                    executionFailureWorkflow && !failureClaimedByCurrentOperator,
                                  )}
                                />
                              </label>
                              <div className={styles.inlineActions}>
                                {!executionFailureWorkflow || failureClaimedByCurrentOperator ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      executionFailureWorkflow
                                        ? void handleUpdateExecutionFailureWorkflow(job.jobId)
                                        : void handleClaimExecutionFailureWorkflow(job.jobId)
                                    }
                                  >
                                    {executionFailureWorkflow
                                      ? 'Save failure workflow'
                                      : 'Claim failure workflow'}
                                  </button>
                                ) : null}
                                {executionFailureWorkflow && failureClaimedByCurrentOperator ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleAcknowledgeExecutionFailures(job.jobId)
                                    }
                                  >
                                    Acknowledge latest failures
                                  </button>
                                ) : null}
                                {executionFailureWorkflow && failureClaimedByCurrentOperator ? (
                                  <button
                                    type="button"
                                    className={styles.secondaryButton}
                                    onClick={() =>
                                      void handleReleaseExecutionFailureWorkflow(job.jobId)
                                    }
                                  >
                                    Release failure claim
                                  </button>
                                ) : null}
                              </div>
                              <StatusNotice
                                message={failureWorkflowStates[job.jobId]?.message}
                                messageClassName={styles.stateText}
                              />
                            </>
                          ) : null}
                          <div className={styles.stack}>
                            {failedExecutionDiagnostics.recentFailures.map((failure, index) => (
                              <code key={`${job.jobId}-failure-${index}`}>
                                {`#${index + 1} ${failure.action} at ${formatTimestamp(
                                  failure.submittedAt,
                                )}${
                                  failure.milestoneIndex !== null
                                    ? ` · milestone ${failure.milestoneIndex + 1}`
                                    : ''
                                }${failure.failureCode ? ` · ${failure.failureCode}` : ''}${
                                  failure.failureMessage ? ` · ${failure.failureMessage}` : ''
                                }${failure.txHash ? ` · ${previewHash(failure.txHash)}` : ''}`}
                              </code>
                            ))}
                          </div>
                        </article>
                      ) : null}
                      {isStaleJob ? (
                        <article className={styles.boundaryCard}>
                          <strong>
                            {staleWorkflow
                              ? `Claimed by ${staleWorkflow.claimedByEmail}`
                              : 'No operator currently owns this stale job'}
                          </strong>
                          <p className={styles.stateText}>
                            {staleWorkflow
                              ? `Claimed ${formatTimestamp(staleWorkflow.claimedAt)} and updated ${formatTimestamp(
                                  staleWorkflow.updatedAt,
                                )}.`
                              : 'Claim this stale job to record ownership and preserve remediation notes.'}
                          </p>
                          <label className={styles.field}>
                            <span>Stale remediation note</span>
                            <textarea
                              rows={3}
                              value={staleWorkflowDrafts[job.jobId] ?? ''}
                              onChange={(event) =>
                                setStaleWorkflowDrafts((current) => ({
                                  ...current,
                                  [job.jobId]: event.target.value,
                                }))
                              }
                              placeholder="Document why the job is stale, what is blocked, and what you will do next."
                              disabled={Boolean(staleWorkflow && !claimedByCurrentOperator)}
                            />
                          </label>
                          <div className={styles.inlineActions}>
                            {!staleWorkflow || claimedByCurrentOperator ? (
                              <button
                                type="button"
                                onClick={() => void handleClaimStaleJob(job.jobId)}
                              >
                                {staleWorkflow ? 'Save stale note' : 'Claim stale job'}
                              </button>
                            ) : null}
                            {staleWorkflow && claimedByCurrentOperator ? (
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() => void handleReleaseStaleJob(job.jobId)}
                              >
                                Release stale claim
                              </button>
                            ) : null}
                          </div>
                          <StatusNotice
                            message={staleWorkflowStates[job.jobId]?.message}
                            messageClassName={styles.stateText}
                          />
                        </article>
                      ) : null}
                      <div className={styles.inlineActions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => void handleLookup(job.jobId)}
                        >
                          {`Open case ${job.jobId}`}
                        </button>
                      </div>
                    </article>
                  );
                })(),
              )
            ) : controlsArbitratorWallet && escrowHealth ? (
              <EmptyStateCard
                title="No jobs currently need attention"
                message={`The backend did not report any jobs for ${getOperationsReasonFilterLabel(
                  healthReasonFilter,
                ).toLowerCase()}.`}
                className={styles.emptyCard}
              />
            ) : null}
          </div>
        </section>
        ) : null}
      </div>

      {view === 'dashboard' ? (
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Dispute Queue</p>
              <h2>Open disputes ready for operator review</h2>
            </div>
          </header>
          <div className={styles.stack}>
            {controlsArbitratorWallet && escrowHealth ? (
              escrowHealth.jobs.filter((job) => job.reasons.includes('open_dispute')).length > 0 ? (
                escrowHealth.jobs
                  .filter((job) => job.reasons.includes('open_dispute'))
                  .map((job) => (
                    <article key={`dispute-${job.jobId}`} className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <strong>Dispute case ready</strong>
                        <span>{job.status}</span>
                      </div>
                      <p>{`Job title: ${job.title}`}</p>
                      <p>{`Open disputes ${job.counts.openDisputes} · Failed executions ${job.counts.failedExecutions}`}</p>
                      <small>{job.jobId}</small>
                      <div className={styles.inlineActions}>
                        <a href={`/cases/${job.jobId}`}>Open case route</a>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => void handleLookup(job.jobId)}
                        >
                          Load in place
                        </button>
                      </div>
                    </article>
                  ))
              ) : (
                <EmptyStateCard
                  title="No active disputes"
                  message="The operator health report does not currently show any open disputes."
                  className={styles.emptyCard}
                  messageClassName={styles.stateText}
                />
              )
            ) : (
              <EmptyStateCard
                title="Authenticate and link the arbitrator wallet"
                message="The dispute queue is only available after the operator session controls the configured arbitrator wallet."
                className={styles.emptyCard}
                messageClassName={styles.stateText}
              />
            )}
          </div>
        </section>
      ) : null}

      <section className={styles.panel} data-walkthrough-id="operator-case-lookup">
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>Audit Lookup</p>
            <h2>Open an operator case review</h2>
          </div>
          {audit ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void handleLookup(jobId)}
            >
              Reload case
            </button>
          ) : null}
        </header>
        <div className={styles.lookupRow}>
          <input
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
            placeholder="Paste a job UUID"
          />
          <button type="button" onClick={() => void handleLookup()}>
            Load public bundle
          </button>
        </div>
        {lookupSuggestions.length > 0 ? (
          <div className={styles.suggestionRow}>
            {lookupSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={styles.suggestionChip}
                onClick={() => void handleLookup(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
        <StatusNotice message={state.message} messageClassName={styles.stateText} />
      </section>

      {audit && caseBrief ? (
        <>
          <section className={styles.panel} data-walkthrough-id="operator-case-brief">
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Case Brief</p>
                <h2>{audit.bundle.job.title}</h2>
              </div>
              <span
                className={`${styles.pressureBadge} ${getPressureClassName(caseBrief.pressure)}`}
              >
                {messages.labels.pressure[caseBrief.pressure]}
              </span>
            </header>
            <div className={styles.summaryGrid}>
              <article>
                <span className={styles.metaLabel}>Job status</span>
                <strong>{audit.bundle.job.status}</strong>
              </article>
              <article>
                <span className={styles.metaLabel}>Funded amount</span>
                <strong>{audit.bundle.job.fundedAmount || 'Not funded'}</strong>
              </article>
              <article>
                <span className={styles.metaLabel}>Escrow id</span>
                <strong>{audit.bundle.job.onchain.escrowId || 'Pending'}</strong>
              </article>
              <article>
                <span className={styles.metaLabel}>Disputed milestones</span>
                <strong>{caseBrief.disputedMilestones}</strong>
              </article>
              <article>
                <span className={styles.metaLabel}>Execution failures</span>
                <strong>{caseBrief.failedExecutions}</strong>
              </article>
              <article>
                <span className={styles.metaLabel}>Latest activity</span>
                <strong>{formatDate(caseBrief.latestActivityAt)}</strong>
              </article>
            </div>
            <StatusNotice message={caseBrief.pressureSummary} messageClassName={styles.stateText} />
            <div className={styles.stack}>
              <article className={styles.boundaryCard}>
                <strong>{`Audit source: ${getAuthoritySourceLabel(audit.bundle.authority.source)}`}</strong>
                <p className={styles.stateText}>
                  {getAuthorityReasonLabel(audit.bundle.authority.reason)}
                </p>
                <small>
                  {`Authority reads ${formatBooleanSummary(
                    audit.bundle.authority.authorityReadsEnabled,
                  )} · projection available ${formatBooleanSummary(
                    audit.bundle.authority.projectionAvailable,
                  )} · fresh ${formatBooleanSummary(
                    audit.bundle.authority.projectionFresh,
                  )} · healthy ${formatBooleanSummary(
                    audit.bundle.authority.projectionHealthy,
                  )}.`}
                </small>
                <small>
                  {`Projected at ${
                    audit.bundle.authority.projectedAt
                      ? formatDate(audit.bundle.authority.projectedAt)
                      : 'Unavailable'
                  } · last projected block ${
                    audit.bundle.authority.lastProjectedBlock ?? 'Unavailable'
                  } · event count ${audit.bundle.authority.lastEventCount ?? 'Unavailable'}.`}
                </small>
              </article>
              <div className={styles.inlineActions}>
                <button
                  type="button"
                  onClick={() => void handleDownloadExport('job-history', 'json')}
                >
                  Export job history JSON
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadExport('job-history', 'csv')}
                >
                  Export job history CSV
                </button>
              </div>
              <div className={styles.inlineActions}>
                <button
                  type="button"
                  onClick={() => void handleDownloadExport('dispute-case', 'json')}
                >
                  Export dispute case JSON
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadExport('dispute-case', 'csv')}
                >
                  Export dispute case CSV
                </button>
              </div>
              <StatusNotice message={exportState.message} messageClassName={styles.stateText} />
              <article className={styles.boundaryCard}>
                <strong>
                  {runtimeProfile?.operator.exportSupport
                    ? 'Backend export support verified'
                    : 'Runtime profile did not confirm export support'}
                </strong>
                <p className={styles.stateText}>
                  Job-history exports are always available from the public bundle. Dispute-case
                  exports stay truthful to the current milestone and receipt posture, even when no
                  active disputes remain.
                </p>
              </article>
            </div>
          </section>

          <div className={styles.grid}>
            <section className={styles.panel} data-walkthrough-id="operator-resolution-panel">
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Dispute Review</p>
                  <h2>{messages.case.milestoneAttention}</h2>
                </div>
              </header>
              <div className={styles.stack}>
                {disputedMilestoneCards.length > 0 ? (
                  disputedMilestoneCards.map((card) => (
                    <article
                      key={`${audit.bundle.job.id}-dispute-${card.milestoneIndex}`}
                      className={`${styles.timelineCard} ${getMilestonePostureClassName(
                        card.posture,
                      )}`}
                    >
                      <div className={styles.timelineHead}>
                        <strong>{`${card.milestoneIndex + 1}. ${card.title}`}</strong>
                        <span>{card.status}</span>
                      </div>
                      <p>{card.operatorSummary}</p>
                      <small>{card.supportingDetail}</small>
                      <small>{card.amount} USDC</small>
                    </article>
                  ))
                ) : (
                  <EmptyStateCard
                    title={messages.case.disputeReview}
                    message={messages.case.noDisputedMilestones}
                    className={styles.emptyCard}
                    messageClassName={styles.stateText}
                  />
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Execution Triage</p>
                  <h2>{messages.case.failuresAndReceipts}</h2>
                </div>
              </header>
              <div className={styles.stack}>
                {failedExecutionCards.length > 0 ? (
                  failedExecutionCards.map((card) => (
                    <article
                      key={card.id}
                      className={`${styles.timelineCard} ${styles.executionFailure}`}
                    >
                      <div className={styles.timelineHead}>
                        <strong>{card.action}</strong>
                        <span>{card.status}</span>
                      </div>
                      <p>{card.summary}</p>
                      <small>{card.detail}</small>
                      <small>
                        {card.milestoneIndex === undefined
                          ? 'Job-level receipt'
                          : `Milestone ${card.milestoneIndex + 1}`}
                      </small>
                      <small>{card.actorAddress}</small>
                      <small>{previewHash(card.txHash)}</small>
                      <small>{formatDate(card.at)}</small>
                    </article>
                  ))
                ) : (
                  <EmptyStateCard
                    title={messages.helperCopy.executionFailed}
                    message="The current receipt stream does not show failed public executions."
                    className={styles.emptyCard}
                    messageClassName={styles.stateText}
                  />
                )}
              </div>
            </section>
          </div>

          <div className={styles.grid}>
            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Milestone Posture</p>
                  <h2>{messages.case.milestoneBoard}</h2>
                </div>
              </header>
              <div className={styles.stack}>
                {milestoneReviewCards.map((card) => (
                  <article
                    key={`${audit.bundle.job.id}-milestone-${card.milestoneIndex}`}
                    className={`${styles.timelineCard} ${getMilestonePostureClassName(
                      card.posture,
                    )}`}
                  >
                    <div className={styles.timelineHead}>
                      <strong>{`${card.milestoneIndex + 1}. ${card.title}`}</strong>
                      <span>{card.status}</span>
                    </div>
                    <p>{card.operatorSummary}</p>
                    <small>{card.supportingDetail}</small>
                    <small>{card.amount} USDC</small>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Privileged Resolution</p>
                  <h2>{messages.case.resolveMilestone}</h2>
                </div>
              </header>
              <div className={styles.stack}>
                {disputedMilestoneCards.length === 0 ? (
                  <EmptyStateCard
                    title={messages.case.disputeReview}
                    message={messages.case.resolutionBlocked}
                    className={styles.emptyCard}
                    messageClassName={styles.stateText}
                  />
                ) : !accessToken ? (
                  <EmptyStateCard
                    title="Authenticate operator session"
                    message="Sign in before attempting privileged dispute resolution."
                    className={styles.emptyCard}
                    messageClassName={styles.stateText}
                  />
                ) : !arbitratorAddress ? (
                  <EmptyStateCard
                    title="Backend profile incomplete"
                    message="The backend runtime profile did not expose the configured arbitrator wallet."
                    className={styles.emptyCard}
                    messageClassName={styles.stateText}
                  />
                ) : !controlsArbitratorWallet ? (
                  <>
                    <article className={styles.boundaryCard}>
                      <strong>Blocked by wallet authority</strong>
                      <p className={styles.stateText}>
                        The authenticated session does not currently control the configured
                        arbitrator wallet {arbitratorAddress}.
                      </p>
                    </article>
                  </>
                ) : (
                  <>
                    <label className={styles.field}>
                      <span>Disputed milestone</span>
                      <select
                        value={String(selectedResolutionCard?.milestoneIndex ?? '')}
                        onChange={(event) =>
                          setResolutionMilestoneIndex(Number(event.target.value))
                        }
                      >
                        {disputedMilestoneCards.map((card) => (
                          <option key={card.milestoneIndex} value={card.milestoneIndex}>
                            {`${card.milestoneIndex + 1}. ${card.title}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className={styles.fieldGrid}>
                      <label className={styles.field}>
                        <span>Resolution action</span>
                        <select
                          value={resolutionAction}
                          onChange={(event) =>
                            setResolutionAction(event.target.value as 'release' | 'refund')
                          }
                        >
                          <option value="release">release</option>
                          <option value="refund">refund</option>
                        </select>
                      </label>
                      <label className={styles.field}>
                        <span>Resolution note</span>
                        <textarea
                          rows={4}
                          value={resolutionNote}
                          onChange={(event) => setResolutionNote(event.target.value)}
                          placeholder="Document the operator or arbitrator decision."
                        />
                      </label>
                    </div>
                    <div className={styles.inlineActions}>
                      <button type="button" onClick={handleResolveMilestone}>
                        {messages.case.resolveMilestone}
                      </button>
                    </div>
                    <StatusNotice
                      message={resolutionState.message}
                      messageClassName={styles.stateText}
                    />
                    <article className={styles.boundaryCard}>
                      <strong>Resolution authority confirmed</strong>
                      <p className={styles.stateText}>
                        The session controls the configured arbitrator wallet, so the existing
                        protected resolve endpoint can be used from this console.
                      </p>
                    </article>
              </>
            )}
          </div>
        </section>
          </div>

          <div className={styles.grid}>
            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Receipt Stream</p>
                  <h2>All public execution receipts</h2>
                </div>
              </header>
              <div className={styles.stack}>
                {executionIssueCards.length > 0 ? (
                  executionIssueCards.map((card) => (
                    <article key={card.id} className={styles.timelineCard}>
                      <div className={styles.timelineHead}>
                        <strong>{card.action}</strong>
                        <span>{card.status}</span>
                      </div>
                      <p>{card.summary}</p>
                      <small>{card.detail}</small>
                      <small>
                        {card.milestoneIndex === undefined
                          ? 'Job-level receipt'
                          : `Milestone ${card.milestoneIndex + 1}`}
                      </small>
                      <small>{card.actorAddress}</small>
                      <small>{previewHash(card.txHash)}</small>
                      <small>{formatTimestamp(card.at)}</small>
                    </article>
                  ))
                ) : (
                  <EmptyStateCard
                    title="No receipts available"
                    message="This public bundle did not return any execution receipts."
                    className={styles.emptyCard}
                    messageClassName={styles.stateText}
                  />
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Onchain Posture</p>
                  <h2>Case addresses and settlement context</h2>
                </div>
              </header>
              <div className={styles.stack}>
                <article className={styles.timelineCard}>
                  <span className={styles.metaLabel}>Client address</span>
                  <code>{audit.bundle.job.onchain.clientAddress}</code>
                </article>
                <article className={styles.timelineCard}>
                  <span className={styles.metaLabel}>Worker address</span>
                  <code>{audit.bundle.job.onchain.workerAddress}</code>
                </article>
                <article className={styles.timelineCard}>
                  <span className={styles.metaLabel}>Currency address</span>
                  <code>{audit.bundle.job.onchain.currencyAddress}</code>
                </article>
                <article className={styles.timelineCard}>
                  <span className={styles.metaLabel}>Contract address</span>
                  <code>{audit.bundle.job.onchain.contractAddress}</code>
                </article>
              </div>
            </section>
          </div>

          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                  <p className={styles.panelEyebrow}>Timeline</p>
                <h2>{messages.case.timeline}</h2>
              </div>
            </header>
            <div className={styles.stack}>
              {operatorTimeline.map((entry, index) => (
                <article
                  key={`${entry.kind}-${entry.label}-${entry.at}-${index}`}
                    className={`${styles.timelineCard} ${getTimelineToneClassName(entry.tone)}`}
                >
                  <div className={styles.timelineHead}>
                    <strong>{entry.label}</strong>
                    <span>{formatDate(entry.at)}</span>
                  </div>
                  <p>{entry.summary}</p>
                  <pre className={styles.ltrValue} data-ltr="true">{entry.detail}</pre>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Operator Scope</p>
              <h2>{messages.case.whatThisSurfaceCanReview}</h2>
            </div>
          </header>
          <div className={styles.grid}>
            <EmptyStateCard
              title={messages.case.disputeReview}
              message={messages.case.emptyLoad}
              className={styles.emptyCard}
              messageClassName={styles.stateText}
            />
            <EmptyStateCard
              title={messages.case.receiptTriage}
              message="Inspect confirmed and failed execution receipts without endpoint spelunking."
              className={styles.emptyCard}
              messageClassName={styles.stateText}
            />
            <EmptyStateCard
              title="Case exports"
              message="Load a public bundle to export job history or dispute-case artifacts without endpoint spelunking."
              className={styles.emptyCard}
              messageClassName={styles.stateText}
            />
            <EmptyStateCard
              title={messages.case.publicOnlyPosture}
              message="The console only reflects public audit data. It does not invent privileged actions that the backend cannot enforce."
              className={styles.emptyCard}
              messageClassName={styles.stateText}
            />
          </div>
        </section>
      )}
      {walkthrough.overlay}
    </div>
  );
}
