'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Checks for service worker updates on app focus and network reconnect.
 * Browsers do this automatically on navigation, but Tauri's loadURL()
 * bypasses that — so we trigger it on meaningful user/network events instead.
 */
export function SwUpdatePrompt() {
  const t = useTranslations('common.swUpdate');

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator))
      return;

    const handleControllerChange = () => {
      toast(t('title'), {
        description: t('description'),
        action: {
          label: t('refresh'),
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
  }, [t]);

  return null;
}
