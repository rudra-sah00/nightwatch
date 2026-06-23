vi.mock('@/lib/fetch');

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchChannels,
  fetchIptvCategories,
  fetchIptvChannels,
  fetchIptvResolve,
  fetchLiveMatchDetail,
  fetchLivestreamSchedule,
  fetchSports,
} from '@/features/livestream/api';
import { apiFetch } from '@/lib/fetch';

const mockApiFetch = vi.mocked(apiFetch);

describe('livestream/api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchLivestreamSchedule', () => {
    it('returns items with default params', async () => {
      const items = [{ id: '1', title: 'Match 1' }];
      mockApiFetch.mockResolvedValue({ items });

      const result = await fetchLivestreamSchedule();

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/livestream/schedule?sportType=basketball&daysBackward=0&daysForward=3&server=server1',
        { signal: undefined },
      );
      expect(result).toEqual(items);
    });

    it('passes custom params and signal', async () => {
      mockApiFetch.mockResolvedValue({ items: [] });
      const controller = new AbortController();

      await fetchLivestreamSchedule('football', 1, 5, controller.signal);

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/livestream/schedule?sportType=football&daysBackward=1&daysForward=5&server=server1',
        { signal: controller.signal },
      );
    });

    it('returns empty array when data is null', async () => {
      mockApiFetch.mockResolvedValue(null);

      const result = await fetchLivestreamSchedule();

      expect(result).toEqual([]);
    });
  });

  describe('fetchLiveMatchDetail', () => {
    it('returns match data', async () => {
      const match = { id: 'abc', title: 'Final' };
      mockApiFetch.mockResolvedValue({ match });

      const result = await fetchLiveMatchDetail('abc');

      expect(mockApiFetch).toHaveBeenCalledWith('/api/livestream/match/abc');
      expect(result).toEqual(match);
    });

    it('returns null on error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchLiveMatchDetail('abc');

      expect(result).toBeNull();
    });

    it('returns null when match is missing', async () => {
      mockApiFetch.mockResolvedValue({});

      const result = await fetchLiveMatchDetail('abc');

      expect(result).toBeNull();
    });
  });

  describe('fetchChannels', () => {
    it('returns channels with defaults', async () => {
      const response = {
        channels: [{ id: '1' }],
        total: 1,
        page: 1,
        limit: 30,
        totalPages: 1,
      };
      mockApiFetch.mockResolvedValue(response);

      const result = await fetchChannels();

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/livestream/channels?page=1&limit=30',
        { signal: undefined },
      );
      expect(result).toEqual(response);
    });

    it('includes search param when provided', async () => {
      mockApiFetch.mockResolvedValue({
        channels: [],
        total: 0,
        page: 1,
        limit: 30,
        totalPages: 0,
      });

      await fetchChannels(2, 10, 'sports');

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/livestream/channels?page=2&limit=10&search=sports',
        { signal: undefined },
      );
    });

    it('returns fallback when data is null', async () => {
      mockApiFetch.mockResolvedValue(null);

      const result = await fetchChannels();

      expect(result).toEqual({
        channels: [],
        total: 0,
        page: 1,
        limit: 30,
        totalPages: 0,
      });
    });
  });

  describe('fetchSports', () => {
    it('fetches and caches sports list', async () => {
      const sports = [{ id: 'football', label: 'Football' }];
      mockApiFetch.mockResolvedValue({ data: sports });

      const result1 = await fetchSports();
      const result2 = await fetchSports();

      expect(result1).toEqual(sports);
      expect(result2).toEqual(sports);
      // Second call uses cache — no additional fetch
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });
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
