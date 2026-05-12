import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSeriesEpisodes, getShowDetails } from '@/features/search/api';
import { playVideo } from '@/features/watch/api';
import type { VideoMetadata } from '@/features/watch/player/context/types';
import { getCachedSeriesData } from '@/features/watch/player/hooks/series-cache';
import {
  fetchNextEpisodeInfo,
  prepareNextEpisodeCommand,
} from '@/features/watch/player/services/NextEpisodeService';
import type { Episode, ShowDetails } from '@/types/content';
import { ContentType } from '@/types/content';

vi.mock('@/features/search/api', () => ({
  getSeriesEpisodes: vi.fn(),
  getShowDetails: vi.fn(),
}));

vi.mock('@/features/watch/api', () => ({
  playVideo: vi.fn(),
  stopVideo: vi.fn(),
}));

vi.mock('@/features/watch/player/hooks/series-cache', () => ({
  cacheSeriesData: vi.fn(),
  getCachedSeriesData: vi.fn(() => null),
}));

// Minimal ShowDetails that satisfies the interface
function makeShowDetails(
  id: string,
  title: string,
  seasons: ShowDetails['seasons'],
): ShowDetails {
  return {
    id,
    title,
    contentType: ContentType.Series,
    seasons,
    episodes: [],
    posterUrl: '',
    posterHdUrl: '',
  };
}

// Minimal Episode that satisfies the interface
function makeEpisode(
  episodeNumber: number,
  extra: Partial<Episode> = {},
): Episode {
  return {
    episodeId: `ep-${episodeNumber}`,
    seriesId: 'show1',
    episodeNumber,
    thumbnailUrl: '',
    ...extra,
  };
}

describe('NextEpisodeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchNextEpisodeInfo', () => {
    it('should return null if not a series', async () => {
      const metadata: VideoMetadata = {
        type: 'movie',
        title: 'Movie',
        movieId: '1',
      };
      const result = await fetchNextEpisodeInfo(metadata);
      expect(result).toBeNull();
    });

    it('should fetch and return next episode in same season', async () => {
      const metadata: VideoMetadata = {
        type: 'series',
        seriesId: 'show-same-season',
        season: 1,
        episode: 1,
        title: 'Show',
        movieId: 'ep1',
      };

      vi.mocked(getShowDetails).mockResolvedValue(
        makeShowDetails('show-same-season', 'Show', [
          { seasonNumber: 1, seasonId: 's1', episodeCount: 2 },
        ]),
      );

      vi.mocked(getSeriesEpisodes).mockResolvedValue({
        episodes: [
          makeEpisode(1, { episodeId: 'ep1' }),
          makeEpisode(2, {
            episodeId: 'ep2',
            title: 'Next Ep',
            thumbnailUrl: 'thumb',
            duration: 100,
          }),
        ],
        totalEpisodes: 2,
      });

      const result = await fetchNextEpisodeInfo(metadata);

      expect(result).toEqual({
        title: 'Next Ep',
        seriesTitle: 'Show',
        seasonNumber: 1,
        episodeNumber: 2,
        thumbnailUrl: 'thumb',
        duration: 100,
      });
    });

    it('should fetch and return first episode of next season', async () => {
      const metadata: VideoMetadata = {
        type: 'series',
        seriesId: 'show-next-season',
        season: 1,
        episode: 2,
        title: 'Show',
        movieId: 'ep2',
      };

      vi.mocked(getShowDetails).mockResolvedValue(
        makeShowDetails('show-next-season', 'Show', [
          { seasonNumber: 1, seasonId: 's1', episodeCount: 2 },
          { seasonNumber: 2, seasonId: 's1', episodeCount: 1 },
        ]),
      );

      vi.mocked(getSeriesEpisodes).mockImplementation(
        (_sid, seasonId): ReturnType<typeof getSeriesEpisodes> => {
          if (seasonId === 's1') {
            return Promise.resolve({
              episodes: [
                makeEpisode(1, { episodeId: 'ep1' }),
                makeEpisode(2, { episodeId: 'ep2' }),
              ],
              totalEpisodes: 2,
            });
          }
          if (seasonId === 's1') {
            return Promise.resolve({
              episodes: [makeEpisode(1, { episodeId: 'ep3', title: 'S2E1' })],
              totalEpisodes: 1,
            });
          }
          return Promise.resolve({ episodes: [], totalEpisodes: 0 });
        },
      );

      const result = await fetchNextEpisodeInfo(metadata);

      expect(result).not.toBeNull();
      expect(result?.seasonNumber).toBe(2);
      expect(result?.episodeNumber).toBe(1);
      expect(result?.title).toBe('S2E1');
    });

    it('should use cached data if available', async () => {
      const metadata: VideoMetadata = {
        type: 'series',
        seriesId: 'show-cached',
        season: 1,
        episode: 1,
        title: 'Show',
        movieId: 'ep1',
      };

      const mockCached: ReturnType<typeof getCachedSeriesData> = {
        seriesId: 'show-cached',
        showDetails: makeShowDetails('show-cached', 'Show', [
          { seasonNumber: 1, seasonId: 's1', episodeCount: 2 },
        ]),
        loadedSeasons: {
          1: [makeEpisode(1), makeEpisode(2, { title: 'Cached Next' })],
        },
        timestamp: Date.now(),
        expiryMs: 100000,
      };

      vi.mocked(getCachedSeriesData).mockReturnValueOnce(mockCached);

      const result = await fetchNextEpisodeInfo(metadata);

      expect(result?.title).toBe('Cached Next');
      expect(getSeriesEpisodes).not.toHaveBeenCalled();
    });

    it('should return null if season not found in show details', async () => {
      const metadata: VideoMetadata = {
        type: 'series',
        seriesId: 'show-no-season',
        season: 5,
        episode: 1,
        title: 'Show',
        movieId: 'ep1',
      };

      vi.mocked(getShowDetails).mockResolvedValue(
        makeShowDetails('show-no-season', 'Show', [
          { seasonNumber: 1, seasonId: 's1', episodeCount: 1 },
        ]),
      );

      const result = await fetchNextEpisodeInfo(metadata);
      expect(result).toBeNull();
    });
  });

  describe('prepareNextEpisodeCommand', () => {
    it('should prepare navigation URL', async () => {
      const info = { seasonNumber: 1, episodeNumber: 2, title: 'Next' };
      const metadata: VideoMetadata = {
        seriesId: 'show1',
        title: 'Show',
        movieId: 'ep1',
        type: 'series',
        providerId: 's1',
      };

      vi.mocked(playVideo).mockResolvedValue({
        success: true,
        movieId: 'ep2',
        masterPlaylistUrl: 'https://example.com/stream.m3u8',
        type: 'series',
        title: 'Show',
      });

      const url = await prepareNextEpisodeCommand(
        info as Parameters<typeof prepareNextEpisodeCommand>[0],
        metadata,
      );

      expect(url).toContain('/watch/ep2');
      expect(url).toContain('season=1');
      expect(url).toContain('episode=2');
    });
  });
});
