import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMobileTheme } from '@/providers/theme';

export default function TabsLayout() {
  const theme = useMobileTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.foregroundMuted,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color }) => (
          <View
            style={{
              backgroundColor: color,
              borderRadius: 999,
              height: focused ? 4 : 3,
              opacity: focused ? 1 : 0.38,
              width: focused ? 24 : 12,
            }}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 3,
          marginVertical: 6,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 0,
          elevation: 10,
          height: 62 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingHorizontal: 8,
          paddingTop: 8,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: -12 },
          shadowOpacity: 0.12,
          shadowRadius: 24,
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="marketplace" options={{ title: 'Marketplace' }} />
      <Tabs.Screen name="contracts" options={{ title: 'Contracts' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}
