import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from 'react-native';
import { formatTimestamp } from '@escrow4334/product-core';
import { useSession } from '@/providers/session';
import {
  BodyText,
  Heading,
  MetricRow,
  SecondaryButton,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';

export function SessionRestoreNotice({ delay = 50 }: { delay?: number }) {
  const queryClient = useQueryClient();
  const session = useSession();
  const [refreshing, setRefreshing] = useState(false);

  if (!session.restoredFromProfileSnapshot) {
    return null;
  }

  async function handleRefreshSession() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    try {
      await session.refreshSession();
      await queryClient.invalidateQueries({});
    } catch (error) {
      Alert.alert(
        'Session refresh unavailable',
        error instanceof Error
          ? error.message
          : 'The live session could not be refreshed right now.',
      );
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SurfaceCard animated delay={delay} variant="soft">
      <Heading size="section">Session restored</Heading>
      <StatusBadge label="Cached profile" tone="warning" />
      <BodyText>
        Showing account context from the last secure profile snapshot because the live session could
        not be reached during app start. The app will refresh automatically after API recovery, and
        write actions still require a reachable API.
      </BodyText>
      <MetricRow
        label="Profile saved"
        value={formatTimestamp(session.profileSnapshotCachedAt, { fallback: 'Unknown' })}
      />
      <SecondaryButton disabled={refreshing} onPress={() => void handleRefreshSession()}>
        {refreshing ? 'Refreshing session' : 'Refresh session'}
      </SecondaryButton>
    </SurfaceCard>
  );
}
