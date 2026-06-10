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
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messaging: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (typeof window === 'undefined') return null;
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
