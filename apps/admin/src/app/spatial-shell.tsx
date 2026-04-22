'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SpatialShell } from '@escrow4334/frontend-core/spatial';
import { AdminThemeProvider, type AdminTheme } from '../lib/theme';

export function AdminSpatialShell(props: {
  children: ReactNode;
  initialTheme: AdminTheme;
}) {
  const { children, initialTheme } = props;
  const pathname = usePathname();

  return (
    <AdminThemeProvider initialTheme={initialTheme}>
      <SpatialShell
        theme="web"
        stageClassName="min-h-screen"
        stageKey={pathname || '/'}
      >
        {children}
      </SpatialShell>
    </AdminThemeProvider>
  );
}
