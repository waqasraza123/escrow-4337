import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import {
  BodyText,
  ChipWrap,
  EmptyState,
  Heading,
  PrimaryButton,
  ScrollScreen,
  SkeletonCard,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';

export default function OpportunityDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const opportunity = useQuery({
    enabled: Boolean(id),
    queryKey: ['marketplace', 'opportunity', id],
    queryFn: () => api.getMarketplaceOpportunity(id),
  });

  return (
    <ScrollScreen>
      {opportunity.isLoading ? <SkeletonCard /> : null}
      {opportunity.data ? (
        <>
          <Heading tone="eyebrow">Opportunity</Heading>
          <Heading>{opportunity.data.opportunity.title}</Heading>
          <BodyText>{opportunity.data.opportunity.summary}</BodyText>
          <ChipWrap values={opportunity.data.opportunity.requiredSkills} />
          <SurfaceCard>
            <StatusBadge label={opportunity.data.opportunity.status} tone="info" />
            <BodyText>{opportunity.data.opportunity.description}</BodyText>
            <BodyText>
              Budget: {opportunity.data.opportunity.budgetMin || 'Open'} to{' '}
              {opportunity.data.opportunity.budgetMax || 'Open'}
            </BodyText>
            <BodyText>
              Applications: {opportunity.data.opportunity.applicationCount}
            </BodyText>
          </SurfaceCard>
          <PrimaryButton
            onPress={() => {
              if (!user) {
                router.push('/sign-in');
              }
            }}
          >
            {user ? 'Apply path ready' : 'Sign in to apply'}
          </PrimaryButton>
        </>
      ) : opportunity.isError ? (
        <EmptyState
          title="Opportunity unavailable"
          body="This opportunity could not be loaded from the API."
        />
      ) : null}
    </ScrollScreen>
  );
}
