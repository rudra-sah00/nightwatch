'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Listens for service worker updates and shows a toast prompting the user to refresh.
 * Works alongside skipWaiting:true — the new SW activates immediately, but the
 * page still needs a reload to pick up the new cached assets.
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
        duration: 15000,
      });
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );
    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
    };
  }, []);

  return null;
}
