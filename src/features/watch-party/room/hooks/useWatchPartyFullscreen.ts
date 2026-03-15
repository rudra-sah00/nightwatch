import { useCallback, useState } from 'react';

interface UseWatchPartyFullscreenProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface UseWatchPartyFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
}

/**
 * CSS-based "theater mode" fullscreen for the watch party container.
 *
 * Intentionally does NOT call the native browser Fullscreen API.
 * Native fullscreen creates an isolated rendering layer that breaks:
 *  - position:fixed overlays (FloatingChat) rendered outside the layer
 *  - sidebar z-index/interaction inside the fullscreen element
 *  - React portal-based dialogs and toasts
 *
 * Instead we toggle a simple boolean that callers use to apply CSS
 * (e.g. hiding the sidebar, overlaying the video) while the React
 * component tree stays intact.
 */
export function useWatchPartyFullscreen({
  containerRef: _containerRef,
}: UseWatchPartyFullscreenProps): UseWatchPartyFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    setIsFullscreen((prev) => !prev);
  }, []);

  return { isFullscreen, toggleFullscreen };
}
