import { screen } from '@testing-library/react';
import { renderApp } from '@escrow4334/frontend-core/testing';
import { describe, expect, it } from 'vitest';
import { WebI18nProvider } from '../lib/i18n';
import Home from './page';

describe('marketing homepage', () => {
  it('prioritizes marketplace hiring and keeps direct escrow secondary', () => {
    renderApp(
      <WebI18nProvider initialLocale="en">
        <Home />
      </WebI18nProvider>,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Hire vetted crypto-native talent through milestone escrow',
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('marketing-primary-cta')).toHaveAttribute(
      'href',
      '/marketplace',
    );
    expect(screen.getByTestId('marketing-secondary-cta')).toHaveAttribute(
      'href',
      '/app/new-contract',
    );
    expect(screen.getByRole('link', { name: 'See the trust model' })).toHaveAttribute(
      'href',
      '/trust',
    );
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByText('Popular hiring lanes')).toBeInTheDocument();
    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('Why teams can trust the close')).toBeInTheDocument();
  });

  it('renders Arabic CTA labels from the shared marketing messages', () => {
    renderApp(
      <WebI18nProvider initialLocale="ar">
        <Home />
      </WebI18nProvider>,
    );

    expect(
      screen.getByRole('heading', {
        name: 'وظّف مواهب رقمية موثقة ثم أغلق العمل عبر ضمان المراحل',
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('marketing-primary-cta')).toHaveAttribute(
      'href',
      '/marketplace',
    );
    expect(screen.getByTestId('marketing-secondary-cta')).toHaveAttribute(
      'href',
      '/app/new-contract',
    );
    expect(screen.getByText('السمة')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'اطّلع على نموذج الثقة' })).toHaveAttribute(
      'href',
      '/trust',
    );
    expect(screen.getByText('مسارات التوظيف الشائعة')).toBeInTheDocument();
  });
});
