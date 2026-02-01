import { describe, expect, it } from 'vitest';
import {
  extractTokenFromUrl,
  injectTokenIntoUrl,
  normalizeWatchUrls,
  wrapInProxy,
} from '@/features/watch/utils';

describe('Watch Utils', () => {
  describe('injectTokenIntoUrl', () => {
    it('should return undefined for undefined URL', () => {
      const result = injectTokenIntoUrl(undefined, 'token123');
      expect(result).toBeUndefined();
    });

    it('should inject token into HLS URL (old format)', () => {
      const url = 'http://example.com/api/stream/hls/movie123';
      const token = 'token123';

      const result = injectTokenIntoUrl(url, token);

      expect(result).toContain('/hls/token123/movie123');
    });

    it('should replace token in HLS URL (new format)', () => {
      const url = 'http://example.com/api/stream/hls/oldtoken/movie123';
      const token = 'newtoken';

      const result = injectTokenIntoUrl(url, token);

      expect(result).toContain('/hls/newtoken/movie123');
    });

    it('should convert CDN query params to path-based', () => {
      const url = 'http://example.com/api/stream/cdn?url=video.mp4&st=oldtoken';
      const token = 'newtoken';

      const result = injectTokenIntoUrl(url, token);

      expect(result).toContain('/cdn/newtoken/video.mp4');
      expect(result).not.toContain('?url=');
      expect(result).not.toContain('st=');
    });

    it('should update token in CDN path-based URL', () => {
      const url = 'http://example.com/api/stream/cdn/oldtoken/video.mp4';
      const token = 'newtoken';

      const result = injectTokenIntoUrl(url, token);

      expect(result).toContain('/cdn/newtoken/video.mp4');
    });

    it('should handle URLs without stream paths', () => {
      const url = 'http://example.com/some/other/path';
      const token = 'token123';

      const result = injectTokenIntoUrl(url, token);

      expect(result).toBe(url);
    });

    it('should handle invalid URLs gracefully', () => {
      const url = 'not a valid url';
      const token = 'token123';

      const result = injectTokenIntoUrl(url, token);

      // URL constructor will treat it as a relative URL and prepend the origin
      // The function returns a valid URL string even if input is malformed
      expect(result).toBeDefined();
    });

    it('should preserve query parameters (except st)', () => {
      const url =
        'http://example.com/api/stream/hls/movie123?quality=1080p&lang=en';
      const token = 'token123';

      const result = injectTokenIntoUrl(url, token);

      expect(result).toContain('quality=1080p');
      expect(result).toContain('lang=en');
    });

    it('should handle complex CDN URLs', () => {
      const encodedUrl = encodeURIComponent(
        'https://cdn.example.com/video.m3u8',
      );
      const url = `http://example.com/api/stream/cdn?url=${encodedUrl}`;
      const token = 'token123';

      const result = injectTokenIntoUrl(url, token);

      expect(result).toContain('/cdn/token123/');
      // The URL gets decoded when constructing the path
      expect(result).toContain('cdn.example.com');
    });
  });

  describe('extractTokenFromUrl', () => {
    it('should return null for null URL', () => {
      const result = extractTokenFromUrl(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined URL', () => {
      const result = extractTokenFromUrl(undefined);
      expect(result).toBeNull();
    });

    it('should extract token from HLS path-based URL', () => {
      const url = 'http://example.com/api/stream/hls/token123/movie456';

      const result = extractTokenFromUrl(url);

      expect(result).toBe('token123');
    });

    it('should extract token from CDN path-based URL', () => {
      const url = 'http://example.com/api/stream/cdn/token123/video.mp4';

      const result = extractTokenFromUrl(url);

      expect(result).toBe('token123');
    });

    it('should extract token from query parameter', () => {
      const url = 'http://example.com/api/stream/video?st=token123';

      const result = extractTokenFromUrl(url);

      expect(result).toBe('token123');
    });

    it('should return null for URL without token', () => {
      const url = 'http://example.com/api/stream/video';

      const result = extractTokenFromUrl(url);

      expect(result).toBeNull();
    });

    it('should prioritize path-based token over query param', () => {
      const url =
        'http://example.com/api/stream/hls/pathtoken/movie?st=querytoken';

      const result = extractTokenFromUrl(url);

      expect(result).toBe('pathtoken');
    });

    it('should handle invalid URLs gracefully', () => {
      const url = 'not a valid url';

      const result = extractTokenFromUrl(url);

      expect(result).toBeNull();
    });

    it('should handle empty string', () => {
      const result = extractTokenFromUrl('');

      expect(result).toBeNull();
    });

    it('should extract token with special characters', () => {
      const token = 'token-123_abc.xyz';
      const url = `http://example.com/api/stream/hls/${token}/movie`;

      const result = extractTokenFromUrl(url);

      expect(result).toBe(token);
    });
  });

  describe('wrapInProxy', () => {
    it('should wrap external URL in proxy', () => {
      const url = 'https://external.com/video.vtt';
      const token = 'token123';

      const result = wrapInProxy(url, token);

      expect(result).toContain('/api/stream/cdn/token123/');
      expect(result).toMatch(/^\/api\/stream\/cdn\/token123\/[A-Za-z0-9_-]+$/);
    });

    it('should return data URLs unchanged', () => {
      const url = 'data:text/plain;base64,SGVsbG8=';
      const token = 'token123';

      const result = wrapInProxy(url, token);

      expect(result).toBe(url);
    });

    it('should return already-proxied URLs unchanged', () => {
      const url = '/api/stream/cdn/token456/encoded';
      const token = 'token123';

      const result = wrapInProxy(url, token);

      expect(result).toBe(url);
    });

    it('should handle empty URL', () => {
      const result = wrapInProxy('', 'token123');
      expect(result).toBe('');
    });

    it('should encode URL using base64url format', () => {
      const url = 'https://example.com/file+with/special=chars';
      const token = 'token123';

      const result = wrapInProxy(url, token);

      // Should not contain standard base64 characters
      const encoded = result.split('/').pop() || '';
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });
  });

  describe('normalizeWatchUrls', () => {
    it('should normalize all watch URLs with token', () => {
      const urls = {
        streamUrl: 'https://example.com/stream.m3u8',
        captionUrl: 'https://example.com/caption.vtt',
        spriteVtt: 'https://example.com/sprite.vtt',
        subtitleTracks: [
          {
            id: 'en',
            label: 'English',
            language: 'en',
            src: 'https://example.com/en.vtt',
          },
        ],
      };
      const token = 'token123';

      const result = normalizeWatchUrls(urls, token);

      expect(result.streamUrl).toBeDefined();
      expect(result.captionUrl).toContain('/api/stream/cdn/token123/');
      expect(result.spriteVtt).toBeDefined();
      expect(result.subtitleTracks?.[0].src).toContain(
        '/api/stream/cdn/token123/',
      );
    });

    it('should handle null streamUrl', () => {
      const urls = {
        streamUrl: null,
        captionUrl: null,
      };
      const token = 'token123';

      const result = normalizeWatchUrls(urls, token);

      expect(result.streamUrl).toBeNull();
      expect(result.captionUrl).toBeNull();
    });

    it('should handle undefined optional fields', () => {
      const urls = {
        streamUrl: 'https://example.com/stream.m3u8',
      };
      const token = 'token123';

      const result = normalizeWatchUrls(urls, token);

      expect(result.streamUrl).toBeDefined();
      expect(result.captionUrl).toBeUndefined();
      expect(result.spriteVtt).toBeUndefined();
      expect(result.subtitleTracks).toBeUndefined();
    });

    it('should handle empty subtitle tracks', () => {
      const urls = {
        streamUrl: 'https://example.com/stream.m3u8',
        subtitleTracks: [],
      };
      const token = 'token123';

      const result = normalizeWatchUrls(urls, token);

      expect(result.subtitleTracks).toEqual([]);
    });

    it('should preserve all subtitle track properties', () => {
      const urls = {
        streamUrl: null,
        subtitleTracks: [
          {
            id: 'es',
            label: 'Español',
            language: 'es',
            src: 'https://example.com/es.vtt',
          },
        ],
      };
      const token = 'token123';

      const result = normalizeWatchUrls(urls, token);

      expect(result.subtitleTracks?.[0].id).toBe('es');
      expect(result.subtitleTracks?.[0].label).toBe('Español');
      expect(result.subtitleTracks?.[0].language).toBe('es');
      expect(result.subtitleTracks?.[0].src).toContain(
        '/api/stream/cdn/token123/',
      );
    });

    it('should handle multiple subtitle tracks', () => {
      const urls = {
        streamUrl: null,
        subtitleTracks: [
          {
            id: 'en',
            label: 'English',
            language: 'en',
            src: 'https://example.com/en.vtt',
          },
          {
            id: 'es',
            label: 'Spanish',
            language: 'es',
            src: 'https://example.com/es.vtt',
          },
          {
            id: 'fr',
            label: 'French',
            language: 'fr',
            src: 'https://example.com/fr.vtt',
          },
        ],
      };
      const token = 'token123';

      const result = normalizeWatchUrls(urls, token);

      expect(result.subtitleTracks).toHaveLength(3);
      result.subtitleTracks?.forEach((track) => {
        expect(track.src).toContain('/api/stream/cdn/token123/');
      });
    });
  });
});
