'use client';

import { useEffect, useMemo, useState } from 'react';
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

const historyKey = 'escrow4337.admin.recent-lookups';
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

function getRuntimeProfileLabel(profile: RuntimeProfile['profile']) {
  switch (profile) {
    case 'deployment-like':
      return 'Deployment-like';
    case 'local-mock':
      return 'Local mock';
    case 'mixed':
      return 'Mixed';
  }
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

function getTimelineToneClassName(
  tone: 'neutral' | 'warning' | 'critical' | 'success',
) {
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

function getOperationsReasonLabel(
  reason: EscrowHealthReport['jobs'][number]['reasons'][number],
) {
  switch (reason) {
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

type OperationsReasonFilter =
  | 'all'
  | EscrowHealthReport['jobs'][number]['reasons'][number];

type FailureWorkflowStatus = NonNullable<
  EscrowHealthReport['jobs'][number]['executionFailureWorkflow']
>['status'];

function getOperationsReasonFilterLabel(reason: OperationsReasonFilter) {
  switch (reason) {
    case 'all':
      return 'All attention';
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
  surface: NonNullable<
    EscrowHealthReport['jobs'][number]['failureGuidance']
  >['responsibleSurface'],
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
  posture: NonNullable<
    EscrowHealthReport['jobs'][number]['failureGuidance']
  >['retryPosture'],
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
  return guidance?.retryPosture === 'wait_for_external_fix'
    ? 'blocked_external'
    : 'investigating';
}

function getFailureAcknowledgementMessage(
  workflow: NonNullable<
    EscrowHealthReport['jobs'][number]['executionFailureWorkflow']
  >,
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

export function OperatorConsole() {
  const [runtimeProfile, setRuntimeProfile] = useState<RuntimeProfile | null>(null);
  const [runtimeState, setRuntimeState] = useState<AsyncState>(createIdleState());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [jobId, setJobId] = useState('');
  const [audit, setAudit] = useState<AuditBundle | null>(null);
  const [lookupHistory, setLookupHistory] = useState<string[]>([]);
  const [challenge, setChallenge] = useState<WalletLinkChallenge | null>(null);
  const [linkAddress, setLinkAddress] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkChainId, setLinkChainId] = useState('84532');
  const [walletSignature, setWalletSignature] = useState('');
  const [escrowHealth, setEscrowHealth] = useState<EscrowHealthReport | null>(null);
  const [healthReasonFilter, setHealthReasonFilter] =
    useState<OperationsReasonFilter>('all');
  const [failureWorkflowDrafts, setFailureWorkflowDrafts] = useState<
    Record<string, string>
  >({});
  const [failureWorkflowStatuses, setFailureWorkflowStatuses] = useState<
    Record<string, FailureWorkflowStatus>
  >({});
  const [failureWorkflowStates, setFailureWorkflowStates] = useState<
    Record<string, AsyncState>
  >({});
  const [reconciliationImportJson, setReconciliationImportJson] = useState('');
  const [reconciliationImportReport, setReconciliationImportReport] =
    useState<EscrowJobHistoryImportReport | null>(null);
  const [staleWorkflowDrafts, setStaleWorkflowDrafts] = useState<
    Record<string, string>
  >({});
  const [staleWorkflowStates, setStaleWorkflowStates] = useState<
    Record<string, AsyncState>
  >({});
  const [startState, setStartState] = useState<AsyncState>(createIdleState());
  const [verifyState, setVerifyState] = useState<AsyncState>(createIdleState());
  const [sessionState, setSessionState] = useState<AsyncState>(createIdleState());
  const [healthState, setHealthState] = useState<AsyncState>(createIdleState());
  const [reconciliationImportState, setReconciliationImportState] = useState<AsyncState>(
    createIdleState(),
  );
  const [walletActionState, setWalletActionState] = useState<AsyncState>(
    createIdleState(),
  );
  const [resolutionState, setResolutionState] = useState<AsyncState>(
    createIdleState(),
  );
  const [exportState, setExportState] = useState<AsyncState>(createIdleState());
  const [resolutionMilestoneIndex, setResolutionMilestoneIndex] = useState<number | null>(
    null,
  );
  const [resolutionAction, setResolutionAction] = useState<'release' | 'refund'>(
    'release',
  );
  const [resolutionNote, setResolutionNote] = useState('');
  const [state, setState] = useState<AsyncState>(createIdleState());

  useEffect(() => {
    setLookupHistory(readStoredStringList(historyKey));
  }, []);

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
    if (!accessToken) {
      return;
    }

    void refreshOperatorSession(accessToken);
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

  async function refreshOperatorSession(token = accessToken) {
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
      setSessionState(createSuccessState('Operator session is current.'));
    } catch (error) {
      setSessionState(createErrorState(error, 'Failed to load operator session'));
      clearSession();
    }
  }

  async function handleLookup(nextJobId = jobId) {
    const normalizedJobId = nextJobId.trim();
    if (!normalizedJobId) {
      setState(
        createErrorState(
          null,
          'Provide a job id before loading the public audit bundle.',
        ),
      );
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
        createSuccessState(
          'OTP issued. Check your configured mail inbox or relay logs.',
        ),
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
      setVerifyState(
        createSuccessState('Operator session established. Loading profile state...'),
      );
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
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);
      writeSession(tokens);
      setSessionState(createSuccessState('Operator session refreshed.'));
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
    () => (audit ? buildCaseBrief(audit.bundle) : null),
    [audit],
  );
  const milestoneReviewCards = useMemo(
    () => (audit ? buildMilestoneReviewCards(audit.bundle.job) : []),
    [audit],
  );
  const disputedMilestoneCards = useMemo(
    () => getDisputedMilestoneCards(milestoneReviewCards),
    [milestoneReviewCards],
  );
  const executionIssueCards = useMemo(
    () => (audit ? buildExecutionIssueCards(audit.bundle.executions) : []),
    [audit],
  );
  const failedExecutionCards = useMemo(
    () => getExecutionFailures(executionIssueCards),
    [executionIssueCards],
  );
  const operatorTimeline = useMemo(
    () => (audit ? buildOperatorTimeline(audit.bundle) : []),
    [audit],
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
  const selectedResolutionCard = useMemo(
    () =>
      disputedMilestoneCards.find(
        (card) => card.milestoneIndex === resolutionMilestoneIndex,
      ) ??
      disputedMilestoneCards[0] ??
      null,
    [disputedMilestoneCards, resolutionMilestoneIndex],
  );

  useEffect(() => {
    if (!accessToken) {
      setEscrowHealth(null);
      setHealthState(createIdleState());
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

        next[job.jobId] =
          current[job.jobId] ?? job.executionFailureWorkflow?.note ?? '';
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
      const report = await adminApi.importJobHistoryReconciliation(
        documentJson,
        accessToken,
      );
      setReconciliationImportReport(report);
      setReconciliationImportState(
        createSuccessState(
          `Imported job-history preview for ${report.document.jobId}.`,
        ),
      );
    } catch (error) {
      setReconciliationImportReport(null);
      setReconciliationImportState(
        createErrorState(error, 'Failed to import job-history reconciliation'),
      );
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

    setFailureWorkflowState(
      jobId,
      createWorkingState('Claiming execution-failure workflow...'),
    );

    try {
      await adminApi.claimExecutionFailureWorkflow(
        jobId,
        {
          note: failureWorkflowDrafts[jobId]?.trim() || undefined,
          status: failureWorkflowStatuses[jobId],
        },
        accessToken,
      );
      setFailureWorkflowState(
        jobId,
        createSuccessState('Execution-failure workflow claimed.'),
      );
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
      setFailureWorkflowState(
        jobId,
        createSuccessState('Latest execution failures acknowledged.'),
      );
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

    setFailureWorkflowState(
      jobId,
      createWorkingState('Releasing execution-failure workflow...'),
    );

    try {
      await adminApi.releaseExecutionFailureWorkflow(jobId, accessToken);
      setFailureWorkflowState(
        jobId,
        createSuccessState('Execution-failure workflow released.'),
      );
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

    setFailureWorkflowState(
      jobId,
      createWorkingState('Saving execution-failure workflow...'),
    );

    try {
      await adminApi.updateExecutionFailureWorkflow(
        jobId,
        {
          note: failureWorkflowDrafts[jobId]?.trim() || undefined,
          status: failureWorkflowStatuses[jobId],
        },
        accessToken,
      );
      setFailureWorkflowState(
        jobId,
        createSuccessState('Execution-failure workflow saved.'),
      );
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

    setStaleWorkflowState(
      jobId,
      createWorkingState('Claiming stale job workflow...'),
    );

    try {
      await adminApi.claimStaleJob(
        jobId,
        {
          note: staleWorkflowDrafts[jobId]?.trim() || undefined,
        },
        accessToken,
      );
      setStaleWorkflowState(
        jobId,
        createSuccessState('Stale job workflow claimed.'),
      );
      await loadEscrowHealth(accessToken, healthReasonFilter);
    } catch (error) {
      setStaleWorkflowState(
        jobId,
        createErrorState(error, 'Failed to claim stale job workflow'),
      );
    }
  }

  async function handleReleaseStaleJob(jobId: string) {
    if (!accessToken) {
      return;
    }

    setStaleWorkflowState(
      jobId,
      createWorkingState('Releasing stale job workflow...'),
    );

    try {
      await adminApi.releaseStaleJob(jobId, accessToken);
      setStaleWorkflowState(
        jobId,
        createSuccessState('Stale job workflow released.'),
      );
      await loadEscrowHealth(accessToken, healthReasonFilter);
    } catch (error) {
      setStaleWorkflowState(
        jobId,
        createErrorState(error, 'Failed to release stale job workflow'),
      );
    }
  }

  async function handleResolveMilestone() {
    if (
      !accessToken ||
      !audit ||
      selectedResolutionCard === null
    ) {
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
          ? createSuccessState(
              `Resolution submitted via ${previewHash(response.txHash)}.`,
            )
          : createErrorState(
              null,
              'Resolution submitted, but the case could not be refreshed automatically.',
            ),
      );
    } catch (error) {
      setResolutionState(
        createErrorState(error, 'Failed to resolve disputed milestone'),
      );
    }
  }

  async function handleDownloadExport(
    artifact: CaseExportArtifact,
    format: CaseExportFormat,
  ) {
    if (!audit) {
      return;
    }

    setExportState(
      createWorkingState(`Preparing ${artifact} ${format.toUpperCase()} export...`),
    );

    try {
      const documentToSave = await adminApi.downloadCaseExport(
        audit.bundle.job.id,
        artifact,
        format,
      );
      saveDownloadedDocument(documentToSave);
      setExportState(
        createSuccessState(
          `Downloaded ${artifact} ${format.toUpperCase()} export.`,
        ),
      );
    } catch (error) {
      setExportState(createErrorState(error, 'Failed to download case export'));
    }
  }

  return (
    <div className={styles.console}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Operator Console</p>
          <h1>Review disputes and execution issues from the public audit trail.</h1>
          <p className={styles.heroCopy}>
            This surface stays within the existing public audit endpoint. It is
            organized around operator tasks: dispute triage, receipt inspection,
            milestone posture review, and explicit visibility into what still
            requires backend authorization work.
          </p>
        </div>
        <div className={styles.heroCard}>
          <div>
            <span className={styles.metaLabel}>API base URL</span>
            <strong>{adminApi.baseUrl}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Backend profile</span>
            <strong>
              {runtimeProfile
                ? getRuntimeProfileLabel(runtimeProfile.profile)
                : 'Loading'}
            </strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Loaded case</span>
            <strong>{audit?.bundle.job.id || 'None selected'}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Pressure</span>
            <strong>{caseBrief?.pressure || 'Waiting for lookup'}</strong>
          </div>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
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
                  ? getRuntimeProfileLabel(runtimeProfile.profile)
                  : 'Unavailable'}
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
          </div>
          <div className={styles.stack}>
            <StatusNotice
              message={
                runtimeProfile?.summary || runtimeState.message
              }
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
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleLogout}
                >
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
                    Required wallet: {arbitratorAddress || 'Unavailable from backend runtime profile.'}
                  </p>
                </article>
              </>
            ) : (
              <article className={styles.boundaryCard}>
                <strong>Authenticate first</strong>
                <p className={styles.stateText}>
                  Operator resolution requires an authenticated session plus a linked arbitrator wallet.
                </p>
              </article>
            )}
          </div>
        </section>

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
                {escrowHealth
                  ? getOperationsReasonFilterLabel(healthReasonFilter)
                  : 'Unavailable'}
              </strong>
            </article>
            <article>
              <span className={styles.metaLabel}>Stale threshold</span>
              <strong>
                {escrowHealth
                  ? `${escrowHealth.thresholds.staleJobHours} hours`
                  : 'Unavailable'}
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
                  The backend did not expose the configured arbitrator wallet, so
                  operator-wide escrow health cannot be authorized yet.
                </p>
              </article>
            ) : !controlsArbitratorWallet ? (
              <article className={styles.boundaryCard}>
                <strong>Link the configured arbitrator wallet to unlock operations health</strong>
                <p className={styles.stateText}>
                  The current operator session must control {arbitratorAddress} before
                  the backend will expose cross-job attention items.
                </p>
              </article>
            ) : (
              <>
                <div className={styles.suggestionRow}>
                  {(
                    [
                      'all',
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
                    Paste a `job-history` JSON export to normalize its timeline, replay
                    the imported state, and compare it against the local persisted job.
                  </p>
                  <label className={styles.field}>
                    <span>Job-history JSON</span>
                    <textarea
                      rows={6}
                      value={reconciliationImportJson}
                      onChange={(event) =>
                        setReconciliationImportJson(event.target.value)
                      }
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
                      {reconciliationImportReport.localComparison.mismatchedMilestones
                        .length > 0 ? (
                        <div className={styles.stack}>
                          {reconciliationImportReport.localComparison.mismatchedMilestones.map(
                            (milestone) => (
                              <small
                                key={`import-mismatch-${milestone.index}`}
                              >
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
                              reconciliationImportReport.importedReconciliation
                                .issueCount === 1
                                ? ''
                                : 's'
                            } · severity ${getReconciliationSeverityLabel(
                              reconciliationImportReport.importedReconciliation
                                .highestSeverity,
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
                        <small>
                          Imported replay produced no reconciliation issues.
                        </small>
                      )}
                    </div>
                  ) : null}
                </article>
              </>
            )}
            {controlsArbitratorWallet && escrowHealth && escrowHealth.jobs.length > 0 ? (
              escrowHealth.jobs.map((job) => (
                (() => {
                  const isStaleJob = job.reasons.includes('stale_job');
                  const isFailedJob = job.reasons.includes('failed_execution');
                  const executionFailureWorkflow = job.executionFailureWorkflow;
                  const staleWorkflow = job.staleWorkflow;
                  const failedExecutionDiagnostics =
                    job.failedExecutionDiagnostics;
                  const failureGuidance = job.failureGuidance;
                  const reconciliation = job.reconciliation;
                  const failureClaimedByCurrentOperator =
                    executionFailureWorkflow?.claimedByUserId === profile?.id;
                  const claimedByCurrentOperator =
                    staleWorkflow?.claimedByUserId === profile?.id;

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
                      <small>{`Open disputes ${job.counts.openDisputes} · Failed executions ${job.counts.failedExecutions}`}</small>
                      {job.staleForMs !== null ? (
                        <small>{`Stale for ${Math.floor(job.staleForMs / 3_600_000)}h`}</small>
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
                              reconciliation.sourceCounts.auditEvents === 1
                                ? ''
                                : 's'
                            } · ${reconciliation.sourceCounts.confirmedExecutions} confirmed execution${
                              reconciliation.sourceCounts.confirmedExecutions === 1
                                ? ''
                                : 's'
                            } · ${reconciliation.sourceCounts.failedExecutions} failed execution${
                              reconciliation.sourceCounts.failedExecutions === 1
                                ? ''
                                : 's'
                            }`}
                          </small>
                          <small>
                            {`Replay: status ${reconciliation.projection.aggregateStatus} -> ${reconciliation.projection.projectedStatus} · funded ${
                              formatReconciliationValue(
                                reconciliation.projection.aggregateFundedAmount,
                              )
                            } -> ${formatReconciliationValue(
                              reconciliation.projection.projectedFundedAmount,
                            )}`}
                          </small>
                          {reconciliation.projection.mismatchedMilestones.length > 0 ? (
                            <div className={styles.stack}>
                              {reconciliation.projection.mismatchedMilestones.map(
                                (milestone) => (
                                  <small
                                    key={`${job.jobId}-reconciliation-milestone-${milestone.index}`}
                                  >
                                    {`Milestone ${
                                      milestone.index + 1
                                    }: ${formatReconciliationValue(
                                      milestone.aggregateStatus,
                                    )} -> ${formatReconciliationValue(
                                      milestone.projectedStatus,
                                    )}${
                                      milestone.lastAuditType
                                        ? ` after ${milestone.lastAuditType} at ${formatTimestamp(
                                            milestone.lastAuditAt ?? 0,
                                          )}`
                                        : ''
                                    }`}
                                  </small>
                                ),
                              )}
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
                                {issue.detail ? (
                                  <small>{issue.detail}</small>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </article>
                      ) : null}
                      {failedExecutionDiagnostics ? (
                        <article
                          className={`${styles.boundaryCard} ${styles.executionFailure}`}
                        >
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
                              <small>
                                {`Guidance: ${failureGuidance.summary}`}
                              </small>
                              <small>
                                {`Surface: ${getFailureGuidanceSurfaceLabel(
                                  failureGuidance.responsibleSurface,
                                )} · Retry posture: ${getFailureRetryPostureLabel(
                                  failureGuidance.retryPosture,
                                )} · Severity: ${failureGuidance.severity}`}
                              </small>
                              <small>
                                {`Next steps: ${failureGuidance.recommendedActions.join(
                                  ' · ',
                                )}`}
                              </small>
                            </>
                          ) : null}
                          <small>
                            {`Actions: ${formatFailureBreakdown(
                              failedExecutionDiagnostics.actionBreakdown.map(
                                (entry) => ({
                                  label: entry.action,
                                  count: entry.count,
                                }),
                              ),
                            )}`}
                          </small>
                          <small>
                            {`Codes: ${formatFailureBreakdown(
                              failedExecutionDiagnostics.failureCodeBreakdown.map(
                                (entry) => ({
                                  label: formatFailureCodeLabel(entry.failureCode),
                                  count: entry.count,
                                }),
                              ),
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
                                      [job.jobId]:
                                        event.target.value as FailureWorkflowStatus,
                                    }))
                                  }
                                  disabled={Boolean(
                                    executionFailureWorkflow &&
                                      !failureClaimedByCurrentOperator,
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
                                    executionFailureWorkflow &&
                                      !failureClaimedByCurrentOperator,
                                  )}
                                />
                              </label>
                              <div className={styles.inlineActions}>
                                {!executionFailureWorkflow ||
                                failureClaimedByCurrentOperator ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      executionFailureWorkflow
                                        ? void handleUpdateExecutionFailureWorkflow(
                                            job.jobId,
                                          )
                                        : void handleClaimExecutionFailureWorkflow(
                                            job.jobId,
                                          )
                                    }
                                  >
                                    {executionFailureWorkflow
                                      ? 'Save failure workflow'
                                      : 'Claim failure workflow'}
                                  </button>
                                ) : null}
                                {executionFailureWorkflow &&
                                failureClaimedByCurrentOperator ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleAcknowledgeExecutionFailures(
                                        job.jobId,
                                      )
                                    }
                                  >
                                    Acknowledge latest failures
                                  </button>
                                ) : null}
                                {executionFailureWorkflow &&
                                failureClaimedByCurrentOperator ? (
                                  <button
                                    type="button"
                                    className={styles.secondaryButton}
                                    onClick={() =>
                                      void handleReleaseExecutionFailureWorkflow(
                                        job.jobId,
                                      )
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
                            {failedExecutionDiagnostics.recentFailures.map(
                              (failure, index) => (
                                <code key={`${job.jobId}-failure-${index}`}>
                                  {`#${index + 1} ${failure.action} at ${formatTimestamp(
                                    failure.submittedAt,
                                  )}${
                                    failure.milestoneIndex !== null
                                      ? ` · milestone ${failure.milestoneIndex + 1}`
                                      : ''
                                  }${
                                    failure.failureCode
                                      ? ` · ${failure.failureCode}`
                                      : ''
                                  }${
                                    failure.failureMessage
                                      ? ` · ${failure.failureMessage}`
                                      : ''
                                  }${
                                    failure.txHash
                                      ? ` · ${previewHash(failure.txHash)}`
                                      : ''
                                  }`}
                                </code>
                              ),
                            )}
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
                              disabled={Boolean(
                                staleWorkflow && !claimedByCurrentOperator,
                              )}
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
                })()
              ))
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
      </div>

      <section className={styles.panel}>
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
          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Case Brief</p>
                <h2>{audit.bundle.job.title}</h2>
              </div>
              <span
                className={`${styles.pressureBadge} ${getPressureClassName(caseBrief.pressure)}`}
              >
                {caseBrief.pressure}
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
                <strong>{formatTimestamp(caseBrief.latestActivityAt)}</strong>
              </article>
            </div>
            <StatusNotice
              message={caseBrief.pressureSummary}
              messageClassName={styles.stateText}
            />
            <div className={styles.stack}>
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
              <StatusNotice
                message={exportState.message}
                messageClassName={styles.stateText}
              />
              <article className={styles.boundaryCard}>
                <strong>
                  {runtimeProfile?.operator.exportSupport
                    ? 'Backend export support verified'
                    : 'Runtime profile did not confirm export support'}
                </strong>
                <p className={styles.stateText}>
                  Job-history exports are always available from the public bundle.
                  Dispute-case exports stay truthful to the current milestone and
                  receipt posture, even when no active disputes remain.
                </p>
              </article>
            </div>
          </section>

          <div className={styles.grid}>
            <section className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>Dispute Review</p>
                  <h2>Milestones needing operator attention</h2>
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
                    title="No active disputes"
                    message="This public bundle does not currently show any disputed milestones."
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
                  <h2>Failures and receipt posture</h2>
                </div>
              </header>
              <div className={styles.stack}>
                {failedExecutionCards.length > 0 ? (
                  failedExecutionCards.map((card) => (
                    <article key={card.id} className={`${styles.timelineCard} ${styles.executionFailure}`}>
                      <div className={styles.timelineHead}>
                        <strong>{card.action}</strong>
                        <span>{card.status}</span>
                      </div>
                      <p>{card.summary}</p>
                      <small>{card.detail}</small>
                      <small>{card.milestoneIndex === undefined ? 'Job-level receipt' : `Milestone ${card.milestoneIndex + 1}`}</small>
                      <small>{card.actorAddress}</small>
                      <small>{previewHash(card.txHash)}</small>
                      <small>{formatTimestamp(card.at)}</small>
                    </article>
                  ))
                ) : (
                  <EmptyStateCard
                    title="No failed executions"
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
                  <h2>Operator-readable milestone board</h2>
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
                  <h2>Operator dispute action center</h2>
                </div>
              </header>
              <div className={styles.stack}>
                {disputedMilestoneCards.length === 0 ? (
                  <EmptyStateCard
                    title="No active disputes"
                    message="Privileged resolution is only actionable when the current bundle still shows a disputed milestone."
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
                        The authenticated session does not currently control the configured arbitrator wallet {arbitratorAddress}.
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
                        Resolve disputed milestone
                      </button>
                    </div>
                    <StatusNotice
                      message={resolutionState.message}
                      messageClassName={styles.stateText}
                    />
                    <article className={styles.boundaryCard}>
                      <strong>Resolution authority confirmed</strong>
                      <p className={styles.stateText}>
                        The session controls the configured arbitrator wallet, so the existing protected resolve endpoint can be used from this console.
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
                      <small>{card.milestoneIndex === undefined ? 'Job-level receipt' : `Milestone ${card.milestoneIndex + 1}`}</small>
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
                <h2>Operator-readable combined event stream</h2>
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
                    <span>{formatTimestamp(entry.at)}</span>
                  </div>
                  <p>{entry.summary}</p>
                  <pre>{entry.detail}</pre>
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
              <h2>What this surface can review today</h2>
            </div>
          </header>
          <div className={styles.grid}>
            <EmptyStateCard
              title="Dispute review"
              message="Load a public job bundle to review milestone disputes, reasons, and current settlement posture."
              className={styles.emptyCard}
              messageClassName={styles.stateText}
            />
            <EmptyStateCard
              title="Receipt triage"
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
              title="Public-only posture"
              message="The console only reflects public audit data. It does not invent privileged actions that the backend cannot enforce."
              className={styles.emptyCard}
              messageClassName={styles.stateText}
            />
          </div>
        </section>
      )}
    </div>
  );
}
