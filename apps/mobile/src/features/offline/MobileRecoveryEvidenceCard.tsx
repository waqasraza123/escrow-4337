import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Share, StyleSheet, Text, View } from 'react-native';
import { formatTimestamp, previewHash, type ProductStatusTone } from '@escrow4334/product-core';
import { useMobileNetwork } from '@/providers/network';
import { useSession } from '@/providers/session';
import { useMobileTheme } from '@/providers/theme';
import {
  AnimatedEntrance,
  BodyText,
  Heading,
  MetricRow,
  PrimaryButton,
  SecondaryButton,
  SegmentedControl,
  StatusBadge,
  SurfaceCard,
  useAdaptiveMetrics,
} from '@/ui/primitives';
import { mobileMotion, useReducedMotion } from '@/ui/motion';
import {
  appendMobileRecoveryEvidenceAuditEvent,
  buildMobileRecoveryEvidenceCapturePlan,
  buildMobileRecoveryEvidenceBundle,
  buildMobileRecoveryEvidenceReport,
  clearMobileRecoveryEvidence,
  listMobileRecoveryEvidence,
  listMobileRecoveryEvidenceAudit,
  mobileRecoveryEvidenceAuditMaxEntries,
  mobileRecoveryEvidenceMaxEntries,
  mobileRecoveryEvidenceScenarios,
  readMobileRecoveryEvidenceReport,
  saveMobileRecoveryEvidenceReport,
  summarizeMobileRecoveryEvidenceCoverage,
  type MobileRecoveryEvidenceOutcome,
  type MobileRecoveryEvidenceAuditEvent,
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

function formatCheckCounts(summary: MobileRecoveryEvidenceSummary | null) {
  if (!summary) {
    return 'None';
  }

  const { fail, pass, warn } = summary.checkCounts;
  return `${pass} pass / ${warn} warn / ${fail} fail`;
}

function formatAuditAction(action: MobileRecoveryEvidenceAuditEvent['action']) {
  if (action === 'bundle_share_opened') {
    return 'Bundle share opened';
  }

  if (action === 'partial_bundle_share_cancelled') {
    return 'Partial bundle canceled';
  }

  if (action === 'report_saved') {
    return 'Report saved';
  }

  if (action === 'report_share_opened') {
    return 'Report share opened';
  }

  return 'Saved report share opened';
}

function formatCoverageSummary({
  coverage,
  historyLoading,
}: {
  coverage: ReturnType<typeof summarizeMobileRecoveryEvidenceCoverage>;
  historyLoading: boolean;
}) {
  if (historyLoading) {
    return 'Checking';
  }

  return `${coverage.completeScenarioCount}/${coverage.totalScenarioCount}`;
}

function formatScenarioCoverage(
  scenario: MobileRecoveryEvidenceScenario,
  coverage: ReturnType<typeof summarizeMobileRecoveryEvidenceCoverage>,
) {
  const scenarioCoverage = coverage.scenarios[scenario];

  if (!scenarioCoverage.reportCount) {
    return 'Missing';
  }

  const latestOutcome = scenarioCoverage.latestOutcome
    ? evidenceOutcomeLabels[scenarioCoverage.latestOutcome]
    : 'Observed';

  return `${latestOutcome} / ${scenarioCoverage.reportCount} report${
    scenarioCoverage.reportCount === 1 ? '' : 's'
  }`;
}

function formatBundleReadiness({
  coverage,
  historyLoading,
}: {
  coverage: ReturnType<typeof summarizeMobileRecoveryEvidenceCoverage>;
  historyLoading: boolean;
}) {
  if (historyLoading) {
    return 'Checking';
  }

  if (coverage.allScenariosObserved) {
    return 'Ready';
  }

  const missingScenarioCount = coverage.totalScenarioCount - coverage.completeScenarioCount;
  return `${missingScenarioCount} scenario${missingScenarioCount === 1 ? '' : 's'} missing`;
}

function getScenarioTone(
  scenario: MobileRecoveryEvidenceScenario,
  coverage: ReturnType<typeof summarizeMobileRecoveryEvidenceCoverage>,
): ProductStatusTone {
  const scenarioCoverage = coverage.scenarios[scenario];

  if (!scenarioCoverage.reportCount) {
    return 'muted';
  }

  if (scenarioCoverage.latestOutcome === 'failed') {
    return 'danger';
  }

  if (scenarioCoverage.hasPassedReport || scenarioCoverage.latestOutcome === 'passed') {
    return 'success';
  }

  return 'info';
}

function formatScenarioNames(scenarios: MobileRecoveryEvidenceScenario[]) {
  return scenarios.length
    ? scenarios.map((scenario) => evidenceScenarioLabels[scenario]).join(', ')
    : 'None';
}

function confirmPartialEvidenceBundleShare({
  missingScenarios,
  unreadableScenarios,
}: {
  missingScenarios: MobileRecoveryEvidenceScenario[];
  unreadableScenarios: MobileRecoveryEvidenceScenario[];
}) {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    Alert.alert(
      'Share partial evidence bundle?',
      [
        'This bundle is not ready yet.',
        `Missing: ${formatScenarioNames(missingScenarios)}`,
        `Unreadable: ${formatScenarioNames(unreadableScenarios)}`,
        'Share only if you intentionally want a partial manual evidence artifact.',
      ].join('\n\n'),
      [
        {
          onPress: () => settle(false),
          style: 'cancel',
          text: 'Cancel',
        },
        {
          onPress: () => settle(true),
          text: 'Share partial',
        },
      ],
      {
        cancelable: true,
        onDismiss: () => settle(false),
      },
    );
  });
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
  const theme = useMobileTheme();
  const metrics = useAdaptiveMetrics();
  const network = useMobileNetwork();
  const session = useSession();
  const [sharing, setSharing] = useState(false);
  const [sharingBundle, setSharingBundle] = useState(false);
  const [sharingSaved, setSharingSaved] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [auditEvents, setAuditEvents] = useState<MobileRecoveryEvidenceAuditEvent[]>([]);
  const [history, setHistory] = useState<MobileRecoveryEvidenceSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [scenario, setScenario] =
    useState<MobileRecoveryEvidenceScenario>('offline_start');
  const [outcome, setOutcome] = useState<MobileRecoveryEvidenceOutcome>('observed');

  const signedIn = Boolean(session.user);
  const restoredFromSnapshot = session.restoredFromProfileSnapshot;
  const canShare =
    !snapshotSummaryLoading && !sharing && !sharingBundle && !sharingSaved && !clearing;

  async function refreshHistory() {
    setHistoryLoading(true);
    try {
      const [nextHistory, nextAuditEvents] = await Promise.all([
        listMobileRecoveryEvidence(),
        listMobileRecoveryEvidenceAudit(),
      ]);
      setAuditEvents(nextAuditEvents);
      setHistory(nextHistory);
    } catch {
      setAuditEvents([]);
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
      const reportId = await saveMobileRecoveryEvidenceReport(report);
      await appendMobileRecoveryEvidenceAuditEvent({
        action: 'report_saved',
        outcome,
        reportFingerprint: report.artifact?.fingerprint.value,
        reportId,
        scenario,
      });
      await refreshHistory();

      await Share.share({
        title: 'Escrow4337 mobile recovery evidence',
        message: JSON.stringify(report, null, 2),
      });
      await appendMobileRecoveryEvidenceAuditEvent({
        action: 'report_share_opened',
        outcome,
        reportFingerprint: report.artifact?.fingerprint.value,
        reportId,
        scenario,
      });
      await refreshHistory();
    } catch (error) {
      Alert.alert(
        'Evidence report not shared',
        error instanceof Error ? error.message : 'The recovery evidence report could not be shared.',
      );
    } finally {
      setSharing(false);
    }
  }

  async function handleShareLatestEvidence() {
    if (!latestReport || sharing || sharingBundle || sharingSaved || clearing) {
      return;
    }

    setSharingSaved(true);
    try {
      const report = await readMobileRecoveryEvidenceReport(latestReport.id);

      if (!report) {
        await refreshHistory();
        Alert.alert(
          'Saved evidence unavailable',
          'The latest saved recovery evidence report could not be read. It may have expired or been cleared.',
        );
        return;
      }

      await Share.share({
        title: 'Escrow4337 mobile recovery evidence',
        message: JSON.stringify(report, null, 2),
      });
      await appendMobileRecoveryEvidenceAuditEvent({
        action: 'saved_report_share_opened',
        outcome: latestReport.outcome,
        reportFingerprint: latestReport.fingerprint,
        reportId: latestReport.id,
        scenario: latestReport.scenario,
      });
      await refreshHistory();
    } catch (error) {
      Alert.alert(
        'Saved evidence not shared',
        error instanceof Error ? error.message : 'The saved recovery evidence report could not be shared.',
      );
    } finally {
      setSharingSaved(false);
    }
  }

  async function handleShareCoverageBundle() {
    if (!history.length || sharing || sharingBundle || sharingSaved || clearing) {
      return;
    }

    setSharingBundle(true);
    try {
      const bundle = await buildMobileRecoveryEvidenceBundle(history, auditEvents);

      if (!bundle.readiness.includedScenarioCount) {
        await refreshHistory();
        Alert.alert(
          'Evidence bundle unavailable',
          'Saved recovery evidence reports could not be read. They may have expired or been cleared.',
        );
        return;
      }

      if (!bundle.readiness.ready) {
        const shouldSharePartialBundle = await confirmPartialEvidenceBundleShare({
          missingScenarios: bundle.readiness.missingScenarios,
          unreadableScenarios: bundle.readiness.unreadableScenarios,
        });

        if (!shouldSharePartialBundle) {
          await appendMobileRecoveryEvidenceAuditEvent({
            action: 'partial_bundle_share_cancelled',
            bundleFingerprint: bundle.reviewManifest.fingerprint.value,
            bundleReadiness: {
              includedScenarioCount: bundle.readiness.includedScenarioCount,
              missingScenarios: bundle.readiness.missingScenarios,
              ready: bundle.readiness.ready,
              requiredScenarioCount: bundle.readiness.requiredScenarioCount,
              unreadableScenarios: bundle.readiness.unreadableScenarios,
            },
            historyReportCount: history.length,
          });
          if (bundle.readiness.unreadableScenarios.length) {
            await refreshHistory();
          } else {
            setAuditEvents(await listMobileRecoveryEvidenceAudit());
          }
          return;
        }
      }

      await Share.share({
        title: 'Escrow4337 mobile recovery evidence bundle',
        message: JSON.stringify(bundle, null, 2),
      });
      await appendMobileRecoveryEvidenceAuditEvent({
        action: 'bundle_share_opened',
        bundleFingerprint: bundle.reviewManifest.fingerprint.value,
        bundleReadiness: {
          includedScenarioCount: bundle.readiness.includedScenarioCount,
          missingScenarios: bundle.readiness.missingScenarios,
          ready: bundle.readiness.ready,
          requiredScenarioCount: bundle.readiness.requiredScenarioCount,
          unreadableScenarios: bundle.readiness.unreadableScenarios,
        },
        historyReportCount: history.length,
      });

      if (bundle.readiness.unreadableScenarios.length) {
        await refreshHistory();
      } else {
        setAuditEvents(await listMobileRecoveryEvidenceAudit());
      }
    } catch (error) {
      Alert.alert(
        'Evidence bundle not shared',
        error instanceof Error ? error.message : 'The recovery evidence bundle could not be shared.',
      );
    } finally {
      setSharingBundle(false);
    }
  }

  async function handleClearEvidence() {
    if (clearing || sharing || sharingBundle || sharingSaved) {
      return;
    }

    setClearing(true);
    try {
      const removed = await clearMobileRecoveryEvidence();
      await refreshHistory();
      Alert.alert(
        'Recovery evidence cleared',
        removed
          ? `Removed ${removed} saved recovery evidence item${removed === 1 ? '' : 's'}.`
          : 'No saved recovery evidence items were found on this device.',
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
  const latestAuditEvent = auditEvents[0] ?? null;
  const coverage = summarizeMobileRecoveryEvidenceCoverage(history);
  const capturePlan = buildMobileRecoveryEvidenceCapturePlan(history);
  const coveragePercent = historyLoading
    ? 0
    : Math.round((coverage.completeScenarioCount / coverage.totalScenarioCount) * 100);
  const readinessTone: ProductStatusTone = coverage.allScenariosObserved ? 'success' : 'warning';
  const snapshotValue = snapshotSummaryLoading
    ? 'Checking'
    : `${snapshotSummary?.totalCount ?? 0} saved`;
  const apiPosture =
    network.apiReachability.status === 'reachable' && network.apiReachability.latencyMs !== null
      ? `${network.apiReachability.latencyMs}ms`
      : network.apiReachability.status;
  const nextScenarioLabel = capturePlan.nextScenario
    ? evidenceScenarioLabels[capturePlan.nextScenario]
    : 'Complete';
  const nextScenarioPosture = capturePlan.nextGuide?.expectedPosture ?? 'All scenarios captured';

  function handleSelectNextScenario() {
    if (!capturePlan.nextScenario) {
      return;
    }

    setScenario(capturePlan.nextScenario);
    setOutcome(capturePlan.recommendedOutcome);
  }

  return (
    <SurfaceCard animated delay={delay} variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Heading size="section">Recovery evidence</Heading>
          <BodyText style={styles.headerBody}>
            Manual recovery proof stays local, sanitized, and ready for external review.
          </BodyText>
        </View>
        <StatusBadge
          label={restoredFromSnapshot ? 'Cached' : 'Live'}
          tone={restoredFromSnapshot ? 'warning' : 'success'}
        />
      </View>

      <View
        style={[
          styles.readinessPanel,
          {
            backgroundColor: theme.status[readinessTone].background,
            borderColor: theme.status[readinessTone].border,
            borderRadius: theme.radii.md,
            shadowColor: theme.status[readinessTone].foreground,
          },
        ]}
      >
        <View style={styles.readinessHeader}>
          <View style={styles.readinessCopy}>
            <Text style={[styles.readinessLabel, { color: theme.status[readinessTone].foreground }]}>
              Bundle readiness
            </Text>
            <Text style={[styles.readinessValue, { color: theme.colors.foreground }]}>
              {formatBundleReadiness({ coverage, historyLoading })}
            </Text>
          </View>
          <Text style={[styles.coverageCounter, { color: theme.colors.foreground }]}>
            {formatCoverageSummary({ coverage, historyLoading })}
          </Text>
        </View>
        <View style={styles.readinessRail}>
          <Text style={[styles.readinessRailLabel, { color: theme.colors.foregroundMuted }]}>
            Captured
          </Text>
          <Text style={[styles.readinessRailLabel, { color: theme.colors.foregroundMuted }]}>
            Required
          </Text>
        </View>
        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.pill,
            },
          ]}
        >
          <AnimatedProgressFill
            color={theme.status[readinessTone].foreground}
            percent={coveragePercent}
            radius={theme.radii.pill}
          />
        </View>
        <View style={styles.statGrid}>
          <EvidenceStat
            delay={delay + 90}
            label="Saved"
            value={`${history.length}/${mobileRecoveryEvidenceMaxEntries}`}
          />
          <EvidenceStat
            delay={delay + 130}
            label="Pass"
            tone="success"
            value={`${coverage.passingScenarioCount}`}
          />
          <EvidenceStat
            delay={delay + 170}
            label="Fail"
            tone={coverage.failingScenarioCount ? 'danger' : 'muted'}
            value={`${coverage.failingScenarioCount}`}
          />
          <EvidenceStat
            delay={delay + 210}
            label="Audit"
            tone="info"
            value={`${auditEvents.length}/${mobileRecoveryEvidenceAuditMaxEntries}`}
          />
        </View>
        <View
          style={[
            styles.capturePlanPanel,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
            },
          ]}
        >
          <View
            style={[
              styles.capturePlanStripe,
              {
                backgroundColor: theme.status[readinessTone].foreground,
                borderRadius: theme.radii.pill,
              },
            ]}
          />
          <View style={styles.capturePlanCopy}>
            <Text style={[styles.capturePlanLabel, { color: theme.colors.foregroundMuted }]}>
              Next capture
            </Text>
            <Text style={[styles.capturePlanValue, { color: theme.colors.foreground }]}>
              {historyLoading ? 'Checking' : nextScenarioLabel}
            </Text>
            <Text
              numberOfLines={2}
              style={[styles.capturePlanPosture, { color: theme.colors.foregroundMuted }]}
            >
              {historyLoading ? 'Loading local evidence ledger' : nextScenarioPosture}
            </Text>
          </View>
          {historyLoading ? (
            <StatusBadge label="Checking" tone="muted" />
          ) : capturePlan.nextScenario ? (
            <SecondaryButton
              disabled={sharing || sharingBundle || sharingSaved || clearing}
              onPress={handleSelectNextScenario}
              style={styles.capturePlanButton}
            >
              Select
            </SecondaryButton>
          ) : (
            <StatusBadge label="Ready" tone="success" />
          )}
        </View>
      </View>

      <AnimatedEntrance delay={delay + 110} distance={6} style={styles.captureStack}>
        <View style={styles.captureHeader}>
          <Text style={[styles.sectionLabel, { color: theme.colors.foregroundMuted }]}>
            Capture context
          </Text>
          <Text style={[styles.selectedContext, { color: theme.colors.foreground }]}>
            {evidenceScenarioLabels[scenario]} / {evidenceOutcomeLabels[outcome]}
          </Text>
        </View>
        <SegmentedControl
          value={scenario}
          onChange={setScenario}
          options={evidenceScenarioOptions}
        />
        <SegmentedControl
          value={outcome}
          onChange={setOutcome}
          options={evidenceOutcomeOptions}
        />
      </AnimatedEntrance>

      <View style={styles.pillWrap}>
        <EvidenceStatusPill
          delay={delay + 160}
          label="Session"
          tone={signedIn ? 'success' : 'warning'}
          value={signedIn ? 'Signed in' : 'Signed out'}
        />
        <EvidenceStatusPill delay={delay + 190} label="API" tone="info" value={apiPosture} />
        <EvidenceStatusPill
          delay={delay + 220}
          label="Snapshots"
          tone={(snapshotSummary?.totalCount ?? 0) > 0 ? 'success' : 'muted'}
          value={snapshotValue}
        />
        <EvidenceStatusPill
          delay={delay + 250}
          label="Profile"
          tone={session.profileSnapshotCachedAt ? 'success' : 'muted'}
          value={
            session.profileSnapshotCachedAt
              ? formatTimestamp(session.profileSnapshotCachedAt)
              : 'None'
          }
        />
      </View>

      <AnimatedEntrance delay={delay + 210} distance={6} style={styles.scenarioStack}>
        <Text style={[styles.sectionLabel, { color: theme.colors.foregroundMuted }]}>
          Scenario evidence
        </Text>
        <View style={styles.scenarioGrid}>
          {mobileRecoveryEvidenceScenarios.map((scenarioKey, index) => (
            <ScenarioPill
              key={scenarioKey}
              delay={delay + 260 + index * 38}
              label={evidenceScenarioLabels[scenarioKey]}
              tone={getScenarioTone(scenarioKey, coverage)}
              value={formatScenarioCoverage(scenarioKey, coverage)}
            />
          ))}
        </View>
      </AnimatedEntrance>

      <AnimatedEntrance delay={delay + 320} distance={6}>
        <View
          style={[
            styles.latestPanel,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
            },
          ]}
        >
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
          <MetricRow label="Latest checks" value={formatCheckCounts(latestReport)} />
          <MetricRow
            label="Latest fingerprint"
            value={latestReport ? previewHash(latestReport.fingerprint, 'None', 6, 4) : 'None'}
          />
          <MetricRow
            label="Latest audit"
            value={
              latestAuditEvent
                ? `${formatAuditAction(latestAuditEvent.action)} / ${formatTimestamp(
                    Date.parse(latestAuditEvent.recordedAt),
                  )}`
                : 'None'
            }
          />
        </View>
      </AnimatedEntrance>

      <PrimaryButton disabled={!canShare} onPress={() => void handleShareEvidence()}>
        {sharing ? 'Preparing evidence' : 'Save and share evidence'}
      </PrimaryButton>
      {history.length ? (
        <View style={[styles.secondaryActions, { gap: metrics.compact ? 8 : 10 }]}>
          <SecondaryButton
            disabled={sharing || sharingBundle || sharingSaved || clearing}
            onPress={() => void handleShareCoverageBundle()}
          >
            {sharingBundle ? 'Opening evidence bundle' : 'Share coverage bundle'}
          </SecondaryButton>
          <SecondaryButton
            disabled={sharing || sharingBundle || sharingSaved || clearing}
            onPress={() => void handleShareLatestEvidence()}
          >
            {sharingSaved ? 'Opening saved evidence' : 'Share latest saved evidence'}
          </SecondaryButton>
          <SecondaryButton
            disabled={sharing || sharingBundle || sharingSaved || clearing}
            onPress={() => void handleClearEvidence()}
          >
            {clearing ? 'Clearing evidence' : 'Clear saved evidence'}
          </SecondaryButton>
        </View>
      ) : null}
    </SurfaceCard>
  );
}

