import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@escrow4334/frontend-core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdminI18nProvider } from '../lib/i18n';
import { AdminThemeProvider, adminThemeCookieName } from '../lib/theme';
import { ThemeToggle } from './theme-toggle';

function renderThemeToggle(initialTheme: 'light' | 'dark' = 'light') {
  return renderApp(
    <AdminThemeProvider initialTheme={initialTheme}>
      <AdminI18nProvider initialLocale="en">
        <ThemeToggle />
      </AdminI18nProvider>
    </AdminThemeProvider>,
  );
}

describe('admin theme toggle', () => {
  beforeEach(() => {
    document.cookie = `${adminThemeCookieName}=; Max-Age=0; Path=/; SameSite=Lax`;
    document.documentElement.dataset.theme = '';
  });

  it('defaults to the light theme and syncs it to the document', async () => {
    renderThemeToggle('light');

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(document.cookie).toContain(`${adminThemeCookieName}=light`);
  });

  it('switches to dark and persists the cookie', async () => {
    const user = userEvent.setup();

    renderThemeToggle('light');

    await user.click(screen.getByRole('button', { name: 'Dark' }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(document.cookie).toContain(`${adminThemeCookieName}=dark`);
  });
});
