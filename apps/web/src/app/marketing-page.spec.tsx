import { screen } from '@testing-library/react';
import { renderApp } from '@escrow4334/frontend-core/testing';
import { describe, expect, it } from 'vitest';
import { WebI18nProvider } from '../lib/i18n';
import Home from './page';

describe('marketing homepage', () => {
  it('explains the focused milestone escrow launch candidate', () => {
    renderApp(
      <WebI18nProvider initialLocale="en">
        <Home />
      </WebI18nProvider>,
    );

    expect(
      screen.getByRole('heading', { name: 'Milestone escrow for crypto service work' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Marketplace' })[0],
    ).toHaveAttribute('href', '/marketplace');
    expect(
      screen.getAllByRole('link', { name: 'Start a milestone escrow' })[0],
    ).toHaveAttribute('href', '/app/new-contract');
    expect(screen.getByText('Create and fund')).toBeInTheDocument();
    expect(
      screen.getByText('It is an escrow-first marketplace, not an embedded platform.'),
    ).toBeInTheDocument();
  });

  it('renders Arabic CTA labels from the shared marketing messages', () => {
    renderApp(
      <WebI18nProvider initialLocale="ar">
        <Home />
      </WebI18nProvider>,
    );

    expect(
      screen.getByRole('heading', { name: 'ضمان مراحل احترافي لأعمال الخدمات الرقمية' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'ابدأ ضمان المراحل' })[0]).toHaveAttribute(
      'href',
      '/app/new-contract',
    );
    expect(screen.getAllByRole('link', { name: 'السوق' })[0]).toHaveAttribute(
      'href',
      '/marketplace',
    );
    expect(screen.getByRole('link', { name: 'اطّلع على نموذج الثقة' })).toHaveAttribute(
      'href',
      '/trust',
    );
  });
});
