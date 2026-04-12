import { renderApp } from '@escrow4334/frontend-core/testing';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebI18nProvider } from '../lib/i18n';
import {
  createRuntimeProfile,
  createWalletState,
} from '../test/fixtures';

const mockRouterPush = vi.fn();

const { mockedWebApi, mockedInjectedWallet } = vi.hoisted(() => ({
  mockedWebApi: {
    baseUrl: 'http://127.0.0.1:4000',
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

import { EscrowConsole } from './web-console';
import LaunchFlowHelpPage from './app/help/launch-flow/page';
import { clientWalkthroughStorageKey } from './launch-walkthrough';

function renderSignInConsole() {
  return renderApp(
    <WebI18nProvider initialLocale="en">
      <EscrowConsole view="sign-in" />
    </WebI18nProvider>,
  );
}

describe('launch walkthrough', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockedWebApi.getRuntimeProfile.mockResolvedValue(createRuntimeProfile());
    mockedInjectedWallet.readInjectedWalletSnapshot.mockResolvedValue({
      address: null,
      chainId: 84532,
    });
    mockedInjectedWallet.subscribeInjectedWallet.mockReturnValue(() => {});
    mockedWebApi.getWalletState.mockResolvedValue(createWalletState());
    mockedWebApi.listJobs.mockResolvedValue({ jobs: [] });
  });

  it('auto-starts the client walkthrough on the sign-in console', async () => {
    renderSignInConsole();

    await waitFor(() => {
      expect(screen.getByText('Start with your client session')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Stop walkthrough' })).toBeInTheDocument();
    expect(screen.getByText('Client walkthrough • 1/14')).toBeInTheDocument();
  });

  it('stops the walkthrough immediately from the current step', async () => {
    const user = userEvent.setup();
    renderSignInConsole();

    await waitFor(() => {
      expect(screen.getByText('Start with your client session')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Stop walkthrough' }));

    await waitFor(() => {
      expect(screen.queryByText('Start with your client session')).not.toBeInTheDocument();
    });

    expect(
      screen.getByText('Walkthrough stopped. Restart anytime from Walkthrough or Help.'),
    ).toBeInTheDocument();
  });

  it('provides a manual page that can restart the client walkthrough', async () => {
    const user = userEvent.setup();
    renderApp(<LaunchFlowHelpPage />);

    await user.click(screen.getByRole('button', { name: 'Start client walkthrough' }));

    expect(mockRouterPush).toHaveBeenCalledWith('/app/sign-in');
    expect(window.localStorage.getItem(clientWalkthroughStorageKey)).toContain('"status":"active"');
    expect(window.localStorage.getItem(clientWalkthroughStorageKey)).toContain(
      '"lastStep":"client-sign-in"',
    );
  });
});
