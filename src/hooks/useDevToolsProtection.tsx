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
    // Skip in development mode
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    const redirect = () => {
      window.location.href = REDIRECT_URL;
    };

    // ============================================
    // CSS Protection: Disable selection, drag, print
    // ============================================
    const styleId = 'devtools-protection-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Disable text selection */
        body {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
        
        /* Allow selection in input fields */
        input, textarea, [contenteditable="true"] {
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          user-select: text !important;
        }
        
        /* Disable drag */
        body * {
          -webkit-user-drag: none !important;
          -khtml-user-drag: none !important;
          -moz-user-drag: none !important;
          -o-user-drag: none !important;
        }
        
        /* Disable print */
        @media print {
          body {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // ============================================
    // Method 1: DevTools size detection
    // ============================================
    let devtoolsOpen = false;
    const threshold = 160;

    const checkDevToolsSize = () => {
      // Bypass on mobile/touch devices as zoom triggers false positives
      const isMobile =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth < 768;

      if (isMobile) return;

      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold =
        window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          redirect();
        }
      } else {
        devtoolsOpen = false;
      }
    };

    // ============================================
    // Method 2: Console timing detection
    // ============================================
    const image = new Image();
    Object.defineProperty(image, 'id', {
      get: () => {
        redirect();
        return '';
      },
    });

    const checkConsole = () => {
      // Console cleared for protection
    };

    // ============================================
    // Method 3: Block keyboard shortcuts
    // ============================================
    const blockKeyboardShortcuts = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        redirect();
        return false;
      }

      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        redirect();
        return false;
      }

      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        redirect();
        return false;
      }

      // Ctrl+Shift+C (Element Inspector)
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        redirect();
        return false;
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        redirect();
        return false;
      }

      // Ctrl+S (Save As) - prevents saving HTML
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return false;
      }

      // Cmd+Option+I (Mac DevTools)
      if (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        redirect();
        return false;
      }

      // Cmd+Option+J (Mac Console)
      if (e.metaKey && e.altKey && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        redirect();
        return false;
      }

      // Cmd+Option+C (Mac Element Inspector)
      if (e.metaKey && e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        redirect();
        return false;
      }

      // Cmd+Option+U (Mac View Source)
      if (e.metaKey && e.altKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        redirect();
        return false;
      }

      // Cmd+U (Mac View Source)
      if (e.metaKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        redirect();
        return false;
      }

      // Cmd+S (Mac Save As)
      if (e.metaKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return false;
      }

      return true;
    };

    // ============================================
    // Method 4: Block right-click context menu
    // ============================================
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // ============================================
    // Method 5: Block drag and drop
    // ============================================
    const blockDrag = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // ============================================
    // Method 6: Detect Firebug (legacy)
    // ============================================
    const checkFirebug = () => {
      if (window.Firebug?.chrome?.isInitialized) {
        redirect();
      }
    };

    // ============================================
    // Method 7: Console object property detection
    // ============================================
    const element = document.createElement('div');
    Object.defineProperty(element, 'id', {
      get: () => {
        redirect();
        return '';
      },
    });

    // ============================================
    // Setup intervals and listeners
    // ============================================
    const sizeCheckInterval = setInterval(checkDevToolsSize, 500);
    const consoleCheckInterval = setInterval(checkConsole, 2000);
    const firebugCheckInterval = setInterval(checkFirebug, 1000);

    window.addEventListener('keydown', blockKeyboardShortcuts);
    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('dragstart', blockDrag);
    window.addEventListener('resize', checkDevToolsSize);

    // Initial check
    checkDevToolsSize();
    checkFirebug();

    // Cleanup
    return () => {
      clearInterval(sizeCheckInterval);
      clearInterval(consoleCheckInterval);
      clearInterval(firebugCheckInterval);
      window.removeEventListener('keydown', blockKeyboardShortcuts);
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('dragstart', blockDrag);
      window.removeEventListener('resize', checkDevToolsSize);

      // Remove injected styles
      const styleEl = document.getElementById(styleId);
      if (styleEl) {
        styleEl.remove();
      }
    };
  }, []);
}

/**
 * DevTools Protection Provider Component
 * Wrap your app with this component to enable protection
 */
export function DevToolsProtection({
  children,
}: {
  children: React.ReactNode;
}) {
  useDevToolsProtection();
  return <>{children}</>;
}
