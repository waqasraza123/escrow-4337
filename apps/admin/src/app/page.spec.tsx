import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderApp,
  seedJsonStorage,
} from '@escrow4334/frontend-core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAuditBundle,
  createEoaWallet,
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

const { mockedAdminApi } = vi.hoisted(() => ({
  mockedAdminApi: {
    baseUrl: 'http://localhost:4000',
    getRuntimeProfile: vi.fn(),
    startAuth: vi.fn(),
    verifyAuth: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    getEscrowHealth: vi.fn(),
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

import Home from './page';

describe('admin page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAdminApi.getRuntimeProfile.mockResolvedValue(createRuntimeProfile());
    mockedAdminApi.getEscrowHealth.mockResolvedValue(createEscrowHealthReport());
  });

  it('renders the public-only operator scope shell before any lookup', async () => {
    renderApp(<Home />);

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
    expect(screen.getByText('http://localhost:4000')).toBeInTheDocument();
    expect(screen.getByText('Backend profile validation')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Current origin allowed').length).toBeGreaterThan(0);
      expect(screen.getAllByText('HTTP target').length).toBeGreaterThan(0);
    });
  });

  it('shows truthful runtime diagnostics when the backend profile cannot load', async () => {
    mockedAdminApi.getRuntimeProfile.mockRejectedValue(new Error('Failed to fetch'));

    renderApp(<Home />);

    await waitFor(() => {
      expect(
        screen.getAllByText('Runtime profile unavailable').length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    });
  });

  it('loads an audit bundle and persists recent lookup history', async () => {
    const user = userEvent.setup();
    seedJsonStorage(lookupHistoryStorageKey, ['job-legacy']);
    mockedAdminApi.getAudit.mockResolvedValue(createAuditBundle());

    renderApp(<Home />);

    await user.type(
      screen.getByPlaceholderText('Paste a job UUID'),
      'job-123',
    );
    await user.click(
      screen.getByRole('button', { name: 'Load public bundle' }),
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Disputed implementation' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Reload case' })).toBeInTheDocument();
    expect(screen.getAllByText('critical').length).toBeGreaterThan(0);
    expect(mockedAdminApi.getAudit).toHaveBeenCalledWith('job-123');
    expect(window.localStorage.getItem(lookupHistoryStorageKey)).toBe(
      JSON.stringify(['job-123', 'job-legacy']),
    );
    expect(
      screen.getByRole('button', { name: 'Export job history JSON' }),
    ).toBeInTheDocument();
  });

  it('surfaces a validation error when lookup is submitted without a job id', async () => {
    const user = userEvent.setup();

    renderApp(<Home />);

    await user.click(
      screen.getByRole('button', { name: 'Load public bundle' }),
    );

    expect(
      screen.getByText('Provide a job id before loading the public audit bundle.'),
    ).toBeInTheDocument();
    expect(mockedAdminApi.getAudit).not.toHaveBeenCalled();
  });

  it('shows request failure messaging when audit lookup fails', async () => {
    const user = userEvent.setup();
    mockedAdminApi.getAudit.mockRejectedValue(new Error('Bundle not found'));

    renderApp(<Home />);

    await user.type(
      screen.getByPlaceholderText('Paste a job UUID'),
      'missing-job',
    );
    await user.click(
      screen.getByRole('button', { name: 'Load public bundle' }),
    );

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

    renderApp(<Home />);

    await user.click(screen.getByRole('button', { name: 'job-suggested' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Disputed implementation' }),
      ).toBeInTheDocument();
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

    renderApp(<Home />);

    await user.type(
      screen.getByPlaceholderText('Paste a job UUID'),
      'job-quiet',
    );
    await user.click(
      screen.getByRole('button', { name: 'Load public bundle' }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Healthy implementation' }),
      ).toBeInTheDocument();
    });

    expect(screen.getAllByText('No active disputes').length).toBeGreaterThan(0);
    expect(screen.getByText('No failed executions')).toBeInTheDocument();
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
      .mockResolvedValueOnce(
        createUserProfile([createEoaWallet(createHexAddress('2'))]),
      );
    mockedAdminApi.createWalletChallenge.mockResolvedValue(
      createWalletLinkChallenge(),
    );
    mockedAdminApi.verifyWalletChallenge.mockResolvedValue({
      defaultExecutionWalletAddress: null,
      wallets: [createEoaWallet(createHexAddress('2'))],
    });

    renderApp(<Home />);

    await waitFor(() => {
      expect(screen.getByText('operator@example.com')).toBeInTheDocument();
    });

    await user.type(
      screen.getByRole('textbox', { name: 'EOA address' }),
      createHexAddress('2'),
    );
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

    renderApp(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText('Loaded 1 jobs for all attention.'),
      ).toBeInTheDocument();
    });

    expect(mockedAdminApi.getEscrowHealth).toHaveBeenCalledWith(
      'admin-access-token-123',
      {
        reason: undefined,
      },
    );
    expect(screen.getByText('Operator backlog')).toBeInTheDocument();
    expect(screen.getByText('Open dispute')).toBeInTheDocument();
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

    renderApp(<Home />);

    await waitFor(() => {
      expect(screen.getByText('State drift case')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Highest severity: Critical/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Timeline sources: 3 audit events · 2 confirmed executions · 0 failed executions/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Replay: status funded -> draft · funded null -> 100/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Funding was confirmed in the timeline but the aggregate funded amount is empty/,
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Reconciliation drift' }),
    );

    await waitFor(() => {
      expect(
        screen.getByText('Loaded 1 jobs for reconciliation drift.'),
      ).toBeInTheDocument();
    });

    expect(mockedAdminApi.getEscrowHealth).toHaveBeenNthCalledWith(
      2,
      'admin-access-token-123',
      {
        reason: 'reconciliation_drift',
      },
    );
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

    renderApp(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Operator backlog')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Failed executions' }));

    await waitFor(() => {
      expect(
        screen.getByText('Loaded 1 jobs for failed executions.'),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('Actions: fund_job x2, set_milestones x1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Codes: relay_rejected x2, unknown x1'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Surface: RPC or provider · Retry posture: Safe after review · Severity: critical',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Provider timeout/),
    ).toBeInTheDocument();

    expect(mockedAdminApi.getEscrowHealth).toHaveBeenNthCalledWith(
      2,
      'admin-access-token-123',
      {
        reason: 'failed_execution',
      },
    );

    await user.click(screen.getByRole('button', { name: 'Open case job-failure-1' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Disputed implementation' }),
      ).toBeInTheDocument();
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

    renderApp(<Home />);

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
      expect(
        screen.getByText('Loaded 1 jobs for all attention.'),
      ).toBeInTheDocument();
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

    renderApp(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Failure remediation target')).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText(
        'Document the failure pattern, likely cause, next retry posture, or external dependency blocker.',
      ),
      'Investigating relay posture.',
    );
    await user.click(
      screen.getByRole('button', { name: 'Claim failure workflow' }),
    );

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
    await user.click(
      screen.getByRole('button', { name: 'Save failure workflow' }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Status: Ready to retry\./),
      ).toBeInTheDocument();
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
    await user.click(
      screen.getByRole('button', { name: 'Acknowledge latest failures' }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Acknowledged through the latest failure at/),
      ).toBeInTheDocument();
    });

    expect(mockedAdminApi.acknowledgeExecutionFailures).toHaveBeenCalledWith(
      'job-failure-ops-1',
      {
        note: 'Acknowledged after relay check.',
        status: 'ready_to_retry',
      },
      'admin-access-token-123',
    );

    await user.click(
      screen.getByRole('button', { name: 'Release failure claim' }),
    );

    await waitFor(() => {
      expect(
        mockedAdminApi.releaseExecutionFailureWorkflow,
      ).toHaveBeenCalledWith('job-failure-ops-1', 'admin-access-token-123');
    });
  });

  it(
    'resolves a disputed milestone when the authenticated operator controls the arbitrator wallet',
    async () => {
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

    renderApp(<Home />);

    await waitFor(() => {
      expect(screen.getByText('operator@example.com')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Paste a job UUID'), 'job-123');
    await user.click(screen.getByRole('button', { name: 'Load public bundle' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Disputed implementation' }),
      ).toBeInTheDocument();
    });

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Resolution action' }),
      'release',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Resolution note' }),
      'Release after operator review.',
    );
    await user.click(
      screen.getByRole('button', { name: 'Resolve disputed milestone' }),
    );

    await waitFor(() => {
      expect(screen.getAllByText('No active disputes').length).toBeGreaterThan(0);
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
    },
    10_000,
  );

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

    renderApp(<Home />);

    await user.type(screen.getByPlaceholderText('Paste a job UUID'), 'job-123');
    await user.click(screen.getByRole('button', { name: 'Load public bundle' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Disputed implementation' }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: 'Export dispute case CSV' }),
    );

    await waitFor(() => {
      expect(mockedAdminApi.downloadCaseExport).toHaveBeenCalledWith(
        'job-123',
        'dispute-case',
        'csv',
      );
      expect(
        screen.getByText('Downloaded dispute-case CSV export.'),
      ).toBeInTheDocument();
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
