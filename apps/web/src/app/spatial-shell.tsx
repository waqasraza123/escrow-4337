'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SpatialShell } from '@escrow4334/frontend-core/spatial';
import { WebThemeProvider, type WebTheme } from '../lib/theme';

export function WebSpatialShell(props: {
  children: ReactNode;
  initialTheme: WebTheme;
}) {
  const { children, initialTheme } = props;
  const pathname = usePathname();

  return (
    <WebThemeProvider initialTheme={initialTheme}>
      <SpatialShell
        theme="web"
        stageClassName="min-h-screen"
        stageKey={pathname || '/'}
      >
        {children}
      </SpatialShell>
    </WebThemeProvider>
  );
}
