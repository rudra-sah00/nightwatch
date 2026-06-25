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

    // Handle foreground messages as toasts with proper deep-linking
    const unsub = onForegroundMessage((payload) => {
      if (payload.title) {
        const data = payload.data || {};
        let route = '/';

        if (data.type === 'dm') {
          route = data.senderId ? `/dm?peer=${data.senderId}` : '/dm';
        } else if (
          data.type === 'explore_reply' ||
          data.type === 'explore_ai_reply' ||
          data.type === 'explore_mention'
        ) {
          const threadId = data.threadId || data.postId;
          route = threadId ? `/explore?thread=${threadId}` : '/explore';
        } else if (data.url) {
          route = data.url;
        }

        toast(payload.title, {
          description: payload.body,
          action: {
            label: 'Open',
            onClick: () => window.location.assign(route),
          },
        });
      }
    });

    return () => unsub?.();
  }, [userId, sessionId]);
}
