import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  canApplyToOpportunity,
  canCreateOpportunity,
  formatTimestamp,
  getMarketplaceLaneLabel,
  resolveMarketplaceLane,
} from '@escrow4334/product-core';
import { createOfflineSnapshotCacheKey } from '@/features/offline/offlineSnapshots';
import { OfflineSnapshotNotice, useOfflineSnapshot } from '@/features/offline/useOfflineSnapshot';
import { NetworkActionNotice } from '@/features/network/NetworkActionNotice';
import { useNetworkActionGate } from '@/features/network/useNetworkActionGate';
import { api } from '@/providers/api';
import { useSession } from '@/providers/session';
import {
  BodyText,
  EmptyState,
  Field,
  Heading,
  HeroSceneCard,
  ListCard,
  MetricRow,
  PrimaryButton,
  ScrollScreen,
  SegmentedControl,
  SkeletonCard,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';

type MarketplaceTab = 'talent' | 'opportunities';
type MarketplaceTalentResponse = Awaited<ReturnType<typeof api.listMarketplaceProfiles>>;
type MarketplaceOpportunitiesResponse = Awaited<
  ReturnType<typeof api.listMarketplaceOpportunities>
>;
type MarketplaceTalentSearchResult = Awaited<
  ReturnType<typeof api.searchMarketplaceTalent>
>['results'][number];
type MarketplaceOpportunitySearchResult = Awaited<
  ReturnType<typeof api.searchMarketplaceOpportunities>
>['results'][number];
type MarketplaceAnalyticsResponse = Awaited<
  ReturnType<typeof api.getMarketplaceAnalyticsOverview>
>;
type MarketplaceApplicationsResponse = Awaited<
  ReturnType<typeof api.listMyMarketplaceApplications>
>;
type MarketplaceClientOpportunitiesResponse = Awaited<
  ReturnType<typeof api.listMyMarketplaceOpportunities>
>;
type MarketplaceNotificationsResponse = Awaited<
  ReturnType<typeof api.listMarketplaceNotifications>
>;
type MarketplaceNotificationPreferencesResponse = Awaited<
  ReturnType<typeof api.getMarketplaceNotificationPreferences>
>;
type MarketplaceDigestsResponse = Awaited<
  ReturnType<typeof api.listMarketplaceDigests>
>;
type MarketplaceDigestDispatchRunsResponse = Awaited<
  ReturnType<typeof api.listMarketplaceDigestDispatchRuns>
>;
type MarketplaceNotificationPreferencePatch = Parameters<
  typeof api.updateMarketplaceNotificationPreferences
>[0];
type MarketplaceDigestDispatchOptions = Parameters<
  typeof api.dispatchMarketplaceDigests
>[0];
type MarketplaceDigestGenerateOptions = Parameters<
  typeof api.generateMarketplaceDigest
>[0];

function createMarketplaceSearchSnapshotId(search: { q: string; limit: number }) {
  return `q=${encodeURIComponent(search.q.trim().toLowerCase())}&limit=${search.limit}`;
}

export default function MarketplaceRoute() {
  const { accessToken, user, setUser } = useSession();
  const networkGate = useNetworkActionGate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<MarketplaceTab>('talent');
  const [query, setQuery] = useState('');
  const search = useMemo(() => ({ q: query.trim(), limit: 12 }), [query]);
  const workspace = user?.activeWorkspace ?? null;
  const snapshotOwnerId = user?.id ?? 'public';
  const searchSnapshotId = useMemo(() => createMarketplaceSearchSnapshotId(search), [search]);
  const workspaceSnapshotId = workspace?.workspaceId ?? 'no-workspace';

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

  const savedSearches = useQuery({
    enabled: Boolean(accessToken),
    queryKey: [
      'marketplace',
      'saved-searches',
      tab,
      workspace?.workspaceId ?? 'no-workspace',
    ],
    queryFn: () =>
      api.listMarketplaceSavedSearches(
        {
          kind: tab === 'talent' ? 'talent' : 'opportunity',
        },
        accessToken as string,
      ),
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
  const notificationPreferences = useQuery({
    enabled: Boolean(accessToken),
    queryKey: [
      'marketplace',
      'notification-preferences',
      workspace?.workspaceId ?? 'no-workspace',
    ],
    queryFn: () => api.getMarketplaceNotificationPreferences(accessToken as string),
  });
  const marketplaceDigests = useQuery({
    enabled: Boolean(accessToken),
    queryKey: ['marketplace', 'digests', workspace?.workspaceId ?? 'no-workspace'],
    queryFn: () => api.listMarketplaceDigests(accessToken as string),
  });
  const marketplaceDigestDispatchRuns = useQuery({
    enabled: Boolean(accessToken),
    queryKey: ['marketplace', 'digest-dispatch-runs', workspace?.workspaceId ?? 'no-workspace'],
    queryFn: () => api.listMarketplaceDigestDispatchRuns(accessToken as string),
  });
  const [savedTalentRerunResults, setSavedTalentRerunResults] =
    useState<MarketplaceTalentSearchResult[] | null>(null);
  const [savedOpportunityRerunResults, setSavedOpportunityRerunResults] =
    useState<MarketplaceOpportunitySearchResult[] | null>(null);
  const [notificationPreferenceDraft, setNotificationPreferenceDraft] =
    useState<MarketplaceNotificationPreferencePatch>({});
  const [digestDispatchMode, setDigestDispatchMode] =
    useState<NonNullable<MarketplaceDigestDispatchOptions['mode']>>('due');
  const talentSnapshot = useOfflineSnapshot<MarketplaceTalentResponse>({
    cacheKey: createOfflineSnapshotCacheKey(
      'marketplace-talent',
      snapshotOwnerId,
      searchSnapshotId,
    ),
    data: talent.data,
    enabled: tab === 'talent',
  });
  const opportunitiesSnapshot = useOfflineSnapshot<MarketplaceOpportunitiesResponse>({
    cacheKey: createOfflineSnapshotCacheKey(
      'marketplace-opportunities',
      snapshotOwnerId,
      searchSnapshotId,
    ),
    data: opportunities.data,
    enabled: tab === 'opportunities',
  });
  const analyticsSnapshot = useOfflineSnapshot<MarketplaceAnalyticsResponse>({
    cacheKey: user
      ? createOfflineSnapshotCacheKey(
          'marketplace-analytics',
          user.id,
          workspaceSnapshotId,
        )
      : null,
    data: analytics.data,
    enabled: Boolean(user),
  });
  const applicationsSnapshot = useOfflineSnapshot<MarketplaceApplicationsResponse>({
    cacheKey: user
      ? createOfflineSnapshotCacheKey(
          'marketplace-applications',
          user.id,
          workspaceSnapshotId,
        )
      : null,
    data: myApplications.data,
    enabled: Boolean(user && workspace?.capabilities.applyToOpportunity),
  });
  const clientOpportunitiesSnapshot =
    useOfflineSnapshot<MarketplaceClientOpportunitiesResponse>({
      cacheKey: user
        ? createOfflineSnapshotCacheKey(
            'marketplace-client-opportunities',
            user.id,
            workspaceSnapshotId,
          )
        : null,
      data: myOpportunities.data,
      enabled: Boolean(user && workspace?.capabilities.createOpportunity),
    });
  const notificationsSnapshot = useOfflineSnapshot<MarketplaceNotificationsResponse>({
    cacheKey: user
      ? createOfflineSnapshotCacheKey(
          'marketplace-notifications',
          user.id,
          workspaceSnapshotId,
        )
      : null,
    data: notifications.data,
    enabled: Boolean(user),
  });

  const useTalentSnapshot =
    !talent.data &&
    Boolean(talentSnapshot.data) &&
    (networkGate.actionBlocked || talent.isError || talent.isLoading);
  const useOpportunitiesSnapshot =
    !opportunities.data &&
    Boolean(opportunitiesSnapshot.data) &&
    (networkGate.actionBlocked || opportunities.isError || opportunities.isLoading);
  const useAnalyticsSnapshot =
    !analytics.data &&
    Boolean(analyticsSnapshot.data) &&
    (networkGate.actionBlocked || analytics.isError || analytics.isLoading);
  const useApplicationsSnapshot =
    !myApplications.data &&
    Boolean(applicationsSnapshot.data) &&
    (networkGate.actionBlocked || myApplications.isError || myApplications.isLoading);
  const useClientOpportunitiesSnapshot =
    !myOpportunities.data &&
    Boolean(clientOpportunitiesSnapshot.data) &&
    (networkGate.actionBlocked || myOpportunities.isError || myOpportunities.isLoading);
  const useNotificationsSnapshot =
    !notifications.data &&
    Boolean(notificationsSnapshot.data) &&
    (networkGate.actionBlocked || notifications.isError || notifications.isLoading);
  const talentData = talent.data ?? (useTalentSnapshot ? talentSnapshot.data : null);
  const opportunitiesData =
    opportunities.data ?? (useOpportunitiesSnapshot ? opportunitiesSnapshot.data : null);
  const savedSearchesData = savedSearches.data;
  const analyticsData = analytics.data ?? (useAnalyticsSnapshot ? analyticsSnapshot.data : null);
  const applicationsData =
    myApplications.data ?? (useApplicationsSnapshot ? applicationsSnapshot.data : null);
  const clientOpportunitiesData =
    myOpportunities.data ??
    (useClientOpportunitiesSnapshot ? clientOpportunitiesSnapshot.data : null);
  const notificationsData =
    notifications.data ?? (useNotificationsSnapshot ? notificationsSnapshot.data : null);
  const notificationPreferencesData =
    notificationPreferences.data ?? null;
  const marketplaceDigestsData = marketplaceDigests.data?.digests ?? [];
  const marketplaceDigestDispatchRunsData = marketplaceDigestDispatchRuns.data?.runs ?? [];
  const latestDigest = marketplaceDigestsData[0] ?? null;
  const latestDigestDispatchRun = marketplaceDigestDispatchRunsData[0] ?? null;
  const workspaceSnapshotCachedAt = [
    useAnalyticsSnapshot ? analyticsSnapshot.cachedAt : null,
    useApplicationsSnapshot ? applicationsSnapshot.cachedAt : null,
    useClientOpportunitiesSnapshot ? clientOpportunitiesSnapshot.cachedAt : null,
    useNotificationsSnapshot ? notificationsSnapshot.cachedAt : null,
  ]
    .filter((cachedAt): cachedAt is number => typeof cachedAt === 'number')
    .sort((left, right) => right - left)[0] ?? null;

  useEffect(() => {
    setSavedTalentRerunResults(null);
    setSavedOpportunityRerunResults(null);
  }, [tab, query]);

  useEffect(() => {
    const preferences = notificationPreferences.data?.preferences;
    if (!preferences) {
      return;
    }
    setNotificationPreferenceDraft({
      digestCadence: preferences.digestCadence,
      talentInvitesEnabled: preferences.talentInvitesEnabled,
      applicationActivityEnabled: preferences.applicationActivityEnabled,
      interviewMessagesEnabled: preferences.interviewMessagesEnabled,
      offerActivityEnabled: preferences.offerActivityEnabled,
      reviewActivityEnabled: preferences.reviewActivityEnabled,
      automationActivityEnabled: preferences.automationActivityEnabled,
      lifecycleDigestEnabled: preferences.lifecycleDigestEnabled,
      analyticsDigestEnabled: preferences.analyticsDigestEnabled,
    });
  }, [notificationPreferences.data?.preferences.updatedAt]);

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

  const rerunSavedSearch = useMutation({
    mutationFn: async (searchId: string) => {
      if (!accessToken) {
        throw new Error('Sign in before rerunning searches.');
      }

      networkGate.requireOnline('Rerunning saved search');

      return api.rerunMarketplaceSavedSearch(searchId, accessToken);
    },
    onSuccess: (response) => {
      if (response.kind === 'talent') {
        setSavedTalentRerunResults(response.results);
        setSavedOpportunityRerunResults(null);
        setTab('talent');
      } else {
        setSavedOpportunityRerunResults(response.results);
        setSavedTalentRerunResults(null);
        setTab('opportunities');
      }
      queryClient.invalidateQueries({
        queryKey: ['marketplace', 'saved-searches', 'talent', workspace?.workspaceId ?? 'no-workspace'],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'marketplace',
          'saved-searches',
          'opportunities',
          workspace?.workspaceId ?? 'no-workspace',
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ['marketplace', response.kind === 'talent' ? 'talent' : 'opportunities'],
      });
    },
    onError: (error) => {
      Alert.alert(
        'Saved search rerun failed',
        error instanceof Error
          ? error.message
          : 'The saved search could not be rerun at this time.',
      );
    },
  });

  const deleteSavedSearch = useMutation({
    mutationFn: async (searchId: string) => {
      if (!accessToken) {
        throw new Error('Sign in before deleting saved searches.');
      }

      networkGate.requireOnline('Deleting saved search');

      return api.deleteMarketplaceSavedSearch(searchId, accessToken);
    },
    onSuccess: () => {
      setSavedTalentRerunResults(null);
      setSavedOpportunityRerunResults(null);
      queryClient.invalidateQueries({
        queryKey: ['marketplace', 'saved-searches', tab, workspace?.workspaceId ?? 'no-workspace'],
      });
    },
    onError: (error) => {
      Alert.alert(
        'Saved search delete failed',
        error instanceof Error
          ? error.message
          : 'The saved search could not be deleted at this time.',
      );
    },
  });

  const updateNotificationPreferences = useMutation({
    mutationFn: async (input: MarketplaceNotificationPreferencePatch) => {
      if (!accessToken) {
        throw new Error('Sign in before saving marketplace alert settings.');
      }

      networkGate.requireOnline('Saving marketplace alert settings');

      return api.updateMarketplaceNotificationPreferences(input, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          'marketplace',
          'notification-preferences',
          workspace?.workspaceId ?? 'no-workspace',
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ['marketplace', 'notifications', workspace?.workspaceId ?? 'no-workspace'],
      });
      queryClient.invalidateQueries({
        queryKey: ['marketplace', 'digests', workspace?.workspaceId ?? 'no-workspace'],
      });
      queryClient.invalidateQueries({
        queryKey: ['marketplace', 'digest-dispatch-runs', workspace?.workspaceId ?? 'no-workspace'],
      });
    },
    onError: (error) => {
      Alert.alert(
        'Marketplace alert settings failed',
        error instanceof Error
          ? error.message
          : 'Marketplace alert preferences could not be updated.',
      );
    },
  });

  const dispatchMarketplaceDigests = useMutation({
    mutationFn: async (input: MarketplaceDigestDispatchOptions) => {
      if (!accessToken) {
        throw new Error('Sign in before dispatching digest runs.');
      }

      networkGate.requireOnline('Dispatching marketplace digests');

      return api.dispatchMarketplaceDigests(input, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['marketplace', 'digest-dispatch-runs', workspace?.workspaceId ?? 'no-workspace'],
      });
      queryClient.invalidateQueries({
        queryKey: ['marketplace', 'digests', workspace?.workspaceId ?? 'no-workspace'],
      });
    },
    onError: (error) => {
      Alert.alert(
        'Digest dispatch failed',
        error instanceof Error ? error.message : 'Could not dispatch marketplace digests.',
      );
    },
  });

  const generateMarketplaceDigest = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error('Sign in before generating marketplace digests.');
      }

      networkGate.requireOnline('Generating marketplace digest');

      const input: MarketplaceDigestGenerateOptions = {
        cadence: notificationPreferenceDraft.digestCadence,
      };
      return api.generateMarketplaceDigest(input, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['marketplace', 'digests', workspace?.workspaceId ?? 'no-workspace'],
      });
    },
    onError: (error) => {
      Alert.alert(
        'Digest generation failed',
        error instanceof Error
          ? error.message
          : 'Could not generate a marketplace digest.',
      );
    },
  });

  const setNotificationPreferenceBoolean = <
    T extends keyof Pick<
      MarketplaceNotificationPreferencePatch,
      | 'talentInvitesEnabled'
      | 'applicationActivityEnabled'
      | 'interviewMessagesEnabled'
      | 'offerActivityEnabled'
      | 'reviewActivityEnabled'
      | 'automationActivityEnabled'
      | 'lifecycleDigestEnabled'
      | 'analyticsDigestEnabled'
    >,
  >(
    key: T,
    value: NonNullable<MarketplaceNotificationPreferencePatch[T]>,
  ) => {
    setNotificationPreferenceDraft((current) => ({ ...current, [key]: value }));
  };

  const saveNotificationPreferences = () => {
    const draft = { ...notificationPreferenceDraft };
    updateNotificationPreferences.mutate(draft);
  };

  const loading =
    (tab === 'talent' && talent.isLoading && !talentData) ||
    (tab === 'opportunities' && opportunities.isLoading && !opportunitiesData);
  const isShowingRerunResults =
    tab === 'talent'
      ? savedTalentRerunResults !== null
      : savedOpportunityRerunResults !== null;
  const activeResultCount =
    tab === 'talent'
      ? isShowingRerunResults
        ? savedTalentRerunResults?.length ?? 0
        : talentData?.profiles.length ?? 0
      : isShowingRerunResults
        ? savedOpportunityRerunResults?.length ?? 0
        : opportunitiesData?.opportunities.length ?? 0;

  const hasNotificationPreferenceDraft =
    notificationPreferences.data && Boolean(notificationPreferenceDraft.digestCadence);
  const canSaveNotificationPreferences =
    hasNotificationPreferenceDraft && !updateNotificationPreferences.isPending;
  const canDispatchDigests = Boolean(workspace && accessToken);
  const preferenceRows: Array<{
    key: keyof Pick<
      MarketplaceNotificationPreferencePatch,
      | 'talentInvitesEnabled'
      | 'applicationActivityEnabled'
      | 'interviewMessagesEnabled'
      | 'offerActivityEnabled'
      | 'reviewActivityEnabled'
      | 'automationActivityEnabled'
      | 'lifecycleDigestEnabled'
      | 'analyticsDigestEnabled'
    >;
    label: string;
    description: string;
  }> = [
    {
      key: 'talentInvitesEnabled',
      label: 'Talent invite alerts',
      description: 'Notify on new talent invite activity.',
    },
    {
      key: 'applicationActivityEnabled',
      label: 'Application activity',
      description: 'Notify on application status and submission changes.',
    },
    {
      key: 'interviewMessagesEnabled',
      label: 'Interview messages',
      description: 'Notify when interview messages are posted.',
    },
    {
      key: 'offerActivityEnabled',
      label: 'Offer activity',
      description: 'Notify on offer creation and responses.',
    },
    {
      key: 'reviewActivityEnabled',
      label: 'Review activity',
      description: 'Notify on contract review updates.',
    },
    {
      key: 'automationActivityEnabled',
      label: 'Automation digest',
      description: 'Notify on automation run updates.',
    },
    {
      key: 'lifecycleDigestEnabled',
      label: 'Lifecycle digest',
      description: 'Notify from lifecycle digest summaries.',
    },
    {
      key: 'analyticsDigestEnabled',
      label: 'Analytics digest',
      description: 'Notify on marketplace analytics and performance reports.',
    },
  ];

  return (
    <ScrollScreen>
      <HeroSceneCard
        eyebrow="Discovery"
        title="Marketplace"
        body="Browse public profiles and scoped opportunities, then move into authenticated apply and workspace actions."
        signals={[
          {
            label: 'Results',
            value: activeResultCount,
            tone: activeResultCount > 0 ? 'success' : 'muted',
          },
          {
            label: 'Lane',
            value: workspace
              ? getMarketplaceLaneLabel(resolveMarketplaceLane(workspace))
              : 'Public',
            tone: workspace ? 'success' : 'warning',
          },
          {
            label: 'Alerts',
            value: latestDigest ? 'Digest ready' : 'Inbox live',
            tone: latestDigest ? 'success' : 'muted',
          },
          {
            label: 'Network',
            value: networkGate.actionBlocked ? 'Offline-safe' : 'Live',
            tone: networkGate.actionBlocked ? 'warning' : 'success',
          },
        ]}
      />

      <MarketplaceWorkspacePanel
        analytics={analyticsData?.overview}
        applications={applicationsData?.applications ?? []}
        applicationsLoading={myApplications.isLoading && !applicationsData}
        notifications={notificationsData?.notifications ?? []}
        opportunities={clientOpportunitiesData?.opportunities ?? []}
        opportunitiesLoading={myOpportunities.isLoading && !clientOpportunitiesData}
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
      {workspaceSnapshotCachedAt ? (
        <OfflineSnapshotNotice
          cachedAt={workspaceSnapshotCachedAt}
          subject="marketplace workspace summary"
        />
      ) : null}

      {accessToken && notificationPreferences.data ? (
        <SurfaceCard animated variant="elevated">
          <Heading size="section">Marketplace alerts</Heading>
          <BodyText style={styles.workspaceLabel}>
            Set digest cadence and control what surfaces feed your marketplace inbox.
          </BodyText>

          <BodyText>Digest cadence</BodyText>
          <SegmentedControl
            value={notificationPreferenceDraft.digestCadence ?? 'manual'}
            onChange={(value) =>
              setNotificationPreferenceDraft((current) => ({
                ...current,
                digestCadence: value as 'manual' | 'daily' | 'weekly',
              }))
            }
            options={[
              { label: 'Manual', value: 'manual' },
              { label: 'Daily', value: 'daily' },
              { label: 'Weekly', value: 'weekly' },
            ]}
          />

          <View style={styles.alertToggleSection}>
            <BodyText>Notification categories</BodyText>
            <View style={styles.alertToggleList}>
              {preferenceRows.map((item) => (
                <View key={item.key} style={styles.alertToggleRow}>
                  <View style={styles.alertToggleCopy}>
                    <BodyText>{item.label}</BodyText>
                    <BodyText>{item.description}</BodyText>
                  </View>
                  <SegmentedControl
                    value={
                      notificationPreferenceDraft[item.key] ? 'enabled' : 'disabled'
                    }
                    onChange={(value) =>
                      setNotificationPreferenceBoolean(
                        item.key,
                        value === 'enabled',
                      )
                    }
                    options={[
                      { label: 'On', value: 'enabled' },
                      { label: 'Off', value: 'disabled' },
                    ]}
                  />
                </View>
              ))}
            </View>
          </View>

          <PrimaryButton
            onPress={() => saveNotificationPreferences()}
            loading={updateNotificationPreferences.isPending}
            disabled={!canSaveNotificationPreferences}
            style={styles.alertActionPrimary}
          >
            Save alert settings
          </PrimaryButton>

          <View style={styles.alertActionRow}>
            <SegmentedControl
              value={digestDispatchMode}
              onChange={(value) =>
                setDigestDispatchMode(value as NonNullable<MarketplaceDigestDispatchOptions['mode']>)
              }
              options={[
                { label: 'Due', value: 'due' },
                { label: 'All enabled', value: 'all_enabled' },
              ]}
            />
            <PrimaryButton
              onPress={() =>
                dispatchMarketplaceDigests.mutate({
                  mode: digestDispatchMode,
                  trigger: 'manual',
                })
              }
              loading={dispatchMarketplaceDigests.isPending}
              disabled={!canDispatchDigests}
              style={styles.alertActionSecondary}
            >
              Dispatch digests
            </PrimaryButton>
            <PrimaryButton
              onPress={() => generateMarketplaceDigest.mutate()}
              loading={generateMarketplaceDigest.isPending}
              disabled={!notificationPreferences.data}
              style={styles.alertActionSecondary}
            >
              Generate digest now
            </PrimaryButton>
          </View>

          {latestDigest ? (
            <View style={styles.alertSummary}>
              <BodyText>Latest digest</BodyText>
              <MetricRow
                label={latestDigest.title}
                value={`${latestDigest.cadence} • ${latestDigest.status}`}
              />
              <BodyText numberOfLines={3}>{latestDigest.summary}</BodyText>
            </View>
          ) : null}
          {latestDigestDispatchRun ? (
            <View style={styles.alertSummary}>
              <BodyText>Latest dispatch</BodyText>
              <MetricRow
                label={latestDigestDispatchRun.trigger === 'manual' ? 'Manual run' : 'Scheduled run'}
                value={`${latestDigestDispatchRun.dispatchedCount} delivered`}
              />
              <BodyText numberOfLines={2}>{latestDigestDispatchRun.summary}</BodyText>
            </View>
          ) : null}

          {marketplaceDigests.isLoading && !marketplaceDigestsData.length ? (
            <BodyText>Loading digests…</BodyText>
          ) : null}
          {marketplaceDigestDispatchRuns.isLoading &&
          !marketplaceDigestDispatchRunsData.length ? (
            <BodyText>Loading dispatch runs…</BodyText>
          ) : null}
        </SurfaceCard>
      ) : null}

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
      {useTalentSnapshot ? (
        <OfflineSnapshotNotice cachedAt={talentSnapshot.cachedAt} subject="talent results" />
      ) : null}
      {useOpportunitiesSnapshot ? (
        <OfflineSnapshotNotice
          cachedAt={opportunitiesSnapshot.cachedAt}
          subject="opportunity results"
        />
      ) : null}
      {accessToken && savedSearchesData?.searches.length ? (
        <SurfaceCard animated variant="elevated">
          <Heading size="section">Saved searches</Heading>
          <BodyText style={styles.workspaceLabel}>Quickly rerun, inspect, or clean up saved searches.</BodyText>
          {savedSearchesData.searches.map((search) => (
            <View key={search.id} style={styles.listItemRow}>
              <View style={styles.savedSearchCard}>
                <BodyText>{search.label}</BodyText>
                <BodyText>
                  Results {search.lastResultCount} • {search.alertFrequency}
                </BodyText>
              </View>
              <View style={styles.searchActions}>
                <PrimaryButton
                  onPress={() => rerunSavedSearch.mutate(search.id)}
                  loading={rerunSavedSearch.isPending}
                >
                  Rerun
                </PrimaryButton>
                <PrimaryButton
                  onPress={() => deleteSavedSearch.mutate(search.id)}
                  loading={deleteSavedSearch.isPending}
                >
                  Delete
                </PrimaryButton>
              </View>
            </View>
          ))}
        </SurfaceCard>
      ) : null}

      {tab === 'talent'
        ? isShowingRerunResults
          ? (savedTalentRerunResults ?? []).map((result, index) => (
              <ListCard
                key={result.profile.userId}
                title={result.profile.displayName}
                body={result.profile.headline}
                eyebrow={result.profile.verificationLevel.replaceAll('_', ' ')}
                chips={result.profile.skills}
                meta={result.profile.availability}
                actionLabel="View profile"
                delay={index * 45}
                onPress={() =>
                  router.push({
                    pathname: '/marketplace/profile/[slug]',
                    params: { slug: result.profile.slug },
                  })
                }
              />
            ))
          : talentData?.profiles.map((profile, index) => (
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
        : isShowingRerunResults
          ? (savedOpportunityRerunResults ?? []).map((result, index) => (
              <ListCard
                key={result.opportunity.id}
                title={result.opportunity.title}
                body={result.opportunity.summary}
                eyebrow={result.opportunity.category}
                chips={result.opportunity.requiredSkills}
                meta={result.opportunity.status}
                actionLabel={
                  accessToken && canApplyToOpportunity(workspace)
                    ? 'Review and apply'
                    : 'View opportunity'
                }
                delay={index * 45}
                onPress={() =>
                  router.push({
                    pathname: '/marketplace/opportunity/[id]',
                    params: { id: result.opportunity.id },
                  })
                }
              />
            ))
          : opportunitiesData?.opportunities.map((opportunity, index) => (
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
        (tab === 'talent' && !talentData) ||
        (tab === 'opportunities' && !opportunitiesData) ? (
          <EmptyState
            title="Marketplace unavailable"
            body="The marketplace API could not be reached. Check the backend target and try again."
          />
        ) : null
      ) : null}

      {!loading && activeResultCount === 0 ? (
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
  workspaceLabel: {
    marginBottom: 8,
  },
  alertToggleSection: {
    gap: 12,
    marginTop: 14,
    marginBottom: 14,
  },
  alertToggleList: {
    gap: 14,
  },
  alertToggleRow: {
    gap: 8,
  },
  alertToggleCopy: {
    gap: 2,
    marginBottom: 4,
  },
  alertActionRow: {
    alignItems: 'stretch',
    gap: 8,
    marginTop: 12,
  },
  alertActionPrimary: {
    marginTop: 8,
  },
  alertActionSecondary: {
    marginTop: 4,
  },
  alertSummary: {
    marginTop: 10,
    gap: 4,
  },
  listItemRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 10,
  },
  savedSearchCard: {
    flex: 1,
    gap: 2,
  },
  searchActions: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 10,
  },
});
