'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useQrDeepLink } from '@/features/auth/hooks/use-qr-deep-link';
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
  const t = useTranslations('common.manga');

  useQrDeepLink();

  useEffect(() => {
    if (!checkIsMobile()) return;

    // Pre-load plugins that are dynamically imported elsewhere
    import('@anuradev/capacitor-phone-call-notification').catch(() => {});

    // --- HIDE SPLASH SCREEN once the app has rendered ---
    mobileBridge.hideSplash();

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
        toast.error(t('noInternet'));
      } else {
        toast.success(t('backOnline'));
      }
    });

    // --- KEYBOARD: track open state ---
    const unlistenKbShow = mobileBridge.onKeyboardShow(({ keyboardHeight }) => {
      document.documentElement.style.setProperty(
        '--keyboard-height',
        `${keyboardHeight}px`,
      );
      document.documentElement.classList.add('keyboard-open');
    });
    const unlistenKbHide = mobileBridge.onKeyboardHide(() => {
      document.documentElement.style.setProperty('--keyboard-height', '0px');
      document.documentElement.classList.remove('keyboard-open');
    });

    // --- KEYBOARD: tap outside input to dismiss ---
    const handleTapDismiss = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (
        tag !== 'INPUT' &&
        tag !== 'TEXTAREA' &&
        !target.isContentEditable &&
        document.documentElement.classList.contains('keyboard-open')
      ) {
        mobileBridge.hideKeyboard();
      }
    };
    document.addEventListener('touchstart', handleTapDismiss, {
      passive: true,
    });

    return () => {
      observer.disconnect();
      unlistenBack();
      unlistenNetwork();
      unlistenKbShow();
      unlistenKbHide();
      document.removeEventListener('touchstart', handleTapDismiss);
    };
  }, [router, t]);

  return null;
}
