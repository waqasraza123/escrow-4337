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
const profileSnapshotKey = 'escrow4337.profileSnapshot.v1';

type ProfileSnapshotEnvelope = {
  version: 1;
  cachedAt: number;
  user: UserProfile;
};

type SessionContextValue = {
  accessToken: string | null;
  profileSnapshotCachedAt: number | null;
  refreshToken: string | null;
  restoredFromProfileSnapshot: boolean;
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

function isProfileSnapshotEnvelope(value: unknown): value is ProfileSnapshotEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ProfileSnapshotEnvelope>;
  return candidate.version === 1 && typeof candidate.cachedAt === 'number' && Boolean(candidate.user);
}

async function saveProfileSnapshot(user: UserProfile) {
  const envelope: ProfileSnapshotEnvelope = {
    version: 1,
    cachedAt: Date.now(),
    user,
  };

  await SecureStore.setItemAsync(profileSnapshotKey, JSON.stringify(envelope));
}

async function readProfileSnapshot() {
  const raw = await SecureStore.getItemAsync(profileSnapshotKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isProfileSnapshotEnvelope(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function clearProfileSnapshot() {
  await SecureStore.deleteItemAsync(profileSnapshotKey);
}

function isTerminalSessionRestoreError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');

  return /invalid token|missing token|invalid session|not found/i.test(message);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profileSnapshotCachedAt, setProfileSnapshotCachedAt] = useState<number | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [restoredFromProfileSnapshot, setRestoredFromProfileSnapshot] = useState(false);
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

  const applyUser = useCallback(
    (
      nextUser: UserProfile | null,
      options: { cachedAt?: number | null; restoredFromSnapshot?: boolean } = {},
    ) => {
      setUser(nextUser);
      setRestoredFromProfileSnapshot(Boolean(nextUser && options.restoredFromSnapshot));
      setProfileSnapshotCachedAt(nextUser ? options.cachedAt ?? Date.now() : null);

      if (nextUser && !options.restoredFromSnapshot) {
        void saveProfileSnapshot(nextUser).catch(() => undefined);
      } else if (!nextUser) {
        void clearProfileSnapshot().catch(() => undefined);
      }
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
    applyUser(profile);
    return profile;
  }, [applyTokens, applyUser, refreshToken]);

  useEffect(() => {
    let mounted = true;

    async function restore() {
      try {
        const [storedAccessToken, storedRefreshToken, profileSnapshot] = await Promise.all([
          SecureStore.getItemAsync(accessTokenKey),
          SecureStore.getItemAsync(refreshTokenKey),
          readProfileSnapshot(),
        ]);

        if (!mounted) {
          return;
        }

        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);

        try {
          if (storedAccessToken) {
            try {
              const profile = await api.me(storedAccessToken);
              if (mounted) {
                applyUser(profile);
              }
              return;
            } catch (error) {
              if (!storedRefreshToken || !isTerminalSessionRestoreError(error)) {
                throw error;
              }
            }
          }

          if (storedRefreshToken) {
            const tokens = await api.refresh(storedRefreshToken);
            await applyTokens(tokens.accessToken, tokens.refreshToken);
            const profile = await api.me(tokens.accessToken);
            if (mounted) {
              applyUser(profile);
            }
          } else if (profileSnapshot) {
            await clearProfileSnapshot();
          }
        } catch (error) {
          if (profileSnapshot && !isTerminalSessionRestoreError(error)) {
            if (mounted) {
              applyUser(profileSnapshot.user, {
                cachedAt: profileSnapshot.cachedAt,
                restoredFromSnapshot: true,
              });
            }
            return;
          }

          throw error;
        }
      } catch {
        if (mounted) {
          await clearTokens();
          await clearProfileSnapshot();
          await clearOfflineSnapshots();
          setAccessToken(null);
          setRefreshToken(null);
          applyUser(null);
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
  }, [applyTokens, applyUser]);

  const requestCode = useCallback(async (email: string) => {
    await api.startAuth(email);
  }, []);

  const signIn = useCallback(
    async (email: string, code: string) => {
      const response = await api.verifyAuth(email, code);
      await applyTokens(response.accessToken, response.refreshToken);
      applyUser(response.user);
      return response.user;
    },
    [applyTokens, applyUser],
  );

  const signOut = useCallback(async () => {
    const tokenToRevoke = refreshToken;
    const userId = user?.id;
    setAccessToken(null);
    setRefreshToken(null);
    applyUser(null);
    await clearTokens();
    await clearProfileSnapshot();
    await clearOfflineSnapshots(userId ? { userId } : undefined);
    await api.logout(tokenToRevoke).catch(() => undefined);
  }, [applyUser, refreshToken, user?.id]);

  const value = useMemo<SessionContextValue>(
    () => ({
      accessToken,
      profileSnapshotCachedAt,
      refreshToken,
      restoredFromProfileSnapshot,
      user,
      restoring,
      signIn,
      requestCode,
      refreshSession,
      signOut,
      setUser: applyUser,
    }),
    [
      accessToken,
      profileSnapshotCachedAt,
      refreshToken,
      restoredFromProfileSnapshot,
      refreshSession,
      requestCode,
      restoring,
      signIn,
      signOut,
      applyUser,
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
