import { useEffect, useState } from 'react';
import { Alert, Share } from 'react-native';
import { formatTimestamp } from '@escrow4334/product-core';
import { useMobileNetwork } from '@/providers/network';
import { useSession } from '@/providers/session';
import {
  BodyText,
  Heading,
  MetricRow,
  SecondaryButton,
  SegmentedControl,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';
import {
  buildMobileRecoveryEvidenceReport,
  clearMobileRecoveryEvidence,
  listMobileRecoveryEvidence,
  mobileRecoveryEvidenceMaxEntries,
  saveMobileRecoveryEvidenceReport,
  type MobileRecoveryEvidenceOutcome,
  type MobileRecoveryEvidenceScenario,
  type MobileRecoveryEvidenceSummary,
} from './mobileRecoveryEvidence';
import type { OfflineSnapshotSummary } from './offlineSnapshots';

const evidenceScenarioOptions: Array<{
  label: string;
  value: MobileRecoveryEvidenceScenario;
}> = [
  { label: 'Offline', value: 'offline_start' },
  { label: 'API', value: 'api_recovery' },
  { label: 'Wallet', value: 'wallet_return' },
  { label: 'Room', value: 'project_room' },
];

const evidenceOutcomeOptions: Array<{
  label: string;
  value: MobileRecoveryEvidenceOutcome;
}> = [
  { label: 'Observed', value: 'observed' },
  { label: 'Passed', value: 'passed' },
  { label: 'Failed', value: 'failed' },
];

const evidenceScenarioLabels: Record<MobileRecoveryEvidenceScenario, string> = {
  api_recovery: 'API recovery',
  offline_start: 'Offline start',
  project_room: 'Project room',
  wallet_return: 'Wallet return',
};

const evidenceOutcomeLabels: Record<MobileRecoveryEvidenceOutcome, string> = {
  failed: 'Failed',
  observed: 'Observed',
  passed: 'Passed',
};

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
  const [clearing, setClearing] = useState(false);
  const [history, setHistory] = useState<MobileRecoveryEvidenceSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [scenario, setScenario] =
    useState<MobileRecoveryEvidenceScenario>('offline_start');
  const [outcome, setOutcome] = useState<MobileRecoveryEvidenceOutcome>('observed');

  const signedIn = Boolean(session.user);
  const restoredFromSnapshot = session.restoredFromProfileSnapshot;
  const canShare = !snapshotSummaryLoading && !sharing && !clearing;

  async function refreshHistory() {
    setHistoryLoading(true);
    try {
      setHistory(await listMobileRecoveryEvidence());
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    void refreshHistory();
  }, []);

  async function handleShareEvidence() {
    if (!canShare) {
      return;
    }

    setSharing(true);

    try {
      const report = buildMobileRecoveryEvidenceReport({
        apiBaseUrl: network.apiBaseUrl,
        apiReachability: network.apiReachability,
        connectionType: network.connectionType,
        initialized: network.initialized,
        isConnected: network.isConnected,
        isInternetReachable: network.isInternetReachable,
        lastChangedAt: network.lastChangedAt,
        offline: network.offline,
        outcome,
        profileSnapshotCachedAt: session.profileSnapshotCachedAt,
        restoredFromProfileSnapshot: restoredFromSnapshot,
        scenario,
        snapshotSummary,
        user: session.user,
      });
      await saveMobileRecoveryEvidenceReport(report);
      await refreshHistory();

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

  async function handleClearEvidence() {
    if (clearing || sharing) {
      return;
    }

    setClearing(true);
    try {
      const removed = await clearMobileRecoveryEvidence();
      await refreshHistory();
      Alert.alert(
        'Recovery evidence cleared',
        removed
          ? `Removed ${removed} saved recovery evidence report${removed === 1 ? '' : 's'}.`
          : 'No saved recovery evidence reports were found on this device.',
      );
    } catch (error) {
      Alert.alert(
        'Recovery evidence not cleared',
        error instanceof Error ? error.message : 'Saved recovery evidence could not be removed.',
      );
    } finally {
      setClearing(false);
    }
  }

  const latestReport = history[0] ?? null;

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
        without tokens, email addresses, user ids, wallet addresses, labels, or URL credentials.
      </BodyText>
      <MetricRow label="Evidence scenario" value={evidenceScenarioLabels[scenario]} />
      <SegmentedControl
        value={scenario}
        onChange={setScenario}
        options={evidenceScenarioOptions}
      />
      <MetricRow label="Evidence outcome" value={evidenceOutcomeLabels[outcome]} />
      <SegmentedControl
        value={outcome}
        onChange={setOutcome}
        options={evidenceOutcomeOptions}
      />
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
      <MetricRow
        label="Saved reports"
        value={historyLoading ? 'Checking' : `${history.length}/${mobileRecoveryEvidenceMaxEntries}`}
      />
      <MetricRow
        label="Latest report"
        value={
          latestReport
            ? `${evidenceScenarioLabels[latestReport.scenario]} / ${
                evidenceOutcomeLabels[latestReport.outcome]
              } / ${formatTimestamp(Date.parse(latestReport.capturedAt))}`
            : 'None'
        }
      />
      <SecondaryButton disabled={!canShare} onPress={() => void handleShareEvidence()}>
        {sharing ? 'Preparing evidence' : 'Save and share evidence'}
      </SecondaryButton>
      {history.length ? (
        <SecondaryButton disabled={sharing || clearing} onPress={() => void handleClearEvidence()}>
          {clearing ? 'Clearing evidence' : 'Clear saved evidence'}
        </SecondaryButton>
      ) : null}
    </SurfaceCard>
  );
}
