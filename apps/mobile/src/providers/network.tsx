import NetInfo, { type NetInfoStateType } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';

type MobileNetworkContextValue = {
  initialized: boolean;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  offline: boolean;
  connectionType: NetInfoStateType | 'unknown';
  apiBaseUrl: string;
  lastChangedAt: number | null;
  refresh: () => Promise<void>;
  requireOnline: (action?: string) => void;
};

const MobileNetworkContext = createContext<MobileNetworkContextValue | null>(null);

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

export function MobileNetworkProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const [connectionType, setConnectionType] = useState<NetInfoStateType | 'unknown'>('unknown');
  const [lastChangedAt, setLastChangedAt] = useState<number | null>(null);

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

  const refresh = useCallback(async () => {
    const state = await NetInfo.fetch();
    applyState({
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type ?? 'unknown',
    });
  }, [applyState]);

  const offline = isOffline(isConnected, isInternetReachable);

  const requireOnline = useCallback(
    (action?: string) => {
      if (offline) {
        throw new Error(formatOfflineMessage(action));
      }
    },
    [offline],
  );

  const value = useMemo<MobileNetworkContextValue>(
    () => ({
      initialized,
      isConnected,
      isInternetReachable,
      offline,
      connectionType,
      apiBaseUrl: api.baseUrl,
      lastChangedAt,
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
