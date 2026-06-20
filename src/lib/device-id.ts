import { Device } from '@capacitor/device';

const DEVICE_ID_KEY = 'nightwatch:device-id';

/**
 * Get or generate a stable device ID for this app installation.
 * Persists in localStorage — survives page reloads and app restarts.
 * Only changes on app reinstall / data clear.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

let cachedDeviceInfo: string | null = null;

/**
 * Initialize device info by calling @capacitor/device.
 * Must be called once on app mount (client-side only).
 */
export async function initDeviceInfo(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (cachedDeviceInfo) return;
  try {
    const info = await Device.getInfo();
    if (info.platform === 'android') {
      cachedDeviceInfo = `Android - ${info.manufacturer} ${info.model}`;
    } else if (info.platform === 'ios') {
      cachedDeviceInfo = `iOS - ${info.model}`;
    } else if ('electronAPI' in window) {
      const os = info.operatingSystem;
      cachedDeviceInfo = `Desktop App - ${os === 'mac' ? 'macOS' : os === 'windows' ? 'Windows' : 'Linux'}`;
    } else {
      cachedDeviceInfo = 'Web Browser';
    }
  } catch {
    cachedDeviceInfo = getDeviceInfoSync();
  }
}

/**
 * Synchronous fallback for device info (used before async init completes).
 */
function getDeviceInfoSync(): string {
  if (typeof window === 'undefined') return 'Server';
  if ('electronAPI' in window) return 'Desktop App';
  const cap = (window as { Capacitor?: { getPlatform?: () => string } })
    .Capacitor;
  if (cap?.getPlatform) {
    const platform = cap.getPlatform();
    if (platform === 'ios') return 'iPhone App';
    if (platform === 'android') return 'Android App';
  }
  return 'Web Browser';
}

/**
 * Returns device info string. Uses cached async result if available,
 * falls back to sync detection.
 */
export function getDeviceInfo(): string {
  return cachedDeviceInfo || getDeviceInfoSync();
}
