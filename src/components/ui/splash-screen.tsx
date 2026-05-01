'use client';

import { useEffect, useState } from 'react';

/**
 * Animated splash screen overlay displayed on initial app load.
 *
 * Shows the "NIGHTWATCH" wordmark with a shimmer animation for 2 seconds,
 * then fades out over 500ms and unmounts. Covers the entire viewport at
 * `z-index: 200` to mask content loading beneath.
 */
export function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 2000);
    const hideTimer = setTimeout(() => setShow(false), 2500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] bg-background flex items-center justify-center transition-opacity duration-500 ease-out ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <span
        className="font-headline font-black italic uppercase tracking-tighter text-[clamp(2.5rem,7vw,4.5rem)] select-none text-transparent pr-[0.15em] bg-[length:200%_100%] bg-clip-text animate-[shimmer_2s_ease-in-out_infinite] bg-[linear-gradient(110deg,transparent_35%,hsl(var(--foreground)/0.15)_50%,transparent_65%)]"
        style={{ WebkitTextStroke: '1.5px hsl(var(--foreground))' }}
      >
        NIGHTWATCH
      </span>
    </div>
  );
}
