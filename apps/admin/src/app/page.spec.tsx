import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultLocalApiPort, resolveLocalApiBaseUrl } from '@escrow4334/frontend-core';
import { renderApp, seedJsonStorage } from '@escrow4334/frontend-core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAuditBundle,
  createEoaWallet,
  createEscrowChainIngestionStatus,
  createEscrowHealthReport,
  createResolvedAuditBundle,
  createRuntimeProfile,
  createSessionTokens,
  createUserProfile,
  createWalletLinkChallenge,
  createHexAddress,
  createQuietAuditBundle,
  lookupHistoryStorageKey,
  sessionStorageKey,
} from '../test/fixtures';
import { AdminI18nProvider } from '../lib/i18n';

const localApiBaseUrl = resolveLocalApiBaseUrl(defaultLocalApiPort);

const { mockedAdminApi } = vi.hoisted(() => ({
  mockedAdminApi: {
    baseUrl: '',
    getRuntimeProfile: vi.fn(),
    startAuth: vi.fn(),
    verifyAuth: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    getEscrowHealth: vi.fn(),
    getEscrowChainIngestionStatus: vi.fn(),
    getEscrowChainSyncDaemonHealth: vi.fn(),
    importJobHistoryReconciliation: vi.fn(),
    syncEscrowChainAudit: vi.fn(),
    syncEscrowChainAuditBatch: vi.fn(),
    claimExecutionFailureWorkflow: vi.fn(),
    acknowledgeExecutionFailures: vi.fn(),
    updateExecutionFailureWorkflow: vi.fn(),
    releaseExecutionFailureWorkflow: vi.fn(),
    claimStaleJob: vi.fn(),
    releaseStaleJob: vi.fn(),
    createWalletChallenge: vi.fn(),
    verifyWalletChallenge: vi.fn(),
    getAudit: vi.fn(),
    downloadCaseExport: vi.fn(),
    resolveMilestone: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  adminApi: mockedAdminApi,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import Home from './page';

function renderHome(initialLocale: 'en' | 'ar' = 'en') {
  return renderApp(
    <AdminI18nProvider initialLocale={initialLocale}>
      <Home />
    </AdminI18nProvider>,
  );
}

describe('admin page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAdminApi.baseUrl = localApiBaseUrl;
    mockedAdminApi.getRuntimeProfile.mockResolvedValue(createRuntimeProfile());
    mockedAdminApi.getEscrowHealth.mockResolvedValue(createEscrowHealthReport());
    mockedAdminApi.getEscrowChainIngestionStatus.mockResolvedValue(
      createEscrowChainIngestionStatus(),
    );
    mockedAdminApi.getEscrowChainSyncDaemonHealth.mockResolvedValue(null);
  });

  it('renders the public-only operator scope shell before any lookup', async () => {
    renderHome();

    expect(
      screen.getByRole('heading', {
        name: 'Review disputes and execution issues from the public audit trail.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'What this surface can review today' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Dispute review')).toBeInTheDocument();
    expect(screen.getByText('Receipt triage')).toBeInTheDocument();
    expect(
      screen.getByText(localApiBaseUrl),
    ).toBeInTheDocument();
    expect(screen.getByText('Backend profile validation')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Current origin allowed').length).toBeGreaterThan(0);
      expect(screen.getAllByText('HTTP target').length).toBeGreaterThan(0);
    });
  });

  it('shows truthful runtime diagnostics when the backend profile cannot load', async () => {
    mockedAdminApi.getRuntimeProfile.mockRejectedValue(new Error('Failed to fetch'));

    renderHome();

    await waitFor(() => {
      expect(screen.getAllByText('Runtime profile unavailable').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    });
  });

  it('renders distinct language labels and persists locale changes from the switcher', async () => {
    const user = userEvent.setup();

    renderHome('en');

    const englishButton = screen.getByRole('button', { name: 'English' });
    const arabicButton = screen.getByRole('button', { name: 'العربية' });

    expect(englishButton).toHaveAttribute('aria-pressed', 'true');
    expect(arabicButton).toHaveAttribute('aria-pressed', 'false');
    expect(arabicButton).toHaveAttribute('lang', 'ar');
    expect(arabicButton).toHaveAttribute('dir', 'rtl');

    await user.click(arabicButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(screen.getByRole('button', { name: 'العربية' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(document.documentElement.lang).toBe('ar');
      expect(document.documentElement.dir).toBe('rtl');
      expect(document.documentElement.dataset.locale).toBe('ar');
      expect(document.cookie).toContain('escrow4337.locale=ar');
    });
  });

  it('keeps both language option labels correct when Arabic starts active', () => {
    renderHome('ar');

    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'العربية' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('loads an audit bundle and persists recent lookup history', async () => {
    const user = userEvent.setup();
    seedJsonStorage(lookupHistoryStorageKey, ['job-legacy']);
    mockedAdminApi.getAudit.mockResolvedValue(createAuditBundle());

    renderHome();

    await user.type(screen.getByPlaceholderText('Paste a job UUID'), 'job-123');
    await user.click(screen.getByRole('button', { name: 'Load public bundle' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Disputed implementation' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Reload case' })).toBeInTheDocument();
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
    expect(mockedAdminApi.getAudit).toHaveBeenCalledWith('job-123');
    expect(window.localStorage.getItem(lookupHistoryStorageKey)).toBe(
      JSON.stringify(['job-123', 'job-legacy']),
    );
    expect(screen.getByRole('button', { name: 'Export job history JSON' })).toBeInTheDocument();
  });

  it('surfaces a validation error when lookup is submitted without a job id', async () => {
    const user = userEvent.setup();

    renderHome();

    await user.click(screen.getByRole('button', { name: 'Load public bundle' }));

    expect(
      screen.getByText('Provide a job id before loading the public audit bundle.'),
    ).toBeInTheDocument();
    expect(mockedAdminApi.getAudit).not.toHaveBeenCalled();
  });

  it('shows request failure messaging when audit lookup fails', async () => {
    const user = userEvent.setup();
    mockedAdminApi.getAudit.mockRejectedValue(new Error('Bundle not found'));

    renderHome();

    await user.type(screen.getByPlaceholderText('Paste a job UUID'), 'missing-job');
    await user.click(screen.getByRole('button', { name: 'Load public bundle' }));

    await waitFor(() => {
      expect(screen.getByText('Bundle not found')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { name: 'What this surface can review today' }),
    ).toBeInTheDocument();
    expect(mockedAdminApi.getAudit).toHaveBeenCalledWith('missing-job');
  });

  it('loads from a recent suggestion and supports reloading the same case', async () => {
    const user = userEvent.setup();
    seedJsonStorage(lookupHistoryStorageKey, ['job-suggested', 'job-older']);
    mockedAdminApi.getAudit.mockResolvedValue(createAuditBundle());

    renderHome();

    await user.click(screen.getByRole('button', { name: 'job-suggested' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Disputed implementation' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Reload case' }));

    await waitFor(() => {
      expect(mockedAdminApi.getAudit).toHaveBeenCalledTimes(2);
    });

    expect(mockedAdminApi.getAudit).toHaveBeenNthCalledWith(1, 'job-suggested');
    expect(mockedAdminApi.getAudit).toHaveBeenNthCalledWith(2, 'job-suggested');
  });

  it('renders truthful empty operator posture when the public bundle is quiet', async () => {
    const user = userEvent.setup();
    mockedAdminApi.getAudit.mockResolvedValue(createQuietAuditBundle());

    renderHome();

    await user.type(screen.getByPlaceholderText('Paste a job UUID'), 'job-quiet');
    await user.click(screen.getByRole('button', { name: 'Load public bundle' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Healthy implementation' })).toBeInTheDocument();
    });

    expect(screen.getByText('This public bundle does not currently show any disputed milestones.')).toBeInTheDocument();
    expect(
      screen.getByText('The current receipt stream does not show failed public executions.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No receipts available')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Privileged resolution is only actionable when the current bundle still shows a disputed milestone.',
      ),
    ).toBeInTheDocument();
  });

  it('links the configured arbitrator wallet into the authenticated operator session', async () => {
    const user = userEvent.setup();
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockedAdminApi.me
      .mockResolvedValueOnce(createUserProfile())
      .mockResolvedValueOnce(createUserProfile([createEoaWallet(createHexAddress('2'))]));
    mockedAdminApi.createWalletChallenge.mockResolvedValue(createWalletLinkChallenge());
    mockedAdminApi.verifyWalletChallenge.mockResolvedValue({
      defaultExecutionWalletAddress: null,
      wallets: [createEoaWallet(createHexAddress('2'))],
    });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('operator@example.com')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('textbox', { name: 'EOA address' }), createHexAddress('2'));
    await user.click(screen.getByRole('button', { name: 'Create SIWE challenge' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Challenge created. Sign the message with the arbitrator wallet, then paste the signature.',
        ),
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByRole('textbox', { name: 'Wallet signature' }),
      '0xoperator-signature',
    );
    await user.click(screen.getByRole('button', { name: 'Verify linked wallet' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Wallet linked. Arbitrator authority is now available for dispute resolution.',
        ),
      ).toBeInTheDocument();
    });

    expect(mockedAdminApi.createWalletChallenge).toHaveBeenCalledWith(
      {
        address: createHexAddress('2'),
        walletKind: 'eoa',
        chainId: 84532,
        label: undefined,
      },
      'admin-access-token-123',
    );
    expect(mockedAdminApi.verifyWalletChallenge).toHaveBeenCalledWith(
      {
        challengeId: 'operator-challenge-123',
        message: 'Sign this challenge to link the arbitrator wallet.',
        signature: '0xoperator-signature',
      },
      'admin-access-token-123',
    );
  });

  it('loads escrow operations health when the authenticated operator controls the arbitrator wallet', async () => {
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockedAdminApi.me.mockResolvedValue(
      createUserProfile([createEoaWallet(createHexAddress('2'))]),
    );
    mockedAdminApi.getEscrowHealth.mockResolvedValue(createEscrowHealthReport());

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Loaded 1 jobs for all attention.')).toBeInTheDocument();
    });

    expect(mockedAdminApi.getEscrowHealth).toHaveBeenCalledWith('admin-access-token-123', {
      reason: undefined,
    });
    expect(screen.getByText('Operator backlog')).toBeInTheDocument();
    expect(screen.getByText('Open dispute')).toBeInTheDocument();
  });

  it('shows finalized chain ingestion posture and audit authority provenance to the operator', async () => {
    const user = userEvent.setup();
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockedAdminApi.me.mockResolvedValue(
      createUserProfile([createEoaWallet(createHexAddress('2'))]),
    );
    mockedAdminApi.getAudit.mockResolvedValue(
      createAuditBundle(),
    );

    renderHome();

    await waitFor(() => {
      expect(
        screen.getByText('Loaded finalized ingestion status: healthy.'),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Status: Healthy · authority reads No · Escrow chain ingestion is healthy\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Projections: 3 healthy · 0 degraded · 0 stale · 3\/4 projected\./),
    ).toBeInTheDocument();
    expect(mockedAdminApi.getEscrowChainIngestionStatus).toHaveBeenCalledWith(
      'admin-access-token-123',
    );

    await user.type(screen.getByPlaceholderText('Paste a job UUID'), 'job-123');
    await user.click(screen.getByRole('button', { name: 'Load public bundle' }));

    await waitFor(() => {
      expect(screen.getByText('Audit source: Chain projection')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Authority reads Yes · projection available Yes · fresh Yes · healthy Yes\./),
    ).toBeInTheDocument();
  });

  it('keeps privileged operator workflows blocked when the session does not control the arbitrator wallet', async () => {
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockedAdminApi.me.mockResolvedValue(
      createUserProfile([createEoaWallet(createHexAddress('3'))]),
    );

    renderHome();

    await waitFor(() => {
      expect(
        screen.getByText('Link the configured arbitrator wallet to unlock operations health'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Operator resolution remains blocked until the configured arbitrator wallet is linked.',
        ),
      ).toBeInTheDocument();
    });

    expect(mockedAdminApi.getEscrowHealth).not.toHaveBeenCalled();
    expect(mockedAdminApi.getEscrowChainSyncDaemonHealth).not.toHaveBeenCalled();
  });

  it('imports a job-history export and previews replay reconciliation against local state', async () => {
    const user = userEvent.setup();
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockedAdminApi.me.mockResolvedValue(
      createUserProfile([createEoaWallet(createHexAddress('2'))]),
    );
    mockedAdminApi.getEscrowHealth.mockResolvedValue(createEscrowHealthReport());
    mockedAdminApi.importJobHistoryReconciliation.mockResolvedValue({
      importedAt: '2026-04-07T00:00:00.000Z',
      document: {
        schemaVersion: 1,
        artifact: 'job-history',
        exportedAt: '2026-04-07T00:00:00.000Z',
        jobId: 'job-import-1',
        title: 'Imported drift case',
      },
      normalization: {
        auditEvents: 4,
        confirmedExecutions: 3,
        failedExecutions: 1,
        auditWasReordered: true,
        executionWasReordered: false,
      },
      importedReconciliation: {
        issueCount: 1,
        highestSeverity: 'critical',
        sourceCounts: {
          auditEvents: 4,
          confirmedExecutions: 3,
          failedExecutions: 1,
        },
        projection: {
          aggregateStatus: 'funded',
          projectedStatus: 'in_progress',
          aggregateFundedAmount: '100',
          projectedFundedAmount: '100',
          mismatchedMilestones: [
            {
              index: 0,
              aggregateStatus: 'pending',
              projectedStatus: 'delivered',
              lastAuditType: 'milestone.delivered',
              lastAuditAt: 600,
            },
          ],
        },
        issues: [
          {
            code: 'milestone_state_mismatch',
            severity: 'critical',
            summary: 'Milestone replay diverges from aggregate state on 1 milestone.',
            detail: 'Mismatched milestones: 1(pending -> delivered).',
          },
        ],
      },
      localComparison: {
        localJobFound: true,
        aggregateMatches: false,
        timelineDigestMatches: false,
        localStatus: 'funded',
        importedStatus: 'funded',
        localFundedAmount: '100',
        importedFundedAmount: '100',
        localMilestoneCount: 1,
        importedMilestoneCount: 1,
        mismatchedMilestones: [
          {
            index: 0,
            localStatus: 'pending',
            importedStatus: 'delivered',
          },
        ],
      },
    });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Operator backlog')).toBeInTheDocument();
    });

    await user.click(
      screen.getByPlaceholderText(
        'Paste a job-history JSON export to preview replay-backed reconciliation.',
      ),
    );
    await user.paste('{"artifact":"job-history"}');
    await user.click(screen.getByRole('button', { name: 'Preview job-history import' }));

    await waitFor(() => {
      expect(
        screen.getByText('Imported job-history preview for job-import-1.'),
      ).toBeInTheDocument();
    });

    expect(mockedAdminApi.importJobHistoryReconciliation).toHaveBeenCalledWith(
      '{"artifact":"job-history"}',
      'admin-access-token-123',
    );
    expect(
      screen.getByText(
        /Normalization: 4 audit events · 3 confirmed executions · 1 failed executions · audit reordered Yes · executions reordered No/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Local comparison: status funded -> funded · funded 100 -> 100 · aggregate match No · timeline digest match No/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Imported milestone 1: local pending -> imported delivered/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Imported replay drift: 1 issue · severity Critical/),
    ).toBeInTheDocument();
  });

  it('previews chain-derived audit sync and surfaces persistence posture', async () => {
    const user = userEvent.setup();
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockedAdminApi.me.mockResolvedValue(
      createUserProfile([createEoaWallet(createHexAddress('2'))]),
    );
    mockedAdminApi.getEscrowHealth.mockResolvedValue(createEscrowHealthReport());
    mockedAdminApi.syncEscrowChainAudit.mockResolvedValue({
      syncedAt: '2026-04-08T00:00:00.000Z',
      mode: 'preview',
      job: {
        jobId: 'job-chain-1',
        title: 'Chain repair case',
        chainId: 84532,
        contractAddress: '0xcontract',
        escrowId: '1',
      },
      range: {
        fromBlock: 120,
        toBlock: 140,
        latestBlock: 160,
        lookbackBlocks: 20,
      },
      normalization: {
        fetchedLogs: 5,
        duplicateLogs: 1,
        uniqueLogs: 4,
        auditEvents: 4,
        auditChanged: true,
      },
      issues: [
        {
          code: 'unsupported_partial_resolution',
          severity: 'critical',
          summary:
            'The onchain dispute resolution uses a partial client split that the persisted audit model cannot represent.',
          detail: null,
          blockNumber: 140,
          txHash: '0xpartial',
        },
      ],
      chainReconciliation: null,
      localComparison: {
        aggregateMatches: true,
        auditDigestMatches: false,
        localStatus: 'disputed',
        chainDerivedStatus: 'disputed',
        localFundedAmount: '100',
        chainDerivedFundedAmount: '100',
        localAuditEvents: 3,
        chainAuditEvents: 4,
        mismatchedMilestones: [],
      },
      persistence: {
        requested: true,
        applied: false,
        blocked: true,
        blockedReason:
          'Critical ingestion issues must be resolved before persisting chain-derived audit state.',
      },
    });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Operator backlog')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Paste a persisted job UUID'), 'job-chain-1');
    await user.type(screen.getByPlaceholderText('Optional lower bound'), '120');
    await user.type(screen.getByPlaceholderText('Optional upper bound'), '140');
    await user.click(screen.getByRole('button', { name: 'Persist chain audit' }));

    await waitFor(() => {
      expect(
        screen.getByText('Chain audit sync for job-chain-1 found blocking issues.'),
      ).toBeInTheDocument();
    });

    expect(mockedAdminApi.syncEscrowChainAudit).toHaveBeenCalledWith(
      {
        jobId: 'job-chain-1',
        fromBlock: 120,
        toBlock: 140,
        persist: true,
      },
      'admin-access-token-123',
    );
    expect(
      screen.getByText(
        /Normalization: 5 fetched logs · 1 duplicates ignored · 4 unique logs · 4 derived audit events · audit changed Yes/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Persistence requested: applied No · blocked Yes · Critical ingestion issues must be resolved before persisting chain-derived audit state\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Critical: The onchain dispute resolution uses a partial client split that the persisted audit model cannot represent\./,
      ),
    ).toBeInTheDocument();
  });

  it('runs batch chain-audit sync and surfaces partial-failure summary', async () => {
    const user = userEvent.setup();
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockedAdminApi.me.mockResolvedValue(
      createUserProfile([createEoaWallet(createHexAddress('2'))]),
    );
    mockedAdminApi.getEscrowHealth.mockResolvedValue(createEscrowHealthReport());
    mockedAdminApi.syncEscrowChainAuditBatch.mockResolvedValue({
      startedAt: '2026-04-08T00:00:00.000Z',
      completedAt: '2026-04-08T00:00:05.000Z',
      mode: 'persisted',
      filters: {
        scope: 'attention',
        reason: 'open_dispute',
        limit: 10,
      },
      selection: {
        totalJobs: 3,
        matchedJobs: 2,
        selectedJobs: 2,
      },
      summary: {
        processedJobs: 1,
        cleanJobs: 0,
        changedJobs: 1,
        persistedJobs: 1,
        blockedJobs: 0,
        failedJobs: 1,
        criticalIssueJobs: 0,
      },
      jobs: [
        {
          jobId: 'job-batch-1',
          title: 'Batch repaired dispute',
          outcome: 'persisted',
          changed: true,
          persisted: true,
          blocked: false,
          issueCount: 0,
          criticalIssueCount: 0,
          reconciliationIssueCount: 0,
          errorMessage: null,
          sync: null,
        },
        {
          jobId: 'job-batch-2',
          title: 'Batch failed dispute',
          outcome: 'failed',
          changed: false,
          persisted: false,
          blocked: false,
          issueCount: 0,
          criticalIssueCount: 0,
          reconciliationIssueCount: 0,
          errorMessage: 'RPC request timed out',
          sync: null,
        },
      ],
    });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Operator backlog')).toBeInTheDocument();
    });

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Reason filter' }),
      'open_dispute',
    );
    await user.click(screen.getByRole('button', { name: 'Persist batch chain sync' }));

    await waitFor(() => {
      expect(
        screen.getByText('Batch chain sync completed with 1 failed jobs.'),
      ).toBeInTheDocument();
    });

    expect(mockedAdminApi.syncEscrowChainAuditBatch).toHaveBeenCalledWith(
      {
        scope: 'attention',
        reason: 'open_dispute',
        limit: 10,
        persist: true,
      },
      'admin-access-token-123',
    );
    expect(screen.getByText(/Selection: 2 selected \/ 2 matched \/ 3 total\./)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Summary: 1 processed · 0 clean · 1 changed · 1 persisted · 0 blocked · 1 failed · 0 with critical issues\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Batch repaired dispute \(job-batch-1\): Persisted · issues 0 · critical 0/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Batch failed dispute \(job-batch-2\): Failed · issues 0 · critical 0 · RPC request timed out/,
      ),
    ).toBeInTheDocument();
  });

  it('shows recurring chain-sync daemon status and recent run history', async () => {
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockedAdminApi.me.mockResolvedValue(
      createUserProfile([createEoaWallet(createHexAddress('2'))]),
    );
    mockedAdminApi.getEscrowHealth.mockResolvedValue(createEscrowHealthReport());
    mockedAdminApi.getEscrowChainSyncDaemonHealth.mockResolvedValue({
      generatedAt: '2026-04-08T00:00:31.000Z',
      ok: true,
      status: 'ok',
      required: true,
      summary: 'Recurring chain-sync daemon is healthy.',
      thresholds: {
        maxHeartbeatAgeMs: 900000,
        maxCurrentRunAgeMs: 1800000,
        maxConsecutiveFailures: 3,
        maxConsecutiveSkips: 6,
      },
      issues: [],
      daemon: {
        updatedAt: '2026-04-08T00:00:30.000Z',
        worker: {
          workerId: 'host-a:1234',
          hostname: 'host-a',
          pid: 1234,
          state: 'idle',
          intervalMs: 300000,
          runOnStart: true,
          overrideLimit: null,
          overridePersist: true,
          startedAt: '2026-04-08T00:00:00.000Z',
          stoppedAt: null,
        },
        heartbeat: {
          lastHeartbeatAt: '2026-04-08T00:00:30.000Z',
          lastRunStartedAt: '2026-04-08T00:00:20.000Z',
          lastRunCompletedAt: '2026-04-08T00:00:30.000Z',
          lastRunOutcome: 'completed',
          consecutiveFailures: 0,
          consecutiveSkips: 1,
          lastErrorMessage: null,
        },
        currentRun: null,
        lastRun: {
          startedAt: '2026-04-08T00:00:20.000Z',
          completedAt: '2026-04-08T00:00:30.000Z',
          durationMs: 10000,
          outcome: 'completed',
          workerId: 'host-a:1234',
          lockProvider: 'postgres_advisory',
          mode: 'persisted',
          filters: {
            scope: 'all',
            reason: null,
            limit: 25,
          },
          selection: {
            totalJobs: 3,
            matchedJobs: 3,
            selectedJobs: 3,
          },
          summary: {
            processedJobs: 3,
            cleanJobs: 1,
            changedJobs: 2,
            persistedJobs: 2,
            blockedJobs: 0,
            failedJobs: 0,
            criticalIssueJobs: 0,
          },
          errorMessage: null,
          skipReason: null,
        },
        recentRuns: [
          {
            startedAt: '2026-04-08T00:00:20.000Z',
            completedAt: '2026-04-08T00:00:30.000Z',
            durationMs: 10000,
            outcome: 'completed',
            workerId: 'host-a:1234',
            lockProvider: 'postgres_advisory',
            mode: 'persisted',
            filters: {
              scope: 'all',
              reason: null,
              limit: 25,
            },
            selection: {
              totalJobs: 3,
              matchedJobs: 3,
              selectedJobs: 3,
            },
            summary: {
              processedJobs: 3,
              cleanJobs: 1,
              changedJobs: 2,
              persistedJobs: 2,
              blockedJobs: 0,
              failedJobs: 0,
              criticalIssueJobs: 0,
            },
            errorMessage: null,
            skipReason: null,
          },
          {
            startedAt: '2026-04-08T00:00:10.000Z',
            completedAt: '2026-04-08T00:00:10.100Z',
            durationMs: 100,
            outcome: 'skipped',
            workerId: 'host-b:4567',
            lockProvider: 'postgres_advisory',
            mode: null,
            filters: null,
            selection: null,
            summary: null,
            errorMessage: null,
            skipReason: 'lock_unavailable',
          },
        ],
      },
    });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Recurring chain-sync daemon')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Worker: host-a:1234/)).toBeInTheDocument();
      expect(screen.getByText(/interval 300s/)).toBeInTheDocument();
      expect(screen.getByText(/run on start Yes\./)).toBeInTheDocument();
      expect(screen.getByText(/Heartbeat:/)).toBeInTheDocument();
      expect(screen.getByText(/last outcome Completed/)).toBeInTheDocument();
      expect(screen.getByText(/consecutive failures 0/)).toBeInTheDocument();
      expect(screen.getByText(/consecutive skips 1\./)).toBeInTheDocument();
      expect(screen.getByText(/Last run: Completed/)).toBeInTheDocument();
      expect(screen.getByText(/lock Postgres advisory lock\./)).toBeInTheDocument();
      expect(screen.getByText(/Completed · .* · 10000ms · host-a:1234 · processed 3/)).toBeInTheDocument();
      expect(screen.getByText(/Skipped · .* · 100ms · host-b:4567 · lock_unavailable/)).toBeInTheDocument();
    });
  });

  it('renders reconciliation drift findings and filters that backlog reason explicitly', async () => {
    const user = userEvent.setup();
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockedAdminApi.me.mockResolvedValue(
      createUserProfile([createEoaWallet(createHexAddress('2'))]),
    );
    mockedAdminApi.getEscrowHealth
      .mockResolvedValueOnce(
        createEscrowHealthReport({
          summary: {
            totalJobs: 2,
            jobsNeedingAttention: 1,
            matchedJobs: 1,
            openDisputeJobs: 0,
            reconciliationDriftJobs: 1,
            failedExecutionJobs: 0,
            staleJobs: 0,
          },
          jobs: [
            {
              ...createEscrowHealthReport().jobs[0],
              jobId: 'job-drift-1',
              title: 'State drift case',
              status: 'funded',
              reasons: ['reconciliation_drift'],
              counts: {
                openDisputes: 0,
                failedExecutions: 0,
              },
              latestFailedExecution: null,
              failedExecutionDiagnostics: null,
              failureGuidance: null,
              reconciliation: {
                issueCount: 2,
                highestSeverity: 'critical',
                sourceCounts: {
                  auditEvents: 3,
                  confirmedExecutions: 2,
                  failedExecutions: 0,
                },
                projection: {
                  aggregateStatus: 'funded',
                  projectedStatus: 'draft',
                  aggregateFundedAmount: null,
                  projectedFundedAmount: '100',
                  mismatchedMilestones: [],
                },
                issues: [
                  {
                    code: 'funding_state_mismatch',
                    severity: 'critical',
                    summary:
                      'Funding was confirmed in the timeline but the aggregate funded amount is empty.',
                    detail:
                      'Reconciliation found 1 confirmed funding execution and a job.funded audit event while fundedAmount is null.',
                  },
                  {
                    code: 'job_status_mismatch',
                    severity: 'critical',
                    summary:
                      'Job status is funded but the persisted milestone state implies draft.',
                    detail:
                      'The aggregate status no longer matches the state derived from milestone outcomes and funding posture.',
                  },
                ],
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createEscrowHealthReport({
          filters: {
            reason: 'reconciliation_drift',
            limit: 25,
          },
          summary: {
            totalJobs: 2,
            jobsNeedingAttention: 1,
            matchedJobs: 1,
            openDisputeJobs: 0,
            reconciliationDriftJobs: 1,
            failedExecutionJobs: 0,
            staleJobs: 0,
          },
          jobs: [
            {
              ...createEscrowHealthReport().jobs[0],
              jobId: 'job-drift-1',
              title: 'State drift case',
              status: 'funded',
              reasons: ['reconciliation_drift'],
              counts: {
                openDisputes: 0,
                failedExecutions: 0,
              },
              latestFailedExecution: null,
              failedExecutionDiagnostics: null,
              failureGuidance: null,
              reconciliation: {
                issueCount: 2,
                highestSeverity: 'critical',
                sourceCounts: {
                  auditEvents: 3,
                  confirmedExecutions: 2,
                  failedExecutions: 0,
                },
                projection: {
                  aggregateStatus: 'funded',
                  projectedStatus: 'draft',
                  aggregateFundedAmount: null,
                  projectedFundedAmount: '100',
                  mismatchedMilestones: [],
                },
                issues: [
                  {
                    code: 'funding_state_mismatch',
                    severity: 'critical',
                    summary:
                      'Funding was confirmed in the timeline but the aggregate funded amount is empty.',
                    detail:
                      'Reconciliation found 1 confirmed funding execution and a job.funded audit event while fundedAmount is null.',
                  },
                  {
                    code: 'job_status_mismatch',
                    severity: 'critical',
                    summary:
                      'Job status is funded but the persisted milestone state implies draft.',
                    detail:
                      'The aggregate status no longer matches the state derived from milestone outcomes and funding posture.',
                  },
                ],
              },
            },
          ],
        }),
      );

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('State drift case')).toBeInTheDocument();
    });

    expect(screen.getByText(/Highest severity: Critical/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Timeline sources: 3 audit events · 2 confirmed executions · 0 failed executions/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Replay: status funded -> draft · funded null -> 100/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Funding was confirmed in the timeline but the aggregate funded amount is empty/,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reconciliation drift' }));

    await waitFor(() => {
      expect(screen.getByText('Loaded 1 jobs for reconciliation drift.')).toBeInTheDocument();
    });

    expect(mockedAdminApi.getEscrowHealth).toHaveBeenNthCalledWith(2, 'admin-access-token-123', {
      reason: 'reconciliation_drift',
    });
  });

  it('filters escrow operations health by reason and opens a selected case directly', async () => {
    const user = userEvent.setup();
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockedAdminApi.me.mockResolvedValue(
      createUserProfile([createEoaWallet(createHexAddress('2'))]),
    );
    mockedAdminApi.getEscrowHealth
      .mockResolvedValueOnce(
        createEscrowHealthReport({
          summary: {
            totalJobs: 5,
            jobsNeedingAttention: 2,
            matchedJobs: 2,
            openDisputeJobs: 1,
            reconciliationDriftJobs: 0,
            failedExecutionJobs: 1,
            staleJobs: 0,
          },
          jobs: [
            createEscrowHealthReport().jobs[0],
            {
              ...createEscrowHealthReport().jobs[0],
              jobId: 'job-failure-1',
              title: 'Failed relay job',
              status: 'funded',
              reasons: ['failed_execution'],
              counts: {
                openDisputes: 0,
                failedExecutions: 1,
              },
              executionFailureWorkflow: null,
              latestFailedExecution: {
                action: 'fund_job',
                submittedAt: 600,
                txHash: null,
                failureCode: 'relay_rejected',
                failureMessage: 'Rejected',
                milestoneIndex: null,
              },
              failedExecutionDiagnostics: {
                firstFailureAt: 550,
                latestFailureAt: 620,
                actionBreakdown: [
                  {
                    action: 'fund_job',
                    count: 2,
                  },
                  {
                    action: 'set_milestones',
                    count: 1,
                  },
                ],
                failureCodeBreakdown: [
                  {
                    failureCode: 'relay_rejected',
                    count: 2,
                    latestMessage: 'Rejected',
                  },
                  {
                    failureCode: null,
                    count: 1,
                    latestMessage: 'Provider timeout',
                  },
                ],
                recentFailures: [
                  {
                    action: 'set_milestones',
                    submittedAt: 620,
                    txHash: null,
                    failureCode: null,
                    failureMessage: 'Provider timeout',
                    milestoneIndex: null,
                  },
                  {
                    action: 'fund_job',
                    submittedAt: 600,
                    txHash: null,
                    failureCode: 'relay_rejected',
                    failureMessage: 'Rejected',
                    milestoneIndex: null,
                  },
                  {
                    action: 'fund_job',
                    submittedAt: 550,
                    txHash: '0xfail',
                    failureCode: 'relay_rejected',
                    failureMessage: 'Initial rejection',
                    milestoneIndex: null,
                  },
                ],
              },
              failureGuidance: {
                severity: 'critical',
                responsibleSurface: 'rpc_or_provider',
                retryPosture: 'safe_after_review',
                summary: 'Network or provider instability interrupted execution.',
                recommendedActions: [
                  'Check RPC and upstream provider health before retrying.',
                  'Confirm the last known job state is unchanged.',
                  'Retry after provider health stabilizes and monitoring is in place.',
                ],
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createEscrowHealthReport({
          filters: {
            reason: 'failed_execution',
            limit: 25,
          },
          summary: {
            totalJobs: 5,
            jobsNeedingAttention: 2,
            matchedJobs: 1,
            openDisputeJobs: 0,
            reconciliationDriftJobs: 0,
            failedExecutionJobs: 1,
            staleJobs: 0,
          },
          jobs: [
            {
              ...createEscrowHealthReport().jobs[0],
              jobId: 'job-failure-1',
              title: 'Failed relay job',
              status: 'funded',
              reasons: ['failed_execution'],
              counts: {
                openDisputes: 0,
                failedExecutions: 1,
              },
              executionFailureWorkflow: null,
              latestFailedExecution: {
                action: 'fund_job',
                submittedAt: 600,
                txHash: null,
                failureCode: 'relay_rejected',
                failureMessage: 'Rejected',
                milestoneIndex: null,
              },
              failedExecutionDiagnostics: {
                firstFailureAt: 550,
                latestFailureAt: 620,
                actionBreakdown: [
                  {
                    action: 'fund_job',
                    count: 2,
                  },
                  {
                    action: 'set_milestones',
                    count: 1,
                  },
                ],
                failureCodeBreakdown: [
                  {
                    failureCode: 'relay_rejected',
                    count: 2,
                    latestMessage: 'Rejected',
                  },
                  {
                    failureCode: null,
                    count: 1,
                    latestMessage: 'Provider timeout',
                  },
                ],
                recentFailures: [
                  {
                    action: 'set_milestones',
                    submittedAt: 620,
                    txHash: null,
                    failureCode: null,
                    failureMessage: 'Provider timeout',
                    milestoneIndex: null,
                  },
                  {
                    action: 'fund_job',
                    submittedAt: 600,
                    txHash: null,
                    failureCode: 'relay_rejected',
                    failureMessage: 'Rejected',
                    milestoneIndex: null,
                  },
                  {
                    action: 'fund_job',
                    submittedAt: 550,
                    txHash: '0xfail',
                    failureCode: 'relay_rejected',
                    failureMessage: 'Initial rejection',
                    milestoneIndex: null,
                  },
                ],
              },
              failureGuidance: {
                severity: 'critical',
                responsibleSurface: 'rpc_or_provider',
                retryPosture: 'safe_after_review',
                summary: 'Network or provider instability interrupted execution.',
                recommendedActions: [
                  'Check RPC and upstream provider health before retrying.',
                  'Confirm the last known job state is unchanged.',
                  'Retry after provider health stabilizes and monitoring is in place.',
                ],
              },
            },
          ],
        }),
      );
    mockedAdminApi.getAudit.mockResolvedValue(createAuditBundle());

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Operator backlog')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Failed executions' }));

    await waitFor(() => {
      expect(screen.getByText('Loaded 1 jobs for failed executions.')).toBeInTheDocument();
    });

    expect(screen.getByText('Actions: fund_job x2, set_milestones x1')).toBeInTheDocument();
    expect(screen.getByText('Codes: relay_rejected x2, unknown x1')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Surface: RPC or provider · Retry posture: Safe after review · Severity: critical',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Provider timeout/)).toBeInTheDocument();

    expect(mockedAdminApi.getEscrowHealth).toHaveBeenNthCalledWith(2, 'admin-access-token-123', {
      reason: 'failed_execution',
    });

    await user.click(screen.getByRole('button', { name: 'Open case job-failure-1' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Disputed implementation' })).toBeInTheDocument();
    });

    expect(mockedAdminApi.getAudit).toHaveBeenCalledWith('job-failure-1');
  });

  it('lets the current operator claim and release a stale job workflow', async () => {
    const user = userEvent.setup();
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockedAdminApi.me.mockResolvedValue(
      createUserProfile([createEoaWallet(createHexAddress('2'))]),
    );
    mockedAdminApi.getEscrowHealth
      .mockResolvedValueOnce(
        createEscrowHealthReport({
          filters: {
            reason: null,
            limit: 25,
          },
          summary: {
            totalJobs: 3,
            jobsNeedingAttention: 1,
            matchedJobs: 1,
            openDisputeJobs: 0,
            reconciliationDriftJobs: 0,
            failedExecutionJobs: 0,
            staleJobs: 1,
          },
          jobs: [
            {
              ...createEscrowHealthReport().jobs[0],
              jobId: 'job-stale-1',
              title: 'Stale operator review',
              status: 'funded',
              reasons: ['stale_job'],
              counts: {
                openDisputes: 0,
                failedExecutions: 0,
              },
              staleForMs: 86_400_000,
              staleWorkflow: null,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createEscrowHealthReport({
          filters: {
            reason: null,
            limit: 25,
          },
          summary: {
            totalJobs: 3,
            jobsNeedingAttention: 1,
            matchedJobs: 1,
            openDisputeJobs: 0,
            reconciliationDriftJobs: 0,
            failedExecutionJobs: 0,
            staleJobs: 1,
          },
          jobs: [
            {
              ...createEscrowHealthReport().jobs[0],
              jobId: 'job-stale-1',
              title: 'Stale operator review',
              status: 'funded',
              reasons: ['stale_job'],
              counts: {
                openDisputes: 0,
                failedExecutions: 0,
              },
              staleForMs: 86_400_000,
              staleWorkflow: {
                claimedByUserId: 'operator-user-1',
                claimedByEmail: 'operator@example.com',
                claimedAt: 500,
                updatedAt: 510,
                note: 'Waiting on worker response.',
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createEscrowHealthReport({
          filters: {
            reason: null,
            limit: 25,
          },
          summary: {
            totalJobs: 3,
            jobsNeedingAttention: 1,
            matchedJobs: 1,
            openDisputeJobs: 0,
            reconciliationDriftJobs: 0,
            failedExecutionJobs: 0,
            staleJobs: 1,
          },
          jobs: [
            {
              ...createEscrowHealthReport().jobs[0],
              jobId: 'job-stale-1',
              title: 'Stale operator review',
              status: 'funded',
              reasons: ['stale_job'],
              counts: {
                openDisputes: 0,
                failedExecutions: 0,
              },
              staleForMs: 86_400_000,
              staleWorkflow: null,
            },
          ],
        }),
      );
    mockedAdminApi.claimStaleJob.mockResolvedValue({
      job: {
        ...createEscrowHealthReport().jobs[0],
        jobId: 'job-stale-1',
      },
    });
    mockedAdminApi.releaseStaleJob.mockResolvedValue({
      job: {
        ...createEscrowHealthReport().jobs[0],
        jobId: 'job-stale-1',
      },
    });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Stale operator review')).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText(
        'Document why the job is stale, what is blocked, and what you will do next.',
      ),
      'Waiting on worker response.',
    );
    await user.click(screen.getByRole('button', { name: 'Claim stale job' }));

    await waitFor(() => {
      expect(screen.getByText('Loaded 1 jobs for all attention.')).toBeInTheDocument();
    });

    expect(mockedAdminApi.claimStaleJob).toHaveBeenCalledWith(
      'job-stale-1',
      {
        note: 'Waiting on worker response.',
      },
      'admin-access-token-123',
    );
    expect(screen.getByText('Claimed by operator@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Release stale claim' }));

    await waitFor(() => {
      expect(mockedAdminApi.releaseStaleJob).toHaveBeenCalledWith(
        'job-stale-1',
        'admin-access-token-123',
      );
    });
  });

  it('lets the current operator claim, acknowledge, and release an execution-failure workflow', async () => {
    const user = userEvent.setup();
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockedAdminApi.me.mockResolvedValue(
      createUserProfile([createEoaWallet(createHexAddress('2'))]),
    );
    mockedAdminApi.getEscrowHealth
      .mockResolvedValueOnce(
        createEscrowHealthReport({
          summary: {
            totalJobs: 2,
            jobsNeedingAttention: 1,
            matchedJobs: 1,
            openDisputeJobs: 0,
            reconciliationDriftJobs: 0,
            failedExecutionJobs: 1,
            staleJobs: 0,
          },
          jobs: [
            {
              ...createEscrowHealthReport().jobs[0],
              jobId: 'job-failure-ops-1',
              title: 'Failure remediation target',
              status: 'funded',
              reasons: ['failed_execution'],
              counts: {
                openDisputes: 0,
                failedExecutions: 2,
              },
              executionFailureWorkflow: null,
              latestFailedExecution: {
                action: 'fund_job',
                submittedAt: 600,
                txHash: null,
                failureCode: 'relay_rejected',
                failureMessage: 'Rejected',
                milestoneIndex: null,
              },
              failedExecutionDiagnostics: {
                firstFailureAt: 550,
                latestFailureAt: 600,
                actionBreakdown: [
                  {
                    action: 'fund_job',
                    count: 2,
                  },
                ],
                failureCodeBreakdown: [
                  {
                    failureCode: 'relay_rejected',
                    count: 2,
                    latestMessage: 'Rejected',
                  },
                ],
                recentFailures: [
                  {
                    action: 'fund_job',
                    submittedAt: 600,
                    txHash: null,
                    failureCode: 'relay_rejected',
                    failureMessage: 'Rejected',
                    milestoneIndex: null,
                  },
                  {
                    action: 'fund_job',
                    submittedAt: 550,
                    txHash: '0xfail',
                    failureCode: 'relay_rejected',
                    failureMessage: 'Initial rejection',
                    milestoneIndex: null,
                  },
                ],
              },
              failureGuidance: {
                severity: 'warning',
                responsibleSurface: 'wallet_relay',
                retryPosture: 'wait_for_external_fix',
                summary: 'The relay path is rejecting or dropping the execution request.',
                recommendedActions: [
                  'Inspect relay request logs and provider-side rejection details.',
                  'Confirm the payload still matches current on-chain job state.',
                  'Retry only after the relay issue or rejection reason is understood.',
                ],
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createEscrowHealthReport({
          summary: {
            totalJobs: 2,
            jobsNeedingAttention: 1,
            matchedJobs: 1,
            openDisputeJobs: 0,
            reconciliationDriftJobs: 0,
            failedExecutionJobs: 1,
            staleJobs: 0,
          },
          jobs: [
            {
              ...createEscrowHealthReport().jobs[0],
              jobId: 'job-failure-ops-1',
              title: 'Failure remediation target',
              status: 'funded',
              reasons: ['failed_execution'],
              counts: {
                openDisputes: 0,
                failedExecutions: 2,
              },
              executionFailureWorkflow: {
                claimedByUserId: 'operator-user-1',
                claimedByEmail: 'operator@example.com',
                claimedAt: 500,
                status: 'investigating',
                acknowledgedFailureAt: null,
                note: 'Investigating relay posture.',
                updatedAt: 510,
                latestFailureNeedsAcknowledgement: true,
              },
              latestFailedExecution: {
                action: 'fund_job',
                submittedAt: 600,
                txHash: null,
                failureCode: 'relay_rejected',
                failureMessage: 'Rejected',
                milestoneIndex: null,
              },
              failedExecutionDiagnostics: {
                firstFailureAt: 550,
                latestFailureAt: 600,
                actionBreakdown: [
                  {
                    action: 'fund_job',
                    count: 2,
                  },
                ],
                failureCodeBreakdown: [
                  {
                    failureCode: 'relay_rejected',
                    count: 2,
                    latestMessage: 'Rejected',
                  },
                ],
                recentFailures: [
                  {
                    action: 'fund_job',
                    submittedAt: 600,
                    txHash: null,
                    failureCode: 'relay_rejected',
                    failureMessage: 'Rejected',
                    milestoneIndex: null,
                  },
                  {
                    action: 'fund_job',
                    submittedAt: 550,
                    txHash: '0xfail',
                    failureCode: 'relay_rejected',
                    failureMessage: 'Initial rejection',
                    milestoneIndex: null,
                  },
                ],
              },
              failureGuidance: {
                severity: 'warning',
                responsibleSurface: 'wallet_relay',
                retryPosture: 'wait_for_external_fix',
                summary: 'The relay path is rejecting or dropping the execution request.',
                recommendedActions: [
                  'Inspect relay request logs and provider-side rejection details.',
                  'Confirm the payload still matches current on-chain job state.',
                  'Retry only after the relay issue or rejection reason is understood.',
                ],
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createEscrowHealthReport({
          summary: {
            totalJobs: 2,
            jobsNeedingAttention: 1,
            matchedJobs: 1,
            openDisputeJobs: 0,
            reconciliationDriftJobs: 0,
            failedExecutionJobs: 1,
            staleJobs: 0,
          },
          jobs: [
            {
              ...createEscrowHealthReport().jobs[0],
              jobId: 'job-failure-ops-1',
              title: 'Failure remediation target',
              status: 'funded',
              reasons: ['failed_execution'],
              counts: {
                openDisputes: 0,
                failedExecutions: 2,
              },
              executionFailureWorkflow: {
                claimedByUserId: 'operator-user-1',
                claimedByEmail: 'operator@example.com',
                claimedAt: 500,
                status: 'ready_to_retry',
                acknowledgedFailureAt: null,
                note: 'Ready after relay review.',
                updatedAt: 515,
                latestFailureNeedsAcknowledgement: true,
              },
              latestFailedExecution: {
                action: 'fund_job',
                submittedAt: 600,
                txHash: null,
                failureCode: 'relay_rejected',
                failureMessage: 'Rejected',
                milestoneIndex: null,
              },
              failedExecutionDiagnostics: {
                firstFailureAt: 550,
                latestFailureAt: 600,
                actionBreakdown: [
                  {
                    action: 'fund_job',
                    count: 2,
                  },
                ],
                failureCodeBreakdown: [
                  {
                    failureCode: 'relay_rejected',
                    count: 2,
                    latestMessage: 'Rejected',
                  },
                ],
                recentFailures: [
                  {
                    action: 'fund_job',
                    submittedAt: 600,
                    txHash: null,
                    failureCode: 'relay_rejected',
                    failureMessage: 'Rejected',
                    milestoneIndex: null,
                  },
                  {
                    action: 'fund_job',
                    submittedAt: 550,
                    txHash: '0xfail',
                    failureCode: 'relay_rejected',
                    failureMessage: 'Initial rejection',
                    milestoneIndex: null,
                  },
                ],
              },
              failureGuidance: {
                severity: 'warning',
                responsibleSurface: 'wallet_relay',
                retryPosture: 'wait_for_external_fix',
                summary: 'The relay path is rejecting or dropping the execution request.',
                recommendedActions: [
                  'Inspect relay request logs and provider-side rejection details.',
                  'Confirm the payload still matches current on-chain job state.',
                  'Retry only after the relay issue or rejection reason is understood.',
                ],
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createEscrowHealthReport({
          summary: {
            totalJobs: 2,
            jobsNeedingAttention: 1,
            matchedJobs: 1,
            openDisputeJobs: 0,
            reconciliationDriftJobs: 0,
            failedExecutionJobs: 1,
            staleJobs: 0,
          },
          jobs: [
            {
              ...createEscrowHealthReport().jobs[0],
              jobId: 'job-failure-ops-1',
              title: 'Failure remediation target',
              status: 'funded',
              reasons: ['failed_execution'],
              counts: {
                openDisputes: 0,
                failedExecutions: 2,
              },
              executionFailureWorkflow: {
                claimedByUserId: 'operator-user-1',
                claimedByEmail: 'operator@example.com',
                claimedAt: 500,
                status: 'ready_to_retry',
                acknowledgedFailureAt: 600,
                note: 'Acknowledged after relay check.',
                updatedAt: 520,
                latestFailureNeedsAcknowledgement: false,
              },
              latestFailedExecution: {
                action: 'fund_job',
                submittedAt: 600,
                txHash: null,
                failureCode: 'relay_rejected',
                failureMessage: 'Rejected',
                milestoneIndex: null,
              },
              failedExecutionDiagnostics: {
                firstFailureAt: 550,
                latestFailureAt: 600,
                actionBreakdown: [
                  {
                    action: 'fund_job',
                    count: 2,
                  },
                ],
                failureCodeBreakdown: [
                  {
                    failureCode: 'relay_rejected',
                    count: 2,
                    latestMessage: 'Rejected',
                  },
                ],
                recentFailures: [
                  {
                    action: 'fund_job',
                    submittedAt: 600,
                    txHash: null,
                    failureCode: 'relay_rejected',
                    failureMessage: 'Rejected',
                    milestoneIndex: null,
                  },
                  {
                    action: 'fund_job',
                    submittedAt: 550,
                    txHash: '0xfail',
                    failureCode: 'relay_rejected',
                    failureMessage: 'Initial rejection',
                    milestoneIndex: null,
                  },
                ],
              },
              failureGuidance: {
                severity: 'warning',
                responsibleSurface: 'wallet_relay',
                retryPosture: 'wait_for_external_fix',
                summary: 'The relay path is rejecting or dropping the execution request.',
                recommendedActions: [
                  'Inspect relay request logs and provider-side rejection details.',
                  'Confirm the payload still matches current on-chain job state.',
                  'Retry only after the relay issue or rejection reason is understood.',
                ],
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        createEscrowHealthReport({
          summary: {
            totalJobs: 2,
            jobsNeedingAttention: 1,
            matchedJobs: 1,
            openDisputeJobs: 0,
            reconciliationDriftJobs: 0,
            failedExecutionJobs: 1,
            staleJobs: 0,
          },
          jobs: [
            {
              ...createEscrowHealthReport().jobs[0],
              jobId: 'job-failure-ops-1',
              title: 'Failure remediation target',
              status: 'funded',
              reasons: ['failed_execution'],
              counts: {
                openDisputes: 0,
                failedExecutions: 2,
              },
              executionFailureWorkflow: null,
              latestFailedExecution: {
                action: 'fund_job',
                submittedAt: 600,
                txHash: null,
                failureCode: 'relay_rejected',
                failureMessage: 'Rejected',
                milestoneIndex: null,
              },
              failedExecutionDiagnostics: {
                firstFailureAt: 550,
                latestFailureAt: 600,
                actionBreakdown: [
                  {
                    action: 'fund_job',
                    count: 2,
                  },
                ],
                failureCodeBreakdown: [
                  {
                    failureCode: 'relay_rejected',
                    count: 2,
                    latestMessage: 'Rejected',
                  },
                ],
                recentFailures: [
                  {
                    action: 'fund_job',
                    submittedAt: 600,
                    txHash: null,
                    failureCode: 'relay_rejected',
                    failureMessage: 'Rejected',
                    milestoneIndex: null,
                  },
                  {
                    action: 'fund_job',
                    submittedAt: 550,
                    txHash: '0xfail',
                    failureCode: 'relay_rejected',
                    failureMessage: 'Initial rejection',
                    milestoneIndex: null,
                  },
                ],
              },
              failureGuidance: {
                severity: 'warning',
                responsibleSurface: 'wallet_relay',
                retryPosture: 'wait_for_external_fix',
                summary: 'The relay path is rejecting or dropping the execution request.',
                recommendedActions: [
                  'Inspect relay request logs and provider-side rejection details.',
                  'Confirm the payload still matches current on-chain job state.',
                  'Retry only after the relay issue or rejection reason is understood.',
                ],
              },
            },
          ],
        }),
      );
    mockedAdminApi.claimExecutionFailureWorkflow.mockResolvedValue({
      job: {
        ...createEscrowHealthReport().jobs[0],
        jobId: 'job-failure-ops-1',
      },
    });
    mockedAdminApi.acknowledgeExecutionFailures.mockResolvedValue({
      job: {
        ...createEscrowHealthReport().jobs[0],
        jobId: 'job-failure-ops-1',
      },
    });
    mockedAdminApi.updateExecutionFailureWorkflow.mockResolvedValue({
      job: {
        ...createEscrowHealthReport().jobs[0],
        jobId: 'job-failure-ops-1',
      },
    });
    mockedAdminApi.releaseExecutionFailureWorkflow.mockResolvedValue({
      job: {
        ...createEscrowHealthReport().jobs[0],
        jobId: 'job-failure-ops-1',
      },
    });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Failure remediation target')).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText(
        'Document the failure pattern, likely cause, next retry posture, or external dependency blocker.',
      ),
      'Investigating relay posture.',
    );
    await user.click(screen.getByRole('button', { name: 'Claim failure workflow' }));

    await waitFor(() => {
      expect(screen.getByText('Claimed by operator@example.com')).toBeInTheDocument();
    });

    expect(mockedAdminApi.claimExecutionFailureWorkflow).toHaveBeenCalledWith(
      'job-failure-ops-1',
      {
        note: 'Investigating relay posture.',
        status: 'blocked_external',
      },
      'admin-access-token-123',
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Failure workflow status' }),
      'ready_to_retry',
    );
    await user.clear(
      screen.getByPlaceholderText(
        'Document the failure pattern, likely cause, next retry posture, or external dependency blocker.',
      ),
    );
    await user.type(
      screen.getByPlaceholderText(
        'Document the failure pattern, likely cause, next retry posture, or external dependency blocker.',
      ),
      'Ready after relay review.',
    );
    await user.click(screen.getByRole('button', { name: 'Save failure workflow' }));

    await waitFor(() => {
      expect(screen.getByText(/Status: Ready to retry\./)).toBeInTheDocument();
    });

    expect(mockedAdminApi.updateExecutionFailureWorkflow).toHaveBeenCalledWith(
      'job-failure-ops-1',
      {
        note: 'Ready after relay review.',
        status: 'ready_to_retry',
      },
      'admin-access-token-123',
    );

    await user.clear(
      screen.getByPlaceholderText(
        'Document the failure pattern, likely cause, next retry posture, or external dependency blocker.',
      ),
    );
    await user.type(
      screen.getByPlaceholderText(
        'Document the failure pattern, likely cause, next retry posture, or external dependency blocker.',
      ),
      'Acknowledged after relay check.',
    );
    await user.click(screen.getByRole('button', { name: 'Acknowledge latest failures' }));

    await waitFor(() => {
      expect(screen.getByText(/Acknowledged through the latest failure at/)).toBeInTheDocument();
    });

    expect(mockedAdminApi.acknowledgeExecutionFailures).toHaveBeenCalledWith(
      'job-failure-ops-1',
      {
        note: 'Acknowledged after relay check.',
        status: 'ready_to_retry',
      },
      'admin-access-token-123',
    );

    await user.click(screen.getByRole('button', { name: 'Release failure claim' }));

    await waitFor(() => {
      expect(mockedAdminApi.releaseExecutionFailureWorkflow).toHaveBeenCalledWith(
        'job-failure-ops-1',
        'admin-access-token-123',
      );
    });
  });

  it('resolves a disputed milestone when the authenticated operator controls the arbitrator wallet', async () => {
    const user = userEvent.setup();
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockedAdminApi.me.mockResolvedValue(
      createUserProfile([createEoaWallet(createHexAddress('2'))]),
    );
    mockedAdminApi.getAudit
      .mockResolvedValueOnce(createAuditBundle())
      .mockResolvedValueOnce(createResolvedAuditBundle());
    mockedAdminApi.resolveMilestone.mockResolvedValue({
      jobId: 'job-123',
      milestoneIndex: 1,
      milestoneStatus: 'released',
      jobStatus: 'resolved',
      txHash: '0xresolved',
    });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('operator@example.com')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Paste a job UUID'), 'job-123');
    await user.click(screen.getByRole('button', { name: 'Load public bundle' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Disputed implementation' })).toBeInTheDocument();
    });

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Resolution action' }),
      'release',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Resolution note' }),
      'Release after operator review.',
    );
    await user.click(screen.getByRole('button', { name: 'Resolve disputed milestone' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'This public bundle does not currently show any disputed milestones.',
        ),
      ).toBeInTheDocument();
    });

    expect(mockedAdminApi.resolveMilestone).toHaveBeenCalledWith(
      'job-123',
      1,
      {
        action: 'release',
        note: 'Release after operator review.',
      },
      'admin-access-token-123',
    );
  }, 10_000);

  it('downloads operator export artifacts from the loaded public bundle', async () => {
    const user = userEvent.setup();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:case-export'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(() => undefined),
    });
    mockedAdminApi.getAudit.mockResolvedValue(createAuditBundle());
    mockedAdminApi.downloadCaseExport.mockResolvedValue({
      blob: new Blob(['case export'], { type: 'text/csv' }),
      filename: 'escrow-job-123-dispute-case.csv',
      contentType: 'text/csv; charset=utf-8',
    });

    renderHome();

    await user.type(screen.getByPlaceholderText('Paste a job UUID'), 'job-123');
    await user.click(screen.getByRole('button', { name: 'Load public bundle' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Disputed implementation' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Export dispute case CSV' }));

    await waitFor(() => {
      expect(mockedAdminApi.downloadCaseExport).toHaveBeenCalledWith(
        'job-123',
        'dispute-case',
        'csv',
      );
      expect(screen.getByText('Downloaded dispute-case CSV export.')).toBeInTheDocument();
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
