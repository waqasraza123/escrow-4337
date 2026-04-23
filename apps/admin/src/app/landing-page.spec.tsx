import { renderApp } from '@escrow4334/frontend-core/testing';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AdminI18nProvider } from '../lib/i18n';
import { AdminLandingPage } from './landing-page';

function renderLanding() {
  return renderApp(
    <AdminI18nProvider initialLocale="en">
      <AdminLandingPage />
    </AdminI18nProvider>,
  );
}

describe('admin landing page', () => {
  const originalWebBaseUrl = process.env.NEXT_PUBLIC_WEB_BASE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_WEB_BASE_URL = originalWebBaseUrl;
  });

  it('renders client-facing landing content without operator diagnostics', () => {
    delete process.env.NEXT_PUBLIC_WEB_BASE_URL;

    renderLanding();

    expect(
      screen.getByRole('heading', {
        name: 'Launch client work from a product landing, not an operator console.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Structured hiring with escrow discipline built in'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Operator access' })).toHaveAttribute(
      'href',
      '/operator',
    );
    expect(screen.queryByText('Backend profile validation')).not.toBeInTheDocument();
    expect(screen.queryByText('Operator session and wallet authority')).not.toBeInTheDocument();
    expect(screen.queryByText('API base URL')).not.toBeInTheDocument();
  });

  it('builds product CTAs from the configured web base url', () => {
    process.env.NEXT_PUBLIC_WEB_BASE_URL = 'https://web.example.com';

    renderLanding();

    expect(screen.getByRole('link', { name: 'Browse marketplace' })).toHaveAttribute(
      'href',
      'https://web.example.com/marketplace',
    );
    expect(screen.getByRole('link', { name: 'Open workspace sign-in' })).toHaveAttribute(
      'href',
      'https://web.example.com/app/sign-in',
    );
    expect(screen.getByRole('link', { name: 'Start a direct escrow' })).toHaveAttribute(
      'href',
      'https://web.example.com/app/new-contract',
    );
  });
});
