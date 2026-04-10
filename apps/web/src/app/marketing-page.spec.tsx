import { screen } from '@testing-library/react';
import { renderApp } from '@escrow4334/frontend-core/testing';
import { describe, expect, it } from 'vitest';
import Home from './page';

describe('marketing homepage', () => {
  it('explains the focused milestone escrow launch candidate', () => {
    renderApp(<Home />);

    expect(
      screen.getByRole('heading', { name: 'Milestone escrow for crypto service work' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Start a milestone escrow' })[0],
    ).toHaveAttribute('href', '/app/new-contract');
    expect(screen.getByText('Create and fund')).toBeInTheDocument();
    expect(screen.getByText('It is a focused agency or client escrow flow.')).toBeInTheDocument();
  });
});
