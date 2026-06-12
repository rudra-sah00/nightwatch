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
