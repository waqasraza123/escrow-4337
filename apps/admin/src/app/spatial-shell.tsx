'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SpatialShell } from '@escrow4334/frontend-core/spatial';

export function AdminSpatialShell(props: { children: ReactNode }) {
  const { children } = props;
  const pathname = usePathname();

  return (
    <SpatialShell
      theme="admin"
      stageClassName="min-h-screen"
      stageKey={pathname || '/'}
    >
      {children}
    </SpatialShell>
  );
}
