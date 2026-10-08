import type { ContactPreference } from '../types/tutorProfile';

export type ContactActionIcon =
  | 'chatbubble-ellipses-outline'
  | 'logo-facebook'
  | 'call-outline'
  | 'mail-outline';

export interface ContactAction {
  label: string;
  icon: ContactActionIcon;
  url: string;
}

const MESSENGER_PATTERN = /^(?:https?:\/\/)?(?:www\.)?m\.me\/([A-Za-z0-9._-]+)\/?$/i;
const FACEBOOK_PATTERN = /^(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/([A-Za-z0-9._-]+)\/?$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizedPhone(value: string): string {
  return value.trim().replace(/[\s()-]/g, '');
}

function contactPath(value: string, pattern: RegExp): string | null {
  const match = value.trim().match(pattern);
  return match?.[1] ?? null;
}

export function contactLabel(preference: ContactPreference): string {
  if (preference === 'messenger') return 'Messenger';
  if (preference === 'facebook') return 'Facebook';
  if (preference === 'phone') return 'Phone';
  return 'Email';
}

export function contactPlaceholder(preference: ContactPreference, accountEmail: string): string {
  if (preference === 'messenger') return 'm.me/username';
  if (preference === 'facebook') return 'facebook.com/username';
  if (preference === 'phone') return '09458492263';
  return accountEmail;
}

export function contactHelper(preference: ContactPreference): string {
  if (preference === 'messenger') return 'Use a Messenger profile link, such as m.me/username.';
  if (preference === 'facebook') return 'Use a Facebook profile link, such as facebook.com/username.';
  if (preference === 'phone') return 'Use an 11-digit Philippine mobile number starting with 09.';
  return 'Use an email address that parents or tutors can reach.';
}

export function contactValidationError(preference: ContactPreference, rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) return 'Add a contact detail.';

  if (preference === 'messenger' && !contactPath(value, MESSENGER_PATTERN)) {
    return 'Use a Messenger link like m.me/username.';
  }
  if (preference === 'facebook' && !contactPath(value, FACEBOOK_PATTERN)) {
    return 'Use a Facebook link like facebook.com/username.';
  }
  if (preference === 'phone' && !/^09\d{9}$/.test(normalizedPhone(value))) {
    return 'Enter an 11-digit mobile number starting with 09.';
  }
  if (preference === 'email' && !EMAIL_PATTERN.test(value)) {
    return 'Enter a valid email address.';
  }

  return null;
}

export function normalizeContactValue(preference: ContactPreference, rawValue: string): string {
  const value = rawValue.trim();
  if (preference === 'messenger') {
    return `https://m.me/${contactPath(value, MESSENGER_PATTERN) ?? value}`;
  }
  if (preference === 'facebook') {
    return `https://facebook.com/${contactPath(value, FACEBOOK_PATTERN) ?? value}`;
  }
  if (preference === 'phone') return normalizedPhone(value);
  return value.toLowerCase();
}

export function contactAction(preference: ContactPreference, rawValue: string): ContactAction | null {
  if (contactValidationError(preference, rawValue)) return null;

  const normalized = normalizeContactValue(preference, rawValue);
  if (preference === 'messenger') return { label: 'Open Messenger', icon: 'chatbubble-ellipses-outline', url: normalized };
  if (preference === 'facebook') return { label: 'View Facebook', icon: 'logo-facebook', url: normalized };
  if (preference === 'phone') return { label: 'Call', icon: 'call-outline', url: `tel:${normalized}` };
  return { label: 'Email', icon: 'mail-outline', url: `mailto:${normalized}` };
}
