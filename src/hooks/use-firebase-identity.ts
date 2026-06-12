'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/use-auth-store';

/**
 * Syncs the authenticated user's identity to Firebase Crashlytics & Analytics
 * on native Capacitor platforms (Android/iOS). No-ops on web/desktop.
 * Mount once in the authenticated layout.
 */
export function useFirebaseIdentity() {
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    if (!userId) return;

    import('@/capacitor/firebase')
      .then(({ setCrashlyticsUserId, setAnalyticsUserId }) => {
        setCrashlyticsUserId(userId);
        setAnalyticsUserId(userId);
      })
      .catch(() => {});
  }, [userId]);
}
