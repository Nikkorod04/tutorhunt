import React from 'react';

import { useAuthStore } from '@/stores/authStore';
import { ParentHome } from '@/screens/ParentHome';
import { TutorHome } from '@/screens/TutorHome';

/**
 * Home for whichever role is signed in.
 *
 * The two dashboards share a route because they share a tab position; the
 * role decides which one renders.
 */
export default function HomeScreen() {
  const role = useAuthStore((state) => state.profile?.role ?? null);

  if (role === 'parent') return <ParentHome />;
  return <TutorHome />;
}
