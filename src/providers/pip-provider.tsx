'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';
import { mobileBridge } from '@/lib/mobile-bridge';

interface PipContextValue {
  register: (
    data: { streamUrl: string; watchUrl: string; title: string },
    videoEl: HTMLVideoElement,
  ) => void;
  unregister: () => void;
  close: () => void;
  isActive: boolean;
}

const PipContext = createContext<PipContextValue | null>(null);

export function usePipContext() {
  return useContext(PipContext);
}

/**
 * Minimal PiP provider — no cross-route PiP, no floating player.
 * Only handles native OS PiP when the Capacitor app goes to background.
 */
export function PipProvider({ children }: { children: React.ReactNode }) {
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const register = useCallback(
    (
      _data: { streamUrl: string; watchUrl: string; title: string },
      videoEl: HTMLVideoElement,
    ) => {
      console.log('[NW-PiP] register', {
        title: _data.title,
        src: _data.streamUrl?.substring(0, 60),
      });
      videoElRef.current = videoEl;
    },
    [],
  );

  const unregister = useCallback(() => {
    videoElRef.current = null;
  }, []);

  const close = useCallback(() => {
    videoElRef.current = null;
  }, []);

  // Native PiP on app background (Capacitor only)
  useEffect(() => {
    if (!checkIsMobile()) return;

    const unlisten = mobileBridge.onAppStateChange(({ isActive }) => {
      const el = videoElRef.current as
        | (HTMLVideoElement & {
            webkitSetPresentationMode?: (mode: string) => void;
            webkitPresentationMode?: string;
            webkitSupportsPresentationMode?: (mode: string) => boolean;
          })
        | null;
      if (!el) {
        console.log('[NW-PiP] no video element registered');
        return;
      }

      if (isActive) {
        // Foreground — exit PiP
        if (el.webkitPresentationMode === 'picture-in-picture') {
          el.webkitSetPresentationMode?.('inline');
        } else if (document.pictureInPictureElement === el) {
          document.exitPictureInPicture().catch(() => {});
        }
      } else {
        if (!el.paused && el.readyState >= 2) {
          // On iOS Capacitor, let the system handle PiP automatically
          // via allowsPictureInPictureMediaPlayback in WKWebViewConfiguration.
          // Programmatic PiP via webkit/standard API has rendering bugs with MP4.
          const platform = window.Capacitor?.getPlatform?.();
          if (platform === 'ios') {
            // PiP only works with HLS in WKWebView. MP4 direct playback has
            // WebAVMediaSelectionOption bugs that prevent the PiP window from rendering.
            // HLS sources go through blob: URLs or .m3u8 endpoints.
            const src = el.src || el.currentSrc || '';
            const isHLS = src.includes('.m3u8') || src.startsWith('blob:');
            if (isHLS) {
              el.webkitSetPresentationMode?.('picture-in-picture');
            }
            return;
          }
          if (el.webkitSetPresentationMode) {
            console.log('[NW-PiP] requesting PiP (webkit)');
            el.webkitSetPresentationMode('picture-in-picture');
          } else if (typeof el.requestPictureInPicture === 'function') {
            console.log('[NW-PiP] requesting PiP (standard API)');
            el.requestPictureInPicture().catch((e) => {
              console.warn('[NW-PiP] standard PiP failed', e);
            });
          }
        }
      }
    });

    return unlisten;
  }, []);

  const ctx: PipContextValue = { register, unregister, close, isActive: false };

  return <PipContext value={ctx}>{children}</PipContext>;
}
