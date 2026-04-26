import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import {
  BodyText,
  BottomActionBar,
  ChipWrap,
  EmptyState,
  Heading,
  MetricRow,
  PrimaryButton,
  ScrollScreen,
  SectionHeader,
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
    <ScrollScreen
      footer={
        opportunity.data ? (
          <BottomActionBar>
            <PrimaryButton
              onPress={() => {
                if (!user) {
                  router.push('/sign-in');
                  return;
                }
                Alert.alert(
                  'Apply from the web workspace',
                  'Native proposal submission is not enabled in this mobile slice yet. Use the authenticated web workspace for the full structured application flow.',
                );
              }}
            >
              {user ? 'Apply from web workspace' : 'Sign in to apply'}
            </PrimaryButton>
          </BottomActionBar>
        ) : undefined
      }
    >
      {opportunity.isLoading ? <SkeletonCard /> : null}
      {opportunity.data ? (
        <>
          <SectionHeader
            eyebrow="Opportunity"
            title={opportunity.data.opportunity.title}
            body={opportunity.data.opportunity.summary}
          />
          <ChipWrap values={opportunity.data.opportunity.requiredSkills} />

          <SurfaceCard animated variant="elevated">
            <StatusBadge label={opportunity.data.opportunity.status} tone="info" />
            <BodyText>{opportunity.data.opportunity.description}</BodyText>
            <MetricRow
              label="Budget"
              value={`${opportunity.data.opportunity.budgetMin || 'Open'} to ${
                opportunity.data.opportunity.budgetMax || 'Open'
              }`}
            />
            <MetricRow label="Applications" value={opportunity.data.opportunity.applicationCount} />
            <MetricRow
              label="Engagement"
              value={opportunity.data.opportunity.engagementType.replaceAll('_', ' ')}
            />
          </SurfaceCard>

          <SurfaceCard animated delay={80}>
            <Heading size="section">Delivery expectations</Heading>
            <ChipWrap values={opportunity.data.opportunity.outcomes.slice(0, 4)} />
            <BodyText>{opportunity.data.opportunity.timeline}</BodyText>
          </SurfaceCard>
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
