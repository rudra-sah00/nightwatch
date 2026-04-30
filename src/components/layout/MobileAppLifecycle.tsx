'use client';

import { useEffect } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';
import { mobileBridge } from '@/lib/mobile-bridge';

/**
 * Pauses all video elements when the app goes to background.
 * Music (HTMLAudioElement) keeps playing — this is intentional.
 * Android WebView keeps audio alive by default.
 * iOS requires `capacitor.config.ts` → `ios.allowsBackgroundAudio: true`.
 */
export function MobileAppLifecycle() {
  useEffect(() => {
    if (!checkIsMobile()) return;

    const unlisten = mobileBridge.onAppStateChange(({ isActive }) => {
      if (!isActive) {
        // App went to background — pause all <video> but leave <audio> (music) playing
        for (const v of document.querySelectorAll('video')) {
          if (!v.paused) v.pause();
        }
      }
    });

    return unlisten;
  }, []);

  return null;
}
