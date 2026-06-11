'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/fetch';
import { getFCMToken, onForegroundMessage } from '@/lib/firebase';
import { useAuthStore } from '@/store/use-auth-store';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

/**
 * Registers the device for push notifications via FCM.
 * - On Capacitor (Android/iOS): uses native push plugin
 * - On web/desktop: uses Firebase JS SDK + service worker
 *
 * Re-registers whenever the user identity changes (login/logout/switch).
 * Should be mounted once in the authenticated layout.
 */
export function usePushNotifications() {
  const userId = useAuthStore((s) => s.user?.id);
  const lastRegisteredUser = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!userId) return;
    if (lastRegisteredUser.current === userId) return;

    lastRegisteredUser.current = userId;
    console.log('[Push] Registering push for user:', userId);

    // Native Capacitor push (Android/iOS)
    if (
      'Capacitor' in window &&
      (
        window as { Capacitor?: { isNativePlatform?: () => boolean } }
      ).Capacitor?.isNativePlatform?.()
    ) {
      import('@/capacitor/push')
        .then(({ registerNativePush }) => registerNativePush())
        .catch((e) => console.error('[Push] Native registration failed:', e));
      return;
    }

    // Web push (browser + Electron)
    (async () => {
      try {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const token = await getFCMToken(VAPID_KEY);
        if (!token) return;

        sessionStorage.setItem('nightwatch:fcm-token', token);

        await apiFetch('/api/notifications/register', {
          method: 'POST',
          body: JSON.stringify({ token, platform: 'web' }),
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        // Silent fail — notifications are non-critical
      }
    })();

    // Handle foreground messages as toasts
    const unsub = onForegroundMessage((payload) => {
      if (payload.title) {
        toast(payload.title, { description: payload.body });
      }
    });

    return () => unsub?.();
  }, [userId]);
}
