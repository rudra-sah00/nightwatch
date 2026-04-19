'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Listens for service worker updates and shows a toast prompting the user to refresh.
 *
 * In Electron, the SW update cycle doesn't trigger automatically on navigation
 * like it does in browsers. We force an update check on mount and every 5 minutes
 * so production Electron users always get the latest cached assets.
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

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );

    // Force SW update check on mount and every 5 minutes.
    // Browsers do this on navigation, but Electron's loadURL() bypasses it.
    const checkForUpdate = () => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.update().catch(() => {});
      });
    };

    checkForUpdate();
    const interval = setInterval(checkForUpdate, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
    };
  }, []);

  return null;
}
