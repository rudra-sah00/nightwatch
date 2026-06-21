/**
 * Analytics consent management.
 * Stores user preference in localStorage. Defaults to false (opt-in model).
 * User must explicitly accept before any analytics cookies are set.
 */

const CONSENT_KEY = 'analytics_consent';

export function getAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CONSENT_KEY) === 'true';
}

export function hasAnsweredConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CONSENT_KEY) !== null;
}

export function setAnalyticsConsent(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONSENT_KEY, String(enabled));

  // Sync to native Firebase if on Capacitor
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  if (cap?.isNativePlatform?.()) {
    import('@/capacitor/firebase')
      .then(({ setAnalyticsEnabled }) => {
        setAnalyticsEnabled(enabled);
      })
      .catch(() => {});
  }
}
