/**
 * Client platform identification.
 *
 * The same web bundle runs in the browser, inside Electron, and inside the
 * Capacitor WebView on iOS/Android/Android TV. The backend needs to tell them
 * apart because VOD playback is only possible where the shell can inject request
 * headers: the CDN requires an allow-listed `Referer`, and `Referer` is a
 * forbidden header in the browser, so no amount of client JS can supply it.
 *
 * Native shells can inject it (Electron via `webRequest.onBeforeSendHeaders`,
 * Android via a WebView request interceptor), so they receive raw CDN URLs and
 * stream direct. Web receives a `PLAYBACK_REQUIRES_APP` error instead.
 *
 * This is a capability hint, not an authorisation check — spoofing it just yields
 * a URL the browser cannot fetch anyway.
 */

export const CLIENT_PLATFORM_HEADER = 'x-nightwatch-platform';

export type ClientPlatform =
  | 'web'
  | 'electron'
  | 'android'
  | 'ios'
  | 'androidtv';

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

/**
 * Detect the current platform. Evaluated per call rather than cached, because
 * Capacitor and the Electron preload bridge attach to `window` asynchronously and
 * a value cached at module load can be wrong.
 *
 * Falls back to `'web'` — the most restricted option — whenever detection is
 * uncertain, so a misdetected native shell degrades to "open the app" messaging
 * rather than handing a browser URLs it cannot play.
 */
export function getClientPlatform(): ClientPlatform {
  if (typeof window === 'undefined') return 'web';

  // Electron preload exposes electronAPI (see lib/electron-bridge).
  if ('electronAPI' in window) return 'electron';

  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (cap?.isNativePlatform?.()) {
    const platform = cap.getPlatform?.();
    if (platform === 'ios') return 'ios';
    if (platform === 'android') {
      // MainActivity sets this for UI_MODE_TYPE_TELEVISION devices.
      const isTv =
        (window as unknown as { __ANDROID_TV__?: boolean }).__ANDROID_TV__ ===
          true ||
        (() => {
          try {
            return localStorage.getItem('__ANDROID_TV__') === 'true';
          } catch {
            return false;
          }
        })();
      return isTv ? 'androidtv' : 'android';
    }
  }

  return 'web';
}

/** True when this shell can inject CDN auth headers, so VOD can play direct. */
export function canPlayVod(): boolean {
  return getClientPlatform() !== 'web';
}
