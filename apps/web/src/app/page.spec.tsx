import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderApp,
  seedJsonStorage,
} from '@escrow4334/frontend-core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAuditBundle,
  createJobsListResponse,
  createSessionTokens,
  createUserProfile,
  createVerifyResponse,
  createWalletLinkChallenge,
  createWalletState,
  sessionStorageKey,
} from '../test/fixtures';

const { mockedWebApi, mockedInjectedWallet } = vi.hoisted(() => ({
  mockedWebApi: {
    baseUrl: 'http://localhost:4000',
    startAuth: vi.fn(),
    verifyAuth: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    setShariah: vi.fn(),
    getWalletState: vi.fn(),
    createWalletChallenge: vi.fn(),
    verifyWalletChallenge: vi.fn(),
    provisionSmartAccount: vi.fn(),
    setDefaultWallet: vi.fn(),
    listJobs: vi.fn(),
    createJob: vi.fn(),
    fundJob: vi.fn(),
    setMilestones: vi.fn(),
    deliverMilestone: vi.fn(),
    releaseMilestone: vi.fn(),
    disputeMilestone: vi.fn(),
    resolveMilestone: vi.fn(),
    getAudit: vi.fn(),
  },
  mockedInjectedWallet: {
    connectInjectedWallet: vi.fn(),
    readInjectedWalletSnapshot: vi.fn(),
    signMessageWithInjectedWallet: vi.fn(),
    subscribeInjectedWallet: vi.fn(() => () => {}),
  },
}));

vi.mock('../lib/api', () => ({
  webApi: mockedWebApi,
}));

vi.mock('../lib/injected-wallet', () => mockedInjectedWallet);

import Home from './page';

function mockAuthenticatedConsoleLoad() {
  mockedWebApi.me.mockResolvedValue(createUserProfile());
  mockedWebApi.getWalletState.mockResolvedValue(createWalletState());
  mockedWebApi.listJobs.mockResolvedValue(createJobsListResponse());
  mockedWebApi.getAudit.mockResolvedValue(createAuditBundle());
}

