import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearEpisodesCache,
  clearSearchHistory,
  clearShowDetailsCache,
  deleteSearchHistoryItem,
  getPlayStatus,
  getSearchHistory,
  getSeriesEpisodes,
  getShowDetails,
  invalidateSearchHistoryCache,
  playVideo,
  searchContent,
} from '@/features/search/api';
import { apiFetch } from '@/lib/fetch';

// Mock apiFetch
vi.mock('@/lib/fetch', () => ({
  apiFetch: vi.fn(),
}));

describe('Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all caches
    invalidateSearchHistoryCache();
    clearShowDetailsCache();
  });

  describe('getSearchHistory', () => {
    it('should fetch search history', async () => {
      const mockHistory = [
        { id: '1', query: 'test', timestamp: '2024-01-01' },
        { id: '2', query: 'movie', timestamp: '2024-01-02' },
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce({ history: mockHistory });

      const result = await getSearchHistory();

      expect(apiFetch).toHaveBeenCalledWith('/api/video/history', undefined);
      expect(result).toEqual(mockHistory);
    });

    it('should cache search history', async () => {
      const mockHistory = [{ id: '1', query: 'test', timestamp: '2024-01-01' }];

      vi.mocked(apiFetch).mockResolvedValueOnce({ history: mockHistory });

      // First call
      await getSearchHistory();
      expect(apiFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await getSearchHistory();
      expect(apiFetch).toHaveBeenCalledTimes(1);
    });

    it('should pass options to apiFetch', async () => {
      const mockHistory: unknown[] = [];

      vi.mocked(apiFetch).mockResolvedValueOnce({ history: mockHistory });

      const options = { signal: new AbortController().signal };
      await getSearchHistory(options);

      expect(apiFetch).toHaveBeenCalledWith('/api/video/history', options);
    });
  });

  describe('deleteSearchHistoryItem', () => {
    it('should delete search history item', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

      await deleteSearchHistoryItem('123');

      expect(apiFetch).toHaveBeenCalledWith('/api/video/history/123', {
        method: 'DELETE',
      });
    });

    it('should invalidate cache after delete', async () => {
      const mockHistory = [{ id: '1', query: 'test', timestamp: '2024-01-01' }];

      vi.mocked(apiFetch).mockResolvedValueOnce({ history: mockHistory });
      await getSearchHistory();

      vi.mocked(apiFetch).mockResolvedValueOnce(undefined);
      await deleteSearchHistoryItem('1');

      // Cache should be invalidated, so next call fetches again
      vi.mocked(apiFetch).mockResolvedValueOnce({ history: [] });
      await getSearchHistory();

      expect(apiFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('clearSearchHistory', () => {
    it('should clear all search history', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

      await clearSearchHistory();

      expect(apiFetch).toHaveBeenCalledWith('/api/video/history', {
        method: 'DELETE',
      });
    });

    it('should pass options', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

      const options = { signal: new AbortController().signal };
      await clearSearchHistory(options);

      expect(apiFetch).toHaveBeenCalledWith('/api/video/history', {
        method: 'DELETE',
        signal: options.signal,
      });
    });
  });

  describe('searchContent', () => {
    it('should search for content', async () => {
      const mockResults = [
        { id: '1', title: 'Movie 1', type: 'movie' },
        { id: '2', title: 'Movie 2', type: 'movie' },
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce({ results: mockResults });

      const result = await searchContent('test query');

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/video/search?q=test%20query',
        undefined,
      );
      expect(result).toEqual(mockResults);
    });

    it('should pass options', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ results: [] });

      const options = { signal: new AbortController().signal };
      await searchContent('test', options);

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/video/search?q=test',
        options,
      );
    });
  });

  describe('getShowDetails', () => {
    it('should fetch show details', async () => {
      const mockShow = {
        id: '123',
        title: 'Test Show',
        description: 'A test show',
        seasons: [],
      };

      vi.mocked(apiFetch).mockResolvedValueOnce({ show: mockShow });

      const result = await getShowDetails('123');

      expect(apiFetch).toHaveBeenCalledWith('/api/video/show/123', undefined);
      expect(result).toEqual(mockShow);
    });

    it('should cache show details', async () => {
      const mockShow = { id: '123', title: 'Test Show' };

      vi.mocked(apiFetch).mockResolvedValueOnce({ show: mockShow });

      // First call
      await getShowDetails('123');
      expect(apiFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await getShowDetails('123');
      expect(apiFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearShowDetailsCache', () => {
    it('should clear specific show from cache', async () => {
      const mockShow = { id: '123', title: 'Test Show' };

      vi.mocked(apiFetch).mockResolvedValueOnce({ show: mockShow });
      await getShowDetails('123');

      clearShowDetailsCache('123');

      // Should fetch again after cache clear
      vi.mocked(apiFetch).mockResolvedValueOnce({ show: mockShow });
      await getShowDetails('123');

      expect(apiFetch).toHaveBeenCalledTimes(2);
    });

    it('should clear all show cache when no id provided', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ show: { id: '123' } });
      await getShowDetails('123');

      vi.mocked(apiFetch).mockResolvedValueOnce({ show: { id: '456' } });
      await getShowDetails('456');

      clearShowDetailsCache();

      // Both should fetch again
      vi.mocked(apiFetch).mockResolvedValueOnce({ show: { id: '123' } });
      await getShowDetails('123');

      vi.mocked(apiFetch).mockResolvedValueOnce({ show: { id: '456' } });
      await getShowDetails('456');

      expect(apiFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('getSeriesEpisodes', () => {
    it('should fetch all episodes for a series', async () => {
      const mockEpisodes = {
        episodes: [
          { id: '1', title: 'Episode 1', number: 1 },
          { id: '2', title: 'Episode 2', number: 2 },
        ],
        totalEpisodes: 2,
      };

      vi.mocked(apiFetch).mockResolvedValueOnce(mockEpisodes);

      const result = await getSeriesEpisodes('series-123');

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/video/episodes/series-123',
        undefined,
      );
      expect(result).toEqual(mockEpisodes);
    });

    it('should fetch episodes starting from season', async () => {
      const mockEpisodes = {
        episodes: [{ id: '1', title: 'Episode 1' }],
        totalEpisodes: 1,
      };

      vi.mocked(apiFetch).mockResolvedValueOnce(mockEpisodes);

      await getSeriesEpisodes('series-123', 'season-2');

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/video/episodes/series-123?start_season_id=season-2',
        undefined,
      );
    });
  });

  describe('invalidateSearchHistoryCache', () => {
    it('should clear search history cache', async () => {
      const mockHistory = [{ id: '1', query: 'test', timestamp: '2024-01-01' }];

      vi.mocked(apiFetch).mockResolvedValueOnce({ history: mockHistory });
      await getSearchHistory();

      invalidateSearchHistoryCache();

      // Should fetch again after invalidation
      vi.mocked(apiFetch).mockResolvedValueOnce({ history: [] });
      await getSearchHistory();

      expect(apiFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearEpisodesCache', () => {
    it('should clear all episodes cache when no seriesId provided', async () => {
      // Populate cache
      vi.mocked(apiFetch).mockResolvedValueOnce({
        episodes: [{ season: 1, episode: 1 }],
      });
      await getSeriesEpisodes('series1', '1');

      vi.mocked(apiFetch).mockResolvedValueOnce({
        episodes: [{ season: 1, episode: 1 }],
      });
      await getSeriesEpisodes('series2', '1');

      clearEpisodesCache();

      // Should fetch again after cache clear
      vi.mocked(apiFetch).mockResolvedValueOnce({
        episodes: [{ season: 1, episode: 1 }],
      });
      await getSeriesEpisodes('series1', '1');

      expect(apiFetch).toHaveBeenCalledTimes(3); // 2 initial + 1 after clear (series2 still cached)
    });

    it('should clear only episodes for specific series', async () => {
      // Populate cache for series1
      vi.mocked(apiFetch).mockResolvedValueOnce({
        episodes: [{ season: 1, episode: 1 }],
      });
      await getSeriesEpisodes('series1', '1');

      // Populate cache for series2
      vi.mocked(apiFetch).mockResolvedValueOnce({
        episodes: [{ season: 1, episode: 1 }],
      });
      await getSeriesEpisodes('series2', '1');

      clearEpisodesCache('series1');

      // series1 should refetch
      vi.mocked(apiFetch).mockResolvedValueOnce({
        episodes: [{ season: 1, episode: 1 }],
      });
      await getSeriesEpisodes('series1', '1');

      // series2 should use cache (no new fetch)
      await getSeriesEpisodes('series2', '1');

      expect(apiFetch).toHaveBeenCalledTimes(2); // 2 initial calls, series2 cached (no refetch)
    });
  });

  describe('playVideo', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(apiFetch).mockReset();
    });

    it('should play a movie', async () => {
      const mockResponse = {
        success: true,
        streamUrl: 'https://example.com/stream.m3u8',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce(mockResponse);

      const result = await playVideo({
        type: 'movie',
        title: 'Test Movie',
        duration: 7200,
      });

      expect(apiFetch).toHaveBeenCalledWith('/api/video/play', {
        method: 'POST',
        body: JSON.stringify({
          type: 'movie',
          title: 'Test Movie',
          duration: 7200,
        }),
        timeout: 120000,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should play a series episode', async () => {
      const mockResponse = {
        success: true,
        streamUrl: 'https://example.com/stream.m3u8',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce(mockResponse);

      const result = await playVideo({
        type: 'series',
        title: 'Test Series',
        season: 1,
        episode: 5,
        duration: 3600,
      });

      expect(apiFetch).toHaveBeenCalledWith('/api/video/play', {
        method: 'POST',
        body: JSON.stringify({
          type: 'series',
          title: 'Test Series',
          season: 1,
          episode: 5,
          duration: 3600,
        }),
        timeout: 120000,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle play errors', async () => {
      vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Automation failed'));

      await expect(
        playVideo({
          type: 'movie',
          title: 'Test Movie',
        }),
      ).rejects.toThrow('Automation failed');
    });

    it('should support custom options', async () => {
      const mockResponse = { success: true };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockResponse);

      await playVideo(
        {
          type: 'movie',
          title: 'Test',
        },
        { signal: new AbortController().signal },
      );

      expect(apiFetch).toHaveBeenCalledWith('/api/video/play', {
        method: 'POST',
        body: expect.any(String),
        timeout: 120000,
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe('getPlayStatus', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(apiFetch).mockReset();
    });

    it('should fetch play status', async () => {
      const mockStatus = {
        status: 'idle',
        queueLength: 0,
        isProcessing: false,
      };

      vi.mocked(apiFetch).mockResolvedValueOnce(mockStatus);

      const result = await getPlayStatus();

      expect(apiFetch).toHaveBeenCalledWith('/api/video/play/status');
      expect(result).toEqual(mockStatus);
    });

    it('should handle processing status', async () => {
      const mockStatus = {
        status: 'processing',
        queueLength: 3,
        isProcessing: true,
      };

      vi.mocked(apiFetch).mockResolvedValueOnce(mockStatus);

      const result = await getPlayStatus();

      expect(result.isProcessing).toBe(true);
      expect(result.queueLength).toBe(3);
    });
  });
});
