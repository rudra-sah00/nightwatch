import { useEffect, useState } from 'react';

const checkMobile = () => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  const isMobileUserAgent =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent,
    );
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const isSmallViewport = window.innerWidth < 1024;

  // Prefer explicit mobile user agents. For ambiguous devices, require both
  // coarse pointer and a smaller viewport to avoid matching touch laptops.
  return isMobileUserAgent || (hasCoarsePointer && isSmallViewport);
};

/**
 * Hook to detect if the user is on a mobile device
 * Checks window width, touch support, and max touch points
 */
export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(checkMobile);

  useEffect(() => {
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
