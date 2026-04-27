import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useMobileNetwork } from '@/providers/network';

const recoveryRefreshThrottleMs = 1500;

const recoveryQueryKeys: QueryKey[] = [
  ['runtime-profile'],
  ['jobs'],
  ['contractor-join-readiness'],
  ['project-room'],
  ['marketplace-job-reviews'],
  ['marketplace'],
];

function shouldTrackUnavailable(status: string, offline: boolean) {
  return offline || status === 'skipped' || status === 'unreachable';
}

function canRefreshAfterRecovery(status: string, offline: boolean) {
  return !offline && status === 'reachable';
}

export function MobileRecoveryRefreshBridge() {
  const network = useMobileNetwork();
  const queryClient = useQueryClient();
  const hadUnavailableStateRef = useRef(false);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    if (!network.initialized) {
      return;
    }

    if (shouldTrackUnavailable(network.apiReachability.status, network.offline)) {
      hadUnavailableStateRef.current = true;
      return;
    }

    if (!hadUnavailableStateRef.current) {
      return;
    }

    if (!canRefreshAfterRecovery(network.apiReachability.status, network.offline)) {
      return;
    }

    const now = Date.now();
    if (now - lastRefreshAtRef.current < recoveryRefreshThrottleMs) {
      return;
    }

    hadUnavailableStateRef.current = false;
    lastRefreshAtRef.current = now;

    void Promise.all(
      recoveryQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    ).catch(() => undefined);
  }, [
    network.apiReachability.checkedAt,
    network.apiReachability.status,
    network.initialized,
    network.offline,
    queryClient,
  ]);

  return null;
}
