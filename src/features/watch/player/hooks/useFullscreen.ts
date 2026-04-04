'use client';

import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { PlayerAction } from '../context/types';
import { useMobileDetection } from './useMobileDetection';

interface UseFullscreenOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  videoRef?: RefObject<HTMLVideoElement | null>;
  dispatch: React.Dispatch<PlayerAction>;
  /** Current isFullscreen value from player state — used on mobile where
   *  document.fullscreenElement may be null (iOS manual-state path). */
  playerIsFullscreen?: boolean;
}

interface DocumentWithWebkit extends Document {
  webkitFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
}

interface VideoElementWithWebkit extends HTMLVideoElement {
  webkitDisplayingFullscreen?: boolean;
  webkitSupportsFullscreen?: boolean;
  webkitEnterFullscreen?: () => void | Promise<void>;
  webkitExitFullscreen?: () => void | Promise<void>;
}

interface HTMLElementWithWebkit extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

export function useFullscreen({
  containerRef,
  videoRef,
  dispatch,
  playerIsFullscreen,
}: UseFullscreenOptions) {
  const isMobile = useMobileDetection();
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const latestVideoRef = useRef<VideoElementWithWebkit | null>(null);
  const manualMobileFullscreenRef = useRef(false);
  const shouldResumeAfterFullscreenExitRef = useRef(false);
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
    html.style.overflow = prev.htmlOverflow;
    body.style.overflow = prev.bodyOverflow;
    body.style.overscrollBehavior = prev.bodyOverscrollBehavior;
    body.style.height = prev.bodyHeight;
    lockedStylesRef.current = null;
  }, []);

  latestVideoRef.current =
    (videoRef?.current as VideoElementWithWebkit | null) ??
    latestVideoRef.current;

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

  // iOS Safari native video fullscreen does not always trigger document-level
  // fullscreen events, so keep player state synced via video-level WebKit events.
  useEffect(() => {
    const video = videoRef?.current as
      | VideoElementWithWebkit
      | null
      | undefined;
    if (!video) return;

    const handleNativeVideoEnter = () => {
      manualMobileFullscreenRef.current = false;
      unlockDocumentScroll();
      dispatch({ type: 'SET_FULLSCREEN', isFullscreen: true });
    };

    const handleNativeVideoExit = () => {
      manualMobileFullscreenRef.current = false;
      unlockDocumentScroll();
      dispatch({ type: 'SET_FULLSCREEN', isFullscreen: false });
      if (shouldResumeAfterFullscreenExitRef.current) {
        shouldResumeAfterFullscreenExitRef.current = false;
        void video.play().catch(() => {});
      }
    };

    video.addEventListener('webkitbeginfullscreen', handleNativeVideoEnter);
    video.addEventListener('webkitendfullscreen', handleNativeVideoExit);

    return () => {
      video.removeEventListener(
        'webkitbeginfullscreen',
        handleNativeVideoEnter,
      );
      video.removeEventListener('webkitendfullscreen', handleNativeVideoExit);
    };
  });

  const enterFullscreen = useCallback(async () => {
    try {
      if (isMobile) {
        const currentVideo =
          (videoRef?.current as VideoElementWithWebkit | null | undefined) ??
          latestVideoRef.current;

        // iOS Safari requires webkitEnterFullscreen() to run in the direct
        // user-gesture call stack, so attempt native video fullscreen first.
        if (
          isIOS &&
          currentVideo?.webkitEnterFullscreen &&
          (currentVideo.webkitSupportsFullscreen ?? true)
        ) {
          try {
            shouldResumeAfterFullscreenExitRef.current = !currentVideo.paused;
            currentVideo.webkitEnterFullscreen();
            manualMobileFullscreenRef.current = false;
            unlockDocumentScroll();
            dispatch({ type: 'SET_FULLSCREEN', isFullscreen: true });
            return;
          } catch {
            /* continue to other mobile paths */
          }
        }

        // Step 1: Lock orientation to landscape (Android Chrome + installed PWA).
        // iOS Safari does not support screen.orientation.lock in browser mode.
        // The lock() method is not in the TypeScript DOM lib types yet, so cast.
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };
        if (orientation?.lock) {
          try {
            await orientation.lock('landscape-primary');
          } catch {
            /* not supported — fall through */
          }
        }

        // Step 2: Try container requestFullscreen (Android Chrome and modern mobile browsers).
        // This keeps our custom controls visible whenever platform support exists.
        const container = containerRef.current;
        if (container) {
          if (container.requestFullscreen) {
            try {
              await container.requestFullscreen({ navigationUI: 'hide' });
              manualMobileFullscreenRef.current = false;
              unlockDocumentScroll();
              return; // fullscreenchange event will dispatch SET_FULLSCREEN:true
            } catch {
              /* not available (iOS) */
            }
          } else {
            const el = container as HTMLElementWithWebkit;
            if (el.webkitRequestFullscreen) {
              try {
                await el.webkitRequestFullscreen();
                manualMobileFullscreenRef.current = false;
                unlockDocumentScroll();
                return;
              } catch {
                /* not available */
              }
            }
          }
        }

        // Step 3: Prefer native video fullscreen fallback (best path on iOS Safari).
        const video =
          (videoRef?.current as VideoElementWithWebkit | null | undefined) ??
          latestVideoRef.current;
        if (
          video?.webkitEnterFullscreen &&
          (video.webkitSupportsFullscreen ?? true)
        ) {
          try {
            shouldResumeAfterFullscreenExitRef.current = !video.paused;
            await Promise.resolve(video.webkitEnterFullscreen());
            manualMobileFullscreenRef.current = false;
            unlockDocumentScroll();
            // Some WebKit builds don't emit begin event consistently.
            dispatch({ type: 'SET_FULLSCREEN', isFullscreen: true });
            return;
          } catch {
            /* continue to manual fallback */
          }
        }

        // Step 4: iOS manual fallback — update state so the UI enters
        // "fullscreen mode" visually; user rotates the device to get landscape.
        manualMobileFullscreenRef.current = true;
        lockDocumentScroll();
        dispatch({ type: 'SET_FULLSCREEN', isFullscreen: true });
        toast('Rotate your device for best experience', { icon: '📱' });
        return;
      }

      // Desktop: use container fullscreen so custom controls remain visible.
      const target = containerRef.current || document.documentElement;
      if (target.requestFullscreen) {
        await target.requestFullscreen({ navigationUI: 'hide' });
      } else {
        const el = target as HTMLElementWithWebkit;
        if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
      }
    } catch {
      toast.error('Failed to enter fullscreen');
    }
  }, [
    isIOS,
    isMobile,
    containerRef,
    videoRef,
    dispatch,
    lockDocumentScroll,
    unlockDocumentScroll,
  ]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (isMobile) {
        // Always attempt to release the orientation lock first.
        if ('orientation' in screen) {
          try {
            screen.orientation.unlock();
          } catch {
            /* not supported */
          }
        }

        if (document.fullscreenElement) {
          await document.exitFullscreen();
          return; // fullscreenchange event dispatches SET_FULLSCREEN:false
        }

        const video =
          (videoRef?.current as VideoElementWithWebkit | null | undefined) ??
          latestVideoRef.current;
        if (video?.webkitDisplayingFullscreen && video.webkitExitFullscreen) {
          await Promise.resolve(video.webkitExitFullscreen());
          manualMobileFullscreenRef.current = false;
          unlockDocumentScroll();
          dispatch({ type: 'SET_FULLSCREEN', isFullscreen: false });
          if (shouldResumeAfterFullscreenExitRef.current) {
            shouldResumeAfterFullscreenExitRef.current = false;
            void video.play().catch(() => {});
          }
          return;
        }

        // iOS manual-state path: no real fullscreen was entered.
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
      }
    } catch {
      toast.error('Failed to exit fullscreen');
    }
  }, [isMobile, videoRef, dispatch, unlockDocumentScroll]);

  const toggleFullscreen = useCallback(async () => {
    const doc = document as DocumentWithWebkit;
    const video = videoRef?.current as VideoElementWithWebkit | undefined;

    // On mobile document.fullscreenElement may be null even when the player
    // is in its "fullscreen" state (iOS manual path).  Use the player state
    // value so the toggle always works correctly on all platforms.
    const isCurrentlyFullscreen = isMobile
      ? (playerIsFullscreen ?? false) || !!video?.webkitDisplayingFullscreen
      : !!document.fullscreenElement ||
        !!doc.webkitFullscreenElement ||
        !!video?.webkitDisplayingFullscreen;

    if (isCurrentlyFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen, isMobile, playerIsFullscreen, videoRef]);

  return { enterFullscreen, exitFullscreen, toggleFullscreen, isMobile };
}
