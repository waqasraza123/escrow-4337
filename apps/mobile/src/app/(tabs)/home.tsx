import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import { SetupReadinessCard } from '@/features/setup/SetupReadinessCard';
import {
  BodyText,
  EmptyState,
  Heading,
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
      <Heading tone="eyebrow">Workspace</Heading>
      <Heading>{user?.activeWorkspace?.label || 'Milestone Escrow'}</Heading>
      <BodyText>
        Mobile starts from the escrow tasks that matter most: setup, browse,
        contracts, delivery, and disputes.
      </BodyText>

      {runtime.isLoading ? (
        <SkeletonCard />
      ) : runtime.data ? (
        <SurfaceCard>
          <View style={styles.row}>
            <Heading style={styles.cardHeading}>Runtime</Heading>
            <StatusBadge
              label={runtime.data.profile}
              tone={runtime.data.profile === 'deployment-like' ? 'success' : 'warning'}
            />
          </View>
          <BodyText>{runtime.data.summary}</BodyText>
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
