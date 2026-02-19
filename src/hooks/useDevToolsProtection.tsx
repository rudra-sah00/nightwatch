'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    Firebug?: { chrome?: { isInitialized: boolean } };
  }
}

const REDIRECT_URL = 'https://rudrasahoo.live';

/**
 * DevTools Protection Hook
 * Detects various methods of opening DevTools and redirects
 * Only active in production mode
 */
export function useDevToolsProtection() {
  useEffect(() => {
    const cleanup = initDevToolsProtection();
    return cleanup;
  }, []);
}

/**
 * Plain function that sets up devtools protection and returns a cleanup function.
 * Can be dynamically imported to avoid loading 300+ lines in development.
 */
export function initDevToolsProtection(): (() => void) | undefined {
  // TEMPORARY: Disable devtools protection for debugging
  return undefined;

  /*
  // Skip in development mode
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  const redirect = () => {
    window.location.href = REDIRECT_URL;
  };

  const styleId = 'devtools-protection-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        body {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
        
        input, textarea, [contenteditable="true"] {
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          user-select: text !important;
        }
        
        body * {
          -webkit-user-drag: none !important;
          -khtml-user-drag: none !important;
          -moz-user-drag: none !important;
          -o-user-drag: none !important;
        }
        
        @media print {
          body {
            display: none !important;
          }
        }
      `;
    document.head.appendChild(style);
  }

  let devtoolsOpen = false;
  const threshold = 160;

  const checkDevToolsSize = () => {
    const isMobile =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth < 768;

    if (isMobile) return;

    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;

    if (widthThreshold || heightThreshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        redirect();
      }
    } else {
      devtoolsOpen = false;
    }
  };

  const image = new Image();
  Object.defineProperty(image, 'id', {
    get: () => {
      redirect();
      return '';
    },
  });

  const checkConsole = () => {
    console.log(image);
    console.log(element);
    console.clear();

    const start = Date.now();
    debugger;
    if (Date.now() - start > 100) {
      redirect();
    }
  };

  const blockKeyboardShortcuts = (e: KeyboardEvent) => {
    if (e.key === 'F12') {
      e.preventDefault();
      redirect();
      return false;
    }

    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
      e.preventDefault();
      redirect();
      return false;
    }

    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
      e.preventDefault();
      redirect();
      return false;
    }

    if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      redirect();
      return false;
    }

    if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      redirect();
      return false;
    }

    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      return false;
    }

    if (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault();
      redirect();
      return false;
    }

    if (e.metaKey && e.altKey && (e.key === 'j' || e.key === 'J')) {
      e.preventDefault();
      redirect();
      return false;
    }

    if (e.metaKey && e.altKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      redirect();
      return false;
    }

    if (e.metaKey && e.altKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      redirect();
      return false;
    }

    if (e.metaKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      redirect();
      return false;
    }

    if (e.metaKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      return false;
    }

    return true;
  };

  const blockContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    return false;
  };

  const blockDrag = (e: DragEvent) => {
    e.preventDefault();
    return false;
  };

  const checkFirebug = () => {
    if (window.Firebug?.chrome?.isInitialized) {
      redirect();
    }
  };

  const element = document.createElement('div');
  Object.defineProperty(element, 'id', {
    get: () => {
      redirect();
      return '';
    },
  });

  const sizeCheckInterval = setInterval(checkDevToolsSize, 500);
  const consoleCheckInterval = setInterval(checkConsole, 2000);
  const firebugCheckInterval = setInterval(checkFirebug, 1000);

  window.addEventListener('keydown', blockKeyboardShortcuts);
  document.addEventListener('contextmenu', blockContextMenu);
  document.addEventListener('dragstart', blockDrag);
  window.addEventListener('resize', checkDevToolsSize, { passive: true });

  checkDevToolsSize();
  checkFirebug();

  return () => {
    clearInterval(sizeCheckInterval);
    clearInterval(consoleCheckInterval);
    clearInterval(firebugCheckInterval);
    window.removeEventListener('keydown', blockKeyboardShortcuts);
    document.removeEventListener('contextmenu', blockContextMenu);
    document.removeEventListener('dragstart', blockDrag);
    window.removeEventListener('resize', checkDevToolsSize);

    const styleEl = document.getElementById(styleId);
    if (styleEl) {
      styleEl.remove();
    }
  };
  */
}
