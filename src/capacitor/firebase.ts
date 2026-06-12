/**
 * Firebase Crashlytics & Analytics bridge for Capacitor (Android/iOS).
 * Uses the native bridge pattern (window.Capacitor.Plugins.X) consistent
 * with the existing push.ts approach.
 */

interface FirebaseCrashlyticsPlugin {
  crash(options: { message: string }): Promise<void>;
  log(options: { message: string }): Promise<void>;
  setUserId(options: { userId: string }): Promise<void>;
  setEnabled(options: { enabled: boolean }): Promise<void>;
  recordException(options: {
    message: string;
    stacktrace?: string;
  }): Promise<void>;
}

interface FirebaseAnalyticsPlugin {
  logEvent(options: {
    name: string;
    params?: Record<string, unknown>;
  }): Promise<void>;
  setUserId(options: { userId: string | null }): Promise<void>;
  setUserProperty(options: {
    key: string;
    value: string | null;
  }): Promise<void>;
  setCurrentScreen(options: { screenName: string }): Promise<void>;
  setEnabled(options: { enabled: boolean }): Promise<void>;
}

function getCrashlyticsPlugin(): FirebaseCrashlyticsPlugin | null {
  const cap = (window as { Capacitor?: { Plugins?: Record<string, unknown> } })
    .Capacitor;
  return (
    (cap?.Plugins?.FirebaseCrashlytics as FirebaseCrashlyticsPlugin) || null
  );
}

function getAnalyticsPlugin(): FirebaseAnalyticsPlugin | null {
  const cap = (window as { Capacitor?: { Plugins?: Record<string, unknown> } })
    .Capacitor;
  return (cap?.Plugins?.FirebaseAnalytics as FirebaseAnalyticsPlugin) || null;
}

// --- Crashlytics ---

export function setCrashlyticsUserId(userId: string) {
  getCrashlyticsPlugin()
    ?.setUserId({ userId })
    .catch(() => {});
}

export function logCrashlyticsMessage(message: string) {
  getCrashlyticsPlugin()
    ?.log({ message })
    .catch(() => {});
}

export function recordException(message: string, stacktrace?: string) {
  getCrashlyticsPlugin()
    ?.recordException({ message, stacktrace })
    .catch(() => {});
}

// --- Analytics ---

export function logEvent(name: string, params?: Record<string, unknown>) {
  getAnalyticsPlugin()
    ?.logEvent({ name, params })
    .catch(() => {});
}

export function setAnalyticsUserId(userId: string | null) {
  getAnalyticsPlugin()
    ?.setUserId({ userId })
    .catch(() => {});
}

export function setAnalyticsScreen(screenName: string) {
  getAnalyticsPlugin()
    ?.setCurrentScreen({ screenName })
    .catch(() => {});
}

export function setAnalyticsUserProperty(key: string, value: string | null) {
  getAnalyticsPlugin()
    ?.setUserProperty({ key, value })
    .catch(() => {});
}
