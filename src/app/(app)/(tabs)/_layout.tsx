/**
 * Authenticated area.
 *
 * One route group serves both roles and the tab set changes with the role,
 * rather than having a (tutor) group and a (parent) group. Expo Router groups
 * do not appear in the URL, so two sibling groups both owning `/index` would
 * collide; a single group with role-aware tabs avoids that entirely.
 *
 * Screens that do not apply to the current role are declared with href: null,
 * because any file in this directory otherwise becomes a visible tab.
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
  const role = useAuthStore((state) => state.profile?.role ?? null);

  if (status === 'loading') return <AppLoading />;
  if (status === 'unconfigured') return <Redirect href="/setup" />;
  if (status === 'signedOut') return <Redirect href="/login" />;
  if (status === 'needsRole') return <Redirect href="/role-selection" />;

  const isTutor = role === 'tutor';
  const visible = (applies: boolean) => (applies ? undefined : null);
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

      {/* Tutor tabs */}
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          href: visible(isTutor),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="people" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Sessions',
          href: visible(isTutor),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="calendar" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="parent-requests"
        options={{
          title: 'Tutor Hunt',
          href: visible(isTutor),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="search" color={color} focused={focused} />
          ),
        }}
      />

      {/* Parent tabs */}
      <Tabs.Screen
        name="find-tutors"
        options={{
          title: 'Find Tutors',
          href: visible(!isTutor),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="search" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          href: visible(!isTutor),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="document-text" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          href: visible(!isTutor),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon base="heart" color={color} focused={focused} />
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
