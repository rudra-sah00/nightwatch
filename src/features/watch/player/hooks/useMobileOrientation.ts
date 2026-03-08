import { useEffect, useState } from 'react';

const checkPortrait = () =>
  typeof window !== 'undefined' && window.innerHeight > window.innerWidth;

/**
 * Returns true when the device is in portrait orientation.
 * Updates on resize and orientationchange.
 */
export function useMobileOrientation(): boolean {
  const [isPortrait, setIsPortrait] = useState(checkPortrait);

  useEffect(() => {
    const handle = () => setIsPortrait(checkPortrait());
    window.addEventListener('resize', handle, { passive: true });
    window.addEventListener('orientationchange', handle, { passive: true });
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('orientationchange', handle);
    };
  }, []);

  return isPortrait;
}
