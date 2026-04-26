import { type ReactNode } from 'react';
import { LocaleProvider } from './locale';
import { QueryProvider } from './query';
import { SessionProvider } from './session';
import { MobileThemeProvider } from './theme';

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <MobileThemeProvider>
        <LocaleProvider>
          <SessionProvider>{children}</SessionProvider>
        </LocaleProvider>
      </MobileThemeProvider>
    </QueryProvider>
  );
}
