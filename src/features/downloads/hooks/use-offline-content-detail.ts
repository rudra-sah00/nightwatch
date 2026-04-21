'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ContentType,
  type Episode,
  type Season,
  type ShowDetails,
} from '@/features/search/types';
import type { ContentProgress } from '@/types/content';
import { useDownloads } from './use-downloads';

interface UseOfflineContentDetailOptions {
  contentId: string;
  initialContext?: { season?: number; episode?: number; episodeId?: string };
  fromContinueWatching?: boolean;
}

interface UseOfflineContentDetailReturn {
  show: ShowDetails | null;
  episodes: Episode[];
  isLoading: boolean;
  isLoadingEpisodes: boolean;
  isLoadingProgress: boolean;
  isPlaying: boolean;
  playingEpisodeId: string | number | null;
  selectedSeason: Season | null;
  hasWatchProgress: boolean;
  watchProgress: ContentProgress | null;
  inWatchlist: boolean;
  isWatchlistLoading: boolean;

  handleSeasonSelect: (season: Season) => void;
  handlePlay: (episode?: Episode) => Promise<void>;
  handleResume: () => Promise<void>;
  toggleWatchlist: () => Promise<void>;
}

export function useOfflineContentDetail({
  contentId,
  initialContext,
}: UseOfflineContentDetailOptions): UseOfflineContentDetailReturn {
  const router = useRouter();
  const t = useTranslations('live');
  const { downloads } = useDownloads();

  const [show, setShow] = useState<ShowDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingEpisodeId, setPlayingEpisodeId] = useState<
    string | number | null
  >(null);

  // Clear playing state upon mount if returning from another page
  useEffect(() => {
    setIsPlaying(false);
    setPlayingEpisodeId(null);
  }, []);

  useEffect(() => {
    if (!downloads || downloads.length === 0) return;

    // Find the relevant download for the given base contentId
    // We check with and without prefixes to be as robust as possible.
    const searchTarget = contentId.replace(/^(s1|s2|s3):/, '');
    const relevantDownloads = downloads.filter((d) => {
      const dbId = d.contentId.replace(/^(s1|s2|s3):/, '');
      return (
        d.contentId === contentId ||
        dbId === searchTarget ||
        d.contentId.startsWith(`${contentId}_S`) ||
        dbId.startsWith(`${searchTarget}_S`) ||
        d.contentId.startsWith(`${contentId}-ep`) ||
        dbId.startsWith(`${searchTarget}-ep`)
      );
    });

    const itemWithData = relevantDownloads.find((d) => d.showData);
    if (itemWithData?.showData) {
      const showDetails = itemWithData.showData as ShowDetails;
      setShow(showDetails);

      const md = showDetails;
      if (md.contentType === ContentType.Series) {
        const sNum = initialContext?.season || 1;
        const s =
          md.seasons?.find((season: Season) => season.seasonNumber === sNum) ||
          md.seasons?.[0];

        setSelectedSeason(s || null);

        // Prepopulate with downloaded episodes, or all episodes present in metadata.
        if (md.episodes) {
          setEpisodes(md.episodes);
        }
      }
    }

    setIsLoading(false);
  }, [downloads, contentId, initialContext]);

  const handleSeasonSelect = (season: Season) => {
    setSelectedSeason(season);
  };

  const handlePlayInternal = async (
    showData: ShowDetails,
    currentEpisodes: Episode[],
    episode?: Episode,
  ) => {
    setIsPlaying(true);
    if (episode) {
      setPlayingEpisodeId(episode.episodeId || episode.episodeNumber);
    }

    try {
      if (showData.contentType === ContentType.Movie) {
        const description = showData.description
          ? encodeURIComponent(showData.description)
          : '';
        const year = showData.year ? encodeURIComponent(showData.year) : '';
        const posterUrl = showData.posterUrl
          ? encodeURIComponent(showData.posterUrl)
          : '';
        const providerId = showData.id.split(':')[0] || 's1';

        let url = `/watch/${encodeURIComponent(showData.id)}?type=movie&title=${encodeURIComponent(showData.title)}&server=${providerId}`;
        if (description) url += `&description=${description}`;
        if (year) url += `&year=${year}`;
        if (posterUrl) url += `&poster=${posterUrl}`;

        router.push(url);
        setTimeout(() => {
          setIsPlaying(false);
          setPlayingEpisodeId(null);
        }, 1500);
      } else {
        let episodeToPlay = episode;
        if (!episodeToPlay && currentEpisodes.length > 0) {
          const sorted = [...currentEpisodes].sort(
            (a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0),
          );
          episodeToPlay = sorted[0];
          setPlayingEpisodeId(
            episodeToPlay.episodeId || episodeToPlay.episodeNumber,
          );
        }
        if (!episodeToPlay) {
          toast.error(t('noEpisodesOffline'));
          setIsPlaying(false);
          setPlayingEpisodeId(null);
          return;
        }

        const seasonNumber = episodeToPlay.seasonNumber || 1;
        const description = showData.description
          ? encodeURIComponent(showData.description)
          : '';
        const year = showData.year ? encodeURIComponent(showData.year) : '';
        const posterUrl = showData.posterUrl
          ? encodeURIComponent(showData.posterUrl)
          : '';
        const episodeTitle = episodeToPlay.title
          ? encodeURIComponent(episodeToPlay.title)
          : '';
        const providerId = showData.id.split(':')[0] || 's1';

        let url = `/watch/${encodeURIComponent(showData.id)}?type=series&title=${encodeURIComponent(showData.title)}&season=${seasonNumber}&episode=${episodeToPlay.episodeNumber}&seriesId=${encodeURIComponent(showData.id)}&server=${providerId}`;
        if (description) url += `&description=${description}`;
        if (year) url += `&year=${year}`;
        if (posterUrl) url += `&poster=${posterUrl}`;
        if (episodeTitle) url += `&episodeTitle=${episodeTitle}`;

        router.push(url);
        setTimeout(() => {
          setIsPlaying(false);
          setPlayingEpisodeId(null);
        }, 1500);
      }
    } catch {
      toast.error(t('failedPlayback'));
      setIsPlaying(false);
      setPlayingEpisodeId(null);
    }
  };

  const handlePlay = async (episode?: Episode) => {
    if (!show) return;
    await handlePlayInternal(show, episodes, episode);
  };

  const handleResume = async () => {
    if (!show) return;
    if (show.contentType === ContentType.Movie) {
      await handlePlayInternal(show, [], undefined);
    } else {
      // In offline, if no resume data, just play the first known episode.
      await handlePlayInternal(show, episodes, undefined);
    }
  };

  const toggleWatchlist = async () => {};

  return {
    show,
    episodes,
    isLoading,
    isLoadingEpisodes: false,
    isLoadingProgress: false,
    isPlaying,
    playingEpisodeId,
    selectedSeason,
    hasWatchProgress: false,
    watchProgress: null,
    inWatchlist: false,
    isWatchlistLoading: false,
    handleSeasonSelect,
    handlePlay,
    handleResume,
    toggleWatchlist,
  };
}
