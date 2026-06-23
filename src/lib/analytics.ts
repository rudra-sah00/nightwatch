/**
 * Central analytics & crash reporting module.
 * On native (Capacitor): routes to Firebase Crashlytics & Analytics plugins.
 * On web/desktop: routes to Firebase JS Analytics SDK (error events for crash reporting).
 */

import { getAnalyticsConsent } from '@/lib/analytics-consent';

function isNative(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!(
      window as { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor?.isNativePlatform?.()
  );
}

function isElectron(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window;
}

function shouldTrack(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NODE_ENV === 'development') return false;
  if (process.env.NEXT_PUBLIC_APP_ENV === 'staging') return false;
  return getAnalyticsConsent();
}

// --- Cached module references to avoid repeated dynamic import overhead ---

let _nativeModule: typeof import('@/capacitor/firebase') | null = null;
let _nativeModulePromise: Promise<
  typeof import('@/capacitor/firebase')
> | null = null;

function getNativeFirebase() {
  if (_nativeModule) return Promise.resolve(_nativeModule);
  if (!_nativeModulePromise) {
    _nativeModulePromise = import('@/capacitor/firebase').then((m) => {
      _nativeModule = m;
      return m;
    });
  }
  return _nativeModulePromise;
}

let _webAnalyticsModule: typeof import('firebase/analytics') | null = null;

async function logWebEvent(name: string, params?: Record<string, unknown>) {
  const { getFirebaseAnalytics } = await import('@/lib/firebase');
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;
  if (!_webAnalyticsModule) {
    _webAnalyticsModule = await import('firebase/analytics');
  }
  _webAnalyticsModule.logEvent(analytics, name, params);
}

// --- Rate limiting for error reporting ---

const _recentErrors = new Map<string, number>();
const ERROR_COOLDOWN_MS = 10_000;

function isRateLimited(message: string): boolean {
  const key = message.slice(0, 120);
  const last = _recentErrors.get(key);
  const now = Date.now();
  if (last && now - last < ERROR_COOLDOWN_MS) return true;
  _recentErrors.set(key, now);
  // Evict old entries to prevent memory leak
  if (_recentErrors.size > 50) {
    for (const [k, t] of _recentErrors) {
      if (now - t > ERROR_COOLDOWN_MS) _recentErrors.delete(k);
    }
  }
  return false;
}

// --- Crash Reporting ---

export function reportError(message: string, stack?: string) {
  if (typeof window === 'undefined') return;
  if (isRateLimited(message)) return;

  if (isNative()) {
    getNativeFirebase()
      .then(({ recordException }) => recordException(message, stack))
      .catch(() => {});
  } else {
    logWebEvent('app_exception', {
      description: message,
      fatal: false,
      stack: stack?.slice(0, 4000),
    }).catch(() => {});
  }
}

export function reportCatchError(error: unknown) {
  if (typeof window === 'undefined') return;
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  reportError(msg, stack);
}

export function crashLog(message: string) {
  if (typeof window === 'undefined') return;

  if (isNative()) {
    getNativeFirebase()
      .then(({ logCrashlyticsMessage }) => logCrashlyticsMessage(message))
      .catch(() => {});
  } else {
    logWebEvent('app_log', { message: message.slice(0, 500) }).catch(() => {});
  }
}

// --- Analytics Events ---

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!shouldTrack()) return;

  if (isNative()) {
    getNativeFirebase()
      .then(({ logEvent }) => logEvent(name, params))
      .catch(() => {});
  } else {
    logWebEvent(name, params).catch(() => {});
  }
}

export function trackScreen(screenName: string) {
  if (!shouldTrack()) return;

  if (isNative()) {
    getNativeFirebase()
      .then(({ setAnalyticsScreen }) => setAnalyticsScreen(screenName))
      .catch(() => {});
  } else {
    logWebEvent('screen_view', { firebase_screen: screenName }).catch(() => {});
  }
}

// --- User Identity ---

export function setAnalyticsUser(userId: string | null) {
  if (typeof window === 'undefined') return;

  if (isNative()) {
    getNativeFirebase()
      .then(({ setCrashlyticsUserId, setAnalyticsUserId }) => {
        if (userId) setCrashlyticsUserId(userId);
        setAnalyticsUserId(userId);
      })
      .catch(() => {});
  } else {
    import('@/lib/firebase')
      .then(({ getFirebaseAnalytics }) => getFirebaseAnalytics())
      .then((analytics) => {
        if (!analytics) return;
        if (!_webAnalyticsModule) {
          import('firebase/analytics').then((m) => {
            _webAnalyticsModule = m;
            m.setUserId(analytics, userId);
          });
        } else {
          _webAnalyticsModule.setUserId(analytics, userId);
        }
      })
      .catch(() => {});
  }
}

// --- User Properties ---

export function setUserProperty(key: string, value: string | null) {
  if (!shouldTrack()) return;

  if (isNative()) {
    getNativeFirebase()
      .then(({ setAnalyticsUserProperty }) =>
        setAnalyticsUserProperty(key, value),
      )
      .catch(() => {});
  } else {
    import('@/lib/firebase')
      .then(({ getFirebaseAnalytics }) => getFirebaseAnalytics())
      .then((analytics) => {
        if (!analytics) return;
        if (!_webAnalyticsModule) {
          import('firebase/analytics').then((m) => {
            _webAnalyticsModule = m;
            m.setUserProperties(analytics, { [key]: value });
          });
        } else {
          _webAnalyticsModule.setUserProperties(analytics, { [key]: value });
        }
      })
      .catch(() => {});
  }
}

/** Sets standard platform properties on init. */
export function setPlatformProperties() {
  const platform = isNative() ? 'mobile' : isElectron() ? 'desktop' : 'web';
  setUserProperty('platform', platform);
  setUserProperty('app_version', process.env.NEXT_PUBLIC_APP_VERSION ?? null);
}
