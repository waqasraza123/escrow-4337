import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, Platform, Share } from 'react-native';
import { formatTimestamp, type UserProfile } from '@escrow4334/product-core';
import { useMobileNetwork } from '@/providers/network';
import { useSession } from '@/providers/session';
import {
  BodyText,
  Heading,
  MetricRow,
  SecondaryButton,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';
import type { OfflineSnapshotSummary } from './offlineSnapshots';

type SanitizedWorkspacePosture = {
  activeKind: string | null;
  activeOrganizationKind: string | null;
  activeRoles: string[];
  totalWorkspaces: number;
};

function buildWorkspacePosture(user: UserProfile | null): SanitizedWorkspacePosture {
  return {
    activeKind: user?.activeWorkspace?.kind ?? null,
    activeOrganizationKind: user?.activeWorkspace?.organizationKind ?? null,
    activeRoles: user?.activeWorkspace?.roles ?? [],
    totalWorkspaces: user?.workspaces.length ?? 0,
  };
}

function buildWalletPosture(user: UserProfile | null) {
  const wallets = user?.wallets ?? [];

  return {
    total: wallets.length,
    eoa: wallets.filter((wallet) => wallet.walletKind === 'eoa').length,
    smartAccount: wallets.filter((wallet) => wallet.walletKind === 'smart_account').length,
    hasDefaultExecutionWallet: Boolean(user?.defaultExecutionWalletAddress),
  };
}

function buildCapabilityPosture(user: UserProfile | null) {
  if (!user) {
    return {
      chainAuditSync: false,
      escrowOperations: false,
      escrowResolution: false,
      jobHistoryImport: false,
      marketplaceModeration: false,
    };
  }

  return {
    chainAuditSync: user.capabilities.chainAuditSync.allowed,
    escrowOperations: user.capabilities.escrowOperations.allowed,
    escrowResolution: user.capabilities.escrowResolution.allowed,
    jobHistoryImport: user.capabilities.jobHistoryImport.allowed,
    marketplaceModeration: user.capabilities.marketplaceModeration.allowed,
  };
}

function buildAppVersionLabel() {
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? 'unknown';
}

function sanitizeUrlForEvidence(value: string) {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.split('?')[0]?.split('#')[0] ?? 'unknown';
  }
}

export function MobileRecoveryEvidenceCard({
  delay = 60,
  snapshotSummary,
  snapshotSummaryLoading,
}: {
  delay?: number;
  snapshotSummary: OfflineSnapshotSummary | null;
  snapshotSummaryLoading: boolean;
}) {
  const network = useMobileNetwork();
  const session = useSession();
  const [sharing, setSharing] = useState(false);

  const signedIn = Boolean(session.user);
  const restoredFromSnapshot = session.restoredFromProfileSnapshot;
  const canShare = !snapshotSummaryLoading && !sharing;

  async function handleShareEvidence() {
    if (!canShare) {
      return;
    }

    setSharing(true);

    try {
      const report = {
        version: 1,
        capturedAt: new Date().toISOString(),
        platform: {
          os: Platform.OS,
          version: String(Platform.Version),
        },
        app: {
          applicationId: Application.applicationId ?? Constants.expoConfig?.slug ?? 'unknown',
          ownership: Constants.appOwnership ?? 'unknown',
          version: buildAppVersionLabel(),
        },
        api: {
          baseUrl: sanitizeUrlForEvidence(network.apiBaseUrl),
          reachability: {
            status: network.apiReachability.status,
            checkedAt: network.apiReachability.checkedAt
              ? new Date(network.apiReachability.checkedAt).toISOString()
              : null,
            latencyMs: network.apiReachability.latencyMs,
            error: network.apiReachability.error,
          },
        },
        network: {
          initialized: network.initialized,
          offline: network.offline,
          connectionType: network.connectionType,
          isConnected: network.isConnected,
          isInternetReachable: network.isInternetReachable,
          lastChangedAt: network.lastChangedAt
            ? new Date(network.lastChangedAt).toISOString()
            : null,
        },
        session: {
          signedIn,
          restoredFromProfileSnapshot: restoredFromSnapshot,
          profileSnapshotCachedAt: session.profileSnapshotCachedAt
            ? new Date(session.profileSnapshotCachedAt).toISOString()
            : null,
          shariahMode: Boolean(session.user?.shariahMode),
          capabilities: buildCapabilityPosture(session.user),
          walletPosture: buildWalletPosture(session.user),
          workspacePosture: buildWorkspacePosture(session.user),
        },
        offlineSnapshots: snapshotSummary
          ? {
              accountScopedCount: snapshotSummary.accountScopedCount,
              estimatedBytes: snapshotSummary.estimatedBytes,
              expiredCount: snapshotSummary.expiredCount,
              latestCachedAt: snapshotSummary.latestCachedAt
                ? new Date(snapshotSummary.latestCachedAt).toISOString()
                : null,
              maxAgeMs: snapshotSummary.maxAgeMs,
              maxEntriesPerScope: snapshotSummary.maxEntriesPerScope,
              publicCount: snapshotSummary.publicCount,
              resourceCounts: snapshotSummary.resourceCounts,
              totalCount: snapshotSummary.totalCount,
            }
          : null,
      };

      await Share.share({
        title: 'Escrow4337 mobile recovery evidence',
        message: JSON.stringify(report, null, 2),
      });
    } catch (error) {
      Alert.alert(
        'Evidence report not shared',
        error instanceof Error ? error.message : 'The recovery evidence report could not be shared.',
      );
    } finally {
      setSharing(false);
    }
  }

  return (
    <SurfaceCard animated delay={delay}>
      <Heading size="section">Recovery evidence</Heading>
      <StatusBadge
        label={restoredFromSnapshot ? 'Cached session active' : 'Live session posture'}
        tone={restoredFromSnapshot ? 'warning' : 'success'}
      />
      <BodyText>
        Share a sanitized JSON report during real-device recovery checks. It captures network, API,
        cached-session, wallet-count, workspace-kind, capability, and offline snapshot posture
        without tokens, email addresses, user ids, or wallet addresses.
      </BodyText>
      <MetricRow label="Signed in" value={signedIn ? 'Yes' : 'No'} />
      <MetricRow
        label="Profile snapshot"
        value={
          session.profileSnapshotCachedAt
            ? formatTimestamp(session.profileSnapshotCachedAt)
            : 'None loaded'
        }
      />
      <MetricRow
        label="API posture"
        value={
          network.apiReachability.status === 'reachable' &&
          network.apiReachability.latencyMs !== null
            ? `Reachable in ${network.apiReachability.latencyMs}ms`
            : network.apiReachability.status
        }
      />
      <MetricRow
        label="Snapshot inventory"
        value={
          snapshotSummaryLoading
            ? 'Checking'
            : `${snapshotSummary?.totalCount ?? 0} saved`
        }
      />
      <SecondaryButton disabled={!canShare} onPress={() => void handleShareEvidence()}>
        {sharing ? 'Preparing evidence' : 'Share recovery evidence'}
      </SecondaryButton>
    </SurfaceCard>
  );
}
