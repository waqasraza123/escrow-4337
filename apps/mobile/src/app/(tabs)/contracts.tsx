import { useQuery } from '@tanstack/react-query';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import {
  BodyText,
  EmptyState,
  Heading,
  MilestoneTimeline,
  ScrollScreen,
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
      <Heading tone="eyebrow">Escrow</Heading>
      <Heading>Contracts</Heading>
      <BodyText>
        Contract detail, delivery, dispute, release, and contractor join flows
        will branch from this native list.
      </BodyText>

      {!accessToken ? (
        <EmptyState
          title="Sign in required"
          body="Contracts are tied to your authenticated client or worker role."
        />
      ) : null}

      {jobs.isLoading ? <SkeletonCard /> : null}

      {jobs.data?.jobs.map(({ job }) => (
        <SurfaceCard key={job.id}>
          <StatusBadge label={job.status} tone={job.status === 'completed' ? 'success' : 'info'} />
          <Heading style={{ fontSize: 20, lineHeight: 26 }}>{job.title}</Heading>
          <BodyText>{job.description}</BodyText>
          <MilestoneTimeline milestones={job.milestones} />
        </SurfaceCard>
      ))}

      {accessToken && jobs.data?.jobs.length === 0 ? (
        <EmptyState
          title="No contracts yet"
          body="Start from marketplace hiring or create a direct escrow contract."
        />
      ) : null}
    </ScrollScreen>
  );
}
