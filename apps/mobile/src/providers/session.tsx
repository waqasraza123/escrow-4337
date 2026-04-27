import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserProfile } from '@escrow4334/product-core';
import { clearOfflineSnapshots } from '@/features/offline/offlineSnapshots';
import { api } from './api';

const accessTokenKey = 'escrow4337.accessToken';
const refreshTokenKey = 'escrow4337.refreshToken';

type SessionContextValue = {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  restoring: boolean;
  signIn: (email: string, code: string) => Promise<UserProfile>;
  requestCode: (email: string) => Promise<void>;
  refreshSession: () => Promise<UserProfile | null>;
  signOut: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(accessTokenKey, accessToken);
  await SecureStore.setItemAsync(refreshTokenKey, refreshToken);
}

async function clearTokens() {
  await SecureStore.deleteItemAsync(accessTokenKey);
  await SecureStore.deleteItemAsync(refreshTokenKey);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [restoring, setRestoring] = useState(true);

  const applyTokens = useCallback(
    async (nextAccessToken: string, nextRefreshToken: string) => {
      await saveTokens(nextAccessToken, nextRefreshToken);
      setAccessToken(nextAccessToken);
      setRefreshToken(nextRefreshToken);
    },
    [],
  );

  const refreshSession = useCallback(async () => {
    const storedRefreshToken =
      refreshToken || (await SecureStore.getItemAsync(refreshTokenKey));
    if (!storedRefreshToken) {
      return null;
    }

    const tokens = await api.refresh(storedRefreshToken);
    await applyTokens(tokens.accessToken, tokens.refreshToken);
    const profile = await api.me(tokens.accessToken);
    setUser(profile);
    return profile;
  }, [applyTokens, refreshToken]);

  useEffect(() => {
    let mounted = true;

    async function restore() {
      try {
        const [storedAccessToken, storedRefreshToken] = await Promise.all([
          SecureStore.getItemAsync(accessTokenKey),
          SecureStore.getItemAsync(refreshTokenKey),
        ]);

        if (!mounted) {
          return;
        }

        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);

        if (storedAccessToken) {
          const profile = await api.me(storedAccessToken);
          if (mounted) {
            setUser(profile);
          }
        } else if (storedRefreshToken) {
          await refreshSession();
        }
      } catch {
        if (mounted) {
          await clearTokens();
          await clearOfflineSnapshots();
          setAccessToken(null);
          setRefreshToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setRestoring(false);
        }
      }
    }

    restore();

    return () => {
      mounted = false;
    };
  }, [refreshSession]);

  const requestCode = useCallback(async (email: string) => {
    await api.startAuth(email);
  }, []);

  const signIn = useCallback(
    async (email: string, code: string) => {
      const response = await api.verifyAuth(email, code);
      await applyTokens(response.accessToken, response.refreshToken);
      setUser(response.user);
      return response.user;
    },
    [applyTokens],
  );

  const signOut = useCallback(async () => {
    const tokenToRevoke = refreshToken;
    const userId = user?.id;
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    await clearTokens();
    await clearOfflineSnapshots(userId ? { userId } : undefined);
    await api.logout(tokenToRevoke).catch(() => undefined);
  }, [refreshToken, user?.id]);

  const value = useMemo<SessionContextValue>(
    () => ({
      accessToken,
      refreshToken,
      user,
      restoring,
      signIn,
      requestCode,
      refreshSession,
      signOut,
      setUser,
    }),
    [
      accessToken,
      refreshToken,
      refreshSession,
      requestCode,
      restoring,
      signIn,
      signOut,
      user,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside SessionProvider.');
  }

  return value;
}
