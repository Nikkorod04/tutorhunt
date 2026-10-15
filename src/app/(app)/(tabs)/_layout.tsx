/**
 * Authenticated area.
 *
 * The authenticated product is tutor-only. Detail and finance routes live in
 * the root stack; these tabs are the small set of daily tutor workspaces.
 */

import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { AppLoading } from '@/components/AppLoading';
import type { IconName } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({
  base,
  color,
  focused,
}: {
  base: string;
  color: React.ComponentProps<typeof Ionicons>['color'];
  focused: boolean;
}) {
  const name = (focused ? base : `${base}-outline`) as IconName;
  return <Ionicons name={name} size={22} color={color} />;
}

export default function AppLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') return <AppLoading />;
  if (status === 'unconfigured') return <Redirect href="/setup" />;
  if (status === 'signedOut') return <Redirect href="/login" />;
  if (status === 'needsProfile') return <Redirect href={'/tutor-onboarding' as never} />;

  const tabBarHeight = 62 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.borderSubtle,
          borderTopWidth: 0.5,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fontFamily.medium,
          fontSize: 11,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="home" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="people" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Sessions',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="calendar" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="person" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
