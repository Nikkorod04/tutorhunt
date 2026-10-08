import type { ParentPost } from '@/types';
import { formatDisplayDate } from './date';

export function parentPostDateLabel(post: Pick<ParentPost, 'createdAt' | 'editedAt'>): string {
  const posted = `Posted ${formatDisplayDate(post.createdAt)}`;
  return post.editedAt ? `${posted} · Edited on ${formatDisplayDate(post.editedAt)}` : posted;
}
