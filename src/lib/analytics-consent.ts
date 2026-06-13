/**
 * Analytics consent management.
 * Stores user preference in localStorage. Defaults to true (opt-out model).
 */

const CONSENT_KEY = 'analytics_consent';

export function getAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(CONSENT_KEY);
  // Default: enabled. User must explicitly opt out.
  return stored !== 'false';
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
