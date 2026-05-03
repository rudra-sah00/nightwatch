import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSidebar } from '@/app/(protected)/(main)/layout';
import { useWatchParty } from '@/features/watch-party/room/hooks/useWatchParty';
import { generateRoomId } from '@/features/watch-party/room/utils';
import { ContentType, type Episode } from '../types';
import { useContentDetail } from './use-content-detail';

/** Options for the {@link useContentDetailModal} hook. */
interface ContentDetailModalOptions {
  contentId: string;
  initialContext?: {
    season?: number;
    episode?: number;
    episodeId?: string;
    [key: string]: unknown;
  };
  fromContinueWatching?: boolean;
  autoPlay?: boolean;
  onClose: () => void;
}

/**
 * Hook that orchestrates the content-detail modal lifecycle.
 *
 * Composes {@link useContentDetail} with watch-party creation, watchlist
 * toggling, trailer auto-play, countdown overlays, body-scroll locking,
 * and Escape-key dismissal. Disables layout sidebars while the modal is
 * open.
 *
 * @param options - {@link ContentDetailModalOptions}
 * @returns All state and action handlers needed by the content-detail modal UI.
 */
export function useContentDetailModal({
  contentId,
  initialContext,
  fromContinueWatching = false,
  autoPlay = false,
  onClose,
}: ContentDetailModalOptions) {
  const t = useTranslations('common.toasts');
  const router = useRouter();

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
  } = useContentDetail({ contentId, initialContext, fromContinueWatching });

  const { createRoom, isLoading: isCreatingParty } = useWatchParty();
  const { setSidebarsDisabled } = useSidebar();

  // Disable sidebars while modal is open
  useEffect(() => {
    setSidebarsDisabled(true);
    return () => setSidebarsDisabled(false);
  }, [setSidebarsDisabled]);

  const [imageError, setImageError] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [creatingEpisodeId, setCreatingEpisodeId] = useState<
    string | number | null
  >(null);
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

    if (
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
  }, [show, isPlaying, showTrailer]);

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
      if (creatingEpisodeId) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, creatingEpisodeId]);

  const handleWatchParty = async (episode?: Episode) => {
    if (!show) {
      toast.error(t('partyMissing'));
      return;
    }

    if (show.contentType === ContentType.Series && !episode) {
      setIsSetupOpen(true);
      return;
    }

    try {
      if (episode) {
        setCreatingEpisodeId(episode.episodeId || episode.episodeNumber);
      }

      const roomPayload = {
        contentId: show.id,
        title: show.title,
        type: (show.contentType === ContentType.Movie ? 'movie' : 'series') as
          | 'movie'
          | 'series',
        streamUrl: '',
        posterUrl: show.posterUrl,
        season:
          show.contentType === ContentType.Series
            ? episode?.seasonNumber || selectedSeason?.seasonNumber || 1
            : undefined,
        episode:
          show.contentType === ContentType.Series
            ? episode?.episodeNumber || 1
            : undefined,
      };

      const roomId = generateRoomId();
      const room = await createRoom(roomId, roomPayload);

      if (room) {
        toast.success(t('partyCreated'));
        router.push(`/watch-party/${room.id}?new=true`);
      } else {
        toast.error(t('partyFailed'));
      }
    } catch (_err) {
      toast.error(
        'An unexpected error occurred while creating the watch party.',
      );
    } finally {
      setCreatingEpisodeId(null);
    }
  };

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
    isCreatingParty,
    handleWatchParty,
    handleWatchlistToggle,
    imageError,
    setImageError,
    seasonDropdownOpen,
    setSeasonDropdownOpen,
    isSetupOpen,
    setIsSetupOpen,
    creatingEpisodeId,
    showCountdown,
    setShowCountdown,
    countdownTarget,
    showTrailer,
    setShowTrailer,
  };
}
