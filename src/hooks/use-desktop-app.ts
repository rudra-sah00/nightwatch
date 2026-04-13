'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * A centralized hook to safely manage Electron Desktop App
 * detection, deep linking, and OS native bridge methods
 * without sprinkling raw `typeof window` across UI components.
 */
export function useDesktopApp() {
  const [isDesktopApp, setIsDesktopApp] = useState<boolean>(false);
  const [isBrowser, setIsBrowser] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasElectronAPI = !!window.electronAPI;
      setIsDesktopApp(hasElectronAPI);
      setIsBrowser(!hasElectronAPI);
    }
  }, []);

  /**
   * Securely generates and opens a `watch-rudra://` deep link
   * to transfer users seamlessly from browsers into the Desktop client.
   * Uses a timeout heuristic to guess if the app is actually installed.
   */
  const openInDesktopApp = (currentUrl?: string) => {
    if (typeof window !== 'undefined') {
      const urlToTransform = currentUrl || window.location.href;
      // Convert standard web URL to desktop protocol
      const deepLink = urlToTransform.replace(
        window.location.origin,
        'watch-rudra:/',
      );

      const start = Date.now();

      // Try to open the desktop app
      window.location.href = deepLink;

      // Because browsers don't let us explicitly check if an app is installed
      // (for security reasons), we use a standard heuristic:
      // If the browser hasn't lost focus (document.hidden) after 2 seconds,
      // the OS likely couldn't find the app to open.
      setTimeout(() => {
        if (Date.now() - start < 3000 && !document.hidden) {
          toast.error('App not installed', {
            description:
              'We could not open the Watch Rudra Desktop app. Is it installed?',
            action: {
              label: 'Download App',
              onClick: () => window.open('/docs-site/DESKTOP', '_blank'),
            },
          });
        }
      }, 2000);
    }
  };

  /**
   * System clipboard API abstraction (Handles both Electron native & Web browser)
   */
  const copyToClipboard = async (text: string) => {
    if (isDesktopApp && window.electronAPI?.copyToClipboard) {
      window.electronAPI.copyToClipboard(text);
    } else if (typeof navigator !== 'undefined') {
      await navigator.clipboard.writeText(text);
    }
  };

  /**
   * Dynamically adds top padding strictly within the Desktop App
   * to prevent UI from hiding underneath the 32px native OS window controls.
   */
  const getDesktopTopPaddingClass = (isFullscreen = false) => {
    return isDesktopApp && !isFullscreen ? 'pt-8' : '';
  };

  /** Inline style enabling/disabling the Electron native frameless window drag area. */
  const dragStyle: React.CSSProperties = {
    WebkitAppRegion: 'drag',
  } as React.CSSProperties;
  const noDragStyle: React.CSSProperties = {
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties;

  return {
    isDesktopApp,
    isBrowser,
    openInDesktopApp,
    copyToClipboard,
    getDesktopTopPaddingClass,
    dragStyle,
    noDragStyle,
  };
}
