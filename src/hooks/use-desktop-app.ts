'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { checkIsDesktop, desktopBridge } from '@/lib/tauri-bridge';

/**
 * A centralized hook to safely manage Desktop App detection,
 * deep linking, and OS native bridge methods.
 */
export function useDesktopApp() {
  const [isMounted, setIsMounted] = useState(false);
  const t = useTranslations('desktopApp');

  const [isDesktopApp] = useState(() => checkIsDesktop());
  const [isBrowser] = useState(() => !checkIsDesktop());

  const [isMacOS] = useState(() =>
    typeof navigator !== 'undefined'
      ? navigator.userAgent.includes('Mac OS X')
      : false,
  );
  const [isWindows] = useState(() =>
    typeof navigator !== 'undefined'
      ? navigator.userAgent.includes('Windows NT')
      : false,
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const openInDesktopApp = (currentUrl?: string) => {
    if (typeof window !== 'undefined') {
      const urlToTransform = currentUrl || window.location.href;
      const deepLink = urlToTransform.replace(
        window.location.origin,
        'watch-rudra:/',
      );
      const start = Date.now();
      window.location.href = deepLink;
      setTimeout(() => {
        if (Date.now() - start < 3000 && !document.hidden) {
          toast.error(t('notInstalled'), {
            description: t('notInstalledDesc'),
            action: {
              label: t('downloadApp'),
              onClick: () =>
                window.open(
                  'https://github.com/rudra-sah00/watch-rudra/releases',
                  '_blank',
                ),
            },
          });
        }
      }, 2000);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (isDesktopApp) {
      desktopBridge.copyToClipboard(text);
    } else if (typeof navigator !== 'undefined') {
      await navigator.clipboard.writeText(text);
    }
  };

  const getDesktopTopPaddingClass = (isFullscreen = false) =>
    isDesktopApp && !isFullscreen ? 'pt-8' : '';

  const dragStyle: React.CSSProperties = {
    WebkitAppRegion: 'drag',
  } as React.CSSProperties;
  const noDragStyle: React.CSSProperties = {
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties;

  return {
    isDesktopApp,
    isMounted,
    isBrowser,
    isMacOS,
    isWindows,
    openInDesktopApp,
    copyToClipboard,
    getDesktopTopPaddingClass,
    dragStyle,
    noDragStyle,
  };
}
