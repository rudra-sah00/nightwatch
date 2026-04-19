'use client';

import NProgress from 'nprogress';
import { useEffect } from 'react';

NProgress.configure({ showSpinner: false, minimum: 0.1, speed: 300 });

export function ProgressBar() {
  useEffect(() => {
    // Monkey-patch pushState — this is how Next.js App Router navigates.
    // NProgress.start() mutates the DOM directly, so it paints immediately.
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args) => {
      NProgress.done();
      originalPushState(...args);
    };

    history.replaceState = (...args) => {
      NProgress.done();
      originalReplaceState(...args);
    };

    // Start progress on every <a> click (before Next.js router takes over)
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('/') || href.startsWith('//')) return;
      if (anchor.target === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Don't start if clicking the current page
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
        background: #facc15;
        position: fixed;
        z-index: 99999;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
      }
      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px #facc15, 0 0 5px #facc15;
        opacity: 1;
        transform: rotate(3deg) translate(0px, -4px);
      }
    `}</style>
  );
}
