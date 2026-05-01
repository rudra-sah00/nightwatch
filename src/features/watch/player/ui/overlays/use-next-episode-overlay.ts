import { useCallback, useEffect, useState } from 'react';

/** Options for {@link useNextEpisodeOverlay}. */
interface UseNextEpisodeOverlayOptions {
  isVisible: boolean;
  nextEpisode: object | null;
  autoPlayDelay: number;
  isLoading: boolean;
  onPlayNext: () => void;
  onCancel: () => void;
}

/**
 * Manages the auto-play countdown for the next episode overlay.
 *
 * Counts down from `autoPlayDelay` seconds and triggers `onPlayNext`
 * when it reaches zero (unless cancelled or loading).
 *
 * @returns `countdown`, `cancelled` flag, and `handleCancel` callback.
 */
export function useNextEpisodeOverlay({
  isVisible,
  nextEpisode,
  autoPlayDelay,
  isLoading,
  onPlayNext,
  onCancel,
}: UseNextEpisodeOverlayOptions) {
  const [countdown, setCountdown] = useState(autoPlayDelay);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (
      !isVisible ||
      !nextEpisode ||
      cancelled ||
      autoPlayDelay === 0 ||
      isLoading
    )
      return;

    if (countdown <= 0) {
      onPlayNext();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isVisible,
    nextEpisode,
    countdown,
    cancelled,
    autoPlayDelay,
    isLoading,
    onPlayNext,
  ]);

  const handleCancel = useCallback(() => {
    setCancelled(true);
    onCancel();
  }, [onCancel]);

  return { countdown, cancelled, handleCancel };
}
