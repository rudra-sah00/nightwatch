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
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const hasNoHover = window.matchMedia('(hover: none)').matches;
  const isSmallViewport = window.innerWidth < 1024;

  // A device is "touch-primary" only when it reports touch AND its primary
  // pointer is imprecise / cannot hover — i.e. phones and tablets.
  //
  // Touch signals alone are NOT sufficient: touchscreen laptops, 2-in-1s and
  // any tab that ever had DevTools touch emulation on all report
  // `maxTouchPoints > 0` while still being mouse-driven desktops. Gating on
  // `pointer: coarse` / `hover: none` keeps them on the desktop control bar.
  const isTouchPrimary = hasTouch && (hasCoarsePointer || hasNoHover);

  return (
    isMobileUserAgent ||
    isSmallMobileViewport ||
    isTouchPrimary ||
    (hasCoarsePointer && isSmallViewport)
  );
};

/**
 * Hook to detect if the user is on a **mobile device** (phone or tablet).
 *
 * Returns `true` for explicit mobile user agents, phone-sized viewports
 * (`< 768px`), and touch-primary devices (touch support combined with a coarse
 * pointer or no hover capability).
 *
 * Deliberately returns `false` for touchscreen laptops and 2-in-1s in laptop
 * mode — they expose touch APIs but are mouse-driven and must keep the desktop
 * control bar. Electron is always treated as desktop.
 */
export function useMobileDetection() {
  // Start with a stable value so server render and first client render match.
  // We update immediately after mount to avoid hydration mismatches.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Electron desktop is never mobile. Skip resize listener entirely so
    // window shrink doesn't flip the layout and remount the player.
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
