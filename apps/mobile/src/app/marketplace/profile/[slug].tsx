import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/providers/api';
import {
  BodyText,
  ChipWrap,
  EmptyState,
  Heading,
  ScrollScreen,
  SkeletonCard,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';

export default function ProfileDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const profile = useQuery({
    enabled: Boolean(slug),
    queryKey: ['marketplace', 'profile', slug],
    queryFn: () => api.getMarketplaceProfile(slug),
  });

  return (
    <ScrollScreen>
      {profile.isLoading ? <SkeletonCard /> : null}
      {profile.data ? (
        <>
          <Heading tone="eyebrow">Talent profile</Heading>
          <Heading>{profile.data.profile.displayName}</Heading>
          <BodyText>{profile.data.profile.headline}</BodyText>
          <ChipWrap values={profile.data.profile.skills} />
          <SurfaceCard>
            <StatusBadge label={profile.data.profile.verificationLevel} tone="success" />
            <BodyText>{profile.data.profile.bio}</BodyText>
            <BodyText>
              Completed escrows: {profile.data.profile.completedEscrowCount}
            </BodyText>
          </SurfaceCard>
        </>
      ) : profile.isError ? (
        <EmptyState
          title="Profile unavailable"
          body="This profile could not be loaded from the API."
        />
      ) : null}
    </ScrollScreen>
  );
}
