import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { formatAmount, type JobsListResponse } from '@escrow4334/product-core';
import {
  OfflineSnapshotNotice,
  useOfflineSnapshot,
} from '@/features/offline/useOfflineSnapshot';
import { useNetworkActionGate } from '@/features/network/useNetworkActionGate';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import {
  EmptyState,
  ListCard,
  PrimaryButton,
  ScrollScreen,
  SectionHeader,
  SecondaryButton,
  SkeletonCard,
  SurfaceCard,
} from '@/ui/primitives';

export default function ContractsRoute() {
  const { accessToken, user } = useSession();
  const networkGate = useNetworkActionGate();
  const jobs = useQuery({
    enabled: Boolean(accessToken),
    queryKey: ['jobs'],
    queryFn: () => api.listJobs(accessToken as string),
  });
  const jobsSnapshot = useOfflineSnapshot<JobsListResponse>({
    cacheKey: user ? `jobs:${user.id}` : null,
    data: jobs.data,
    enabled: Boolean(user),
  });
  const snapshotAvailable = Boolean(jobsSnapshot.data);
  const useJobsSnapshot =
    !jobs.data &&
    snapshotAvailable &&
    (networkGate.actionBlocked || jobs.isError || jobs.isLoading);
  const jobsData = jobs.data ?? (useJobsSnapshot ? jobsSnapshot.data : null);
  const jobRows = jobsData?.jobs ?? [];

  return (
    <ScrollScreen>
      <SectionHeader
        eyebrow="Escrow"
        title="Contracts"
        body="Track funded work, milestone posture, delivery evidence, and dispute readiness from one mobile list."
      />

      {accessToken ? (
        <SurfaceCard animated variant="elevated">
          <SecondaryButton onPress={() => router.push('/contracts/new')}>
            Create direct contract
          </SecondaryButton>
          <SecondaryButton onPress={() => router.push('/contracts/join')}>
            Join with invite
          </SecondaryButton>
        </SurfaceCard>
      ) : null}

      {!accessToken ? (
        <EmptyState
          title="Sign in required"
          body="Contracts are tied to your authenticated client or worker role."
          action={<PrimaryButton onPress={() => router.push('/sign-in')}>Sign in</PrimaryButton>}
        />
      ) : null}

      {useJobsSnapshot ? (
        <OfflineSnapshotNotice cachedAt={jobsSnapshot.cachedAt} subject="contracts" />
      ) : null}

      {jobs.isLoading && !jobsData ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : null}

      {jobRows.map(({ job }, index) => (
        <ListCard
          key={job.id}
          title={job.title}
          body={job.description}
          eyebrow={job.category}
          chips={job.milestones.map((milestone) => milestone.status)}
          meta={`${job.status} · ${formatAmount(job.fundedAmount)}`}
          actionLabel="Open contract"
          delay={index * 50}
          onPress={() =>
            router.push({
              pathname: '/contracts/[id]',
              params: { id: job.id },
            })
          }
        />
      ))}

      {accessToken && jobsData?.jobs.length === 0 ? (
        <EmptyState
          title="No contracts yet"
          body="Start from marketplace hiring or create a direct escrow contract."
          action={
            <PrimaryButton onPress={() => router.push('/contracts/new')}>
              Create direct contract
            </PrimaryButton>
          }
        />
      ) : null}

      {accessToken && jobs.isError && !jobsData ? (
        <EmptyState
          title="Contracts unavailable"
          body="The contracts API could not be reached. Check the backend target and try again."
        />
      ) : null}
    </ScrollScreen>
  );
}
