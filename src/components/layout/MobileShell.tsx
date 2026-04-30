'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { checkIsMobile } from '@/lib/electron-bridge';
import { mobileBridge } from '@/lib/mobile-bridge';

/**
 * MobileShell — mounted once in root layout.
 * Handles: status bar theming, Android back button, network detection,
 * keyboard scroll, and app background/foreground lifecycle.
 */
export function MobileShell() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!checkIsMobile()) return;

    // --- STATUS BAR: match dark theme ---
    const applyStatusBar = () => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        mobileBridge.setStatusBarDark();
      } else {
        mobileBridge.setStatusBarLight();
      }
    };
    applyStatusBar();
    const observer = new MutationObserver(applyStatusBar);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // --- ANDROID BACK BUTTON ---
    const unlistenBack = mobileBridge.onBackButton(() => {
      if (pathnameRef.current === '/home' || pathnameRef.current === '/') {
        mobileBridge.exitApp();
      } else {
        router.back();
      }
    });

    // --- NETWORK DETECTION ---
    const unlistenNetwork = mobileBridge.onNetworkChange((status) => {
      if (!status.connected) {
        toast.error('No internet connection');
      } else {
        toast.success('Back online');
      }
    });

    // --- KEYBOARD: push content up ---
    const unlistenKbShow = mobileBridge.onKeyboardShow(({ keyboardHeight }) => {
      document.documentElement.style.setProperty(
        '--keyboard-height',
        `${keyboardHeight}px`,
      );
    });
    const unlistenKbHide = mobileBridge.onKeyboardHide(() => {
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    });

    // --- SPLASH SCREEN: hide after app loads ---
    mobileBridge.hideSplash();

    return () => {
      observer.disconnect();
      unlistenBack();
      unlistenNetwork();
      unlistenKbShow();
      unlistenKbHide();
    };
  }, [router]);

  return null;
}
