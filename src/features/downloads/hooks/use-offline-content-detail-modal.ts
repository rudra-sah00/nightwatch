import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useSidebar } from '@/app/(protected)/(main)/layout';
import { useOfflineContentDetail } from './use-offline-content-detail';

/** Options for the {@link useOfflineContentDetailModal} hook. */
interface ContentDetailModalOptions {
  /** Unique content identifier. */
  contentId: string;
  /** Optional initial context for deep-linking to a specific season/episode. */
  initialContext?: {
    season?: number;
    episode?: number;
    episodeId?: string;
    [key: string]: unknown;
  };
  /** Whether the modal was opened from the "Continue Watching" section. */
  fromContinueWatching?: boolean;
  /** When `true`, automatically starts playback with a countdown. */
  autoPlay?: boolean;
  /** Callback to close the modal. */
  onClose: () => void;
}

/**
 * Orchestrates the offline content detail modal's state and side effects.
 *
 * Composes {@link useOfflineContentDetail} with UI-specific concerns: sidebar
 * disabling, body scroll locking, escape-key handling, auto-play countdown
 * logic, and trailer auto-start. Returns all state and handlers needed by
 * the {@link OfflineContentDetailModal} component.
 */
export function useOfflineContentDetailModal({
  contentId,
  initialContext,
  fromContinueWatching = false,
  autoPlay = false,
  onClose,
}: ContentDetailModalOptions) {
  const _router = useRouter();
  const { setSidebarsDisabled } = useSidebar();

  // Disable sidebars while modal is open
  useEffect(() => {
    setSidebarsDisabled(true);
    return () => setSidebarsDisabled(false);
  }, [setSidebarsDisabled]);

  const {
    show,
    episodes,
    isLoading,
    isLoadingEpisodes,
    isLoadingProgress,
    isPlaying,
    playingEpisodeId,
    selectedSeason,
    hasWatchProgress,
    watchProgress,
    handleSeasonSelect,
    handlePlay,
    handleResume,
    inWatchlist,
    isWatchlistLoading,
    toggleWatchlist,
  } = useOfflineContentDetail({
    contentId,
    initialContext,
    fromContinueWatching,
  });

  const [imageError, setImageError] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownTarget, setCountdownTarget] = useState<() => Promise<void>>();
  const [showTrailer, setShowTrailer] = useState(false);

  // Auto-play logic
  useEffect(() => {
    if (autoPlay && show && !isLoading && !isPlaying) {
      const triggerPlay = async () => {
        const executePlay = async () => {
          if (initialContext?.episodeId || initialContext?.episode) {
            if (initialContext.episode && episodes.length > 0) {
              const ep = episodes.find(
                (e) =>
                  e.episodeNumber === initialContext.episode &&
                  e.seasonNumber === initialContext.season,
              );
              if (ep) {
                await handlePlay(ep);
                return;
              }
            }
            await handleResume();
          } else {
            await handlePlay();
          }
        };

        setCountdownTarget(() => executePlay);
        setShowCountdown(true);
      };
      triggerPlay();
    }
  }, [
    autoPlay,
    show,
    isLoading,
    isPlaying,
    initialContext,
    handlePlay,
    handleResume,
    episodes,
  ]);

  // Auto-play trailer if available
  useEffect(() => {
    let stopped = false;
    const isServer3 = contentId.startsWith('s3:');

    // Force stop trailer while playing so it unmounts completely
    // When we return, isPlaying will be false, and it will remount and autoPlay again!
    if (isPlaying && showTrailer) {
      setShowTrailer(false);
      return;
    }

    if (
      !isServer3 &&
      show?.trailers &&
      show.trailers.length > 0 &&
      !isPlaying &&
      !stopped &&
      !showTrailer
    ) {
      setShowTrailer(true);
    }
    return () => {
      stopped = true;
    };
  }, [show, isPlaying, contentId, showTrailer]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => setShowTrailer(false);
  }, []);

  // Block body scroll
  useEffect(() => {
    if (autoPlay) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [autoPlay]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleWatchlistToggle = useCallback(async () => {
    await toggleWatchlist();
  }, [toggleWatchlist]);

  return {
    show,
    episodes,
    isLoading,
    isLoadingEpisodes,
    isLoadingProgress,
    isPlaying,
    playingEpisodeId,
    selectedSeason,
    hasWatchProgress,
    watchProgress,
    handleSeasonSelect,
    handlePlay,
    handleResume,
    inWatchlist,
    isWatchlistLoading,
    handleWatchlistToggle,
    imageError,
    setImageError,
    seasonDropdownOpen,
    setSeasonDropdownOpen,
    showCountdown,
    setShowCountdown,
    countdownTarget,
    showTrailer,
    setShowTrailer,
  };
}
