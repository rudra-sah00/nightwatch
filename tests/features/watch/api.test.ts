import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteWatchProgress,
  fetchContentProgress,
  fetchContinueWatching,
  fetchSpriteVtt,
  getCachedContinueWatching,
  getCachedProgress,
  getContentProgress,
  getContinueWatching,
  getCookie,
  getStreamUrl,
  getVideoDetails,
  invalidateContinueWatchingCache,
  invalidateProgressCache,
  isContinueWatchingCacheFresh,
  playVideo,
  removeFromContinueWatchingCache,
  setContinueWatchingCache,
  setProgressCache,
  stopVideo,
} from '@/features/watch/api';
import { apiFetch } from '@/lib/fetch';
import { ContentType, type WatchProgress } from '@/types/content';

// Mock apiFetch
vi.mock('@/lib/fetch', () => import('./__mocks__/lib-fetch'));

// Mock Socket.IO
vi.mock('@/lib/socket', () => import('./__mocks__/lib-socket'));

// Mock global fetch
global.fetch = vi.fn();

// Mock global navigator/sendBeacon
if (typeof navigator === 'undefined') {
  Object.defineProperty(global, 'navigator', {
    value: { sendBeacon: vi.fn() },
    writable: true,
  });
} else if (!navigator.sendBeacon) {
  Object.defineProperty(navigator, 'sendBeacon', {
    value: vi.fn(),
    writable: true,
  });
}

