/**
 * Shared cookie utilities.
 * All document.cookie access is centralized here to avoid scattered direct usage.
 */

const COOKIE_KEY = 'cookie' as const;

function getDoc(): Document | undefined {
  return typeof document !== 'undefined' ? document : undefined;
}

/**
 * Safely extracts a cookie value by name.
 * This is a zero-dependency helper for client-side environments.
 */
export function getCookie(name: string): string | undefined {
  const doc = getDoc();
  if (!doc) return undefined;

  const value = `; ${doc[COOKIE_KEY]}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(';').shift();
  }

  return undefined;
}

/**
 * Sets a cookie value with the given options.
 * Centralizes cookie writes to a single location.
 */
export function setCookie(name: string, value: string, options?: string): void {
  const doc = getDoc();
  if (!doc) return;
  doc[COOKIE_KEY] = options
    ? `${name}=${value};${options}`
    : `${name}=${value};path=/;max-age=31536000;samesite=lax`;
}
