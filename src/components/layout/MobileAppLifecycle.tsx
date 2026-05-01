'use client';

import { useEffect } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';
import { mobileBridge } from '@/lib/mobile-bridge';

/**
 * Handles app background/foreground lifecycle on mobile.
 * - Video: does NOT pause on background — allows iOS PiP to activate automatically.
 *   iOS enters PiP when a playing video's app is backgrounded.
 * - Music (HTMLAudioElement): keeps playing in background (unchanged).
 */
export function MobileAppLifecycle() {
  useEffect(() => {
    if (!checkIsMobile()) return;

    const unlisten = mobileBridge.onAppStateChange(({ isActive }) => {
      if (isActive) {
        // App came to foreground — exit PiP if active
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture().catch(() => {});
        }
      }
      // Don't pause video on background — let iOS PiP handle it
    });

    return unlisten;
  }, []);

  return null;
}
