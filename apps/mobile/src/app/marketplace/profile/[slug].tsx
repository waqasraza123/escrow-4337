import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/providers/api';
import {
  BodyText,
  ChipWrap,
  EmptyState,
  Heading,
  MetricRow,
  ScrollScreen,
  SectionHeader,
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
          <SectionHeader
            eyebrow="Talent profile"
            title={profile.data.profile.displayName}
            body={profile.data.profile.headline}
          />
          <ChipWrap values={profile.data.profile.skills} />

          <SurfaceCard animated variant="elevated">
            <StatusBadge
              label={profile.data.profile.verificationLevel.replaceAll('_', ' ')}
              tone="success"
            />
            <BodyText>{profile.data.profile.bio}</BodyText>
            <MetricRow
              label="Completed escrows"
              value={profile.data.profile.completedEscrowCount}
            />
            <MetricRow
              label="Crypto readiness"
              value={profile.data.profile.cryptoReadiness.replaceAll('_', ' ')}
            />
            <MetricRow label="Availability" value={profile.data.profile.availability} />
          </SurfaceCard>

          <SurfaceCard animated delay={80}>
            <Heading size="section">Proof posture</Heading>
            <MetricRow
              label="Portfolio"
              value={`${profile.data.profile.portfolioUrls.length} links`}
            />
            <MetricRow label="Proof artifacts" value={profile.data.profile.proofArtifacts.length} />
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
