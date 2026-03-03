import { beforeEach, describe, expect, it } from 'vitest';
import type { Episode, ShowDetails } from '@/features/search/types';
import { ContentType } from '@/features/search/types';
import {
  cacheSeriesData,
  clearSeriesCache,
  getCachedSeriesData,
} from '@/features/watch/player/hooks/series-cache';

describe('Series Cache', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  const mockShowDetails: ShowDetails = {
    id: 'test-series-123',
    title: 'Test Series',
    year: '2024',
    posterUrl: 'https://example.com/poster.jpg',
    posterHdUrl: 'https://example.com/poster-hd.jpg',
    description: 'A test series',
    rating: '8.5',
    contentType: ContentType.Series,
    episodes: [],
    seasons: [
      {
        seasonNumber: 1,
        seasonId: 'season-1',
        episodeCount: 10,
      },
      {
        seasonNumber: 2,
        seasonId: 'season-2',
        episodeCount: 12,
      },
    ],
  };

  const mockEpisodes: Episode[] = [
    {
      episodeId: 'ep1',
      seriesId: 'test-series-123',
      episodeNumber: 1,
      title: 'Episode 1',
      description: 'First episode',
      thumbnailUrl: 'https://example.com/ep1.jpg',
      duration: 2400, // 40 minutes
    },
    {
      episodeId: 'ep2',
      seriesId: 'test-series-123',
      episodeNumber: 2,
      title: 'Episode 2',
      description: 'Second episode',
      thumbnailUrl: 'https://example.com/ep2.jpg',
      duration: 2700, // 45 minutes
    },
  ];

  describe('getCachedSeriesData', () => {
    it('should return null when cache is empty', () => {
      const result = getCachedSeriesData('test-series-123');
      expect(result).toBeNull();
    });

    it('should return null for non-existent series', () => {
      cacheSeriesData('series-1', mockShowDetails, 1, mockEpisodes);
      const result = getCachedSeriesData('series-2');
      expect(result).toBeNull();
    });

    it('should return cached data for existing series', () => {
      cacheSeriesData('test-series-123', mockShowDetails, 1, mockEpisodes);

      const result = getCachedSeriesData('test-series-123');
      expect(result).not.toBeNull();
      expect(result?.seriesId).toBe('test-series-123');
      expect(result?.showDetails).toEqual(mockShowDetails);
      expect(result?.loadedSeasons[1]).toEqual(mockEpisodes);
    });

    it('should return null for expired cache (2 hours minimum)', () => {
      const now = Date.now();
      const expiredTimestamp = now - 3 * 60 * 60 * 1000; // 3 hours ago

      // Manually create expired cache
      const cacheData = {
        seriesId: 'test-series-123',
        showDetails: mockShowDetails,
        loadedSeasons: { 1: mockEpisodes },
        timestamp: expiredTimestamp,
        expiryMs: 2 * 60 * 60 * 1000, // 2 hours
      };

      sessionStorage.setItem('watch_series_cache', JSON.stringify(cacheData));

      const result = getCachedSeriesData('test-series-123');
      expect(result).toBeNull();
    });

    it('should return cache within expiry window', () => {
      const now = Date.now();
      const recentTimestamp = now - 30 * 60 * 1000; // 30 minutes ago

      const cacheData = {
        seriesId: 'test-series-123',
        showDetails: mockShowDetails,
        loadedSeasons: { 1: mockEpisodes },
        timestamp: recentTimestamp,
        expiryMs: 2 * 60 * 60 * 1000, // 2 hours
      };

      sessionStorage.setItem('watch_series_cache', JSON.stringify(cacheData));

      const result = getCachedSeriesData('test-series-123');
      expect(result).not.toBeNull();
      expect(result?.seriesId).toBe('test-series-123');
    });

    it('should handle corrupted cache gracefully', () => {
      sessionStorage.setItem('watch_series_cache', 'invalid-json');

      const result = getCachedSeriesData('test-series-123');
      expect(result).toBeNull();
    });
  });

  describe('cacheSeriesData', () => {
    it('should cache series data with default expiry (2 hours)', () => {
      cacheSeriesData('test-series-123', mockShowDetails, 1, mockEpisodes);

      const cached = sessionStorage.getItem('watch_series_cache');
      expect(cached).not.toBeNull();

      const parsed = JSON.parse(cached!);
      expect(parsed.seriesId).toBe('test-series-123');
      expect(parsed.showDetails).toEqual(mockShowDetails);
      expect(parsed.loadedSeasons[1]).toEqual(mockEpisodes);
      expect(parsed.expiryMs).toBeGreaterThanOrEqual(2 * 60 * 60 * 1000); // At least 2 hours
    });

    it('should cache with smart expiry based on episode duration', () => {
      const episodeDuration = 3600; // 1 hour episode

      cacheSeriesData(
        'test-series-123',
        mockShowDetails,
        1,
        mockEpisodes,
        episodeDuration,
      );

      const cached = sessionStorage.getItem('watch_series_cache');
      const parsed = JSON.parse(cached!);

      // Should be episode duration + 30 min buffer = 1.5 hours
      const expectedExpiry = episodeDuration * 1000 + 30 * 60 * 1000;
      expect(parsed.expiryMs).toBeGreaterThanOrEqual(expectedExpiry);
    });

    it('should use minimum 2 hour expiry for short episodes', () => {
      const shortEpisodeDuration = 600; // 10 minutes

      cacheSeriesData(
        'test-series-123',
        mockShowDetails,
        1,
        mockEpisodes,
        shortEpisodeDuration,
      );

      const cached = sessionStorage.getItem('watch_series_cache');
      const parsed = JSON.parse(cached!);

      // Should use minimum 2 hours
      expect(parsed.expiryMs).toBe(2 * 60 * 60 * 1000);
    });

    it('should merge new season data with existing cache', () => {
      // Cache season 1
      cacheSeriesData('test-series-123', mockShowDetails, 1, mockEpisodes);

      // Cache season 2
      const season2Episodes: Episode[] = [
        {
          episodeId: 'ep3',
          seriesId: 'test-series-123',
          episodeNumber: 1,
          title: 'Season 2 Episode 1',
          description: 'First episode of season 2',
          thumbnailUrl: 'https://example.com/s2ep1.jpg',
          duration: 2500,
        },
      ];
      cacheSeriesData('test-series-123', mockShowDetails, 2, season2Episodes);

      const result = getCachedSeriesData('test-series-123');
      expect(result?.loadedSeasons[1]).toEqual(mockEpisodes);
      expect(result?.loadedSeasons[2]).toEqual(season2Episodes);
    });

    it('should update existing season data', () => {
      // Cache initial episodes
      cacheSeriesData('test-series-123', mockShowDetails, 1, mockEpisodes);

      // Update with more episodes
      const updatedEpisodes = [
        ...mockEpisodes,
        {
          episodeId: 'ep3',
          seriesId: 'test-series-123',
          episodeNumber: 3,
          title: 'Episode 3',
          description: 'Third episode',
          thumbnailUrl: 'https://example.com/ep3.jpg',
          duration: 2600,
        },
      ];
      cacheSeriesData('test-series-123', mockShowDetails, 1, updatedEpisodes);

      const result = getCachedSeriesData('test-series-123');
      expect(result?.loadedSeasons[1]).toEqual(updatedEpisodes);
      expect(result?.loadedSeasons[1]).toHaveLength(3);
    });

    it('should keep longer expiry when updating cache', () => {
      // Cache with long episode (3 hours)
      cacheSeriesData(
        'test-series-123',
        mockShowDetails,
        1,
        mockEpisodes,
        10800,
      );

      const firstCache = sessionStorage.getItem('watch_series_cache');
      const firstParsed = JSON.parse(firstCache!);
      const firstExpiry = firstParsed.expiryMs;

      // Update with short episode (30 minutes)
      cacheSeriesData(
        'test-series-123',
        mockShowDetails,
        1,
        mockEpisodes,
        1800,
      );

      const secondCache = sessionStorage.getItem('watch_series_cache');
      const secondParsed = JSON.parse(secondCache!);

      // Should keep the longer expiry
      expect(secondParsed.expiryMs).toBe(firstExpiry);
    });

    it('should handle storage quota exceeded gracefully', () => {
      // Mock sessionStorage.setItem to throw
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = () => {
        throw new Error('Quota exceeded');
      };

      // Should not throw
      expect(() => {
        cacheSeriesData('test-series-123', mockShowDetails, 1, mockEpisodes);
      }).not.toThrow();

      // Restore original
      sessionStorage.setItem = originalSetItem;
    });
  });

  describe('clearSeriesCache', () => {
    it('should clear cached series data', () => {
      cacheSeriesData('test-series-123', mockShowDetails, 1, mockEpisodes);

      expect(sessionStorage.getItem('watch_series_cache')).not.toBeNull();

      clearSeriesCache();

      expect(sessionStorage.getItem('watch_series_cache')).toBeNull();
    });

    it('should not throw if cache is already empty', () => {
      expect(() => {
        clearSeriesCache();
      }).not.toThrow();
    });
  });

  describe('Cache Expiry Logic', () => {
    it('should calculate correct expiry for 1 hour episode', () => {
      const duration = 3600; // 1 hour
      cacheSeriesData(
        'test-series-123',
        mockShowDetails,
        1,
        mockEpisodes,
        duration,
      );

      const cached = JSON.parse(sessionStorage.getItem('watch_series_cache')!);
      // 1 hour + 30 min buffer = 5400 seconds = 5400000ms
      // But minimum is 2 hours, so should be 7200000ms
      expect(cached.expiryMs).toBeGreaterThanOrEqual(5400000);
      expect(cached.expiryMs).toBe(7200000); // Minimum of 2 hours
    });

    it('should calculate correct expiry for 45 minute episode', () => {
      const duration = 2700; // 45 minutes
      cacheSeriesData(
        'test-series-123',
        mockShowDetails,
        1,
        mockEpisodes,
        duration,
      );

      const cached = JSON.parse(sessionStorage.getItem('watch_series_cache')!);
      // 45 min + 30 min buffer = 75 min = 4500000ms
      // But minimum is 2 hours, so should be 7200000ms
      expect(cached.expiryMs).toBeGreaterThanOrEqual(4500000);
      expect(cached.expiryMs).toBe(7200000); // Minimum of 2 hours
    });

    it('should use minimum for very short content', () => {
      const duration = 300; // 5 minutes
      cacheSeriesData(
        'test-series-123',
        mockShowDetails,
        1,
        mockEpisodes,
        duration,
      );

      const cached = JSON.parse(sessionStorage.getItem('watch_series_cache')!);
      // Should be minimum 2 hours
      expect(cached.expiryMs).toBe(2 * 60 * 60 * 1000);
    });

    it('should handle zero or negative duration', () => {
      cacheSeriesData('test-series-123', mockShowDetails, 1, mockEpisodes, 0);

      const cached = JSON.parse(sessionStorage.getItem('watch_series_cache')!);
      expect(cached.expiryMs).toBe(2 * 60 * 60 * 1000);

      clearSeriesCache();
      cacheSeriesData(
        'test-series-123',
        mockShowDetails,
        1,
        mockEpisodes,
        -100,
      );

      const cached2 = JSON.parse(sessionStorage.getItem('watch_series_cache')!);
      expect(cached2.expiryMs).toBe(2 * 60 * 60 * 1000);
    });
  });

  describe('SSR Environment', () => {
    it('should return null/none in SSR environment (window undefined)', () => {
      const originalWindow = global.window;
      // @ts-expect-error
      delete global.window;

      expect(getCachedSeriesData('test')).toBeNull();
      expect(() =>
        cacheSeriesData('test', mockShowDetails, 1, mockEpisodes),
      ).not.toThrow();
      expect(() => clearSeriesCache()).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe('Branch Coverage Edge Cases', () => {
    it('should use default expiry when data.expiryMs is missing', () => {
      const cacheData = {
        seriesId: 'test-series-123',
        showDetails: mockShowDetails,
        loadedSeasons: { 1: mockEpisodes },
        timestamp: Date.now() - 1000,
        // expiryMs missing
      };
      sessionStorage.setItem('watch_series_cache', JSON.stringify(cacheData));

      const result = getCachedSeriesData('test-series-123');
      expect(result).not.toBeNull();
    });
  });
});
