import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { checkIsDesktop, desktopBridge } from '@/lib/tauri-bridge';

interface UseWatchPartyFullscreenProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface UseWatchPartyFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
}

/**
 * Manages native browser fullscreen for a container element,
 * with Safari/WebKit fallback support.
 * In the Tauri Desktop App, delegates exactly to OS window fullscreen
 * APIs rather than Chromium HTML5 bounds, ensuring the Watch Party
 * Sidebar can gracefully sit under dragging logic without being consumed.
 */
export function useWatchPartyFullscreen({
  containerRef,
}: UseWatchPartyFullscreenProps): UseWatchPartyFullscreenReturn {
  const t = useTranslations('common.toasts');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    // 1. Desktop App Native OS Fullscreen
    if (typeof window !== 'undefined' && checkIsDesktop()) {
      desktopBridge.toggleFullscreen();
      return;
    }

    // 2. Web Browser DOM Fallback
    try {
      const doc = document as Document & {
        webkitFullscreenElement?: Element;
        webkitExitFullscreen?: () => Promise<void>;
      };
      const container = containerRef.current as
        | (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> })
        | null;

      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
        return;
      }

      if (container) {
        if (container.requestFullscreen) {
          await container.requestFullscreen({ navigationUI: 'hide' });
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        }
      }
    } catch {
      toast.error(t('fullscreenFailed'));
    }
  }, [containerRef, t]);

  useEffect(() => {
    // 1. Desktop App Native OS Event Link
    if (typeof window !== 'undefined' && checkIsDesktop()) {
      const unsubscribe = desktopBridge.onFullscreenChanged((isFS) => {
        setIsFullscreen(isFS);
      });
      return unsubscribe;
    }

    // 2. Web Browser Fallback DOM Events
    const handleFullscreenChange = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element;
      };
      setIsFullscreen(
        !!document.fullscreenElement || !!doc.webkitFullscreenElement,
      );
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange,
      );
    };
  }, []);

  return { isFullscreen, toggleFullscreen };
}
