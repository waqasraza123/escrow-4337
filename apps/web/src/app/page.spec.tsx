import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultLocalApiPort, resolveLocalApiBaseUrl } from '@escrow4334/frontend-core';
import {
  renderApp,
  seedJsonStorage,
} from '@escrow4334/frontend-core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAuditBundle,
  createCreateJobResponse,
  createCustomAuditBundle,
  createCustomJobsListResponse,
  createCustomJobView,
  createHexAddress,
  createJobsListResponse,
  createRuntimeProfile,
  createSessionTokens,
  createUserProfile,
  createVerifyResponse,
  createWalletLinkChallenge,
  createWalletState,
  sessionStorageKey,
} from '../test/fixtures';
import { WebI18nProvider } from '../lib/i18n';

const localApiBaseUrl = resolveLocalApiBaseUrl(defaultLocalApiPort);

const { mockedWebApi, mockedInjectedWallet } = vi.hoisted(() => ({
  mockedWebApi: {
    baseUrl: '',
    getRuntimeProfile: vi.fn(),
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
    inviteContractor: vi.fn(),
    updateContractorEmail: vi.fn(),
    getContractorJoinReadiness: vi.fn(),
    joinContractor: vi.fn(),
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

import Home from './app/page';

function mockAuthenticatedConsoleLoad(options?: {
  jobs?: ReturnType<typeof createJobsListResponse>;
  audit?: ReturnType<typeof createAuditBundle>;
}) {
  mockedWebApi.me.mockResolvedValue(createUserProfile());
  mockedWebApi.getWalletState.mockResolvedValue(createWalletState());
  mockedWebApi.listJobs.mockResolvedValue(options?.jobs ?? createJobsListResponse());
  mockedWebApi.getAudit.mockResolvedValue(options?.audit ?? createAuditBundle());
}

function renderHome() {
  return renderApp(
    <WebI18nProvider initialLocale="en">
      <Home />
    </WebI18nProvider>,
  );
}

describe('web page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedWebApi.baseUrl = localApiBaseUrl;
    mockedWebApi.getRuntimeProfile.mockResolvedValue(createRuntimeProfile());
    mockedWebApi.inviteContractor.mockResolvedValue({
      jobId: 'job-1',
      contractorParticipation: {
        contractorEmail: 'worker@example.com',
        status: 'pending',
        joinedAt: null,
        inviteLastSentAt: 200,
        inviteLastSentMode: 'manual',
      },
      invite: {
        contractorEmail: 'worker@example.com',
        delivery: 'manual',
        joinUrl: 'http://localhost:3000/app/contracts/job-1?invite=test-invite',
        regenerated: false,
        sentAt: 200,
      },
    });
    mockedWebApi.updateContractorEmail.mockResolvedValue({
      jobId: 'job-1',
      contractorParticipation: {
        contractorEmail: 'worker@example.com',
        status: 'pending',
        joinedAt: null,
        inviteLastSentAt: null,
        inviteLastSentMode: null,
      },
    });
    mockedWebApi.getContractorJoinReadiness.mockResolvedValue({
      jobId: 'job-1',
      status: 'ready',
      contractorEmailHint: 'w****r@e*****e.com',
      workerAddress: '0xworker',
      linkedWalletAddresses: ['0xworker'],
      contractorParticipation: {
        status: 'pending',
        joinedAt: null,
      },
    });
    mockedInjectedWallet.subscribeInjectedWallet.mockReturnValue(() => {});
    mockedInjectedWallet.readInjectedWalletSnapshot.mockResolvedValue({
      address: null,
      chainId: 84532,
    });
  });

  it('renders the signed-out onboarding console shell', async () => {
    renderHome();

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
      screen.getAllByText('Select a job to manage lifecycle actions').length,
    ).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText(localApiBaseUrl)).toBeInTheDocument();
      expect(screen.getAllByText('Current origin allowed').length).toBeGreaterThan(0);
      expect(screen.getAllByText('HTTP target').length).toBeGreaterThan(0);
    });
  });

  it('shows truthful runtime diagnostics when the backend profile cannot load', async () => {
    mockedWebApi.getRuntimeProfile.mockRejectedValue(new Error('Failed to fetch'));

    renderHome();

    await waitFor(() => {
      expect(
        screen.getAllByText('Runtime profile unavailable').length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    });
  });

  it('restores a stored session and renders the selected job workspace', async () => {
    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockAuthenticatedConsoleLoad();

    renderHome();

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

    renderHome();

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

    renderHome();

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

    renderHome();

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

    renderHome();

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

    renderHome();

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

    renderHome();

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

  it(
    'progresses through the guided job flow and exposes post-create actions',
    async () => {
    const user = userEvent.setup();
    const createdJob = createCustomJobView({
      id: 'job-created',
      title: 'Launch-ready implementation',
      description: 'Scoped implementation for guided job coverage.',
      fundedAmount: null,
      status: 'draft',
      onchain: {
        escrowId: 'escrow-created',
        workerAddress: createHexAddress('4'),
        currencyAddress: createHexAddress('5'),
      },
      milestones: [],
    });
    const createdJobResponse = createCreateJobResponse({
      jobId: createdJob.id,
      escrowId: createdJob.onchain.escrowId ?? 'escrow-created',
    });
    const refreshedJobs = createCustomJobsListResponse([
      {
        job: createdJob,
        participantRoles: ['client'],
      },
    ]);
    const refreshedAudit = createCustomAuditBundle({
      job: createdJob,
      audit: [],
      executions: [],
    });

    seedJsonStorage(sessionStorageKey, createSessionTokens());
    mockAuthenticatedConsoleLoad();
    mockedWebApi.createJob.mockResolvedValue(createdJobResponse);
    mockedWebApi.listJobs
      .mockResolvedValue(refreshedJobs)
      .mockResolvedValueOnce(createJobsListResponse());
    mockedWebApi.getAudit
      .mockResolvedValue(refreshedAudit)
      .mockResolvedValueOnce(createAuditBundle());

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('client@example.com')).toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByPlaceholderText('Milestone-based product implementation'),
      {
        target: { value: 'Launch-ready implementation' },
      },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        'Describe the scope, delivery expectations, and what the worker will be paid to complete.',
      ),
      {
        target: { value: 'Scoped implementation for guided job coverage.' },
      },
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));

    fireEvent.change(
      screen.getByPlaceholderText('contractor@example.com'),
      {
        target: { value: 'worker@example.com' },
      },
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Worker wallet' }), {
      target: { value: createHexAddress('4') },
    });
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Settlement token address' }),
      {
        target: { value: createHexAddress('5') },
      },
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Create guided job' }),
      ).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: 'Create guided job' }));

    await waitFor(() => {
      expect(
        screen.getAllByText(/Job created\. Escrow id escrow-created/).length,
      ).toBeGreaterThan(0);
    });

    expect(mockedWebApi.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        contractorEmail: 'worker@example.com',
        workerAddress: createHexAddress('4'),
        currencyAddress: createHexAddress('5'),
        title: 'Launch-ready implementation',
        description: 'Scoped implementation for guided job coverage.',
      }),
      'access-token-123',
    );
    expect(
      screen.getByRole('button', { name: 'Review selected job' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Commit drafted milestones' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Stage funding from milestone total' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Launch-ready implementation' }),
    ).toBeInTheDocument();
    },
    20_000,
  );
});
