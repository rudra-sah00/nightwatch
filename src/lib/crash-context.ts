/**
 * Crash context module.
 * Sets custom keys on Firebase Crashlytics (native) so every crash report
 * includes what the user was doing: current screen, active feature, and network state.
 */

function isNative(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!(
      window as { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor?.isNativePlatform?.()
  );
}

function setKey(key: string, value: string) {
  if (!isNative()) return;
  import('@/capacitor/firebase')
    .then(({ setCrashlyticsCustomKey }) => setCrashlyticsCustomKey(key, value))
    .catch(() => {});
}

/** Call from ScreenTracker on every navigation. */
export function setCrashScreen(screenName: string) {
  setKey('screen', screenName);
}

/** Call from FeatureErrorBoundary or feature entry points. */
export function setCrashFeature(feature: string) {
  setKey('active_feature', feature);
}

/** Call when network state changes. */
export function setCrashNetworkState(state: 'online' | 'offline' | 'slow') {
  setKey('network_state', state);
}

/** Call with app version on startup. */
export function setCrashAppVersion(version: string) {
  setKey('app_version', version);
}
