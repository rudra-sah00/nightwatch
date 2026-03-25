import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchSpriteVtt,
  parseProxyCdnUrl,
  parseVttTime,
  proxyCdnImage,
} from '@/features/watch/player/services/SpriteService';

describe('SpriteService', () => {
  describe('parseVttTime', () => {
    it('should parse HH:MM:SS.mmm', () => {
      expect(parseVttTime('01:02:03.456')).toBe(3723.456);
    });

    it('should parse MM:SS.mmm', () => {
      expect(parseVttTime('02:03.456')).toBe(123.456);
    });

    it('should parse SS.mmm', () => {
      expect(parseVttTime('03.456')).toBe(3.456);
    });

    it('should return 0 for empty string', () => {
      expect(parseVttTime('')).toBe(0);
    });
  });

  describe('CDN Proxy Logic', () => {
    it('should parse proxy CDN URL', () => {
      const originalCdn = 'https://cdn.com/image.jpg';
      const token = 'token123';
      const encoded = btoa(originalCdn)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const proxyUrl = `/api/stream/cdn/${token}/${encoded}`;

      const result = parseProxyCdnUrl(proxyUrl);
      expect(result).toEqual({ token, cdnUrl: originalCdn });
    });

    it('should return null for invalid proxy URL', () => {
      expect(parseProxyCdnUrl('/invalid/url')).toBeNull();
    });

    it('should wrap image in proxy', () => {
      const url = 'https://cdn.com/img.jpg';
      const token = 'abc';
      const proxied = proxyCdnImage(url, token);
      expect(proxied).toContain(`/api/stream/cdn/${token}/`);
    });

    it('should not wrap already proxied URL', () => {
      const url = '/api/stream/cdn/token/abc';
      expect(proxyCdnImage(url, 'new')).toBe(url);
    });
  });

  describe('fetchSpriteVtt with Proxy', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    it('should apply proxy to sprite image URLs if VTT itself is proxied', async () => {
      const originalCdn = 'https://cdn.com/sprites.vtt';
      const token = 'mytoken';
      const encoded = btoa(originalCdn)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const proxiedVttUrl = `/api/stream/cdn/${token}/${encoded}`;

      const vttContent = `WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nthumb.jpg#xywh=0,0,100,100`;

      const fakeResponse = { ok: true, text: async () => vttContent };
      vi.mocked(fetch).mockResolvedValueOnce(
        fakeResponse as unknown as Response,
      );

      const sprites = await fetchSpriteVtt(proxiedVttUrl);

      expect(sprites[0].url).toContain(`/api/stream/cdn/${token}/`);
      expect(sprites[0].url).toContain(
        btoa('https://cdn.com/thumb.jpg').substring(0, 10),
      );
    });
  });
});
