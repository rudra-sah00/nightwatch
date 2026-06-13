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
  return getAnalyticsConsent();
}

// --- Web/Desktop Firebase Analytics helpers ---

async function logWebEvent(name: string, params?: Record<string, unknown>) {
  const { getFirebaseAnalytics } = await import('@/lib/firebase');
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;
  const { logEvent } = await import('firebase/analytics');
  logEvent(analytics, name, params);
}

// --- Crash Reporting ---

export function reportError(message: string, stack?: string) {
  if (typeof window === 'undefined') return;

  if (isNative()) {
    import('@/capacitor/firebase')
      .then(({ recordException }) => recordException(message, stack))
      .catch(() => {});
  } else {
    // Log as a Firebase Analytics event on web/desktop
    logWebEvent('app_exception', {
      description: message,
      fatal: false,
      stack: stack?.slice(0, 1000),
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
    import('@/capacitor/firebase')
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
    import('@/capacitor/firebase')
      .then(({ logEvent }) => logEvent(name, params))
      .catch(() => {});
  } else {
    logWebEvent(name, params).catch(() => {});
  }
}

export function trackScreen(screenName: string) {
  if (!shouldTrack()) return;

  if (isNative()) {
    import('@/capacitor/firebase')
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
    import('@/capacitor/firebase')
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
        import('firebase/analytics').then(({ setUserId }) => {
          setUserId(analytics, userId);
        });
      })
      .catch(() => {});
  }
}

// --- User Properties ---

export function setUserProperty(key: string, value: string | null) {
  if (!shouldTrack()) return;

  if (isNative()) {
    import('@/capacitor/firebase')
      .then(({ setAnalyticsUserProperty }) =>
        setAnalyticsUserProperty(key, value),
      )
      .catch(() => {});
  } else {
    import('@/lib/firebase')
      .then(({ getFirebaseAnalytics }) => getFirebaseAnalytics())
      .then((analytics) => {
        if (!analytics) return;
        import('firebase/analytics').then(({ setUserProperties }) => {
          setUserProperties(analytics, { [key]: value });
        });
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