function AnimatedProgressFill({
  color,
  percent,
  radius,
}: {
  color: string;
  percent: number;
  radius: number;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(percent)).current;

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(percent);
      return;
    }

    Animated.timing(progress, {
      toValue: percent,
      duration: mobileMotion.content + 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent, progress, reducedMotion]);

  const animatedStyle = useMemo(
    () => ({
      width: progress.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
      }),
    }),
    [progress],
  );

  return (
    <Animated.View
      style={[
        styles.progressFill,
        animatedStyle,
        {
          backgroundColor: color,
          borderRadius: radius,
        },
      ]}
    >
      <View style={[styles.progressShine, { backgroundColor: 'rgba(255,255,255,0.32)' }]} />
    </Animated.View>
  );
}

function EvidenceStat({
  delay = 0,
  label,
  tone = 'muted',
  value,
}: {
  delay?: number;
  label: string;
  tone?: ProductStatusTone;
  value: string;
}) {
  const theme = useMobileTheme();
  const status = theme.status[tone];

  return (
    <AnimatedEntrance delay={delay} distance={5} style={styles.statItem}>
      <View
        style={[
          styles.statDot,
          {
            backgroundColor: status.foreground,
            borderRadius: theme.radii.pill,
          },
        ]}
      />
      <Text style={[styles.statValue, { color: theme.colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
    </AnimatedEntrance>
  );
}

function EvidenceStatusPill({
  delay = 0,
  label,
  tone = 'muted',
  value,
}: {
  delay?: number;
  label: string;
  tone?: ProductStatusTone;
  value: string;
}) {
  const theme = useMobileTheme();
  const status = theme.status[tone];

  return (
    <AnimatedEntrance delay={delay} distance={6} style={styles.statusPillMotion}>
      <View
        style={[
          styles.statusPill,
          {
            backgroundColor: theme.colors.surfaceSoft,
            borderColor: status.border,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        <View
          style={[
            styles.pillAccent,
            {
              backgroundColor: status.foreground,
              borderRadius: theme.radii.pill,
            },
          ]}
        />
        <Text style={[styles.statusPillLabel, { color: theme.colors.foregroundMuted }]}>
          {label}
        </Text>
        <Text style={[styles.statusPillValue, { color: theme.colors.foreground }]}>{value}</Text>
      </View>
    </AnimatedEntrance>
  );
}

function ScenarioPill({
  delay = 0,
  label,
  tone,
  value,
}: {
  delay?: number;
  label: string;
  tone: ProductStatusTone;
  value: string;
}) {
  const theme = useMobileTheme();
  const status = theme.status[tone];

  return (
    <AnimatedEntrance delay={delay} distance={6} style={styles.scenarioPillMotion}>
      <View
        style={[
          styles.scenarioPill,
          {
            backgroundColor: status.background,
            borderColor: status.border,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        <View style={styles.scenarioPillHeader}>
          <Text style={[styles.scenarioLabel, { color: status.foreground }]}>{label}</Text>
          <View
            style={[
              styles.scenarioSignal,
              {
                backgroundColor: status.foreground,
                borderRadius: theme.radii.pill,
              },
            ]}
          />
        </View>
        <Text style={[styles.scenarioValue, { color: theme.colors.foreground }]}>{value}</Text>
      </View>
    </AnimatedEntrance>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerBody: {
    maxWidth: 440,
  },
  readinessPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    padding: 14,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  readinessHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  readinessCopy: {
    flex: 1,
    gap: 2,
  },
  readinessLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  readinessValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  coverageCounter: {
    fontSize: 24,
    fontWeight: '900',
  },
  readinessRail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: -6,
  },
  readinessRailLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressTrack: {
    borderWidth: StyleSheet.hairlineWidth,
    height: 12,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    minWidth: 4,
    overflow: 'hidden',
  },
  progressShine: {
    height: '100%',
    marginLeft: '64%',
    opacity: 0.7,
    width: 24,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statItem: {
    flex: 1,
    gap: 2,
    minHeight: 52,
  },
  statDot: {
    height: 4,
    marginBottom: 3,
    width: 20,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  capturePlanPanel: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  capturePlanStripe: {
    alignSelf: 'stretch',
    width: 4,
  },
  capturePlanCopy: {
    flex: 1,
    gap: 2,
  },
  capturePlanLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  capturePlanValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  capturePlanPosture: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  capturePlanButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: 108,
  },
  captureStack: {
    gap: 9,
  },
  captureHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  selectedContext: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPillMotion: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  statusPill: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 3,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pillAccent: {
    height: 3,
    marginBottom: 3,
    width: 28,
  },
  statusPillLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusPillValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  scenarioStack: {
    gap: 9,
  },
  scenarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scenarioPillMotion: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  scenarioPill: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 3,
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scenarioPillHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  scenarioSignal: {
    height: 8,
    width: 8,
  },
  scenarioLabel: {
    fontSize: 11,
    fontWeight: '900',
  },
  scenarioValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  latestPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    padding: 12,
  },
  secondaryActions: {
    width: '100%',
  },
});
