import type { Analytics } from 'firebase/analytics';
import { getApps, initializeApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  type Messaging,
  onMessage,
} from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const hasFirebaseConfig = !!firebaseConfig.projectId && !!firebaseConfig.apiKey;

const app = hasFirebaseConfig
  ? getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0]
  : null;

// --- Analytics (web/desktop) ---

let analytics: Analytics | null = null;

/**
 * Lazily initializes Firebase Analytics for web/desktop platforms.
 * Returns null on server or if analytics is unavailable.
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  if (!app) return null;
  if (process.env.NEXT_PUBLIC_APP_ENV === 'staging') return null;
  if (analytics) return analytics;
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    if (await isSupported()) {
      analytics = getAnalytics(app);
      return analytics;
    }
  } catch {}
  return null;
}

let messaging: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!app) return null;
  if (!('Notification' in window)) return null;
  if (!messaging) messaging = getMessaging(app);
  return messaging;
}

/**
 * Request notification permission and get the FCM token.
 * Returns null if permission denied or unavailable.
 */
export async function getFCMToken(vapidKey: string): Promise<string | null> {
  const m = getMessagingInstance();
  if (!m) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  try {
    const token = await getToken(m, {
      vapidKey,
      serviceWorkerRegistration:
        await navigator.serviceWorker.getRegistration(),
    });
    return token;
  } catch {
    return null;
  }
}

/**
 * Listen for foreground FCM messages.
 * Returns an unsubscribe function.
 */
export function onForegroundMessage(
  callback: (payload: {
    title?: string;
    body?: string;
    icon?: string;
    data?: Record<string, string>;
  }) => void,
): (() => void) | null {
  const m = getMessagingInstance();
  if (!m) return null;

  return onMessage(m, (payload) => {
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
      icon: payload.notification?.icon,
      data: payload.data,
    });
  });
}
