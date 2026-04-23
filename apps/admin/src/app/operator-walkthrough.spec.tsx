import { renderApp } from '@escrow4334/frontend-core/testing';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAuditBundle,
  createRuntimeProfile,
} from '../test/fixtures';
import { AdminI18nProvider } from '../lib/i18n';

const mockRouterPush = vi.fn();

const { mockedAdminApi } = vi.hoisted(() => ({
  mockedAdminApi: {
    baseUrl: 'http://127.0.0.1:4001',
    getRuntimeProfile: vi.fn(),
    startAuth: vi.fn(),
    verifyAuth: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    getEscrowHealth: vi.fn(),
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
    push: mockRouterPush,
  }),
}));

import { OperatorConsole } from './operator-console';
import OperatorCaseFlowHelpPage from './help/operator-case-flow/page';
import { operatorWalkthroughStorageKey } from './operator-walkthrough';

function renderCaseConsole() {
  return renderApp(
    <AdminI18nProvider initialLocale="en">
      <OperatorConsole view="case" initialJobId="job-123" />
    </AdminI18nProvider>,
  );
}

describe('operator walkthrough', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockedAdminApi.getRuntimeProfile.mockResolvedValue(createRuntimeProfile());
    mockedAdminApi.getEscrowHealth.mockResolvedValue(null);
    mockedAdminApi.getEscrowChainSyncDaemonHealth.mockResolvedValue(null);
    mockedAdminApi.getAudit.mockResolvedValue(createAuditBundle());
  });

  it('auto-starts on the first eligible disputed case route', async () => {
    renderCaseConsole();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Stop walkthrough' })).toBeInTheDocument();
    });

    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument();

    expect(
      screen.getByRole('dialog', {
        name:
          /Start on the operator case page|Link the configured arbitrator wallet|Review and resolve the disputed milestone/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Operator walkthrough • [1-3]\/4/)).toBeInTheDocument();
  });

  it('arms the operator walkthrough from the manual page', async () => {
    const user = userEvent.setup();
    renderApp(<OperatorCaseFlowHelpPage />);

    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute(
      'href',
      '/operator',
    );

    await user.click(screen.getByRole('button', { name: 'Start operator walkthrough' }));

    expect(window.localStorage.getItem(operatorWalkthroughStorageKey)).toContain(
      '"status":"active"',
    );
    expect(window.localStorage.getItem(operatorWalkthroughStorageKey)).toContain(
      '"lastStep":"operator-start"',
    );
    expect(
      screen.getByText(
        'Operator walkthrough armed. Open a disputed case route to start it automatically.',
      ),
    ).toBeInTheDocument();
  });
});
