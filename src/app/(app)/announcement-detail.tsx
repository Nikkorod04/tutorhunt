import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Screen,
  Skeleton,
  Text,
  TopAppBar,
  useToast,
} from '@/components/ui';
import { getAnnouncement, markAnnouncementRead } from '@/services/announcements.service';
import { invalidateNotificationBadge } from '@/services/notification-badge.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import type { UserAnnouncement } from '@/types';
import { formatDisplayDateTime } from '@/utils/date';

const LINK_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+63|0)9(?:[\s-]?\d){9}/gi;

function trimLinkEnd(value: string): string {
  return value.replace(/[.,!?;:)}\]]+$/, '');
}

function linkUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (/^www\./i.test(value)) return `https://${value}`;
  if (value.includes('@')) return `mailto:${value}`;
  const normalized = value.replace(/[\s()-]/g, '');
  return `tel:${normalized}`;
}

function AnnouncementMessage({ message, onOpenLink }: { message: string; onOpenLink: (url: string) => void }) {
  const theme = useTheme();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  LINK_PATTERN.lastIndex = 0;
  while ((match = LINK_PATTERN.exec(message)) !== null) {
    const raw = match[0];
    const visible = trimLinkEnd(raw);
    const start = match.index;
    const trailing = raw.slice(visible.length);
    if (start > cursor) parts.push(message.slice(cursor, start));
    parts.push(
      <Text
        key={`link-${start}`}
        color={theme.colors.primary}
        onPress={() => onOpenLink(linkUrl(visible))}
        style={{ textDecorationLine: 'underline' }}
        accessibilityRole="link"
      >
        {visible}
      </Text>,
    );
    if (trailing) parts.push(trailing);
    cursor = start + raw.length;
  }
  if (cursor < message.length) parts.push(message.slice(cursor));

  return <Text token="body" selectable style={{ lineHeight: 26 }}>{parts}</Text>;
}

export default function AnnouncementDetailScreen() {
  const theme = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const { showToast } = useToast();
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const [announcement, setAnnouncement] = useState<UserAnnouncement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await getAnnouncement(profile.uid, id);
      setAnnouncement(next);
      setError(next ? null : 'This announcement is no longer available.');
      if (next && next.readAt === null) {
        await markAnnouncementRead(profile.uid, id);
        invalidateNotificationBadge(profile.uid);
        setAnnouncement({ ...next, readAt: new Date() });
      }
    } catch {
      setError('Could not load this announcement. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id, profile]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  async function openLink(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      showToast('Could not open this link.', 'danger');
    }
  }

  return (
    <Screen
      scroll
      header={<TopAppBar title="Announcement" onBack={() => router.back()} />}
      contentStyle={{ paddingBottom: theme.space[16] }}
    >
      <View style={{ paddingTop: theme.space[16], gap: theme.space[16] }}>
        {loading ? (
          <Card variant="raised">
            <View style={{ gap: theme.space[12] }}>
              <Skeleton width="35%" />
              <Skeleton width="80%" />
              <Skeleton variant="list" rows={3} />
            </View>
          </Card>
        ) : error || !announcement ? (
          <EmptyState
            icon="megaphone-outline"
            title="Announcement unavailable"
            description={error ?? 'This announcement could not be found.'}
            action={<Button label="Try again" icon="refresh-outline" variant="secondary" onPress={() => void load()} />}
          />
        ) : (
          <>
            <Card variant="raised">
              <View style={{ gap: theme.space[12] }}>
                <Badge label="Announcement" tone="info" />
                <Text token="h1" selectable>{announcement.title}</Text>
                <Text token="caption" color={theme.colors.textMuted}>{formatDisplayDateTime(announcement.createdAt)}</Text>
                <View style={{ height: 0.5, backgroundColor: theme.colors.borderSubtle }} />
                <AnnouncementMessage message={announcement.message} onOpenLink={(url) => void openLink(url)} />
              </View>
            </Card>
          </>
        )}
      </View>
    </Screen>
  );
}
