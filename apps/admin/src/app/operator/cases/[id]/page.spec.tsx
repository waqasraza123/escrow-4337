import { renderApp } from '@escrow4334/frontend-core/testing';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../operator-console', () => ({
  OperatorConsole: (props: { view: string; initialJobId?: string | null }) => (
    <div>
      <span>{props.view}</span>
      <span>{props.initialJobId}</span>
    </div>
  ),
}));

import OperatorCasePage from './page';

describe('canonical operator case route', () => {
  it('renders the operator console in case mode for the route job id', async () => {
    const page = await OperatorCasePage({
      params: Promise.resolve({ id: 'job-123' }),
    });

    renderApp(page);

    expect(screen.getByText('case')).toBeInTheDocument();
    expect(screen.getByText('job-123')).toBeInTheDocument();
  });
});
