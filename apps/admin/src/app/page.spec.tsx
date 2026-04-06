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
    createWalletChallenge: vi.fn(),
    verifyWalletChallenge: vi.fn(),
    getAudit: vi.fn(),
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
});
