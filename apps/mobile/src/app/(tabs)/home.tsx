import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import { SetupReadinessCard } from '@/features/setup/SetupReadinessCard';
import { NetworkStatusCard } from '@/features/network/NetworkStatusCard';
import { SessionRestoreNotice } from '@/features/session/SessionRestoreNotice';
import {
  BodyText,
  EmptyState,
  Heading,
  HeroSceneCard,
  MetricRow,
  ScrollScreen,
  SkeletonCard,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';

export default function HomeRoute() {
  const { accessToken, user } = useSession();
  const runtime = useQuery({
    queryKey: ['runtime-profile'],
    queryFn: () => api.getRuntimeProfile(),
  });

  return (
    <ScrollScreen>
      <HeroSceneCard
        eyebrow="Workspace"
        title={user?.activeWorkspace?.label || 'Milestone Escrow'}
        body="Mobile starts from the escrow tasks that matter most: setup, browse, contracts, delivery, and disputes."
        signals={[
          {
            label: 'Runtime',
            value: runtime.data?.profile ?? 'Checking',
            tone: runtime.data?.profile === 'deployment-like' ? 'success' : 'warning',
          },
          {
            label: 'Session',
            value: accessToken ? 'Restored' : 'Signed out',
            tone: accessToken ? 'success' : 'muted',
          },
        ]}
      />

      <NetworkStatusCard compact />
      <SessionRestoreNotice delay={50} />

      {runtime.isLoading ? (
        <SkeletonCard />
      ) : runtime.data ? (
        <SurfaceCard animated variant="elevated">
          <View style={styles.row}>
            <Heading size="section" style={styles.cardHeading}>
              Runtime
            </Heading>
            <StatusBadge
              label={runtime.data.profile}
              tone={runtime.data.profile === 'deployment-like' ? 'success' : 'warning'}
            />
          </View>
          <BodyText>{runtime.data.summary}</BodyText>
          <MetricRow label="Email" value={runtime.data.providers.emailMode} />
          <MetricRow label="Escrow" value={runtime.data.providers.escrowMode} />
        </SurfaceCard>
      ) : null}

      <SetupReadinessCard user={user} />

      {!accessToken ? (
        <EmptyState
          title="Signed out"
          body="Sign in to restore wallet state, workspace actions, and active contracts."
        />
      ) : null}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  cardHeading: {
    fontSize: 20,
    lineHeight: 26,
  },
});
