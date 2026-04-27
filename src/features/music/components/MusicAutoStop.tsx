'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

const STOP_ROUTES = ['/watch/', '/live/'];

export function MusicAutoStop() {
  const { currentTrack, stop } = useMusicPlayerContext();
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    const wasVideo = STOP_ROUTES.some((r) => prevPathRef.current.startsWith(r));
    const isVideo = STOP_ROUTES.some((r) => pathname.startsWith(r));
    prevPathRef.current = pathname;

    // Stop music when navigating INTO a video route
    if (isVideo && !wasVideo && currentTrack) {
      stop();
    }
  }, [pathname, currentTrack, stop]);

  return null;
}
