import { PushNotifications } from '@capacitor/push-notifications';
import { apiFetch } from '@/lib/fetch';

/**
 * Register native push notifications on Capacitor (Android/iOS).
 * Requests permission, gets FCM token, sends to backend.
 */
export async function registerNativePush() {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', async ({ value: token }) => {
    await apiFetch('/api/notifications/register', {
      method: 'POST',
      body: JSON.stringify({ token, platform: 'android' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    // Foreground notification — handled natively by Android, no action needed
    console.log('[Push] Foreground:', notification.title);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const url = action.notification.data?.url;
    if (url) window.location.href = url;
  });
}
