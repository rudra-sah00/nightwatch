'use client';

import { useEffect } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';
import { mobileBridge } from '@/lib/mobile-bridge';

/**
 * Handles app background/foreground lifecycle on mobile.
 * - Video PiP is handled by PipProvider (requestPictureInPicture on background).
 * - Music (HTMLAudioElement): keeps playing in background (unchanged).
 */
export function MobileAppLifecycle() {
  useEffect(() => {
    if (!checkIsMobile()) return;

    // Keep listener alive so Capacitor doesn't suspend the WebView.
    // PiP enter/exit is handled by PipProvider which has access to the video element.
    const unlisten = mobileBridge.onAppStateChange(() => {});

    return unlisten;
  }, []);

  return null;
}
