import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { IconButton } from '@/components/ui';
import { listAnnouncements } from '@/services/announcements.service';
import { listNotifications } from '@/services/notifications.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

/** Top-bar notification action shared by the main tutor tabs. */
export function NotificationBell() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const [hasUnread, setHasUnread] = useState(false);

  const loadUnreadState = useCallback(async () => {
    if (!profile) {
      setHasUnread(false);
      return;
    }

    try {
      const [items, announcements] = await Promise.all([
        listNotifications(profile.uid),
        listAnnouncements(profile.uid),
      ]);
      setHasUnread(items.some((item) => item.readAt === null) || announcements.some((item) => item.readAt === null));
    } catch {
      // The bell remains usable even when notification history is temporarily unavailable.
    }
  }, [profile]);

  useFocusEffect(useCallback(() => {
    void loadUnreadState();
  }, [loadUnreadState]));

  return (
    <View style={{ position: 'relative' }}>
      <IconButton
        icon="notifications-outline"
        accessibilityLabel="Open notifications"
        color={theme.colors.textOnPrimary}
        pressedBackgroundColor={theme.colors.primaryPressed}
        onPress={() => router.push('/notifications' as never)}
      />
      {hasUnread ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 7,
            right: 7,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: theme.colors.danger,
            borderWidth: 1.5,
            borderColor: theme.colors.primary,
          }}
        />
      ) : null}
    </View>
  );
}
