import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

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
 */
export function useWatchPartyFullscreen({
  containerRef,
}: UseWatchPartyFullscreenProps): UseWatchPartyFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
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
      toast.error('Failed to toggle fullscreen');
    }
  }, [containerRef]);

  useEffect(() => {
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
