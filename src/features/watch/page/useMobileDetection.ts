import { useEffect, useState } from 'react';

/**
 * Hook to detect if the user is on a mobile device
 * Checks window width, touch support, and max touch points
 */
export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth < 768 ||
          'ontouchstart' in window ||
          navigator.maxTouchPoints > 0,
      );
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
