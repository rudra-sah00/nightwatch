/**
 * NextEpisodeService — Handles discovery of the next episode and construction of the navigation URL.
 */

import { getSeriesEpisodes, getShowDetails } from '@/features/search/api';
import type { Episode, ShowDetails } from '@/features/search/types';
import { playVideo, stopVideo } from '@/features/watch/api';
import type { VideoMetadata } from '../context/types';
import { cacheSeriesData, getCachedSeriesData } from '../hooks/series-cache';
import type { NextEpisodeInfo } from '../ui/overlays/NextEpisodeOverlay';

/**
 * Fetches the next episode info, checking the cache first.
 */
export async function fetchNextEpisodeInfo(
  metadata: VideoMetadata,
): Promise<NextEpisodeInfo | null> {
  const seriesId = metadata.seriesId;
  if (!seriesId || metadata.type !== 'series') return null;

  const currentSeason = metadata.season || 1;
  const currentEpisode = metadata.episode || 1;

  // Try to get cached data first
  const cachedData = getCachedSeriesData(seriesId);
  let showDetails: ShowDetails;
  let currentSeasonEpisodes: Episode[];

  if (cachedData) {
    showDetails = cachedData.showDetails;
    if (cachedData.loadedSeasons[currentSeason]) {
      currentSeasonEpisodes = cachedData.loadedSeasons[currentSeason];
    } else {
      const currentSeasonData = showDetails.seasons?.find(
        (s) => s.seasonNumber === currentSeason,
      );
      if (!currentSeasonData) return null;

      const { episodes } = await getSeriesEpisodes(
        seriesId,
        currentSeasonData.seasonId,
      );
      currentSeasonEpisodes = episodes;
      cacheSeriesData(
        seriesId,
        showDetails,
        currentSeason,
        currentSeasonEpisodes,
      );
    }
  } else {
    showDetails = await getShowDetails(seriesId);
    if (!showDetails.seasons || showDetails.seasons.length === 0) return null;

    const currentSeasonData = showDetails.seasons.find(
      (s) => s.seasonNumber === currentSeason,
    );
    if (!currentSeasonData) return null;

    const { episodes } = await getSeriesEpisodes(
      seriesId,
      currentSeasonData.seasonId,
    );
    currentSeasonEpisodes = episodes;
    cacheSeriesData(
      seriesId,
      showDetails,
      currentSeason,
      currentSeasonEpisodes,
    );
  }

  if (!showDetails.seasons || showDetails.seasons.length === 0) return null;

  // 1. Check current season
  const nextEpisodeInSeason = currentSeasonEpisodes.find(
    (ep) => ep.episodeNumber === currentEpisode + 1,
  );

  if (nextEpisodeInSeason) {
    return {
      title:
        nextEpisodeInSeason.title ||
        `Episode ${nextEpisodeInSeason.episodeNumber}`,
      seriesTitle: metadata.title,
      seasonNumber: currentSeason,
      episodeNumber: nextEpisodeInSeason.episodeNumber,
      thumbnailUrl: nextEpisodeInSeason.thumbnailUrl,
      duration: nextEpisodeInSeason.duration,
    };
  }

  // 2. Check next season
  const nextSeasonData = showDetails.seasons.find(
    (s) => s.seasonNumber === currentSeason + 1,
  );

  if (nextSeasonData) {
    let nextSeasonEpisodes: Episode[];
    if (cachedData?.loadedSeasons[currentSeason + 1]) {
      nextSeasonEpisodes = cachedData.loadedSeasons[currentSeason + 1];
    } else {
      const { episodes } = await getSeriesEpisodes(
        seriesId,
        nextSeasonData.seasonId,
      );
      nextSeasonEpisodes = episodes;
      cacheSeriesData(
        seriesId,
        showDetails,
        currentSeason + 1,
        nextSeasonEpisodes,
      );
    }

    const firstEpisodeNextSeason = nextSeasonEpisodes.find(
      (ep) => ep.episodeNumber === 1,
    );

    if (firstEpisodeNextSeason) {
      return {
        title: firstEpisodeNextSeason.title || 'Episode 1',
        seriesTitle: metadata.title,
        seasonNumber: currentSeason + 1,
        episodeNumber: 1,
        thumbnailUrl: firstEpisodeNextSeason.thumbnailUrl,
        duration: firstEpisodeNextSeason.duration,
      };
    }
  }

  return null;
}

/**
 * Prepares the navigation URL for the next episode.
 */
export async function prepareNextEpisodeCommand(
  nextEpisodeInfo: NextEpisodeInfo,
  metadata: VideoMetadata,
  serverOverride?: string,
): Promise<string | null> {
  const seriesId = metadata.seriesId;
  if (!seriesId) return null;

  stopVideo();
  const server = serverOverride || metadata.providerId || 's2';

  const response = await playVideo({
    type: 'series',
    title: metadata.title,
    season: nextEpisodeInfo.seasonNumber,
    episode: nextEpisodeInfo.episodeNumber,
    server,
  });

  const effectiveStreamUrl =
    response.masterPlaylistUrl ||
    response.streamUrls?.[0] ||
    response.qualities?.[0]?.url;

  if (response.success && response.movieId && effectiveStreamUrl) {
    const streamUrl = encodeURIComponent(effectiveStreamUrl);
    const captionUrl = response.captionSrt
      ? encodeURIComponent(response.captionSrt)
      : '';
    const description = metadata.description
      ? encodeURIComponent(metadata.description)
      : '';
    const year = metadata.year ? encodeURIComponent(metadata.year) : '';
    const posterUrl = metadata.posterUrl
      ? encodeURIComponent(metadata.posterUrl)
      : '';
    const episodeTitle = nextEpisodeInfo.title
      ? encodeURIComponent(nextEpisodeInfo.title)
      : '';

    let url = `/watch/${encodeURIComponent(response.movieId)}?type=series&title=${encodeURIComponent(metadata.title)}&season=${nextEpisodeInfo.seasonNumber}&episode=${nextEpisodeInfo.episodeNumber}&seriesId=${encodeURIComponent(seriesId)}&server=${server}&stream=${streamUrl}`;
    if (captionUrl) url += `&caption=${captionUrl}`;
    if (response.spriteVtt)
      url += `&sprite=${encodeURIComponent(response.spriteVtt)}`;
    if (description) url += `&description=${description}`;
    if (year) url += `&year=${year}`;
    if (posterUrl) url += `&poster=${posterUrl}`;
    if (episodeTitle) url += `&episodeTitle=${episodeTitle}`;
    if (response.qualities && response.qualities.length > 0) {
      url += `&qualities=${encodeURIComponent(JSON.stringify(response.qualities))}`;
    }
    return url;
  }

  return null;
}
