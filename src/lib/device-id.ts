import { Capacitor } from '@capacitor/core';

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

/**
 * Returns a human-readable device/platform string for session identification.
 * Uses Capacitor.getPlatform() from @capacitor/core and Electron detection.
 */
export function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Server';
  if ('electronAPI' in window) return 'Desktop App';
  try {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      if (platform === 'ios') return 'iPhone App';
      if (platform === 'android') return 'Android App';
      return 'Mobile App';
    }
  } catch {
    // Capacitor not available
  }
  return 'Web Browser';
}
