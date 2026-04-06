import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderApp,
  seedJsonStorage,
} from '@escrow4334/frontend-core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAuditBundle,
  lookupHistoryStorageKey,
} from '../test/fixtures';

const { mockedAdminApi } = vi.hoisted(() => ({
  mockedAdminApi: {
    baseUrl: 'http://localhost:4000',
    getAudit: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  adminApi: mockedAdminApi,
}));

import Home from './page';

describe('admin page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the public-only operator scope shell before any lookup', () => {
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
});
