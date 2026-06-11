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
  // Wait for Capacitor bridge to be fully ready
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isPluginAvailable('PushNotifications')) {
    console.warn('[Push] PushNotifications plugin not available');
    return;
  }

  // Remove stale listeners from previous calls
  await PushNotifications.removeAllListeners();

  // Check/request permission
  let permStatus: string;
  try {
    const check = await PushNotifications.checkPermissions();
    permStatus = check.receive;
    console.log('[Push] Current permission:', permStatus);
  } catch (e) {
    console.warn('[Push] checkPermissions failed:', e);
    permStatus = 'prompt';
  }

  if (permStatus === 'prompt' || permStatus === 'prompt-with-rationale') {
    try {
      const req = await PushNotifications.requestPermissions();
      permStatus = req.receive;
      console.log('[Push] After request:', permStatus);
    } catch (e) {
      console.warn('[Push] requestPermissions failed:', e);
    }
  }

  if (permStatus === 'denied') {
    console.log('[Push] Permission denied, cannot register');
    return;
  }

  // Listen for token BEFORE calling register
  await PushNotifications.addListener(
    'registration',
    async ({ value: token }) => {
      console.log('[Push] Got token:', token.slice(0, 20) + '...');
      try {
        await sendTokenToBackend(token);
        console.log('[Push] Token sent to backend');
      } catch (e) {
        console.error('[Push] Failed to send token:', e);
      }
    },
  );

  await PushNotifications.addListener('registrationError', (error) => {
    console.error('[Push] Registration error:', JSON.stringify(error));
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push] Foreground:', notification.title);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const url = action.notification.data?.url;
    if (url) window.location.href = url;
  });

  console.log('[Push] Calling register...');
  await PushNotifications.register();
  console.log('[Push] Register complete');
}
