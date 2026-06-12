/**
 * Central analytics & crash reporting module.
 * On native (Capacitor): routes to Firebase Crashlytics & Analytics plugins.
 * On web/desktop: no-ops (Firebase JS Analytics could be added later).
 */

function isNative(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!(
      window as { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor?.isNativePlatform?.()
  );
}

// --- Crash Reporting ---

export function reportError(message: string, stack?: string) {
  if (!isNative()) return;
  import('@/capacitor/firebase')
    .then(({ recordException }) => recordException(message, stack))
    .catch(() => {});
}

export function reportCatchError(error: unknown) {
  if (!isNative()) return;
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  reportError(msg, stack);
}

export function crashLog(message: string) {
  if (!isNative()) return;
  import('@/capacitor/firebase')
    .then(({ logCrashlyticsMessage }) => logCrashlyticsMessage(message))
    .catch(() => {});
}

// --- Analytics Events ---

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!isNative()) return;
  import('@/capacitor/firebase')
    .then(({ logEvent }) => logEvent(name, params))
    .catch(() => {});
}

export function trackScreen(screenName: string) {
  if (!isNative()) return;
  import('@/capacitor/firebase')
    .then(({ setAnalyticsScreen }) => setAnalyticsScreen(screenName))
    .catch(() => {});
}
