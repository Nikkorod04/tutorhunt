import { listAnnouncements } from './announcements.service';
import { listNotifications } from './notifications.service';

const BADGE_CACHE_TTL_MS = 30_000;

type BadgeCacheEntry = {
  hasUnread: boolean;
  checkedAt: number;
};

const badgeCache = new Map<string, BadgeCacheEntry>();
const inFlight = new Map<string, Promise<boolean>>();

/**
 * Reads the small badge summary once per short window instead of once per
 * focused tab. The full notifications screen still owns the complete feed.
 */
export async function getNotificationBadgeState(uid: string): Promise<boolean> {
  const cached = badgeCache.get(uid);
  if (cached && Date.now() - cached.checkedAt < BADGE_CACHE_TTL_MS) {
    return cached.hasUnread;
  }

  const pending = inFlight.get(uid);
  if (pending) return pending;

  const request = Promise.all([listNotifications(uid), listAnnouncements(uid)])
    .then(([items, announcements]) => {
      const hasUnread = items.some((item) => item.readAt === null)
        || announcements.some((item) => item.readAt === null);
      badgeCache.set(uid, { hasUnread, checkedAt: Date.now() });
      return hasUnread;
    })
    .finally(() => {
      inFlight.delete(uid);
    });

  inFlight.set(uid, request);
  return request;
}

/** Call after a read state changes so the next focused bell rechecks. */
export function invalidateNotificationBadge(uid: string): void {
  badgeCache.delete(uid);
}

