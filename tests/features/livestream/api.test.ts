vi.mock('@/lib/fetch');

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchIptvCategories,
  fetchIptvChannels,
  fetchIptvResolve,
} from '@/features/livestream/api';
import { apiFetch } from '@/lib/fetch';

const mockApiFetch = vi.mocked(apiFetch);

describe('livestream/api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchIptvChannels', () => {
    it('returns IPTV channels with defaults', async () => {
      const response = {
        channels: [],
        total: 0,
        page: 1,
        limit: 30,
        totalPages: 0,
      };
      mockApiFetch.mockResolvedValue(response);

      const result = await fetchIptvChannels();

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/livestream/iptv/channels?page=1&limit=30',
        { signal: undefined },
      );
      expect(result).toEqual(response);
    });

    it('includes search and category params', async () => {
      mockApiFetch.mockResolvedValue({
        channels: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await fetchIptvChannels(1, 10, 'news', 'entertainment');

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/livestream/iptv/channels?page=1&limit=10&search=news&category=entertainment',
        { signal: undefined },
      );
    });

    it('returns fallback when data is null', async () => {
      mockApiFetch.mockResolvedValue(null);

      const result = await fetchIptvChannels();

      expect(result).toEqual({
        channels: [],
        total: 0,
        page: 1,
        limit: 30,
        totalPages: 0,
      });
    });
  });

  describe('fetchIptvCategories', () => {
    it('returns categories array', async () => {
      mockApiFetch.mockResolvedValue({ categories: ['Sports', 'News'] });

      const result = await fetchIptvCategories();

      expect(result).toEqual(['Sports', 'News']);
    });

    it('returns empty array when data is null', async () => {
      mockApiFetch.mockResolvedValue(null);

      const result = await fetchIptvCategories();

      expect(result).toEqual([]);
    });
  });

  describe('fetchIptvResolve', () => {
    it('returns stream URL', async () => {
      mockApiFetch.mockResolvedValue({
        streamUrl: 'https://stream.example.com/live.m3u8',
      });

      const result = await fetchIptvResolve('ch-1');

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/livestream/iptv/resolve/ch-1',
        { signal: undefined },
      );
      expect(result).toBe('https://stream.example.com/live.m3u8');
    });

    it('returns null when streamUrl is missing', async () => {
      mockApiFetch.mockResolvedValue({});

      const result = await fetchIptvResolve('ch-1');

      expect(result).toBeNull();
    });
  });
});
