import { useCallback, useEffect, useState } from 'react';

interface UseNextEpisodeOverlayOptions {
  isVisible: boolean;
  nextEpisode: object | null;
  autoPlayDelay: number;
  isLoading: boolean;
  onPlayNext: () => void;
  onCancel: () => void;
}

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
