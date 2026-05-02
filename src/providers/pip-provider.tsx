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
          })
        | null;
      if (!el) return;

      if (isActive) {
        // Foreground — exit PiP
        if (el.webkitPresentationMode === 'picture-in-picture') {
          el.webkitSetPresentationMode?.('inline');
        }
      } else {
        // Background — enter PiP if video is playing
        if (!el.paused && el.currentTime > 0) {
          el.webkitSetPresentationMode?.('picture-in-picture');
        }
      }
    });

    return unlisten;
  }, []);

  const ctx: PipContextValue = { register, unregister, close, isActive: false };

  return <PipContext value={ctx}>{children}</PipContext>;
}
