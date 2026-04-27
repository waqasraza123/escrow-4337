import { useCallback } from 'react';
import { useMobileNetwork } from '@/providers/network';

export function useNetworkActionGate() {
  const network = useMobileNetwork();
  const apiUnavailable = network.apiReachability.status === 'unreachable';
  const actionBlocked = network.offline || apiUnavailable;
  const blockedReason = network.offline
    ? 'The device is offline.'
    : apiUnavailable
      ? 'The escrow API is unreachable.'
      : null;

  const requireOnline = useCallback(
    (action?: string) => {
      network.requireOnline(action);
    },
    [network],
  );

  return {
    actionBlocked,
    apiUnavailable,
    blockedReason,
    network,
    offline: network.offline,
    requireOnline,
  };
}
