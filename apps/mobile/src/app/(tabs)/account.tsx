import { router } from 'expo-router';
import { supportedLocales } from '@escrow4334/product-core';
import {
  WalletDiagnosticsCard,
  WalletListCard,
  WalletSetupCard,
} from '@/features/wallet/MobileWalletSetupCard';
import { useLocale } from '@/providers/locale';
import { useSession } from '@/providers/session';
import { useMobileTheme, type ThemePreference } from '@/providers/theme';
import {
  BottomActionBar,
  Heading,
  MetricRow,
  PrimaryButton,
  ScrollScreen,
  SectionHeader,
  SegmentedControl,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';

const themePreferences = ['light', 'dark', 'system'] as const satisfies readonly ThemePreference[];

export default function AccountRoute() {
  const { user, signOut } = useSession();
  const locale = useLocale();
  const theme = useMobileTheme();

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
