vi.mock('@/lib/fetch');
vi.mock('@/lib/analytics');

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addToWatchlist,
  checkInWatchlist,
  getWatchlist,
  removeFromWatchlist,
} from '@/features/watchlist/api';
import { trackEvent } from '@/lib/analytics';
import { apiFetch } from '@/lib/fetch';

const mockApiFetch = vi.mocked(apiFetch);
const mockTrackEvent = vi.mocked(trackEvent);

describe('watchlist/api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWatchlist', () => {
    it('returns items from API response', async () => {
      const items = [{ contentId: '1', title: 'Test' }];
      mockApiFetch.mockResolvedValue({ items });

      const result = await getWatchlist();

      expect(mockApiFetch).toHaveBeenCalledWith('/api/user/watchlist', {
        signal: undefined,
      });
      expect(result).toEqual(items);
    });

    it('returns empty array when items is undefined', async () => {
      mockApiFetch.mockResolvedValue({});

      const result = await getWatchlist();

      expect(result).toEqual([]);
    });

    it('passes abort signal', async () => {
      mockApiFetch.mockResolvedValue({ items: [] });
      const controller = new AbortController();

      await getWatchlist(undefined, controller.signal);

      expect(mockApiFetch).toHaveBeenCalledWith('/api/user/watchlist', {
        signal: controller.signal,
      });
    });
  });

  describe('addToWatchlist', () => {
    const item = {
      contentId: 'movie-1',
      contentType: 'Movie' as const,
      title: 'Test Movie',
      posterUrl: 'https://example.com/poster.jpg',
    };

    it('calls API with POST and tracks event', async () => {
      mockApiFetch.mockResolvedValue(undefined);

      await addToWatchlist(item);

      expect(mockApiFetch).toHaveBeenCalledWith('/api/user/watchlist', {
        method: 'POST',
        body: JSON.stringify(item),
      });
      expect(mockTrackEvent).toHaveBeenCalledWith('watchlist_add', {
        content_id: 'movie-1',
        title: 'Test Movie',
      });
    });

    it('works without posterUrl', async () => {
      mockApiFetch.mockResolvedValue(undefined);
      const { posterUrl, ...itemWithoutPoster } = item;

      await addToWatchlist(itemWithoutPoster);

      expect(mockApiFetch).toHaveBeenCalled();
    });
  });

  describe('removeFromWatchlist', () => {
    it('calls API with DELETE and tracks event', async () => {
      mockApiFetch.mockResolvedValue(undefined);

      await removeFromWatchlist('movie-1');

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/user/watchlist?id=movie-1',
        {
          method: 'DELETE',
        },
      );
      expect(mockTrackEvent).toHaveBeenCalledWith('watchlist_remove', {
        content_id: 'movie-1',
      });
    });
  });

  describe('checkInWatchlist', () => {
    it('returns true when item is in watchlist', async () => {
      mockApiFetch.mockResolvedValue({ inWatchlist: true });

      const result = await checkInWatchlist('movie-1');

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/user/watchlist/status?id=movie-1',
      );
      expect(result).toBe(true);
    });

    it('returns false when item is not in watchlist', async () => {
      mockApiFetch.mockResolvedValue({ inWatchlist: false });

      const result = await checkInWatchlist('movie-1');

      expect(result).toBe(false);
    });
  });
});
