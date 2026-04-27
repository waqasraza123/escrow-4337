import NetInfo, { type NetInfoStateType } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';

type ApiReachabilityStatus =
  | 'unchecked'
  | 'checking'
  | 'reachable'
  | 'unreachable'
  | 'skipped';

type ApiReachabilityState = {
  status: ApiReachabilityStatus;
  checkedAt: number | null;
  latencyMs: number | null;
  error: string | null;
};

type MobileNetworkContextValue = {
  initialized: boolean;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  offline: boolean;
  connectionType: NetInfoStateType | 'unknown';
  apiBaseUrl: string;
  apiReachability: ApiReachabilityState;
  lastChangedAt: number | null;
  probeApiReachability: () => Promise<void>;
  refresh: () => Promise<void>;
  requireOnline: (action?: string) => void;
};

const MobileNetworkContext = createContext<MobileNetworkContextValue | null>(null);
const apiProbeTimeoutMs = 5000;

const initialApiReachability: ApiReachabilityState = {
  status: 'unchecked',
  checkedAt: null,
  latencyMs: null,
  error: null,
};

function isOffline(isConnected: boolean | null, isInternetReachable: boolean | null) {
  return isConnected === false || isInternetReachable === false;
}

function isOnlineForQueries(isConnected: boolean | null, isInternetReachable: boolean | null) {
  if (isConnected === false || isInternetReachable === false) {
    return false;
  }

  return true;
}

function formatOfflineMessage(action?: string) {
  const prefix = action
    ? `${action} needs a network connection.`
    : 'This action needs a network connection.';
  return `${prefix} Reconnect to the internet and try again.`;
}

function formatApiUnreachableMessage(action?: string) {
  const prefix = action
    ? `${action} needs the escrow API.`
    : 'This action needs the escrow API.';
  return `${prefix} The device has connectivity, but the API is not reachable right now. Refresh network state or try again after service recovers.`;
}

function normalizeApiProbeError(error: unknown) {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return `API probe timed out after ${apiProbeTimeoutMs / 1000} seconds.`;
    }

    return error.message;
  }

  return 'API probe failed.';
}

export function MobileNetworkProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const [connectionType, setConnectionType] = useState<NetInfoStateType | 'unknown'>('unknown');
  const [lastChangedAt, setLastChangedAt] = useState<number | null>(null);
  const [apiReachability, setApiReachability] = useState<ApiReachabilityState>(
    initialApiReachability,
  );
  const probeSequenceRef = useRef(0);

  const applyState = useCallback(
    (state: {
      isConnected: boolean | null;
      isInternetReachable: boolean | null;
      type: NetInfoStateType | 'unknown';
    }) => {
      setInitialized(true);
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
      setConnectionType(state.type);
      setLastChangedAt(Date.now());
      onlineManager.setOnline(
        isOnlineForQueries(state.isConnected, state.isInternetReachable),
      );
    },
    [],
  );

  const offline = isOffline(isConnected, isInternetReachable);

  const probeApiReachability = useCallback(
    async (
      stateOverride?: {
        isConnected: boolean | null;
        isInternetReachable: boolean | null;
      },
    ) => {
      const deviceOffline = stateOverride
        ? isOffline(stateOverride.isConnected, stateOverride.isInternetReachable)
        : offline;

      if (deviceOffline) {
        probeSequenceRef.current += 1;
        setApiReachability({
          status: 'skipped',
          checkedAt: Date.now(),
          latencyMs: null,
          error: null,
        });
        return;
      }

      const startedAt = Date.now();
      const probeId = probeSequenceRef.current + 1;
      probeSequenceRef.current = probeId;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), apiProbeTimeoutMs);

      setApiReachability((current) => ({
        ...current,
        status: 'checking',
        error: null,
      }));

      try {
        const response = await fetch(`${api.baseUrl}/operations/runtime-profile`, {
          method: 'GET',
          headers: {
            accept: 'application/json',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API probe failed with HTTP ${response.status}.`);
        }

        if (probeId !== probeSequenceRef.current) {
          return;
        }

        setApiReachability({
          status: 'reachable',
          checkedAt: Date.now(),
          latencyMs: Date.now() - startedAt,
          error: null,
        });
      } catch (error) {
        if (probeId !== probeSequenceRef.current) {
          return;
        }

        setApiReachability({
          status: 'unreachable',
          checkedAt: Date.now(),
          latencyMs: Date.now() - startedAt,
          error: normalizeApiProbeError(error),
        });
      } finally {
        clearTimeout(timeout);
      }
    },
    [offline],
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      applyState({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type ?? 'unknown',
      });
    });

    void NetInfo.fetch().then((state) => {
      applyState({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type ?? 'unknown',
      });
    });

    return unsubscribe;
  }, [applyState]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    void probeApiReachability();
  }, [initialized, offline, probeApiReachability]);

  const refresh = useCallback(async () => {
    const state = await NetInfo.fetch();
    applyState({
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type ?? 'unknown',
    });
    await probeApiReachability({
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
    });
  }, [applyState, probeApiReachability]);

  const requireOnline = useCallback(
    (action?: string) => {
      if (offline) {
        throw new Error(formatOfflineMessage(action));
      }

      if (apiReachability.status === 'unreachable') {
        throw new Error(formatApiUnreachableMessage(action));
      }
    },
    [apiReachability.status, offline],
  );

  const value = useMemo<MobileNetworkContextValue>(
    () => ({
      initialized,
      isConnected,
      isInternetReachable,
      offline,
      connectionType,
      apiBaseUrl: api.baseUrl,
      apiReachability,
      lastChangedAt,
      probeApiReachability: () => probeApiReachability(),
      refresh,
      requireOnline,
    }),
    [
      connectionType,
      initialized,
      isConnected,
      isInternetReachable,
      lastChangedAt,
      offline,
      apiReachability,
      probeApiReachability,
      refresh,
      requireOnline,
    ],
  );

  return (
    <MobileNetworkContext.Provider value={value}>{children}</MobileNetworkContext.Provider>
  );
}

export function useMobileNetwork() {
  const value = useContext(MobileNetworkContext);
  if (!value) {
    throw new Error('useMobileNetwork must be used inside MobileNetworkProvider.');
  }

  return value;
}
