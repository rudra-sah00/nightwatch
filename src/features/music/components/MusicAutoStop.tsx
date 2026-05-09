'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

/** Routes that trigger automatic music stop (video playback pages). */
const STOP_ROUTES = ['/watch/', '/live/', '/watch-party/', '/clip/'];

/**
 * Headless component that automatically stops music playback when the user
 * navigates into a video route (`/watch/` or `/live/`).
 *
 * Tracks the previous pathname via a ref and compares it against the current
 * one on every navigation. Music is only stopped on the *transition into* a
 * video route (not when already on one), preventing false triggers on
 * in-page navigations within the video player.
 *
 * Renders `null` — this is a side-effect-only component.
 */
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
