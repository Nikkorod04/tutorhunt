import { router } from 'expo-router';
import { useEffect } from 'react';
import type { Notification } from 'expo-notifications';

import { getNotificationPreferences } from '@/services/notifications.service';
import {
  clearLocalSessionReminders,
  configureNotificationHandler,
  configureNotificationChannel,
  getNotificationModule,
  registerNotificationDevice,
  syncUpcomingSessionReminders,
} from '@/services/notification-delivery.service';
import { useAuthStore } from '@/stores/authStore';

function routeFromNotification(notification: Notification): void {
  const url = notification.request.content.data?.url;
  if (typeof url === 'string') router.push(url as never);
}

export function useNotificationBootstrap(): void {
  const profile = useAuthStore((state) => state.profile);

  useEffect(() => {
    let active = true;
    let responseSubscription: { remove: () => void } | null = null;

    void (async () => {
      const notifications = await getNotificationModule();
      if (!active || !notifications) return;

      await configureNotificationHandler();
      if (!active) return;

      const lastResponse = await notifications.getLastNotificationResponseAsync();
      if (lastResponse?.notification) routeFromNotification(lastResponse.notification);

      responseSubscription = notifications.addNotificationResponseReceivedListener((response) => {
        routeFromNotification(response.notification);
      });
    })();

    return () => {
      active = false;
      responseSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function prepareNotifications(): Promise<void> {
      if (!profile) {
        await clearLocalSessionReminders();
        return;
      }

      try {
        await configureNotificationChannel();
        await registerNotificationDevice(profile.uid);

        const preferences = await getNotificationPreferences(profile.uid);
        if (!cancelled && profile.role === 'tutor') {
          await syncUpcomingSessionReminders(profile.uid, preferences.sessionReminders);
        }
      } catch {
        // Notifications are optional. Firebase/auth should remain usable when
        // the current device cannot provide notification capabilities.
      }
    }

    void prepareNotifications();
    return () => {
      cancelled = true;
    };
  }, [profile]);
}
