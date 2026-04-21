export type WebTheme = 'light' | 'dark';

export const webThemeCookieName = 'escrow4334-web-theme';
export const defaultWebTheme: WebTheme = 'light';

export function resolveWebTheme(value?: string | null): WebTheme {
  return value === 'dark' ? 'dark' : defaultWebTheme;
}
