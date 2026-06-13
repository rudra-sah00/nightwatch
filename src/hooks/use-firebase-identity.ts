'use client';

import { useEffect } from 'react';
import { setAnalyticsUser, setPlatformProperties } from '@/lib/analytics';
import { useAuthStore } from '@/store/use-auth-store';

/**
 * Syncs the authenticated user's identity to Firebase Analytics/Crashlytics
 * on all platforms. Sets user properties on first mount.
 * Mount once in the authenticated layout.
 */
export function useFirebaseIdentity() {
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    setPlatformProperties();
  }, []);

  useEffect(() => {
    if (!userId) return;
    setAnalyticsUser(userId);
  }, [userId]);
}
