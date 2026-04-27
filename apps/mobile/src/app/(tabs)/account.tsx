import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { supportedLocales } from '@escrow4334/product-core';
import { clearOfflineSnapshots } from '@/features/offline/offlineSnapshots';
import {
  WalletDiagnosticsCard,
  WalletListCard,
  WalletSetupCard,
} from '@/features/wallet/MobileWalletSetupCard';
import { NetworkStatusCard } from '@/features/network/NetworkStatusCard';
import { useLocale } from '@/providers/locale';
import { useSession } from '@/providers/session';
import { useMobileTheme, type ThemePreference } from '@/providers/theme';
import {
  BodyText,
  BottomActionBar,
  Heading,
  MetricRow,
  PrimaryButton,
  ScrollScreen,
  SectionHeader,
  SecondaryButton,
  SegmentedControl,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';

const themePreferences = ['light', 'dark', 'system'] as const satisfies readonly ThemePreference[];

export default function AccountRoute() {
  const { user, signOut } = useSession();
  const locale = useLocale();
  const theme = useMobileTheme();
  const [clearingSnapshots, setClearingSnapshots] = useState(false);

  async function handleClearOfflineSnapshots() {
    if (clearingSnapshots) {
      return;
    }

    setClearingSnapshots(true);
    try {
      const removed = await clearOfflineSnapshots();
      Alert.alert(
        'Offline data cleared',
        removed
          ? `Removed ${removed} saved offline snapshot${removed === 1 ? '' : 's'}.`
          : 'No saved offline snapshots were found for this account.',
      );
    } catch (error) {
      Alert.alert(
        'Offline data not cleared',
        error instanceof Error ? error.message : 'Saved offline snapshots could not be removed.',
      );
    } finally {
      setClearingSnapshots(false);
    }
  }

  return (
    <ScrollScreen
      footer={
        <BottomActionBar>
          {user ? (
            <PrimaryButton onPress={signOut}>Sign out</PrimaryButton>
          ) : (
            <PrimaryButton onPress={() => router.push('/sign-in')}>Sign in</PrimaryButton>
          )}
        </BottomActionBar>
      }
    >
      <SectionHeader
        eyebrow="Settings"
        title="Account"
        body="Locale, theme, session, workspace, Shariah mode, and wallet summary live here for mobile."
      />

      <SurfaceCard animated variant="elevated">
        <Heading size="section" style={styles.cardHeading}>
          {user?.email || 'Signed out'}
        </Heading>
        <StatusBadge
          label={user ? 'Authenticated' : 'Signed out'}
          tone={user ? 'success' : 'warning'}
        />
        <MetricRow label="Workspace" value={user?.activeWorkspace?.label || 'None selected'} />
        <MetricRow label="Wallets" value={user?.wallets.length ?? 0} />
        <MetricRow label="Shariah mode" value={user?.shariahMode ? 'Enabled' : 'Disabled'} />
      </SurfaceCard>

      {user ? (
        <>
          <NetworkStatusCard />
          <SurfaceCard animated delay={40}>
            <Heading size="section" style={styles.cardHeading}>
              Offline data
            </Heading>
            <BodyText>
              Contract, project-room, and marketplace snapshots are saved on this device for
              read-only access during outages. They never include session tokens. Sign-out clears
              account-scoped snapshots, and this control clears the full offline snapshot namespace.
            </BodyText>
            <SecondaryButton
              disabled={clearingSnapshots}
              onPress={() => void handleClearOfflineSnapshots()}
            >
              {clearingSnapshots ? 'Clearing offline data' : 'Clear offline data'}
            </SecondaryButton>
          </SurfaceCard>
          <WalletSetupCard user={user} />
          <WalletDiagnosticsCard />
          <WalletListCard user={user} />
        </>
      ) : null}

      <SurfaceCard animated delay={80}>
        <Heading size="section" style={styles.cardHeading}>
          Language
        </Heading>
        <SegmentedControl
          value={locale.locale}
          onChange={(nextLocale) => locale.setLocale(nextLocale)}
          options={supportedLocales.map((supportedLocale) => ({
            label: supportedLocale.toUpperCase(),
            value: supportedLocale,
          }))}
        />
      </SurfaceCard>

      <SurfaceCard animated delay={140}>
        <Heading size="section" style={styles.cardHeading}>
          Theme
        </Heading>
        <SegmentedControl
          value={theme.preference}
          onChange={(preference) => theme.setPreference(preference)}
          options={themePreferences.map((preference) => ({
            label: preference,
            value: preference,
          }))}
        />
      </SurfaceCard>
    </ScrollScreen>
  );
}
const styles = {
  cardHeading: {
    fontSize: 20,
    lineHeight: 26,
  },
} as const;
