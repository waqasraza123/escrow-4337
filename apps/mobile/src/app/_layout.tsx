import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootProviders } from '@/providers/root';
import { useMobileTheme } from '@/providers/theme';

function RootStack() {
  const theme = useMobileTheme();
  return (
    <>
      <StatusBar style={theme.themeName === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function AppLayout() {
  return (
    <SafeAreaProvider>
      <RootProviders>
        <RootStack />
      </RootProviders>
    </SafeAreaProvider>
  );
}
