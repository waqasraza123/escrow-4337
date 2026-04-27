import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { createOfflineSnapshotCacheKey } from '@/features/offline/offlineSnapshots';
import { OfflineSnapshotNotice, useOfflineSnapshot } from '@/features/offline/useOfflineSnapshot';
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

type MarketplaceProfileResponse = Awaited<ReturnType<typeof api.getMarketplaceProfile>>;

export default function ProfileDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const profile = useQuery({
    enabled: Boolean(slug),
    queryKey: ['marketplace', 'profile', slug],
    queryFn: () => api.getMarketplaceProfile(slug),
  });
  const profileSnapshot = useOfflineSnapshot<MarketplaceProfileResponse>({
    cacheKey: slug ? createOfflineSnapshotCacheKey('marketplace-profile', 'public', slug) : null,
    data: profile.data,
    enabled: Boolean(slug),
  });
  const useProfileSnapshot =
    !profile.data && Boolean(profileSnapshot.data) && (profile.isLoading || profile.isError);
  const profileData = profile.data ?? (useProfileSnapshot ? profileSnapshot.data : null);

  return (
    <ScrollScreen>
      {profile.isLoading && !profileData ? <SkeletonCard /> : null}
      {useProfileSnapshot ? (
        <OfflineSnapshotNotice cachedAt={profileSnapshot.cachedAt} subject="talent profile" />
      ) : null}
      {profileData ? (
        <>
          <SectionHeader
            eyebrow="Talent profile"
            title={profileData.profile.displayName}
            body={profileData.profile.headline}
          />
          <ChipWrap values={profileData.profile.skills} />

          <SurfaceCard animated variant="elevated">
            <StatusBadge
              label={profileData.profile.verificationLevel.replaceAll('_', ' ')}
              tone="success"
            />
            <BodyText>{profileData.profile.bio}</BodyText>
            <MetricRow
              label="Completed escrows"
              value={profileData.profile.completedEscrowCount}
            />
            <MetricRow
              label="Crypto readiness"
              value={profileData.profile.cryptoReadiness.replaceAll('_', ' ')}
            />
            <MetricRow label="Availability" value={profileData.profile.availability} />
          </SurfaceCard>

          <SurfaceCard animated delay={80}>
            <Heading size="section">Proof posture</Heading>
            <MetricRow
              label="Portfolio"
              value={`${profileData.profile.portfolioUrls.length} links`}
            />
            <MetricRow label="Proof artifacts" value={profileData.profile.proofArtifacts.length} />
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
