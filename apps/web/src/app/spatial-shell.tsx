'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SpatialShell } from '@escrow4334/frontend-core/spatial';

export function WebSpatialShell(props: { children: ReactNode }) {
  const { children } = props;
  const pathname = usePathname();

  return (
    <SpatialShell
      theme="web"
      stageClassName="min-h-screen"
      stageKey={pathname || '/'}
    >
      {children}
    </SpatialShell>
  );
}
