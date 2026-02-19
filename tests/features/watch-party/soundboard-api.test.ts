import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTrendingSounds, searchSounds } from '@/features/watch-party/api';
import { apiFetch } from '@/lib/fetch';

vi.mock('@/lib/fetch', () => ({
  apiFetch: vi.fn(),
}));

describe('Soundboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTrendingSounds', () => {
    it('should call apiFetch with correct soundboard endpoint', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [],
      };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockResponse);

      const result = await getTrendingSounds(2);

      expect(apiFetch).toHaveBeenCalledWith('/api/soundboard?page=2');
      expect(result).toEqual(mockResponse);
    });

    it('should default to page 1', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ results: [] });
      await getTrendingSounds();
      expect(apiFetch).toHaveBeenCalledWith('/api/soundboard?page=1');
    });
  });

  describe('searchSounds', () => {
    it('should call apiFetch with search query and page', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [],
      };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockResponse);

      const result = await searchSounds('laugh', 3);

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/soundboard/search?q=laugh&page=3',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should encode search query', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ results: [] });
      await searchSounds('funny laugh', 1);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/soundboard/search?q=funny%20laugh&page=1',
      );
    });
  });
});
