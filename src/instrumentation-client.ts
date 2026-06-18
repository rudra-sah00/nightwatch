// Client-side instrumentation — captures unhandled errors on web/desktop
// that fall outside React's error boundary tree (async handlers, setTimeout, etc.).

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    import('@/lib/analytics').then(({ reportError }) => {
      const reason = event.reason;
      const msg =
        reason instanceof Error ? reason.message : String(reason ?? 'Unknown');
      const stack = reason instanceof Error ? reason.stack : undefined;
      reportError(`Unhandled rejection: ${msg}`, stack);
    });
  });

  window.addEventListener('error', (event) => {
    // Ignore errors from browser extensions or cross-origin scripts
    if (!event.filename || event.filename === '') return;
    import('@/lib/analytics').then(({ reportError }) => {
      reportError(
        `Uncaught: ${event.message}`,
        event.error?.stack ??
          `${event.filename}:${event.lineno}:${event.colno}`,
      );
    });
  });
}
