export type NotificationType =
  | 'upcoming_session'
  | 'pro_update'
  | 'product_update';

export interface AppNotification {
  id: string;
  uid: string;
  type: NotificationType;
  title: string;
  body: string;
  route: string | null;
  data: Record<string, string>;
  createdAt: Date;
  readAt: Date | null;
}

export interface NotificationPreferences {
  sessionReminders: boolean;
  proUpdates: boolean;
  productUpdates: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  sessionReminders: true,
  proUpdates: true,
  productUpdates: true,
};
