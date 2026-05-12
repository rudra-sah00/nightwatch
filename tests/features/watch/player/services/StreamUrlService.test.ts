import { describe, expect, it } from 'vitest';
import {
  normalizeRawUrls,
  processResponse,
  processS2Subtitles,
} from '@/features/watch/player/services/StreamUrlService';
import type { PlayResponse } from '@/types/content';

describe('StreamUrlService', () => {
  describe('processResponse', () => {
    it('should process S1 response with HLS token injection', () => {
      const response: PlayResponse = {
        success: true,
        masterPlaylistUrl: '/api/stream/hls/123',
        movieId: '123',
        type: 'movie',
        title: 'Test',
      };

      const result = processResponse('s2', response);

      expect(result.streamUrl).toContain('/123');
    });

    it('should process S2 response with audio tracks', () => {
      const response: PlayResponse = {
        success: true,
        masterPlaylistUrl: 'https://example.com/video.mp4',
        streamUrls: ['https://example.com/video.mp4'],
        movieId: '123',
        type: 'movie',
        title: 'Test',
        qualities: [{ quality: '1080p', url: 'https://example.com/1080.mp4' }],
        subtitleTracks: [
          {
            label: 'English',
            language: 'en',
            url: 'https://example.com/en.srt',
          },
        ],
      };

      const result = processResponse('s2', response);

      expect(result.streamUrl).toBe('https://example.com/video.mp4');
      expect(result.qualities).toHaveLength(1);
      expect(result.subtitleTracks).toHaveLength(1);
    });

    it('should throw error for unsuccessful response', () => {
      const response: PlayResponse = {
        success: false,
        masterPlaylistUrl: '',
        movieId: '',
        type: 'movie',
        title: '',
      };

      expect(() => processResponse('s2', response)).toThrow(
        'Invalid S1 response',
      );
    });

    it('should throw error if masterPlaylistUrl is missing', () => {
      const response: PlayResponse = {
        success: true,
        masterPlaylistUrl: '',
        movieId: '123',
        type: 'movie',
        title: 'Test',
      };

      expect(() => processResponse('s2', response)).toThrow(
        'Invalid S1 response',
      );
    });
  });

  describe('normalizeRawUrls', () => {
    it('should use streamUrl if present', () => {
      const raw: Parameters<typeof normalizeRawUrls>[0] = {
        streamUrl: '/api/stream/hls/123',
        captionUrl: 'cap',
      };
      const result = normalizeRawUrls(raw, 'tok');
      expect(result.streamUrl).toContain('/tok/123');
    });

    it('should fallback to qualities if others are missing', () => {
      const raw: Parameters<typeof normalizeRawUrls>[0] = {
        streamUrl: null,
        qualities: [{ quality: '1080p', url: '/api/stream/hls/789' }],
        captionUrl: 'cap',
      };
      const result = normalizeRawUrls(raw, 'tok');
      expect(result.streamUrl).toContain('/tok/789');
    });

    it('should return null streamUrl if no source found', () => {
      const raw: Parameters<typeof normalizeRawUrls>[0] = {
        streamUrl: null,
        captionUrl: null,
      };
      const result = normalizeRawUrls(raw, null);
      expect(result.streamUrl).toBeNull();
    });
  });

  describe('extractTokenFromUrl', () => {
    it('should extract token from URL', () => {
      const url = '/api/stream/hls/xyz123/movie';
      const result = processResponse('s2', {
        success: true,
        masterPlaylistUrl: url,
        movieId: '1',
        type: 'movie',
        title: 'Test',
      });
      expect(result.streamUrl).toContain('/xyz123/');
    });
  });

  describe('processS2Subtitles', () => {
    it('should handle missing subtitle tracks', () => {
      const response: PlayResponse = {
        success: true,
        masterPlaylistUrl: 'url',
        movieId: '1',
        type: 'movie',
        title: 'Test',
      };

      const result = processS2Subtitles(response);
      expect(result.subtitleTracks).toBeUndefined();
    });

    it('should normalize tracks with language and labels', () => {
      const response: PlayResponse = {
        success: true,
        masterPlaylistUrl: 'url',
        movieId: '1',
        type: 'movie',
        title: 'Test',
        subtitleTracks: [
          { label: 'English', language: 'en', url: 'en.srt' },
          { label: 'French', language: '', url: 'fr.srt' },
        ],
      };

      const result = processS2Subtitles(response);
      expect(result.subtitleTracks).toHaveLength(2);
      expect(result.subtitleTracks?.[0].id).toBe('en-0');
      expect(result.subtitleTracks?.[1].id).toBe('track-1');
    });
  });

  describe('processS2Response', () => {
    it('should process S2 response with qualities and subtitles', () => {
      const response: PlayResponse = {
        success: true,
        masterPlaylistUrl: 'video.mp4',
        movieId: '1',
        type: 'movie',
        title: 'Test',
        qualities: [{ quality: '1080p', url: '1080.mp4' }],
        subtitleTracks: [{ label: 'EN', language: 'en', url: 'en.srt' }],
        captionSrt: 'cap.srt',
        spriteVtt: 'sprite.vtt',
        durationSeconds: 3600,
      };
      const result = processResponse('s2', response);
      expect(result.streamUrl).toBe('video.mp4');
      expect(result.qualities).toHaveLength(1);
      expect(result.subtitleTracks).toHaveLength(1);
      expect(result.captionUrl).toBe('cap.srt');
      expect(result.apiDurationSeconds).toBe(3600);
    });

    it('should process S2 response with no language track (fallback id)', () => {
      const response: PlayResponse = {
        success: true,
        masterPlaylistUrl: 'video.mp4',
        movieId: '1',
        type: 'movie',
        title: 'Test',
        subtitleTracks: [{ label: 'Unknown', language: '', url: 'sub.srt' }],
      };
      const result = processResponse('s2', response);
      expect(result.subtitleTracks?.[0].id).toBe('track-0');
    });

    it('should process S2 response with null captionSrt', () => {
      const response: PlayResponse = {
        success: true,
        masterPlaylistUrl: 'video.mp4',
        movieId: '1',
        type: 'movie',
        title: 'Test',
      };
      const result = processResponse('s2', response);
      expect(result.captionUrl).toBeNull();
    });

    it('should throw if S2 response success is false', () => {
      const response: PlayResponse = {
        success: false,
        masterPlaylistUrl: '',
        movieId: '',
        type: 'movie',
        title: '',
      };
      expect(() => processResponse('s2', response)).toThrow(
        'Invalid S2 response',
      );
    });
  });
});
