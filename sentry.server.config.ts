// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',

  // Define how likely traces are sampled. 10% in production to reduce cost.
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Do NOT send user PII (IP addresses, cookies) to Sentry
  sendDefaultPii: false,
});
