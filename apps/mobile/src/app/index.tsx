import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useSession } from '@/providers/session';
import { useMobileTheme } from '@/providers/theme';

export default function IndexRoute() {
  const { restoring, user } = useSession();
  const theme = useMobileTheme();

  if (restoring) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.background,
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/home" />;
  }

  return <OnboardingScreen />;
}
