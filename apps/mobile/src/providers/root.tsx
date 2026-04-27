import { type ReactNode } from 'react';
import { LocaleProvider } from './locale';
import { MobileNetworkProvider } from './network';
import { QueryProvider } from './query';
import { SessionProvider } from './session';
import { MobileThemeProvider } from './theme';
import { MobileWalletProvider } from './wallet';

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <MobileNetworkProvider>
      <QueryProvider>
        <MobileThemeProvider>
          <LocaleProvider>
            <SessionProvider>
              <MobileWalletProvider>{children}</MobileWalletProvider>
            </SessionProvider>
          </LocaleProvider>
        </MobileThemeProvider>
      </QueryProvider>
    </MobileNetworkProvider>
  );
}
