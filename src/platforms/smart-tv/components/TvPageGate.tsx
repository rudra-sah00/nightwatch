'use client';

import { useEffect, useState } from 'react';
import { isTV, waitForTvFlag } from '@/platforms/smart-tv/lib/detection';

/**
 * Renders `tvContent` on TV and the web `children` everywhere else.
 *
 * Defaults to the web tree and upgrades to TV once detection confirms it —
 * the same strategy `MainLayout` uses to swap in `TvRootLayout`. `isTV()` is
 * synchronous on TV (the native shell persists `localStorage.__ANDROID_TV__`
 * alongside `window.__ANDROID_TV__`), so `waitForTvFlag()` short-circuits and
 * the swap lands on the first tick after mount. Only a first-ever launch, where
 * the native flag can still race the page, actually waits out the poll.
 *
 * This deliberately does *not* render a TV skeleton while detecting: on web the
 * poll always runs to its full timeout, which flashed the TV skeleton on every
 * gated route.
 */
export function TvPageGate({
  tvContent,
  children,
}: {
  tvContent: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isTvMode, setIsTvMode] = useState(false);

  useEffect(() => {
    if (isTV()) {
      setIsTvMode(true);
      return;
    }

    let cancelled = false;
    waitForTvFlag()
      .then((flag) => {
        if (!cancelled && flag) setIsTvMode(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return <>{isTvMode ? tvContent : children}</>;
}
