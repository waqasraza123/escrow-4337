import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useMobileNetwork } from '@/providers/network';

const foregroundProbeStaleMs = 60_000;
const foregroundRefreshThrottleMs = 15_000;
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

function shouldRefreshOnForeground({
  apiCheckedAt,
  apiStatus,
  offline,
  now,
}: {
  apiCheckedAt: number | null;
  apiStatus: string;
  offline: boolean;
  now: number;
}) {
  if (shouldTrackUnavailable(apiStatus, offline)) {
    return true;
  }

  return apiCheckedAt === null || now - apiCheckedAt > foregroundProbeStaleMs;
}

export function MobileRecoveryRefreshBridge() {
  const network = useMobileNetwork();
  const queryClient = useQueryClient();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hadUnavailableStateRef = useRef(false);
  const lastForegroundRefreshAtRef = useRef(0);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      const returnedToForeground =
        nextState === 'active' && (previousState === 'background' || previousState === 'inactive');
      if (!returnedToForeground || !network.initialized) {
        return;
      }

      const now = Date.now();
      if (now - lastForegroundRefreshAtRef.current < foregroundRefreshThrottleMs) {
        return;
      }

      if (
        !shouldRefreshOnForeground({
          apiCheckedAt: network.apiReachability.checkedAt,
          apiStatus: network.apiReachability.status,
          now,
          offline: network.offline,
        })
      ) {
        return;
      }

      lastForegroundRefreshAtRef.current = now;
      void network.refresh().catch(() => undefined);
    });

    return () => subscription.remove();
  }, [
    network.apiReachability.checkedAt,
    network.apiReachability.status,
    network.initialized,
    network.offline,
    network.refresh,
  ]);

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
