import { useEffect, useState } from 'react';
import { checkIsDesktop } from '@/lib/electron-bridge';

const checkMobile = () => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  const isMobileUserAgent =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent,
    );
  const isSmallMobileViewport = window.innerWidth < 768;
  const hasLegacyTouchSignals =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const isSmallViewport = window.innerWidth < 1024;

  // Backward-compatible mobile detection for existing watch-player behavior.
  // Keep the coarse-pointer heuristic as an additional signal.
  return (
    isMobileUserAgent ||
    isSmallMobileViewport ||
    hasLegacyTouchSignals ||
    (hasCoarsePointer && isSmallViewport)
  );
};

/**
 * Hook to detect if the user is on a mobile device
 * Checks window width, touch support, and max touch points
 */
export function useMobileDetection() {
  // Start with a stable value so server render and first client render match.
  // We update immediately after mount to avoid hydration mismatches.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Electron desktop is never mobile. Skip resize listener entirely so PiP
    // window shrink (480×270) doesn't flip the layout and remount the player.
    if (checkIsDesktop()) {
      setIsMobile(false);
      return;
    }

    setIsMobile(checkMobile());

    const handleResize = () => setIsMobile(checkMobile());
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, {
      passive: true,
    });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return isMobile;
}
