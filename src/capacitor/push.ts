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
 * Get the native PushNotifications plugin via Capacitor bridge.
 * Uses the injected native bridge directly to avoid "not implemented" errors
 * that occur when using the npm package with remote URLs.
 */
function getNativePushPlugin() {
  const cap = (window as any).Capacitor;
  if (!cap) return null;
  const plugin = cap.Plugins?.PushNotifications;
  return plugin || null;
}

/**
 * Register native push notifications on Capacitor (Android/iOS).
 * Requests permission, gets FCM token, sends to backend.
 */
export async function registerNativePush() {
  const plugin = getNativePushPlugin();
  if (!plugin) return;

  let permStatus: string;
  try {
    const check = await plugin.checkPermissions();
    permStatus = check.receive;
  } catch {
    permStatus = 'prompt';
  }

  if (permStatus !== 'granted') {
    try {
      const req = await plugin.requestPermissions();
      permStatus = req.receive;
    } catch {
      /* permission request unavailable */
    }
  }

  if (permStatus === 'denied') return;

  const addListener = (event: string, cb: (data: any) => void) => {
    try {
      plugin.addListener(event, cb);
    } catch {
      /* listener unavailable */
    }
  };

  addListener('registration', async (data: { value: string }) => {
    try {
      await sendTokenToBackend(data.value);
    } catch {
      /* silent fail */
    }
  });

  addListener('pushNotificationReceived', () => {});

  addListener('pushNotificationActionPerformed', (action: any) => {
    const url = action.notification?.data?.url;
    if (url) window.location.href = url;
  });

  try {
    await plugin.register();
  } catch {
    /* silent fail */
  }
}
