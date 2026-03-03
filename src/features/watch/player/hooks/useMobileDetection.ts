import { useEffect, useState } from 'react';

const checkMobile = () =>
  typeof window !== 'undefined' &&
  (window.innerWidth < 768 ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0);

/**
 * Hook to detect if the user is on a mobile device
 * Checks window width, touch support, and max touch points
 */
export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(checkMobile);

  useEffect(() => {
    const handleResize = () => setIsMobile(checkMobile());
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}
