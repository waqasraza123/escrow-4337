import { formatTimestamp } from '@escrow4334/product-core';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMobileTheme } from '@/providers/theme';
import { BodyText, StatusBadge } from '@/ui/primitives';
import {
  readOfflineSnapshot,
  writeOfflineSnapshot,
  type OfflineSnapshotEnvelope,
} from './offlineSnapshots';

type OfflineSnapshotState<TData> = {
  cachedAt: number | null;
  data: TData | null;
  hydrating: boolean;
};

const defaultMaxAgeMs = 1000 * 60 * 60 * 24 * 7;

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
  const snapshotKey = useMemo(() => (enabled && cacheKey ? cacheKey : null), [cacheKey, enabled]);
  const [state, setState] = useState<OfflineSnapshotState<TData>>({
    cachedAt: null,
    data: null,
    hydrating: Boolean(snapshotKey),
  });

  useEffect(() => {
    let active = true;

    if (!snapshotKey) {
      setState({ cachedAt: null, data: null, hydrating: false });
      return () => {
        active = false;
      };
    }

    setState((current) => ({ ...current, hydrating: true }));
    void readOfflineSnapshot<TData>(snapshotKey)
      .then((snapshot) => {
        if (!active) {
          return;
        }

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
  }, [maxAgeMs, snapshotKey]);

  useEffect(() => {
    if (!snapshotKey || data === null || data === undefined) {
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

    void writeOfflineSnapshot(snapshotKey, envelope).catch(() => undefined);
  }, [data, snapshotKey]);

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
