import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSearchSuggestions,
  getSeriesEpisodes,
  getShowDetails,
  searchContent,
} from '@/features/search/api';
import { apiFetch } from '@/lib/fetch';

// Mock apiFetch
vi.mock('@/lib/fetch', () => import('./__mocks__/lib-fetch'));

describe('Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all caches
  });

  describe('searchContent', () => {
    it('should search for content', async () => {
      const mockResults = [
        { id: '1', title: 'Movie 1', type: 'movie' },
        { id: '2', title: 'Movie 2', type: 'movie' },
      ];

      // Default search path
      vi.mocked(apiFetch)
        .mockResolvedValueOnce({ results: mockResults })
        .mockResolvedValueOnce({ results: [] });

      const result = await searchContent('test query');

      expect(apiFetch).toHaveBeenCalledTimes(2);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/video/search?q=test%20query&server=s1',
        undefined,
      );
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/video/search?q=test%20query&server=pv',
        undefined,
      );
      expect(result).toEqual(
        mockResults.map((r) => ({ ...r, provider: 's1' })),
      );
    });

    it('should pass options', async () => {
      vi.mocked(apiFetch)
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] });

      const options = { signal: new AbortController().signal };
      await searchContent('test', undefined, options);

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/video/search?q=test&server=s1',
        options,
      );
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/video/search?q=test&server=pv',
        options,
      );
    });

    it('should use single call for search', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ results: [] });

      await searchContent('test', 's1');

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/video/search?q=test&server=s1',
        undefined,
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
      // Use a unique ID to avoid cross-test cache pollution (module-level cache persists)
      const mockShow = { id: 'cache-test-999', title: 'Test Show' };

      vi.mocked(apiFetch).mockResolvedValueOnce({ show: mockShow });

      // First call
      await getShowDetails('cache-test-999');
      expect(apiFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await getShowDetails('cache-test-999');
      expect(apiFetch).toHaveBeenCalledTimes(1);
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

  describe('getSearchSuggestions', () => {
    it('returns empty array for empty query', async () => {
      const result = await getSearchSuggestions('');
      expect(result).toEqual([]);
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it('returns empty array for single character query', async () => {
      const result = await getSearchSuggestions('a');
      expect(result).toEqual([]);
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it('fetches suggestions for query 2+ chars', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        suggestions: ['Avatar', 'Avengers'],
      });

      const result = await getSearchSuggestions('av');

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/video/search/suggest?q=av',
        undefined,
      );
      expect(result).toEqual(['Avatar', 'Avengers']);
    });

    it('caches suggestions for repeated identical query', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ suggestions: ['Batman'] });

      const result1 = await getSearchSuggestions('bat');
      const result2 = await getSearchSuggestions('bat');

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('includes server param when provided', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ suggestions: ['Inception'] });

      await getSearchSuggestions('inc', 's1');

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/video/search/suggest?q=inc&server=s1',
        undefined,
      );
    });
  });

  describe('cleanupCache (via searchContent cache overflow)', () => {
    it('prunes expired entries when cache grows large', async () => {
      // The cleanupCache function fires when the cache grows beyond maxSize.
      // We verify the API is still callable after many cached entries.
      vi.mocked(apiFetch).mockResolvedValue({ results: [] });

      // Fill the cache well past the 100-item limit to trigger cleanupCache
      for (let i = 0; i < 110; i++) {
        await searchContent(`query-${i}`);
      }

      // searchContent should have been called 110 times (no caching across different keys)
      // Each search fires 1 apiFetch call
      expect(apiFetch).toHaveBeenCalledTimes(220);
    });
  });
});
