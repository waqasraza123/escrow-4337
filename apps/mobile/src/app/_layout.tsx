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
          animation: 'slide_from_right',
          animationDuration: 220,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="(auth)/sign-in"
          options={{ animation: 'fade_from_bottom' }}
        />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="marketplace/profile/[slug]"
          options={{
            headerShown: true,
            headerTitle: '',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.foreground,
          }}
        />
        <Stack.Screen
          name="marketplace/opportunity/[id]"
          options={{
            headerShown: true,
            headerTitle: '',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.foreground,
          }}
        />
        <Stack.Screen
          name="contracts/new"
          options={{
            headerShown: true,
            headerTitle: '',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.foreground,
          }}
        />
        <Stack.Screen
          name="contracts/[id]"
          options={{
            headerShown: true,
            headerTitle: '',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.foreground,
          }}
        />
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
