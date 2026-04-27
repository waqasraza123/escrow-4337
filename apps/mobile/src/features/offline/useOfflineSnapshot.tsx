import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatTimestamp } from '@escrow4334/product-core';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMobileTheme } from '@/providers/theme';
import { BodyText, StatusBadge } from '@/ui/primitives';

type OfflineSnapshotEnvelope<TData> = {
  version: 1;
  cachedAt: number;
  data: TData;
};

type OfflineSnapshotState<TData> = {
  cachedAt: number | null;
  data: TData | null;
  hydrating: boolean;
};

const snapshotPrefix = 'escrow4337.offlineSnapshot.v1';
const defaultMaxAgeMs = 1000 * 60 * 60 * 24 * 7;

function buildStorageKey(cacheKey: string) {
  return `${snapshotPrefix}:${cacheKey}`;
}

function isSnapshotEnvelope<TData>(value: unknown): value is OfflineSnapshotEnvelope<TData> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<OfflineSnapshotEnvelope<TData>>;
  return candidate.version === 1 && typeof candidate.cachedAt === 'number' && 'data' in candidate;
}

function parseSnapshot<TData>(raw: string | null): OfflineSnapshotEnvelope<TData> | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isSnapshotEnvelope<TData>(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function useOfflineSnapshot<TData>({
  cacheKey,
  data,
  enabled = true,
  maxAgeMs = defaultMaxAgeMs,
}: {
  cacheKey: string | null;
  data: TData | null | undefined;
  enabled?: boolean;
  maxAgeMs?: number;
}) {
  const storageKey = useMemo(
    () => (enabled && cacheKey ? buildStorageKey(cacheKey) : null),
    [cacheKey, enabled],
  );
  const [state, setState] = useState<OfflineSnapshotState<TData>>({
    cachedAt: null,
    data: null,
    hydrating: Boolean(storageKey),
  });

  useEffect(() => {
    let active = true;

    if (!storageKey) {
      setState({ cachedAt: null, data: null, hydrating: false });
      return () => {
        active = false;
      };
    }

    setState((current) => ({ ...current, hydrating: true }));
    void AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!active) {
          return;
        }

        const snapshot = parseSnapshot<TData>(raw);
        const expired =
          snapshot !== null && Date.now() - snapshot.cachedAt > Math.max(0, maxAgeMs);

        setState({
          cachedAt: snapshot && !expired ? snapshot.cachedAt : null,
          data: snapshot && !expired ? snapshot.data : null,
          hydrating: false,
        });
      })
      .catch(() => {
        if (active) {
          setState({ cachedAt: null, data: null, hydrating: false });
        }
      });

    return () => {
      active = false;
    };
  }, [maxAgeMs, storageKey]);

  useEffect(() => {
    if (!storageKey || data === null || data === undefined) {
      return;
    }

    const envelope: OfflineSnapshotEnvelope<TData> = {
      version: 1,
      cachedAt: Date.now(),
      data,
    };

    setState({
      cachedAt: envelope.cachedAt,
      data,
      hydrating: false,
    });

    void AsyncStorage.setItem(storageKey, JSON.stringify(envelope)).catch(() => undefined);
  }, [data, storageKey]);

  return state;
}

export function OfflineSnapshotNotice({
  cachedAt,
  subject = 'data',
}: {
  cachedAt: number | null;
  subject?: string;
}) {
  const theme = useMobileTheme();

  if (!cachedAt) {
    return null;
  }

  return (
    <View
      style={[
        styles.notice,
        {
          backgroundColor: theme.colors.surfaceStrong,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.md,
        },
      ]}
    >
      <StatusBadge label="Offline snapshot" tone="warning" />
      <BodyText>
        Showing read-only {subject} saved {formatTimestamp(cachedAt)}. Refresh network state before
        taking write actions.
      </BodyText>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
});
