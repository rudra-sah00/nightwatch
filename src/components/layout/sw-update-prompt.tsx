'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Checks for service worker updates on app focus and network reconnect.
 * Browsers do this automatically on navigation, but Electron's loadURL()
 * bypasses that — so we trigger it on meaningful user/network events instead.
 */
export function SwUpdatePrompt() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator))
      return;

    const handleControllerChange = () => {
      toast('New version available', {
        description: 'Refresh to get the latest updates.',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
        duration: 30000,
      });
    };

    const checkForUpdate = () => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.update().catch(() => {});
      });
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );
    window.addEventListener('focus', checkForUpdate);
    window.addEventListener('online', checkForUpdate);

    // One check on mount for the initial load
    checkForUpdate();

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
      window.removeEventListener('focus', checkForUpdate);
      window.removeEventListener('online', checkForUpdate);
    };
  }, []);

  return null;
}
