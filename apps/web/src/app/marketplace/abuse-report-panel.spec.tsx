import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderApp,
  seedJsonStorage,
} from '@escrow4334/frontend-core/testing';
import { describe, expect, it, vi } from 'vitest';
import { AbuseReportPanel } from './abuse-report-panel';

const sessionStorageKey = 'escrow4337.web.session';

describe('abuse report panel', () => {
  it('requires a signed-in workspace session and submits normalized report input', async () => {
    seedJsonStorage(sessionStorageKey, {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
    });
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderApp(
      <AbuseReportPanel subjectLabel="Builder One" onSubmit={onSubmit} />,
    );

    await user.selectOptions(screen.getByRole('combobox'), 'other');
    await user.click(screen.getByRole('button', { name: 'Submit report' }));

    expect(
      screen.getByText(
        'Additional details are required for the "other" report reason.',
      ),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole('textbox', { name: 'Details' }),
      'Copied portfolio and impersonation signals.',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Evidence URLs' }),
      'https://example.com/one\nhttps://example.com/two',
    );
    await user.click(screen.getByRole('button', { name: 'Submit report' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        {
          reason: 'other',
          details: 'Copied portfolio and impersonation signals.',
          evidenceUrls: [
            'https://example.com/one',
            'https://example.com/two',
          ],
        },
        'access-token-123',
      );
    });

    expect(
      screen.getByText('Report submitted for Builder One.'),
    ).toBeInTheDocument();
  });
});
