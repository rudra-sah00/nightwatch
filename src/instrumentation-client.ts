// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

try {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
    enabled: process.env.NODE_ENV === 'production',

    // Add optional integrations for additional features
    integrations: [Sentry.replayIntegration()],

    // Define how likely traces are sampled. 10% in production to reduce cost.
    tracesSampleRate: 0.1,
    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Define how likely Replay events are sampled.
    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.1,

    // Define how likely Replay events are sampled when an error occurs.
    replaysOnErrorSampleRate: 1.0,

    // Do NOT send user PII (IP addresses, cookies) to Sentry
    sendDefaultPii: false,
  });
} catch (_e) {
  // Silently ignore during Turbopack HMR — the process polyfill module
  // can be deleted mid-update, causing a "module factory is not available" error.
  // Sentry will re-initialize on the next full page load.
}

export const onRouterTransitionStart = (href: string, navigateType: string) => {
  // Trigger the navigation progress bar via Zustand store.
  // This fires BEFORE the route transition — even for prefetched routes —
  // so the progress bar always shows regardless of SW cache speed.
  try {
    const { useNavigationStore } = require('@/store/use-navigation-store');
    const publicRoutes = ['/login', '/signup', '/user/'];
    const isPublic = publicRoutes.some((r) => href.startsWith(r));
    useNavigationStore.getState().start(isPublic ? 'spinner' : 'bar');
  } catch (_e) {
    // Store may not be available during initial load
  }

  // Also forward to Sentry for performance tracing
  Sentry.captureRouterTransitionStart(href, navigateType);
};
