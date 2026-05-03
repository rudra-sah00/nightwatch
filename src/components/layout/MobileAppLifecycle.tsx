'use client';

import { useEffect } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';
import { revalidateTokenOnResume } from '@/lib/fetch';
import { mobileBridge } from '@/lib/mobile-bridge';

/**
 * Handles app background/foreground lifecycle on mobile.
 * - Revalidates auth token on resume (JS timers freeze in background).
 * - Video PiP is handled by PipProvider (requestPictureInPicture on background).
 * - Music (HTMLAudioElement): keeps playing in background (unchanged).
 */
export function MobileAppLifecycle() {
  useEffect(() => {
    if (!checkIsMobile()) return;

    const unlisten = mobileBridge.onAppStateChange(({ isActive }) => {
      if (isActive) revalidateTokenOnResume();
    });

    return unlisten;
  }, []);

  return null;
}
