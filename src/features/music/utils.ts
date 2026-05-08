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
