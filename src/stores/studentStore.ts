/**
 * Student list and selection state.
 *
 * Holds only what a screen is currently showing: the loaded page, the cursor,
 * the active filter and the selected student. Nothing is cached permanently
 * (blueprint section 45).
 */

import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { create } from 'zustand';

import type { StudentPage } from '@/services/students.service';
import type { Student, StudentStatus } from '@/types';

interface StudentState {
  items: Student[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  /** Undefined means "all statuses". */
  filter: StudentStatus | undefined;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  selected: Student | null;

  setFilter: (filter: StudentStatus | undefined) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loadingMore: boolean) => void;
  setError: (error: string | null) => void;
  /** Replaces the list — used on first load, refresh and filter change. */
  setPage: (page: StudentPage) => void;
  /** Appends the next page. */
  appendPage: (page: StudentPage) => void;
  /** Inserts or replaces one student, keeping the list in nickname order. */
  upsert: (student: Student) => void;
  setSelected: (student: Student | null) => void;
  reset: () => void;
}

const EMPTY = {
  items: [] as Student[],
  cursor: null,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null,
  selected: null,
};

export const useStudentStore = create<StudentState>((set) => ({
  ...EMPTY,
  filter: undefined,

  setFilter: (filter) => set({ filter }),
  setLoading: (loading) => set({ loading }),
  setLoadingMore: (loadingMore) => set({ loadingMore }),
  setError: (error) => set({ error }),

  setPage: (page) =>
    set({
      items: page.items,
      cursor: page.cursor,
      hasMore: page.hasMore,
      error: null,
    }),

  appendPage: (page) =>
    set((state) => {
      // Guard against a duplicate page arriving from a double tap.
      const seen = new Set(state.items.map((s) => s.id));
      const merged = [...state.items, ...page.items.filter((s) => !seen.has(s.id))];
      return { items: merged, cursor: page.cursor, hasMore: page.hasMore };
    }),

  upsert: (student) =>
    set((state) => {
      const exists = state.items.some((s) => s.id === student.id);
      const items = exists
        ? state.items.map((s) => (s.id === student.id ? student : s))
        : [...state.items, student].sort((a, b) =>
            a.nickname.localeCompare(b.nickname, undefined, { sensitivity: 'base' }),
          );
      return { items };
    }),

  setSelected: (selected) => set({ selected }),

  reset: () => set({ ...EMPTY, filter: undefined }),
}));
