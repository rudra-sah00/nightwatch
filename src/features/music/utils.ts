/**
 * Format a duration in seconds into a human-readable `m:ss` string.
 *
 * @param seconds - Duration in seconds (fractional values are floored).
 * @returns Formatted time string, e.g. `"3:07"`.
 *
 * @example
 * ```ts
 * formatTime(187); // "3:07"
 * formatTime(0);   // "0:00"
 * ```
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

import { checkIsDesktop, checkIsMobile } from '@/lib/electron-bridge';

const DEVICE_ID_KEY = 'nightwatch:device-id';

/**
 * Returns a stable unique device ID for this browser profile.
 * Generated once on first access, persisted in localStorage.
 * Survives page refreshes, logouts, and re-logins.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Returns the display name for this device based on platform detection.
 * Supports a sessionStorage override for local testing.
 */
export function getDeviceName(): string {
  if (typeof window !== 'undefined') {
    const override = sessionStorage.getItem('nightwatch:device-name-override');
    if (override) return override;
  }
  if (checkIsDesktop()) return 'Desktop App';
  if (checkIsMobile()) return 'Mobile';
  return 'Web Player';
}
