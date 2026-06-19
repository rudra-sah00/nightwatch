'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Workbox } from 'workbox-window';

export function SwRegister() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      window.location.hostname === 'dev.nightwatch.in'
    )
      return;

    const wb = new Workbox('/sw.js');

    wb.addEventListener('waiting', () => {
      toast('New version available', {
        duration: Infinity,
        action: {
          label: 'Refresh',
          onClick: () => {
            wb.messageSkipWaiting();
            window.location.reload();
          },
        },
      });
    });

    wb.register();
  }, []);

  return null;
}