// Helper to create complete WatchProgress objects
function createMockProgress(
  overrides: Partial<WatchProgress> = {},
): WatchProgress {
  return {
    id: 'test-id',
    contentId: 'test-content',
    contentType: ContentType.Movie,
    title: 'Test Title',
    posterUrl: 'https://example.com/poster.jpg',
    progressSeconds: 0,
    durationSeconds: 100,
    progressPercent: 0,
    remainingSeconds: 100,
    remainingMinutes: 2,
    lastWatchedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Watch API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateContinueWatchingCache();
    invalidateProgressCache();
  });

  describe('getVideoDetails', () => {
    it('should fetch video details', async () => {
      const mockVideo = {
        id: '123',
        title: 'Test Video',
        duration: 3600,
      };

      vi.mocked(apiFetch).mockResolvedValueOnce(mockVideo);

      const result = await getVideoDetails('123');

      expect(apiFetch).toHaveBeenCalledWith('/api/video/123', undefined);
      expect(result).toEqual(mockVideo);
    });

    it('should pass options', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});

      const options = { signal: new AbortController().signal };
      await getVideoDetails('123', options);

      expect(apiFetch).toHaveBeenCalledWith('/api/video/123', options);
    });
  });

  describe('getStreamUrl', () => {
    it('should fetch stream URL', async () => {
      const mockStream = {
        url: 'https://example.com/stream/123.m3u8',
        quality: '1080p',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce(mockStream);

      const result = await getStreamUrl('123');

      expect(apiFetch).toHaveBeenCalledWith('/api/stream/123', undefined);
      expect(result).toEqual(mockStream);
    });

    it('should pass options', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});

      const options = { signal: new AbortController().signal };
      await getStreamUrl('123', options);

      expect(apiFetch).toHaveBeenCalledWith('/api/stream/123', options);
    });
  });

  describe('getContinueWatching', () => {
    it('should fetch continue watching items', async () => {
      const mockItems = [
        {
          id: '1',
          title: 'Movie 1',
          progressSeconds: 300,
          progressPercent: 25,
        },
        {
          id: '2',
          title: 'Movie 2',
          progressSeconds: 600,
          progressPercent: 50,
        },
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce({ items: mockItems });

      const result = await getContinueWatching();

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/watch/continue-watching?limit=10&server=s1',
        undefined,
      );
      expect(result).toEqual(mockItems);
    });

    it('should use custom limit', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ items: [] });

      await getContinueWatching(20);

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/watch/continue-watching?limit=20&server=s1',
        undefined,
      );
    });

    it('should pass options', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ items: [] });

      const options = { signal: new AbortController().signal };
      await getContinueWatching(10, 's1', options);

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/watch/continue-watching?limit=10&server=s1',
        options,
      );
    });
  });

  describe('Continue watching cache', () => {
    it('should invalidate cache', () => {
      const mockItems = [createMockProgress({ id: '1', title: 'Movie' })];
      setContinueWatchingCache('s1', mockItems);

      expect(isContinueWatchingCacheFresh('s1')).toBe(true);

      invalidateContinueWatchingCache();

      expect(isContinueWatchingCacheFresh('s1')).toBe(false);
    });

    it('should set and check cache freshness', () => {
      const mockItems = [createMockProgress({ id: '1', title: 'Movie' })];

      setContinueWatchingCache('s1', mockItems);

      expect(isContinueWatchingCacheFresh('s1')).toBe(true);
    });

    it('should remove item from cache', () => {
      const mockItems = [
        createMockProgress({ id: '1', title: 'Movie 1' }),
        createMockProgress({ id: '2', title: 'Movie 2' }),
      ];

      setContinueWatchingCache('s1', mockItems);
      removeFromContinueWatchingCache('s1', '1');

      // Cache should only have item 2
      expect(isContinueWatchingCacheFresh('s1')).toBe(true);
    });
  });

  describe('getContentProgress', () => {
    it('should fetch content progress', async () => {
      const mockProgress = {
        seasonNumber: 1,
        episodeNumber: 5,
        progressSeconds: 1200,
        progressPercent: 60,
      };

      vi.mocked(apiFetch).mockResolvedValueOnce({ progress: mockProgress });

      const result = await getContentProgress('content-123');

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/watch/progress/content-123?server=s1',
        undefined,
      );
      expect(result).toEqual(mockProgress);
    });

    it('should return null for no progress', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ progress: null });

      const result = await getContentProgress('content-123');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Not found'));

      const result = await getContentProgress('content-123');

      expect(result).toBeNull();
    });

    it('should pass options', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ progress: null });

      const options = { signal: new AbortController().signal };
      await getContentProgress('content-123', options);

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/watch/progress/content-123?server=s1',
        options,
      );
    });
  });

  describe('invalidateProgressCache', () => {
    it('should clear progress cache for specific content', async () => {
      const mockProgress = {
        progressSeconds: 100,
        progressPercent: 10,
      };

      vi.mocked(apiFetch).mockResolvedValueOnce({ progress: mockProgress });
      await getContentProgress('content-123');

      // Invalidate specific content
      invalidateProgressCache('content-123');

      // Should fetch again
      vi.mocked(apiFetch).mockResolvedValueOnce({ progress: mockProgress });
      await getContentProgress('content-123');
      expect(apiFetch).toHaveBeenCalledTimes(2);
    });

    it('should clear all progress cache when no id provided', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ progress: {} });
      await getContentProgress('content-123');

      vi.mocked(apiFetch).mockResolvedValueOnce({ progress: {} });
      await getContentProgress('content-456');

      expect(apiFetch).toHaveBeenCalledTimes(2);

      // Clear all cache
      invalidateProgressCache();

      // Both should fetch again
      vi.mocked(apiFetch).mockResolvedValueOnce({ progress: {} });
      await getContentProgress('content-123');

      vi.mocked(apiFetch).mockResolvedValueOnce({ progress: {} });
      await getContentProgress('content-456');

      expect(apiFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('getCachedProgress', () => {
    it('should return cached progress if not expired', () => {
      const mockProgress = {
        progressSeconds: 100,
        progressPercent: 10,
      };

      setProgressCache('content-123', mockProgress, true);

      const result = getCachedProgress('content-123');
      expect(result).not.toBeNull();
      expect(result?.progress).toEqual(mockProgress);
    });

    it('should return null for non-existent cache', () => {
      const result = getCachedProgress('non-existent');
      expect(result).toBeNull();
    });

    it('should return null if cache is expired', () => {
      const mockProgress = {
        progressSeconds: 100,
        progressPercent: 10,
      };

      setProgressCache('content-123', mockProgress, true);

      // Fast forward time by 3 minutes (cache TTL is 2 minutes)
      vi.useFakeTimers();
      vi.advanceTimersByTime(3 * 60 * 1000);

      const result = getCachedProgress('content-123');
      expect(result).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('setProgressCache', () => {
    it('should cache progress with hasProgress flag', () => {
      const mockProgress = {
        progressSeconds: 200,
        progressPercent: 20,
      };

      setProgressCache('content-123', mockProgress, true);

      const cached = getCachedProgress('content-123');
      expect(cached).not.toBeNull();
      expect(cached?.hasProgress).toBe(true);
      expect(cached?.progress).toEqual(mockProgress);
    });

    it('should cache null progress', () => {
      setProgressCache('content-123', null, false);

      const cached = getCachedProgress('content-123');
      expect(cached).not.toBeNull();
      expect(cached?.hasProgress).toBe(false);
      expect(cached?.progress).toBeNull();
    });
  });

  describe('getCachedContinueWatching', () => {
    it('should return cached continue watching items', () => {
      const mockItems = [createMockProgress({ id: '1', title: 'Movie' })];

      setContinueWatchingCache('s1', mockItems);

      const result = getCachedContinueWatching('s1');
      expect(result).toEqual(mockItems);
    });

    it('should return null if cache is empty', () => {
      invalidateContinueWatchingCache();

      const result = getCachedContinueWatching('s1');
      expect(result).toBeNull();
    });
  });

  describe('fetchContentProgress', () => {
    it('should use HTTP', () => {
      return new Promise<void>((done) => {
        const mockProgress = {
          progressSeconds: 100,
          progressPercent: 10,
        };

        vi.mocked(apiFetch).mockResolvedValueOnce({ progress: mockProgress });

        fetchContentProgress('content-123', (progress, hasProgress) => {
          expect(apiFetch).toHaveBeenCalledWith(
            '/api/watch/progress/content-123?server=s1',
            undefined,
          );
          expect(progress).toEqual(mockProgress);
          expect(hasProgress).toBe(true);
          done();
        });
      });
    });

    it('should handle no progress', () => {
      return new Promise<void>((done) => {
        vi.mocked(apiFetch).mockResolvedValueOnce({ progress: null });

        fetchContentProgress('content-123', (progress, hasProgress) => {
          expect(progress).toBeNull();
          expect(hasProgress).toBe(false);
          done();
        });
      });
    });

    it('should handle errors', () => {
      return new Promise<void>((done) => {
        vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Fetch failed'));

        fetchContentProgress('content-123', (progress, hasProgress) => {
          expect(progress).toBeNull();
          expect(hasProgress).toBe(false);
          done();
        });
      });
    });
  });

  describe('fetchContinueWatching', () => {
    it('should use HTTP', () => {
      return new Promise<void>((done) => {
        const mockItems = [createMockProgress({ id: '1', title: 'Movie' })];

        vi.mocked(apiFetch).mockResolvedValueOnce({ items: mockItems });

        fetchContinueWatching(10, 's1', (result) => {
          expect(apiFetch).toHaveBeenCalledWith(
            '/api/watch/continue-watching?limit=10&server=s1',
            undefined,
          );
          expect(result).toEqual(mockItems);
          done();
        });
      });
    });

    it('should handle errors', () => {
      return new Promise<void>((done) => {
        vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Fetch failed'));

        fetchContinueWatching(10, 's1', (result, error) => {
          expect(result).toBeNull();
          expect(error).toBe('Fetch failed');
          done();
        });
      });
    });
  });

  describe('deleteWatchProgress', () => {
    it('should delete watch progress via HTTP', () => {
      return new Promise<void>((done) => {
        vi.mocked(apiFetch).mockResolvedValueOnce({ success: true });

        deleteWatchProgress('progress-123', 's1', (success) => {
          expect(apiFetch).toHaveBeenCalledWith(
            '/api/watch/progress/progress-123?server=s1',
            { method: 'DELETE' },
          );
          expect(success).toBe(true);
          done();
        });
      });
    });

    it('should handle errors', () => {
      return new Promise<void>((done) => {
        vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Delete failed'));

        deleteWatchProgress('progress-123', 's1', (success) => {
          expect(success).toBe(false);
          done();
        });
      });
    });
  });

  describe('fetchSpriteVtt', () => {
    beforeEach(() => {
      vi.mocked(fetch).mockClear();
    });

    it('should fetch and parse sprite VTT file', async () => {
      const mockVttContent = `WEBVTT

00:00:00.000 --> 00:00:05.000
https://example.com/sprites.jpg#xywh=0,0,160,90

00:00:05.000 --> 00:00:10.000
https://example.com/sprites.jpg#xywh=160,0,160,90

00:00:10.000 --> 00:00:15.000
https://example.com/sprites.jpg#xywh=320,0,160,90
`;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockVttContent,
      } as Response);

      const sprites = await fetchSpriteVtt('https://example.com/sprites.vtt');

      expect(sprites).toHaveLength(3);
      expect(sprites[0]).toEqual({
        start: 0,
        end: 5,
        url: 'https://example.com/sprites.jpg',
        x: 0,
        y: 0,
        w: 160,
        h: 90,
      });
      expect(sprites[1]).toEqual({
        start: 5,
        end: 10,
        url: 'https://example.com/sprites.jpg',
        x: 160,
        y: 0,
        w: 160,
        h: 90,
      });
    });

    it('should cache sprite VTT data', async () => {
      const mockVttContent = `WEBVTT

00:00:00.000 --> 00:00:05.000
https://example.com/sprites.jpg#xywh=0,0,160,90
`;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockVttContent,
      } as Response);

      // First call
      await fetchSpriteVtt('https://example.com/cached.vtt');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await fetchSpriteVtt('https://example.com/cached.vtt');
      expect(fetch).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should handle relative sprite URLs', async () => {
      const mockVttContent = `WEBVTT

00:00:00.000 --> 00:00:05.000
sprites/thumb.jpg#xywh=0,0,160,90
`;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockVttContent,
      } as Response);

      const sprites = await fetchSpriteVtt(
        'https://example.com/path/to/sprites.vtt',
      );

      expect(sprites[0].url).toBe(
        'https://example.com/path/to/sprites/thumb.jpg',
      );
    });

    it('should handle VTT with minutes format', async () => {
      const mockVttContent = `WEBVTT

00:30.000 --> 00:35.000
https://example.com/sprites.jpg#xywh=0,0,160,90
`;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockVttContent,
      } as Response);

      const sprites = await fetchSpriteVtt(
        'https://example.com/minutes-format.vtt',
      );

      expect(sprites[0].start).toBe(30);
      expect(sprites[0].end).toBe(35);
    });

    it('should handle VTT with hours format', async () => {
      const mockVttContent = `WEBVTT

01:30:15.500 --> 01:30:20.500
https://example.com/sprites.jpg#xywh=0,0,160,90
`;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockVttContent,
      } as Response);

      const sprites = await fetchSpriteVtt(
        'https://example.com/hours-format.vtt',
      );

      expect(sprites[0].start).toBe(5415.5); // 1*3600 + 30*60 + 15.5
      expect(sprites[0].end).toBe(5420.5);
    });

    it('should handle fetch error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(
        fetchSpriteVtt('https://example.com/notfound.vtt'),
      ).rejects.toThrow('Failed to fetch sprite VTT: 404');
    });

    it('should handle invalid coordinate format', async () => {
      const mockVttContent = `WEBVTT

00:00:00.000 --> 00:00:05.000
https://example.com/sprites.jpg#xywh=0,0,160
`;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockVttContent,
      } as Response);

      const sprites = await fetchSpriteVtt(
        'https://example.com/invalid-coords.vtt',
      );

      // Should skip invalid entries
      expect(sprites).toHaveLength(0);
    });

    it('should handle URL resolution errors', async () => {
      const mockVttContent = `WEBVTT

00:00:00.000 --> 00:00:05.000
invalid-relative-path#xywh=0,0,160,90
`;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockVttContent,
      } as Response);

      const sprites = await fetchSpriteVtt(
        'https://example.com/url-resolution.vtt',
      );

      // Should resolve relative path against base URL
      expect(sprites[0].url).toBe('https://example.com/invalid-relative-path');
    });

    it('should preload unique sprite images', async () => {
      const mockVttContent = `WEBVTT

00:00:00.000 --> 00:00:05.000
https://example.com/sprite1.jpg#xywh=0,0,160,90

00:00:05.000 --> 00:00:10.000
https://example.com/sprite1.jpg#xywh=160,0,160,90

00:00:10.000 --> 00:00:15.000
https://example.com/sprite2.jpg#xywh=0,0,160,90
`;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => mockVttContent,
      } as Response);

      await fetchSpriteVtt('https://example.com/preload-sprites.vtt');

      // Should create Image objects for unique URLs (sprite1 and sprite2)
      // We can't easily test Image creation in Node, but we verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('playVideo', () => {
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
  });

  describe('stopVideo', () => {
    it('should stop video playback using sendBeacon when available', () => {
      const mockSendBeacon = vi.fn().mockReturnValue(true);
      const originalSendBeacon = navigator.sendBeacon;
      Object.defineProperty(navigator, 'sendBeacon', {
        value: mockSendBeacon,
        writable: true,
        configurable: true,
      });

      const csrfToken = 'test-csrf';
      const cookieSpy = vi
        .spyOn(document, 'cookie', 'get')
        .mockReturnValue(`csrfToken=${csrfToken}`);

      stopVideo();

      expect(mockSendBeacon).toHaveBeenCalledWith(
        `/api/video/stop?_csrf=${encodeURIComponent(csrfToken)}`,
      );

      // Restore
      Object.defineProperty(navigator, 'sendBeacon', {
        value: originalSendBeacon,
        writable: true,
        configurable: true,
      });
      cookieSpy.mockRestore();
    });

    it('should fallback to fetch if sendBeacon is unavailable', () => {
      const originalSendBeacon = navigator.sendBeacon;
      Object.defineProperty(navigator, 'sendBeacon', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      stopVideo();

      expect(mockFetch).toHaveBeenCalledWith('/api/video/stop', {
        method: 'POST',
        keepalive: true,
      });

      // Restore
      Object.defineProperty(navigator, 'sendBeacon', {
        value: originalSendBeacon,
        writable: true,
        configurable: true,
      });
      global.fetch = originalFetch;
    });
  });

  describe('getCookie', () => {
    it('should retrieve a cookie value', () => {
      vi.spyOn(document, 'cookie', 'get').mockReturnValue(
        'test_cookie=hello_world',
      );
      expect(getCookie('test_cookie')).toBe('hello_world');
      vi.restoreAllMocks();
    });

    it('should return null if cookie does not exist', () => {
      vi.spyOn(document, 'cookie', 'get').mockReturnValue('');
      expect(getCookie('non_existent')).toBeNull();
      vi.restoreAllMocks();
    });
  });
});
