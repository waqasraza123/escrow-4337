export type AdminTheme = 'light' | 'dark';

export const adminThemeCookieName = 'escrow4334-admin-theme';
export const defaultAdminTheme: AdminTheme = 'light';

export function resolveAdminTheme(value?: string | null): AdminTheme {
  return value === 'dark' ? 'dark' : defaultAdminTheme;
}
