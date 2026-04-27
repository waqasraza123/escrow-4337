import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  canApplyToOpportunity,
  canCreateOpportunity,
  formatTimestamp,
  getMarketplaceLaneLabel,
  resolveMarketplaceLane,
} from '@escrow4334/product-core';
import { NetworkActionNotice } from '@/features/network/NetworkActionNotice';
import { useNetworkActionGate } from '@/features/network/useNetworkActionGate';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import {
  BodyText,
  EmptyState,
  Field,
  Heading,
  ListCard,
  MetricRow,
  PrimaryButton,
  ScrollScreen,
  SectionHeader,
  SegmentedControl,
  SkeletonCard,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';

type MarketplaceTab = 'talent' | 'opportunities';

export default function MarketplaceRoute() {
  const { accessToken, user, setUser } = useSession();
  const networkGate = useNetworkActionGate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<MarketplaceTab>('talent');
  const [query, setQuery] = useState('');
  const search = useMemo(() => ({ q: query.trim(), limit: 12 }), [query]);
  const workspace = user?.activeWorkspace ?? null;

  const talent = useQuery({
    enabled: tab === 'talent',
    queryKey: ['marketplace', 'talent', search],
    queryFn: () => api.listMarketplaceProfiles(search),
  });

  const opportunities = useQuery({
    enabled: tab === 'opportunities',
    queryKey: ['marketplace', 'opportunities', search],
    queryFn: () => api.listMarketplaceOpportunities(search),
  });

  const analytics = useQuery({
    enabled: Boolean(accessToken),
    queryKey: ['marketplace', 'analytics', workspace?.workspaceId],
    queryFn: () => api.getMarketplaceAnalyticsOverview(accessToken as string),
  });

  const myApplications = useQuery({
    enabled: Boolean(accessToken && workspace?.capabilities.applyToOpportunity),
    queryKey: ['marketplace', 'applications', 'mine', workspace?.workspaceId],
    queryFn: () => api.listMyMarketplaceApplications(accessToken as string),
  });

  const myOpportunities = useQuery({
    enabled: Boolean(accessToken && workspace?.capabilities.createOpportunity),
    queryKey: ['marketplace', 'opportunities', 'mine', workspace?.workspaceId],
    queryFn: () => api.listMyMarketplaceOpportunities(accessToken as string),
  });

  const notifications = useQuery({
    enabled: Boolean(accessToken),
    queryKey: ['marketplace', 'notifications', workspace?.workspaceId],
    queryFn: () => api.listMarketplaceNotifications(accessToken as string),
  });

  const selectWorkspace = useMutation({
    mutationFn: async (workspaceId: string) => {
      if (!accessToken) {
        throw new Error('Sign in before switching workspaces.');
      }
      networkGate.requireOnline('Switching workspaces');

      return api.selectWorkspace(workspaceId, accessToken);
    },
    onSuccess: (response) => {
      if (user) {
        setUser({
          ...user,
          activeWorkspace: response.activeWorkspace,
          workspaces: response.workspaces,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error) => {
      Alert.alert(
        'Workspace switch failed',
        error instanceof Error ? error.message : 'The workspace could not be selected.',
      );
    },
  });

  const loading =
    (tab === 'talent' && talent.isLoading) || (tab === 'opportunities' && opportunities.isLoading);

  return (
    <ScrollScreen>
      <SectionHeader
        eyebrow="Discovery"
        title="Marketplace"
        body="Browse public profiles and scoped opportunities, then move into authenticated apply and workspace actions."
      />

      <MarketplaceWorkspacePanel
        analytics={analytics.data?.overview}
        applications={myApplications.data?.applications ?? []}
        applicationsLoading={myApplications.isLoading}
        notifications={notifications.data?.notifications ?? []}
        opportunities={myOpportunities.data?.opportunities ?? []}
        opportunitiesLoading={myOpportunities.isLoading}
        onSelectWorkspace={(workspaceId) => {
          try {
            networkGate.requireOnline('Switching workspaces');
            selectWorkspace.mutate(workspaceId);
          } catch (error) {
            Alert.alert(
              'Workspace switch unavailable',
              error instanceof Error ? error.message : 'Network state is unavailable.',
            );
          }
        }}
        selectWorkspacePending={selectWorkspace.isPending}
        user={user}
      />

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { label: 'Talent', value: 'talent' },
          { label: 'Opportunities', value: 'opportunities' },
        ]}
      />

      <Field
        autoCapitalize="none"
        label="Search"
        onChangeText={setQuery}
        placeholder="Skill, category, timezone"
        value={query}
      />

      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : null}

      {tab === 'talent'
        ? talent.data?.profiles.map((profile, index) => (
            <ListCard
              key={profile.slug}
              title={profile.displayName}
              body={profile.headline}
              eyebrow={profile.verificationLevel.replaceAll('_', ' ')}
              chips={profile.skills}
              meta={profile.availability}
              actionLabel="View profile"
              delay={index * 45}
              onPress={() =>
                router.push({
                  pathname: '/marketplace/profile/[slug]',
                  params: { slug: profile.slug },
                })
              }
            />
          ))
        : opportunities.data?.opportunities.map((opportunity, index) => (
            <ListCard
              key={opportunity.id}
              title={opportunity.title}
              body={opportunity.summary}
              eyebrow={opportunity.category}
              chips={opportunity.requiredSkills}
              meta={opportunity.status}
              actionLabel={
                accessToken && canApplyToOpportunity(workspace)
                  ? 'Review and apply'
                  : 'View opportunity'
              }
              delay={index * 45}
              onPress={() =>
                router.push({
                  pathname: '/marketplace/opportunity/[id]',
                  params: { id: opportunity.id },
                })
              }
            />
          ))}

      {(tab === 'talent' && talent.isError) ||
      (tab === 'opportunities' && opportunities.isError) ? (
        <EmptyState
          title="Marketplace unavailable"
          body="The marketplace API could not be reached. Check the backend target and try again."
        />
      ) : null}

      {!loading &&
      ((tab === 'talent' && talent.data?.profiles.length === 0) ||
        (tab === 'opportunities' && opportunities.data?.opportunities.length === 0)) ? (
        <EmptyState title="No matches" body="Try a broader skill, category, or timezone search." />
      ) : null}
    </ScrollScreen>
  );
}

function MarketplaceWorkspacePanel({
  analytics,
  applications,
  applicationsLoading,
  notifications,
  onSelectWorkspace,
  opportunities,
  opportunitiesLoading,
  selectWorkspacePending,
  user,
}: {
  analytics?: {
    summary: {
      applications: number;
      hires: number;
      activeContracts: number;
      savedSearches: number;
      searchImpressions: number;
      resultClicks: number;
    };
  };
  applications: Array<{
    id: string;
    status: string;
    updatedAt: number;
    opportunity: { title: string; ownerDisplayName: string };
  }>;
  applicationsLoading: boolean;
  notifications: Array<{
    id: string;
    title: string;
    detail: string;
    status: string;
    createdAt: number;
  }>;
  onSelectWorkspace: (workspaceId: string) => void;
  opportunities: Array<{
    id: string;
    title: string;
    status: string;
    applicationCount: number;
    updatedAt: number;
  }>;
  opportunitiesLoading: boolean;
  selectWorkspacePending: boolean;
  user: ReturnType<typeof useSession>['user'];
}) {
  if (!user) {
    return (
      <EmptyState
        title="Sign in for workspace actions"
        body="Native marketplace actions use your active client, freelancer, or agency workspace and verified wallet state."
        action={<PrimaryButton onPress={() => router.push('/sign-in')}>Sign in</PrimaryButton>}
      />
    );
  }

  const workspace = user.activeWorkspace;
  const lane = resolveMarketplaceLane(workspace);
  const unreadCount = notifications.filter((notification) => notification.status === 'unread').length;
  const latestApplication = applications[0];
  const latestOpportunity = opportunities[0];

  return (
    <>
      <SurfaceCard animated variant="elevated">
        <View style={styles.workspaceHeader}>
          <View style={styles.workspaceTitle}>
            <Heading size="section">{workspace?.label ?? 'Workspace not selected'}</Heading>
            <BodyText>{getMarketplaceLaneLabel(lane)} marketplace lane</BodyText>
          </View>
          <StatusBadge
            label={workspace?.organizationKind === 'agency' ? 'agency' : lane}
            tone={canApplyToOpportunity(workspace) || canCreateOpportunity(workspace) ? 'success' : 'warning'}
          />
        </View>

        {user.workspaces.length > 1 ? (
          <>
            <SegmentedControl
              value={workspace?.workspaceId ?? user.workspaces[0]?.workspaceId}
              onChange={(workspaceId) => {
                if (!selectWorkspacePending) {
                  onSelectWorkspace(workspaceId);
                }
              }}
              options={user.workspaces.map((candidate) => ({
                label:
                  candidate.organizationKind === 'agency'
                    ? `Agency ${candidate.label}`
                    : candidate.label,
                value: candidate.workspaceId,
              }))}
            />
            <NetworkActionNotice action="Workspace switching" />
          </>
        ) : null}

        <View style={styles.metricGrid}>
          <MetricRow label="Applications" value={analytics?.summary.applications ?? applications.length} />
          <MetricRow label="Hires" value={analytics?.summary.hires ?? 0} />
          <MetricRow label="Contracts" value={analytics?.summary.activeContracts ?? 0} />
          <MetricRow label="Unread" value={unreadCount} />
        </View>

        <BodyText>
          {canApplyToOpportunity(workspace)
            ? 'You can submit structured proposals from opportunity detail pages in this mobile app.'
            : canCreateOpportunity(workspace)
              ? 'Your client workspace can monitor posted opportunities and applicant conversion from mobile.'
              : 'Select a marketplace workspace with client or freelancer capabilities to unlock native actions.'}
        </BodyText>
      </SurfaceCard>

      {canApplyToOpportunity(workspace) ? (
        <SurfaceCard animated delay={70}>
          <View style={styles.workspaceHeader}>
            <Heading size="section">Application pipeline</Heading>
            <StatusBadge label={`${applications.length}`} tone="info" />
          </View>
          {applicationsLoading ? <BodyText>Loading application posture...</BodyText> : null}
          {latestApplication ? (
            <>
              <MetricRow label="Latest" value={latestApplication.opportunity.title} />
              <MetricRow label="Status" value={latestApplication.status.replaceAll('_', ' ')} />
              <MetricRow label="Updated" value={formatTimestamp(latestApplication.updatedAt)} />
            </>
          ) : (
            <BodyText>Find a published opportunity and submit a wallet-bound proposal.</BodyText>
          )}
        </SurfaceCard>
      ) : null}

      {canCreateOpportunity(workspace) ? (
        <SurfaceCard animated delay={90}>
          <View style={styles.workspaceHeader}>
            <Heading size="section">Client pipeline</Heading>
            <StatusBadge label={`${opportunities.length}`} tone="info" />
          </View>
          {opportunitiesLoading ? <BodyText>Loading client pipeline...</BodyText> : null}
          {latestOpportunity ? (
            <>
              <MetricRow label="Latest" value={latestOpportunity.title} />
              <MetricRow label="Applications" value={latestOpportunity.applicationCount} />
              <MetricRow label="Status" value={latestOpportunity.status.replaceAll('_', ' ')} />
            </>
          ) : (
            <BodyText>Published client opportunities will appear here with applicant posture.</BodyText>
          )}
        </SurfaceCard>
      ) : null}

      {notifications.length ? (
        <SurfaceCard animated delay={110}>
          <Heading size="section">Latest marketplace signal</Heading>
          <MetricRow label={notifications[0].title} value={formatTimestamp(notifications[0].createdAt)} />
          <BodyText numberOfLines={3}>{notifications[0].detail}</BodyText>
        </SurfaceCard>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  workspaceHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  workspaceTitle: {
    flex: 1,
    gap: 4,
  },
  metricGrid: {
    gap: 8,
  },
});
