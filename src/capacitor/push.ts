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
  // Try the Plugins proxy first (Capacitor 8 injects this)
  const plugin = cap.Plugins?.PushNotifications;
  if (plugin) return plugin;
  // Fallback: registerPlugin approach
  return null;
}

/**
 * Register native push notifications on Capacitor (Android/iOS).
 * Requests permission, gets FCM token, sends to backend.
 */
export async function registerNativePush() {
  const plugin = getNativePushPlugin();
  if (!plugin) {
    console.warn('[Push] PushNotifications native plugin not found');
    return;
  }

  // Check permission
  let permStatus: string;
  try {
    const check = await plugin.checkPermissions();
    permStatus = check.receive;
    console.log('[Push] Current permission:', permStatus);
  } catch (e) {
    console.warn('[Push] checkPermissions failed:', e);
    permStatus = 'prompt';
  }

  if (permStatus !== 'granted') {
    try {
      const req = await plugin.requestPermissions();
      permStatus = req.receive;
      console.log('[Push] After request:', permStatus);
    } catch (e) {
      console.warn('[Push] requestPermissions failed:', e);
    }
  }

  if (permStatus === 'denied') {
    console.log('[Push] Permission denied');
    return;
  }

  // Add listeners via Capacitor bridge
  const cap = (window as any).Capacitor;
  const addListener = (event: string, cb: (data: any) => void) => {
    try {
      plugin.addListener(event, cb);
    } catch {
      // Use Capacitor.Plugins event bridge as fallback
      cap?.Plugins?.PushNotifications?.addListener?.(event, cb);
    }
  };

  addListener('registration', async (data: { value: string }) => {
    console.log('[Push] Got token:', data.value.slice(0, 20) + '...');
    try {
      await sendTokenToBackend(data.value);
      console.log('[Push] Token sent to backend');
    } catch (e) {
      console.error('[Push] Failed to send token:', e);
    }
  });

  addListener('registrationError', (error: any) => {
    console.error('[Push] Registration error:', JSON.stringify(error));
  });

  addListener('pushNotificationReceived', (notification: any) => {
    console.log('[Push] Foreground:', notification.title);
  });

  addListener('pushNotificationActionPerformed', (action: any) => {
    const url = action.notification?.data?.url;
    if (url) window.location.href = url;
  });

  // Register to get token
  console.log('[Push] Calling register...');
  try {
    await plugin.register();
    console.log('[Push] Register complete');
  } catch (e) {
    console.error('[Push] register() failed:', e);
  }
}
