import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import {
  BodyText,
  EmptyState,
  Heading,
  MetricRow,
  MilestoneTimeline,
  PrimaryButton,
  ScrollScreen,
  SectionHeader,
  SkeletonCard,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';

export default function ContractsRoute() {
  const { accessToken } = useSession();
  const jobs = useQuery({
    enabled: Boolean(accessToken),
    queryKey: ['jobs'],
    queryFn: () => api.listJobs(accessToken as string),
  });

  return (
    <ScrollScreen>
      <SectionHeader
        eyebrow="Escrow"
        title="Contracts"
        body="Track funded work, milestone posture, delivery evidence, and dispute readiness from one mobile list."
      />

      {!accessToken ? (
        <EmptyState
          title="Sign in required"
          body="Contracts are tied to your authenticated client or worker role."
          action={<PrimaryButton onPress={() => router.push('/sign-in')}>Sign in</PrimaryButton>}
        />
      ) : null}

      {jobs.isLoading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : null}

      {jobs.data?.jobs.map(({ job }, index) => (
        <SurfaceCard key={job.id} animated delay={index * 50} variant="elevated">
          <StatusBadge label={job.status} tone={job.status === 'completed' ? 'success' : 'info'} />
          <Heading size="section">{job.title}</Heading>
          <BodyText>{job.description}</BodyText>
          <MetricRow label="Funded" value={job.fundedAmount || 'Not funded'} />
          <MilestoneTimeline milestones={job.milestones} />
        </SurfaceCard>
      ))}

      {accessToken && jobs.data?.jobs.length === 0 ? (
        <EmptyState
          title="No contracts yet"
          body="Start from marketplace hiring or create a direct escrow contract."
        />
      ) : null}

      {accessToken && jobs.isError ? (
        <EmptyState
          title="Contracts unavailable"
          body="The contracts API could not be reached. Check the backend target and try again."
        />
      ) : null}
    </ScrollScreen>
  );
}
