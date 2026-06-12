import { getDeviceId } from '@/lib/device-id';
import { apiFetch } from '@/lib/fetch';

async function sendTokenToBackend(token: string, sessionId?: string | null) {
  const platform =
    window.Capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android';
  const deviceId = getDeviceId();
  await apiFetch('/api/notifications/register', {
    method: 'POST',
    body: JSON.stringify({ token, platform, deviceId, sessionId }),
    headers: { 'Content-Type': 'application/json' },
  });
}

interface CapacitorPushPlugin {
  checkPermissions(): Promise<{ receive: string }>;
  requestPermissions(): Promise<{ receive: string }>;
  register(): Promise<void>;
  addListener(event: string, cb: (data: unknown) => void): void;
}

/**
 * Get the native PushNotifications plugin via Capacitor bridge.
 * Uses the injected native bridge directly to avoid "not implemented" errors
 * that occur when using the npm package with remote URLs.
 */
function getNativePushPlugin(): CapacitorPushPlugin | null {
  const cap = (window as { Capacitor?: { Plugins?: Record<string, unknown> } })
    .Capacitor;
  if (!cap) return null;
  const plugin = cap.Plugins?.PushNotifications as
    | CapacitorPushPlugin
    | undefined;
  return plugin || null;
}

/**
 * Register native push notifications on Capacitor (Android/iOS).
 * Requests permission, gets FCM token, sends to backend.
 */
export async function registerNativePush(sessionId?: string | null) {
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

  const addListener = (event: string, cb: (data: unknown) => void) => {
    try {
      plugin.addListener(event, cb);
    } catch {
      /* listener unavailable */
    }
  };

  addListener('registration', async (data) => {
    try {
      await sendTokenToBackend((data as { value: string }).value, sessionId);
    } catch {
      /* silent fail */
    }
  });

  addListener('pushNotificationReceived', () => {});

  addListener('pushNotificationActionPerformed', (action) => {
    const url = (action as { notification?: { data?: { url?: string } } })
      .notification?.data?.url;
    if (url) window.location.href = url;
  });

  try {
    await plugin.register();
  } catch {
    /* silent fail */
  }
}
