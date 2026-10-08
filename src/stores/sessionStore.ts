import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { create } from 'zustand';

import type { SessionPage } from '@/services/sessions.service';
import type { Session, SessionStatus } from '@/types';

interface SessionState {
  items: Session[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  filter: SessionStatus | undefined;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  setFilter: (filter: SessionStatus | undefined) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPage: (page: SessionPage) => void;
  appendPage: (page: SessionPage) => void;
  upsert: (session: Session) => void;
  remove: (id: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  items: [], cursor: null, hasMore: false, filter: undefined,
  loading: false, loadingMore: false, error: null,
  setFilter: (filter) => set({ filter }),
  setLoading: (loading) => set({ loading }),
  setLoadingMore: (loadingMore) => set({ loadingMore }),
  setError: (error) => set({ error }),
  setPage: (page) => set({ ...page, error: null }),
  appendPage: (page) => set((state) => {
    const seen = new Set(state.items.map((item) => item.id));
    return {
      items: [...state.items, ...page.items.filter((item) => !seen.has(item.id))],
      cursor: page.cursor,
      hasMore: page.hasMore,
    };
  }),
  upsert: (session) => set((state) => ({
    items: [...state.items.filter((item) => item.id !== session.id), session]
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime()),
  })),
  remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}));
