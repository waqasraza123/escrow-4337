import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { supportedLocales } from '@escrow4334/product-core';
import { useLocale } from '@/providers/locale';
import { useSession } from '@/providers/session';
import { useMobileTheme, type ThemePreference } from '@/providers/theme';
import {
  BodyText,
  Heading,
  PrimaryButton,
  ScrollScreen,
  SecondaryButton,
  StatusBadge,
  SurfaceCard,
} from '@/ui/primitives';

const themePreferences = ['light', 'dark', 'system'] as const satisfies readonly ThemePreference[];

export default function AccountRoute() {
  const { user, signOut } = useSession();
  const locale = useLocale();
  const theme = useMobileTheme();

  return (
    <ScrollScreen>
      <Heading tone="eyebrow">Settings</Heading>
      <Heading>Account</Heading>
      <BodyText>
        Locale, theme, session, workspace, Shariah mode, and wallet summary
        live here for the mobile app.
      </BodyText>

      <SurfaceCard>
        <Heading style={styles.cardHeading}>
          {user?.email || 'Signed out'}
        </Heading>
        <StatusBadge
          label={user ? 'Authenticated' : 'Signed out'}
          tone={user ? 'success' : 'warning'}
        />
        <BodyText>
          Active workspace: {user?.activeWorkspace?.label || 'None selected'}
        </BodyText>
        <BodyText>
          Wallets linked: {user?.wallets.length ?? 0}
        </BodyText>
      </SurfaceCard>

      <SurfaceCard>
        <Heading style={styles.cardHeading}>Language</Heading>
        <View style={styles.optionRow}>
          {supportedLocales.map((supportedLocale) => (
            <SecondaryButton
              key={supportedLocale}
              onPress={() => locale.setLocale(supportedLocale)}
            >
              {supportedLocale.toUpperCase()}
            </SecondaryButton>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Heading style={styles.cardHeading}>Theme</Heading>
        <View style={styles.optionRow}>
          {themePreferences.map((preference) => (
            <SecondaryButton
              key={preference}
              onPress={() => theme.setPreference(preference)}
            >
              {preference}
            </SecondaryButton>
          ))}
        </View>
      </SurfaceCard>

      {user ? (
        <PrimaryButton onPress={signOut}>Sign out</PrimaryButton>
      ) : (
        <PrimaryButton onPress={() => router.push('/sign-in')}>
          Sign in
        </PrimaryButton>
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  cardHeading: {
    fontSize: 20,
    lineHeight: 26,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
