import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
  TopAppBar,
  useToast,
} from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { AppNotification, UserAnnouncement } from '@/types';
import {
  listAnnouncements,
  markAllAnnouncementsRead,
  markAnnouncementRead,
} from '@/services/announcements.service';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationErrorMessage,
} from '@/services/notifications.service';
import { invalidateNotificationBadge } from '@/services/notification-badge.service';
import { formatDisplayDateTime } from '@/utils/date';

function notificationIcon(type: AppNotification['type']): 'calendar-outline' | 'star-outline' | 'information-circle-outline' {
  if (type === 'upcoming_session') return 'calendar-outline';
  if (type === 'pro_update') return 'star-outline';
  return 'information-circle-outline';
}

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const theme = useTheme();
  const unread = item.readAt === null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${unread ? ', unread' : ''}`}
      style={{
        paddingHorizontal: theme.layout.cardPadding,
        paddingVertical: theme.space[12],
        backgroundColor: unread ? theme.colors.primarySubtle : 'transparent',
        borderBottomWidth: 0.5,
        borderBottomColor: theme.colors.borderSubtle,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
        <View style={{ width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: unread ? theme.colors.primary : theme.colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={notificationIcon(item.type)} size={19} color={unread ? theme.colors.textOnPrimary : theme.colors.textMuted} />
        </View>
        <View style={{ flex: 1, gap: theme.space[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
            <Text token="bodyStrong" style={{ flex: 1 }}>{item.title}</Text>
            {unread ? <Badge label="New" tone="info" /> : null}
          </View>
          <Text token="caption" color={theme.colors.textMuted}>{item.body}</Text>
          <Text token="micro" color={theme.colors.textHint}>{formatDisplayDateTime(item.createdAt)}</Text>
        </View>
        {item.route ? <Ionicons name="chevron-forward" size={18} color={theme.colors.textHint} /> : null}
      </View>
    </Pressable>
  );
}

function AnnouncementRow({ item, onPress }: { item: UserAnnouncement; onPress: () => void }) {
  const theme = useTheme();
  const unread = item.readAt === null;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (!theme.reduceMotion) scale.value = withTiming(0.99, { duration: theme.motion.duration.instant });
        }}
        onPressOut={() => {
          if (!theme.reduceMotion) scale.value = withTiming(1, { duration: theme.motion.duration.fast });
        }}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}${unread ? ', unread' : ''}`}
        style={({ pressed }) => ({
          paddingHorizontal: theme.layout.cardPadding,
          paddingVertical: theme.space[12],
          backgroundColor: pressed ? theme.colors.surfaceSunken : unread ? theme.colors.primarySubtle : 'transparent',
          borderBottomWidth: 0.5,
          borderBottomColor: theme.colors.borderSubtle,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[12] }}>
          <View style={{ width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: unread ? theme.colors.primary : theme.colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="megaphone-outline" size={19} color={unread ? theme.colors.textOnPrimary : theme.colors.textMuted} />
          </View>
          <View style={{ flex: 1, gap: theme.space[4] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[8] }}>
              <Text token="bodyStrong" style={{ flex: 1 }}>{item.title}</Text>
              {unread ? <Badge label="New" tone="info" /> : null}
            </View>
            <Text token="caption" color={theme.colors.textMuted}>{item.message}</Text>
            <Text token="micro" color={theme.colors.textHint}>{formatDisplayDateTime(item.createdAt)}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const { showToast } = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [announcements, setAnnouncements] = useState<UserAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!profile) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [nextItems, nextAnnouncements] = await Promise.all([
        listNotifications(profile.uid),
        listAnnouncements(profile.uid),
      ]);
      setItems(nextItems);
      setAnnouncements(nextAnnouncements);
      setError(null);
    } catch (caught) {
      setError(notificationErrorMessage(caught));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  async function openNotification(item: AppNotification) {
    if (!profile) return;
    if (item.readAt === null) {
      try {
        await markNotificationRead(profile.uid, item.id);
        invalidateNotificationBadge(profile.uid);
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date() } : entry));
      } catch {
        // Opening the destination is still useful if marking read fails.
      }
    }
    if (item.route) router.push(item.route as never);
  }

  async function openAnnouncement(item: UserAnnouncement) {
    if (!profile) return;
    if (item.readAt === null) {
      try {
        await markAnnouncementRead(profile.uid, item.id);
        invalidateNotificationBadge(profile.uid);
        setAnnouncements((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date() } : entry));
      } catch {
        // The announcement remains readable if marking it read fails.
      }
    }
    router.push({ pathname: '/announcement-detail', params: { id: item.id } } as never);
  }

  async function markAllRead() {
    if (!profile || items.every((item) => item.readAt !== null) && announcements.every((item) => item.readAt !== null)) return;
    try {
      await Promise.all([markAllNotificationsRead(profile.uid), markAllAnnouncementsRead(profile.uid)]);
      invalidateNotificationBadge(profile.uid);
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date() })));
      setAnnouncements((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date() })));
      showToast('All notifications marked as read');
    } catch (caught) {
      showToast(notificationErrorMessage(caught), 'danger');
    }
  }

  const unreadCount = items.filter((item) => item.readAt === null).length + announcements.filter((item) => item.readAt === null).length;
  const feed = [
    ...items.map((item) => ({ kind: 'notification' as const, item })),
    ...announcements.map((item) => ({ kind: 'announcement' as const, item })),
  ].sort((left, right) => right.item.createdAt.getTime() - left.item.createdAt.getTime());
  return (
    <Screen
      scroll
      contentStyle={{ paddingBottom: theme.space[16] }}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      )}
      header={(
        <TopAppBar
          title="Notifications"
          onBack={() => router.back()}
          action={unreadCount > 0 ? <Badge label={`${unreadCount} new`} tone="info" /> : undefined}
        />
      )}
    >
      <View style={{ paddingTop: theme.space[8], gap: theme.space[16] }}>
        {error ? <Card variant="accent"><Text token="caption" color={theme.colors.warningText}>{error}</Text></Card> : null}

        <Card variant="flat" padded={false}>
          <View style={{ paddingHorizontal: theme.layout.cardPadding, paddingTop: theme.layout.cardPadding }}>
            <SectionHeader
              title="UPDATES"
              action={unreadCount > 0 ? <Button label="Mark all read" variant="ghost" size="sm" onPress={() => void markAllRead()} /> : undefined}
            />
          </View>
          {loading ? (
            <View style={{ padding: theme.layout.cardPadding, gap: theme.space[12] }}>
              <Skeleton variant="list" rows={2} />
            </View>
          ) : feed.length === 0 ? (
            <EmptyState icon="notifications-off-outline" title="You’re all caught up" description="New reminders and account updates will appear here." />
          ) : feed.map((entry) => entry.kind === 'notification'
            ? <NotificationRow key={`notification-${entry.item.id}`} item={entry.item} onPress={() => void openNotification(entry.item)} />
            : <AnnouncementRow key={`announcement-${entry.item.id}`} item={entry.item} onPress={() => void openAnnouncement(entry.item)} />)}
        </Card>

      </View>
    </Screen>
  );
}