describe('web page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedInjectedWallet.subscribeInjectedWallet.mockReturnValue(() => {});
    mockedInjectedWallet.readInjectedWalletSnapshot.mockResolvedValue({
      address: null,
      chainId: 84532,
    });
  });

  it('renders the signed-out onboarding console shell', async () => {
    renderApp(<Home />);

    expect(
      screen.getByRole('heading', {
        name: 'Operate the escrow lifecycle from OTP login to dispute resolution.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Connect injected wallet' }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText('Injected wallet ready to connect'),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'Authenticate first. The console will then load your profile, wallets, and jobs.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Select a job to manage lifecycle actions'),
    ).toBeInTheDocument();
  });

  it('restores a stored session and renders the selected job workspace', async () => {
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockAuthenticatedConsoleLoad();

    renderApp(<Home />);

    await waitFor(() => {
      expect(screen.getByText('client@example.com')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { name: 'Escrowed implementation' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Client workspace' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Worker workspace' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Shared dispute posture' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('1. Discovery').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(mockedWebApi.me).toHaveBeenCalledWith('access-token-123');
      expect(mockedWebApi.listJobs).toHaveBeenCalledWith('access-token-123');
      expect(mockedWebApi.getAudit).toHaveBeenCalledWith('job-1');
    });
  });

  it('verifies an OTP session and hydrates the console state', async () => {
    const user = userEvent.setup();
    mockedWebApi.verifyAuth.mockResolvedValue(createVerifyResponse());
    mockAuthenticatedConsoleLoad();

    renderApp(<Home />);

    await user.type(
      screen.getByPlaceholderText('client@example.com'),
      'client@example.com',
    );
    await user.type(screen.getByPlaceholderText('123456'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify session' }));

    await waitFor(() => {
      expect(
        screen.getByText('Session established. Loading product data...'),
      ).toBeInTheDocument();
      expect(screen.getByText('client@example.com')).toBeInTheDocument();
    });

    expect(mockedWebApi.verifyAuth).toHaveBeenCalledWith(
      'client@example.com',
      '123456',
    );
    expect(window.localStorage.getItem(sessionStorageKey)).toBe(
      JSON.stringify(createSessionTokens()),
    );
  });

  it('retries OTP start after a failure and shows the recovered success state', async () => {
    const user = userEvent.setup();
    mockedWebApi.startAuth
      .mockRejectedValueOnce(new Error('Rate limit hit'))
      .mockResolvedValueOnce({ ok: true });

    renderApp(<Home />);

    await user.type(
      screen.getByPlaceholderText('client@example.com'),
      'client@example.com',
    );
    await user.click(screen.getByRole('button', { name: 'Send OTP' }));

    await waitFor(() => {
      expect(screen.getByText('Rate limit hit')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Send OTP' }));

    await waitFor(() => {
      expect(
        screen.getByText('OTP issued. Check your configured mail inbox or relay logs.'),
      ).toBeInTheDocument();
    });

    expect(mockedWebApi.startAuth).toHaveBeenCalledTimes(2);
    expect(mockedWebApi.startAuth).toHaveBeenNthCalledWith(1, 'client@example.com');
    expect(mockedWebApi.startAuth).toHaveBeenNthCalledWith(2, 'client@example.com');
  });

  it('clears the session when refresh fails', async () => {
    const user = userEvent.setup();
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockAuthenticatedConsoleLoad();
    mockedWebApi.refresh.mockRejectedValue(new Error('Refresh token expired'));

    renderApp(<Home />);

    await waitFor(() => {
      expect(screen.getByText('client@example.com')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(screen.getByText('Refresh token expired')).toBeInTheDocument();
      expect(screen.getByText('Signed out')).toBeInTheDocument();
    });

    expect(mockedWebApi.refresh).toHaveBeenCalledWith('refresh-token-123');
    expect(window.localStorage.getItem(sessionStorageKey)).toBeNull();
  });

  it('logs out and clears the persisted session', async () => {
    const user = userEvent.setup();
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockAuthenticatedConsoleLoad();
    mockedWebApi.logout.mockResolvedValue({ ok: true });

    renderApp(<Home />);

    await waitFor(() => {
      expect(screen.getByText('client@example.com')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(screen.getByText('Signed out')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Authenticate first. The console will then load your profile, wallets, and jobs.',
        ),
      ).toBeInTheDocument();
    });

    expect(mockedWebApi.logout).toHaveBeenCalledWith('refresh-token-123');
    expect(window.localStorage.getItem(sessionStorageKey)).toBeNull();
  });

  it('creates a manual wallet-link challenge for the authenticated user', async () => {
    const user = userEvent.setup();
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockAuthenticatedConsoleLoad();
    mockedWebApi.createWalletChallenge.mockResolvedValue(
      createWalletLinkChallenge(),
    );

    renderApp(<Home />);

    await waitFor(() => {
      expect(screen.getByText('client@example.com')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'EOA address' }), {
      target: { value: '0x3333333333333333333333333333333333333333' },
    });
    await user.click(
      screen.getByRole('button', { name: 'Create SIWE challenge' }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          'Challenge created. Sign the SIWE message in your wallet, then paste the signature.',
        ),
      ).toBeInTheDocument();
    });

    expect(mockedWebApi.createWalletChallenge).toHaveBeenCalledWith(
      {
        address: '0x3333333333333333333333333333333333333333',
        walletKind: 'eoa',
        chainId: 84532,
        label: undefined,
      },
      'access-token-123',
    );
    expect(screen.getByDisplayValue('Sign in to link your wallet.')).toBeInTheDocument();
  });

  it('links the connected injected wallet through the native browser flow', async () => {
    const user = userEvent.setup();
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockAuthenticatedConsoleLoad();
    mockedInjectedWallet.connectInjectedWallet.mockResolvedValue({
      address: '0x1111111111111111111111111111111111111111',
      chainId: 84532,
    });
    mockedWebApi.createWalletChallenge.mockResolvedValue(
      createWalletLinkChallenge(),
    );
    mockedInjectedWallet.signMessageWithInjectedWallet.mockResolvedValue(
      '0xsigned-message',
    );
    mockedWebApi.verifyWalletChallenge.mockResolvedValue(createWalletState());

    renderApp(<Home />);

    await waitFor(() => {
      expect(screen.getByText('client@example.com')).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: 'Link connected wallet' }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          'Wallet linked from the browser wallet. Smart-account provisioning is now available.',
        ),
      ).toBeInTheDocument();
    });

    expect(mockedInjectedWallet.connectInjectedWallet).toHaveBeenCalledTimes(1);
    expect(mockedWebApi.createWalletChallenge).toHaveBeenCalledWith(
      {
        address: '0x1111111111111111111111111111111111111111',
        walletKind: 'eoa',
        chainId: 84532,
        label: undefined,
      },
      'access-token-123',
    );
    expect(mockedInjectedWallet.signMessageWithInjectedWallet).toHaveBeenCalledWith(
      '0x1111111111111111111111111111111111111111',
      'Sign in to link your wallet.',
    );
    expect(mockedWebApi.verifyWalletChallenge).toHaveBeenCalledWith(
      {
        challengeId: 'challenge-123',
        message: 'Sign in to link your wallet.',
        signature: '0xsigned-message',
      },
      'access-token-123',
    );
  });
});
