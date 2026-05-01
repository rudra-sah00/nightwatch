'use client';

import { useTranslations } from 'next-intl';
import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { checkIsMobile } from '@/lib/electron-bridge';
import { mobileBridge } from '@/lib/mobile-bridge';
import type { PlayerAction } from '../context/types';
import { useMobileDetection } from './useMobileDetection';

interface UseFullscreenOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  dispatch: React.Dispatch<PlayerAction>;
  /** Current isFullscreen value from player state — used on mobile where
   *  document.fullscreenElement may be null (YouTube-style custom fullscreen). */
  playerIsFullscreen?: boolean;
}

interface DocumentWithWebkit extends Document {
  webkitFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
  webkitCancelFullScreen?: () => void;
}

interface HTMLElementWithWebkit extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  webkitRequestFullScreen?: () => void;
}

export function useFullscreen({
  containerRef,
  dispatch,
  playerIsFullscreen,
}: UseFullscreenOptions) {
  const t = useTranslations('watch.player');
  const isMobile = useMobileDetection();
  const manualMobileFullscreenRef = useRef(false);
  const lockedStylesRef = useRef<{
    htmlOverflow: string;
    bodyOverflow: string;
    bodyOverscrollBehavior: string;
    bodyHeight: string;
  } | null>(null);

  const lockDocumentScroll = useCallback(() => {
    if (typeof document === 'undefined' || lockedStylesRef.current) return;
    const html = document.documentElement;
    const body = document.body;
    lockedStylesRef.current = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyHeight: body.style.height,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.height = '100dvh';
  }, []);

  const unlockDocumentScroll = useCallback(() => {
    if (typeof document === 'undefined' || !lockedStylesRef.current) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = lockedStylesRef.current;
    lockedStylesRef.current = null;
    // Restore or remove — setting empty string can leave stale inline styles
    html.style.overflow = prev.htmlOverflow || '';
    body.style.overflow = prev.bodyOverflow || '';
    body.style.overscrollBehavior = prev.bodyOverscrollBehavior || '';
    body.style.height = prev.bodyHeight || '';
    // Force layout recalc so the browser re-measures after orientation change
    void document.body.offsetHeight;
  }, []);

  const requestElementFullscreen = useCallback(async (target: HTMLElement) => {
    if (target.requestFullscreen) {
      try {
        // Some mobile browsers reject unsupported options. Retry without options.
        await target.requestFullscreen({ navigationUI: 'hide' });
        return true;
      } catch {
        try {
          await target.requestFullscreen();
          return true;
        } catch {
          /* continue to vendor-prefixed fallbacks */
        }
      }
    }

    const el = target as HTMLElementWithWebkit;
    if (el.webkitRequestFullscreen) {
      try {
        await el.webkitRequestFullscreen();
        return true;
      } catch {
        /* continue to older fallback */
      }
    }

    if (el.webkitRequestFullScreen) {
      try {
        el.webkitRequestFullScreen();
        return true;
      } catch {
        /* no-op */
      }
    }

    return false;
  }, []);

  // Listen for fullscreen changes (covers Android container-fullscreen path)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as DocumentWithWebkit;
      const isFullscreen =
        !!document.fullscreenElement || !!doc.webkitFullscreenElement;
      dispatch({ type: 'SET_FULLSCREEN', isFullscreen });
      // Release orientation lock when fullscreen is exited externally
      // (e.g. user presses back button on Android)
      if (!isFullscreen && 'orientation' in screen) {
        try {
          screen.orientation.unlock();
        } catch {
          /* not supported on this platform */
        }
      }
      if (!isFullscreen) {
        manualMobileFullscreenRef.current = false;
        unlockDocumentScroll();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange,
      );
      unlockDocumentScroll();
    };
  }, [dispatch, unlockDocumentScroll]);

  const enterFullscreen = useCallback(async () => {
    try {
      if (isMobile) {
        // YouTube-style mobile fullscreen: lock orientation to landscape,
        // fill the viewport, and lock scroll. No native fullscreen API —
        // this keeps our custom controls visible on both iOS and Android.
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };
        if (orientation?.lock) {
          try {
            await orientation.lock('landscape-primary');
          } catch {
            /* not supported — Capacitor plugin handles it below */
          }
        }

        // Capacitor: use native orientation lock plugin
        if (
          typeof window !== 'undefined' &&
          window.Capacitor?.isNativePlatform?.()
        ) {
          try {
            const { ScreenOrientation } = await import(
              '@capacitor/screen-orientation'
            );
            await ScreenOrientation.lock({ orientation: 'landscape' });
          } catch {
            /* plugin not available */
          }
        }

        manualMobileFullscreenRef.current = true;
        lockDocumentScroll();
        dispatch({ type: 'SET_FULLSCREEN', isFullscreen: true });
        return;
      }

      // Desktop Electron: use native BrowserWindow fullscreen
      if (
        typeof window !== 'undefined' &&
        (
          window as unknown as {
            electronAPI?: { toggleFullscreen?: () => Promise<void> };
          }
        ).electronAPI?.toggleFullscreen
      ) {
        await (
          window as unknown as {
            electronAPI: { toggleFullscreen: () => Promise<void> };
          }
        ).electronAPI.toggleFullscreen();
        return;
      }

      // Browser: use container fullscreen so custom controls remain visible.
      const target = containerRef.current || document.documentElement;
      const entered = await requestElementFullscreen(target);
      if (!entered) {
        toast.error(t('fullscreenNotSupported'));
      }
    } catch {
      toast.error(t('failedEnterFullscreen'));
    }
  }, [
    isMobile,
    containerRef,
    dispatch,
    lockDocumentScroll,
    requestElementFullscreen,
    t,
  ]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (isMobile) {
        // Release orientation lock — lock to portrait first so the device rotates back
        if ('orientation' in screen) {
          const orientation = screen.orientation as ScreenOrientation & {
            lock?: (orientation: string) => Promise<void>;
          };
          try {
            if (orientation.lock) await orientation.lock('portrait-primary');
            // Delay unlock so the device settles into portrait before
            // freeing rotation — prevents the rotate-wall flash.
            setTimeout(() => {
              try {
                screen.orientation.unlock();
              } catch {
                /* not supported */
              }
            }, 500);
          } catch {
            try {
              screen.orientation.unlock();
            } catch {
              /* not supported */
            }
          }
        }

        // Capacitor: lock back to portrait, then unlock after a delay
        if (
          typeof window !== 'undefined' &&
          window.Capacitor?.isNativePlatform?.()
        ) {
          try {
            const { ScreenOrientation } = await import(
              '@capacitor/screen-orientation'
            );
            await ScreenOrientation.lock({ orientation: 'portrait' });
            setTimeout(async () => {
              try {
                const { ScreenOrientation: SO } = await import(
                  '@capacitor/screen-orientation'
                );
                await SO.unlock();
              } catch {
                /* plugin not available */
              }
            }, 500);
          } catch {
            /* plugin not available */
          }
        }

        // Exit real fullscreen if it was somehow entered (e.g. Android back button)
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }

        manualMobileFullscreenRef.current = false;
        unlockDocumentScroll();
        dispatch({ type: 'SET_FULLSCREEN', isFullscreen: false });
        return;
      }

      const doc = document as DocumentWithWebkit;
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.webkitCancelFullScreen) {
        doc.webkitCancelFullScreen();
      }
    } catch {
      toast.error(t('failedExitFullscreen'));
    }
  }, [dispatch, isMobile, unlockDocumentScroll, t]);

  const toggleFullscreen = useCallback(async () => {
    // Electron: delegate to native BrowserWindow fullscreen toggle
    if (
      typeof window !== 'undefined' &&
      (
        window as unknown as {
          electronAPI?: { toggleFullscreen?: () => Promise<void> };
        }
      ).electronAPI?.toggleFullscreen
    ) {
      await (
        window as unknown as {
          electronAPI: { toggleFullscreen: () => Promise<void> };
        }
      ).electronAPI.toggleFullscreen();
      return;
    }

    if (isMobile) {
      // YouTube-style: toggle based on player state (no native fullscreen)
      if (playerIsFullscreen) {
        await exitFullscreen();
      } else {
        await enterFullscreen();
      }
      return;
    }

    const doc = document as DocumentWithWebkit;
    const isNativeFullscreen =
      !!document.fullscreenElement || !!doc.webkitFullscreenElement;

    if (isNativeFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen, isMobile, playerIsFullscreen]);

  // Hide status bar on mobile when entering fullscreen, show on exit
  useEffect(() => {
    if (!checkIsMobile()) return;
    if (playerIsFullscreen) {
      mobileBridge.hideStatusBar();
    } else {
      mobileBridge.showStatusBar();
    }
  }, [playerIsFullscreen]);

  return { enterFullscreen, exitFullscreen, toggleFullscreen, isMobile };
}
