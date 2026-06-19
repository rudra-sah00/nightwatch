'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { registerPushToken } from '@/features/auth/api';
import { getDeviceId } from '@/lib/device-id';
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
  const sessionId = useAuthStore((s) => s.user?.sessionId);
  const lastRegisteredUser = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!userId) return;
    if (lastRegisteredUser.current === userId) return;

    lastRegisteredUser.current = userId;

    // Native Capacitor push (Android/iOS)
    if (
      'Capacitor' in window &&
      (
        window as { Capacitor?: { isNativePlatform?: () => boolean } }
      ).Capacitor?.isNativePlatform?.()
    ) {
      import('@/capacitor/push')
        .then(({ registerNativePush }) => registerNativePush(sessionId))
        .catch(() => {});
      return;
    }

    // Web push (browser + Electron)
    (async () => {
      try {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const token = await getFCMToken(VAPID_KEY);
        if (!token) return;

        sessionStorage.setItem('nightwatch:fcm-token', token);

        await registerPushToken({
          token,
          platform: 'web',
          deviceId: getDeviceId(),
          sessionId,
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
  }, [userId, sessionId]);
}
