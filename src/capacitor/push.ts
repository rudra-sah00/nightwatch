import { PushNotifications } from '@capacitor/push-notifications';
import { apiFetch } from '@/lib/fetch';

async function sendTokenToBackend(token: string) {
  const platform =
    window.Capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android';
  await apiFetch('/api/notifications/register', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Register native push notifications on Capacitor (Android/iOS).
 * Requests permission, gets FCM token, sends to backend.
 */
export async function registerNativePush() {
  // Remove stale listeners from previous calls
  await PushNotifications.removeAllListeners();

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;

  // Listen for token BEFORE calling register
  await PushNotifications.addListener(
    'registration',
    async ({ value: token }) => {
      await sendTokenToBackend(token);
    },
  );

  await PushNotifications.addListener('registrationError', (error) => {
    console.error('[Push] Registration error:', error);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push] Foreground:', notification.title);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const url = action.notification.data?.url;
    if (url) window.location.href = url;
  });

  await PushNotifications.register();
}
