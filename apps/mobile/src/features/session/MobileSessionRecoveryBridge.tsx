import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useMobileNetwork } from '@/providers/network';
import { useSession } from '@/providers/session';

const sessionRecoveryThrottleMs = 15_000;

export function MobileSessionRecoveryBridge() {
  const network = useMobileNetwork();
  const queryClient = useQueryClient();
  const { refreshSession, restoredFromProfileSnapshot } = useSession();
  const refreshInFlightRef = useRef(false);
  const lastRefreshAttemptAtRef = useRef(0);

  useEffect(() => {
    if (!restoredFromProfileSnapshot || refreshInFlightRef.current) {
      return;
    }

    if (network.offline || network.apiReachability.status !== 'reachable') {
      return;
    }

    const now = Date.now();
    if (now - lastRefreshAttemptAtRef.current < sessionRecoveryThrottleMs) {
      return;
    }

    refreshInFlightRef.current = true;
    lastRefreshAttemptAtRef.current = now;

    void refreshSession()
      .then((profile) => {
        if (profile) {
          void queryClient.invalidateQueries({}).catch(() => undefined);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        refreshInFlightRef.current = false;
      });
  }, [
    network.apiReachability.status,
    network.offline,
    queryClient,
    refreshSession,
    restoredFromProfileSnapshot,
  ]);

  return null;
}
