'use client';

import NProgress from 'nprogress';
import { useEffect } from 'react';

NProgress.configure({ showSpinner: false, minimum: 0.1, speed: 300 });

/**
 * Global page-transition progress bar powered by NProgress.
 *
 * Monkey-patches `history.pushState` and `history.replaceState` and listens for
 * anchor clicks to start/stop the progress indicator on client-side navigations.
 * Injects a `<style>` tag to position the bar below the navbar and Electron title bar.
 */
export function ProgressBar() {
  useEffect(() => {
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args) => {
      NProgress.start();
      requestAnimationFrame(() => NProgress.done());
      originalPushState(...args);
    };

    history.replaceState = (...args) => {
      requestAnimationFrame(() => NProgress.done());
      originalReplaceState(...args);
    };

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('/') || href.startsWith('//')) return;
      if (anchor.target === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (href === window.location.pathname + window.location.search) return;
      NProgress.start();
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      document.removeEventListener('click', handleClick, true);
      NProgress.done();
    };
  }, []);

  return (
    <style>{`
      #nprogress {
        pointer-events: none;
        z-index: 99999;
      }
      #nprogress .bar {
        background: var(--neo-yellow);
        position: fixed;
        z-index: 99999;
        top: calc(77px + var(--electron-titlebar-height, 0px) + env(safe-area-inset-top, 0px));
        left: 0;
        width: 100%;
        height: 3px;
      }
      #nprogress .peg {
        display: none;
      }
    `}</style>
  );
}
