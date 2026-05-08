'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { qrAuthorize } from '@/features/auth/qr-api';
import { checkIsMobile } from '@/lib/electron-bridge';

/**
 * Listens for `nightwatch://qr?code=...` deep links on mobile.
 * When the user scans a QR code with their native camera, the OS opens
 * the app with this URL. This hook intercepts it and calls qrAuthorize.
 */
export function useQrDeepLink() {
  useEffect(() => {
    if (!checkIsMobile()) return;

    let cleanup: (() => void) | null = null;

    const setup = async () => {
      const { App } = await import('@capacitor/app');
      const handle = await App.addListener('appUrlOpen', async ({ url }) => {
        if (!url.startsWith('nightwatch://qr')) return;
        const params = new URL(url.replace('nightwatch://', 'https://x/'));
        const code = params.searchParams.get('code');
        if (!code) return;

        try {
          await qrAuthorize(code);
          toast.success('Device authorized');
        } catch {
          toast.error('Failed to authorize device');
        }
      });
      cleanup = () => handle.remove();
    };

    setup();
    return () => cleanup?.();
  }, []);
}
