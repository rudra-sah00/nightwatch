import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useWatchParty } from '@/features/watch-party/room/hooks/useWatchParty';
import { ContentType, type Episode } from '../types';
import { useContentDetail } from './use-content-detail';

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

export function useContentDetailModal({
  contentId,
  initialContext,
  fromContinueWatching = false,
  autoPlay = false,
  onClose,
}: ContentDetailModalOptions) {
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
                onClose();
                return;
              }
            }
            await handleResume();
            onClose();
          } else {
            await handlePlay();
            onClose();
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
    onClose,
  ]);

  // Auto-play trailer if available
  useEffect(() => {
    let stopped = false;
    if (show?.trailers && show.trailers.length > 0 && !isPlaying && !stopped) {
      setShowTrailer(true);
    }
    return () => {
      stopped = true;
      setShowTrailer(false);
    };
  }, [show, isPlaying]);

  // Block body scroll when modal is open
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
      toast.error('Unable to create party: Content details missing');
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

      const room = await createRoom(roomPayload);

      if (room) {
        toast.success('Party room created! Redirecting...');
        router.push(`/watch-party/${room.id}?new=true`);
        onClose();
      } else {
        toast.error('Failed to create party room. Please try again.');
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
    // from useContentDetail
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
    // watch party
    isCreatingParty,
    handleWatchParty,
    handleWatchlistToggle,
    // local UI state
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
